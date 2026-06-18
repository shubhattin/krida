ALTER TABLE "word_puzzles" DROP CONSTRAINT "word_puzzles_uuid_unique";--> statement-breakpoint
DROP INDEX "word_puzzles_uuid_idx";--> statement-breakpoint
ALTER TABLE "word_puzzles" ADD COLUMN "slug" text NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "word_puzzles_slug_idx" ON "word_puzzles" USING btree ("slug");--> statement-breakpoint
ALTER TABLE "word_puzzles" DROP COLUMN "uuid";--> statement-breakpoint
ALTER TABLE "word_puzzles" ADD CONSTRAINT "word_puzzles_slug_unique" UNIQUE("slug");