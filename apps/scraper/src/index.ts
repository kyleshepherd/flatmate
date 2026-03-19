import "dotenv/config";
import {
	createDb,
	searches,
	properties,
	searchProperties,
	propertyChanges,
	eq,
} from "@flatmate/db";
import { buildSearchUrl, fetchSearchPage } from "./rightmove/search";
import { extractProperties, type ExtractedProperty } from "./rightmove/extract";
import { fetchFloorplanUrls } from "./rightmove/floorplans";
import { notifyNewProperties } from "./notify";
import { calculateCommutesForNewProperties, runCommuteBackfill } from "./commute/calculate";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error("DATABASE_URL is required");

const TFL_API_KEY = process.env.TFL_API_KEY ?? "";
const ORS_API_KEY = process.env.ORS_API_KEY ?? "";
const NOTIFY_ENDPOINT = process.env.NOTIFY_ENDPOINT ?? "";
const SCRAPER_SECRET = process.env.SCRAPER_SECRET ?? "";

const db = createDb(DATABASE_URL);

function isDateString(s: string): boolean {
	return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function filterByAvailability(
	props: ExtractedProperty[],
	from: string | null,
	to: string | null,
): ExtractedProperty[] {
	if (!from && !to) return props;
	const today = new Date().toISOString().split("T")[0];

	return props.filter((p) => {
		// No date or non-date value like "Ask agent" — always include
		if (!p.availableDate || !isDateString(p.availableDate)) return true;
		// Specific date — check it falls within the window
		if (from && p.availableDate < from) return false;
		if (to && p.availableDate > to) return false;
		return true;
	});
}

async function scrapeSearch(search: typeof searches.$inferSelect) {
	console.log(`Scraping: ${search.name} (${search.locationIdentifier})`);
	const allExtracted: ExtractedProperty[] = [];

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
		const result = extractProperties(html);
		if (result.properties.length === 0) break;
		allExtracted.push(...result.properties);
		if (!result.pagination.next) break;
	}

	// Deduplicate — featured/promoted listings can appear on multiple pages
	const seen = new Set<number>();
	const deduplicated = allExtracted.filter((p) => {
		if (seen.has(p.rightmoveId)) return false;
		seen.add(p.rightmoveId);
		return true;
	});

	console.log(`  Found ${deduplicated.length} properties (${allExtracted.length} before dedup)`);

	const filtered = filterByAvailability(deduplicated, search.availableFrom, search.availableTo);
	console.log(`  ${filtered.length} within availability window`);

	const newPropertyIds: string[] = [];
	const changedProps: Array<{
		id: string;
		changes: Array<{ field: string; oldValue: string; newValue: string }>;
	}> = [];

	for (const ext of filtered) {
		const [existing] = await db
			.select()
			.from(properties)
			.where(eq(properties.rightmoveId, ext.rightmoveId))
			.limit(1);

		let propertyId: string;
		if (!existing) {
			let floorplanUrls: string[] = [];
			if (ext.numberOfFloorplans > 0) {
				try {
					floorplanUrls = await fetchFloorplanUrls(ext.rightmoveUrl);
				} catch (err) {
					console.warn(`  Failed to fetch floorplans for ${ext.rightmoveId}:`, err);
				}
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
					changes.map((c) => ({
						propertyId,
						field: c.field,
						oldValue: c.oldValue,
						newValue: c.newValue,
					})),
				);
				await db
					.update(properties)
					.set({
						priceMonthly: ext.priceMonthly,
						listingStatus: ext.listingStatus,
					})
					.where(eq(properties.id, propertyId));
				changedProps.push({ id: propertyId, changes });
			}
		}

		await db
			.insert(searchProperties)
			.values({ searchId: search.id, propertyId })
			.onConflictDoNothing();
	}

	await db.update(searches).set({ lastScrapedAt: new Date() }).where(eq(searches.id, search.id));

	await notifyNewProperties(
		NOTIFY_ENDPOINT,
		SCRAPER_SECRET,
		search.id,
		newPropertyIds,
		changedProps,
	);

	// Calculate commute times for new properties
	const commuteCtx = { db, tflApiKey: TFL_API_KEY, orsApiKey: ORS_API_KEY };
	await calculateCommutesForNewProperties(commuteCtx, search.id, newPropertyIds);
	await runCommuteBackfill(commuteCtx, search.id);

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

	console.log("Scraper done.");
}

main().catch(console.error);
