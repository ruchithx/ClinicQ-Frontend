import { z } from 'zod';

const envSchema = z.object({
  NEXT_PUBLIC_API_BASE_PATH: z.string().default('/api/v1'),
  NEXT_PUBLIC_APP_NAME: z.string().default('Dispensary Management System'),
  NEXT_PUBLIC_QUEUE_POLL_INTERVAL_MS: z.coerce.number().min(2000).default(5000),
  NEXT_PUBLIC_PRESCRIPTION_POLL_INTERVAL_MS: z.coerce.number().min(5000).default(10000),
  NEXT_PUBLIC_IDLE_TIMEOUT_MINUTES: z.coerce.number().min(1).default(30),
});

const parsed = envSchema.safeParse({
  NEXT_PUBLIC_API_BASE_PATH: process.env['NEXT_PUBLIC_API_BASE_PATH'],
  NEXT_PUBLIC_APP_NAME: process.env['NEXT_PUBLIC_APP_NAME'],
  NEXT_PUBLIC_QUEUE_POLL_INTERVAL_MS: process.env['NEXT_PUBLIC_QUEUE_POLL_INTERVAL_MS'],
  NEXT_PUBLIC_PRESCRIPTION_POLL_INTERVAL_MS:
    process.env['NEXT_PUBLIC_PRESCRIPTION_POLL_INTERVAL_MS'],
  NEXT_PUBLIC_IDLE_TIMEOUT_MINUTES: process.env['NEXT_PUBLIC_IDLE_TIMEOUT_MINUTES'],
});

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
  throw new Error('Invalid environment variables');
}

export const env = parsed.data;
