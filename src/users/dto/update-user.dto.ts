import { createZodDto } from 'nestjs-zod';
import { CreateUserSchema } from './create-user.dto';

export const UpdateUserSchema = CreateUserSchema.partial();
export class UpdateUserDto extends createZodDto(UpdateUserSchema) {}
