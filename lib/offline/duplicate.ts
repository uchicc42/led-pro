import { insertAfter } from '../areaTree';
import { newId, patchRow, saveRow } from './data';
import { getSnapshot } from './store';

// Copying an area: "this room has the same lights as the one I just counted".
// Copies the light rows (old/new type, quantity, mount, flags) and the sensors, photocells
// and dimmers. Photos, notes, completion, rooms inside it and electrician progress start fresh.

type Options = {
  sourceId: string;
  name: string;
  /** The area to put the copy in (as a room), or null for the top level. */
  parentId: string | null;
  enteredBy?: string | null;
};

// Fields that belong to the original only: identity, device-only fields and install progress.
function copyable(row: Record<string, any>) {
  return Object.fromEntries(Object.entries(row).filter(([k]) =>
    k !== 'id' && k !== 'area_id' && k !== 'light_row_id' && k !== 'created_at' && !k.startsWith('_') && !k.startsWith('install')));
}

/** Creates the copy on the device (queued for upload) and returns its id. */
export function duplicateArea({ sourceId, name, parentId, enteredBy = null }: Options): string | null {
  const s = getSnapshot();
  const source = s.get('areas', sourceId);
  if (!source) return null;

  const id = newId();
  const now = new Date().toISOString();

  // Same group as the original: right after it. Another group: at the end of that group.
  const group = s.where('areas', a => a.job_id === source.job_id && (a.parent_area_id ?? null) === parentId);
  const sameGroup = (source.parent_area_id ?? null) === parentId;
  const { sortOrder, patches } = sameGroup
    ? insertAfter(group, sourceId, id)
    : insertAfter(group, '', id);

  saveRow('areas', {
    id,
    job_id: source.job_id,
    name,
    parent_area_id: parentId,
    entered_by: enteredBy,
    is_complete: false,
    sort_order: sortOrder,
    created_at: now,
  });
  patches.forEach(p => patchRow('areas', p.id, { sort_order: p.sort_order }));

  const rowIds = new Map<string, string>();
  s.where('light_rows', r => r.area_id === sourceId)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .forEach(r => {
      const rowId = newId();
      rowIds.set(r.id, rowId);
      saveRow('light_rows', { ...copyable(r), id: rowId, area_id: id, created_at: now });
    });

  s.where('area_controls', c => c.area_id === sourceId).forEach(c => {
    // A control on a light row follows that row's copy; area-wide controls stay area-wide.
    const lightRowId = c.light_row_id ? rowIds.get(c.light_row_id) : null;
    if (c.light_row_id && !lightRowId) return;
    saveRow('area_controls', { ...copyable(c), id: newId(), area_id: id, light_row_id: lightRowId ?? null });
  });

  return id;
}
