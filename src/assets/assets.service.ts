import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Asset } from './entities/asset.entity';
import { In, Repository } from 'typeorm';
import { Project } from 'src/projects/entities/project.entity';

// TODO: Remove default userId
const DEFAULT_USER_ID = '1';

@Injectable()
export class AssetsService {
  constructor(
    @InjectRepository(Asset)
    private readonly assetsRepo: Repository<Asset>,

    @InjectRepository(Project)
    private readonly projectsRepo: Repository<Project>,
  ) { }

  async create(createAssetDto: CreateAssetDto): Promise<Asset> {
    try {
      const { name, metadata, format, projectId } = createAssetDto;
      const newAsset = this.assetsRepo.create({
        userId: DEFAULT_USER_ID,
        name,
        metadata,
        format,
      });

      const saveAsset = await this.assetsRepo.save(newAsset);
      const project = await this.projectsRepo.findOne({
        where: { id: projectId },
        relations: ['assets'],
      });

      if (!project) {
        throw new Error(`No project available`);
      }

      project.assets.push(saveAsset);
      console.log(project, saveAsset);
      await this.projectsRepo.save(project);

      return saveAsset;
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

  async findAllByIds(ids: string[]): Promise<Asset[]> {
    return this.assetsRepo.find({ where: { id: In(ids) } });
  }
}
