import { fake } from './testMocks';

// The device copy of job data.

jest.mock('@react-native-async-storage/async-storage', () => require('./testMocks').asyncStorageMock);

let store: typeof import('./store');

beforeEach(() => {
  fake.reset();
  jest.resetModules();
  store = require('./store');
});

describe('replaceScope (refreshing from the server)', () => {
  const notPending = () => false;

  it('replaces the rows in scope and leaves other rows alone', () => {
    store.putRow('areas', { id: 'a1', job_id: 'j1', name: 'Old name' });
    store.putRow('areas', { id: 'a2', job_id: 'j1', name: 'Deleted on server' });
    store.putRow('areas', { id: 'b1', job_id: 'j2', name: 'Other job' });

    store.replaceScope('areas', r => r.job_id === 'j1', [{ id: 'a1', job_id: 'j1', name: 'New name' }], notPending);

    const s = store.getSnapshot();
    expect(s.where('areas', r => r.job_id === 'j1')).toEqual([{ id: 'a1', job_id: 'j1', name: 'New name' }]);
    expect(store.getRow('areas', 'b1')?.name).toBe('Other job');
  });

  it('never overwrites a row with changes still waiting to upload', () => {
    store.putRow('areas', { id: 'a1', job_id: 'j1', name: 'Edited offline' });
    const pending = (_: string, id: string) => id === 'a1';

    store.replaceScope('areas', r => r.job_id === 'j1', [{ id: 'a1', job_id: 'j1', name: 'Server copy' }], pending);
    expect(store.getRow('areas', 'a1')?.name).toBe('Edited offline');

    store.replaceScope('areas', r => r.job_id === 'j1', [], pending);
    expect(store.getRow('areas', 'a1')).toBeDefined();
  });

  // Known bug: replaceScope deletes the old row before merging, so the on-device photo link is
  // lost once a photo has uploaded. Change `it.failing` back to `it` when that is fixed.
  it.failing('keeps device-only fields such as the on-device photo file', () => {
    store.putRow('area_photos', { id: 'p1', area_id: 'a1', _localUri: 'file:///p1.jpg' });
    store.replaceScope('area_photos', r => r.area_id === 'a1', [{ id: 'p1', area_id: 'a1', path: 'a1/p1.jpg' }], notPending);
    expect(store.getRow('area_photos', 'p1')).toEqual({ id: 'p1', area_id: 'a1', _localUri: 'file:///p1.jpg', path: 'a1/p1.jpg' });
  });
});

describe('saved on the device', () => {
  it('reloads saved rows after the app restarts', async () => {
    jest.useFakeTimers();
    store.putRow('jobs', { id: 'j1', name: 'Plant 2' });
    jest.advanceTimersByTime(300); // saves are batched for 300 ms
    jest.useRealTimers();
    await new Promise(resolve => setTimeout(resolve, 0));

    jest.resetModules();
    store = require('./store');
    expect(store.getRow('jobs', 'j1')).toBeUndefined();
    await store.loadStore();
    expect(store.isStoreLoaded()).toBe(true);
    expect(store.getRow('jobs', 'j1')?.name).toBe('Plant 2');
  });
});

it('toServerRow strips device-only fields', () => {
  expect(store.toServerRow({ id: 'p1', path: 'x', _localUri: 'file:///x' })).toEqual({ id: 'p1', path: 'x' });
});
