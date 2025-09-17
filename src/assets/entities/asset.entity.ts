import { Project } from 'src/projects/entities/project.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { z } from 'zod';

export const AssetMetadataSchema = z.object({
  size: z.number().positive(),
  mimetype: z.string().min(1),
  fileType: z.enum(['video', 'audio', 'image', 'unknown']).optional(),
  duration: z.number().optional(),
});

export type AssetMetadata = z.infer<typeof AssetMetadataSchema>;

export enum AssetFormat {
  AUDIO = 'audio',
  AI_AUDIO = 'ai_audio',
  VIDEO = 'video',
  IMAGE = 'image',
  OUTPUT = 'output',
  UNKNOWN = 'unknown',
}

export interface UploadResult {
  message: string;
  filename: string;
  originalName: string;
  projectId: string;
  size: number;
  mimetype: string;
  userId: string;
}

@Entity('asset')
export class Asset {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column()
  originalName: string;

  @Column()
  storageName: string;

  @Column('json')
  metadata: AssetMetadata;

  @Column()
  format: AssetFormat;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToMany(() => Project, (project) => project.assets)
  projects: Project[];
}
