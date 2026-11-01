import { readFileSync } from "node:fs";
import { db, upsertDeal } from "./db.ts";
import { dealSchema, retailerSchema } from "./validation.ts";

const updateId = "2026-11-01-beauty-campaign-links";

/** Apply the requested campaigns once; later edits in the admin remain authoritative. */
export function applyContentUpdates() {
  const database = db();
  database.exec(`CREATE TABLE IF NOT EXISTS content_updates (
    id TEXT PRIMARY KEY,
    applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  )`);
  database.exec("BEGIN IMMEDIATE");
  try {
    if (!database.prepare("SELECT 1 FROM content_updates WHERE id = ?").get(updateId)) {
      const offers = JSON.parse(readFileSync(new URL("../data/seed-offers.json", import.meta.url), "utf8")) as { slug: string }[];
      const offer = dealSchema.parse(offers.find((item) => item.slug === "no7-beauty-us-campaign"));
      if (!database.prepare("SELECT 1 FROM deals WHERE slug = ?").get(offer.slug)) upsertDeal(offer);

      const retailers = JSON.parse(readFileSync(new URL("../data/seed-retailers.json", import.meta.url), "utf8")) as { name: string }[];
      for (const name of ["No7 Beauty (US)", "Sephora UK", "Cult Beauty", "Estée Lauder (Canada)"]) {
        const retailer = retailerSchema.parse(retailers.find((item) => item.name === name));
        database.prepare("INSERT OR IGNORE INTO retailers (name) VALUES (?)").run(name);
        database.prepare(`UPDATE retailers SET
          my_link = ?,
          network = COALESCE(NULLIF(network, ''), ?),
          signup_url = COALESCE(NULLIF(signup_url, ''), ?),
          notes = CASE WHEN COALESCE(notes, '') = '' THEN ? ELSE notes || char(10) || ? END,
          updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
          WHERE name = ?`).run(retailer.myLink, retailer.network, retailer.signupUrl, retailer.notes, retailer.notes, name);
      }
      database.prepare("INSERT INTO content_updates (id) VALUES (?)").run(updateId);
    }
    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
}
