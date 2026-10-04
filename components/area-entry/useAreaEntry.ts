import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ensureLightTypeColors } from '../../constants/lightTypeColors';
import { logChange } from '../../constants/notifications';
import { getCurrentUser } from '../../constants/userStore';
import { supabase } from '../../supabase';

export const LUMEN_OPTIONS = ['L', 'M', 'H', '3500K', '4000K', '5000K'];

// Occupancy sensors and photocells ("controls") are stored in area_controls.
// A control with a light_row_id belongs to that row; one without belongs to the whole area.
export type ControlKind = 'occupancy' | 'photocell';
export const CONTROL_KINDS: ControlKind[] = ['occupancy', 'photocell'];
export const CONTROL_LABEL: Record<ControlKind, string> = { occupancy: 'Sensor', photocell: 'Photocell' };

export type RowControl = { id: string | null; qty: string; type: string };

export type LightRow = {
  id: string | null;
  oldQty: string;
  oldType: string;
  newQty: string;
  newType: string;
  oldMount: string;
  newMount: string;
  lumenSetting: string;
  hoursOn: boolean;
  hoursStart: string;
  hoursEnd: string;
  removedOnly: boolean;
  newAddition: boolean;
  controls: Record<ControlKind, RowControl>;
};

export type AreaControl = { key: string; id: string | null; kind: ControlKind; qty: string; type: string };

export type RowField = Exclude<keyof LightRow, 'controls'>;

// What the type picker is choosing for; screens resolve it to a title, options and a setter.
export type PickerTarget =
  | { scope: 'row'; rowIndex: number; field: 'oldType' | 'newType' }
  | { scope: 'mount'; rowIndex: number; side: 'old' | 'new' }
  | { scope: 'rowControl'; rowIndex: number; kind: ControlKind }
  | { scope: 'areaControl'; key: string; kind: ControlKind };

type Area = { id: string; name: string; notes: string | null; is_complete: boolean };
type Job = { id: string; name: string; col_hours?: boolean; col_sensor?: boolean; col_photocell?: boolean; col_layout?: boolean };

const emptyControl = (): RowControl => ({ id: null, qty: '', type: '' });

const emptyRow = (): LightRow => ({
  id: null,
  oldQty: '', oldType: '',
  newQty: '', newType: '',
  oldMount: '', newMount: '',
  lumenSetting: '',
  hoursOn: false, hoursStart: '06:00', hoursEnd: '18:00',
  removedOnly: false,
  newAddition: false,
  controls: { occupancy: emptyControl(), photocell: emptyControl() },
});

export function useAreaEntry() {
  const { areaId, jobId } = useLocalSearchParams<{ areaId: string; jobId: string }>();
  const [area, setArea] = useState<Area | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [rows, setRows] = useState<LightRow[]>([emptyRow()]);
  const [areaControls, setAreaControls] = useState<AreaControl[]>([]);
  const [notes, setNotes] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const [lightTypes, setLightTypes] = useState<{ current: string[]; new: string[] }>({ current: [], new: [] });
  // Per light type name: required mount options and scope colour.
  const [typeInfo, setTypeInfo] = useState<Record<string, { mounts: string[]; color: string | null }>>({});
  const [controlTypes, setControlTypes] = useState<Record<ControlKind, string[]>>({ occupancy: [], photocell: [] });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [loading, setLoading] = useState(true);
  const nextKey = useRef(0);
  const newKey = () => `c${nextKey.current++}`;

  useEffect(() => {
    setRows([emptyRow()]);
    setAreaControls([]);
    setNotes('');
    setIsComplete(false);
    setLoading(true);
    loadAll();
  }, [areaId]);

  async function loadAll() {
    await Promise.all([loadArea(), loadJob(), loadLightTypes(), loadControlTypes(), loadExistingRows()]);
    setLoading(false);
  }

  async function loadArea() {
    const { data } = await supabase.from('areas').select('*').eq('id', areaId).single();
    if (data) { setArea(data); setNotes(data.notes || ''); setIsComplete(data.is_complete); }
  }

  async function loadJob() {
    const { data } = await supabase.from('jobs').select('*').eq('id', jobId).single();
    if (data) setJob(data);
  }

  async function loadLightTypes() {
    const { data: raw } = await supabase.from('light_types').select('*').order('sort_order');
    if (raw) {
      const data = await ensureLightTypeColors(raw);
      const info: Record<string, { mounts: string[]; color: string | null }> = {};
      data.forEach((t: any) => { info[t.name] = { mounts: t.mount_options || [], color: t.color }; });
      setTypeInfo(info);
      setLightTypes({
        current: data.filter((t: any) => t.category === 'current').map((t: any) => t.name),
        new: data.filter((t: any) => t.category === 'new').map((t: any) => t.name),
      });
    }
  }

  async function loadControlTypes() {
    const { data } = await supabase.from('control_types').select('*').order('sort_order');
    if (data) {
      setControlTypes({
        occupancy: data.filter((t: any) => t.kind === 'occupancy').map((t: any) => t.name),
        photocell: data.filter((t: any) => t.kind === 'photocell').map((t: any) => t.name),
      });
    }
  }

  async function loadExistingRows() {
    const [{ data }, { data: controls }] = await Promise.all([
      supabase.from('light_rows').select('*').eq('area_id', areaId).order('sort_order'),
      supabase.from('area_controls').select('*').eq('area_id', areaId).order('sort_order'),
    ]);
    const allControls: any[] = controls || [];
    const toRowControl = (c: any): RowControl =>
      c ? { id: c.id, qty: String(c.quantity || ''), type: c.control_type || '' } : emptyControl();

    if (data && data.length > 0) {
      const mapped: LightRow[] = data.map((r: any) => ({
        id: r.id,
        oldQty: String(r.quantity || ''),
        oldType: r.light_type_id || '',
        newQty: String(r.new_quantity || ''),
        newType: r.new_light_type || '',
        oldMount: r.old_mount || '',
        newMount: r.new_mount || '',
        lumenSetting: r.lumen_setting || '',
        hoursOn: r.hours_flagged || false,
        hoursStart: r.hours_start || '06:00',
        hoursEnd: r.hours_end || '18:00',
        removedOnly: r.removed_only || false,
        newAddition: r.new_addition || false,
        controls: {
          occupancy: toRowControl(allControls.find(c => c.light_row_id === r.id && c.kind === 'occupancy')),
          photocell: toRowControl(allControls.find(c => c.light_row_id === r.id && c.kind === 'photocell')),
        },
      }));
      setRows(mapped);
    }

    setAreaControls(allControls
      .filter(c => !c.light_row_id)
      .map(c => ({ key: newKey(), id: c.id, kind: c.kind, qty: String(c.quantity || ''), type: c.control_type || '' })));
  }

  // Controls are only shown and saved for the kinds switched on in Job settings.
  // Switching a kind off hides it without deleting anything already entered.
  const enabledKinds = CONTROL_KINDS.filter(k => (k === 'occupancy' ? job?.col_sensor : job?.col_photocell));

  const mountOptionsFor = (typeName: string) => typeInfo[typeName]?.mounts ?? [];
  const colorFor = (typeName: string) => typeInfo[typeName]?.color ?? null;

  // A mount is required when the side is in use and its light type has mount options.
  function missingMount(r: LightRow): string | null {
    if (!r.newAddition && r.oldType && mountOptionsFor(r.oldType).length > 0 && !r.oldMount) return r.oldType;
    if (!r.removedOnly && r.newType && mountOptionsFor(r.newType).length > 0 && !r.newMount) return r.newType;
    return null;
  }

  async function save(markComplete = false) {
    const missingIndex = rows.findIndex(r => missingMount(r));
    if (missingIndex >= 0) {
      setSaveError(`Row ${missingIndex + 1}: choose a mount type for ${missingMount(rows[missingIndex])}.`);
      return;
    }

    setSaving(true);
    setSaveError('');
    const failed = (message: string) => {
      setSaveError(message);
      setSaving(false);
    };

    const { error: areaError } = await supabase.from('areas').update({
      notes,
      is_complete: markComplete ? true : isComplete,
    }).eq('id', areaId);
    if (areaError) return failed('Could not save area. Check your connection and try again.');

    const dbRows = rows.map((r, i) => ({
      area_id: areaId,
      section: 'current',
      quantity: parseInt(r.oldQty) || 0,
      light_type_id: r.oldType || null,
      new_quantity: parseInt(r.newQty) || 0,
      new_light_type: r.newType || null,
      old_mount: r.oldType && mountOptionsFor(r.oldType).length > 0 ? r.oldMount || null : null,
      new_mount: r.newType && mountOptionsFor(r.newType).length > 0 ? r.newMount || null : null,
      lumen_setting: r.lumenSetting || null,
      hours_flagged: r.hoursOn,
      hours_start: r.hoursOn ? r.hoursStart : null,
      hours_end: r.hoursOn ? r.hoursEnd : null,
      removed_only: r.removedOnly,
      new_addition: r.newAddition,
      sort_order: i,
    }));

    // Update existing rows in place and insert new ones; only then delete rows the user removed.
    // Nothing is wiped up front, so a failed save can't lose data.
    const existing = dbRows.flatMap((r, i) => rows[i].id ? [{ ...r, id: rows[i].id }] : []);
    const added = dbRows.filter((_, i) => !rows[i].id);

    if (existing.length > 0) {
      const { error } = await supabase.from('light_rows').upsert(existing);
      if (error) return failed('Could not save light rows. Check your connection and try again.');
    }

    let insertedIds: (string | undefined)[] = [];
    if (added.length > 0) {
      const { data, error } = await supabase.from('light_rows').insert(added).select('id, sort_order');
      if (error || !data) return failed('Could not save new light rows. Check your connection and try again.');
      // Map by sort_order so ids line up with the rows they belong to.
      const idBySort = new Map<number, string>(data.map((d: any) => [d.sort_order, d.id]));
      insertedIds = dbRows.flatMap((r, i) => rows[i].id ? [] : [idBySort.get(r.sort_order)]);
    }

    let savedRows = (() => {
      let next = 0;
      return rows.map(r => r.id ? r : { ...r, id: insertedIds[next++] ?? null });
    })();

    const keepIds = savedRows.map(r => r.id).filter(Boolean);
    const { error: deleteError } = await supabase
      .from('light_rows')
      .delete()
      .eq('area_id', areaId)
      .not('id', 'in', `(${keepIds.join(',')})`);
    if (deleteError) {
      setRows(savedRows);
      return failed('Saved, but removed rows could not be deleted. Try saving again.');
    }

    const controlsResult = await saveControls(savedRows);
    if (!controlsResult) {
      setRows(savedRows);
      return failed('Light rows saved, but sensors/photocells could not be saved. Try saving again.');
    }
    savedRows = controlsResult.rows;
    setRows(savedRows);
    setAreaControls(controlsResult.areaControls);

    // Log the change
    try {
      const user = await getCurrentUser();
      await logChange(
        areaId, jobId, user?.id, user?.name,
        'area_updated',
        `${rows.length} light row(s) saved for ${area?.name}`
      );
    } catch (e) { console.log('Log error:', e); }

    setSaving(false);
    if (markComplete) setIsComplete(true);
  }

  // Saves row and area controls for the enabled kinds with the same update/insert/delete-removed
  // approach as light rows. Returns state with database ids filled in, or null on failure.
  async function saveControls(savedRows: LightRow[]) {
    if (enabledKinds.length === 0) return { rows: savedRows, areaControls };

    type Desired = { key: string; id: string | null; record: Record<string, any> };
    const desired: Desired[] = [];

    savedRows.forEach((r, i) => {
      if (!r.id) return;
      enabledKinds.forEach(kind => {
        const c = r.controls[kind];
        const quantity = parseInt(c.qty) || 0;
        if (quantity <= 0) return;
        desired.push({
          key: `row:${r.id}:${kind}`,
          id: c.id,
          record: { area_id: areaId, light_row_id: r.id, kind, control_type: c.type || null, quantity, sort_order: i },
        });
      });
    });

    areaControls.forEach((c, j) => {
      if (!enabledKinds.includes(c.kind)) return;
      const quantity = parseInt(c.qty) || 0;
      if (quantity <= 0) return;
      desired.push({
        key: `area:${j}`,
        id: c.id,
        record: { area_id: areaId, light_row_id: null, kind: c.kind, control_type: c.type || null, quantity, sort_order: j },
      });
    });

    const toUpdate = desired.filter(d => d.id).map(d => ({ ...d.record, id: d.id }));
    const toInsert = desired.filter(d => !d.id);

    if (toUpdate.length > 0) {
      const { error } = await supabase.from('area_controls').upsert(toUpdate);
      if (error) return null;
    }

    const idByKey = new Map<string, string>(desired.filter(d => d.id).map(d => [d.key, d.id as string]));
    if (toInsert.length > 0) {
      const { data, error } = await supabase
        .from('area_controls')
        .insert(toInsert.map(d => d.record))
        .select('id, light_row_id, kind, sort_order');
      if (error || !data) return null;
      data.forEach((d: any) => {
        idByKey.set(d.light_row_id ? `row:${d.light_row_id}:${d.kind}` : `area:${d.sort_order}`, d.id);
      });
    }

    const keep = [...idByKey.values()];
    let del = supabase.from('area_controls').delete().eq('area_id', areaId).in('kind', enabledKinds);
    if (keep.length > 0) del = del.not('id', 'in', `(${keep.join(',')})`);
    const { error: deleteError } = await del;
    if (deleteError) return null;

    const rowsWithIds = savedRows.map(r => {
      const controls = { ...r.controls };
      enabledKinds.forEach(kind => {
        controls[kind] = { ...controls[kind], id: idByKey.get(`row:${r.id}:${kind}`) ?? null };
      });
      return { ...r, controls };
    });
    const areaControlsWithIds = areaControls.map((c, j) =>
      enabledKinds.includes(c.kind) ? { ...c, id: idByKey.get(`area:${j}`) ?? null } : c);

    return { rows: rowsWithIds, areaControls: areaControlsWithIds };
  }

  function addRow() {
    setRows([...rows, emptyRow()]);
  }

  function removeRow(index: number) {
    if (rows.length <= 1) return;
    setRows(rows.filter((_, i) => i !== index));
  }

  function updateRow<K extends RowField>(index: number, field: K, value: LightRow[K]) {
    const updated = [...rows];
    updated[index] = { ...updated[index], [field]: value };
    // Changing a light type clears a mount that isn't an option for the new type.
    if (field === 'oldType' && !mountOptionsFor(String(value)).includes(updated[index].oldMount)) updated[index].oldMount = '';
    if (field === 'newType' && !mountOptionsFor(String(value)).includes(updated[index].newMount)) updated[index].newMount = '';
    if (field === 'removedOnly' && value) updated[index].newAddition = false;
    if (field === 'newAddition' && value) updated[index].removedOnly = false;
    setRows(updated);
  }

  function updateRowControl(index: number, kind: ControlKind, field: 'qty' | 'type', value: string) {
    const updated = [...rows];
    const row = updated[index];
    updated[index] = { ...row, controls: { ...row.controls, [kind]: { ...row.controls[kind], [field]: value } } };
    setRows(updated);
  }

  function addAreaControl(kind: ControlKind) {
    setAreaControls([...areaControls, { key: newKey(), id: null, kind, qty: '1', type: '' }]);
  }

  function updateAreaControl(key: string, field: 'qty' | 'type', value: string) {
    setAreaControls(areaControls.map(c => (c.key === key ? { ...c, [field]: value } : c)));
  }

  function removeAreaControl(key: string) {
    setAreaControls(areaControls.filter(c => c.key !== key));
  }

  // Resolves a picker target into what the picker UI needs, shared by both platforms.
  function describePicker(target: PickerTarget) {
    if (target.scope === 'row') {
      return {
        title: target.field === 'oldType' ? 'Current light type' : 'New light type',
        options: target.field === 'oldType' ? lightTypes.current : lightTypes.new,
        select: (item: string) => updateRow(target.rowIndex, target.field, item),
      };
    }
    if (target.scope === 'mount') {
      const row = rows[target.rowIndex];
      const typeName = target.side === 'old' ? row.oldType : row.newType;
      return {
        title: `Mount type — ${typeName}`,
        options: mountOptionsFor(typeName),
        select: (item: string) => updateRow(target.rowIndex, target.side === 'old' ? 'oldMount' : 'newMount', item),
      };
    }
    if (target.scope === 'rowControl') {
      return {
        title: `${CONTROL_LABEL[target.kind]} type`,
        options: controlTypes[target.kind],
        select: (item: string) => updateRowControl(target.rowIndex, target.kind, 'type', item),
      };
    }
    return {
      title: `${CONTROL_LABEL[target.kind]} type`,
      options: controlTypes[target.kind],
      select: (item: string) => updateAreaControl(target.key, 'type', item),
    };
  }

  const visibleAreaControls = areaControls.filter(c => enabledKinds.includes(c.kind));
  const backToAreaList = `/area-list?jobId=${jobId}`;
  const layoutCanvasHref = `/layout-canvas?areaId=${areaId}&jobId=${jobId}&areaName=${area?.name}`;

  return {
    areaId, jobId, area, job, rows, notes, setNotes, isComplete, lightTypes, saving, saveError, loading,
    save, addRow, removeRow, updateRow, updateRowControl,
    enabledKinds, visibleAreaControls, addAreaControl, updateAreaControl, removeAreaControl,
    describePicker, backToAreaList, layoutCanvasHref, mountOptionsFor, colorFor,
  };
}

export type AreaEntryState = ReturnType<typeof useAreaEntry>;
