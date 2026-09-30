import { requestAd, sendEvent } from './api';
import type { BotSignals, ResolvedConfig, SlotHandle, SlotOptions } from './types';
import { isSafeUrl, log } from './utils';

const VIEW_THRESHOLD = 0.5; // 50% of pixels visible...
const VIEW_MS = 1000; // ...for 1 continuous second (IAB-style viewability)

export function mountSlot(cfg: ResolvedConfig, el: HTMLElement, opts: SlotOptions): SlotHandle {
  let destroyed = false;
  let observer: IntersectionObserver | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;

  // --- Dwell-time / focus tracking -----------------------------------------
  // v1 bot-verification layer: no Turnstile yet (see turnstile.ts, unused for now).
  const slotCreatedAt = Date.now();
  let dwellMs = 0;
  let dwellSince: number | null = null;
  let isIntersecting = false;

  function tabIsForeground(): boolean {
    return document.visibilityState === 'visible' && document.hasFocus();
  }

  function updateDwellAccrual() {
    const shouldAccrue = isIntersecting && tabIsForeground();
    if (shouldAccrue && dwellSince === null) {
      dwellSince = Date.now();
    } else if (!shouldAccrue && dwellSince !== null) {
      dwellMs += Date.now() - dwellSince;
      dwellSince = null;
    }
  }

  function currentDwellMs(): number {
    return dwellSince !== null ? dwellMs + (Date.now() - dwellSince) : dwellMs;
  }

  function botSignals(): BotSignals {
    const dwell = currentDwellMs();
    const elapsed = Math.max(1, Date.now() - slotCreatedAt);
    return {
      dwellMs: dwell,
      focusRatio: Math.min(1, dwell / elapsed),
    };
  }

  const onVisibilityChange = () => updateDwellAccrual();
  const onFocus = () => updateDwellAccrual();
  const onBlur = () => updateDwellAccrual();
  document.addEventListener('visibilitychange', onVisibilityChange);
  window.addEventListener('focus', onFocus);
  window.addEventListener('blur', onBlur);

  const root = el.shadowRoot ?? el.attachShadow({ mode: 'open' });
  root.innerHTML = '';

  (async () => {
    try {
      const ad = await requestAd(cfg, opts);
      if (destroyed) return;
      if (!ad) return opts.onEmpty?.();
      if (!isSafeUrl(ad.imageUrl) || !isSafeUrl(ad.clickUrl)) {
        throw new Error('Ad rejected: unsafe URL');
      }

      const a = document.createElement('a');
      a.href = ad.clickUrl;
      a.target = '_blank';
      a.rel = 'noopener noreferrer sponsored';
      a.style.cssText = 'display:inline-block;position:relative;line-height:0;';

      const img = document.createElement('img');
      img.src = ad.imageUrl;
      img.alt = ad.title ?? 'Advertisement';
      img.width = opts.width ?? ad.width;
      img.height = opts.height ?? ad.height;
      img.style.cssText = 'display:block;max-width:100%;height:auto;';

      const badge = document.createElement('span');
      badge.textContent = 'Ad';
      badge.style.cssText =
        'position:absolute;top:2px;right:2px;font:10px sans-serif;background:#0008;color:#fff;padding:1px 4px;border-radius:2px;';

      a.append(img, badge);
      root.append(a);
      opts.onLoad?.(ad);

      a.addEventListener('click', () => {
        sendEvent(cfg, 'click', ad, opts.slotId);
        opts.onClick?.(ad);
      });

      let fired = false;
      observer = new IntersectionObserver(
        ([entry]) => {
          if (!entry || fired) return;
          isIntersecting = entry.intersectionRatio >= VIEW_THRESHOLD;
          updateDwellAccrual();

          if (isIntersecting) {
            timer = setTimeout(() => {
              fired = true;
              observer?.disconnect();
              sendEvent(cfg, 'impression', ad, opts.slotId, botSignals());
              opts.onImpression?.(ad);
              log(cfg, 'impression', opts.slotId, ad.adId, botSignals());
            }, VIEW_MS);
          } else if (timer) {
            clearTimeout(timer);
            timer = undefined;
          }
        },
        { threshold: [0, VIEW_THRESHOLD, 1] },
      );
      observer.observe(a);
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      log(cfg, 'error', err);
      opts.onError?.(err);
    }
  })();

  return {
    destroy() {
      destroyed = true;
      observer?.disconnect();
      if (timer) clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('blur', onBlur);
      root.innerHTML = '';
    },
  };
}