import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { db } from "$lib/server/db";
import { searches, searchMembers, eq, and } from "@flatmate/db";

export const POST: RequestHandler = async ({ params, locals }) => {
	if (!locals.session) throw error(401);

	const search = await db.query.searches.findFirst({
		where: eq(searches.id, params.id),
	});
	if (!search) throw error(404);

	const existing = await db.query.searchMembers.findFirst({
		where: and(
			eq(searchMembers.searchId, search.id),
			eq(searchMembers.userId, locals.session.user.id),
		),
	});
	if (existing) return json({ ok: true });

	await db.insert(searchMembers).values({
		searchId: search.id,
		userId: locals.session.user.id,
		role: "member",
		pendingCommuteBackfill: true,
	});

	return json({ ok: true }, { status: 201 });
};

export const DELETE: RequestHandler = async ({ params, locals, url }) => {
	if (!locals.session) throw error(401);

	const userId = url.searchParams.get("userId") ?? locals.session.user.id;

	const member = await db.query.searchMembers.findFirst({
		where: and(
			eq(searchMembers.searchId, params.id),
			eq(searchMembers.userId, locals.session.user.id),
		),
	});
	if (!member) throw error(404);

	// If removing someone else, must be owner
	if (userId !== locals.session.user.id) {
		if (member.role !== "owner") throw error(403);
	}

	// Owner can't leave without transferring ownership
	if (userId === locals.session.user.id && member.role === "owner") {
		throw error(400, "Transfer ownership before leaving");
	}

	await db
		.delete(searchMembers)
		.where(
			and(
				eq(searchMembers.searchId, params.id),
				eq(searchMembers.userId, userId),
			),
		);

	return json({ ok: true });
};

export const PATCH: RequestHandler = async ({ params, request, locals }) => {
	if (!locals.session) throw error(401);

	const { newOwnerId } = await request.json();
	if (!newOwnerId) throw error(400, "newOwnerId required");

	const member = await db.query.searchMembers.findFirst({
		where: and(
			eq(searchMembers.searchId, params.id),
			eq(searchMembers.userId, locals.session.user.id),
		),
	});
	if (!member || member.role !== "owner") throw error(403);

	const target = await db.query.searchMembers.findFirst({
		where: and(
			eq(searchMembers.searchId, params.id),
			eq(searchMembers.userId, newOwnerId),
		),
	});
	if (!target) throw error(404, "User is not a member");

	// Transfer: demote current owner, promote target
	await db
		.update(searchMembers)
		.set({ role: "member" })
		.where(eq(searchMembers.id, member.id));

	await db
		.update(searchMembers)
		.set({ role: "owner" })
		.where(eq(searchMembers.id, target.id));

	return json({ ok: true });
};
