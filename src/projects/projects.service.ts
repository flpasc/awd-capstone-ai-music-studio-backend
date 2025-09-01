import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Project } from './entities/project.entity';
import { Repository } from 'typeorm';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private readonly projectsRepo: Repository<Project>,
  ) {}

  async create(createProjectDto: CreateProjectDto): Promise<Project> {
    try {
      const { name, description } = createProjectDto;

      const newProject = this.projectsRepo.create({
        name,
        description,
      });

      return await this.projectsRepo.save(newProject);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      console.error(`Create project error: ${errorMessage}`);
      throw new InternalServerErrorException('Failed to create project');
    }
  }

  async findAll(): Promise<Project[]> {
    try {
      return await this.projectsRepo.find();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      console.error(`Find all projects error: ${errorMessage}`);
      throw new InternalServerErrorException('Failed to retrieve projects');
    }
  }

  async findOne(id: string): Promise<Project> {
    if (!id) {
      throw new BadRequestException('Project ID is required');
    }

    try {
      const project = await this.projectsRepo.findOneBy({ id });

      if (!project) {
        throw new NotFoundException(`Project with id: ${id} does not exist`);
      }

      return project;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      console.error(`Find project error: ${errorMessage} - ID: ${id}`);
      throw new InternalServerErrorException('Failed to retrieve project');
    }
  }

  async update(
    id: string,
    updateProjectDto: UpdateProjectDto,
  ): Promise<Project> {
    if (!id) {
      throw new BadRequestException('Project ID is required');
    }
    try {
      const project = await this.findOne(id);

      if (updateProjectDto.name && updateProjectDto.name !== project.name) {
        const duplicateProject = await this.projectsRepo.findOne({
          where: { userId: project.userId, name: updateProjectDto.name },
        });

        if (duplicateProject) {
          throw new ConflictException(
            `Project with the name ${updateProjectDto.name} already exists`,
          );
        }
      }
      await this.projectsRepo.update(id, updateProjectDto);
      return await this.findOne(id);
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

  async remove(id: string): Promise<Project> {
    if (!id) {
      throw new BadRequestException('Project ID is required');
    }

    try {
      const project = await this.findOne(id);
      await this.projectsRepo.delete(id);
      return project;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      console.error(`Delete project error: ${errorMessage} - ID: ${id}`);
      throw new InternalServerErrorException('Failed to delete project');
    }
  }
}
