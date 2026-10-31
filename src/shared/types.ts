export const CATEGORIES = [
  { id: "makeup", label: "Makeup" },
  { id: "skincare", label: "Skincare" },
  { id: "fragrance", label: "Fragrance" },
  { id: "gift", label: "Gifts with purchase" },
  { id: "code", label: "Codes" },
  { id: "advent", label: "Advent calendar" },
] as const;

export type Category = (typeof CATEGORIES)[number]["id"];

export const STATUSES = ["published", "draft", "archived"] as const;
export type Status = (typeof STATUSES)[number];

/** A deal as the public site sees it. Advent calendars are deals in the "advent" category. */
export interface PublicDeal {
  slug: string;
  retailer: string;
  title: string;
  headline: string;
  sub: string;
  details: string;
  categories: Category[];
  code: string | null;
  terms: string;
  /** Price paid, in pounds (advent calendars and purchase-with-purchase sets). */
  price: number | null;
  /** Stated value, in pounds. */
  worth: number | null;
  note: string | null;
  endsAt: string | null;
  featured: boolean;
  verifiedAt: string | null;
}

export interface Deal extends PublicDeal {
  id: number;
  url: string;
  affiliateUrl: string | null;
  status: Status;
  createdAt: string;
  updatedAt: string;
}

export interface KeyDate {
  id: number;
  date: string;
  label: string;
  note: string;
}

export interface PublicData {
  deals: PublicDeal[];
  dates: KeyDate[];
  verifiedOn: string | null;
}

export interface Retailer {
  id: number;
  name: string;
  network: string | null;
  signupUrl: string | null;
  commission: string | null;
  status: "todo" | "applied" | "approved" | "rejected";
  myLink: string | null;
  notes: string | null;
  updatedAt: string;
}

export interface Subscriber {
  id: number;
  email: string;
  createdAt: string;
}

export interface Dashboard {
  live: number;
  drafts: number;
  monetised: number;
  clicksToday: number;
  clicks7d: number;
  clicks30d: number;
  subscribers: number;
  daily: { day: string; clicks: number }[];
  top: { id: number; title: string; retailer: string; clicks: number }[];
  expiring: { id: number; title: string; retailer: string; endsAt: string }[];
  recent: { id: number; title: string; retailer: string; status: Status; createdAt: string }[];
}
