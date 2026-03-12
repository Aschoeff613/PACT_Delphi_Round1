import fs from "node:fs/promises";
import path from "node:path";
import { parse } from "csv-parse/sync";
import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";

const inputPath = process.argv[2] || "data/example-cases.json";
const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

function normalizeRecords(records) {
  if (Array.isArray(records) && records[0]?.section) {
    return records.flatMap((sectionBlock) =>
      sectionBlock.cases.map((item, index) => ({
        section: sectionBlock.section,
        title: item.title,
        scenario: item.scenario,
        task_definition: item.task_definition,
        order_index: item.order_index ?? index
      }))
    );
  }
  return records;
}

async function main() {
  const fullPath = path.resolve(process.cwd(), inputPath);
  const raw = await fs.readFile(fullPath, "utf8");

  let records;
  if (fullPath.endsWith(".json")) {
    records = normalizeRecords(JSON.parse(raw));
  } else if (fullPath.endsWith(".csv")) {
    records = parse(raw, { columns: true, skip_empty_lines: true });
  } else {
    throw new Error("Use a .json or .csv file for seeding.");
  }

  const sections = ["Management", "Communication", "Diagnostic"];

  for (const name of sections) {
    const { error } = await supabase.from("sections").upsert(
      {
        slug: name.toLowerCase(),
        name,
        description: `${name} section`
      },
      { onConflict: "slug" }
    );
    if (error) throw error;
  }

  const { data: sectionRows, error: sectionError } = await supabase
    .from("sections")
    .select("id, name");
  if (sectionError) throw sectionError;

  const sectionByName = new Map(sectionRows.map((row) => [row.name, row.id]));
  const payload = records.map((row, index) => ({
    section_id: sectionByName.get(row.section),
    title: row.title,
    scenario: row.scenario,
    task_definition: row.task_definition,
    order_index: Number(row.order_index ?? index)
  }));

  const { error } = await supabase.from("cases").upsert(payload, {
    onConflict: "section_id,order_index"
  });
  if (error) throw error;

  console.log(`Seeded ${payload.length} cases from ${inputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
