/**
 * Load and validate environment configuration
 */
interface Config {
  // Server
  port: number;
  host: string;

  // GOST
  gostApiUrl: string;
  gostApiAuth?: string;

  // Supabase
  supabaseUrl: string;
  supabaseKey: string;
  supabaseTable: string;
}

export function loadConfig(): Config {
  const requiredEnvVars = ["SUPABASE_URL", "SUPABASE_KEY"];

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      throw new Error(`Missing required environment variable: ${envVar}`);
    }
  }

  return {
    port: parseInt(process.env.PORT || "18090", 10),
    host: process.env.HOST || "127.0.0.1",

    gostApiUrl: process.env.GOST_API_URL || "http://localhost:18080",
    gostApiAuth: process.env.GOST_API_AUTH,

    supabaseUrl: process.env.SUPABASE_URL!,
    supabaseKey: process.env.SUPABASE_KEY!,
    supabaseTable: process.env.SUPABASE_TABLE || "gost_nodes",
  };
}
