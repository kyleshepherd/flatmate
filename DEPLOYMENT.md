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

### 3. Scraper (`apps/scraper`)

- **Root directory:** `apps/scraper`
- **Start command:** `pnpm install && pnpm start`
- **Schedule:** cron job, `*/15 * * * *` (every 15 minutes)
- **Environment variables:** `DATABASE_URL`, `TFL_API_KEY`, `ORS_API_KEY`, `NOTIFY_ENDPOINT`, `SCRAPER_SECRET`

## Pre-deploy Steps

1. Set up Google OAuth credentials in Google Cloud Console
   - Authorized redirect URI: `https://<your-domain>/api/auth/callback/google`
2. Generate VAPID keys: `npx web-push generate-vapid-keys`
3. Generate `BETTER_AUTH_SECRET`: `openssl rand -base64 32`
4. Generate `SCRAPER_SECRET`: `openssl rand -base64 32`
5. Set `NOTIFY_ENDPOINT` to the internal Railway URL for the web service (e.g. `http://web.railway.internal/api/notify`)

## First Deploy

```bash
DATABASE_URL=<railway_url> pnpm db:migrate
```
