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
