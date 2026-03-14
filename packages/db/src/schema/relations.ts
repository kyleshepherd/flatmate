import { relations } from "drizzle-orm";
import { users } from "./auth";
import { searches, searchMembers } from "./searches";
import { properties, searchProperties, propertyChanges } from "./properties";
import { userCommuteDestinations, commuteTimes } from "./commute";
import { comments } from "./comments";
import { pushSubscriptions } from "./notifications";

export const usersRelations = relations(users, ({ many }) => ({
	searchMemberships: many(searchMembers),
	commuteDestinations: many(userCommuteDestinations),
	commuteTimes: many(commuteTimes),
	comments: many(comments),
	pushSubscriptions: many(pushSubscriptions),
}));

export const searchesRelations = relations(searches, ({ one, many }) => ({
	createdByUser: one(users, {
		fields: [searches.createdBy],
		references: [users.id],
	}),
	members: many(searchMembers),
	searchProperties: many(searchProperties),
}));

export const searchMembersRelations = relations(searchMembers, ({ one }) => ({
	search: one(searches, {
		fields: [searchMembers.searchId],
		references: [searches.id],
	}),
	user: one(users, {
		fields: [searchMembers.userId],
		references: [users.id],
	}),
}));

export const propertiesRelations = relations(properties, ({ many }) => ({
	searchProperties: many(searchProperties),
	changes: many(propertyChanges),
	commuteTimes: many(commuteTimes),
}));

export const searchPropertiesRelations = relations(searchProperties, ({ one, many }) => ({
	search: one(searches, {
		fields: [searchProperties.searchId],
		references: [searches.id],
	}),
	property: one(properties, {
		fields: [searchProperties.propertyId],
		references: [properties.id],
	}),
	comments: many(comments),
}));

export const propertyChangesRelations = relations(propertyChanges, ({ one }) => ({
	property: one(properties, {
		fields: [propertyChanges.propertyId],
		references: [properties.id],
	}),
}));

export const userCommuteDestinationsRelations = relations(
	userCommuteDestinations,
	({ one, many }) => ({
		user: one(users, {
			fields: [userCommuteDestinations.userId],
			references: [users.id],
		}),
		commuteTimes: many(commuteTimes),
	}),
);

export const commuteTimesRelations = relations(commuteTimes, ({ one }) => ({
	property: one(properties, {
		fields: [commuteTimes.propertyId],
		references: [properties.id],
	}),
	user: one(users, {
		fields: [commuteTimes.userId],
		references: [users.id],
	}),
	destination: one(userCommuteDestinations, {
		fields: [commuteTimes.destinationId],
		references: [userCommuteDestinations.id],
	}),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
	searchProperty: one(searchProperties, {
		fields: [comments.searchPropertyId],
		references: [searchProperties.id],
	}),
	user: one(users, {
		fields: [comments.userId],
		references: [users.id],
	}),
}));

export const pushSubscriptionsRelations = relations(pushSubscriptions, ({ one }) => ({
	user: one(users, {
		fields: [pushSubscriptions.userId],
		references: [users.id],
	}),
}));
