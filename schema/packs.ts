import { z } from 'zod';

export const packFormSchema = z.object({
  eventId: z.string().uuid('Invalid event ID'),
  name: z.string().min(1, 'Required').max(100, 'Name must be 100 characters or less'),
  description: z.string().max(500, 'Description must be 500 characters or less').optional(),
  sessionsCount: z.coerce
    .number()
    .int()
    .min(2, 'Pack must include at least 2 sessions')
    .max(50, 'Pack cannot exceed 50 sessions'),
  price: z.number().min(1, 'Price must be greater than 0'),
  currency: z.literal('eur'),
  isActive: z.boolean().default(true),
  expirationDays: z.coerce
    .number()
    .int()
    .min(30, 'Expiration must be at least 30 days')
    .max(365, 'Expiration cannot exceed 365 days')
    .default(180),
  stripeProductId: z.string().optional(),
  stripePriceId: z.string().optional(),
});
