-- Add google_calendar_event_id column to meetings table.
--
-- This column stores the Google Calendar event ID returned by events.insert
-- when a meeting is confirmed. It enables programmatic cancellation/patching
-- of the calendar event (e.g., expert cancel flow, future reschedule)
-- without searching the calendar by time range.
--
-- Backfill is intentionally not performed: existing meetings created before
-- this column was added will have NULL, and the cancel flow handles NULL
-- gracefully by skipping the calendar step (logs a warning and proceeds
-- with the Stripe refund + DB update).

ALTER TABLE meetings ADD COLUMN IF NOT EXISTS google_calendar_event_id text;
