import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { getCurrentUser } from '../../constants/userStore';
import { isOnline, useOnline } from '../../lib/offline/connectivity';
import { deleteAreaCascade } from '../../lib/offline/cascade';
import { newId, patchRow, queueCall, saveRow } from '../../lib/offline/data';
import { useStore } from '../../lib/offline/store';
import { pullJob, trackJob } from '../../lib/offline/sync';
import { supabase } from '../../supabase';

type Options = {
  // Native listens on a realtime channel; web polls instead.
  live: 'realtime' | 'poll';
  initialUser?: () => any;
};

// Reads and writes the device copy, so the area list works without signal.
export function useAreaList({ live, initialUser }: Options) {
  const { jobId } = useLocalSearchParams<{ jobId: string; role: string }>();
  const store = useStore();
  const online = useOnline();
  const [addingArea, setAddingArea] = useState(false);
  const [newAreaName, setNewAreaName] = useState('');
  const [filter, setFilter] = useState('all');
  const [currentUser, setCurrentUser_state] = useState<any>(() => initialUser?.() ?? null);
  const [jobNotes, setJobNotes] = useState('');
  const [notesSaved, setNotesSaved] = useState(false);
  const notesTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const notesLoadedFor = useRef<string | null>(null);

  const job = store.get('jobs', jobId) ?? null;

  useEffect(() => {
    getCurrentUser().then(user => { if (user) setCurrentUser_state(user); });
  }, []);

  // Live updates from other people refresh the device copy when there's signal.
  useEffect(() => {
    const refresh = () => { if (isOnline() && jobId) pullJob(jobId); };
    if (live === 'realtime') {
      const subscription = supabase
        .channel('areas-channel')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'areas' }, refresh)
        .subscribe();
      return () => { supabase.removeChannel(subscription); };
    } else {
      const interval = setInterval(refresh, 15000);
      return () => clearInterval(interval);
    }
  }, [jobId]);

  // Keep this job on the device and refresh it whenever the screen is shown.
  useFocusEffect(
    useCallback(() => {
      trackJob(jobId);
    }, [jobId])
  );

  // Fill the notes box once per job; later refreshes don't overwrite what's being typed.
  useEffect(() => {
    if (job && notesLoadedFor.current !== job.id) {
      notesLoadedFor.current = job.id;
      setJobNotes(job.job_notes || '');
    }
  }, [job?.id]);

  function saveJobNotes(text: string) {
    setJobNotes(text);
    patchRow('jobs', jobId, { job_notes: text });
    setNotesSaved(true);
    setTimeout(() => setNotesSaved(false), 2000);
    // Notify after a short pause in typing, not on every keystroke.
    clearTimeout(notesTimeout.current);
    notesTimeout.current = setTimeout(async () => {
      const user = await getCurrentUser();
      queueCall('notifyJobNote', job?.name, user?.id);
    }, 3000);
  }

  const areas = store.where('areas', a => a.job_id === jobId)
    .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)))
    .map((a): any => ({
      ...a,
      // Display helpers used by the screens (never written back).
      entered_by_id: a.entered_by,
      entered_by: store.get('team_members', a.entered_by) ?? null,
      light_rows: store.where('light_rows', r => r.area_id === a.id),
    }));

  async function addArea() {
    if (!newAreaName.trim()) return;
    const user = await getCurrentUser();
    saveRow('areas', {
      id: newId(),
      job_id: jobId,
      name: newAreaName.trim(),
      entered_by: user?.id ?? null,
      is_complete: false,
      created_at: new Date().toISOString(),
    });
    setNewAreaName('');
    setAddingArea(false);
  }

  async function toggleComplete(area: any) {
    const newStatus = !area.is_complete;
    patchRow('areas', area.id, { is_complete: newStatus });
    if (!newStatus) return;

    const user = await getCurrentUser();
    queueCall('notifyAreaComplete', area.name, job?.name, user?.id);
    const allDone = areas.every(a => (a.id === area.id ? true : a.is_complete));
    if (allDone) {
      patchRow('jobs', jobId, { status: 'complete' });
      queueCall('notifyJobComplete', job?.name, user?.id);
    }
  }

  function deleteArea(area: any) {
    deleteAreaCascade(area.id);
  }

  function getFilteredAreas() {
    switch (filter) {
      case 'todo': return areas.filter(a => !a.is_complete);
      case 'complete': return areas.filter(a => a.is_complete);
      case 'mine': return areas.filter(a => a.entered_by_id && a.entered_by_id === currentUser?.id);
      default: return areas;
    }
  }

  const completed = areas.filter(a => a.is_complete).length;
  const total = areas.length;
  const progress = total > 0 ? (completed / total) * 100 : 0;
  const openIssues = store.where('job_issues', i => i.job_id === jobId && i.status === 'open').length;
  // Still loading: the device copy hasn't been read yet, or the job is downloading.
  const loading = !store.loaded || (!job && online);
  // Opened offline on a phone that has never downloaded this job.
  const notOnDevice = store.loaded && !job && !online;

  return {
    jobId, job, loading, notOnDevice, addingArea, setAddingArea, newAreaName, setNewAreaName,
    filter, setFilter, jobNotes, notesSaved, saveJobNotes, addArea, toggleComplete, deleteArea,
    getFilteredAreas, completed, total, progress, openIssues,
  };
}
