import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { logChange } from '../../constants/notifications';
import { getCurrentUser } from '../../constants/userStore';
import { supabase } from '../../supabase';

type Mode = 'counting' | 'electrician';
type FeatureField = 'col_sensor' | 'col_photocell' | 'col_layout' | 'col_hours';

const FEATURE_LABEL: Record<FeatureField, string> = {
  col_sensor: 'Occupancy sensor',
  col_photocell: 'Photocell',
  col_layout: 'Room layout',
  col_hours: 'Hours flag',
};

export function useJobSettings() {
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [date, setDate] = useState('');
  const [mode, setModeState] = useState<Mode>('counting');
  const [features, setFeatures] = useState<Record<FeatureField, boolean>>({
    col_sensor: false, col_photocell: false, col_layout: false, col_hours: false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [savedFlash, setSavedFlash] = useState(false);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // Last saved name/location/date, to tell whether the details have unsaved edits.
  const savedDetails = useRef({ name: '', location: '', date: '' });

  // Show the saved values each time the screen opens (it stays mounted between visits).
  useFocusEffect(
    useCallback(() => {
      loadJob();
    }, [jobId])
  );

  async function loadJob() {
    setLoading(true);
    setError('');
    const { data } = await supabase.from('jobs').select('*').eq('id', jobId).single();
    if (data) {
      setName(data.name || '');
      setLocation(data.location || '');
      setDate(data.date || '');
      savedDetails.current = { name: data.name || '', location: data.location || '', date: data.date || '' };
      setModeState(data.mode === 'electrician' ? 'electrician' : 'counting');
      setFeatures({
        col_sensor: !!data.col_sensor,
        col_photocell: !!data.col_photocell,
        col_layout: !!data.col_layout,
        col_hours: !!data.col_hours,
      });
    }
    setLoading(false);
  }

  function flashSaved() {
    setSavedFlash(true);
    clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setSavedFlash(false), 1500);
  }

  async function log(description: string) {
    try {
      const user = await getCurrentUser();
      await logChange(null, jobId, user?.id, user?.name, 'job_settings', description);
    } catch (e) { console.log('Log error:', e); }
  }

  // Feature switches and mode save the moment they change, like switches elsewhere on the phone.
  async function setFeature(field: FeatureField, value: boolean) {
    setError('');
    setFeatures(prev => ({ ...prev, [field]: value }));
    const { error: err } = await supabase.from('jobs').update({ [field]: value }).eq('id', jobId);
    if (err) {
      setFeatures(prev => ({ ...prev, [field]: !value }));
      return setError('Could not save that change. Check your connection and try again.');
    }
    flashSaved();
    log(`${FEATURE_LABEL[field]} turned ${value ? 'on' : 'off'} for ${savedDetails.current.name}`);
  }

  async function setMode(value: Mode) {
    if (value === mode) return;
    const previous = mode;
    setError('');
    setModeState(value);
    const { error: err } = await supabase.from('jobs').update({ mode: value }).eq('id', jobId);
    if (err) {
      setModeState(previous);
      return setError('Could not save that change. Check your connection and try again.');
    }
    flashSaved();
    log(`Mode changed to ${value} for ${savedDetails.current.name}`);
  }

  const isReady = !!(name.trim() && location.trim() && date);
  const detailsDirty =
    name.trim() !== savedDetails.current.name ||
    location.trim() !== savedDetails.current.location ||
    date !== savedDetails.current.date;
  const backHref = `/area-list?jobId=${jobId}`;

  // Saves name/location/date. Returns true on success.
  async function saveDetails() {
    if (!isReady) return false;
    setSaving(true);
    setError('');
    const { error: err } = await supabase
      .from('jobs')
      .update({ name: name.trim(), location: location.trim(), date })
      .eq('id', jobId);
    setSaving(false);
    if (err) {
      setError('Failed to save job details. Please try again.');
      return false;
    }
    savedDetails.current = { name: name.trim(), location: location.trim(), date };
    log(`Job details updated for ${name.trim()}`);
    return true;
  }

  async function saveAndGoBack() {
    if (await saveDetails()) router.push(backHref as any);
  }

  function goBack() {
    router.push(backHref as any);
  }

  const columns = (Object.keys(FEATURE_LABEL) as FeatureField[]).map(field => ({
    field,
    label: field === 'col_layout' ? 'Room layout / exhibit' : field === 'col_hours' ? 'Hours-based flag' : FEATURE_LABEL[field],
    sub: {
      col_sensor: 'Sensors per light row and per area',
      col_photocell: 'Photocells per light row and per area',
      col_layout: 'Ceiling diagram per area',
      col_hours: 'Color-code limited-hour lights',
    }[field],
    val: features[field],
    set: (v: boolean) => setFeature(field, v),
  }));

  return {
    loading, name, setName, location, setLocation, date, setDate, mode, setMode,
    columns, saving, error, isReady, detailsDirty, savedFlash,
    saveDetails, saveAndGoBack, goBack,
  };
}
