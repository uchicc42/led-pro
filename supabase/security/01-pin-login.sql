-- Part 1 of 2: server-side PIN login.
-- Safe to run while the current app is in use: nothing here removes access.
-- Run once in Supabase → SQL Editor.

begin;

create extension if not exists pgcrypto with schema extensions;

-- PINs move to their own table, stored as bcrypt hashes. Row level security is on with
-- no policies, so only the server (the login function) can read it.
create table if not exists public.team_pins (
  member_id uuid primary key references public.team_members(id) on delete cascade,
  pin_hash text not null,
  failed_attempts int not null default 0,
  locked_until timestamptz
);
alter table public.team_pins enable row level security;

insert into public.team_pins (member_id, pin_hash)
select id, extensions.crypt(pin_hash, extensions.gen_salt('bf'))
from public.team_members
where pin_hash ~ '^\d{4}$'
on conflict (member_id) do nothing;

-- Each team member gets a Supabase login account, created on their first PIN login.
alter table public.team_members
  add column if not exists auth_user_id uuid unique references auth.users(id) on delete set null;

-- What the login screen may see before anyone is logged in: no PINs, no push tokens.
create or replace view public.login_members as
  select id, name, initials, color, role, created_at from public.team_members;
grant select on public.login_members to anon, authenticated;

-- Checks a PIN. 5 wrong tries lock that person out for 15 minutes.
-- Returns 'ok', 'wrong', 'locked' or 'unknown'. Only the login function may call it.
create or replace function public.verify_member_pin(p_member_id uuid, p_pin text)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  rec public.team_pins%rowtype;
  attempts int;
begin
  select * into rec from public.team_pins where member_id = p_member_id for update;
  if not found then return 'unknown'; end if;
  if rec.locked_until is not null and rec.locked_until > now() then return 'locked'; end if;

  if rec.pin_hash = crypt(p_pin, rec.pin_hash) then
    update public.team_pins set failed_attempts = 0, locked_until = null where member_id = p_member_id;
    return 'ok';
  end if;

  attempts := rec.failed_attempts + 1;
  if attempts >= 5 then
    update public.team_pins set failed_attempts = 0, locked_until = now() + interval '15 minutes'
      where member_id = p_member_id;
    return 'locked';
  end if;
  update public.team_pins set failed_attempts = attempts, locked_until = null where member_id = p_member_id;
  return 'wrong';
end
$$;

revoke all on function public.verify_member_pin(uuid, text) from public, anon, authenticated;
grant execute on function public.verify_member_pin(uuid, text) to service_role;

commit;
