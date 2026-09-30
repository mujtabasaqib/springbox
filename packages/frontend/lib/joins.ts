// lib/joins.ts
export async function joinCampaign(token: string, campaignId: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/v1/campaigns/${campaignId}/join`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error((await res.json()).error ?? "Failed to join campaign");
  return res.json();
}