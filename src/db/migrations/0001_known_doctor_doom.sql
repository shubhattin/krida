CREATE TABLE "puzzle_gameplay_stats" (
	"id" serial PRIMARY KEY NOT NULL,
	"puzzle_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"time_taken" integer NOT NULL,
	"accuracy" integer NOT NULL,
	"correct_attempts" integer NOT NULL,
	"total_attempts" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "puzzle_gameplay_stats" ADD CONSTRAINT "puzzle_gameplay_stats_puzzle_id_word_puzzles_id_fk" FOREIGN KEY ("puzzle_id") REFERENCES "public"."word_puzzles"("id") ON DELETE cascade ON UPDATE no action;