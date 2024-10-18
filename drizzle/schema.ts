import { table } from "console";
import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

const createdAt = timestamp("createdAt").notNull().defaultNow();
const updatedAt = timestamp("updatedAt")
  .notNull()
  .defaultNow()
  .$onUpdate(() => new Date());

// Events
export const EventTable = pgTable(
  "events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    description: text("description"),
    durationInMinutes: integer("durationInMinutes").notNull(),
    clerkUserId: text("clerkUserId").notNull(),
    isActive: boolean("isActive").notNull().default(true),
    createdAt,
    updatedAt,
  },
  (table) => ({
    clerkUserIdIndex: index("clerkUserIdIndex").on(table.clerkUserId),
  })
);

// Schedule
export const ScheduleTable = pgTable("schedules", {
  id: uuid("id").primaryKey().defaultRandom(),
  timezone: text("timezone").notNull(),
  clerkUserId: text("clerkUserId").notNull().unique(),
  createdAt,
  updatedAt,
});

export const scheduleDayOfWeekEnum = pgEnum("day");

// Contect the Schedule with the availability
export const ScheduleAvailabilityTable = pgTable("scheduleAvailabities", {
  id: uuid("id").primaryKey().defaultRandom(),
  scheduleId: uuid("scheduleId")
    .notNull()
    .references(() => ScheduleTable.id, { onDelete: "cascade" }),
  startTime: text("startTime").notNull(),
  dayOfWeek: scheduleDayOfWeekEnum("dayOfWeek").notNull(),
});
