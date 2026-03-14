declare global {
	namespace App {
		interface Locals {
			session: {
				user: {
					id: string;
					name: string;
					email: string;
					image: string | null;
				};
			} | null;
		}
	}
}

export {};
