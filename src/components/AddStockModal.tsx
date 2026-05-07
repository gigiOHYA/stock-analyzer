import { useState, useRef } from 'react'
import { validateSymbol } from '../api/yahoo'
import type { PortfolioStock } from '../types'

interface Props {
  onAdd: (stock: Omit<PortfolioStock, 'id' | 'addedAt'>) => void
  onClose: () => void
}

export default function AddStockModal({ onAdd, onClose }: Props) {
  const [symbol, setSymbol] = useState('')
  const [validated, setValidated] = useState<{ symbol: string; name: string } | null>(null)
  const [validating, setValidating] = useState(false)
  const [validError, setValidError] = useState('')
  const [shares, setShares] = useState('')
  const [avgCost, setAvgCost] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleSymbolChange(val: string) {
    setSymbol(val)
    setValidated(null)
    setValidError('')
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const trimmed = val.trim().toUpperCase()
    if (trimmed.length < 1) return
    debounceRef.current = setTimeout(async () => {
      setValidating(true)
      const result = await validateSymbol(trimmed)
      setValidating(false)
      if (result) {
        setValidated(result)
        setValidError('')
      } else {
        setValidError('找不到此股票代碼，請確認後再試')
      }
    }, 800)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validated || !shares || !avgCost) return
    onAdd({
      symbol: validated.symbol,
      name: validated.name,
      shares: parseFloat(shares),
      avgCost: parseFloat(avgCost),
      currency: 'TWD',
    })
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>新增股票</h2>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>股票代碼</label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                value={symbol}
                onChange={e => handleSymbolChange(e.target.value)}
                placeholder="台股：2330.TW　美股：AAPL　ETF：0050.TW"
                autoFocus
                autoComplete="off"
                style={{ paddingRight: 36 }}
              />
              {validating && (
                <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: '#6b7280' }}>
                  驗證中…
                </span>
              )}
            </div>
            {validated && (
              <div className="selected-hint">✓ {validated.name} ({validated.symbol})</div>
            )}
            {validError && (
              <div style={{ fontSize: 12, color: '#ef4444', marginTop: 4, paddingLeft: 2 }}>{validError}</div>
            )}
            <div style={{ fontSize: 11, color: '#4b5563', marginTop: 6 }}>
              台股請加 .TW（例：2330.TW、0050.TW），美股直接輸入代碼（AAPL、TSLA）
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>持有股數</label>
              <input
                type="number"
                value={shares}
                onChange={e => setShares(e.target.value)}
                placeholder="例：1000"
                min="0"
                step="1"
                required
              />
            </div>
            <div className="form-group">
              <label>平均買進成本（每股）</label>
              <input
                type="number"
                value={avgCost}
                onChange={e => setAvgCost(e.target.value)}
                placeholder="每股價格"
                min="0"
                step="0.01"
                required
              />
            </div>
          </div>

          {shares && avgCost && (
            <div className="form-summary">
              💼 總成本：<strong>{(parseFloat(shares) * parseFloat(avgCost)).toLocaleString()}</strong>
              {validated && <span style={{ marginLeft: 12, color: '#6b7280' }}>({validated.symbol})</span>}
            </div>
          )}

          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>取消</button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!validated || !shares || !avgCost || validating}
            >
              新增持股
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
