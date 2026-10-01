import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { saveInstallData, saveInstallRow, syncQueue } from '../../constants/offlineSync';
import { supabase } from '../../supabase';

// `checkConnectivity` is platform-specific: web reads navigator.onLine, native pings a server.
export function useElectrician(checkConnectivity: () => Promise<boolean>) {
  const { areaId, jobId } = useLocalSearchParams<{ areaId: string; jobId: string }>();
  const [area, setArea] = useState<any>(null);
  const [job, setJob] = useState<any>(null);
  const [lightRows, setLightRows] = useState<any[]>([]);
  const [installRows, setInstallRows] = useState<Record<string, any>>({});
  const [notes, setNotes] = useState('');
  const [needsFollowUp, setNeedsFollowUp] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isOnlineStatus, setIsOnlineStatus] = useState(true);

  useEffect(() => {
    loadAll();
    checkOnline();
    const interval = setInterval(checkOnline, 10000);
    return () => clearInterval(interval);
  }, [areaId]);

  async function checkOnline() {
    try {
      const online = await checkConnectivity();
      setIsOnlineStatus(online);
      if (online) await syncQueue();
    } catch {
      setIsOnlineStatus(false);
    }
  }

  async function loadAll() {
    await Promise.all([loadArea(), loadJob(), loadLightRows()]);
    setLoading(false);
  }

  async function loadArea() {
    const { data } = await supabase.from('areas').select('*').eq('id', areaId).single();
    if (data) {
      setArea(data);
      setNotes(data.install_notes || '');
      setNeedsFollowUp(data.needs_follow_up || false);
    }
  }

  async function loadJob() {
    const { data } = await supabase.from('jobs').select('*').eq('id', jobId).single();
    if (data) setJob(data);
  }

  async function loadLightRows() {
    const { data: rows } = await supabase
      .from('light_rows')
      .select('*')
      .eq('area_id', areaId)
      .order('sort_order');
    if (rows) setLightRows(rows);

    const { data: installs } = await supabase
      .from('install_rows')
      .select('*')
      .in('light_row_id', (rows || []).map((r: any) => r.id));

    if (installs) {
      const map: Record<string, any> = {};
      installs.forEach((i: any) => { map[i.light_row_id] = i; });
      setInstallRows(map);
    }
  }

  function getInstallRow(lightRowId: string) {
    return installRows[lightRowId] || {
      status: 'pending',
      removed: false,
      removal_note: '',
    };
  }

  function updateInstallRow(lightRowId: string, field: string, value: any) {
    setInstallRows(prev => ({
      ...prev,
      [lightRowId]: {
        ...getInstallRow(lightRowId),
        [field]: value,
        light_row_id: lightRowId,
      }
    }));
  }

  async function save() {
    setSaving(true);

    await saveInstallData(areaId, {
      install_notes: notes,
      needs_follow_up: needsFollowUp,
    });

    for (const lightRowId of Object.keys(installRows)) {
      const row = installRows[lightRowId];
      await saveInstallRow({
        light_row_id: lightRowId,
        status: row.status || 'pending',
        removed: row.removed || false,
        removal_note: row.removal_note || '',
      });
    }

    setSaving(false);
  }

  return {
    areaId, jobId, area, job, lightRows, notes, setNotes, needsFollowUp, setNeedsFollowUp,
    loading, saving, isOnlineStatus, getInstallRow, updateInstallRow, save,
  };
}

export function getStatusLabel(status: string) {
  if (status === 'complete') return 'Complete';
  if (status === 'in_progress') return 'In progress';
  return 'Pending';
}
