-- Add foreign key constraints
ALTER TABLE "events"
  ADD CONSTRAINT "events_clerk_user_id_fkey" 
  FOREIGN KEY ("clerkUserId") 
  REFERENCES "users"("clerkUserId") 
  ON DELETE CASCADE;

ALTER TABLE "schedules"
  ADD CONSTRAINT "schedules_clerk_user_id_fkey" 
  FOREIGN KEY ("clerkUserId") 
  REFERENCES "users"("clerkUserId") 
  ON DELETE CASCADE;

ALTER TABLE "meetings"
  ADD CONSTRAINT "meetings_clerk_user_id_fkey" 
  FOREIGN KEY ("clerkUserId") 
  REFERENCES "users"("clerkUserId") 
  ON DELETE CASCADE;

ALTER TABLE "profiles"
  ADD CONSTRAINT "profiles_clerk_user_id_fkey" 
  FOREIGN KEY ("clerkUserId") 
  REFERENCES "users"("clerkUserId") 
  ON DELETE CASCADE; 