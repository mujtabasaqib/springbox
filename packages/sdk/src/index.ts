import { mountSlot } from './slot';
import type { FontName, ResolvedConfig, SdkConfig, SlotHandle, SlotOptions, ThemeName } from './types';
import { log, resolveConfig } from './utils';

export type { AdCreative, AdTheme, FontName, NativeContent, SdkConfig, SlotHandle, SlotOptions, ThemeName } from './types';
export { connectWallet } from './wallet';
export { renderNativeAd, THEMES, FONTS, resolveTheme } from './native';

let config: ResolvedConfig | null = null;
const handles = new Map<HTMLElement, SlotHandle>();

/** Initialise the SDK once per page. */
export function init(c: SdkConfig): void {
  config = resolveConfig(c);
  log(config, 'initialised', config.publisherId);
}

/** Mount one ad slot into an element (or CSS selector). */
export function mount(target: string | HTMLElement, opts: SlotOptions): SlotHandle {
  if (!config) throw new Error('[web3ads] call init() first');
  const el = typeof target === 'string' ? document.querySelector<HTMLElement>(target) : target;
  if (!el) throw new Error(`[web3ads] target not found: ${String(target)}`);
  handles.get(el)?.destroy();
  const h = mountSlot(config, el, opts);
  handles.set(el, h);
  return h;
}

/**
 * Find every <div data-w3ads-slot="slot-id" data-width="300" data-height="250">
 * and mount it. Safe to call repeatedly (e.g. after SPA route changes).
 */
export function scan(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>('[data-w3ads-slot]').forEach((el) => {
    if (handles.has(el)) return;
    mount(el, {
  slotId: el.dataset.w3adsSlot!,
  width: el.dataset.width ? Number(el.dataset.width) : undefined,
  height: el.dataset.height ? Number(el.dataset.height) : undefined,
  theme: {
    preset: el.dataset.theme as ThemeName | undefined,
    accent: el.dataset.accent,
    bg: el.dataset.bg,
    font: el.dataset.font as FontName | undefined,
  },
});
  });
}

export function destroy(): void {
  handles.forEach((h) => h.destroy());
  handles.clear();
}