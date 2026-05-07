import type { PortfolioStock, StockQuote } from '../types'

interface Props {
  stocks: PortfolioStock[]
  quotes: Record<string, StockQuote>
  selectedId: string | null
  onSelect: (id: string) => void
  onAdd: () => void
  onRemove: (id: string) => void
}

export default function PortfolioSidebar({ stocks, quotes, selectedId, onSelect, onAdd, onRemove }: Props) {
  const totalCost = stocks.reduce((sum, s) => sum + s.shares * s.avgCost, 0)
  const totalValue = stocks.reduce((sum, s) => {
    const q = quotes[s.symbol]
    return sum + (q ? q.price * s.shares : s.shares * s.avgCost)
  }, 0)
  const totalPL = totalValue - totalCost
  const totalPLPct = totalCost > 0 ? (totalPL / totalCost) * 100 : 0
  const isPositive = totalPL >= 0

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h1 className="app-title">📊 股票庫存</h1>
      </div>

      {stocks.length > 0 && (
        <div className="portfolio-summary">
          <div className="summary-label">總市值</div>
          <div className="summary-value">{totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
          <div className={`summary-pl ${isPositive ? 'positive' : 'negative'}`}>
            {isPositive ? '▲' : '▼'} {Math.abs(totalPL).toLocaleString(undefined, { maximumFractionDigits: 0 })}
            <span className="summary-pl-pct"> ({isPositive ? '+' : ''}{totalPLPct.toFixed(2)}%)</span>
          </div>
        </div>
      )}

      <div className="stock-list">
        {stocks.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">📈</div>
            <p>尚無持股，點擊新增按鈕<br />開始追蹤股票</p>
          </div>
        )}
        {stocks.map(s => {
          const q = quotes[s.symbol]
          const cost = s.shares * s.avgCost
          const value = q ? q.price * s.shares : cost
          const pl = value - cost
          const plPct = cost > 0 ? (pl / cost) * 100 : 0
          const positive = pl >= 0

          return (
            <div
              key={s.id}
              className={`stock-item ${selectedId === s.id ? 'selected' : ''}`}
              onClick={() => onSelect(s.id)}
            >
              <div className="stock-item-main">
                <div className="stock-item-left">
                  <div className="stock-symbol">{s.symbol}</div>
                  <div className="stock-shares">{s.shares.toLocaleString()} 股</div>
                </div>
                <div className="stock-item-right">
                  {q ? (
                    <>
                      <div className="stock-price">{q.price.toFixed(2)}</div>
                      <div className={`stock-change ${q.changePct >= 0 ? 'positive' : 'negative'}`}>
                        {q.changePct >= 0 ? '+' : ''}{q.changePct.toFixed(2)}%
                      </div>
                    </>
                  ) : (
                    <div className="stock-price loading">—</div>
                  )}
                </div>
              </div>
              <div className="stock-item-pl">
                <span className="stock-pl-label">損益</span>
                <span className={`stock-pl-value ${positive ? 'positive' : 'negative'}`}>
                  {positive ? '+' : ''}{pl.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  {' '}({positive ? '+' : ''}{plPct.toFixed(2)}%)
                </span>
                <button
                  className="btn-remove"
                  onClick={e => { e.stopPropagation(); onRemove(s.id) }}
                  title="移除"
                >✕</button>
              </div>
            </div>
          )
        })}
      </div>

      <button className="btn-add-stock" onClick={onAdd}>
        ＋ 新增股票
      </button>
    </aside>
  )
}
