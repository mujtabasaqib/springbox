// components/AdPreview.tsx
// Mirrors packages/sdk/src/native.ts. THEMES, FONTS and styles in sync.
"use client";
import type { CSSProperties } from "react";

export type ThemeName = "light" | "dark" | "minimal" | "midnight" | "brutalist";

export type FontName = "inherit" | "sans" | "serif" | "mono" | "humanist" | "rounded" | "geometric" | "classic";

export const THEMES: Record<ThemeName, { bg: string; text: string; accent: string; border: string; radius: string }> = {
  light:     { bg: "#ffffff", text: "#111827", accent: "#2563eb", border: "#e5e7eb", radius: "8px" },
  dark:      { bg: "#111827", text: "#f9fafb", accent: "#8b5cf6", border: "#374151", radius: "8px" },
  minimal:   { bg: "#fafafa", text: "#222222", accent: "#222222", border: "#eeeeee", radius: "2px" },
  midnight:  { bg: "#0b1020", text: "#e5e9f5", accent: "#22d3ee", border: "#1e2a4a", radius: "12px" },
  brutalist: { bg: "#fffbe6", text: "#000000", accent: "#ff3b30", border: "#000000", radius: "0px" },
};

export const FONTS: Record<FontName, string> = {
  inherit:   "inherit",
  sans:      'system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif',
  serif:     'Georgia,Cambria,"Times New Roman",Times,serif',
  mono:      'ui-monospace,SFMono-Regular,Menlo,Consolas,"Liberation Mono",monospace',
  humanist:  'Seravek,"Gill Sans Nova",Ubuntu,Calibri,"DejaVu Sans",source-sans-pro,sans-serif',
  rounded:   'ui-rounded,"Hiragino Maru Gothic ProN",Quicksand,Comfortaa,Manjari,"Arial Rounded MT","Arial Rounded MT Bold",Calibri,source-sans-pro,sans-serif',
  geometric: 'Avenir,Montserrat,Corbel,"URW Gothic",source-sans-pro,sans-serif',
  classic:   '"Iowan Old Style","Palatino Linotype",Palatino,"URW Palladio L",P052,serif',
};

export type NativeContent = { brand: string; headline: string; body?: string; cta: string };

const HEX = /^#[0-9a-f]{6}$/i;

function onColor(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r!) + 0.7152 * lin(g!) + 0.0722 * lin(b!) > 0.4 ? "#111111" : "#ffffff";
}

const clamp = (n: number): CSSProperties => ({
  display: "-webkit-box", WebkitLineClamp: n, WebkitBoxOrient: "vertical",
  overflow: "hidden", overflowWrap: "anywhere",
});

export default function AdPreview({
  native, preset = "light", accent, font = "inherit",
}: { native: NativeContent; preset?: ThemeName; accent?: string; font?: FontName }) {
  const t = THEMES[preset];
  const acc = accent && HEX.test(accent) ? accent : t.accent;
  const on = onColor(acc);

  return (
    <div style={{
      display: "flex", flexDirection: "column", boxSizing: "border-box", width: 300, height: 250,
      padding: 14, background: t.bg, color: t.text, border: `1px solid ${t.border}`,
      borderRadius: t.radius, overflow: "hidden", fontFamily: FONTS[font] ?? "inherit",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 600, flex: 1, minWidth: 0, overflow: "hidden",
          textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{native.brand || "Brand"}</div>
        <span style={{ fontSize: 10, border: `1px solid ${t.border}`, padding: "1px 5px",
          borderRadius: 3, opacity: 0.8, flex: "none" }}>Ad</span>
      </div>
      <div style={{ marginTop: 12, fontSize: 18, fontWeight: 700, lineHeight: 1.25, ...clamp(2) }}>
        {native.headline || "Your headline"}
      </div>
      {native.body && (
        <div style={{ marginTop: 8, fontSize: 13, lineHeight: 1.4, opacity: 0.85, ...clamp(3) }}>{native.body}</div>
      )}
      <div style={{ marginTop: "auto", textAlign: "center", padding: 10, fontWeight: 600, fontSize: 14,
        background: acc, color: on, borderRadius: t.radius, whiteSpace: "nowrap",
        overflow: "hidden", textOverflow: "ellipsis" }}>{native.cta || "Learn more"}</div>
    </div>
  );
}