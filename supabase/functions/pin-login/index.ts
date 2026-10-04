// Supabase Edge Function: PIN login.
//
// The app sends { member_id, pin }. The PIN is checked in the database (hashed, with a
// lockout after 5 wrong tries). If it's right, the person's Supabase login account is
// created on first use, and a one-time login token is returned that the app exchanges for a
// normal Supabase session. PINs never leave the server.
//
// Deploy: Supabase dashboard → Edge Functions → Deploy a new function → name it "pin-login"
// → paste this file. Leave "Verify JWT" ON (the app sends its public key, which is enough).

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

  let memberId: string, pin: string;
  try {
    ({ member_id: memberId, pin } = await req.json());
  } catch {
    return reply(400, { error: 'bad_request' });
  }
  if (typeof memberId !== 'string' || typeof pin !== 'string' || !/^\d{4}$/.test(pin)) {
    return reply(400, { error: 'bad_request' });
  }

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: result, error: verifyError } = await admin.rpc('verify_member_pin', { p_member_id: memberId, p_pin: pin });
  if (verifyError) return reply(500, { error: 'server_error' });
  if (result === 'locked') return reply(429, { error: 'locked' });
  if (result !== 'ok') return reply(401, { error: 'wrong_pin' });

  const { data: member, error: memberError } = await admin
    .from('team_members')
    .select('id, name, initials, color, role, auth_user_id')
    .eq('id', memberId)
    .single();
  if (memberError || !member) return reply(500, { error: 'server_error' });

  // A login account per team member, created the first time they log in. The address is
  // never emailed; ".invalid" is a reserved domain that can't receive mail.
  const email = `member-${member.id}@ledpro.invalid`;
  if (!member.auth_user_id) {
    const { error: createError } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { member_id: member.id, name: member.name },
    });
    if (createError && !/already|exists|registered/i.test(createError.message)) {
      return reply(500, { error: 'server_error' });
    }
  }

  const { data: link, error: linkError } = await admin.auth.admin.generateLink({ type: 'magiclink', email });
  if (linkError || !link?.properties?.hashed_token || !link.user) return reply(500, { error: 'server_error' });

  if (member.auth_user_id !== link.user.id) {
    await admin.from('team_members').update({ auth_user_id: link.user.id }).eq('id', member.id);
  }

  const { auth_user_id: _ignored, ...profile } = member;
  return reply(200, { token_hash: link.properties.hashed_token, member: profile });
});
