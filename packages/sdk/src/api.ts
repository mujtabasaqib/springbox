import type { AdCreative, EventType, ResolvedConfig, BotSignals } from './types';

export async function requestAd(
  cfg: ResolvedConfig,
  slot: { slotId: string; width?: number; height?: number },
): Promise<AdCreative | null> {
  const res = await fetch(`${cfg.apiUrl}/v1/ads/request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      publisherId: cfg.publisherId,
      slotId: slot.slotId,
      width: slot.width,
      height: slot.height,
      page: location.href,
      ts: Date.now(),
    }),
  });
  if (res.status === 204) return null; // no fill
  if (!res.ok) throw new Error(`Ad request failed: ${res.status}`);
  const data = (await res.json()) as { ad: AdCreative | null };
  return data.ad;
}

export function sendEvent(
  cfg: ResolvedConfig,
  type: EventType,
  ad: AdCreative,
  slotId: string,
  bot?: BotSignals, // only impressions attach this today; click stays unverified by design
) {
  const url = `${cfg.apiUrl}/v1/events`;
  const body = JSON.stringify({
    type,
    adId: ad.adId,
    campaignId: ad.campaignId,
    token: ad.token,
    publisherId: cfg.publisherId,
    slotId,
    ts: Date.now(),
    // The SDK only reports these; it never decides whether they're good enough.
    dwellMs: bot?.dwellMs,
    focusRatio: bot?.focusRatio,
  });

  // keepalive lets the request finish even if the page is closing (clicks open a new tab,
  // and impressions can fire right before a navigation). Plain JSON avoids the CORS problems
  // sendBeacon has with credentialed requests and a wildcard Access-Control-Allow-Origin.
  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => {
    // Event reporting must never break the host page, so failures are swallowed.
  });
}