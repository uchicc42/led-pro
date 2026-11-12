import { byAreaOrder, reorderPatches } from './areaOrder';

// Areas can hold rooms ("sub-areas"): an area with parent_area_id set is a room inside that
// area, e.g. Office A inside Suite 220. There is one level only: a room can't hold rooms.
// Rooms are ordered among themselves (sort_order) and always listed right after their area.

export type AreaGroup<T> = { area: T; rooms: T[] };

/** Top-level areas in order, each with its rooms in order. A room whose area is gone shows at the top level. */
export function areaTree<T extends { id: string; parent_area_id?: string | null }>(areas: T[]): AreaGroup<T>[] {
  const byId = new Map(areas.map(a => [a.id, a]));
  const hasParent = (a: T) => !!a.parent_area_id && a.parent_area_id !== a.id && byId.has(a.parent_area_id);
  // A room's area must itself be top level; anything deeper (odd data) shows at the top level.
  const isRoom = (a: T) => hasParent(a) && !hasParent(byId.get(a.parent_area_id!)!);
  const top = areas.filter(a => !isRoom(a)).sort(byAreaOrder);
  return top.map(area => ({
    area,
    rooms: areas.filter(r => isRoom(r) && r.parent_area_id === area.id).sort(byAreaOrder),
  }));
}

/**
 * Every area in list order (each area followed by its rooms), with a display name that
 * includes the area for rooms: "Suite 220 › Office A".
 */
export function inTreeOrder<T extends { id: string; name?: string; parent_area_id?: string | null }>(areas: T[]) {
  return areaTree(areas).flatMap(({ area, rooms }) => [
    { ...area, displayName: area.name ?? '', isRoom: false },
    ...rooms.map(r => ({ ...r, displayName: `${area.name ?? ''} › ${r.name ?? ''}`, isRoom: true })),
  ]);
}

/**
 * Positions for a new area placed right after `afterId` in its group (all areas sharing the
 * same parent). Returns the new area's sort_order and the moves needed for the areas after it.
 */
export function insertAfter<T extends { id: string; sort_order?: number | null; created_at?: string }>(
  group: T[], afterId: string, newId: string,
): { sortOrder: number; patches: { id: string; sort_order: number }[] } {
  const ordered = [...group].sort(byAreaOrder);
  const placeholder = { id: newId, sort_order: null } as unknown as T;
  const list = [...ordered, placeholder];
  const at = ordered.findIndex(a => a.id === afterId);
  const to = at < 0 ? list.length - 1 : at + 1;
  const patches = reorderPatches(list, list.length - 1, to);
  const own = patches.find(p => p.id === newId);
  return {
    sortOrder: own ? own.sort_order : to,
    patches: patches.filter(p => p.id !== newId),
  };
}
