import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { db } from "$lib/server/db";
import { searches, searchMembers, eq, and } from "@flatmate/db";

async function requireOwner(searchId: string, userId: string) {
	const member = await db.query.searchMembers.findFirst({
		where: and(eq(searchMembers.searchId, searchId), eq(searchMembers.userId, userId)),
	});
	if (!member || member.role !== "owner") throw error(403);
	return member;
}

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
