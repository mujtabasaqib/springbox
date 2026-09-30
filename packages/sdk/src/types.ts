export interface SdkConfig {
  /** Publisher ID issued by the platform (registered on-chain / in backend). */
  publisherId: string;
  /** Backend base URL. Defaults to the production API. */
  apiUrl?: string;
  /** Log debug info to console. */
  debug?: boolean;
}

export interface ResolvedConfig extends Required<Omit<SdkConfig, 'debug'>> {
  debug: boolean;
}

export interface AdCreative {
  adId: string;
  campaignId: string;
  imageUrl: string;
  clickUrl: string;
  width: number;
  height: number;
  title?: string;
  /** Signed by backend; proves this impression/click belongs to this ad request. */
  token: string;
}

export interface SlotOptions {
  slotId: string;
  width?: number;
  height?: number;
  onLoad?: (ad: AdCreative) => void;
  onEmpty?: () => void;
  onError?: (err: Error) => void;
  onImpression?: (ad: AdCreative) => void;
  onClick?: (ad: AdCreative) => void;
}

export type EventType = 'impression' | 'click';

export interface BotSignals {
  /** Milliseconds the slot was both intersecting the viewport AND the tab was focused/visible. */
  dwellMs: number;
  /** dwellMs / total time the slot has existed, 0-1. Low ratio = mostly backgrounded or scrolled away. */
  focusRatio: number;
}

export interface SlotHandle {
  destroy(): void;
}