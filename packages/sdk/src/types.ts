export interface SdkConfig {
  publisherId: string;
  apiUrl?: string;
  debug?: boolean;
}

export interface ResolvedConfig extends Required<Omit<SdkConfig, 'debug'>> {
  debug: boolean;
}

export interface NativeContent {
  brand: string;
  headline: string;
  body?: string;
  cta: string;
}

export type ThemeName = 'light' | 'dark' | 'minimal' | 'midnight' | 'brutalist';

export type FontName =
  | 'inherit'
  | 'sans'
  | 'serif'
  | 'mono'
  | 'humanist'
  | 'rounded'
  | 'geometric'
  | 'classic';

export interface AdTheme {
  preset?: ThemeName;
  accent?: string; // #rrggbb
  bg?: string;     // #rrggbb
  font?: FontName;
}

export interface AdCreative {
  adId: string;
  campaignId: string;
  imageUrl?: string;       
  native?: NativeContent; 
  clickUrl: string;
  width: number;
  height: number;
  title?: string;
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
  theme?: AdTheme;
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