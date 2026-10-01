import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { clearCurrentUser, setCurrentUser } from '../../constants/userStore';
import { supabase } from '../../supabase';

// `beforeLogin` lets a platform screen clear its own session state (e.g. web localStorage) before switching users.
export function useLogin(beforeLogin?: () => void) {
  const [members, setMembers] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadMembers() {
      const { data } = await supabase
        .from('team_members')
        .select('*')
        .order('created_at');
      if (data) { setMembers(data); setSelected(data[0]); }
      setLoading(false);
    }
    loadMembers();
  }, []);

  const checkPin = useCallback(async (enteredPin: string) => {
    if (enteredPin === selected?.pin_hash) {
      beforeLogin?.();
      await clearCurrentUser();
      await setCurrentUser(selected);
      router.replace(`/home?role=${selected.role}` as any);
    } else {
      setError('Incorrect PIN — try again');
      setPin('');
    }
  }, [selected, beforeLogin]);

  function pressPin(digit: string) {
    if (pin.length >= 4) return;
    const newPin = pin + digit;
    setPin(newPin);
    setError('');
    if (newPin.length === 4) setTimeout(() => checkPin(newPin), 150);
  }

  function deletePin() {
    setPin(pin.slice(0, -1));
    setError('');
  }

  function selectMember(m: any) {
    setSelected(m);
    setPin('');
    setError('');
  }

  return {
    members, selected, pin, setPin, error, setError, loading,
    checkPin, pressPin, deletePin, selectMember,
  };
}
