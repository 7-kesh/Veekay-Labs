import { periodSelectsHtml, readPeriod } from '../period.js';
// Port of app/templates/_stats_macros.html - shared markup builders for the stats pages.
import { money, signclass, num as fmtNum, esc } from '../format.js';

const KIND_LABEL = { scalp: 'Scalp', options: 'Options', swing: 'Swing' };
const IMPACT_LABEL = { high: 'High', med: 'Medium', low: 'Low' };

export function rate(r) {
  return r.pct !== null && r.pct !== undefined ? `${r.pct}%  (${r.y}/${r.of})` : '–';
}
function usdOrDash(v) { return v !== null && v !== undefined ? money(v) : '–'; }
function numOrDash(v) { return v !== null && v !== undefined ? fmtNum(v) : '–'; }

export function filtersHtml(period, account, basePath, years = []) {
  const opt = (val, cur, label) => `<option value="${val}" ${val === cur ? 'selected' : ''}>${label}</option>`;
  return `<form method="get" class="filters" id="statsFilters" style="margin:0" data-base="${basePath}">
    <select name="account">${opt('all', account, 'Paper + live')}${opt('paper', account, 'Paper only')}${opt('live', account, 'Live only')}</select>
    ${periodSelectsHtml(period, years)}
  </form>`;
}
export function wireFilters(el) {
  const form = el.querySelector('#statsFilters');
  if (!form) return;
  form.addEventListener('change', () => {
    const p = new URLSearchParams({ account: form.elements.account.value, period: readPeriod(form) });
    window.location.hash = `#/${form.dataset.base}?` + p.toString();
  });
}

export function kpisHtml(m) {
  return `<div class="tiles">
    <div class="tile ${m.net > 0 ? 'k-pos' : (m.net < 0 ? 'k-neg' : '')}"><span>Net P&amp;L</span><b class="${signclass(m.net)}">${money(m.net) || '$0.00'}</b><small>${m.n} closed trades</small></div>
    <div class="tile k-pos"><span>Win %</span><b>${m.win_pct !== null && m.win_pct !== undefined ? fmtNum(m.win_pct) + '%' : '–'}</b><small>▲ ${m.wins} wins</small></div>
    <div class="tile k-neg"><span>Loss %</span><b>${m.loss_pct !== null && m.loss_pct !== undefined ? fmtNum(m.loss_pct) + '%' : '–'}</b><small>▼ ${m.losses} losses${m.flat ? ' · ' + m.flat + ' flat' : ''}</small></div>
    <div class="tile k-pos"><span>Average win</span><b>${usdOrDash(m.avg_win)}</b><small>best ${usdOrDash(m.best)}</small></div>
    <div class="tile k-neg"><span>Average loss</span><b>${usdOrDash(m.avg_loss)}</b><small>worst ${usdOrDash(m.worst)}</small></div>
    <div class="tile"><span>Win ÷ loss size</span><b>${m.payoff !== null && m.payoff !== undefined ? fmtNum(m.payoff) + '×' : '–'}</b><small>avg win vs avg loss</small></div>
    <div class="tile"><span>Profit factor</span><b>${numOrDash(m.profit_factor)}</b><small>gross profit ÷ gross loss</small></div>
    <div class="tile"><span>Expectancy</span><b class="${signclass(m.expectancy || 0)}">${usdOrDash(m.expectancy)}</b><small>per trade</small></div>
  </div>`;
}

export function focusListHtml(items, showArea = false) {
  return `<ol class="focuslist">${items.map(f => `
    <li class="focus-item imp-${f.impact}">
      <div class="rk">${f.rank}</div>
      <div class="fb">
        <div class="fd">${showArea && f.area ? `<span class="areatag at-${f.area}">${KIND_LABEL[f.area]}</span>` : ''}${esc(f.directive)}</div>
        <div class="fm"><span class="impact imp-${f.impact}">${IMPACT_LABEL[f.impact]} impact</span>
          ${f.n} trade${f.n !== 1 ? 's' : ''} · <b>${money(f.cost)}</b> lost${f.per ? ' · ' + money(f.per) + ' per trade' : ''}${f.share ? ' · ' + f.share + '% of all losses' : ''}</div>
        <div class="fx">Had you skipped these: net ${money(f.net)} → <b>${money(f.after)}</b></div>
        <div class="fa"><b>How:</b> ${esc(f.action)}</div>
      </div>
    </li>`).join('')}</ol>`;
}

export function focusBlockHtml(focusItems) {
  return `<section class="card focus"><h2>Biggest leaks <small class="muted">the specific habits costing you most, judged from your own data</small></h2>
    ${focusItems.length ? focusListHtml(focusItems) + '<p class="muted note">Each item is measured on its own trades, so the savings overlap and should not be added together.</p>'
      : '<p class="muted">No single behaviour stands out yet. This fills in once there are about 5 or more closed, tagged trades.</p>'}
  </section>`;
}

export function areasBlockHtml(areas) {
  return `<section class="card areas"><h2>Key areas to improve <small class="muted">overall, ranked by what they cost you</small></h2>
    ${areas.length ? `<div class="areagrid">${areas.map(it => `<article class="area-card sev-${it.severity}">
        <div class="rk">${it.rank}</div>
        <div class="body"><h4>${esc(it.title)}</h4><p class="ev">${esc(it.evidence)}</p><p class="ac"><b>Do this:</b> ${esc(it.action)}</p></div>
        ${it.cost ? `<div class="cost"><span>costs</span><b>${money(it.cost)}</b></div>` : ''}
      </article>`).join('')}</div>` : '<p class="muted">Nothing flagged yet. This fills in once there are enough closed, tagged trades (about 5 or more).</p>'}
  </section>`;
}

export function chartBlockHtml(kind, title, c) {
  if (c.m.n === 0) return `<section class="card"><p class="muted">No closed ${title.toLowerCase()} trades with a P&amp;L in this period yet. Charts appear once trades have results.</p></section>`;
  return `${kpisHtml(c.m)}
    <div class="chartgrid">
      <section class="card wide"><h2>Cumulative P&amp;L <small class="muted">running total, trade by trade</small></h2>
        <div class="chart" data-chart="equity" data-kind="${kind}" role="img" aria-label="Cumulative P&amp;L line chart for ${title}"></div></section>
      <section class="card wide"><h2>P&amp;L per trade <small class="muted">▲ wins above the line, ▼ losses below</small></h2>
        <div class="chart" data-chart="bars" data-kind="${kind}" role="img" aria-label="Profit and loss of each ${title} trade"></div></section>
      <section class="card"><h2>Win % and loss %</h2>
        <div class="chart" data-chart="split" data-kind="${kind}" role="img" aria-label="Share of winning and losing trades"></div>
        <h3>Win rate: yours vs the rate you need</h3>
        <div class="chart" data-chart="needed" data-kind="${kind}" role="img" aria-label="Actual win rate versus break-even win rate"></div></section>
      <section class="card"><h2>Winning vs losing margins</h2>
        <div class="chart" data-chart="margins" data-kind="${kind}" role="img" aria-label="Average and largest win compared with average and largest loss"></div></section>
      <section class="card wide"><h2>How big are the wins and losses? <small class="muted">trades grouped by P&amp;L size</small></h2>
        <div class="chart" data-chart="hist" data-kind="${kind}" role="img" aria-label="Distribution of trade results"></div></section>
    </div>
    <section class="card"><h2>Analysis</h2>
      <ul class="insights">${c.insights.map(line => `<li>${esc(line)}</li>`).join('')}</ul>
      <details><summary>Table view</summary>
        <div class="scroll" style="max-height:340px;overflow:auto"><table class="dense"><thead><tr><th>#</th><th>Date</th><th>Trade</th><th>P&amp;L</th><th>Cumulative</th></tr></thead><tbody>
        ${c.points.map(p => `<tr class="${p.pnl > 0 ? 'win' : (p.pnl < 0 ? 'loss' : '')}"><td>${p.i}</td><td>${esc(p.date)}</td><td>${esc(p.label)}</td>
          <td class="${signclass(p.pnl)}">${money(p.pnl)}</td><td class="${signclass(p.cum)}">${money(p.cum)}</td></tr>`).join('')}
        </tbody></table></div></details>
    </section>`;
}
