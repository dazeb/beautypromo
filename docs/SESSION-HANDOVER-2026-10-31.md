# Session handover — 31 October 2026

This document records the BeautyPromos project decisions and implementation details from the 31 October 2026 working session. It is intended as a practical handover for future development and deployment.

## Repository and product

- Repository: [`dazeb/beautypromo`](https://github.com/dazeb/beautypromo)
- Product: **beautypromos — The Beauty Edit**, a UK-focused beauty offers and affiliate site covering makeup, skincare and fragrance.
- Stack: React + Vite frontend, Hono server on Node 24+, SQLite using Node's built-in `node:sqlite`, and pnpm.
- Main areas: public offers site, `/admin` dashboard, offer management, retailer/affiliate programme management, click tracking and newsletter subscribers.
- Main code locations: `src/site/`, `src/admin/`, `src/shared/`, `src/styles/`, `server/app.ts`, `server/db.ts`, and `data/seed-*.json`.

## Work already merged: retailer and product imagery

The earlier visual merchandising work was merged to `main` in PR [#1](https://github.com/dazeb/beautypromo/pull/1) and subsequent follow-up work:

- Added a public **Brand Showcase** section, built from retailers that actually have offers.
- Brand tiles show the retailer and an offer headline and use the existing tracked outbound-link flow.
- Added category-specific editorial product illustrations to deal cards using CSS.
- These illustrations are CSS artwork, not real product photography. Real retailer/product image assets can be added later when suitable assets and usage rights are available.
- Main files involved included `src/site/App.tsx`, `src/site/components/BrandShowcase.tsx`, `src/site/components/DealCard.tsx` and `src/styles/site.css`.

## Affiliate programme setup

The retailer seed data includes candidate retailer programmes and network guidance. Commission rates are not hard-coded when they are not verified; approval, commission, territory and advertiser eligibility must be checked in the relevant publisher account.

Networks referenced by the admin include Awin, Partnerize, Skimlinks, CJ and Webgains. The admin's affiliate programme area provides application/tracking-link guidance and retailer-level status/reference-link fields. A retailer reference link is not automatically a replacement for each offer's destination: deal-specific affiliate deep links should be saved on the individual offer where available.

### Estée Lauder — Awin

The publisher supplied this Awin tracking URL for **Estée Lauder**:

```text
https://www.awin1.com/cread.php?awinmid=123256&awinaffid=3140953
```

Identifiers in that URL:
- Awin advertiser/merchant ID: `123256`
- Publisher/affiliate ID: `3140953`

The Estée Lauder retailer seed record was updated to:
- Network: `Awin`
- Programme page: `https://ui.awin.com/merchant-profile/123256`
- Commission: left unset (`null`) until confirmed in the publisher account.
- Notes: advertiser 123256; the publisher's base tracking link is configured as the fallback for Estée Lauder offers; use offer-specific Awin deep links when available.

The relevant seed file is `data/seed-retailers.json`.

### Estée Lauder redirect behaviour

In `server/app.ts`, the tracked `/go/:slug` redirect now selects the retailer as well as the offer destination. For an Estée Lauder offer:

1. If the offer has its own `affiliate_url`, that deal-specific deep link wins.
2. Otherwise, the Estée Lauder Awin tracking URL above is used.
3. Other retailers continue to use their saved offer affiliate URL when present, or their ordinary offer URL when not.

The redirect remains behind the existing `/go/:slug` route, so the normal click-tracking flow is retained.

Implementation commit:
- `1843b49673c115fb3b535ab84ec458aaa2a05bb9` — Estée Lauder Awin fallback in `server/app.ts`.
- `e90a717cc1054625b22972eb48aa79f0f3f97eea` — Estée Lauder Awin programme metadata in `data/seed-retailers.json`.

Important data distinction: changing `data/seed-retailers.json` affects seed data, not automatically an already-existing production retailer row. The repository README documents `pnpm db:retailers` as a safe live operation: it adds missing retailers and fills only blank programme fields, without overwriting populated values. The redirect fallback itself is code-level and does not depend on changing the live retailer row.

## Deployment setup

### Current production layout

The project README documents the live app at `https://lumiere.dazeb.dev` and the production layout:

| Item | Production value |
|---|---|
| systemd service | `lumiere.service` |
| Current release symlink | `/opt/lumiere/current` |
| Release directories | `/opt/lumiere/releases/<stamp>` |
| Persistent SQLite database | `/var/lib/lumiere/lumiere.db` |
| Production environment file | `/etc/lumiere/production.env` |
| Health-check URL | `https://lumiere.dazeb.dev` |

The deployment script is `scripts/deploy.sh`; the package command is `pnpm run deploy`. It typechecks and builds locally, uploads a release, installs production dependencies, switches the current-release symlink, restarts `lumiere.service`, checks health and rolls back to the previous release if the health check fails. It keeps the newest three releases. The database and production environment file are not included in the deployment payload and must remain persistent.

### Automatic deployment workflow

Added `.github/workflows/deploy.yml` to deploy on:
- every push to `main`
- manual `workflow_dispatch` from GitHub Actions

The workflow uses Node 24, pnpm 10 and a frozen lockfile install, then runs `pnpm run deploy`. It serializes production deployments using a concurrency group.

Required GitHub repository Actions secrets:

| Secret | Required value |
|---|---|
| `DEPLOY_HOST` | SSH destination in `user@host` form for the deployment account on the production server |
| `DEPLOY_SSH_KEY` | Private SSH key for that deployment account; its public key must be authorized on the server |
| `DEPLOY_KNOWN_HOSTS` | Verified SSH host-key line(s) for the server |

Optional GitHub Actions variable:
- `DEPLOY_URL`: external health-check URL; defaults to `https://lumiere.dazeb.dev`.

The deployment account must have the tools and permissions expected by `scripts/deploy.sh`, including pnpm, release installation, symlink replacement and permission to restart `lumiere.service`. SSH host-key checking must remain enabled. Verify the host fingerprint independently before saving the known-hosts value.

**Security:** never commit a private SSH key, production password, session secret, or contents of `/etc/lumiere/production.env` to this repository. Add private deployment credentials only through GitHub's Actions secrets interface.

### Deployment status at the end of this session

- The Estée Lauder Awin code and retailer seed changes were committed directly to `main`.
- The automatic deployment workflow exists in the repository.
- At the time of the session check, the GitHub Actions runs query returned zero workflow runs.
- Therefore, a successful automatic deployment was **not verified** during this session. Do not assume the live site has the Estée Lauder redirect change until a successful Actions run and production health check are confirmed.
- The workflow requires the three repository secrets above before it can deploy. After they are configured, a push to `main` or a manual workflow run should start deployment.

Useful settings page: [GitHub Actions secrets for this repository](https://github.com/dazeb/beautypromo/settings/secrets/actions).

## Operational cautions

- Do not run `pnpm db:seed` against the live database after launch: it can overwrite offer edits made in the admin.
- The README documents `pnpm db:retailers` as the safer live retailer refresh: it adds missing retailers and fills only blank programme metadata fields.
- Awin links are advertiser-specific. Do not reuse the Estée Lauder link for other retailers.
- Prefer each offer's own Awin deep link when available; the configured Estée Lauder URL is a brand-level fallback.
- Do not invent or publish commission rates; verify the approved programme terms in Awin.
- Keep affiliate disclosure and sponsored/nofollow link attributes in place.
- Do not claim deployment succeeded until the Actions run and health check show success.

## Useful commands

```sh
pnpm install
pnpm typecheck
pnpm build
pnpm run deploy
pnpm check:affiliates
```

For a local seed database only:

```sh
pnpm db:seed
```

Refer to the root `README.md` for the full setup, admin, affiliate-link, accessibility and production documentation.
