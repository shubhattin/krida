CREATE TABLE "ai_batch_responses" (
	"batch_id" text NOT NULL,
	"custom_id" text NOT NULL,
	"type" text NOT NULL,
	"output_resolved" boolean DEFAULT false NOT NULL,
	"auto_approved" boolean DEFAULT false NOT NULL,
	"metadata" jsonb NOT NULL,
	"input_file_id" text NOT NULL,
	"output_file_id" text
);
--> statement-breakpoint
CREATE UNIQUE INDEX "ai_batch_responses_batch_id_custom_id_idx" ON "ai_batch_responses" USING btree ("batch_id","custom_id");