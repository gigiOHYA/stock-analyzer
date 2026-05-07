export interface PortfolioStock {
  id: string
  symbol: string
  name: string
  shares: number
  avgCost: number
  currency: string
  addedAt: number
}

export interface StockQuote {
  symbol: string
  name: string
  price: number
  change: number
  changePct: number
  open: number
  high: number
  low: number
  volume: number
  marketCap?: number
  currency: string
  timestamp: number
}

export interface HistoricalPrice {
  date: string
  timestamp: number
  open: number
  high: number
  low: number
  close: number
  volume: number
  ma20?: number
  ma50?: number
}

export interface DividendInfo {
  exDividendDate?: string
  dividendRate?: number
  dividendYield?: number
  payoutRatio?: number
  lastDividend?: number
}

export interface SupportResistance {
  supports: number[]
  resistances: number[]
}

export interface TechnicalSignal {
  rsi: number
  rsiSignal: 'overbought' | 'neutral' | 'oversold'
  ma20: number
  ma50: number
  trendSignal: 'bullish' | 'neutral' | 'bearish'
  strategy: 'strong_buy' | 'buy' | 'hold' | 'sell' | 'strong_sell'
  strategyReason: string[]
  nearestSupport?: number
  nearestResistance?: number
  stopLoss?: number
  targetPrice?: number
}
