CREATE TABLE "puzzle_gameplay_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"puzzle_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"location" varchar(25)
);
--> statement-breakpoint
ALTER TABLE "puzzle_gameplay_stats" ADD COLUMN "session_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "puzzle_gameplay_sessions" ADD CONSTRAINT "puzzle_gameplay_sessions_puzzle_id_word_puzzles_id_fk" FOREIGN KEY ("puzzle_id") REFERENCES "public"."word_puzzles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "puzzle_gameplay_stats" ADD CONSTRAINT "puzzle_gameplay_stats_session_id_puzzle_gameplay_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."puzzle_gameplay_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "puzzle_game_schedules" DROP COLUMN "completed";--> statement-breakpoint
ALTER TABLE "word_puzzles" DROP COLUMN "games_started";