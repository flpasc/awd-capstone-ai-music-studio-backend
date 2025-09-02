import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

interface AssetMetadata {
  size: number;
  duration: number;
}

export enum AssetFormat {
  VIDEO = 'video',
  AUDIO = 'audio',
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

  @Column('json') // Store as JSON in database
  metadata: AssetMetadata;

  @Column()
  format: AssetFormat;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
