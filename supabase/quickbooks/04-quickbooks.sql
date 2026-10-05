-- QuickBooks Online sync: QuickBooks non-inventory items become "New LED" light types.
-- Run once in Supabase → SQL Editor.

begin;

-- Light types from QuickBooks remember their item id, so renames follow through.
-- Archived types (inactive/deleted in QuickBooks) disappear from dropdowns; old jobs keep
-- the name because light rows store the name itself.
alter table public.light_types add column if not exists quickbooks_item_id text unique;
alter table public.light_types add column if not exists archived boolean not null default false;
-- The QuickBooks item Name (the product code). The light type's name is the sales description.
alter table public.light_types add column if not exists product_code text;

-- The QuickBooks connection (one per company). Tokens are server-only: row level security
-- is on with no policies, so only the QuickBooks functions can read it.
create table if not exists public.qb_connection (
  id int primary key default 1 check (id = 1),
  realm_id text not null,
  company_name text,
  environment text not null default 'production',
  access_token text not null,
  refresh_token text not null,
  access_expires_at timestamptz not null,
  refresh_expires_at timestamptz,
  connected_by uuid references public.team_members(id) on delete set null,
  connected_at timestamptz not null default now(),
  last_synced_at timestamptz,
  last_sync_result text
);
alter table public.qb_connection enable row level security;

-- Short-lived "state" values that tie a QuickBooks sign-in back to the owner who started it.
create table if not exists public.qb_oauth_states (
  state text primary key,
  member_id uuid not null references public.team_members(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.qb_oauth_states enable row level security;

-- What the app may know about the connection (never the tokens).
create or replace function public.qb_status()
returns json language sql stable security definer set search_path = public as $$
  select case when not public.is_team_member() then null else (
    select json_build_object(
      'connected', true,
      'company_name', company_name,
      'environment', environment,
      'connected_at', connected_at,
      'last_synced_at', last_synced_at,
      'last_sync_result', last_sync_result,
      'reconnect_needed', refresh_expires_at is not null and refresh_expires_at < now()
    ) from public.qb_connection where id = 1
  ) end;
$$;
revoke all on function public.qb_status() from public, anon;
grant execute on function public.qb_status() to authenticated;

commit;
