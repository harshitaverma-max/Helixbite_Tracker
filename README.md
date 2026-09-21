# Helixbite Tracker

A 24x7 live dashboard for Helixbite: events participated in, sales so far,
Instagram followers, and new orders from Amazon, the website, and WhatsApp.

## How it's built

- **`server/`** — Express + TypeScript API. Polls Instagram (hourly) and
  Amazon (every 5 min, since SP-API has no order webhook) on a cron schedule,
  and accepts real-time webhooks from the website (Shopify/WooCommerce) and
  WhatsApp (Meta Cloud API) the moment an order comes in. Everything lands in
  one small JSON-file datastore (`server/src/db.ts` — swap this module for
  Postgres/Prisma later without touching anything else) and is served as one
  aggregated `/api/summary`. A `/api/stream` SSE endpoint pushes updates to
  connected dashboards immediately, instead of waiting on the next poll.
- **`web/`** — React + Vite dashboard. Polls `/api/summary` every 15s as a
  fallback and also listens on the SSE stream for instant updates. Stat tiles
  for the four headline numbers, a followers trend sparkline, and an
  orders-by-channel breakdown + live orders feed.

Every external integration (Instagram, Amazon, website, WhatsApp) falls back
to realistic **mock/demo data** when its API credentials aren't set, so the
whole thing runs out of the box before any real accounts are wired up.

## Running it locally

```bash
npm install                # installs both workspaces
cp server/.env.example server/.env   # fill in real API creds as they're ready
npm run dev                 # runs the API (port 4000) and dashboard (port 5173) together
```

Open http://localhost:5173.

## Wiring up real data

Each connector has setup notes at the top of its file:

| Source | File | How it connects |
|---|---|---|
| Events | `server/src/routes/events.ts` | Manual entry via `POST /api/events` — there's no API for "which trade shows did we attend," so this is the intended source of truth. Wire a small admin form to it. |
| Instagram followers | `server/src/connectors/instagram.ts` | Instagram Graph API, polled hourly. Needs `INSTAGRAM_ACCESS_TOKEN` + `INSTAGRAM_BUSINESS_ACCOUNT_ID`. |
| Amazon orders | `server/src/connectors/amazon.ts` | Selling Partner API, polled every 5 min (no order webhook exists). Needs `AMAZON_SP_API_REFRESH_TOKEN`, `AMAZON_SP_API_CLIENT_ID`, `AMAZON_SP_API_CLIENT_SECRET`, `AMAZON_SP_API_MARKETPLACE_ID`, `AMAZON_SP_API_REGION`. |
| Website orders | `server/src/connectors/website.ts` | Shopify/WooCommerce order-created webhook → `POST /api/webhooks/website`, HMAC-verified via `WEBSITE_WEBHOOK_SECRET`. |
| WhatsApp orders | `server/src/connectors/whatsapp.ts` | WhatsApp Cloud API webhook → `POST /api/webhooks/whatsapp`, verified on setup via `WHATSAPP_VERIFY_TOKEN`. |

## Production notes

This scaffold intentionally uses a flat JSON file for storage and runs as a
single process, so it's easy to read and run anywhere. Before treating it as
the real 24x7 tracker:

- Swap `server/src/db.ts` for a real database (Postgres is the natural
  choice) — the rest of the codebase only calls the `db` object, so this is a
  one-file change.
- Deploy the API somewhere that stays up (it's what both the cron polls and
  the webhooks depend on) and put the webhook URLs behind HTTPS.
- Add alerting if a poll fails repeatedly or a metric hasn't updated in N
  hours — a "live" tracker that goes silently stale is worse than no tracker.
