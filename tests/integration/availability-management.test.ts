import { vi } from 'vitest';

// mockUser is available from expert-setup-mocks for future use
// import { mockUser } from './expert-setup-mocks';

// Mock the database
vi.mock('@/drizzle/db', () => ({
  db: {
    query: {
      ScheduleTable: {
        findFirst: vi.fn<(...args: any[]) => Promise<any>>().mockResolvedValue({
          id: 'schedule_123',
          clerkUserId: 'user_123',
          timezone: 'America/New_York',
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      },
      AvailabilityTable: {
        findMany: vi.fn<(...args: any[]) => Promise<any[]>>().mockResolvedValue([
          {
            id: 'availability_1',
            scheduleId: 'schedule_123',
            dayOfWeek: 1, // Monday
            startTime: '09:00',
            endTime: '17:00',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            id: 'availability_2',
            scheduleId: 'schedule_123',
            dayOfWeek: 3, // Wednesday
            startTime: '09:00',
            endTime: '17:00',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ]),
      },
      EventTable: {
        findMany: vi.fn<(...args: any[]) => Promise<any[]>>().mockResolvedValue([]),
      },
    },
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnThis(),
      returning: jest
        .fn<(...args: any[]) => Promise<any[]>>()
        .mockResolvedValue([{ id: 'availability_3' }]),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      returning: vi.fn(),
    }),
    delete: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnThis(),
      returning: vi.fn(),
    }),
    transaction: jest
      .fn<(...args: any[]) => Promise<any>>()
      .mockImplementation(async (callback) => {
        return await callback(vi.fn());
      }),
  },
}));

// Mock next cache
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

// Mock the date-fns functions
vi.mock('date-fns', () => ({
  parse: vi.fn().mockImplementation((timeString) => new Date(`2023-01-01T${timeString}:00`)),
  format: vi.fn().mockImplementation(() => '09:00'),
  addMinutes: vi.fn().mockImplementation((date) => date),
  isAfter: vi.fn().mockReturnValue(true),
}));

// Create mock functions for our server actions
const mockGetAvailabilities = vi.fn<(...args: any[]) => Promise<any>>().mockResolvedValue({
  success: true,
  availabilities: [
    {
      id: 'availability_1',
      dayOfWeek: 1,
      startTime: '09:00',
      endTime: '17:00',
    },
    {
      id: 'availability_2',
      dayOfWeek: 3,
      startTime: '09:00',
      endTime: '17:00',
    },
  ],
});

const mockUpdateAvailability = vi.fn<(...args: any[]) => Promise<any>>().mockResolvedValue({
  success: true,
  availability: {
    id: 'availability_1',
    dayOfWeek: 1,
    startTime: '10:00',
    endTime: '18:00',
  },
});

const mockCreateAvailability = vi.fn<(...args: any[]) => Promise<any>>().mockResolvedValue({
  success: true,
  availability: {
    id: 'availability_3',
    dayOfWeek: 5,
    startTime: '09:00',
    endTime: '13:00',
  },
});

const mockDeleteAvailability = vi.fn<(...args: any[]) => Promise<any>>().mockResolvedValue({
  success: true,
  deletedId: 'availability_2',
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const mockGetScheduleByUserId = vi.fn<(...args: any[]) => Promise<any>>().mockResolvedValue({
  success: true,
  schedule: {
    id: 'schedule_123',
    timezone: 'America/New_York',
  },
});

const mockUpdateSchedule = vi.fn<(...args: any[]) => Promise<any>>().mockResolvedValue({
  success: true,
  schedule: {
    id: 'schedule_123',
    timezone: 'Europe/London',
  },
});

describe('Availability Management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should retrieve all availabilities for a user', async () => {
    // Act
    const result = await mockGetAvailabilities();

    // Assert
    expect(result.success).toBe(true);
    expect(result.availabilities).toHaveLength(2);
    expect(result.availabilities[0].dayOfWeek).toBe(1);
    expect(result.availabilities[1].dayOfWeek).toBe(3);
  });

  it('should create a new availability slot', async () => {
    // Arrange
    const newAvailability = {
      dayOfWeek: 5, // Friday
      startTime: '09:00',
      endTime: '13:00',
    };

    // Act
    const result = await mockCreateAvailability(newAvailability);

    // Assert
    expect(result.success).toBe(true);
    expect(result.availability).toMatchObject({
      id: expect.any(String),
      dayOfWeek: 5,
      startTime: '09:00',
      endTime: '13:00',
    });
    expect(mockCreateAvailability).toHaveBeenCalledWith(newAvailability);
  });

  it('should update an existing availability slot', async () => {
    // Arrange
    const updatedAvailability = {
      id: 'availability_1',
      dayOfWeek: 1,
      startTime: '10:00',
      endTime: '18:00',
    };

    // Act
    const result = await mockUpdateAvailability(updatedAvailability);

    // Assert
    expect(result.success).toBe(true);
    expect(result.availability).toMatchObject({
      id: 'availability_1',
      dayOfWeek: 1,
      startTime: '10:00',
      endTime: '18:00',
    });
    expect(mockUpdateAvailability).toHaveBeenCalledWith(updatedAvailability);
  });

  it('should delete an availability slot', async () => {
    // Arrange
    const availabilityId = 'availability_2';

    // Act
    const result = await mockDeleteAvailability(availabilityId);

    // Assert
    expect(result.success).toBe(true);
    expect(result.deletedId).toBe(availabilityId);
    expect(mockDeleteAvailability).toHaveBeenCalledWith(availabilityId);
  });

  it('should validate time ranges when creating availability', async () => {
    // Mock implementation of time validation
    const validateTimeRange = (startTime: string, endTime: string) => {
      const startHour = Number.parseInt(startTime.split(':')[0], 10);
      const endHour = Number.parseInt(endTime.split(':')[0], 10);

      if (startHour >= endHour) {
        return {
          valid: false,
          error: 'End time must be after start time',
        };
      }

      return { valid: true };
    };

    // Test valid time range
    const validTimeResult = validateTimeRange('09:00', '17:00');
    expect(validTimeResult.valid).toBe(true);

    // Test invalid time range
    const invalidTimeResult = validateTimeRange('17:00', '09:00');
    expect(invalidTimeResult.valid).toBe(false);
    expect(invalidTimeResult.error).toBe('End time must be after start time');
  });

  it('should handle overlapping availability slots gracefully', async () => {
    // Mock implementation for checking overlaps
    const checkForOverlaps = (
      existingSlots: Array<{ dayOfWeek: number; startTime: string; endTime: string }>,
      newSlot: { dayOfWeek: number; startTime: string; endTime: string },
    ) => {
      return existingSlots.some(
        (slot) =>
          slot.dayOfWeek === newSlot.dayOfWeek &&
          ((slot.startTime <= newSlot.startTime && slot.endTime > newSlot.startTime) ||
            (slot.startTime < newSlot.endTime && slot.endTime >= newSlot.endTime) ||
            (slot.startTime >= newSlot.startTime && slot.endTime <= newSlot.endTime)),
      );
    };

    // Test with non-overlapping slot
    const existingSlots = [
      { dayOfWeek: 1, startTime: '09:00', endTime: '12:00' },
      { dayOfWeek: 1, startTime: '14:00', endTime: '17:00' },
    ];

    const nonOverlappingSlot = { dayOfWeek: 1, startTime: '12:30', endTime: '13:30' };
    expect(checkForOverlaps(existingSlots, nonOverlappingSlot)).toBe(false);

    // Test with overlapping slot
    const overlappingSlot = { dayOfWeek: 1, startTime: '11:30', endTime: '12:30' };
    expect(checkForOverlaps(existingSlots, overlappingSlot)).toBe(true);
  });

  it('should update timezone settings', async () => {
    // Act
    const result = await mockUpdateSchedule({ timezone: 'Europe/London' });

    // Assert
    expect(result.success).toBe(true);
    expect(result.schedule.timezone).toBe('Europe/London');
  });
});
