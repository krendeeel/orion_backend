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
      endpoint: endpoint ? endpoint : undefined, // Для MinIO: http://nestjs_minio:9000
      s3ForcePathStyle: true, // Требуется для MinIO
      signatureVersion: 'v4', // Совместимость с MinIO
    });

    // Создаём бакет при инициализации, если он не существует
    this.createBucketIfNotExists();
  }

  private async createBucketIfNotExists() {
    const bucket = this.configService.get<string>('AWS_S3_BUCKET')!;
    try {
      await this.s3.headBucket({ Bucket: bucket }).promise();
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      if (error.statusCode === 404) {
        await this.s3.createBucket({ Bucket: bucket }).promise();
        console.log(`Bucket ${bucket} created successfully`);
      } else {
        throw error;
      }
    }
  }

  async uploadFile(
    file: Express.Multer.File,
    userId: string,
    folderId: string | null | undefined,
  ) {
    console.log(`Uploading file: ${folderId}`);
    // Проверяем, существует ли папка, если folderId указан
    if (folderId) {
      const folder = await this.prisma.folder.findUnique({
        where: { id: folderId },
      });
      if (!folder) {
        throw new NotFoundException(`Folder with ID ${folderId} not found`);
      }
      // Проверяем, имеет ли пользователь доступ к папке
      if (
        folder.ownerId !== userId &&
        !(await this.hasFolderWritePermission(folderId, userId))
      ) {
        throw new ForbiddenException('No permission to upload to this folder');
      }
    }

    const fileType = this.getFileType(file.mimetype);
    const key = `files/${userId}/${uuidv4()}-${file.originalname}`;
    try {
      const uploadResult = await this.s3
        .upload({
          Bucket: this.configService.get('AWS_S3_BUCKET')!,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
        })
        .promise();

      const createdFile = await this.prisma.file.create({
        data: {
          id: uuidv4(),
          name: file.originalname,
          format: fileType,
          path: uploadResult.Location,
          size: file.size,
          ownerId: userId,
          folderId: folderId ? folderId : null,
          createdBy: userId,
          updatedBy: userId,
        },
        include: { folder: true }, // Используем отношение FileToFolder
      });

      return createdFile;
    } catch (error) {
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
    return this.prisma.folder.create({
      data: {
        id: uuidv4(),
        name,
        ownerId: userId,
        parentId,
        createdBy: userId,
        updatedBy: userId,
      },
      include: { parent: true }, // Используем отношение FolderParent
    });
  }

  async renameFile(fileId: string, newName: string, userId: string) {
    const file = await this.prisma.file.findUnique({
      where: { id: fileId },
      include: { permissions: true }, // Используем отношение FilePermissions
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
      include: { folder: true }, // Используем отношение FileToFolder
    });
  }

  async deleteFile(fileId: string, userId: string) {
    const file = await this.prisma.file.findUnique({
      where: { id: fileId },
      include: { permissions: true }, // Используем отношение FilePermissions
    });
    if (!file) throw new NotFoundException('File not found');
    if (
      file.ownerId !== userId &&
      !(await this.hasWritePermission(fileId, userId))
    )
      throw new ForbiddenException('No permission to delete file');

    // Удаляем файл из MinIO
    await this.s3
      .deleteObject({
        Bucket: this.configService.get('AWS_S3_BUCKET')!,
        Key: file.path.split('/').slice(-2).join('/'),
      })
      .promise();

    return this.prisma.file.delete({
      where: { id: fileId },
    });
  }

  async moveFile(fileId: string, newFolderId: string | null, userId: string) {
    const file = await this.prisma.file.findUnique({
      where: { id: fileId },
      include: { permissions: true }, // Используем отношение FilePermissions
    });
    if (!file) throw new NotFoundException('File not found');
    if (
      file.ownerId !== userId &&
      !(await this.hasWritePermission(fileId, userId))
    )
      throw new ForbiddenException('No permission to move file');

    return this.prisma.file.update({
      where: { id: fileId },
      data: { folderId: newFolderId, updatedBy: userId, updatedAt: new Date() },
      include: { folder: true }, // Используем отношение FileToFolder
    });
  }

  async copyFile(fileId: string, userId: string, newFolderId?: string) {
    const file = await this.prisma.file.findUnique({
      where: { id: fileId },
      include: { permissions: true }, // Используем отношение FilePermissions
    });
    if (!file) throw new NotFoundException('File not found');
    if (
      file.ownerId !== userId &&
      !(await this.hasReadPermission(fileId, userId))
    )
      throw new ForbiddenException('No permission to copy file');

    const newKey = `files/${userId}/${uuidv4()}-${file.name}`;
    await this.s3
      .copyObject({
        Bucket: this.configService.get('AWS_S3_BUCKET')!,
        CopySource: `${this.configService.get('AWS_S3_BUCKET')}/${file.path
          .split('/')
          .slice(-2)
          .join('/')}`,
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
      include: { folder: true }, // Используем отношение FileToFolder
    });
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
      include: { file: true, user: true }, // Используем отношения FilePermissions и FilePermissionUser
    });
  }

  async getPresignedUrl(fileId: string, userId: string) {
    const file = await this.prisma.file.findUnique({
      where: { id: fileId },
      include: { permissions: true }, // Используем отношение FilePermissions
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
      return this.s3.getSignedUrlPromise('getObject', {
        Bucket: this.configService.get<string>('AWS_S3_BUCKET')!,
        Key: file.path.split('/').slice(-2).join('/'),
        Expires: 3600, // 1 час
      });
    }
    throw new ForbiddenException('File type not supported for preview');
  }

  async getUserFilesAndFolders(userId: string, folderId?: string | null) {
    // Проверяем, существует ли папка, если folderId указан
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

    // Получаем файлы, принадлежащие пользователю или доступные через разрешения
    const files = await this.prisma.file.findMany({
      where: {
        OR: [
          { ownerId: userId },
          { permissions: { some: { userId, canRead: true } } },
        ],
        folderId, // Если folderId = null, возвращаются файлы в корне
      },
      include: {
        folder: true, // Используем отношение FileToFolder
        permissions: true, // Используем отношение FilePermissions
        creator: true, // Используем отношение FileCreatedBy
        updater: true, // Используем отношение FileUpdatedBy
      },
    });

    // Получаем папки, принадлежащие пользователю или доступные через разрешения
    const folders = await this.prisma.folder.findMany({
      where: {
        OR: [
          { ownerId: userId },
          { permissions: { some: { userId, canRead: true } } },
        ],
        parentId: folderId, // Если folderId = null, возвращаются корневые папки
      },
      include: {
        parent: true, // Используем отношение FolderParent
        permissions: true, // Используем отношение FolderPermissions
        creator: true, // Используем отношение FolderCreatedBy
        updater: true, // Используем отношение FolderUpdatedBy
        files: {
          where: {
            OR: [
              { ownerId: userId },
              { permissions: { some: { userId, canRead: true } } },
            ],
          },
          include: {
            folder: true, // Используем отношение FileToFolder
            permissions: true, // Используем отношение FilePermissions
          },
        }, // Включаем файлы в каждой папке
        children: true, // Используем отношение FolderParent для вложенных папок
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
