import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

// TODO: Move enum to separate types folder?
export enum TaskKind {
  RENDER_VIDEO = 'render_video',
  GENERATING_AUDIO = 'generating_audio',
}

export enum TaskStatus {
  RUNNING = 'running',
  ERROR = 'error',
  PENDING = 'pending',
  FINISHED = 'finished',
  CANCELED = 'canceled',
}

@Entity('tasks')
export class Task {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: false, name: 'project_id' })
  projectId: string;

  @Column({ nullable: false, type: 'enum', enum: TaskKind })
  kind: TaskKind;

  @Column({ type: 'enum', enum: TaskStatus, default: TaskStatus.PENDING })
  status: TaskStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
