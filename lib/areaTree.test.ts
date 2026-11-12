import { areaTree, inTreeOrder, insertAfter } from './areaTree';

const area = (id: string, sort_order: number | null, parent_area_id: string | null = null) =>
  ({ id, name: id, sort_order, parent_area_id, created_at: `2026-01-01T00:00:0${id.length}Z` });

describe('areaTree', () => {
  it('lists top-level areas in order, each with its rooms in order', () => {
    const tree = areaTree([
      area('suite', 1), area('gym', 0),
      area('officeB', 1, 'suite'), area('officeA', 0, 'suite'),
    ]);
    expect(tree.map(g => [g.area.id, g.rooms.map(r => r.id)])).toEqual([
      ['gym', []],
      ['suite', ['officeA', 'officeB']],
    ]);
  });

  it('shows a room at the top level when its area is missing', () => {
    expect(areaTree([area('orphan', 0, 'gone')]).map(g => g.area.id)).toEqual(['orphan']);
  });

  it('keeps it to one level: a room inside a room shows at the top level', () => {
    const tree = areaTree([area('suite', 0), area('room', 0, 'suite'), area('closet', 1, 'room')]);
    const placed = tree.flatMap(g => [g.area.id, ...g.rooms.map(r => r.id)]);
    expect(placed.sort()).toEqual(['closet', 'room', 'suite']);
  });
});

describe('inTreeOrder', () => {
  it('puts rooms right after their area with "Area › Room" names', () => {
    const list = inTreeOrder([area('suite', 0), area('gym', 1), area('office', 0, 'suite')]);
    expect(list.map(a => a.displayName)).toEqual(['suite', 'suite › office', 'gym']);
    expect(list.map(a => a.isRoom)).toEqual([false, true, false]);
  });
});

describe('insertAfter', () => {
  it('places the new area right after the original and moves the ones after it down', () => {
    const group = [area('a', 0), area('b', 1), area('c', 2)];
    expect(insertAfter(group, 'a', 'new')).toEqual({
      sortOrder: 1,
      patches: [{ id: 'b', sort_order: 2 }, { id: 'c', sort_order: 3 }],
    });
  });

  it('puts it at the end when the original is not in the group', () => {
    const group = [area('a', 0), area('b', 1)];
    expect(insertAfter(group, '', 'new')).toEqual({ sortOrder: 2, patches: [] });
  });

  it('works in an empty group', () => {
    expect(insertAfter([], '', 'new')).toEqual({ sortOrder: 0, patches: [] });
  });
});
