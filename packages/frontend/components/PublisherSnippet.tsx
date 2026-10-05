"use client";
import { useEffect, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { getPublisherId } from "@/lib/onchain";
import AdPreview, { THEMES, FONTS, type ThemeName, type FontName } from "@/components/AdPreview";
import { Copy, Check } from "lucide-react";

const sample = {
  brand: "Acme Finance",
  headline: "Earn 8% on idle USDC",
  body: "Non-custodial yield, withdraw anytime.",
  cta: "Learn more",
};

export default function PublisherSnippet() {
  const { authenticated, getAccessToken } = usePrivy();
  const [id, setId] = useState<string | null>(null);
  const [preset, setPreset] = useState<ThemeName>("light");
  const [accent, setAccent] = useState<string>(""); // "" = preset default
  const [font, setFont] = useState<FontName>("inherit");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!authenticated) return;
    getAccessToken().then((t) => t && getPublisherId(t)).then((v) => setId(v ?? null));
  }, [authenticated, getAccessToken]);

  if (!id) return null;

  const attrs = [
    `data-theme="${preset}"`,
    accent && `data-accent="${accent}"`,
    font !== "inherit" && `data-font="${font}"`,
  ].filter(Boolean).join(" ");
  const snippet =
`<script src="https://cdn.springbox.dev/web3ads.min.js" data-publisher-id="${id}" data-api-url="https://springbox.dev" async></script>
<div data-w3ads-slot="my-slot-1" data-width="300" data-height="250" ${attrs}></div>`;

  return (
    <div className="mt-6 min-w-0 max-w-full rounded-3xl border border-line bg-surface p-6">
      <p className="mb-3 font-medium">Customize your ad</p>

      <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
        {(Object.keys(THEMES) as ThemeName[]).map((t) => (
          <button key={t} onClick={() => { setPreset(t); setAccent(""); }}
            className={`rounded-full px-3 py-1 capitalize ${preset === t ? "bg-ink text-white" : "border border-line text-muted"}`}>
            {t}
          </button>
        ))}
        <label className="ml-2 flex items-center gap-2 text-muted">
          Accent
          <input type="color" value={accent || THEMES[preset].accent} onChange={(e) => setAccent(e.target.value)} />
        </label>
        {accent && <button onClick={() => setAccent("")} className="text-xs underline">Reset</button>}
        <label className="ml-2 flex items-center gap-2 text-muted">
          Font
          <select value={font} onChange={(e) => setFont(e.target.value as FontName)}
            className="rounded-md border border-line bg-surface px-2 py-1 text-sm capitalize text-ink">
            {(Object.keys(FONTS) as FontName[]).map((f) => (
              <option key={f} value={f}>{f === "inherit" ? "Match my site" : f}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="mb-4 rounded-xl bg-canvas p-4">
        <p className="mb-3 text-xs text-muted">Lorem ipsum, Lorem ipsum, Lorem ipsum, Lorem ipsum Lorem ipsum Lorem ipsum, Lorem ipsum.</p>
        <div className="flex justify-center"><AdPreview native={sample} preset={preset} accent={accent || undefined} font={font} /></div>
        <p className="mt-3 text-xs text-muted">Lorem ipsum, Lorem ipsum, Lorem ipsum.</p>
      </div>

      <p className="mb-2 font-medium">Your embed snippet</p>
      <pre className="whitespace-pre-wrap break-all rounded-xl bg-canvas p-3 font-mono text-xs">{snippet}</pre>
      <button
  onClick={() => {
    navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }}
  className="mt-3"
  aria-label={copied ? "Copied" : "Copy"}
>
  {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
</button>
    </div>
  );
}