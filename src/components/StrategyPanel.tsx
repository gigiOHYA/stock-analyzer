import type { TechnicalSignal } from '../types'

interface Props {
  signal: TechnicalSignal
  currentPrice: number
}

const strategyConfig = {
  strong_buy:  { label: '強力買入', color: '#10b981', bg: '#10b98120', icon: '🚀' },
  buy:         { label: '建議買入', color: '#34d399', bg: '#34d39915', icon: '📈' },
  hold:        { label: '持有觀望', color: '#f59e0b', bg: '#f59e0b15', icon: '⏸️' },
  sell:        { label: '建議賣出', color: '#f87171', bg: '#f8717115', icon: '📉' },
  strong_sell: { label: '強力賣出', color: '#ef4444', bg: '#ef444420', icon: '⚠️' },
}

const rsiConfig = {
  overbought: { label: '超買', color: '#ef4444' },
  neutral:    { label: '中性', color: '#f59e0b' },
  oversold:   { label: '超賣', color: '#10b981' },
}

const trendConfig = {
  bullish: { label: '多頭排列', color: '#10b981', icon: '↑' },
  neutral: { label: '盤整', color: '#f59e0b', icon: '→' },
  bearish: { label: '空頭排列', color: '#ef4444', icon: '↓' },
}

function RSIGauge({ rsi }: { rsi: number }) {
  const pct = Math.min(100, Math.max(0, rsi))
  const color = rsi > 70 ? '#ef4444' : rsi < 30 ? '#10b981' : '#f59e0b'
  return (
    <div className="rsi-gauge">
      <div className="rsi-track">
        <div className="rsi-zone rsi-oversold" />
        <div className="rsi-zone rsi-neutral" />
        <div className="rsi-zone rsi-overbought" />
        <div className="rsi-needle" style={{ left: `${pct}%`, background: color }} />
      </div>
      <div className="rsi-labels">
        <span style={{ color: '#10b981' }}>超賣 30</span>
        <span style={{ color: '#f59e0b' }}>RSI {rsi.toFixed(1)}</span>
        <span style={{ color: '#ef4444' }}>超買 70</span>
      </div>
    </div>
  )
}

export default function StrategyPanel({ signal, currentPrice }: Props) {
  const cfg = strategyConfig[signal.strategy]
  const rsiCfg = rsiConfig[signal.rsiSignal]
  const trendCfg = trendConfig[signal.trendSignal]

  const profitPct = signal.targetPrice
    ? ((signal.targetPrice - currentPrice) / currentPrice * 100).toFixed(1)
    : null
  const riskPct = signal.stopLoss
    ? ((signal.stopLoss - currentPrice) / currentPrice * 100).toFixed(1)
    : null

  return (
    <div className="strategy-panel">
      <h3 className="section-title">技術分析 &amp; 策略建議</h3>

      {/* Main strategy badge */}
      <div className="strategy-badge" style={{ background: cfg.bg, borderColor: cfg.color }}>
        <span className="strategy-icon">{cfg.icon}</span>
        <div>
          <div className="strategy-label" style={{ color: cfg.color }}>{cfg.label}</div>
          <div className="strategy-sub">綜合技術指標評分</div>
        </div>
      </div>

      {/* Indicators row */}
      <div className="indicator-row">
        <div className="indicator-card">
          <div className="indicator-label">RSI (14)</div>
          <div className="indicator-value" style={{ color: rsiCfg.color }}>
            {signal.rsi.toFixed(1)}
          </div>
          <div className="indicator-tag" style={{ color: rsiCfg.color }}>{rsiCfg.label}</div>
        </div>
        <div className="indicator-card">
          <div className="indicator-label">均線趨勢</div>
          <div className="indicator-value" style={{ color: trendCfg.color }}>
            {trendCfg.icon}
          </div>
          <div className="indicator-tag" style={{ color: trendCfg.color }}>{trendCfg.label}</div>
        </div>
        <div className="indicator-card">
          <div className="indicator-label">MA20</div>
          <div className="indicator-value">{signal.ma20.toFixed(2)}</div>
          <div className="indicator-tag" style={{ color: currentPrice >= signal.ma20 ? '#10b981' : '#ef4444' }}>
            {currentPrice >= signal.ma20 ? '站上均線' : '跌破均線'}
          </div>
        </div>
        <div className="indicator-card">
          <div className="indicator-label">MA50</div>
          <div className="indicator-value">{signal.ma50.toFixed(2)}</div>
          <div className="indicator-tag" style={{ color: currentPrice >= signal.ma50 ? '#10b981' : '#ef4444' }}>
            {currentPrice >= signal.ma50 ? '站上均線' : '跌破均線'}
          </div>
        </div>
      </div>

      <RSIGauge rsi={signal.rsi} />

      {/* Support/Resistance levels */}
      <div className="sr-row">
        {signal.nearestResistance && (
          <div className="sr-card resistance">
            <div className="sr-label">最近壓力線</div>
            <div className="sr-price">{signal.nearestResistance.toFixed(2)}</div>
            {profitPct && (
              <div className="sr-delta">距今 +{profitPct}%</div>
            )}
          </div>
        )}
        <div className="sr-card current">
          <div className="sr-label">現價</div>
          <div className="sr-price">{currentPrice.toFixed(2)}</div>
        </div>
        {signal.nearestSupport && (
          <div className="sr-card support">
            <div className="sr-label">最近支撐線</div>
            <div className="sr-price">{signal.nearestSupport.toFixed(2)}</div>
            {riskPct && (
              <div className="sr-delta">距今 {riskPct}%</div>
            )}
          </div>
        )}
      </div>

      {/* Price targets */}
      {(signal.targetPrice || signal.stopLoss) && (
        <div className="target-row">
          {signal.targetPrice && (
            <div className="target-card target-up">
              <span className="target-label">目標價</span>
              <span className="target-price">{signal.targetPrice.toFixed(2)}</span>
              {profitPct && <span className="target-pct">+{profitPct}%</span>}
            </div>
          )}
          {signal.stopLoss && (
            <div className="target-card target-down">
              <span className="target-label">止損參考</span>
              <span className="target-price">{signal.stopLoss.toFixed(2)}</span>
              {riskPct && <span className="target-pct">{riskPct}%</span>}
            </div>
          )}
        </div>
      )}

      {/* Reasons */}
      {signal.strategyReason.length > 0 && (
        <div className="reasons">
          <div className="reasons-title">分析依據</div>
          {signal.strategyReason.map((r, i) => (
            <div key={i} className="reason-item">• {r}</div>
          ))}
        </div>
      )}
    </div>
  )
}
