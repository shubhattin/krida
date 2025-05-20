CREATE TABLE "word_puzzles" (
	"id" serial PRIMARY KEY NOT NULL,
	"uuid" uuid DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"word_list" jsonb NOT NULL,
	"grid_data" jsonb NOT NULL,
	"grid_dimensions" jsonb NOT NULL
);
--> statement-breakpoint
CREATE INDEX "word_puzzles_created_at_index" ON "word_puzzles" USING btree ("created_at");