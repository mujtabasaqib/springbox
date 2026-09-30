import type { ResolvedConfig, SdkConfig } from './types';

export const DEFAULT_API_URL = 'https://api.example-web3ads.xyz';

export function resolveConfig(c: SdkConfig): ResolvedConfig {
  if (!c || !c.publisherId) throw new Error('[web3ads] publisherId is required');
  return {
    publisherId: c.publisherId,
    apiUrl: (c.apiUrl ?? DEFAULT_API_URL).replace(/\/+$/, ''),
    debug: !!c.debug,
  };
}

/** Only allow http(s) URLs from the backend into the DOM (blocks javascript:, data:, etc). */
export function isSafeUrl(u: string): boolean {
  try {
    const p = new URL(u);
    return p.protocol === 'https:' || p.protocol === 'http:';
  } catch {
    return false;
  }
}

export function log(cfg: ResolvedConfig, ...args: unknown[]) {
  if (cfg.debug) console.log('[web3ads]', ...args);
}