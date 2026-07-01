CREATE TABLE "word_puzzle_redirects" (
	"id" serial PRIMARY KEY NOT NULL,
	"puzzle_id" integer NOT NULL,
	"slug" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "word_puzzle_redirects_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "word_puzzle_redirects" ADD CONSTRAINT "word_puzzle_redirects_puzzle_id_word_puzzles_id_fk" FOREIGN KEY ("puzzle_id") REFERENCES "public"."word_puzzles"("id") ON DELETE cascade ON UPDATE no action;