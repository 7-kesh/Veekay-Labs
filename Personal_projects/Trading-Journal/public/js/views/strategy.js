// Port of app/templates/strategy.html + app/static/strategy.js. Propose a change ->
// you pick the effect (tighter / looser / ...) -> red-flag banner ->
// pick an effective date -> confirm and apply. Nothing is written until "Confirm and apply".
import { STRATEGY_ORDER, STRATEGY_LABELS, SEED_DATE, currentRules, changeLog, applyChange, ruleEffectiveFrom, CHANGE_EFFECTS } from '../strategy.js';
import { esc } from '../format.js';
import { dispatch } from '../router.js';
import { AREA_LABEL, areaOf, areaTabs } from '../areas.js';
import { buildPlaybookPdf, downloadPdf } from '../playbook-pdf.js';

export async function render(params, el) {
  const area = areaOf(params);
  const rules = await currentRules(area);
  const log = await changeLog(area);
  // Scalp has the seeded, ordered playbook; the other areas hold rules you add yourself (the rule's
  // title is its key).
  const order = area === 'scalp' ? STRATEGY_ORDER : Object.keys(rules);
  const label = k => (area === 'scalp' ? STRATEGY_LABELS[k] : k) || k;
  const today = new Date().toISOString().slice(0, 10);

  el.innerHTML = `
    <div class="head"><h1>Strategy</h1>
      ${area === 'scalp' ? '<button class="btn" id="downloadPdf" type="button">Download playbook PDF</button>' : ''}</div>
    ${areaTabs('strategy', area)}
    ${area === 'scalp' ? '' : `<section class="card"><h2>Add a ${esc(AREA_LABEL[area].toLowerCase())} rule</h2>
      <form id="newRule"><label>Rule title<input name="title" required placeholder="e.g. Entry: IV rank below 50"></label>
      <label>Rule wording<textarea name="body" rows="3" required></textarea></label>
      <div class="actions" style="margin-top:8px"><button class="btn primary" type="submit">Add rule</button></div></form></section>`}
    <section class="card muted">Frozen strategy. Any wording change is a red flag by standing rule - propose it, pick its effect, then confirm.</section>
    ${order.map(k => `
      <section class="card" style="margin-top:12px">
        <h2>${esc(label(k))}</h2>
        <p>${esc(rules[k] || '(not set)')}</p>
        <details><summary>Propose a change</summary>
          <form class="proposeForm" data-rule="${esc(k)}" style="margin-top:10px">
            <textarea name="new_text" rows="3" placeholder="New wording">${esc(rules[k] || '')}</textarea>
            <div class="actions" style="margin-top:8px">
              <label>This change is <select name="effect">${CHANGE_EFFECTS.map(([v, l]) => `<option value="${v}">${esc(l)}</option>`).join('')}</select></label>
              <button type="button" class="btn checkBtn">Review change</button>
            </div>
            <div class="classifyOut"></div>
            <div class="applyRow" hidden>
              <label>Effective from <input type="date" name="effective_from" value="${today}"></label>
              <label><input type="checkbox" name="applies_same_day"> Also apply to today's trades</label>
              <button type="button" class="btn primary applyBtn">Confirm and apply</button>
            </div>
          </form>
        </details>
      </section>`).join('') || (area === 'scalp' ? '' : `<section class="card" style="margin-top:12px"><p class="muted">No ${esc(AREA_LABEL[area].toLowerCase())} rules yet. Add the first one above.</p></section>`)}

    <section class="card" style="margin-top:16px"><h2>Change log</h2>
      <table class="dense"><thead><tr><th>Date</th><th>Rule</th><th>Effect</th><th>New wording</th></tr></thead>
      <tbody>${(log || []).map(r => `<tr><td>${esc(r.date)}</td><td>${esc(label(r.rule_key))}</td>
        <td>${esc(r.effect || '')}</td><td>${esc((r.new_text || '').slice(0, 200))}</td></tr>`).join('') || '<tr><td colspan="4" class="muted">No changes logged yet.</td></tr>'}
      </tbody></table>
    </section>
  `;

  const nr = el.querySelector('#newRule');
  if (nr) nr.addEventListener('submit', async (e) => {
    e.preventDefault();
    await applyChange(area, nr.title.value.trim(), nr.body.value.trim(), today, 'addition', false, 'added in app');
    await dispatch();
  });
  const dl = el.querySelector('#downloadPdf');
  if (dl) dl.addEventListener('click', async function () {
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
        const effect = form.effect.value;
        lastClassification = { effect };
        out.innerHTML = `<div class="flagrow neg"><b>Red flag: this changes the strategy</b> - recorded as <b>${esc(effect)}</b></div>
          <p class="muted">Confirm only if this is a deliberate change. It is logged with today's date and applies from the date below.</p>`;
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
        await applyChange(area, ruleKey, newText, form.effective_from.value || today,
          lastClassification.effect, form.applies_same_day.checked, 'stated by Veekay');
        await dispatch(); // re-render with fresh data
      } catch (err) {
        alert('Could not apply: ' + (err.message || err));
        applyBtn.disabled = false;
      }
    });
  });
}
