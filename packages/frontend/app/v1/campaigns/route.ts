import { NextResponse } from 'next/server';
import { supabase } from '@/lib/server/supabase';
import { verifyPrivyToken } from '@/lib/server/privyAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const LIMITS = { brand: 25, headline: 50, body: 100, cta: 20 } as const;

function cleanNative(n: any) {
  if (!n || typeof n !== 'object') return null;
  const brand = String(n.brand ?? '').trim();
  const headline = String(n.headline ?? '').trim();
  const body = String(n.body ?? '').trim();
  const cta = String(n.cta ?? '').trim();
  if (!brand || !headline || !cta) return null;
  if (brand.length > LIMITS.brand || headline.length > LIMITS.headline ||
      body.length > LIMITS.body || cta.length > LIMITS.cta) return null;
  return { brand, headline, cta, ...(body ? { body } : {}) };
}

export async function POST(req: Request) {
  const userId = await verifyPrivyToken(req.headers.get('authorization'));
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const b = (await req.json().catch(() => null)) ?? {};
  const { title, category, budget, cpm, imageUrl, clickUrl, width, height, creativeType, native } = b;
  const isNative = creativeType === 'native';

  if (!title || !category || !budget || !cpm || !clickUrl) {
    return NextResponse.json({ error: 'missing required fields' }, { status: 400 });
  }

  let cleanedNative = null;
  if (isNative) {
    cleanedNative = cleanNative(native);
    if (!cleanedNative) return NextResponse.json({ error: 'invalid native creative' }, { status: 400 });
  } else if (!imageUrl) {
    return NextResponse.json({ error: 'missing required fields' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('campaigns')
    .insert({
      title, category, budget, cpm,
      creative_type: isNative ? 'native' : 'image',
      image_url: isNative ? null : imageUrl,
      native: cleanedNative,
      click_url: clickUrl,
      width: isNative ? 300 : (width ?? 300),
      height: isNative ? 250 : (height ?? 250),
      status: 'draft',
      advertiser_id: userId,
    })
    .select()
    .single();

  if (error) {
    console.error('[POST /v1/campaigns] supabase error', error);
    return NextResponse.json({ error: 'failed to create campaign' }, { status: 500 });
  }
  return NextResponse.json({ campaign: data }, { status: 201 });
}