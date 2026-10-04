import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';
import { supabase } from '../../supabase';
import { isOnline } from './connectivity';
import { Row, Table, getRow, toServerRow } from './store';

// Queue of local changes waiting to upload, kept in order and saved on the device.
//
// - Ops run strictly in order, so a new area uploads before its light rows.
// - Repeated edits to the same row are merged into one op.
// - A network failure stops the run; the op is retried next time (nothing is lost).
// - An op the server rejects (bad data) is moved to `failed` so it can't block the queue.
// - Edits to rows that already existed carry `base` (the row as last seen from the server);
//   if someone else changed the same fields meanwhile, both versions go to the change log
//   and the local edit still wins ("last upload wins").

export type Op =
  | { kind: 'upsert'; table: Table; row: Row; base: Row | null; isNew: boolean }
  | { kind: 'update'; table: Table; id: string; patch: Record<string, any>; base: Row | null }
  | { kind: 'delete'; table: Table; id: string }
  | { kind: 'upload'; bucket: string; path: string; localUri: string; contentType: string }
  | { kind: 'call'; name: string; args: any[] };

export type QueuedOp = Op & { opId: string; createdAt: number; attempts: number; lastError?: string };

const QUEUE_KEY = 'ledpro:offline:v1:outbox';
const FAILED_KEY = 'ledpro:offline:v1:outbox-failed';

let queue: QueuedOp[] = [];
let failed: QueuedOp[] = [];
let inFlightOpId: string | null = null;
let loading: Promise<void> | null = null;

// ---- status for the UI -------------------------------------------------------------------

type OutboxState = { pending: number; failed: number; lastError?: string };
let state: OutboxState = { pending: 0, failed: 0 };
const listeners = new Set<() => void>();

function notify() {
  state = { pending: queue.length, failed: failed.length, lastError: queue[0]?.lastError };
  listeners.forEach(l => l());
}

export function subscribeOutbox(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function getOutboxState() {
  return state;
}

export function useOutboxState() {
  return useSyncExternalStore(subscribeOutbox, getOutboxState, getOutboxState);
}

// ---- persistence ---------------------------------------------------------------------------

async function persist() {
  try {
    await AsyncStorage.multiSet([[QUEUE_KEY, JSON.stringify(queue)], [FAILED_KEY, JSON.stringify(failed)]]);
  } catch (e) {
    console.log('Outbox save error:', e);
  }
}

export function loadOutbox() {
  if (!loading) {
    loading = (async () => {
      try {
        const [[, q], [, f]] = await AsyncStorage.multiGet([QUEUE_KEY, FAILED_KEY]);
        queue = q ? JSON.parse(q) : [];
        failed = f ? JSON.parse(f) : [];
      } catch (e) {
        console.log('Outbox load error:', e);
      }
      notify();
    })();
  }
  return loading;
}

// ---- pending lookups (used so server refreshes don't overwrite local edits) ----------------

export function isPending(table: Table, id: string) {
  return queue.some(op =>
    (op.kind === 'upsert' && op.table === table && op.row.id === id) ||
    ((op.kind === 'update' || op.kind === 'delete') && op.table === table && op.id === id));
}

export function pendingUploads() {
  return new Set(queue.filter(op => op.kind === 'upload').map(op => (op as any).path as string));
}

// ---- enqueue ------------------------------------------------------------------------------

let opCounter = 0;
const newOpId = () => `${Date.now()}-${opCounter++}`;

function findMergeable(table: Table, id: string) {
  // Only ops that haven't started uploading can be merged into.
  return queue.find(op => op.opId !== inFlightOpId &&
    ((op.kind === 'upsert' && op.table === table && op.row.id === id) ||
     (op.kind === 'update' && op.table === table && op.id === id)));
}

export function enqueue(op: Op, onQueued?: () => void) {
  if (op.kind === 'upsert' || op.kind === 'update') {
    const id = op.kind === 'upsert' ? op.row.id : op.id;
    const existing = findMergeable(op.table, id);
    if (existing) {
      if (existing.kind === 'upsert') {
        existing.row = op.kind === 'upsert' ? { ...existing.row, ...op.row } : { ...existing.row, ...op.patch };
      } else if (existing.kind === 'update') {
        if (op.kind === 'upsert') {
          // Upgrade to a full upsert, keeping the original base for conflict detection.
          Object.assign(existing, { kind: 'upsert', row: op.row, isNew: false });
          delete (existing as any).patch;
          delete (existing as any).id;
        } else {
          existing.patch = { ...existing.patch, ...op.patch };
        }
      }
      return finishEnqueue(onQueued);
    }
  }

  if (op.kind === 'delete') {
    const created = queue.find(q => q.opId !== inFlightOpId && q.kind === 'upsert' && q.table === op.table && q.row.id === op.id && q.isNew);
    // Deleting something that was created offline and never uploaded: just drop it.
    if (created) {
      queue = queue.filter(q => !(q.opId !== inFlightOpId &&
        (((q.kind === 'upsert') && q.table === op.table && q.row.id === op.id) ||
         ((q.kind === 'update') && q.table === op.table && q.id === op.id))));
      return finishEnqueue(onQueued);
    }
    // Pending edits to a row that's being deleted are pointless.
    queue = queue.filter(q => !(q.opId !== inFlightOpId &&
      (((q.kind === 'upsert') && q.table === op.table && q.row.id === op.id) ||
       ((q.kind === 'update') && q.table === op.table && q.id === op.id))));
  }

  queue.push({ ...op, opId: newOpId(), createdAt: Date.now(), attempts: 0 } as QueuedOp);
  return finishEnqueue(onQueued);
}

function finishEnqueue(onQueued?: () => void) {
  notify();
  persist();
  onQueued?.();
}

// ---- running the queue ----------------------------------------------------------------------

// Effects that run when their op is reached (change log entries, push notifications).
// Registered by the modules that own them, to avoid import cycles.
const callHandlers: Record<string, (...args: any[]) => Promise<unknown>> = {};
export function registerCall(name: string, handler: (...args: any[]) => Promise<unknown>) {
  callHandlers[name] = handler;
}

// Uploads a device file to storage; provided per platform by the photo module.
let uploadHandler: ((op: Extract<Op, { kind: 'upload' }>) => Promise<{ error: any }>) | null = null;
export function registerUploadHandler(handler: typeof uploadHandler) {
  uploadHandler = handler;
}

// Called when an edit overwrote someone else's change; logs both versions.
let conflictHandler: ((table: Table, theirs: Row, mine: Row, fields: string[]) => Promise<void>) | null = null;
export function registerConflictHandler(handler: typeof conflictHandler) {
  conflictHandler = handler;
}

type Outcome = { result: 'ok' } | { result: 'retry'; error: string } | { result: 'rejected'; error: string };

function classify(error: any, status?: number): Outcome {
  const message = String(error?.message ?? error ?? 'Unknown error');
  const transient = !isOnline() || !status || status >= 500 || status === 429 || status === 408 ||
    /network|fetch|timed? ?out|abort|connection/i.test(message);
  return transient ? { result: 'retry', error: message } : { result: 'rejected', error: message };
}

const same = (a: any, b: any) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

async function checkConflict(table: Table, id: string, mine: Record<string, any>, base: Row) {
  const fields = Object.keys(mine).filter(k => !k.startsWith('_') && k !== 'id' && !same(mine[k], base[k]));
  if (fields.length === 0 || !conflictHandler) return;
  const { data: theirs } = await supabase.from(table).select('*').eq('id', id).maybeSingle();
  if (!theirs) return;
  const changedByOthers = fields.filter(f => !same(theirs[f], base[f]) && !same(theirs[f], mine[f]));
  if (changedByOthers.length > 0) {
    await conflictHandler(table, theirs, { ...base, ...mine } as Row, changedByOthers);
  }
}

async function execute(op: QueuedOp): Promise<Outcome> {
  try {
    switch (op.kind) {
      case 'upsert': {
        if (op.base) await checkConflict(op.table, op.row.id, op.row, op.base);
        const { error, status } = await supabase.from(op.table).upsert(toServerRow(op.row));
        return error ? classify(error, status) : { result: 'ok' };
      }
      case 'update': {
        if (op.base) await checkConflict(op.table, op.id, op.patch, op.base);
        const { error, status } = await supabase.from(op.table).update(toServerRow(op.patch)).eq('id', op.id);
        return error ? classify(error, status) : { result: 'ok' };
      }
      case 'delete': {
        const { error, status } = await supabase.from(op.table).delete().eq('id', op.id);
        return error ? classify(error, status) : { result: 'ok' };
      }
      case 'upload': {
        if (!uploadHandler) return { result: 'retry', error: 'Photo uploads not ready yet' };
        const { error } = await uploadHandler(op);
        if (!error) return { result: 'ok' };
        // Storage reports an existing file (from a previous partial attempt) as an error.
        if (/exists|duplicate/i.test(String(error?.message))) return { result: 'ok' };
        return classify(error, error?.statusCode ? Number(error.statusCode) : undefined);
      }
      case 'call': {
        // Side effects (log entries, notifications) are best effort: never block the queue.
        try { await callHandlers[op.name]?.(...op.args); } catch (e) { console.log(`Queued ${op.name} failed:`, e); }
        return { result: 'ok' };
      }
    }
  } catch (e) {
    return classify(e);
  }
}

let flushing: Promise<void> | null = null;

/** Uploads queued changes in order until done, offline, or a network error. */
export function flushOutbox() {
  if (!flushing) {
    flushing = (async () => {
      await loadOutbox();
      while (queue.length > 0 && isOnline()) {
        const op = queue[0];
        inFlightOpId = op.opId;
        const outcome = await execute(op);
        inFlightOpId = null;
        if (outcome.result === 'ok') {
          queue = queue.filter(q => q.opId !== op.opId);
        } else if (outcome.result === 'retry') {
          op.attempts++;
          op.lastError = outcome.error;
          notify();
          await persist();
          break;
        } else {
          queue = queue.filter(q => q.opId !== op.opId);
          failed.push({ ...op, lastError: outcome.error });
          console.log('Upload rejected by server:', op.kind, outcome.error);
        }
        notify();
        await persist();
      }
    })().finally(() => { flushing = null; });
  }
  return flushing;
}

export function getFailedOps() {
  return failed;
}

/** Puts rejected changes back in the queue for another try. */
export function retryFailed() {
  queue.push(...failed.map(op => ({ ...op, attempts: 0, lastError: undefined })));
  failed = [];
  notify();
  persist();
}

/** Discards rejected changes the user has chosen to give up on. */
export function discardFailed() {
  failed = [];
  notify();
  persist();
}

/** Base for conflict detection: the row as last synced, or null if it's new. */
export function baseFor(table: Table, id: string): Row | null {
  if (isPending(table, id)) return null; // an earlier queued op already carries the base
  return getRow(table, id) ?? null;
}
