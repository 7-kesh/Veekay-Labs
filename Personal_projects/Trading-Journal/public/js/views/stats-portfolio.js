// Portfolio - the opening page. Order: one section per area (its own trade win % and trading
// score), cumulative P&L, net P&L by area, area summaries, and the side-by-side table last.
// Improvements and biggest leaks live on each area's own stats page, not here.
import { allYears, listCalendarEntries, listOpenPositions } from '../db.js';
import { statsData, portfolio } from '../stats.js';
import { renderCharts } from '../charts.js';
import { filtersHtml, wireFilters } from './stats-macros.js';
import { money, signclass, num as fmtNum, esc } from '../format.js';
import { tradingScore, overviewHtml } from '../score.js';
import { mountCalendar } from './portfolio-calendar.js';
import { mountPortfolioGraph } from './portfolio-graph.js';

const KIND_LABEL = { scalp: 'Scalp', options: 'Options', swing: 'Swing' };

const numOrDash = v => v !== null && v !== undefined ? fmtNum(v) : '–';
const pctOrDash = v => v !== null && v !== undefined ? fmtNum(v) + '%' : '–';

function areaSection(k, d, qs) {
  const m = d.charts[k].m;
  const src = k === 'scalp' ? d.scalp : d.plans[k];
  const label = KIND_LABEL[k];
  const body = m.n
    ? overviewHtml(tradingScore({ m, points: d.charts[k].points, entryOk: src.entry_ok, exitOk: src.exit_ok }), m, { stack: true })
    : `<section class="card"><p class="muted">No closed ${label.toLowerCase()} trades with a P&amp;L in this period yet.</p></section>`;
  return `<div class="areasec pnl-${k}">
    <div class="areaband"><div><h2>${label}</h2><span>${m.n} closed trade${m.n === 1 ? '' : 's'}${m.n ? ' · net ' + (money(m.net) || '$0.00') : ''}</span></div>
      <a href="#/stats/${k}?${qs}">Full ${label.toLowerCase()} stats →</a></div>
    ${body}
  </div>`;
}

export async function render(params, el) {
  const period = params.period || 'all', account = params.account || 'live';
  // The calendar's own query starts now, alongside the page's, so it is ready when the page is.
  const calEntries = listCalendarEntries(), openPos = listOpenPositions();
  calEntries.catch(() => {}); openPos.catch(() => {});
  const [d, years] = await Promise.all([statsData(period, account), allYears()]);
  const p = portfolio(d);
  const qs = `period=${period}&account=${account}`;
  const head = `<div class="head pagehero"><h1>Portfolio <small>all trade types</small></h1>${filtersHtml(period, account, 'stats/portfolio', years)}</div>`;

  if (p.total.m.n === 0) {
    el.innerHTML = `${head}<section class="card"><p class="muted">No closed trades with a P&amp;L in this period yet.</p></section>`;
    wireFilters(el);
    return;
  }

  const t = p.total.m;
  const row = (m) => `<td>${m.n}</td><td>${pctOrDash(m.win_pct)}</td><td>${pctOrDash(m.loss_pct)}</td>
    <td class="${signclass(m.net)}"><b>${money(m.net) || '$0.00'}</b></td><td>${money(m.avg_win) || '–'}</td><td>${money(m.avg_loss) || '–'}</td>
    <td>${m.payoff !== null && m.payoff !== undefined ? fmtNum(m.payoff) + '×' : '–'}</td><td>${numOrDash(m.profit_factor)}</td>
    <td class="${signclass(m.expectancy || 0)}">${money(m.expectancy) || '–'}</td><td>${money(m.best) || '–'}</td><td>${money(m.worst) || '–'}</td>`;

  el.innerHTML = `
    ${head}

    <div class="areasecs">${p.kinds.map(k => areaSection(k, d, qs)).join('')}</div>

    <div class="pgrid">
      <section class="card"><h2>Cumulative P&amp;L <small class="muted">each trade type, and all areas combined</small></h2>
        <div class="chart" data-chart="multi" data-kind="portfolio" role="img" aria-label="Cumulative P&amp;L over time for each trade type and combined"></div></section>
      <section class="card"><h2>Net P&amp;L by area</h2>
        <div class="chart" data-chart="areabars" data-kind="portfolio" role="img" aria-label="Net profit and loss for each trade type"></div></section>
    </div>

    <section class="card"><h2>Portfolio levels <small class="muted">each area and overall: starting capital + realized P&amp;L, split into money in open trades and what is available</small></h2>
      <div id="lvHost"><p class="muted">Loading portfolio…</p></div></section>

    <section class="card cal"><h2>P&amp;L calendar <small class="muted">daily and monthly totals by area - % is of your account balance</small></h2>
      <div id="calHost"><p class="muted">Loading calendar…</p></div></section>

    <h2 class="sect">Area summaries</h2>
    <div class="sumgrid">
      ${p.kinds.map(k => {
        const m = d.charts[k].m;
        return `<section class="card sumcard ar-${k}">
          <div class="sumhead"><h2>${KIND_LABEL[k]}</h2><a href="#/stats/${k}?${qs}">Full ${KIND_LABEL[k].toLowerCase()} stats →</a></div>
          ${m.n ? `<div class="mini">
              <div><span>Net</span><b class="${signclass(m.net)}">${money(m.net) || '$0.00'}</b></div>
              <div><span>Trades</span><b>${m.n}</b></div>
              <div><span>Win %</span><b>${pctOrDash(m.win_pct)}</b></div>
              <div><span>Profit factor</span><b>${numOrDash(m.profit_factor)}</b></div>
            </div>
            <p class="ev">${esc(d.charts[k].insights[0])}</p>`
            : `<p class="muted">No closed ${KIND_LABEL[k].toLowerCase()} trades with a P&amp;L in this period yet.</p>`}
        </section>`;
      }).join('')}
      <section class="card sumcard ar-futures"><div class="sumhead"><h2>Futures</h2></div><p class="muted">Coming soon.</p></section>
    </div>

    <section class="card"><h2>Areas side by side <small class="muted">each trade type on its own</small></h2>
      <div class="scroll"><table class="dense areas-table"><thead><tr>
        <th>Area</th><th>Trades</th><th>Win %</th><th>Loss %</th><th>Net P&amp;L</th><th>Avg win</th><th>Avg loss</th><th>Win ÷ loss</th><th>Profit factor</th><th>Expectancy</th><th>Best</th><th>Worst</th><th></th></tr></thead><tbody>
      ${p.kinds.map(k => `<tr class="arow ar-${k}"><td><span class="areatag at-${k}">${KIND_LABEL[k]}</span></td>${row(d.charts[k].m)}
        <td><a href="#/stats/${k}?${qs}">open</a></td></tr>`).join('')}
      <tr class="arow"><td><span class="areatag at-futures">Futures</span></td><td colspan="12" class="muted">Coming soon</td></tr>
      <tr class="total"><td><b>All areas</b></td>${row(t)}<td></td></tr>
      </tbody></table></div>
    </section>
  `;
  wireFilters(el);
  renderCharts(el, p.chartjson);
  const fail = (sel, err) => { const h = el.querySelector(sel); if (h) h.innerHTML = `<p class="neg">${esc(err.message || String(err))}</p>`; };
  calEntries.then(entries => mountCalendar(el.querySelector('#calHost'), entries, d.settings)).catch(err => fail('#calHost', err));
  Promise.all([calEntries, openPos]).then(([entries, open]) => mountPortfolioGraph(el.querySelector('#lvHost'), entries, open, d.settings)).catch(err => fail('#lvHost', err));
}
