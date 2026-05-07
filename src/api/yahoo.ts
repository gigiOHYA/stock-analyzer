import axios from 'axios'
import type { HistoricalPrice, DividendInfo } from '../types'

const api = axios.create({ timeout: 12000 })

async function fetchChart(symbol: string, range = '6mo') {
  const res = await api.get(`/yahoo/v8/finance/chart/${encodeURIComponent(symbol)}`, {
    params: { interval: '1d', range, events: 'div,split' },
  })
  const result = res.data?.chart?.result?.[0]
  if (!result) throw new Error(`No data for ${symbol}`)
  return result
}


export interface HistoricalResult {
  prices: HistoricalPrice[]
  name: string
  currency: string
  regularMarketPrice: number
  previousClose: number
  regularMarketOpen: number
  regularMarketHigh: number
  regularMarketLow: number
  regularMarketVolume: number
}

export async function fetchHistorical(symbol: string, range = '6mo'): Promise<HistoricalResult> {
  const result = await fetchChart(symbol, range)
  const meta = result.meta
  const timestamps: number[] = result.timestamp ?? []
  const quote = result.indicators?.quote?.[0] ?? {}

  const prices: HistoricalPrice[] = timestamps.map((ts, i) => ({
    date: new Date(ts * 1000).toISOString().split('T')[0],
    timestamp: ts * 1000,
    open: quote.open?.[i] ?? 0,
    high: quote.high?.[i] ?? 0,
    low: quote.low?.[i] ?? 0,
    close: quote.close?.[i] ?? 0,
    volume: quote.volume?.[i] ?? 0,
  })).filter(p => p.close > 0)

  const closes = prices.map(p => p.close)
  prices.forEach((p, i) => {
    if (i >= 19) p.ma20 = closes.slice(i - 19, i + 1).reduce((a, b) => a + b, 0) / 20
    if (i >= 49) p.ma50 = closes.slice(i - 49, i + 1).reduce((a, b) => a + b, 0) / 50
  })

  return {
    prices,
    name: meta.longName || meta.shortName || meta.symbol,
    currency: meta.currency ?? 'USD',
    regularMarketPrice: meta.regularMarketPrice,
    previousClose: meta.previousClose ?? meta.chartPreviousClose ?? 0,
    regularMarketOpen: meta.regularMarketOpen ?? 0,
    regularMarketHigh: meta.regularMarketDayHigh ?? 0,
    regularMarketLow: meta.regularMarketDayLow ?? 0,
    regularMarketVolume: meta.regularMarketVolume ?? 0,
  }
}

export async function fetchDividendInfo(symbol: string): Promise<DividendInfo> {
  try {
    const result = await fetchChart(symbol, '2y')
    const meta = result.meta
    const divEvents = result.events?.dividends ?? {}
    const divList = Object.values(divEvents) as { amount: number; date: number }[]
    divList.sort((a, b) => a.date - b.date)

    const lastDiv = divList[divList.length - 1]
    const dividendRate = meta.trailingAnnualDividendRate ?? (lastDiv ? lastDiv.amount * 4 : undefined)

    // Estimate next ex-dividend date based on historical pattern
    let exDividendDate: string | undefined
    if (divList.length >= 2) {
      const intervals = divList.slice(1).map((d, i) => d.date - divList[i].date)
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length
      const nextTs = (lastDiv.date + avgInterval) * 1000
      if (nextTs > Date.now()) {
        exDividendDate = new Date(nextTs).toISOString().split('T')[0]
      } else {
        // Past date - show last known
        exDividendDate = new Date(lastDiv.date * 1000).toISOString().split('T')[0]
      }
    } else if (lastDiv) {
      exDividendDate = new Date(lastDiv.date * 1000).toISOString().split('T')[0]
    }

    const price = meta.regularMarketPrice
    const dividendYield = dividendRate && price ? (dividendRate / price) * 100 : undefined

    return { exDividendDate, dividendRate, dividendYield, lastDividend: lastDiv?.amount }
  } catch {
    return {}
  }
}

export async function validateSymbol(symbol: string): Promise<{ symbol: string; name: string } | null> {
  try {
    const result = await fetchChart(symbol.toUpperCase().trim(), '5d')
    const meta = result.meta
    return {
      symbol: meta.symbol,
      name: meta.longName || meta.shortName || meta.symbol,
    }
  } catch {
    return null
  }
}
