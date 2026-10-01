import { router } from 'expo-router';
import { useState } from 'react';
import { supabase } from '../../supabase';

export function useNewJob() {
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [mode, setMode] = useState<'counting' | 'electrician'>('counting');
  const [colSensor, setColSensor] = useState(false);
  const [colPhotocell, setColPhotocell] = useState(false);
  const [colLayout, setColLayout] = useState(false);
  const [colHours, setColHours] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const isReady = !!(name.trim() && location.trim() && date);

  async function createJob() {
    if (!isReady) return;
    setSaving(true);
    setError('');

    const { error: err } = await supabase
      .from('jobs')
      .insert({
        name: name.trim(),
        location: location.trim(),
        date,
        mode,
        status: 'active',
        col_sensor: colSensor,
        col_photocell: colPhotocell,
        col_layout: colLayout,
        col_hours: colHours,
      })
      .select()
      .single();

    setSaving(false);

    if (err) {
      setError('Failed to create job. Please try again.');
      return;
    }

    router.replace('/home');
  }

  const columns = [
    { label: 'Occupancy sensor', sub: 'Qty + type column', val: colSensor, set: setColSensor },
    { label: 'Photocell', sub: 'Photocell quantity column', val: colPhotocell, set: setColPhotocell },
    { label: 'Room layout / exhibit', sub: 'Ceiling diagram per area', val: colLayout, set: setColLayout },
    { label: 'Hours-based flag', sub: 'Color-code limited-hour lights', val: colHours, set: setColHours },
  ];

  return {
    name, setName, location, setLocation, date, setDate, mode, setMode,
    columns, saving, error, isReady, createJob,
  };
}
