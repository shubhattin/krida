ALTER TABLE "padavali_puzzles" ALTER COLUMN "description" SET DEFAULT '';--> statement-breakpoint
ALTER TABLE "padavali_puzzles" ALTER COLUMN "description" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "crossword_puzzles" ALTER COLUMN "description" SET DEFAULT '';--> statement-breakpoint
ALTER TABLE "crossword_puzzles" ALTER COLUMN "description" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "padavali_puzzles" ADD COLUMN "word_candidates" jsonb;--> statement-breakpoint
ALTER TABLE "crossword_puzzles" ADD COLUMN "word_candidates" jsonb;