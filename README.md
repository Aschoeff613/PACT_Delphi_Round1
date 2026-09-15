# PACT Delphi — Round 1 instrument

The web app panelists used in **Round 1** of the PACT Delphi: each of the 17
candidate cognitive tasks rated on three 1–5 scales (clinical relevance,
performance variance, AI augmentation potential).

Round 1 was fielded 3–11 August 2026.

## What this repository is

A copy of `perezcodex/expert-case-review-PACT`, taken at commit
`fe656c5`, brought under this account so the four PACT repositories sit
together and the Round 1 instrument is preserved alongside the round it
fielded.

**The live Round 1 deployment is still served from the original repository**,
from perezcodex's Vercel project `expert-case-review-pact`. This copy is not
connected to Vercel and pushing to it deploys nothing. The tracked `.vercel`
link that pointed at that project has been removed here, so running `vercel`
in this directory cannot deploy over the original.

Only `main` was copied. Four work-in-progress branches remain in the original.

| Repository | Role |
| --- | --- |
| **this repository** | Round 1 instrument — rating the 17 tasks |
| [PACT_Delphi_Round2](https://github.com/Aschoeff613/PACT_Delphi_Round2) | Round 2 instrument — ranking the 17 tasks |
| [PACT_Delphi_Analysis](https://github.com/Aschoeff613/PACT_Delphi_Analysis) | The R analysis for both rounds |
| [PACT_Literature_Review](https://github.com/Aschoeff613/PACT_Literature_Review) | Task taxonomy derivation |

---

Structured expert case rating app for a modified Delphi-style exercise using self-chosen reviewer codes instead of email magic links.

## Stack

- Next.js (App Router)
- Supabase Postgres
- Vercel deploy target

## Folder structure

```text
app/
  admin/
  api/
    admin/export/
    ratings/
  auth/callback/
  login/
  sections/[slug]/
components/
lib/
  supabase/
data/
scripts/
supabase/migrations/
```

## Features scaffolded

- Reviewer code registration/login with secure cookie session
- Three review sections: Management, Communication, Diagnostic
- Sticky left case navigation
- Center case review panel
- Sticky right scoring panel with four 1–7 Likert ratings
- Autosave of partial and complete ratings
- Progress persistence per user
- Admin page with section summary and CSV export
- Seed script for JSON or CSV case loading

## Environment variables

Copy `.env.example` to `.env.local` and set:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

## Supabase setup

1. Create a Supabase project.
2. Run the SQL in `supabase/migrations/001_init.sql` through `supabase/migrations/007_reviewer_code_auth.sql`.
3. Optionally mark one reviewer as admin after they self-register:

```sql
update public.reviewers
set role = 'admin'
where code = 'YOUR-CODE';
```

## Local development

1. Install dependencies:

```bash
npm install
```

2. Run the app:

```bash
npm run dev
```

3. Open:

```text
http://localhost:3000
```

## Seed data

Example seed file:

- `data/example-cases.json`
- `data/high-risk-cognitive-tasks-seed-draft.json`

Seed from JSON:

```bash
npm run seed:cases -- data/example-cases.json
```

Seed from the extracted task list draft:

```bash
npm run seed:cases -- data/high-risk-cognitive-tasks-seed-draft.json
```

Seed from CSV:

```bash
npm run seed:cases -- your-file.csv
```

Expected case CSV columns:

- `section`
- `title`
- `scenario`
- `task_definition`
- `order_index`

## Deploying to Vercel

1. Push the repo to GitHub.
2. Import it into Vercel.
3. Add the same environment variables in Vercel.
4. Deploy.

## Notes

- Ratings use `NULL` for unanswered questions.
- A case is completed only when all four Likert values are present.
- `completed_at` is set automatically when all four values are filled.
- Reviewer access is controlled by self-chosen codes plus last-name verification in `public.reviewers`.
- Reviewer sessions are stored in `public.reviewer_sessions`.
- The current scaffold is optimized for desktop but remains responsive on narrower screens.
