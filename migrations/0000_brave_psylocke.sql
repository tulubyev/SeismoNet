CREATE TYPE "public"."user_role" AS ENUM('administrator', 'user', 'viewer');--> statement-breakpoint
CREATE TABLE "alerts" (
	"id" serial PRIMARY KEY NOT NULL,
	"alert_type" text NOT NULL,
	"severity" text NOT NULL,
	"message" text NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"related_entity_id" text,
	"related_entity_type" text,
	"is_read" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "building_norms" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"short_code" text NOT NULL,
	"name" text NOT NULL,
	"full_name" text,
	"category" text NOT NULL,
	"adoption_year" integer,
	"status" text DEFAULT 'active' NOT NULL,
	"supersedes" text,
	"description" text,
	"scope" text,
	"key_parameters" jsonb,
	"sections" jsonb,
	"url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "building_norms_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "calibration_afc" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" integer NOT NULL,
	"frequency" real NOT NULL,
	"amplitude" real NOT NULL,
	"phase" real
);
--> statement-breakpoint
CREATE TABLE "calibration_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"installation_id" integer,
	"session_date" timestamp NOT NULL,
	"operator" text NOT NULL,
	"sensitivity_z" real,
	"sensitivity_ns" real,
	"sensitivity_ew" real,
	"damping_ratio" real,
	"natural_frequency" real,
	"status" text DEFAULT 'complete' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "comparison_studies" (
	"id" serial PRIMARY KEY NOT NULL,
	"study_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"study_type" text NOT NULL,
	"primary_dataset" jsonb NOT NULL,
	"comparison_dataset" jsonb NOT NULL,
	"comparison_results" jsonb NOT NULL,
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"is_public" boolean DEFAULT false,
	CONSTRAINT "comparison_studies_study_id_unique" UNIQUE("study_id")
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_id" text NOT NULL,
	"region" text NOT NULL,
	"location" text,
	"latitude" numeric NOT NULL,
	"longitude" numeric NOT NULL,
	"depth" real NOT NULL,
	"magnitude" real NOT NULL,
	"type" text DEFAULT 'earthquake' NOT NULL,
	"status" text DEFAULT 'detected' NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"calculation_confidence" real,
	"data" jsonb,
	CONSTRAINT "events_event_id_unique" UNIQUE("event_id")
);
--> statement-breakpoint
CREATE TABLE "historical_analysis" (
	"id" serial PRIMARY KEY NOT NULL,
	"analysis_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"analysis_type" text NOT NULL,
	"time_frame" text NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"parameters" jsonb NOT NULL,
	"results" jsonb NOT NULL,
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"is_public" boolean DEFAULT false,
	CONSTRAINT "historical_analysis_analysis_id_unique" UNIQUE("analysis_id")
);
--> statement-breakpoint
CREATE TABLE "infrastructure_objects" (
	"id" serial PRIMARY KEY NOT NULL,
	"object_id" text NOT NULL,
	"name" text NOT NULL,
	"address" text,
	"object_type" text NOT NULL,
	"construction_year" integer,
	"floors" integer,
	"latitude" numeric NOT NULL,
	"longitude" numeric NOT NULL,
	"district" text,
	"developer" text,
	"structural_system" text,
	"foundation_type" text,
	"seismic_category" text,
	"design_intensity" integer,
	"technical_condition" text DEFAULT 'satisfactory',
	"description" text,
	"responsible_organization" text,
	"contact_person" text,
	"contact_phone" text,
	"is_monitored" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"metadata" jsonb,
	CONSTRAINT "infrastructure_objects_object_id_unique" UNIQUE("object_id")
);
--> statement-breakpoint
CREATE TABLE "maintenance_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"station_id" text NOT NULL,
	"maintenance_type" text NOT NULL,
	"performed_by" text NOT NULL,
	"performed_at" timestamp NOT NULL,
	"scheduled_at" timestamp,
	"status" text DEFAULT 'completed' NOT NULL,
	"description" text,
	"findings" text,
	"parts_replaced" jsonb,
	"battery_replaced" boolean DEFAULT false,
	"calibration_performed" boolean DEFAULT false,
	"firmware_updated" boolean DEFAULT false,
	"next_maintenance_due" timestamp,
	"images" jsonb,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "regions" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"center_latitude" numeric NOT NULL,
	"center_longitude" numeric NOT NULL,
	"radius_km" real NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "regions_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "research_networks" (
	"id" serial PRIMARY KEY NOT NULL,
	"network_id" text NOT NULL,
	"name" text NOT NULL,
	"region" text,
	"connection_status" text DEFAULT 'disconnected' NOT NULL,
	"last_sync_timestamp" timestamp,
	"synced_data_volume" real,
	"api_endpoint" text,
	CONSTRAINT "research_networks_network_id_unique" UNIQUE("network_id")
);
--> statement-breakpoint
CREATE TABLE "seismogram_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"record_id" text NOT NULL,
	"station_id" text NOT NULL,
	"object_id" integer,
	"event_id" text,
	"start_time" timestamp NOT NULL,
	"end_time" timestamp NOT NULL,
	"duration_sec" real,
	"sample_rate" integer NOT NULL,
	"channels" text DEFAULT 'Z,NS,EW' NOT NULL,
	"peak_amplitude_z" real,
	"peak_amplitude_ns" real,
	"peak_amplitude_ew" real,
	"peak_ground_acceleration" real,
	"dominant_frequency" real,
	"trigger_threshold" real,
	"recording_type" text DEFAULT 'triggered' NOT NULL,
	"processing_status" text DEFAULT 'raw' NOT NULL,
	"data_z" jsonb,
	"data_ns" jsonb,
	"data_ew" jsonb,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"magnitude" real,
	"magnitude_type" text,
	"focal_depth_km" real,
	"epicentral_distance_km" real,
	"soil_category" text,
	"location_name" text,
	"data_source" text,
	"is_historical" boolean DEFAULT false NOT NULL,
	"response_spectrum" jsonb,
	"fourier_spectrum" jsonb,
	"used_for_modeling_count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "seismogram_records_record_id_unique" UNIQUE("record_id")
);
--> statement-breakpoint
CREATE TABLE "sensor_installations" (
	"id" serial PRIMARY KEY NOT NULL,
	"station_id" text NOT NULL,
	"object_id" integer,
	"installation_location" text,
	"floor" integer,
	"measurement_axes" text DEFAULT 'Z,NS,EW' NOT NULL,
	"installation_date" timestamp NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"calibration_date" timestamp,
	"sensor_type" text,
	"sensitivity" real,
	"frequency_range" text,
	"trigger_threshold_z" real,
	"trigger_threshold_h" real,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "soil_layers" (
	"id" serial PRIMARY KEY NOT NULL,
	"profile_id" integer,
	"layer_number" integer NOT NULL,
	"soil_type" text NOT NULL,
	"thickness" real NOT NULL,
	"depth_from" real NOT NULL,
	"depth_to" real NOT NULL,
	"shear_velocity" real NOT NULL,
	"compressional_velocity" real,
	"density" real,
	"damping_ratio" real,
	"description" text
);
--> statement-breakpoint
CREATE TABLE "soil_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"object_id" integer,
	"profile_name" text NOT NULL,
	"soil_category" text NOT NULL,
	"avg_shear_velocity" real,
	"groundwater_depth" real,
	"dominant_frequency" real,
	"amplification_factor" real,
	"borehole_depth" real,
	"survey_date" timestamp,
	"survey_organization" text,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stations" (
	"id" serial PRIMARY KEY NOT NULL,
	"station_id" text NOT NULL,
	"name" text NOT NULL,
	"location" text,
	"latitude" numeric NOT NULL,
	"longitude" numeric NOT NULL,
	"status" text DEFAULT 'offline' NOT NULL,
	"last_update" timestamp DEFAULT now() NOT NULL,
	"data_rate" real,
	"region_id" integer,
	"battery_level" integer,
	"battery_voltage" real,
	"power_consumption" real,
	"solar_charging" real,
	"serial_number" text,
	"firmware_version" text,
	"hardware_model" text,
	"installation_date" timestamp,
	"sensors_calibrated" boolean DEFAULT false,
	"last_calibration_date" timestamp,
	"next_calibration_due" timestamp,
	"calibration_parameters" jsonb,
	"configuration" jsonb,
	"connection_strength" integer,
	"storage_remaining" integer,
	CONSTRAINT "stations_station_id_unique" UNIQUE("station_id")
);
--> statement-breakpoint
CREATE TABLE "system_status" (
	"id" serial PRIMARY KEY NOT NULL,
	"component" text NOT NULL,
	"status" text NOT NULL,
	"value" real,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"message" text
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"full_name" text NOT NULL,
	"email" text NOT NULL,
	"password" text NOT NULL,
	"role" "user_role" DEFAULT 'viewer' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"last_login" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"profile_image" text,
	"contact_phone" text,
	"organization" text,
	"job_title" text,
	"specialization" text,
	"preferences" jsonb,
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "waveform_data" (
	"id" serial PRIMARY KEY NOT NULL,
	"station_id" text NOT NULL,
	"event_id" text,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"data_points" jsonb NOT NULL,
	"data_type" text NOT NULL,
	"sample_rate" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "calibration_afc" ADD CONSTRAINT "calibration_afc_session_id_calibration_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."calibration_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calibration_sessions" ADD CONSTRAINT "calibration_sessions_installation_id_sensor_installations_id_fk" FOREIGN KEY ("installation_id") REFERENCES "public"."sensor_installations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comparison_studies" ADD CONSTRAINT "comparison_studies_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "historical_analysis" ADD CONSTRAINT "historical_analysis_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_records" ADD CONSTRAINT "maintenance_records_station_id_stations_station_id_fk" FOREIGN KEY ("station_id") REFERENCES "public"."stations"("station_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seismogram_records" ADD CONSTRAINT "seismogram_records_station_id_stations_station_id_fk" FOREIGN KEY ("station_id") REFERENCES "public"."stations"("station_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seismogram_records" ADD CONSTRAINT "seismogram_records_object_id_infrastructure_objects_id_fk" FOREIGN KEY ("object_id") REFERENCES "public"."infrastructure_objects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seismogram_records" ADD CONSTRAINT "seismogram_records_event_id_events_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("event_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sensor_installations" ADD CONSTRAINT "sensor_installations_station_id_stations_station_id_fk" FOREIGN KEY ("station_id") REFERENCES "public"."stations"("station_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sensor_installations" ADD CONSTRAINT "sensor_installations_object_id_infrastructure_objects_id_fk" FOREIGN KEY ("object_id") REFERENCES "public"."infrastructure_objects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "soil_layers" ADD CONSTRAINT "soil_layers_profile_id_soil_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."soil_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "soil_profiles" ADD CONSTRAINT "soil_profiles_object_id_infrastructure_objects_id_fk" FOREIGN KEY ("object_id") REFERENCES "public"."infrastructure_objects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stations" ADD CONSTRAINT "stations_region_id_regions_id_fk" FOREIGN KEY ("region_id") REFERENCES "public"."regions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waveform_data" ADD CONSTRAINT "waveform_data_station_id_stations_station_id_fk" FOREIGN KEY ("station_id") REFERENCES "public"."stations"("station_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waveform_data" ADD CONSTRAINT "waveform_data_event_id_events_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("event_id") ON DELETE no action ON UPDATE no action;