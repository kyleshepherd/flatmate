import type { Database } from "@flatmate/db";
import { scraperState, eq, sql } from "@flatmate/db";
import { rateLimiter } from "../rate-limit";

const orsDelay = rateLimiter(1500); // ~40 req/min

const ORS_PROFILES: Record<string, string> = {
	walking: "foot-walking",
	cycling: "cycling-regular",
};

export function getOrsProfile(mode: string): string | null {
	return ORS_PROFILES[mode] ?? null;
}

// ORS expects coordinates as [longitude, latitude]
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
