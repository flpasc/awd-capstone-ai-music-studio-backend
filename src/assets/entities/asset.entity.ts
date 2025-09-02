import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export interface AssetMetadata {
  size: number;
  duration: number;
}

export enum AssetFormat {
  AUDIO = 'audio',
  VIDEO = 'video',
  IMAGE = 'image',
}

@Entity('asset')
export class Asset {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column()
  name: string;

  @Column('json')
  metadata: AssetMetadata;

  @Column()
  format: AssetFormat;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
