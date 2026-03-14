import { decimal, integer, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { users } from "./auth";
import { properties } from "./properties";

export const userCommuteDestinations = pgTable("user_commute_destinations", {
	id: uuid("id").primaryKey().defaultRandom(),
	userId: uuid("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	label: text("label").notNull(),
	latitude: decimal("latitude", { precision: 10, scale: 6 }).notNull(),
	longitude: decimal("longitude", { precision: 10, scale: 6 }).notNull(),
	modes: text("modes").array().notNull(),
});

export const commuteTimes = pgTable(
	"commute_times",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		propertyId: uuid("property_id")
			.notNull()
			.references(() => properties.id),
		userId: uuid("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		destinationId: uuid("destination_id")
			.notNull()
			.references(() => userCommuteDestinations.id, { onDelete: "cascade" }),
		mode: text("mode").notNull(),
		durationMins: integer("duration_mins"),
		calculatedAt: timestamp("calculated_at").notNull().defaultNow(),
	},
	(t) => [
		unique("commute_time_unique").on(t.propertyId, t.userId, t.destinationId, t.mode),
	],
);
