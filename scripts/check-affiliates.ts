import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";

const directory = mkdtempSync(join(tmpdir(), "beautypromos-affiliates-"));
process.env.DATABASE_PATH = join(directory, "test.db");
process.env.ADMIN_PASSWORD = "local-test-password";
process.env.SESSION_SECRET = "local-test-session-secret".repeat(3);
const { app } = await import("../server/app.ts");
const { db, upsertDeal } = await import("../server/db.ts");

after(() => {
  db().close();
  rmSync(directory, { recursive: true, force: true });
});

test("affiliate link management preserves retailer settings and offer destinations", async (t) => {
  const retailerId = Number(db().prepare(`INSERT INTO retailers (name, network, status, notes) VALUES (?, ?, ?, ?)`).run(
    "Boots", "Awin", "approved", "Keep this note",
  ).lastInsertRowid);
  let cookie = "";
  const write = (path: string, body: unknown, method = "PATCH") => app.request(`/api/admin${path}`, {
    method, headers: { "content-type": "application/json", cookie }, body: JSON.stringify(body),
  });
  const read = async () => {
    const response = await app.request("/api/admin/retailers", { headers: { cookie } });
    assert.equal(response.status, 200);
    return (await response.json()).find((r: { id: number }) => r.id === retailerId);
  };

  await t.test("requires an admin session", async () => {
    assert.equal((await write(`/retailers/${retailerId}/link`, { myLink: "https://tracking.example/boots" })).status, 401);
    const login = await write("/login", { password: process.env.ADMIN_PASSWORD }, "POST");
    assert.equal(login.status, 200);
    cookie = login.headers.get("set-cookie")!.split(";")[0];
  });

  await t.test("rejects invalid URLs, missing values and unknown retailers", async () => {
    for (const myLink of ["javascript:alert(1)", "https://", "https://user:password@example.com/"]) {
      const response = await write(`/retailers/${retailerId}/link`, { myLink });
      assert.equal(response.status, 400);
      assert.ok((await response.json()).errors.myLink);
    }
    assert.equal((await write(`/retailers/${retailerId}/link`, {})).status, 400);
    assert.equal((await write("/retailers/99999/link", { myLink: null })).status, 404);
  });

  await t.test("saves and clears a link without changing approval or notes", async () => {
    assert.equal((await write(`/retailers/${retailerId}/link`, { myLink: "  https://tracking.example/boots?ref=123  " })).status, 200);
    const retailer = await read();
    assert.equal(retailer.myLink, "https://tracking.example/boots?ref=123");
    assert.equal(retailer.status, "approved");
    assert.equal(retailer.notes, "Keep this note");
    assert.equal(retailer.network, "Awin");
    assert.equal((await write(`/retailers/${retailerId}/link`, { myLink: "" })).status, 200);
    assert.equal((await read()).myLink, null);
  });

  await t.test("counts only live monetised offers and keeps each offer's deep link", async () => {
    const fixture = {
      retailer: "Boots", title: "Offer", headline: "20% off", sub: "", details: "", categories: ["makeup"],
      code: null, terms: "", url: "https://www.boots.com/specific-offer", affiliateUrl: "https://tracking.example/specific-offer",
      price: null, worth: null, note: null, featured: false, verifiedAt: null,
    };
    upsertDeal({ ...fixture, slug: "live", status: "published", endsAt: null });
    upsertDeal({ ...fixture, slug: "expired", status: "published", endsAt: "2020-01-01T00:00:00.000Z" });
    upsertDeal({ ...fixture, slug: "draft", status: "draft", endsAt: null });
    await write(`/retailers/${retailerId}/link`, { myLink: "https://tracking.example/homepage" });
    const retailer = await read();
    assert.equal(retailer.liveDeals, 1);
    assert.equal(retailer.monetised, 1);
    const response = await app.request("/go/live");
    assert.equal(response.status, 302);
    assert.equal(response.headers.get("location"), fixture.affiliateUrl);
  });
});
