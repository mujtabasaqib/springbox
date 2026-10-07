//components/CreateCampaignDialog.tsx
"use client";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { uploadCreative } from "@/lib/uploadCreative";
import { usePrivy } from "@privy-io/react-auth";
import AdPreview from "@/components/AdPreview";

const steps = ["Details", "Budget", "Creative", "Review"];
const categories = ["defi", "marketing", "gaming", "nft", "infra", "general", "rwa", "tradfi", "cards", "payments", "stablecoins", "marketplace"];
const ctaPresets = ["Learn more", "Sign up", "Buy now", "Trade", "Get started"];

export default function CreateCampaignDialog() {
   const { getAccessToken } = usePrivy(); 
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [form, setForm] = useState({ title: "", category: "defi", budget: "", cpm: "", clickUrl: "" });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm({ ...form, [k]: e.target.value });
  const reset = () => { setStep(0); setError(null); setImageFile(null); setForm({ title: "", category: "defi", budget: "", cpm: "", clickUrl: "" }); setCreativeType("native"); setNative({ brand: "", headline: "", body: "", cta: "Learn more" }); };
  const [creativeType, setCreativeType] = useState<"image" | "native">("native");
const [native, setNative] = useState({ brand: "", headline: "", body: "", cta: "Learn more" });
const setN = (k: keyof typeof native) => (e: React.ChangeEvent<HTMLInputElement>) =>
  setNative({ ...native, [k]: e.target.value });

  const submit = async () => {
  const token = await getAccessToken();
  if (creativeType === "image" && !imageFile) { setError("Please choose an image"); return; }
  if (creativeType === "native" && (!native.brand.trim() || !native.headline.trim() || !native.cta.trim())) {
    setError("Brand, headline and CTA are required"); return;
  }
  setLoading(true);
  setError(null);
  try {
    const payload =
      creativeType === "native"
        ? { ...form, creativeType: "native", native }
        : { ...form, creativeType: "image", imageUrl: await uploadCreative(imageFile!) };
    const res = await fetch(`/v1/campaigns`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Failed to create campaign");
    setOpen(false);
    reset();
    window.location.reload();
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

    <DialogContent className="flex max-h-[90vh] flex-col rounded-3xl">
      <DialogHeader>
        <DialogTitle className="display text-2xl">{steps[step]}</DialogTitle>
      </DialogHeader>

      {/* Scrollable form area */}
      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        {step === 0 && (
          <div className="space-y-4">
            <div>
              <Label>Campaign title</Label>
              <Input value={form.title} onChange={set("title")} placeholder="e.g. Winter yield push" />
            </div>
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
            <div>
              <Label>Total budget (USDC)</Label>
              <Input type="number" value={form.budget} onChange={set("budget")} placeholder="10" />
            </div>
            <div>
              <Label>Payout per 1,000 views (USDC)</Label>
              <Input type="number" value={form.cpm} onChange={set("cpm")} placeholder="5" />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="flex gap-2 text-sm">
              {(["native", "image"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setCreativeType(t)}
                  className={`rounded-full px-4 py-1.5 font-medium ${creativeType === t ? "bg-ink text-white" : "border border-line text-muted"}`}
                >
                  {t === "native" ? "Native ad" : "Image ad"}
                </button>
              ))}
            </div>

            {creativeType === "image" ? (
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
            ) : (
              <>
                <div>
                  <Label>Brand name</Label>
                  <Input maxLength={25} value={native.brand} onChange={setN("brand")} placeholder="Acme Finance" />
                </div>
                <div>
                  <Label>Headline</Label>
                  <Input maxLength={50} value={native.headline} onChange={setN("headline")} placeholder="Earn 8% on idle USDC" />
                </div>
                <div>
                  <Label>Body (optional)</Label>
                  <Input maxLength={100} value={native.body} onChange={setN("body")} placeholder="One short supporting line" />
                </div>
                <div>
                  <Label>Button text</Label>
                  <Input maxLength={20} list="cta-presets" value={native.cta} onChange={setN("cta")} />
                  <datalist id="cta-presets">
                    {ctaPresets.map((c) => <option key={c} value={c} />)}
                  </datalist>
                </div>
                <div className="flex justify-center">
                  <AdPreview native={native} />
                </div>
              </>
            )}

            <div>
              <Label>Click-through URL</Label>
              <Input value={form.clickUrl} onChange={set("clickUrl")} placeholder="https://..." />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-2 text-sm">
            <p><span className="text-muted">Title</span> — {form.title || "—"}</p>
            <p><span className="text-muted">Category</span> — {form.category}</p>
            <p><span className="text-muted">Budget</span> — ${form.budget || "0"}</p>
            <p><span className="text-muted">CPM</span> — ${form.cpm || "0"}</p>
            <p>
              <span className="text-muted">Creative</span> —{" "}
              {creativeType === "native"
                ? `${native.brand || "—"}: ${native.headline || "—"}`
                : imageFile?.name || "not selected"}
            </p>
            <p className="text-muted">This creates a draft. Fund it to make it live.</p>
            {error && <p className="text-red-600">{error}</p>}
          </div>
        )}
      </div>

      {/* Pinned footer */}
      <div className="mt-6 flex shrink-0 justify-between">
        <button
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
          className="text-sm font-medium text-muted disabled:opacity-0"
        >
          Back
        </button>
        {step < 3 ? (
          <button onClick={() => setStep((s) => s + 1)} className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white">
            Next
          </button>
        ) : (
          <button onClick={submit} disabled={loading} className="rounded-full bg-brand-a px-5 py-2.5 text-sm font-semibold disabled:opacity-50">
            {loading ? "Launching…" : "Launch campaign"}
          </button>
        )}
      </div>
    </DialogContent>
  </Dialog>
);
}