CREATE TYPE "public"."agent_kind" AS ENUM('general', 'puzzle_creator');--> statement-breakpoint
CREATE TABLE "agent_chat_puzzles" (
	"chat_id" text NOT NULL,
	"tool_call_id" text NOT NULL,
	"puzzle_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "agent_chat_puzzles_chat_id_tool_call_id_pk" PRIMARY KEY("chat_id","tool_call_id")
);
--> statement-breakpoint
CREATE TABLE "agent_chats" (
	"id" text PRIMARY KEY NOT NULL,
	"agent_kind" "agent_kind" NOT NULL,
	"game_kind" "game_kind",
	"model" text NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"user_id" text NOT NULL,
	"creator_options" jsonb,
	"context_snapshot" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"chat_id" text NOT NULL,
	"role" text NOT NULL,
	"parts" jsonb NOT NULL,
	"metadata" jsonb,
	"position" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agent_chat_puzzles" ADD CONSTRAINT "agent_chat_puzzles_chat_id_agent_chats_id_fk" FOREIGN KEY ("chat_id") REFERENCES "public"."agent_chats"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_chat_puzzles" ADD CONSTRAINT "agent_chat_puzzles_puzzle_id_puzzles_id_fk" FOREIGN KEY ("puzzle_id") REFERENCES "public"."puzzles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_messages" ADD CONSTRAINT "agent_messages_chat_id_agent_chats_id_fk" FOREIGN KEY ("chat_id") REFERENCES "public"."agent_chats"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agent_chat_puzzles_puzzle_id_idx" ON "agent_chat_puzzles" USING btree ("puzzle_id");--> statement-breakpoint
CREATE INDEX "agent_chats_updated_at_idx" ON "agent_chats" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "agent_messages_chat_id_position_idx" ON "agent_messages" USING btree ("chat_id","position");