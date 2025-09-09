import { PartialType, PickType } from '@nestjs/mapped-types';
import { CreateTaskDto } from './create-task.dto';
import { IsOptional } from 'class-validator';

export class UpdateTaskDto extends PartialType(
  PickType(CreateTaskDto, ['kind', 'status', 'progress', 'error'] as const),
) {
  // You can add additional fields here if needed
  @IsOptional()
  result?: Record<string, unknown>;
}
