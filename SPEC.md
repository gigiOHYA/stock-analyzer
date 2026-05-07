# 個人股票庫存分析 App — 功能規格

## 專案概述

個人使用的股票持倉追蹤與技術分析工具，支援台股與美股，提供即時行情、損益計算、技術指標與買賣策略建議。

**技術堆疊：** React 18 + TypeScript + Vite 5 + Recharts + Axios  
**資料來源：** Yahoo Finance Chart API（`/v8/finance/chart`，免費、不需 API Key）  
**資料持久化：** localStorage

---

## 功能模組

### 1. 投資組合管理

- 新增持股：輸入股票代碼 → 自動驗證（呼叫 Yahoo Finance 確認代碼有效）→ 填入股數與平均買進成本
- 刪除持股：點擊列表中的 ✕ 按鈕
- 重複新增同一檔股票：自動合併並重新計算加權平均成本
- 台股格式：代碼加 `.TW`（例：`2330.TW`、`0050.TW`）
- 美股格式：直接輸入代碼（例：`AAPL`、`TSLA`）
- 資料欄位：`symbol`、`name`、`shares`（股數）、`avgCost`（平均買進成本）

### 2. 即時行情

資料來源：Yahoo Finance `/v8/finance/chart/{symbol}?interval=1d&range=5d`

| 欄位 | 說明 |
|------|------|
| 現價 | `meta.regularMarketPrice` |
| 漲跌額 | 現價 - 昨收 |
| 漲跌幅 | (現價 - 昨收) / 昨收 × 100% |
| 開盤 | `meta.regularMarketOpen` |
| 最高 | `meta.regularMarketDayHigh` |
| 最低 | `meta.regularMarketDayLow` |
| 成交量 | `meta.regularMarketVolume` |

Vite 開發伺服器 Proxy 設定（解決 CORS）：
```
/yahoo  → https://query1.finance.yahoo.com
/yahoo2 → https://query2.finance.yahoo.com
```

### 3. 損益分析

| 指標 | 計算方式 |
|------|----------|
| 總成本 | 股數 × 平均買進成本 |
| 現值 | 股數 × 現價 |
| 未實現損益（金額） | 現值 - 總成本 |
| 未實現損益（%） | (現值 - 總成本) / 總成本 × 100% |
| 投資組合總市值 | 所有持股現值加總 |
| 投資組合總損益 | 所有持股損益加總 |

### 4. 除息資訊

資料來源：Yahoo Finance `/v8/finance/chart/{symbol}?range=2y&events=div,split`

| 欄位 | 說明 |
|------|------|
| 除息日 | 從歷史除息事件推算：取最後一次除息日，加上歷史平均配息間隔，估算下次除息日 |
| 年化股利 | `meta.trailingAnnualDividendRate`，或以最近一次股利 × 4 估算 |
| 殖利率 | 年化股利 / 現價 × 100% |
| 最近股利 | 最後一次除息金額 |

### 5. 六個月走勢圖

元件：Recharts `ComposedChart`

| 圖層 | 說明 |
|------|------|
| 收盤價 | `Area` 藍色，含填充區域 |
| MA20 | `Line` 橘色，20 日移動平均 |
| MA50 | `Line` 紫色，50 日移動平均 |
| 成交量 | `Bar` 灰色，右側 Y 軸 |
| 支撐線 | `ReferenceLine` 綠色虛線 |
| 壓力線 | `ReferenceLine` 紅色虛線 |
| 買進成本線 | `ReferenceLine` 橘色虛線，標示持倉成本 |

### 6. 支撐線與壓力線

演算法：局部極值聚類法

```
1. 滑動視窗（預設 ±5 日）掃描歷史收盤價
2. 局部最低點（window 內最小值）→ 候選支撐
3. 局部最高點（window 內最大值）→ 候選壓力
4. 相鄰價位差距 < 1.5% 者合併（取平均值）
5. 取最近 4 個有效支撐 / 壓力水平
```

### 7. RSI 技術指標

計算：14 日 RSI（Wilder）

```
RS = 平均漲幅 / 平均跌幅（過去 14 日）
RSI = 100 - 100 / (1 + RS)
```

| 區間 | 判斷 |
|------|------|
| RSI > 70 | 超買，注意回調 |
| 30 ≤ RSI ≤ 70 | 中性 |
| RSI < 30 | 超賣，可能反彈 |

UI：彩色進度條（超賣綠→中性→超買紅），針指標示當前位置

### 8. 買賣策略建議

綜合評分系統，各訊號加減分：

| 訊號 | 條件 | 分數 |
|------|------|------|
| RSI 超賣 | RSI < 30 | +2 |
| RSI 偏低 | RSI < 40 | +1 |
| RSI 超買 | RSI > 70 | -2 |
| RSI 偏高 | RSI > 60 | -1 |
| 多頭排列 | MA20 > MA50 | +1 |
| 空頭排列 | MA20 < MA50 | -1 |
| 靠近支撐 | 距離支撐 < 3% | +2 |
| 靠近壓力 | 距離壓力 < 3% | -2 |
| 站上 MA20 | 現價 > MA20 | +0.5 |
| 跌破 MA20 | 現價 < MA20 | -0.5 |
| 大幅獲利 | 獲利 > 20% | -1 |
| 小幅虧損 | 虧損 > 10% | +1 |

評分對應策略：

| 分數 | 策略 |
|------|------|
| ≥ 3 | 🚀 強力買入 |
| 1 ~ 2 | 📈 建議買入 |
| -1 ~ 0 | ⏸️ 持有觀望 |
| -2 ~ -1 | 📉 建議賣出 |
| ≤ -3 | ⚠️ 強力賣出 |

附加資訊：
- **目標價**：最近壓力線（無壓力線則現價 × 1.05）
- **止損參考**：最近支撐線 × 0.98

---

## 資料流

```
localStorage ──→ usePortfolio（持倉狀態）
                      │
                      ▼
              useMultipleQuotes ──→ Yahoo Finance API（側欄即時報價）
                      │
                      ▼
              PortfolioSidebar（持倉列表 + 總損益）

使用者選取股票
        │
        ▼
  useStockData ──→ fetchHistorical（6mo chart）
        │      └→ fetchDividendInfo（2y chart + events）
        │
        ▼
  StockDetail
    ├── 損益卡片
    ├── 市場行情列
    ├── 除息資訊列
    ├── StockChart（走勢圖 + 支撐壓力線）
    └── StrategyPanel（RSI + 均線 + 策略建議）
```

---

## 快取機制

- 每檔股票資料快取 90 秒（`useStockData`）
- 快取存於記憶體（`Map`），重整頁面後清除
- 同一 symbol 重複選取時直接讀快取，不重打 API

---

## 檔案結構

```
src/
├── types.ts                    # TypeScript 型別定義
├── api/
│   └── yahoo.ts                # Yahoo Finance API 封裝
├── hooks/
│   ├── usePortfolio.ts         # 持倉 CRUD + localStorage
│   └── useStockData.ts         # 行情 + 歷史資料 fetching + 快取
├── utils/
│   └── technical.ts            # 技術分析（支撐壓力、RSI、策略評分）
├── components/
│   ├── AddStockModal.tsx        # 新增股票 Modal（含代碼驗證）
│   ├── PortfolioSidebar.tsx     # 左側欄（持倉列表 + 總覽）
│   ├── StockDetail.tsx          # 主區域（損益 + 圖表 + 策略）
│   ├── StockChart.tsx           # Recharts 走勢圖
│   └── StrategyPanel.tsx        # 技術分析與策略建議面板
├── App.tsx
├── App.css
└── main.tsx
```

---

## 已知限制

1. **Yahoo Finance API 限制**：`/v1/finance/search` 與 `/v11/finance/quoteSummary` 受 Bot 保護封鎖，目前僅使用 `/v8/finance/chart`
2. **次日收盤更新**：Yahoo Finance 歷史資料以收盤價為主，當日盤中使用 `meta.regularMarketPrice`
3. **除息日估算**：無法直接取得未來除息日，以歷史平均配息間隔推算，僅供參考
4. **CORS**：僅在 Vite 開發伺服器（含 proxy）下運作；正式部署需另設後端 proxy 或使用支援 CORS 的 API
