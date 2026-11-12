-- Dimmers: a third kind of control next to occupancy sensors and photocells.
--   * jobs.col_dimmer switches dimmers on for a job (like col_sensor / col_photocell).
--   * area_controls.kind and control_types.kind can now be 'dimmer'.
-- Run in the Supabase SQL Editor before deploying the app version that uses it.
-- Safe to run more than once.

alter table public.jobs add column if not exists col_dimmer boolean not null default false;

-- If either table limits kind to a fixed list, replace that rule with one that includes 'dimmer'.
do $$
declare
  t text;
  c record;
begin
  foreach t in array array['area_controls', 'control_types'] loop
    for c in
      select conname from pg_constraint
      where conrelid = ('public.' || t)::regclass
        and contype = 'c'
        and pg_get_constraintdef(oid) ilike '%kind%'
    loop
      execute format('alter table public.%I drop constraint %I', t, c.conname);
    end loop;
    execute format(
      'alter table public.%I add constraint %I check (kind in (''occupancy'', ''photocell'', ''dimmer''))',
      t, t || '_kind_check'
    );
  end loop;
end $$;
