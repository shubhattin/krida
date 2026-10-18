CREATE TABLE "image_system_prompt_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"subject" text DEFAULT 'puzzle' NOT NULL,
	"title" text NOT NULL,
	"content" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "image_system_prompt_templates_subject_title_unique" UNIQUE("subject","title")
);
