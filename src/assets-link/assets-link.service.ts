import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AssetLink } from './entities/assets-link.entity';

@Injectable()
export class AssetLinksService {
  constructor(
    @InjectRepository(AssetLink)
    private assetLinkRepository: Repository<AssetLink>,
  ) {}

  async createAssetLink(userId: string, assetId: string, projectId?: string) {
    const link = this.assetLinkRepository.create({
      userId,
      assetId,
      projectId,
    });
    return this.assetLinkRepository.save(link);
  }

  // Get user's owned assets
  async getUserAssets(userId: string) {
    return this.assetLinkRepository.find({
      where: { userId },
      relations: ['asset'],
    });
  }

  // Get project assets
  async getProjectAssets(projectId: string) {
    return this.assetLinkRepository.find({
      where: { projectId },
      relations: ['asset'],
    });
  }

  // Remove asset from project
  async unlinkAssetFromProject(assetId: string, projectId: string) {
    return this.assetLinkRepository.delete({ assetId, projectId });
  }
}
