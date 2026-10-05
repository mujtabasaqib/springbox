//app/dashboard/advertiser/page.tsx
import { getAdCampaigns } from "@/lib/data/advertiser";
import AdvertiserView from "@/components/AdvertiserView";

export const dynamic = "force-dynamic"; // otherwise Next may serve cached data after router.refresh()

export default async function AdvertiserDashboard() {
  const campaigns = await getAdCampaigns();
  return <AdvertiserView campaigns={campaigns} />;
}