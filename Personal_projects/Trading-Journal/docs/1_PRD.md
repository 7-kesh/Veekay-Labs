# KeshavTrades — Product Requirements

## Product overview
KeshavTrades is a private, single-user trading and investment journal for Indian markets. The product is organised around four clear workspaces: **Intraday**, **Swing**, **Investing**, and **MF / ETFs**.

## Core workspaces

### Intraday
Capture intraday trades, entry and exit details, position sizing, risk, setups, execution quality, screenshots, and post-trade reviews. Trade planning and advanced instrument metrics are available within this workspace.

### Swing
Plan and track multi-day trades, record intended entry, stop and target, then compare the plan with actual execution and realised results.

### Investing
Maintain a long-term equity portfolio with buy/sell transactions, quantity, purchase price, fees, average cost, latest manually entered market price, current value and unrealised profit/loss.

### MF / ETFs
Maintain separate mutual-fund and ETF holdings. Record SIP-style or lump-sum purchases and redemptions, units, NAV or price, fees, cost basis, latest manually entered valuation and returns.

## Shared capabilities
- Private authentication and owner-scoped Supabase Row Level Security.
- Dashboard, portfolio analytics, calendar, weekly reviews and learning journal.
- CSV/file import with AI-assisted extraction staged for user review before saving.
- Export and audit-friendly transaction history.

## Data and pricing principles
- Existing journal records are preserved during the workspace redesign.
- Investment and fund transactions use dedicated tables and are not mixed with trade-plan records.
- Latest market prices and NAVs are manually maintained until a verified market-data provider is integrated.
- No automatic broker sync or live market feed is implied.

## Product navigation
1. Intraday
2. Swing
3. Investing
4. MF / ETFs
5. Portfolio, Reviews, Journal, Education and Settings
