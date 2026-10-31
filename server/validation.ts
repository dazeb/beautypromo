import { z } from "zod";
import { CATEGORIES, STATUSES, type Category } from "../src/shared/types.ts";
import { slugify } from "../src/shared/format.ts";

const optionalText = z
  .string()
  .trim()
  .nullish()
  .transform((v) => v || null);

const nullableUrl = z
  .string()
  .trim()
  .nullable()
  .transform((v) => v || null)
  .refine((v) => {
    if (v == null) return true;
    try {
      const url = new URL(v);
      return /^https?:$/.test(url.protocol) && Boolean(url.hostname) && !url.username && !url.password;
    } catch {
      return false;
    }
  }, "Must be a valid http:// or https:// URL without login details");

const optionalUrl = nullableUrl.optional().transform((v) => v ?? null);

export const retailerLinkSchema = z.object({ myLink: nullableUrl });

const optionalMoney = z
  .union([z.number(), z.string()])
  .nullish()
  .transform((v) => (v === "" || v == null ? null : Number(v)))
  .refine((v) => v == null || (Number.isFinite(v) && v >= 0), "Must be a positive number");

const optionalIso = z
  .string()
  .trim()
  .nullish()
  .transform((v) => v || null)
  .refine((v) => v == null || !Number.isNaN(Date.parse(v)), "Not a valid date")
  .transform((v) => (v == null ? null : new Date(v).toISOString()));

export const dealSchema = z
  .object({
    slug: z.string().trim().optional().default(""),
    retailer: z.string().trim().min(1, "Retailer is required"),
    title: z.string().trim().min(1, "Title is required"),
    headline: z.string().trim().default(""),
    sub: z.string().trim().default(""),
    details: z.string().trim().default(""),
    categories: z.array(z.enum(CATEGORIES.map((c) => c.id) as [Category, ...Category[]])).min(1, "Pick at least one category"),
    code: optionalText,
    terms: z.string().trim().default(""),
    url: z.string().trim().refine((v) => /^https?:\/\/\S+$/.test(v), "Offer URL must be a full link"),
    affiliateUrl: optionalUrl,
    price: optionalMoney,
    worth: optionalMoney,
    note: optionalText,
    endsAt: optionalIso,
    featured: z.boolean().default(false),
    status: z.enum(STATUSES).default("draft"),
    verifiedAt: optionalIso,
  })
  .transform((d) => ({ ...d, slug: slugify(d.slug || `${d.retailer} ${d.title}`) }))
  .superRefine((d, ctx) => {
    if (!d.slug) ctx.addIssue({ code: "custom", path: ["slug"], message: "Slug is required" });
    if (d.categories.includes("advent") && (d.price == null || d.worth == null)) {
      ctx.addIssue({ code: "custom", path: ["worth"], message: "Advent calendars need a price and a stated value" });
    }
    if (!d.categories.includes("advent") && !d.headline) {
      ctx.addIssue({ code: "custom", path: ["headline"], message: "Headline is required, e.g. “25% off” or “Free”" });
    }
  });

export type DealPayload = z.infer<typeof dealSchema>;

export const keyDateSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD"),
  label: z.string().trim().min(1, "Label is required"),
  note: z.string().trim().default(""),
});

export const retailerSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  network: optionalText,
  signupUrl: optionalUrl,
  commission: optionalText,
  status: z.enum(["todo", "applied", "approved", "rejected"]).default("todo"),
  myLink: optionalUrl,
  notes: optionalText,
});

export const emailSchema = z.object({ email: z.string().trim().toLowerCase().max(254).pipe(z.email("That email doesn't look right")) });

/** First error per field, for the admin form. */
export function fieldErrors(error: z.ZodError) {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    out[key] ??= issue.message;
  }
  return out;
}
