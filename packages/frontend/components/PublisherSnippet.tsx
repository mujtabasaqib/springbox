"use client";
import { useEffect, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { getPublisherId } from "@/lib/onchain";

export default function PublisherSnippet() {
  const { authenticated, getAccessToken } = usePrivy();
  const [id, setId] = useState<string | null>(null);

  useEffect(() => {
    if (!authenticated) return;
    getAccessToken().then((t) => t && getPublisherId(t)).then((v) => setId(v ?? null));
  }, [authenticated, getAccessToken]);

  if (!id) return null;
  const snippet = `<script src="https://YOUR_CDN/web3ads.min.js" data-publisher-id="${id}" data-api-url="${process.env.NEXT_PUBLIC_BACKEND_URL}" async></script>`;

  return (
    <div className="mt-6 min-w-0 max-w-full rounded-3xl border border-line bg-surface p-6">
  <p className="mb-2 font-medium">Your embed snippet</p>
  <pre className="whitespace-pre-wrap break-all rounded-xl bg-canvas p-3 font-mono text-xs">{snippet}</pre>
  <button onClick={() => navigator.clipboard.writeText(snippet)} className="mt-3 text-sm font-semibold underline">Copy</button>
</div>
  );
}