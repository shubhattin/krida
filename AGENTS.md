# Package Manager

- Use the bun package manager for all things, so even if somewhere it says to use `npx` just use `bunx` as prefix instead always use bun over npm

# Shadcn component addition

- Use command in form `bunx shadcn@latest add <component-list>` to add components.

# General

- Never start the dev server, as it would be already running on the provisioned port.
- Never run git commit commands on your own

# AI

- Before making any new chnages always read te current contens of file as soemtimes there might be manually done changes which might overwrite.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
