import {
	bigint,
	boolean,
	date,
	decimal,
	integer,
	jsonb,
	pgTable,
	text,
	timestamp,
	unique,
	uuid,
} from "drizzle-orm/pg-core";
import { users } from "./auth";
import { searches } from "./searches";

export const properties = pgTable("properties", {
	id: uuid("id").primaryKey().defaultRandom(),
	rightmoveId: bigint("rightmove_id", { mode: "number" }).notNull().unique(),
	address: text("address").notNull(),
	summary: text("summary").notNull(),
	bedrooms: integer("bedrooms"),
	bathrooms: integer("bathrooms"),
	priceMonthly: integer("price_monthly").notNull(),
	propertyType: text("property_type").notNull(),
	latitude: decimal("latitude", { precision: 10, scale: 6 }).notNull(),
	longitude: decimal("longitude", { precision: 10, scale: 6 }).notNull(),
	availableDate: date("available_date"),
	images: jsonb("images").notNull().default([]),
	floorplanUrls: text("floorplan_urls").array().notNull().default([]),
	keyFeatures: text("key_features").array().notNull().default([]),
	agentName: text("agent_name").notNull(),
	agentPhone: text("agent_phone"),
	rightmoveUrl: text("rightmove_url").notNull(),
	listingStatus: text("listing_status").notNull().default("new"),
	firstSeenAt: timestamp("first_seen_at").notNull().defaultNow(),
});

export const searchProperties = pgTable(
	"search_properties",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		searchId: uuid("search_id")
			.notNull()
			.references(() => searches.id, { onDelete: "cascade" }),
		propertyId: uuid("property_id")
			.notNull()
			.references(() => properties.id),
		status: text("status").notNull().default("new"),
		statusUpdatedBy: text("status_updated_by").references(() => users.id),
		statusUpdatedAt: timestamp("status_updated_at"),
		shortlisted: boolean("shortlisted").notNull().default(false),
		shortlistedBy: text("shortlisted_by").references(() => users.id),
		addedAt: timestamp("added_at").notNull().defaultNow(),
	},
	(t) => [unique("search_property_unique").on(t.searchId, t.propertyId)],
);

export const propertyChanges = pgTable("property_changes", {
	id: uuid("id").primaryKey().defaultRandom(),
	propertyId: uuid("property_id")
		.notNull()
		.references(() => properties.id),
	field: text("field").notNull(),
	oldValue: text("old_value").notNull(),
	newValue: text("new_value").notNull(),
	changedAt: timestamp("changed_at").notNull().defaultNow(),
});
