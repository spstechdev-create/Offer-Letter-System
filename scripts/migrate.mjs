import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";
const sql = neon(process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL);
const [target] =
  await sql`select current_setting('neon.project_id',true) project_id,current_setting('neon.branch_id',true) branch_id`;
if (
  target.project_id !== "tiny-art-76325382" ||
  target.branch_id !== "br-gentle-recipe-b3l8lb8j"
)
  throw new Error(
    "Database target differs from verified development endpoint. Review before migrating.",
  );
await migrate(drizzle(sql), { migrationsFolder: "./drizzle" });
console.log("Versioned migration applied to verified development database.");
