import { relations } from "drizzle-orm/relations";
import {
  ScheduleTable,
  ScheduleAvailabilityTable,
  UserTable,
  TokenTable,
  EventTable,
  MeetingTable,
} from "./schema";

export const scheduleAvailabilityRelations = relations(
  ScheduleAvailabilityTable,
  ({ one }) => ({
    schedule: one(ScheduleTable, {
      fields: [ScheduleAvailabilityTable.scheduleId],
      references: [ScheduleTable.id],
    }),
  })
);

export const scheduleRelations = relations(ScheduleTable, ({ many }) => ({
  scheduleAvailabilities: many(ScheduleAvailabilityTable),
}));

export const tokenRelations = relations(TokenTable, ({ one }) => ({
  user: one(UserTable, {
    fields: [TokenTable.clerkUserId],
    references: [UserTable.clerkUserId],
  }),
}));

export const userRelations = relations(UserTable, ({ many }) => ({
  tokens: many(TokenTable),
}));

export const meetingRelations = relations(MeetingTable, ({ one }) => ({
  event: one(EventTable, {
    fields: [MeetingTable.eventId],
    references: [EventTable.id],
  }),
}));

export const eventRelations = relations(EventTable, ({ many }) => ({
  meetings: many(MeetingTable),
}));
