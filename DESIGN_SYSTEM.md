# Design System: Crypto PnL Tracker

This document serves as the **Single Source of Truth** for all UI, UX, styling, layout, components, and visual behavior across the Crypto PnL Tracker application. All components and views must strictly follow the rules defined here.

---

## 1. Design Philosophy

- **Dark-First Financial Terminal:** Built for clarity, readability, and reduced eye strain during extended analytical sessions.
- **Unambiguous Financial Feedback:** Profits and losses must be instantly distinguishable with clear, consistent color-coding and direction indicators (↑ / ↓, + / -).
- **Tabular Precision:** All financial numbers (prices, quantities, percentages, totals) must use monospace/tabular figures (`tabular-nums`) to align digits perfectly and eliminate layout shifts.
- **Hierarchy & Density:** High information density without visual clutter. Key summary cards at top, analytical charts in the middle, deep-dive sortable tables at the bottom.

---

## 2. Color Palette & Design Tokens

### Backgrounds & Surfaces (Dark Mode)
| Token | Class / Hex | Usage |
| :--- | :--- | :--- |
| **Canvas / Body** | `#0B0E14` (`bg-slate-950` / `#0b0e14`) | Main application background |
| **Surface (Card)** | `#121722` (`bg-[#121722]`) | Metric cards, chart containers, table containers |
| **Surface Hover** | `#18202F` (`hover:bg-[#18202f]`) | Table row hover, button hover, dropdown items |
| **Surface Active** | `#1F293D` (`bg-[#1f293d]`) | Active tab, selected item |
| **Border / Divider** | `#1E2738` (`border-[#1e2738]`) | Card borders, table cell dividers, header bottom border |

### Financial Semantic Colors
| State | Text Class | Background Pill | Border Class |
| :--- | :--- | :--- | :--- |
| **Profit / Gain** | `text-emerald-400` (`#34d399`) | `bg-emerald-500/10` | `border-emerald-500/20` |
| **Loss** | `text-rose-400` (`#fb7185`) | `bg-rose-500/10` | `border-rose-500/20` |
| **Neutral / Cash** | `text-slate-400` (`#94a3b8`) | `bg-slate-800/60` | `border-slate-700/40` |
| **Warning / Notice** | `text-amber-400` (`#fbbf24`) | `bg-amber-500/10` | `border-amber-500/20` |
| **Brand Accent** | `text-sky-400` (`#38bdf8`) | `bg-sky-500/10` | `border-sky-500/20` |

### Text Colors
| Role | Class | Color |
| :--- | :--- | :--- |
| **Primary Headings & Values** | `text-slate-100` | `#f1f5f9` (Maximum contrast) |
| **Secondary / Labels** | `text-slate-400` | `#94a3b8` (Subtitles, table headers) |
| **Muted / Timestamps / Extra** | `text-slate-500` | `#64748b` (Disclaimers, inactive items) |

---

## 3. Typography & Numerical Formatting

- **Font Family:** Inter, system sans-serif for UI labels; Monospace (`font-mono`) or `tabular-nums` for all monetary amounts, prices, dates, and percentages.
- **Formatting Conventions:**
  - **USD Values:** `$1,234.56` (positive: `+$1,234.56` in emerald; negative: `-$450.20` in rose).
  - **TRY Values:** `₺45,678.90` (same color convention as USD).
  - **Percentages:** `+18.45%` (emerald), `-7.20%` (rose).
  - **Small Crypto Quantities:** Dynamic precision: up to 6 decimals for sub-unit quantities (`0.000830 BTC`), 4 decimals for standard coins, right-aligned in tables.

---

## 4. Component Patterns

### Metric Summary Cards
- Rounded corners: `rounded-xl`
- Border: `border border-[#1e2738]`
- Background: `bg-[#121722]/80 backdrop-blur-sm`
- Content Layout:
  - Top row: Subtitle/Label in `text-xs font-medium uppercase tracking-wider text-slate-400` with subtle Lucide icon.
  - Middle: Primary value in `text-2xl font-bold font-mono tracking-tight text-slate-100`.
  - Bottom row: Secondary currency equivalent (`text-xs text-slate-400 font-mono`) and 24h/lifetime percentage badge.

### Interactive Tables
- Sticky headers with `bg-[#121722]/95 backdrop-blur z-10 border-b border-[#1e2738]`.
- Row height: compact/medium (`py-3.5 px-4`).
- Interactive hover: `hover:bg-[#18202f]/70 transition-colors`.
- Numeric columns (Price, Amount, PnL, ROI, ROE) must be **right-aligned** (`text-right`).
- Name / Symbol column left-aligned with crypto icon badge.
- **Futures Positions Table:**
  - Direction badges: `LONG` (`bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold`) and `SHORT` (`bg-rose-500/15 text-rose-400 border border-rose-500/30 font-bold`).
  - Leverage pill: `bg-sky-500/10 text-sky-400 border border-sky-500/20 font-mono text-[10px]`.
  - Liquidation Price: warned with `ShieldAlert` icon and `text-amber-400/90` to highlight margin liquidation risk.
  - ROE: `%` badge color-coded in emerald/rose with bold tabular figures.
- **Spot Holdings Table (Active Wallet):**
  - Displays exclusively active holdings with positive balance (`currentQty > 0`).
  - Portfolio Allocation: compact inline horizontal progress bar (`bg-sky-400` with `bg-slate-800` track) and bold percentage pill.
  - Cost Source Badge: `CUSTOM` (indigo pill) or `DEPOSIT_MATCH` (amber pill).

### Action Buttons & Tabs
- **Primary Button:** `bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold px-4 py-2 rounded-lg transition-colors`.
- **Secondary Button:** `bg-[#18202f] hover:bg-[#202b3f] text-slate-200 border border-[#1e2738] px-3.5 py-2 rounded-lg`.
- **Split Action Button (Sync):** Primary action button with attached chevron dropdown trigger (`rounded-l-lg` + `rounded-r-lg` separated by border), allowing quick default action (incremental sync) with secondary advanced action (full 8-year sync).
- **Sync Status Banner:** Fixed or top banner with `bg-sky-950/40 border-t border-sky-500/30 text-sky-300` and mode badge (`bg-sky-500/20 text-sky-300 border border-sky-500/30 font-mono text-[10px]`).
- **Tab Pill:** Inactive `text-slate-400 hover:text-slate-200 hover:bg-[#18202f]`; Active `bg-sky-500/15 text-sky-400 border border-sky-500/30`.
- **Chart Resolution Switcher (1D / 1W / 1M):** Segmented pill control in `bg-[#18202f] border border-[#1e2738] rounded-lg p-1 text-xs font-mono font-semibold`. Active pill uses `bg-sky-500 text-slate-950 shadow-sm rounded-md`.

### Chart Guidelines
- Dark background integration: transparent canvas.
- Grid lines: subtle `stroke-[#1e2738]` with dashed line pattern (`strokeDasharray="3 3"`).
- Tooltips: custom dark card `bg-[#18202f] border border-[#2d3748] rounded-lg shadow-xl p-3`.
- Profit bars/lines: `#10b981` (emerald-500).
- Loss bars/lines: `#f43f5e` (rose-500).
- Net Worth Area gradient: `#38bdf8` (sky-400).
- Mark-to-Market (ATH Simulation) Area gradient: `#f59e0b` (amber-500). Tab button active token: `bg-amber-400 text-slate-950 font-semibold`.
- Multi-resolution resampling: Dynamic aggregation into daily (1D, ~1,500 pts), weekly (1W, ~220 pts), or monthly (1M, ~50 pts) periodic closing snapshots.

---

## 5. Ultrawide & High-Resolution Display Standards (21:9 / 32:9)

- **Fluid Layout Container:** Widescreen displays (1440p, 4K, 3440x1440, 5120x1440) must never be locked to narrow containers (like `max-w-7xl`). Use `w-full max-w-[2400px] mx-auto px-4 sm:px-8 xl:px-12 2xl:px-16`.
- **Proportional Widescreen Density:**
  - Cards expand fluidly in 5 columns with generous spacing (`gap-5`).
  - Charts utilize expanded height (`h-80` to `h-96`) to maximize analytical visibility on tall ultrawide screens.
  - Tables utilize full horizontal breadth with comfortable column padding, eliminating cramped text or unnecessary horizontal scrollbars.
  - Side-by-side analytical sections utilize 12-column responsive grids (`lg:grid-cols-3 2xl:grid-cols-4`).

---

---

## 6. Collapsible & Expandable Pattern (Accordion & Row Drill-down)

- **Section-Level Collapsible:**
  - Headers must include an interactive chevron toggle (`ChevronDown` / `ChevronUp` or `[ - ] / [ + ]`) and summary chips when collapsed.
  - When collapsed, the body is hidden with clean transition, but high-level aggregate metrics remain visible in the header bar (e.g., `4 Positions | +$35.28 Unrealized PnL` or `17 Assets | $226.89`).
  - Global toolbar controls allow one-click `"Collapse All / Expand All"` across all active sections.
- **Row / Card-Level Expandable:**
  - In mobile card layouts or detailed table rows, clicking or tapping a card/row expands a secondary panel showing detailed metrics (e.g. entry price, liquidation price, margin, custom cost breakdown, transfer dates, transaction history) without cluttering the primary view.

---

## 7. Mobile-First Responsive Standards (320px - 768px)

- **Table-to-Card Transformation (`sm:hidden` vs `hidden sm:table`):**
  - Horizontal tabular data with >4 columns must not be forced into a cramped table with horizontal scrollbars on mobile viewports.
  - Instead, render clean touch-friendly card views (`sm:hidden`) on mobile:
    - Card Header: Asset icon, symbol, name, and total value ($ / ₺).
    - Card Body: Primary metrics (PnL badge, allocation progress bar, leverage tag).
    - Expandable Drawer: Tap to reveal deep metrics (liquidation price, exact quantities, unit cost, cost basis source).
- **Metric Cards Grid:**
  - Mobile: 2 columns (`grid-cols-2 gap-2.5`) with adaptive typography (`text-xl font-bold font-mono`).
  - Tablet/Desktop: 5 columns (`sm:grid-cols-3 lg:grid-cols-5 gap-4`).
- **Touch-Friendly Tab Navigation:**
  - Horizontal scrollable tab bar on mobile (`flex overflow-x-auto no-scrollbar py-1 space-x-2`).
  - Minimum tap target of 40px height for mobile buttons and tabs.
- **Mobile Header:**
  - Compact layout: Title and quick sync button visible; secondary actions (CSV, Demo data) accessible via collapsible menu or compact icon triggers to prevent toolbar overflow on 375px screens.

---

## 8. Unified Management Modal & Settings Hub Pattern

- **Single Hub Principle:** All administrative, setup, credential management, historical lookback ranges, external file ingestion (CSV), and network connection configurations must be centralized into a single unified dialog (`SettingsHubModal`).
- **Modal Architecture:**
  - **Dark Backdrop:** `bg-black/80 backdrop-blur-md z-50` with centered, rounded container (`rounded-2xl border border-[#1e2738] bg-[#121722] max-h-[92vh]`).
  - **Tabbed Sub-Navigation:** Segmented tabs across the top (`API Credentials`, `History Lookback`, `CSV Import`, `Mobile Access`, `Database & Demo`) with active indicators.
  - **Inline Verification:** Credential inputs must include inline live test actions (`Test Credentials`) with real-time semantic status pills (`bg-emerald-500/10 text-emerald-300` or `bg-rose-500/10 text-rose-300`).
  - **Step-by-Step Educational Guides:** In-modal visual tutorials with ordered lists, security disclaimers (emphasizing read-only permissions and local SQLite storage), and direct external links to Binance management pages.
  - **Network & LAN Address Discovery:** Render detected Wi-Fi/Ethernet IPv4 URLs with single-tap copy actions (`Copy Link`) for frictionless mobile onboarding.

---

## 9. Maintenance Rule

Any new component, color variation, or visual interaction must be evaluated against this document. When a new recurring design pattern emerges, update this document first to preserve long-term consistency.

