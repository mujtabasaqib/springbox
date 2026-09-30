// lib/supabase.ts
import { createClient } from "@supabase/supabase-js";

// Anon key only — safe for the browser, RLS controls what it can read.
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);