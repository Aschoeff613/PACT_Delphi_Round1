-- ============================================================================
-- bootstrap_v6.sql — stand up a NEW Supabase project for Expert Case Review
-- ============================================================================
--
-- HOW TO RUN
--   1. Create a new project at https://supabase.com/dashboard
--   2. Open  SQL Editor  →  New query
--   3. Paste this entire file and press Run
--   4. Copy Project Settings → API → Project URL, anon key, service_role key
--      into the app's environment variables
--
-- WHAT IT CREATES
--   Schema for: reviewers, reviewer_sessions, sections, cases, ratings,
--   section_time_logs, profiles, ratings_archive_v3 — plus row-level security
--   policies, table grants, and the save_reviewer_rating() upsert function.
--
--   Then seeds one section holding all 17 Erasmus V6 cognitive constructs,
--   in codebook order T1..T17, with their paired Emergency Department and
--   Primary Care case seeds.
--
-- SAFE TO RE-RUN. Tables, functions and indexes are created only if absent;
-- the seed matches on natural keys instead of inserting duplicates.
--
-- Generated from the known-good local database schema, so it matches the
-- application code exactly rather than replaying 21 historical migrations.
-- Source of task content: PACT_EMC_V6_Tasks_CaseSeeds_1.xlsx, sheet
-- "Cognitive Tasks" (ARPA/PACT Round-1 Codebook V6, 4 Aug 2026).
--
-- NOTE: this creates an EMPTY database. It does not carry over the 136
-- Round 1 ratings, which belong to a different taxonomy (34 tasks) and a
-- different second dimension (performance_gap). Those are not convertible.
-- ============================================================================


-- ────────────────────────────────────────────────────────────────────────────
-- PART 1 of 2 — Schema, security policies, grants, functions
-- ────────────────────────────────────────────────────────────────────────────

--
-- PostgreSQL database dump
--

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;

SET lock_timeout = 0;

SET idle_in_transaction_session_timeout = 0;

SET transaction_timeout = 0;

SET client_encoding = 'UTF8';

SET standard_conforming_strings = on;

SELECT pg_catalog.set_config('search_path', '', false);

SET check_function_bodies = false;

SET xmloption = content;

SET client_min_messages = warning;

SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

-- CREATE SCHEMA public;  (already exists in Supabase)

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

-- COMMENT ON SCHEMA public IS 'standard public schema';  (owned by supabase_admin)

--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  insert into public.profiles (id, email, display_name, affiliation_title, institution, title)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'display_name', ''),
    coalesce(new.raw_user_meta_data ->> 'affiliation_title', ''),
    coalesce(new.raw_user_meta_data ->> 'institution', ''),
    coalesce(new.raw_user_meta_data ->> 'title', '')
  )
  on conflict (id) do update
  set
    email = excluded.email,
    display_name = coalesce(nullif(excluded.display_name, ''), public.profiles.display_name),
    affiliation_title = coalesce(nullif(excluded.affiliation_title, ''), public.profiles.affiliation_title),
    institution = coalesce(nullif(excluded.institution, ''), public.profiles.institution),
    title = coalesce(nullif(excluded.title, ''), public.profiles.title);
  return new;
end;
$$;

--
-- Name: save_reviewer_merge_feedback(uuid, uuid, uuid, text, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.save_reviewer_merge_feedback(p_reviewer_id uuid, p_section_id uuid, p_source_case_id uuid, p_decision text, p_target_case_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  update public.case_merge_feedback
  set
    section_id = p_section_id,
    decision = p_decision,
    target_case_id = p_target_case_id
  where reviewer_id = p_reviewer_id
    and source_case_id = p_source_case_id;

  if not found then
    insert into public.case_merge_feedback (
      reviewer_id,
      section_id,
      source_case_id,
      decision,
      target_case_id
    )
    values (
      p_reviewer_id,
      p_section_id,
      p_source_case_id,
      p_decision,
      p_target_case_id
    );
  end if;
end;
$$;

--
-- Name: save_reviewer_post_review_feedback(uuid, uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.save_reviewer_post_review_feedback(p_reviewer_id uuid, p_section_id uuid, p_merge_notes text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  update public.post_review_feedback
  set
    merge_notes = p_merge_notes
  where reviewer_id = p_reviewer_id
    and section_id = p_section_id;

  if not found then
    insert into public.post_review_feedback (
      reviewer_id,
      section_id,
      merge_notes
    )
    values (
      p_reviewer_id,
      p_section_id,
      p_merge_notes
    );
  end if;
end;
$$;

--
-- Name: save_reviewer_rating(uuid, uuid, smallint, smallint, smallint, text, boolean, timestamp with time zone); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.save_reviewer_rating(p_reviewer_id uuid, p_case_id uuid, p_clinical_relevance smallint, p_performance_variance smallint, p_ai_relevance smallint, p_comment text, p_marked_for_discussion boolean, p_completed_at timestamp with time zone) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.ratings (
    reviewer_id,
    case_id,
    clinical_relevance,
    performance_variance,
    ai_relevance,
    comment,
    marked_for_discussion,
    completed_at,
    updated_at
  )
  VALUES (
    p_reviewer_id,
    p_case_id,
    p_clinical_relevance,
    p_performance_variance,
    p_ai_relevance,
    p_comment,
    p_marked_for_discussion,
    p_completed_at,
    now()
  )
  ON CONFLICT (reviewer_id, case_id) DO UPDATE
  SET
    clinical_relevance    = excluded.clinical_relevance,
    performance_variance  = excluded.performance_variance,
    ai_relevance          = excluded.ai_relevance,
    comment               = excluded.comment,
    marked_for_discussion = excluded.marked_for_discussion,
    completed_at          = excluded.completed_at,
    updated_at            = now();
END;
$$;

--
-- Name: section_completion_summary(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.section_completion_summary() RETURNS TABLE(section_name text, not_started_count bigint, in_progress_count bigint, completed_count bigint)
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  with reviewer_case_status as (
    select
      s.name as section_name,
      rv.id as reviewer_id,
      c.id as case_id,
      case
        when r.id is null then 'not_started'
        when r.clinical_relevance is not null
         and r.performance_variance is not null
         and r.ai_relevance is not null then 'completed'
        else 'in_progress'
      end as status
    from public.sections s
    join public.cases c on c.section_id = s.id
    cross join public.reviewers rv
    left join public.ratings r on r.case_id = c.id and r.reviewer_id = rv.id
  )
  select
    section_name,
    count(*) filter (where status = 'not_started') as not_started_count,
    count(*) filter (where status = 'in_progress') as in_progress_count,
    count(*) filter (where status = 'completed') as completed_count
  from reviewer_case_status
  group by section_name
  order by section_name;
$$;

--
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;

--
-- Name: upsert_section_time(uuid, uuid, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.upsert_section_time(p_reviewer_id uuid, p_section_id uuid, p_seconds_delta integer) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  insert into public.section_time_logs (reviewer_id, section_id, total_seconds, first_visited_at, last_active_at)
  values (p_reviewer_id, p_section_id, p_seconds_delta, now(), now())
  on conflict (reviewer_id, section_id)
  do update set
    total_seconds = section_time_logs.total_seconds + p_seconds_delta,
    last_active_at = now();
end;
$$;

SET default_table_access_method = heap;

--
-- Name: cases; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.cases (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    section_id uuid NOT NULL,
    title text NOT NULL,
    scenario text NOT NULL,
    task_definition text NOT NULL,
    order_index integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid NOT NULL,
    email text NOT NULL,
    display_name text,
    role text DEFAULT 'reviewer'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    institution text,
    title text,
    CONSTRAINT profiles_role_check CHECK ((role = ANY (ARRAY['reviewer'::text, 'admin'::text])))
);

--
-- Name: ratings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.ratings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    case_id uuid NOT NULL,
    performance_variance smallint,
    ai_relevance smallint,
    comment text,
    marked_for_discussion boolean DEFAULT false NOT NULL,
    completed_at timestamp with time zone,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    reviewer_id uuid,
    clinical_relevance smallint,
    CONSTRAINT ratings_ai_relevance_check CHECK (((ai_relevance >= 1) AND (ai_relevance <= 7))),
    CONSTRAINT ratings_benchmarkability_check CHECK (((performance_variance >= 1) AND (performance_variance <= 7))),
    CONSTRAINT ratings_clinical_relevance_check CHECK (((clinical_relevance >= 1) AND (clinical_relevance <= 7)))
);

--
-- Name: ratings_archive_v3; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.ratings_archive_v3 (
    id uuid,
    reviewer_id uuid,
    user_id uuid,
    case_id uuid,
    section_slug text,
    order_index integer,
    task_title text,
    clinical_relevance integer,
    benchmarkability integer,
    ai_relevance integer,
    comment text,
    marked_for_discussion boolean,
    completed_at timestamp with time zone,
    updated_at timestamp with time zone,
    archived_at timestamp with time zone DEFAULT now(),
    archived_reason text
);

--
-- Name: reviewer_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.reviewer_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    reviewer_id uuid NOT NULL,
    token_hash text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: reviewers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.reviewers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    display_name text NOT NULL,
    last_name text DEFAULT ''::text NOT NULL,
    email text,
    institution text,
    title text,
    role text DEFAULT 'reviewer'::text NOT NULL,
    locked_at timestamp with time zone,
    last_login_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT reviewers_role_check CHECK ((role = ANY (ARRAY['reviewer'::text, 'admin'::text])))
);

--
-- Name: section_time_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.section_time_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    reviewer_id uuid NOT NULL,
    section_id uuid NOT NULL,
    total_seconds integer DEFAULT 0 NOT NULL,
    first_visited_at timestamp with time zone DEFAULT now() NOT NULL,
    last_active_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: sections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.sections (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slug text NOT NULL,
    name text NOT NULL,
    description text
);

--
-- Name: cases cases_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $guard$ BEGIN
  ALTER TABLE ONLY public.cases
      ADD CONSTRAINT cases_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $guard$;

--
-- Name: cases cases_section_id_order_index_key; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $guard$ BEGIN
  ALTER TABLE ONLY public.cases
      ADD CONSTRAINT cases_section_id_order_index_key UNIQUE (section_id, order_index);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $guard$;

--
-- Name: profiles profiles_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $guard$ BEGIN
  ALTER TABLE ONLY public.profiles
      ADD CONSTRAINT profiles_email_key UNIQUE (email);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $guard$;

--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $guard$ BEGIN
  ALTER TABLE ONLY public.profiles
      ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $guard$;

--
-- Name: ratings ratings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $guard$ BEGIN
  ALTER TABLE ONLY public.ratings
      ADD CONSTRAINT ratings_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $guard$;

--
-- Name: ratings ratings_user_id_case_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $guard$ BEGIN
  ALTER TABLE ONLY public.ratings
      ADD CONSTRAINT ratings_user_id_case_id_key UNIQUE (user_id, case_id);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $guard$;

--
-- Name: reviewer_sessions reviewer_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $guard$ BEGIN
  ALTER TABLE ONLY public.reviewer_sessions
      ADD CONSTRAINT reviewer_sessions_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $guard$;

--
-- Name: reviewer_sessions reviewer_sessions_token_hash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $guard$ BEGIN
  ALTER TABLE ONLY public.reviewer_sessions
      ADD CONSTRAINT reviewer_sessions_token_hash_key UNIQUE (token_hash);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $guard$;

--
-- Name: reviewers reviewers_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $guard$ BEGIN
  ALTER TABLE ONLY public.reviewers
      ADD CONSTRAINT reviewers_code_key UNIQUE (code);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $guard$;

--
-- Name: reviewers reviewers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $guard$ BEGIN
  ALTER TABLE ONLY public.reviewers
      ADD CONSTRAINT reviewers_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $guard$;

--
-- Name: section_time_logs section_time_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $guard$ BEGIN
  ALTER TABLE ONLY public.section_time_logs
      ADD CONSTRAINT section_time_logs_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $guard$;

--
-- Name: section_time_logs section_time_logs_reviewer_id_section_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $guard$ BEGIN
  ALTER TABLE ONLY public.section_time_logs
      ADD CONSTRAINT section_time_logs_reviewer_id_section_id_key UNIQUE (reviewer_id, section_id);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $guard$;

--
-- Name: sections sections_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $guard$ BEGIN
  ALTER TABLE ONLY public.sections
      ADD CONSTRAINT sections_name_key UNIQUE (name);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $guard$;

--
-- Name: sections sections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $guard$ BEGIN
  ALTER TABLE ONLY public.sections
      ADD CONSTRAINT sections_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $guard$;

--
-- Name: sections sections_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $guard$ BEGIN
  ALTER TABLE ONLY public.sections
      ADD CONSTRAINT sections_slug_key UNIQUE (slug);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $guard$;

--
-- Name: ratings_reviewer_case_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX IF NOT EXISTS ratings_reviewer_case_idx ON public.ratings USING btree (reviewer_id, case_id) WHERE (reviewer_id IS NOT NULL);

--
-- Name: ratings_reviewer_id_case_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX IF NOT EXISTS ratings_reviewer_id_case_id_key ON public.ratings USING btree (reviewer_id, case_id);

--
-- Name: reviewer_sessions_reviewer_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS reviewer_sessions_reviewer_idx ON public.reviewer_sessions USING btree (reviewer_id);

--
-- Name: section_time_logs_reviewer_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS section_time_logs_reviewer_idx ON public.section_time_logs USING btree (reviewer_id);

--
-- Name: section_time_logs_section_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS section_time_logs_section_idx ON public.section_time_logs USING btree (section_id);

--
-- Name: ratings set_ratings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

DO $guard$ BEGIN
  CREATE TRIGGER set_ratings_updated_at BEFORE UPDATE ON public.ratings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $guard$;

--
-- Name: reviewers set_reviewers_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

DO $guard$ BEGIN
  CREATE TRIGGER set_reviewers_updated_at BEFORE UPDATE ON public.reviewers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $guard$;

--
-- Name: cases cases_section_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $guard$ BEGIN
  ALTER TABLE ONLY public.cases
      ADD CONSTRAINT cases_section_id_fkey FOREIGN KEY (section_id) REFERENCES public.sections(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $guard$;

--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $guard$ BEGIN
  ALTER TABLE ONLY public.profiles
      ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $guard$;

--
-- Name: ratings ratings_case_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $guard$ BEGIN
  ALTER TABLE ONLY public.ratings
      ADD CONSTRAINT ratings_case_id_fkey FOREIGN KEY (case_id) REFERENCES public.cases(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $guard$;

--
-- Name: ratings ratings_reviewer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $guard$ BEGIN
  ALTER TABLE ONLY public.ratings
      ADD CONSTRAINT ratings_reviewer_id_fkey FOREIGN KEY (reviewer_id) REFERENCES public.reviewers(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $guard$;

--
-- Name: ratings ratings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $guard$ BEGIN
  ALTER TABLE ONLY public.ratings
      ADD CONSTRAINT ratings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $guard$;

--
-- Name: reviewer_sessions reviewer_sessions_reviewer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $guard$ BEGIN
  ALTER TABLE ONLY public.reviewer_sessions
      ADD CONSTRAINT reviewer_sessions_reviewer_id_fkey FOREIGN KEY (reviewer_id) REFERENCES public.reviewers(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $guard$;

--
-- Name: section_time_logs section_time_logs_reviewer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $guard$ BEGIN
  ALTER TABLE ONLY public.section_time_logs
      ADD CONSTRAINT section_time_logs_reviewer_id_fkey FOREIGN KEY (reviewer_id) REFERENCES public.reviewers(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $guard$;

--
-- Name: section_time_logs section_time_logs_section_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $guard$ BEGIN
  ALTER TABLE ONLY public.section_time_logs
      ADD CONSTRAINT section_time_logs_section_id_fkey FOREIGN KEY (section_id) REFERENCES public.sections(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $guard$;

--
-- Name: cases; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;

--
-- Name: cases cases_read_authenticated; Type: POLICY; Schema: public; Owner: -
--

DO $guard$ BEGIN
  CREATE POLICY cases_read_authenticated ON public.cases FOR SELECT USING ((auth.role() = 'authenticated'::text));
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $guard$;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles profiles_select_own; Type: POLICY; Schema: public; Owner: -
--

DO $guard$ BEGIN
  CREATE POLICY profiles_select_own ON public.profiles FOR SELECT USING ((auth.uid() = id));
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $guard$;

--
-- Name: profiles profiles_update_own; Type: POLICY; Schema: public; Owner: -
--

DO $guard$ BEGIN
  CREATE POLICY profiles_update_own ON public.profiles FOR UPDATE USING ((auth.uid() = id));
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $guard$;

--
-- Name: ratings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;

--
-- Name: ratings_archive_v3; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ratings_archive_v3 ENABLE ROW LEVEL SECURITY;

--
-- Name: ratings ratings_insert_own; Type: POLICY; Schema: public; Owner: -
--

DO $guard$ BEGIN
  CREATE POLICY ratings_insert_own ON public.ratings FOR INSERT WITH CHECK ((auth.uid() = user_id));
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $guard$;

--
-- Name: ratings ratings_read_own; Type: POLICY; Schema: public; Owner: -
--

DO $guard$ BEGIN
  CREATE POLICY ratings_read_own ON public.ratings FOR SELECT USING ((auth.uid() = user_id));
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $guard$;

--
-- Name: ratings ratings_update_own; Type: POLICY; Schema: public; Owner: -
--

DO $guard$ BEGIN
  CREATE POLICY ratings_update_own ON public.ratings FOR UPDATE USING ((auth.uid() = user_id));
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $guard$;

--
-- Name: reviewer_sessions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.reviewer_sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: reviewers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.reviewers ENABLE ROW LEVEL SECURITY;

--
-- Name: section_time_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.section_time_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: sections; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;

--
-- Name: sections sections_read_authenticated; Type: POLICY; Schema: public; Owner: -
--

DO $guard$ BEGIN
  CREATE POLICY sections_read_authenticated ON public.sections FOR SELECT USING ((auth.role() = 'authenticated'::text));
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $guard$;

--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: -
--

GRANT USAGE ON SCHEMA public TO postgres;

GRANT USAGE ON SCHEMA public TO anon;

GRANT USAGE ON SCHEMA public TO authenticated;

GRANT USAGE ON SCHEMA public TO service_role;

--
-- Name: FUNCTION handle_new_user(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.handle_new_user() TO service_role;

--
-- Name: FUNCTION save_reviewer_merge_feedback(p_reviewer_id uuid, p_section_id uuid, p_source_case_id uuid, p_decision text, p_target_case_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.save_reviewer_merge_feedback(p_reviewer_id uuid, p_section_id uuid, p_source_case_id uuid, p_decision text, p_target_case_id uuid) TO service_role;

--
-- Name: FUNCTION save_reviewer_post_review_feedback(p_reviewer_id uuid, p_section_id uuid, p_merge_notes text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.save_reviewer_post_review_feedback(p_reviewer_id uuid, p_section_id uuid, p_merge_notes text) TO service_role;

--
-- Name: FUNCTION save_reviewer_rating(p_reviewer_id uuid, p_case_id uuid, p_clinical_relevance smallint, p_performance_variance smallint, p_ai_relevance smallint, p_comment text, p_marked_for_discussion boolean, p_completed_at timestamp with time zone); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.save_reviewer_rating(p_reviewer_id uuid, p_case_id uuid, p_clinical_relevance smallint, p_performance_variance smallint, p_ai_relevance smallint, p_comment text, p_marked_for_discussion boolean, p_completed_at timestamp with time zone) TO service_role;

--
-- Name: FUNCTION section_completion_summary(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.section_completion_summary() TO service_role;

--
-- Name: FUNCTION set_updated_at(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.set_updated_at() TO service_role;

--
-- Name: FUNCTION upsert_section_time(p_reviewer_id uuid, p_section_id uuid, p_seconds_delta integer); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.upsert_section_time(p_reviewer_id uuid, p_section_id uuid, p_seconds_delta integer) TO service_role;

--
-- Name: TABLE cases; Type: ACL; Schema: public; Owner: -
--

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.cases TO anon;

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.cases TO authenticated;

GRANT ALL ON TABLE public.cases TO service_role;

--
-- Name: TABLE profiles; Type: ACL; Schema: public; Owner: -
--

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.profiles TO anon;

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.profiles TO authenticated;

GRANT ALL ON TABLE public.profiles TO service_role;

--
-- Name: TABLE ratings; Type: ACL; Schema: public; Owner: -
--

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.ratings TO anon;

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.ratings TO authenticated;

GRANT ALL ON TABLE public.ratings TO service_role;

--
-- Name: TABLE ratings_archive_v3; Type: ACL; Schema: public; Owner: -
--

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.ratings_archive_v3 TO anon;

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.ratings_archive_v3 TO authenticated;

GRANT ALL ON TABLE public.ratings_archive_v3 TO service_role;

--
-- Name: TABLE reviewer_sessions; Type: ACL; Schema: public; Owner: -
--

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.reviewer_sessions TO anon;

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.reviewer_sessions TO authenticated;

GRANT ALL ON TABLE public.reviewer_sessions TO service_role;

--
-- Name: TABLE reviewers; Type: ACL; Schema: public; Owner: -
--

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.reviewers TO anon;

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.reviewers TO authenticated;

GRANT ALL ON TABLE public.reviewers TO service_role;

--
-- Name: TABLE section_time_logs; Type: ACL; Schema: public; Owner: -
--

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.section_time_logs TO anon;

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.section_time_logs TO authenticated;

GRANT ALL ON TABLE public.section_time_logs TO service_role;

--
-- Name: TABLE sections; Type: ACL; Schema: public; Owner: -
--

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.sections TO anon;

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.sections TO authenticated;

GRANT ALL ON TABLE public.sections TO service_role;

--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: -
--

--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: -
--

--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: -
--

--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: -
--

--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: -
--

--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: -
--

--
-- PostgreSQL database dump complete
--

-- ────────────────────────────────────────────────────────────────────────────
-- PART 2 of 2 — Seed data: 3 sections + 17 Erasmus V6 constructs
-- ────────────────────────────────────────────────────────────────────────────

SET search_path = public;

BEGIN;

-- Sections. Matched on slug so re-running refreshes wording, never duplicates.
INSERT INTO public.sections (slug, name, description)
SELECT v.slug, v.name, v.description
  FROM (VALUES
  ('all-tasks', 'Cognitive Tasks', 'Rate all 17 candidate cognitive tasks. Each is graded on its own, grounded by one Emergency Department and one Primary Care example.')
  ) AS v(slug, name, description)
 WHERE NOT EXISTS (SELECT 1 FROM public.sections s WHERE s.slug = v.slug);

UPDATE public.sections s
   SET name = v.name, description = v.description
  FROM (VALUES
  ('all-tasks', 'Cognitive Tasks', 'Rate all 17 candidate cognitive tasks. Each is graded on its own, grounded by one Emergency Department and one Primary Care example.')
  ) AS v(slug, name, description)
 WHERE s.slug = v.slug;

-- The 17 V6 constructs, keyed by (section, order_index) exactly as
-- lib/case-content.ts expects. order_index is 0-based and must not be
-- renumbered: getCaseContent() looks content up by it.
CREATE TEMP TABLE v6_seed (
  section_slug    text,
  order_index     int,
  title           text,
  scenario        text,
  task_definition text
) ON COMMIT DROP;

INSERT INTO v6_seed (section_slug, order_index, title, scenario, task_definition) VALUES
  ('all-tasks', 0, 'Rapid acuity appraisal',
   'Emergency Department — A 78-year-old arrives by ambulance for generalized weakness with a heart rate of 96 and a normal blood pressure. From the doorway she is grey, quiet and not tracking. State how sick she is, and how fast this needs to move, before any data returns.

Primary Care — A same-day walk-in with two days of vomiting has normal recorded vital signs but looks exhausted and cannot sit up on the exam table. State how unwell she is right now, and whether that changes the tempo of the visit.',
   'A fast, holistic judgement of how unwell someone is, or how likely they are to get worse, formed at a glance rather than reasoned out. This first read sets the tempo of everything after it.'),
  ('all-tasks', 1, 'Prioritisation & resource management',
   'Emergency Department — Four patients need attention at once: chest pain awaiting a second troponin, a laceration, a septic-appearing nursing home transfer, and a new intoxicated patient. One CT slot has opened and the nurse is asking who gets the room.

Primary Care — The session is running 40 minutes behind with a double-booked slot, a same-day add-on for chest tightness, and two urgent portal messages. Decide what gets attention in the next hour and what is deferred.',
   'Deciding what or whom to deal with next, and how to spend limited resources: attention, time, beds, staff, equipment, when several things compete.'),
  ('all-tasks', 2, 'Directed information gathering & sufficiency',
   'Emergency Department — Ninety seconds of chart time before entering the room for an 82-year-old with syncope. Choose which few items to pull, prior ECGs, medication list, or last echocardiogram, and say when that is enough to start.

Primary Care — Three months of fatigue with an open history to take in a 15-minute visit. Choose the questions that would actually separate thyroid disease, anaemia, depression and sleep apnoea, and stop when the picture is sufficient to order from.',
   'Steering their own search for information: what to look for or ask about, how to get it, and when there is enough to move on.'),
  ('all-tasks', 3, 'Diagnostic reasoning',
   'Emergency Department — A 45-year-old with epigastric pain and diaphoresis has a normal ECG and a lipase of 60. ACS, pancreatitis, biliary disease and aortic pathology all remain live, and each returning result should move the ranking.

Primary Care — A 60-year-old reports six weeks of cough without fever. Post-viral cough, ACE inhibitor effect, reflux, asthma and malignancy are all in play, and a normal chest film moves some candidates without clearing the list.',
   'Building a set of possible explanations for the presentation and moving them up or down as evidence arrives, including noticing when the case does not fit the expected pattern.'),
  ('all-tasks', 4, 'Managing uncertainty',
   'Emergency Department — A 30-year-old with 12 hours of periumbilical pain has an equivocal ultrasound and a normal white count. Appendicitis cannot be excluded tonight. State that, and set the return threshold and recheck interval that make discharge acceptable.

Primary Care — An isolated mildly elevated alkaline phosphatase in an asymptomatic patient. State that the cause is not knowable yet, leave it deliberately alone, and name the repeat interval and the value that would trigger a workup.',
   'Explicitly acknowledging what is unknown and choosing a next step that either tolerates it or resolves it, instead of forcing an answer too early. Includes safety-netting and setting trip-wires.'),
  ('all-tasks', 5, 'Risk stratification & risk tolerance',
   'Emergency Department — A 55-year-old with atypical chest pain and a HEART score of 3. Reason explicitly about how low the acceptable miss rate for ACS is, and whether that threshold justifies observation rather than discharge.

Primary Care — A 40-year-old with a new severe headache and a normal neurological examination. Weigh how bad a missed subarachnoid haemorrhage would be against the yield and cost of sending her to the ED today, and say where your own threshold sits.',
   'Weighing how dangerous it would be to be wrong: keeping cannot-miss diagnoses in play, matching how aggressive to be to the worst case, and locating their own threshold for acting.'),
  ('all-tasks', 6, 'Judging credibility & completeness',
   'Emergency Department — The only history for an unresponsive patient runs from a bystander to a paramedic to a triage note. Judge how much of that chain to believe, and decide what to re-check personally before committing.

Primary Care — An outside note asserts a normal stress test 14 months ago, with no report attached and no images available. Decide whether that assertion can carry weight, or whether the study must be obtained or repeated.',
   'Judging whether incoming information can be trusted and whether anything is missing: checking the source, deciding whether to verify it first-hand, and flagging the gap.'),
  ('all-tasks', 7, 'Weighing & integrating information',
   'Emergency Department — An 85-year-old''s blood pressure is 104/60, normal by population standards but 40 points below his own documented baseline, and his creatinine is up from a value six months ago. Read the pieces against each other and against him.

Primary Care — The patient feels well, her A1c is 11.2, her home glucose log shows values in the 120s, and last year''s A1c was 6.8. All three are accepted as accurate. Produce one coherent reading.',
   'Relating several pieces of already-accepted information to each other, to this patient''s own normal, and to how they were before, to reach one reading.'),
  ('all-tasks', 8, 'Knowledge & protocol retrieval',
   'Emergency Department — A patient on apixaban has an intracranial bleed. Retrieve the reversal agent, the dose and the time window, and say where recall stops and an outside resource is needed.

Primary Care — A 67-year-old asks about pneumococcal vaccination, with a prior dose at 63. Recall the current interval and sequence, and recognise that the schedule has changed and needs looking up.',
   'Retrieving stored medical knowledge, rules or standards out of memory, or looking them up, and applying them to the case, including recognising the edge of what they know.'),
  ('all-tasks', 9, 'Anticipatory planning & forward projection',
   'Emergency Department — A probable small bowel obstruction, not yet confirmed. Plan forward: if the CT confirms it, surgery is called and a nasogastric tube goes in now; if it is negative, the patient goes home. Stage the present work against both branches.

Primary Care — A patient with early dementia is still driving and living alone. Project the next 12 months, decide this is a two-part visit, and start capacity and safety groundwork before it is clinically forced.',
   'Looking ahead to the likely trajectory, endpoint and next moves, and letting that forecast change what they do now, before reaching a decision.'),
  ('all-tasks', 10, 'Committing to an endpoint & disposition',
   'Emergency Department — Flank pain with a known stone history, pain controlled and creatinine normal. Settle that the disposition hangs on the urinalysis alone, and say whether the CT is worth doing given that the result would not change management.

Primary Care — Three weeks of low back pain with no red flags, and the patient is asking for an MRI. Decide whether the scan would change the plan, commit to a management course with a follow-up interval, and close the visit on that reasoning.',
   'Integrating everything into a settled endpoint and the plan that gets there, including deciding whether a test or action is worth doing because of whether the result would change anything.'),
  ('all-tasks', 11, 'Patient-centred reasoning & communication',
   'Emergency Department — New atrial fibrillation in a patient who lives alone, has limited health literacy and no reliable transport. Let that situation change both the anticoagulation choice and the way return precautions are explained.

Primary Care — An 82-year-old with an abnormal screening result says she does not want anything invasive. Work out what she actually understands and fears, and let that reshape both the plan and how the result is delivered.',
   'Folding the patient''s situation, goals, understanding, preferences and feelings into the reasoning and the plan, and deliberately shaping how things are communicated to fit them.'),
  ('all-tasks', 12, 'Team & distributed cognition',
   'Emergency Department — A second-year resident presents a syncope patient as low risk. Judge how far to trust this particular resident, decide whether to see the patient personally, and check the plan for what a resident at that level would likely miss.

Primary Care — A patient''s insulin was adjusted by an endocrinologist last week, and the assistant has recorded home readings that conflict with that plan. Work out who owns the prescription now and what the specialist is actually planning.',
   'Reasoning about and through other people: how far to trust a colleague, what to do themselves versus hand over, checking someone else''s plan, passing on responsibility, and coordinating with other services.'),
  ('all-tasks', 13, 'Metacognitive self-regulation',
   'Emergency Department — The handoff framed the patient as a psych patient. Name that the framing has anchored you, deliberately reopen the case, and set a reminder so the pending glucose is not lost across the next interruption.

Primary Care — At the end of a long session, notice your own engagement dropping and that you are rushing a complex patient. Slow down deliberately and re-check the medication list you have just reviewed.',
   'Watching their own reasoning, confidence and biases, and deliberately managing their own attention, effort and memory.'),
  ('all-tasks', 14, 'Multi-patient monitoring',
   'Emergency Department — Mid-shift sweep of the whole board. Bed 16 has blood running and imaging back, bed 36''s labs are reassuring and she can wait, bed 22 has been waiting two hours on an ultrasound that has not moved. Confirm nothing on the list has been dropped.

Primary Care — End-of-week panel sweep: three abnormal results with no documented follow-up, two referrals never scheduled, and one biopsy result still outstanding. Establish what has stalled and what needs action now.',
   'Going back over the whole set of patients mid-shift: re-triaging across patients by acuity, tracking that orders and results are moving, and confirming nothing has been missed.'),
  ('all-tasks', 15, 'Feasibility & system navigation',
   'Emergency Department — The patient needs an MRI this hospital does not perform overnight, and the on-call neurosurgeon covers a second site. Reason about boarding until morning, transferring, or managing without the study.

Primary Care — The guideline-preferred agent is not covered, prior authorisation takes three weeks, and the next endocrinology appointment is five months out. Work out which available route actually gets treatment started.',
   'Judging whether a plan can actually be carried out, given coverage, cost, appointment supply, service hours and who controls access, and working out a route around the block when there is one.'),
  ('all-tasks', 16, 'Encounter scoping',
   'Emergency Department — A frequent attender arrives with five active complaints and a request for a work note. Fix which single problem this visit will carry, and say why the others are not opened today.

Primary Care — The visit is booked as routine diabetes and hypertension follow-up. At minute 12 the patient mentions exertional chest tightness. Re-frame what this contact is now for, and what is left for next time.',
   'Fixing what this contact is meant to be for and which of the patient''s problems it will carry, including deciding to open something the patient did not come in about, or deliberately to leave something out.');

-- Insert the ones that are missing…
INSERT INTO public.cases (section_id, order_index, title, scenario, task_definition)
SELECT s.id, v.order_index, v.title, v.scenario, v.task_definition
  FROM v6_seed v
  JOIN public.sections s ON s.slug = v.section_slug
 WHERE NOT EXISTS (
   SELECT 1 FROM public.cases c
    WHERE c.section_id = s.id AND c.order_index = v.order_index
 );

-- …and refresh the text of any that already exist, so re-running is a no-op
-- rather than leaving stale wording behind.
UPDATE public.cases c
   SET title = v.title, scenario = v.scenario, task_definition = v.task_definition
  FROM v6_seed v
  JOIN public.sections s ON s.slug = v.section_slug
 WHERE c.section_id = s.id AND c.order_index = v.order_index;

COMMIT;


-- ────────────────────────────────────────────────────────────────────────────
-- Verification — expect one row: all-tasks | 17
-- ────────────────────────────────────────────────────────────────────────────

SELECT s.slug,
       count(c.id)                                    AS tasks,
       string_agg(c.title, ' | ' ORDER BY c.order_index) AS titles
  FROM public.sections s
  LEFT JOIN public.cases c ON c.section_id = s.id
 GROUP BY s.slug
 ORDER BY s.slug;
