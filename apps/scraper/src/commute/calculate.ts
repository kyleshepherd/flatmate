import type { Database } from "@flatmate/db";
import {
	searchMembers,
	userCommuteDestinations,
	commuteTimes,
	properties,
	searchProperties,
	eq,
	and,
} from "@flatmate/db";
import { fetchTflTransitTime } from "./tfl";
import { fetchOrsMatrix, getOrsProfile, checkOrsQuota, incrementOrsCount } from "./ors";

interface CommuteContext {
	db: Database;
	tflApiKey: string;
	orsApiKey: string;
}

interface PropertyCoords {
	propertyId: string;
	lat: number;
	lng: number;
}

interface Destination {
	destinationId: string;
	userId: string;
	label: string;
	lat: number;
	lng: number;
	modes: string[];
}

async function getMembersWithDestinations(
	db: Database,
	searchId: string,
): Promise<Destination[]> {
	const members = await db
		.select({ userId: searchMembers.userId })
		.from(searchMembers)
		.where(eq(searchMembers.searchId, searchId));

	const destinations: Destination[] = [];
	for (const member of members) {
		const dests = await db
			.select()
			.from(userCommuteDestinations)
			.where(eq(userCommuteDestinations.userId, member.userId));

		for (const d of dests) {
			destinations.push({
				destinationId: d.id,
				userId: member.userId,
				label: d.label,
				lat: Number(d.latitude),
				lng: Number(d.longitude),
				modes: d.modes,
			});
		}
	}
	return destinations;
}

async function calculateForProperties(
	ctx: CommuteContext,
	propertyCoords: PropertyCoords[],
	destinations: Destination[],
): Promise<number> {
	if (propertyCoords.length === 0 || destinations.length === 0) return 0;
	let count = 0;

	for (const dest of destinations) {
		for (const mode of dest.modes) {
			if (mode === "transit") {
				// TfL: individual calls per property
				for (const prop of propertyCoords) {
					// Check if already calculated
					const existing = await ctx.db.query.commuteTimes.findFirst({
						where: and(
							eq(commuteTimes.propertyId, prop.propertyId),
							eq(commuteTimes.userId, dest.userId),
							eq(commuteTimes.destinationId, dest.destinationId),
							eq(commuteTimes.mode, mode),
						),
					});
					if (existing) continue;

					const duration = await fetchTflTransitTime(
						prop.lat,
						prop.lng,
						dest.lat,
						dest.lng,
						ctx.tflApiKey,
					);

					await ctx.db
						.insert(commuteTimes)
						.values({
							propertyId: prop.propertyId,
							userId: dest.userId,
							destinationId: dest.destinationId,
							mode,
							durationMins: duration,
						})
						.onConflictDoNothing();
					count++;
				}
			} else {
				// ORS: batch matrix
				const profile = getOrsProfile(mode);
				if (!profile) continue;

				const hasQuota = await checkOrsQuota(ctx.db);
				if (!hasQuota) {
					console.warn("  ORS daily quota reached, skipping");
					continue;
				}

				// Filter to properties without existing commute times for this dest+mode
				const propsToCalc: PropertyCoords[] = [];
				for (const prop of propertyCoords) {
					const existing = await ctx.db.query.commuteTimes.findFirst({
						where: and(
							eq(commuteTimes.propertyId, prop.propertyId),
							eq(commuteTimes.userId, dest.userId),
							eq(commuteTimes.destinationId, dest.destinationId),
							eq(commuteTimes.mode, mode),
						),
					});
					if (!existing) propsToCalc.push(prop);
				}

				if (propsToCalc.length === 0) continue;

				// ORS expects [lng, lat]
				const origins: [number, number][] = propsToCalc.map((p) => [p.lng, p.lat]);
				const destCoords: [number, number][] = [[dest.lng, dest.lat]];

				const durations = await fetchOrsMatrix(origins, destCoords, profile, ctx.orsApiKey);
				await incrementOrsCount(ctx.db);

				if (durations) {
					for (let i = 0; i < propsToCalc.length; i++) {
						const secs = durations[i]?.[0];
						const mins = secs != null ? Math.round(secs / 60) : null;

						await ctx.db
							.insert(commuteTimes)
							.values({
								propertyId: propsToCalc[i].propertyId,
								userId: dest.userId,
								destinationId: dest.destinationId,
								mode,
								durationMins: mins,
							})
							.onConflictDoNothing();
						count++;
					}
				}
			}
		}
	}

	return count;
}

export async function calculateCommutesForNewProperties(
	ctx: CommuteContext,
	searchId: string,
	newPropertyIds: string[],
): Promise<void> {
	if (newPropertyIds.length === 0) return;

	const destinations = await getMembersWithDestinations(ctx.db, searchId);
	if (destinations.length === 0) return;

	const propertyCoords: PropertyCoords[] = [];
	for (const id of newPropertyIds) {
		const [prop] = await ctx.db
			.select({ id: properties.id, lat: properties.latitude, lng: properties.longitude })
			.from(properties)
			.where(eq(properties.id, id))
			.limit(1);
		if (prop) {
			propertyCoords.push({
				propertyId: prop.id,
				lat: Number(prop.lat),
				lng: Number(prop.lng),
			});
		}
	}

	const count = await calculateForProperties(ctx, propertyCoords, destinations);
	console.log(`  Calculated ${count} commute times for ${newPropertyIds.length} new properties`);
}

export async function runCommuteBackfill(
	ctx: CommuteContext,
	searchId: string,
): Promise<void> {
	// Find members with pending backfill
	const pending = await ctx.db
		.select({ userId: searchMembers.userId, id: searchMembers.id })
		.from(searchMembers)
		.where(
			and(
				eq(searchMembers.searchId, searchId),
				eq(searchMembers.pendingCommuteBackfill, true),
			),
		);

	if (pending.length === 0) return;
	console.log(`  Running commute backfill for ${pending.length} members`);

	// Get all properties in this search
	const spRows = await ctx.db
		.select({ propertyId: searchProperties.propertyId })
		.from(searchProperties)
		.where(eq(searchProperties.searchId, searchId));

	const propertyCoords: PropertyCoords[] = [];
	for (const row of spRows) {
		const [prop] = await ctx.db
			.select({ id: properties.id, lat: properties.latitude, lng: properties.longitude })
			.from(properties)
			.where(eq(properties.id, row.propertyId))
			.limit(1);
		if (prop) {
			propertyCoords.push({
				propertyId: prop.id,
				lat: Number(prop.lat),
				lng: Number(prop.lng),
			});
		}
	}

	// Only calculate for users with pending backfill
	const destinations: Destination[] = [];
	for (const member of pending) {
		const dests = await ctx.db
			.select()
			.from(userCommuteDestinations)
			.where(eq(userCommuteDestinations.userId, member.userId));

		for (const d of dests) {
			destinations.push({
				destinationId: d.id,
				userId: member.userId,
				label: d.label,
				lat: Number(d.latitude),
				lng: Number(d.longitude),
				modes: d.modes,
			});
		}
	}

	if (destinations.length === 0) {
		// No destinations set up — clear backfill flag anyway
		for (const member of pending) {
			await ctx.db
				.update(searchMembers)
				.set({ pendingCommuteBackfill: false })
				.where(eq(searchMembers.id, member.id));
		}
		return;
	}

	const count = await calculateForProperties(ctx, propertyCoords, destinations);
	console.log(`  Backfill: ${count} commute times for ${propertyCoords.length} properties`);

	// Clear backfill flag
	for (const member of pending) {
		await ctx.db
			.update(searchMembers)
			.set({ pendingCommuteBackfill: false })
			.where(eq(searchMembers.id, member.id));
	}
}
