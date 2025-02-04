import { relations } from "drizzle-orm/relations";
import { schedules, scheduleAvailabilities, events, meetings } from "./schema";

export const scheduleAvailabilitiesRelations = relations(scheduleAvailabilities, ({one}) => ({
	schedule: one(schedules, {
		fields: [scheduleAvailabilities.scheduleId],
		references: [schedules.id]
	}),
}));

export const schedulesRelations = relations(schedules, ({many}) => ({
	scheduleAvailabilities: many(scheduleAvailabilities),
}));

export const meetingsRelations = relations(meetings, ({one}) => ({
	event: one(events, {
		fields: [meetings.eventId],
		references: [events.id]
	}),
}));

export const eventsRelations = relations(events, ({many}) => ({
	meetings: many(meetings),
}));