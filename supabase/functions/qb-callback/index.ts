// Supabase Edge Function: QuickBooks sends the owner's browser here after they approve
// access. It saves the connection, runs a first sync, then returns the browser to LED Pro's
// Settings page (web).
//
// Deploy: Edge Functions → Deploy a new function → Via Editor. Type the name "qb-callback"
// FIRST, paste this file, and turn "Verify JWT" OFF (QuickBooks can't send a login).
// Its address is the Redirect URI to register with Intuit and to save as QB_REDIRECT_URI.
// Needs secrets: QB_CLIENT_ID, QB_CLIENT_SECRET, QB_REDIRECT_URI, QB_ENVIRONMENT
// ("sandbox" or "production"), APP_URL (e.g. https://led-pro.expo.app).

import { createClient } from 'npm:@supabase/supabase-js@2';

const API = (env: string) =>
  env === 'sandbox' ? 'https://sandbox-quickbooks.api.intuit.com' : 'https://quickbooks.api.intuit.com';

Deno.serve(async (req) => {
  const appUrl = (Deno.env.get('APP_URL') ?? 'https://led-pro.expo.app').replace(/\/$/, '');
  const back = (status: string) => Response.redirect(`${appUrl}/settings?quickbooks=${status}`, 302);

  const params = new URL(req.url).searchParams;
  const code = params.get('code');
  const state = params.get('state');
  const realmId = params.get('realmId');
  if (params.get('error')) return back('cancelled');
  if (!code || !state || !realmId) return back('error');

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // The state must match a sign-in an owner started in the last 15 minutes (used once).
  const { data: started } = await admin.from('qb_oauth_states').select('member_id, created_at').eq('state', state).maybeSingle();
  await admin.from('qb_oauth_states').delete().eq('state', state);
  if (!started || Date.now() - new Date(started.created_at).getTime() > 15 * 60 * 1000) return back('expired');

  // Exchange the one-time code for tokens.
  const basic = btoa(`${Deno.env.get('QB_CLIENT_ID')}:${Deno.env.get('QB_CLIENT_SECRET')}`);
  const tokenRes = await fetch('https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer', {
    method: 'POST',
    headers: { Authorization: `Basic ${basic}`, Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: Deno.env.get('QB_REDIRECT_URI')! }),
  });
  if (!tokenRes.ok) return back('error');
  const tokens = await tokenRes.json();

  const environment = Deno.env.get('QB_ENVIRONMENT') === 'sandbox' ? 'sandbox' : 'production';
  let companyName: string | null = null;
  const infoRes = await fetch(`${API(environment)}/v3/company/${realmId}/companyinfo/${realmId}?minorversion=75`, {
    headers: { Authorization: `Bearer ${tokens.access_token}`, Accept: 'application/json' },
  });
  if (infoRes.ok) companyName = (await infoRes.json())?.CompanyInfo?.CompanyName ?? null;

  const now = Date.now();
  const { error } = await admin.from('qb_connection').upsert({
    id: 1,
    realm_id: realmId,
    company_name: companyName,
    environment,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    access_expires_at: new Date(now + (tokens.expires_in ?? 3600) * 1000).toISOString(),
    refresh_expires_at: tokens.x_refresh_token_expires_in
      ? new Date(now + tokens.x_refresh_token_expires_in * 1000).toISOString()
      : null,
    connected_by: started.member_id,
    connected_at: new Date(now).toISOString(),
  });
  if (error) return back('error');

  // First sync straight away (best effort; "Sync now" can be used if it fails).
  const syncName = Deno.env.get('QB_SYNC_FUNCTION') ?? 'qb-sync';
  await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/${syncName}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`, 'Content-Type': 'application/json' },
    body: '{}',
  }).catch(() => null);

  return back('connected');
});
