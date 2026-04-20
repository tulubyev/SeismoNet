ALTER TABLE "infrastructure_objects" ADD COLUMN IF NOT EXISTS "k1_key" text DEFAULT 'elastic';--> statement-breakpoint
ALTER TABLE "infrastructure_objects" ADD COLUMN IF NOT EXISTS "k2_key" text DEFAULT 'wall_monolithic';--> statement-breakpoint
ALTER TABLE "infrastructure_objects" ALTER COLUMN "k1_key" SET DEFAULT 'elastic';--> statement-breakpoint
ALTER TABLE "infrastructure_objects" ALTER COLUMN "k2_key" SET DEFAULT 'wall_monolithic';
