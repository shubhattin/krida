ALTER TABLE "padavali_sessions" ADD COLUMN "user_id" text;--> statement-breakpoint
ALTER TABLE "padavali_sessions" ADD COLUMN "user_name" text;--> statement-breakpoint
ALTER TABLE "crossword_sessions" ADD COLUMN "user_id" text;--> statement-breakpoint
ALTER TABLE "crossword_sessions" ADD COLUMN "user_name" text;--> statement-breakpoint
CREATE INDEX "padavali_sessions_user_id_created_at_idx" ON "padavali_sessions" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "padavali_sessions_user_id_puzzle_id_idx" ON "padavali_sessions" USING btree ("user_id","puzzle_id");--> statement-breakpoint
CREATE INDEX "padavali_sessions_puzzle_id_user_id_idx" ON "padavali_sessions" USING btree ("puzzle_id","user_id");--> statement-breakpoint
CREATE INDEX "crossword_sessions_user_id_created_at_idx" ON "crossword_sessions" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "crossword_sessions_user_id_puzzle_id_idx" ON "crossword_sessions" USING btree ("user_id","puzzle_id");--> statement-breakpoint
CREATE INDEX "crossword_sessions_puzzle_id_user_id_idx" ON "crossword_sessions" USING btree ("puzzle_id","user_id");