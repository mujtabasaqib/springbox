import { pickAd } from '@/lib/server/ads';
import { signToken } from '@/lib/server/token';
import type { AdRequestBody } from '@/lib/server/types';
import { json, empty, optionsResponse } from '@/lib/server/cors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function OPTIONS() {
  return optionsResponse();
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as AdRequestBody | null;
  const { publisherId, slotId } = body ?? ({} as Partial<AdRequestBody>);
  if (!publisherId || !slotId) {
    return json({ error: 'publisherId and slotId are required' }, 400);
  }

  const ad = await pickAd();
  if (!ad) return empty(204);

  const token = signToken(ad.adId, publisherId, slotId);
  return json({ ad: { ...ad, token } });
}