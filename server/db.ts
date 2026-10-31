import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { Category, Deal, KeyDate, Retailer, Status, Subscriber } from "../src/shared/types.ts";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS deals (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  slug          TEXT NOT NULL UNIQUE,
  retailer      TEXT NOT NULL,
  title         TEXT NOT NULL,
  headline      TEXT NOT NULL DEFAULT '',
  sub           TEXT NOT NULL DEFAULT '',
  details       TEXT NOT NULL DEFAULT '',
  categories    TEXT NOT NULL DEFAULT '[]',
  code          TEXT,
  terms         TEXT NOT NULL DEFAULT '',
  url           TEXT NOT NULL,
  affiliate_url TEXT,
  price         REAL,
  worth         REAL,
  note          TEXT,
  ends_at       TEXT,
  featured      INTEGER NOT NULL DEFAULT 0,
  status        TEXT NOT NULL DEFAULT 'published',
  verified_at   TEXT,
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS deals_status_idx ON deals(status, ends_at);

CREATE TABLE IF NOT EXISTS clicks (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  deal_id    INTEGER NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  referrer   TEXT,
  source     TEXT
);
CREATE INDEX IF NOT EXISTS clicks_deal_idx ON clicks(deal_id, created_at);
CREATE INDEX IF NOT EXISTS clicks_time_idx ON clicks(created_at);

CREATE TABLE IF NOT EXISTS key_dates (
  id    INTEGER PRIMARY KEY AUTOINCREMENT,
  date  TEXT NOT NULL,
  label TEXT NOT NULL,
  note  TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS subscribers (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  email      TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS retailers (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL UNIQUE,
  network    TEXT,
  signup_url TEXT,
  commission TEXT,
  status     TEXT NOT NULL DEFAULT 'todo',
  my_link    TEXT,
  notes      TEXT,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
`;

export const dbPath = resolve(process.env.DATABASE_PATH ?? "data/lumiere.db");

let instance: DatabaseSync | undefined;

export function db() {
  if (!instance) {
    mkdirSync(dirname(dbPath), { recursive: true });
    instance = new DatabaseSync(dbPath);
    instance.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;");
    instance.exec(SCHEMA);
  }
  return instance;
}

type Row = Record<string, unknown>;
const str = (v: unknown) => (v == null ? null : String(v));
const num = (v: unknown) => (v == null ? null : Number(v));

export function toDeal(r: Row): Deal {
  return {
    id: Number(r.id),
    slug: String(r.slug),
    retailer: String(r.retailer),
    title: String(r.title),
    headline: String(r.headline),
    sub: String(r.sub),
    details: String(r.details),
    categories: JSON.parse(String(r.categories)) as Category[],
    code: str(r.code),
    terms: String(r.terms),
    url: String(r.url),
    affiliateUrl: str(r.affiliate_url),
    price: num(r.price),
    worth: num(r.worth),
    note: str(r.note),
    endsAt: str(r.ends_at),
    featured: Boolean(r.featured),
    status: String(r.status) as Status,
    verifiedAt: str(r.verified_at),
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
  };
}

export const toKeyDate = (r: Row): KeyDate => ({ id: Number(r.id), date: String(r.date), label: String(r.label), note: String(r.note) });

export const toSubscriber = (r: Row): Subscriber => ({ id: Number(r.id), email: String(r.email), createdAt: String(r.created_at) });

export const toRetailer = (r: Row): Retailer => ({
  id: Number(r.id),
  name: String(r.name),
  network: str(r.network),
  signupUrl: str(r.signup_url),
  commission: str(r.commission),
  status: String(r.status) as Retailer["status"],
  myLink: str(r.my_link),
  notes: str(r.notes),
  updatedAt: String(r.updated_at),
});

/** Column values for an insert/update, from the validated deal input. */
export function dealColumns(d: DealInput) {
  return {
    slug: d.slug,
    retailer: d.retailer,
    title: d.title,
    headline: d.headline,
    sub: d.sub,
    details: d.details,
    categories: JSON.stringify(d.categories),
    code: d.code || null,
    terms: d.terms,
    url: d.url,
    affiliate_url: d.affiliateUrl || null,
    price: d.price ?? null,
    worth: d.worth ?? null,
    note: d.note || null,
    ends_at: d.endsAt || null,
    featured: d.featured ? 1 : 0,
    status: d.status,
    verified_at: d.verifiedAt || null,
  };
}

export function upsertDeal(d: DealInput, id?: number) {
  const cols = dealColumns(d);
  const keys = Object.keys(cols);
  const values = Object.values(cols) as (string | number | null)[];
  if (id) {
    const set = keys.map((k) => `${k} = ?`).join(", ");
    db().prepare(`UPDATE deals SET ${set}, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?`).run(...values, id);
    return id;
  }
  const res = db()
    .prepare(`INSERT INTO deals (${keys.join(", ")}) VALUES (${keys.map(() => "?").join(", ")})`)
    .run(...values);
  return Number(res.lastInsertRowid);
}

export interface DealInput {
  slug: string;
  retailer: string;
  title: string;
  headline: string;
  sub: string;
  details: string;
  categories: Category[];
  code?: string | null;
  terms: string;
  url: string;
  affiliateUrl?: string | null;
  price?: number | null;
  worth?: number | null;
  note?: string | null;
  endsAt?: string | null;
  featured?: boolean;
  status: Status;
  verifiedAt?: string | null;
}
