import { auth } from "$lib/auth-server";
import { redirect, type Handle } from "@sveltejs/kit";

const PUBLIC_PATHS = ["/login", "/api/auth"];
const API_PREFIX = "/api/";

export const handle: Handle = async ({ event, resolve }) => {
	const session = await auth.api.getSession({
		headers: event.request.headers,
	});
	event.locals.session = session;

	const { pathname } = event.url;
	const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));

	if (!session && !isPublic) {
		if (pathname.startsWith(API_PREFIX)) {
			return new Response(JSON.stringify({ error: "Unauthorized" }), {
				status: 401,
				headers: { "Content-Type": "application/json" },
			});
		}
		redirect(302, `/login?returnTo=${encodeURIComponent(pathname)}`);
	}

	if (session && pathname === "/login") {
		redirect(302, "/");
	}

	return resolve(event);
};
