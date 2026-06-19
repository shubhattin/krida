CREATE TABLE "image_assets" (
	"id" serial PRIMARY KEY NOT NULL,
	"description" varchar(150),
	"width" smallint NOT NULL,
	"height" smallint NOT NULL,
	"s3_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "word_puzzles" RENAME COLUMN "archived" TO "listed";--> statement-breakpoint
ALTER TABLE "word_puzzles" RENAME COLUMN "last_archived_at" TO "last_listed_at";--> statement-breakpoint
ALTER TABLE "word_puzzles" DROP CONSTRAINT "word_puzzles_uuid_unique";--> statement-breakpoint
DROP INDEX "word_puzzles_uuid_idx";--> statement-breakpoint
DROP INDEX "word_puzzles_archived_created_at_idx";--> statement-breakpoint
DROP INDEX "word_puzzles_archived_last_archived_at_idx";--> statement-breakpoint
ALTER TABLE "word_puzzles" ADD COLUMN "slug" text NOT NULL;--> statement-breakpoint
ALTER TABLE "word_puzzles" ADD COLUMN "image_id" integer;--> statement-breakpoint
ALTER TABLE "word_puzzles" ADD CONSTRAINT "word_puzzles_image_id_image_assets_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."image_assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "word_puzzles_slug_idx" ON "word_puzzles" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "word_puzzles_listed_created_at_idx" ON "word_puzzles" USING btree ("listed","created_at");--> statement-breakpoint
CREATE INDEX "word_puzzles_listed_last_listed_at_idx" ON "word_puzzles" USING btree ("listed","last_listed_at");--> statement-breakpoint
ALTER TABLE "word_puzzles" DROP COLUMN "uuid";