-- Rooms inside areas ("sub-areas"), e.g. Office A inside Suite 220.
-- An area with parent_area_id set is a room inside that area. One level only (the app
-- treats anything deeper as a top-level area). Rooms are ordered among themselves with
-- sort_order, like areas.
-- The app deletes rooms before their area; "on delete set null" is a safety net so a room
-- is never left pointing at an area that's gone.
-- Run in the Supabase SQL Editor before using the app version that has rooms.
-- Safe to run more than once.

alter table public.areas
  add column if not exists parent_area_id uuid references public.areas(id) on delete set null;

create index if not exists areas_parent_area_id_idx on public.areas (parent_area_id);
