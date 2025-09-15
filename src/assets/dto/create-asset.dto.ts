import { createZodDto } from 'nestjs-zod';
import { AssetFormat, AssetMetadataSchema } from '../entities/asset.entity';
import { z } from 'zod';

export const CreateAssetSchema = z.object({
  userId: z.string().min(1),
  originalName: z.string().min(1),
  storageName: z.string().min(1),
  projectId: z.string().uuid(),
  metadata: AssetMetadataSchema,
  format: z.nativeEnum(AssetFormat),
});

export class CreateAssetDto extends createZodDto(CreateAssetSchema) {}
