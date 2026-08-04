# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Expert Case Review PACT — a modified Delphi-style expert rating platform where reviewers score **cognitive tasks** (not individual patient vignettes) across three sections (Management, Diagnostic Reasoning, Communication) using three 1–5 Likert scales, each rendered as a row of radio buttons: Clinical Relevance, Performance Variance, and AI Augmentation Potential.

Performance Variance asks how much competent clinicians would disagree about the right path forward on the task. It replaced the earlier "Benchmarkability / Saturation" dimension in migration 021, which also renamed `ratings.benchmarkability` to `performance_variance` — the two ask different questions, so ratings are not comparable across that boundary.

Each task is graded on its own page and grounded by two case seeds — one Emergency Department, one Primary Care. A seed is a one-sentence clinical situation plus the decision the clinician must make out loud; it is not a full vignette.

The task set is the **Erasmus V6 taxonomy**: 17 constructs (6 Management, 8 Diagnostic, 3 Communication), sourced from `PACT_EMC_V6_Tasks_CaseSeeds_1.xlsx` sheet `Cognitive Tasks` (ARPA/PACT Round-1 Codebook V6, 4 Aug 2026) and hardcoded in `lib/case-content.ts`. Section assignment follows the Stanford V3 task each V6 construct maps to in `PACT_Taxonomy_Crosswalk_EMC.xlsx`; constructs 5 and 17 have no Stanford equivalent, so their section is a judgment call. `task_code` carries the codebook number (`T1`–`T17`) and is load-bearing — each construct's `construct_boundary` refers to its neighbours by it ("drifted to task 4"). `construct_boundary`, `case_format`, and `status` are stored but not yet rendered. Superseded V3 ratings are preserved in `ratings_archive_v3`.

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
