import { DAYS_OF_WEEK_In_ORDER } from "@/app/data/constants"; // Importing constants for days of the week
import { table } from "console"; // Unused import, can be removed
import { relations } from "drizzle-orm"; // Importing relations for defining relationships between tables
import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core"; // Importing types for defining table columns

// Define a timestamp for when records are created
const createdAt = timestamp("createdAt").notNull().defaultNow();
// Define a timestamp for when records are updated, with automatic updates
const updatedAt = timestamp("updatedAt")
  .notNull()
  .defaultNow()
  .$onUpdate(() => new Date());

// Events Table Definition
export const EventTable = pgTable(
  "events", // Name of the table
  {
    id: uuid("id").primaryKey().defaultRandom(), // Unique identifier for each event
    name: text("name").notNull(), // Name of the event
    description: text("description"), // Description of the event
    durationInMinutes: integer("durationInMinutes").notNull(), // Duration of the event in minutes
    clerkUserId: text("clerkUserId").notNull(), // ID of the user managing the event
    isActive: boolean("isActive").notNull().default(true), // Status of the event (active/inactive)
    createdAt, // Timestamp for creation
    updatedAt, // Timestamp for last update
  },
  (table) => ({
    clerkUserIdIndex: index("clerkUserIdIndex").on(table.clerkUserId), // Index for quick lookup by clerkUserId
  })
);

// Schedule Table Definition
export const ScheduleTable = pgTable("schedules", {
  id: uuid("id").primaryKey().defaultRandom(), // Unique identifier for each schedule
  timezone: text("timezone").notNull(), // Timezone for the schedule
  clerkUserId: text("clerkUserId").notNull().unique(), // Unique ID of the user associated with the schedule
  createdAt, // Timestamp for creation
  updatedAt, // Timestamp for last update
});

// Define relationships: Every ScheduleTable has many relations with ScheduleAvailabilityTable
export const scheduleRelations = relations(ScheduleTable, ({ many }) => ({
  availabilities: many(ScheduleAvailabilityTable), // One schedule can have many availabilities
}));

// Enum for days of the week
export const scheduleDayOfWeekEnum = pgEnum("day", DAYS_OF_WEEK_In_ORDER);

// Schedule Availability Table Definition
export const ScheduleAvailabilityTable = pgTable(
  "scheduleAvailabities", // Name of the table (note: typo in "Availabities")
  {
    id: uuid("id").primaryKey().defaultRandom(), // Unique identifier for each availability
    scheduleId: uuid("scheduleId")
      .notNull()
      .references(() => ScheduleTable.id, { onDelete: "cascade" }), // Foreign key referencing ScheduleTable
    startTime: text("startTime").notNull(), // Start time of the availability
    dayOfWeek: scheduleDayOfWeekEnum("dayOfWeek").notNull(), // Day of the week for the availability
  },
  (table) => ({
    scheduleIdIndex: index("scheduleIdIndex").on(table.scheduleId), // Index for quick lookup by scheduleId
  })
);

// Define relationships for ScheduleAvailabilityTable
export const ScheduleAvailabilityRelations = relations(
  ScheduleAvailabilityTable,
  ({ one }) => ({
    schecule: one(ScheduleTable, {
      // Relationship to ScheduleTable
      fields: [ScheduleAvailabilityTable.scheduleId], // Field in ScheduleAvailabilityTable
      references: [ScheduleTable.id], // Reference to the id in ScheduleTable
    }),
  })
);
