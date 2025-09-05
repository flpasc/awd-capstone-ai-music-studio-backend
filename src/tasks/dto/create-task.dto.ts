import { IsEnum, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';
import { TaskKind, TaskStatus } from '../entities/task.entity';

export class CreateTaskDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsNotEmpty()
  @IsUUID()
  projectId: string;

  @IsNotEmpty()
  @IsEnum(TaskKind)
  kind: TaskKind;

  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @IsOptional()
  progress?: number;

  @IsOptional()
  error?: string;
}
