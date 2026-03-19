import type { LayoutServerLoad } from "./$types";
import { env } from "$env/dynamic/private";

export const load: LayoutServerLoad = async ({ locals }) => {
	return {
		session: locals.session,
		vapidPublicKey: env.WEB_PUSH_PUBLIC_KEY ?? "",
	};
};
