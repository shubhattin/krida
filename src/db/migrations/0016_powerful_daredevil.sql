ALTER TABLE "word_puzzle_attachments" RENAME TO "padavali_attachments";--> statement-breakpoint
ALTER TABLE "puzzle_gameplay_stats" RENAME TO "padavali_gameplay_stats";--> statement-breakpoint
ALTER TABLE "word_puzzles" RENAME TO "padavali_puzzles";--> statement-breakpoint
ALTER TABLE "word_puzzle_redirects" RENAME TO "padavali_redirects";--> statement-breakpoint
ALTER TABLE "puzzle_game_schedules" RENAME TO "padavali_schedules";--> statement-breakpoint
ALTER TABLE "puzzle_gameplay_sessions" RENAME TO "padavali_sessions";--> statement-breakpoint
ALTER TABLE "padavali_schedules" RENAME COLUMN "archival_verify_key" TO "listing_verify_key";--> statement-breakpoint
ALTER TABLE "padavali_redirects" DROP CONSTRAINT "word_puzzle_redirects_slug_unique";--> statement-breakpoint
ALTER TABLE "padavali_schedules" DROP CONSTRAINT "puzzle_game_schedules_puzzle_id_word_puzzles_id_fk";
--> statement-breakpoint
ALTER TABLE "padavali_sessions" DROP CONSTRAINT "puzzle_gameplay_sessions_puzzle_id_word_puzzles_id_fk";
--> statement-breakpoint
ALTER TABLE "padavali_gameplay_stats" DROP CONSTRAINT "puzzle_gameplay_stats_puzzle_id_word_puzzles_id_fk";
--> statement-breakpoint
ALTER TABLE "padavali_gameplay_stats" DROP CONSTRAINT "puzzle_gameplay_stats_session_id_puzzle_gameplay_sessions_id_fk";
--> statement-breakpoint
ALTER TABLE "padavali_attachments" DROP CONSTRAINT "word_puzzle_attachments_puzzle_id_word_puzzles_id_fk";
--> statement-breakpoint
ALTER TABLE "padavali_redirects" DROP CONSTRAINT "word_puzzle_redirects_puzzle_id_word_puzzles_id_fk";
--> statement-breakpoint
ALTER TABLE "padavali_puzzles" DROP CONSTRAINT "word_puzzles_image_id_image_assets_id_fk";
--> statement-breakpoint
DROP INDEX "puzzle_game_schedules_start_time_end_time_idx";--> statement-breakpoint
DROP INDEX "puzzle_game_schedules_end_time_idx";--> statement-breakpoint
DROP INDEX "puzzle_game_schedules_puzzle_id_created_at_idx";--> statement-breakpoint
DROP INDEX "puzzle_game_schedules_created_at_idx";--> statement-breakpoint
DROP INDEX "puzzle_gameplay_sessions_puzzle_id_created_at_idx";--> statement-breakpoint
DROP INDEX "puzzle_gameplay_stats_puzzle_id_created_at_idx";--> statement-breakpoint
DROP INDEX "puzzle_gameplay_stats_session_id_idx";--> statement-breakpoint
DROP INDEX "word_puzzle_attachments_puzzle_id_idx";--> statement-breakpoint
DROP INDEX "word_puzzles_slug_idx";--> statement-breakpoint
DROP INDEX "word_puzzles_listed_created_at_idx";--> statement-breakpoint
DROP INDEX "word_puzzles_listed_last_listed_at_idx";--> statement-breakpoint
ALTER TABLE "padavali_schedules" ADD CONSTRAINT "padavali_schedules_puzzle_id_padavali_puzzles_id_fk" FOREIGN KEY ("puzzle_id") REFERENCES "public"."padavali_puzzles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "padavali_sessions" ADD CONSTRAINT "padavali_sessions_puzzle_id_padavali_puzzles_id_fk" FOREIGN KEY ("puzzle_id") REFERENCES "public"."padavali_puzzles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "padavali_gameplay_stats" ADD CONSTRAINT "padavali_gameplay_stats_puzzle_id_padavali_puzzles_id_fk" FOREIGN KEY ("puzzle_id") REFERENCES "public"."padavali_puzzles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "padavali_gameplay_stats" ADD CONSTRAINT "padavali_gameplay_stats_session_id_padavali_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."padavali_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "padavali_attachments" ADD CONSTRAINT "padavali_attachments_puzzle_id_padavali_puzzles_id_fk" FOREIGN KEY ("puzzle_id") REFERENCES "public"."padavali_puzzles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "padavali_redirects" ADD CONSTRAINT "padavali_redirects_puzzle_id_padavali_puzzles_id_fk" FOREIGN KEY ("puzzle_id") REFERENCES "public"."padavali_puzzles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "padavali_puzzles" ADD CONSTRAINT "padavali_puzzles_image_id_image_assets_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."image_assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "padavali_schedules_start_time_end_time_idx" ON "padavali_schedules" USING btree ("start_time","end_time");--> statement-breakpoint
CREATE INDEX "padavali_schedules_end_time_idx" ON "padavali_schedules" USING btree ("end_time");--> statement-breakpoint
CREATE INDEX "padavali_schedules_puzzle_id_created_at_idx" ON "padavali_schedules" USING btree ("puzzle_id","created_at");--> statement-breakpoint
CREATE INDEX "padavali_schedules_created_at_idx" ON "padavali_schedules" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "padavali_sessions_puzzle_id_created_at_idx" ON "padavali_sessions" USING btree ("puzzle_id","created_at");--> statement-breakpoint
CREATE INDEX "padavali_gameplay_stats_puzzle_id_created_at_idx" ON "padavali_gameplay_stats" USING btree ("puzzle_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "padavali_gameplay_stats_session_id_idx" ON "padavali_gameplay_stats" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "padavali_attachments_puzzle_id_idx" ON "padavali_attachments" USING btree ("puzzle_id");--> statement-breakpoint
CREATE UNIQUE INDEX "padavali_puzzles_slug_idx" ON "padavali_puzzles" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "padavali_puzzles_listed_created_at_idx" ON "padavali_puzzles" USING btree ("listed","created_at");--> statement-breakpoint
CREATE INDEX "padavali_puzzles_listed_updated_at_idx" ON "padavali_puzzles" USING btree ("listed","updated_at");--> statement-breakpoint
CREATE INDEX "padavali_puzzles_listed_last_listed_at_idx" ON "padavali_puzzles" USING btree ("listed","last_listed_at");--> statement-breakpoint
ALTER TABLE "padavali_redirects" ADD CONSTRAINT "padavali_redirects_slug_unique" UNIQUE("slug");