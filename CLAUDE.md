# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Expert Case Review PACT — a modified Delphi-style expert rating platform where reviewers score **cognitive tasks** (not individual patient vignettes) across three sections (Management, Diagnostic Reasoning, Communication) using three 1–5 Likert sliders: Clinical Relevance, Benchmarkability / Saturation, and AI Augmentation Potential.

Each task is graded on its own page and grounded by two worked example cases — one Emergency Department, one Primary Care. The task set is the V3 taxonomy: 17 tasks (5 Management, 7 Diagnostic, 5 Communication), sourced from `High Risk Cognitive Tasks (1).xlsx` sheet `V3 Task List` and hardcoded in `lib/case-content.ts`.

## Commands

- `npm run dev` — start Next.js dev server on port 3000
- `npm run build` — production build
- `npm run lint` — ESLint via Next.js
- `npm run seed:cases -- data/example-cases.json` — seed case data (supports JSON and CSV)
- No test framework is configured

## Architecture

**Next.js 15 App Router + React 19 + Supabase PostgreSQL**, deployed on Vercel.

### Routing

- `/login` — registration (auto-generates reviewer code) and sign-in (code + last name)
- `/` — section selection dashboard (protected)
- `/sections/[slug]` — 3-column review UI: sidebar nav, case content, scoring panel (protected)
- `/sections/[slug]/merge-review` — post-completion merge review (protected)
- `/admin` — completion stats and CSV export (admin-only, role set manually in DB)
- `/api/ratings`, `/api/merge-review`, `/api/final-review`, `/api/section-time`, `/api/admin/export` — REST API routes

### Auth

Custom session system (not Supabase Auth). Reviewers self-register and get a unique code (e.g. `R7A3C9`). Sign-in validates code + last name. Sessions use a 32-byte token hashed with SHA256, stored in `reviewer_sessions` table, with an httpOnly cookie (`REVIEWER_SESSION_COOKIE`). Middleware in `middleware.ts` guards `/sections/*` and `/admin`.

Session helpers live in `lib/reviewer-session.ts`. Admin role is set directly in the database.

### Data Flow

- **Server Components** fetch data with `createAdminClient()` (service role, bypasses RLS)
- **Client Components** call API routes for mutations (ratings, time tracking, feedback)
- **ReviewPanel** autosaves ratings with 350ms debounce via POST `/api/ratings`
- Ratings call the `save_reviewer_rating()` Supabase RPC function
- A case is completed only when all three Likert values are non-NULL

### Database

Raw SQL migrations in `supabase/migrations/` (no ORM). Key tables: `reviewers`, `reviewer_sessions`, `sections`, `cases`, `ratings`, `post_review_feedback`, `case_merge_feedback`. Admin client in `lib/supabase/admin.ts`, browser client in `lib/supabase/client.ts`.

### Styling

All styles in `app/globals.css` (plain CSS, no Tailwind or CSS-in-JS). The review page uses CSS Grid with a 3-column layout.

### Section Progression

All three sections are open from the start — reviewers may work Management, Diagnostic Reasoning, and Communication in any order. Logic in `lib/review-flow.ts` (`locked` is always false).

## Environment Variables

Required in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

## Key Conventions

- Path alias: `@/*` maps to project root (configured in tsconfig.json)
- TypeScript strict mode enabled
- Types defined in `lib/types.ts`
- Seed script (`scripts/seed-cases.mjs`) upserts by section slug + order_index
