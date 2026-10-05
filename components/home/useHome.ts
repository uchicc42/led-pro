import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Colors } from '../../constants/Colors';
import { getCurrentUser } from '../../constants/userStore';
import { isOnline } from '../../lib/offline/connectivity';
import { useStore } from '../../lib/offline/store';
import { pullJobsList } from '../../lib/offline/sync';
import { supabase } from '../../supabase';

type Options = {
  // Native listens on a realtime channel; web polls instead.
  live: 'realtime' | 'poll';
  initialUser?: () => any;
};

export function useHome({ live, initialUser }: Options) {
  const store = useStore();
  const [currentUser, setCurrentUser] = useState<any>(() => initialUser?.() ?? null);

  useEffect(() => {
    getCurrentUser().then(user => setCurrentUser(user));
  }, []);

  // Jobs come from the device copy (works offline); live updates refresh that copy.
  useEffect(() => {
    const refresh = () => { if (isOnline()) pullJobsList(); };
    refresh();
    if (live === 'realtime') {
      const subscription = supabase
        .channel('jobs-channel')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'jobs' }, refresh)
        .subscribe();
      return () => { supabase.removeChannel(subscription); };
    } else {
      const interval = setInterval(refresh, 15000);
      return () => clearInterval(interval);
    }
  }, []);

  // Pick up jobs created or changed elsewhere each time home is shown.
  useFocusEffect(
    useCallback(() => {
      if (isOnline()) pullJobsList();
    }, [])
  );

  const jobs = store.all('jobs')
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
    .map((job): any => {
      // Use the device's areas when this job has been downloaded (includes offline changes),
      // otherwise the summary that came with the jobs list.
      const localAreas = store.where('areas', a => a.job_id === job.id);
      return { ...job, created_by: job._created_by, areas: localAreas.length > 0 ? localAreas : job._areas ?? [] };
    });
  const loading = !store.loaded && jobs.length === 0;

  const hour = new Date().getHours();
  const firstName = (currentUser?.name || '').split(' ')[0];
  const greeting = (hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening') + (firstName ? ', ' + firstName : '');

  const activeJobs = jobs.filter(j => j.status !== 'complete');
  const completedToday = jobs.filter(j => {
    const today = new Date().toDateString();
    return new Date(j.created_at).toDateString() === today;
  }).length;
  const installingCount = jobs.filter(j => j.mode === 'electrician' && j.status !== 'complete').length;

  return { jobs, loading, currentUser, greeting, activeJobs, completedToday, installingCount };
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
