-- Area order: the position set with "Reorder" on the area list. Areas without one (new ones,
-- or ones from before this existed) show last in the order they were created.
-- Run in the Supabase SQL Editor before deploying the app version that uses it.

alter table public.areas add column if not exists sort_order integer;
