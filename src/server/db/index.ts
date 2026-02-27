import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

const connectionString = process.env.POSTGRES_URL!;
const sql = postgres(connectionString);
export const db = drizzle(sql, { schema });
