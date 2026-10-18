CREATE TYPE "public"."user_role" AS ENUM('super_admin', 'client_admin', 'manager', 'staff', 'customer');--> statement-breakpoint
CREATE TYPE "public"."property_purpose" AS ENUM('sale', 'rent');--> statement-breakpoint
CREATE TYPE "public"."property_status" AS ENUM('available', 'sold', 'rented');--> statement-breakpoint
CREATE TYPE "public"."requirement_purpose" AS ENUM('buy', 'rent');--> statement-breakpoint
CREATE TYPE "public"."requirement_status" AS ENUM('open', 'matched', 'closed');--> statement-breakpoint
CREATE TABLE "companies" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255),
	"phone" varchar(32),
	"address" varchar(500),
	"city" varchar(100),
	"is_active" boolean DEFAULT true NOT NULL,
	"voice_assistant_enabled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid,
	"email" varchar(255) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"name" varchar(150) NOT NULL,
	"phone" varchar(32),
	"role" "user_role" DEFAULT 'staff' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_super_admin_has_no_company" CHECK ("users"."role" <> 'super_admin' OR "users"."company_id" IS NULL),
	CONSTRAINT "users_email_lowercase" CHECK ("users"."email" = lower("users"."email"))
);
--> statement-breakpoint
CREATE TABLE "refresh_tokens" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" varchar(64) NOT NULL,
	"user_agent" varchar(255),
	"ip_address" "inet",
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "property_types" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "property_types_company_id_id_unique" UNIQUE("company_id","id")
);
--> statement-breakpoint
CREATE TABLE "facilities" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contacts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"name" varchar(150) NOT NULL,
	"phone" varchar(11) NOT NULL,
	"email" varchar(255),
	"cnic" varchar(15),
	"address" varchar(500),
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "contacts_company_id_id_unique" UNIQUE("company_id","id"),
	CONSTRAINT "contacts_phone_format" CHECK ("contacts"."phone" ~ '^03[0-9]{9}$'),
	CONSTRAINT "contacts_cnic_format" CHECK ("contacts"."cnic" IS NULL OR "contacts"."cnic" ~ '^[0-9]{5}-?[0-9]{7}-?[0-9]$')
);
--> statement-breakpoint
CREATE TABLE "cities" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cities_company_id_id_unique" UNIQUE("company_id","id")
);
--> statement-breakpoint
CREATE TABLE "areas" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"city_id" uuid NOT NULL,
	"name" varchar(150) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "areas_city_id_id_unique" UNIQUE("city_id","id")
);
--> statement-breakpoint
CREATE TABLE "properties" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"property_type_id" uuid NOT NULL,
	"owner_contact_id" uuid,
	"created_by" uuid,
	"title" varchar(200) NOT NULL,
	"description" text,
	"purpose" "property_purpose" NOT NULL,
	"price" bigint NOT NULL,
	"security_deposit" bigint,
	"area_sqft" integer,
	"facilities" uuid[] DEFAULT '{}'::uuid[] NOT NULL,
	"floor" varchar(50),
	"city_id" uuid NOT NULL,
	"area_id" uuid,
	"address" varchar(500),
	"property_status" "property_status" DEFAULT 'available' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "properties_company_id_id_unique" UNIQUE("company_id","id"),
	CONSTRAINT "properties_price_non_negative" CHECK ("properties"."price" >= 0),
	CONSTRAINT "properties_deposit_non_negative" CHECK ("properties"."security_deposit" IS NULL OR "properties"."security_deposit" >= 0),
	CONSTRAINT "properties_area_sqft_positive" CHECK ("properties"."area_sqft" IS NULL OR "properties"."area_sqft" > 0),
	CONSTRAINT "properties_deposit_only_for_rent" CHECK ("properties"."purpose" = 'rent' OR "properties"."security_deposit" IS NULL),
	CONSTRAINT "properties_status_matches_purpose" CHECK (NOT ("properties"."purpose" = 'sale' AND "properties"."property_status" = 'rented') AND NOT ("properties"."purpose" = 'rent' AND "properties"."property_status" = 'sold'))
);
--> statement-breakpoint
CREATE TABLE "property_requirements" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"contact_id" uuid NOT NULL,
	"property_type_id" uuid,
	"purpose" "requirement_purpose" NOT NULL,
	"budget_min" bigint,
	"budget_max" bigint,
	"preferred_city_id" uuid,
	"preferred_area_ids" uuid[] DEFAULT '{}'::uuid[] NOT NULL,
	"facilities" uuid[] DEFAULT '{}'::uuid[] NOT NULL,
	"notes" text,
	"requirement_status" "requirement_status" DEFAULT 'open' NOT NULL,
	"matched_property_id" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "property_requirements_budget_range" CHECK ("property_requirements"."budget_min" IS NULL OR "property_requirements"."budget_max" IS NULL OR "property_requirements"."budget_min" <= "property_requirements"."budget_max"),
	CONSTRAINT "property_requirements_budget_non_negative" CHECK (("property_requirements"."budget_min" IS NULL OR "property_requirements"."budget_min" >= 0) AND ("property_requirements"."budget_max" IS NULL OR "property_requirements"."budget_max" >= 0)),
	CONSTRAINT "property_requirements_max_preferred_areas" CHECK (cardinality("property_requirements"."preferred_area_ids") <= 50),
	CONSTRAINT "property_requirements_areas_need_city" CHECK ("property_requirements"."preferred_city_id" IS NOT NULL OR cardinality("property_requirements"."preferred_area_ids") = 0),
	CONSTRAINT "property_requirements_matched_has_property" CHECK ("property_requirements"."requirement_status" <> 'matched' OR "property_requirements"."matched_property_id" IS NOT NULL)
);
--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_types" ADD CONSTRAINT "property_types_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "facilities" ADD CONSTRAINT "facilities_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cities" ADD CONSTRAINT "cities_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "areas" ADD CONSTRAINT "areas_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "areas" ADD CONSTRAINT "areas_company_city_fk" FOREIGN KEY ("company_id","city_id") REFERENCES "public"."cities"("company_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "properties" ADD CONSTRAINT "properties_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "properties" ADD CONSTRAINT "properties_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "properties" ADD CONSTRAINT "properties_company_property_type_fk" FOREIGN KEY ("company_id","property_type_id") REFERENCES "public"."property_types"("company_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "properties" ADD CONSTRAINT "properties_company_owner_contact_fk" FOREIGN KEY ("company_id","owner_contact_id") REFERENCES "public"."contacts"("company_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "properties" ADD CONSTRAINT "properties_company_city_fk" FOREIGN KEY ("company_id","city_id") REFERENCES "public"."cities"("company_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "properties" ADD CONSTRAINT "properties_city_area_fk" FOREIGN KEY ("city_id","area_id") REFERENCES "public"."areas"("city_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_requirements" ADD CONSTRAINT "property_requirements_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_requirements" ADD CONSTRAINT "property_requirements_company_contact_fk" FOREIGN KEY ("company_id","contact_id") REFERENCES "public"."contacts"("company_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_requirements" ADD CONSTRAINT "property_requirements_company_property_type_fk" FOREIGN KEY ("company_id","property_type_id") REFERENCES "public"."property_types"("company_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_requirements" ADD CONSTRAINT "property_requirements_company_preferred_city_fk" FOREIGN KEY ("company_id","preferred_city_id") REFERENCES "public"."cities"("company_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_requirements" ADD CONSTRAINT "property_requirements_company_matched_property_fk" FOREIGN KEY ("company_id","matched_property_id") REFERENCES "public"."properties"("company_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "companies_created_at_idx" ON "companies" USING btree ("created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "users_company_created_at_idx" ON "users" USING btree ("company_id","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "refresh_tokens_active_user_id_idx" ON "refresh_tokens" USING btree ("user_id") WHERE "refresh_tokens"."revoked_at" IS NULL;--> statement-breakpoint
CREATE INDEX "refresh_tokens_expires_at_idx" ON "refresh_tokens" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "property_types_company_name_unique_idx" ON "property_types" USING btree ("company_id",lower("name"));--> statement-breakpoint
CREATE INDEX "property_types_company_created_at_idx" ON "property_types" USING btree ("company_id","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "facilities_company_name_unique_idx" ON "facilities" USING btree ("company_id",lower("name"));--> statement-breakpoint
CREATE INDEX "facilities_company_created_at_idx" ON "facilities" USING btree ("company_id","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "contacts_company_phone_unique_idx" ON "contacts" USING btree ("company_id","phone");--> statement-breakpoint
CREATE INDEX "contacts_company_created_at_idx" ON "contacts" USING btree ("company_id","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "cities_company_name_unique_idx" ON "cities" USING btree ("company_id",lower("name"));--> statement-breakpoint
CREATE INDEX "cities_company_created_at_idx" ON "cities" USING btree ("company_id","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "areas_city_name_unique_idx" ON "areas" USING btree ("city_id",lower("name"));--> statement-breakpoint
CREATE INDEX "areas_company_created_at_idx" ON "areas" USING btree ("company_id","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "areas_city_created_at_idx" ON "areas" USING btree ("city_id","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "properties_company_created_at_idx" ON "properties" USING btree ("company_id","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "properties_company_purpose_status_idx" ON "properties" USING btree ("company_id","purpose","property_status");--> statement-breakpoint
CREATE INDEX "properties_property_type_idx" ON "properties" USING btree ("property_type_id");--> statement-breakpoint
CREATE INDEX "properties_owner_contact_idx" ON "properties" USING btree ("owner_contact_id");--> statement-breakpoint
CREATE INDEX "properties_city_area_idx" ON "properties" USING btree ("city_id","area_id");--> statement-breakpoint
CREATE INDEX "properties_area_idx" ON "properties" USING btree ("area_id");--> statement-breakpoint
CREATE INDEX "properties_facilities_idx" ON "properties" USING gin ("facilities");--> statement-breakpoint
CREATE INDEX "property_requirements_company_created_at_idx" ON "property_requirements" USING btree ("company_id","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "property_requirements_contact_idx" ON "property_requirements" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "property_requirements_matched_property_idx" ON "property_requirements" USING btree ("matched_property_id");--> statement-breakpoint
CREATE INDEX "property_requirements_company_status_idx" ON "property_requirements" USING btree ("company_id","requirement_status");