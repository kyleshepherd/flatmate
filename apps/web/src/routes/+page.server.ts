import type { PageServerLoad } from "./$types";
import { db } from "$lib/server/db";
import { searchMembers, searches, eq } from "@flatmate/db";

export const load: PageServerLoad = async ({ locals }) => {
	const memberships = await db
		.select({
			id: searches.id,
			name: searches.name,
			locationName: searches.locationName,
			radius: searches.radius,
			isActive: searches.isActive,
			role: searchMembers.role,
			createdAt: searches.createdAt,
		})
		.from(searchMembers)
		.innerJoin(searches, eq(searchMembers.searchId, searches.id))
		.where(eq(searchMembers.userId, locals.session.user.id));

	return { searches: memberships };
};
