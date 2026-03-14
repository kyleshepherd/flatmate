import { createDb } from "@flatmate/db";
import { env } from "$env/dynamic/private";

export const db = createDb(env.DATABASE_URL);
