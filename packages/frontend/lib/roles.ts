//lib/roles.ts
export async function getMyRole(token: string): Promise<"advertiser" | "creator" | "user" | null> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/v1/profiles/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  return data.role ?? null;
}

export async function setMyRole(token: string, role: "advertiser" | "creator") {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/v1/profiles/ensure`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ role }),
  });
  const data = await res.json();
  return data.role as "advertiser" | "creator";
}