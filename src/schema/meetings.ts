import { startOfDay } from 'date-fns';
import { z } from 'zod';

/**
 * Base schema for meeting guest information.
 *
 * Supports two paths:
 * - Authenticated: guestEmail/guestName still collected (pre-filled, read-only in UI)
 *   but the real identifier is authenticatedWorkosUserId.
 * - Guest: guestEmail/guestName required; shadow WorkOS user created server-side.
 */
const meetingSchemaBase = z.object({
  startTime: z.date().min(new Date()),
  guestEmail: z.string().email().min(1, 'Required'),
  guestName: z.string().min(1, 'Required'),
  guestNotes: z.string().optional(),
  timezone: z.string().min(1, 'Required'),
});

/**
 * Schema for the UI form (MeetingForm component).
 * Includes a date field and optional authenticatedWorkosUserId for logged-in users.
 */
export const meetingFormSchema = z
  .object({
    date: z.date().min(startOfDay(new Date()), 'Must be in the future'),
  })
  .merge(meetingSchemaBase);

/**
 * Schema for the createMeeting server action.
 *
 * When `authenticatedWorkosUserId` is provided the booking belongs to a known
 * user and no shadow user is created. Otherwise the server action calls
 * `createOrGetGuestUser` with the supplied email/name.
 */
export const meetingActionSchema = z.object({
  eventId: z.string().uuid(),
  workosUserId: z.string(),
  guestEmail: z.string().email(),
  guestName: z.string(),
  guestNotes: z.string().optional(),
  timezone: z.string(),
  startTime: z.date(),
  authenticatedWorkosUserId: z.string().optional(),
  stripePaymentIntentId: z.string().optional(),
  stripeSessionId: z.string().optional(),
  stripePaymentStatus: z
    .enum(['pending', 'processing', 'succeeded', 'failed', 'refunded', 'unpaid', 'paid'])
    .optional(),
  stripeAmount: z.number().optional(),
  stripeApplicationFeeAmount: z.number().optional(),
  locale: z.string().default('en'),
});
