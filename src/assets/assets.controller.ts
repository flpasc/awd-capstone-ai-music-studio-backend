import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseInterceptors,
  UploadedFile,
  HttpStatus,
  ParseFilePipeBuilder,
} from '@nestjs/common';
import { AssetsService } from './assets.service';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { StorageService } from 'src/storage/storage.service';
import { AssetFormat } from './entities/asset.entity';

import { getAssetFormat } from './helpers/asset-format.helper';
import type { Express } from 'express';

const DEFAULT_USER_ID = '1';
const FILE_MAX_UPLOAD_SIZE = 10000000;

@Controller('assets')
export class AssetsController {
  constructor(
    private readonly assetsService: AssetsService,
    private readonly storageService: StorageService,
  ) {}

  // TODO: Add endpoint for multi file upload
  @Post(':projectId')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @Param('projectId') projectId: string,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({
          fileType:
            '.(png|img|jpeg|jpg|webp|pdf|txt|doc|docx|mp3|wav|m4a|mp4|mov|webm|mpeg|wmv|mpg)',
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
    // Generate a unique filename to avoid conflicts
    const filename = `${Date.now()}-${file.originalname}`;

    const uploadResult = await this.storageService.uploadFile(
      DEFAULT_USER_ID,
      projectId,
      filename,
      file.buffer,
    );

    // TODO: Add asset id to return
    const fileFormat = getAssetFormat(filename);

    await this.assetsService.create({
      userId: DEFAULT_USER_ID,
      projectId,
      originalName: file.originalname,
      storageName: filename,
      metadata: { size: file.size, mimetype: file.mimetype },
      format: fileFormat,
    });

    return {
      message: uploadResult,
      filename,
      originalName: file.originalname,
      projectId,
      size: file.size,
      mimetype: file.mimetype,
      userId: DEFAULT_USER_ID,
    };
  }

  @Get()
  findAll() {
    return this.assetsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.assetsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateAssetDto: UpdateAssetDto) {
    return this.assetsService.update(+id, updateAssetDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.assetsService.remove(+id);
  }
}
