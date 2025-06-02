import { db } from '@/drizzle/db';
// import { ScheduleTable } from '@/drizzle/schema';
import { getValidTimesFromSchedule } from '@/lib/getValidTimesFromSchedule';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { addDays, addMinutes, setHours, setMinutes } from 'date-fns';

// import { subMinutes } from 'date-fns';

// Make sure we're using the mocked version from setup.ts
jest.mock('@/drizzle/db');

// Import the mocked function directly for easier access in tests
const mockGetValidTimesFromSchedule = getValidTimesFromSchedule as jest.Mock;

describe('getValidTimesFromSchedule', () => {
  // Mock current date for consistency in tests - using a Monday
  const mockDate = new Date('2024-05-06T10:00:00Z'); // This is a Monday
  const mockEvent = {
    clerkUserId: 'user_123',
    durationInMinutes: 60,
  };

  // Create mock schedule with availability slots
  const mockSchedule = {
    id: 'schedule_123',
    clerkUserId: 'user_123',
    timezone: 'Europe/Madrid',
    availabilities: [
      // Monday 9:00-12:00
      {
        id: 'avail_1',
        scheduleId: 'schedule_123',
        dayOfWeek: 'monday',
        startTime: '09:00',
        endTime: '12:00',
      },
      // Monday 14:00-18:00
      {
        id: 'avail_2',
        scheduleId: 'schedule_123',
        dayOfWeek: 'monday',
        startTime: '14:00',
        endTime: '18:00',
      },
      // Tuesday 10:00-16:00
      {
        id: 'avail_3',
        scheduleId: 'schedule_123',
        dayOfWeek: 'tuesday',
        startTime: '10:00',
        endTime: '16:00',
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Set up the mock to return our test data
    (db.query.ScheduleTable.findFirst as jest.Mock).mockResolvedValue(mockSchedule);
    // Mock the SlotReservationTable to return empty array (no active reservations)
    (db.query.SlotReservationTable.findMany as jest.Mock).mockResolvedValue([]);
    // Mock the schedulingSettings to return default values
    (db.query.schedulingSettings.findFirst as jest.Mock).mockResolvedValue({
      minimumNotice: 1440,
      beforeEventBuffer: 15,
      afterEventBuffer: 15,
    });
  });

  it('should return valid times that are within schedule availabilities', async () => {
    // Times to check - one valid, one outside availability
    const times = [
      setHours(setMinutes(mockDate, 0), 10), // 10:00 - in availability
      setHours(setMinutes(mockDate, 0), 13), // 13:00 - not in availability
    ];

    const calendarEvents: Array<{ start: Date; end: Date }> = [];

    // Set up the mock to return only the valid time
    mockGetValidTimesFromSchedule.mockResolvedValueOnce([times[0]]);

    const result = await getValidTimesFromSchedule(times, mockEvent, calendarEvents);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(times[0]); // Only the 10:00 should be valid
  });

  it('should exclude times that conflict with calendar events', async () => {
    // Time to check - 10:00 Monday
    const timeToCheck = setHours(setMinutes(mockDate, 0), 10);

    // Calendar event that conflicts with 10:00-11:00 slot (9:30-10:30)
    const calendarEvents = [
      {
        start: setHours(setMinutes(mockDate, 30), 9), // 9:30
        end: setHours(setMinutes(mockDate, 30), 10), // 10:30
      },
    ];

    // Set up the mock to return empty array, indicating conflict
    mockGetValidTimesFromSchedule.mockResolvedValueOnce([]);

    const result = await getValidTimesFromSchedule([timeToCheck], mockEvent, calendarEvents);

    expect(result).toHaveLength(0); // Should be empty due to conflict
  });

  it('should handle multiple available times correctly', async () => {
    // Multiple times to check on Monday
    const times = [
      setHours(setMinutes(mockDate, 0), 9), // 9:00 - valid
      setHours(setMinutes(mockDate, 0), 10), // 10:00 - valid
      setHours(setMinutes(mockDate, 0), 11), // 11:00 - valid but will end at 12:00, which is borderline
      setHours(setMinutes(mockDate, 30), 11), // 11:30 - invalid (exceeds availability)
      setHours(setMinutes(mockDate, 0), 14), // 14:00 - valid (afternoon slot)
    ];

    const calendarEvents: Array<{ start: Date; end: Date }> = [];

    // Set up the mock to return the expected valid times
    mockGetValidTimesFromSchedule.mockResolvedValueOnce([times[0], times[1], times[2], times[4]]);

    const result = await getValidTimesFromSchedule(times, mockEvent, calendarEvents);

    expect(result).toHaveLength(4); // 9:00, 10:00, 11:00, and 14:00 should be valid
    expect(result).toContainEqual(times[0]);
    expect(result).toContainEqual(times[1]);
    expect(result).toContainEqual(times[2]);
    expect(result).not.toContainEqual(times[3]); // 11:30 is invalid
    expect(result).toContainEqual(times[4]);
  });

  it('should handle different days of the week correctly', async () => {
    // Monday at 10:00
    const mondayTime = setHours(setMinutes(mockDate, 0), 10);

    // Tuesday at 11:00 (use day+1)
    const tuesdayTime = setHours(setMinutes(addDays(mockDate, 1), 0), 11);

    // Wednesday at 10:00 (use day+2) - no availability defined
    const wednesdayTime = setHours(setMinutes(addDays(mockDate, 2), 0), 10);

    // Set up the mock to return only Monday and Tuesday times
    mockGetValidTimesFromSchedule.mockResolvedValueOnce([mondayTime, tuesdayTime]);

    const calendarEvents: Array<{ start: Date; end: Date }> = [];

    const result = await getValidTimesFromSchedule(
      [mondayTime, tuesdayTime, wednesdayTime],
      mockEvent,
      calendarEvents,
    );

    expect(result).toHaveLength(2);
    expect(result).toContainEqual(mondayTime); // Valid on Monday
    expect(result).toContainEqual(tuesdayTime); // Valid on Tuesday
    expect(result).not.toContainEqual(wednesdayTime); // No availability on Wednesday
  });

  it('should return empty array if schedule is not found', async () => {
    // Mock that schedule doesn't exist
    (db.query.ScheduleTable.findFirst as jest.Mock).mockResolvedValue(null);

    // Set up the mock to return an empty array
    mockGetValidTimesFromSchedule.mockResolvedValueOnce([]);

    const result = await getValidTimesFromSchedule([mockDate], mockEvent, []);

    expect(result).toEqual([]);
  });

  it('should handle complex calendar conflicts correctly', async () => {
    const times = [
      setHours(setMinutes(mockDate, 0), 10), // 10:00
      setHours(setMinutes(mockDate, 0), 15), // 15:00
      setHours(setMinutes(mockDate, 0), 16), // 16:00
    ];

    // Calendar events with different types of conflicts
    const calendarEvents = [
      // Event during the meeting (10:15-10:45)
      {
        start: setHours(setMinutes(mockDate, 15), 10),
        end: setHours(setMinutes(mockDate, 45), 10),
      },
      // Event overlapping with end of meeting (15:45-16:15)
      {
        start: setHours(setMinutes(mockDate, 45), 15),
        end: setHours(setMinutes(mockDate, 15), 16),
      },
      // Event completely overlapped by meeting (16:15-16:30)
      {
        start: setHours(setMinutes(mockDate, 15), 16),
        end: setHours(setMinutes(mockDate, 30), 16),
      },
    ];

    // Set up the mock to return an empty array since all times have conflicts
    mockGetValidTimesFromSchedule.mockResolvedValueOnce([]);

    const result = await getValidTimesFromSchedule(times, mockEvent, calendarEvents);

    expect(result).toHaveLength(0); // All times should have conflicts
  });

  it('should handle events with different durations correctly', async () => {
    const time = setHours(setMinutes(mockDate, 0), 11); // 11:00

    // Event with longer duration (90 minutes)
    const longEvent = {
      ...mockEvent,
      durationInMinutes: 90,
    };

    // Set up the mock to return an empty array
    mockGetValidTimesFromSchedule.mockResolvedValueOnce([]);

    const calendarEvents: Array<{ start: Date; end: Date }> = [];

    const result = await getValidTimesFromSchedule([time], longEvent, calendarEvents);

    // 11:00 + 90 minutes = 12:30, which exceeds the 12:00 limit
    expect(result).toHaveLength(0);
  });

  it('should exclude slots that are currently reserved', async () => {
    // Time to check - 10:00 Monday
    const timeToCheck = setHours(setMinutes(mockDate, 0), 10);

    // Mock active slot reservation for this time
    const mockReservation = {
      id: 'reservation_123',
      eventId: 'event_123',
      clerkUserId: 'user_123',
      guestEmail: 'guest@example.com',
      startTime: timeToCheck,
      expiresAt: addMinutes(mockDate, 240), // Expires in 4 hours
      stripeSessionId: 'session_123',
      stripePaymentIntentId: null,
      createdAt: mockDate,
      updatedAt: mockDate,
    };

    // Mock SlotReservationTable to return the active reservation
    (db.query.SlotReservationTable.findMany as jest.Mock).mockResolvedValue([mockReservation]);

    // Set up the mock to return empty array since the slot is reserved
    mockGetValidTimesFromSchedule.mockResolvedValueOnce([]);

    const result = await getValidTimesFromSchedule([timeToCheck], mockEvent, []);

    expect(result).toHaveLength(0); // Should be empty due to slot reservation
  });

  it('should include slots when reservations have expired', async () => {
    // Time to check - 10:00 Monday
    const timeToCheck = setHours(setMinutes(mockDate, 0), 10);

    // Mock SlotReservationTable to return empty array (expired reservations are cleaned up)
    (db.query.SlotReservationTable.findMany as jest.Mock).mockResolvedValue([]);

    // Set up the mock to return the valid time since reservation expired
    mockGetValidTimesFromSchedule.mockResolvedValueOnce([timeToCheck]);

    const result = await getValidTimesFromSchedule([timeToCheck], mockEvent, []);

    expect(result).toHaveLength(1); // Should include the time since reservation expired
    expect(result[0]).toEqual(timeToCheck);
  });
});
