// Port of app/templates/stats_kind.html.
import { allYears } from '../db.js';
import { statsData } from '../stats.js';
import { renderCharts } from '../charts.js';
import { filtersHtml, wireFilters, rate, focusBlockHtml, areasBlockHtml, chartBlockHtml } from './stats-macros.js';
import { money, signclass, num as fmtNum, esc } from '../format.js';
import { CATEGORIES } from '../constants.js';

const KIND_LABEL = { scalp: 'Scalp', options: 'Options', swing: 'Swing' };

export async function render(kind, params, el) {
  const period = params.period || 'all', account = params.account || 'all';
  const [d, years] = await Promise.all([statsData(period, account), allYears()]);
  const title = KIND_LABEL[kind];

  let detail = '';
  if (kind === 'scalp') {
    const s = d.scalp;
    detail = `<section class="card"><h2>Scalp detail</h2>
      <div class="tiles">
        <div class="tile"><span>Entries valid</span><b>${rate(s.entry_ok)}</b></div>
        <div class="tile"><span>Exits valid</span><b>${rate(s.exit_ok)}</b></div>
        <div class="tile"><span>Average R</span><b>${s.avg_r !== null && s.avg_r !== undefined ? fmtNum(s.avg_r) : '–'}</b></div>
        <div class="tile"><span>Trades without P&amp;L</span><b>${s.n - s.known}</b></div>
      </div>
      <div class="cols">
        <div><h3>By category</h3><table class="dense"><tbody>${s.categories.map(([k, v]) => `<tr><td>${esc(CATEGORIES[k] || k)}</td><td>${v}</td></tr>`).join('')}</tbody></table></div>
        <div><h3>By setup</h3><table class="dense"><thead><tr><th>Setup</th><th>Trades</th><th>Wins</th><th>Net</th></tr></thead><tbody>
          ${d.by_setup.map(([k, [cnt, w, net]]) => `<tr><td>${esc(k)}</td><td>${cnt}</td><td>${w}</td><td class="${signclass(net)}">${money(net)}</td></tr>`).join('')}</tbody></table></div>
        <div><h3>Top violations</h3><table class="dense"><tbody>${s.violations.length ? s.violations.map(([k, v]) => `<tr><td>${esc(k)}</td><td>${v}</td></tr>`).join('') : '<tr><td class="muted">none tagged</td></tr>'}</tbody></table></div>
        <div><h3>Emotions</h3><table class="dense"><tbody>${s.emotions.length ? s.emotions.map(([k, v]) => `<tr><td>${esc(k)}</td><td>${v}</td></tr>`).join('') : '<tr><td class="muted">none tagged</td></tr>'}</tbody></table></div>
      </div>
      <h3>By week</h3>
      <table class="dense"><thead><tr><th>Week of</th><th>Trades</th><th>Net</th><th></th></tr></thead><tbody>
      ${(() => {
        const mx = d.by_week.length ? Math.max(...d.by_week.map(([, [, net]]) => Math.abs(net))) : 1;
        return d.by_week.map(([wk, [cnt, net]]) => `<tr><td>${esc(wk)}</td><td>${cnt}</td><td class="${signclass(net)}">${money(net)}</td>
          <td class="barcell"><span class="bar ${net < 0 ? 'neg' : 'pos'}" style="width:${Math.round(100 * Math.abs(net) / (mx || 1))}%"></span></td></tr>`).join('');
      })()}</tbody></table>
    </section>`;
  } else {
    const s = d.plans[kind];
    detail = `<section class="card"><h2>${title} detail</h2>
      <div class="tiles">
        <div class="tile"><span>Plans</span><b>${s.n}</b><small>${s.open} waiting for actuals</small></div>
        <div class="tile"><span>Planned vs realized R</span><b>${s.avg_plan_rr ?? '–'} → ${s.avg_r ?? '–'}</b></div>
        <div class="tile"><span>Entry followed</span><b>${rate(s.entry_ok)}</b></div>
        <div class="tile"><span>Exit followed</span><b>${rate(s.exit_ok)}</b></div>
      </div>
      ${s.scenarios.length ? `<h3>How exits happened</h3><table class="dense"><tbody>${s.scenarios.map(([k, v]) => `<tr><td>${esc(d.scenario_label[k] || k)}</td><td>${v}</td></tr>`).join('')}</tbody></table>` : ''}
    </section>`;
  }

  el.innerHTML = `
    <div class="head"><h1>${title} stats</h1>${filtersHtml(period, account, kind === 'scalp' ? 'stats/scalp' : `stats/${kind}`, years)}</div>
    ${focusBlockHtml(d.focus[kind])}
    ${areasBlockHtml(d.areas[kind])}
    ${chartBlockHtml(kind, title, d.charts[kind])}
    ${detail}
  `;
  wireFilters(el);
  renderCharts(el, d.charts);
}
