import fs from "node:fs/promises";
import path from "node:path";
import { parse } from "csv-parse/sync";
import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";

const inputPath = process.argv[2];
const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

function normalizeCode(value) {
  return String(value || "").trim().toUpperCase().replace(/\s+/g, "");
}

async function loadRecords() {
  if (!inputPath) {
    throw new Error("Usage: npm run seed:reviewers -- data/reviewers.csv");
  }

  const fullPath = path.resolve(process.cwd(), inputPath);
  const raw = await fs.readFile(fullPath, "utf8");

  if (fullPath.endsWith(".json")) {
    return JSON.parse(raw);
  }

  if (fullPath.endsWith(".csv")) {
    return parse(raw, { columns: true, skip_empty_lines: true });
  }

  throw new Error("Use a .json or .csv file for reviewer seeding.");
}

async function main() {
  const records = await loadRecords();
  const payload = records.map((row) => ({
    code: normalizeCode(row.code),
    display_name: String(row.display_name || "").trim(),
    institution: String(row.institution || "").trim() || null,
    title: String(row.title || "").trim() || null,
    role: row.role === "admin" ? "admin" : "reviewer"
  }));

  if (payload.some((row) => !row.code || !row.display_name)) {
    throw new Error("Each reviewer requires at least code and display_name.");
  }

  const { error } = await supabase.from("reviewers").upsert(payload, {
    onConflict: "code"
  });

  if (error) {
    throw error;
  }

  console.log(`Seeded ${payload.length} reviewers from ${inputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
