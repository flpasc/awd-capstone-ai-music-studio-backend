import { Module } from '@nestjs/common';
import { AuthService } from 'src/auth/auth.service';
import { StorageController } from './storage.controller';
import { StorageService } from './storage.service';

@Module({
  controllers: [StorageController],
  providers: [StorageService, AuthService],
  exports: [StorageService],
})
export class MinioModule {}
