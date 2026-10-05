import { supabase } from '../supabase';

// PIN login against the server ("pin-login" Edge Function). The PIN is checked on the server;
// the app gets a one-time token and exchanges it for a normal Supabase session, which is
// saved on the device so the person stays logged in (including offline).

// Address of the deployed login function. The dashboard labels it "pin-login", but it was
// created with the auto-generated address "bright-responder" (addresses can't be renamed).
const LOGIN_FUNCTION = 'bright-responder';

/** Bumped when the login method changes; older saved logins must log in again once. */
export const AUTH_VERSION = 2;

export type LoginResult =
  | { ok: true; member: { id: string; name: string; initials: string; color: string; role: string } }
  | { ok: false; reason: 'wrong' | 'locked' | 'offline' | 'error' };

export async function pinLogin(memberId: string, pin: string): Promise<LoginResult> {
  const { data, error } = await supabase.functions.invoke(LOGIN_FUNCTION, { body: { member_id: memberId, pin } });
  if (error) {
    const response = (error as any).context as Response | undefined;
    const status = response?.status;
    // Only the function's own answer counts as a wrong PIN; any other 401 (e.g. a rejected
    // API key) is a setup problem and must not tell the person their PIN is wrong.
    const body = await response?.clone?.().json?.().catch(() => null);
    if (body?.error === 'wrong_pin') return { ok: false, reason: 'wrong' };
    if (body?.error === 'locked' || status === 429) return { ok: false, reason: 'locked' };
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
