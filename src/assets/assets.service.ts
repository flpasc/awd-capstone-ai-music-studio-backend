import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Project } from 'src/projects/entities/project.entity';
import { In, Repository } from 'typeorm';
import { CreateAssetDto } from './dto/create-asset.dto';
import { Asset } from './entities/asset.entity';
import { UpdateAssetDto } from './dto/update-asset.dto';

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
      const newAsset = this.assetsRepo.create(createAssetDto);
      const savedAsset = await this.assetsRepo.save(newAsset);
      const project = await this.projectsRepo.findOne({
        where: { id: createAssetDto.projectId },
        relations: ['assets'],
      });

      if (!project) {
        throw new Error(`No project available`);
      }

      project.assets.push(savedAsset);
      await this.projectsRepo.save(project);

      return savedAsset;
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

  async findOne(id: string): Promise<Asset | null> {
    return this.assetsRepo.findOneBy({ id });
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  update(id: string, updateAssetDto: UpdateAssetDto) {
    return `This action updates a #${id} asset`;
  }

  remove(id: string) {
    return `This action removes a #${id} asset`;
  }

  async findAllByIds(ids: string[]): Promise<Asset[]> {
    return this.assetsRepo.find({ where: { id: In(ids) } });
  }
}
