ALTER TABLE "seismic_calculations" ADD COLUMN IF NOT EXISTS "notes_updated_at" timestamp;--> statement-breakpoint
ALTER TABLE "seismic_calculations" ADD COLUMN IF NOT EXISTS "notes_updated_by" text;
