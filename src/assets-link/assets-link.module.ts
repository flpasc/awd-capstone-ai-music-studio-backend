import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AssetsLinksService } from './assets-link.service';
import { AssetLink } from './entities/asset-link.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AssetLink])],
  providers: [AssetsLinksService],
  exports: [AssetsLinksService],
})
export class AssetLinksModule {}
