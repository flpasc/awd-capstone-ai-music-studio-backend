import { Asset } from 'src/assets/entities/asset.entity';
import { Task } from 'src/tasks/entities/task.entity';
import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
  JoinTable,
  OneToMany,
} from 'typeorm';

export interface StorageUrl {
  filename: string;
  downloadUrl: string;
}

@Entity('projects')
export class Project {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column()
  name: string;

  @Column()
  description: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToMany(() => Asset, (asset) => asset.projects)
  @JoinTable({
    name: 'project_assets',
    joinColumn: { name: 'project_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'asset_id', referencedColumnName: 'id' },
  })
  assets: Asset[];

  storageUrls?: StorageUrl[];

  @OneToMany(() => Task, (task) => task.project)
  tasks: Task[];
}
