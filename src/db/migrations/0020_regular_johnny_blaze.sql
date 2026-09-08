CREATE EXTENSION IF NOT EXISTS "pg_trgm";--> statement-breakpoint
CREATE INDEX "image_assets_created_at_id_idx" ON "image_assets" USING btree ("created_at","id");--> statement-breakpoint
CREATE INDEX "image_assets_description_trgm_idx" ON "image_assets" USING gin ("description" gin_trgm_ops);