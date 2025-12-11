import { z } from 'zod';

export const ConfigSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
    PORT: z.coerce.number().int().positive().default(3000),
    DATA_BACKEND: z.enum(['in-memory', 'file', 'postgres']).default('in-memory'),
    DATA_DIR: z.string().optional(),
    DATABASE_URL: z.string().url().optional(),
    // Kafka/outbox
    KAFKA_BROKERS: z.string().optional(),
    KAFKA_CLIENT_ID: z.string().default('mission-ops'),
    KAFKA_OUTBOX_ENABLED: z
      .union([z.boolean(), z.string().transform((v) => v === 'true')])
      .default(false),
    KAFKA_OUTBOX_POLL_MS: z.coerce.number().int().positive().default(1000),
    KAFKA_OUTBOX_BATCH_SIZE: z.coerce.number().int().positive().default(50),
  })
  .refine(
    (cfg) => {
      if (cfg.DATA_BACKEND === 'file') {
        return typeof cfg.DATA_DIR === 'string' && cfg.DATA_DIR.length > 0;
      }
      if (cfg.DATA_BACKEND === 'postgres') {
        return typeof cfg.DATABASE_URL === 'string' && cfg.DATABASE_URL.length > 0;
      }
      return true;
    },
    (cfg) =>
      cfg.DATA_BACKEND === 'file'
        ? { message: 'DATA_DIR is required when DATA_BACKEND is "file"', path: ['DATA_DIR'] }
        : {
            message: 'DATABASE_URL is required when DATA_BACKEND is "postgres"',
            path: ['DATABASE_URL'],
          },
  );

export type AppConfig = z.infer<typeof ConfigSchema>;
