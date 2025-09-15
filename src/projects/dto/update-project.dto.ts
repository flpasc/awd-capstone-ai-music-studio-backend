import { createZodDto } from 'nestjs-zod';
import { CreateProjectSchema } from './create-project.dto';

export const UpdateProjectSchema = CreateProjectSchema.partial();
export class UpdateProjectDto extends createZodDto(UpdateProjectSchema) {}
