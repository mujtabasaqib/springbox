//components/RolePicker.tsx
"use client";
import { useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { setMyRole } from "@/lib/roles";

export default function RolePicker({ onDone }: { onDone: (role: "advertiser" | "creator") => void }) {
  const { getAccessToken } = usePrivy();
  const [loading, setLoading] = useState(false);

  const choose = async (role: "advertiser" | "creator") => {
    setLoading(true);
    const token = await getAccessToken();
    if (!token) { setLoading(false); return; }
    const confirmed = await setMyRole(token, role);
    onDone(confirmed);
  };

  return (
    <div className="grid min-h-screen place-items-center p-6 text-center">
      <div>
        <h1 className="display text-3xl">How will you use this?</h1>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <button disabled={loading} onClick={() => choose("advertiser")} className="rounded-full bg-brand-a px-8 py-4 font-semibold disabled:opacity-50">
            I&apos;m an Advertiser
          </button>
          <button disabled={loading} onClick={() => choose("creator")} className="rounded-full border border-ink px-8 py-4 font-semibold disabled:opacity-50">
            I&apos;m a Creator
          </button>
        </div>
      </div>
    </div>
  );
}