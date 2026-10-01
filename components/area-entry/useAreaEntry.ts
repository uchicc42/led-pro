import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { logChange } from '../../constants/notifications';
import { getCurrentUser } from '../../constants/userStore';
import { supabase } from '../../supabase';

export const LUMEN_OPTIONS = ['L', 'M', 'H', '3500K', '4000K', '5000K'];

export type LightRow = {
  id: string | null;
  oldQty: string;
  oldType: string;
  newQty: string;
  newType: string;
  lumenSetting: string;
  hoursOn: boolean;
  hoursStart: string;
  hoursEnd: string;
  removedOnly: boolean;
  newAddition: boolean;
  sensorQty: string;
  sensorType: string;
};

export type RowField = keyof LightRow;
export type TypeField = 'oldType' | 'newType';
export type PickerTarget = { rowIndex: number; field: TypeField };

type Area = { id: string; name: string; notes: string | null; is_complete: boolean };
type Job = { id: string; name: string; col_hours?: boolean; col_sensor?: boolean; col_layout?: boolean };

const emptyRow = (): LightRow => ({
  id: null,
  oldQty: '', oldType: '',
  newQty: '', newType: '',
  lumenSetting: '',
  hoursOn: false, hoursStart: '06:00', hoursEnd: '18:00',
  removedOnly: false,
  newAddition: false,
  sensorQty: '', sensorType: '',
});

export function useAreaEntry() {
  const { areaId, jobId } = useLocalSearchParams<{ areaId: string; jobId: string }>();
  const [area, setArea] = useState<Area | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [rows, setRows] = useState<LightRow[]>([emptyRow()]);
  const [notes, setNotes] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const [lightTypes, setLightTypes] = useState<{ current: string[]; new: string[] }>({ current: [], new: [] });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setRows([emptyRow()]);
    setNotes('');
    setIsComplete(false);
    setLoading(true);
    loadAll();
  }, [areaId]);

  async function loadAll() {
    await Promise.all([loadArea(), loadJob(), loadLightTypes(), loadExistingRows()]);
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
    const { data } = await supabase.from('light_types').select('*').order('sort_order');
    if (data) {
      setLightTypes({
        current: data.filter((t: any) => t.category === 'current').map((t: any) => t.name),
        new: data.filter((t: any) => t.category === 'new').map((t: any) => t.name),
      });
    }
  }

  async function loadExistingRows() {
    const { data } = await supabase
      .from('light_rows')
      .select('*')
      .eq('area_id', areaId)
      .order('sort_order');
    if (data && data.length > 0) {
      const mapped: LightRow[] = data.map((r: any) => ({
        id: r.id,
        oldQty: String(r.quantity || ''),
        oldType: r.light_type_id || '',
        newQty: String(r.new_quantity || ''),
        newType: r.new_light_type || '',
        lumenSetting: r.lumen_setting || '',
        hoursOn: r.hours_flagged || false,
        hoursStart: r.hours_start || '06:00',
        hoursEnd: r.hours_end || '18:00',
        removedOnly: r.removed_only || false,
        newAddition: r.new_addition || false,
        sensorQty: '',
        sensorType: '',
      }));
      setRows(mapped);
    }
  }

  async function save(markComplete = false) {
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

    const savedRows = (() => {
      let next = 0;
      return rows.map(r => r.id ? r : { ...r, id: insertedIds[next++] ?? null });
    })();
    setRows(savedRows);

    const keepIds = savedRows.map(r => r.id).filter(Boolean);
    const { error: deleteError } = await supabase
      .from('light_rows')
      .delete()
      .eq('area_id', areaId)
      .not('id', 'in', `(${keepIds.join(',')})`);
    if (deleteError) return failed('Saved, but removed rows could not be deleted. Try saving again.');

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
    if (field === 'removedOnly' && value) updated[index].newAddition = false;
    if (field === 'newAddition' && value) updated[index].removedOnly = false;
    setRows(updated);
  }

  const backToAreaList = `/area-list?jobId=${jobId}`;
  const layoutCanvasHref = `/layout-canvas?areaId=${areaId}&jobId=${jobId}&areaName=${area?.name}`;

  return {
    area, job, rows, notes, setNotes, isComplete, lightTypes, saving, saveError, loading,
    save, addRow, removeRow, updateRow,
    backToAreaList, layoutCanvasHref,
  };
}

export type AreaEntryState = ReturnType<typeof useAreaEntry>;
