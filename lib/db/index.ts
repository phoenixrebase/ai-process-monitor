import { drizzle as drizzleVercel } from "drizzle-orm/vercel-postgres";
import { drizzle as drizzleNode } from "drizzle-orm/node-postgres";
import { sql } from "@vercel/postgres";
import { Pool } from "pg";
import * as schema from "./schema";
import { getConfig } from "@/lib/config";

const config = getConfig();

const isLocalConnection = (url: string): boolean => {
  const localPatterns = [
    /^postgresql:\/\/([^@]+@)?localhost(:|\/|$)/i,
    /^postgres:\/\/([^@]+@)?localhost(:|\/|$)/i,
    /^postgresql:\/\/([^@]+@)?127\.0\.0\.1(:|\/|$)/i,
    /^postgres:\/\/([^@]+@)?127\.0\.0\.1(:|\/|$)/i,
  ];
  return localPatterns.some(pattern => pattern.test(url));
};

const isLocal = isLocalConnection(config.postgres.url);

export const db = isLocal
  ? drizzleNode(new Pool({ connectionString: config.postgres.url }), {
      schema,
    })
  : drizzleVercel(sql, { schema });
