import { Hono } from "hono";
import { html } from "hono/html";
import { BLOG_POST } from "../src/shared/blog.ts";
import type { PublicData } from "../src/shared/types.ts";

const origin = "https://beautypromos.deals";
const displayDate = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

const sections = [
  {
    id: "skincare", title: "Skincare: make room for what you will use",
    paragraphs: [
      "A skincare offer earns its place when it fits the routine you already enjoy. Before adding a serum, cleanser or moisturiser to your basket, look at the product size, ingredient list and directions. A familiar product you were planning to replace can be a more useful purchase than a larger set full of things you have never wanted.",
      "No7’s US range includes cleansers, moisturisers and serums alongside makeup. Estée Lauder also offers skincare, makeup and fragrance. These are different ranges to explore, rather than a reason to buy a whole new routine. Choose according to your preferences and read the brand’s product information; a discount does not tell you whether a formula is right for you.",
    ],
  },
  {
    id: "makeup", title: "Makeup: the shade matters as much as the saving",
    paragraphs: [
      "A soft pink lipstick, a favourite foundation or a compact you can slip into your bag can make a lovely everyday addition. The detail to check is the one that makes it wearable for you: shade, finish, coverage or format. Look for swatches and the retailer’s shade guidance rather than choosing from the packaging alone.",
      "Cult Beauty and Sephora bring many beauty brands together, making them useful places to compare ranges. When a promotion is attached to a particular collection, check that your chosen product and shade are included. Read the returns policy before opening cosmetics, especially when trying a new colour or formula.",
    ],
  },
  {
    id: "gifting", title: "Gift sets and advent calendars: look inside the box",
    paragraphs: [
      "A beautifully presented set can feel thoughtful, but its contents should do the work. Start with the recipient: do they love fragrance, wear a particular lip colour or already have a favourite skincare range? A smaller set of products they will enjoy may be a better gift than a bigger collection chosen for its headline value.",
      "Check how many products are full size, how many are minis and whether the quoted value is a retailer’s estimate based on separate prices. An advent calendar can be a fun way to discover a range, but the comparison is only useful if you would actually use or gift the contents. With fragrance, a familiar scent or a discovery format can be easier to choose than an unfamiliar full-size bottle.",
    ],
  },
  {
    id: "value", title: "What makes an offer worth considering?",
    paragraphs: [
      "We look at the purchase itself, not just the percentage beside it. For a gift with purchase, ask whether the qualifying spend is something you would make anyway. Add delivery to the total, check code exclusions and look at the final basket before deciding. Spending more to unlock a free gift can cost more than buying the item you originally wanted.",
      "Offers and stock can change between reading an article and checking out. Use our current offers page as your starting point, then confirm the price, eligibility and terms on the retailer’s own site. This article is a shopping guide, not a promise that a particular campaign, product or discount is still available.",
    ],
  },
  {
    id: "regions", title: "A quick check before you shop overseas",
    paragraphs: [
      "Our edit focuses on UK beauty, with some regional links labelled separately. The No7 campaign we have added is for the US store, and the Estée Lauder bestsellers reference is for Canada. A Sephora Poland campaign is also a different destination from Sephora UK. An offer available in one country may not apply in another.",
      "Check the storefront, currency, delivery destination and any import charges before comparing prices. If a seasonal campaign has ended, return to the retailer’s current offers rather than assuming an older link still carries the same saving.",
    ],
  },
] as const;

function article() {
  return html`
    <div class="article-layout">
      <aside class="contents" aria-label="In this article"><p class="eyebrow">In this edit</p><ol>${sections.map((section) => html`<li><a href="#${section.id}">${section.title}</a></li>`)}</ol></aside>
      <article class="article-copy" aria-label="Article">
        <p class="intro">Good beauty does not have to mean a crowded shelf. Sometimes it is the moisturiser you finish, a pink lipstick you reach for every morning, or a gift set chosen with someone in mind.</p>
        <p>That is the idea behind beautypromos: a considered edit of beauty offers from brands and retailers, with the details you need to decide for yourself. Here is how we approach skincare, makeup and gifting, and what to check before you buy.</p>
        ${sections.map((section, index) => html`<section id="${section.id}"><span class="section-number" aria-hidden="true">${String(index + 1).padStart(2, "0")}</span><h2>${section.title}</h2>${section.paragraphs.map((paragraph) => html`<p>${paragraph}</p>`)}</section>`)}
        <aside class="takeaway"><p class="eyebrow">The considered choice</p><h2>Buy for the product, then enjoy the saving.</h2><p>A useful beauty find should suit your routine, your budget and the person you are buying for. Keep those in view and the offer becomes a welcome extra.</p><a class="button" href="/#deals">Explore the current offers <span aria-hidden="true">↗</span></a></aside>
        <section class="sources" aria-labelledby="sources-title"><h2 id="sources-title">Brand and retailer references</h2><p>Product categories were checked against these official storefronts when preparing this article. Prices and promotions are not fixed by this guide.</p><ul><li><a href="https://us.no7beauty.com/" target="_blank" rel="noopener">No7 US: skincare and makeup</a></li><li><a href="https://www.esteelauder.co.uk/" target="_blank" rel="noopener">Estée Lauder UK: skincare, makeup and fragrance</a></li><li><a href="https://www.cultbeauty.com/" target="_blank" rel="noopener">Cult Beauty: brand and product collections</a></li><li><a href="https://www.sephora.co.uk/" target="_blank" rel="noopener">Sephora UK: brand and product collections</a></li></ul></section>
      </article>
    </div>`;
}

function renderBlog(isArticle: boolean, version: string, data: PublicData) {
  const canonical = origin + (isArticle ? BLOG_POST.path : "/blog/");
  const title = isArticle ? `${BLOG_POST.title} | beautypromos` : "The Journal: Beauty Guides & Shopping Notes | beautypromos";
  const description = isArticle ? BLOG_POST.description : "Read the beautypromos journal for thoughtful skincare, makeup and gifting guides, product inspiration and practical notes on shopping beauty offers.";
  const related = data.deals.filter((deal) => !deal.categories.includes("advent")).slice(0, 3);
  const schema = isArticle ? {
    "@context": "https://schema.org", "@type": "BlogPosting", headline: BLOG_POST.title,
    description: BLOG_POST.description, datePublished: BLOG_POST.published, inLanguage: "en-GB",
    mainEntityOfPage: canonical, url: canonical, image: `${origin}/social-card.png`,
    author: { "@type": "Organization", name: "beautypromos", url: origin + "/" },
    publisher: { "@type": "Organization", name: "beautypromos", url: origin + "/", logo: { "@type": "ImageObject", url: `${origin}/beautypromos-logo.png` } },
  } : {
    "@context": "https://schema.org", "@type": "Blog", name: "The beautypromos Journal", url: canonical,
    description, inLanguage: "en-GB", blogPost: [{ "@type": "BlogPosting", headline: BLOG_POST.title, url: origin + BLOG_POST.path }],
  };

  return String(html`<!doctype html>
<html lang="en-GB">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <meta name="description" content="${description}">
  <meta name="robots" content="index, follow, max-image-preview:large">
  <meta name="theme-color" content="#faf6f1">
  <link rel="canonical" href="${canonical}">
  <link rel="sitemap" type="application/xml" href="/sitemap.xml">
  <meta property="og:type" content="${isArticle ? "article" : "website"}">
  <meta property="og:site_name" content="beautypromos">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:image" content="${origin}/social-card.png">
  <meta property="og:image:alt" content="beautypromos — The Beauty Edit">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">
  <meta name="twitter:image" content="${origin}/social-card.png">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Manrope:wght@400;500;600&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/blog.css">
</head>
<body>
  <a class="skip" href="#main">Skip to content</a>
  <header class="header"><a class="logo" href="/" aria-label="beautypromos home"><img src="/beautypromos-logo.png" alt="beautypromos — The Beauty Edit" width="2172" height="724"></a><nav aria-label="Main navigation"><a href="/#deals">The edit</a><a href="/blog/" aria-current="${isArticle ? "location" : "page"}">The journal</a><a href="/#newsletter">The Sunday Edit</a></nav></header>
  <main id="main" class="main">
    <nav class="breadcrumbs" aria-label="Breadcrumb"><a href="/">Home</a><span aria-hidden="true">/</span>${isArticle ? html`<a href="/blog/">The journal</a><span aria-hidden="true">/</span><span>The beauty edit</span>` : html`<span>The journal</span>`}</nav>
    <section class="hero" aria-labelledby="page-title">
      <div><p class="eyebrow">${isArticle ? "The journal · Shopping thoughtfully" : "Notes from the beauty edit"}</p><h1 id="page-title">${isArticle ? BLOG_POST.title : "A little beauty reading."}</h1><p class="dek">${isArticle ? BLOG_POST.description : "Beauty finds, thoughtful gifts and the small details that make an offer worth considering. Pull up a chair."}</p>${isArticle ? html`<p class="byline">By the beautypromos edit <span aria-hidden="true">·</span> <time datetime="${BLOG_POST.published}">${displayDate.format(new Date(BLOG_POST.published))}</time></p>` : ""}</div>
      <div class="hero-art" aria-hidden="true"><div class="orbit"></div><div class="bottle bottle-sage"></div><div class="bottle bottle-lilac"></div><div class="compact"></div><span class="art-label">A considered beauty edit</span></div>
    </section>
    ${isArticle ? html`<p class="disclosure">Affiliate disclosure: some links on beautypromos may earn us a commission, at no extra cost to you. This is an editorial shopping guide, not a hands-on product review.</p>${article()}` : html`<section class="post-list" aria-labelledby="latest-title"><div class="section-head"><p class="eyebrow">Fresh from the journal</p><h2 id="latest-title">Our latest story</h2></div><article class="post-card"><div class="post-card-art" aria-hidden="true"><span>Skincare</span><span>Makeup</span><span>Gifting</span></div><div class="post-card-copy"><p class="eyebrow">Shopping thoughtfully · <time datetime="${BLOG_POST.published}">${displayDate.format(new Date(BLOG_POST.published))}</time></p><h3><a href="${BLOG_POST.path}">${BLOG_POST.title}</a></h3><p>${BLOG_POST.description}</p><a class="text-link" href="${BLOG_POST.path}">Read the article <span aria-hidden="true">↗</span></a></div></article></section>`}
    ${isArticle && related.length ? html`<section class="related" aria-labelledby="related-title"><div class="section-head"><p class="eyebrow">Continue exploring</p><h2 id="related-title">From the current edit</h2></div><ul>${related.map((deal) => html`<li><p class="eyebrow">${deal.retailer}</p><h3>${deal.title}</h3><p>${deal.headline} ${deal.sub}</p><a class="text-link" href="/#deals">View the current offers <span aria-hidden="true">↗</span></a></li>`)}</ul></section>` : ""}
  </main>
  <footer class="footer"><a class="logo" href="/"><img src="/beautypromos-logo.png" alt="beautypromos — The Beauty Edit" width="2172" height="724" loading="lazy"></a><p>Independent beauty finds. Some links are affiliate links; offers, stock and terms can change. Check the retailer’s final price and regional eligibility before buying.</p><nav aria-label="Footer"><a href="/#deals">Explore the offers</a><a href="/blog/">The journal</a><a href="/amp/">AMP offers</a></nav><p class="version">Version ${version}</p></footer>
  <script type="text/javascript" src="https://s.skimresources.com/js/312095X1800668.skimlinks.js"></script>
</body>
</html>`).replace("</head>", `<script type="application/ld+json">${JSON.stringify(schema).replace(/</g, "\\u003c")}</script></head>`);
}

export function createBlog(version: string, readData: () => PublicData) {
  const blog = new Hono();
  blog.get("/blog", (c) => c.redirect("/blog/", 301));
  blog.get("/blog/", (c) => c.html(renderBlog(false, version, readData())));
  blog.get(BLOG_POST.path.slice(0, -1), (c) => c.redirect(BLOG_POST.path, 301));
  blog.get(BLOG_POST.path, (c) => c.html(renderBlog(true, version, readData())));
  blog.get("/blog/*", (c) => c.text("Article not found", 404));
  return blog;
}
