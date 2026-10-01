import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { notifyAreaComplete, notifyJobComplete, notifyJobNote } from '../../constants/notifications';
import { getCurrentUser } from '../../constants/userStore';
import { supabase } from '../../supabase';

type Options = {
  // Native listens on a realtime channel; web polls instead.
  live: 'realtime' | 'poll';
  initialUser?: () => any;
};

export function useAreaList({ live, initialUser }: Options) {
  const { jobId } = useLocalSearchParams<{ jobId: string; role: string }>();
  const [job, setJob] = useState<any>(null);
  const [areas, setAreas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingArea, setAddingArea] = useState(false);
  const [newAreaName, setNewAreaName] = useState('');
  const [filter, setFilter] = useState('all');
  const [currentUser, setCurrentUser_state] = useState<any>(() => initialUser?.() ?? null);
  const [jobNotes, setJobNotes] = useState('');
  const [notesSaved, setNotesSaved] = useState(false);
  const notesTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    loadJob();
    loadAreas();
    loadCurrentUser();

    if (live === 'realtime') {
      const subscription = supabase
        .channel('areas-channel')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'areas' }, () => {
          loadAreas();
        })
        .subscribe();
      return () => { supabase.removeChannel(subscription); };
    } else {
      const interval = setInterval(loadAreas, 8000);
      return () => clearInterval(interval);
    }
  }, [jobId]);

  useFocusEffect(
    useCallback(() => {
      loadAreas();
    }, [jobId])
  );

  async function loadCurrentUser() {
    const user = await getCurrentUser();
    if (user) setCurrentUser_state(user);
  }

  async function loadJob() {
    const { data } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .single();
    if (data) { setJob(data); setJobNotes(data.job_notes || ''); }
  }

  async function saveJobNotes(text: string) {
    setJobNotes(text);
    setNotesSaved(false);
    await supabase.from('jobs').update({ job_notes: text }).eq('id', jobId);
    setNotesSaved(true);
    setTimeout(() => setNotesSaved(false), 2000);
    // Notify after a short delay to avoid spamming on every keystroke
    clearTimeout(notesTimeout.current);
    notesTimeout.current = setTimeout(async () => {
      const user = await getCurrentUser();
      await notifyJobNote(job?.name, user?.id);
    }, 3000);
  }

  async function loadAreas() {
    const { data } = await supabase
      .from('areas')
      .select(`
        *,
        entered_by:team_members(name, initials, color),
        light_rows(id)
      `)
      .eq('job_id', jobId)
      .order('created_at');
    if (data) setAreas(data);
    setLoading(false);
  }

  async function addArea() {
    if (!newAreaName.trim()) return;
    const user = await getCurrentUser();
    const { error } = await supabase
      .from('areas')
      .insert({
        job_id: jobId,
        name: newAreaName.trim(),
        entered_by: user?.id,
        is_complete: false,
      });
    if (!error) {
      setNewAreaName('');
      setAddingArea(false);
      loadAreas();
    }
  }

  async function toggleComplete(area: any) {
    const newStatus = !area.is_complete;
    await supabase
      .from('areas')
      .update({ is_complete: newStatus })
      .eq('id', area.id);

    if (newStatus) {
      const user = await getCurrentUser();
      await notifyAreaComplete(area.name, job?.name, user?.id);

      // Check if all areas are now complete
      const { data: allAreas } = await supabase
        .from('areas')
        .select('is_complete')
        .eq('job_id', jobId);

      const allDone = allAreas?.every((a: any) => a.id === area.id ? true : a.is_complete);
      if (allDone) {
        await supabase.from('jobs').update({ status: 'complete' }).eq('id', jobId);
        await notifyJobComplete(job?.name, user?.id);
      }
    }
    loadAreas();
  }

  async function deleteArea(area: any) {
    await supabase.from('light_rows').delete().eq('area_id', area.id);
    await supabase.from('areas').delete().eq('id', area.id);
    loadAreas();
  }

  function getFilteredAreas() {
    switch (filter) {
      case 'todo': return areas.filter(a => !a.is_complete);
      case 'complete': return areas.filter(a => a.is_complete);
      case 'mine': return areas.filter(a => a.entered_by?.name === currentUser?.name);
      default: return areas;
    }
  }

  const completed = areas.filter(a => a.is_complete).length;
  const total = areas.length;
  const progress = total > 0 ? (completed / total) * 100 : 0;

  return {
    jobId, job, loading, addingArea, setAddingArea, newAreaName, setNewAreaName,
    filter, setFilter, jobNotes, notesSaved, saveJobNotes, addArea, toggleComplete, deleteArea,
    getFilteredAreas, completed, total, progress,
  };
}
