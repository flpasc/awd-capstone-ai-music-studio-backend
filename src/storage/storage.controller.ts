import {
  Controller,
  Get,
  HttpStatus,
  Param,
  ParseFilePipeBuilder,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Express } from 'express';
import { MinioService } from './storage.service';

@Controller('storage')
export class MinioController {
  constructor(private readonly minioService: MinioService) {}

  @Post('create/:bucketName')
  async createBucket(@Param('bucketName') bucketName: string) {
    const result = await this.minioService.createBucket(bucketName);
    return { message: result, bucket: bucketName };
  }

  @Get('list/:bucketName')
  async listFiles(@Param('bucketName') bucketName: string) {
    return this.minioService.listFiles(bucketName);
  }

  @Get('list')
  async listBuckets() {
    return this.minioService.listBuckets();
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
          maxSize: 20000000, // 20mb
        })
        .build({
          errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        }),
    )
    file: Express.Multer.File,
  ) {
    const objectName = `${Date.now()}--${file.originalname}`;
    const result = await this.minioService.uploadFile(
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
