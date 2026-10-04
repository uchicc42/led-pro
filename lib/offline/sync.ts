import { AppState } from 'react-native';
import { useSyncExternalStore } from 'react';
import { logChange, notifyAreaComplete, notifyJobComplete, notifyJobIssue, notifyJobNote } from '../../constants/notifications';
import { syncQueue as flushLegacyQueue } from '../../constants/offlineSync';
import { getCurrentUser } from '../../constants/userStore';
import { supabase } from '../../supabase';
import { isOnline, subscribeOnline } from './connectivity';
import { flushOutbox, isPending, loadOutbox, registerCall, registerConflictHandler } from './outbox';
import { Row, Table, getRow, getSnapshot, loadStore, replaceScope } from './store';

// Keeps the device copy fresh: uploads queued changes, then downloads the latest data for
// active jobs (and any job opened on this device). Runs when signal returns, when the app
// comes back to the foreground, every couple of minutes, and on "Sync now".

// ---- status for the UI ---------------------------------------------------------------------

type SyncState = { syncing: boolean; lastSyncedAt: number | null };
let state: SyncState = { syncing: false, lastSyncedAt: null };
const listeners = new Set<() => void>();

function setState(patch: Partial<SyncState>) {
  state = { ...state, ...patch };
  listeners.forEach(l => l());
}

export function useSyncState() {
  return useSyncExternalStore(
    l => { listeners.add(l); return () => { listeners.delete(l); }; },
    () => state,
    () => state,
  );
}

// ---- queued side effects -------------------------------------------------------------------

registerCall('logChange', logChange);
registerCall('notifyAreaComplete', notifyAreaComplete);
registerCall('notifyJobComplete', notifyJobComplete);
registerCall('notifyJobNote', notifyJobNote);
registerCall('notifyJobIssue', notifyJobIssue);

// ---- conflicts: someone else changed the same fields; keep ours, log both ------------------

const TABLE_LABEL: Partial<Record<Table, string>> = {
  jobs: 'job settings', areas: 'area', light_rows: 'light row', area_controls: 'sensor/photocell',
  job_issues: 'issue', install_rows: 'install status',
};

function contextFor(table: Table, row: Row): { jobId: string | null; areaId: string | null } {
  if (table === 'jobs') return { jobId: row.id, areaId: null };
  if (table === 'areas') return { jobId: row.job_id ?? null, areaId: row.id };
  if (table === 'job_issues') return { jobId: row.job_id ?? null, areaId: row.area_id ?? null };
  const lightRow = table === 'install_rows' ? getRow('light_rows', row.light_row_id) : null;
  const areaId = lightRow?.area_id ?? row.area_id ?? null;
  return { jobId: getRow('areas', areaId)?.job_id ?? null, areaId };
}

const show = (v: any) => (v === null || v === undefined || v === '' ? '(blank)' : String(v));

registerConflictHandler(async (table, theirs, mine, fields) => {
  const user = await getCurrentUser();
  const { jobId, areaId } = contextFor(table, mine);
  const changes = fields.map(f => `${f}: their "${show(theirs[f])}" replaced by "${show(mine[f])}"`).join('; ');
  await supabase.from('change_log').insert({
    job_id: jobId,
    area_id: areaId,
    changed_by: user?.id ?? null,
    changed_by_name: user?.name ?? null,
    change_type: 'sync_conflict',
    description: `Offline edit to ${TABLE_LABEL[table] ?? table} overwrote another change — ${changes}`,
  });
});

// ---- downloading -----------------------------------------------------------------------------

const trackedJobs = new Set<string>();

async function pullReference() {
  const [{ data: lightTypes }, { data: controlTypes }] = await Promise.all([
    supabase.from('light_types').select('*'),
    supabase.from('control_types').select('*'),
  ]);
  if (lightTypes) replaceScope('light_types', () => true, lightTypes, isPending);
  if (controlTypes) replaceScope('control_types', () => true, controlTypes, isPending);
}

async function pullJobsList(): Promise<Row[]> {
  const { data, error } = await supabase
    .from('jobs')
    .select('*, created_by_member:team_members(name, initials, color), areas(id, is_complete)');
  if (error || !data) return [];
  // Embedded relations are stored as local-only fields so they're never uploaded.
  const rows = data.map(({ created_by_member, areas, ...job }: any) => ({
    ...job, _created_by: created_by_member ?? null, _areas: areas ?? [],
  }));
  replaceScope('jobs', () => true, rows, isPending);
  return rows;
}

/** Downloads everything for one job into the device copy. */
export async function pullJob(jobId: string) {
  const [{ data: job }, { data: areas, error }, { data: issues }] = await Promise.all([
    supabase.from('jobs').select('*').eq('id', jobId).maybeSingle(),
    supabase.from('areas').select('*, light_rows(*), area_controls(*), area_photos(*)').eq('job_id', jobId),
    supabase.from('job_issues').select('*').eq('job_id', jobId),
  ]);
  if (error || !areas) return;

  if (job) replaceScope('jobs', r => r.id === jobId, [job], isPending);

  const lightRows: Row[] = [], controls: Row[] = [], photos: Row[] = [];
  const areaRows = areas.map(({ light_rows, area_controls, area_photos, ...a }: any) => {
    lightRows.push(...(light_rows || []));
    controls.push(...(area_controls || []));
    photos.push(...(area_photos || []));
    return a;
  });

  // Areas created on this device but not uploaded yet still belong to the job.
  const jobAreaIds = new Set<string>([
    ...areaRows.map((a: Row) => a.id),
    ...getSnapshot().where('areas', a => a.job_id === jobId).map(a => a.id),
  ]);
  replaceScope('areas', r => r.job_id === jobId, areaRows, isPending);
  replaceScope('light_rows', r => jobAreaIds.has(r.area_id), lightRows, isPending);
  replaceScope('area_controls', r => jobAreaIds.has(r.area_id), controls, isPending);
  replaceScope('area_photos', r => jobAreaIds.has(r.area_id), photos, isPending);
  if (issues) replaceScope('job_issues', r => r.job_id === jobId, issues, isPending);

  // Install records, fetched in chunks to keep request URLs short. Older duplicates for the
  // same light row (from an earlier bug) are ignored: only the newest is kept.
  const rowIds = new Set<string>([
    ...lightRows.map(r => r.id),
    ...getSnapshot().where('light_rows', r => jobAreaIds.has(r.area_id)).map(r => r.id),
  ]);
  const ids = [...rowIds];
  const installs: Row[] = [];
  for (let i = 0; i < ids.length; i += 80) {
    const { data } = await supabase.from('install_rows').select('*').in('light_row_id', ids.slice(i, i + 80));
    if (data) installs.push(...data);
  }
  const newest = new Map<string, Row>();
  installs
    .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)))
    .forEach(r => newest.set(r.light_row_id, r));
  replaceScope('install_rows', r => rowIds.has(r.light_row_id), [...newest.values()], isPending);
}

// ---- orchestration ---------------------------------------------------------------------------

let syncing: Promise<void> | null = null;

/** Uploads queued changes, then refreshes active jobs and jobs opened on this device. */
export function syncNow() {
  if (!syncing) {
    syncing = (async () => {
      await Promise.all([loadStore(), loadOutbox()]);
      if (!isOnline()) return;
      setState({ syncing: true });
      try {
        await flushLegacyQueue(); // electrician changes saved by the previous offline system
        await flushOutbox();
        await pullReference();
        const jobs = await pullJobsList();
        const jobIds = new Set([...jobs.filter(j => j.status !== 'complete').map(j => j.id), ...trackedJobs]);
        for (const id of jobIds) await pullJob(id);
        setState({ lastSyncedAt: Date.now() });
      } catch (e) {
        console.log('Sync error:', e);
      } finally {
        setState({ syncing: false });
      }
    })().finally(() => { syncing = null; });
  }
  return syncing;
}

/** Call when a job is opened: keeps it on the device and refreshes it if there's signal. */
export function trackJob(jobId: string | undefined) {
  if (!jobId) return;
  trackedJobs.add(jobId);
  if (isOnline()) pullJob(jobId).catch(e => console.log('Job refresh error:', e));
}

let started = false;

/** Starts background syncing. Called once from the root layout. */
export function startSyncEngine() {
  if (started) return;
  started = true;
  syncNow();
  subscribeOnline(() => { if (isOnline()) syncNow(); });
  AppState.addEventListener('change', s => { if (s === 'active') syncNow(); });
  setInterval(() => { if (isOnline()) syncNow(); }, 2 * 60 * 1000);
}
