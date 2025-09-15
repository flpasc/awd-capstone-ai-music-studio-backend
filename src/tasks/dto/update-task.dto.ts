import { createZodDto } from 'nestjs-zod';
import { CreateTaskSchema } from './create-task.dto';

export const UpdateTaskSchema = CreateTaskSchema.partial();
export class UpdateTaskDto extends createZodDto(UpdateTaskSchema) {}
