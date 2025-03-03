CREATE TABLE IF NOT EXISTS "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"image" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "categories_name_unique" UNIQUE("name")
);
--> statement-breakpoint
DROP TABLE "permissions";--> statement-breakpoint
DROP TABLE "role_permissions";--> statement-breakpoint
DROP TABLE "user_roles";--> statement-breakpoint
DROP INDEX IF EXISTS "profiles_clerk_user_id_idx";--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "primaryCategoryId" uuid;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "secondaryCategoryId" uuid;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "published" boolean DEFAULT false NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "profiles" ADD CONSTRAINT "profiles_primaryCategoryId_categories_id_fk" FOREIGN KEY ("primaryCategoryId") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "profiles" ADD CONSTRAINT "profiles_secondaryCategoryId_categories_id_fk" FOREIGN KEY ("secondaryCategoryId") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "profiles_clerkUserId_idx" ON "profiles" USING btree ("clerkUserId");--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN IF EXISTS "primary_role";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN IF EXISTS "role";--> statement-breakpoint
DROP TYPE "public"."user_role";