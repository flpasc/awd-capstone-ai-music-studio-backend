import {
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  ParseFilePipeBuilder,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Express } from 'express';
import { StorageService } from './storage.service';
import { AuthGuard } from 'src/auth/auth.guard';
import { CurrentUser } from 'src/auth/current-user.decorator';
import type { SafeUser } from 'src/auth/current-user.decorator';
import { config } from '../config';

@Controller('storage')
@UseGuards(AuthGuard)
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  /**
   * Admin function to create a new bucket
   */
  @Post('buckets/:bucketName')
  async createBucket(@Param('bucketName') bucketName: string) {
    const result = await this.storageService.createBucket(bucketName);
    return { message: result, bucket: bucketName };
  }

  /**
   * Admin function to list all buckets
   */
  @Get('buckets')
  async listBuckets() {
    const buckets = await this.storageService.listBuckets();
    return { buckets };
  }

  /**
   * List all files for the current user across all projects
   */
  @Get('files')
  async listAllUserFiles(@CurrentUser() user: SafeUser) {
    return await this.storageService.listUserFiles(user.id);
  }

  /**
   * List all files for a specific project
   */
  @Get('projects/:projectId/files')
  async listProjectFiles(
    @Param('projectId') projectId: string,
    @CurrentUser() user: SafeUser,
  ) {
    const files = await this.storageService.listProjectFiles(
      user.id,
      projectId,
    );
    return { projectId, files };
  }

  /**
   * Get all files for a project with download URLs
   */
  @Get('projects/:projectId/files-with-urls')
  async getProjectFilesWithUrls(
    @CurrentUser() user: SafeUser,
    @Param('projectId') projectId: string,
    @Query('expirySeconds') expirySeconds?: number,
  ) {
    const filesWithUrls = await this.storageService.getProjectFilesWithUrls(
      user.id,
      projectId,
      expirySeconds,
    );
    return { projectId, files: filesWithUrls };
  }

  /**
   * Get a presigned download URL for a specific file
   */
  @Get('projects/:projectId/files/:filename/download-url')
  async getDownloadUrl(
    @CurrentUser() user: SafeUser,
    @Param('projectId') projectId: string,
    @Param('filename') filename: string,
    @Query('expirySeconds') expirySeconds?: number,
  ) {
    const downloadUrl = await this.storageService.getDownloadPresignedUrl(
      user.id,
      projectId,
      filename,
      expirySeconds,
    );
    return { filename, downloadUrl, projectId };
  }

  /**
   * Upload a file to a specific project
   * TODO: Allow video upload
   * TODO: Allow multi file upload
   */
  @Post('projects/:projectId/files')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @Param('projectId') projectId: string,
    @CurrentUser() user: SafeUser,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({
          fileType: '.(png|img|jpeg|jpg|webp|pdf|txt|doc|docx)',
        })
        .addMaxSizeValidator({
          maxSize: config.MINIO_FILE_UPLOAD_SIZE,
        })
        .build({
          errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        }),
    )
    file: Express.Multer.File,
  ) {
    // Generate a unique filename to avoid conflicts
    const filename = `${Date.now()}-${file.originalname}`;

    const result = await this.storageService.uploadFile(
      user.id,
      projectId,
      filename,
      file.buffer,
    );

    return {
      message: result,
      filename,
      originalName: file.originalname,
      projectId,
      size: file.size,
      mimetype: file.mimetype,
      userId: user.id,
    };
  }

  /**
   * Delete a specific file from a project
   */
  @Delete('projects/:projectId/files/:filename')
  async deleteFile(
    @CurrentUser() user: SafeUser,
    @Param('projectId') projectId: string,
    @Param('filename') filename: string,
  ) {
    const result = await this.storageService.deleteFile(
      user.id,
      projectId,
      filename,
    );
    return { message: result, filename, projectId };
  }

  /**
   * Delete all files in a project
   */
  @Delete('projects/:projectId/files')
  async deleteAllProjectFiles(
    @Param('projectId') projectId: string,
    @CurrentUser() user: SafeUser,
  ) {
    const result = await this.storageService.deleteAllProjectFiles(
      user.id,
      projectId,
    );
    return { message: result, projectId };
  }
}
