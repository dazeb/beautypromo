import { useEffect, useMemo, useRef, useState } from "react";
import { isEndingSoon, isLive, pounds } from "../shared/format";
import { CATEGORIES, type PublicData } from "../shared/types";
import { BLOG_POST } from "../shared/blog";
import { useSiteMotion } from "./useSiteMotion";
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
  const mainRef = useRef<HTMLElement>(null);
  useSiteMotion(mainRef, filter);
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
              Latest recorded offer check: <Verified iso={data.verifiedOn} />
              <span className="announce__sep" aria-hidden="true">
                ·
              </span>
            </>
          ) : null}
          Makeup, skincare and fragrance offers
        </p>
      </aside>

      <header className="site-header">
        <a className="wordmark" href="#top">
          <img className="wordmark__logo" src={`/beautypromos-logo.png?v=${__APP_VERSION__}`} alt="beautypromos — The Beauty Edit" width="2172" height="724" />
        </a>
        <nav className="site-nav" aria-label="Sections">
          {ending.length > 0 ? <a href="#ending">Ending soon</a> : null}
          <a href="#deals">Offers</a>
          {advent.length > 0 ? <a href="#advent">Advent</a> : null}
          <a href="#dates">Dates</a>
          <a href="/blog/">Blog</a>
        </nav>
      </header>

      <main id="top" className="site-motion" ref={mainRef}>
        <section className="hero">
          <div className="hero__copy">
            <p className="eyebrow hero__eyebrow"><span /> beautypromos</p>
            <h1>
              Beauty offers,<br /><em>in one place.</em>
            </h1>
            <p className="hero__lede">
              Makeup, skincare and fragrance from the brands you know. Check the details, then shop with the retailer.
            </p>
            <div className="hero__actions">
              <a className="btn btn--ink" href="#deals">
                Browse offers <span aria-hidden="true">↗</span>
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
              <h2 id="deals-title">Latest offers</h2>
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
        <section className="section journal" aria-labelledby="journal-title">
          <p className="eyebrow">From the blog</p>
          <h2 id="journal-title">Before you buy</h2>
          <article className="journal__card">
            <div className="journal__topics" aria-hidden="true"><span>Skincare</span><span>Makeup</span><span>Gifting</span></div>
            <div className="journal__copy"><h3><a href={BLOG_POST.path}>{BLOG_POST.title}</a></h3><p>{BLOG_POST.description}</p><a className="journal__link" href={BLOG_POST.path}>Read the article <span aria-hidden="true">↗</span></a></div>
          </article>
        </section>
        <Newsletter />

      </main>

      <footer className="site-footer">
        <div className="wordmark wordmark--footer">
          <img className="wordmark__logo" src={`/beautypromos-logo.png?v=${__APP_VERSION__}`} alt="beautypromos — The Beauty Edit" width="2172" height="724" loading="lazy" />
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
