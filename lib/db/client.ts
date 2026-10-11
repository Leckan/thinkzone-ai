import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "@/db/schema";

type PostgresClient = ReturnType<typeof postgres>;
const globalForDb = globalThis as typeof globalThis & { __thinkZonePg?: PostgresClient };

export function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required for PostgreSQL-backed services.");
  globalForDb.__thinkZonePg ??= postgres(url, { max: 10, prepare: false });
  return drizzle(globalForDb.__thinkZonePg, { schema });
}
