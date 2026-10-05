-- Team management: owners add/edit/remove members and set PINs; everyone can change their
-- own PIN. Run once in Supabase → SQL Editor (after 01 and 02).

begin;

-- Removing a member deactivates them: their name stays on past work, but they can't log in.
alter table public.team_members add column if not exists active boolean not null default true;

-- Only active members count as the team.
create or replace function public.is_team_member()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.team_members where auth_user_id = auth.uid() and active);
$$;

-- Role of the current login, or null.
create or replace function public.current_member_role()
returns text language sql stable security definer set search_path = public as $$
  select role from public.team_members where auth_user_id = auth.uid() and active limit 1;
$$;
revoke all on function public.current_member_role() from public, anon;
grant execute on function public.current_member_role() to authenticated;

-- The login screen lists active members only.
create or replace view public.login_members as
  select id, name, initials, color, role, created_at from public.team_members where active;
grant select on public.login_members to anon, authenticated;

-- Deactivated members can't log in.
create or replace function public.verify_member_pin(p_member_id uuid, p_pin text)
returns text language plpgsql security definer set search_path = public, extensions as $$
declare
  rec public.team_pins%rowtype;
  attempts int;
begin
  if not exists (select 1 from public.team_members where id = p_member_id and active) then return 'unknown'; end if;
  select * into rec from public.team_pins where member_id = p_member_id for update;
  if not found then return 'unknown'; end if;
  if rec.locked_until is not null and rec.locked_until > now() then return 'locked'; end if;
  if rec.pin_hash = crypt(p_pin, rec.pin_hash) then
    update public.team_pins set failed_attempts = 0, locked_until = null where member_id = p_member_id;
    return 'ok';
  end if;
  attempts := rec.failed_attempts + 1;
  if attempts >= 5 then
    update public.team_pins set failed_attempts = 0, locked_until = now() + interval '15 minutes' where member_id = p_member_id;
    return 'locked';
  end if;
  update public.team_pins set failed_attempts = attempts, locked_until = null where member_id = p_member_id;
  return 'wrong';
end
$$;
revoke all on function public.verify_member_pin(uuid, text) from public, anon, authenticated;
grant execute on function public.verify_member_pin(uuid, text) to service_role;

-- team_members: the team can see the team; owners manage it; everyone can update their own
-- row (notification settings, push token) but not their role.
drop policy if exists "Team members only" on public.team_members;
drop policy if exists "Team can view team" on public.team_members;
drop policy if exists "Owners manage team" on public.team_members;
drop policy if exists "Members update own profile" on public.team_members;
create policy "Team can view team" on public.team_members
  for select to authenticated using (public.is_team_member());
create policy "Owners manage team" on public.team_members
  for all to authenticated
  using (public.current_member_role() = 'owner')
  with check (public.current_member_role() = 'owner');
create policy "Members update own profile" on public.team_members
  for update to authenticated
  using (auth_user_id = auth.uid() and active)
  with check (auth_user_id = auth.uid() and active and role = public.current_member_role());

-- Set a PIN: owners for anyone, everyone for themselves. Stored hashed; clears any lockout.
create or replace function public.set_member_pin(p_member_id uuid, p_pin text)
returns void language plpgsql security definer set search_path = public, extensions as $$
declare
  caller_id uuid;
  caller_role text;
begin
  select id, role into caller_id, caller_role from public.team_members where auth_user_id = auth.uid() and active;
  if caller_id is null or (caller_role <> 'owner' and caller_id <> p_member_id) then
    raise exception 'not_allowed';
  end if;
  if p_pin !~ '^\d{4}$' then raise exception 'invalid_pin'; end if;
  insert into public.team_pins (member_id, pin_hash) values (p_member_id, crypt(p_pin, gen_salt('bf')))
  on conflict (member_id) do update set pin_hash = excluded.pin_hash, failed_attempts = 0, locked_until = null;
end
$$;
revoke all on function public.set_member_pin(uuid, text) from public, anon;
grant execute on function public.set_member_pin(uuid, text) to authenticated;

-- There must always be at least one active owner.
create or replace function public.keep_an_owner()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.role = 'owner' and old.active
     and (tg_op = 'DELETE' or new.role <> 'owner' or not new.active)
     and not exists (select 1 from public.team_members where role = 'owner' and active and id <> old.id) then
    raise exception 'last_owner';
  end if;
  return coalesce(new, old);
end
$$;
drop trigger if exists keep_an_owner on public.team_members;
create trigger keep_an_owner before update or delete on public.team_members
  for each row execute function public.keep_an_owner();

commit;
