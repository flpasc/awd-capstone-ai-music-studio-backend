/* eslint-disable prettier/prettier */
// import {
//   ArrayMaxSize,
//   ArrayMinSize,
//   IsArray,
//   IsNotEmpty,
//   IsString,
//   MaxLength,
//   ValidatorConstraint,
//   ValidatorConstraintInterface,
//   Validate,
//   ValidationArguments,
// } from 'class-validator';
import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { Task } from 'src/tasks/entities/task.entity';

const createSlideshowSchema = z
  .object({
    imageIds: z.array(z.string()),
    imageTimings: z.array(z.number().min(1)).optional(),
    audioIds: z.array(z.string()),
    audioTimings: z.array(z.number().min(1)).optional()
  })
  .refine((data) => data.imageTimings && data.imageIds.length === data.imageTimings.length, {
    message: 'imageIIds and imageTimings must have the same length',
    path: ['imageTimings'],
  })
  .refine((data) => data.audioTimings && data.audioIds.length === data.audioTimings.length, {
    message: 'audioIDs and audioTimings must have the same length',
    path: ['audioTimings'],
  });

export class CreateSlideshowDto extends createZodDto(createSlideshowSchema) {
  // @IsNotEmpty()
  // @IsString()
  // name: string;
  // @IsString()
  // description: string;
  // @IsNotEmpty()
  // @IsArray()
  // @ArrayMinSize(1)
  // @ArrayMaxSize(10)
  // imageUrls: string[];
  // @IsNotEmpty()
  // @IsArray()
  // @ArrayMinSize(1)
  // @ArrayMaxSize(10)
  // imageTimings: number[];
  // @IsNotEmpty()
  // @IsArray()
  // @ArrayMinSize(1)
  // @ArrayMaxSize(10)
  // audioUrls: string[];
  // @IsNotEmpty()
  // @IsArray()
  // @ArrayMinSize(1)
  // @ArrayMaxSize(10)
  // audioTimings: number[];
  // @IsNotEmpty()
  // @IsString()
  // @MaxLength(1024)
  // outputVideoKey: string;
}

export type CreateSlideshowResponseDto = Task;

export const createSlideshowWorkerResponseDtoSchema = z
  .object({
    id: z.string(),
    progress: z.number(),
    status: z.enum(['processing', 'done', 'error']),
    error: z.string().optional(),
  })
  .superRefine((val, ctx) => {
    if (val.status === 'error') {
      if (!val.error) {
        ctx.addIssue({
          code: 'custom',
          message: 'error is required when status is "error"',
          path: ['error'],
        });
      }
    } else if (val.error !== undefined) {
      ctx.addIssue({
        code: 'custom',
        message: 'error must be undefined unless status is "error"',
        path: ['error'],
      });
    }
  });

export class CreateSlideshowWorkerResponseDto extends createZodDto(createSlideshowWorkerResponseDtoSchema) {}
