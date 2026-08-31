import { existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { config as loadEnv } from 'dotenv';
import { z } from 'zod';

function loadBackendEnv(): void {
  const candidates = [
    resolve(process.cwd(), '.env'),
    resolve(import.meta.dirname, '../../.env'),
    resolve(process.env.LOCALAPPDATA ?? '', 'AgriConnect', 'backend.env'),
  ];

  for (const path of candidates) {
    if (existsSync(path) && statSync(path).size > 0) {
      loadEnv({ path });
      return;
    }
  }
}

loadBackendEnv();

const optionalString = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.string().optional(),
);

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65_535).default(5001),
    CLIENT_URL: z.url(),
    CORS_ORIGINS: z.string().min(1),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),
    DATABASE_URL: z.string().min(1),
    DIRECT_URL: z.string().min(1),
    SUPABASE_URL: z.url(),
    SUPABASE_ANON_KEY: optionalString,
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
    SUPABASE_LISTINGS_BUCKET: z.string().min(1).default('listings'),
    JWT_ACCESS_SECRET: z.string().min(64),
    JWT_REFRESH_SECRET: z.string().min(64),
    JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
    JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
    ENCRYPTION_KEY: z.string().regex(/^[\da-f]{64}$/i),
    ADMIN_SEED_EMAIL: z.email(),
    ADMIN_SEED_PASSWORD: z.string().min(12),
    SMTP_HOST: optionalString,
    SMTP_PORT: z.coerce.number().int().min(1).max(65_535).default(465),
    SMTP_USER: optionalString,
    SMTP_PASS: optionalString,
    EMAIL_FROM: z.email().default('noreply@agriconnect.local'),
    SENTRY_DSN: z.preprocess(
      (value) => (value === '' ? undefined : value),
      z.url().optional(),
    ),
    GEMINI_API_KEY: optionalString,
    GEMINI_MODEL: z.preprocess(
      (value) => (value === '' ? undefined : value),
      z.string().min(1).default('gemini-3.6-flash'),
    ),
  })
  .superRefine((value, context) => {
    if (value.JWT_ACCESS_SECRET === value.JWT_REFRESH_SECRET) {
      context.addIssue({
        code: 'custom',
        path: ['JWT_REFRESH_SECRET'],
        message: 'JWT access and refresh secrets must be different',
      });
    }
  })
  .transform((value) => ({
    ...value,
    CORS_ORIGINS: value.CORS_ORIGINS.split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
  }));

export type Env = z.output<typeof envSchema>;

let cachedEnv: Env | undefined;

export function parseEnv(input: NodeJS.ProcessEnv): Env {
  const result = envSchema.safeParse(input);

  if (!result.success) {
    throw new Error(
      `Invalid environment variables: ${z.prettifyError(result.error)}`,
    );
  }

  return result.data;
}

export function getEnv(): Env {
  cachedEnv ??= parseEnv(process.env);
  return cachedEnv;
}

export function resetEnvForTests(): void {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('Environment cache can only be reset while NODE_ENV=test.');
  }
  cachedEnv = undefined;
}
