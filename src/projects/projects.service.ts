import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { StorageService } from 'src/storage/storage.service';
import { DeleteResult, Repository } from 'typeorm';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { Project } from './entities/project.entity';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private readonly projectsRepo: Repository<Project>,
    private readonly storageService: StorageService,
  ) {}

  async create(
    createProjectDto: CreateProjectDto,
    userId: string,
  ): Promise<Project> {
    try {
      const newProject = this.projectsRepo.create({
        ...createProjectDto,
        userId,
      });
      return this.projectsRepo.save(newProject);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      console.error(`Create project error: ${errorMessage}`);
      throw new InternalServerErrorException('Failed to create project');
    }
  }

  async findAllByUser(userId: string): Promise<Project[]> {
    try {
      return this.projectsRepo.find({
        where: { userId },
        relations: ['assets'],
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      console.error(`Find all projects error: ${errorMessage}`);
      throw new InternalServerErrorException('Failed to retrieve projects');
    }
  }

  // TODO: Should the user be able to upload same fiel name??
  async findOne(projectId: string, userId: string): Promise<Project> {
    try {
      const project = await this.projectsRepo.findOne({
        where: { id: projectId, userId },
        relations: ['assets', 'tasks'],
      });

      if (!project) {
        throw new NotFoundException(
          `Project with id: ${projectId} does not exist`,
        );
      }

      const assetsWithUrls = await Promise.all(
        project.assets.map(async (asset) => {
          try {
            const downloadUrl =
              await this.storageService.getDownloadPresignedUrl(
                asset.userId,
                projectId,
                asset.storageName,
              );

            return {
              ...asset,
              downloadUrl,
            };
          } catch (error) {
            console.error(
              `Failed to generate url for asset: ${asset.id}`,
              error,
            );
            return {
              ...asset,
            };
          }
        }),
      );

      return {
        ...project,
        assets: assetsWithUrls,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      console.error(`Find project error: ${errorMessage} - ID: ${projectId}`);
      throw new InternalServerErrorException('Failed to retrieve project');
    }
  }

  async update(
    id: string,
    userId: string,
    updateProjectDto: UpdateProjectDto,
  ): Promise<Project> {
    try {
      const project = await this.findOne(id, userId);
      if (updateProjectDto.name && updateProjectDto.name !== project.name) {
        const duplicateProject = await this.projectsRepo.findOne({
          where: { userId: userId, name: updateProjectDto.name },
        });

        if (duplicateProject) {
          throw new ConflictException(
            `Project with the name ${updateProjectDto.name} already exists`,
          );
        }
      }
      await this.projectsRepo.update(id, updateProjectDto);
      return await this.findOne(id, userId);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      console.error(`Update project error: ${errorMessage} - ID: ${id}`);
      throw new InternalServerErrorException('Failed to update project');
    }
  }

  async remove(id: string, userId: string): Promise<DeleteResult> {
    try {
      return this.projectsRepo.delete({ id, userId });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      console.error(`Delete project error: ${errorMessage} - ID: ${id}`);
      throw new InternalServerErrorException('Failed to delete project');
    }
  }
}
