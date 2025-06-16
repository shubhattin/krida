DROP INDEX "word_puzzles_created_at_index";--> statement-breakpoint
CREATE INDEX "puzzle_game_schedules_start_time_end_time_idx" ON "puzzle_game_schedules" USING btree ("start_time","end_time");--> statement-breakpoint
CREATE INDEX "puzzle_game_schedules_end_time_idx" ON "puzzle_game_schedules" USING btree ("end_time");--> statement-breakpoint
CREATE INDEX "puzzle_game_schedules_puzzle_id_created_at_idx" ON "puzzle_game_schedules" USING btree ("puzzle_id","created_at");--> statement-breakpoint
CREATE INDEX "puzzle_game_schedules_created_at_idx" ON "puzzle_game_schedules" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "puzzle_gameplay_sessions_puzzle_id_created_at_idx" ON "puzzle_gameplay_sessions" USING btree ("puzzle_id","created_at");--> statement-breakpoint
CREATE INDEX "puzzle_gameplay_stats_puzzle_id_created_at_idx" ON "puzzle_gameplay_stats" USING btree ("puzzle_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "puzzle_gameplay_stats_session_id_idx" ON "puzzle_gameplay_stats" USING btree ("session_id");--> statement-breakpoint
CREATE UNIQUE INDEX "word_puzzles_uuid_idx" ON "word_puzzles" USING btree ("uuid");--> statement-breakpoint
CREATE INDEX "word_puzzles_archived_created_at_idx" ON "word_puzzles" USING btree ("archived","created_at");--> statement-breakpoint
ALTER TABLE "word_puzzles" ADD CONSTRAINT "word_puzzles_uuid_unique" UNIQUE("uuid");