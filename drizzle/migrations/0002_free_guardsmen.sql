CREATE TABLE IF NOT EXISTS "profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerkUserId" text NOT NULL,
	"profilePicture" text,
	"fullName" text NOT NULL,
	"role" text,
	"shortBio" text,
	"longBio" text,
	"socialLinks" json,
	"isVerified" boolean DEFAULT false NOT NULL,
	"isTopExpert" boolean DEFAULT false NOT NULL,
	"promotion" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "profiles_clerkUserId_unique" UNIQUE("clerkUserId")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "profiles_clerk_user_id_idx" ON "profiles" USING btree ("clerkUserId");