import { fake } from './testMocks';

// Copying an area ("Duplicate").

jest.mock('@react-native-async-storage/async-storage', () => require('./testMocks').asyncStorageMock);
jest.mock('../../supabase', () => require('./testMocks').supabaseMock);
jest.mock('./connectivity', () => require('./testMocks').connectivityMock);
jest.mock('expo-crypto', () => ({ randomUUID: () => require('crypto').randomUUID() }));

let store: typeof import('./store');
let duplicate: typeof import('./duplicate');
let cascade: typeof import('./cascade');

beforeEach(() => {
  fake.reset();
  jest.resetModules();
  store = require('./store');
  duplicate = require('./duplicate');
  cascade = require('./cascade');

  store.putRow('areas', { id: 'suite', job_id: 'j', name: 'Suite 220', sort_order: 0, parent_area_id: null });
  store.putRow('areas', { id: 'gym', job_id: 'j', name: 'Gym', sort_order: 1, parent_area_id: null });
  store.putRow('areas', { id: 'a', job_id: 'j', name: 'Office A', sort_order: 0, parent_area_id: 'suite', notes: 'ladder', is_complete: true });
  store.putRow('areas', { id: 'b', job_id: 'j', name: 'Office B', sort_order: 1, parent_area_id: 'suite' });
  store.putRow('light_rows', { id: 'r1', area_id: 'a', quantity: 2, light_type_id: '2x2 troffer', new_quantity: 2, new_light_type: '2x2 panel', new_mount: 'Recessed', sort_order: 0 });
  store.putRow('area_controls', { id: 'c1', area_id: 'a', light_row_id: 'r1', kind: 'occupancy', quantity: 1, install_status: 'installed' });
  store.putRow('area_controls', { id: 'c2', area_id: 'a', light_row_id: null, kind: 'dimmer', quantity: 1 });
  store.putRow('area_photos', { id: 'p1', area_id: 'a' });
  store.putRow('install_rows', { id: 'i1', light_row_id: 'r1' });
});

const snap = () => store.getSnapshot();

it('copies lights and controls into a new room right after the original', () => {
  const id = duplicate.duplicateArea({ sourceId: 'a', name: 'Office C', parentId: 'suite' })!;
  const copy = snap().get('areas', id)!;

  expect(copy).toMatchObject({ name: 'Office C', job_id: 'j', parent_area_id: 'suite', is_complete: false, sort_order: 1 });
  expect(copy.notes).toBeUndefined();
  // Office B moved down to make room.
  expect(snap().get('areas', 'b')!.sort_order).toBe(2);

  const rows = snap().where('light_rows', r => r.area_id === id);
  expect(rows).toHaveLength(1);
  expect(rows[0]).toMatchObject({ quantity: 2, light_type_id: '2x2 troffer', new_quantity: 2, new_light_type: '2x2 panel', new_mount: 'Recessed' });
  expect(rows[0].id).not.toBe('r1');

  const controls = snap().where('area_controls', c => c.area_id === id);
  expect(controls.find(c => c.kind === 'occupancy')).toMatchObject({ light_row_id: rows[0].id, quantity: 1 });
  expect(controls.find(c => c.kind === 'occupancy')!.install_status).toBeUndefined();
  expect(controls.find(c => c.kind === 'dimmer')).toMatchObject({ light_row_id: null });
});

it('leaves photos and electrician progress with the original', () => {
  const id = duplicate.duplicateArea({ sourceId: 'a', name: 'Office C', parentId: 'suite' })!;
  expect(snap().where('area_photos', p => p.area_id === id)).toHaveLength(0);
  const rowId = snap().where('light_rows', r => r.area_id === id)[0].id;
  expect(snap().where('install_rows', r => r.light_row_id === rowId)).toHaveLength(0);
});

it('can put the copy in another group, at the end', () => {
  const id = duplicate.duplicateArea({ sourceId: 'a', name: 'Lobby', parentId: null })!;
  expect(snap().get('areas', id)).toMatchObject({ parent_area_id: null, sort_order: 2 });
  expect(snap().get('areas', 'suite')!.sort_order).toBe(0);
  expect(snap().get('areas', 'gym')!.sort_order).toBe(1);
});

it('leaves the original untouched', () => {
  duplicate.duplicateArea({ sourceId: 'a', name: 'Office C', parentId: 'suite' });
  expect(snap().get('areas', 'a')).toMatchObject({ name: 'Office A', notes: 'ladder', is_complete: true, sort_order: 0 });
  expect(snap().where('light_rows', r => r.area_id === 'a')).toHaveLength(1);
});

it('deleting an area also deletes its rooms', () => {
  cascade.deleteAreaCascade('suite');
  expect(snap().all('areas').map(a => a.id)).toEqual(['gym']);
  expect(snap().all('light_rows')).toHaveLength(0);
});
