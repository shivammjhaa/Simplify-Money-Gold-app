export interface MetalPrice {
  metal: string;
  price_per_gram_inr: number;
  current_time: string;
  prev_close_price: number;
  open_price: number;
  high_price: number;
  low_price: number;
  change_24h: number;
  change_pct: number;
  timestamp: string;
}

export interface MetalPriceAPI {
  metal: string;
  price_per_gram_inr: number;
  current_time: string;
  prev_close_price: number;
  open_price: number;
  high_price: number;
  low_price: number;
  change_24h: number;
  change_pct: number;
  timestamp: string;
}