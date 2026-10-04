import { verifyToken } from '@/lib/server/token';
import type { EventBody } from '@/lib/server/types';
import { supabase } from '@/lib/server/supabase';
import { json, empty, optionsResponse } from '@/lib/server/cors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MIN_DWELL_MS = 900;
const MAX_FOCUS_RATIO_SLACK = 1.05;

export function OPTIONS() {
  return optionsResponse();
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as EventBody | null;

  if (!body?.type || !body.token || !body.publisherId || !body.slotId) {
    return json({ error: 'missing fields' }, 400);
  }

  const { valid, adId, nonce, exp } = verifyToken(body.token, body.publisherId, body.slotId);
  if (!valid || adId !== body.adId) {
    console.warn('[events] rejected invalid/forged token', body);
    return json({ error: 'invalid token' }, 403);
  }

  if (body.type === 'impression') {
    const dwellOk = (body.dwellMs ?? 0) >= MIN_DWELL_MS;
    const focusOk = (body.focusRatio ?? 0) <= MAX_FOCUS_RATIO_SLACK;
    if (!dwellOk || !focusOk) {
      console.warn('[events] rejected: implausible dwell/focus', {
        dwellMs: body.dwellMs,
        focusRatio: body.focusRatio,
      });
      return json({ error: 'implausible view signal' }, 403);
    }

    // Atomic replay protection: primary-key conflict means the token was already used.
    const { error: nonceErr } = await supabase
      .from('used_nonces')
      .insert({ nonce: nonce!, expires_at: new Date(exp!).toISOString() });

    if (nonceErr) {
      if (nonceErr.code === '23505') return json({ error: 'token already used' }, 409);
      console.error('[nonce]', nonceErr);
      return json({ error: 'server error' }, 500);
    }

    // Awaited: serverless may freeze the function after the response is sent.
    const { error: creditErr } = await supabase.rpc('credit_impression', {
  p_publisher: body.publisherId,
  p_campaign: adId,
});
if (creditErr) console.error('[credit]', creditErr);

const { error: statErr } = await supabase.rpc('record_event', { p_campaign: adId, p_type: 'impression' });
if (statErr) console.error('[stats]', statErr);

  }

  if (body.type === 'click') {
  const { error: statErr } = await supabase.rpc('record_event', { p_campaign: adId, p_type: 'click' });
  if (statErr) console.error('[stats]', statErr);
}

  return empty(200);
}