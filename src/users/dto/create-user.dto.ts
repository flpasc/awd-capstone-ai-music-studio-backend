import { createZodDto } from 'nestjs-zod';
import z from 'zod';

export const CreateUserSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
  lastName: z.string().min(1).max(50),
  firstName: z.string().min(1).max(50),
});

export class CreateUserDto extends createZodDto(CreateUserSchema) {}
