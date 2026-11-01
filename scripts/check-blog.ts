import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";
import { BLOG_POST } from "../src/shared/blog.ts";
import { createBlog } from "../server/blog.ts";

const directory = mkdtempSync(join(tmpdir(), "beautypromos-blog-"));
process.env.DATABASE_PATH = join(directory, "test.db");
const { createSite } = await import("../server/site.ts");
const { db } = await import("../server/db.ts");
const site = createSite();

after(() => {
  db().close();
  rmSync(directory, { recursive: true, force: true });
});

test("journal index and article have real routes, canonical redirects and a missing-post response", async () => {
  for (const path of ["/blog/", BLOG_POST.path]) assert.equal((await site.request(path)).status, 200);
  for (const [from, to] of [["/blog", "/blog/"], [BLOG_POST.path.slice(0, -1), BLOG_POST.path]]) {
    const response = await site.request(from);
    assert.equal(response.status, 301);
    assert.equal(response.headers.get("location"), to);
  }
  assert.equal((await site.request("/blog/missing-post/")).status, 404);
  assert.equal((await site.request("/blog.css")).status, 200);
});

test("article is readable without application JavaScript and has complete metadata", async () => {
  const document = await (await site.request(`https://untrusted.example${BLOG_POST.path}?tracking=example`)).text();
  assert.equal([...document.matchAll(/<h1\b/g)].length, 1);
  for (const text of [BLOG_POST.title, "Skincare: make room", "Makeup: the shade", "Gift sets and advent calendars", "What makes an offer", "shop overseas", "Affiliate disclosure", "No7", "Estée Lauder", "Cult Beauty", "Sephora"]) assert.ok(document.includes(text), text);
  assert.ok(!document.includes("untrusted.example"));
  assert.ok(!document.includes("tracking=example"));
  assert.ok(document.includes(`<link rel="canonical" href="https://beautypromos.deals${BLOG_POST.path}"`));
  assert.ok(document.includes('property="og:type" content="article"'));
  assert.ok(!document.includes('type="module"'));
  const scripts = [...document.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)];
  const skimlinks = 'src="https://s.skimresources.com/js/312095X1800668.skimlinks.js"';
  assert.equal(scripts.filter((script) => script[0].includes(skimlinks)).length, 1);
  const inline = scripts.filter((script) => !script[0].includes("src="));
  assert.equal(inline.length, 1);
  assert.equal(scripts.length, 2);
  const schema = JSON.parse(inline[0][1]);
  assert.equal(schema["@type"], "BlogPosting");
  assert.equal(schema.headline, BLOG_POST.title);
  assert.equal(schema.datePublished, BLOG_POST.published);
  assert.equal(schema.author.name, "beautypromos");
  assert.equal(schema.mainEntityOfPage, "https://beautypromos.deals" + BLOG_POST.path);
  const { version } = JSON.parse(readFileSync("dist/version.json", "utf8"));
  assert.ok(document.includes(`Version ${version}`));
});

test("article links from the journal and escapes related offer fields", async () => {
  const index = await (await site.request("/blog/")).text();
  assert.ok(index.includes(`href="${BLOG_POST.path}"`));
  const item = {
    slug: "escape", retailer: '<script>alert("x")</script>', title: '<img src=x onerror="alert(1)">',
    headline: "A sample", sub: "", details: "", categories: ["skincare" as const], code: null,
    terms: "", price: null, worth: null, note: null, endsAt: null, featured: false, verifiedAt: null,
  };
  const blog = createBlog("0.1.28", () => ({ deals: [item], dates: [], verifiedOn: null }));
  const document = await (await blog.request(BLOG_POST.path)).text();
  assert.ok(!document.includes(item.retailer));
  assert.ok(!document.includes(item.title));
  assert.ok(document.includes("&lt;script&gt;"));
  assert.ok(document.includes("&lt;img"));
});
