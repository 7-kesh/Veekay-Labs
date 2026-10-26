// Dialog that lists a day's trades with checkboxes (all ticked) so specific trades can be exported.
import { listDayItems, exportDay } from './export-bundle.js';
import { money, esc } from './format.js';

// Resolves to the downloaded filename, or null if cancelled.
export async function pickAndExportDay(date) {
  const items = await listDayItems(date);
  if (!items.length) throw new Error(`Nothing logged on ${date}.`);
  return new Promise((resolve, reject) => {
    const dlg = document.createElement('dialog');
    dlg.className = 'pickdlg';
    dlg.innerHTML = `<form method="dialog"><h2>Export for AI-Assist-Review <small class="muted">${esc(date)}</small></h2>
      <label class="pickall"><input type="checkbox" id="pickAll" checked> Select all (${items.length})</label>
      <div class="picklist">${items.map(x => `<label><input type="checkbox" class="pk" value="${esc(x.key)}" checked>
        <span>${esc(x.label)}</span>${x.pnl == null ? '' : `<b class="${x.pnl > 0 ? 'pos' : x.pnl < 0 ? 'neg' : ''}">${money(x.pnl)}</b>`}</label>`).join('')}</div>
      <div class="actions"><button class="btn" value="cancel">Cancel</button><button class="btn primary" id="pickGo" value="go">Export selected</button></div></form>`;
    document.body.appendChild(dlg);
    const boxes = () => [...dlg.querySelectorAll('.pk')];
    const sync = () => { dlg.querySelector('#pickGo').disabled = !boxes().some(b => b.checked); };
    dlg.querySelector('#pickAll').addEventListener('change', e => { boxes().forEach(b => { b.checked = e.target.checked; }); sync(); });
    boxes().forEach(b => b.addEventListener('change', sync));
    dlg.addEventListener('close', async () => {
      const keys = new Set(boxes().filter(b => b.checked).map(b => b.value));
      const go = dlg.returnValue === 'go';
      dlg.remove();
      if (!go) return resolve(null);
      try { resolve(await exportDay(date, keys)); } catch (e) { reject(e); }
    });
    dlg.showModal();
  });
}
