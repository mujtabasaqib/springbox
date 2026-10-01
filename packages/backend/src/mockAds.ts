import type { AdCreative } from './types';
import { supabase } from './supabase';

// Fake campaign pool. Swap for a real DB query in packages/backend proper.
const CAMPAIGNS: Omit<AdCreative, 'token'>[] = [
  {
    adId: 'ad_1',
    campaignId: 'camp_1',
    imageUrl: 'https://placehold.co/300x250/png?text=Web3+Ad+1',
    clickUrl: 'https://example.com/land/1',
    width: 300,
    height: 250,
    title: 'Demo Campaign 1',
  },
  {
    adId: 'ad_2',
    campaignId: 'camp_2',
    imageUrl: 'https://placehold.co/300x250/png?text=Web3+Ad+2',
    clickUrl: 'https://example.com/land/2',
    width: 300,
    height: 250,
    title: 'Demo Campaign 2',
  },
];

export async function pickAd(): Promise<Omit<AdCreative, 'token'> | null> {
  const { data, error } = await supabase
    .from('campaigns')
    .select('id, title, image_url, click_url, width, height, creative_type, native')
    .eq('status', 'live');

  if (error) {
    console.error('[pickAd] supabase error', error);
    return null;
  }
  if (!data || data.length === 0) return null; // no fill

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