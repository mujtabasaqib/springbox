// lib/uploadCreative.ts
import { supabase } from "@/lib/supabase";

const MAX_BYTES = 1_000_000_000; // 10MB
const ALLOWED = ["image/png", "image/jpeg", "image/webp"];

export async function uploadCreative(file: File): Promise<string> {
  if (!ALLOWED.includes(file.type)) throw new Error("Only PNG, JPG, or WEBP allowed");
  if (file.size > MAX_BYTES) throw new Error("Image must be under 10MB");

  const ext = file.name.split(".").pop();
  const path = `${crypto.randomUUID()}.${ext}`; // random name avoids collisions

  const { error } = await supabase.storage.from("campaign-creatives").upload(path, file);
  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from("campaign-creatives").getPublicUrl(path);
  return data.publicUrl;
}