import { MetalPrice } from '../types/MetalPrice';

export interface HistoricalDataPoint {
  date: string;
  price: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface WeeklyMetalData {
  metal: string;
  current: MetalPrice;
  historical: HistoricalDataPoint[];
  weeklyChange: number;
  weeklyChangePercent: number;
  weeklyHigh: number;
  weeklyLow: number;
  dayChanges: {
    '1D': number;
    '3D': number;
    '7D': number;
  };
}

// Generate realistic historical data for the past week
function generateHistoricalData(currentPrice: number, metal: string): HistoricalDataPoint[] {
  const data: HistoricalDataPoint[] = [];
  const today = new Date();
  
  // Base volatility for each metal (realistic market behavior)
  const volatility = {
    gold: 0.015,    // 1.5% daily volatility
    silver: 0.025,  // 2.5% daily volatility  
    platinum: 0.02, // 2% daily volatility
    palladium: 0.03 // 3% daily volatility
  };
  
  const metalVolatility = volatility[metal.toLowerCase() as keyof typeof volatility] || 0.02;
  
  let price = currentPrice * 0.985; // Start slightly lower than current
  
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    // Generate realistic daily price movements
    const dailyChange = (Math.random() - 0.5) * metalVolatility * 2;
    const openPrice = price;
    
    // Intraday volatility (smaller movements)
    const intradayVol = metalVolatility * 0.3;
    const high = openPrice * (1 + Math.random() * intradayVol);
    const low = openPrice * (1 - Math.random() * intradayVol);
    const closePrice = openPrice * (1 + dailyChange);
    
    data.push({
      date: date.toISOString().split('T')[0],
      price: closePrice,
      open: openPrice,
      high: Math.max(high, closePrice),
      low: Math.min(low, closePrice),
      close: closePrice,
      volume: Math.floor(Math.random() * 10000) + 5000
    });
    
    price = closePrice;
  }
  
  // Adjust last day to match current price
  if (data.length > 0) {
    data[data.length - 1].close = currentPrice;
    data[data.length - 1].price = currentPrice;
  }
  
  return data;
}

export function generateWeeklyData(metalPrice: MetalPrice): WeeklyMetalData {
  const historical = generateHistoricalData(metalPrice.price_per_gram_inr, metalPrice.metal);
  
  const firstPrice = historical[0]?.price || metalPrice.price_per_gram_inr;
  const lastPrice = metalPrice.price_per_gram_inr;
  const weeklyChange = lastPrice - firstPrice;
  const weeklyChangePercent = ((lastPrice - firstPrice) / firstPrice) * 100;
  
  const prices = historical.map(h => h.price);
  const weeklyHigh = Math.max(...prices);
  const weeklyLow = Math.min(...prices);
  
  // Calculate different period changes
  const threeDayPrice = historical[historical.length - 4]?.price || firstPrice;
  const oneDayPrice = historical[historical.length - 2]?.price || firstPrice;
  
  return {
    metal: metalPrice.metal,
    current: metalPrice,
    historical,
    weeklyChange,
    weeklyChangePercent,
    weeklyHigh,
    weeklyLow,
    dayChanges: {
      '1D': ((lastPrice - oneDayPrice) / oneDayPrice) * 100,
      '3D': ((lastPrice - threeDayPrice) / threeDayPrice) * 100,
      '7D': weeklyChangePercent
    }
  };
}

// Price alert functionality
export interface PriceAlert {
  id: string;
  metal: string;
  targetPrice: number;
  condition: 'above' | 'below';
  isActive: boolean;
  createdAt: string;
}

export class PriceAlertManager {
  private alerts: PriceAlert[] = [];
  
  addAlert(alert: Omit<PriceAlert, 'id' | 'createdAt'>): PriceAlert {
    const newAlert: PriceAlert = {
      ...alert,
      id: Math.random().toString(36).substr(2, 9),
      createdAt: new Date().toISOString()
    };
    this.alerts.push(newAlert);
    return newAlert;
  }
  
  removeAlert(id: string): void {
    this.alerts = this.alerts.filter(alert => alert.id !== id);
  }
  
  checkAlerts(metalPrices: MetalPrice[]): PriceAlert[] {
    const triggeredAlerts: PriceAlert[] = [];
    
    this.alerts.forEach(alert => {
      if (!alert.isActive) return;
      
      const metalPrice = metalPrices.find(m => m.metal.toLowerCase() === alert.metal.toLowerCase());
      if (!metalPrice) return;
      
      const currentPrice = metalPrice.price_per_gram_inr;
      const shouldTrigger = alert.condition === 'above' 
        ? currentPrice >= alert.targetPrice
        : currentPrice <= alert.targetPrice;
        
      if (shouldTrigger) {
        triggeredAlerts.push(alert);
        alert.isActive = false; // Disable after triggering
      }
    });
    
    return triggeredAlerts;
  }
  
  getActiveAlerts(): PriceAlert[] {
    return this.alerts.filter(alert => alert.isActive);
  }
}