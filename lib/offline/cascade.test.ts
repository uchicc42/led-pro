import { fake } from './testMocks';

// Removing a deleted job from the device.

jest.mock('@react-native-async-storage/async-storage', () => require('./testMocks').asyncStorageMock);
jest.mock('../../supabase', () => require('./testMocks').supabaseMock);
jest.mock('./connectivity', () => require('./testMocks').connectivityMock);
jest.mock('./files', () => ({ deleteLocalPhoto: jest.fn() }));

let store: typeof import('./store');
let outbox: typeof import('./outbox');
let cascade: typeof import('./cascade');
let files: { deleteLocalPhoto: jest.Mock };

beforeEach(() => {
  fake.reset();
  jest.resetModules();
  store = require('./store');
  outbox = require('./outbox');
  cascade = require('./cascade');
  files = require('./files');
});

function addJob(jobId: string) {
  store.putRow('jobs', { id: jobId });
  store.putRow('areas', { id: `${jobId}-area`, job_id: jobId });
  store.putRow('light_rows', { id: `${jobId}-row`, area_id: `${jobId}-area` });
  store.putRow('install_rows', { id: `${jobId}-install`, light_row_id: `${jobId}-row` });
  store.putRow('area_controls', { id: `${jobId}-control`, area_id: `${jobId}-area` });
  store.putRow('area_photos', { id: `${jobId}-photo`, area_id: `${jobId}-area`, _localUri: `file:///${jobId}.jpg` });
  store.putRow('job_issues', { id: `${jobId}-issue`, job_id: jobId });
}

const tables = ['jobs', 'areas', 'light_rows', 'install_rows', 'area_controls', 'area_photos', 'job_issues'] as const;

it('removes the job and everything under it from the device, and only that job', () => {
  addJob('j1');
  addJob('j2');
  cascade.forgetJob('j1');

  for (const t of tables) {
    expect(store.getSnapshot().all(t).map(r => r.id)).toEqual([expect.stringMatching(/^j2/)]);
  }
  expect(files.deleteLocalPhoto).toHaveBeenCalledWith('file:///j1.jpg');
  expect(files.deleteLocalPhoto).not.toHaveBeenCalledWith('file:///j2.jpg');
});

it('queues nothing to upload (the server already deleted it)', () => {
  addJob('j1');
  cascade.forgetJob('j1');
  expect(outbox.getOutboxState().pending).toBe(0);
});
