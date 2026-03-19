import { error } from "@sveltejs/kit";
import type { PageServerLoad, Actions } from "./$types";
import { db } from "$lib/server/db";
import {
	searches,
	searchMembers,
	searchProperties,
	properties,
	commuteTimes,
	userCommuteDestinations,
	users,
	comments,
	propertyChanges,
	eq,
	and,
	desc,
	asc,
} from "@flatmate/db";

export const load: PageServerLoad = async ({ params, locals }) => {
	const userId = locals.session!.user.id;

	// Verify membership
	const membership = await db.query.searchMembers.findFirst({
		where: and(
			eq(searchMembers.searchId, params.id),
			eq(searchMembers.userId, userId),
		),
	});
	if (!membership) throw error(404);

	// Get the search_property link
	const sp = await db.query.searchProperties.findFirst({
		where: and(
			eq(searchProperties.searchId, params.id),
			eq(searchProperties.propertyId, params.propertyId),
		),
	});
	if (!sp) throw error(404);

	// Get property
	const property = await db.query.properties.findFirst({
		where: eq(properties.id, params.propertyId),
	});
	if (!property) throw error(404);

	// Get search name
	const search = await db.query.searches.findFirst({
		where: eq(searches.id, params.id),
	});

	// Get commute times grouped by user
	const commuteRows = await db
		.select({
			userId: commuteTimes.userId,
			userName: users.name,
			destinationLabel: userCommuteDestinations.label,
			mode: commuteTimes.mode,
			durationMins: commuteTimes.durationMins,
		})
		.from(commuteTimes)
		.innerJoin(users, eq(commuteTimes.userId, users.id))
		.innerJoin(userCommuteDestinations, eq(commuteTimes.destinationId, userCommuteDestinations.id))
		.where(eq(commuteTimes.propertyId, params.propertyId));

	// Get comments
	const commentRows = await db
		.select({
			id: comments.id,
			body: comments.body,
			createdAt: comments.createdAt,
			userName: users.name,
			userImage: users.image,
			userId: comments.userId,
		})
		.from(comments)
		.innerJoin(users, eq(comments.userId, users.id))
		.where(eq(comments.searchPropertyId, sp.id))
		.orderBy(asc(comments.createdAt));

	// Get price history
	const changes = await db
		.select()
		.from(propertyChanges)
		.where(eq(propertyChanges.propertyId, params.propertyId))
		.orderBy(desc(propertyChanges.changedAt));

	return {
		search: { id: params.id, name: search?.name ?? "" },
		property: {
			...property,
			images: property.images as Array<{ url: string; caption: string | null }>,
		},
		searchProperty: {
			id: sp.id,
			status: sp.status,
			shortlisted: sp.shortlisted,
		},
		commutes: commuteRows,
		comments: commentRows,
		changes,
		currentUserId: userId,
	};
};

export const actions: Actions = {
	comment: async ({ request, locals, params }) => {
		if (!locals.session) throw error(401);

		const data = await request.formData();
		const body = data.get("body")?.toString()?.trim();
		if (!body) return;

		const sp = await db.query.searchProperties.findFirst({
			where: and(
				eq(searchProperties.searchId, params.id),
				eq(searchProperties.propertyId, params.propertyId),
			),
		});
		if (!sp) throw error(404);

		await db.insert(comments).values({
			searchPropertyId: sp.id,
			userId: locals.session.user.id,
			body,
		});
	},

	updateStatus: async ({ request, locals, params }) => {
		if (!locals.session) throw error(401);

		const data = await request.formData();
		const status = data.get("status")?.toString();
		if (!status) return;

		await db
			.update(searchProperties)
			.set({
				status,
				statusUpdatedBy: locals.session.user.id,
				statusUpdatedAt: new Date(),
			})
			.where(
				and(
					eq(searchProperties.searchId, params.id),
					eq(searchProperties.propertyId, params.propertyId),
				),
			);
	},

	toggleShortlist: async ({ locals, params }) => {
		if (!locals.session) throw error(401);

		const sp = await db.query.searchProperties.findFirst({
			where: and(
				eq(searchProperties.searchId, params.id),
				eq(searchProperties.propertyId, params.propertyId),
			),
		});
		if (!sp) throw error(404);

		await db
			.update(searchProperties)
			.set({
				shortlisted: !sp.shortlisted,
				shortlistedBy: sp.shortlisted ? null : locals.session.user.id,
			})
			.where(eq(searchProperties.id, sp.id));
	},
};
