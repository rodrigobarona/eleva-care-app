import { describe, expect, it, jest, beforeEach } from "@jest/globals";
import { createMeeting } from "@/server/actions/meetings";
import type { Meeting } from "@/types/meeting";
import type { Event } from "@/types/event";
import type { InferSelectModel } from "drizzle-orm";
import { MeetingTable, EventTable } from "@/drizzle/schema";
import { db } from "@/drizzle/db";
import { getValidTimesFromSchedule } from "@/lib/getValidTimesFromSchedule";
import { createCalendarEvent } from "@/server/googleCalendar";
import { logAuditEvent } from "@/lib/logAuditEvent";
import { addMinutes } from "date-fns";
import type { calendar_v3 } from "googleapis";

type DbMeeting = InferSelectModel<typeof MeetingTable>;
type DbEvent = InferSelectModel<typeof EventTable>;

// Mock modules
jest.mock("@/schema/meetings", () => ({
  meetingActionSchema: {
    safeParse: jest.fn((data: Record<string, unknown>) => {
      // Validate required fields
      const requiredFields = [
        "eventId",
        "clerkUserId",
        "guestEmail",
        "guestName",
        "timezone",
        "startTime",
      ];

      const missingFields = requiredFields.filter((field) => !(field in data));
      if (missingFields.length > 0) {
        return {
          success: false,
          error: new Error(
            `Missing required fields: ${missingFields.join(", ")}`
          ),
        };
      }

      // Validate email format
      const guestEmail = data.guestEmail as string;
      if (!guestEmail.includes("@")) {
        return {
          success: false,
          error: new Error("Invalid email format"),
        };
      }

      // Validate UUID format for eventId
      const eventId = data.eventId as string;
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(eventId)) {
        return {
          success: false,
          error: new Error("Invalid eventId format"),
        };
      }

      return {
        success: true,
        data,
      };
    }),
  },
}));

const mockCalendarEvent = {
  conferenceData: {
    entryPoints: [{ uri: "https://meet.google.com/test" }],
  },
} as const;

const mockGoogleCalendar = {
  __esModule: true,
  default: {
    getInstance: () => ({
      getCalendarEventTimes: () =>
        Promise.resolve([
          {
            start: new Date("2024-02-18T09:00:00Z"),
            end: new Date("2024-02-18T10:00:00Z"),
          },
        ]),
      createCalendarEvent: () => Promise.resolve(mockCalendarEvent),
    }),
  },
  createCalendarEvent: () => Promise.resolve(mockCalendarEvent),
};

jest.mock("@/server/googleCalendar", () => ({
  ...mockGoogleCalendar,
  createCalendarEvent: jest.fn() as jest.Mock,
}));

const mockDb = {
  db: {
    query: {
      MeetingTable: {
        findFirst: jest.fn() as jest.Mock,
      },
      EventTable: {
        findFirst: jest.fn() as jest.Mock,
      },
    },
    insert: jest.fn() as jest.Mock,
  },
};

jest.mock("@/drizzle/db", () => mockDb);
jest.mock("@/lib/getValidTimesFromSchedule", () => ({
  getValidTimesFromSchedule: jest.fn() as jest.Mock,
}));
jest.mock("@/lib/logAuditEvent", () => ({
  logAuditEvent: jest.fn() as jest.Mock,
}));
jest.mock("next/headers", () => ({
  headers: () =>
    new Map([
      ["x-forwarded-for", "127.0.0.1"],
      ["user-agent", "test-agent"],
    ]),
}));

describe("Meeting Actions", () => {
  const mockDate = new Date("2024-02-18T10:00:00Z");
  const validMeetingData = {
    eventId: "123e4567-e89b-12d3-a456-426614174000",
    clerkUserId: "user-123",
    guestEmail: "guest@example.com",
    guestName: "John Doe",
    startTime: mockDate,
    timezone: "America/New_York",
    stripePaymentIntentId: "pi_123",
    stripePaymentStatus: "succeeded" as const,
    stripeAmount: 5000,
  };

  const mockEvent: DbEvent = {
    id: "123e4567-e89b-12d3-a456-426614174000",
    clerkUserId: "user-123",
    name: "Test Event",
    slug: "test-event",
    description: "Test Description",
    durationInMinutes: 60,
    isActive: true,
    order: 0,
    price: 0,
    currency: "eur",
    stripeProductId: null,
    stripePriceId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockMeeting: DbMeeting = {
    id: "meeting-123",
    eventId: validMeetingData.eventId,
    clerkUserId: validMeetingData.clerkUserId,
    guestEmail: validMeetingData.guestEmail,
    guestName: validMeetingData.guestName,
    guestNotes: null,
    startTime: validMeetingData.startTime,
    endTime: addMinutes(mockDate, 60),
    timezone: validMeetingData.timezone,
    meetingUrl: "https://meet.google.com/test",
    stripePaymentIntentId: validMeetingData.stripePaymentIntentId,
    stripeSessionId: null,
    stripePaymentStatus: validMeetingData.stripePaymentStatus,
    stripeAmount: validMeetingData.stripeAmount,
    stripeApplicationFeeAmount: null,
    stripeApplicationFeeId: null,
    stripeRefundId: null,
    stripeMetadata: null,
    stripeTransferId: null,
    stripeTransferAmount: null,
    stripeTransferStatus: "pending",
    stripeTransferScheduledAt: null,
    stripePayoutId: null,
    stripePayoutAmount: null,
    stripePayoutFailureCode: null,
    stripePayoutFailureMessage: null,
    stripePayoutPaidAt: null,
    lastProcessedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock database queries with default values
    mockDb.db.query.MeetingTable.findFirst.mockResolvedValue(null);
    mockDb.db.query.EventTable.findFirst.mockResolvedValue(mockEvent);
    (getValidTimesFromSchedule as jest.Mock).mockResolvedValue([mockDate]);

    // Mock database insert
    const mockInsert = {
      values: jest.fn().mockReturnThis(),
      returning: jest.fn().mockResolvedValue([mockMeeting]),
    };
    mockDb.db.insert.mockReturnValue(mockInsert);
  });

  describe("createMeeting", () => {
    it("should successfully create a meeting with valid data", async () => {
      const result = await createMeeting(validMeetingData);

      expect(result.error).toBe(false);
      expect(result.meeting).toBeDefined();
      expect(result.meeting?.meetingUrl).toBe("https://meet.google.com/test");
      expect(logAuditEvent).toHaveBeenCalled();
    });

    it("should return existing meeting if duplicate booking is found", async () => {
      mockDb.db.query.MeetingTable.findFirst.mockResolvedValueOnce(mockMeeting);

      const result = await createMeeting(validMeetingData);
      expect(result).toEqual({
        error: false,
        meeting: mockMeeting,
      });
    });

    it("should handle conflicting bookings", async () => {
      mockDb.db.query.MeetingTable.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockMeeting);

      const result = await createMeeting(validMeetingData);
      expect(result).toEqual({
        error: true,
        code: "SLOT_ALREADY_BOOKED",
        message:
          "This time slot has just been booked by another user. Please choose a different time.",
      });
    });

    it("should handle inactive or non-existent events", async () => {
      mockDb.db.query.EventTable.findFirst.mockResolvedValue(null);

      const result = await createMeeting(validMeetingData);
      expect(result).toEqual({
        error: true,
        code: "EVENT_NOT_FOUND",
      });
    });

    it("should handle invalid time slots", async () => {
      (getValidTimesFromSchedule as jest.Mock).mockResolvedValue([]);

      const result = await createMeeting(validMeetingData);
      expect(result).toEqual({
        error: true,
        code: "INVALID_TIME_SLOT",
      });
    });

    it("should handle calendar creation failures", async () => {
      (createCalendarEvent as jest.Mock).mockRejectedValue(
        new Error("Calendar API error")
      );

      const result = await createMeeting(validMeetingData);
      expect(result).toEqual({
        error: true,
        code: "CREATION_ERROR",
      });
    });

    it("should validate input data", async () => {
      const result = await createMeeting({
        ...validMeetingData,
        guestEmail: "invalid-email",
      });

      expect(result.error).toBe(true);
      expect(result.code).toBe("VALIDATION_ERROR");
    });

    it("should handle database errors gracefully", async () => {
      mockDb.db.insert.mockImplementation(() => {
        throw new Error("Database error");
      });

      const result = await createMeeting(validMeetingData);

      expect(result.error).toBe(true);
      expect(result.code).toBe("UNEXPECTED_ERROR");
    });
  });
});
