import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { clearCurrentUser, getCurrentUser, setCurrentUser } from '../../constants/userStore';
import { AUTH_VERSION, pinLogin } from '../../lib/auth';
import { useOnline } from '../../lib/offline/connectivity';
import { supabase } from '../../supabase';

// Each person uses their own phone, so whoever logged in last stays logged in, with or
// without signal ("Continue as …"). Switching to a different person checks their PIN, which
// is checked on the server, which needs signal; the team list is never stored on the device.
//
// `beforeLogin` lets a platform screen clear its own session state (e.g. web localStorage)
// before switching users.
export function useLogin(beforeLogin?: () => void) {
  const online = useOnline();
  const [members, setMembers] = useState<any[]>([]);
  const [membersLoaded, setMembersLoaded] = useState(false);
  // Bumped each time the screen is shown, so the team list is re-read (members can be added
  // or removed while this screen stays mounted in the background).
  const [visits, setVisits] = useState(0);
  const [selected, setSelected] = useState<any>(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [storedUser, setStoredUser] = useState<any>(null);
  const [userChecked, setUserChecked] = useState(false);
  const [checking, setChecking] = useState(false);

  // Re-check who's logged in each time the login screen is shown (e.g. after "Switch user").
  useFocusEffect(
    useCallback(() => {
      getCurrentUser().then(user => {
        setStoredUser(user);
        setUserChecked(true);
      });
      setPin('');
      setError('');
      setVisits(v => v + 1);
    }, [])
  );

  // The team list needs signal; it loads when the screen is shown and when signal returns.
  useEffect(() => {
    if (!online) return;
    let cancelled = false;
    (async () => {
      // Names and colours only: PINs are checked on the server.
      const { data } = await supabase.from('login_members').select('*').order('created_at');
      if (cancelled || !data) return;
      setMembers(data);
      // Keep the current choice if that person is still on the team, otherwise pick the first.
      setSelected((s: any) => data.find((m: any) => m.id === s?.id) ?? data[0] ?? null);
      setMembersLoaded(true);
    })();
    return () => { cancelled = true; };
  }, [online, visits]);

  // Only logins made with the current (server-checked) method can continue without a PIN.
  const canContinue = !!storedUser && storedUser.authVersion === AUTH_VERSION;

  function continueAsStored() {
    if (!canContinue) return;
    router.replace(`/home?role=${storedUser.role}` as any);
  }

  const checkPin = useCallback(async (enteredPin: string) => {
    if (!selected) return;
    setChecking(true);
    const result = await pinLogin(selected.id, enteredPin);
    setChecking(false);
    if (result.ok) {
      beforeLogin?.();
      await clearCurrentUser();
      const user = { ...result.member, authVersion: AUTH_VERSION };
      await setCurrentUser(user);
      setStoredUser(user);
      router.replace(`/home?role=${user.role}` as any);
      return;
    }
    setPin('');
    setError({
      wrong: 'Incorrect PIN — try again',
      locked: 'Too many wrong PINs. Wait 15 minutes, then try again.',
      offline: 'Logging in needs signal. Try again when connected.',
      error: "Couldn't log in right now. Please try again.",
    }[result.reason]);
  }, [selected, beforeLogin]);

  function pressPin(digit: string) {
    if (pin.length >= 4 || checking) return;
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
    online, storedUser, canContinue, continueAsStored, canSwitch, membersLoading, checking,
  };
}
