// Settings: capital and risk for each area, managed separately. Portfolio level = starting capital +
// realized P&L; available (what new trades are sized on) = level - money in open trades.
// The Claude model, API-key note and one-time local-data import were removed 2026-10-27 (no longer
// used from here); migrate.js is still in the repo if the import is ever needed again.
import { getSettings, getCapitalData } from '../db.js';
import { supabase } from '../supabase-client.js';
import { esc } from '../format.js';
import { capitalSummary, stripHtml } from '../capital.js';

const SECTIONS = [
  { kind: 'scalp', title: 'Intraday', fields: [
    ['capital_scalp', 'Starting capital ($)'], ['scalp_risk_dollars', 'Risk per trade, 1R ($)'],
    ['default_shares', 'Default shares'], ['default_commission', 'Default commission ($)'],
    ['capital_options', 'Plan capital ($)'], ['options_risk_pct', 'Plan risk (% of available)']] },
  { kind: 'swing', title: 'Swing', fields: [
    ['capital_swing', 'Starting capital ($)'], ['swing_risk_pct', 'Risk per trade (% of available)'], ['swing_min_rr', 'Minimum reward:risk']] },
  { kind: 'investing', title: 'Investing', note: 'Long-term equity holdings are tracked through transactions and manually updated market prices. No separate trading-risk settings are needed.' , fields: [] },
  { kind: 'funds', title: 'MF / ETFs', note: 'Mutual fund and ETF holdings are tracked through transactions and manually updated NAV / market prices. No separate trading-risk settings are needed.', fields: [] },
];
const KEYS = SECTIONS.flatMap(s => s.fields.map(f => f[0]));

export async function render(_params, el) {
  const s = await getSettings();
  const cap = await getCapitalData(s);
  const input = ([k, label]) => `<div class="fld f-md" style="margin-bottom:10px">
      <label for="i_${k}">${esc(label)}</label><input id="i_${k}" name="${k}" value="${esc(s[k] ?? '')}"></div>`;

  el.innerHTML = `
    <div class="head pagehero"><h1>Settings <small>capital and risk, one area at a time</small></h1></div>
    <form id="settingsForm">
      <div class="setgrid">
        ${SECTIONS.map(sec => `<section class="card setcard ${sec.kind === 'futures' ? 'sec-futures-card' : 'pnl-' + sec.kind}">
          <h2>${sec.title}</h2>
          ${stripHtml(capitalSummary(s, sec.kind, cap.entries, cap.open, { account: 'live' }), sec.title)}
          ${sec.note ? `<p class="muted note">${esc(sec.note)}</p>` : ''}
          <div class="setfields">${sec.fields.map(input).join('')}</div>
        </section>`).join('')}
      </div>
      <p class="muted note">Portfolio level = starting capital + realized P&amp;L. Available = level minus the money in open trades, and that is what new trades are sized on. The strips above show the live account.</p>
      <div class="row"><button class="btn primary" type="submit">Save</button><span class="muted" id="savedMsg" hidden>Saved.</span></div>
    </form>
  `;

  el.querySelector('#settingsForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const rows = KEYS.map(key => ({ key, value: String(fd.get(key) ?? '').replace(/[$,]/g, '').trim() }));
    const { error } = await supabase.from('settings').upsert(rows, { onConflict: 'key' });
    const msg = el.querySelector('#savedMsg');
    if (error) { msg.textContent = 'Could not save: ' + error.message; msg.hidden = false; return; }
    msg.textContent = 'Saved.'; msg.hidden = false;
    setTimeout(() => { msg.hidden = true; }, 2000);
  });
}
