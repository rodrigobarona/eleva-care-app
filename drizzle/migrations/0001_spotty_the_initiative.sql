ALTER TABLE "meetings" RENAME COLUMN "durationInMinutes" TO "meetingUrl";--> statement-breakpoint
ALTER TABLE "meetings" ALTER COLUMN "meetingUrl" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "meetings" ALTER COLUMN "meetingUrl" DROP NOT NULL;