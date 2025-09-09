import { Project } from 'src/projects/entities/project.entity';
import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  RelationId,
  UpdateDateColumn,
} from 'typeorm';
import z from 'zod';

// TODO: Move enum to separate types folder?
export enum TaskKind {
  CREATE_SLIDESHOW = 'create_slideshow',
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

export interface CreateSlideshowParams {
  imageKeys: string[];
  audioKeys: string[];
  imageTimings: number[];
  audioTimings: number[];
  transitionDuration?: number;
  outputKey: string;
}

export interface CreateSlideshowResult {
  videoKey: string;
  videoEtag: string;
  // thumbnailKey: string;
  // thumbnailEtag: string;
}

export interface TaskBase {
  id: string;
  projectId: string;
  status: TaskStatus;
  progress: number;
  error: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type CreateSlideshowTask = TaskBase & {
  kind: TaskKind.CREATE_SLIDESHOW;
  params: CreateSlideshowParams;
  result: CreateSlideshowResult | null;
};

export type RenderVideoTask = TaskBase & {
  kind: TaskKind.RENDER_VIDEO;
  // params: RenderVideoParams;
  // result: RenderVideoResult | null;
};

const createSlideshowParamsSchema = z.object({
  imageKeys: z.array(z.string()),
  audioKeys: z.array(z.string()),
  imageTimings: z.array(z.number()),
  audioTimings: z.array(z.number()),
  transitionDuration: z.number().optional(),
  outputKey: z.string(),
});
const createSlideshowResultSchema = z
  .object({
    videoKey: z.string(),
    videoEtag: z.string(),
  })
  .nullable();

@Entity('tasks')
export class Task {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @RelationId((task: Task) => task.project)
  projectId: string;

  @Column({ nullable: false, type: 'enum', enum: TaskKind })
  kind: TaskKind;

  @Column({ type: 'enum', enum: TaskStatus, default: TaskStatus.PENDING })
  status: TaskStatus;

  @Column({ type: 'float', default: 0 })
  progress: number;

  @Column({ type: 'text', nullable: true })
  error: string;

  // json params column to store additional information about the task
  @Column({ type: 'jsonb', nullable: true })
  params: Record<string, unknown> | null;

  // json result column to store the result of the task
  @Column({ type: 'jsonb', nullable: true })
  result: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @BeforeInsert()
  @BeforeUpdate()
  validateParamsAndResult() {
    switch (this.kind) {
      case TaskKind.CREATE_SLIDESHOW:
        createSlideshowParamsSchema.parse(this.params ?? {});
        createSlideshowResultSchema.parse(this.result ?? null);
        break;
      // case TaskKind.RENDER_VIDEO: validate other schemas...
      default:
        break;
    }
  }

  @ManyToOne(() => Project, (project) => project.tasks)
  @JoinColumn({ name: 'project_id' })
  project: Project;
}
