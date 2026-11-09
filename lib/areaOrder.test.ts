import { byAreaOrder, reorderPatches } from './areaOrder';

const names = (areas: any[]) => [...areas].sort(byAreaOrder).map(a => a.name);

describe('byAreaOrder', () => {
  it('follows the saved order', () => {
    expect(names([
      { name: 'Gym', sort_order: 2, created_at: '2026-01-01' },
      { name: 'Lobby', sort_order: 0, created_at: '2026-01-03' },
      { name: 'Office', sort_order: 1, created_at: '2026-01-02' },
    ])).toEqual(['Lobby', 'Office', 'Gym']);
  });

  it('puts areas without a position last, oldest first', () => {
    expect(names([
      { name: 'Added later', sort_order: null, created_at: '2026-01-05' },
      { name: 'Old', created_at: '2026-01-01' },
      { name: 'Placed', sort_order: 0, created_at: '2026-01-04' },
    ])).toEqual(['Placed', 'Old', 'Added later']);
  });

  it('uses created order when no area has a position yet', () => {
    expect(names([
      { name: 'B', created_at: '2026-01-02' },
      { name: 'A', created_at: '2026-01-01' },
    ])).toEqual(['A', 'B']);
  });
});

describe('reorderPatches', () => {
  const areas = ['a', 'b', 'c', 'd'].map((id, i) => ({ id, sort_order: i }));

  it('moves an area down and renumbers only what changed', () => {
    expect(reorderPatches(areas, 0, 2)).toEqual([
      { id: 'b', sort_order: 0 },
      { id: 'c', sort_order: 1 },
      { id: 'a', sort_order: 2 },
    ]);
  });

  it('moves an area up', () => {
    expect(reorderPatches(areas, 3, 1)).toEqual([
      { id: 'd', sort_order: 1 },
      { id: 'b', sort_order: 2 },
      { id: 'c', sort_order: 3 },
    ]);
  });

  it('changes nothing when dropped in place', () => {
    expect(reorderPatches(areas, 2, 2)).toEqual([]);
  });

  it('numbers every area the first time a job is reordered', () => {
    const unordered = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    expect(reorderPatches(unordered, 2, 0)).toEqual([
      { id: 'c', sort_order: 0 },
      { id: 'a', sort_order: 1 },
      { id: 'b', sort_order: 2 },
    ]);
  });
});
