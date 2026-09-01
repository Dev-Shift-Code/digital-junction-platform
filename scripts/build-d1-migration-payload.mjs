import { readFileSync, writeFileSync } from "node:fs";

const databaseId = "2a8ea3df-979e-4abb-be56-b8a3a736e70f";
const sql = readFileSync(new URL("../cloudflare/migrations/0001_initial_djdc_schema.sql", import.meta.url), "utf8");

writeFileSync(
  "/home/ubuntu/d1-migration-payload.json",
  JSON.stringify({ database_id: databaseId, sql }),
  "utf8",
);
