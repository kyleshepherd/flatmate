# Deployment — Railway

## Services

### 1. PostgreSQL

- Add PostgreSQL plugin in Railway
- Copy `DATABASE_URL` to both web and scraper services

### 2. Web (`apps/web`)

- **Root directory:** `apps/web`
- **Build command:** `pnpm install && pnpm build`
- **Start command:** `node build/index.js`
- **Environment variables:** all from `.env.example`
- Uses `@sveltejs/adapter-node` — outputs to `build/`

### 3. Scraper (`apps/scraper`)

- **Root directory:** `apps/scraper`
- **Start command:** `pnpm install && pnpm start`
- **Schedule:** cron job, `*/15 * * * *` (every 15 minutes)
- **Environment variables:** `DATABASE_URL`, `TFL_API_KEY`, `ORS_API_KEY`, `NOTIFY_ENDPOINT`, `SCRAPER_SECRET`

## Environment Variables

| Variable | Service | Description |
|---|---|---|
| `DATABASE_URL` | web, scraper | PostgreSQL connection string |
| `BETTER_AUTH_SECRET` | web | Auth session secret |
| `BETTER_AUTH_URL` | web | Public URL (e.g. `https://flatmate.up.railway.app`) |
| `GOOGLE_CLIENT_ID` | web | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | web | Google OAuth client secret |
| `WEB_PUSH_PUBLIC_KEY` | web | VAPID public key |
| `WEB_PUSH_PRIVATE_KEY` | web | VAPID private key |
| `TFL_API_KEY` | scraper | TfL Journey Planner API key |
| `ORS_API_KEY` | scraper | OpenRouteService API key |
| `NOTIFY_ENDPOINT` | scraper | Internal URL for push notifications (e.g. `http://web.railway.internal/api/notify`) |
| `SCRAPER_SECRET` | web, scraper | Shared secret for scraper→web auth |

## Pre-deploy Steps

1. Set up Google OAuth credentials in Google Cloud Console
   - Authorized redirect URI: `https://<your-domain>/api/auth/callback/google`
2. Generate VAPID keys: `npx web-push generate-vapid-keys`
3. Generate `BETTER_AUTH_SECRET`: `openssl rand -base64 32`
4. Generate `SCRAPER_SECRET`: `openssl rand -base64 32`
5. Set `NOTIFY_ENDPOINT` to the internal Railway URL for the web service
6. Set `BETTER_AUTH_URL` to the public Railway URL

## First Deploy

Run migration against the Railway PostgreSQL:

```bash
DATABASE_URL=<railway_url> pnpm db:migrate
```

## Subsequent Deploys

Railway auto-deploys on push to main. If there are new migrations:

```bash
DATABASE_URL=<railway_url> pnpm db:migrate
```
