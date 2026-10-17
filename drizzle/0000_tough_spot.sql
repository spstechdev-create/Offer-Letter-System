CREATE TABLE "app_users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"level_id" text NOT NULL,
	"scope" text DEFAULT 'own' NOT NULL,
	"faculty_code" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "app_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"catalogue_id" text NOT NULL,
	"created_by" text NOT NULL,
	"reference" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"status" text DEFAULT 'issued' NOT NULL,
	"agent_name" text,
	"agent_code" text,
	"event_name" text,
	"event_date" text,
	"faculty_snapshot" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "applications_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" text,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"details" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "catalogue" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"faculty" text NOT NULL,
	"category" text NOT NULL,
	"attendance" text NOT NULL,
	"structure" text NOT NULL,
	"delivery" text DEFAULT 'campus' NOT NULL,
	"duration" text NOT NULL,
	"total_fee" numeric(12, 2) NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"needs_review" boolean DEFAULT false NOT NULL,
	"source" jsonb,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fee_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"catalogue_id" text NOT NULL,
	"old_fee" numeric(12, 2),
	"new_fee" numeric(12, 2) NOT NULL,
	"actor_id" text NOT NULL,
	"effective_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "issued_letters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"snapshot" jsonb NOT NULL,
	"issued_by" text NOT NULL,
	"issued_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "page_grants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"page_id" text NOT NULL,
	"level_id" text NOT NULL,
	"actions" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pages" (
	"id" text PRIMARY KEY NOT NULL,
	"page_key" text NOT NULL,
	"title" text NOT NULL,
	"route" text NOT NULL,
	"icon" text NOT NULL,
	"urutan" integer NOT NULL,
	"parent_id" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"show_in_sidebar" boolean DEFAULT true NOT NULL,
	CONSTRAINT "pages_page_key_unique" UNIQUE("page_key")
);
--> statement-breakpoint
CREATE TABLE "app_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "students" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"document_type" text NOT NULL,
	"document_number" text NOT NULL,
	"category" text NOT NULL,
	"email" text NOT NULL,
	"phone" text NOT NULL,
	"address" text NOT NULL,
	"archived" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_levels" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"scope" text DEFAULT 'own' NOT NULL
);
--> statement-breakpoint
ALTER TABLE "app_users" ADD CONSTRAINT "app_users_level_id_user_levels_id_fk" FOREIGN KEY ("level_id") REFERENCES "public"."user_levels"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_catalogue_id_catalogue_id_fk" FOREIGN KEY ("catalogue_id") REFERENCES "public"."catalogue"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_created_by_app_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."app_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actor_id_app_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."app_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fee_history" ADD CONSTRAINT "fee_history_catalogue_id_catalogue_id_fk" FOREIGN KEY ("catalogue_id") REFERENCES "public"."catalogue"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fee_history" ADD CONSTRAINT "fee_history_actor_id_app_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."app_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issued_letters" ADD CONSTRAINT "issued_letters_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issued_letters" ADD CONSTRAINT "issued_letters_issued_by_app_users_id_fk" FOREIGN KEY ("issued_by") REFERENCES "public"."app_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "page_grants" ADD CONSTRAINT "page_grants_page_id_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."pages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "page_grants" ADD CONSTRAINT "page_grants_level_id_user_levels_id_fk" FOREIGN KEY ("level_id") REFERENCES "public"."user_levels"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "application_idempotency_unique" ON "applications" USING btree ("created_by","idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "application_letter_version_unique" ON "issued_letters" USING btree ("application_id","version");--> statement-breakpoint
CREATE UNIQUE INDEX "page_level_unique" ON "page_grants" USING btree ("page_id","level_id");--> statement-breakpoint
CREATE UNIQUE INDEX "student_document_unique" ON "students" USING btree ("document_type","document_number");