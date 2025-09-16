import { z } from 'zod';

// Environment variables validation schema
const configSchema = z.object({
  // Application
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z
    .string()
    .default('3001')
    .transform((val) => parseInt(val, 10)),

  // Database
  DB_URL: z.url(),
  DB_LOGGING: z
    .string()
    .optional()
    .transform((val) => val === 'true'),

  // MinIO Storage - critical for production deployment
  MINIO_ENDPOINT: z.string(),
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
});

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
