import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { useOnline } from '../../lib/offline/connectivity';
import { newId, patchRow, saveRow } from '../../lib/offline/data';
import { useStore } from '../../lib/offline/store';
import { trackJob } from '../../lib/offline/sync';

type InstallEdit = { status?: string; removed?: boolean; removal_note?: string };

// Reads and writes the device copy, so install tracking works without signal and uploads
// with everything else (the old electrician-only offline queue is no longer used).
export function useElectrician() {
  const { areaId, jobId } = useLocalSearchParams<{ areaId: string; jobId: string }>();
  const store = useStore();
  const isOnlineStatus = useOnline();
  const [notes, setNotesState] = useState('');
  const [needsFollowUp, setNeedsFollowUpState] = useState(false);
  const [detailsFor, setDetailsFor] = useState<string | null>(null);
  // Changes made since the last save, keyed by light row / control id.
  const [installEdits, setInstallEdits] = useState<Record<string, InstallEdit>>({});
  const [controlChanges, setControlChanges] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  const area = store.get('areas', areaId) ?? null;
  const job = store.get('jobs', jobId) ?? null;
  const lightRows = store.where('light_rows', r => r.area_id === areaId)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  const controls = store.where('area_controls', c => c.area_id === areaId)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

  useFocusEffect(
    useCallback(() => {
      trackJob(jobId);
    }, [jobId])
  );

  // Fill notes and the follow-up flag once per area; synced updates don't overwrite typing.
  useEffect(() => {
    if (!area || detailsFor === area.id) return;
    setNotesState(area.install_notes || '');
    setNeedsFollowUpState(!!area.needs_follow_up);
    setInstallEdits({});
    setControlChanges({});
    setDetailsFor(area.id);
  }, [area, detailsFor]);

  useEffect(() => {
    if (!savedFlash) return;
    const timer = setTimeout(() => setSavedFlash(false), 1500);
    return () => clearTimeout(timer);
  }, [savedFlash]);

  // Only kinds switched on in Job settings are shown.
  const enabledKinds = (['occupancy', 'photocell'] as const)
    .filter(k => (k === 'occupancy' ? job?.col_sensor : job?.col_photocell));
  const visibleControls = controls.filter(c => (enabledKinds as readonly string[]).includes(c.kind));
  const getRowControls = (lightRowId: string) => visibleControls.filter(c => c.light_row_id === lightRowId);
  const areaLevelControls = visibleControls.filter(c => !c.light_row_id);

  function getControlStatus(control: any) {
    return controlChanges[control.id] ?? control.install_status ?? 'pending';
  }

  function updateControlStatus(controlId: string, status: string) {
    setControlChanges(prev => ({ ...prev, [controlId]: status }));
  }

  // The saved install record for a light row. Older duplicate records (from an earlier bug)
  // are ignored: the newest one wins.
  function savedInstall(lightRowId: string) {
    return store.where('install_rows', r => r.light_row_id === lightRowId)
      .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))[0];
  }

  function getInstallRow(lightRowId: string) {
    const saved = savedInstall(lightRowId);
    return {
      status: saved?.status ?? 'pending',
      removed: saved?.removed ?? false,
      removal_note: saved?.removal_note ?? '',
      ...installEdits[lightRowId],
    };
  }

  function updateInstallRow(lightRowId: string, field: keyof InstallEdit, value: any) {
    setInstallEdits(prev => ({ ...prev, [lightRowId]: { ...prev[lightRowId], [field]: value } }));
  }

  function setNotes(v: string) { setNotesState(v); }
  function setNeedsFollowUp(v: boolean) { setNeedsFollowUpState(v); }

  function save() {
    if (!area) return;
    setSaving(true);

    if ((area.install_notes || '') !== notes || !!area.needs_follow_up !== needsFollowUp) {
      patchRow('areas', areaId, { install_notes: notes, needs_follow_up: needsFollowUp });
    }

    // One install record per light row: update it if it exists, otherwise create it with an
    // id from the device (the old code created a new record on every save).
    Object.keys(installEdits).forEach(lightRowId => {
      const merged = getInstallRow(lightRowId);
      const fields = { status: merged.status || 'pending', removed: !!merged.removed, removal_note: merged.removal_note || '' };
      const saved = savedInstall(lightRowId);
      if (saved) {
        patchRow('install_rows', saved.id, fields);
      } else {
        saveRow('install_rows', { id: newId(), light_row_id: lightRowId, ...fields, created_at: new Date().toISOString() });
      }
    });

    Object.entries(controlChanges).forEach(([controlId, status]) => {
      patchRow('area_controls', controlId, { install_status: status });
    });

    setInstallEdits({});
    setControlChanges({});
    setSaving(false);
    setSavedFlash(true);
  }

  // Still loading: the device copy hasn't been read yet, or the area is downloading.
  const loading = !store.loaded || (!area && isOnlineStatus);
  // Opened offline on a phone that has never downloaded this area.
  const notOnDevice = store.loaded && !area && !isOnlineStatus;

  return {
    areaId, jobId, area, job, lightRows, notes, setNotes, needsFollowUp, setNeedsFollowUp,
    loading, notOnDevice, saving, savedFlash, isOnlineStatus, getInstallRow, updateInstallRow, save,
    getRowControls, areaLevelControls, getControlStatus, updateControlStatus,
  };
}

export function getStatusLabel(status: string) {
  if (status === 'complete') return 'Complete';
  if (status === 'in_progress') return 'In progress';
  return 'Pending';
}
