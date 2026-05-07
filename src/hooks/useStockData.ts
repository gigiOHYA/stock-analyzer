import { useState, useEffect } from 'react'
import { fetchHistorical, fetchDividendInfo } from '../api/yahoo'
import type { StockQuote, HistoricalPrice, DividendInfo } from '../types'

interface StockData {
  quote?: StockQuote
  history: HistoricalPrice[]
  dividend: DividendInfo
  loading: boolean
  error?: string
}

const cache: Record<string, { data: StockData; ts: number }> = {}
const CACHE_TTL = 90_000

export function useStockData(symbol: string | null) {
  const [data, setData] = useState<StockData>({ history: [], dividend: {}, loading: false })

  useEffect(() => {
    if (!symbol) return
    const cached = cache[symbol]
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      setData(cached.data)
      return
    }
    setData({ history: [], dividend: {}, loading: true })

    Promise.all([fetchHistorical(symbol, '6mo'), fetchDividendInfo(symbol)])
      .then(([hist, dividend]) => {
        const last = hist.prices[hist.prices.length - 1]
        const prev = hist.prices[hist.prices.length - 2]
        const change = hist.regularMarketPrice - hist.previousClose
        const changePct = hist.previousClose > 0 ? (change / hist.previousClose) * 100 : 0

        const quote: StockQuote = {
          symbol,
          name: hist.name,
          price: hist.regularMarketPrice,
          change,
          changePct,
          open: hist.regularMarketOpen || last?.open || 0,
          high: hist.regularMarketHigh || last?.high || 0,
          low: hist.regularMarketLow || last?.low || 0,
          volume: hist.regularMarketVolume || last?.volume || 0,
          currency: hist.currency,
          timestamp: last?.timestamp ?? Date.now(),
        }
        // Suppress unused warning
        void prev

        const result: StockData = { quote, history: hist.prices, dividend, loading: false }
        cache[symbol] = { data: result, ts: Date.now() }
        setData(result)
      })
      .catch(() => {
        setData({ history: [], dividend: {}, loading: false, error: '無法取得股票資料，請確認代碼是否正確' })
      })
  }, [symbol])

  return data
}

export function useMultipleQuotes(symbols: string[]) {
  const [quotes, setQuotes] = useState<Record<string, StockQuote>>({})
  const [loading, setLoading] = useState(false)
  const key = symbols.join(',')

  useEffect(() => {
    if (symbols.length === 0) { setQuotes({}); return }
    setLoading(true)
    Promise.allSettled(symbols.map(s => fetchHistorical(s, '5d'))).then(results => {
      const map: Record<string, StockQuote> = {}
      results.forEach((r, i) => {
        if (r.status === 'fulfilled') {
          const h = r.value
          const change = h.regularMarketPrice - h.previousClose
          const changePct = h.previousClose > 0 ? (change / h.previousClose) * 100 : 0
          map[symbols[i]] = {
            symbol: symbols[i],
            name: h.name,
            price: h.regularMarketPrice,
            change,
            changePct,
            open: h.regularMarketOpen,
            high: h.regularMarketHigh,
            low: h.regularMarketLow,
            volume: h.regularMarketVolume,
            currency: h.currency,
            timestamp: Date.now(),
          }
        }
      })
      setQuotes(map)
      setLoading(false)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return { quotes, loading }
}
