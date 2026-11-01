import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";
import { renderAmp } from "../server/amp.ts";

const directory = mkdtempSync(join(tmpdir(), "beautypromos-amp-"));
process.env.DATABASE_PATH = join(directory, "test.db");
const { createSite } = await import("../server/site.ts");
const { db, upsertDeal } = await import("../server/db.ts");
const { publicAmpData } = await import("../server/app.ts");
const { applyContentUpdates } = await import("../server/content-updates.ts");
const site = createSite();
const no7 = "https://us.no7beauty.com/c/offers/campaign/?skimoffer=4257421";

after(() => {
  db().close();
  rmSync(directory, { recursive: true, force: true });
});

const fixture = {
  retailer: "No7 Beauty (US)", title: "No7 campaign", headline: "No7 offers", sub: "US skincare & makeup", details: "Current campaign",
  categories: ["skincare"], code: "BEAUTY", terms: "Retailer terms apply", url: no7, affiliateUrl: null,
  price: null, worth: null, note: null, featured: false, verifiedAt: null, endsAt: null, status: "published",
};

test("AMP is discoverable and the extension is confined to the AMP document", async () => {
  const canonical = await (await site.request("/")).text();
  assert.ok(canonical.includes('<link rel="amphtml" href="https://beautypromos.deals/amp/"'));
  assert.ok(!canonical.includes("amp-skimlinks"));
  const redirect = await site.request("/amp");
  assert.equal(redirect.status, 301);
  assert.equal(redirect.headers.get("location"), "/amp/");
});

test("AMP serves live offers without React and preserves the publisher and canonical URL", async () => {
  upsertDeal({ ...fixture, slug: "no7-campaign" });
  upsertDeal({ ...fixture, slug: "expired-secret", title: "Expired secret offer", endsAt: "2020-01-01T00:00:00Z" });
  upsertDeal({ ...fixture, slug: "draft-secret", title: "Draft secret offer", status: "draft" });
  const response = await site.request("https://untrusted.example/amp/?utm_source=test");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type")!, /text\/html/);
  assert.equal(response.headers.get("cache-control"), "public, max-age=60");
  const document = await response.text();
  assert.match(document, /<html amp lang="en-GB">/);
  const [head, body] = document.split("</head>");
  assert.ok(head.includes('<meta charset="utf-8">'));
  assert.ok(head.includes('<script async src="https://cdn.ampproject.org/v0.js"></script>'));
  assert.ok(head.includes('custom-element="amp-skimlinks"'));
  assert.ok(head.includes('<link rel="canonical" href="https://beautypromos.deals/">'));
  assert.equal([...document.matchAll(/<style amp-boilerplate>/g)].length, 2);
  const styles = document.match(/<style amp-custom>([\s\S]*?)<\/style>/g) ?? [];
  assert.equal(styles.length, 1);
  assert.ok(Buffer.byteLength(styles[0]) < 75_000);
  assert.ok(body.includes('<amp-skimlinks layout="nodisplay" publisher-code="312095X1800668"></amp-skimlinks>'));
  assert.ok(body.includes(no7));
  assert.ok(body.includes("No7 campaign"));
  assert.ok(body.includes("BEAUTY"));
  assert.ok(body.includes('rel="sponsored nofollow noopener"'));
  assert.ok(!document.includes("Expired secret offer"));
  assert.ok(!document.includes("Draft secret offer"));
  assert.ok(!document.includes("untrusted.example"));
  assert.ok(!document.includes("utm_source"));
  assert.ok(!document.includes("window.__LUMIERE__"));
  assert.ok(!/<script[^>]*type="module"/.test(document));
  assert.ok(!/<img\b/.test(document));
  const { version } = JSON.parse(readFileSync("dist/version.json", "utf8"));
  assert.ok(document.includes(`Version ${version}`));
  assert.equal((await site.request("/beautypromos-logo.png")).status, 200);
});

test("AMP preserves explicit affiliate links and the Estée Lauder fallback", () => {
  upsertDeal({ ...fixture, slug: "managed", affiliateUrl: "https://tracking.example/affiliate" });
  upsertDeal({ ...fixture, slug: "estee", retailer: "Estée Lauder" });
  upsertDeal({ ...fixture, slug: "unsafe", url: "javascript:alert(1)" });
  const deals = publicAmpData().deals;
  assert.equal(deals.find((deal) => deal.slug === "managed")?.href, "https://beautypromos.deals/go/managed?s=amp");
  assert.equal(deals.find((deal) => deal.slug === "estee")?.href, "https://beautypromos.deals/go/estee?s=amp");
  assert.ok(!deals.some((deal) => deal.slug === "unsafe"));
});

test("AMP escapes editable offer fields and handles an empty edit", () => {
  const empty = renderAmp({ deals: [], dates: [], verifiedOn: null }, "0.1.27");
  assert.ok(empty.includes("Nothing in this edit right now"));
  const data = publicAmpData();
  const deal = data.deals.find((entry) => entry.slug === "no7-campaign")!;
  const hostile = '</h3><script>alert("x")</script>';
  const document = renderAmp({ ...data, deals: [{ ...deal, title: hostile, details: hostile, code: hostile }] }, "0.1.27");
  assert.ok(!document.includes(hostile));
  assert.ok(document.includes("&lt;script&gt;"));
});

test("campaign seed data preserves supplied links and regional details", () => {
  const offers = JSON.parse(readFileSync("data/seed-offers.json", "utf8"));
  const retailers = JSON.parse(readFileSync("data/seed-retailers.json", "utf8"));
  const offer = offers.find((entry: { slug: string }) => entry.slug === "no7-beauty-us-campaign");
  assert.equal(offer.url, no7);
  assert.equal(offer.price, null);
  assert.equal(offer.worth, null);
  assert.equal(offer.verifiedAt, null);
  assert.equal(retailers.find((entry: { name: string }) => entry.name === offer.retailer).myLink, no7);
  const sephora = retailers.find((entry: { name: string }) => entry.name === "Sephora UK");
  assert.equal(sephora.myLink, "https://www.sephora.pl/halloween/?skimoffer=4256993");
  assert.match(sephora.notes, /Poland/);
  const cult = retailers.find((entry: { name: string }) => entry.name === "Cult Beauty");
  assert.equal(cult.myLink, "https://www.cultbeauty.com/c/cyber-offers/influencers/em-the-nutritionist/?skimoffer=4256708");
  assert.ok(!cult.myLink.includes("%20https"));
  const estee = retailers.find((entry: { name: string }) => entry.name === "Estée Lauder (Canada)");
  assert.equal(new URL(estee.myLink).hostname, "www.esteelauder.ca");
  assert.equal(new URL(estee.myLink).searchParams.get("skimoffer"), "4255621");
});

test("requested campaigns are applied once without overwriting later admin edits", () => {
  const dior = db().prepare("SELECT * FROM deals WHERE slug = ?").get("dior-us-beauty-care-ritual-gift-set")!;
  assert.equal(dior.url, "https://www.dior.com/en_us/beauty/products/the-beauty-and-care-ritual-holiday-gift-set-2026-edition-Y1000123.html?skimoffer=4244464");
  assert.equal(dior.price, null);
  assert.equal(dior.worth, null);
  assert.equal(dior.verified_at, null);
  const offer = db().prepare("SELECT * FROM deals WHERE slug = ?").get("no7-beauty-us-campaign")!;
  assert.equal(offer.url, no7);
  const sephora = db().prepare("SELECT * FROM retailers WHERE name = ?").get("Sephora UK")!;
  assert.equal(sephora.my_link, "https://www.sephora.pl/halloween/?skimoffer=4256993");
  assert.match(String(sephora.notes), /Poland/);
  assert.equal(db().prepare("SELECT my_link FROM retailers WHERE name = ?").get("Cult Beauty")?.my_link,
    "https://www.cultbeauty.com/c/cyber-offers/influencers/em-the-nutritionist/?skimoffer=4256708");
  const retailers = JSON.parse(readFileSync("data/seed-retailers.json", "utf8"));
  assert.equal(db().prepare("SELECT my_link FROM retailers WHERE name = ?").get("Estée Lauder (Canada)")?.my_link,
    retailers.find((entry: { name: string }) => entry.name === "Estée Lauder (Canada)").myLink);
  db().prepare("UPDATE retailers SET my_link = ? WHERE name = ?").run("https://example.com/admin-edited", "Sephora UK");
  db().prepare("UPDATE deals SET title = ?, status = ? WHERE slug = ?").run("Admin edited title", "archived", "no7-beauty-us-campaign");
  applyContentUpdates();
  assert.equal(db().prepare("SELECT my_link FROM retailers WHERE name = ?").get("Sephora UK")?.my_link, "https://example.com/admin-edited");
  const preserved = db().prepare("SELECT title, status FROM deals WHERE slug = ?").get("no7-beauty-us-campaign")!;
  assert.equal(preserved.title, "Admin edited title");
  assert.equal(preserved.status, "archived");
});
