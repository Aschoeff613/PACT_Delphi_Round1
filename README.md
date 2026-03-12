# Expert Case Review

Structured expert case rating app for a modified Delphi-style exercise.

## Stack

- Next.js (App Router)
- Supabase Auth
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

- Email magic-link login
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
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

`NEXT_PUBLIC_SITE_URL` should be your local dev URL or your deployed Vercel URL.

## Supabase setup

1. Create a Supabase project.
2. Enable Email auth / magic links in Supabase Auth.
3. Run the SQL in `supabase/migrations/001_init.sql`.
4. Optionally mark one profile as admin:

```sql
update public.profiles
set role = 'admin'
where email = 'you@example.org';
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

Expected CSV columns:

- `section`
- `title`
- `scenario`
- `task_definition`
- `order_index`

## Deploying to Vercel

1. Push the repo to GitHub.
2. Import it into Vercel.
3. Add the same environment variables in Vercel.
4. Set `NEXT_PUBLIC_SITE_URL` to your Vercel domain.
5. Deploy.

## Notes

- Ratings use `NULL` for unanswered questions.
- A case is completed only when all four Likert values are present.
- `completed_at` is set automatically when all four values are filled.
- The current scaffold is optimized for desktop but remains responsive on narrower screens.
