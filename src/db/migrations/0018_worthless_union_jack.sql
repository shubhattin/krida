CREATE TABLE "crossword_attachments" (
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
CREATE TABLE "crossword_gameplay_stats" (
	"id" serial PRIMARY KEY NOT NULL,
	"puzzle_id" integer NOT NULL,
	"session_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"time_taken" integer NOT NULL,
	"accuracy" integer NOT NULL,
	"total_entries" integer NOT NULL,
	"total_cells" integer NOT NULL,
	"prefilled_cells" integer NOT NULL,
	"letter_inputs" integer NOT NULL,
	"incorrect_entry_attempts" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crossword_redirects" (
	"id" serial PRIMARY KEY NOT NULL,
	"puzzle_id" integer NOT NULL,
	"slug" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "crossword_redirects_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "crossword_schedules" (
	"id" serial PRIMARY KEY NOT NULL,
	"puzzle_id" integer NOT NULL,
	"start_time" timestamp with time zone NOT NULL,
	"end_time" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"listing_verify_key" text
);
--> statement-breakpoint
CREATE TABLE "crossword_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"puzzle_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"location" varchar(25)
);
--> statement-breakpoint
ALTER TABLE "crossword_puzzles" ALTER COLUMN "slug" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "crossword_puzzles" ADD COLUMN "image_id" integer;--> statement-breakpoint
ALTER TABLE "crossword_attachments" ADD CONSTRAINT "crossword_attachments_puzzle_id_crossword_puzzles_id_fk" FOREIGN KEY ("puzzle_id") REFERENCES "public"."crossword_puzzles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crossword_gameplay_stats" ADD CONSTRAINT "crossword_gameplay_stats_puzzle_id_crossword_puzzles_id_fk" FOREIGN KEY ("puzzle_id") REFERENCES "public"."crossword_puzzles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crossword_gameplay_stats" ADD CONSTRAINT "crossword_gameplay_stats_session_id_crossword_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."crossword_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crossword_redirects" ADD CONSTRAINT "crossword_redirects_puzzle_id_crossword_puzzles_id_fk" FOREIGN KEY ("puzzle_id") REFERENCES "public"."crossword_puzzles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crossword_schedules" ADD CONSTRAINT "crossword_schedules_puzzle_id_crossword_puzzles_id_fk" FOREIGN KEY ("puzzle_id") REFERENCES "public"."crossword_puzzles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crossword_sessions" ADD CONSTRAINT "crossword_sessions_puzzle_id_crossword_puzzles_id_fk" FOREIGN KEY ("puzzle_id") REFERENCES "public"."crossword_puzzles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "crossword_attachments_puzzle_id_idx" ON "crossword_attachments" USING btree ("puzzle_id");--> statement-breakpoint
CREATE INDEX "crossword_gameplay_stats_puzzle_id_created_at_idx" ON "crossword_gameplay_stats" USING btree ("puzzle_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "crossword_gameplay_stats_session_id_idx" ON "crossword_gameplay_stats" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "crossword_schedules_start_time_end_time_idx" ON "crossword_schedules" USING btree ("start_time","end_time");--> statement-breakpoint
CREATE INDEX "crossword_schedules_end_time_idx" ON "crossword_schedules" USING btree ("end_time");--> statement-breakpoint
CREATE INDEX "crossword_schedules_puzzle_id_created_at_idx" ON "crossword_schedules" USING btree ("puzzle_id","created_at");--> statement-breakpoint
CREATE INDEX "crossword_schedules_created_at_idx" ON "crossword_schedules" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "crossword_sessions_puzzle_id_created_at_idx" ON "crossword_sessions" USING btree ("puzzle_id","created_at");--> statement-breakpoint
ALTER TABLE "crossword_puzzles" ADD CONSTRAINT "crossword_puzzles_image_id_image_assets_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."image_assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "crossword_puzzles_slug_idx" ON "crossword_puzzles" USING btree ("slug");