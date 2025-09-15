import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseInterceptors,
  HttpStatus,
  ParseFilePipeBuilder,
  UseGuards,
  UploadedFiles,
} from '@nestjs/common';
import { ZodValidationPipe } from 'src/common/pipes/zod-validation.pipe';
import { AssetsService } from './assets.service';
import { UpdateAssetSchema } from './dto/update-asset.dto';
import type { UpdateAssetDto } from './dto/update-asset.dto';
import { FilesInterceptor } from '@nestjs/platform-express';
import { StorageService } from 'src/storage/storage.service';

import { getAssetFormat } from './helpers/asset-format.helper';
import { AuthGuard } from 'src/auth/auth.guard';
import { CurrentUser } from 'src/auth/current-user.decorator';
import type { SafeUser } from 'src/auth/current-user.decorator';
import type { UploadResult } from './entities/asset.entity';

@Controller('assets')
@UseGuards(AuthGuard)
export class AssetsController {
  constructor(
    private readonly assetsService: AssetsService,
    private readonly storageService: StorageService,
  ) {}

  @Post(':projectId')
  @UseInterceptors(
    FilesInterceptor(
      'files',
      // INFO: This is not a class const because ESLINT will not recognise usage in a Decorator and throw error
      Number(process.env.MINIO_MAX_SIMULTANEOUS_FILE_UPLOAD) || 10,
    ),
  )
  async uploadMultipleFiles(
    @Param('projectId') projectId: string,
    @CurrentUser() user: SafeUser,
    @UploadedFiles(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({
          fileType:
            '.(png|img|jpeg|jpg|webp|pdf|txt|doc|docx|mp3|wav|m4a|mp4|mov|webm|mpeg|wmv|mpg)',
        })
        .addMaxSizeValidator({
          // INFO: This is not a class const because ESLINT will not recognise usage in a Decorator and throw error
          maxSize: Number(process.env.MINIO_FILE_UPLOAD_SIZE) || 20000000,
        })
        .build({
          errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        }),
    )
    files: Express.Multer.File[],
  ): Promise<UploadResult[]> {
    const uploadResults: UploadResult[] = [];

    for (const file of files) {
      const filename = `${Date.now()}-${file.originalname}`;
      const uploadResult = await this.storageService.uploadFile(
        user.id,
        projectId,
        filename,
        file.buffer,
      );

      const fileFormat = getAssetFormat(filename);
      await this.assetsService.create({
        userId: user.id,
        projectId,
        originalName: file.originalname,
        storageName: filename,
        metadata: { size: file.size, mimetype: file.mimetype },
        format: fileFormat,
      });
      uploadResults.push({
        message: uploadResult,
        filename,
        originalName: file.originalname,
        projectId,
        size: file.size,
        mimetype: file.mimetype,
        userId: user.id,
      });
    }

    return uploadResults;
  }

  @Get()
  findAll() {
    return this.assetsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.assetsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateAssetSchema))
    updateAssetDto: UpdateAssetDto,
  ) {
    return this.assetsService.update(id, updateAssetDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.assetsService.remove(id);
  }
}
