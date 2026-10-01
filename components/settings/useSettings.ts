import { useEffect, useState } from 'react';
import { getCurrentUser } from '../../constants/userStore';
import { supabase } from '../../supabase';

export function useSettings() {
  const [lightTypes, setLightTypes] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [newTypeName, setNewTypeName] = useState('');
  const [newTypeCategory, setNewTypeCategory] = useState('current');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandLights, setExpandLights] = useState(false);
  const [expandTeam, setExpandTeam] = useState(false);
  const [currentUser, setCurrentUser_state] = useState<any>(null);
  const [notifyAreaComplete, setNotifyAreaComplete] = useState(true);
  const [notifyJobComplete, setNotifyJobComplete] = useState(true);
  const [notifyJobNotes, setNotifyJobNotes] = useState(true);
  const [expandNotifications, setExpandNotifications] = useState(false);
  const [controlTypes, setControlTypes] = useState<any[]>([]);
  const [expandControls, setExpandControls] = useState(false);
  const [newControlName, setNewControlName] = useState('');
  const [newControlKind, setNewControlKind] = useState<'occupancy' | 'photocell'>('occupancy');

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    await Promise.all([loadLightTypes(), loadControlTypes(), loadTeamMembers(), loadNotificationPrefs()]);
    setLoading(false);
  }

  async function loadNotificationPrefs() {
    const user = await getCurrentUser();
    if (!user) return;
    setCurrentUser_state(user);
    const { data } = await supabase
      .from('team_members')
      .select('notify_area_complete, notify_job_complete, notify_job_notes')
      .eq('id', user.id)
      .single();
    if (data) {
      setNotifyAreaComplete(data.notify_area_complete);
      setNotifyJobComplete(data.notify_job_complete);
      setNotifyJobNotes(data.notify_job_notes);
    }
  }

  async function updateNotificationPref(field: string, value: boolean) {
    const user = await getCurrentUser();
    if (!user) return;
    await supabase.from('team_members').update({ [field]: value }).eq('id', user.id);
  }

  async function loadLightTypes() {
    const { data } = await supabase
      .from('light_types')
      .select('*')
      .order('category')
      .order('sort_order');
    if (data) setLightTypes(data);
  }

  async function loadControlTypes() {
    const { data } = await supabase
      .from('control_types')
      .select('*')
      .order('kind')
      .order('sort_order');
    if (data) setControlTypes(data);
  }

  async function addControlType() {
    if (!newControlName.trim()) return;
    setSaving(true);
    const maxOrder = controlTypes.filter(t => t.kind === newControlKind).length;
    await supabase.from('control_types').insert({
      name: newControlName.trim(),
      kind: newControlKind,
      sort_order: maxOrder + 1,
    });
    setNewControlName('');
    await loadControlTypes();
    setSaving(false);
  }

  async function deleteControlType(id: string) {
    await supabase.from('control_types').delete().eq('id', id);
    await loadControlTypes();
  }

  async function loadTeamMembers() {
    const { data } = await supabase
      .from('team_members')
      .select('*')
      .order('created_at');
    if (data) setTeamMembers(data);
  }

  async function addLightType() {
    if (!newTypeName.trim()) return;
    setSaving(true);
    const maxOrder = lightTypes.filter(t => t.category === newTypeCategory).length;
    await supabase.from('light_types').insert({
      name: newTypeName.trim(),
      category: newTypeCategory,
      sort_order: maxOrder + 1,
    });
    setNewTypeName('');
    await loadLightTypes();
    setSaving(false);
  }

  async function deleteLightType(id: string) {
    await supabase.from('light_types').delete().eq('id', id);
    await loadLightTypes();
  }

  const currentTypes = lightTypes.filter(t => t.category === 'current');
  const newTypes = lightTypes.filter(t => t.category === 'new');
  const sensorTypes = controlTypes.filter(t => t.kind === 'occupancy');
  const photocellTypes = controlTypes.filter(t => t.kind === 'photocell');

  return {
    lightTypes, teamMembers, newTypeName, setNewTypeName, newTypeCategory, setNewTypeCategory,
    loading, saving, expandLights, setExpandLights, expandTeam, setExpandTeam, currentUser,
    notifyAreaComplete, setNotifyAreaComplete, notifyJobComplete, setNotifyJobComplete,
    notifyJobNotes, setNotifyJobNotes, expandNotifications, setExpandNotifications,
    updateNotificationPref, addLightType, deleteLightType, currentTypes, newTypes,
    controlTypes, expandControls, setExpandControls, newControlName, setNewControlName,
    newControlKind, setNewControlKind, addControlType, deleteControlType, sensorTypes, photocellTypes,
  };
}
