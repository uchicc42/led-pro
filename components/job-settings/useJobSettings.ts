import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { getCurrentUser } from '../../constants/userStore';
import { LAYOUT_CANVAS_ENABLED } from '../../constants/features';
import { useOnline } from '../../lib/offline/connectivity';
import { forgetJob } from '../../lib/offline/cascade';
import { patchRow, queueCall } from '../../lib/offline/data';
import { flushOutbox } from '../../lib/offline/outbox';
import { useStore } from '../../lib/offline/store';
import { trackJob } from '../../lib/offline/sync';
import { supabase } from '../../supabase';
import { PHOTO_BUCKET } from '../area-photos/pickPhotos';

type Mode = 'counting' | 'electrician';
type FeatureField = 'col_sensor' | 'col_photocell' | 'col_dimmer' | 'col_layout' | 'col_hours';

const FEATURE_LABEL: Record<FeatureField, string> = {
  col_sensor: 'Occupancy sensor',
  col_photocell: 'Photocell',
  col_dimmer: 'Dimmer',
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
  const [companyName, setCompanyName] = useState('');
  const [installerNotes, setInstallerNotes] = useState('');
  const [location, setLocation] = useState('');
  const [date, setDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [savedCount, setSavedCount] = useState(0);
  const savedFlash = savedCount > 0;
  const [detailsFor, setDetailsFor] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    getCurrentUser().then(user => setRole(user?.role ?? null));
  }, []);
  // The server checks this too; here it only decides whether to show the button.
  const canDelete = role === 'owner' || role === 'partner';
  const isComplete = job?.status === 'complete';

  // Switches and mode show the saved values directly.
  const mode: Mode = job?.mode === 'electrician' ? 'electrician' : 'counting';
  const features: Record<FeatureField, boolean> = {
    col_sensor: !!job?.col_sensor,
    col_photocell: !!job?.col_photocell,
    col_dimmer: !!job?.col_dimmer,
    col_layout: !!job?.col_layout,
    col_hours: !!job?.col_hours,
  };
  const savedDetails = {
    name: job?.name || '', companyName: job?.company_name || '', location: job?.location || '',
    date: job?.date || '', installerNotes: job?.installer_notes || '',
  };

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
    setCompanyName(job.company_name || '');
    setInstallerNotes(job.installer_notes || '');
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

  // Jobs also complete on their own when every area is marked done.
  function setJobComplete(complete: boolean) {
    setError('');
    patchRow('jobs', jobId, { status: complete ? 'complete' : 'active' });
    flashSaved();
    log(`${savedDetails.name} marked ${complete ? 'complete' : 'active again'}`);
  }

  /** Permanently deletes the job and everything in it, for everyone. Needs a connection. */
  async function deleteJob() {
    if (!online) {
      setDeleteError('Deleting a job needs a connection. Try again when you have signal.');
      return;
    }
    setDeleting(true);
    setDeleteError('');
    // Upload this phone's waiting changes first, so none are left pointing at the deleted job.
    await flushOutbox();
    const { data: photoPaths, error: rpcError } = await supabase.rpc('delete_job', { p_job_id: jobId });
    if (rpcError) {
      setDeleting(false);
      setDeleteError(rpcError.code === '42501'
        ? 'Only owners and partners can delete jobs.'
        : 'The job could not be deleted. Check your connection and try again.');
      return;
    }
    const paths = (photoPaths ?? []) as string[];
    if (paths.length > 0) {
      supabase.storage.from(PHOTO_BUCKET).remove(paths)
        .then(({ error: e }) => { if (e) console.log('Photo cleanup error:', e); });
    }
    forgetJob(jobId);
    router.replace('/home');
  }

  const isReady = !!(name.trim() && location.trim() && date);
  const detailsDirty =
    name.trim() !== savedDetails.name ||
    companyName.trim() !== savedDetails.companyName ||
    installerNotes.trim() !== savedDetails.installerNotes ||
    location.trim() !== savedDetails.location ||
    date !== savedDetails.date;
  const backHref = `/area-list?jobId=${jobId}`;

  // Saves the job details (name, company, location, date, installer notes). Returns true on success.
  async function saveDetails() {
    if (!isReady) return false;
    setSaving(true);
    setError('');
    patchRow('jobs', jobId, {
      name: name.trim(), company_name: companyName.trim() || null, location: location.trim(), date,
      installer_notes: installerNotes.trim() || null,
    });
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
      col_dimmer: 'Dimmers per light row and per area',
      col_layout: 'Ceiling diagram per area',
      col_hours: 'Color-code limited-hour lights',
    }[field],
    val: features[field],
    set: (v: boolean) => setFeature(field, v),
  }));

  return {
    loading, notOnDevice, name, setName, companyName, setCompanyName, location, setLocation, date, setDate,
    installerNotes, setInstallerNotes, mode, setMode,
    columns, saving, error, isReady, detailsDirty, savedFlash,
    saveDetails, saveAndGoBack, goBack, isComplete, setJobComplete, canDelete, deleting, deleteJob, deleteError,
  };
}
