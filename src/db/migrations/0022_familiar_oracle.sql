ALTER TABLE "padavali_puzzles" ADD COLUMN "uid" text NOT NULL;--> statement-breakpoint
ALTER TABLE "crossword_puzzles" ADD COLUMN "uid" text NOT NULL;--> statement-breakpoint
ALTER TABLE "padavali_puzzles" ADD CONSTRAINT "padavali_puzzles_uid_unique" UNIQUE("uid");--> statement-breakpoint
ALTER TABLE "crossword_puzzles" ADD CONSTRAINT "crossword_puzzles_uid_unique" UNIQUE("uid");