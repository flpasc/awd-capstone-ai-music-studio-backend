import { Module } from '@nestjs/common';
import { StorageService } from './storage.service';
import { StorageController } from './storage.controller';
import { AuthService } from 'src/auth/auth.service';

@Module({
  controllers: [StorageController],
  providers: [StorageService, AuthService],
})
export class MinioModule {}
