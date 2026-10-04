import * as Crypto from 'expo-crypto';
import { isOnline } from './connectivity';
import { Op, baseFor, enqueue, flushOutbox } from './outbox';
import { Row, Table, getRow, putRow, removeRow } from './store';

// Write API for screens: every change is applied to the device copy immediately (so the
// screen updates even with no signal) and queued for upload.

/** IDs are created on the device so new records can be used before they reach the server. */
export const newId = () => Crypto.randomUUID();

let kickTimer: ReturnType<typeof setTimeout> | undefined;

// Start uploading shortly after changes stop coming in, if there's signal.
function kick() {
  clearTimeout(kickTimer);
  kickTimer = setTimeout(() => { if (isOnline()) flushOutbox(); }, 600);
}

/** Creates or replaces a whole row. */
export function saveRow(table: Table, row: Row) {
  const prev = getRow(table, row.id);
  const base = prev ? baseFor(table, row.id) : null;
  const next = { ...prev, ...row };
  putRow(table, next);
  enqueue({ kind: 'upsert', table, row: next, base, isNew: !prev }, kick);
  return next;
}

/** Changes some fields of an existing row. */
export function patchRow(table: Table, id: string, patch: Record<string, any>) {
  const prev = getRow(table, id);
  if (!prev) return;
  const base = baseFor(table, id);
  putRow(table, { ...prev, ...patch });
  enqueue({ kind: 'update', table, id, patch, base }, kick);
}

export function deleteRow(table: Table, id: string) {
  removeRow(table, id);
  enqueue({ kind: 'delete', table, id }, kick);
}

/** Queues a side effect (change log entry, push notification) to run when uploading. */
export function queueCall(name: string, ...args: any[]) {
  enqueue({ kind: 'call', name, args }, kick);
}

/** Queues a device file to be uploaded to storage. */
export function queueUpload(upload: Omit<Extract<Op, { kind: 'upload' }>, 'kind'>) {
  enqueue({ kind: 'upload', ...upload }, kick);
}
