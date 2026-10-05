import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { getCurrentUser } from '../../constants/userStore';
import { LAYOUT_CANVAS_ENABLED } from '../../constants/features';
import { useOnline } from '../../lib/offline/connectivity';
import { patchRow, queueCall } from '../../lib/offline/data';
import { useStore } from '../../lib/offline/store';
import { trackJob } from '../../lib/offline/sync';

type Mode = 'counting' | 'electrician';
type FeatureField = 'col_sensor' | 'col_photocell' | 'col_layout' | 'col_hours';

const FEATURE_LABEL: Record<FeatureField, string> = {
  col_sensor: 'Occupancy sensor',
  col_photocell: 'Photocell',
  col_layout: 'Room layout',
  col_hours: 'Hours flag',
};

// Reads and writes the device copy, so job settings work without signal and every screen
// sees a change immediately.
export function useJobSettings() {
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  const store = useStore();
  const online = useOnline();
  const job = store.get('jobs', jobId) ?? null;
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [date, setDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [savedCount, setSavedCount] = useState(0);
  const savedFlash = savedCount > 0;
  const [detailsFor, setDetailsFor] = useState<string | null>(null);

  // Switches and mode show the saved values directly.
  const mode: Mode = job?.mode === 'electrician' ? 'electrician' : 'counting';
  const features: Record<FeatureField, boolean> = {
    col_sensor: !!job?.col_sensor,
    col_photocell: !!job?.col_photocell,
    col_layout: !!job?.col_layout,
    col_hours: !!job?.col_hours,
  };
  const savedDetails = { name: job?.name || '', location: job?.location || '', date: job?.date || '' };

  useFocusEffect(
    useCallback(() => {
      trackJob(jobId);
      setDetailsFor(null); // refill the text boxes from the saved job on each visit
      setError('');
    }, [jobId])
  );

  // Fill the text boxes from the saved job once per visit.
  useEffect(() => {
    if (!job || detailsFor === job.id) return;
    setName(job.name || '');
    setLocation(job.location || '');
    setDate(job.date || '');
    setDetailsFor(job.id);
  }, [job, detailsFor]);

  const loading = !store.loaded || (!job && online);
  const notOnDevice = store.loaded && !job && !online;

  // Each save bumps the counter, which restarts the timer that hides "Saved".
  function flashSaved() {
    setSavedCount(n => n + 1);
  }

  useEffect(() => {
    if (savedCount === 0) return;
    const timer = setTimeout(() => setSavedCount(0), 1500);
    return () => clearTimeout(timer);
  }, [savedCount]);

  async function log(description: string) {
    const user = await getCurrentUser();
    queueCall('logChange', null, jobId, user?.id, user?.name, 'job_settings', description);
  }

  // Feature switches and mode save the moment they change, like switches elsewhere on the phone.
  function setFeature(field: FeatureField, value: boolean) {
    setError('');
    patchRow('jobs', jobId, { [field]: value });
    flashSaved();
    log(`${FEATURE_LABEL[field]} turned ${value ? 'on' : 'off'} for ${savedDetails.name}`);
  }

  function setMode(value: Mode) {
    if (value === mode) return;
    setError('');
    patchRow('jobs', jobId, { mode: value });
    flashSaved();
    log(`Mode changed to ${value} for ${savedDetails.name}`);
  }

  const isReady = !!(name.trim() && location.trim() && date);
  const detailsDirty =
    name.trim() !== savedDetails.name ||
    location.trim() !== savedDetails.location ||
    date !== savedDetails.date;
  const backHref = `/area-list?jobId=${jobId}`;

  // Saves name/location/date. Returns true on success.
  async function saveDetails() {
    if (!isReady) return false;
    setSaving(true);
    setError('');
    patchRow('jobs', jobId, { name: name.trim(), location: location.trim(), date });
    setSaving(false);
    log(`Job details updated for ${name.trim()}`);
    return true;
  }

  async function saveAndGoBack() {
    if (await saveDetails()) router.push(backHref as any);
  }

  function goBack() {
    router.push(backHref as any);
  }

  const columns = (Object.keys(FEATURE_LABEL) as FeatureField[])
    .filter(field => field !== 'col_layout' || LAYOUT_CANVAS_ENABLED)
    .map(field => ({
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
    loading, notOnDevice, name, setName, location, setLocation, date, setDate, mode, setMode,
    columns, saving, error, isReady, detailsDirty, savedFlash,
    saveDetails, saveAndGoBack, goBack,
  };
}
