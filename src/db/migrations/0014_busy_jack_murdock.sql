CREATE TABLE "ai_batch_responses" (
	"batch_id" text NOT NULL,
	"custom_id" text NOT NULL,
	"auto_approved" boolean DEFAULT false NOT NULL,
	"metadata" jsonb NOT NULL,
	CONSTRAINT "ai_batch_responses_batch_id_custom_id_pk" PRIMARY KEY("batch_id","custom_id")
);
--> statement-breakpoint
CREATE TABLE "ai_batches" (
	"batch_id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"output_resolved" boolean DEFAULT false NOT NULL,
	"input_file_id" text NOT NULL,
	"output_file_id" text
);
--> statement-breakpoint
ALTER TABLE "ai_batch_responses" ADD CONSTRAINT "ai_batch_responses_batch_id_ai_batches_batch_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."ai_batches"("batch_id") ON DELETE cascade ON UPDATE no action;