import { fake, settle } from './testMocks';

// The upload queue, tested against a fake server, fake network and fake device storage.

jest.mock('@react-native-async-storage/async-storage', () => require('./testMocks').asyncStorageMock);
jest.mock('../../supabase', () => require('./testMocks').supabaseMock);
jest.mock('./connectivity', () => require('./testMocks').connectivityMock);

let outbox: typeof import('./outbox');

// A fresh copy of the module is like a fresh app launch; device storage carries over.
function launchApp() {
  jest.resetModules();
  outbox = require('./outbox');
  return outbox.loadOutbox();
}

beforeEach(async () => {
  fake.reset();
  jest.spyOn(console, 'log').mockImplementation(() => {}); // expected "upload rejected" messages
  await launchApp();
});

afterEach(() => jest.restoreAllMocks());

const networkDown = { error: { message: 'TypeError: fetch failed' } };
const badData = { error: { message: 'null value in column "name"' }, status: 400 };
const loginExpired = { error: { message: 'JWT expired' }, status: 401 };

describe('order and merging', () => {
  it('uploads changes in the order they were made', async () => {
    outbox.enqueue({ kind: 'upsert', table: 'areas', row: { id: 'a1', name: 'Lobby' }, base: null, isNew: true });
    outbox.enqueue({ kind: 'upsert', table: 'light_rows', row: { id: 'r1', area_id: 'a1' }, base: null, isNew: true });
    outbox.enqueue({ kind: 'delete', table: 'job_issues', id: 'i1' });
    await outbox.flushOutbox();
    expect(fake.calls.map(c => `${c[0]} ${c[1]}`)).toEqual(['upsert areas', 'upsert light_rows', 'delete job_issues']);
    expect(outbox.getOutboxState().pending).toBe(0);
  });

  it('merges repeated edits to the same row into one upload', async () => {
    outbox.enqueue({ kind: 'update', table: 'light_rows', id: 'r1', patch: { new_quantity: 2 }, base: null });
    outbox.enqueue({ kind: 'update', table: 'light_rows', id: 'r1', patch: { new_quantity: 3, notes: 'high ceiling' }, base: null });
    expect(outbox.getOutboxState().pending).toBe(1);
    await outbox.flushOutbox();
    expect(fake.calls).toEqual([['update', 'light_rows', 'r1', { new_quantity: 3, notes: 'high ceiling' }]]);
  });

  it('folds edits into a new row that has not uploaded yet', async () => {
    outbox.enqueue({ kind: 'upsert', table: 'areas', row: { id: 'a1', name: 'Lobby' }, base: null, isNew: true });
    outbox.enqueue({ kind: 'update', table: 'areas', id: 'a1', patch: { name: 'Main Lobby' }, base: null });
    await outbox.flushOutbox();
    expect(fake.calls).toEqual([['upsert', 'areas', { id: 'a1', name: 'Main Lobby' }]]);
  });

  it('never uploads a row that was created and deleted while offline', async () => {
    fake.online = false;
    outbox.enqueue({ kind: 'upsert', table: 'areas', row: { id: 'a1' }, base: null, isNew: true });
    outbox.enqueue({ kind: 'update', table: 'areas', id: 'a1', patch: { name: 'x' }, base: null });
    outbox.enqueue({ kind: 'delete', table: 'areas', id: 'a1' });
    fake.online = true;
    await outbox.flushOutbox();
    expect(fake.calls).toEqual([]);
    expect(outbox.getOutboxState().pending).toBe(0);
  });

  it('drops pending edits to an existing row that is then deleted', async () => {
    outbox.enqueue({ kind: 'update', table: 'areas', id: 'a1', patch: { name: 'x' }, base: { id: 'a1', name: 'old' } });
    outbox.enqueue({ kind: 'delete', table: 'areas', id: 'a1' });
    await outbox.flushOutbox();
    expect(fake.calls).toEqual([['delete', 'areas', 'a1']]);
  });

  it('never sends device-only fields (starting with "_") to the server', async () => {
    outbox.enqueue({ kind: 'upsert', table: 'area_photos', row: { id: 'p1', path: 'a/p1.jpg', _localUri: 'file:///p1.jpg' }, base: null, isNew: true });
    await outbox.flushOutbox();
    expect(fake.calls[0][2]).toEqual({ id: 'p1', path: 'a/p1.jpg' });
  });
});

describe('failures', () => {
  it('waits while offline and uploads once back online', async () => {
    fake.online = false;
    outbox.enqueue({ kind: 'delete', table: 'areas', id: 'a1' });
    await outbox.flushOutbox();
    expect(fake.calls).toEqual([]);
    fake.online = true;
    await outbox.flushOutbox();
    expect(fake.calls).toEqual([['delete', 'areas', 'a1']]);
  });

  it('keeps a change after a network error and stops, so later changes stay in order', async () => {
    fake.results = [networkDown];
    outbox.enqueue({ kind: 'delete', table: 'areas', id: 'a1' });
    outbox.enqueue({ kind: 'delete', table: 'areas', id: 'a2' });
    await outbox.flushOutbox();
    expect(fake.calls).toEqual([['delete', 'areas', 'a1']]);
    expect(outbox.getOutboxState()).toMatchObject({ pending: 2, failed: 0, lastError: 'TypeError: fetch failed' });

    await outbox.flushOutbox();
    expect(fake.calls.map(c => c[2])).toEqual(['a1', 'a1', 'a2']);
    expect(outbox.getOutboxState().pending).toBe(0);
  });

  it('sets aside a change the server rejects so it cannot block the rest', async () => {
    fake.results = [badData];
    outbox.enqueue({ kind: 'upsert', table: 'areas', row: { id: 'a1' }, base: null, isNew: true });
    outbox.enqueue({ kind: 'delete', table: 'areas', id: 'a2' });
    await outbox.flushOutbox();
    expect(fake.calls.map(c => c[0])).toEqual(['upsert', 'delete']);
    expect(outbox.getOutboxState()).toMatchObject({ pending: 0, failed: 1 });
    expect(outbox.getFailedOps()[0].lastError).toContain('null value');
  });

  it('can retry or discard rejected changes', async () => {
    fake.results = [badData];
    outbox.enqueue({ kind: 'delete', table: 'areas', id: 'a1' });
    await outbox.flushOutbox();
    outbox.retryFailed();
    expect(outbox.getOutboxState()).toMatchObject({ pending: 1, failed: 0 });
    await outbox.flushOutbox();
    expect(fake.calls).toHaveLength(2);

    fake.results = [badData];
    outbox.enqueue({ kind: 'delete', table: 'areas', id: 'a2' });
    await outbox.flushOutbox();
    outbox.discardFailed();
    expect(outbox.getOutboxState()).toMatchObject({ pending: 0, failed: 0 });
  });

  it('renews an expired login once and retries the same change', async () => {
    fake.results = [loginExpired];
    outbox.enqueue({ kind: 'delete', table: 'areas', id: 'a1' });
    await outbox.flushOutbox();
    expect(fake.refreshSession).toHaveBeenCalledTimes(1);
    expect(fake.calls).toHaveLength(2);
    expect(outbox.getOutboxState()).toMatchObject({ pending: 0, failed: 0 });
  });

  it('uploads nothing until someone is logged in', async () => {
    fake.session = false;
    outbox.enqueue({ kind: 'delete', table: 'areas', id: 'a1' });
    await outbox.flushOutbox();
    expect(fake.calls).toEqual([]);
    expect(outbox.getOutboxState().pending).toBe(1);
  });

  it('does not let a failing side effect (log entry, notification) block the queue', async () => {
    outbox.registerCall('notify', async () => { throw new Error('push service down'); });
    outbox.enqueue({ kind: 'call', name: 'notify', args: [] });
    outbox.enqueue({ kind: 'delete', table: 'areas', id: 'a1' });
    await outbox.flushOutbox();
    expect(fake.calls).toEqual([['delete', 'areas', 'a1']]);
  });
});

describe('saved on the device', () => {
  it('keeps queued changes when the app is closed and reopened', async () => {
    fake.online = false;
    outbox.enqueue({ kind: 'delete', table: 'areas', id: 'a1' });
    await settle();

    await launchApp();
    expect(outbox.getOutboxState().pending).toBe(1);
    expect(outbox.isPending('areas', 'a1')).toBe(true);

    fake.online = true;
    await outbox.flushOutbox();
    expect(fake.calls).toEqual([['delete', 'areas', 'a1']]);
  });
});

describe('conflicts (last upload wins, both versions logged)', () => {
  const base = { id: 'r1', new_quantity: 1, notes: '' };

  it('logs both versions when someone else changed the same field', async () => {
    const onConflict = jest.fn(async () => {});
    outbox.registerConflictHandler(onConflict);
    fake.serverRows.set('light_rows:r1', { ...base, new_quantity: 3 });
    outbox.enqueue({ kind: 'update', table: 'light_rows', id: 'r1', patch: { new_quantity: 5 }, base });
    await outbox.flushOutbox();
    expect(onConflict).toHaveBeenCalledWith('light_rows', { ...base, new_quantity: 3 }, { ...base, new_quantity: 5 }, ['new_quantity']);
    expect(fake.calls).toEqual([['update', 'light_rows', 'r1', { new_quantity: 5 }]]);
  });

  it('does not flag a conflict when others changed different fields or nothing', async () => {
    const onConflict = jest.fn(async () => {});
    outbox.registerConflictHandler(onConflict);
    fake.serverRows.set('light_rows:r1', { ...base, notes: 'changed by Dylan' });
    outbox.enqueue({ kind: 'update', table: 'light_rows', id: 'r1', patch: { new_quantity: 5 }, base });
    await outbox.flushOutbox();
    expect(onConflict).not.toHaveBeenCalled();
    expect(fake.calls).toHaveLength(1);
  });
});
