import { useState, useCallback } from 'react'
import type { PortfolioStock } from '../types'

const STORAGE_KEY = 'stock_portfolio'

function load(): PortfolioStock[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch {
    return []
  }
}

function save(stocks: PortfolioStock[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stocks))
}

export function usePortfolio() {
  const [stocks, setStocks] = useState<PortfolioStock[]>(load)

  const addStock = useCallback((stock: Omit<PortfolioStock, 'id' | 'addedAt'>) => {
    setStocks(prev => {
      const existing = prev.findIndex(s => s.symbol === stock.symbol)
      let next: PortfolioStock[]
      if (existing >= 0) {
        next = prev.map((s, i) =>
          i === existing
            ? {
                ...s,
                shares: s.shares + stock.shares,
                avgCost: (s.avgCost * s.shares + stock.avgCost * stock.shares) / (s.shares + stock.shares),
              }
            : s
        )
      } else {
        next = [...prev, { ...stock, id: crypto.randomUUID(), addedAt: Date.now() }]
      }
      save(next)
      return next
    })
  }, [])

  const removeStock = useCallback((id: string) => {
    setStocks(prev => {
      const next = prev.filter(s => s.id !== id)
      save(next)
      return next
    })
  }, [])

  const updateStock = useCallback((id: string, updates: Partial<PortfolioStock>) => {
    setStocks(prev => {
      const next = prev.map(s => (s.id === id ? { ...s, ...updates } : s))
      save(next)
      return next
    })
  }, [])

  return { stocks, addStock, removeStock, updateStock }
}
