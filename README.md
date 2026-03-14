# Flatmate

Multi-tenant flat-finding PWA that scrapes Rightmove, calculates commute times, and lets groups collaboratively track rental properties.

## Tech Stack

- **Frontend:** SvelteKit, Tailwind CSS, shadcn-svelte, Leaflet
- **Backend:** SvelteKit server routes, BetterAuth (Google OAuth)
- **Database:** PostgreSQL, Drizzle ORM
- **Scraper:** Node.js worker (tsx), Rightmove `__NEXT_DATA__` extraction
- **APIs:** TfL Journey Planner, OpenRouteService
- **Infra:** pnpm workspaces, Biome, Docker Compose, Railway

## Project Structure

```
flatmate/
├── packages/db/          # Drizzle ORM schema + migrations
├── apps/web/             # SvelteKit PWA
└── apps/scraper/         # Rightmove scraper worker
```

## Local Development

### Prerequisites

- Node.js 20+
- pnpm 10+
- Docker

### Setup

```bash
cp .env.example .env
# Fill in GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, BETTER_AUTH_SECRET

pnpm install
pnpm dev          # Starts Postgres (Docker) + all dev servers
```

- Web app: http://localhost:5173
- Stop Postgres: `pnpm dev:stop`

### Database

```bash
pnpm db:migrate                    # Run migrations
pnpm db:generate:named <name>     # Generate a new migration (run from packages/db)
pnpm db:studio                     # Open Drizzle Studio
```

## Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `BETTER_AUTH_SECRET` | Secret for session encryption |
| `TFL_API_KEY` | TfL Journey Planner API key |
| `ORS_API_KEY` | OpenRouteService API key |
| `WEB_PUSH_PUBLIC_KEY` | VAPID public key |
| `WEB_PUSH_PRIVATE_KEY` | VAPID private key |
| `NOTIFY_ENDPOINT` | URL for push notification endpoint |
| `SCRAPER_SECRET` | Shared secret for scraper → web auth |
