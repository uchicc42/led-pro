import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { getCurrentUser } from '../../constants/userStore';
import { isOnline, useOnline } from '../../lib/offline/connectivity';
import { syncNow as refreshDeviceCopy } from '../../lib/offline/sync';
import { supabase } from '../../supabase';

// QuickBooks Online sync: QuickBooks non-inventory items become "New LED" light types.
// The connection and its tokens live on the server; this only shows status and triggers
// actions. Function names must match the addresses created in Supabase.
const CONNECT_FUNCTION = 'qb-connect';
const SYNC_FUNCTION = 'qb-sync';

export type QbStatus = {
  connected: boolean;
  company_name: string | null;
  environment: string;
  connected_at: string;
  last_synced_at: string | null;
  last_sync_result: string | null;
  reconnect_needed: boolean;
} | null;

async function errorCode(error: any): Promise<string> {
  const body = await error?.context?.clone?.().json?.().catch(() => null);
  return body?.error ?? '';
}

const MESSAGES: Record<string, string> = {
  not_connected: 'QuickBooks isn’t connected yet.',
  reconnect_needed: 'QuickBooks needs to be connected again (access expired or was removed).',
  quickbooks_error: 'QuickBooks didn’t respond. Try again in a minute.',
  owners_only: 'Only an owner can change the QuickBooks connection.',
  not_allowed: 'Only owners and partners can sync.',
  not_configured: 'QuickBooks isn’t set up on the server yet (missing keys).',
};

export function useQuickBooks() {
  const online = useOnline();
  const [status, setStatus] = useState<QbStatus>(null);
  const [loaded, setLoaded] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const [busy, setBusy] = useState<'sync' | 'connect' | 'disconnect' | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadStatus = useCallback(async () => {
    const { data } = await supabase.rpc('qb_status');
    setStatus((data as QbStatus) ?? null);
    setLoaded(true);
  }, []);

  useFocusEffect(
    useCallback(() => {
      getCurrentUser().then(u => setRole(u?.role ?? null));
      if (isOnline()) loadStatus();
    }, [loadStatus])
  );

  useEffect(() => {
    if (online) loadStatus();
  }, [online, loadStatus]);

  const canSync = role === 'owner' || role === 'partner';
  const canManage = role === 'owner';

  async function syncNow() {
    setBusy('sync');
    setError('');
    setMessage('');
    const { data, error: fnError } = await supabase.functions.invoke(SYNC_FUNCTION, { body: {} });
    setBusy(null);
    if (fnError) {
      setError(MESSAGES[await errorCode(fnError)] ?? 'Sync failed. Check your connection and try again.');
    } else {
      setMessage(data?.result ?? 'Synced.');
      refreshDeviceCopy(); // bring the new light types onto this device
    }
    loadStatus();
  }

  /** Returns the QuickBooks sign-in address to open, or null on error. */
  async function startConnect(): Promise<string | null> {
    setBusy('connect');
    setError('');
    const { data, error: fnError } = await supabase.functions.invoke(CONNECT_FUNCTION, { body: { action: 'connect' } });
    setBusy(null);
    if (fnError || !data?.url) {
      setError(MESSAGES[await errorCode(fnError)] ?? 'Couldn’t start the QuickBooks connection. Try again.');
      return null;
    }
    return data.url;
  }

  async function disconnect() {
    setBusy('disconnect');
    setError('');
    const { error: fnError } = await supabase.functions.invoke(CONNECT_FUNCTION, { body: { action: 'disconnect' } });
    setBusy(null);
    if (fnError) setError(MESSAGES[await errorCode(fnError)] ?? 'Couldn’t disconnect. Try again.');
    else setMessage('QuickBooks disconnected. Light types already synced stay in LED Pro.');
    loadStatus();
  }

  return { online, status, loaded, canSync, canManage, busy, message, setMessage, error, syncNow, startConnect, disconnect };
}

export function formatWhen(iso: string | null | undefined) {
  if (!iso) return 'never';
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}
