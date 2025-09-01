import {
  Controller,
  Get,
  HttpStatus,
  Param,
  ParseFilePipeBuilder,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Express, Response } from 'express';
import { StorageService } from './storage.service';

// TODO: Move const somewhere else
const FILE_MAX_UPLOAD_SIZE = 20000000; // 20mb

@Controller('storage')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Post('create/:bucketName')
  async createBucket(@Param('bucketName') bucketName: string) {
    const result = await this.storageService.createBucket(bucketName);
    return { message: result, bucket: bucketName };
  }

  @Get('list/:bucketName')
  async listFiles(@Param('bucketName') bucketName: string) {
    return this.storageService.listFiles(bucketName);
  }

  @Get('list')
  async listBuckets() {
    return this.storageService.listBuckets();
  }

  @Post('delete/:bucketName/:fileName')
  async deleteFile(
    @Param('bucketName') bucketName: string,
    @Param('fileName') fileName: string,
  ) {
    const result = await this.storageService.deleteFile(bucketName, fileName);
    return { message: result };
  }

  @Get('download/:bucketName/:filename')
  async downloadFile(
    @Param('bucketName') bucketName: string,
    @Param('filename') filename: string,
    @Res() res: Response,
  ) {
    try {
      const file = await this.storageService.getFile(bucketName, filename);
      res.set({
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${filename}"`,
      });
      res.send(file);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Unknown download error ocurred';
      res.status(404).json({ error: errorMessage });
    }
  }

  // TODO: Allow video upload
  // TODO: Allow multi file upload
  @Post('upload/:bucketName')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @Param('bucketName') bucketName: string,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({
          fileType: '.(png|img|jpeg|jpg|webp)',
        })
        .addMaxSizeValidator({
          maxSize: FILE_MAX_UPLOAD_SIZE,
        })
        .build({
          errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        }),
    )
    file: Express.Multer.File,
  ) {
    const objectName = `${Date.now()}--${file.originalname}`;
    const result = await this.storageService.uploadFile(
      bucketName,
      objectName,
      file.buffer,
    );

    return {
      message: result,
      filename: objectName,
      originalName: file.originalname,
      bucket: bucketName,
      size: file.size,
      mimetype: file.mimetype,
    };
  }
}
