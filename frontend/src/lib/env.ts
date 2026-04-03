interface EnvConfig {
  supabaseUrl: string
  supabaseAnonKey: string
  appName: string
}

/**
 * Validates that all required VITE_ environment variables are present at startup.
 * @returns Typed EnvConfig object with validated values
 * @throws Error listing every missing variable name if any are absent
 * @example
 * import { env } from './env'
 * const client = createClient(env.supabaseUrl, env.supabaseAnonKey)
 */
function validateEnv(): EnvConfig {
  const required = {
    VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
    VITE_APP_NAME: import.meta.env.VITE_APP_NAME,
  }

  const missing = Object.entries(required)
    .filter(([, value]) => !value)
    .map(([key]) => key)

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables:\n${missing.join('\n')}\n` +
        `Please check your .env file and docker-compose.yml build args.`
    )
  }

  return {
    supabaseUrl: required.VITE_SUPABASE_URL,
    supabaseAnonKey: required.VITE_SUPABASE_ANON_KEY,
    appName: required.VITE_APP_NAME,
  }
}

export const env = validateEnv()
