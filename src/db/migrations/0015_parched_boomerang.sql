CREATE TABLE "crossord_puzzles" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text,
	"title" text NOT NULL,
	"description" text,
	"grid_dimensions" jsonb NOT NULL,
	"grid_data" jsonb NOT NULL,
	"word_list" jsonb NOT NULL,
	"listed" boolean DEFAULT false NOT NULL,
	"last_listed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
