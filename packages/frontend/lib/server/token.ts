import crypto from 'crypto';

const SECRET =
  process.env.TOKEN_SECRET ??
  (process.env.NODE_ENV === 'production'
    ? (() => { throw new Error('TOKEN_SECRET is not set'); })()
    : 'dev-secret-change-me');

/**
 * Signs (adId, publisherId, slotId) so a later /v1/events call can prove
 * "this event belongs to an ad we actually served" rather than being forged.
 */
export function signToken(adId: string, publisherId: string, slotId: string): string {
  const nonce = crypto.randomBytes(12).toString('hex');
  const exp = Date.now() + 10 * 60 * 1000;
  const payload = `${adId}.${publisherId}.${slotId}.${nonce}.${exp}`;
  const sig = crypto.createHmac('sha256', SECRET).update(payload).digest('hex');
  return `${payload}.${sig}`;
}

export function verifyToken(token: string, publisherId: string, slotId: string):
  { valid: boolean; adId?: string; nonce?: string; exp?: number } {
  const parts = token.split('.');
  if (parts.length !== 6) return { valid: false };
  const [adId, pub, slot, nonce, expStr, sig] = parts;
  if (pub !== publisherId || slot !== slotId) return { valid: false };
  const exp = Number(expStr);
  if (!(exp >= Date.now())) return { valid: false };
  const expected = crypto.createHmac('sha256', SECRET)
    .update(`${adId}.${pub}.${slot}.${nonce}.${expStr}`).digest('hex');
  if (sig.length !== expected.length) return { valid: false };
  const ok = crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  return ok ? { valid: true, adId, nonce, exp } : { valid: false };
}