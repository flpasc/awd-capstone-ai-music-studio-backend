import { createZodDto } from 'nestjs-zod';
import { CreateAssetSchema } from './create-asset.dto';

export const UpdateAssetSchema = CreateAssetSchema.partial();
export class UpdateAssetDto extends createZodDto(UpdateAssetSchema) {}
