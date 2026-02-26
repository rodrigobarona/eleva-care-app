export interface Meeting {
  id: string;
  eventId: string;
  workosUserId: string;
  guestWorkosUserId: string;
  guestOrgId: string;
  /** @deprecated — kept for migration compatibility; use resolveGuestInfo() */
  guestEmail: string;
  /** @deprecated — kept for migration compatibility; use resolveGuestInfo() */
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
  deletedAt: Date | null;
  lastProcessedAt: Date | null;
}
