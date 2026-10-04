import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

// The device's own copy of job data. Screens read from here so they work without signal;
// sync.ts refreshes it from the server and outbox.ts uploads local changes.
//
// Fields starting with "_" are local-only (e.g. a photo's on-device file) and are never
// sent to the server.

export type Table =
  | 'jobs' | 'areas' | 'light_rows' | 'area_controls' | 'area_photos'
  | 'job_issues' | 'install_rows' | 'light_types' | 'control_types';

export const TABLES: Table[] = [
  'jobs', 'areas', 'light_rows', 'area_controls', 'area_photos',
  'job_issues', 'install_rows', 'light_types', 'control_types',
];

export type Row = Record<string, any> & { id: string };

const storageKey = (t: Table) => `ledpro:offline:v1:${t}`;

const data = Object.fromEntries(TABLES.map(t => [t, new Map<string, Row>()])) as Record<Table, Map<string, Row>>;
let loading: Promise<void> | null = null;
let loaded = false;

// ---- change notification -------------------------------------------------------------

const listeners = new Set<() => void>();

export type StoreSnapshot = {
  version: number;
  all: (t: Table) => Row[];
  get: (t: Table, id: string | null | undefined) => Row | undefined;
  where: (t: Table, predicate: (r: Row) => boolean) => Row[];
};

function makeSnapshot(version: number): StoreSnapshot {
  return {
    version,
    all: t => [...data[t].values()],
    get: (t, id) => (id ? data[t].get(id) : undefined),
    where: (t, predicate) => [...data[t].values()].filter(predicate),
  };
}

// A new snapshot object per change, so components (and the React Compiler) see a new value.
let snapshot = makeSnapshot(0);

function notify() {
  snapshot = makeSnapshot(snapshot.version + 1);
  listeners.forEach(l => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/** Current local data; re-renders the component whenever the local copy changes. */
export function useStore(): StoreSnapshot {
  return useSyncExternalStore(subscribe, () => snapshot, () => snapshot);
}

export function getSnapshot() {
  return snapshot;
}

// ---- persistence ---------------------------------------------------------------------

const dirty = new Set<Table>();
let persistTimer: ReturnType<typeof setTimeout> | undefined;

function schedulePersist(t: Table) {
  dirty.add(t);
  clearTimeout(persistTimer);
  persistTimer = setTimeout(persistNow, 300);
}

async function persistNow() {
  const tables = [...dirty];
  dirty.clear();
  try {
    await AsyncStorage.multiSet(tables.map(t => [storageKey(t), JSON.stringify([...data[t].values()])]));
  } catch (e) {
    console.log('Offline store save error:', e);
  }
}

/** Loads the saved local copy once. Safe to call repeatedly. */
export function loadStore() {
  if (!loading) {
    loading = (async () => {
      try {
        const entries = await AsyncStorage.multiGet(TABLES.map(storageKey));
        entries.forEach(([, value], i) => {
          if (!value) return;
          const rows: Row[] = JSON.parse(value);
          data[TABLES[i]] = new Map(rows.map(r => [r.id, r]));
        });
      } catch (e) {
        console.log('Offline store load error:', e);
      }
      loaded = true;
      notify();
    })();
  }
  return loading;
}

export function isStoreLoaded() {
  return loaded;
}

// ---- reads & writes --------------------------------------------------------------------

export function getRow(t: Table, id: string | null | undefined) {
  return id ? data[t].get(id) : undefined;
}

export function putRow(t: Table, row: Row) {
  data[t].set(row.id, row);
  schedulePersist(t);
  notify();
}

export function removeRow(t: Table, id: string) {
  if (data[t].delete(id)) {
    schedulePersist(t);
    notify();
  }
}

/**
 * Replaces the rows in a scope (e.g. "areas of job X") with fresh server rows.
 * Rows with changes still waiting to upload are left exactly as they are on the device,
 * so refreshing from the server never overwrites offline work.
 */
export function replaceScope(
  t: Table,
  inScope: (r: Row) => boolean,
  rows: Row[],
  isPending: (t: Table, id: string) => boolean,
) {
  const m = data[t];
  for (const [id, r] of m) {
    if (inScope(r) && !isPending(t, id)) m.delete(id);
  }
  for (const r of rows) {
    if (!isPending(t, r.id)) m.set(r.id, { ...m.get(r.id), ...r });
  }
  schedulePersist(t);
  notify();
}

/** Strips local-only fields before a row is sent to the server. */
export function toServerRow(row: Record<string, any>) {
  return Object.fromEntries(Object.entries(row).filter(([k]) => !k.startsWith('_')));
}
