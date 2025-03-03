-- Add isPublished column to profiles table
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "isPublished" boolean NOT NULL DEFAULT false; 