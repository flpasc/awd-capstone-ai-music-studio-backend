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
  UseGuards,
} from '@nestjs/common';
import { AssetsService } from './assets.service';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { StorageService } from 'src/storage/storage.service';

import { getAssetFormat } from './helpers/asset-format.helper';
import type { Express } from 'express';
import { AuthGuard } from 'src/auth/auth.guard';
import { CurrentUser } from 'src/auth/current-user.decorator';
import type { SafeUser } from 'src/auth/current-user.decorator';

@Controller('assets')
@UseGuards(AuthGuard)
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
    @CurrentUser() user: SafeUser,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({
          fileType:
            '.(png|img|jpeg|jpg|webp|pdf|txt|doc|docx|mp3|wav|m4a|mp4|mov|webm|mpeg|wmv|mpg)',
        })
        .addMaxSizeValidator({
          maxSize: Number(process.env.MINIO_FILE_UPLOAD_SIZE) || 20000000,
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
      user.id,
      projectId,
      filename,
      file.buffer,
    );

    // TODO: Add asset id to return
    const fileFormat = getAssetFormat(filename);

    await this.assetsService.create({
      userId: user.id,
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
      userId: user.id,
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
