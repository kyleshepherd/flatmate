import { auth } from "$lib/auth-server";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ request }) => {
	return auth.handler(request);
};

export const POST: RequestHandler = async ({ request }) => {
	return auth.handler(request);
};
