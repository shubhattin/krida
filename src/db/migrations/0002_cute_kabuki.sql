CREATE TABLE "puzzle_game_schedules" (
	"id" serial PRIMARY KEY NOT NULL,
	"puzzle_id" integer NOT NULL,
	"start_time" timestamp with time zone NOT NULL,
	"end_time" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "word_puzzles" ADD COLUMN "archived" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "puzzle_game_schedules" ADD CONSTRAINT "puzzle_game_schedules_puzzle_id_word_puzzles_id_fk" FOREIGN KEY ("puzzle_id") REFERENCES "public"."word_puzzles"("id") ON DELETE cascade ON UPDATE no action;