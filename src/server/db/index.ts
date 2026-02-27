import postgres from "postgres";
import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const connectionString = process.env.POSTGRES_URL ?? "";

export const db = process.env.VERCEL
  ? drizzleNeon(neon(connectionString), { schema })
  : drizzlePostgres(postgres(connectionString), { schema });
