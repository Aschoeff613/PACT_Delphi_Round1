alter table public.profiles
add column if not exists institution text,
add column if not exists title text;

update public.profiles
set institution = coalesce(institution, affiliation_title)
where institution is null and affiliation_title is not null;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
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
