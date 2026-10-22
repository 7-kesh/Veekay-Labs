# Scalp rules (1-minute small-cap, paper trading)

Seeded from TradeVenture/Trade_Journal_20261019.md section 1.1 and Strategy_Change_Log.md.
These files are what Claude grades against. Edit them here when your strategy changes, and log the change
in Strategy_Change_Log.md as usual. Any strategy change is a red flag.

## Setups
- **Setup A, support hold:** (1) established support exists, (2) C1 holds established support,
  (3) C2 crosses C1 high intrabar -> potential entry. Established support = a level that has held for several
  candles; a low formed one or two candles ago is not established.
- **Setup B, resistance break:** (1) established resistance exists, (2) C1 breaks AND CLOSES above it,
  (3) C2 crosses C1 high intrabar -> potential entry. No retest required. A wick through with a close below
  is not a break.
- **Setup C (experimental v0.4, Category X, never counted in A/B results):** price between established support
  and resistance with meaningful room; the last two candles hold the 8 EMA and trend up; MOM and TTM positive
  (yellow TTM = weaker confirmation); current candle crosses above the previous candle high; stop a few cents
  below the previous candle low; sized by risk. Declared before entry, never a relabel of a failed A/B.
- Trigger: buy intrabar when C2 crosses above C1 high. A missed C2 is a missed trade. Only support/resistance
  known at entry may be used.

## Gates (all must pass after A/B/C triggers)
- MOM and TTM improving towards positive (both). Negative and still falling does not confirm. Positive but
  falling is a risk signal to record, not a fail.
- 8 EMA above 21 EMA, all setups.
- Not significantly extended from the 8 EMA: a fill more than about $0.20 above it is extended, read with the
  stock's volatility.
- Structural stop identified BEFORE entry.
- Room to the next known resistance/HOD of at least 1R: (resistance - entry) >= (entry - stop).
  HOD stays resistance until broken. VWAP is not resistance. A single candle body is not known resistance.
- No danger structure overhead (double top, repeated rejection).

## Risk and size
- 1R = $20 maximum planned risk. Shares = floor($20 / (entry - stop)). Less risk is allowed.
- Standing size 50 shares with a mental stop within about $0.40. A high-risk trade starts at 20 shares.
  A really good setup with a stop $0.20-$0.40 away can go to 50-100 shares. The stop comes first, then size.
- Mental stop: aim under $0.40 per share. Exit early only on objective deterioration; an early exit without it
  is a fear/emotional exit. One candle failing to make a new high is not deterioration.

## Exit plan
- Scale out about 25% of the REMAINING position at the peak (candle rising and extended from the 8 EMA fast).
- Then candle by candle: next candle beats the previous high -> stay; if not, watch one more candle and take
  another 25% if it drops; exit fully if the trade does not survive.
- A planned 25% partial is a valid exit. A full exit where the plan calls for a second 25% is recorded as early.

## Categories (Trade_Log.csv)
- A clean execution; B valid entry with an execution or management issue; C invalid entry;
  X experimental Setup C.

## Primary violation tags
No established support; Inadequate room to resistance; Extended / chase; Anticipated trigger;
MOM/TTM not confirming; Late entry / setup expired.
