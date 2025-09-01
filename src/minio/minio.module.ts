import { Module } from '@nestjs/common';
import { MinioService } from './minio.service';
import { MinioController } from './minio.controller';

@Module({
  controllers: [MinioController],
  providers: [MinioService],
})
export class MinioModule {}
