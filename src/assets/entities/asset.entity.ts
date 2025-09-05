import { Project } from 'src/projects/entities/project.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export interface AssetMetadata {
  size: number;
  mimetype: string;
}

export enum AssetFormat {
  AUDIO = 'audio',
  VIDEO = 'video',
  IMAGE = 'image',
  OUTPUT = 'output',
  UNKNOWN = 'unknown',
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
  // @JoinTable({
  //   name: 'project_assets',
  //   joinColumn: { name: 'project_id', referencedColumnName: 'id' },
  //   inverseJoinColumn: { name: 'asset_id', referencedColumnName: 'id' },
  // })
  projects: Project[];
}
