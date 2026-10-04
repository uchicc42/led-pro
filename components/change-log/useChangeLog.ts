import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { supabase } from '../../supabase';

export function useChangeLog() {
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [job, setJob] = useState<any>(null);

  useEffect(() => {
    loadAll();
  }, [jobId]);

  async function loadAll() {
    const { data: jobData } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .single();
    if (jobData) setJob(jobData);

    const { data } = await supabase
      .from('change_log')
      .select('*')
      .eq('job_id', jobId)
      .order('created_at', { ascending: false });
    if (data) setLogs(data);
    setLoading(false);
  }

  return { jobId, logs, loading, job };
}

export function formatTime(timestamp: string) {
  return new Date(timestamp).toLocaleString('en-US', {
    month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true
  });
}

export function getIcon(changeType: string) {
  switch (changeType) {
    case 'area_updated': return '✏️';
    case 'area_complete': return '✅';
    case 'job_complete': return '🎉';
    case 'job_note': return '📝';
    case 'job_settings': return '⚙️';
    case 'photo_added': return '📷';
    case 'issue_logged': return '⚠️';
    default: return '📋';
  }
}
