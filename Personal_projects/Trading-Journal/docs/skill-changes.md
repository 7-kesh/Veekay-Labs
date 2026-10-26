# Proposed changes to the `trade-journal` skill (not yet applied)

Skill location: the Claude app's `trade-journal` skill (source of truth for the frozen strategy). These changes make it consume the app's export bundle and return a structured wrap-up. Apply only after Veekay signs off on the formats below. Per the skill's own rule, none of this changes the strategy itself.

## 1. New input: the app's export bundle (`tj-export/1`)
Add a mode (call it "Mode A2 - App export") alongside the existing broker-screenshot / ChatGPT-prompt flow:
- Trigger: Veekay uploads a `trade_*.zip` / `day_*.zip` (or its extracted files), or pastes `trade.json` / `day.json`.
- Read `trade.json`: `trade` (Veekay's recorded fields; absent = "not recorded"), `setup_c`, `derived.reset_gap_seconds`, `screenshots`. Read `day.json` for the day index and totals.
- Treat the app's fields as Veekay's own record and the screenshots as the evidence. Apply the existing standing rules unchanged: judge only what was visible at entry, P&L never decides validity, never invent stops or levels, mark missing evidence "not recorded".
- Cross-check recorded fields against the screenshots and flag disagreements (e.g. recorded support vs what the chart shows, recorded entry time vs the order screenshot) instead of silently trusting either.
- If the broker order screenshot is missing from the bundle, ask for it before computing fills and P&L (existing rule).

### 1a. Drop folder (how the skill gets the zip)
- Inbox: `TradeVenture/App_Exports/` (same pattern as `Journal_Prompts/`). Veekay saves the downloaded `trade_*.zip` / `day_*.zip` there. A bundle is **deleted by end of day once consumed** (assessed and its wrap-up produced); there is no Processed archive, because the app holds the data and screenshots (screenshots auto-delete in the app after 7 days).
- Trigger: Veekay says "assess today's trades" / "check App_Exports", or a new zip is present when he starts a journal update. Process multiple zips oldest first.
- Read the zip directly from disk with Python (`zipfile`), no manual extraction: read `trade.json` / `day.json` as JSON, and open the screenshots from the zip as images. Extract to a temp folder outside `mnt/` only if an image viewer step needs real files; never write into the inbox.
- Fallback when the skill cannot read a zip (plain chat upload): Veekay extracts it and uploads `trade.json` plus `screenshots/*`. File names inside the zip are already chat-friendly, so no renaming is needed.
- **To confirm before building on this:** put one real exported zip in `TradeVenture/App_Exports/` and ask the skill to read it. If the skill cannot open it, switch the app to download loose files instead of a zip (small change in `export-bundle.js`).
- Never modify a zip. Delete each consumed zip by end of day: when Veekay says "wrap up for today" and the wrap-up block has been produced, delete that day's zips from `App_Exports/` (ask first only if the wrap-up was not completed, e.g. the chat ended early). At the first run of the next day, also delete any consumed zip left over. Unconsumed zips are never deleted.

## 2. Assessment behavior
- Per trade: run the existing Objective Assessment, then **ask Veekay questions** wherever evidence is thin or his record and the chart disagree (declared setup, stop placed before entry, what he saw at the trigger). Do not finalize "Under review" trades until he answers.
- Keep the assessment unbiased: state the verdict per gate with the evidence seen, and say when the evidence is insufficient.
- Tag violations using the app's tag list so the import maps cleanly: No established support, Inadequate room to resistance, Extended / chase, Anticipated trigger, MOM/TTM not confirming, Late entry / setup expired, Planned risk over $20, No stop set before entry, Moved or removed stop, Early exit, Held past stop, Operational error, Missed trigger / chase, 5-min reset violated, Setup C: 8 EMA hold failed, Stop order removed (operational - partial workflow, Open Item 54), No stop order. Anything outside the list goes in free text, not as a new tag.

## 3. New command: "wrap up for today"
On this phrase, gather everything discussed in the chat for the day and produce two outputs:
1. **Readable wrap-up** (for Veekay): journal entry, learnings, improvements.
2. **One fenced `json` block** the app can import, exact schema `tj-wrapup/1`:

```json
{
  "schema": "tj-wrapup/1",
  "date": "YYYY-MM-DD",
  "journal_entry": { "summary": "text", "trades": [ { "trade_no": "T104", "verdict": "text", "category": "A|B|C|D|E|X", "violations": ["tag"], "lesson": "text" } ] },
  "learnings": [ { "text": "what was learned", "trade_nos": ["T104"] } ],
  "improvements": [ { "text": "specific action", "target": { "type": "violation", "value": "Early exit" }, "trade_nos": ["T104"] } ]
}
```
- `target.type` is `violation` (value from the tag list above) or `metric` (value one of: `avg_r`, `win_rate`, `avg_loser`, `avg_winner`, plus an optional `setup` of A, B or C). Use `"none"` only when no measurable target exists.
- Never put rule or strategy changes in `improvements`. A suggested rule change goes under a separate `"strategy_flags"` array of plain text, and the skill's red-flag handling applies (say so in the first line, quote original vs new wording, log in `Strategy_Change_Log.md` only after Veekay confirms).
- Output valid JSON only inside the block (no comments, no trailing commas). The app rejects anything that does not match the schema.

## 4. Journal and ledger handling (decided 2026-10-26: the app's journal is final)
- The app's Daily journal is the final record. The skill stops writing new weekly journal markdown and stops appending to `Trade_Log.csv`; the existing TradeVenture journals and ledger stay as a frozen archive, readable for history.
- The skill still owns the frozen-strategy text, `Strategy_Change_Log.md` and the playbook (strategy documents are not part of the app's journal).
- The "wrap up for today" block is therefore the only journal output that matters; Veekay imports it into the app. The skill should not ask him to also update the markdown journal.
- Tallies the skill used to recompute from `Trade_Log.csv` (cumulative performance, problem-area tracker) now come from the app's Stats pages; the skill can compute them from the uploaded day bundles or ask Veekay for a journal JSON download if it needs history.

## Decisions made (Veekay, 2026-10-26)
1. The app's journal becomes the final record (section 4).
2. Metric targets are right: avg_r, win_rate, avg_loser, avg_winner (before/after only, no dollar ranking).
3. Drop folder is `TradeVenture/App_Exports/`.
4. Export size stays the same (original-resolution PNGs); no smaller bundle option.
5. Screenshots in the app are deleted after 7 days (was 30); consumed export zips are deleted by end of day.

## Still to confirm before applying
- That the skill can open a zip from `App_Exports/` (test with one real export); otherwise the app switches to loose-file downloads.
