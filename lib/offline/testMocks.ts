// Shared fakes for the offline tests: device storage, the network, and the Supabase server.
// Test files wire them in with jest.mock(). The state is kept on globalThis so it survives
// jest.resetModules(), which the tests use to simulate restarting the app.

export type Result = { error: any; status?: number };

function makeFake() { return {
  storage: new Map<string, string>(),
  online: true,
  session: true as boolean,
  /** Every request the app sent, in order. */
  calls: [] as any[][],
  /** What the server sends back for the next requests; defaults to success. */
  results: [] as Result[],
  /** Rows the server currently holds, by "table:id" (used for conflict checks). */
  serverRows: new Map<string, any>(),
  refreshSession: jest.fn(async () => ({})),

  reset() {
    this.storage.clear();
    this.online = true;
    this.session = true;
    this.calls = [];
    this.results = [];
    this.serverRows.clear();
    this.refreshSession.mockClear();
  },
}; }

const g = globalThis as any;
export const fake: ReturnType<typeof makeFake> = g.__ledproFake ?? (g.__ledproFake = makeFake());

export const asyncStorageMock = {
  __esModule: true,
  default: {
    multiSet: async (pairs: [string, string][]) => { pairs.forEach(([k, v]) => fake.storage.set(k, v)); },
    multiGet: async (keys: string[]) => keys.map(k => [k, fake.storage.get(k) ?? null]),
  },
};

const respond = () => Promise.resolve(fake.results.shift() ?? { error: null, status: 200 });

export const supabaseMock = {
  supabase: {
    auth: {
      getSession: async () => ({ data: { session: fake.session ? {} : null } }),
      refreshSession: (...args: any[]) => fake.refreshSession(...(args as [])),
    },
    from: (table: string) => ({
      upsert: (row: any) => { fake.calls.push(['upsert', table, row]); return respond(); },
      update: (patch: any) => ({
        eq: (_: string, id: string) => { fake.calls.push(['update', table, id, patch]); return respond(); },
      }),
      delete: () => ({
        eq: (_: string, id: string) => { fake.calls.push(['delete', table, id]); return respond(); },
      }),
      select: () => ({
        eq: (_: string, id: string) => ({
          maybeSingle: async () => ({ data: fake.serverRows.get(`${table}:${id}`) ?? null }),
        }),
      }),
    }),
  },
};

export const connectivityMock = { isOnline: () => fake.online };

/** Lets un-awaited saves (persist) finish. */
export const settle = () => new Promise(resolve => setTimeout(resolve, 0));
