import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { getCurrentUser } from '../../constants/userStore';
import { useOnline } from '../../lib/offline/connectivity';
import { deleteLightRowCascade } from '../../lib/offline/cascade';
import { deleteRow, newId, patchRow, queueCall, saveRow } from '../../lib/offline/data';
import { Row, StoreSnapshot, getSnapshot, useStore } from '../../lib/offline/store';
import { trackJob } from '../../lib/offline/sync';

export const LUMEN_OPTIONS = ['L', 'M', 'H', '3500K', '4000K', '5000K'];

// Occupancy sensors and photocells ("controls") are stored in area_controls.
// A control with a light_row_id belongs to that row; one without belongs to the whole area.
export type ControlKind = 'occupancy' | 'photocell';
export const CONTROL_KINDS: ControlKind[] = ['occupancy', 'photocell'];
export const CONTROL_LABEL: Record<ControlKind, string> = { occupancy: 'Sensor', photocell: 'Photocell' };

export type RowControl = { id: string | null; qty: string; type: string };

export type LightRow = {
  id: string; // created on the device, so new rows have an id before they upload
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

export type RowField = Exclude<keyof LightRow, 'controls' | 'id'>;

// What the type picker is choosing for; screens resolve it to a title, options and a setter.
export type PickerTarget =
  | { scope: 'row'; rowIndex: number; field: 'oldType' | 'newType' }
  | { scope: 'mount'; rowIndex: number; side: 'old' | 'new' }
  | { scope: 'rowControl'; rowIndex: number; kind: ControlKind }
  | { scope: 'areaControl'; key: string; kind: ControlKind };

const emptyControl = (): RowControl => ({ id: null, qty: '', type: '' });

const emptyRow = (): LightRow => ({
  id: newId(),
  oldQty: '', oldType: '',
  newQty: '', newType: '',
  oldMount: '', newMount: '',
  lumenSetting: '',
  hoursOn: false, hoursStart: '06:00', hoursEnd: '18:00',
  removedOnly: false,
  newAddition: false,
  controls: { occupancy: emptyControl(), photocell: emptyControl() },
});

const bySort = (a: Row, b: Row) => (a.sort_order ?? 0) - (b.sort_order ?? 0);

// Builds the editable form state from the device copy.
function readArea(store: StoreSnapshot, areaId: string, nextKey: () => string) {
  const controls = store.where('area_controls', c => c.area_id === areaId).sort(bySort);
  const toRowControl = (c: Row | undefined): RowControl =>
    c ? { id: c.id, qty: String(c.quantity || ''), type: c.control_type || '' } : emptyControl();

  const rows: LightRow[] = store.where('light_rows', r => r.area_id === areaId).sort(bySort).map(r => ({
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
      occupancy: toRowControl(controls.find(c => c.light_row_id === r.id && c.kind === 'occupancy')),
      photocell: toRowControl(controls.find(c => c.light_row_id === r.id && c.kind === 'photocell')),
    },
  }));

  const areaControls: AreaControl[] = controls
    .filter(c => !c.light_row_id)
    .map(c => ({ key: nextKey(), id: c.id, kind: c.kind, qty: String(c.quantity || ''), type: c.control_type || '' }));

  return { rows: rows.length > 0 ? rows : [emptyRow()], areaControls };
}

const same = (a: Record<string, any>, b: Record<string, any> | undefined) =>
  !!b && Object.keys(a).every(k => JSON.stringify(a[k] ?? null) === JSON.stringify(b[k] ?? null));

// Reads and writes the device copy, so counting works without signal. Saving is instant and
// the changes upload in the background.
export function useAreaEntry() {
  const { areaId, jobId } = useLocalSearchParams<{ areaId: string; jobId: string }>();
  const store = useStore();
  const online = useOnline();
  const [rows, setRows] = useState<LightRow[]>(() => [emptyRow()]);
  const [areaControls, setAreaControls] = useState<AreaControl[]>([]);
  const [notes, setNotesState] = useState('');
  // While editing, the form isn't replaced by synced changes until it's saved.
  const [dirty, setDirty] = useState(false);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const keyCounter = useRef(0);
  const nextKey = () => `c${keyCounter.current++}`;

  const area = store.get('areas', areaId) ?? null;
  const job = store.get('jobs', jobId) ?? null;

  useFocusEffect(
    useCallback(() => {
      trackJob(jobId);
    }, [jobId])
  );

  // Load the form from the device copy when the area opens, and keep it in step with synced
  // changes until the user starts editing.
  useEffect(() => {
    if (!store.loaded || !areaId) return;
    if (dirty && loadedFor === areaId) return;
    const fromStore = readArea(store, areaId, nextKey);
    setRows(fromStore.rows);
    setAreaControls(fromStore.areaControls);
    setNotesState(store.get('areas', areaId)?.notes || '');
    setSaveError('');
    if (loadedFor !== areaId) { setLoadedFor(areaId); setDirty(false); }
  }, [store.version, areaId, dirty]);

  // Archived types (inactive or deleted in QuickBooks) aren't offered for new entries.
  const lightTypeRows = store.all('light_types').filter(t => !t.archived).sort(bySort);
  const lightTypes = {
    current: lightTypeRows.filter(t => t.category === 'current').map(t => t.name as string),
    new: lightTypeRows.filter(t => t.category === 'new').map(t => t.name as string),
  };
  const typeInfo: Record<string, { mounts: string[]; color: string | null }> = {};
  lightTypeRows.forEach(t => { typeInfo[t.name] = { mounts: t.mount_options || [], color: t.color ?? null }; });
  const controlTypeRows = store.all('control_types').sort(bySort);
  const controlTypes: Record<ControlKind, string[]> = {
    occupancy: controlTypeRows.filter(t => t.kind === 'occupancy').map(t => t.name as string),
    photocell: controlTypeRows.filter(t => t.kind === 'photocell').map(t => t.name as string),
  };

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
    if (!area) return;
    setSaving(true);
    setSaveError('');
    const current = getSnapshot();

    const areaPatch = { notes, is_complete: markComplete ? true : !!area.is_complete };
    if (!same(areaPatch, area)) patchRow('areas', areaId, areaPatch);

    // Only rows that actually changed are saved, so a save never overwrites a teammate's
    // edits to rows this person didn't touch.
    rows.forEach((r, i) => {
      const record = {
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
      };
      const existing = current.get('light_rows', r.id);
      if (!same(record, existing)) {
        saveRow('light_rows', existing ? { ...record, id: r.id } : { ...record, id: r.id, created_at: new Date().toISOString() });
      }
    });

    // Rows removed in the form.
    current.where('light_rows', lr => lr.area_id === areaId && !rows.some(r => r.id === lr.id))
      .forEach(lr => deleteLightRowCascade(lr.id));

    const { rows: rowsWithIds, areaControls: areaControlsWithIds } = saveControls(current);
    setRows(rowsWithIds);
    setAreaControls(areaControlsWithIds);

    const user = await getCurrentUser();
    queueCall('logChange', areaId, jobId, user?.id, user?.name, 'area_updated', `${rows.length} light row(s) saved for ${area.name}`);

    setDirty(false);
    setSaving(false);
  }

  // Saves sensors/photocells for the enabled kinds; returns form state with their ids.
  function saveControls(current: StoreSnapshot) {
    if (enabledKinds.length === 0) return { rows, areaControls };
    const keepIds = new Set<string>();

    const save = (id: string | null, record: Record<string, any>) => {
      const controlId = id ?? newId();
      if (!same(record, current.get('area_controls', controlId))) saveRow('area_controls', { ...record, id: controlId });
      keepIds.add(controlId);
      return controlId;
    };

    const rowsWithIds = rows.map((r, i) => {
      const controls = { ...r.controls };
      enabledKinds.forEach(kind => {
        const c = r.controls[kind];
        const quantity = parseInt(c.qty) || 0;
        controls[kind] = quantity > 0
          ? { ...c, id: save(c.id, { area_id: areaId, light_row_id: r.id, kind, control_type: c.type || null, quantity, sort_order: i }) }
          : { ...c, id: null };
      });
      return { ...r, controls };
    });

    const areaControlsWithIds = areaControls.map((c, j) => {
      if (!enabledKinds.includes(c.kind)) return c;
      const quantity = parseInt(c.qty) || 0;
      if (quantity <= 0) return { ...c, id: null };
      return { ...c, id: save(c.id, { area_id: areaId, light_row_id: null, kind: c.kind, control_type: c.type || null, quantity, sort_order: j }) };
    });

    current.where('area_controls', c => c.area_id === areaId && enabledKinds.includes(c.kind) && !keepIds.has(c.id))
      .forEach(c => deleteRow('area_controls', c.id));

    return { rows: rowsWithIds, areaControls: areaControlsWithIds };
  }

  function edit<T>(setter: (v: T) => void) {
    return (v: T) => { setter(v); setDirty(true); };
  }
  const setNotes = edit(setNotesState);

  function addRow() {
    setRows([...rows, emptyRow()]);
    setDirty(true);
  }

  function removeRow(index: number) {
    if (rows.length <= 1) return;
    setRows(rows.filter((_, i) => i !== index));
    setDirty(true);
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
    setDirty(true);
  }

  function updateRowControl(index: number, kind: ControlKind, field: 'qty' | 'type', value: string) {
    const updated = [...rows];
    const row = updated[index];
    updated[index] = { ...row, controls: { ...row.controls, [kind]: { ...row.controls[kind], [field]: value } } };
    setRows(updated);
    setDirty(true);
  }

  function addAreaControl(kind: ControlKind) {
    setAreaControls([...areaControls, { key: nextKey(), id: null, kind, qty: '1', type: '' }]);
    setDirty(true);
  }

  function updateAreaControl(key: string, field: 'qty' | 'type', value: string) {
    setAreaControls(areaControls.map(c => (c.key === key ? { ...c, [field]: value } : c)));
    setDirty(true);
  }

  function removeAreaControl(key: string) {
    setAreaControls(areaControls.filter(c => c.key !== key));
    setDirty(true);
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

  const isComplete = !!area?.is_complete;
  const visibleAreaControls = areaControls.filter(c => enabledKinds.includes(c.kind));
  const backToAreaList = `/area-list?jobId=${jobId}`;
  const layoutCanvasHref = `/layout-canvas?areaId=${areaId}&jobId=${jobId}&areaName=${area?.name}`;
  // Still loading: the device copy hasn't been read yet, or the area is downloading.
  const loading = !store.loaded || (!area && online);
  // Opened offline on a phone that has never downloaded this area.
  const notOnDevice = store.loaded && !area && !online;

  return {
    areaId, jobId, area, job, rows, notes, setNotes, isComplete, lightTypes, saving, saveError, loading, notOnDevice,
    save, addRow, removeRow, updateRow, updateRowControl,
    enabledKinds, visibleAreaControls, addAreaControl, updateAreaControl, removeAreaControl,
    describePicker, backToAreaList, layoutCanvasHref, mountOptionsFor, colorFor,
  };
}

export type AreaEntryState = ReturnType<typeof useAreaEntry>;
