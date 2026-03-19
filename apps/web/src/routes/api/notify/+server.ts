import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { db } from "$lib/server/db";
import { searchMembers, pushSubscriptions, eq, inArray } from "@flatmate/db";
import { env } from "$env/dynamic/private";
import webPush from "web-push";

webPush.setVapidDetails(
	"mailto:noreply@flatmate.app",
	env.WEB_PUSH_PUBLIC_KEY!,
	env.WEB_PUSH_PRIVATE_KEY!,
);

export const POST: RequestHandler = async ({ request }) => {
	const auth = request.headers.get("authorization");
	if (auth !== `Bearer ${env.SCRAPER_SECRET}`) throw error(401);

	const { searchId, newPropertyIds, changedProperties } = await request.json();

	const members = await db.query.searchMembers.findMany({
		where: eq(searchMembers.searchId, searchId),
	});
	const userIds = members.map((m) => m.userId);
	if (userIds.length === 0) return json({ sent: 0 });

	const subs = await db.query.pushSubscriptions.findMany({
		where: inArray(pushSubscriptions.userId, userIds),
	});
	if (subs.length === 0) return json({ sent: 0 });

	let body = "";
	if (newPropertyIds.length > 0) {
		body += `${newPropertyIds.length} new propert${newPropertyIds.length === 1 ? "y" : "ies"}`;
	}
	if (changedProperties.length > 0) {
		if (body) body += ", ";
		body += `${changedProperties.length} price change${changedProperties.length === 1 ? "" : "s"}`;
	}

	const payload = JSON.stringify({
		title: "Flatmate",
		body,
		url: `/searches/${searchId}`,
	});

	let sent = 0;
	for (const sub of subs) {
		try {
			await webPush.sendNotification(
				{
					endpoint: sub.endpoint,
					keys: sub.keys as { p256dh: string; auth: string },
				},
				payload,
			);
			sent++;
		} catch (err: unknown) {
			if (err && typeof err === "object" && "statusCode" in err && err.statusCode === 410) {
				await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, sub.id));
			}
		}
	}

	return json({ sent });
};
