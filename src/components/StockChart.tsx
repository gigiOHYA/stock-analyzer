import {
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ReferenceLine, ResponsiveContainer, Area,
} from 'recharts'
import type { HistoricalPrice, SupportResistance } from '../types'

interface Props {
  data: HistoricalPrice[]
  sr: SupportResistance
  avgCost?: number
  currentPrice?: number
}

const fmt = (v: number) => v.toFixed(2)
const fmtDate = (d: string) => d.slice(5)

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload as HistoricalPrice
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-date">{label}</div>
      <div>收盤 <strong>{fmt(d.close)}</strong></div>
      <div>開盤 {fmt(d.open)} ↑{fmt(d.high)} ↓{fmt(d.low)}</div>
      {d.ma20 && <div style={{ color: '#f59e0b' }}>MA20 {fmt(d.ma20)}</div>}
      {d.ma50 && <div style={{ color: '#a78bfa' }}>MA50 {fmt(d.ma50)}</div>}
      <div style={{ color: '#6b7280' }}>成交量 {(d.volume / 1000).toFixed(0)}K</div>
    </div>
  )
}

export default function StockChart({ data, sr, avgCost, currentPrice }: Props) {
  if (data.length === 0) return <div className="chart-empty">載入圖表資料中...</div>

  const prices = data.map(d => d.close)
  const minP = Math.min(...prices) * 0.97
  const maxP = Math.max(...prices) * 1.03

  const chartData = data.map(d => ({
    ...d,
    date: fmtDate(d.date),
    vol: d.volume,
  }))

  return (
    <div className="chart-container">
      <ResponsiveContainer width="100%" height={320}>
        <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
          <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 11 }} tickLine={false} interval="preserveStartEnd" />
          <YAxis
            yAxisId="price"
            domain={[minP, maxP]}
            tick={{ fill: '#6b7280', fontSize: 11 }}
            tickLine={false}
            tickFormatter={v => v.toFixed(0)}
            width={55}
          />
          <YAxis yAxisId="vol" orientation="right" hide />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
            formatter={(value) => <span style={{ color: '#9ca3af' }}>{value}</span>}
          />

          <Bar yAxisId="vol" dataKey="vol" name="成交量" fill="#374151" opacity={0.5} barSize={3} />
          <Area
            yAxisId="price"
            type="monotone"
            dataKey="close"
            name="收盤價"
            stroke="#3b82f6"
            fill="#3b82f61a"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
          <Line yAxisId="price" type="monotone" dataKey="ma20" name="MA20" stroke="#f59e0b" strokeWidth={1.5} dot={false} />
          <Line yAxisId="price" type="monotone" dataKey="ma50" name="MA50" stroke="#a78bfa" strokeWidth={1.5} dot={false} />

          {sr.supports.map((s, i) => (
            <ReferenceLine
              key={`sup-${i}`}
              yAxisId="price"
              y={s}
              stroke="#10b981"
              strokeDasharray="4 3"
              strokeWidth={1.5}
              label={{ value: `支撐 ${s.toFixed(2)}`, position: 'insideBottomRight', fill: '#10b981', fontSize: 10 }}
            />
          ))}
          {sr.resistances.map((r, i) => (
            <ReferenceLine
              key={`res-${i}`}
              yAxisId="price"
              y={r}
              stroke="#ef4444"
              strokeDasharray="4 3"
              strokeWidth={1.5}
              label={{ value: `壓力 ${r.toFixed(2)}`, position: 'insideTopRight', fill: '#ef4444', fontSize: 10 }}
            />
          ))}
          {avgCost && (
            <ReferenceLine
              yAxisId="price"
              y={avgCost}
              stroke="#f59e0b"
              strokeDasharray="6 3"
              strokeWidth={2}
              label={{ value: `成本 ${avgCost.toFixed(2)}`, position: 'insideTopLeft', fill: '#f59e0b', fontSize: 11 }}
            />
          )}
          {currentPrice && (
            <ReferenceLine
              yAxisId="price"
              y={currentPrice}
              stroke="#3b82f6"
              strokeWidth={1}
              strokeOpacity={0.6}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
