import { useEffect, useMemo, useRef, useState } from "react";
import { isEndingSoon, isLive, pounds } from "../shared/format";
import { CATEGORIES, type PublicData } from "../shared/types";
import { DealCard } from "./components/DealCard";
import { BrandShowcase } from "./components/BrandShowcase";
import { HeroArt } from "./components/HeroArt";
import { Advent, EndingSoon, Featured, KeyDates, Newsletter, Verified } from "./components/Sections";

const FILTERS = [{ id: "all", label: "All" }, ...CATEGORIES.filter((c) => c.id !== "advent")];

/** Current time, refreshed every 30 seconds so countdowns move and offers retire on time. */
function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);
  return now;
}

function useToast() {
  const [message, setMessage] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const show = (text: string) => {
    setMessage(text);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setMessage(""), 2200);
  };
  return { message, show };
}

export function App({ data }: { data: PublicData }) {
  const now = useNow();
  const [filter, setFilter] = useState("all");
  const toast = useToast();

  const live = useMemo(() => data.deals.filter((d) => isLive(d, now)), [data, now]);
  const offers = live.filter((d) => !d.categories.includes("advent"));
  const advent = live.filter((d) => d.categories.includes("advent"));
  const featured = offers.find((d) => d.featured);
  const ending = offers.filter((d) => isEndingSoon(d, now)).sort((a, b) => Date.parse(a.endsAt!) - Date.parse(b.endsAt!));
  const shown = offers.filter((d) => filter === "all" || d.categories.includes(filter as never));
  const maxWorth = Math.max(0, ...offers.map((d) => d.worth ?? 0));

  async function copy(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      toast.show(`Code ${code} copied`);
    } catch {
      toast.show(`Your code is ${code}`);
    }
  }

  return (
    <>
      <a className="skip" href="#deals">
        Skip to the offers
      </a>

      <aside className="announce" aria-label="About these offers">
        <p>
          {data.verifiedOn ? (
            <>
              Every offer checked by hand on <Verified iso={data.verifiedOn} />
              <span className="announce__sep" aria-hidden="true">
                ·
              </span>
            </>
          ) : null}
          The season's best beauty offers, edited
        </p>
      </aside>

      <header className="site-header">
        <a className="wordmark" href="#top">
          <img className="wordmark__logo" src="/beautypromos-logo.png" alt="beautypromos — The Beauty Edit" width="2172" height="724" />
        </a>
        <nav className="site-nav" aria-label="Sections">
          {ending.length > 0 ? <a href="#ending">Ending soon</a> : null}
          <a href="#deals">The edit</a>
          {advent.length > 0 ? <a href="#advent">Advent</a> : null}
          <a href="#dates">Dates</a>
        </nav>
      </header>

      <main id="top">
        <section className="hero">
          <div className="hero__copy">
            <p className="eyebrow hero__eyebrow"><span /> Your beauty edit starts here</p>
            <h1>
              Good beauty.<br /><em>Better finds.</em>
            </h1>
            <p className="hero__lede">
              A considered edit of makeup, skincare and fragrance offers from brands you love. All the beauty, with a little less spend.
            </p>
            <div className="hero__actions">
              <a className="btn btn--ink" href="#deals">
                Explore the offers <span aria-hidden="true">↗</span>
              </a>
              {advent.length > 0 ? (
                <a className="btn btn--line" href="#advent">
                  Advent calendars
                </a>
              ) : null}
            </div>
          </div>
          <HeroArt />
          <dl className="hero__stats">
            <div>
              <dt>Live offers</dt>
              <dd>{offers.length}</dd>
            </div>
            <div>
              <dt>Retailers</dt>
              <dd>{new Set(offers.map((d) => d.retailer)).size}</dd>
            </div>
            {maxWorth > 0 ? (
              <div>
                <dt>Gift value up to</dt>
                <dd>{pounds(maxWorth)}</dd>
              </div>
            ) : null}
          </dl>
        </section>

        {featured ? <Featured deal={featured} /> : null}

        <BrandShowcase deals={offers} />

        <EndingSoon deals={ending} now={now} />

        <section id="deals" className="section" aria-labelledby="deals-title">
          <div className="section__head section__head--split">
            <div>
              <p className="eyebrow">The edit</p>
              <h2 id="deals-title">Every offer, considered</h2>
            </div>
            <div className="filters" role="group" aria-label="Filter offers">
              {FILTERS.map((f) => (
                <button key={f.id} type="button" className="chip" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>
          <p className="visually-hidden" role="status">
            {filter === "all" ? "" : `${shown.length} ${shown.length === 1 ? "offer" : "offers"} in ${FILTERS.find((f) => f.id === filter)?.label}`}
          </p>
          <ul className="grid">
            {shown.map((d) => (
              <DealCard key={d.slug} deal={d} now={now} onCopy={copy} />
            ))}
          </ul>
          {shown.length === 0 ? <p className="empty">Nothing in this edit right now. Try another filter.</p> : null}
        </section>

        <Advent deals={advent} />
        <KeyDates dates={data.dates} now={now} />
        <Newsletter />

        <section className="section promise" aria-labelledby="promise-title">
          <h2 id="promise-title" className="visually-hidden">
            How we choose
          </h2>
          <div className="promise__item">
            <span className="promise__num">I</span>
            <h3>Read at the source</h3>
            <p>Every price, code and end date comes from the retailer's own offer page, not a voucher aggregator.</p>
          </div>
          <div className="promise__item">
            <span className="promise__num">II</span>
            <h3>Edited, not exhaustive</h3>
            <p>Only the offers we'd tell a friend about. Real value, recognisable brands, sensible spend thresholds.</p>
          </div>
          <div className="promise__item">
            <span className="promise__num">III</span>
            <h3>Gone when it's gone</h3>
            <p>Offers retire themselves the moment they expire, so what you see is what you can still buy.</p>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="wordmark wordmark--footer">
          <img className="wordmark__logo" src="/beautypromos-logo.png" alt="beautypromos — The Beauty Edit" width="2172" height="724" loading="lazy" />
        </div>
        <p className="site-footer__note">
          beautypromos is independent. Some links are affiliate links, which means we may earn a small commission if you buy, at no extra cost to you.
          It never changes what we feature. Offers are subject to each retailer's terms, stock and exclusions, and can change without notice.
          Please check the final price at checkout.
        </p>
        {data.verifiedOn ? (
          <p className="site-footer__fine">
            Last checked <Verified iso={data.verifiedOn} />. Prices in GBP.
          </p>
        ) : null}
        <a className="site-footer__amp" href="/amp/">View the AMP page</a>
        <p className="site-footer__version">Version {__APP_VERSION__}</p>
      </footer>

      <div className={`toast${toast.message ? " toast--show" : ""}`} role="status" aria-live="polite">
        {toast.message}
      </div>
    </>
  );
}
