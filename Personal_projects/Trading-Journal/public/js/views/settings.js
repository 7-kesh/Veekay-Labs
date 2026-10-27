// Port of app/templates/settings.html, trimmed to what applies in the hosted app - the
// per-machine bits (API key file path, local backups) don't exist anymore; the API key is a
// Cloudflare secret, and CSV import is replaced by the one-time local-data import below.
import { getSettings, getCapitalData } from '../db.js';
import { supabase } from '../supabase-client.js';
import { esc } from '../format.js';
import { importLocalData } from '../migrate.js';
import { capitalSummary, stripHtml } from '../capital.js';

// Each area is managed on its own: starting capital and risk per trade. Portfolio level = starting
// capital + realized P&L; available (what new trades are sized on) = level - money in open trades.
const SECTIONS = [
  { kind: 'scalp', title: 'Scalp', fields: [
    ['capital_scalp', 'Starting capital ($)'], ['scalp_risk_dollars', 'Risk per trade, 1R ($)'],
    ['default_shares', 'Default shares'], ['default_commission', 'Default commission ($)']] },
  { kind: 'options', title: 'Options', fields: [
    ['capital_options', 'Starting capital ($)'], ['options_risk_pct', 'Risk per trade (% of available)']] },
  { kind: 'swing', title: 'Swing', fields: [
    ['capital_swing', 'Starting capital ($)'], ['swing_risk_pct', 'Risk per trade (% of available)'], ['swing_min_rr', 'Minimum reward:risk']] },
  { kind: 'futures', title: 'Futures', note: 'Futures trading is coming soon. These are saved for when it opens.', fields: [
    ['capital_futures', 'Starting capital ($)'], ['futures_risk_pct', 'Risk per trade (% of available)']] },
];
const GENERAL = [['review_model', 'Claude review model']];
const KEYS = [...SECTIONS.flatMap(s => s.fields.map(f => f[0])), ...GENERAL.map(f => f[0])];

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
          ${sec.kind === 'futures' ? '' : stripHtml(capitalSummary(s, sec.kind, cap.entries, cap.open, { account: 'live' }), sec.title) }
          ${sec.note ? `<p class="muted note">${esc(sec.note)}</p>` : ''}
          <div class="setfields">${sec.fields.map(input).join('')}</div>
        </section>`).join('')}
      </div>
      <section class="card" style="margin-top:16px"><h2>General</h2><div class="setfields">${GENERAL.map(input).join('')}</div>
        <p class="muted note">Portfolio level = starting capital + realized P&amp;L. Available = level minus the money in open trades, and that is what new options and swing plans are sized on. The strips above show the live account.</p>
        <div class="actions"><button class="btn primary" type="submit">Save</button></div>
        <p class="muted" id="savedMsg" hidden>Saved.</p></section>
    </form>
    <section class="card muted" style="margin-top:16px">
      The Claude API key and allow-listed login email are Cloudflare secrets on the deployed
      Worker (<code>ANTHROPIC_API_KEY</code>, <code>ALLOWED_EMAIL</code>) - not editable here.
      Update them with <code>wrangler secret put</code>.
    </section>
    <section class="card" style="margin-top:16px">
      <h2>Import local data</h2>
      <p class="muted">One-time import of the JSON exported from the local Flask app's
        <code>data/journal.db</code> (scalp trades, history, reviews). Safe to run more than
        once - any trade already present (matched by trade number) is skipped.</p>
      <input type="file" id="importFile" accept=".json">
      <button class="btn primary" id="importBtn" type="button" style="margin-left:8px">Import</button>
      <pre id="importLog" class="muted" style="white-space:pre-wrap;margin-top:8px"></pre>
    </section>
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

  el.querySelector('#importBtn').addEventListener('click', async () => {
    const fileInput = el.querySelector('#importFile');
    const out = el.querySelector('#importLog');
    const file = fileInput.files[0];
    if (!file) { out.textContent = 'Choose a file first.'; return; }
    out.textContent = 'Importing…\n';
    try {
      const result = await importLocalData(file, (msg) => { out.textContent += msg + '\n'; });
      out.textContent += `Done: ${result.trades} trades, ${result.history} history rows, ${result.reviews} reviews imported.`;
    } catch (err) {
      out.textContent += 'Error: ' + (err.message || err);
      console.error(err);
    }
  });
}
