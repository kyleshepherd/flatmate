import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { users } from "./auth";
import { searchProperties } from "./properties";

export const comments = pgTable("comments", {
	id: uuid("id").primaryKey().defaultRandom(),
	searchPropertyId: uuid("search_property_id")
		.notNull()
		.references(() => searchProperties.id, { onDelete: "cascade" }),
	userId: text("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	body: text("body").notNull(),
	createdAt: timestamp("created_at").notNull().defaultNow(),
});
