import { html } from "hono/html";
import type { PublicData, PublicDeal } from "../src/shared/types.ts";

export interface AmpDeal extends PublicDeal {
  href: string;
}

export interface AmpData extends PublicData {
  deals: AmpDeal[];
}

const date = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/London" });
const money = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 2 });

/** A complete AMP document, rendered from the same live data as the React site. */
export function renderAmp(data: AmpData, version: string) {
  const cards = data.deals.map((deal) => html`
    <li class="card" data-tone="${deal.categories[0] ?? "makeup"}">
      <div class="card-art">
        <p class="eyebrow">${deal.retailer}</p>
        <p class="headline">${deal.headline}</p>
        <p class="sub">${deal.sub}</p>
      </div>
      <div class="card-body">
        <h3>${deal.title}</h3>
        <p>${deal.details}</p>
        ${deal.price != null ? html`<p class="price">${money.format(deal.price)}${deal.worth != null ? html` <span>· stated value ${money.format(deal.worth)}</span>` : ""}</p>` : ""}
        ${deal.code ? html`<p class="code">Use code <strong>${deal.code}</strong></p>` : ""}
        ${deal.terms ? html`<p class="terms">${deal.terms}</p>` : ""}
        ${deal.note ? html`<p class="terms">${deal.note}</p>` : ""}
        ${deal.endsAt ? html`<p class="ends">Ends <time datetime="${deal.endsAt}">${date.format(new Date(deal.endsAt))}</time></p>` : ""}
        <a class="button" href="${deal.href}" target="_blank" rel="sponsored nofollow noopener">Shop ${deal.retailer}<span class="visually-hidden">: ${deal.title} (opens in a new tab)</span><span aria-hidden="true"> ↗</span></a>
      </div>
    </li>`);

  return String(html`<!doctype html>
<html amp lang="en-GB">
<head>
  <meta charset="utf-8">
  <script async src="https://cdn.ampproject.org/v0.js"></script>
  <script async custom-element="amp-skimlinks" src="https://cdn.ampproject.org/v0/amp-skimlinks-0.1.js"></script>
  <title>UK Beauty Offers, Makeup &amp; Skincare Deals | beautypromos</title>
  <link rel="canonical" href="https://beautypromos.deals/">
  <meta name="viewport" content="width=device-width,minimum-scale=1,initial-scale=1">
  <meta name="description" content="Explore UK makeup, skincare and fragrance offers, discount codes, gifts with purchase and beauty advent calendars. Check each retailer's terms before buying.">
  <meta name="robots" content="index, follow, max-image-preview:large">
  <meta name="theme-color" content="#faf6f1">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Manrope:wght@400;500;600&display=swap" rel="stylesheet">
  <style amp-boilerplate>body{-webkit-animation:-amp-start 8s steps(1,end) 0s 1 normal both;-moz-animation:-amp-start 8s steps(1,end) 0s 1 normal both;-ms-animation:-amp-start 8s steps(1,end) 0s 1 normal both;animation:-amp-start 8s steps(1,end) 0s 1 normal both}@-webkit-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-moz-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-ms-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-o-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}</style>
  <noscript><style amp-boilerplate>body{-webkit-animation:none;-moz-animation:none;-ms-animation:none;animation:none}</style></noscript>
  <style amp-custom>
    :root{--ivory:#faf6f1;--paper:#f3ece4;--ink:#1f1a17;--muted:#6e625a;--rose:#824553;--line:#e2d6cb;--serif:"Cormorant Garamond",Georgia,serif;--sans:"Manrope",system-ui,sans-serif}
    *{box-sizing:border-box}body{margin:0;background:var(--ivory);color:var(--ink);font:400 1rem/1.65 var(--sans)}a{color:inherit}a:focus-visible{outline:2px solid var(--rose);outline-offset:3px}h1,h2,h3{margin:0;font-family:var(--serif);font-weight:500;line-height:1.05}h1{font-size:clamp(3rem,8vw,5rem);letter-spacing:-.03em}h2{font-size:2.6rem}h3{font-size:1.8rem}em{color:var(--rose);font-weight:400}
    .announce{margin:0;padding:.65rem 1.25rem;background:var(--paper);color:var(--muted);text-align:center;font-size:.75rem;letter-spacing:.04em}.header{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:1rem;padding:1rem max(1.25rem,calc((100% - 1160px)/2));border-bottom:1px solid var(--line)}.logo{width:min(17.5rem,66vw)}.header nav{display:flex;gap:1rem}.header nav a{display:inline-flex;align-items:center;min-height:44px;font-size:.75rem;text-decoration:none;color:var(--muted)}
    main{max-width:1200px;margin:auto;padding:0 1.25rem}.hero{padding:3.5rem 0 3rem;max-width:44rem}.eyebrow{font-size:.7rem;font-weight:600;letter-spacing:.18em;text-transform:uppercase;color:var(--rose)}.lede{max-width:38rem;color:var(--muted)}.hero .button{margin-top:.5rem}.section{padding:1.5rem 0 3rem}.section-head{margin-bottom:1.5rem}.count{color:var(--muted);font-size:.8rem}
    .cards{list-style:none;display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,19rem),1fr));gap:1.5rem;margin:0;padding:0}.card{--tone-a:#f2e2da;--tone-b:#e6c9be;--tone-ink:#824553;display:flex;flex-direction:column;background:#fffdfa;border:1px solid var(--line)}.card[data-tone=skincare]{--tone-a:#eef0e6;--tone-b:#d6dcc8;--tone-ink:#3f4a35}.card[data-tone=fragrance]{--tone-a:#efe6f0;--tone-b:#d9c7dc;--tone-ink:#4b2f52}.card[data-tone=gift],.card[data-tone=advent]{--tone-a:#f4ead9;--tone-b:#e2cfab;--tone-ink:#6b4f22}.card[data-tone=code]{--tone-a:#e8ecef;--tone-b:#cdd6dc;--tone-ink:#2c3e4c}.card-art{position:relative;isolation:isolate;overflow:hidden;min-height:12rem;padding:1.4rem 1.5rem;background:linear-gradient(150deg,var(--tone-a),var(--tone-b));color:var(--tone-ink)}.card-art:after{content:"";position:absolute;right:-3rem;bottom:-3rem;width:10rem;height:10rem;border-radius:50%;border:1px solid currentColor;opacity:.18;z-index:-1}.card-art .eyebrow{margin:0 0 1rem;color:inherit}.headline{margin:.5rem 0 0;font:500 3.4rem/1 var(--serif)}.sub{margin:.5rem 0 0;font-size:.85rem}.card-body{display:flex;flex:1;flex-direction:column;align-items:flex-start;padding:1.5rem}.card-body p{margin:.9rem 0;font-size:.9rem;color:var(--muted)}.card-body .terms,.card-body .ends{font-size:.75rem}.card-body .code{padding:.5rem .8rem;border:1px dashed #b8976a;color:var(--ink)}.code strong{letter-spacing:.1em}.price span{font-size:.8rem}.button{display:inline-flex;align-items:center;justify-content:center;gap:.35rem;min-height:44px;padding:.75rem 1.1rem;border:1px solid var(--rose);background:var(--rose);color:var(--ivory);font-size:.72rem;font-weight:600;letter-spacing:.1em;text-decoration:none;text-transform:uppercase;transition:background-color 180ms ease}.button:hover{background:#6b3744}.card-body .button{margin-top:auto}
    .dates{list-style:none;margin:1.5rem 0 0;padding:0}.dates li{display:grid;grid-template-columns:minmax(8rem,1fr) 3fr;gap:1rem;padding:1rem 0;border-bottom:1px solid var(--line)}.dates time{color:var(--rose);font-size:.85rem}.dates h3{font-size:1.5rem}.dates p{margin:.5rem 0 0;color:var(--muted);font-size:.85rem}.footer{padding:2.5rem 1.25rem;text-align:center;background:var(--paper);border-top:1px solid var(--line)}.footer .logo{margin:0 auto 1.5rem}.footer p{max-width:44rem;margin:.75rem auto;color:var(--muted);font-size:.8rem}.footer .version{font-size:.68rem;letter-spacing:.06em}.footer a{display:inline-flex;align-items:center;min-height:44px;color:var(--rose)}.visually-hidden{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap}.skip{position:absolute;top:-4rem;left:1rem;z-index:2;padding:.5rem 1rem;background:var(--ink);color:var(--ivory)}.skip:focus{top:1rem}@media(max-width:480px){.header{align-items:flex-start;flex-direction:column}.hero{padding-top:2.5rem}.dates li{grid-template-columns:1fr;gap:.5rem}}@media(prefers-reduced-motion:reduce){.button{transition:none}}
  </style>
</head>
<body>
  <a class="skip" href="#offers">Skip to the offers</a>
  <p class="announce">The season’s best beauty offers, edited</p>
  <header class="header">
    <a class="logo" href="/" aria-label="beautypromos — The Beauty Edit"><amp-img src="/beautypromos-logo.png" width="2172" height="724" layout="responsive" alt="beautypromos — The Beauty Edit"></amp-img></a>
    <nav aria-label="Sections"><a href="#offers">The edit</a>${data.dates.length ? html`<a href="#dates">Dates</a>` : ""}<a href="/">Full site ↗</a></nav>
  </header>
  <main>
    <section class="hero" aria-labelledby="hero-title">
      <p class="eyebrow">Your beauty edit starts here</p>
      <h1 id="hero-title">Good beauty.<br><em>Better finds.</em></h1>
      <p class="lede">A considered edit of makeup, skincare and fragrance offers from brands you love. All the beauty, with a little less spend.</p>
      <a class="button" href="#offers">Explore the offers ↗</a>
    </section>
    <section class="section" id="offers" aria-labelledby="offers-title">
      <div class="section-head"><p class="eyebrow">The edit</p><h2 id="offers-title">Every offer, considered</h2><p class="count">${data.deals.length} live ${data.deals.length === 1 ? "offer" : "offers"}</p></div>
      ${cards.length ? html`<ul class="cards">${cards}</ul>` : html`<p>Nothing in this edit right now. Check back soon for new offers.</p>`}
    </section>
    ${data.dates.length ? html`<section class="section" id="dates" aria-labelledby="dates-title"><p class="eyebrow">For your diary</p><h2 id="dates-title">The dates that matter</h2><ul class="dates">${data.dates.map((item) => html`<li><time datetime="${item.date}">${date.format(new Date(`${item.date}T12:00:00Z`))}</time><div><h3>${item.label}</h3><p>${item.note}</p></div></li>`)}</ul></section>` : ""}
  </main>
  <footer class="footer">
    <div class="logo"><amp-img src="/beautypromos-logo.png" width="2172" height="724" layout="responsive" alt="beautypromos — The Beauty Edit"></amp-img></div>
    <p>beautypromos is independent. Some links are affiliate links, including links provided by Skimlinks, which means we may earn a small commission if you buy, at no extra cost to you. It never changes what we feature.</p>
    <p>Offers are subject to each retailer’s terms, stock and exclusions, and can change without notice. Please check the final price at checkout. Prices in GBP.</p>
    ${data.verifiedOn ? html`<p>Last checked <time datetime="${data.verifiedOn}">${date.format(new Date(data.verifiedOn))}</time>.</p>` : ""}
    <a href="/">Visit the full site</a>
    <p class="version">Version ${version}</p>
  </footer>
  <amp-skimlinks layout="nodisplay" publisher-code="312095X1800668"></amp-skimlinks>
</body>
</html>`);
}
