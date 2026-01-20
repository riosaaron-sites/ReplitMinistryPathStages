import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

// Priority order for database connection string
function getDatabaseUrl(): string | undefined {
  return process.env.DATABASE_URL || 
         process.env.REPLIT_DATABASE_URL || 
         process.env.POSTGRES_URL;
}

const databaseUrl = getDatabaseUrl();

// Export diagnostic info (never expose full URL)
export function getDatabaseEnvInfo(): { 
  source: 'DATABASE_URL' | 'REPLIT_DATABASE_URL' | 'POSTGRES_URL' | null;
  hasUrl: boolean;
  hostRedacted: string | null;
} {
  if (process.env.DATABASE_URL) {
    return {
      source: 'DATABASE_URL',
      hasUrl: true,
      hostRedacted: extractHostname(process.env.DATABASE_URL),
    };
  }
  if (process.env.REPLIT_DATABASE_URL) {
    return {
      source: 'REPLIT_DATABASE_URL',
      hasUrl: true,
      hostRedacted: extractHostname(process.env.REPLIT_DATABASE_URL),
    };
  }
  if (process.env.POSTGRES_URL) {
    return {
      source: 'POSTGRES_URL',
      hasUrl: true,
      hostRedacted: extractHostname(process.env.POSTGRES_URL),
    };
  }
  return { source: null, hasUrl: false, hostRedacted: null };
}

function extractHostname(url: string): string | null {
  try {
    const parsed = new URL(url);
    return parsed.hostname;
  } catch {
    return 'invalid-url';
  }
}

// Throw error if no database URL is available (same behavior as before)
if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: databaseUrl });
export const db = drizzle({ client: pool, schema });

// Database health check function (safe, no secrets exposed)
export async function checkDatabaseHealth(): Promise<{
  hasDatabaseUrl: boolean;
  envSource: string | null;
  hostRedacted: string | null;
  canConnect: boolean;
  latencyMs: number | null;
  schemaValid: boolean | null;
  error: string | null;
}> {
  const envInfo = getDatabaseEnvInfo();
  
  if (!envInfo.hasUrl) {
    return {
      hasDatabaseUrl: false,
      envSource: null,
      hostRedacted: null,
      canConnect: false,
      latencyMs: null,
      schemaValid: null,
      error: 'No database URL configured. Set DATABASE_URL in deployment secrets.',
    };
  }
  
  const start = Date.now();
  try {
    // Simple connectivity test
    const client = await pool.connect();
    await client.query('SELECT 1');
    const latency = Date.now() - start;
    
    // Basic schema check - verify users table exists
    let schemaValid = true;
    let schemaError: string | null = null;
    try {
      await client.query('SELECT 1 FROM users LIMIT 1');
    } catch (schemaErr) {
      schemaValid = false;
      schemaError = 'Schema not applied - users table missing';
    }
    
    client.release();
    
    return {
      hasDatabaseUrl: true,
      envSource: envInfo.source,
      hostRedacted: envInfo.hostRedacted,
      canConnect: true,
      latencyMs: latency,
      schemaValid,
      error: schemaError,
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    // Sanitize error - remove any potential secrets
    const sanitized = errorMessage
      .replace(/postgresql:\/\/[^@]+@/gi, 'postgresql://***@')
      .replace(/password[=:][^\s&]+/gi, 'password=***')
      .substring(0, 200);
    
    return {
      hasDatabaseUrl: true,
      envSource: envInfo.source,
      hostRedacted: envInfo.hostRedacted,
      canConnect: false,
      latencyMs: null,
      schemaValid: null,
      error: sanitized,
    };
  }
}
