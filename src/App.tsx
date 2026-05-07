import { useState } from 'react'
import { usePortfolio } from './hooks/usePortfolio'
import { useMultipleQuotes } from './hooks/useStockData'
import PortfolioSidebar from './components/PortfolioSidebar'
import StockDetail from './components/StockDetail'
import AddStockModal from './components/AddStockModal'
import './App.css'

export default function App() {
  const { stocks, addStock, removeStock } = usePortfolio()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const { quotes } = useMultipleQuotes(stocks.map(s => s.symbol))

  const effectiveId = selectedId ?? stocks[0]?.id ?? null
  const selectedStock = stocks.find(s => s.id === effectiveId) ?? null

  return (
    <div className="app">
      <PortfolioSidebar
        stocks={stocks}
        quotes={quotes}
        selectedId={effectiveId}
        onSelect={setSelectedId}
        onAdd={() => setShowAddModal(true)}
        onRemove={id => {
          removeStock(id)
          if (selectedId === id) setSelectedId(null)
        }}
      />

      <main className="main-content">
        {selectedStock ? (
          <StockDetail key={selectedStock.id} stock={selectedStock} />
        ) : (
          <div className="welcome">
            <div className="welcome-icon">📊</div>
            <h2>個人股票庫存分析</h2>
            <p>新增您的持股，即可查看即時行情、損益分析、<br />技術指標與買賣策略建議</p>
            <button className="btn btn-primary btn-lg" onClick={() => setShowAddModal(true)}>
              ＋ 新增第一檔股票
            </button>
            <div className="welcome-tips">
              <div className="tip">📈 支援台股（2330.TW）、美股（AAPL）</div>
              <div className="tip">🎯 自動計算支撐線 &amp; 壓力線</div>
              <div className="tip">💡 RSI 技術分析與買賣策略</div>
              <div className="tip">💰 顯示除息日期與殖利率</div>
            </div>
          </div>
        )}
      </main>

      {showAddModal && (
        <AddStockModal onAdd={addStock} onClose={() => setShowAddModal(false)} />
      )}
    </div>
  )
}
