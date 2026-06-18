ALTER TABLE "word_puzzles" RENAME COLUMN "archived" TO "listed";--> statement-breakpoint
ALTER TABLE "word_puzzles" RENAME COLUMN "last_archived_at" TO "last_listed_at";--> statement-breakpoint
ALTER TABLE "word_puzzles" DROP CONSTRAINT "word_puzzles_uuid_unique";--> statement-breakpoint
DROP INDEX "word_puzzles_uuid_idx";--> statement-breakpoint
DROP INDEX "word_puzzles_archived_created_at_idx";--> statement-breakpoint
DROP INDEX "word_puzzles_archived_last_archived_at_idx";--> statement-breakpoint
ALTER TABLE "word_puzzles" ADD COLUMN "slug" text NOT NULL;--> statement-breakpoint
ALTER TABLE "word_puzzles" ADD COLUMN "s3_key" text;--> statement-breakpoint
CREATE UNIQUE INDEX "word_puzzles_slug_idx" ON "word_puzzles" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "word_puzzles_listed_created_at_idx" ON "word_puzzles" USING btree ("listed","created_at");--> statement-breakpoint
CREATE INDEX "word_puzzles_listed_last_listed_at_idx" ON "word_puzzles" USING btree ("listed","last_listed_at");--> statement-breakpoint
ALTER TABLE "word_puzzles" DROP COLUMN "uuid";