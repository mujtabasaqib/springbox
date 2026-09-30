//components/CreateCampaignDialog.tsx
"use client";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { uploadCreative } from "@/lib/uploadCreative";
import { usePrivy } from "@privy-io/react-auth";

const steps = ["Details", "Budget", "Creative", "Review"];
const categories = ["defi", "gaming", "nft", "infra"];

export default function CreateCampaignDialog() {
   const { getAccessToken } = usePrivy(); 
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [form, setForm] = useState({ title: "", category: "defi", budget: "", cpm: "", clickUrl: "" });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm({ ...form, [k]: e.target.value });
  const reset = () => { setStep(0); setError(null); setImageFile(null); setForm({ title: "", category: "defi", budget: "", cpm: "", clickUrl: "" }); };

  const submit = async () => {
    const token = await getAccessToken();
    if (!imageFile) { setError("Please choose an image"); return; }
    setLoading(true);
    setError(null);
    try {
      const imageUrl = await uploadCreative(imageFile);
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/v1/campaigns`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...form, imageUrl }),
      });
      if (!res.ok) throw new Error("Failed to create campaign");
      setOpen(false);
      reset();
      window.location.reload(); // TODO: refetch list instead, once list reads live
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger className="rounded-full bg-brand-a px-6 py-3 text-sm font-semibold">
        Create campaign
      </DialogTrigger>
      <DialogContent className="rounded-3xl">
        <DialogHeader><DialogTitle className="display text-2xl">{steps[step]}</DialogTitle></DialogHeader>

        {step === 0 && (
          <div className="space-y-4">
            <div><Label>Campaign title</Label><Input value={form.title} onChange={set("title")} placeholder="e.g. Winter yield push" /></div>
            <div>
              <Label>Category</Label>
              <select value={form.category} onChange={set("category")} className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm">
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
        )}
        {step === 1 && (
          <div className="space-y-4">
            <div><Label>Total budget (USDC)</Label><Input type="number" value={form.budget} onChange={set("budget")} placeholder="20000" /></div>
            <div><Label>Payout per 1,000 views (USDC)</Label><Input type="number" value={form.cpm} onChange={set("cpm")} placeholder="5" /></div>
          </div>
        )}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <Label>Ad image (PNG/JPG/WEBP, max 1MB)</Label>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
                className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm"
              />
              {imageFile && <p className="mt-1 text-xs text-muted">{imageFile.name}</p>}
            </div>
            <div><Label>Click-through URL</Label><Input value={form.clickUrl} onChange={set("clickUrl")} placeholder="https://..." /></div>
          </div>
        )}
        {step === 3 && (
          <div className="space-y-2 text-sm">
            <p><span className="text-muted">Title</span> — {form.title || "—"}</p>
            <p><span className="text-muted">Category</span> — {form.category}</p>
            <p><span className="text-muted">Budget</span> — ${form.budget || "0"}</p>
            <p><span className="text-muted">CPM</span> — ${form.cpm || "0"}</p>
            <p><span className="text-muted">Image</span> — {imageFile?.name || "not selected"}</p>
            <p className="text-muted">This creates a draft. Fund it to make it live.</p>
            {error && <p className="text-red-600">{error}</p>}
          </div>
        )}

        <div className="mt-6 flex justify-between">
          <button onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0} className="text-sm font-medium text-muted disabled:opacity-0">Back</button>
          {step < 3 ? (
            <button onClick={() => setStep((s) => s + 1)} className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white">Next</button>
          ) : (
            <button onClick={submit} disabled={loading} className="rounded-full bg-brand-a px-5 py-2.5 text-sm font-semibold disabled:opacity-50">
              {loading ? "Uploading…" : "Launch campaign"}
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}