import { useState } from "react";
import { goUrl, longDate, pounds, savingPct, timeLeft } from "../../shared/format";
import type { KeyDate, PublicDeal } from "../../shared/types";
import { OutboundLink } from "./DealCard";

export function Featured({ deal }: { deal: PublicDeal }) {
  return (
    <section className="section featured" aria-labelledby="featured-title">
      <div className="featured__card">
        <div className="featured__mark">
          <span className="featured__headline">{deal.headline}</span>
          <span className="featured__sub">{deal.sub}</span>
        </div>
        <div className="featured__copy">
          <p className="eyebrow">Offer of the week · {deal.retailer}</p>
          <h2 id="featured-title">{deal.title}</h2>
          <p>{deal.details}</p>
          <p className="featured__terms">{deal.terms}</p>
          <OutboundLink deal={deal} source="featured" className="btn btn--ink">
            Shop at {deal.retailer}
          </OutboundLink>
        </div>
      </div>
    </section>
  );
}

export function EndingSoon({ deals, now }: { deals: PublicDeal[]; now: Date }) {
  if (deals.length === 0) return null;
  return (
    <section id="ending" className="section ending" aria-labelledby="ending-title">
      <div className="section__head">
        <p className="eyebrow">Last chance</p>
        <h2 id="ending-title">Ending soon</h2>
      </div>
      <ol className="ending__list">
        {deals.map((d) => (
          <li key={d.slug} className="ending__item">
            <span className="ending__time">{timeLeft(d.endsAt!, now)}</span>
            <span className="ending__what">
              <strong>{d.retailer}</strong> {d.title}
              <span className="ending__sub">
                {d.headline} {d.sub}
              </span>
            </span>
            <OutboundLink deal={d} source="ending" className="ending__link" context={`${d.title} at ${d.retailer}`}>
              Shop<span aria-hidden="true"> →</span>
            </OutboundLink>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function Advent({ deals }: { deals: PublicDeal[] }) {
  const ranked = deals
    .filter((d) => d.price != null && d.worth != null && d.worth > 0)
    .map((d) => ({ ...d, saving: savingPct(d.price!, d.worth!) }))
    .sort((a, b) => b.saving - a.saving);
  if (ranked.length === 0) return null;
  return (
    <section id="advent" className="section advent" aria-labelledby="advent-title">
      <div className="section__head">
        <p className="eyebrow">The countdown</p>
        <h2 id="advent-title">Advent calendars, by value</h2>
        <p className="section__lede">
          The share you save against buying each product separately. These sell out, and many go on sale in late November.
        </p>
      </div>
      <ol className="advent__list">
        {ranked.map((a, i) => (
          <li key={a.slug} className="advent__item">
            <span className="advent__rank" aria-hidden="true">
              {String(i + 1).padStart(2, "0")}
            </span>
            <div className="advent__info">
              <a href={goUrl(a.slug, "advent")} target="_blank" rel="sponsored nofollow noopener" className="advent__name">
                {a.title}
                <span className="visually-hidden"> (opens in a new tab)</span>
              </a>
              <span className="advent__price">
                {pounds(a.price!)} for {pounds(a.worth!)} of beauty
                {a.note ? ` · ${a.note}` : ""}
              </span>
              <span className="advent__bar" style={{ "--w": `${a.saving}%` } as React.CSSProperties} />
            </div>
            <span className="advent__saving">
              {a.saving}
              <small>% off</small>
              <span className="visually-hidden"> the separate prices</span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

const day = new Intl.DateTimeFormat("en-GB", { day: "numeric", timeZone: "UTC" });
const month = new Intl.DateTimeFormat("en-GB", { month: "short", timeZone: "UTC" });

export function KeyDates({ dates, now }: { dates: KeyDate[]; now: Date }) {
  const upcoming = dates.filter((d) => new Date(`${d.date}T23:59:59Z`) > now);
  if (upcoming.length === 0) return null;
  return (
    <section id="dates" className="section dates" aria-labelledby="dates-title">
      <div className="section__head">
        <p className="eyebrow">For your diary</p>
        <h2 id="dates-title">The dates that matter</h2>
      </div>
      <ol className="dates__list">
        {upcoming.map((d) => {
          const date = new Date(`${d.date}T12:00:00Z`);
          return (
            <li key={d.id} className="dates__item">
              <time dateTime={d.date} className="dates__day">
                <span>{day.format(date)}</span>
                {month.format(date)}
              </time>
              <div>
                <h3>{d.label}</h3>
                <p>{d.note}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export function Newsletter() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<{ kind: "idle" | "sending" | "done" | "error"; message?: string }>({ kind: "idle" });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState({ kind: "sending" });
    const res = await fetch("/api/subscribe", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email }),
    }).catch(() => null);
    if (res?.ok) setState({ kind: "done" });
    else setState({ kind: "error", message: (await res?.json().catch(() => null))?.error ?? "That didn't go through. Please try again." });
  }

  return (
    <section id="newsletter" className="section newsletter" aria-labelledby="newsletter-title">
      <div className="newsletter__card">
        <div>
          <p className="eyebrow">The Sunday Edit</p>
          <h2 id="newsletter-title">The week's best offers, in one quiet email</h2>
        </div>
        {state.kind === "done" ? (
          <p className="newsletter__done" role="status">
            You're on the list. See you on Sunday.
          </p>
        ) : (
          <form className="newsletter__form" onSubmit={submit}>
            <label className="visually-hidden" htmlFor="newsletter-email">
              Email address
            </label>
            <input
              id="newsletter-email"
              type="email"
              required
              autoComplete="email"
              placeholder="Your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button className="btn btn--ink" type="submit" disabled={state.kind === "sending"}>
              {state.kind === "sending" ? "Joining…" : "Join"}
            </button>
            {state.kind === "error" ? (
              <p className="newsletter__error" role="alert">
                {state.message}
              </p>
            ) : null}
          </form>
        )}
      </div>
    </section>
  );
}

export function Verified({ iso }: { iso: string | null }) {
  if (!iso) return null;
  return <time dateTime={iso.slice(0, 10)}>{longDate.format(new Date(iso))}</time>;
}
