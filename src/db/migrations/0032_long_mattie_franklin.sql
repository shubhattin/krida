ALTER TABLE "padavali_puzzles" ADD COLUMN "word_meanings" jsonb;--> statement-breakpoint
ALTER TABLE "padavali_puzzles" ADD COLUMN "word_meanings_hash" text;--> statement-breakpoint
ALTER TABLE "padavali_puzzles" ADD COLUMN "word_meanings_generated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "padajala_puzzles" ADD COLUMN "more_hints" jsonb;--> statement-breakpoint
ALTER TABLE "padajala_puzzles" ADD COLUMN "more_hints_hash" text;--> statement-breakpoint
ALTER TABLE "padajala_puzzles" ADD COLUMN "more_hints_generated_at" timestamp with time zone;