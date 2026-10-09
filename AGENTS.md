# Stack

- TanStack Start app (SSR, file-based routing) + tRPC backend + Drizzle ORM (PostgreSQL).

# Structure

- `src/routes/` – frontend pages/routes; `src/routes/api/` – server API handlers
- `src/api/routers/` – tRPC routers, merged in `src/api/trpc_router.ts`
- `src/api/client.ts`, `src/api/server.ts` – tRPC client/server entrypoints
- `src/db/schema/` – Drizzle schema source of truth (see `index.ts`); migrations in `src/db/migrations/`
- `src/components/pages/` – page views; `src/components/ui/` – shadcn components
- `src/lib/` – server helpers (auth, `request-context.ts`, `posthog-server.ts`)
- `src/state/queryClient.ts` – React Query + tRPC client setup

# Commands

- `bun run check` – typecheck, `bun run lint` / `bun run format`, `bun run test` – vitest

# Conventions

- Path alias `#/*` maps to `./src/*` (see `package.json` imports).
- New tRPC backend: add router in `src/api/routers/` + register in `src/api/trpc_router.ts`.
- New server logic: prefer `Effect` services in `src/effect/`.

# Package Manager

- Use the bun package manager for all things, so even if somewhere it says to use `npx` just use `bunx` as prefix instead always use bun over npm

# Shadcn component addition

- Use command in form `bunx shadcn@latest add <component-list>` to add components.

# General

- Never start the dev server, as it would be already running on the provisioned port.
- Never run git commit commands on your own

# Lipi Lekhika

Whenever you add Lipi Lekhika typing on an input, search field, or dialog:

- Default the switch **off**, unless the user explicitly asks for it on.
- Also wire **Alt+X / Alt+C** to toggle it (same pattern as existing catalog and hub search).

# AI

- Before making any new chnages always read te current contens of file as soemtimes there might be manually done changes which might overwrite.

# Subagents

- When running in cursor harness always use only Cursor composer and grok models for subagents.
