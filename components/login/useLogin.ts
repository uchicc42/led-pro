import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { clearCurrentUser, getCurrentUser, setCurrentUser } from '../../constants/userStore';
import { useOnline } from '../../lib/offline/connectivity';
import { supabase } from '../../supabase';

// Each person uses their own phone, so whoever logged in last stays logged in, with or
// without signal ("Continue as …"). Switching to a different person checks their PIN, which
// needs signal; the team list is never stored on the device.
//
// `beforeLogin` lets a platform screen clear its own session state (e.g. web localStorage)
// before switching users.
export function useLogin(beforeLogin?: () => void) {
  const online = useOnline();
  const [members, setMembers] = useState<any[]>([]);
  const [membersLoaded, setMembersLoaded] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [storedUser, setStoredUser] = useState<any>(null);
  const [userChecked, setUserChecked] = useState(false);

  // Re-check who's logged in each time the login screen is shown (e.g. after "Switch user").
  useFocusEffect(
    useCallback(() => {
      getCurrentUser().then(user => {
        setStoredUser(user);
        setUserChecked(true);
      });
      setPin('');
      setError('');
    }, [])
  );

  // The team list needs signal; it loads as soon as there is some.
  useEffect(() => {
    if (!online || membersLoaded) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from('team_members').select('*').order('created_at');
      if (cancelled || !data) return;
      setMembers(data);
      setSelected((s: any) => s ?? data[0]);
      setMembersLoaded(true);
    })();
    return () => { cancelled = true; };
  }, [online, membersLoaded]);

  function continueAsStored() {
    if (!storedUser) return;
    router.replace(`/home?role=${storedUser.role}` as any);
  }

  const checkPin = useCallback(async (enteredPin: string) => {
    if (enteredPin === selected?.pin_hash) {
      beforeLogin?.();
      await clearCurrentUser();
      await setCurrentUser(selected);
      setStoredUser(selected);
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

  // Waiting to find out who (if anyone) is logged in on this phone.
  const loading = !userChecked;
  // Team list + PIN pad are available.
  const canSwitch = online && membersLoaded;
  const membersLoading = online && !membersLoaded;

  return {
    members, selected, pin, setPin, error, setError, loading,
    checkPin, pressPin, deletePin, selectMember,
    online, storedUser, continueAsStored, canSwitch, membersLoading,
  };
}
