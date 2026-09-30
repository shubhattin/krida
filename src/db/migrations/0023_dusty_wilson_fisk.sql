CREATE TABLE "collections" (
	"id" serial PRIMARY KEY NOT NULL,
	"uid" text NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"image_id" integer,
	"listed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "collections_uid_unique" UNIQUE("uid"),
	CONSTRAINT "collections_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tags_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "padavali_collection_items" (
	"collection_id" integer NOT NULL,
	"puzzle_id" integer NOT NULL,
	"order_index" smallint DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "padavali_collection_items_collection_id_puzzle_id_pk" PRIMARY KEY("collection_id","puzzle_id")
);
--> statement-breakpoint
CREATE TABLE "padavali_puzzle_tags" (
	"puzzle_id" integer NOT NULL,
	"tag_id" integer NOT NULL,
	CONSTRAINT "padavali_puzzle_tags_puzzle_id_tag_id_pk" PRIMARY KEY("puzzle_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "crossword_collection_items" (
	"collection_id" integer NOT NULL,
	"puzzle_id" integer NOT NULL,
	"order_index" smallint DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "crossword_collection_items_collection_id_puzzle_id_pk" PRIMARY KEY("collection_id","puzzle_id")
);
--> statement-breakpoint
CREATE TABLE "crossword_puzzle_tags" (
	"puzzle_id" integer NOT NULL,
	"tag_id" integer NOT NULL,
	CONSTRAINT "crossword_puzzle_tags_puzzle_id_tag_id_pk" PRIMARY KEY("puzzle_id","tag_id")
);
--> statement-breakpoint
ALTER TABLE "collections" ADD CONSTRAINT "collections_image_id_image_assets_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."image_assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "padavali_collection_items" ADD CONSTRAINT "padavali_collection_items_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "padavali_collection_items" ADD CONSTRAINT "padavali_collection_items_puzzle_id_padavali_puzzles_id_fk" FOREIGN KEY ("puzzle_id") REFERENCES "public"."padavali_puzzles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "padavali_puzzle_tags" ADD CONSTRAINT "padavali_puzzle_tags_puzzle_id_padavali_puzzles_id_fk" FOREIGN KEY ("puzzle_id") REFERENCES "public"."padavali_puzzles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "padavali_puzzle_tags" ADD CONSTRAINT "padavali_puzzle_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crossword_collection_items" ADD CONSTRAINT "crossword_collection_items_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crossword_collection_items" ADD CONSTRAINT "crossword_collection_items_puzzle_id_crossword_puzzles_id_fk" FOREIGN KEY ("puzzle_id") REFERENCES "public"."crossword_puzzles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crossword_puzzle_tags" ADD CONSTRAINT "crossword_puzzle_tags_puzzle_id_crossword_puzzles_id_fk" FOREIGN KEY ("puzzle_id") REFERENCES "public"."crossword_puzzles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crossword_puzzle_tags" ADD CONSTRAINT "crossword_puzzle_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "collections_listed_created_at_idx" ON "collections" USING btree ("listed","created_at");--> statement-breakpoint
CREATE INDEX "padavali_collection_items_puzzle_id_idx" ON "padavali_collection_items" USING btree ("puzzle_id");--> statement-breakpoint
CREATE INDEX "padavali_puzzle_tags_tag_id_idx" ON "padavali_puzzle_tags" USING btree ("tag_id");--> statement-breakpoint
CREATE INDEX "crossword_collection_items_puzzle_id_idx" ON "crossword_collection_items" USING btree ("puzzle_id");--> statement-breakpoint
CREATE INDEX "crossword_puzzle_tags_tag_id_idx" ON "crossword_puzzle_tags" USING btree ("tag_id");