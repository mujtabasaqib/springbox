export type RewardState = {
  views: number; members: number; unlockAt: number; unlocked: boolean;
  share: number; claimed: boolean; claimedAmount: number | null;
};

const call = async (path: string, token: string, method = "GET") => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/v1/rewards/${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Something went wrong");
  return data;
};

export const getRewards = (token: string): Promise<RewardState> => call("me", token);
export const claimRewards = (token: string) => call("claim", token, "POST");