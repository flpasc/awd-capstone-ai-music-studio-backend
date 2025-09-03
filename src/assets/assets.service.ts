import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Asset } from './entities/asset.entity';
import { Repository } from 'typeorm';
import { Project } from 'src/projects/entities/project.entity';

// TODO: Remove default userId
const DEFAULT_USER_ID = '1';
const DEFAULT_PROJECT_ID = 'Project1';

@Injectable()
export class AssetsService {
  constructor(
    @InjectRepository(Asset)
    private readonly assetsRepo: Repository<Asset>,

    @InjectRepository(Project)
    private readonly projectsRepo: Repository<Project>,
  ) {}

  async create(createAssetDto: CreateAssetDto): Promise<Asset> {
    try {
      const { name, metadata, format } = createAssetDto;
      const newAsset = this.assetsRepo.create({
        userId: DEFAULT_USER_ID,
        name,
        metadata,
        format,
      });

      const project = await this.projectsRepo.findOne({
        where: { name: DEFAULT_PROJECT_ID },
        relations: ['assets'],
      });

      if (!project) {
        throw new Error(`No project available`);
      }

      project.assets.push(newAsset);
      await this.projectsRepo.save(project);

      return await this.assetsRepo.save(newAsset);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : `Unknown Error creating new asset`;
      console.error(`Create asset error: ${errorMessage}`);
      throw new InternalServerErrorException(`Failed to create asset`);
    }
  }

  findAll() {
    return `This action returns all assets`;
  }

  findOne(id: number) {
    return `This action returns a #${id} asset`;
  }

  update(id: number, updateAssetDto: UpdateAssetDto) {
    return `This action updates a #${id} asset`;
  }

  remove(id: number) {
    return `This action removes a #${id} asset`;
  }
}
