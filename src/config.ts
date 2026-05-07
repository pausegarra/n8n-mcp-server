import { z } from "zod";

const configSchema = z.object({
  N8N_BASE_URL: z.string().url(),
  N8N_API_KEY: z.string().min(1),
  N8N_TIMEOUT_MS: z.coerce.number().int().positive().default(10_000),
});

export type AppConfig = z.infer<typeof configSchema>;

export function getConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return configSchema.parse(env);
}
