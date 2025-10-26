import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { S3 } from 'aws-sdk';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { Readable } from 'stream';

export enum FileType {
  IMAGE = 'IMAGE',
  PDF = 'PDF',
  DOCUMENT = 'DOCUMENT',
  OTHER = 'OTHER',
}

@Injectable()
export class FilesService {
  private s3: S3;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    const endpoint = this.configService.get<string>('AWS_S3_ENDPOINT')!;
    this.s3 = new S3({
      region: this.configService.get('AWS_REGION'),
      accessKeyId: this.configService.get('AWS_ACCESS_KEY_ID'),
      secretAccessKey: this.configService.get('AWS_SECRET_ACCESS_KEY'),
      endpoint: endpoint ? endpoint : undefined, // Для MinIO: http://localhost:9000 (локально) или http://nestjs_minio:9000 (в Docker)
      s3ForcePathStyle: true, // Требуется для MinIO
      signatureVersion: 'v4', // Совместимость с MinIO
    });

    // Создаём бакет при инициализации
    this.createBucketIfNotExists().catch((error) => {
      console.error('Failed to initialize S3 bucket:', error);
      throw new InternalServerErrorException(
        'Failed to connect to storage service',
      );
    });
  }

  private async createBucketIfNotExists() {
    const bucket = this.configService.get<string>('AWS_S3_BUCKET')!;
    try {
      await this.s3.headBucket({ Bucket: bucket }).promise();
      console.log(`Bucket ${bucket} already exists`);
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      if (error.code === 'NotFound' || error.statusCode === 404) {
        await this.s3.createBucket({ Bucket: bucket }).promise();
        console.log(`Bucket ${bucket} created successfully`);
      } else {
        throw new InternalServerErrorException(
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-expect-error
          `Failed to check or create bucket: ${error.message}`,
        );
      }
    }
  }

  async uploadFile(
    file: Express.Multer.File,
    userId: string,
    folderId?: string,
  ) {
    console.log('uploadFile called with:', { userId, folderId });

    const normalizedFolderId =
      folderId && folderId.trim() !== '' ? folderId : null;

    if (normalizedFolderId) {
      const folder = await this.prisma.folder.findUnique({
        where: { id: normalizedFolderId },
      });
      if (!folder) {
        throw new NotFoundException(
          `Folder with ID ${normalizedFolderId} not found`,
        );
      }
      if (
        folder.ownerId !== userId &&
        !(await this.hasFolderWritePermission(normalizedFolderId, userId))
      ) {
        throw new ForbiddenException('No permission to upload to this folder');
      }
    }

    const fileType = this.getFileType(file.mimetype);
    // Декодируем имя файла для корректной обработки кириллицы
    let fileName: string;
    try {
      fileName = decodeURIComponent(file.originalname);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      console.warn(
        'Failed to decode file name, using original:',
        file.originalname,
      );
      fileName = file.originalname;
    }

    console.log(`Uploading file ${fileName} to ${folderId}`);
    // Нормализуем имя файла для ключа в MinIO (заменяем пробелы на подчёркивания)
    const safeFileName = fileName.replace(/\s+/g, '_');
    const key = `files/${userId}/${uuidv4()}-${safeFileName}`;

    try {
      const uploadResult = await this.s3
        .upload({
          Bucket: this.configService.get('AWS_S3_BUCKET')!,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
        })
        .promise();

      console.log('S3 upload successful:', {
        key,
        location: uploadResult.Location,
      });

      const createdFile = await this.prisma.file.create({
        data: {
          id: uuidv4(),
          name: fileName,
          format: fileType,
          path: key,
          size: file.size,
          ownerId: userId,
          folderId: normalizedFolderId,
          createdBy: userId,
          updatedBy: userId,
        },
        include: { folder: true },
      });

      return createdFile;
    } catch (error) {
      console.error('Error in uploadFile:', error);

      throw new InternalServerErrorException(
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        `Failed to upload file: ${error.message}`,
      );
    }
  }

  private getFileType(mimeType: string): FileType {
    if (mimeType.startsWith('image/')) return FileType.IMAGE;
    if (mimeType === 'application/pdf') return FileType.PDF;
    if (
      mimeType.includes('msword') ||
      mimeType.includes('vnd.openxmlformats-officedocument')
    )
      return FileType.DOCUMENT;
    return FileType.OTHER;
  }

  async createFolder(name: string, userId: string, parentId?: string) {
    if (parentId) {
      const parentFolder = await this.prisma.folder.findUnique({
        where: { id: parentId },
      });
      if (!parentFolder) {
        throw new NotFoundException(
          `Parent folder with ID ${parentId} not found`,
        );
      }
      if (
        parentFolder.ownerId !== userId &&
        !(await this.hasFolderWritePermission(parentId, userId))
      ) {
        throw new ForbiddenException(
          'No permission to create folder in this parent folder',
        );
      }
    }

    return this.prisma.folder.create({
      data: {
        id: uuidv4(),
        name,
        ownerId: userId,
        parentId,
        createdBy: userId,
        updatedBy: userId,
      },
      include: { parent: true },
    });
  }

  async renameFile(fileId: string, newName: string, userId: string) {
    const file = await this.prisma.file.findUnique({
      where: { id: fileId },
      include: { permissions: true },
    });
    if (!file) throw new NotFoundException('File not found');
    if (
      file.ownerId !== userId &&
      !(await this.hasWritePermission(fileId, userId))
    )
      throw new ForbiddenException('No permission to rename file');

    return this.prisma.file.update({
      where: { id: fileId },
      data: { name: newName, updatedBy: userId, updatedAt: new Date() },
      include: { folder: true },
    });
  }

  async deleteFile(fileId: string, userId: string) {
    const file = await this.prisma.file.findUnique({
      where: { id: fileId },
      include: { permissions: true },
    });
    if (!file) throw new NotFoundException('File not found');
    if (
      file.ownerId !== userId &&
      !(await this.hasWritePermission(fileId, userId))
    )
      throw new ForbiddenException('No permission to delete file');

    try {
      await this.s3
        .deleteObject({
          Bucket: this.configService.get('AWS_S3_BUCKET')!,
          Key: file.path,
        })
        .promise();

      return this.prisma.file.delete({
        where: { id: fileId },
      });
    } catch (error) {
      throw new InternalServerErrorException(
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        `Failed to delete file from storage: ${error.message}`,
      );
    }
  }

  async moveFile(fileId: string, newFolderId: string | null, userId: string) {
    const file = await this.prisma.file.findUnique({
      where: { id: fileId },
      include: { permissions: true },
    });
    if (!file) throw new NotFoundException('File not found');
    if (
      file.ownerId !== userId &&
      !(await this.hasWritePermission(fileId, userId))
    )
      throw new ForbiddenException('No permission to move file');

    if (newFolderId) {
      const newFolder = await this.prisma.folder.findUnique({
        where: { id: newFolderId },
      });
      if (!newFolder) {
        throw new NotFoundException(
          `New folder with ID ${newFolderId} not found`,
        );
      }
      if (
        newFolder.ownerId !== userId &&
        !(await this.hasFolderWritePermission(newFolderId, userId))
      ) {
        throw new ForbiddenException(
          'No permission to move file to this folder',
        );
      }
    }

    return this.prisma.file.update({
      where: { id: fileId },
      data: { folderId: newFolderId, updatedBy: userId, updatedAt: new Date() },
      include: { folder: true },
    });
  }

  async copyFile(fileId: string, userId: string, newFolderId?: string) {
    const file = await this.prisma.file.findUnique({
      where: { id: fileId },
      include: { permissions: true },
    });
    if (!file) throw new NotFoundException('File not found');
    if (
      file.ownerId !== userId &&
      !(await this.hasReadPermission(fileId, userId))
    )
      throw new ForbiddenException('No permission to copy file');

    if (newFolderId) {
      const newFolder = await this.prisma.folder.findUnique({
        where: { id: newFolderId },
      });
      if (!newFolder) {
        throw new NotFoundException(
          `New folder with ID ${newFolderId} not found`,
        );
      }
      if (
        newFolder.ownerId !== userId &&
        !(await this.hasFolderWritePermission(newFolderId, userId))
      ) {
        throw new ForbiddenException(
          'No permission to copy file to this folder',
        );
      }
    }

    const newKey = `files/${userId}/${uuidv4()}-${file.name}`;
    try {
      await this.s3
        .copyObject({
          Bucket: this.configService.get('AWS_S3_BUCKET')!,
          CopySource: `${this.configService.get('AWS_S3_BUCKET')}/${file.path}`,
          Key: newKey,
        })
        .promise();

      return this.prisma.file.create({
        data: {
          id: uuidv4(),
          name: `Copy of ${file.name}`,
          format: file.format,
          path: newKey,
          size: file.size,
          ownerId: userId,
          folderId: newFolderId,
          createdBy: userId,
          updatedBy: userId,
        },
        include: { folder: true },
      });
    } catch (error) {
      throw new InternalServerErrorException(
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        `Failed to copy file: ${error.message}`,
      );
    }
  }

  async grantPermission(
    fileId: string,
    targetUserId: string,
    canRead: boolean,
    canWrite: boolean,
    userId: string,
  ) {
    const file = await this.prisma.file.findUnique({
      where: { id: fileId },
    });
    if (!file) throw new NotFoundException('File not found');
    if (file.ownerId !== userId)
      throw new ForbiddenException('Only owner can grant permissions');

    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
    });
    if (!targetUser) {
      throw new NotFoundException(`User with ID ${targetUserId} not found`);
    }

    return this.prisma.filePermission.upsert({
      where: { fileId_userId: { fileId, userId: targetUserId } },
      update: { canRead, canWrite },
      create: {
        id: uuidv4(),
        fileId,
        userId: targetUserId,
        canRead,
        canWrite,
      },
      include: { file: true, user: true },
    });
  }

  async getPresignedUrl(fileId: string, userId: string) {
    const file = await this.prisma.file.findUnique({
      where: { id: fileId },
      include: { permissions: true },
    });
    if (!file) throw new NotFoundException('File not found');
    if (
      file.ownerId !== userId &&
      !(await this.hasReadPermission(fileId, userId))
    )
      throw new ForbiddenException('No permission to view file');

    if (
      [FileType.IMAGE, FileType.PDF, FileType.DOCUMENT].includes(
        file.format as FileType,
      )
    ) {
      try {
        return await this.s3.getSignedUrlPromise('getObject', {
          Bucket: this.configService.get<string>('AWS_S3_BUCKET')!,
          Key: file.path,
          Expires: 3600,
        });
      } catch (error) {
        throw new InternalServerErrorException(
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-expect-error
          `Failed to generate presigned URL: ${error.message}`,
        );
      }
    }
    throw new ForbiddenException('File type not supported for preview');
  }

  async getFileStream(
    fileId: string,
    userId: string,
  ): Promise<{ stream: Readable; contentType: string; fileName: string }> {
    const file = await this.prisma.file.findUnique({
      where: { id: fileId },
      include: { permissions: true },
    });
    if (!file) throw new NotFoundException('File not found');
    if (
      file.ownerId !== userId &&
      !(await this.hasReadPermission(fileId, userId))
    )
      throw new ForbiddenException('No permission to view file');

    try {
      const response = await this.s3
        .getObject({
          Bucket: this.configService.get('AWS_S3_BUCKET')!,
          Key: file.path,
        })
        .promise();

      return {
        stream: Readable.from(response.Body as Buffer),
        contentType:
          response.ContentType || this.getMimeType(file.format as FileType),
        fileName: file.name,
      };
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      if (error.code === 'NoSuchKey') {
        throw new NotFoundException('File not found in storage');
      }
      throw new InternalServerErrorException(
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        `Failed to retrieve file: ${error.message}`,
      );
    }
  }

  private getMimeType(format: FileType): string {
    switch (format) {
      case FileType.IMAGE:
        return 'image/jpeg'; // Можно уточнить тип, если хранить mimeType в базе
      case FileType.PDF:
        return 'application/pdf';
      case FileType.DOCUMENT:
        return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      default:
        return 'application/octet-stream';
    }
  }

  async getUserFilesAndFolders(userId: string, folderId?: string) {
    if (folderId) {
      const folder = await this.prisma.folder.findUnique({
        where: { id: folderId },
      });
      if (!folder) throw new NotFoundException('Folder not found');
      if (
        folder.ownerId !== userId &&
        !(await this.hasFolderReadPermission(folderId, userId))
      )
        throw new ForbiddenException('No permission to view folder');
    }

    const files = await this.prisma.file.findMany({
      where: {
        OR: [
          { ownerId: userId },
          { permissions: { some: { userId, canRead: true } } },
        ],
        folderId,
      },
      include: {
        folder: true,
        permissions: true,
        creator: true,
        updater: true,
      },
    });

    const folders = await this.prisma.folder.findMany({
      where: {
        OR: [
          { ownerId: userId },
          { permissions: { some: { userId, canRead: true } } },
        ],
        parentId: folderId,
      },
      include: {
        parent: true,
        permissions: true,
        creator: true,
        updater: true,
        files: {
          where: {
            OR: [
              { ownerId: userId },
              { permissions: { some: { userId, canRead: true } } },
            ],
          },
          include: {
            folder: true,
            permissions: true,
          },
        },
        children: true,
      },
    });

    return { files, folders };
  }

  private async hasReadPermission(fileId: string, userId: string) {
    const permission = await this.prisma.filePermission.findUnique({
      where: { fileId_userId: { fileId, userId } },
    });
    return permission?.canRead || false;
  }

  private async hasWritePermission(fileId: string, userId: string) {
    const permission = await this.prisma.filePermission.findUnique({
      where: { fileId_userId: { fileId, userId } },
    });
    return permission?.canWrite || false;
  }

  private async hasFolderReadPermission(folderId: string, userId: string) {
    const permission = await this.prisma.folderPermission.findUnique({
      where: { folderId_userId: { folderId, userId } },
    });
    return permission?.canRead || false;
  }

  private async hasFolderWritePermission(folderId: string, userId: string) {
    const permission = await this.prisma.folderPermission.findUnique({
      where: { folderId_userId: { folderId, userId } },
    });
    return permission?.canWrite || false;
  }
}
