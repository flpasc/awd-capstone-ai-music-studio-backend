import { IsNotEmpty, IsString } from 'class-validator';
import { Column } from 'typeorm';
import type { AssetFormat, AssetMetadata } from '../entities/asset.entity';

export class CreateAssetDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  originalName: string;

  @IsString()
  @IsNotEmpty()
  storageName: string;

  @Column()
  projectId: string;

  @Column()
  metadata: AssetMetadata;

  @Column()
  format: AssetFormat;
}
