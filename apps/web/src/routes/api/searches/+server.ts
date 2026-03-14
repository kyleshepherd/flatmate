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
			availableFrom: body.availableFrom ?? null,
			availableTo: body.availableTo ?? null,
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
