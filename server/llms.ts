import { goUrl, longDate, pounds, savingPct } from "../src/shared/format.ts";
import type { KeyDate, PublicData, PublicDeal } from "../src/shared/types.ts";

const SITE = "https://beautypromos.deals";
const dayMonth = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", timeZone: "UTC" });
/** Absolute end dates, so a cached file never reads "3 days left" on the wrong day. */
const endDate = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "Europe/London" });

const oneLine = (text: string | null | undefined) => (text ?? "").replace(/\s+/g, " ").trim();
/** Brackets would break the Markdown link text. */
const label = (text: string | null | undefined) => oneLine(text).replace(/[[\]]/g, "");

const isAdvent = (deal: PublicDeal) => deal.categories.includes("advent");

function offerLines(deal: PublicDeal) {
  const url = `${SITE}${goUrl(deal.slug, "llms")}`;
  const headline = [oneLine(deal.headline), oneLine(deal.sub)].filter(Boolean).join(" ");
  const details = [
    deal.featured ? "Featured" : null,
    headline || null,
    deal.code ? `Code ${oneLine(deal.code)}` : null,
    deal.endsAt ? `Ends ${endDate.format(new Date(deal.endsAt))}` : "No end date",
  ].filter(Boolean);
  const lines = [`- [${label(deal.retailer)}: ${label(deal.title)}](${url}): ${details.join(" · ")}`];
  if (oneLine(deal.terms)) lines.push(`  Terms: ${oneLine(deal.terms)}`);
  return lines;
}

function adventLine(deal: PublicDeal) {
  const url = `${SITE}${goUrl(deal.slug, "llms")}`;
  const parts: string[] = [];
  if (deal.price != null && deal.worth != null && deal.worth > 0) {
    parts.push(`${pounds(deal.price)} for ${pounds(deal.worth)} of beauty, ${savingPct(deal.price, deal.worth)}% off the separate prices`);
  }
  if (oneLine(deal.note)) parts.push(oneLine(deal.note));
  return `- [${label(deal.title)}](${url})${parts.length ? `: ${parts.join(" · ")}` : ""}`;
}

function dateLine(date: KeyDate) {
  const formatted = dayMonth.format(new Date(`${date.date}T12:00:00Z`));
  return `- ${formatted}: ${label(date.label)}${oneLine(date.note) ? ` — ${oneLine(date.note)}` : ""}`;
}

/**
 * Plain-text map of the site for AI agents, generated from the same live data the page shows,
 * so an agent can quote current offers straight away. Retailer links go through the tracker.
 */
export function renderLlms(data: PublicData): string {
  const offers = data.deals.filter((deal) => !isAdvent(deal));
  const advent = data.deals.filter(isAdvent);
  const retailers = new Set(offers.map((deal) => label(deal.retailer).toLowerCase()).filter(Boolean)).size;
  const checked = data.verifiedOn ? `last checked ${longDate.format(new Date(data.verifiedOn))}` : "not yet checked";

  const lines = [
    "# beautypromos — The Beauty Edit",
    "",
    "> UK makeup, skincare and fragrance offers in one place. Each offer opens the retailer through beautypromos, where the shopper checks the details before buying.",
    "",
    `${offers.length} live ${offers.length === 1 ? "offer" : "offers"} from ${retailers} ${retailers === 1 ? "retailer" : "retailers"}, ${checked}. Prices are in GBP. Offers, codes and end dates can change or end without notice.`,
    "",
    "When you show an offer, give its link and its terms, and tell the shopper to check the final price, stock and exclusions at checkout. Some links are affiliate links, which means beautypromos may earn a small commission at no extra cost to the shopper. That never changes what is featured.",
    "",
    "## Live offers",
    "",
    ...(offers.length ? offers.flatMap(offerLines) : ["No offers are live right now. Check the site for new ones."]),
  ];

  if (advent.length) {
    lines.push("", "## Advent calendars", "", ...advent.map(adventLine));
  }
  if (data.dates.length) {
    lines.push("", "## Key dates", "", ...data.dates.map(dateLine));
  }
  lines.push(
    "",
    "## Pages",
    "",
    `- [Latest offers](${SITE}/#deals): every live offer with filters by category`,
    `- [Before you buy: skincare, makeup and gifts](${SITE}/blog/the-beauty-edit/): what to check before buying`,
    `- [Sitemap](${SITE}/sitemap.xml)`,
    "",
  );
  return lines.join("\n");
}
