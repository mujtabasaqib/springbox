import type { AdCreative } from './types';
import { supabase } from './supabase';

export async function pickAd(): Promise<Omit<AdCreative, 'token'> | null> {
  const { data, error } = await supabase
    .from('campaigns')
    .select('id, title, image_url, click_url, width, height, creative_type, native')
    .eq('status', 'live');

  if (error) {
    console.error('[pickAd] supabase error', error);
    return null;
  }
  if (!data || data.length === 0) return null;

  const row = data[Math.floor(Math.random() * data.length)]!;
  return {
    adId: row.id,
    campaignId: row.id,
    imageUrl: row.creative_type === 'native' ? undefined : row.image_url,
    native: row.creative_type === 'native' ? row.native : undefined,
    clickUrl: row.click_url,
    width: row.width,
    height: row.height,
    title: row.title,
  };
}