// Supabase Edge Function: sync QuickBooks non-inventory items into LED Pro's "New LED"
// light types.
//
// - The light type name is the item's Sales description (e.g. "2x4"); the item Name (the
//   product code) is kept as product_code. No description falls back to the code, and two
//   active items with the same description get their code added so they stay distinct.
// - New items are added; renamed items are renamed (matched by QuickBooks id).
// - Items made inactive or deleted in QuickBooks are archived (hidden from dropdowns).
// - An existing light type with the same name is linked rather than duplicated.
//
// Called by: owners/partners ("Sync now"), qb-callback (first sync), and the daily schedule
// (sends the x-cron-secret header).
//
// Deploy: Edge Functions → Deploy a new function → Via Editor. Type the name "qb-sync"
// FIRST, then paste this file. Keep "Verify JWT" ON.
// Needs secrets: QB_CLIENT_ID, QB_CLIENT_SECRET; optional CRON_SECRET for the schedule.

import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const reply = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const API = (env: string) =>
  env === 'sandbox' ? 'https://sandbox-quickbooks.api.intuit.com' : 'https://quickbooks.api.intuit.com';

type QbItem = { Id: string; Name: string; Description?: string; Type: string; Active: boolean };

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return reply(405, { error: 'method_not_allowed' });

  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Allowed: the server itself, the daily schedule, or an owner/partner.
  const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  const cronSecret = Deno.env.get('CRON_SECRET');
  let allowed = jwt === serviceKey || (!!cronSecret && req.headers.get('x-cron-secret') === cronSecret);
  if (!allowed) {
    const { data: userData } = await admin.auth.getUser(jwt);
    if (userData?.user) {
      const { data: member } = await admin
        .from('team_members')
        .select('role, active')
        .eq('auth_user_id', userData.user.id)
        .maybeSingle();
      allowed = !!member?.active && (member.role === 'owner' || member.role === 'partner');
    }
  }
  if (!allowed) return reply(403, { error: 'not_allowed' });

  const { data: connection } = await admin.from('qb_connection').select('*').eq('id', 1).maybeSingle();
  if (!connection) return reply(409, { error: 'not_connected' });

  // Renews the access token (QuickBooks tokens last an hour; the refresh token rolls forward
  // and must be saved each time). Returns null, and marks the connection as needing to be
  // reconnected, if QuickBooks refuses (expired/revoked refresh token, invalid grant).
  let refreshToken: string = connection.refresh_token;
  async function renew(): Promise<string | null> {
    const basic = btoa(`${Deno.env.get('QB_CLIENT_ID')}:${Deno.env.get('QB_CLIENT_SECRET')}`);
    const res = await fetch('https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer', {
      method: 'POST',
      headers: { Authorization: `Basic ${basic}`, Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken }),
    });
    if (!res.ok) {
      await markReconnectNeeded();
      return null;
    }
    const tokens = await res.json();
    const now = Date.now();
    refreshToken = tokens.refresh_token;
    await admin.from('qb_connection').update({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      access_expires_at: new Date(now + (tokens.expires_in ?? 3600) * 1000).toISOString(),
      refresh_expires_at: tokens.x_refresh_token_expires_in
        ? new Date(now + tokens.x_refresh_token_expires_in * 1000).toISOString()
        : connection.refresh_expires_at,
    }).eq('id', 1);
    return tokens.access_token;
  }

  async function markReconnectNeeded() {
    await admin.from('qb_connection').update({
      refresh_expires_at: new Date().toISOString(),
      last_sync_result: 'QuickBooks needs to be reconnected',
    }).eq('id', 1);
  }

  // Renew ahead of time when the token is about to expire.
  let accessToken: string | null = connection.access_token;
  if (new Date(connection.access_expires_at).getTime() < Date.now() + 5 * 60 * 1000) {
    accessToken = await renew();
    if (!accessToken) return reply(409, { error: 'reconnect_needed' });
  }

  // Every non-inventory item, active and inactive, a page at a time. If QuickBooks rejects the
  // token anyway (e.g. revoked early), renew once and retry; if that fails, ask to reconnect.
  const items: QbItem[] = [];
  let renewedAfterRejection = false;
  for (let start = 1; ; start += 1000) {
    const query = `select Id, Name, Description, Type, Active from Item where Type = 'NonInventory' and Active in (true, false) startposition ${start} maxresults 1000`;
    const res = await fetch(
      `${API(connection.environment)}/v3/company/${connection.realm_id}/query?query=${encodeURIComponent(query)}&minorversion=75`,
      { headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' } },
    );
    if (res.status === 401) {
      if (renewedAfterRejection) {
        await markReconnectNeeded();
        return reply(409, { error: 'reconnect_needed' });
      }
      renewedAfterRejection = true;
      accessToken = await renew();
      if (!accessToken) return reply(409, { error: 'reconnect_needed' });
      start -= 1000; // retry the same page
      continue;
    }
    if (!res.ok) {
      await admin.from('qb_connection').update({ last_sync_result: `Sync failed (QuickBooks ${res.status})` }).eq('id', 1);
      return reply(502, { error: 'quickbooks_error', status: res.status });
    }
    const page: QbItem[] = (await res.json())?.QueryResponse?.Item ?? [];
    items.push(...page);
    if (page.length < 1000) break;
  }

  // Display name: the sales description, made unique with the product code when two active
  // items share one.
  const descriptionOf = (i: QbItem) => (i.Description ?? '').trim() || i.Name.trim();
  const activeCounts = new Map<string, number>();
  items.filter(i => i.Active).forEach(i => {
    const key = descriptionOf(i).toLowerCase();
    activeCounts.set(key, (activeCounts.get(key) ?? 0) + 1);
  });
  const displayName = (i: QbItem) => {
    const desc = descriptionOf(i);
    return (activeCounts.get(desc.toLowerCase()) ?? 0) > 1 && desc !== i.Name.trim() ? `${desc} · ${i.Name.trim()}` : desc;
  };

  const { data: types } = await admin.from('light_types').select('id, name, category, sort_order, quickbooks_item_id, product_code, archived');
  const all = types ?? [];
  const byQbId = new Map(all.filter(t => t.quickbooks_item_id).map(t => [t.quickbooks_item_id as string, t]));
  const unlinkedNew = new Map(all.filter(t => !t.quickbooks_item_id && t.category === 'new').map(t => [t.name.trim().toLowerCase(), t]));
  let nextSort = Math.max(0, ...all.filter(t => t.category === 'new').map(t => t.sort_order ?? 0)) + 1;

  let added = 0, updated = 0, archived = 0;
  const seen = new Set<string>();

  for (const item of items) {
    seen.add(item.Id);
    const name = displayName(item);
    const productCode = item.Name.trim();
    const existing = byQbId.get(item.Id) ?? unlinkedNew.get(name.toLowerCase());
    if (existing) {
      const patch: Record<string, unknown> = {};
      if (existing.quickbooks_item_id !== item.Id) patch.quickbooks_item_id = item.Id;
      if (existing.name !== name) patch.name = name;
      if (existing.product_code !== productCode) patch.product_code = productCode;
      if (existing.archived !== !item.Active) patch.archived = !item.Active;
      if (Object.keys(patch).length > 0) {
        await admin.from('light_types').update(patch).eq('id', existing.id);
        if (patch.archived === true) archived++; else updated++;
      }
    } else if (item.Active) {
      await admin.from('light_types').insert({
        name, product_code: productCode, category: 'new', sort_order: nextSort++, quickbooks_item_id: item.Id, archived: false,
      });
      added++;
    }
  }

  // Linked types whose item no longer exists in QuickBooks are archived.
  for (const t of all) {
    if (t.quickbooks_item_id && !seen.has(t.quickbooks_item_id) && !t.archived) {
      await admin.from('light_types').update({ archived: true }).eq('id', t.id);
      archived++;
    }
  }

  const result = `${items.length} items checked: ${added} added, ${updated} updated, ${archived} hidden`;
  await admin.from('qb_connection').update({ last_synced_at: new Date().toISOString(), last_sync_result: result }).eq('id', 1);
  return reply(200, { ok: true, added, updated, archived, checked: items.length, result });
});
