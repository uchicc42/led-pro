-- Light type suppliers (e.g. Ledvance, Contractor Lighting Supply), shown on the fixture summary.
-- Run once in Supabase → SQL Editor, BEFORE updating the qb-sync function.
-- supplier_from_qb = the supplier comes from the QuickBooks item's Preferred vendor (change it there);
-- otherwise it is set in the app (Settings → light type).

alter table public.light_types add column if not exists supplier text;
alter table public.light_types add column if not exists supplier_from_qb boolean not null default false;
