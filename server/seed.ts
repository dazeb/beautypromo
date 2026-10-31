/**
 * Load the seed files in data/ into the database.
 *   node server/seed.ts                   upsert offers by slug, add dates if none exist, fill in retailer programmes
 *   node server/seed.ts --retailers-only  only fill in retailer programmes (safe on a live database)
 *   node server/seed.ts --demo-clicks     also add 30 days of fake clicks for the dashboard
 */
import "./env.ts";
import { readFileSync } from "node:fs";
import { db, dbPath, upsertDeal } from "./db.ts";
import { dealSchema, fieldErrors, keyDateSchema, retailerSchema } from "./validation.ts";

const readJson = (file: string) => JSON.parse(readFileSync(file, "utf8")) as unknown[];

/**
 * Add any missing retailers and fill in programme details that are still blank, so edits made in the
 * admin are never overwritten. Retailers with no offers and nothing filled in are removed.
 */
function seedRetailers() {
  const items = readJson("data/seed-retailers.json");
  const fill = db().prepare(
    `UPDATE retailers SET
       network = COALESCE(NULLIF(network, ''), ?), signup_url = COALESCE(NULLIF(signup_url, ''), ?),
       commission = COALESCE(NULLIF(commission, ''), ?), notes = COALESCE(NULLIF(notes, ''), ?)
     WHERE name = ?`,
  );
  db().exec("BEGIN");
  for (const item of items) {
    const r = retailerSchema.parse(item);
    db().prepare("INSERT OR IGNORE INTO retailers (name) VALUES (?)").run(r.name);
    fill.run(r.network, r.signupUrl, r.commission, r.notes, r.name);
  }
  const removed = db()
    .prepare(
      `DELETE FROM retailers WHERE status = 'todo'
         AND COALESCE(network, '') = '' AND COALESCE(signup_url, '') = '' AND COALESCE(my_link, '') = '' AND COALESCE(notes, '') = ''
         AND NOT EXISTS (SELECT 1 FROM deals d WHERE d.retailer = retailers.name)`,
    )
    .run().changes;
  db().exec("COMMIT");
  console.log(`Retailers: ${items.length} programmes checked, ${removed} empty retailers removed`);
}

if (process.argv.includes("--retailers-only")) {
  seedRetailers();
  process.exit(0);
}

const offers = readJson("data/seed-offers.json");
const dates = readJson("data/seed-dates.json");

let created = 0;
let updated = 0;
db().exec("BEGIN");
for (const item of offers) {
  const parsed = dealSchema.safeParse(item);
  if (!parsed.success) {
    console.error(`Skipping ${(item as { slug?: string }).slug}:`, fieldErrors(parsed.error));
    continue;
  }
  const existing = db().prepare("SELECT id FROM deals WHERE slug = ?").get(parsed.data.slug);
  upsertDeal(parsed.data, existing ? Number(existing.id) : undefined);
  existing ? updated++ : created++;
  db().prepare("INSERT OR IGNORE INTO retailers (name) VALUES (?)").run(parsed.data.retailer);
}
if (!db().prepare("SELECT 1 FROM key_dates LIMIT 1").get()) {
  for (const d of dates) {
    const r = keyDateSchema.parse(d);
    db().prepare("INSERT INTO key_dates (date, label, note) VALUES (?, ?, ?)").run(r.date, r.label, r.note);
  }
}
db().exec("COMMIT");
console.log(`Offers: ${created} created, ${updated} updated → ${dbPath}`);
seedRetailers();

if (process.argv.includes("--demo-clicks")) {
  const ids = db().prepare("SELECT id FROM deals WHERE status = 'published'").all().map((r) => Number(r.id));
  const sources = ["grid", "featured", "ending", "advent"];
  const insert = db().prepare("INSERT INTO clicks (deal_id, created_at, source) VALUES (?, ?, ?)");
  db().exec("BEGIN");
  let n = 0;
  for (let day = 0; day < 30; day++) {
    for (let i = 0; i < 8 + Math.floor(Math.random() * 30); i++) {
      // Skew towards the first few offers so "top offers" has a shape.
      const id = ids[Math.floor(Math.random() ** 2 * ids.length)];
      const at = new Date(Date.now() - day * 864e5 - Math.random() * 864e5).toISOString();
      insert.run(id, at, sources[Math.floor(Math.random() * sources.length)]);
      n++;
    }
  }
  db().exec("COMMIT");
  console.log(`Demo clicks: ${n}`);
}
