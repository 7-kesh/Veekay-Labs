// Port of app/templates/stats_portfolio.html.
import { allYears } from '../db.js';
import { statsData, portfolio } from '../stats.js';
import { renderCharts } from '../charts.js';
import { filtersHtml, wireFilters, kpisHtml, focusListHtml } from './stats-macros.js';
import { money, signclass, num as fmtNum, esc } from '../format.js';
import { listImprovements, listScalpTrades } from '../db.js';
import { tradingScore, overviewHtml } from '../score.js';
import { rankImprovements } from '../improvement-rank.js';

const KIND_LABEL = { scalp: 'Scalp', options: 'Options', swing: 'Swing' };
const IMPACT_LABEL = { high: 'High', med: 'Medium', low: 'Low' };

// Top imported improvements (from Claude chat wrap-ups), ranked by what their target costs. Never
// breaks the stats page: if the wrap-up tables don't exist yet, the card is simply left out.
async function improvementsCard() {
  try {
    const [items, trades] = await Promise.all([listImprovements(), listScalpTrades({})]);
    const top = rankImprovements(items, trades).slice(0, 3);
    if (!top.length) return '';
    return `<section class="card focus"><h2>Improvements to work on <small class="muted">from your Claude wrap-ups, ranked by what they cost you</small></h2>
      <ol>${top.map(i => `<li>${esc(i.text)} <span class="muted">${i.cost != null ? `- ${money(i.cost)} lost on ${i.n} tagged trade(s)` : '- no dollar target'}${i.status === 'adopted' ? ' · adopted' : ''}</span></li>`).join('')}</ol>
      <p class="muted note"><a href="#/improvements">All improvements</a></p></section>`;
  } catch { return ''; }
}

export async function render(params, el) {
  const period = params.period || 'all', account = params.account || 'live';
  const [d, years] = await Promise.all([statsData(period, account), allYears()]);
  const p = portfolio(d);

  if (p.total.m.n === 0) {
    el.innerHTML = `<div class="head"><h1>Portfolio <small>all trade types</small></h1>${filtersHtml(period, account, 'stats/portfolio', years)}</div>
      <section class="card"><p class="muted">No closed trades with a P&amp;L in this period yet.</p></section>`;
    wireFilters(el);
    return;
  }

  const t = p.total.m;
  const numOrDash = v => v !== null && v !== undefined ? fmtNum(v) : '–';

  el.innerHTML = `
    <div class="head"><h1>Portfolio <small>all trade types</small></h1>${filtersHtml(period, account, 'stats/portfolio', years)}</div>
    ${kpisHtml(t)}
    ${overviewHtml(tradingScore({ m: t, points: p.total.points, entryOk: d.scalp.entry_ok, exitOk: d.scalp.exit_ok }), t)}
    ${await improvementsCard()}

    <section class="card focus"><h2>Biggest leaks across everything <small class="muted">the specific habits costing you most, from all areas</small></h2>
      ${p.leaks.length ? focusListHtml(p.leaks, true) + '<p class="muted note">Measured per habit on its own trades, so the savings overlap and should not be added together.</p>'
        : '<p class="muted">No single behaviour stands out yet.</p>'}
    </section>

    <section class="card"><h2>Areas side by side <small class="muted">each trade type on its own</small></h2>
      <div class="scroll"><table class="dense areas-table"><thead><tr>
        <th>Area</th><th>Trades</th><th>Win %</th><th>Loss %</th><th>Net P&amp;L</th><th>Avg win</th><th>Avg loss</th><th>Win ÷ loss</th><th>Profit factor</th><th>Expectancy</th><th>Best</th><th>Worst</th><th></th></tr></thead><tbody>
      ${p.kinds.map(k => { const m = d.charts[k].m; return `<tr class="arow ar-${k}"><td><span class="areatag at-${k}">${KIND_LABEL[k]}</span></td>
        <td>${m.n}</td><td>${m.win_pct !== null && m.win_pct !== undefined ? fmtNum(m.win_pct) + '%' : '–'}</td><td>${m.loss_pct !== null && m.loss_pct !== undefined ? fmtNum(m.loss_pct) + '%' : '–'}</td>
        <td class="${signclass(m.net)}"><b>${money(m.net) || '$0.00'}</b></td><td>${money(m.avg_win) || '–'}</td><td>${money(m.avg_loss) || '–'}</td>
        <td>${m.payoff !== null && m.payoff !== undefined ? fmtNum(m.payoff) + '×' : '–'}</td><td>${numOrDash(m.profit_factor)}</td>
        <td class="${signclass(m.expectancy || 0)}">${money(m.expectancy) || '–'}</td><td>${money(m.best) || '–'}</td><td>${money(m.worst) || '–'}</td>
        <td><a href="#/stats/${k}?period=${period}&account=${account}">open</a></td></tr>`; }).join('')}
      <tr class="arow"><td><span class="areatag at-futures">Futures</span></td><td colspan="12" class="muted">Coming soon</td></tr>
      <tr class="total"><td><b>All areas</b></td><td>${t.n}</td><td>${t.win_pct !== null && t.win_pct !== undefined ? fmtNum(t.win_pct) + '%' : '–'}</td><td>${t.loss_pct !== null && t.loss_pct !== undefined ? fmtNum(t.loss_pct) + '%' : '–'}</td>
        <td class="${signclass(t.net)}"><b>${money(t.net) || '$0.00'}</b></td><td>${money(t.avg_win) || '–'}</td><td>${money(t.avg_loss) || '–'}</td>
        <td>${t.payoff !== null && t.payoff !== undefined ? fmtNum(t.payoff) + '×' : '–'}</td><td>${numOrDash(t.profit_factor)}</td>
        <td class="${signclass(t.expectancy || 0)}">${money(t.expectancy) || '–'}</td><td>${money(t.best) || '–'}</td><td>${money(t.worst) || '–'}</td><td></td></tr>
      </tbody></table></div>
    </section>

    <div class="chartgrid">
      <section class="card wide"><h2>Cumulative P&amp;L by area <small class="muted">each trade type, and all areas combined</small></h2>
        <div class="chart" data-chart="multi" data-kind="portfolio" role="img" aria-label="Cumulative P&amp;L over time for each trade type and combined"></div></section>
      <section class="card"><h2>Net P&amp;L by area</h2>
        <div class="chart" data-chart="areabars" data-kind="portfolio" role="img" aria-label="Net profit and loss for each trade type"></div></section>
      <section class="card"><h2>Trades by area</h2>
        <div class="chart" data-chart="areacount" data-kind="portfolio" role="img" aria-label="Number of closed trades for each trade type"></div></section>
    </div>

    <h2 class="sect">Area summaries</h2>
    <div class="sumgrid">
      ${p.kinds.map(k => {
        const m = d.charts[k].m, f = d.focus[k][0];
        return `<section class="card sumcard ar-${k}">
          <div class="sumhead"><h2>${KIND_LABEL[k]}</h2><a href="#/stats/${k}?period=${period}&account=${account}">Full ${KIND_LABEL[k].toLowerCase()} stats →</a></div>
          ${m.n ? `<div class="mini">
              <div><span>Net</span><b class="${signclass(m.net)}">${money(m.net) || '$0.00'}</b></div>
              <div><span>Trades</span><b>${m.n}</b></div>
              <div><span>Win %</span><b>${m.win_pct !== null && m.win_pct !== undefined ? fmtNum(m.win_pct) + '%' : '–'}</b></div>
              <div><span>Profit factor</span><b>${numOrDash(m.profit_factor)}</b></div>
            </div>
            <p class="ev">${esc(d.charts[k].insights[0])}</p>
            ${f ? `<div class="focus-item imp-${f.impact} one"><div class="fb"><div class="fm"><span class="impact imp-${f.impact}">${IMPACT_LABEL[f.impact]} impact</span> top focus</div>
                <div class="fd">${esc(f.directive)}</div><div class="fm">${f.n} trades · <b>${money(f.cost)}</b> lost</div></div></div>`
              : '<p class="muted">No single behaviour stands out yet.</p>'}`
            : `<p class="muted">No closed ${KIND_LABEL[k].toLowerCase()} trades with a P&amp;L in this period yet.</p>`}
        </section>`;
      }).join('')}
      <section class="card sumcard ar-futures"><div class="sumhead"><h2>Futures</h2></div><p class="muted">Coming soon.</p></section>
    </div>
  `;
  wireFilters(el);
  renderCharts(el, p.chartjson);
}
