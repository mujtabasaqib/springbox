export interface NativeContent {
  brand: string;
  headline: string;
  body?: string;
  cta: string;
}

export interface AdCreative {
  adId: string;
  campaignId: string;
  imageUrl?: string;        // image ads only
  native?: NativeContent;   // native ads only
  clickUrl: string;
  width: number;
  height: number;
  title?: string;
  token: string;
}

export interface AdRequestBody {
  publisherId: string;
  slotId: string;
  width?: number;
  height?: number;
  page: string;
  ts: number;
}

export type EventType = 'impression' | 'click';

export interface EventBody {
  type: EventType;
  adId: string;
  campaignId: string;
  token: string;
  publisherId: string;
  slotId: string;
  ts: number;
  dwellMs?: number;
  focusRatio?: number;
}