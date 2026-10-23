// Port of app/templates/settings.html, trimmed to what applies in the hosted app - the
// per-machine bits (API key file path, CSV import, local backups) don't exist anymore; the
// API key is a Cloudflare secret and there's no local filesystem to import from or back up.
import { getSettings } from '../db.js';
import { supabase } from '../supabase-client.js';
import { DEFAULT_SETTINGS } from '../constants.js';
import { esc } from '../format.js';

const LABELS = {
  account_balance: 'Account balance ($)',
  options_risk_pct: 'Options risk per trade (%)',
  swing_risk_pct: 'Swing risk per trade (%)',
  swing_min_rr: 'Swing minimum reward:risk',
  scalp_risk_dollars: 'Scalp 1R ($)',
  default_shares: 'Default scalp shares',
  default_commission: 'Default commission ($)',
  review_model: 'Claude review model',
};

export async function render(_params, el) {
  const s = await getSettings();

  el.innerHTML = `
    <div class="head"><h1>Settings</h1></div>
    <section class="card">
      <form id="settingsForm">
        ${Object.keys(DEFAULT_SETTINGS).map(k => `
          <div class="fld f-md" style="margin-bottom:10px">
            <label for="i_${k}">${esc(LABELS[k] || k)}</label>
            <input id="i_${k}" name="${k}" value="${esc(s[k] ?? '')}">
          </div>`).join('')}
        <div class="actions"><button class="btn primary" type="submit">Save</button></div>
        <p class="muted" id="savedMsg" hidden>Saved.</p>
      </form>
    </section>
    <section class="card muted" style="margin-top:16px">
      The Claude API key and allow-listed login email are Cloudflare secrets on the deployed
      Worker (<code>ANTHROPIC_API_KEY</code>, <code>ALLOWED_EMAIL</code>) - not editable here.
      Update them with <code>wrangler secret put</code>.
    </section>
  `;

  el.querySelector('#settingsForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const rows = Object.keys(DEFAULT_SETTINGS).map(key => ({ key, value: String(fd.get(key) ?? '') }));
    const { error } = await supabase.from('settings').upsert(rows, { onConflict: 'key' });
    const msg = el.querySelector('#savedMsg');
    if (error) { msg.textContent = 'Could not save: ' + error.message; msg.hidden = false; return; }
    msg.textContent = 'Saved.'; msg.hidden = false;
    setTimeout(() => { msg.hidden = true; }, 2000);
  });
}
