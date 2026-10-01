import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { logChange } from '../../constants/notifications';
import { getCurrentUser } from '../../constants/userStore';
import { supabase } from '../../supabase';

type Mode = 'counting' | 'electrician';

export function useJobSettings() {
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [date, setDate] = useState('');
  const [mode, setMode] = useState<Mode>('counting');
  const [colSensor, setColSensor] = useState(false);
  const [colPhotocell, setColPhotocell] = useState(false);
  const [colLayout, setColLayout] = useState(false);
  const [colHours, setColHours] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadJob();
  }, [jobId]);

  async function loadJob() {
    setLoading(true);
    const { data } = await supabase.from('jobs').select('*').eq('id', jobId).single();
    if (data) {
      setName(data.name || '');
      setLocation(data.location || '');
      setDate(data.date || '');
      setMode(data.mode === 'electrician' ? 'electrician' : 'counting');
      setColSensor(!!data.col_sensor);
      setColPhotocell(!!data.col_photocell);
      setColLayout(!!data.col_layout);
      setColHours(!!data.col_hours);
    }
    setLoading(false);
  }

  const isReady = !!(name.trim() && location.trim() && date);
  const backHref = `/area-list?jobId=${jobId}`;

  async function save() {
    if (!isReady) return;
    setSaving(true);
    setError('');

    const { error: err } = await supabase
      .from('jobs')
      .update({
        name: name.trim(),
        location: location.trim(),
        date,
        mode,
        col_sensor: colSensor,
        col_photocell: colPhotocell,
        col_layout: colLayout,
        col_hours: colHours,
      })
      .eq('id', jobId);

    setSaving(false);

    if (err) {
      setError('Failed to save job settings. Please try again.');
      return;
    }

    try {
      const user = await getCurrentUser();
      await logChange(null, jobId, user?.id, user?.name, 'job_settings', `Job settings updated for ${name.trim()}`);
    } catch (e) { console.log('Log error:', e); }

    router.push(backHref as any);
  }

  const columns = [
    { label: 'Occupancy sensor', sub: 'Sensors per light row and per area', val: colSensor, set: setColSensor },
    { label: 'Photocell', sub: 'Photocells per light row and per area', val: colPhotocell, set: setColPhotocell },
    { label: 'Room layout / exhibit', sub: 'Ceiling diagram per area', val: colLayout, set: setColLayout },
    { label: 'Hours-based flag', sub: 'Color-code limited-hour lights', val: colHours, set: setColHours },
  ];

  return {
    loading, name, setName, location, setLocation, date, setDate, mode, setMode,
    columns, saving, error, isReady, save, backHref,
  };
}
