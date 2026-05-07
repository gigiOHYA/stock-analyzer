import { useMemo } from 'react'
import { useStockData } from '../hooks/useStockData'
import { findSupportResistance, generateStrategy } from '../utils/technical'
import StockChart from './StockChart'
import StrategyPanel from './StrategyPanel'
import type { PortfolioStock } from '../types'

interface Props {
  stock: PortfolioStock
}

function InfoCard({ label, value, sub, highlight }: { label: string; value: string; sub?: string; highlight?: 'positive' | 'negative' | 'neutral' }) {
  return (
    <div className="info-card">
      <div className="info-label">{label}</div>
      <div className={`info-value ${highlight ?? ''}`}>{value}</div>
      {sub && <div className="info-sub">{sub}</div>}
    </div>
  )
}

export default function StockDetail({ stock }: Props) {
  const { quote, history, dividend, loading, error } = useStockData(stock.symbol)

  const sr = useMemo(() => findSupportResistance(history), [history])
  const signal = useMemo(() => {
    if (!quote || history.length === 0) return null
    return generateStrategy(quote.price, history, stock.avgCost)
  }, [quote, history, stock.avgCost])

  if (loading) return (
    <div className="detail-loading">
      <div className="spinner" />
      <p>載入 {stock.symbol} 資料中...</p>
    </div>
  )

  if (error) return (
    <div className="detail-error">
      <div style={{ fontSize: 40 }}>⚠️</div>
      <p>{error}</p>
    </div>
  )

  const price = quote?.price ?? 0
  const cost = stock.shares * stock.avgCost
  const value = price * stock.shares
  const pl = value - cost
  const plPct = cost > 0 ? (pl / cost) * 100 : 0
  const isPos = pl >= 0

  const exDiv = dividend.exDividendDate
  const today = new Date().toISOString().split('T')[0]
  const daysToEx = exDiv
    ? Math.ceil((new Date(exDiv).getTime() - new Date(today).getTime()) / 86400000)
    : null

  return (
    <div className="stock-detail">
      {/* Header */}
      <div className="detail-header">
        <div>
          <h2 className="detail-symbol">{stock.symbol}</h2>
          <div className="detail-name">{quote?.name || stock.name}</div>
        </div>
        {quote && (
          <div className="detail-price-block">
            <div className="detail-price">{price.toFixed(2)}</div>
            <div className={`detail-change ${quote.changePct >= 0 ? 'positive' : 'negative'}`}>
              {quote.changePct >= 0 ? '▲' : '▼'} {Math.abs(quote.change).toFixed(2)} ({Math.abs(quote.changePct).toFixed(2)}%)
            </div>
          </div>
        )}
      </div>

      {/* Position Summary */}
      <div className="cards-grid">
        <InfoCard label="持有股數" value={stock.shares.toLocaleString()} sub="股" />
        <InfoCard label="買進均價" value={stock.avgCost.toFixed(2)} sub={`總成本 ${cost.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} />
        <InfoCard label="現值" value={value.toLocaleString(undefined, { maximumFractionDigits: 0 })} sub={`現價 ${price.toFixed(2)}`} />
        <InfoCard
          label="未實現損益"
          value={`${isPos ? '+' : ''}${pl.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
          sub={`${isPos ? '+' : ''}${plPct.toFixed(2)}%`}
          highlight={isPos ? 'positive' : 'negative'}
        />
      </div>

      {/* Market Info Row */}
      {quote && (
        <div className="market-row">
          <div className="market-item"><span>開盤</span><strong>{quote.open.toFixed(2)}</strong></div>
          <div className="market-item"><span>最高</span><strong style={{ color: '#ef4444' }}>{quote.high.toFixed(2)}</strong></div>
          <div className="market-item"><span>最低</span><strong style={{ color: '#10b981' }}>{quote.low.toFixed(2)}</strong></div>
          <div className="market-item"><span>成交量</span><strong>{(quote.volume / 1000).toFixed(0)}K</strong></div>
        </div>
      )}

      {/* Dividend Info */}
      {(dividend.exDividendDate || dividend.dividendYield) && (
        <div className="dividend-bar">
          <span className="dividend-icon">💰</span>
          {dividend.exDividendDate && (
            <span className="dividend-item">
              除息日：<strong>{dividend.exDividendDate}</strong>
              {daysToEx !== null && daysToEx > 0 && (
                <span className="dividend-countdown"> ({daysToEx} 天後)</span>
              )}
              {daysToEx !== null && daysToEx <= 0 && (
                <span className="dividend-countdown" style={{ color: '#f59e0b' }}> (已除息)</span>
              )}
            </span>
          )}
          {dividend.dividendRate && (
            <span className="dividend-item">
              年化股利：<strong>{dividend.dividendRate.toFixed(2)}</strong>
            </span>
          )}
          {dividend.dividendYield && (
            <span className="dividend-item">
              殖利率：<strong style={{ color: '#10b981' }}>{dividend.dividendYield.toFixed(2)}%</strong>
            </span>
          )}
        </div>
      )}

      {/* Chart */}
      <div className="chart-section">
        <h3 className="section-title">
          6 個月走勢圖
          <span className="chart-legend">
            <span className="legend-dot" style={{ background: '#10b981' }} />支撐
            <span className="legend-dot" style={{ background: '#ef4444' }} />壓力
            <span className="legend-dot" style={{ background: '#f59e0b' }} />成本
          </span>
        </h3>
        <StockChart data={history} sr={sr} avgCost={stock.avgCost} currentPrice={price} />
      </div>

      {/* Strategy */}
      {signal && <StrategyPanel signal={signal} currentPrice={price} />}
    </div>
  )
}
