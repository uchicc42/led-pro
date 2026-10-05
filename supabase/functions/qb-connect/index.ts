// Supabase Edge Function: start or remove the QuickBooks connection (owners only).
//
// POST { action: 'connect' }    → { url } to open; QuickBooks returns to qb-callback.
// POST { action: 'disconnect' } → revokes access and forgets the connection.
//
// Deploy: Edge Functions → Deploy a new function → Via Editor. Type the name "qb-connect"
// FIRST (the address can't be changed later), then paste this file. Keep "Verify JWT" ON.
// Needs secrets: QB_CLIENT_ID, QB_CLIENT_SECRET, QB_REDIRECT_URI.

import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const reply = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return reply(405, { error: 'method_not_allowed' });

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Who is asking? Must be an active owner.
  const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  const { data: userData } = await admin.auth.getUser(jwt);
  if (!userData?.user) return reply(401, { error: 'not_logged_in' });
  const { data: member } = await admin
    .from('team_members')
    .select('id, role, active')
    .eq('auth_user_id', userData.user.id)
    .maybeSingle();
  if (!member?.active || member.role !== 'owner') return reply(403, { error: 'owners_only' });

  let action = '';
  try { ({ action } = await req.json()); } catch { /* handled below */ }

  if (action === 'connect') {
    const clientId = Deno.env.get('QB_CLIENT_ID');
    const redirectUri = Deno.env.get('QB_REDIRECT_URI');
    if (!clientId || !redirectUri) return reply(500, { error: 'not_configured' });

    // Forget sign-ins that were started but never finished.
    await admin.from('qb_oauth_states').delete().lt('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString());
    const state = crypto.randomUUID();
    await admin.from('qb_oauth_states').insert({ state, member_id: member.id });

    const url = new URL('https://appcenter.intuit.com/connect/oauth2');
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', 'com.intuit.quickbooks.accounting');
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('state', state);
    return reply(200, { url: url.toString() });
  }

  if (action === 'disconnect') {
    const { data: connection } = await admin.from('qb_connection').select('refresh_token').eq('id', 1).maybeSingle();
    if (connection?.refresh_token) {
      // Best effort: tell Intuit to revoke access too.
      const basic = btoa(`${Deno.env.get('QB_CLIENT_ID')}:${Deno.env.get('QB_CLIENT_SECRET')}`);
      await fetch('https://developer.api.intuit.com/v2/oauth2/tokens/revoke', {
        method: 'POST',
        headers: { Authorization: `Basic ${basic}`, Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: connection.refresh_token }),
      }).catch(() => null);
    }
    await admin.from('qb_connection').delete().eq('id', 1);
    return reply(200, { ok: true });
  }

  return reply(400, { error: 'bad_request' });
});
