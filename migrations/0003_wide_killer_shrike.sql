CREATE TABLE "calculation_note_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"calculation_id" integer NOT NULL,
	"previous_text" text,
	"edited_by" text,
	"edited_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "comparison_sets" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"calc_type" text NOT NULL,
	"calc_ids" integer[] NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" text
);
--> statement-breakpoint
CREATE TABLE "seismic_calculations" (
	"id" serial PRIMARY KEY NOT NULL,
	"calc_type" text NOT NULL,
	"soil_profile_id" integer,
	"object_id" integer,
	"input_params" jsonb NOT NULL,
	"results" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" text,
	"notes" text,
	"notes_updated_at" timestamp,
	"notes_updated_by" text
);
--> statement-breakpoint
ALTER TABLE "calculation_note_history" ADD CONSTRAINT "calculation_note_history_calculation_id_seismic_calculations_id_fk" FOREIGN KEY ("calculation_id") REFERENCES "public"."seismic_calculations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seismic_calculations" ADD CONSTRAINT "seismic_calculations_soil_profile_id_soil_profiles_id_fk" FOREIGN KEY ("soil_profile_id") REFERENCES "public"."soil_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seismic_calculations" ADD CONSTRAINT "seismic_calculations_object_id_infrastructure_objects_id_fk" FOREIGN KEY ("object_id") REFERENCES "public"."infrastructure_objects"("id") ON DELETE no action ON UPDATE no action;