-- Job summary: the customer's company and notes for the installer, both optional.
-- Run once in Supabase → SQL Editor. Safe while the app is in use: older app versions ignore
-- these columns, and existing jobs simply have them empty.

alter table public.jobs add column if not exists company_name text;
alter table public.jobs add column if not exists installer_notes text;
