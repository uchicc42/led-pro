// Areas follow the order set with "Reorder" on the area list (sort_order). Areas without a
// position yet (new ones, or ones from before ordering existed) come last, oldest first.
export function byAreaOrder(a: any, b: any) {
  const pa = a.sort_order ?? Infinity;
  const pb = b.sort_order ?? Infinity;
  if (pa !== pb) return pa < pb ? -1 : 1;
  return String(a.created_at).localeCompare(String(b.created_at));
}

/** New positions after moving one area in an ordered list; only the areas whose position changed. */
export function reorderPatches(areas: any[], from: number, to: number): { id: string; sort_order: number }[] {
  const next = [...areas];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next
    .map((a, i) => ({ id: a.id as string, sort_order: i, before: a.sort_order }))
    .filter(p => p.before !== p.sort_order)
    .map(({ id, sort_order }) => ({ id, sort_order }));
}
