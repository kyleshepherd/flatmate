import { boolean, date, decimal, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { users } from "./auth";

export const searches = pgTable("searches", {
	id: uuid("id").primaryKey().defaultRandom(),
	name: text("name").notNull(),
	createdBy: text("created_by")
		.notNull()
		.references(() => users.id),
	locationIdentifier: text("location_identifier").notNull(),
	locationName: text("location_name").notNull(),
	radius: decimal("radius", { precision: 4, scale: 1 }).notNull().default("0"),
	minPrice: integer("min_price"),
	maxPrice: integer("max_price"),
	minBedrooms: integer("min_bedrooms"),
	maxBedrooms: integer("max_bedrooms"),
	propertyType: text("property_type"),
	includeLetAgreed: boolean("include_let_agreed").notNull().default(false),
	availableFrom: date("available_from"),
	availableTo: date("available_to"),
	isActive: boolean("is_active").notNull().default(true),
	inviteCode: text("invite_code").notNull().unique(),
	lastScrapedAt: timestamp("last_scraped_at"),
	createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const searchMembers = pgTable("search_members", {
	id: uuid("id").primaryKey().defaultRandom(),
	searchId: uuid("search_id")
		.notNull()
		.references(() => searches.id, { onDelete: "cascade" }),
	userId: text("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	role: text("role").notNull().default("member"),
	pendingCommuteBackfill: boolean("pending_commute_backfill").notNull().default(true),
	joinedAt: timestamp("joined_at").notNull().defaultNow(),
});
