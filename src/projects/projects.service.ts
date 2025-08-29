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

// TODO: Proper error handling
@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private readonly projectsRepo: Repository<Project>,
  ) {}

  async create(createProjectDto: CreateProjectDto): Promise<Project> {
    try {
      const { userId, name, description } = createProjectDto;

      const newProject = this.projectsRepo.create({
        userId,
        name,
        description,
      });

      return await this.projectsRepo.save(newProject);
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException('Failed to create new project');
    }
  }

  async findAll(): Promise<Project[]> {
    try {
      return await this.projectsRepo.find();
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException('Failed to get all projects');
    }
  }

  async findOne(id: string): Promise<Project> {
    if (!id) {
      throw new BadRequestException('Project ID is required');
    }

    try {
      const project = await this.projectsRepo.findOneBy({ id });

      if (!project) {
        throw new NotFoundException(`Project with id: ${id} does not exists`);
      }

      return project;
    } catch (error) {
      console.error(error);
      throw new NotFoundException(`Project with id: ${id} not found`);
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
      console.error(error);
      throw new BadRequestException(`Could not update project with id: ${id}`);
    }
  }

  async remove(id: string): Promise<Project> {
    if (!id) {
      throw new BadRequestException('Project ID is required');
    }

    try {
      const project = await this.findOne(id);
      const deleteResult = await this.projectsRepo.delete(id);

      if (deleteResult.affected === 0) {
        throw new NotFoundException(`Project with the id: ${id} not found`);
      }

      return project;
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException(
        `Failed to delete project with id: ${id}`,
      );
    }
  }
}
