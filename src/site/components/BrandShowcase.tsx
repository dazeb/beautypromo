import type { PublicDeal } from "../../shared/types";
import { OutboundLink } from "./DealCard";

export function BrandShowcase({ deals }: { deals: PublicDeal[] }) {
  const seen = new Set<string>();
  const brands = deals.filter((deal) => {
    const key = deal.retailer.trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 8);

  if (!brands.length) return null;
  return (
    <section className="section brands" aria-labelledby="brands-title">
      <div className="section__head">
        <p className="eyebrow">The names on our edit</p>
        <h2 id="brands-title">Beauty brands worth a look</h2>
      </div>
      <div className="brands__grid">
        {brands.map((deal) => (
          <OutboundLink key={deal.slug} deal={deal} source="brand-showcase" className="brand-tile" context={deal.retailer}>
            <span className="brand-tile__wordmark">{deal.retailer}</span>
            <span className="brand-tile__offer">{deal.headline || "Explore the offer"} <span aria-hidden="true">↗</span></span>
          </OutboundLink>
        ))}
      </div>
    </section>
  );
}
