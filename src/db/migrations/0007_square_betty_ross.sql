CREATE TYPE "public"."attachment_type" AS ENUM('link', 'youtube_video', 'youtube_playlist', 'youtube_embed');--> statement-breakpoint
CREATE TABLE "word_puzzle_attachments" (
	"id" serial PRIMARY KEY NOT NULL,
	"puzzle_id" integer NOT NULL,
	"type" "attachment_type" NOT NULL,
	"url" text NOT NULL,
	"title" text,
	"order_index" smallint DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "word_puzzle_attachments" ADD CONSTRAINT "word_puzzle_attachments_puzzle_id_word_puzzles_id_fk" FOREIGN KEY ("puzzle_id") REFERENCES "public"."word_puzzles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "word_puzzle_attachments_puzzle_id_idx" ON "word_puzzle_attachments" USING btree ("puzzle_id");--> statement-breakpoint
ALTER TABLE "word_puzzles" DROP COLUMN "discussion_url";