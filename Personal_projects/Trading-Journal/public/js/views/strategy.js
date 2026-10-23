// Port of app/templates/strategy.html + app/static/strategy.js. Propose a change -> Claude
// classifies the effect (via the /api/classify-change Pages Function) -> red-flag banner ->
// pick an effective date -> confirm and apply. Nothing is written until "Confirm and apply".
import { STRATEGY_ORDER, STRATEGY_LABELS, SEED_DATE, currentRules, changeLog, applyChange, classifyChange, ruleEffectiveFrom } from '../strategy.js';
import { getSettings } from '../db.js';
import { esc } from '../format.js';
import { dispatch } from '../router.js';
import { buildPlaybookPdf, downloadPdf } from '../playbook-pdf.js';

export async function render(_params, el) {
  const rules = await currentRules('scalp');
  const log = await changeLog('scalp');
  const settings = await getSettings();
  const today = new Date().toISOString().slice(0, 10);

  el.innerHTML = `
    <div class="head"><h1>Strategy</h1>
      <button class="btn" id="downloadPdf" type="button">Download playbook PDF</button></div>
    <section class="card muted">Frozen strategy. Any wording change is a red flag by standing rule - propose it, see how Claude classifies it, then decide.</section>
    ${STRATEGY_ORDER.map(k => `
      <section class="card" style="margin-top:12px">
        <h2>${esc(STRATEGY_LABELS[k])}</h2>
        <p>${esc(rules[k] || '(not set)')}</p>
        <details><summary>Propose a change</summary>
          <form class="proposeForm" data-rule="${esc(k)}" style="margin-top:10px">
            <textarea name="new_text" rows="3" placeholder="New wording">${esc(rules[k] || '')}</textarea>
            <div class="actions" style="margin-top:8px">
              <button type="button" class="btn checkBtn">Check with Claude</button>
            </div>
            <div class="classifyOut"></div>
            <div class="applyRow" hidden>
              <label>Effective from <input type="date" name="effective_from" value="${today}"></label>
              <label><input type="checkbox" name="applies_same_day"> Also apply to today's trades</label>
              <button type="button" class="btn primary applyBtn">Confirm and apply</button>
            </div>
          </form>
        </details>
      </section>`).join('')}

    <section class="card" style="margin-top:16px"><h2>Change log</h2>
      <table class="dense"><thead><tr><th>Date</th><th>Rule</th><th>Effect</th><th>New wording</th></tr></thead>
      <tbody>${(log || []).map(r => `<tr><td>${esc(r.date)}</td><td>${esc(STRATEGY_LABELS[r.rule_key] || r.rule_key)}</td>
        <td>${esc(r.effect || '')}</td><td>${esc((r.new_text || '').slice(0, 200))}</td></tr>`).join('') || '<tr><td colspan="4" class="muted">No changes logged yet.</td></tr>'}
      </tbody></table>
    </section>
  `;

  el.querySelector('#downloadPdf').addEventListener('click', async function () {
    this.disabled = true; this.textContent = 'Building…';
    try {
      const orderedRules = STRATEGY_ORDER.map(k => [k, STRATEGY_LABELS[k], rules[k] || '']);
      const effectiveByKey = {};
      for (const k of STRATEGY_ORDER) effectiveByKey[k] = await ruleEffectiveFrom(k);
      const bytes = await buildPlaybookPdf(orderedRules, log, effectiveByKey, SEED_DATE);
      downloadPdf(`Strategy_Playbook_${today}.pdf`, bytes);
    } catch (err) {
      alert('Could not build the PDF: ' + (err.message || err));
      console.error(err);
    }
    this.disabled = false; this.textContent = 'Download playbook PDF';
  });

  el.querySelectorAll('.proposeForm').forEach(form => {
    const ruleKey = form.dataset.rule;
    const checkBtn = form.querySelector('.checkBtn');
    const out = form.querySelector('.classifyOut');
    const applyRow = form.querySelector('.applyRow');
    let lastClassification = null;

    checkBtn.addEventListener('click', async () => {
      const newText = form.new_text.value.trim();
      if (!newText) return;
      out.textContent = 'Checking…'; checkBtn.disabled = true;
      try {
        const result = await classifyChange(ruleKey, rules[ruleKey] || '', newText, settings.review_model);
        lastClassification = result;
        out.innerHTML = `<div class="flagrow neg"><b>Red flag: this changes the strategy</b> - classified <b>${esc(result.effect)}</b></div>
          <p>${esc(result.explanation)}</p>`;
        applyRow.hidden = false;
      } catch (err) {
        out.innerHTML = `<p class="neg">${esc(err.message || String(err))}</p>`;
      }
      checkBtn.disabled = false;
    });

    form.querySelector('.applyBtn').addEventListener('click', async () => {
      const newText = form.new_text.value.trim();
      if (!newText || !lastClassification) return;
      const applyBtn = form.querySelector('.applyBtn');
      applyBtn.disabled = true;
      try {
        await applyChange('scalp', ruleKey, newText, form.effective_from.value || today,
          lastClassification.effect, form.applies_same_day.checked, 'stated by Veekay');
        await dispatch(); // re-render with fresh data
      } catch (err) {
        alert('Could not apply: ' + (err.message || err));
        applyBtn.disabled = false;
      }
    });
  });
}
