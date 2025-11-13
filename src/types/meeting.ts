export interface Meeting {
  id: string;
  eventId: string;
  clerkUserId: string;
  guestEmail: string;
  guestName: string;
  startTime: Date;
  endTime: Date;
  timezone: string;
  meetingUrl: string;
  stripePaymentIntentId: string;
  stripePaymentStatus: 'succeeded';
  stripeAmount: number;
  createdAt: Date;
  updatedAt: Date;
  lastProcessedAt: Date | null;
}
