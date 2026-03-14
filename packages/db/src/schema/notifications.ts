import { jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { users } from "./auth";

export const pushSubscriptions = pgTable("push_subscriptions", {
	id: uuid("id").primaryKey().defaultRandom(),
	userId: uuid("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	endpoint: text("endpoint").notNull().unique(),
	keys: jsonb("keys").notNull(),
	createdAt: timestamp("created_at").notNull().defaultNow(),
});
