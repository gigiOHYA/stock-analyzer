import type { HistoricalPrice, SupportResistance, TechnicalSignal } from '../types'

function clusterLevels(levels: number[], threshold = 0.015): number[] {
  if (levels.length === 0) return []
  const sorted = [...levels].sort((a, b) => a - b)
  const clusters: number[][] = [[sorted[0]]]

  for (let i = 1; i < sorted.length; i++) {
    const last = clusters[clusters.length - 1]
    const ref = last[last.length - 1]
    if ((sorted[i] - ref) / ref < threshold) {
      last.push(sorted[i])
    } else {
      clusters.push([sorted[i]])
    }
  }
  return clusters.map(c => c.reduce((a, b) => a + b, 0) / c.length)
}

export function findSupportResistance(prices: HistoricalPrice[], window = 5): SupportResistance {
  const closes = prices.map(p => p.close)
  const supports: number[] = []
  const resistances: number[] = []

  for (let i = window; i < closes.length - window; i++) {
    const slice = closes.slice(i - window, i + window + 1)
    const min = Math.min(...slice)
    const max = Math.max(...slice)
    if (closes[i] === min) supports.push(closes[i])
    if (closes[i] === max) resistances.push(closes[i])
  }

  return {
    supports: clusterLevels(supports).slice(-4),
    resistances: clusterLevels(resistances).slice(-4),
  }
}

export function computeRSI(prices: HistoricalPrice[], period = 14): number {
  const closes = prices.map(p => p.close)
  if (closes.length < period + 1) return 50

  let gains = 0
  let losses = 0
  for (let i = closes.length - period; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1]
    if (diff > 0) gains += diff
    else losses += Math.abs(diff)
  }
  const avgGain = gains / period
  const avgLoss = losses / period
  if (avgLoss === 0) return 100
  const rs = avgGain / avgLoss
  return 100 - 100 / (1 + rs)
}

export function generateStrategy(
  currentPrice: number,
  prices: HistoricalPrice[],
  avgCost?: number
): TechnicalSignal {
  const rsi = computeRSI(prices)
  const sr = findSupportResistance(prices)

  const ma20 = prices[prices.length - 1]?.ma20 ?? currentPrice
  const ma50 = prices[prices.length - 1]?.ma50 ?? currentPrice

  const rsiSignal: TechnicalSignal['rsiSignal'] =
    rsi > 70 ? 'overbought' : rsi < 30 ? 'oversold' : 'neutral'
  const trendSignal: TechnicalSignal['trendSignal'] =
    ma20 > ma50 ? 'bullish' : ma20 < ma50 ? 'bearish' : 'neutral'

  const supports = sr.supports.filter(s => s < currentPrice)
  const resistances = sr.resistances.filter(r => r > currentPrice)

  const nearestSupport = supports.length > 0 ? Math.max(...supports) : undefined
  const nearestResistance = resistances.length > 0 ? Math.min(...resistances) : undefined

  const reasons: string[] = []
  let score = 0

  if (rsi < 30) { score += 2; reasons.push('RSI 超賣 (<30)，可能反彈') }
  else if (rsi < 40) { score += 1; reasons.push('RSI 接近超賣區間') }
  else if (rsi > 70) { score -= 2; reasons.push('RSI 超買 (>70)，注意回調') }
  else if (rsi > 60) { score -= 1; reasons.push('RSI 偏高，謹慎追漲') }

  if (trendSignal === 'bullish') { score += 1; reasons.push('MA20 > MA50，多頭排列') }
  else if (trendSignal === 'bearish') { score -= 1; reasons.push('MA20 < MA50，空頭排列') }

  if (nearestSupport && (currentPrice - nearestSupport) / currentPrice < 0.03) {
    score += 2; reasons.push(`股價靠近支撐線 ${nearestSupport.toFixed(2)}`)
  }
  if (nearestResistance && (nearestResistance - currentPrice) / currentPrice < 0.03) {
    score -= 2; reasons.push(`股價靠近壓力線 ${nearestResistance.toFixed(2)}`)
  }

  if (avgCost) {
    const plPct = (currentPrice - avgCost) / avgCost * 100
    if (plPct > 20) { score -= 1; reasons.push(`已獲利 ${plPct.toFixed(1)}%，考慮分批獲利`) }
    if (plPct < -10) { score += 1; reasons.push(`虧損 ${Math.abs(plPct).toFixed(1)}%，接近成本區支撐`) }
  }

  if (currentPrice > ma20) { score += 0.5 }
  else { score -= 0.5 }

  let strategy: TechnicalSignal['strategy']
  if (score >= 3) strategy = 'strong_buy'
  else if (score >= 1) strategy = 'buy'
  else if (score <= -3) strategy = 'strong_sell'
  else if (score <= -1) strategy = 'sell'
  else strategy = 'hold'

  const stopLoss = nearestSupport ? nearestSupport * 0.98 : undefined
  const targetPrice = nearestResistance ?? (currentPrice * 1.05)

  return {
    rsi,
    rsiSignal,
    ma20,
    ma50,
    trendSignal,
    strategy,
    strategyReason: reasons,
    nearestSupport,
    nearestResistance,
    stopLoss,
    targetPrice,
  }
}
