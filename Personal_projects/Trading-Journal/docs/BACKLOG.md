# Trading Journal: Backlog

> Items not yet scheduled. Move to the Session Log in `PROJECT-SUMMARY.md` when done.

## Housekeeping

- [ ] **Confirm the upload freeze is gone** on a saved trade (Veekay to confirm). If it persists, look at original-size PNG upload/processing.
- [ ] **Fix or disconnect the Cloudflare git-triggered builds.** They sit stuck in the queue and duplicate what `npx wrangler deploy` already ships. Deploys currently go through wrangler (only on Veekay saying "deploy").
- [ ] **Retire the local Flask app** (`./run.sh`, http://127.0.0.1:5057) once Veekay trusts the hosted version fully. Veekay's call.
- [ ] **Add futures fields** to the trade form. Veekay's call on scope.
- [ ] **Note for other machines:** run `npm install` first if wrangler fails with an esbuild platform error.

## Options form (from wireframe feedback, 2026-10-27)

- [ ] Confirm the liquidity thresholds (`LIQUIDITY` in `calc.js`): spread 5%/10%, volume 500, open interest 1,000.

## Portfolio, capital and settings (2026-10-27)

- [x] Capital semantics confirmed 2026-10-27: Settings numbers are starting capital; profits raise the level.
- [ ] **Set real dates on the MSTR and HPE plans.** MSTR's exit date is really 2026-10-22 (entry date not given); HPE is still open, so its exit date should be empty. MSTR's 2026-10-30 placeholder is why the calendar leaves its +$109.96 out. Clearing a date is allowed (the calendar then uses the plan date).
- [ ] **Decide on the Claude review panels** in the three forms and the Strategy rule-change check. They still run on the default model after the Settings model field was removed.
- [ ] Optional: scalp "open" detection only counts trades with no result, no exits and an entry plus shares. Revisit if intraday scalps should reduce available capital while they are being entered.
- [ ] Optional: Options stats panel comparing the premium estimate with actual exits, after about 10 closed trades.
