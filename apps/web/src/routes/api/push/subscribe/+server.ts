import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { db } from "$lib/server/db";
import { pushSubscriptions, eq } from "@flatmate/db";

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.session) throw error(401);

	const sub = await request.json();

	await db
		.insert(pushSubscriptions)
		.values({
			userId: locals.session.user.id,
			endpoint: sub.endpoint,
			keys: sub.keys,
		})
		.onConflictDoUpdate({
			target: pushSubscriptions.endpoint,
			set: { keys: sub.keys, userId: locals.session.user.id },
		});

	return json({ ok: true });
};
