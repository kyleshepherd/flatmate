import { auth } from "$lib/auth-server";
import type { Handle } from "@sveltejs/kit";

export const handle: Handle = async ({ event, resolve }) => {
	const session = await auth.api.getSession({
		headers: event.request.headers,
	});
	event.locals.session = session;
	return resolve(event);
};
