import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";
import { adminMetadata } from "../src/shared/metadata.ts";

const directory = mkdtempSync(join(tmpdir(), "beautypromos-seo-"));
process.env.DATABASE_PATH = join(directory, "test.db");
const { createSite } = await import("../server/site.ts");
const { db } = await import("../server/db.ts");
const site = createSite();
const canonical = "https://beautypromos.deals/";

after(() => {
  db().close();
  rmSync(directory, { recursive: true, force: true });
});

function metaTags(document: string) {
  const entries = [...document.matchAll(/<meta\s+(?:name|property)="([^"]+)"\s+content="([^"]*)"\s*\/?>/g)];
  const tags = new Map(entries.map((entry) => [entry[1], entry[2]]));
  assert.equal(tags.size, entries.length, "metadata keys must not be duplicated");
  return tags;
}

test("public metadata is complete in the initial HTML without JavaScript", async () => {
  const response = await site.request("/");
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("X-Robots-Tag"), null);
  const document = await response.text();
  const tags = metaTags(document);
  const title = /<title>([^<]+)<\/title>/.exec(document)?.[1];
  assert.ok(title?.includes("beautypromos"));
  assert.equal(tags.get("og:title"), title);
  assert.equal(tags.get("twitter:title"), title);
  assert.equal(tags.get("description"), tags.get("og:description"));
  assert.equal(tags.get("description"), tags.get("twitter:description"));
  assert.ok(tags.get("description")!.length >= 100);
  assert.equal(tags.get("og:type"), "website");
  assert.equal(tags.get("og:site_name"), "beautypromos");
  assert.equal(tags.get("og:locale"), "en_GB");
  assert.equal(tags.get("og:url"), canonical);
  assert.equal(tags.get("robots"), "index, follow, max-image-preview:large");
  assert.equal(tags.get("twitter:card"), "summary_large_image");
  assert.equal(tags.get("og:image"), canonical + "social-card.png");
  assert.equal(tags.get("og:image:secure_url"), tags.get("og:image"));
  assert.equal(tags.get("twitter:image"), tags.get("og:image"));
  assert.equal(tags.get("og:image:width"), "1200");
  assert.equal(tags.get("og:image:height"), "630");
  assert.equal(tags.get("og:image:type"), "image/png");
  assert.equal(tags.get("twitter:image:alt"), tags.get("og:image:alt"));
  assert.ok(tags.get("og:image:alt"));
  assert.match(document, /<html lang="en-GB">/);
  assert.equal([...document.matchAll(/<link rel="canonical" /g)].length, 1);
  assert.ok(document.includes(`<link rel="canonical" href="${canonical}"`));
  assert.ok(document.includes(`<link rel="amphtml" href="${canonical}amp/"`));
  assert.ok(!document.includes("amp-skimlinks"));
  assert.match(document, /<link rel="sitemap" type="application\/xml" href="\/sitemap.xml"/);
  assert.match(document, /window\.__LUMIERE__=/);
});

test("canonical and structured data do not reflect request hosts or tracking parameters", async () => {
  const response = await site.request("https://untrusted.example/?utm_source=example");
  const document = await response.text();
  assert.ok(!document.includes("untrusted.example"));
  assert.ok(!document.includes("utm_source"));
  const scripts = [...document.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  assert.equal(scripts.length, 1);
  const structured = JSON.parse(scripts[0][1]);
  assert.equal(structured["@context"], "https://schema.org");
  assert.deepEqual(structured["@graph"].map((entry: Record<string, string>) => entry["@type"]), ["Organization", "WebSite", "CollectionPage"]);
  for (const entry of structured["@graph"]) assert.equal(entry.url, canonical);
  assert.equal(structured["@graph"][2].primaryImageOfPage.url, canonical + "social-card.png");
});

test("all admin routes have page metadata and remain excluded from indexing", async (context) => {
  const routes = ["/admin/", "/admin/index.html", "/admin/offers", "/admin/offers/new", "/admin/offers/42", "/admin/retailers", "/admin/dates", "/admin/subscribers", "/admin/import"];
  for (const route of routes) {
    await context.test(route, async () => {
      const response = await site.request(route);
      assert.equal(response.status, 200);
      assert.equal(response.headers.get("X-Robots-Tag"), "noindex, nofollow");
      assert.equal(response.headers.get("Cache-Control"), "no-store");
      const document = await response.text();
      const metadata = adminMetadata(route);
      const tags = metaTags(document);
      assert.equal(tags.get("robots"), "noindex, nofollow");
      assert.equal(tags.get("description"), metadata.description);
      assert.ok(document.includes(`<title>${metadata.title}</title>`));
      assert.ok(document.includes(`<link rel="canonical" href="${metadata.canonical}"`));
      assert.ok(!document.includes('property="og:'));
    });
  }
  const response = await site.request("/admin");
  assert.equal(response.status, 302);
  assert.equal(response.headers.get("Location"), "/admin/");
  assert.equal(response.headers.get("X-Robots-Tag"), "noindex, nofollow");
});

test("admin canonical URLs normalize aliases without reflecting unknown paths", () => {
  assert.equal(adminMetadata("/admin/index.html").canonical, canonical + "admin/");
  assert.equal(adminMetadata("/admin/offers/").canonical, canonical + "admin/offers");
  assert.equal(adminMetadata('/admin/unknown"><script>').canonical, canonical + "admin/");
  assert.equal(adminMetadata("/admin/offers/42").title, "Edit offer · beautypromos admin");
});

test("API responses remain noindex and admin data stays authenticated", async () => {
  for (const route of ["/api/public", "/api/admin/me", "/api/admin/retailers"]) {
    const response = await site.request(route);
    assert.equal(response.headers.get("X-Robots-Tag"), "noindex, nofollow");
    assert.equal(response.status, route === "/api/admin/retailers" ? 401 : 200);
  }
});

test("sitemap lists only indexable canonical pages and robots advertises it", async () => {
  const response = await site.request("/sitemap.xml");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("Content-Type")!, /(?:application|text)\/xml/);
  const sitemap = await response.text();
  assert.match(sitemap, /^<\?xml version="1.0" encoding="UTF-8"\?>/);
  assert.match(sitemap, /xmlns="http:\/\/www.sitemaps.org\/schemas\/sitemap\/0.9"/);
  const locations = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((entry) => entry[1]);
  assert.deepEqual(locations, [canonical, canonical + "blog/", canonical + "blog/the-beauty-edit/"]);
  assert.ok(!sitemap.includes("<lastmod>"));
  for (const location of locations) {
    const page = await site.request(location);
    assert.equal(page.status, 200);
    assert.equal(page.headers.get("X-Robots-Tag"), null);
    assert.equal(metaTags(await page.text()).get("robots"), "index, follow, max-image-preview:large");
  }
  const robots = await site.request("/robots.txt");
  assert.equal(robots.status, 200);
  assert.match(robots.headers.get("Content-Type")!, /text\/plain/);
  const directives = await robots.text();
  assert.match(directives, /User-agent: \*/);
  assert.ok(directives.includes("Sitemap: " + canonical + "sitemap.xml"));
  assert.ok(!directives.includes("Disallow:"));
});

test("llms.txt is served as plain text and robots points agents to it", async () => {
  const response = await site.request("/llms.txt");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("Content-Type")!, /text\/plain/);
  assert.match(await response.text(), /^# beautypromos — The Beauty Edit/m);
  const robots = await site.request("/robots.txt");
  assert.ok((await robots.text()).includes("https://beautypromos.deals/llms.txt"));
});

test("llms.txt lists live offers with codes, terms and tracked links", async () => {
  const { renderLlms } = await import("../server/llms.ts");
  const deal = {
    slug: "space-nk-gift", retailer: "Space NK", title: "The Beauty Insider Gift", headline: "Free", sub: "a 29-piece gift",
    details: "", categories: ["gift"], code: "GIFT29", terms: "While stocks last.", price: null, worth: null, note: null,
    endsAt: null, featured: true, verifiedAt: "2026-10-31T10:00:00Z",
  };
  const text = renderLlms({ deals: [deal], dates: [], verifiedOn: "2026-10-31T10:00:00Z" });
  assert.match(text, /1 live offer from 1 retailer, last checked 31 October 2026/);
  assert.ok(text.includes("- [Space NK: The Beauty Insider Gift](https://beautypromos.deals/go/space-nk-gift?s=llms): Featured · Free a 29-piece gift · Code GIFT29 · No end date"));
  assert.ok(text.includes("  Terms: While stocks last."));
  assert.ok(!text.includes("## Advent calendars"));
});

test("sharing image is a served 1200 by 630 PNG", async () => {
  const response = await site.request("/social-card.png");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("Content-Type")!, /image\/png/);
  const image = Buffer.from(await response.arrayBuffer());
  assert.deepEqual(image.subarray(0, 8), Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  assert.equal(image.readUInt32BE(16), 1200);
  assert.equal(image.readUInt32BE(20), 630);
  assert.deepEqual(image, readFileSync("public/social-card.png"));
});
