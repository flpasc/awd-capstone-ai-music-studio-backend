import { Module } from '@nestjs/common';
import { AssetsService } from './assets.service';
import { AssetsController } from './assets.controller';
import { Asset } from './entities/asset.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StorageService } from 'src/storage/storage.service';
import { ProjectsService } from 'src/projects/projects.service';
import { Project } from 'src/projects/entities/project.entity';
import { AuthService } from 'src/auth/auth.service';
import { MediaService } from 'src/media/media.service';

@Module({
  imports: [TypeOrmModule.forFeature([Asset, Project])],
  controllers: [AssetsController],
  providers: [
    AssetsService,
    StorageService,
    ProjectsService,
    AuthService,
    MediaService,
  ],
  exports: [AssetsService],
})
export class AssetsModule {}
