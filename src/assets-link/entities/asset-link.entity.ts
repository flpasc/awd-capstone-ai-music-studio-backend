import { Asset } from 'src/assets/entities/asset.entity';
import { Project } from 'src/projects/entities/project.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('asset_links')
@Index(['userId', 'assetId'], { unique: false }) // Allow multiple links per user-asset
@Index(['projectId', 'assetId'], {
  unique: true,
  where: 'project_id IS NOT NULL',
}) // Unique project-asset when project exists
export class AssetLink {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'asset_id' })
  assetId: string;

  @Column({ name: 'project_id', nullable: true })
  projectId?: string; // NULL = user owns asset, NOT NULL = asset used in project

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // Relationships
  @ManyToOne(() => Asset)
  @JoinColumn({ name: 'asset_id' })
  asset: Asset;

  @ManyToOne(() => Project)
  @JoinColumn({ name: 'project_id' })
  project?: Project;
}
