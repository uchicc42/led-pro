import { supabase } from '../supabase';

// PIN login against the server ("pin-login" Edge Function). The PIN is checked on the server;
// the app gets a one-time token and exchanges it for a normal Supabase session, which is
// saved on the device so the person stays logged in (including offline).

/** Bumped when the login method changes; older saved logins must log in again once. */
export const AUTH_VERSION = 2;

export type LoginResult =
  | { ok: true; member: { id: string; name: string; initials: string; color: string; role: string } }
  | { ok: false; reason: 'wrong' | 'locked' | 'offline' | 'error' };

export async function pinLogin(memberId: string, pin: string): Promise<LoginResult> {
  const { data, error } = await supabase.functions.invoke('pin-login', { body: { member_id: memberId, pin } });
  if (error) {
    const status = (error as any).context?.status as number | undefined;
    if (status === 401) return { ok: false, reason: 'wrong' };
    if (status === 429) return { ok: false, reason: 'locked' };
    if (!status || error.name === 'FunctionsFetchError' || error.name === 'FunctionsRelayError') {
      return { ok: false, reason: 'offline' };
    }
    return { ok: false, reason: 'error' };
  }
  if (!data?.token_hash || !data?.member) return { ok: false, reason: 'error' };

  const { error: sessionError } = await supabase.auth.verifyOtp({ token_hash: data.token_hash, type: 'magiclink' });
  if (sessionError) return { ok: false, reason: 'error' };
  return { ok: true, member: data.member };
}

/** True when a login session is available (renewing it first if there's signal). */
export async function hasSession() {
  const { data } = await supabase.auth.getSession();
  return !!data.session;
}
