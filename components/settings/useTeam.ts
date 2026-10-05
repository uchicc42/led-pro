import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { LIGHT_TYPE_PALETTE } from '../../constants/lightTypeColors';
import { getCurrentUser } from '../../constants/userStore';
import { isOnline, useOnline } from '../../lib/offline/connectivity';
import { syncNow } from '../../lib/offline/sync';
import { supabase } from '../../supabase';

// Team management. Owners add, edit and remove members and set anyone's PIN; everyone can
// change their own PIN. PINs are set on the server (hashed), so this needs signal.

export const ROLES = [
  { key: 'owner', label: 'Owner', sub: 'Everything, including the team' },
  { key: 'partner', label: 'Partner', sub: 'Jobs, counting and settings' },
  { key: 'electrician', label: 'Electrician', sub: 'Install tracking' },
] as const;

export const MEMBER_COLORS = LIGHT_TYPE_PALETTE;

export type Member = { id: string; name: string; initials: string; color: string; role: string };

export type Editor = {
  mode: 'add' | 'edit';
  id?: string;
  name: string;
  initials: string;
  initialsEdited: boolean;
  color: string;
  role: string;
  pin: string;
};

export function initialsFor(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : parts[0]?.[1] ?? '')).toUpperCase();
}

const MESSAGES: Record<string, string> = {
  last_owner: 'There must always be at least one owner.',
  not_allowed: 'Only an owner can do that.',
  invalid_pin: 'PINs must be exactly 4 digits.',
};

function explain(error: any) {
  const message = String(error?.message ?? '');
  const key = Object.keys(MESSAGES).find(k => message.includes(k));
  return key ? MESSAGES[key] : 'Could not save. Check your connection and try again.';
}

export function useTeam() {
  const online = useOnline();
  const [members, setMembers] = useState<Member[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [me, setMe] = useState<any>(null);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('team_members')
      .select('id, name, initials, color, role')
      .eq('active', true)
      .order('created_at');
    if (data) {
      setMembers(data as Member[]);
      setLoaded(true);
    }
  }, []);

  // Re-read on every visit: the screen stays mounted, and the team may have changed elsewhere.
  useFocusEffect(
    useCallback(() => {
      getCurrentUser().then(setMe);
      if (isOnline()) load();
    }, [load])
  );

  useEffect(() => {
    if (online) load();
  }, [online, load]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(''), 2500);
    return () => clearTimeout(timer);
  }, [notice]);

  const isOwner = me?.role === 'owner';

  function startAdd() {
    setError('');
    setEditor({
      mode: 'add', name: '', initials: '', initialsEdited: false,
      color: MEMBER_COLORS[members.length % MEMBER_COLORS.length], role: 'electrician', pin: '',
    });
  }

  function startEdit(m: Member) {
    setError('');
    setEditor({ mode: 'edit', id: m.id, name: m.name, initials: m.initials, initialsEdited: true, color: m.color, role: m.role, pin: '' });
  }

  function updateEditor(patch: Partial<Editor>) {
    setEditor(prev => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      // Initials follow the name until someone types their own.
      if ('name' in patch && !prev.initialsEdited) next.initials = initialsFor(next.name);
      if ('initials' in patch) next.initialsEdited = true;
      return next;
    });
  }

  const pinValid = (pin: string) => /^\d{4}$/.test(pin);

  async function saveEditor() {
    if (!editor) return;
    const name = editor.name.trim();
    const initials = editor.initials.trim().toUpperCase().slice(0, 3) || initialsFor(name);
    if (!name) return setError('Enter a name.');
    if (editor.mode === 'add' && !pinValid(editor.pin)) return setError('Enter a 4-digit PIN for the new member.');
    if (editor.mode === 'edit' && editor.pin && !pinValid(editor.pin)) return setError('PINs must be exactly 4 digits.');

    setSaving(true);
    setError('');
    const fields = { name, initials, color: editor.color, role: editor.role };

    if (editor.mode === 'add') {
      const { data, error: insertError } = await supabase.from('team_members').insert({ ...fields, active: true }).select('id').single();
      if (insertError || !data) { setSaving(false); return setError(explain(insertError)); }
      const { error: pinError } = await supabase.rpc('set_member_pin', { p_member_id: data.id, p_pin: editor.pin });
      if (pinError) {
        // Don't leave a member who can't log in.
        await supabase.from('team_members').update({ active: false }).eq('id', data.id);
        setSaving(false);
        return setError(explain(pinError));
      }
      setNotice(`${name} added. They can log in with their PIN now.`);
    } else if (editor.id) {
      const { error: updateError } = await supabase.from('team_members').update(fields).eq('id', editor.id);
      if (updateError) { setSaving(false); return setError(explain(updateError)); }
      if (editor.pin) {
        const { error: pinError } = await supabase.rpc('set_member_pin', { p_member_id: editor.id, p_pin: editor.pin });
        if (pinError) { setSaving(false); return setError(explain(pinError)); }
      }
      setNotice(`${name} updated.`);
    }

    setSaving(false);
    setEditor(null);
    await load();
    syncNow(); // refresh names/colours shown elsewhere in the app
  }

  async function removeMember(id: string) {
    setSaving(true);
    setError('');
    const { error: removeError } = await supabase.from('team_members').update({ active: false }).eq('id', id);
    setSaving(false);
    if (removeError) return setError(explain(removeError));
    setEditor(null);
    setNotice('Member removed. They can no longer log in.');
    await load();
    syncNow();
  }

  /** Anyone can change their own PIN. */
  async function changeOwnPin(pin: string) {
    if (!me?.id) return false;
    if (!pinValid(pin)) { setError('PINs must be exactly 4 digits.'); return false; }
    setSaving(true);
    setError('');
    const { error: pinError } = await supabase.rpc('set_member_pin', { p_member_id: me.id, p_pin: pin });
    setSaving(false);
    if (pinError) { setError(explain(pinError)); return false; }
    setNotice('Your PIN has been changed.');
    return true;
  }

  return {
    online, members, loaded, me, isOwner, editor, saving, error, setError, notice,
    startAdd, startEdit, updateEditor, closeEditor: () => setEditor(null), saveEditor, removeMember, changeOwnPin,
  };
}
