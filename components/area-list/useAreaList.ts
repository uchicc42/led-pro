import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { getCurrentUser } from '../../constants/userStore';
import { byAreaOrder, reorderPatches } from '../../lib/areaOrder';
import { areaTree } from '../../lib/areaTree';
import { isOnline, useOnline } from '../../lib/offline/connectivity';
import { deleteAreaCascade } from '../../lib/offline/cascade';
import { patchRow, queueCall } from '../../lib/offline/data';
import { useStore } from '../../lib/offline/store';
import { pullJob, trackJob } from '../../lib/offline/sync';
import { supabase } from '../../supabase';
import { useAreaForm } from './useAreaForm';

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
  const [filter, setFilter] = useState('all');
  const [reordering, setReordering] = useState(false);
  // Areas whose rooms are showing on the list.
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const areaFormState = useAreaForm(jobId);
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
    .sort(byAreaOrder)
    .map((a): any => ({
      ...a,
      // Display helpers used by the screens (never written back).
      entered_by_id: a.entered_by,
      entered_by: store.get('team_members', a.entered_by) ?? null,
      light_rows: store.where('light_rows', r => r.area_id === a.id),
    }));

  function toggleExpanded(areaId: string) {
    const next = new Set(expanded);
    if (next.has(areaId)) next.delete(areaId); else next.add(areaId);
    setExpanded(next);
  }

  // Adds the area or copy from the box; a new room opens its area so it can be seen.
  async function submitAreaForm() {
    const result = await areaFormState.submitAreaForm();
    if (result?.parentId && !expanded.has(result.parentId)) setExpanded(new Set(expanded).add(result.parentId));
    return result;
  }

  async function toggleComplete(area: any) {
    const newStatus = !area.is_complete;
    patchRow('areas', area.id, { is_complete: newStatus });
    if (!newStatus) {
      // An area was reopened, so the job has work left again.
      if (job?.status === 'complete') patchRow('jobs', jobId, { status: 'active' });
      return;
    }

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

  const groups = areaTree(areas);

  /** Moves an area within its group: the top-level areas (parentId null) or the rooms of one area. */
  function moveArea(parentId: string | null, from: number, to: number) {
    const group = parentId ? groups.find(g => g.area.id === parentId)?.rooms ?? [] : groups.map(g => g.area);
    reorderPatches(group, from, to).forEach(({ id, sort_order }) => patchRow('areas', id, { sort_order }));
  }

  function matchesFilter(a: any) {
    switch (filter) {
      case 'todo': return !a.is_complete;
      case 'complete': return !!a.is_complete;
      case 'mine': return !!a.entered_by_id && a.entered_by_id === currentUser?.id;
      default: return true;
    }
  }

  // Areas with their rooms, filtered. An area shows when it or any of its rooms matches.
  // Reordering works on the whole list, so filters are set aside meanwhile.
  function getFilteredGroups() {
    if (reordering || filter === 'all') return groups;
    return groups
      .map(g => ({ area: g.area, rooms: g.rooms.filter(matchesFilter) }))
      .filter(g => matchesFilter(g.area) || g.rooms.length > 0);
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
    jobId, job, loading, notOnDevice, filter, setFilter, jobNotes, notesSaved, saveJobNotes, toggleComplete, deleteArea,
    getFilteredGroups, groups, expanded, toggleExpanded, completed, total, progress, openIssues, reordering, setReordering, moveArea,
    ...areaFormState, submitAreaForm,
  };
}
