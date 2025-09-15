import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import type { ZodType, ZodError } from 'zod';

@Injectable()
export class ZodValidationPipe<T = any> implements PipeTransform {
  constructor(private schema: ZodType<T>) {}

  transform(value: unknown): T {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      const error: ZodError = result.error;
      console.error(error);
      throw new BadRequestException({
        message: 'Validation failed',
        errors: error.message,
      });
    }
    return result.data;
  }
}
