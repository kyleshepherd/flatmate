# Flatmate — Design Spec

A multi-tenant flat-finding app for London. Scrapes Rightmove on a schedule, stores structured property data, and provides a collaborative PWA for groups to browse, shortlist, comment on, and track rental properties.

## 1. Architecture Overview

Monorepo with two deployable services sharing a Drizzle ORM schema:

```
flatmate/
  packages/
    db/              — Drizzle schema, migrations, client
  apps/
    web/             — SvelteKit app (PWA)
    scraper/         — Node.js cron worker
```

### Services

**SvelteKit App (`apps/web`)** — the web UI and all API routes (auth, searches, properties, comments, notifications, invites). Deployed as a Railway service. Serves the PWA with a service worker for push notifications.

**Scraper Worker (`apps/scraper`)** — a standalone Node.js process triggered by Railway cron every 15–30 minutes. Reads active searches from the DB, constructs Rightmove search URLs, fetches HTML, extracts `__NEXT_DATA__` JSON, diffs against existing properties, inserts new ones, fetches floorplans from detail pages where needed, calculates commute times via TfL + ORS, then pings the SvelteKit `/api/notify` endpoint to trigger push notifications.

**PostgreSQL** — Railway addon, shared by both services via a connection string environment variable.

### Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | SvelteKit |
| Auth | BetterAuth |
| Database | PostgreSQL (Railway addon) |
| ORM | Drizzle |
| Styling | Tailwind CSS + shadcn-svelte |
| Maps | Leaflet + OpenStreetMap |
| PWA/Push | Web Push API + service worker |
| Scraper | Node.js + native fetch |
| Commute APIs | TfL Journey Planner + OpenRouteService |
| Hosting | Railway (web + scraper + Postgres) |
| Linting/Formatting | Biome |
| Monorepo | pnpm workspaces |

## 2. Data Model

### users

This IS BetterAuth's user table, defined in our Drizzle schema and passed to BetterAuth's Drizzle adapter. BetterAuth manages its own additional tables (sessions, accounts, verifications) alongside this one — those do not need to be defined here as the adapter creates them automatically.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| email | text unique | |
| name | text | |
| avatar_url | text? | |
| created_at | timestamp | |

### user_commute_destinations

Each user can have multiple commute destinations (e.g. "Office", "Gym").

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| user_id | uuid FK → users | |
| label | text | e.g. "Office" |
| latitude | decimal | |
| longitude | decimal | |
| modes | text[] | e.g. ['transit', 'cycling'] |

### searches

A saved Rightmove search configuration. Mirrors Rightmove's filter options.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| name | text | e.g. "N7 2-bed hunt" |
| created_by | uuid FK → users | |
| location_identifier | text | Rightmove location code |
| location_name | text | e.g. "Holloway, North London" |
| radius | decimal | Miles. 0 = "this area only" |
| min_price | int? | Monthly, GBP |
| max_price | int? | |
| min_bedrooms | int? | |
| max_bedrooms | int? | |
| property_type | text? | null = Any |
| include_let_agreed | boolean | |
| available_from | date? | Earliest acceptable move-in date |
| available_to | date? | Latest acceptable move-in date |
| is_active | boolean | Default true. Set false to pause scraping. |
| invite_code | text unique | For sharing join links |
| last_scraped_at | timestamp? | |
| created_at | timestamp | |

### search_members

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| search_id | uuid FK → searches | |
| user_id | uuid FK → users | |
| role | text | 'owner' or 'member' |
| pending_commute_backfill | boolean | true when user joins, false after scraper processes |
| joined_at | timestamp | |

### properties

Global table — one row per Rightmove listing, deduplicated by `rightmove_id`.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| rightmove_id | bigint unique | |
| address | text | |
| summary | text | |
| bedrooms | int | |
| bathrooms | int | |
| price_monthly | int | |
| property_type | text | e.g. "Apartment", "House Share" |
| latitude | decimal | |
| longitude | decimal | |
| available_date | date? | |
| images | jsonb | [{url, caption}] |
| floorplan_urls | text[] | Fetched from detail page |
| key_features | text[] | |
| agent_name | text | |
| agent_phone | text? | |
| rightmove_url | text | Relative URL to listing |
| listing_status | text | 'new', 'reduced', or 'let_agreed' |
| first_seen_at | timestamp | When we first scraped it |

### search_properties

Join table linking properties to searches. Holds per-group state. Note: `status` here is the group's workflow status (their decision-making process), independent of `properties.listing_status` which reflects Rightmove's own status (new/reduced/let_agreed).

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| search_id | uuid FK → searches | |
| property_id | uuid FK → properties | |
| status | text | 'new', 'interested', 'viewing_booked', 'viewed', 'applied', 'rejected' |
| status_updated_by | uuid? FK → users | |
| status_updated_at | timestamp? | |
| shortlisted | boolean | Group-level shortlist |
| shortlisted_by | uuid? FK → users | Who shortlisted it |
| added_at | timestamp | When scraper linked it |
| | | unique(search_id, property_id) |

### property_changes

Tracks changes to property data (e.g. price reductions).

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| property_id | uuid FK → properties | |
| field | text | e.g. "price_monthly" |
| old_value | text | |
| new_value | text | |
| changed_at | timestamp | |

### comments

Scoped to a search group's view of a property.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| search_property_id | uuid FK → search_properties | |
| user_id | uuid FK → users | |
| body | text | |
| created_at | timestamp | |

### commute_times

Per property per user per destination per mode. Commute is the same regardless of which search found the property.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| property_id | uuid FK → properties | |
| user_id | uuid FK → users | |
| destination_id | uuid FK → user_commute_destinations | |
| mode | text | 'transit', 'walking', or 'cycling' |
| duration_mins | int? | null if calculation failed |
| calculated_at | timestamp | |
| | | unique(property_id, user_id, destination_id, mode) |

### push_subscriptions

A user can have multiple subscriptions (one per device).

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| user_id | uuid FK → users | |
| endpoint | text unique | Web Push endpoint |
| keys | jsonb | Web Push keys |
| created_at | timestamp | |

When sending a push notification, if the endpoint returns HTTP 410 (Gone), delete the subscription row. This handles stale subscriptions from uninstalled browsers/devices.

### scraper_state

Simple key-value table for persisting scraper state across runs (e.g. ORS daily usage).

| Column | Type | Notes |
|--------|------|-------|
| key | text PK | e.g. "ors_daily_count" |
| value | text | Stored as text, parsed by scraper |
| updated_at | timestamp | |

## 3. Scraper Design

### Schedule

Runs as a Railway cron job every 15 minutes. Processes all active searches on each run.

### Flow

1. Query all searches where `is_active = true`.
2. For each search, construct the Rightmove search URL from saved params (`locationIdentifier`, `minPrice`, `maxPrice`, `minBedrooms`, `maxBedrooms`, `radius`, `propertyType`, `includeLetAgreed`).
3. Fetch the HTML page, extract `__NEXT_DATA__` → `props.pageProps.searchResults.properties`.
4. Follow pagination using the `index` query param (24 results per page). Stop when results are empty, fewer than 24, or 42 pages reached.
5. **Availability window filter** — if the search has `available_from` and/or `available_to` set, discard properties that don't match. A property passes the filter if any of:
   - Its `letAvailableDate` falls within the `[available_from, available_to]` window.
   - Its `letAvailableDate` is null/empty (i.e. available "Now") and today's date is within the window.
   - Its `letAvailableDate` text is "Ask agent" (always included — agent may have flexible dates).
   If neither `available_from` nor `available_to` is set on the search, skip filtering entirely.
6. For each property that passes the filter:
   - **New to DB** (`rightmove_id` not in `properties`): insert into `properties`, create `search_properties` row.
   - **Exists but not linked to this search**: create `search_properties` row only.
   - **Already linked**: compare key fields (price, available date, listing status). If changed, update the property and insert a row into `property_changes`.
7. For new properties where `numberOfFloorplans > 0`, fetch the individual Rightmove listing page to extract floorplan URLs.
8. For new properties, calculate commute times for all users in the search group via TfL (transit) and ORS (walking/cycling batch matrix).
9. Update `last_scraped_at` on the search.
10. Ping the SvelteKit `/api/notify` endpoint with the list of new property IDs, changed property IDs (with change details), and which searches they belong to. Notifications are sent for both new properties and price reductions.

### Data Extraction

The scraper relies on Rightmove's `__NEXT_DATA__` JSON embedded in search result pages. This provides structured data including: `id`, `bedrooms`, `bathrooms`, `price`, `location` (lat/lng), `letAvailableDate`, `displayAddress`, `summary`, `keyFeatures`, `images`, `propertyUrl`, `customer` (agent info), `listingUpdate`, `numberOfFloorplans`, and `propertySubType`.

Floorplan URLs are not included in the search results data, so for properties with `numberOfFloorplans > 0`, the scraper fetches the individual listing page.

### Rate Limiting

- **Rightmove**: 1–2 second delay between page fetches to avoid being blocked.
- **TfL**: rate limit to ~30 requests/second (well under their 500/min limit). Process transit commute requests sequentially with a short delay.
- **ORS**: free tier allows 40 requests/min and 2500/day for the matrix endpoint. Batch all origins for a scrape run into as few matrix calls as possible. If the daily limit is approached, skip commute calculation and retry next cycle. Track daily ORS usage via a simple `scraper_state` table (key-value with `ors_daily_count` and `ors_count_date`), reset when the date changes.

### Pagination

Follow pagination using the `index` query param (24 results per page). Terminate when the returned properties array is empty or has fewer than 24 items. Cap at 42 pages (1000 properties) per search to prevent runaway scraping on overly broad searches.

### Error Handling

If Rightmove returns an unexpected response or the `__NEXT_DATA__` structure changes, log the error and skip that search run. Retry on the next cycle. For TfL/ORS failures during commute calculation, set `duration_mins = null`. On subsequent scraper runs, retry any commute_times rows that are null and older than 1 hour.

### Commute Backfill

The `pending_commute_backfill` flag on `search_members` triggers commute recalculation. It is set to `true` in two cases:

1. **User joins a search group** — the web app sets the flag on the new `search_members` row.
2. **User updates their commute destinations** (add/edit/remove) — the web app sets the flag on all of that user's `search_members` rows, and deletes their existing `commute_times` rows so they are recalculated from scratch.

On each run, the scraper checks for any members with this flag set, calculates commute times for all properties in those searches for the user's current destinations, then clears the flag. This keeps all TfL/ORS API logic and rate limiting in the scraper with no additional API endpoints needed.

## 4. Commute Time Calculation

Ported from the existing Rightmove Chrome extension.

### APIs

- **TfL Journey Planner** — for transit (tube, bus, overground, DLR). Individual requests per origin-destination pair.
- **OpenRouteService Matrix API** — for walking and cycling. Batch requests: multiple origins to multiple destinations in a single call.

### Configuration

Each user configures their commute destinations in their profile:
- Label (e.g. "Office")
- Coordinates (lat/lng)
- Modes (transit, walking, cycling)

### Calculation Trigger

- **At scrape time**: when a new property is ingested, calculate commutes for all users in the search group. If a property already exists in the DB (found by another search) and a user already has commute times for it, skip that user — commute times are property+user scoped, not search scoped.
- **On member join**: backfill commutes for all existing properties in the search (via `pending_commute_backfill` flag on `search_members`). Backfill respects the same ORS rate limits and daily caps — if the backfill is large, it will be spread across multiple scraper runs.

## 5. Push Notifications

### Setup

The SvelteKit app registers a service worker as part of the PWA configuration. On first load (or when prompted), the app requests notification permission and generates a Web Push subscription (endpoint + keys). This subscription is stored in the `push_subscriptions` table.

### Flow

1. Scraper finishes a run and finds new or changed properties for a search.
2. Scraper sends a POST to `/api/notify` with `{ searchId, newPropertyIds, changedProperties: [{ id, changes: [{ field, oldValue, newValue }] }] }`, authenticated via a shared secret in the `Authorization` header (`SCRAPER_SECRET` env var). The endpoint rejects requests without a valid secret.
3. The `/api/notify` endpoint looks up all `search_members` for that search, fetches their `push_subscriptions`, and sends a Web Push message to each.
4. Notification content:
   - New listings: "X new properties found in [search name]" with a link to the search feed.
   - Price reductions: "[address] price reduced to [new price]" with a link to the property.

## 6. Pages & Routes

### Auth
- `/login` — BetterAuth login
- `/register` — sign up

### Core
- `/` — dashboard. Shows the user's searches with quick stats (new properties today, etc.)
- `/searches/new` — create a new search. Location input with autocomplete (proxied through our API to Rightmove's location suggest endpoint to resolve `locationIdentifier` codes), radius, price range, bedrooms, property type, include let agreed.
- `/searches/[id]` — main feed for a search. List of property cards with sort (newest, price low/high, commute time) and filter (status, bedrooms, price range). Toggle to map view (Leaflet with property pins). Quick actions on cards: shortlist, change status, open on Rightmove.
- `/searches/[id]/shortlisted` — filtered view of shortlisted properties only.
- `/searches/[id]/properties/[propertyId]` — property detail within a search context. Image gallery, floorplan, description, key features, available date, commute times for each group member, agent info, status workflow, comments thread, link to Rightmove. This is the deep link target for sharing within the app.
- `/invite/[code]` — join a search group via invite link. Shows search name and location, join button. Requires auth.

### Settings
- `/settings` — profile management, commute destinations (add/edit/remove with label, location, and transport modes), notification preferences.

### API Routes

- `/api/auth/*` — BetterAuth handlers (login, register, session, etc.)
- `/api/searches` — CRUD for searches
- `/api/searches/[id]/members` — join, leave, remove member, transfer ownership
- `/api/searches/[id]/properties` — list properties for a search feed (with sort/filter)
- `/api/searches/[id]/properties/[propertyId]` — property detail in search context
- `/api/searches/[id]/properties/[propertyId]/status` — update status on search_properties
- `/api/searches/[id]/properties/[propertyId]/shortlist` — toggle shortlist on search_properties
- `/api/searches/[id]/properties/[propertyId]/comments` — list/create comments
- `/api/location-suggest` — proxy to Rightmove's location typeahead API (unofficial — returns `locationIdentifier` codes for a given text query). This is an undocumented API and may change; if it breaks, we'll find an alternative at that point.
- `/api/notify` — internal endpoint for scraper to trigger push notifications (secured via `SCRAPER_SECRET`)
- `/api/push/subscribe` — register a Web Push subscription
- `/api/push/unsubscribe` — remove a Web Push subscription

## 7. Authentication & Groups

### Auth

BetterAuth with Google OAuth. BetterAuth manages its own tables (sessions, accounts, verifications) via its Drizzle adapter — these don't need to be explicitly defined in our schema.

### Groups (Search Membership)

- A user creates a search and becomes the `owner`.
- The search gets a unique `invite_code`.
- The owner can share a link (`/invite/[code]`) for others to join.
- Joining a search makes you a `member`.
- All members see the same properties, statuses, shortlists, and comments for that search.
- When a new member joins, their commute times are backfilled for existing properties.

### Group Management

- The owner can remove members from a search.
- The owner can delete a search entirely (cascade deletes `search_members`, `search_properties`, and their associated `comments` — the underlying `properties` and `commute_times` rows are retained since they may be linked to other searches).
- If the owner wants to leave, they must transfer ownership to another member first.
- Members can leave a search voluntarily.

## 8. Deployment

All services deployed on Railway:

- **Web** — SvelteKit app, deployed from `apps/web`. Standard web service.
- **Scraper** — Node.js worker, deployed from `apps/scraper`. Railway cron trigger.
- **PostgreSQL** — Railway addon, connection string shared via environment variable.

### Environment Variables

- `DATABASE_URL` — Postgres connection string (shared)
- `TFL_API_KEY` — TfL Journey Planner API key
- `ORS_API_KEY` — OpenRouteService API key
- `WEB_PUSH_PUBLIC_KEY` / `WEB_PUSH_PRIVATE_KEY` — VAPID keys for push notifications
- `BETTER_AUTH_SECRET` — BetterAuth session secret
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — Google OAuth credentials
- `NOTIFY_ENDPOINT` — internal URL for scraper to ping the web app's `/api/notify`
- `SCRAPER_SECRET` — shared secret for authenticating scraper → web API calls
