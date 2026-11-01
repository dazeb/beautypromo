import { Hono } from "hono";
import { z } from "zod";
import type { Dashboard, PublicData, PublicDeal } from "../src/shared/types.ts";
import { authReady, clientIp, endSession, isAdmin, loginAllowed, passwordMatches, requireAdmin, startSession } from "./auth.ts";
import { db, toDeal, toKeyDate, toRetailer, toSubscriber, upsertDeal } from "./db.ts";
import { dealSchema, emailSchema, fieldErrors, keyDateSchema, retailerLinkSchema, retailerSchema } from "./validation.ts";
import type { AmpData } from "./amp.ts";

const nowIso = () => new Date().toISOString();
const LIVE = `status = 'published' AND (ends_at IS NULL OR ends_at > ?)`;

// Brand-level Awin link supplied by the publisher for Estée Lauder (advertiser 123256).
// A deal-specific deep link always takes precedence when one has been saved.
const ESTEE_LAUDER_AWIN_LINK = "https://www.awin1.com/cread.php?awinmid=123256&awinaffid=3140953";

const londonDay = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit" });

function toPublic(d: ReturnType<typeof toDeal>): PublicDeal {
  return {
    slug: d.slug,
    retailer: d.retailer,
    title: d.title,
    headline: d.headline,
    sub: d.sub,
    details: d.details,
    categories: d.categories,
    code: d.code,
    terms: d.terms,
    price: d.price,
    worth: d.worth,
    note: d.note,
    endsAt: d.endsAt,
    featured: d.featured,
    verifiedAt: d.verifiedAt,
  };
}

export function publicData(): PublicData {
  const now = nowIso();
  const deals = db()
    .prepare(`SELECT * FROM deals WHERE ${LIVE} ORDER BY featured DESC, id ASC`)
    .all(now)
    .map(toDeal);
  const dates = db().prepare(`SELECT * FROM key_dates WHERE date >= ? ORDER BY date`).all(now.slice(0, 10)).map(toKeyDate);
  const verifiedOn = deals.reduce<string | null>((max, d) => (d.verifiedAt && (!max || d.verifiedAt > max) ? d.verifiedAt : max), null);
  return { deals: deals.map(toPublic), dates, verifiedOn };
}

/** Direct retailer URLs let AMP Skimlinks monetise offers without an existing affiliate link. */
export function publicAmpData(): AmpData {
  const data = publicData();
  const rows = db().prepare(`SELECT slug, url, affiliate_url FROM deals WHERE ${LIVE}`).all(nowIso());
  const destinations = new Map(rows.map((row) => [String(row.slug), row]));
  return {
    ...data,
    deals: data.deals.flatMap((deal) => {
      const row = destinations.get(deal.slug);
      if (!row) return [];
      const managedAffiliate = row.affiliate_url || deal.retailer.trim().toLocaleLowerCase("en") === "estée lauder";
      if (managedAffiliate) return [{ ...deal, href: `https://beautypromos.deals/go/${encodeURIComponent(deal.slug)}?s=amp` }];
      try {
        const destination = new URL(String(row.url));
        if (destination.protocol !== "https:" && destination.protocol !== "http:") return [];
        return [{ ...deal, href: destination.href }];
      } catch {
        return [];
      }
    }),
  };
}

const BOT_UA = /bot|crawl|spider|slurp|preview|facebookexternalhit|headless|monitor|curl|wget/i;

const parse = <T extends z.ZodType>(schema: T, body: unknown) => schema.safeParse(body);

function uniqueSlugError(e: unknown) {
  return e instanceof Error && /UNIQUE constraint failed: deals\.slug/.test(e.message);
}

export const app = new Hono();

app.use("/api/*", async (context, next) => {
  context.header("X-Robots-Tag", "noindex, nofollow");
  await next();
});

/* ---------- Public ---------- */

app.get("/api/public", (c) => {
  c.header("Cache-Control", "public, max-age=60");
  return c.json(publicData());
});

app.post("/api/subscribe", async (c) => {
  const result = parse(emailSchema, await c.req.json().catch(() => ({})));
  if (!result.success) return c.json({ error: fieldErrors(result.error).email ?? "Invalid email" }, 400);
  db().prepare(`INSERT OR IGNORE INTO subscribers (email) VALUES (?)`).run(result.data.email);
  return c.json({ ok: true });
});

app.get("/go/:slug", (c) => {
  const row = db().prepare(`SELECT id, url, affiliate_url, retailer FROM deals WHERE slug = ? AND status != 'draft'`).get(c.req.param("slug"));
  if (!row) return c.redirect("/", 302);
  const ua = c.req.header("user-agent") ?? "";
  const prefetch = /prefetch|prerender/i.test(`${c.req.header("purpose") ?? ""} ${c.req.header("sec-purpose") ?? ""}`);
  if (!prefetch && !BOT_UA.test(ua)) {
    db()
      .prepare(`INSERT INTO clicks (deal_id, referrer, source) VALUES (?, ?, ?)`)
      .run(Number(row.id), c.req.header("referer")?.slice(0, 500) ?? null, c.req.query("s")?.slice(0, 32) ?? null);
  }
  c.header("Cache-Control", "no-store");
  c.header("X-Robots-Tag", "noindex");
  const isEsteeLauder = String(row.retailer).trim().toLocaleLowerCase("en") === "estée lauder";
  const destination = row.affiliate_url || (isEsteeLauder ? ESTEE_LAUDER_AWIN_LINK : row.url);
  return c.redirect(String(destination), 302);
});

/* ---------- Admin: session ---------- */

app.get("/api/admin/me", async (c) => c.json({ signedIn: await isAdmin(c), configured: authReady() }));

app.post("/api/admin/login", async (c) => {
  if (!authReady()) return c.json({ error: "Admin isn't configured. Set ADMIN_PASSWORD and SESSION_SECRET (32+ characters)." }, 503);
  if (!loginAllowed(clientIp(c))) return c.json({ error: "Too many attempts. Try again in 15 minutes." }, 429);
  const body = await c.req.json().catch(() => ({}));
  const password = typeof body?.password === "string" ? body.password : "";
  if (!passwordMatches(password)) return c.json({ error: "That password isn't right." }, 401);
  await startSession(c);
  return c.json({ ok: true });
});

app.post("/api/admin/logout", (c) => {
  endSession(c);
  return c.json({ ok: true });
});

const admin = new Hono();
admin.use("*", requireAdmin);

/* ---------- Admin: dashboard ---------- */

admin.get("/dashboard", (c) => {
  const now = new Date();
  const iso = now.toISOString();
  const ago = (days: number) => new Date(now.getTime() - days * 864e5).toISOString();
  const count = (sql: string, ...args: (string | number)[]) => Number(db().prepare(sql).get(...args)?.n ?? 0);

  const clickTimes = db().prepare(`SELECT created_at FROM clicks WHERE created_at >= ?`).all(ago(31));
  const buckets = new Map<string, number>();
  for (let i = 29; i >= 0; i--) buckets.set(londonDay.format(new Date(now.getTime() - i * 864e5)), 0);
  for (const r of clickTimes) {
    const day = londonDay.format(new Date(String(r.created_at)));
    if (buckets.has(day)) buckets.set(day, (buckets.get(day) ?? 0) + 1);
  }
  const daily = [...buckets].map(([day, clicks]) => ({ day, clicks }));

  const data: Dashboard = {
    live: count(`SELECT COUNT(*) n FROM deals WHERE ${LIVE}`, iso),
    drafts: count(`SELECT COUNT(*) n FROM deals WHERE status = 'draft'`),
    monetised: count(`SELECT COUNT(*) n FROM deals WHERE ${LIVE} AND affiliate_url IS NOT NULL`, iso),
    clicksToday: daily.at(-1)?.clicks ?? 0,
    clicks7d: count(`SELECT COUNT(*) n FROM clicks WHERE created_at >= ?`, ago(7)),
    clicks30d: count(`SELECT COUNT(*) n FROM clicks WHERE created_at >= ?`, ago(30)),
    subscribers: count(`SELECT COUNT(*) n FROM subscribers`),
    daily,
    top: db()
      .prepare(
        `SELECT d.id, d.title, d.retailer, COUNT(k.id) clicks FROM clicks k JOIN deals d ON d.id = k.deal_id
         WHERE k.created_at >= ? GROUP BY d.id ORDER BY clicks DESC LIMIT 8`,
      )
      .all(ago(7))
      .map((r) => ({ id: Number(r.id), title: String(r.title), retailer: String(r.retailer), clicks: Number(r.clicks) })),
    expiring: db()
      .prepare(`SELECT id, title, retailer, ends_at FROM deals WHERE status = 'published' AND ends_at > ? AND ends_at <= ? ORDER BY ends_at`)
      .all(iso, new Date(now.getTime() + 3 * 864e5).toISOString())
      .map((r) => ({ id: Number(r.id), title: String(r.title), retailer: String(r.retailer), endsAt: String(r.ends_at) })),
    recent: db()
      .prepare(`SELECT id, title, retailer, status, created_at FROM deals ORDER BY created_at DESC, id DESC LIMIT 6`)
      .all()
      .map((r) => ({ id: Number(r.id), title: String(r.title), retailer: String(r.retailer), status: r.status as Dashboard["recent"][number]["status"], createdAt: String(r.created_at) })),
  };
  return c.json(data);
});

/* ---------- Admin: deals ---------- */

admin.get("/deals", (c) => {
  const { q = "", status = "", category = "" } = c.req.query();
  const where: string[] = [];
  const args: string[] = [];
  const iso = nowIso();
  if (q) {
    where.push(`(title LIKE ? OR retailer LIKE ? OR slug LIKE ? OR code LIKE ?)`);
    args.push(...Array(4).fill(`%${q}%`));
  }
  if (status === "live") {
    where.push(LIVE);
    args.push(iso);
  } else if (status === "expired") {
    where.push(`status = 'published' AND ends_at <= ?`);
    args.push(iso);
  } else if (status) {
    where.push(`status = ?`);
    args.push(status);
  }
  if (category) {
    where.push(`categories LIKE ?`);
    args.push(`%"${category}"%`);
  }
  const rows = db()
    .prepare(
      `SELECT d.*, (SELECT COUNT(*) FROM clicks k WHERE k.deal_id = d.id AND k.created_at >= ?) clicks30
       FROM deals d ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
       ORDER BY d.featured DESC, d.updated_at DESC`,
    )
    .all(new Date(Date.now() - 30 * 864e5).toISOString(), ...args);
  return c.json(rows.map((r) => ({ ...toDeal(r), clicks30: Number(r.clicks30) })));
});

admin.get("/deals/:id", (c) => {
  const row = db().prepare(`SELECT * FROM deals WHERE id = ?`).get(Number(c.req.param("id")));
  return row ? c.json(toDeal(row)) : c.json({ error: "Not found" }, 404);
});

async function saveDeal(body: unknown, id?: number) {
  const result = parse(dealSchema, body);
  if (!result.success) return { status: 400 as const, body: { errors: fieldErrors(result.error) } };
  try {
    const savedId = upsertDeal(result.data, id);
    return { status: 200 as const, body: toDeal(db().prepare(`SELECT * FROM deals WHERE id = ?`).get(savedId)!) };
  } catch (e) {
    if (uniqueSlugError(e)) return { status: 409 as const, body: { errors: { slug: "Another offer already uses this slug" } } };
    throw e;
  }
}

admin.post("/deals", async (c) => {
  const r = await saveDeal(await c.req.json());
  return c.json(r.body, r.status);
});

admin.put("/deals/:id", async (c) => {
  const id = Number(c.req.param("id"));
  if (!db().prepare(`SELECT 1 FROM deals WHERE id = ?`).get(id)) return c.json({ error: "Not found" }, 404);
  const r = await saveDeal(await c.req.json(), id);
  return c.json(r.body, r.status);
});

const bulkSchema = z.object({
  ids: z.array(z.number().int()).min(1),
  action: z.enum(["publish", "draft", "archive", "delete", "feature", "unfeature"]),
});

admin.post("/deals/bulk", async (c) => {
  const result = parse(bulkSchema, await c.req.json());
  if (!result.success) return c.json({ error: "Invalid request" }, 400);
  const { ids, action } = result.data;
  const marks = ids.map(() => "?").join(",");
  const sql = {
    publish: `UPDATE deals SET status = 'published', updated_at = ? WHERE id IN (${marks})`,
    draft: `UPDATE deals SET status = 'draft', updated_at = ? WHERE id IN (${marks})`,
    archive: `UPDATE deals SET status = 'archived', featured = 0, updated_at = ? WHERE id IN (${marks})`,
    feature: `UPDATE deals SET featured = 1, updated_at = ? WHERE id IN (${marks})`,
    unfeature: `UPDATE deals SET featured = 0, updated_at = ? WHERE id IN (${marks})`,
    delete: `DELETE FROM deals WHERE id IN (${marks})`,
  }[action];
  const res = action === "delete" ? db().prepare(sql).run(...ids) : db().prepare(sql).run(nowIso(), ...ids);
  return c.json({ changed: Number(res.changes) });
});

admin.post("/deals/:id/duplicate", (c) => {
  const row = db().prepare(`SELECT * FROM deals WHERE id = ?`).get(Number(c.req.param("id")));
  if (!row) return c.json({ error: "Not found" }, 404);
  const deal = toDeal(row);
  let slug = `${deal.slug}-copy`;
  for (let n = 2; db().prepare(`SELECT 1 FROM deals WHERE slug = ?`).get(slug); n++) slug = `${deal.slug}-copy-${n}`;
  const id = upsertDeal({ ...deal, slug, title: `${deal.title} (copy)`, status: "draft", featured: false });
  return c.json({ id });
});

admin.post("/deals/:id/extend", async (c) => {
  const days = Number((await c.req.json().catch(() => ({})))?.days ?? 7);
  const row = db().prepare(`SELECT ends_at FROM deals WHERE id = ?`).get(Number(c.req.param("id")));
  if (!row) return c.json({ error: "Not found" }, 404);
  const base = Math.max(row.ends_at ? Date.parse(String(row.ends_at)) : 0, Date.now());
  const endsAt = new Date(base + days * 864e5).toISOString();
  db().prepare(`UPDATE deals SET ends_at = ?, updated_at = ? WHERE id = ?`).run(endsAt, nowIso(), Number(c.req.param("id")));
  return c.json({ endsAt });
});

/* ---------- Admin: import / export ---------- */

admin.post("/import", async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!Array.isArray(body?.items)) return c.json({ error: "Send { items: [...] }" }, 400);
  const dryRun = body.dryRun !== false;
  const results = body.items.map((item: unknown, index: number) => {
    const parsed = parse(dealSchema, item);
    if (!parsed.success) {
      const errs = fieldErrors(parsed.error);
      return { index, slug: (item as { slug?: string })?.slug ?? null, action: "error", error: Object.entries(errs).map(([k, v]) => `${k}: ${v}`).join("; ") };
    }
    const existing = db().prepare(`SELECT id FROM deals WHERE slug = ?`).get(parsed.data.slug);
    return { index, slug: parsed.data.slug, action: existing ? "update" : "create", data: parsed.data, id: existing ? Number(existing.id) : undefined };
  });
  if (!dryRun) {
    db().exec("BEGIN");
    try {
      for (const r of results) if (r.action !== "error") upsertDeal(r.data, r.id);
      db().exec("COMMIT");
    } catch (e) {
      db().exec("ROLLBACK");
      throw e;
    }
  }
  return c.json({
    dryRun,
    results: results.map(({ index, slug, action, error }: { index: number; slug: string | null; action: string; error?: string }) => ({ index, slug, action, error })),
  });
});

admin.get("/export", (c) => {
  const deals = db().prepare(`SELECT * FROM deals ORDER BY id`).all().map(toDeal);
  const items = deals.map(({ id: _id, createdAt: _c, updatedAt: _u, ...rest }) => rest);
  c.header("Content-Disposition", `attachment; filename="lumiere-offers-${nowIso().slice(0, 10)}.json"`);
  return c.json(items);
});

/* ---------- Admin: key dates ---------- */

admin.get("/dates", (c) => c.json(db().prepare(`SELECT * FROM key_dates ORDER BY date`).all().map(toKeyDate)));

admin.post("/dates", async (c) => {
  const r = parse(keyDateSchema, await c.req.json());
  if (!r.success) return c.json({ errors: fieldErrors(r.error) }, 400);
  const res = db().prepare(`INSERT INTO key_dates (date, label, note) VALUES (?, ?, ?)`).run(r.data.date, r.data.label, r.data.note);
  return c.json({ id: Number(res.lastInsertRowid) });
});

admin.put("/dates/:id", async (c) => {
  const r = parse(keyDateSchema, await c.req.json());
  if (!r.success) return c.json({ errors: fieldErrors(r.error) }, 400);
  db().prepare(`UPDATE key_dates SET date = ?, label = ?, note = ? WHERE id = ?`).run(r.data.date, r.data.label, r.data.note, Number(c.req.param("id")));
  return c.json({ ok: true });
});

admin.delete("/dates/:id", (c) => {
  db().prepare(`DELETE FROM key_dates WHERE id = ?`).run(Number(c.req.param("id")));
  return c.json({ ok: true });
});

/* ---------- Admin: retailers (affiliate programmes) ---------- */

admin.get("/retailers", (c) => {
  const iso = nowIso();
  const rows = db()
    .prepare(
      `SELECT r.*,
        (SELECT COUNT(*) FROM deals d WHERE d.retailer = r.name AND ${LIVE.replaceAll("status", "d.status").replaceAll("ends_at", "d.ends_at")}) live_deals,
        (SELECT COUNT(*) FROM deals d WHERE d.retailer = r.name AND d.affiliate_url IS NOT NULL AND ${LIVE.replaceAll("status", "d.status").replaceAll("ends_at", "d.ends_at")}) monetised
       FROM retailers r ORDER BY r.name`,
    )
    .all(iso, iso);
  return c.json(rows.map((r) => ({ ...toRetailer(r), liveDeals: Number(r.live_deals), monetised: Number(r.monetised) })));
});

admin.patch("/retailers/:id/link", async (c) => {
  const result = parse(retailerLinkSchema, await c.req.json().catch(() => ({})));
  if (!result.success) return c.json({ errors: fieldErrors(result.error) }, 400);
  const changed = db().prepare(`UPDATE retailers SET my_link = ?, updated_at = ? WHERE id = ?`)
    .run(result.data.myLink, nowIso(), Number(c.req.param("id")));
  if (!changed.changes) return c.json({ error: "Retailer not found" }, 404);
  return c.json({ ok: true });
});

function saveRetailer(data: z.infer<typeof retailerSchema>, id?: number) {
  const values = [data.name, data.network, data.signupUrl, data.commission, data.status, data.myLink, data.notes];
  if (id) {
    db()
      .prepare(`UPDATE retailers SET name = ?, network = ?, signup_url = ?, commission = ?, status = ?, my_link = ?, notes = ?, updated_at = ? WHERE id = ?`)
      .run(...values, nowIso(), id);
    return id;
  }
  const res = db()
    .prepare(`INSERT INTO retailers (name, network, signup_url, commission, status, my_link, notes) VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .run(...values);
  return Number(res.lastInsertRowid);
}

admin.post("/retailers", async (c) => {
  const r = parse(retailerSchema, await c.req.json());
  if (!r.success) return c.json({ errors: fieldErrors(r.error) }, 400);
  try {
    return c.json({ id: saveRetailer(r.data) });
  } catch {
    return c.json({ errors: { name: "That retailer already exists" } }, 409);
  }
});

admin.put("/retailers/:id", async (c) => {
  const r = parse(retailerSchema, await c.req.json());
  if (!r.success) return c.json({ errors: fieldErrors(r.error) }, 400);
  saveRetailer(r.data, Number(c.req.param("id")));
  return c.json({ ok: true });
});

admin.delete("/retailers/:id", (c) => {
  db().prepare(`DELETE FROM retailers WHERE id = ?`).run(Number(c.req.param("id")));
  return c.json({ ok: true });
});

/* ---------- Admin: subscribers ---------- */

admin.get("/subscribers", (c) => c.json(db().prepare(`SELECT * FROM subscribers ORDER BY created_at DESC`).all().map(toSubscriber)));

admin.get("/subscribers.csv", (c) => {
  const rows = db().prepare(`SELECT * FROM subscribers ORDER BY created_at`).all().map(toSubscriber);
  const csv = ["email,subscribed_at", ...rows.map((s) => `"${s.email.replaceAll('"', '""')}",${s.createdAt}`)].join("\n");
  c.header("Content-Type", "text/csv; charset=utf-8");
  c.header("Content-Disposition", `attachment; filename="lumiere-subscribers-${nowIso().slice(0, 10)}.csv"`);
  return c.body(csv);
});

admin.delete("/subscribers/:id", (c) => {
  db().prepare(`DELETE FROM subscribers WHERE id = ?`).run(Number(c.req.param("id")));
  return c.json({ ok: true });
});

app.route("/api/admin", admin);

app.onError((err, c) => {
  console.error(err);
  return c.json({ error: "Something went wrong on the server." }, 500);
});
