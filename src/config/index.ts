import { z } from 'zod';

// Environment variables validation schema
const configSchema = z
  .object({
    // Application
    NODE_ENV: z
      .enum(['development', 'production', 'test'])
      .default('development'),
    PORT: z
      .string()
      .default('3001')
      .transform((val) => parseInt(val, 10)),

    // Database
    DB_HOST: z.string(),
    DB_PORT: z
      .string()
      .default('5432')
      .transform((val) => parseInt(val, 10)),
    DB_NAME: z.string(),
    DB_USER: z.string(),
    DB_PASSWORD: z.string(),
    DB_SSL: z
      .string()
      .optional()
      .transform((val) => val === 'true'),
    DB_SYNCHRONIZE: z
      .string()
      .optional()
      .transform((val) => val === 'true'),
    DB_LOGGING: z
      .string()
      .optional()
      .transform((val) => val === 'true'),

    // MinIO Storage - critical for production deployment
    MINIO_ENDPOINT: z
      .string()
      .refine(
        (val) => !val.startsWith('http://') && !val.startsWith('https://'),
        {
          message: 'MINIO_ENDPOINT must be a host without protocol',
        },
      ),
    MINIO_PRESIGNED_URL_ENDPOINT: z
      .string()
      .optional()
      .refine(
        (val) =>
          !val || (!val.startsWith('http://') && !val.startsWith('https://')),
        {
          message:
            'MINIO_PRESIGNED_URL_ENDPOINT must be a host without protocol',
        },
      ),

    MINIO_PORT: z
      .string()
      .default('9000')
      .transform((val) => parseInt(val, 10)),
    MINIO_SSL: z
      .string()
      .default('false')
      .transform((val) => val === 'true'),
    MINIO_ACCESSKEY: z.string(),
    MINIO_SECRETKEY: z.string(),
    MINIO_PRESIGNED_URL_EXPIRE_TIME: z
      .string()
      .default('3600')
      .transform((val) => parseInt(val, 10)),
    MINIO_FILE_UPLOAD_SIZE: z
      .string()
      .default('20000000')
      .transform((val) => parseInt(val, 10)),
    MINIO_MAX_SIMULTANEOUS_FILE_UPLOAD: z
      .string()
      .default('10')
      .transform((val) => parseInt(val, 10)),
    S3_BUCKET_NAME: z.string(),

    // Auth
    BCRYPT_SALT_ROUNDS: z
      .string()
      .default('10')
      .transform((val) => parseInt(val, 10)),

    // External Services
    VIDEO_WORKER_URL: z.url(),

    // CORS (frontend URL)
    CORS_ORIGIN: z.string(),

    // 3rd Party API Keys (optional)
    FAL_KEY: z.string(),
  })
  .transform((cfg) => ({
    ...cfg,
    MINIO_PRESIGNED_URL_ENDPOINT:
      cfg.MINIO_PRESIGNED_URL_ENDPOINT || cfg.MINIO_ENDPOINT,
  }));
// Validate environment variables on module load
const validateConfig = () => {
  try {
    return configSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.issues
        .map((err) => `${err.path.join('.')}: ${err.message}`)
        .join('\n');

      console.error(`Configuration Error: ${errorMessages}`);
      process.exit(1);
    }
    throw error;
  }
};

// Export validated configuration
export const config = validateConfig();

// Export types for use in other files
export type Config = z.infer<typeof configSchema>;
