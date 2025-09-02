import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AssetLinksService } from './assets-link.service';
import { AssetLink } from './entities/asset-link.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AssetLink])],
  providers: [AssetLinksService],
  exports: [AssetLinksService],
})
