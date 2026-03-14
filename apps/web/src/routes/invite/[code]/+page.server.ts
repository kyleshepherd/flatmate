import { redirect, error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { db } from "$lib/server/db";
import { searches, searchMembers, eq, and } from "@flatmate/db";

export const load: PageServerLoad = async ({ params, locals }) => {
	const search = await db.query.searches.findFirst({
		where: eq(searches.inviteCode, params.code),
	});
	if (!search) throw error(404, "Invalid invite code");

	const existing = await db.query.searchMembers.findFirst({
		where: and(
			eq(searchMembers.searchId, search.id),
			eq(searchMembers.userId, locals.session!.user.id),
		),
	});
	if (existing) redirect(302, `/searches/${search.id}`);

	return { search: { id: search.id, name: search.name, locationName: search.locationName } };
};
