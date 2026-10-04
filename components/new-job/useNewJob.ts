import { router } from 'expo-router';
import { useState } from 'react';
import { getCurrentUser } from '../../constants/userStore';
import { newId, saveRow } from '../../lib/offline/data';

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

  // Saved to the device copy and queued for upload, so jobs can be created without signal.
  async function createJob() {
    if (!isReady) return;
    setSaving(true);
    setError('');
    const user = await getCurrentUser();

    saveRow('jobs', {
      id: newId(),
      name: name.trim(),
      location: location.trim(),
      date,
      mode,
      status: 'active',
      col_sensor: colSensor,
      col_photocell: colPhotocell,
      col_layout: colLayout,
      col_hours: colHours,
      created_by: user?.id ?? null,
      created_at: new Date().toISOString(),
    });

    // The screen stays mounted between visits, so start fresh for the next job.
    setName('');
    setLocation('');
    setDate(new Date().toISOString().split('T')[0]);
    setMode('counting');
    setColSensor(false);
    setColPhotocell(false);
    setColLayout(false);
    setColHours(false);
    setSaving(false);

    router.replace('/home');
  }

  const columns = [
    { label: 'Occupancy sensor', sub: 'Sensors per light row and per area', val: colSensor, set: setColSensor },
    { label: 'Photocell', sub: 'Photocells per light row and per area', val: colPhotocell, set: setColPhotocell },
    { label: 'Room layout / exhibit', sub: 'Ceiling diagram per area', val: colLayout, set: setColLayout },
    { label: 'Hours-based flag', sub: 'Color-code limited-hour lights', val: colHours, set: setColHours },
  ];

  return {
    name, setName, location, setLocation, date, setDate, mode, setMode,
    columns, saving, error, isReady, createJob,
  };
}
