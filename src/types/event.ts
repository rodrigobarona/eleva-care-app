export interface Event {
  id: string;
  clerkUserId: string;
  name: string;
  durationInMinutes: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
