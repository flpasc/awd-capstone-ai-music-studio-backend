import { Module } from '@nestjs/common';
import { MinioService } from './storage.service';
import { MinioController } from './storage.controller';

@Module({
  controllers: [MinioController],
  providers: [MinioService],
})
export class MinioModule {}
