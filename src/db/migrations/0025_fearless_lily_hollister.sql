CREATE TABLE "dvayi_attachments" (
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
CREATE TABLE "dvayi_collection_items" (
	"collection_id" integer NOT NULL,
	"puzzle_id" integer NOT NULL,
	"order_index" smallint DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dvayi_collection_items_collection_id_puzzle_id_pk" PRIMARY KEY("collection_id","puzzle_id")
);
--> statement-breakpoint
CREATE TABLE "dvayi_gameplay_stats" (
	"id" serial PRIMARY KEY NOT NULL,
	"puzzle_id" integer NOT NULL,
	"session_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"time_taken" integer NOT NULL,
	"accuracy" integer NOT NULL,
	"correct_attempts" integer NOT NULL,
	"total_attempts" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dvayi_puzzle_tags" (
	"puzzle_id" integer NOT NULL,
	"tag_id" integer NOT NULL,
	CONSTRAINT "dvayi_puzzle_tags_puzzle_id_tag_id_pk" PRIMARY KEY("puzzle_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "dvayi_puzzles" (
	"id" serial PRIMARY KEY NOT NULL,
	"uid" text NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"puzzle_data" jsonb NOT NULL,
	"listed" boolean DEFAULT false NOT NULL,
	"last_listed_at" timestamp with time zone,
	"image_id" integer,
	CONSTRAINT "dvayi_puzzles_uid_unique" UNIQUE("uid")
);
--> statement-breakpoint
CREATE TABLE "dvayi_redirects" (
	"id" serial PRIMARY KEY NOT NULL,
	"puzzle_id" integer NOT NULL,
	"slug" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dvayi_redirects_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "dvayi_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"puzzle_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"location" varchar(25),
	"script" text,
	"user_id" text
);
--> statement-breakpoint
CREATE TABLE "bhramita_attachments" (
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
CREATE TABLE "bhramita_collection_items" (
	"collection_id" integer NOT NULL,
	"puzzle_id" integer NOT NULL,
	"order_index" smallint DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bhramita_collection_items_collection_id_puzzle_id_pk" PRIMARY KEY("collection_id","puzzle_id")
);
--> statement-breakpoint
CREATE TABLE "bhramita_gameplay_stats" (
	"id" serial PRIMARY KEY NOT NULL,
	"puzzle_id" integer NOT NULL,
	"session_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"time_taken" integer NOT NULL,
	"accuracy" integer NOT NULL,
	"correct_attempts" integer NOT NULL,
	"total_attempts" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bhramita_puzzle_tags" (
	"puzzle_id" integer NOT NULL,
	"tag_id" integer NOT NULL,
	CONSTRAINT "bhramita_puzzle_tags_puzzle_id_tag_id_pk" PRIMARY KEY("puzzle_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "bhramita_puzzles" (
	"id" serial PRIMARY KEY NOT NULL,
	"uid" text NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"puzzle_data" jsonb NOT NULL,
	"listed" boolean DEFAULT false NOT NULL,
	"last_listed_at" timestamp with time zone,
	"image_id" integer,
	CONSTRAINT "bhramita_puzzles_uid_unique" UNIQUE("uid")
);
--> statement-breakpoint
CREATE TABLE "bhramita_redirects" (
	"id" serial PRIMARY KEY NOT NULL,
	"puzzle_id" integer NOT NULL,
	"slug" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bhramita_redirects_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "bhramita_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"puzzle_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"location" varchar(25),
	"script" text,
	"user_id" text
);
--> statement-breakpoint
CREATE TABLE "surupa_attachments" (
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
CREATE TABLE "surupa_collection_items" (
	"collection_id" integer NOT NULL,
	"puzzle_id" integer NOT NULL,
	"order_index" smallint DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "surupa_collection_items_collection_id_puzzle_id_pk" PRIMARY KEY("collection_id","puzzle_id")
);
--> statement-breakpoint
CREATE TABLE "surupa_gameplay_stats" (
	"id" serial PRIMARY KEY NOT NULL,
	"puzzle_id" integer NOT NULL,
	"session_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"time_taken" integer NOT NULL,
	"accuracy" integer NOT NULL,
	"correct_attempts" integer NOT NULL,
	"total_attempts" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "surupa_puzzle_tags" (
	"puzzle_id" integer NOT NULL,
	"tag_id" integer NOT NULL,
	CONSTRAINT "surupa_puzzle_tags_puzzle_id_tag_id_pk" PRIMARY KEY("puzzle_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "surupa_puzzles" (
	"id" serial PRIMARY KEY NOT NULL,
	"uid" text NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"puzzle_data" jsonb NOT NULL,
	"listed" boolean DEFAULT false NOT NULL,
	"last_listed_at" timestamp with time zone,
	"image_id" integer,
	CONSTRAINT "surupa_puzzles_uid_unique" UNIQUE("uid")
);
--> statement-breakpoint
CREATE TABLE "surupa_redirects" (
	"id" serial PRIMARY KEY NOT NULL,
	"puzzle_id" integer NOT NULL,
	"slug" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "surupa_redirects_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "surupa_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"puzzle_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"location" varchar(25),
	"script" text,
	"user_id" text
);
--> statement-breakpoint
CREATE TABLE "anveshi_attachments" (
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
CREATE TABLE "anveshi_collection_items" (
	"collection_id" integer NOT NULL,
	"puzzle_id" integer NOT NULL,
	"order_index" smallint DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "anveshi_collection_items_collection_id_puzzle_id_pk" PRIMARY KEY("collection_id","puzzle_id")
);
--> statement-breakpoint
CREATE TABLE "anveshi_gameplay_stats" (
	"id" serial PRIMARY KEY NOT NULL,
	"puzzle_id" integer NOT NULL,
	"session_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"time_taken" integer NOT NULL,
	"accuracy" integer NOT NULL,
	"correct_attempts" integer NOT NULL,
	"total_attempts" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "anveshi_puzzle_tags" (
	"puzzle_id" integer NOT NULL,
	"tag_id" integer NOT NULL,
	CONSTRAINT "anveshi_puzzle_tags_puzzle_id_tag_id_pk" PRIMARY KEY("puzzle_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "anveshi_puzzles" (
	"id" serial PRIMARY KEY NOT NULL,
	"uid" text NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"puzzle_data" jsonb NOT NULL,
	"listed" boolean DEFAULT false NOT NULL,
	"last_listed_at" timestamp with time zone,
	"image_id" integer,
	CONSTRAINT "anveshi_puzzles_uid_unique" UNIQUE("uid")
);
--> statement-breakpoint
CREATE TABLE "anveshi_redirects" (
	"id" serial PRIMARY KEY NOT NULL,
	"puzzle_id" integer NOT NULL,
	"slug" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "anveshi_redirects_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "anveshi_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"puzzle_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"location" varchar(25),
	"script" text,
	"user_id" text
);
--> statement-breakpoint
ALTER TABLE "dvayi_attachments" ADD CONSTRAINT "dvayi_attachments_puzzle_id_dvayi_puzzles_id_fk" FOREIGN KEY ("puzzle_id") REFERENCES "public"."dvayi_puzzles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dvayi_collection_items" ADD CONSTRAINT "dvayi_collection_items_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dvayi_collection_items" ADD CONSTRAINT "dvayi_collection_items_puzzle_id_dvayi_puzzles_id_fk" FOREIGN KEY ("puzzle_id") REFERENCES "public"."dvayi_puzzles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dvayi_gameplay_stats" ADD CONSTRAINT "dvayi_gameplay_stats_puzzle_id_dvayi_puzzles_id_fk" FOREIGN KEY ("puzzle_id") REFERENCES "public"."dvayi_puzzles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dvayi_gameplay_stats" ADD CONSTRAINT "dvayi_gameplay_stats_session_id_dvayi_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."dvayi_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dvayi_puzzle_tags" ADD CONSTRAINT "dvayi_puzzle_tags_puzzle_id_dvayi_puzzles_id_fk" FOREIGN KEY ("puzzle_id") REFERENCES "public"."dvayi_puzzles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dvayi_puzzle_tags" ADD CONSTRAINT "dvayi_puzzle_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dvayi_puzzles" ADD CONSTRAINT "dvayi_puzzles_image_id_image_assets_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."image_assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dvayi_redirects" ADD CONSTRAINT "dvayi_redirects_puzzle_id_dvayi_puzzles_id_fk" FOREIGN KEY ("puzzle_id") REFERENCES "public"."dvayi_puzzles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dvayi_sessions" ADD CONSTRAINT "dvayi_sessions_puzzle_id_dvayi_puzzles_id_fk" FOREIGN KEY ("puzzle_id") REFERENCES "public"."dvayi_puzzles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bhramita_attachments" ADD CONSTRAINT "bhramita_attachments_puzzle_id_bhramita_puzzles_id_fk" FOREIGN KEY ("puzzle_id") REFERENCES "public"."bhramita_puzzles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bhramita_collection_items" ADD CONSTRAINT "bhramita_collection_items_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bhramita_collection_items" ADD CONSTRAINT "bhramita_collection_items_puzzle_id_bhramita_puzzles_id_fk" FOREIGN KEY ("puzzle_id") REFERENCES "public"."bhramita_puzzles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bhramita_gameplay_stats" ADD CONSTRAINT "bhramita_gameplay_stats_puzzle_id_bhramita_puzzles_id_fk" FOREIGN KEY ("puzzle_id") REFERENCES "public"."bhramita_puzzles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bhramita_gameplay_stats" ADD CONSTRAINT "bhramita_gameplay_stats_session_id_bhramita_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."bhramita_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bhramita_puzzle_tags" ADD CONSTRAINT "bhramita_puzzle_tags_puzzle_id_bhramita_puzzles_id_fk" FOREIGN KEY ("puzzle_id") REFERENCES "public"."bhramita_puzzles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bhramita_puzzle_tags" ADD CONSTRAINT "bhramita_puzzle_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bhramita_puzzles" ADD CONSTRAINT "bhramita_puzzles_image_id_image_assets_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."image_assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bhramita_redirects" ADD CONSTRAINT "bhramita_redirects_puzzle_id_bhramita_puzzles_id_fk" FOREIGN KEY ("puzzle_id") REFERENCES "public"."bhramita_puzzles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bhramita_sessions" ADD CONSTRAINT "bhramita_sessions_puzzle_id_bhramita_puzzles_id_fk" FOREIGN KEY ("puzzle_id") REFERENCES "public"."bhramita_puzzles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "surupa_attachments" ADD CONSTRAINT "surupa_attachments_puzzle_id_surupa_puzzles_id_fk" FOREIGN KEY ("puzzle_id") REFERENCES "public"."surupa_puzzles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "surupa_collection_items" ADD CONSTRAINT "surupa_collection_items_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "surupa_collection_items" ADD CONSTRAINT "surupa_collection_items_puzzle_id_surupa_puzzles_id_fk" FOREIGN KEY ("puzzle_id") REFERENCES "public"."surupa_puzzles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "surupa_gameplay_stats" ADD CONSTRAINT "surupa_gameplay_stats_puzzle_id_surupa_puzzles_id_fk" FOREIGN KEY ("puzzle_id") REFERENCES "public"."surupa_puzzles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "surupa_gameplay_stats" ADD CONSTRAINT "surupa_gameplay_stats_session_id_surupa_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."surupa_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "surupa_puzzle_tags" ADD CONSTRAINT "surupa_puzzle_tags_puzzle_id_surupa_puzzles_id_fk" FOREIGN KEY ("puzzle_id") REFERENCES "public"."surupa_puzzles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "surupa_puzzle_tags" ADD CONSTRAINT "surupa_puzzle_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "surupa_puzzles" ADD CONSTRAINT "surupa_puzzles_image_id_image_assets_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."image_assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "surupa_redirects" ADD CONSTRAINT "surupa_redirects_puzzle_id_surupa_puzzles_id_fk" FOREIGN KEY ("puzzle_id") REFERENCES "public"."surupa_puzzles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "surupa_sessions" ADD CONSTRAINT "surupa_sessions_puzzle_id_surupa_puzzles_id_fk" FOREIGN KEY ("puzzle_id") REFERENCES "public"."surupa_puzzles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "anveshi_attachments" ADD CONSTRAINT "anveshi_attachments_puzzle_id_anveshi_puzzles_id_fk" FOREIGN KEY ("puzzle_id") REFERENCES "public"."anveshi_puzzles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "anveshi_collection_items" ADD CONSTRAINT "anveshi_collection_items_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "anveshi_collection_items" ADD CONSTRAINT "anveshi_collection_items_puzzle_id_anveshi_puzzles_id_fk" FOREIGN KEY ("puzzle_id") REFERENCES "public"."anveshi_puzzles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "anveshi_gameplay_stats" ADD CONSTRAINT "anveshi_gameplay_stats_puzzle_id_anveshi_puzzles_id_fk" FOREIGN KEY ("puzzle_id") REFERENCES "public"."anveshi_puzzles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "anveshi_gameplay_stats" ADD CONSTRAINT "anveshi_gameplay_stats_session_id_anveshi_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."anveshi_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "anveshi_puzzle_tags" ADD CONSTRAINT "anveshi_puzzle_tags_puzzle_id_anveshi_puzzles_id_fk" FOREIGN KEY ("puzzle_id") REFERENCES "public"."anveshi_puzzles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "anveshi_puzzle_tags" ADD CONSTRAINT "anveshi_puzzle_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "anveshi_puzzles" ADD CONSTRAINT "anveshi_puzzles_image_id_image_assets_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."image_assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "anveshi_redirects" ADD CONSTRAINT "anveshi_redirects_puzzle_id_anveshi_puzzles_id_fk" FOREIGN KEY ("puzzle_id") REFERENCES "public"."anveshi_puzzles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "anveshi_sessions" ADD CONSTRAINT "anveshi_sessions_puzzle_id_anveshi_puzzles_id_fk" FOREIGN KEY ("puzzle_id") REFERENCES "public"."anveshi_puzzles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "dvayi_attachments_puzzle_id_idx" ON "dvayi_attachments" USING btree ("puzzle_id");--> statement-breakpoint
CREATE INDEX "dvayi_collection_items_puzzle_id_idx" ON "dvayi_collection_items" USING btree ("puzzle_id");--> statement-breakpoint
CREATE INDEX "dvayi_gameplay_stats_puzzle_id_created_at_idx" ON "dvayi_gameplay_stats" USING btree ("puzzle_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "dvayi_gameplay_stats_session_id_idx" ON "dvayi_gameplay_stats" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "dvayi_puzzle_tags_tag_id_idx" ON "dvayi_puzzle_tags" USING btree ("tag_id");--> statement-breakpoint
CREATE UNIQUE INDEX "dvayi_puzzles_slug_idx" ON "dvayi_puzzles" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "dvayi_puzzles_listed_created_at_idx" ON "dvayi_puzzles" USING btree ("listed","created_at");--> statement-breakpoint
CREATE INDEX "dvayi_puzzles_listed_updated_at_idx" ON "dvayi_puzzles" USING btree ("listed","updated_at");--> statement-breakpoint
CREATE INDEX "dvayi_puzzles_listed_last_listed_at_idx" ON "dvayi_puzzles" USING btree ("listed","last_listed_at");--> statement-breakpoint
CREATE INDEX "dvayi_sessions_puzzle_id_created_at_idx" ON "dvayi_sessions" USING btree ("puzzle_id","created_at");--> statement-breakpoint
CREATE INDEX "dvayi_sessions_user_id_created_at_idx" ON "dvayi_sessions" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "dvayi_sessions_user_id_puzzle_id_idx" ON "dvayi_sessions" USING btree ("user_id","puzzle_id");--> statement-breakpoint
CREATE INDEX "dvayi_sessions_puzzle_id_user_id_idx" ON "dvayi_sessions" USING btree ("puzzle_id","user_id");--> statement-breakpoint
CREATE INDEX "bhramita_attachments_puzzle_id_idx" ON "bhramita_attachments" USING btree ("puzzle_id");--> statement-breakpoint
CREATE INDEX "bhramita_collection_items_puzzle_id_idx" ON "bhramita_collection_items" USING btree ("puzzle_id");--> statement-breakpoint
CREATE INDEX "bhramita_gameplay_stats_puzzle_id_created_at_idx" ON "bhramita_gameplay_stats" USING btree ("puzzle_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "bhramita_gameplay_stats_session_id_idx" ON "bhramita_gameplay_stats" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "bhramita_puzzle_tags_tag_id_idx" ON "bhramita_puzzle_tags" USING btree ("tag_id");--> statement-breakpoint
CREATE UNIQUE INDEX "bhramita_puzzles_slug_idx" ON "bhramita_puzzles" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "bhramita_puzzles_listed_created_at_idx" ON "bhramita_puzzles" USING btree ("listed","created_at");--> statement-breakpoint
CREATE INDEX "bhramita_puzzles_listed_updated_at_idx" ON "bhramita_puzzles" USING btree ("listed","updated_at");--> statement-breakpoint
CREATE INDEX "bhramita_puzzles_listed_last_listed_at_idx" ON "bhramita_puzzles" USING btree ("listed","last_listed_at");--> statement-breakpoint
CREATE INDEX "bhramita_sessions_puzzle_id_created_at_idx" ON "bhramita_sessions" USING btree ("puzzle_id","created_at");--> statement-breakpoint
CREATE INDEX "bhramita_sessions_user_id_created_at_idx" ON "bhramita_sessions" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "bhramita_sessions_user_id_puzzle_id_idx" ON "bhramita_sessions" USING btree ("user_id","puzzle_id");--> statement-breakpoint
CREATE INDEX "bhramita_sessions_puzzle_id_user_id_idx" ON "bhramita_sessions" USING btree ("puzzle_id","user_id");--> statement-breakpoint
CREATE INDEX "surupa_attachments_puzzle_id_idx" ON "surupa_attachments" USING btree ("puzzle_id");--> statement-breakpoint
CREATE INDEX "surupa_collection_items_puzzle_id_idx" ON "surupa_collection_items" USING btree ("puzzle_id");--> statement-breakpoint
CREATE INDEX "surupa_gameplay_stats_puzzle_id_created_at_idx" ON "surupa_gameplay_stats" USING btree ("puzzle_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "surupa_gameplay_stats_session_id_idx" ON "surupa_gameplay_stats" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "surupa_puzzle_tags_tag_id_idx" ON "surupa_puzzle_tags" USING btree ("tag_id");--> statement-breakpoint
CREATE UNIQUE INDEX "surupa_puzzles_slug_idx" ON "surupa_puzzles" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "surupa_puzzles_listed_created_at_idx" ON "surupa_puzzles" USING btree ("listed","created_at");--> statement-breakpoint
CREATE INDEX "surupa_puzzles_listed_updated_at_idx" ON "surupa_puzzles" USING btree ("listed","updated_at");--> statement-breakpoint
CREATE INDEX "surupa_puzzles_listed_last_listed_at_idx" ON "surupa_puzzles" USING btree ("listed","last_listed_at");--> statement-breakpoint
CREATE INDEX "surupa_sessions_puzzle_id_created_at_idx" ON "surupa_sessions" USING btree ("puzzle_id","created_at");--> statement-breakpoint
CREATE INDEX "surupa_sessions_user_id_created_at_idx" ON "surupa_sessions" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "surupa_sessions_user_id_puzzle_id_idx" ON "surupa_sessions" USING btree ("user_id","puzzle_id");--> statement-breakpoint
CREATE INDEX "surupa_sessions_puzzle_id_user_id_idx" ON "surupa_sessions" USING btree ("puzzle_id","user_id");--> statement-breakpoint
CREATE INDEX "anveshi_attachments_puzzle_id_idx" ON "anveshi_attachments" USING btree ("puzzle_id");--> statement-breakpoint
CREATE INDEX "anveshi_collection_items_puzzle_id_idx" ON "anveshi_collection_items" USING btree ("puzzle_id");--> statement-breakpoint
CREATE INDEX "anveshi_gameplay_stats_puzzle_id_created_at_idx" ON "anveshi_gameplay_stats" USING btree ("puzzle_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "anveshi_gameplay_stats_session_id_idx" ON "anveshi_gameplay_stats" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "anveshi_puzzle_tags_tag_id_idx" ON "anveshi_puzzle_tags" USING btree ("tag_id");--> statement-breakpoint
CREATE UNIQUE INDEX "anveshi_puzzles_slug_idx" ON "anveshi_puzzles" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "anveshi_puzzles_listed_created_at_idx" ON "anveshi_puzzles" USING btree ("listed","created_at");--> statement-breakpoint
CREATE INDEX "anveshi_puzzles_listed_updated_at_idx" ON "anveshi_puzzles" USING btree ("listed","updated_at");--> statement-breakpoint
CREATE INDEX "anveshi_puzzles_listed_last_listed_at_idx" ON "anveshi_puzzles" USING btree ("listed","last_listed_at");--> statement-breakpoint
CREATE INDEX "anveshi_sessions_puzzle_id_created_at_idx" ON "anveshi_sessions" USING btree ("puzzle_id","created_at");--> statement-breakpoint
CREATE INDEX "anveshi_sessions_user_id_created_at_idx" ON "anveshi_sessions" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "anveshi_sessions_user_id_puzzle_id_idx" ON "anveshi_sessions" USING btree ("user_id","puzzle_id");--> statement-breakpoint
CREATE INDEX "anveshi_sessions_puzzle_id_user_id_idx" ON "anveshi_sessions" USING btree ("puzzle_id","user_id");