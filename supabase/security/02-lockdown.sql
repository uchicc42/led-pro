-- Part 2 of 2: lock everything down to logged-in team members.
-- Run ONLY after the new app version is on every phone and PIN login has been tested.
-- Older copies of the app stop working the moment this runs.

begin;

-- True when the current login belongs to a team member.
create or replace function public.is_team_member()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.team_members where auth_user_id = auth.uid());
$$;
revoke all on function public.is_team_member() from public, anon;
grant execute on function public.is_team_member() to authenticated;

-- Every table: remove the old "allow all" rules and allow logged-in team members only.
-- team_pins keeps no policies at all (server-only).
do $$
declare
  t record;
  p record;
begin
  for t in select tablename from pg_tables where schemaname = 'public' and tablename <> 'team_pins' loop
    for p in select policyname from pg_policies where schemaname = 'public' and tablename = t.tablename loop
      execute format('drop policy %I on public.%I', p.policyname, t.tablename);
    end loop;
    execute format('alter table public.%I enable row level security', t.tablename);
    execute format(
      'create policy "Team members only" on public.%I for all to authenticated using (public.is_team_member()) with check (public.is_team_member())',
      t.tablename
    );
  end loop;
end
$$;

-- PINs now live (hashed) in team_pins.
alter table public.team_members drop column if exists pin_hash;

-- Photos: private bucket, team members only.
update storage.buckets set public = false where id = 'job-photos';
drop policy if exists "Allow all for job-photos" on storage.objects;
create policy "Team members only (job-photos)" on storage.objects
  for all to authenticated
  using (bucket_id = 'job-photos' and public.is_team_member())
  with check (bucket_id = 'job-photos' and public.is_team_member());

commit;
