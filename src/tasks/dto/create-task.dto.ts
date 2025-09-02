import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { TaskKind, TaskStatus } from '../entities/task.entity';

export class CreateTaskDto {
  @IsNotEmpty()
  @IsString()
  projectId: string;

  @IsNotEmpty()
  @IsEnum(TaskKind)
  kind: TaskKind;

  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;
}
