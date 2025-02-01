import { startOfDay } from "date-fns";
import { z } from "zod";

const meetingSchemaBase = z.object({
  startTime: z.date().min(new Date()),
  guestEmail: z.string().email().min(1, "Required"),
  guestName: z.string().min(1, "Required"),
  guestNotes: z.string().optional(),
  timezone: z.string().min(1, "Required"),
});

export const meetingFormSchema = z
  .object({
    date: z.date().min(startOfDay(new Date()), "Must be in the future"),
  })
  .merge(meetingSchemaBase);

export const meetingActionSchema = z.object({
  eventId: z.string().uuid(),
  clerkUserId: z.string(),
  guestEmail: z.string().email(),
  guestName: z.string(),
  timezone: z.string(),
  startTime: z.date(),
  guestNotes: z.string().optional(),
  stripePaymentIntentId: z.string().optional(),
  stripePaymentStatus: z.string().optional(),
  stripeAmount: z.number().optional(),
  stripeApplicationFeeAmount: z.number().optional(),
});
