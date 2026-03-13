# Flatmate Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a multi-tenant flat-finding PWA that scrapes Rightmove, calculates commute times, and lets groups collaboratively track rental properties.

**Architecture:** Monorepo with SvelteKit PWA + Node.js scraper worker sharing a Drizzle ORM schema, all deployed on Railway with PostgreSQL. Scraper runs on a 15-minute cron, extracts `__NEXT_DATA__` from Rightmove search pages, enriches with commute times via TfL + ORS APIs.

**Tech Stack:** SvelteKit, BetterAuth (Google OAuth), Drizzle ORM, PostgreSQL, Tailwind + shadcn-svelte, Leaflet, Web Push API, Biome, pnpm workspaces, Railway.

**Spec:** `docs/superpowers/specs/2026-03-12-flatmate-design.md`

**Reference project:** `~/personal/checkpnt` — same stack (BetterAuth + Drizzle + SvelteKit + shadcn-svelte + Biome + pnpm workspaces + Railway). Use its patterns for auth setup, Drizzle schema, Biome config, and SvelteKit conventions.

---

## File Structure

```
flatmate/
├── package.json                          # Root workspace scripts
├── pnpm-workspace.yaml
├── biome.json
├── .gitignore
├── .env.example
├── packages/
│   └── db/
│       ├── package.json
│       ├── tsconfig.json
│       ├── drizzle.config.ts
│       └── src/
│           ├── index.ts                  # DB client + schema re-exports
│           ├── client.ts                 # postgres.js client
│           └── schema/
│               ├── index.ts              # Re-export all schema
│               ├── auth.ts              # users, sessions, accounts, verifications (BetterAuth)
│               ├── searches.ts          # searches, search_members
│               ├── properties.ts        # properties, search_properties, property_changes
│               ├── commute.ts           # user_commute_destinations, commute_times
│               ├── comments.ts          # comments
│               ├── notifications.ts     # push_subscriptions
│               ├── scraper-state.ts     # scraper_state
│               └── relations.ts         # All Drizzle relations
├── apps/
│   ├── web/
│   │   ├── package.json
│   │   ├── svelte.config.js
│   │   ├── vite.config.ts
│   │   ├── tsconfig.json
│   │   ├── static/
│   │   │   └── manifest.json            # PWA manifest
│   │   └── src/
│   │       ├── app.html
│   │       ├── app.css                  # Tailwind + custom styles
│   │       ├── hooks.server.ts          # Session middleware
│   │       ├── app.d.ts                 # Type declarations (locals.session etc.)
│   │       ├── service-worker.ts        # Push notification handler
│   │       └── lib/
│   │           ├── auth-client.ts       # BetterAuth client
│   │           ├── auth-server.ts       # BetterAuth server config
│   │           ├── server/
│   │           │   └── db.ts            # DB import for server routes
│   │           └── components/
│   │               ├── ui/              # shadcn-svelte components
│   │               ├── PropertyCard.svelte
│   │               ├── PropertyMap.svelte
│   │               ├── CommuteChips.svelte
│   │               ├── StatusBadge.svelte
│   │               ├── CommentThread.svelte
│   │               └── ImageGallery.svelte
│   │       └── routes/
│   │           ├── +layout.svelte
│   │           ├── +layout.server.ts
│   │           ├── +page.svelte                          # Dashboard
│   │           ├── +page.server.ts
│   │           ├── login/
│   │           │   └── +page.svelte
│   │           ├── searches/
│   │           │   ├── new/
│   │           │   │   ├── +page.svelte
│   │           │   │   └── +page.server.ts
│   │           │   └── [id]/
│   │           │       ├── +page.svelte                  # Property feed
│   │           │       ├── +page.server.ts
│   │           │       ├── shortlisted/
│   │           │       │   ├── +page.svelte
│   │           │       │   └── +page.server.ts
│   │           │       └── properties/
│   │           │           └── [propertyId]/
│   │           │               ├── +page.svelte          # Property detail
│   │           │               └── +page.server.ts
│   │           ├── invite/
│   │           │   └── [code]/
│   │           │       ├── +page.svelte
│   │           │       └── +page.server.ts
│   │           ├── settings/
│   │           │   ├── +page.svelte
│   │           │   └── +page.server.ts
│   │           └── api/
│   │               ├── auth/
│   │               │   └── [...all]/
│   │               │       └── +server.ts                # BetterAuth catch-all
│   │               ├── searches/
│   │               │   ├── +server.ts
│   │               │   └── [id]/
│   │               │       ├── members/
│   │               │       │   └── +server.ts
│   │               │       └── properties/
│   │               │           ├── +server.ts
│   │               │           └── [propertyId]/
│   │               │               ├── +server.ts
│   │               │               ├── status/
│   │               │               │   └── +server.ts
│   │               │               ├── shortlist/
│   │               │               │   └── +server.ts
│   │               │               └── comments/
│   │               │                   └── +server.ts
│   │               ├── location-suggest/
│   │               │   └── +server.ts
│   │               ├── notify/
│   │               │   └── +server.ts
│   │               └── push/
│   │                   ├── subscribe/
│   │                   │   └── +server.ts
│   │                   └── unsubscribe/
│   │                       └── +server.ts
│   └── scraper/
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── index.ts                  # Main entry — orchestrates scrape run
│           ├── rightmove/
│           │   ├── search.ts             # Construct URLs, fetch pages
│           │   ├── extract.ts            # Parse __NEXT_DATA__ into property data
│           │   └── floorplans.ts         # Fetch detail pages for floorplan URLs
│           ├── commute/
│           │   ├── tfl.ts                # TfL Journey Planner API
│           │   ├── ors.ts                # OpenRouteService matrix API
│           │   └── calculate.ts          # Orchestrate commute calculations + backfill
│           ├── notify.ts                 # POST to /api/notify
│           └── rate-limit.ts             # Rate limiting utilities
```

---

## Chunk 1: Foundation — Monorepo, Tooling, DB Schema

### Task 1: Initialise monorepo and tooling

**Files:**
- Create: `package.json`, `pnpm-workspace.yaml`, `biome.json`, `.gitignore`, `.env.example`

- [ ] **Step 1: Create root package.json**

```json
{
  "name": "flatmate",
  "private": true,
  "scripts": {
    "dev": "pnpm -r --parallel dev",
    "dev:web": "pnpm --filter @flatmate/web dev",
    "dev:scraper": "pnpm --filter @flatmate/scraper dev",
    "build": "pnpm -r build",
    "lint": "biome check .",
    "format": "biome check --write .",
    "typecheck": "pnpm -r typecheck",
    "db:generate:named": "pnpm --filter @flatmate/db generate:named --",
    "db:migrate": "pnpm --filter @flatmate/db migrate",
    "db:studio": "pnpm --filter @flatmate/db studio"
  }
}
```

- [ ] **Step 2: Create pnpm-workspace.yaml**

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

- [ ] **Step 3: Create biome.json**

Match checkpnt's config (tabs, double quotes, semicolons, trailing commas):

```json
{
  "$schema": "https://biomejs.dev/schemas/1.9.4/schema.json",
  "vcs": {
    "enabled": true,
    "clientKind": "git",
    "useIgnoreFile": true
  },
  "organizeImports": { "enabled": true },
  "formatter": {
    "enabled": true,
    "indentStyle": "tab",
    "indentWidth": 2,
    "lineWidth": 100
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "style": { "useConst": "off" }
    }
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "double",
      "semicolons": "always",
      "trailingCommas": "all"
    }
  },
  "files": {
    "ignore": [
      "node_modules",
      "dist",
      "build",
      ".svelte-kit",
      "apps/web/src/lib/components/ui"
    ]
  }
}
```

- [ ] **Step 4: Create .gitignore**

```
node_modules/
dist/
build/
.svelte-kit/
.env
.env.local
.DS_Store
.superpowers/
```

- [ ] **Step 5: Create .env.example**

```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/flatmate
TFL_API_KEY=
ORS_API_KEY=
WEB_PUSH_PUBLIC_KEY=
WEB_PUSH_PRIVATE_KEY=
BETTER_AUTH_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
NOTIFY_ENDPOINT=http://localhost:5173/api/notify
SCRAPER_SECRET=
```

- [ ] **Step 6: Commit**

```bash
git add package.json pnpm-workspace.yaml biome.json .gitignore .env.example
git commit -m "chore: initialise monorepo with pnpm workspaces and biome"
```

---

### Task 2: Create DB package with Drizzle schema

**Files:**
- Create: `packages/db/package.json`, `packages/db/tsconfig.json`, `packages/db/drizzle.config.ts`
- Create: `packages/db/src/client.ts`, `packages/db/src/index.ts`
- Create: All schema files in `packages/db/src/schema/`

- [ ] **Step 1: Create packages/db/package.json**

```json
{
  "name": "@flatmate/db",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts"
  },
  "scripts": {
    "generate": "drizzle-kit generate",
    "generate:named": "drizzle-kit generate --name",
    "migrate": "drizzle-kit migrate",
    "studio": "drizzle-kit studio"
  },
  "dependencies": {
    "drizzle-orm": "^0.38.0",
    "postgres": "^3.4.5"
  },
  "devDependencies": {
    "drizzle-kit": "^0.30.0",
    "typescript": "^5.7.0"
  }
}
```

- [ ] **Step 2: Create packages/db/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "outDir": "dist",
    "rootDir": "src",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create packages/db/drizzle.config.ts**

```typescript
import { defineConfig } from "drizzle-kit";

export default defineConfig({
	dialect: "postgresql",
	schema: "./src/schema",
	out: "./drizzle",
	dbCredentials: {
		url: process.env.DATABASE_URL!,
	},
});
```

- [ ] **Step 4: Create packages/db/src/client.ts**

```typescript
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export function createDb(connectionString: string) {
	const client = postgres(connectionString);
	return drizzle(client, { schema });
}

export type Database = ReturnType<typeof createDb>;
```

- [ ] **Step 5: Create packages/db/src/schema/auth.ts**

Follow checkpnt's pattern — define all BetterAuth tables explicitly. Note: BetterAuth expects `image` (not `avatar_url` from spec) and requires `emailVerified`/`updatedAt` columns. The spec's `users` table is simplified; the schema here matches BetterAuth's requirements:

```typescript
import { boolean, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
	id: uuid("id").primaryKey().defaultRandom(),
	name: text("name").notNull(),
	email: text("email").notNull().unique(),
	emailVerified: boolean("email_verified").notNull().default(false),
	image: text("image"),
	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const sessions = pgTable("sessions", {
	id: uuid("id").primaryKey().defaultRandom(),
	userId: uuid("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	token: text("token").notNull().unique(),
	expiresAt: timestamp("expires_at").notNull(),
	ipAddress: text("ip_address"),
	userAgent: text("user_agent"),
	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const accounts = pgTable("accounts", {
	id: uuid("id").primaryKey().defaultRandom(),
	userId: uuid("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	accountId: text("account_id").notNull(),
	providerId: text("provider_id").notNull(),
	accessToken: text("access_token"),
	refreshToken: text("refresh_token"),
	accessTokenExpiresAt: timestamp("access_token_expires_at"),
	refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
	scope: text("scope"),
	idToken: text("id_token"),
	password: text("password"),
	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const verifications = pgTable("verifications", {
	id: uuid("id").primaryKey().defaultRandom(),
	identifier: text("identifier").notNull(),
	value: text("value").notNull(),
	expiresAt: timestamp("expires_at").notNull(),
	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
```

- [ ] **Step 6: Create packages/db/src/schema/searches.ts**

```typescript
import { boolean, pgTable, decimal, integer, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { users } from "./auth";

export const searches = pgTable("searches", {
	id: uuid("id").primaryKey().defaultRandom(),
	name: text("name").notNull(),
	createdBy: uuid("created_by")
		.notNull()
		.references(() => users.id),
	locationIdentifier: text("location_identifier").notNull(),
	locationName: text("location_name").notNull(),
	radius: decimal("radius", { precision: 4, scale: 1 }).notNull().default("0"),
	minPrice: integer("min_price"),
	maxPrice: integer("max_price"),
	minBedrooms: integer("min_bedrooms"),
	maxBedrooms: integer("max_bedrooms"),
	propertyType: text("property_type"),
	includeLetAgreed: boolean("include_let_agreed").notNull().default(false),
	isActive: boolean("is_active").notNull().default(true),
	inviteCode: text("invite_code").notNull().unique(),
	lastScrapedAt: timestamp("last_scraped_at"),
	createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const searchMembers = pgTable("search_members", {
	id: uuid("id").primaryKey().defaultRandom(),
	searchId: uuid("search_id")
		.notNull()
		.references(() => searches.id, { onDelete: "cascade" }),
	userId: uuid("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	role: text("role").notNull().default("member"),
	pendingCommuteBackfill: boolean("pending_commute_backfill").notNull().default(true),
	joinedAt: timestamp("joined_at").notNull().defaultNow(),
});
```

- [ ] **Step 7: Create packages/db/src/schema/properties.ts**

```typescript
import {
	bigint,
	boolean,
	date,
	decimal,
	integer,
	jsonb,
	pgTable,
	text,
	timestamp,
	unique,
	uuid,
} from "drizzle-orm/pg-core";
import { users } from "./auth";
import { searches } from "./searches";

export const properties = pgTable("properties", {
	id: uuid("id").primaryKey().defaultRandom(),
	rightmoveId: bigint("rightmove_id", { mode: "number" }).notNull().unique(),
	address: text("address").notNull(),
	summary: text("summary").notNull(),
	bedrooms: integer("bedrooms").notNull(),
	bathrooms: integer("bathrooms").notNull(),
	priceMonthly: integer("price_monthly").notNull(),
	propertyType: text("property_type").notNull(),
	latitude: decimal("latitude", { precision: 10, scale: 6 }).notNull(),
	longitude: decimal("longitude", { precision: 10, scale: 6 }).notNull(),
	availableDate: date("available_date"),
	images: jsonb("images").notNull().default([]),
	floorplanUrls: text("floorplan_urls").array().notNull().default([]),
	keyFeatures: text("key_features").array().notNull().default([]),
	agentName: text("agent_name").notNull(),
	agentPhone: text("agent_phone"),
	rightmoveUrl: text("rightmove_url").notNull(),
	listingStatus: text("listing_status").notNull().default("new"),
	firstSeenAt: timestamp("first_seen_at").notNull().defaultNow(),
});

export const searchProperties = pgTable(
	"search_properties",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		searchId: uuid("search_id")
			.notNull()
			.references(() => searches.id, { onDelete: "cascade" }),
		propertyId: uuid("property_id")
			.notNull()
			.references(() => properties.id),
		status: text("status").notNull().default("new"),
		statusUpdatedBy: uuid("status_updated_by").references(() => users.id),
		statusUpdatedAt: timestamp("status_updated_at"),
		shortlisted: boolean("shortlisted").notNull().default(false),
		shortlistedBy: uuid("shortlisted_by").references(() => users.id),
		addedAt: timestamp("added_at").notNull().defaultNow(),
	},
	(t) => [unique("search_property_unique").on(t.searchId, t.propertyId)],
);

export const propertyChanges = pgTable("property_changes", {
	id: uuid("id").primaryKey().defaultRandom(),
	propertyId: uuid("property_id")
		.notNull()
		.references(() => properties.id),
	field: text("field").notNull(),
	oldValue: text("old_value").notNull(),
	newValue: text("new_value").notNull(),
	changedAt: timestamp("changed_at").notNull().defaultNow(),
});
```

- [ ] **Step 8: Create packages/db/src/schema/commute.ts**

```typescript
import { decimal, integer, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { users } from "./auth";
import { properties } from "./properties";

export const userCommuteDestinations = pgTable("user_commute_destinations", {
	id: uuid("id").primaryKey().defaultRandom(),
	userId: uuid("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	label: text("label").notNull(),
	latitude: decimal("latitude", { precision: 10, scale: 6 }).notNull(),
	longitude: decimal("longitude", { precision: 10, scale: 6 }).notNull(),
	modes: text("modes").array().notNull(),
});

export const commuteTimes = pgTable(
	"commute_times",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		propertyId: uuid("property_id")
			.notNull()
			.references(() => properties.id),
		userId: uuid("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		destinationId: uuid("destination_id")
			.notNull()
			.references(() => userCommuteDestinations.id, { onDelete: "cascade" }),
		mode: text("mode").notNull(),
		durationMins: integer("duration_mins"),
		calculatedAt: timestamp("calculated_at").notNull().defaultNow(),
	},
	(t) => [
		unique("commute_time_unique").on(t.propertyId, t.userId, t.destinationId, t.mode),
	],
);
```

- [ ] **Step 9: Create packages/db/src/schema/comments.ts**

```typescript
import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { users } from "./auth";
import { searchProperties } from "./properties";

export const comments = pgTable("comments", {
	id: uuid("id").primaryKey().defaultRandom(),
	searchPropertyId: uuid("search_property_id")
		.notNull()
		.references(() => searchProperties.id, { onDelete: "cascade" }),
	userId: uuid("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	body: text("body").notNull(),
	createdAt: timestamp("created_at").notNull().defaultNow(),
});
```

- [ ] **Step 10: Create packages/db/src/schema/notifications.ts**

```typescript
import { jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { users } from "./auth";

export const pushSubscriptions = pgTable("push_subscriptions", {
	id: uuid("id").primaryKey().defaultRandom(),
	userId: uuid("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	endpoint: text("endpoint").notNull().unique(),
	keys: jsonb("keys").notNull(),
	createdAt: timestamp("created_at").notNull().defaultNow(),
});
```

- [ ] **Step 11: Create packages/db/src/schema/scraper-state.ts**

```typescript
import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const scraperState = pgTable("scraper_state", {
	key: text("key").primaryKey(),
	value: text("value").notNull(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
```

- [ ] **Step 12: Create packages/db/src/schema/relations.ts**

```typescript
import { relations } from "drizzle-orm";
import { users } from "./auth";
import { searches, searchMembers } from "./searches";
import { properties, searchProperties, propertyChanges } from "./properties";
import { userCommuteDestinations, commuteTimes } from "./commute";
import { comments } from "./comments";
import { pushSubscriptions } from "./notifications";

export const usersRelations = relations(users, ({ many }) => ({
	searchMemberships: many(searchMembers),
	commuteDestinations: many(userCommuteDestinations),
	commuteTimes: many(commuteTimes),
	comments: many(comments),
	pushSubscriptions: many(pushSubscriptions),
}));

export const searchesRelations = relations(searches, ({ one, many }) => ({
	createdByUser: one(users, {
		fields: [searches.createdBy],
		references: [users.id],
	}),
	members: many(searchMembers),
	searchProperties: many(searchProperties),
}));

export const searchMembersRelations = relations(searchMembers, ({ one }) => ({
	search: one(searches, {
		fields: [searchMembers.searchId],
		references: [searches.id],
	}),
	user: one(users, {
		fields: [searchMembers.userId],
		references: [users.id],
	}),
}));

export const propertiesRelations = relations(properties, ({ many }) => ({
	searchProperties: many(searchProperties),
	changes: many(propertyChanges),
	commuteTimes: many(commuteTimes),
}));

export const searchPropertiesRelations = relations(searchProperties, ({ one, many }) => ({
	search: one(searches, {
		fields: [searchProperties.searchId],
		references: [searches.id],
	}),
	property: one(properties, {
		fields: [searchProperties.propertyId],
		references: [properties.id],
	}),
	comments: many(comments),
}));

export const propertyChangesRelations = relations(propertyChanges, ({ one }) => ({
	property: one(properties, {
		fields: [propertyChanges.propertyId],
		references: [properties.id],
	}),
}));

export const userCommuteDestinationsRelations = relations(userCommuteDestinations, ({ one, many }) => ({
	user: one(users, {
		fields: [userCommuteDestinations.userId],
		references: [users.id],
	}),
	commuteTimes: many(commuteTimes),
}));

export const commuteTimesRelations = relations(commuteTimes, ({ one }) => ({
	property: one(properties, {
		fields: [commuteTimes.propertyId],
		references: [properties.id],
	}),
	user: one(users, {
		fields: [commuteTimes.userId],
		references: [users.id],
	}),
	destination: one(userCommuteDestinations, {
		fields: [commuteTimes.destinationId],
		references: [userCommuteDestinations.id],
	}),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
	searchProperty: one(searchProperties, {
		fields: [comments.searchPropertyId],
		references: [searchProperties.id],
	}),
	user: one(users, {
		fields: [comments.userId],
		references: [users.id],
	}),
}));

export const pushSubscriptionsRelations = relations(pushSubscriptions, ({ one }) => ({
	user: one(users, {
		fields: [pushSubscriptions.userId],
		references: [users.id],
	}),
}));
```

- [ ] **Step 13: Create packages/db/src/schema/index.ts**

```typescript
export * from "./auth";
export * from "./searches";
export * from "./properties";
export * from "./commute";
export * from "./comments";
export * from "./notifications";
export * from "./scraper-state";
export * from "./relations";
```

- [ ] **Step 14: Create packages/db/src/index.ts**

```typescript
export { createDb, type Database } from "./client";
export * from "./schema";
```

- [ ] **Step 15: Install dependencies and generate initial migration**

```bash
pnpm install
pnpm db:generate:named init
```

- [ ] **Step 16: Commit**

```bash
git add packages/db/
git commit -m "feat: add db package with full Drizzle schema"
```

---

### Task 3: Scaffold SvelteKit web app

**Files:**
- Create: `apps/web/` — full SvelteKit project

- [ ] **Step 1: Create SvelteKit project**

```bash
pnpm create svelte@latest apps/web -- --template skeleton --types typescript
```

- [ ] **Step 2: Install dependencies**

```bash
pnpm --filter @flatmate/web add @flatmate/db better-auth web-push
pnpm --filter @flatmate/web add -D tailwindcss @tailwindcss/vite @sveltejs/adapter-node
```

- [ ] **Step 3: Configure vite.config.ts with Tailwind**

```typescript
import tailwindcss from "@tailwindcss/vite";
import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
});
```

- [ ] **Step 4: Configure svelte.config.js with node adapter**

```javascript
import adapter from "@sveltejs/adapter-node";
import { vitePreprocess } from "@sveltejs/kit/vite";

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter(),
	},
};

export default config;
```

- [ ] **Step 5: Create apps/web/src/app.css**

```css
@import "tailwindcss";
```

- [ ] **Step 6: Initialise shadcn-svelte**

```bash
cd apps/web && pnpm dlx shadcn-svelte@latest init
```

Follow prompts: pick defaults, Tailwind CSS, default style. This sets up the component library.

- [ ] **Step 7: Add commonly used shadcn components**

```bash
cd apps/web && pnpm dlx shadcn-svelte@latest add button card input label select badge separator avatar dropdown-menu dialog
```

- [ ] **Step 8: Create apps/web/src/lib/server/db.ts**

```typescript
import { createDb } from "@flatmate/db";
import { env } from "$env/dynamic/private";

export const db = createDb(env.DATABASE_URL);
```

- [ ] **Step 9: Commit**

```bash
git add apps/web/
git commit -m "feat: scaffold SvelteKit web app with Tailwind and shadcn-svelte"
```

---

### Task 4: Scaffold scraper worker

**Files:**
- Create: `apps/scraper/package.json`, `apps/scraper/tsconfig.json`, `apps/scraper/src/index.ts`

- [ ] **Step 1: Create apps/scraper/package.json**

```json
{
  "name": "@flatmate/scraper",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "start": "tsx src/index.ts"
  },
  "dependencies": {
    "@flatmate/db": "workspace:*",
    "web-push": "^3.6.0"
  },
  "devDependencies": {
    "tsx": "^4.0.0",
    "typescript": "^5.7.0",
    "@types/web-push": "^3.6.0"
  }
}
```

- [ ] **Step 2: Create apps/scraper/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create apps/scraper/src/index.ts (placeholder)**

```typescript
import { createDb } from "@flatmate/db";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
	throw new Error("DATABASE_URL is required");
}

const db = createDb(DATABASE_URL);

async function main() {
	console.log("Scraper starting...");
	// Placeholder — replaced in Task 12
	console.log("Scraper done.");
}

main().catch(console.error);
```

- [ ] **Step 4: Install all dependencies from root**

```bash
pnpm install
```

- [ ] **Step 5: Commit**

```bash
git add apps/scraper/
git commit -m "feat: scaffold scraper worker package"
```

---

## Chunk 2: Auth + Layout Shell

### Task 5: Set up BetterAuth with Google OAuth

**Files:**
- Create: `apps/web/src/lib/auth-server.ts`, `apps/web/src/lib/auth-client.ts`
- Create: `apps/web/src/hooks.server.ts`, `apps/web/src/app.d.ts`
- Create: `apps/web/src/routes/api/auth/[...all]/+server.ts`

- [ ] **Step 1: Install BetterAuth**

```bash
pnpm --filter @flatmate/web add better-auth
```

- [ ] **Step 2: Create apps/web/src/lib/auth-server.ts**

Reference: `~/personal/checkpnt/apps/api/src/lib/auth.ts`

```typescript
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "$lib/server/db";
import { env } from "$env/dynamic/private";

export const auth = betterAuth({
	database: drizzleAdapter(db, {
		provider: "pg",
		usePlural: true,
	}),
	socialProviders: {
		google: {
			clientId: env.GOOGLE_CLIENT_ID,
			clientSecret: env.GOOGLE_CLIENT_SECRET,
		},
	},
	session: {
		expiresIn: 60 * 60 * 24 * 30,
		updateAge: 60 * 60 * 24,
	},
	advanced: {
		generateId: () => crypto.randomUUID(),
	},
});
```

- [ ] **Step 3: Create apps/web/src/lib/auth-client.ts**

```typescript
import { createAuthClient } from "better-auth/svelte";

export const authClient = createAuthClient();
```

- [ ] **Step 4: Create apps/web/src/routes/api/auth/[...all]/+server.ts**

```typescript
import { auth } from "$lib/auth-server";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ request }) => {
	return auth.handler(request);
};

export const POST: RequestHandler = async ({ request }) => {
	return auth.handler(request);
};
```

- [ ] **Step 5: Create apps/web/src/app.d.ts**

```typescript
declare global {
	namespace App {
		interface Locals {
			session: {
				user: {
					id: string;
					name: string;
					email: string;
					image: string | null;
				};
			} | null;
		}
	}
}

export {};
```

- [ ] **Step 6: Create apps/web/src/hooks.server.ts**

```typescript
import { auth } from "$lib/auth-server";
import type { Handle } from "@sveltejs/kit";

export const handle: Handle = async ({ event, resolve }) => {
	const session = await auth.api.getSession({
		headers: event.request.headers,
	});
	event.locals.session = session;
	return resolve(event);
};
```

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/lib/auth-server.ts apps/web/src/lib/auth-client.ts \
  apps/web/src/routes/api/auth apps/web/src/app.d.ts apps/web/src/hooks.server.ts
git commit -m "feat: set up BetterAuth with Google OAuth"
```

---

### Task 6: Create layout shell and login page

**Files:**
- Create: `apps/web/src/routes/+layout.svelte`, `apps/web/src/routes/+layout.server.ts`
- Create: `apps/web/src/routes/login/+page.svelte`
- Create: `apps/web/src/routes/+page.svelte`, `apps/web/src/routes/+page.server.ts`

- [ ] **Step 1: Create +layout.server.ts to pass session**

```typescript
import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = async ({ locals }) => {
	return {
		session: locals.session,
	};
};
```

- [ ] **Step 2: Create +layout.svelte**

```svelte
<script lang="ts">
	import "../app.css";
	import type { LayoutData } from "./$types";
	import * as Avatar from "$lib/components/ui/avatar";
	import { Button } from "$lib/components/ui/button";

	export let data: LayoutData;
</script>

<div class="min-h-screen bg-background text-foreground">
	<header class="border-b">
		<nav class="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
			<a href="/" class="text-xl font-bold">Flatmate</a>
			{#if data.session}
				<div class="flex items-center gap-3">
					<a href="/settings" class="text-sm text-muted-foreground hover:text-foreground">
						Settings
					</a>
					<Avatar.Root>
						<Avatar.Image src={data.session.user.image} alt={data.session.user.name} />
						<Avatar.Fallback>{data.session.user.name[0]}</Avatar.Fallback>
					</Avatar.Root>
				</div>
			{:else}
				<Button href="/login" variant="outline">Sign in</Button>
			{/if}
		</nav>
	</header>
	<main class="mx-auto max-w-5xl px-4 py-6">
		<slot />
	</main>
</div>
```

- [ ] **Step 3: Create login page**

`apps/web/src/routes/login/+page.svelte`:

```svelte
<script lang="ts">
	import { Button } from "$lib/components/ui/button";
	import { authClient } from "$lib/auth-client";

	function signInWithGoogle() {
		authClient.signIn.social({ provider: "google", callbackURL: "/" });
	}
</script>

<div class="flex min-h-[60vh] items-center justify-center">
	<div class="w-full max-w-sm space-y-6 text-center">
		<h1 class="text-3xl font-bold">Welcome to Flatmate</h1>
		<p class="text-muted-foreground">Sign in to start finding your next home</p>
		<Button on:click={signInWithGoogle} class="w-full" size="lg">
			Sign in with Google
		</Button>
	</div>
</div>
```

- [ ] **Step 4: Create dashboard page (placeholder)**

`apps/web/src/routes/+page.svelte` — shows "Your searches" heading. If not logged in, redirect to `/login` via `+page.server.ts`.

`apps/web/src/routes/+page.server.ts`:
```typescript
import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.session) {
		redirect(302, "/login");
	}
	return {};
};
```

- [ ] **Step 5: Verify locally**

```bash
pnpm dev:web
```

Open `http://localhost:5173`, verify redirect to `/login`, verify Google OAuth flow works (requires Google Cloud Console credentials configured in `.env`).

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/routes/
git commit -m "feat: add layout shell, login page, and protected dashboard"
```

---

## Chunk 3: Search CRUD + Groups

### Task 7: Search creation API and page

**Files:**
- Create: `apps/web/src/routes/api/searches/+server.ts`
- Create: `apps/web/src/routes/api/location-suggest/+server.ts`
- Create: `apps/web/src/routes/searches/new/+page.svelte`, `+page.server.ts`

- [ ] **Step 1: Create location suggest API proxy**

`apps/web/src/routes/api/location-suggest/+server.ts` — proxies to Rightmove's typeahead endpoint.

```typescript
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ url }) => {
	const q = url.searchParams.get("q");
	if (!q || q.length < 2) return json([]);

	const res = await fetch(
		`https://www.rightmove.co.uk/typeAhead/ukno498/${encodeURIComponent(q)}`,
		{
			headers: {
				"User-Agent":
					"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
			},
		},
	);
	if (!res.ok) return json([]);

	const data = await res.json();
	const suggestions = (data.typeAheadLocations ?? []).map(
		(loc: { displayName: string; locationIdentifier: string }) => ({
			displayName: loc.displayName,
			locationIdentifier: loc.locationIdentifier,
		}),
	);
	return json(suggestions);
};
```

Note: The typeahead URL path (`/typeAhead/ukno498/`) should be verified by inspecting network traffic on rightmove.co.uk's search page. The path segment may change; adjust if needed.

- [ ] **Step 2: Create searches API — POST (create)**

`apps/web/src/routes/api/searches/+server.ts` — handles POST to create a search. Validates input, generates `invite_code` via `crypto.randomUUID()`, inserts into `searches` and `search_members` (role: 'owner'). Requires auth.

```typescript
import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { db } from "$lib/server/db";
import { searches, searchMembers } from "@flatmate/db";

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.session) throw error(401);
	const body = await request.json();

	const inviteCode = crypto.randomUUID().slice(0, 8);

	const [search] = await db
		.insert(searches)
		.values({
			name: body.name,
			createdBy: locals.session.user.id,
			locationIdentifier: body.locationIdentifier,
			locationName: body.locationName,
			radius: body.radius ?? "0",
			minPrice: body.minPrice ?? null,
			maxPrice: body.maxPrice ?? null,
			minBedrooms: body.minBedrooms ?? null,
			maxBedrooms: body.maxBedrooms ?? null,
			propertyType: body.propertyType ?? null,
			includeLetAgreed: body.includeLetAgreed ?? false,
			inviteCode,
		})
		.returning();

	await db.insert(searchMembers).values({
		searchId: search.id,
		userId: locals.session.user.id,
		role: "owner",
		pendingCommuteBackfill: true,
	});

	return json({ id: search.id }, { status: 201 });
};
```

- [ ] **Step 3: Create search creation page**

`apps/web/src/routes/searches/new/+page.svelte` — form with:
- Location input with autocomplete (debounced fetch to `/api/location-suggest`)
- Radius select (This area only, ¼ mile, ½ mile, 1, 3, 5, 10, 15, 20, 30, 40 miles)
- Min/max price selects
- Min/max bedrooms selects
- Property type select (Any, Houses, Flats/Apartments, Bungalows, etc.)
- Include let agreed checkbox
- Search name text input
- Submit button

On submit, POST to `/api/searches`, redirect to `/searches/[id]` on success.

- [ ] **Step 4: Update dashboard to list user's searches**

`apps/web/src/routes/+page.server.ts` — load the user's searches (via `search_members` → `searches`). Display as cards with name, location, property count.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/routes/
git commit -m "feat: add search creation with location autocomplete"
```

---

### Task 8: Invite flow and group management

**Files:**
- Create: `apps/web/src/routes/invite/[code]/+page.svelte`, `+page.server.ts`
- Create: `apps/web/src/routes/api/searches/[id]/members/+server.ts`

- [ ] **Step 1: Create invite page**

`apps/web/src/routes/invite/[code]/+page.server.ts`:

```typescript
import { redirect, error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { db } from "$lib/server/db";
import { searches, searchMembers } from "@flatmate/db";
import { eq, and } from "drizzle-orm";

export const load: PageServerLoad = async ({ params, locals, url }) => {
	if (!locals.session) {
		redirect(302, `/login?returnTo=${encodeURIComponent(url.pathname)}`);
	}

	const search = await db.query.searches.findFirst({
		where: eq(searches.inviteCode, params.code),
	});
	if (!search) throw error(404, "Invalid invite code");

	const existing = await db.query.searchMembers.findFirst({
		where: and(
			eq(searchMembers.searchId, search.id),
			eq(searchMembers.userId, locals.session.user.id),
		),
	});
	if (existing) redirect(302, `/searches/${search.id}`);

	return { search: { id: search.id, name: search.name, locationName: search.locationName } };
};
```

Update login page to handle `returnTo` — after successful auth, `callbackURL` should use the `returnTo` query param if present:

```svelte
<!-- In login/+page.svelte, update signIn call -->
<script lang="ts">
	import { page } from "$app/stores";
	// ...
	const returnTo = $page.url.searchParams.get("returnTo") ?? "/";
	function signInWithGoogle() {
		authClient.signIn.social({ provider: "google", callbackURL: returnTo });
	}
</script>
```

`+page.svelte` — displays search info and join button. On click, POST to `/api/searches/[id]/members` to join, then redirect to `/searches/[id]`.

- [ ] **Step 2: Create members API**

`apps/web/src/routes/api/searches/[id]/members/+server.ts`:
- **POST** — join a search (requires invite code in body). Creates `search_members` row with `role: 'member'` and `pending_commute_backfill: true`.
- **DELETE** — leave a search (or owner removes a member). Owner cannot leave without transferring ownership first.
- **PATCH** — transfer ownership (owner only, body: `{ newOwnerId }`).

- [ ] **Step 3: Add invite link display to search page**

On the search feed page (`/searches/[id]`), show a "Share" button that copies the invite link (`/invite/[code]`) to clipboard.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/routes/
git commit -m "feat: add invite flow and group management API"
```

---

## Chunk 4: Scraper — Rightmove Extraction

### Task 9: Rightmove search URL construction and page fetching

**Files:**
- Create: `apps/scraper/src/rightmove/search.ts`
- Create: `apps/scraper/src/rate-limit.ts`

- [ ] **Step 1: Create rate-limit.ts**

```typescript
export function delay(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

export function rateLimiter(minDelayMs: number) {
	let lastCall = 0;
	return async () => {
		const now = Date.now();
		const elapsed = now - lastCall;
		if (elapsed < minDelayMs) {
			await delay(minDelayMs - elapsed);
		}
		lastCall = Date.now();
	};
}
```

- [ ] **Step 2: Create rightmove/search.ts**

```typescript
import { rateLimiter } from "../rate-limit";

const rightmoveDelay = rateLimiter(1500);

interface SearchParams {
	locationIdentifier: string;
	radius: string;
	minPrice?: number | null;
	maxPrice?: number | null;
	minBedrooms?: number | null;
	maxBedrooms?: number | null;
	propertyType?: string | null;
	includeLetAgreed: boolean;
}

export function buildSearchUrl(params: SearchParams, index = 0): string {
	const url = new URL("https://www.rightmove.co.uk/property-to-rent/find.html");
	url.searchParams.set("locationIdentifier", params.locationIdentifier);
	url.searchParams.set("radius", params.radius);
	if (params.minPrice != null) url.searchParams.set("minPrice", String(params.minPrice));
	if (params.maxPrice != null) url.searchParams.set("maxPrice", String(params.maxPrice));
	if (params.minBedrooms != null) url.searchParams.set("minBedrooms", String(params.minBedrooms));
	if (params.maxBedrooms != null) url.searchParams.set("maxBedrooms", String(params.maxBedrooms));
	if (params.propertyType) url.searchParams.set("propertyTypes", params.propertyType);
	if (params.includeLetAgreed) url.searchParams.set("letType", "with");
	if (index > 0) url.searchParams.set("index", String(index));
	return url.toString();
}

export async function fetchSearchPage(url: string): Promise<string> {
	await rightmoveDelay();
	const res = await fetch(url, {
		headers: {
			"User-Agent":
				"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
		},
	});
	if (!res.ok) {
		throw new Error(`Rightmove returned ${res.status} for ${url}`);
	}
	return res.text();
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/scraper/src/
git commit -m "feat: add Rightmove search URL builder and page fetcher"
```

---

### Task 10: __NEXT_DATA__ extraction

**Files:**
- Create: `apps/scraper/src/rightmove/extract.ts`

- [ ] **Step 1: Create extract.ts**

Parse HTML for `__NEXT_DATA__` script tag, extract and transform property data into our DB shape.

```typescript
export interface RawRightmoveProperty {
	id: number;
	bedrooms: number;
	bathrooms: number;
	summary: string;
	displayAddress: string;
	location: { latitude: number; longitude: number };
	images: Array<{ srcUrl: string; caption: string | null }>;
	propertySubType: string;
	letAvailableDate: string | null;
	listingUpdate: { listingUpdateReason: string; listingUpdateDate: string };
	price: { amount: number; frequency: string };
	customer: {
		brandTradingName: string;
		branchName: string;
		contactTelephone: string;
	};
	propertyUrl: string;
	keyFeatures: Array<{ description: string }>;
	numberOfFloorplans: number;
}

export interface ExtractedProperty {
	rightmoveId: number;
	address: string;
	summary: string;
	bedrooms: number;
	bathrooms: number;
	priceMonthly: number;
	propertyType: string;
	latitude: string;
	longitude: string;
	availableDate: string | null;
	images: Array<{ url: string; caption: string | null }>;
	keyFeatures: string[];
	agentName: string;
	agentPhone: string | null;
	rightmoveUrl: string;
	listingStatus: string;
	numberOfFloorplans: number;
}

export function extractProperties(html: string): ExtractedProperty[] {
	const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
	if (!match) {
		throw new Error("Could not find __NEXT_DATA__ in page HTML");
	}

	const data = JSON.parse(match[1]);
	const rawProperties: RawRightmoveProperty[] =
		data?.props?.pageProps?.searchResults?.properties ?? [];

	return rawProperties.map((p) => ({
		rightmoveId: p.id,
		address: p.displayAddress,
		summary: p.summary,
		bedrooms: p.bedrooms,
		bathrooms: p.bathrooms,
		priceMonthly: p.price.amount,
		propertyType: p.propertySubType,
		latitude: String(p.location.latitude),
		longitude: String(p.location.longitude),
		availableDate: p.letAvailableDate ? p.letAvailableDate.split("T")[0] : null,
		images: p.images.map((img) => ({ url: img.srcUrl, caption: img.caption })),
		keyFeatures: p.keyFeatures.map((f) => f.description),
		agentName: `${p.customer.brandTradingName}, ${p.customer.branchName}`,
		agentPhone: p.customer.contactTelephone || null,
		rightmoveUrl: p.propertyUrl,
		listingStatus:
			p.listingUpdate.listingUpdateReason === "new"
				? "new"
				: p.listingUpdate.listingUpdateReason === "reduced"
					? "reduced"
					: "let_agreed",
		numberOfFloorplans: p.numberOfFloorplans,
	}));
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/scraper/src/rightmove/extract.ts
git commit -m "feat: add __NEXT_DATA__ property extraction"
```

---

### Task 11: Floorplan extraction from detail pages

**Files:**
- Create: `apps/scraper/src/rightmove/floorplans.ts`

- [ ] **Step 1: Create floorplans.ts**

Fetch individual listing pages for properties with floorplans. Extract floorplan image URLs from the page HTML/JSON data.

```typescript
import { fetchSearchPage } from "./search";

export async function fetchFloorplanUrls(rightmoveUrl: string): Promise<string[]> {
	const fullUrl = `https://www.rightmove.co.uk${rightmoveUrl}`;
	const html = await fetchSearchPage(fullUrl);

	// Floorplans are typically in the __NEXT_DATA__ or in img tags with floorplan class
	const floorplanUrls: string[] = [];

	// Try extracting from JSON data in the page
	const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
	if (match) {
		const data = JSON.parse(match[1]);
		const floorplans = data?.props?.pageProps?.propertyData?.floorplans ?? [];
		for (const fp of floorplans) {
			if (fp.url) {
				floorplanUrls.push(fp.url);
			}
		}
	}

	// Fallback: look for floorplan images in HTML
	if (floorplanUrls.length === 0) {
		const imgMatches = html.matchAll(/src="(https:\/\/media\.rightmove\.co\.uk[^"]*floorplan[^"]*)"/gi);
		for (const m of imgMatches) {
			floorplanUrls.push(m[1]);
		}
	}

	return floorplanUrls;
}
```

Note: The exact structure of floorplan data on detail pages may vary. This implementation tries JSON first, then falls back to regex. May need adjustment based on actual page structure.

- [ ] **Step 2: Commit**

```bash
git add apps/scraper/src/rightmove/floorplans.ts
git commit -m "feat: add floorplan URL extraction from detail pages"
```

---

### Task 12: Main scraper orchestration

**Files:**
- Modify: `apps/scraper/src/index.ts`

- [ ] **Step 1: Implement main scraper loop**

Replace the placeholder in `apps/scraper/src/index.ts` with the full orchestration:

```typescript
import { createDb } from "@flatmate/db";
import {
	searches,
	properties,
	searchProperties,
	propertyChanges,
	searchMembers,
} from "@flatmate/db";
import { eq, and } from "drizzle-orm";
import { buildSearchUrl, fetchSearchPage } from "./rightmove/search";
import { extractProperties, type ExtractedProperty } from "./rightmove/extract";
import { fetchFloorplanUrls } from "./rightmove/floorplans";
// notify.ts is created in Task 21 — create a stub at this step:
// export async function notifyNewProperties(...args: any[]) { console.log("notify stub", args); }
import { notifyNewProperties } from "./notify";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error("DATABASE_URL is required");

const NOTIFY_ENDPOINT = process.env.NOTIFY_ENDPOINT!;
const SCRAPER_SECRET = process.env.SCRAPER_SECRET!;

const db = createDb(DATABASE_URL);

async function scrapeSearch(search: typeof searches.$inferSelect) {
	console.log(`Scraping: ${search.name} (${search.locationIdentifier})`);
	const allExtracted: ExtractedProperty[] = [];

	// Paginate — Rightmove shows 24 per page, up to ~1000 results
	for (let index = 0; index < 1008; index += 24) {
		const url = buildSearchUrl(
			{
				locationIdentifier: search.locationIdentifier,
				radius: search.radius,
				minPrice: search.minPrice,
				maxPrice: search.maxPrice,
				minBedrooms: search.minBedrooms,
				maxBedrooms: search.maxBedrooms,
				propertyType: search.propertyType,
				includeLetAgreed: search.includeLetAgreed,
			},
			index,
		);

		const html = await fetchSearchPage(url);
		const extracted = extractProperties(html);
		if (extracted.length === 0) break;
		allExtracted.push(...extracted);
		if (extracted.length < 24) break; // Last page
	}

	console.log(`  Found ${allExtracted.length} properties`);

	const newPropertyIds: string[] = [];
	const changedProps: Array<{
		id: string;
		changes: Array<{ field: string; oldValue: string; newValue: string }>;
	}> = [];

	for (const ext of allExtracted) {
		// Upsert property
		const [existing] = await db
			.select()
			.from(properties)
			.where(eq(properties.rightmoveId, ext.rightmoveId))
			.limit(1);

		let propertyId: string;
		if (!existing) {
			// Fetch floorplans for new properties that have them
			let floorplanUrls: string[] = [];
			if (ext.numberOfFloorplans > 0) {
				floorplanUrls = await fetchFloorplanUrls(ext.rightmoveUrl);
			}

			const [inserted] = await db
				.insert(properties)
				.values({
					rightmoveId: ext.rightmoveId,
					address: ext.address,
					summary: ext.summary,
					bedrooms: ext.bedrooms,
					bathrooms: ext.bathrooms,
					priceMonthly: ext.priceMonthly,
					propertyType: ext.propertyType,
					latitude: ext.latitude,
					longitude: ext.longitude,
					availableDate: ext.availableDate,
					images: ext.images,
					floorplanUrls,
					keyFeatures: ext.keyFeatures,
					agentName: ext.agentName,
					agentPhone: ext.agentPhone,
					rightmoveUrl: ext.rightmoveUrl,
					listingStatus: ext.listingStatus,
				})
				.returning();
			propertyId = inserted.id;
			newPropertyIds.push(propertyId);
		} else {
			propertyId = existing.id;
			// Detect changes (price, status, available date)
			const changes: Array<{ field: string; oldValue: string; newValue: string }> = [];
			if (existing.priceMonthly !== ext.priceMonthly) {
				changes.push({
					field: "price_monthly",
					oldValue: String(existing.priceMonthly),
					newValue: String(ext.priceMonthly),
				});
			}
			if (existing.listingStatus !== ext.listingStatus) {
				changes.push({
					field: "listing_status",
					oldValue: existing.listingStatus,
					newValue: ext.listingStatus,
				});
			}
			if (changes.length > 0) {
				await db.insert(propertyChanges).values(
					changes.map((c) => ({ propertyId, field: c.field, oldValue: c.oldValue, newValue: c.newValue })),
				);
				await db.update(properties).set({
					priceMonthly: ext.priceMonthly,
					listingStatus: ext.listingStatus,
				}).where(eq(properties.id, propertyId));
				changedProps.push({ id: propertyId, changes });
			}
		}

		// Link to search (ignore conflict if already linked)
		await db
			.insert(searchProperties)
			.values({ searchId: search.id, propertyId })
			.onConflictDoNothing({ target: [searchProperties.searchId, searchProperties.propertyId] });
	}

	// Update last_scraped_at
	await db.update(searches).set({ lastScrapedAt: new Date() }).where(eq(searches.id, search.id));

	// Notify
	await notifyNewProperties(NOTIFY_ENDPOINT, SCRAPER_SECRET, search.id, newPropertyIds, changedProps);

	return { newCount: newPropertyIds.length, changedCount: changedProps.length };
}

async function main() {
	console.log("Scraper starting...");
	const activeSearches = await db.query.searches.findMany({
		where: eq(searches.isActive, true),
	});
	console.log(`Found ${activeSearches.length} active searches`);

	for (const search of activeSearches) {
		try {
			const result = await scrapeSearch(search);
			console.log(`  Done: ${result.newCount} new, ${result.changedCount} changed`);
		} catch (err) {
			console.error(`  Error scraping ${search.name}:`, err);
		}
	}

	// Commute calculation wired in Task 15
	console.log("Scraper done.");
}

main().catch(console.error);
```

- [ ] **Step 2: Test locally with a real search**

Create a test search in the DB manually, run the scraper, verify properties appear in the database.

```bash
pnpm dev:scraper
```

- [ ] **Step 3: Commit**

```bash
git add apps/scraper/src/
git commit -m "feat: implement main scraper orchestration loop"
```

---

## Chunk 5: Scraper — Commute Calculation

### Task 13: TfL Journey Planner integration

**Files:**
- Create: `apps/scraper/src/commute/tfl.ts`

- [ ] **Step 1: Create tfl.ts**

Port from the existing Chrome extension (`~/personal/rightmove-available-date/background.js`). Adapt `fetchTflTransit` for server-side Node.js.

```typescript
import { rateLimiter } from "../rate-limit";

const tflDelay = rateLimiter(35); // ~30 req/s

export async function fetchTflTransitTime(
	fromLat: number,
	fromLng: number,
	toLat: number,
	toLng: number,
	apiKey: string,
): Promise<number | null> {
	await tflDelay();
	const from = `${fromLat},${fromLng}`;
	const to = `${toLat},${toLng}`;
	const params = new URLSearchParams({ mode: "tube,bus,overground,dlr" });
	if (apiKey) params.set("app_key", apiKey);

	const url = `https://api.tfl.gov.uk/Journey/JourneyResults/${from}/to/${to}?${params}`;
	const res = await fetch(url);
	if (!res.ok) {
		console.warn(`TfL API returned ${res.status} for ${url}`);
		return null;
	}

	const data = await res.json();
	if (data.journeys?.length > 0) {
		return Math.min(...data.journeys.map((j: { duration: number }) => j.duration));
	}
	return null;
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/scraper/src/commute/tfl.ts
git commit -m "feat: add TfL Journey Planner integration"
```

---

### Task 14: OpenRouteService matrix integration

**Files:**
- Create: `apps/scraper/src/commute/ors.ts`

- [ ] **Step 1: Create ors.ts**

Port from the Chrome extension's `fetchOrsMatrix`. Implements batch matrix requests and ORS daily usage tracking via `scraper_state`.

```typescript
import type { Database } from "@flatmate/db";
import { scraperState } from "@flatmate/db";
import { eq, sql } from "drizzle-orm";
import { rateLimiter } from "../rate-limit";

const orsDelay = rateLimiter(1500); // ~40 req/min

const ORS_PROFILES: Record<string, string> = {
	walking: "foot-walking",
	cycling: "cycling-regular",
};

export function getOrsProfile(mode: string): string | null {
	return ORS_PROFILES[mode] ?? null;
}

// Note: ORS expects coordinates as [longitude, latitude] — callers must pass [lng, lat] pairs
export async function fetchOrsMatrix(
	origins: [number, number][],
	destinations: [number, number][],
	profile: string,
	apiKey: string,
): Promise<number[][] | null> {
	await orsDelay();
	const locations = [...origins, ...destinations];
	const sources = origins.map((_, i) => i);
	const dests = destinations.map((_, i) => origins.length + i);

	const url = `https://api.openrouteservice.org/v2/matrix/${profile}`;
	const res = await fetch(url, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: apiKey,
		},
		body: JSON.stringify({
			locations,
			sources,
			destinations: dests,
			metrics: ["duration"],
		}),
	});

	if (!res.ok) {
		console.warn(`ORS matrix returned ${res.status}: ${await res.text()}`);
		return null;
	}

	const data = await res.json();
	return data.durations ?? null;
}

export async function checkOrsQuota(db: Database): Promise<boolean> {
	const today = new Date().toISOString().split("T")[0];
	const row = await db.query.scraperState.findFirst({
		where: eq(scraperState.key, "ors_daily_count"),
	});

	if (!row) return true;

	const dateRow = await db.query.scraperState.findFirst({
		where: eq(scraperState.key, "ors_count_date"),
	});

	if (dateRow?.value !== today) return true;
	return Number.parseInt(row.value, 10) < 2400; // 100 buffer under 2500 limit
}

export async function incrementOrsCount(db: Database): Promise<void> {
	const today = new Date().toISOString().split("T")[0];
	await db
		.insert(scraperState)
		.values({ key: "ors_count_date", value: today, updatedAt: new Date() })
		.onConflictDoUpdate({
			target: scraperState.key,
			set: { value: today, updatedAt: new Date() },
		});
	await db
		.insert(scraperState)
		.values({ key: "ors_daily_count", value: "1", updatedAt: new Date() })
		.onConflictDoUpdate({
			target: scraperState.key,
			set: {
				value: sql`(COALESCE(${scraperState.value}::int, 0) + 1)::text`,
				updatedAt: new Date(),
			},
		});
}
```

Note: The `incrementOrsCount` uses SQL for atomic increment. Import `sql` from `drizzle-orm`.

- [ ] **Step 2: Commit**

```bash
git add apps/scraper/src/commute/ors.ts
git commit -m "feat: add OpenRouteService matrix integration with quota tracking"
```

---

### Task 15: Commute calculation orchestrator and backfill

**Files:**
- Create: `apps/scraper/src/commute/calculate.ts`

- [ ] **Step 1: Create calculate.ts**

Orchestrates commute calculation for a batch of properties and a set of users. For each user's commute destinations, calculates transit via TfL and walking/cycling via ORS. Also handles backfill for members with `pending_commute_backfill = true`.

Key logic:
1. For new properties: get all members of the search, get their destinations
2. For each destination+mode: check if commute_time already exists (skip if so)
3. TfL for transit (individual calls), ORS for walking/cycling (batch matrix)
4. Insert results into `commute_times`
5. For backfill: same flow but for ALL properties in the search, then clear the flag

- [ ] **Step 2: Wire into main scraper loop**

Add commute calculation after property insertion in `apps/scraper/src/index.ts`.

- [ ] **Step 3: Commit**

```bash
git add apps/scraper/src/commute/ apps/scraper/src/index.ts
git commit -m "feat: add commute calculation orchestrator with backfill"
```

---

## Chunk 6: Frontend — Property Feed + Detail

### Task 16: Property feed page

**Files:**
- Create: `apps/web/src/routes/searches/[id]/+page.server.ts`
- Create: `apps/web/src/routes/searches/[id]/+page.svelte`
- Create: `apps/web/src/lib/components/PropertyCard.svelte`

- [ ] **Step 1: Create +page.server.ts**

Load search, verify membership, load properties via `search_properties` → `properties` join. Support query params for sort (`?sort=newest|price_asc|price_desc`) and filter (`?status=new&minPrice=1000`). Return properties with commute times for the current user.

- [ ] **Step 2: Create PropertyCard.svelte**

Card component showing: main image, price, bedrooms, bathrooms, address, available date, listing status badge, commute time chips, shortlist button, status badge. Use shadcn Card component.

- [ ] **Step 3: Create CommuteChips.svelte**

Display commute times as coloured chips (green <20min, orange 20-40min, red >40min) — same colour scheme as the Chrome extension.

- [ ] **Step 4: Create StatusBadge.svelte**

Badge component showing the property's group status (New, Interested, Viewing Booked, etc.) with appropriate colours.

- [ ] **Step 5: Create +page.svelte**

Main feed page with:
- Search name and member count in header
- Share/invite button
- Sort dropdown (newest, price low, price high)
- Filter bar (status, price range, bedrooms)
- List/map toggle
- Grid of PropertyCard components
- Pagination or infinite scroll

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/routes/searches/ apps/web/src/lib/components/
git commit -m "feat: add property feed page with sort, filter, and property cards"
```

---

### Task 17: Map view with Leaflet

**Files:**
- Create: `apps/web/src/lib/components/PropertyMap.svelte`
- Modify: `apps/web/src/routes/searches/[id]/+page.svelte`

- [ ] **Step 1: Install Leaflet**

```bash
pnpm --filter @flatmate/web add leaflet
pnpm --filter @flatmate/web add -D @types/leaflet
```

- [ ] **Step 2: Create PropertyMap.svelte**

Leaflet map component showing property pins. Each pin shows price on hover, links to property detail on click. Uses OpenStreetMap tiles. Cluster markers if many properties. Note: Leaflet must be loaded client-side only (use `onMount` or `{#await}` pattern).

- [ ] **Step 3: Wire into feed page**

Add list/map toggle to the search feed page. When map view is active, show PropertyMap instead of the card grid.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/lib/components/PropertyMap.svelte apps/web/src/routes/searches/
git commit -m "feat: add Leaflet map view for property feed"
```

---

### Task 18: Property detail page

**Files:**
- Create: `apps/web/src/routes/searches/[id]/properties/[propertyId]/+page.server.ts`
- Create: `apps/web/src/routes/searches/[id]/properties/[propertyId]/+page.svelte`
- Create: `apps/web/src/lib/components/ImageGallery.svelte`

- [ ] **Step 1: Create +page.server.ts**

Load property with all related data: images, floorplan URLs, commute times for all search members, comments, status history. Verify user is a member of the search.

- [ ] **Step 2: Create ImageGallery.svelte**

Image gallery/carousel component. Shows property photos and floorplan images. Use a simple grid or swipeable carousel.

- [ ] **Step 3: Create +page.svelte**

Property detail page with:
- Image gallery (photos + floorplans)
- Price, bedrooms, bathrooms, property type, available date
- Address with link to Rightmove
- Key features list
- Agent info (name, phone)
- Commute times for each group member (name → destination → mode → duration)
- Status workflow selector (dropdown to change status)
- Shortlist toggle button
- Comments thread
- "View on Rightmove" external link

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/routes/searches/ apps/web/src/lib/components/
git commit -m "feat: add property detail page with gallery, commutes, and status"
```

---

### Task 19: Property interaction APIs

**Files:**
- Create: `apps/web/src/routes/api/searches/[id]/properties/[propertyId]/status/+server.ts`
- Create: `apps/web/src/routes/api/searches/[id]/properties/[propertyId]/shortlist/+server.ts`
- Create: `apps/web/src/routes/api/searches/[id]/properties/[propertyId]/comments/+server.ts`

- [ ] **Step 1: Create status API**

PATCH handler — updates `search_properties.status`, `status_updated_by`, `status_updated_at`. Validates user is a member of the search. Valid statuses: `new`, `interested`, `viewing_booked`, `viewed`, `applied`, `rejected`.

- [ ] **Step 2: Create shortlist API**

POST handler — toggles `search_properties.shortlisted`. Sets `shortlisted_by` to current user when enabling.

- [ ] **Step 3: Create comments API**

GET — list comments for a search_property, ordered by `created_at`.
POST — create a new comment. Validates user is a member of the search.

- [ ] **Step 4: Create CommentThread.svelte**

Component showing list of comments (avatar, name, body, timestamp) and a text input to add a new comment.

- [ ] **Step 5: Wire into property detail page**

Connect status dropdown, shortlist button, and comment thread to the APIs.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/routes/api/ apps/web/src/lib/components/CommentThread.svelte
git commit -m "feat: add status, shortlist, and comments APIs with UI"
```

---

### Task 20: Shortlisted view

**Files:**
- Create: `apps/web/src/routes/searches/[id]/shortlisted/+page.server.ts`
- Create: `apps/web/src/routes/searches/[id]/shortlisted/+page.svelte`

- [ ] **Step 1: Create shortlisted page**

Same as the main feed page but filtered to `search_properties.shortlisted = true`. Reuse PropertyCard component.

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/routes/searches/
git commit -m "feat: add shortlisted properties view"
```

---

## Chunk 7: Push Notifications + PWA + Settings

### Task 21: Push notification infrastructure

**Files:**
- Create: `apps/web/src/routes/api/notify/+server.ts`
- Create: `apps/web/src/routes/api/push/subscribe/+server.ts`
- Create: `apps/web/src/routes/api/push/unsubscribe/+server.ts`
- Create: `apps/web/src/service-worker.ts`
- Create: `apps/scraper/src/notify.ts`

- [ ] **Step 1: Create /api/notify endpoint**

`apps/web/src/routes/api/notify/+server.ts`:

```typescript
import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { db } from "$lib/server/db";
import { searchMembers, pushSubscriptions, properties } from "@flatmate/db";
import { eq, inArray } from "drizzle-orm";
import { env } from "$env/dynamic/private";
import webPush from "web-push";

webPush.setVapidDetails(
	"mailto:noreply@flatmate.app",
	env.WEB_PUSH_PUBLIC_KEY,
	env.WEB_PUSH_PRIVATE_KEY,
);

export const POST: RequestHandler = async ({ request }) => {
	const auth = request.headers.get("authorization");
	if (auth !== `Bearer ${env.SCRAPER_SECRET}`) throw error(401);

	const { searchId, newPropertyIds, changedProperties } = await request.json();

	// Get all members of the search
	const members = await db.query.searchMembers.findMany({
		where: eq(searchMembers.searchId, searchId),
	});
	const userIds = members.map((m) => m.userId);
	if (userIds.length === 0) return json({ sent: 0 });

	// Get push subscriptions for those users
	const subs = await db.query.pushSubscriptions.findMany({
		where: inArray(pushSubscriptions.userId, userIds),
	});
	if (subs.length === 0) return json({ sent: 0 });

	// Build notification payload
	let body = "";
	if (newPropertyIds.length > 0) {
		body += `${newPropertyIds.length} new propert${newPropertyIds.length === 1 ? "y" : "ies"}`;
	}
	if (changedProperties.length > 0) {
		if (body) body += ", ";
		body += `${changedProperties.length} price change${changedProperties.length === 1 ? "" : "s"}`;
	}
	const payload = JSON.stringify({
		title: "Flatmate",
		body,
		url: `/searches/${searchId}`,
	});

	// Send to all subscriptions, delete gone ones
	let sent = 0;
	for (const sub of subs) {
		try {
			await webPush.sendNotification(
				{ endpoint: sub.endpoint, keys: sub.keys as webPush.PushSubscription["keys"] },
				payload,
			);
			sent++;
		} catch (err: any) {
			if (err.statusCode === 410) {
				await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, sub.id));
			}
		}
	}

	return json({ sent });
};
```

- [ ] **Step 2: Create push subscribe/unsubscribe APIs**

`/api/push/subscribe` — POST, saves Web Push subscription to `push_subscriptions`.
`/api/push/unsubscribe` — POST, deletes subscription by endpoint.

- [ ] **Step 3: Create service worker**

`apps/web/src/service-worker.ts` — handles push events, shows notifications with title/body/icon, handles notification click (navigate to search feed or property detail).

- [ ] **Step 4: Create scraper notify.ts**

```typescript
export async function notifyNewProperties(
	notifyEndpoint: string,
	scraperSecret: string,
	searchId: string,
	newPropertyIds: string[],
	changedProperties: Array<{ id: string; changes: Array<{ field: string; oldValue: string; newValue: string }> }>,
): Promise<void> {
	if (newPropertyIds.length === 0 && changedProperties.length === 0) return;

	const res = await fetch(notifyEndpoint, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${scraperSecret}`,
		},
		body: JSON.stringify({ searchId, newPropertyIds, changedProperties }),
	});

	if (!res.ok) {
		console.warn(`Notify endpoint returned ${res.status}: ${await res.text()}`);
	}
}
```

- [ ] **Step 5: Wire notify into scraper main loop**

After property insertion and commute calculation, call `notifyNewProperties`.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/routes/api/notify/ apps/web/src/routes/api/push/ \
  apps/web/src/service-worker.ts apps/scraper/src/notify.ts apps/scraper/src/index.ts
git commit -m "feat: add push notification infrastructure"
```

---

### Task 22: PWA manifest and client-side push subscription

**Files:**
- Create: `apps/web/static/manifest.json`
- Modify: `apps/web/src/app.html`

- [ ] **Step 1: Create PWA manifest**

```json
{
  "name": "Flatmate",
  "short_name": "Flatmate",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0a0a0a",
  "theme_color": "#0a0a0a",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

- [ ] **Step 2: Add manifest link to app.html**

```html
<link rel="manifest" href="/manifest.json" />
<meta name="theme-color" content="#0a0a0a" />
```

- [ ] **Step 3: Add push subscription logic to layout**

In `+layout.svelte`, after user is logged in, register the service worker and subscribe:

```svelte
<script lang="ts">
	import { onMount } from "svelte";
	import { browser } from "$app/environment";
	import type { LayoutData } from "./$types";
	export let data: LayoutData;

	onMount(async () => {
		if (!browser || !data.session || !("serviceWorker" in navigator)) return;

		const reg = await navigator.serviceWorker.register("/service-worker.js");
		const permission = await Notification.requestPermission();
		if (permission !== "granted") return;

		const sub = await reg.pushManager.subscribe({
			userVisibleOnly: true,
			applicationServerKey: data.vapidPublicKey,
		});

		await fetch("/api/push/subscribe", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(sub.toJSON()),
		});
	});
</script>
```

Pass `vapidPublicKey` from `+layout.server.ts`:

```typescript
// In +layout.server.ts, add:
import { env } from "$env/dynamic/private";

export const load: LayoutServerLoad = async ({ locals }) => {
	return {
		session: locals.session,
		vapidPublicKey: env.WEB_PUSH_PUBLIC_KEY,
	};
};
```

- [ ] **Step 4: Create placeholder icons**

Generate simple icons (192x192 and 512x512) for the PWA. Can be placeholder for now.

- [ ] **Step 5: Commit**

```bash
git add apps/web/static/ apps/web/src/app.html apps/web/src/routes/+layout.svelte
git commit -m "feat: add PWA manifest and push subscription"
```

---

### Task 23: Settings page — commute destinations

**Files:**
- Create: `apps/web/src/routes/settings/+page.svelte`
- Create: `apps/web/src/routes/settings/+page.server.ts`

- [ ] **Step 1: Create +page.server.ts**

Load user's commute destinations from `user_commute_destinations`. Handle form actions for add/edit/delete destinations. On edit/delete, set `pending_commute_backfill = true` on all user's `search_members` rows and delete existing `commute_times` for the user.

- [ ] **Step 2: Create +page.svelte**

Settings page with:
- Profile section (name, avatar from Google — read only from BetterAuth)
- Commute destinations section:
  - List of current destinations (label, coordinates, modes)
  - "Add destination" form: label input, location picker (could be a simple lat/lng input or address autocomplete), mode checkboxes (transit, walking, cycling)
  - Edit/delete buttons on each destination
- Notification preferences (toggle push notifications on/off)

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/routes/settings/
git commit -m "feat: add settings page with commute destination management"
```

---

## Chunk 8: Polish + Deployment

### Task 24: Search CRUD API

**Files:**
- Create: `apps/web/src/routes/api/searches/[id]/+server.ts`

- [ ] **Step 1: Create searches CRUD API**

```typescript
import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { db } from "$lib/server/db";
import { searches, searchMembers } from "@flatmate/db";
import { eq, and } from "drizzle-orm";

async function requireOwner(searchId: string, userId: string) {
	const member = await db.query.searchMembers.findFirst({
		where: and(eq(searchMembers.searchId, searchId), eq(searchMembers.userId, userId)),
	});
	if (!member || member.role !== "owner") throw error(403);
	return member;
}

export const GET: RequestHandler = async ({ params, locals }) => {
	if (!locals.session) throw error(401);
	const search = await db.query.searches.findFirst({
		where: eq(searches.id, params.id),
		with: { members: { with: { user: true } } },
	});
	if (!search) throw error(404);
	return json(search);
};

export const PATCH: RequestHandler = async ({ params, locals, request }) => {
	if (!locals.session) throw error(401);
	await requireOwner(params.id, locals.session.user.id);
	const body = await request.json();
	const [updated] = await db
		.update(searches)
		.set({
			...(body.name != null && { name: body.name }),
			...(body.isActive != null && { isActive: body.isActive }),
		})
		.where(eq(searches.id, params.id))
		.returning();
	return json(updated);
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
	if (!locals.session) throw error(401);
	await requireOwner(params.id, locals.session.user.id);
	await db.delete(searches).where(eq(searches.id, params.id));
	return new Response(null, { status: 204 });
};
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/routes/api/searches/
git commit -m "feat: add search CRUD API (get, update, delete)"
```

---

### Task 24b: Search settings UI

**Files:**
- Modify: `apps/web/src/routes/searches/[id]/+page.svelte`

- [ ] **Step 1: Add search management UI**

On the search feed page, add a settings section (visible to owner) with:
- Edit search name (inline edit)
- Pause/resume toggle (`is_active` via PATCH)
- Members list with remove button (DELETE to `/api/searches/[id]/members`)
- Copy invite link button
- Delete search button with confirmation dialog

Use shadcn Dialog for the settings panel and confirmation.

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/routes/searches/
git commit -m "feat: add search management UI for owners"
```

---

### Task 25: Railway deployment configuration (manual)

**Files:**
- Modify: `apps/web/package.json`, `apps/scraper/package.json`

Note: This task involves manual Railway dashboard configuration — steps are documented for reference.

- [ ] **Step 1: Configure web app for Railway**

Railway auto-detects Node.js apps. Ensure `apps/web/package.json` has correct `build` and `start` scripts:

```json
{
  "scripts": {
    "build": "vite build",
    "start": "node build/index.js"
  }
}
```

Set Railway root directory to `apps/web`. Configure environment variables in Railway dashboard.

- [ ] **Step 2: Configure scraper for Railway**

Set Railway root directory to `apps/scraper`. Configure as a cron job with schedule `*/15 * * * *` (every 15 minutes). Start command: `pnpm start`.

- [ ] **Step 3: Add PostgreSQL addon**

Add PostgreSQL plugin in Railway. Copy `DATABASE_URL` to both services' environment variables.

- [ ] **Step 4: Run initial migration**

```bash
DATABASE_URL=<railway_url> pnpm db:migrate
```

- [ ] **Step 5: Configure all environment variables**

Set in Railway dashboard for both services:
- `DATABASE_URL`
- `TFL_API_KEY`
- `ORS_API_KEY`
- `WEB_PUSH_PUBLIC_KEY` / `WEB_PUSH_PRIVATE_KEY` (generate with `web-push generate-vapid-keys`)
- `BETTER_AUTH_SECRET`
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`
- `NOTIFY_ENDPOINT` (internal Railway URL for web service)
- `SCRAPER_SECRET` (generate a random secret)

- [ ] **Step 6: Deploy and verify**

Push to main, verify both services deploy. Test end-to-end: create a search, wait for scraper to run, check properties appear, test push notification.

- [ ] **Step 7: Commit any deployment config**

```bash
git add .
git commit -m "chore: add deployment configuration"
```

---

### Task 26: Final polish

**Files:**
- Modify: `apps/web/src/routes/searches/[id]/+page.svelte`
- Modify: `apps/web/src/routes/searches/[id]/properties/[propertyId]/+page.svelte`
- Modify: `apps/web/src/routes/searches/new/+page.svelte`
- Modify: `apps/web/src/routes/+layout.svelte`

- [ ] **Step 1: Add loading states**

Add loading spinners/skeletons to the property feed, detail page, and search creation form.

- [ ] **Step 2: Add error handling UI**

Toast notifications for API errors (failed to update status, failed to post comment, etc.). Use `svelte-sonner` or similar.

- [ ] **Step 3: Mobile responsive pass**

Ensure all pages work well on mobile (the primary use case for the PWA). Property cards should stack in a single column. Map view should be full-width.

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "feat: add loading states, error handling, and mobile responsive polish"
```
