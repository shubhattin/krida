ALTER TABLE "collections" ADD COLUMN "order_index" smallint;--> statement-breakpoint
CREATE INDEX "collections_listed_order_index_idx" ON "collections" USING btree ("listed","order_index");--> statement-breakpoint
ALTER TABLE "collections" ADD CONSTRAINT "collections_order_index_listed_check" CHECK ("collections"."order_index" is null or "collections"."listed");