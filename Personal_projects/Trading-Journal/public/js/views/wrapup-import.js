// Load page: paste or upload a wrap-up block from Claude chat, or a journal file downloaded from
// this app (one day, or a whole batch), validate, preview (new vs already saved), confirm.
import { validateAny } from '../wrapup.js';
import { saveWrapup, wrapupExisting } from '../db.js';
import { esc } from '../format.js';

const targetText = t => t.type === 'violation' ? `violation: ${t.value}` : t.type === 'metric' ? `metric: ${t.value}${t.setup ? ` (Setup ${t.setup})` : ''}` : 'no measurable target';

export async function render(_params, el) {
  el.innerHTML = `
    <div class="head"><h1>Load journal <small>import from Claude chat or a downloaded file</small></h1>
      <div class="actions"><a class="btn" href="#/journal">Daily journal</a></div></div>
    <section class="card">
      <h2>Paste the wrap-up block</h2>
      <p class="muted">After "wrap up for today" in Claude chat, paste the JSON block here (a fenced block is fine). You can also choose a journal .json file previously downloaded from this app, one day or many.</p>
      <textarea id="wrapText" rows="8" style="width:100%;font-family:monospace" placeholder='{"schema":"tj-wrapup/1", ...}'></textarea>
      <div class="actions" style="margin-top:8px">
        <button class="btn primary" id="checkBtn" type="button">Check</button>
        <label class="link">or choose a .json file<input type="file" id="wrapFile" accept=".json,application/json,text/plain" hidden></label>
      </div>
      <div id="preview" style="margin-top:12px"></div>
    </section>
  `;
  const text = el.querySelector('#wrapText'), preview = el.querySelector('#preview');
  el.querySelector('#wrapFile').addEventListener('change', async (e) => {
    const f = e.target.files[0]; if (!f) return;
    text.value = await f.text(); e.target.value = '';
    el.querySelector('#checkBtn').click();
  });

  el.querySelector('#checkBtn').addEventListener('click', async () => {
    const res = validateAny(text.value);
    if (!res.ok) {
      preview.innerHTML = `<p class="neg"><b>Not imported. Fix these and try again:</b></p>
        <ul class="neg">${res.errors.map(x => `<li>${esc(x)}</li>`).join('')}</ul>`;
      return;
    }
    const days = res.days;
    const existing = [];
    for (const d of days) {
      try { existing.push(await wrapupExisting(d.date)); } catch { existing.push({ entry: false, learnings: new Set(), improvements: new Set() }); }
    }
    const tag = (isNew) => isNew ? '<span class="pill open">new</span>' : '<span class="pill closed">already saved</span>';
    const flags = days.flatMap(d => d.strategy_flags);
    preview.innerHTML = `
      ${days.map((d, k) => { const ex = existing[k]; return `
        <h3>${esc(d.date)} - ${ex.entry ? 'replaces the existing journal entry' : 'new journal entry'}</h3>
        <p>${esc(d.entry.summary)}</p>
        <p class="muted">${d.entry.trades.length} trade(s) assessed: ${esc(d.entry.trades.map(t => t.trade_no + (t.category ? ' ' + t.category : '')).join(', '))}</p>
        <h4>Learnings (${d.learnings.length})</h4>
        <ul>${d.learnings.map(l => `<li>${tag(!ex.learnings.has(l.text))} ${esc(l.text)}</li>`).join('')}</ul>
        <h4>Improvements (${d.improvements.length})</h4>
        <ul>${d.improvements.map(i => `<li>${tag(!ex.improvements.has(i.text))} ${esc(i.text)} <span class="muted">- target ${esc(targetText(i.target))} · ${esc(i.status)}</span></li>`).join('')}</ul>`; }).join('')}
      ${res.warnings.length ? `<p class="muted"><b>Notes:</b></p><ul class="muted">${res.warnings.map(w => `<li>${esc(w)}</li>`).join('')}</ul>` : ''}
      ${flags.length ? `<p class="neg"><b>Strategy flags (not saved):</b> ${esc(flags.join(' | '))}<br>
        <span class="muted">A strategy change is a red flag: confirm it with Claude and log it on the Strategy page yourself.</span></p>` : ''}
      <div class="actions"><button class="btn primary" id="confirmBtn" type="button">Confirm and save ${days.length > 1 ? days.length + ' days' : ''}</button><span id="saveStatus" class="muted"></span></div>`;
    el.querySelector('#confirmBtn').addEventListener('click', async function () {
      const st = el.querySelector('#saveStatus');
      this.disabled = true; st.textContent = 'Saving…';
      try {
        for (const d of days) await saveWrapup(d);
        st.textContent = 'Saved.';
        setTimeout(() => { window.location.hash = days.length === 1 ? `#/journal/${days[0].date}` : '#/journal'; }, 500);
      } catch (err) {
        st.textContent = '';
        preview.insertAdjacentHTML('beforeend', `<p class="neg">${esc(err.message || String(err))}${/relation|does not exist/i.test(err.message || '') ? ' - run supabase/migrate-wrapup.sql in the Supabase SQL editor first.' : ''}</p>`);
        this.disabled = false;
      }
    });
  });
}
