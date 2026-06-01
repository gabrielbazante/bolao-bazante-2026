import { createClient } from "@supabase/supabase-js";
import { TEAMS } from "./teams.js";
import { FIXTURES } from "./fixtures.js";

const url = process.env.SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(url, key, { auth: { persistSession: false } });

async function main() {
  console.log("Seeding teams…");
  const { error: te } = await supabase.from("teams").upsert(TEAMS);
  if (te) throw te;
  console.log(`  ✓ ${TEAMS.length} teams upserted`);

  console.log("Seeding fixtures…");
  const { error: fe } = await supabase.from("fixtures").upsert(FIXTURES);
  if (fe) throw fe;
  console.log(`  ✓ ${FIXTURES.length} fixtures upserted`);

  console.log("Done.");
}
main().catch((e) => { console.error(e); process.exit(1); });
