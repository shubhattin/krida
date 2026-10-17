CREATE TABLE "attempt_gameplay_stats" (
	"id" serial PRIMARY KEY NOT NULL,
	"puzzle_id" integer NOT NULL,
	"session_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"time_taken" integer NOT NULL,
	"accuracy" integer NOT NULL,
	"correct_attempts" integer NOT NULL,
	"total_attempts" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "collection_items" (
	"collection_id" integer NOT NULL,
	"puzzle_id" integer NOT NULL,
	"order_index" smallint DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "collection_items_collection_id_puzzle_id_pk" PRIMARY KEY("collection_id","puzzle_id")
);
--> statement-breakpoint
CREATE TABLE "puzzle_attachments" (
	"id" serial PRIMARY KEY NOT NULL,
	"puzzle_id" integer NOT NULL,
	"type" "attachment_type" NOT NULL,
	"url" text NOT NULL,
	"title" text,
	"order_index" smallint DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "puzzle_redirects" (
	"id" serial PRIMARY KEY NOT NULL,
	"puzzle_id" integer NOT NULL,
	"kind" text NOT NULL,
	"slug" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "puzzle_schedules" (
	"id" serial PRIMARY KEY NOT NULL,
	"puzzle_id" integer NOT NULL,
	"start_time" timestamp with time zone NOT NULL,
	"end_time" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"listing_verify_key" text
);
--> statement-breakpoint
CREATE TABLE "puzzle_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"puzzle_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"practice_mode" boolean DEFAULT false NOT NULL,
	"location" varchar(25),
	"script" text,
	"user_id" text
);
--> statement-breakpoint
CREATE TABLE "puzzle_tags" (
	"puzzle_id" integer NOT NULL,
	"tag_id" integer NOT NULL,
	CONSTRAINT "puzzle_tags_puzzle_id_tag_id_pk" PRIMARY KEY("puzzle_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "puzzles" (
	"id" serial PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"uid" text NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"listed" boolean DEFAULT false NOT NULL,
	"last_listed_at" timestamp with time zone,
	"image_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "puzzles_uid_unique" UNIQUE("uid")
);
--> statement-breakpoint
ALTER TABLE "padavali_attachments" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "padavali_collection_items" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "padavali_gameplay_stats" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "padavali_puzzle_tags" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "padavali_redirects" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "padavali_schedules" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "padavali_sessions" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "crossword_attachments" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "crossword_collection_items" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "crossword_puzzle_tags" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "crossword_redirects" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "crossword_schedules" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "crossword_sessions" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "dvayi_attachments" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "dvayi_collection_items" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "dvayi_gameplay_stats" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "dvayi_puzzle_tags" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "dvayi_redirects" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "dvayi_sessions" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "bhramita_attachments" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "bhramita_collection_items" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "bhramita_gameplay_stats" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "bhramita_puzzle_tags" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "bhramita_redirects" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "bhramita_sessions" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "surupa_attachments" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "surupa_collection_items" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "surupa_gameplay_stats" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "surupa_puzzle_tags" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "surupa_redirects" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "surupa_sessions" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "anveshi_attachments" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "anveshi_collection_items" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "anveshi_gameplay_stats" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "anveshi_puzzle_tags" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "anveshi_redirects" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "anveshi_sessions" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "padavali_attachments" CASCADE;--> statement-breakpoint
DROP TABLE "padavali_collection_items" CASCADE;--> statement-breakpoint
DROP TABLE "padavali_gameplay_stats" CASCADE;--> statement-breakpoint
DROP TABLE "padavali_puzzle_tags" CASCADE;--> statement-breakpoint
DROP TABLE "padavali_redirects" CASCADE;--> statement-breakpoint
DROP TABLE "padavali_schedules" CASCADE;--> statement-breakpoint
DROP TABLE "padavali_sessions" CASCADE;--> statement-breakpoint
DROP TABLE "crossword_attachments" CASCADE;--> statement-breakpoint
DROP TABLE "crossword_collection_items" CASCADE;--> statement-breakpoint
DROP TABLE "crossword_puzzle_tags" CASCADE;--> statement-breakpoint
DROP TABLE "crossword_redirects" CASCADE;--> statement-breakpoint
DROP TABLE "crossword_schedules" CASCADE;--> statement-breakpoint
DROP TABLE "crossword_sessions" CASCADE;--> statement-breakpoint
DROP TABLE "dvayi_attachments" CASCADE;--> statement-breakpoint
DROP TABLE "dvayi_collection_items" CASCADE;--> statement-breakpoint
DROP TABLE "dvayi_gameplay_stats" CASCADE;--> statement-breakpoint
DROP TABLE "dvayi_puzzle_tags" CASCADE;--> statement-breakpoint
DROP TABLE "dvayi_redirects" CASCADE;--> statement-breakpoint
DROP TABLE "dvayi_sessions" CASCADE;--> statement-breakpoint
DROP TABLE "bhramita_attachments" CASCADE;--> statement-breakpoint
DROP TABLE "bhramita_collection_items" CASCADE;--> statement-breakpoint
DROP TABLE "bhramita_gameplay_stats" CASCADE;--> statement-breakpoint
DROP TABLE "bhramita_puzzle_tags" CASCADE;--> statement-breakpoint
DROP TABLE "bhramita_redirects" CASCADE;--> statement-breakpoint
DROP TABLE "bhramita_sessions" CASCADE;--> statement-breakpoint
DROP TABLE "surupa_attachments" CASCADE;--> statement-breakpoint
DROP TABLE "surupa_collection_items" CASCADE;--> statement-breakpoint
DROP TABLE "surupa_gameplay_stats" CASCADE;--> statement-breakpoint
DROP TABLE "surupa_puzzle_tags" CASCADE;--> statement-breakpoint
DROP TABLE "surupa_redirects" CASCADE;--> statement-breakpoint
DROP TABLE "surupa_sessions" CASCADE;--> statement-breakpoint
DROP TABLE "anveshi_attachments" CASCADE;--> statement-breakpoint
DROP TABLE "anveshi_collection_items" CASCADE;--> statement-breakpoint
DROP TABLE "anveshi_gameplay_stats" CASCADE;--> statement-breakpoint
DROP TABLE "anveshi_puzzle_tags" CASCADE;--> statement-breakpoint
DROP TABLE "anveshi_redirects" CASCADE;--> statement-breakpoint
DROP TABLE "anveshi_sessions" CASCADE;--> statement-breakpoint
ALTER TABLE "padavali_puzzles" DROP CONSTRAINT "padavali_puzzles_uid_unique";--> statement-breakpoint
ALTER TABLE "crossword_puzzles" DROP CONSTRAINT "crossword_puzzles_uid_unique";--> statement-breakpoint
ALTER TABLE "dvayi_puzzles" DROP CONSTRAINT "dvayi_puzzles_uid_unique";--> statement-breakpoint
ALTER TABLE "bhramita_puzzles" DROP CONSTRAINT "bhramita_puzzles_uid_unique";--> statement-breakpoint
ALTER TABLE "surupa_puzzles" DROP CONSTRAINT "surupa_puzzles_uid_unique";--> statement-breakpoint
ALTER TABLE "anveshi_puzzles" DROP CONSTRAINT "anveshi_puzzles_uid_unique";--> statement-breakpoint
ALTER TABLE "padavali_puzzles" DROP CONSTRAINT "padavali_puzzles_image_id_image_assets_id_fk";
--> statement-breakpoint
ALTER TABLE "crossword_gameplay_stats" DROP CONSTRAINT "crossword_gameplay_stats_puzzle_id_crossword_puzzles_id_fk";
--> statement-breakpoint
ALTER TABLE "crossword_puzzles" DROP CONSTRAINT "crossword_puzzles_image_id_image_assets_id_fk";
--> statement-breakpoint
ALTER TABLE "dvayi_puzzles" DROP CONSTRAINT "dvayi_puzzles_image_id_image_assets_id_fk";
--> statement-breakpoint
ALTER TABLE "bhramita_puzzles" DROP CONSTRAINT "bhramita_puzzles_image_id_image_assets_id_fk";
--> statement-breakpoint
ALTER TABLE "surupa_puzzles" DROP CONSTRAINT "surupa_puzzles_image_id_image_assets_id_fk";
--> statement-breakpoint
ALTER TABLE "anveshi_puzzles" DROP CONSTRAINT "anveshi_puzzles_image_id_image_assets_id_fk";
--> statement-breakpoint
DROP INDEX "padavali_puzzles_slug_idx";--> statement-breakpoint
DROP INDEX "padavali_puzzles_listed_created_at_idx";--> statement-breakpoint
DROP INDEX "padavali_puzzles_listed_updated_at_idx";--> statement-breakpoint
DROP INDEX "padavali_puzzles_listed_last_listed_at_idx";--> statement-breakpoint
DROP INDEX "crossword_puzzles_slug_idx";--> statement-breakpoint
DROP INDEX "crossword_puzzles_listed_created_at_idx";--> statement-breakpoint
DROP INDEX "crossword_puzzles_listed_updated_at_idx";--> statement-breakpoint
DROP INDEX "crossword_puzzles_listed_last_listed_at_idx";--> statement-breakpoint
DROP INDEX "dvayi_puzzles_slug_idx";--> statement-breakpoint
DROP INDEX "dvayi_puzzles_listed_created_at_idx";--> statement-breakpoint
DROP INDEX "dvayi_puzzles_listed_updated_at_idx";--> statement-breakpoint
DROP INDEX "dvayi_puzzles_listed_last_listed_at_idx";--> statement-breakpoint
DROP INDEX "bhramita_puzzles_slug_idx";--> statement-breakpoint
DROP INDEX "bhramita_puzzles_listed_created_at_idx";--> statement-breakpoint
DROP INDEX "bhramita_puzzles_listed_updated_at_idx";--> statement-breakpoint
DROP INDEX "bhramita_puzzles_listed_last_listed_at_idx";--> statement-breakpoint
DROP INDEX "surupa_puzzles_slug_idx";--> statement-breakpoint
DROP INDEX "surupa_puzzles_listed_created_at_idx";--> statement-breakpoint
DROP INDEX "surupa_puzzles_listed_updated_at_idx";--> statement-breakpoint
DROP INDEX "surupa_puzzles_listed_last_listed_at_idx";--> statement-breakpoint
DROP INDEX "anveshi_puzzles_slug_idx";--> statement-breakpoint
DROP INDEX "anveshi_puzzles_listed_created_at_idx";--> statement-breakpoint
DROP INDEX "anveshi_puzzles_listed_updated_at_idx";--> statement-breakpoint
DROP INDEX "anveshi_puzzles_listed_last_listed_at_idx";--> statement-breakpoint
ALTER TABLE "padavali_puzzles" ALTER COLUMN "id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "crossword_puzzles" ALTER COLUMN "id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "dvayi_puzzles" ALTER COLUMN "id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "bhramita_puzzles" ALTER COLUMN "id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "surupa_puzzles" ALTER COLUMN "id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "anveshi_puzzles" ALTER COLUMN "id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "attempt_gameplay_stats" ADD CONSTRAINT "attempt_gameplay_stats_puzzle_id_puzzles_id_fk" FOREIGN KEY ("puzzle_id") REFERENCES "public"."puzzles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attempt_gameplay_stats" ADD CONSTRAINT "attempt_gameplay_stats_session_id_puzzle_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."puzzle_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_items" ADD CONSTRAINT "collection_items_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_items" ADD CONSTRAINT "collection_items_puzzle_id_puzzles_id_fk" FOREIGN KEY ("puzzle_id") REFERENCES "public"."puzzles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "puzzle_attachments" ADD CONSTRAINT "puzzle_attachments_puzzle_id_puzzles_id_fk" FOREIGN KEY ("puzzle_id") REFERENCES "public"."puzzles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "puzzles_id_kind_idx" ON "puzzles" USING btree ("id","kind");--> statement-breakpoint
ALTER TABLE "puzzle_redirects" ADD CONSTRAINT "puzzle_redirects_puzzle_id_kind_fk" FOREIGN KEY ("puzzle_id","kind") REFERENCES "public"."puzzles"("id","kind") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "puzzle_schedules" ADD CONSTRAINT "puzzle_schedules_puzzle_id_puzzles_id_fk" FOREIGN KEY ("puzzle_id") REFERENCES "public"."puzzles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "puzzle_sessions" ADD CONSTRAINT "puzzle_sessions_puzzle_id_puzzles_id_fk" FOREIGN KEY ("puzzle_id") REFERENCES "public"."puzzles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "puzzle_tags" ADD CONSTRAINT "puzzle_tags_puzzle_id_puzzles_id_fk" FOREIGN KEY ("puzzle_id") REFERENCES "public"."puzzles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "puzzle_tags" ADD CONSTRAINT "puzzle_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "puzzles" ADD CONSTRAINT "puzzles_image_id_image_assets_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."image_assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "attempt_gameplay_stats_puzzle_id_created_at_idx" ON "attempt_gameplay_stats" USING btree ("puzzle_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "attempt_gameplay_stats_session_id_idx" ON "attempt_gameplay_stats" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "collection_items_puzzle_id_idx" ON "collection_items" USING btree ("puzzle_id");--> statement-breakpoint
CREATE INDEX "collection_items_collection_order_idx" ON "collection_items" USING btree ("collection_id","order_index");--> statement-breakpoint
CREATE INDEX "puzzle_attachments_puzzle_id_idx" ON "puzzle_attachments" USING btree ("puzzle_id");--> statement-breakpoint
CREATE UNIQUE INDEX "puzzle_redirects_kind_slug_idx" ON "puzzle_redirects" USING btree ("kind","slug");--> statement-breakpoint
CREATE INDEX "puzzle_redirects_puzzle_id_idx" ON "puzzle_redirects" USING btree ("puzzle_id");--> statement-breakpoint
CREATE INDEX "puzzle_schedules_start_time_end_time_idx" ON "puzzle_schedules" USING btree ("start_time","end_time");--> statement-breakpoint
CREATE INDEX "puzzle_schedules_end_time_idx" ON "puzzle_schedules" USING btree ("end_time");--> statement-breakpoint
CREATE INDEX "puzzle_schedules_puzzle_id_created_at_idx" ON "puzzle_schedules" USING btree ("puzzle_id","created_at");--> statement-breakpoint
CREATE INDEX "puzzle_schedules_created_at_idx" ON "puzzle_schedules" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "puzzle_sessions_puzzle_id_created_at_idx" ON "puzzle_sessions" USING btree ("puzzle_id","created_at");--> statement-breakpoint
CREATE INDEX "puzzle_sessions_user_id_created_at_idx" ON "puzzle_sessions" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "puzzle_sessions_user_id_puzzle_id_idx" ON "puzzle_sessions" USING btree ("user_id","puzzle_id");--> statement-breakpoint
CREATE INDEX "puzzle_sessions_puzzle_id_user_id_idx" ON "puzzle_sessions" USING btree ("puzzle_id","user_id");--> statement-breakpoint
CREATE INDEX "puzzle_tags_tag_id_idx" ON "puzzle_tags" USING btree ("tag_id");--> statement-breakpoint
CREATE UNIQUE INDEX "puzzles_kind_slug_idx" ON "puzzles" USING btree ("kind","slug");--> statement-breakpoint
CREATE INDEX "puzzles_listed_created_at_idx" ON "puzzles" USING btree ("listed","created_at");--> statement-breakpoint
CREATE INDEX "puzzles_listed_updated_at_idx" ON "puzzles" USING btree ("listed","updated_at");--> statement-breakpoint
CREATE INDEX "puzzles_listed_last_listed_at_idx" ON "puzzles" USING btree ("listed","last_listed_at");--> statement-breakpoint
CREATE INDEX "puzzles_kind_listed_idx" ON "puzzles" USING btree ("kind","listed");--> statement-breakpoint
-- Old puzzle ids overlap across games, so these rows cannot stay.
-- Reload them with src/db/scripts/patch_db.ts from the legacy JSON dump.
DELETE FROM "crossword_gameplay_stats";--> statement-breakpoint
DELETE FROM "padavali_puzzles";--> statement-breakpoint
DELETE FROM "crossword_puzzles";--> statement-breakpoint
DELETE FROM "dvayi_puzzles";--> statement-breakpoint
DELETE FROM "bhramita_puzzles";--> statement-breakpoint
DELETE FROM "surupa_puzzles";--> statement-breakpoint
DELETE FROM "anveshi_puzzles";--> statement-breakpoint
ALTER TABLE "padavali_puzzles" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "crossword_puzzles" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "dvayi_puzzles" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "bhramita_puzzles" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "surupa_puzzles" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "anveshi_puzzles" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "padavali_puzzles" ADD CONSTRAINT "padavali_puzzles_id_puzzles_id_fk" FOREIGN KEY ("id") REFERENCES "public"."puzzles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crossword_gameplay_stats" ADD CONSTRAINT "crossword_gameplay_stats_puzzle_id_puzzles_id_fk" FOREIGN KEY ("puzzle_id") REFERENCES "public"."puzzles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crossword_gameplay_stats" ADD CONSTRAINT "crossword_gameplay_stats_session_id_puzzle_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."puzzle_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crossword_puzzles" ADD CONSTRAINT "crossword_puzzles_id_puzzles_id_fk" FOREIGN KEY ("id") REFERENCES "public"."puzzles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dvayi_puzzles" ADD CONSTRAINT "dvayi_puzzles_id_puzzles_id_fk" FOREIGN KEY ("id") REFERENCES "public"."puzzles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bhramita_puzzles" ADD CONSTRAINT "bhramita_puzzles_id_puzzles_id_fk" FOREIGN KEY ("id") REFERENCES "public"."puzzles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "surupa_puzzles" ADD CONSTRAINT "surupa_puzzles_id_puzzles_id_fk" FOREIGN KEY ("id") REFERENCES "public"."puzzles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "anveshi_puzzles" ADD CONSTRAINT "anveshi_puzzles_id_puzzles_id_fk" FOREIGN KEY ("id") REFERENCES "public"."puzzles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "padavali_puzzles" DROP COLUMN "uid";--> statement-breakpoint
ALTER TABLE "padavali_puzzles" DROP COLUMN "slug";--> statement-breakpoint
ALTER TABLE "padavali_puzzles" DROP COLUMN "title";--> statement-breakpoint
ALTER TABLE "padavali_puzzles" DROP COLUMN "description";--> statement-breakpoint
ALTER TABLE "padavali_puzzles" DROP COLUMN "created_at";--> statement-breakpoint
ALTER TABLE "padavali_puzzles" DROP COLUMN "updated_at";--> statement-breakpoint
ALTER TABLE "padavali_puzzles" DROP COLUMN "listed";--> statement-breakpoint
ALTER TABLE "padavali_puzzles" DROP COLUMN "last_listed_at";--> statement-breakpoint
ALTER TABLE "padavali_puzzles" DROP COLUMN "image_id";--> statement-breakpoint
ALTER TABLE "crossword_puzzles" DROP COLUMN "uid";--> statement-breakpoint
ALTER TABLE "crossword_puzzles" DROP COLUMN "slug";--> statement-breakpoint
ALTER TABLE "crossword_puzzles" DROP COLUMN "title";--> statement-breakpoint
ALTER TABLE "crossword_puzzles" DROP COLUMN "description";--> statement-breakpoint
ALTER TABLE "crossword_puzzles" DROP COLUMN "listed";--> statement-breakpoint
ALTER TABLE "crossword_puzzles" DROP COLUMN "last_listed_at";--> statement-breakpoint
ALTER TABLE "crossword_puzzles" DROP COLUMN "image_id";--> statement-breakpoint
ALTER TABLE "crossword_puzzles" DROP COLUMN "created_at";--> statement-breakpoint
ALTER TABLE "crossword_puzzles" DROP COLUMN "updated_at";--> statement-breakpoint
ALTER TABLE "dvayi_puzzles" DROP COLUMN "uid";--> statement-breakpoint
ALTER TABLE "dvayi_puzzles" DROP COLUMN "slug";--> statement-breakpoint
ALTER TABLE "dvayi_puzzles" DROP COLUMN "title";--> statement-breakpoint
ALTER TABLE "dvayi_puzzles" DROP COLUMN "description";--> statement-breakpoint
ALTER TABLE "dvayi_puzzles" DROP COLUMN "created_at";--> statement-breakpoint
ALTER TABLE "dvayi_puzzles" DROP COLUMN "updated_at";--> statement-breakpoint
ALTER TABLE "dvayi_puzzles" DROP COLUMN "listed";--> statement-breakpoint
ALTER TABLE "dvayi_puzzles" DROP COLUMN "last_listed_at";--> statement-breakpoint
ALTER TABLE "dvayi_puzzles" DROP COLUMN "image_id";--> statement-breakpoint
ALTER TABLE "bhramita_puzzles" DROP COLUMN "uid";--> statement-breakpoint
ALTER TABLE "bhramita_puzzles" DROP COLUMN "slug";--> statement-breakpoint
ALTER TABLE "bhramita_puzzles" DROP COLUMN "title";--> statement-breakpoint
ALTER TABLE "bhramita_puzzles" DROP COLUMN "description";--> statement-breakpoint
ALTER TABLE "bhramita_puzzles" DROP COLUMN "created_at";--> statement-breakpoint
ALTER TABLE "bhramita_puzzles" DROP COLUMN "updated_at";--> statement-breakpoint
ALTER TABLE "bhramita_puzzles" DROP COLUMN "listed";--> statement-breakpoint
ALTER TABLE "bhramita_puzzles" DROP COLUMN "last_listed_at";--> statement-breakpoint
ALTER TABLE "bhramita_puzzles" DROP COLUMN "image_id";--> statement-breakpoint
ALTER TABLE "surupa_puzzles" DROP COLUMN "uid";--> statement-breakpoint
ALTER TABLE "surupa_puzzles" DROP COLUMN "slug";--> statement-breakpoint
ALTER TABLE "surupa_puzzles" DROP COLUMN "title";--> statement-breakpoint
ALTER TABLE "surupa_puzzles" DROP COLUMN "description";--> statement-breakpoint
ALTER TABLE "surupa_puzzles" DROP COLUMN "created_at";--> statement-breakpoint
ALTER TABLE "surupa_puzzles" DROP COLUMN "updated_at";--> statement-breakpoint
ALTER TABLE "surupa_puzzles" DROP COLUMN "listed";--> statement-breakpoint
ALTER TABLE "surupa_puzzles" DROP COLUMN "last_listed_at";--> statement-breakpoint
ALTER TABLE "surupa_puzzles" DROP COLUMN "image_id";--> statement-breakpoint
ALTER TABLE "anveshi_puzzles" DROP COLUMN "uid";--> statement-breakpoint
ALTER TABLE "anveshi_puzzles" DROP COLUMN "slug";--> statement-breakpoint
ALTER TABLE "anveshi_puzzles" DROP COLUMN "title";--> statement-breakpoint
ALTER TABLE "anveshi_puzzles" DROP COLUMN "description";--> statement-breakpoint
ALTER TABLE "anveshi_puzzles" DROP COLUMN "created_at";--> statement-breakpoint
ALTER TABLE "anveshi_puzzles" DROP COLUMN "updated_at";--> statement-breakpoint
ALTER TABLE "anveshi_puzzles" DROP COLUMN "listed";--> statement-breakpoint
ALTER TABLE "anveshi_puzzles" DROP COLUMN "last_listed_at";--> statement-breakpoint
ALTER TABLE "anveshi_puzzles" DROP COLUMN "image_id";