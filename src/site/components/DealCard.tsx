import { endsLabel, goUrl, isEndingSoon } from "../../shared/format";
import type { PublicDeal } from "../../shared/types";

interface Props {
  deal: PublicDeal;
  now: Date;
  onCopy?: (code: string) => void;
  /** Admin preview: render without a working outbound link. */
  preview?: boolean;
}

export function CodeButton({ code, onCopy }: { code: string; onCopy?: (code: string) => void }) {
  return (
    <button className="code" type="button" onClick={() => onCopy?.(code)}>
      <span className="code__value">{code}</span>
      <span className="code__action">
        Copy<span className="visually-hidden"> code</span>
      </span>
    </button>
  );
}

/** Tracked link to the retailer. `context` is read to screen readers after the visible text. */
export function OutboundLink({ deal, source, preview, className, children, context }: {
  deal: PublicDeal;
  source: string;
  preview?: boolean;
  className: string;
  children: React.ReactNode;
  context?: string;
}) {
  return (
    <a className={className} href={preview ? undefined : goUrl(deal.slug, source)} target="_blank" rel="sponsored nofollow noopener">
      {children}
      <span className="visually-hidden">
        {context ? `: ${context}` : ""} (opens in a new tab)
      </span>
    </a>
  );
}

export function DealCard({ deal, now, onCopy, preview }: Props) {
  const soon = isEndingSoon(deal, now);
  return (
    <li className="card" data-tone={deal.categories[0] ?? "makeup"}>
      <div className="card__swatch" aria-label={`${deal.retailer} offer artwork`}>
        <span className={`card__art card__art--${deal.categories[0] ?? "makeup"}`} aria-hidden="true">
          <span className="card__art-product"><span /></span>
        </span>
        <span className="card__retailer">{deal.retailer || "Retailer"}</span>
        <span className="card__headline">{deal.headline || "—"}</span>
        <span className="card__sub">{deal.sub}</span>
      </div>
      <div className="card__body">
        <h3 className="card__title">{deal.title || "Untitled offer"}</h3>
        <p className="card__details">{deal.details}</p>
        {deal.code ? <CodeButton code={deal.code} onCopy={onCopy} /> : null}
        {deal.terms ? <p className="card__terms">{deal.terms}</p> : null}
        <div className="card__foot">
          <span className={`card__ends${soon ? " card__ends--soon" : ""}`}>{endsLabel(deal, now)}</span>
          <OutboundLink deal={deal} source="grid" preview={preview} className="card__link" context={deal.title}>
            Shop {deal.retailer}
            <span aria-hidden="true"> →</span>
          </OutboundLink>
        </div>
      </div>
    </li>
  );
}
