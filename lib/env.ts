import { z } from 'zod/v3';

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().min(1),

  // Authentication (Clerk)
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),
  CLERK_SECRET_KEY: z.string().min(1),

  // AI (OpenRouter)
  OPENROUTER_API_KEY: z.string().min(1),
  
  // AI (OpenAI) - For embeddings (required for semantic search)
  OPENAI_API_KEY: z.string().min(1),

  // Storage (ImageKit)
  IMAGEKIT_PUBLIC_KEY: z.string().min(1),
  IMAGEKIT_PRIVATE_KEY: z.string().min(1),
  IMAGEKIT_URL_ENDPOINT: z.string().url(),
  IMAGEKIT_UPLOAD_FOLDER: z.string().default("/quantum"),

  // Cache & Rate Limiting (Upstash)
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  UPSTASH_RATELIMIT_REST_URL: z.string().url().optional(),
  UPSTASH_RATELIMIT_REST_TOKEN: z.string().optional(),

  // App
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

export type Env = z.infer<typeof envSchema>;

function getEnv(): Env {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missing = error.issues.map((e) => e.path.join(".")).join(", ");
      throw new Error(`Missing or invalid environment variables: ${missing}`);
    }
    throw error;
  }
}

export const env = getEnv();

