alter table public.post_review_feedback
add column if not exists section_id uuid references public.sections(id) on delete cascade;

update public.post_review_feedback
set section_id = s.id
from public.sections s
where public.post_review_feedback.section_id is null
  and s.slug = 'management';

alter table public.post_review_feedback
alter column section_id set not null;

alter table public.post_review_feedback
drop constraint if exists post_review_feedback_user_id_key;

create unique index if not exists post_review_feedback_user_section_idx
on public.post_review_feedback(user_id, section_id);
