# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Expert Case Review PACT — a modified Delphi-style expert rating platform where reviewers score **cognitive tasks** (not individual patient vignettes) in a single section using three 1–5 Likert scales, each rendered as a row of radio buttons: Clinical Relevance, Performance Variance, and AI Augmentation Potential.

Clinical Relevance asks how important the task is to everyday clinical care (it previously asked how
severe the consequences of poor performance were; the anchors moved with it). Performance Variance asks
how much competent clinicians would disagree about the right path forward on the task. It replaced the earlier "Benchmarkability / Saturation" dimension in migration 021, which also renamed `ratings.benchmarkability` to `performance_variance` — the two ask different questions, so ratings are not comparable across that boundary.

Each task is graded on its own page and grounded by two case seeds — one Emergency Department, one Primary Care. A seed is a one-sentence clinical situation plus the decision the clinician must make out loud; it is not a full vignette.

The task set is the **Erasmus V6 taxonomy**: 17 constructs sourced from `PACT_EMC_V6_Tasks_CaseSeeds_1.xlsx` sheet `Cognitive Tasks` (ARPA/PACT Round-1 Codebook V6, 4 Aug 2026) and hardcoded in `lib/case-content.ts`.

All 17 live in **one section** (`all-tasks`, "Cognitive Tasks") at `order_index` 0..16 in codebook order T1..T17. Migration 023 collapsed the earlier Management / Diagnostic Reasoning / Communication split: the V6 constructs cut across those categories — metacognitive self-regulation is neither diagnosis nor communication, multi-patient monitoring neither management nor diagnosis — so the three-way grouping, inherited from Stanford V3, misdescribed the task set. That migration also dropped `sections_name_check`, a CHECK constraint from migration 017 that hard-coded the three old section names. `task_code` carries the codebook number (`T1`–`T17`) and is load-bearing — each construct's `construct_boundary` refers to its neighbours by it ("drifted to task 4"). `construct_boundary`, `case_format`, and `status` are stored but not yet rendered. Superseded V3 ratings are preserved in `ratings_archive_v3`.

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

There is a single section and nothing is gated; tasks may be rated in any order. `lib/review-flow.ts` keeps the section machinery (`SECTION_ORDER`, `buildSectionProgress`, `locked` always false) so a future round can reintroduce groupings without reworking the routes.

## Environment Variables

Required in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

## Deployment

Vercel project `expert-case-review-pact`, auto-deploying `main`.

**Commits must be authored with an email registered to a GitHub account.** This
project has Git author verification enabled, so a push whose commit email is not
on a GitHub account is rejected with:

```
Deployment Blocked — The deployment was blocked because the commit email
<address> could not be matched to a GitHub account.
```

The build never starts, `vercel ls` reports the deployment's status as `UNKNOWN`
rather than `Error`, and the production domain silently keeps serving the
previous deployment — so the site looks stale with no obvious failure. Check
`git config user.email` against the GitHub account before pushing.
`<id>+<login>@users.noreply.github.com` always matches.

Deployment URLs (`*-<hash>-<team>.vercel.app`) sit behind Vercel Deployment
Protection and redirect to a Vercel login, so they cannot be smoke-tested
unauthenticated. Test the production domain, or run the app locally against the
hosted database.

Schema changes are **not** applied by the build (`build` is plain `next build`).
Migrations in `supabase/migrations/` must be run against the target database
separately, before deploying code that depends on them. `supabase/bootstrap_v6.sql`
stands up a brand-new project in one paste.

## Key Conventions

- Path alias: `@/*` maps to project root (configured in tsconfig.json)
- TypeScript strict mode enabled
- Types defined in `lib/types.ts`
- Seed script (`scripts/seed-cases.mjs`) upserts by section slug + order_index
