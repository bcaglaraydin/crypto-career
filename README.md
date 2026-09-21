# 🪙 Binance PnL Terminal (Lifetime Profit & Loss Analytics)

> **A Privacy-First (Local-First), Professional Binance Portfolio & PnL Terminal.**  
> Analyzes 8+ years of Spot and USDⓈ-M Futures trade history with historical exchange rate matching to calculate your true net financial balance.

---

## 🌟 Overview & Key Features (Showcase)

Standard crypto exchange interfaces typically restrict PnL tracking to the last 30 or 90 days and ignore fiat exchange rate fluctuations (USDT/TRY or USD). **Binance PnL Terminal** reconstructs your entire financial timeline directly on your local machine:

1. **Lifetime True Profit & Loss:**
   - Scans 8+ years of trade history (800+ orders) and transfers.
   - Strictly separates **Realized PnL** (closed trades) from **Unrealized PnL** (open positions & wallet holdings).
2. **Live Futures Position Risk Monitor:**
   - Real-time tracking of active USDⓈ-M contracts (`EIGEN`, `ORDI`, `APT`, `BEL`, etc.).
   - Displays Leverage, Entry Price, Mark Price, ROE (%), and **Liquidation Risk Shield**.
3. **Active Spot Wallet Holdings:**
   - Filters out zero-balance historical coins to showcase only currently held assets.
   - Highlights Portfolio Share % (inline progress bar), average unit cost basis, and custom cost adjustments (`CUSTOM` / `TRANSFER`).
4. **"What If I Sold at the Peak?" (Bull Run / ATH Simulation):**
   - Simulates wallet liquidation at the 2021 and 2024 bull cycle peaks.
   - Quantifies unrealized paper gains surrendered during bear market drawdowns.
5. **Multi-Resolution Charts (1D / 1W / 1M):**
   - Resamples Net Worth, ATH Mark-to-Market, and Cumulative PnL into Daily (1D), Weekly (1W), or Monthly (1M) candlestick-style closing snapshots.
6. **Behavioral Finance & Trading Strategy Insights:**
   - Compares active trading months (≥20 trades/mo) against passive holding (HODL) periods to evaluate capital efficiency.
7. **Mobile-First & Expandable Architecture:**
   - Automatically converts dense 9-column tables into touch-friendly cards on mobile screens (`sm:hidden`).
   - Global **"Expand All / Collapse All"** master toggle for compact summary strips.
8. **Smart Incremental (Delta) Synchronization:**
   - Instead of scanning 8 years repeatedly, fetches delta updates from the last sync timestamp in ~3 seconds.

---

## 🛡️ Privacy & Security (Local-First)

* **Zero Cloud Storage:** All trade records, API responses, and cost adjustments stay on your machine in a local SQLite database (`crypto_tracker.db`).
* **Read-Only API Requirement:** Requires **ONLY** "Enable Reading" permissions. Trading and Withdrawal permissions must remain disabled.
* **Zero Secrets Committed:** Fully protected with an airtight `.gitignore` to prevent API key leaks.

---

## 🚀 Quick Start

### Prerequisites
* [Node.js](https://nodejs.org/) (v20 or higher recommended)
* npm, yarn, or pnpm

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/crypto-track.git
cd crypto-track
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment
Copy the example environment configuration:
```bash
cp .env.example .env.local
```
Open `.env.local` and paste your Binance Read-Only API credentials:
```env
BINANCE_API_KEY=your_binance_api_key_here
BINANCE_API_SECRET=your_binance_api_secret_here
```
*(Tip: You can also test the entire application instantly without API keys by clicking **"Demo Data"** in the dashboard header).*

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🛠️ Tech Stack

| Domain | Technology | Description |
| :--- | :--- | :--- |
| **Framework** | Next.js 16 (App Router) | High-performance React 19 architecture |
| **Language** | TypeScript | Type-safe financial calculation engine |
| **Styling** | Tailwind CSS v4 | Dark-first financial terminal design tokens (`DESIGN_SYSTEM.md`) |
| **Data Visualization** | Recharts | Area, line, bar, and donut charts |
| **Database** | Node.js Native SQLite (`node:sqlite`) | Zero-config, embedded, high-performance SQL database |
| **Icons** | Lucide React | Minimalist UI iconography |

---

## 📂 Project Architecture

```text
crypto-track/
├── src/
│   ├── app/
│   │   ├── api/             # API routes (sync, portfolio, seed, custom-cost)
│   │   ├── globals.css      # Dark theme & responsive utility classes
│   │   ├── layout.tsx       # Root layout & document metadata
│   │   └── page.tsx         # Dashboard page & tab navigation
│   ├── components/
│   │   ├── Header.tsx               # Top bar, rate indicator, sync triggers
│   │   ├── MetricCards.tsx          # 5 core financial summary cards (expandable)
│   │   ├── FuturesPositionsTable.tsx# Live futures contracts table & mobile cards
│   │   ├── SpotHoldingsTable.tsx    # Active spot wallet & portfolio allocation
│   │   ├── PnLCharts.tsx            # Multi-resolution (1D/1W/1M) timeline charts
│   │   ├── CoinTable.tsx            # Lifetime 87-coin PnL breakdown
│   │   └── TransfersTable.tsx       # Deposit & withdrawal cash flow records
│   └── lib/
│       ├── binance.ts       # Binance REST API client (HMAC-SHA256 signed)
│       ├── db.ts            # SQLite schema, indexing & query helpers
│       ├── pnl-calculator.ts# FIFO cost matching & Mark-to-Market engine
│       └── sync-engine.ts   # Incremental delta & full historical sync runner
├── DESIGN_SYSTEM.md         # Single Source of Truth for styling & components
├── .env.example             # Safe environment variables template
├── .gitignore               # Security & data isolation rules
└── package.json
```

---

## 📜 License

This project is licensed under the MIT License. Feel free to use, modify, and distribute.
