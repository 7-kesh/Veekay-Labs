// "This week's commitments": the open actions recorded in the Weekly Review, shown on Today (all
// areas) and above an area's trade form. Tick one off here and it closes. Never breaks its page:
// any failure (e.g. the migration not yet run) just leaves the card out.
import { listWeeklyActions, setWeeklyActionStatus } from '../db.js';
import { AREAS, AREA_LABEL } from '../areas.js';
import { esc } from '../format.js';

export async function commitmentsHtml(area) {
  try {
    const items = await listWeeklyActions({ openOnly: true, area: area || undefined });
    if (!items.length) return '';
    const groups = (area ? [[area, AREA_LABEL[area]]] : AREAS)
      .map(([a, l]) => [l, items.filter(i => i.area === a)]).filter(([, g]) => g.length);
    return `<section class="card watch"><h2>Commitments <small class="muted">from your weekly reviews · tick when done</small></h2>
      ${groups.map(([l, g]) => `${area ? '' : `<h3>${esc(l)}</h3>`}<ul class="acts">${g.map(i =>
        `<li><label style="display:flex;gap:10px;align-items:center;flex:1;margin:0"><input type="checkbox" data-commit="${i.id}" style="width:18px;height:18px">
          <span>${esc(i.text)}</span></label><small class="muted">week of ${esc(i.week_start)}</small></li>`).join('')}</ul>`).join('')}
      <p class="muted note"><a href="#/weekly${area ? '?area=' + area : ''}">Weekly review</a></p></section>`;
  } catch { return ''; }
}

// Fills a mount point after the page has rendered, so it never delays the page.
export function mountCommitments(host, area) {
  if (!host) return;
  commitmentsHtml(area).then(html => {
    if (!document.body.contains(host)) return;
    host.innerHTML = html;
    host.querySelectorAll('[data-commit]').forEach(c => c.addEventListener('change', async () => {
      await setWeeklyActionStatus(Number(c.dataset.commit), 'done');
      mountCommitments(host, area);
    }));
  });
}
