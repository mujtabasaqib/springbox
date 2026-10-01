import type { AdCreative, AdTheme, FontName, ThemeName } from './types';

interface Tokens { bg: string; text: string; accent: string; border: string; radius: string }

export const THEMES: Record<ThemeName, Tokens> = {
  light:     { bg: '#ffffff', text: '#111827', accent: '#2563eb', border: '#e5e7eb', radius: '8px' },
  dark:      { bg: '#111827', text: '#f9fafb', accent: '#8b5cf6', border: '#374151', radius: '8px' },
  minimal:   { bg: '#fafafa', text: '#222222', accent: '#222222', border: '#eeeeee', radius: '2px' },
  midnight:  { bg: '#0b1020', text: '#e5e9f5', accent: '#22d3ee', border: '#1e2a4a', radius: '12px' },
  brutalist: { bg: '#fffbe6', text: '#000000', accent: '#ff3b30', border: '#000000', radius: '0px' },
};

export const FONTS: Record<FontName, string> = {
  inherit:   'inherit',
  sans:      'system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif',
  serif:     'Georgia,Cambria,"Times New Roman",Times,serif',
  mono:      'ui-monospace,SFMono-Regular,Menlo,Consolas,"Liberation Mono",monospace',
  humanist:  'Seravek,"Gill Sans Nova",Ubuntu,Calibri,"DejaVu Sans",source-sans-pro,sans-serif',
  rounded:   'ui-rounded,"Hiragino Maru Gothic ProN",Quicksand,Comfortaa,Manjari,"Arial Rounded MT","Arial Rounded MT Bold",Calibri,source-sans-pro,sans-serif',
  geometric: 'Avenir,Montserrat,Corbel,"URW Gothic",source-sans-pro,sans-serif',
  classic:   '"Iowan Old Style","Palatino Linotype",Palatino,"URW Palladio L",P052,serif',
};

const HEX = /^#[0-9a-f]{6}$/i;

function onColor(hex: string): string {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const L = 0.2126 * lin(r!) + 0.7152 * lin(g!) + 0.0722 * lin(b!);
  return L > 0.4 ? '#111111' : '#ffffff';
}

export function resolveTheme(t?: AdTheme): Tokens {
  const base = THEMES[t?.preset ?? 'light'] ?? THEMES.light;
  return {
    ...base,
    accent: t?.accent && HEX.test(t.accent) ? t.accent : base.accent,
    bg: t?.bg && HEX.test(t.bg) ? t.bg : base.bg,
  };
}

const CSS = `
a{display:flex;flex-direction:column;box-sizing:border-box;width:300px;height:250px;padding:14px;
  background:var(--ad-bg);color:var(--ad-text);border:1px solid var(--ad-border);
  border-radius:var(--ad-radius);text-decoration:none;font-family:var(--ad-font);overflow:hidden}
.row{display:flex;align-items:center;gap:8px}
.brand{font-size:13px;font-weight:600;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.tag{font-size:10px;border:1px solid var(--ad-border);padding:1px 5px;border-radius:3px;opacity:.8;flex:none}
.h{margin-top:12px;font-size:18px;font-weight:700;line-height:1.25;overflow-wrap:anywhere;
  display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.b{margin-top:8px;font-size:13px;line-height:1.4;opacity:.85;overflow-wrap:anywhere;
  display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.cta{margin-top:auto;text-align:center;padding:10px;font-weight:600;font-size:14px;
  background:var(--ad-accent);color:var(--ad-on);border-radius:var(--ad-radius);
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
`;

function el(tag: string, cls: string, text?: string) {
  const e = document.createElement(tag);
  e.className = cls;
  if (text !== undefined) e.textContent = text; // textContent only, never innerHTML
  return e;
}

/** Renders a native ad into `root` and returns the anchor (for click + viewability wiring). */
export function renderNativeAd(root: ShadowRoot, ad: AdCreative, theme?: AdTheme): HTMLAnchorElement {
  const n = ad.native!;
  const tk = resolveTheme(theme);

  const style = document.createElement('style');
  style.textContent = CSS;

  const a = document.createElement('a');
  a.href = ad.clickUrl;
  a.target = '_blank';
  a.rel = 'noopener noreferrer sponsored';
  a.style.setProperty('--ad-bg', tk.bg);
  a.style.setProperty('--ad-text', tk.text);
  a.style.setProperty('--ad-accent', tk.accent);
  a.style.setProperty('--ad-border', tk.border);
  a.style.setProperty('--ad-radius', tk.radius);
  a.style.setProperty('--ad-on', onColor(tk.accent));
  a.style.setProperty('--ad-font', FONTS[theme?.font ?? 'inherit'] ?? 'inherit');

  const row = el('div', 'row');
  row.append(el('div', 'brand', n.brand), el('span', 'tag', 'Ad'));
  a.append(row, el('div', 'h', n.headline));
  if (n.body) a.append(el('div', 'b', n.body));
  a.append(el('div', 'cta', n.cta));

  root.append(style, a);
  return a;
}