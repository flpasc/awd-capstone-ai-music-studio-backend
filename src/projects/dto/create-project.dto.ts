import { createZodDto } from 'nestjs-zod';
import z from 'zod';

export const CreateProjectSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500),
});

export class CreateProjectDto extends createZodDto(CreateProjectSchema) {}
