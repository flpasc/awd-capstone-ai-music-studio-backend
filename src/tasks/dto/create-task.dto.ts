import { createZodDto } from 'nestjs-zod';
import { TaskKind, TaskStatus } from '../entities/task.entity';
import z from 'zod';

export const CreateTaskSchema = z.object({
  projectId: z.string().uuid(),
  kind: z.enum(TaskKind),
  status: z.enum(TaskStatus).optional(),
  progress: z.number().min(0).max(100).optional(),
  error: z
    .string()
    .nullish()
    .transform((value) => {
      return value ?? undefined;
    })
    .optional(),
  params: z.record(z.string(), z.unknown()).optional(),
  result: z.record(z.string(), z.unknown()).nullable().optional(),
});

export class CreateTaskDto extends createZodDto(CreateTaskSchema) {}
