import { error } from "@sveltejs/kit";
import type { PageServerLoad, Actions } from "./$types";
import { db } from "$lib/server/db";
import {
	userCommuteDestinations,
	searchMembers,
	commuteTimes,
	eq,
	and,
} from "@flatmate/db";

export const load: PageServerLoad = async ({ locals }) => {
	const userId = locals.session!.user.id;

	const destinations = await db
		.select()
		.from(userCommuteDestinations)
		.where(eq(userCommuteDestinations.userId, userId));

	return {
		user: locals.session!.user,
		destinations,
	};
};

export const actions: Actions = {
	addDestination: async ({ request, locals }) => {
		if (!locals.session) throw error(401);
		const data = await request.formData();

		const label = data.get("label")?.toString()?.trim();
		const latitude = data.get("latitude")?.toString()?.trim();
		const longitude = data.get("longitude")?.toString()?.trim();
		const modes = data.getAll("modes").map((m) => m.toString());

		if (!label || !latitude || !longitude || modes.length === 0) {
			return { error: "All fields are required" };
		}

		await db.insert(userCommuteDestinations).values({
			userId: locals.session.user.id,
			label,
			latitude,
			longitude,
			modes,
		});

		// Trigger backfill for all searches this user is in
		await db
			.update(searchMembers)
			.set({ pendingCommuteBackfill: true })
			.where(eq(searchMembers.userId, locals.session.user.id));
	},

	deleteDestination: async ({ request, locals }) => {
		if (!locals.session) throw error(401);
		const data = await request.formData();
		const id = data.get("id")?.toString();
		if (!id) return;

		// Delete commute times for this destination
		await db
			.delete(commuteTimes)
			.where(
				and(
					eq(commuteTimes.userId, locals.session.user.id),
					eq(commuteTimes.destinationId, id),
				),
			);

		await db
			.delete(userCommuteDestinations)
			.where(
				and(
					eq(userCommuteDestinations.id, id),
					eq(userCommuteDestinations.userId, locals.session.user.id),
				),
			);
	},
};
