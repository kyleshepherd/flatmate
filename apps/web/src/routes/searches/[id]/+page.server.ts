import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { db } from "$lib/server/db";
import {
	searches,
	searchMembers,
	searchProperties,
	properties,
	commuteTimes,
	userCommuteDestinations,
	users,
	eq,
	and,
	desc,
	asc,
	count,
	sql,
} from "@flatmate/db";

export const load: PageServerLoad = async ({ params, locals, url }) => {
	const userId = locals.session!.user.id;

	// Verify membership
	const membership = await db.query.searchMembers.findFirst({
		where: and(
			eq(searchMembers.searchId, params.id),
			eq(searchMembers.userId, userId),
		),
	});
	if (!membership) throw error(404, "Search not found");

	const search = await db.query.searches.findFirst({
		where: eq(searches.id, params.id),
	});
	if (!search) throw error(404);

	// Get members
	const members = await db
		.select({
			userId: searchMembers.userId,
			role: searchMembers.role,
			name: users.name,
			image: users.image,
		})
		.from(searchMembers)
		.innerJoin(users, eq(searchMembers.userId, users.id))
		.where(eq(searchMembers.searchId, params.id));

	// Sort
	const sort = url.searchParams.get("sort") ?? "newest";
	const sortMap = {
		newest: desc(searchProperties.addedAt),
		price_asc: asc(properties.priceMonthly),
		price_desc: desc(properties.priceMonthly),
	} as const;
	const orderBy = sortMap[sort as keyof typeof sortMap] ?? sortMap.newest;

	// Status filter
	const statusFilter = url.searchParams.get("status");

	// Query properties
	let query = db
		.select({
			searchPropertyId: searchProperties.id,
			propertyId: properties.id,
			address: properties.address,
			summary: properties.summary,
			bedrooms: properties.bedrooms,
			bathrooms: properties.bathrooms,
			priceMonthly: properties.priceMonthly,
			propertyType: properties.propertyType,
			latitude: properties.latitude,
			longitude: properties.longitude,
			availableDate: properties.availableDate,
			images: properties.images,
			rightmoveUrl: properties.rightmoveUrl,
			listingStatus: properties.listingStatus,
			status: searchProperties.status,
			shortlisted: searchProperties.shortlisted,
			addedAt: searchProperties.addedAt,
		})
		.from(searchProperties)
		.innerJoin(properties, eq(searchProperties.propertyId, properties.id))
		.where(
			statusFilter
				? and(
						eq(searchProperties.searchId, params.id),
						eq(searchProperties.status, statusFilter),
					)
				: eq(searchProperties.searchId, params.id),
		)
		.orderBy(orderBy)
		.$dynamic();

	const propertyRows = await query;

	// Get commute times for all properties in this search
	const propertyIds = propertyRows.map((p) => p.propertyId);
	let commuteData: Array<{
		propertyId: string;
		userId: string;
		userName: string;
		destinationLabel: string;
		mode: string;
		durationMins: number | null;
	}> = [];

	if (propertyIds.length > 0) {
		const rawCommutes = await db
			.select({
				propertyId: commuteTimes.propertyId,
				userId: commuteTimes.userId,
				userName: users.name,
				destinationLabel: userCommuteDestinations.label,
				mode: commuteTimes.mode,
				durationMins: commuteTimes.durationMins,
			})
			.from(commuteTimes)
			.innerJoin(users, eq(commuteTimes.userId, users.id))
			.innerJoin(
				userCommuteDestinations,
				eq(commuteTimes.destinationId, userCommuteDestinations.id),
			)
			.where(eq(commuteTimes.propertyId, propertyIds[0]));

		// For efficiency, batch query all commute times for this search's properties
		// We already have them linked via search_properties
		commuteData = await db
			.select({
				propertyId: commuteTimes.propertyId,
				userId: commuteTimes.userId,
				userName: users.name,
				destinationLabel: userCommuteDestinations.label,
				mode: commuteTimes.mode,
				durationMins: commuteTimes.durationMins,
			})
			.from(commuteTimes)
			.innerJoin(users, eq(commuteTimes.userId, users.id))
			.innerJoin(
				userCommuteDestinations,
				eq(commuteTimes.destinationId, userCommuteDestinations.id),
			)
			.innerJoin(
				searchProperties,
				and(
					eq(searchProperties.propertyId, commuteTimes.propertyId),
					eq(searchProperties.searchId, params.id),
				),
			);
	}

	// Group commute data by property
	const commutesByProperty = new Map<
		string,
		Array<{
			userId: string;
			userName: string;
			destinationLabel: string;
			mode: string;
			durationMins: number | null;
		}>
	>();
	for (const c of commuteData) {
		if (!commutesByProperty.has(c.propertyId)) {
			commutesByProperty.set(c.propertyId, []);
		}
		commutesByProperty.get(c.propertyId)!.push({
			userId: c.userId,
			userName: c.userName,
			destinationLabel: c.destinationLabel,
			mode: c.mode,
			durationMins: c.durationMins,
		});
	}

	const propertiesWithCommutes = propertyRows.map((p) => ({
		...p,
		commutes: commutesByProperty.get(p.propertyId) ?? [],
	}));

	// Status counts (always from all properties, not filtered)
	const countRows = await db
		.select({
			status: searchProperties.status,
			count: count(),
		})
		.from(searchProperties)
		.where(eq(searchProperties.searchId, params.id))
		.groupBy(searchProperties.status);

	const statusCounts: Record<string, number> = {};
	let totalExcludingNotInterested = 0;
	for (const row of countRows) {
		statusCounts[row.status] = row.count;
		if (row.status !== "not_interested") totalExcludingNotInterested += row.count;
	}
	statusCounts[""] = totalExcludingNotInterested;

	return {
		search: {
			id: search.id,
			name: search.name,
			locationName: search.locationName,
			inviteCode: search.inviteCode,
		},
		members,
		properties: propertiesWithCommutes,
		statusCounts,
		sort,
		statusFilter,
		role: membership.role,
	};
};
