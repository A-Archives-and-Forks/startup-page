CREATE TABLE "user_bookmarks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"data" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"client_updated_at" timestamp with time zone,
	"server_updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_bookmarks_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "user_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"client_updated_at" timestamp with time zone,
	"server_updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_preferences_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "user_read_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"data" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"client_updated_at" timestamp with time zone,
	"server_updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_read_items_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "user_themes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"data" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"client_updated_at" timestamp with time zone,
	"server_updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_themes_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "user_vault_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"data" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"client_updated_at" timestamp with time zone,
	"server_updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_vault_items_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "user_widgets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"client_updated_at" timestamp with time zone,
	"server_updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_widgets_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "user_bookmarks" ADD CONSTRAINT "user_bookmarks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_read_items" ADD CONSTRAINT "user_read_items_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_themes" ADD CONSTRAINT "user_themes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_vault_items" ADD CONSTRAINT "user_vault_items_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_widgets" ADD CONSTRAINT "user_widgets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- Backfill: split each existing user_settings.settings blob across the six
-- new domain tables. user_settings itself is dropped in the next migration
-- once this has run.
INSERT INTO "user_bookmarks" ("user_id", "data", "client_updated_at", "server_updated_at")
SELECT "user_id", COALESCE("settings"->'bookmark', '[]'::jsonb), "client_updated_at", "server_updated_at"
FROM "user_settings";--> statement-breakpoint
INSERT INTO "user_widgets" ("user_id", "data", "client_updated_at", "server_updated_at")
SELECT "user_id",
  jsonb_build_object('widgets', COALESCE("settings"->'widgets', '[]'::jsonb), 'layout', COALESCE("settings"->'layout', '{}'::jsonb)),
  "client_updated_at", "server_updated_at"
FROM "user_settings";--> statement-breakpoint
INSERT INTO "user_vault_items" ("user_id", "data", "client_updated_at", "server_updated_at")
SELECT "user_id", COALESCE("settings"->'vaultItems', '[]'::jsonb), "client_updated_at", "server_updated_at"
FROM "user_settings";--> statement-breakpoint
INSERT INTO "user_read_items" ("user_id", "data", "client_updated_at", "server_updated_at")
SELECT "user_id", COALESCE("settings"->'readItems', '[]'::jsonb), "client_updated_at", "server_updated_at"
FROM "user_settings";--> statement-breakpoint
INSERT INTO "user_themes" ("user_id", "data", "client_updated_at", "server_updated_at")
SELECT "user_id", COALESCE("settings"->'customThemes', '[]'::jsonb), "client_updated_at", "server_updated_at"
FROM "user_settings";--> statement-breakpoint
INSERT INTO "user_preferences" ("user_id", "data", "client_updated_at", "server_updated_at")
SELECT "user_id",
  ("settings" - 'bookmark' - 'widgets' - 'layout' - 'vaultItems' - 'readItems' - 'customThemes'),
  "client_updated_at", "server_updated_at"
FROM "user_settings";