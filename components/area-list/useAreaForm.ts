import { useState } from 'react';
import { getCurrentUser } from '../../constants/userStore';
import { areaTree, insertAfter } from '../../lib/areaTree';
import { newId, patchRow, saveRow } from '../../lib/offline/data';
import { duplicateArea } from '../../lib/offline/duplicate';
import { getSnapshot, useStore } from '../../lib/offline/store';

// The "New area", "Duplicate" and "Move" box, shared by the area list and the light entry screen.
// Each asks for a name and where the area goes: the top level, or inside another area as a room.

export type AreaForm = {
  mode: 'add' | 'duplicate' | 'move';
  sourceId: string | null;
  name: string;
  parentId: string | null;
};

export function useAreaForm(jobId: string) {
  const store = useStore();
  const [form, setForm] = useState<AreaForm | null>(null);

  // Areas a room can go in: the top-level areas of this job. When moving, not the area itself,
  // and an area that has rooms can only stay at the top level (rooms are one level deep).
  const tree = areaTree(store.where('areas', a => a.job_id === jobId));
  const movingGroup = form?.mode === 'move' ? tree.find(g => g.area.id === form.sourceId) : undefined;
  const parentOptions = movingGroup && movingGroup.rooms.length > 0
    ? []
    : tree
      .filter(g => !(form?.mode === 'move' && g.area.id === form.sourceId))
      .map(g => ({ id: g.area.id as string, name: g.area.name as string }));

  function openAddArea(parentId: string | null = null) {
    setForm({ mode: 'add', sourceId: null, name: '', parentId });
  }

  function openDuplicate(area: { id: string; name: string; parent_area_id?: string | null }) {
    setForm({ mode: 'duplicate', sourceId: area.id, name: `${area.name} (copy)`, parentId: area.parent_area_id ?? null });
  }

  function openMove(area: { id: string; name: string; parent_area_id?: string | null }) {
    setForm({ mode: 'move', sourceId: area.id, name: area.name, parentId: area.parent_area_id ?? null });
  }

  const setFormName = (name: string) => form && setForm({ ...form, name });
  const setFormParent = (parentId: string | null) => form && setForm({ ...form, parentId });
  const closeAreaForm = () => setForm(null);

  /** Creates the area or the copy; returns its id and the area it was put in. */
  async function submitAreaForm(): Promise<{ id: string; parentId: string | null } | null> {
    if (!form || !form.name.trim()) return null;
    const user = await getCurrentUser();
    const name = form.name.trim();
    let id: string | null;

    if (form.mode === 'move' && form.sourceId) {
      id = form.sourceId;
      const current = getSnapshot().get('areas', id);
      const patch: Record<string, any> = {};
      if (current && current.name !== name) patch.name = name;
      if (current && (current.parent_area_id ?? null) !== form.parentId) {
        // Goes to the end of its new group.
        const group = form.parentId
          ? getSnapshot().where('areas', a => a.parent_area_id === form.parentId)
          : tree.map(g => g.area).filter(a => a.id !== id);
        const placed = insertAfter(group, '', id);
        patch.parent_area_id = form.parentId;
        patch.sort_order = placed.sortOrder;
        placed.patches.forEach(p => patchRow('areas', p.id, { sort_order: p.sort_order }));
      }
      if (Object.keys(patch).length > 0) patchRow('areas', id, patch);
    } else if (form.mode === 'duplicate' && form.sourceId) {
      id = duplicateArea({ sourceId: form.sourceId, name, parentId: form.parentId, enteredBy: user?.id ?? null });
    } else {
      id = newId();
      // New rooms go at the end of their area; new top-level areas keep the old behaviour (last).
      const sortOrder = form.parentId
        ? insertAfter(getSnapshot().where('areas', a => a.parent_area_id === form.parentId), '', id).sortOrder
        : null;
      saveRow('areas', {
        id,
        job_id: jobId,
        name,
        parent_area_id: form.parentId,
        entered_by: user?.id ?? null,
        is_complete: false,
        ...(sortOrder !== null ? { sort_order: sortOrder } : {}),
        created_at: new Date().toISOString(),
      });
    }

    const parentId = form.parentId;
    setForm(null);
    return id ? { id, parentId } : null;
  }

  return { areaForm: form, parentOptions, openAddArea, openDuplicate, openMove, setFormName, setFormParent, closeAreaForm, submitAreaForm };
}

export type AreaFormState = ReturnType<typeof useAreaForm>;
