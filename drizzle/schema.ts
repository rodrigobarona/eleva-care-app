import { DAYS_OF_WEEK_IN_ORDER } from "@/app/data/constants";
import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  json,
} from "drizzle-orm/pg-core";
import type { SocialMediaPlatform } from "@/lib/constants/social-media";

const createdAt = timestamp("createdAt").notNull().defaultNow();
const updatedAt = timestamp("updatedAt")
  .notNull()
  .defaultNow()
  .$onUpdate(() => new Date());

export const EventTable = pgTable(
  "events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    durationInMinutes: integer("durationInMinutes").notNull(),
    clerkUserId: text("clerkUserId").notNull(),
    isActive: boolean("isActive").notNull().default(true),
    order: integer("order").notNull().default(0),
    price: integer("price").notNull().default(0),
    currency: text("currency").notNull().default("eur"),
    stripeProductId: text("stripeProductId"),
    stripePriceId: text("stripePriceId"),
    createdAt,
    updatedAt,
  },
  (table) => ({
    clerkUserIdIndex: index("events_clerk_user_id_idx").on(table.clerkUserId),
  })
);

export const ScheduleTable = pgTable("schedules", {
  id: uuid("id").primaryKey().defaultRandom(),
  timezone: text("timezone").notNull(),
  clerkUserId: text("clerkUserId").notNull().unique(),
  createdAt,
  updatedAt,
});

export const scheduleRelations = relations(ScheduleTable, ({ many }) => ({
  availabilities: many(ScheduleAvailabilityTable),
}));

export const scheduleDayOfWeekEnum = pgEnum("day", DAYS_OF_WEEK_IN_ORDER);

export const ScheduleAvailabilityTable = pgTable(
  "scheduleAvailabilities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    scheduleId: uuid("scheduleId")
      .notNull()
      .references(() => ScheduleTable.id, { onDelete: "cascade" }),
    startTime: text("startTime").notNull(),
    endTime: text("endTime").notNull(),
    dayOfWeek: scheduleDayOfWeekEnum("dayOfWeek").notNull(),
  },
  (table) => ({
    scheduleIdIndex: index("scheduleIdIndex").on(table.scheduleId),
  })
);

export const ScheduleAvailabilityRelations = relations(
  ScheduleAvailabilityTable,
  ({ one }) => ({
    schedule: one(ScheduleTable, {
      fields: [ScheduleAvailabilityTable.scheduleId],
      references: [ScheduleTable.id],
    }),
  })
);

export const MeetingTable = pgTable(
  "meetings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("eventId")
      .notNull()
      .references(() => EventTable.id),
    clerkUserId: text("clerkUserId").notNull(),
    guestEmail: text("guestEmail").notNull(),
    guestName: text("guestName").notNull(),
    guestNotes: text("guestNotes"),
    startTime: timestamp("startTime").notNull(),
    endTime: timestamp("endTime").notNull(),
    timezone: text("timezone").notNull(),
    meetingUrl: text("meetingUrl"),
    paymentIntentId: text("paymentIntentId"),
    createdAt,
    updatedAt,
  },
  (table) => ({
    clerkUserIdIndex: index("meetings_clerkUserId_idx").on(table.clerkUserId),
    eventIdIndex: index("meetings_eventId_idx").on(table.eventId),
    paymentIntentIdIndex: index("meetings_paymentIntentId_idx").on(
      table.paymentIntentId
    ),
  })
);

export const meetingRelations = relations(MeetingTable, ({ one }) => ({
  event: one(EventTable, {
    fields: [MeetingTable.eventId],
    references: [EventTable.id],
  }),
}));

export const ProfileTable = pgTable(
  "profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clerkUserId: text("clerkUserId").notNull().unique(),
    profilePicture: text("profilePicture"),
    firstName: text("firstName").notNull(),
    lastName: text("lastName").notNull(),
    headline: text("headline"),
    shortBio: text("shortBio"),
    longBio: text("longBio"),
    socialLinks: json("socialLinks").$type<
      Array<{
        name: SocialMediaPlatform;
        url: string;
      }>
    >(),
    isVerified: boolean("isVerified").notNull().default(false),
    isTopExpert: boolean("isTopExpert").notNull().default(false),
    createdAt,
    updatedAt,
  },
  (table) => ({
    clerkUserIdIndex: index("profiles_clerk_user_id_idx").on(table.clerkUserId),
  })
);

export const profileRelations = relations(ProfileTable, ({ many }) => ({
  meetings: many(MeetingTable),
  events: many(EventTable),
}));
