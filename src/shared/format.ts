import type { PublicDeal } from "./types";

export const SOON_MS = 4 * 24 * 60 * 60 * 1000;

const shortDate = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "Europe/London" });
export const longDate = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/London" });

export const isLive = (deal: Pick<PublicDeal, "endsAt">, now: Date) => !deal.endsAt || new Date(deal.endsAt) > now;

export const isEndingSoon = (deal: Pick<PublicDeal, "endsAt">, now: Date) =>
  !!deal.endsAt && new Date(deal.endsAt).getTime() - now.getTime() < SOON_MS;

export function timeLeft(endsAt: string, now: Date) {
  const ms = new Date(endsAt).getTime() - now.getTime();
  if (ms <= 0) return "Ended";
  const h = Math.floor(ms / 3.6e6);
  const m = Math.floor((ms % 3.6e6) / 6e4);
  if (h >= 48) return `${Math.floor(h / 24)} days left`;
  if (h >= 1) return `${h}h ${String(m).padStart(2, "0")}m left`;
  return `${Math.max(m, 1)} minutes left`;
}

export function endsLabel(deal: Pick<PublicDeal, "endsAt">, now: Date) {
  if (!deal.endsAt) return "No end date";
  if (isEndingSoon(deal, now)) return timeLeft(deal.endsAt, now);
  return `Ends ${shortDate.format(new Date(deal.endsAt))}`;
}

export const savingPct = (price: number, worth: number) => Math.round((1 - price / worth) * 100);

export const pounds = (n: number) => `£${n.toLocaleString("en-GB", { maximumFractionDigits: 2 })}`;

export function slugify(text: string) {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Outbound link through the click tracker. */
export const goUrl = (slug: string, source: string) => `/go/${encodeURIComponent(slug)}?s=${source}`;
