import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "$lib/server/db";
import { env } from "$env/dynamic/private";

// biome-ignore lint/suspicious/noExplicitAny: Better Auth's complex types cause TS2742 error
const authInstance: any = betterAuth({
	database: drizzleAdapter(db, {
		provider: "pg",
		usePlural: true,
	}),
	socialProviders: {
		google: {
			clientId: env.GOOGLE_CLIENT_ID,
			clientSecret: env.GOOGLE_CLIENT_SECRET,
		},
	},
	session: {
		expiresIn: 60 * 60 * 24 * 90,
		updateAge: 60 * 60 * 24,
	},
	advanced: {
		generateId: () => crypto.randomUUID(),
	},
});

export interface Auth {
	handler: (request: Request) => Promise<Response>;
	api: {
		getSession: (options: { headers: Headers }) => Promise<{
			user: {
				id: string;
				name: string;
				email: string;
				image: string | null;
			};
			session: {
				id: string;
				userId: string;
				expiresAt: Date;
			};
		} | null>;
	};
}

export const auth: Auth = authInstance;
