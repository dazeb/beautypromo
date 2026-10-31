<img src="assets/icon.svg" width="64" height="64" alt="">

# beautypromos — The Beauty Edit

A promo site for UK makeup, skincare and fragrance offers, with an admin panel for managing them. Vite + React on the front, a small Hono server on Node 24, and SQLite (Node's built-in `node:sqlite`) for storage.

## Setup

Needs Node 24+ and pnpm.

```sh
pnpm install
cp .env.example .env      # set ADMIN_PASSWORD and SESSION_SECRET (openssl rand -base64 32)
pnpm db:seed              # loads data/seed-offers.json + seed-dates.json into data/lumiere.db
pnpm dev                  # site on http://localhost:5173, admin at /admin
```

`pnpm db:seed` is safe to re-run: offers are upserted by slug, retailers are only added if missing, and key dates are seeded only into an empty table. Affiliate programme details come from `data/seed-retailers.json`. `pnpm db:seed --demo-clicks` also adds about 400 fake clicks so the dashboard chart has something to show.

## Production

```sh
pnpm build
pnpm start                # serves dist/ + the API on 127.0.0.1:8790
```

The server puts the published offers into the HTML as it sends the home page, so the first paint needs no extra request. Keep `DATABASE_PATH` on a persistent disk. The admin cookie is `Secure` in production. If you serve over plain HTTP on a LAN, set `SESSION_COOKIE_SECURE=false`.

| Variable | Purpose |
|---|---|
| `ADMIN_PASSWORD` | Admin sign-in password. Admin is disabled until set |
| `SESSION_SECRET` | Signs the session cookie, 32+ characters |
| `DATABASE_PATH` | SQLite file, default `data/lumiere.db` |
| `PORT` | Production port, default `8790` |
| `HOST` | Listen address, default `127.0.0.1` (put a reverse proxy in front) |
| `SESSION_COOKIE_SECURE` | `false` to allow the cookie over HTTP |

### Live on hermes-box

Live at <https://lumiere.dazeb.dev> (admin at `/admin`; password in `~/secrets/lumiere.env`). Its own domain is **beautypromos.deals**: the Cloudflare zone and DNS records are ready (A to hermes-box, `www` CNAME, no-mail SPF/DMARC/DKIM). Once the domain is registered and its nameservers are `colette.ns.cloudflare.com` and `scott.ns.cloudflare.com`, run `pnpm go-live`. It serves the site on beautypromos.deals, waits for the certificate, then makes `www.beautypromos.deals` and `lumiere.dazeb.dev` permanent redirects to it, restoring the Caddyfile backup if any step fails.

Ship a new version with:

```sh
pnpm run deploy           # typecheck, build, upload, switch release, health check (rolls back on failure)
```

| On the server | |
|---|---|
| Service | `lumiere.service` (systemd, user `lumiere`, `127.0.0.1:8790`) |
| Code | `/opt/lumiere/releases/<stamp>`, live one symlinked at `/opt/lumiere/current`; the three newest are kept |
| Database | `/var/lib/lumiere/lumiere.db`, never touched by deploys |
| Secrets | `/etc/lumiere/production.env` (`ADMIN_PASSWORD`, `SESSION_SECRET`, `DATABASE_PATH`) |
| Proxy | `lumiere.dazeb.dev` block in `/etc/caddy/Caddyfile` |

Don't run `pnpm db:seed` against the live database after launch: it upserts the seed offers by slug and would overwrite edits made in the admin. `pnpm db:retailers` is safe on live: it adds missing retailers from `data/seed-retailers.json` and fills only blank network, sign-up link, commission and notes fields, so nothing you've edited is overwritten. It also removes retailers that are completely empty and have no offers.

## Admin (`/admin`)

- **Dashboard**: live offers, drafts, clicks today / 7 days / 30 days, subscribers, how many live offers carry an affiliate link, a 30-day click chart (UK days), top offers this week, offers ending in the next 72 hours (extend by 7 days or archive in one click), and recent additions.
- **Offers**: search, filter by status (live / drafts / expired / archived) and category, bulk publish / draft / archive / feature / delete, duplicate, JSON export. Each row shows clicks over 30 days and whether it uses an affiliate link.
- **Offer editor**: a live preview using the same card component as the public site, `⌘S` to save, "Save & add another", and a warning if you leave with unsaved changes. Advent calendars need a price and stated value; everything else needs a headline.
- **Affiliate programmes**: one card per retailer, most live offers first, with an **Apply on <network>** button that opens that retailer's programme page (it becomes **Open on <network>** once you're approved). Each card shows the network, commission where the retailer or network publishes one, live offers and how many already carry an affiliate link, plus a status menu (to apply / applied / approved / rejected) you can change in place. A panel at the top links to the Awin, Partnerize, Skimlinks, CJ and Webgains publisher sign-ups; one account per network covers its participating retailers. The dashboard lists the next programmes to apply for, and the offer editor shows the Apply button next to the Affiliate link field.
- **Key dates**: the "dates that matter" strip. Past dates hide themselves.
- **Subscribers**: sign-ups from "The Sunday Edit" form, with CSV export.
- **Bulk import**: paste a JSON array of offers, check it (a dry run), then import. Offers are upserted by slug. Same shape as `data/seed-offers.json`.

Press `N` anywhere in the admin to start a new offer.

### Getting your affiliate links

On **Affiliate programmes**, use **Apply** for the retailer's programme page and **Get tracking link** for its network dashboard. These shortcuts open the real Awin, Partnerize or Skimlinks portal; sign in with your publisher account. Expand **How to get your link** for the network's instructions. Awin uses Toolbox → Link Builder; Partnerize uses Tracking → Create a Link; Skimlinks uses the Hub's Link Generator; CJ and Webgains provide advertiser-specific link/deep-link tools after approval. Approval and retailer availability depend on your account.

Each retailer card has a **Your tracking link** field with **Save link** and **Copy saved link**. Saving only updates that retailer's reference link. In the offer editor, **Copy offer URL** supplies the destination for the network's generator; paste the resulting deep link into **Affiliate link** and save the offer. The editor also shows the network shortcut, instructions and saved reference link. Check the reference link's destination before reusing it.

Compared with Undercut's current admin, both sites have programme application links, status and notes, saved tracking links, and instructions for finding them. Undercut also supports applying one saved retailer link to multiple unlinked offers. Here each offer keeps its own destination and is edited individually. Other Undercut features still outside this build are CSV import, URL extraction and category editing.

Run `pnpm check:affiliates` to check link saving, authentication, validation, live coverage counts and offer redirects against a temporary database.

### Phones and accessibility

Both stylesheets are mobile first: the base rules are the phone layout and `min-width` queries widen it (40rem, 56rem for the admin sidebar, 64rem for real tables, 75rem for the side-by-side editor). On phones the admin has a Menu button (Escape closes it), tables become cards, the bulk-action bar floats at the bottom, form fields are 16px so iOS doesn't zoom, and touch targets are at least 40px.

The public hero uses a Three.js scene from 56.25rem upwards, loaded separately from the main page. Phones use a CSS illustration, which also serves as the fallback if 3D cannot load. The scene stops rendering while off screen or in a background tab and remains still when reduced motion is requested.

The admin aims at WCAG 2.2 AA: a skip link, focus moves to the page heading after each navigation and the tab title changes, every field has a real label with its hint or error linked, links that open a new tab say so, status changes are announced, and text colours meet 4.5:1 (`--gold-text` and `--faint` are the text versions of the gold and pale grey). axe-core reports no violations on any public or admin page at 390px and 1440px.

## Click tracking

Every Shop button links to `/go/<slug>?s=<section>`. The server logs the click and redirects to the offer's affiliate link, or to its offer page if there is no affiliate link. Bots and link prefetches are not counted. Outbound links carry `rel="sponsored nofollow noopener"`, and the footer has the affiliate disclosure.

## Structure

| Path | Purpose |
|---|---|
| `src/site/` | Public site (React) |
| `src/admin/` | Admin panel (React, small client-side router) |
| `src/shared/` | Types and formatting shared by site, admin and server |
| `src/styles/` | `site.css` (ivory / wine / champagne, Cormorant Garamond + Manrope) and `admin.css` |
| `server/app.ts` | API: `/api/public`, `/api/subscribe`, `/go/:slug`, `/api/admin/*` |
| `server/db.ts` | SQLite schema and row mapping |
| `server/site.ts`, `server/index.ts` | Production server |
| `vite.config.ts` | Mounts the API inside the Vite dev server |
| `data/seed-*.json` | Starting offers and key dates |

## Offer data

Offers were last checked against the retailers' own pages on 31 October 2026. Advent calendar values other than M&S and YOU Beauty come from MoneySavingExpert's 2026 round-up. An offer stops showing on the public site once its end time passes. Anything ending within 4 days appears under **Ending soon**, and the first featured offer becomes the offer of the week.
