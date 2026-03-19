import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { db } from "$lib/server/db";
import { pushSubscriptions, eq } from "@flatmate/db";

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.session) throw error(401);

	const { endpoint } = await request.json();

	await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));

	return json({ ok: true });
};
