import crypto from 'crypto';

// MVP-only secret. Move to env/KMS before anything resembling production.
const SECRET = process.env.TOKEN_SECRET ?? 'dev-secret-change-me';

/**
 * Signs (adId, publisherId, slotId) so a later /v1/events call can prove
 * "this event belongs to an ad we actually served" rather than being forged.
 * Real version should also bind an expiry and a per-request nonce.
 */
export function signToken(adId: string, publisherId: string, slotId: string): string {
  const payload = `${adId}.${publisherId}.${slotId}`;
  const sig = crypto.createHmac('sha256', SECRET).update(payload).digest('hex');
  return `${payload}.${sig}`;
}

export function verifyToken(token: string, publisherId: string, slotId: string): { valid: boolean; adId?: string } {
  const parts = token.split('.');
  if (parts.length !== 4) return { valid: false };
  const [adId, pub, slot, sig] = parts;
  if (pub !== publisherId || slot !== slotId) return { valid: false };
  const expected = crypto.createHmac('sha256', SECRET).update(`${adId}.${pub}.${slot}`).digest('hex');
  const ok = crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  return ok ? { valid: true, adId } : { valid: false };
}