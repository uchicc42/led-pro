-- Deleting a job from the app: owners and partners only (checked here, on the server).
-- Removes the job and everything under it in one transaction, so it either fully happens or
-- not at all, and returns the storage paths of the job's photos so the app can delete the files.
-- Run in the Supabase SQL Editor before deploying the app version that uses it.

create or replace function public.delete_job(p_job_id uuid)
returns setof text
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(public.current_member_role(), '') not in ('owner', 'partner') then
    raise exception 'Only owners and partners can delete jobs' using errcode = '42501';
  end if;

  return query
    select p.storage_path from area_photos p join areas a on a.id = p.area_id
     where a.job_id = p_job_id and p.storage_path is not null
    union all
    select i.photo_path from job_issues i
     where i.job_id = p_job_id and i.photo_path is not null;

  -- Children first, so nothing is left pointing at a deleted row.
  delete from install_rows where light_row_id in (
    select r.id from light_rows r join areas a on a.id = r.area_id where a.job_id = p_job_id);
  delete from area_controls where area_id in (select id from areas where job_id = p_job_id);
  delete from area_photos where area_id in (select id from areas where job_id = p_job_id);
  delete from job_issues where job_id = p_job_id;
  delete from light_rows where area_id in (select id from areas where job_id = p_job_id);
  delete from change_log where job_id = p_job_id;
  delete from areas where job_id = p_job_id;
  delete from jobs where id = p_job_id;
end
$$;

revoke all on function public.delete_job(uuid) from public, anon;
grant execute on function public.delete_job(uuid) to authenticated;
