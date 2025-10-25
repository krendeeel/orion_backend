import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  Body,
  Get,
  Param,
  Patch,
  Delete,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { FilesService } from './files.service';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiTags,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { UploadFileDto } from './dto/upload-file.dto';
import { CreateFolderDto } from './dto/create-folder.dto';
import { CreateFieldDto } from '../fields/dto/create-field.dto';
import { RenameFileDto } from './dto/rename-file.dto';
import { MoveFileDto } from './dto/move-file.dto';
import { CopyFileDto } from './dto/copy-file.dto';
import { GrantPermissionDto } from './dto/grant-permission.dto';

@ApiTags('files')
@Controller('files')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('upload')
  @ApiOperation({ summary: 'Upload a file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'File to upload',
        },
        folderId: {
          type: 'string',
          description: 'Optional folder ID to upload the file to',
          nullable: true,
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'File uploaded successfully' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body() uploadFileDto: UploadFileDto,
    @Req() req: Request & { user: { userId: string } },
  ) {
    return this.filesService.uploadFile(
      file,
      req.user.userId,
      uploadFileDto.folderId,
    );
  }

  @Post('folder')
  @ApiBody({ type: CreateFolderDto })
  @ApiOperation({ summary: 'Create a folder' })
  @ApiResponse({ status: 201, description: 'Folder created successfully' })
  async createFolder(
    @Body('name') createFolderDto: CreateFolderDto,
    @Req() req: Request & { user: { userId: string } },
  ) {
    return this.filesService.createFolder(
      createFolderDto.name,
      req.user.userId,
      createFolderDto.parentId,
    );
  }

  @Patch(':id/rename')
  @ApiBody({ type: RenameFileDto })
  @ApiOperation({ summary: 'Rename a file' })
  @ApiResponse({ status: 200, description: 'File renamed successfully' })
  async renameFile(
    @Param('id') fileId: string,
    @Body() renameFileDto: RenameFileDto,
    @Req() req: Request & { user: { userId: string } },
  ) {
    return this.filesService.renameFile(
      fileId,
      renameFileDto.name,
      req.user.userId,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a file' })
  @ApiResponse({ status: 200, description: 'File deleted successfully' })
  async deleteFile(
    @Param('id') fileId: string,
    @Req() req: Request & { user: { userId: string } },
  ) {
    return this.filesService.deleteFile(fileId, req.user.userId);
  }

  @Patch(':id/move')
  @ApiBody({ type: MoveFileDto })
  @ApiOperation({ summary: 'Move a file to another folder' })
  @ApiResponse({ status: 200, description: 'File moved successfully' })
  async moveFile(
    @Param('id') fileId: string,
    @Body() moveFileDto: MoveFileDto,
    @Req() req: Request & { user: { userId: string } },
  ) {
    return this.filesService.moveFile(
      fileId,
      moveFileDto.folderId ? moveFileDto.folderId : null,
      req.user.userId,
    );
  }

  @Post(':id/copy')
  @ApiBody({ type: CopyFileDto })
  @ApiOperation({ summary: 'Copy a file' })
  @ApiResponse({ status: 201, description: 'File copied successfully' })
  async copyFile(
    @Param('id') fileId: string,
    @Body() copyFileDto: CopyFileDto,
    @Req() req: Request & { user: { userId: string } },
  ) {
    return this.filesService.copyFile(
      fileId,
      req.user.userId,
      copyFileDto.folderId,
    );
  }

  @Post(':id/permission')
  @ApiBody({ type: GrantPermissionDto })
  @ApiOperation({ summary: 'Grant permission to a file' })
  @ApiResponse({ status: 200, description: 'Permission granted successfully' })
  async grantPermission(
    @Param('id') fileId: string,
    @Body('userId') grantPermissionDto: GrantPermissionDto,
    @Req() req: Request & { user: { userId: string } },
  ) {
    return this.filesService.grantPermission(
      fileId,
      grantPermissionDto.userId,
      grantPermissionDto.canRead,
      grantPermissionDto.canWrite,
      req.user.userId,
    );
  }

  @Get(':id/view')
  @ApiOperation({ summary: 'Get presigned URL for file preview' })
  @ApiResponse({
    status: 200,
    description: 'Presigned URL generated successfully',
  })
  async getPresignedUrl(
    @Param('id') fileId: string,
    @Req() req: Request & { user: { userId: string } },
  ) {
    return this.filesService.getPresignedUrl(fileId, req.user.userId);
  }

  @Get('user')
  @ApiOperation({ summary: 'Get user files and folders' })
  @ApiResponse({
    status: 200,
    description: 'Files and folders retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Folder not found' })
  @ApiResponse({ status: 403, description: 'No permission to view folder' })
  @ApiQuery({
    name: 'folderId',
    type: String,
    description:
      'Optional folder ID to retrieve files and folders from (UUID format)',
    required: false,
  })
  async getUserFilesAndFolders(
    @Req() req: Request & { user: { userId: string } },
    @Query('folderId') folderId?: string,
  ) {
    return this.filesService.getUserFilesAndFolders(req.user.userId, folderId);
  }
}
