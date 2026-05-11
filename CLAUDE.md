# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

祝融 Agent Webapp — a Next.js 15 chat application powered by the Claude Agent SDK with MCP (Model Context Protocol) tool integration. Users interact with an AI assistant through a three-panel layout (sidebar, chat, detail bar) with streaming responses and tool status display.

## Commands

```bash
npm run dev          # Start dev server (http://localhost:3000)
npm run build        # Production build
npm run start        # Start production server
npm run db:push      # Push Drizzle schema to SQLite
npm run db:studio    # Open Drizzle Studio (DB browser)
```

No test framework is configured.

## Architecture

### Agent System (`lib/agent/`)

The core AI integration uses `@anthropic-ai/claude-agent-sdk`. The flow:

1. **`client.ts`** — `query()` function accepts a prompt and returns an async generator of `StreamEvent`s. It configures the SDK with MCP servers and streams events including `tool_use`, `text_delta`, `thinking_delta`, `complete`, and `error`.
2. **`tools/`** — MCP tool definitions. Each tool uses `createSdkMcpServer()` to register as an MCP server. Currently: `web-search.ts` (Serper API).
3. **MCP naming convention** — Tools are referenced as `mcp__<server_name>__<tool_name>` (e.g., `mcp__web-search__WebSearch`). This is the full name used in `allowedTools` and detected in `content_block_start` events.

### API Routes (`app/api/`)

- **`/api/chat`** (POST) — Sends user prompt to the agent, streams SSE events back to the client. The stream controller uses a `controllerClosed` flag to prevent double-close errors.
- **`/api/chat`** (GET) — Lists conversations for a workspace.
- **`/api/messages`** (GET) — Fetches messages for a conversation.
- **`/api/workspaces`** (GET/POST) — CRUD for workspaces.

### Frontend

- **Three-panel layout** — `Sidebar` (workspaces + user menu), `ChatArea` (messages + input), `RightBar` (products + context files). All support collapse/expand.
- **Theme** — `next-themes` with system preference detection, persisted to localStorage. CSS variables in `globals.css` with `@custom-variant dark` for Tailwind v4.
- **Streaming** — Client reads SSE stream, updates messages in-place by `id`. Tool status shows animated icons during tool calls.
- **Shared types** — `lib/types.ts` exports `Workspace`, `Message`, `Product`, `ContextFile`, `TOOL_LABELS`, `BUDDY_KEYWORDS`.

### Database

SQLite via Drizzle ORM. Schema in `lib/db/schema.ts` with tables: `user`, `session`, `account`, `verification`, `conversation`, `message`, `workspace`. Auth uses Better Auth (`lib/auth/`).

### Key Dependencies

- **Next.js 15** with App Router — breaking changes from earlier versions; read `node_modules/next/dist/docs/` before writing code
- **Tailwind CSS v4** — uses `@theme inline` and `@custom-variant dark` instead of v3 config
- **shadcn/ui** — components in `components/ui/`, use `npx shadcn@latest add <component>`
- **lucide-react** — icon library (no emoji in the UI)

## Environment Variables

Required in `.env`:
- `ANTHROPIC_API_KEY` — Claude API key
- `SERPER_API_KEY` — Serper web search API key
- `BETTER_AUTH_SECRET` — Auth encryption secret
- `DATABASE_URL` — SQLite connection string (default: `file:./db.sqlite`)

## Conventions

- Color system uses HSL CSS variables. Primary color is teal/cyan (`199 89% 48%`). All theme colors flow through variables — never hardcode colors.
- No emoji in the UI — use lucide-react icons exclusively.
- No `prompt()` or `alert()` — use shadcn Dialog components.
- No border lines between modules — use background color differences and spacing.
- DropdownMenu uses `bg-sidebar-bg` background and `data-[highlighted]:bg-sidebar-hover` for hover state.
