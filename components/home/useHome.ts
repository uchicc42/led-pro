import { useEffect, useState } from 'react';
import { Colors } from '../../constants/Colors';
import { getCurrentUser } from '../../constants/userStore';
import { supabase } from '../../supabase';

type Options = {
  // Native listens on a realtime channel; web polls instead.
  live: 'realtime' | 'poll';
  initialUser?: () => any;
};

export function useHome({ live, initialUser }: Options) {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(() => initialUser?.() ?? null);

  useEffect(() => {
    getCurrentUser().then(user => setCurrentUser(user));
  }, []);

  async function loadJobs() {
    const { data } = await supabase
      .from('jobs')
      .select(`
        *,
        created_by:team_members(name, initials, color),
        areas(id, is_complete)
      `)
      .order('created_at', { ascending: false });
    if (data) setJobs(data);
    setLoading(false);
  }

  useEffect(() => {
    loadJobs();
    if (live === 'realtime') {
      const subscription = supabase
        .channel('jobs-channel')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'jobs' }, () => {
          loadJobs();
        })
        .subscribe();
      return () => { supabase.removeChannel(subscription); };
    } else {
      const interval = setInterval(loadJobs, 10000);
      return () => clearInterval(interval);
    }
  }, []);

  const activeJobs = jobs.filter(j => j.status !== 'complete');
  const completedToday = jobs.filter(j => {
    const today = new Date().toDateString();
    return new Date(j.created_at).toDateString() === today;
  }).length;
  const installingCount = jobs.filter(j => j.mode === 'electrician' && j.status !== 'complete').length;

  return { jobs, loading, currentUser, activeJobs, completedToday, installingCount };
}

export function getStatusColor(job: any) {
  if (job.status === 'complete') return Colors.green;
  if (job.mode === 'electrician') return Colors.coral;
  return Colors.blue;
}

export function getStatusLabel(job: any) {
  if (job.status === 'complete') return 'Complete';
  if (job.mode === 'electrician') return 'Installing';
  return 'In progress';
}

export function getModeLabel(job: any) {
  return job.mode === 'electrician' ? 'Electrician' : 'Counting';
}

export function getAreaProgress(job: any) {
  if (!job.areas || job.areas.length === 0) return '0 areas';
  const done = job.areas.filter((a: any) => a.is_complete).length;
  const total = job.areas.length;
  return `${done} / ${total} areas`;
}
