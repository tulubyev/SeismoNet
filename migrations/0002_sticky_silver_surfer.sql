CREATE TABLE "developers" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"legal_form" text,
	"inn" text,
	"ogrn" text,
	"legal_address" text,
	"office_address" text,
	"website" text,
	"phone" text,
	"email" text,
	"contact_person" text,
	"total_area_thousand_sqm" numeric,
	"licenses" jsonb,
	"completed_objects" jsonb,
	"planned_objects" jsonb,
	"monitoring_status" text DEFAULT 'not_connected' NOT NULL,
	"monitoring_connected_date" timestamp,
	"monitoring_notes" text,
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "object_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"color" text DEFAULT '#64748b' NOT NULL,
	"icon" text,
	"description" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "object_categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "soil_profiles" ADD COLUMN "latitude" numeric;--> statement-breakpoint
ALTER TABLE "soil_profiles" ADD COLUMN "longitude" numeric;