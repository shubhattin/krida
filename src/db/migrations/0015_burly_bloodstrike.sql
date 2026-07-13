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
--> statement-breakpoint
CREATE INDEX "crossord_puzzles_listed_created_at_idx" ON "crossord_puzzles" USING btree ("listed","created_at");--> statement-breakpoint
CREATE INDEX "crossord_puzzles_listed_updated_at_idx" ON "crossord_puzzles" USING btree ("listed","updated_at");--> statement-breakpoint
CREATE INDEX "crossord_puzzles_listed_last_listed_at_idx" ON "crossord_puzzles" USING btree ("listed","last_listed_at");