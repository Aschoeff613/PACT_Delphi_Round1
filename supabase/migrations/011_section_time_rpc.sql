create or replace function public.upsert_section_time(
  p_reviewer_id uuid,
  p_section_id uuid,
  p_seconds_delta integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.section_time_logs (reviewer_id, section_id, total_seconds, first_visited_at, last_active_at)
  values (p_reviewer_id, p_section_id, p_seconds_delta, now(), now())
  on conflict (reviewer_id, section_id)
  do update set
    total_seconds = section_time_logs.total_seconds + p_seconds_delta,
    last_active_at = now();
end;
$$;
