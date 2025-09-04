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

const createSlideshowSchema = z
  .object({
    imageUrls: z.array(z.string()),
    imageTimings: z.array(z.number().min(1)),
    audioUrls: z.array(z.string()),
    audioTimings: z.array(z.number().min(1)),
    outputVideoKey: z.string().min(1).max(1024),
  })
  .refine(
    (data) => {
      const parts = data.outputVideoKey.split('/');
      return parts.length >= 2 && parts[0].length > 0 && parts[0] !== '..';
    },
    {
      message: 'outputVideoKey must not be in a root folder',
      path: ['outputVideoKey'],
    },
  )
  .refine((data) => data.imageUrls.length === data.imageTimings.length, {
    message: 'imageUrls and imageTimings must have the same length',
    path: ['imageTimings'],
  })
  .refine((data) => data.audioUrls.length === data.audioTimings.length, {
    message: 'audioUrls and audioTimings must have the same length',
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

export const createSlideshowResponseSchema = z.object({
  taskId: z.string(),
  objectName: z.string(),
});

export class CreateSlideshowResponseDto extends createZodDto(createSlideshowResponseSchema) {}