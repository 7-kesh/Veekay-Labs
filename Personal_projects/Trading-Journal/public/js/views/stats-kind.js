// Port of app/templates/stats_kind.html.
import { allYears, listImprovements, listScalpTrades } from '../db.js';
import { statsData } from '../stats.js';
import { renderCharts } from '../charts.js';
import { filtersHtml, wireFilters, rate, focusBlockHtml, areasBlockHtml, chartBlockHtml } from './stats-macros.js';
import { money, signclass, num as fmtNum, esc } from '../format.js';
import { tradingScore, overviewHtml } from '../score.js';
import { CATEGORIES } from '../constants.js';
import { rankImprovements } from '../improvement-rank.js';

const KIND_LABEL = { scalp: 'Intraday', options: 'Intraday plans', swing: 'Swing', futures: 'Investing' };

// Top imported improvements (from Claude chat wrap-ups), ranked by what their target costs. They
// are measured on scalp trades, so only the Scalp page lists them. Never breaks the page: if the
// wrap-up tables don't exist yet, the card just says so.
async function improvementsCard(kind, title) {
  const more = '<p class="muted note"><a href="#/improvements">All improvements</a></p>';
  if (kind !== 'scalp') {
    return `<section class="card imps"><h2>Improvements <small class="muted">from your Claude wrap-ups</small></h2>
      <p class="muted">Wrap-up improvements are measured on intraday trades, so none apply to ${esc(title.toLowerCase())} yet.</p>${more}</section>`;
  }
  try {
    const [items, trades] = await Promise.all([listImprovements(), listScalpTrades({})]);
    const top = rankImprovements(items, trades).slice(0, 3);
    if (!top.length) return `<section class="card imps"><h2>Improvements <small class="muted">from your Claude wrap-ups</small></h2><p class="muted">No active improvements. Import a wrap-up to add some.</p>${more}</section>`;
    return `<section class="card imps"><h2>Improvements to work on <small class="muted">ranked by what they cost you</small></h2>
      <ol class="implist">${top.map(i => `<li>${esc(i.text)} <span class="muted">${i.cost != null ? `- ${money(i.cost)} lost on ${i.n} tagged trade(s)` : '- no dollar target'}${i.status === 'adopted' ? ' · adopted' : ''}</span></li>`).join('')}</ol>${more}</section>`;
  } catch {
    return `<section class="card imps"><h2>Improvements</h2><p class="muted">Improvements are not set up yet.</p>${more}</section>`;
  }
}

// Where the problems are, as a share of trades: category mix and how often each violation shows up.
function problemRatesHtml(s) {
  const n = s.n;
  if (!n) return '';
  const pc = c => Math.round(1000 * c / n) / 10;
  const rows = (items, label) => items.map(([k, c]) => `<div class="prow"><span class="pname">${esc(label(k))}</span>
      <span class="pbar"><i style="width:${Math.min(100, pc(c))}%"></i></span><span class="pnum"><b>${pc(c)}%</b> <small>${c} of ${n}</small></span></div>`).join('');
  const cats = s.categories.filter(([k]) => k && k !== '-').sort((a, b) => b[1] - a[1]);
  return `<section class="card probs"><h2>Where the problems are <small class="muted">share of ${n} intraday trades</small></h2>
    <div class="cols"><div><h3>By category</h3>${rows(cats, k => CATEGORIES[k] || k)}</div>
      <div><h3>Most common violations</h3>${s.violations.length ? rows(s.violations, k => k) : '<p class="muted">None tagged.</p>'}</div></div></section>`;
}

export async function render(kind, params, el) {
  const period = params.period || 'all', account = params.account || 'live';
  // Habits (leaks, areas to improve, problem rates) are judged on paper + live together: the same
  // behaviour shows up in both. The score, KPIs and charts still follow the account filter.
  const [d, years, dAll] = await Promise.all([statsData(period, account), allYears(), account === 'all' ? null : statsData(period, 'all')]);
  const h = dAll || d;
  const title = KIND_LABEL[kind];

  let detail = '';
  if (kind === 'scalp') {
    const s = d.scalp;
    detail = `<section class="card"><h2>Intraday detail</h2>
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
  } else if (kind === 'futures') {
    const s = d.plans.futures;
    const cut = (rows) => rows.length ? `<table class="dense"><thead><tr><th></th><th>Trades</th><th>Wins</th><th>Net</th></tr></thead><tbody>${rows.map(([k, [c, w, net]]) =>
      `<tr><td>${esc(k)}</td><td>${c}</td><td>${w}</td><td class="${signclass(net)}">${money(net)}</td></tr>`).join('')}</tbody></table>` : '<p class="muted">No closed trades yet.</p>';
    const list = (rows) => `<table class="dense"><tbody>${rows.length ? rows.map(([k, v]) => `<tr><td>${esc(k)}</td><td>${v}</td></tr>`).join('') : '<tr><td class="muted">none tagged</td></tr>'}</tbody></table>`;
    detail = `<section class="card"><h2>Investing detail</h2>
      <div class="tiles">
        <div class="tile"><span>Trades</span><b>${s.n}</b><small>${s.open} planned or open · ${s.closed} closed</small></div>
        <div class="tile"><span>Planned vs realized R</span><b>${s.avg_plan_rr ?? '–'} → ${s.avg_r ?? '–'}</b></div>
        <div class="tile"><span>Average ticks</span><b>${s.avg_ticks ?? '–'}</b><small>per closed trade</small></div>
        <div class="tile"><span>Net P&amp;L</span><b class="${signclass(s.net)}">${money(s.net) || '$0.00'}</b></div>
      </div>
      <div class="cols">
        <div><h3>By session</h3>${cut(s.by_session)}</div>
        <div><h3>By setup</h3>${cut(s.by_setup)}</div>
        <div><h3>Top violations</h3>${list(s.violations)}</div>
        <div><h3>Emotions</h3>${list(s.emotions)}</div>
      </div></section>`;
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
    <div class="head pagehero"><h1>${title} stats</h1>${filtersHtml(period, account, kind === 'scalp' ? 'stats/scalp' : `stats/${kind}`, years)}</div>
    ${overviewHtml(tradingScore({ m: d.charts[kind].m, points: d.charts[kind].points, entryOk: (kind === 'scalp' ? d.scalp : d.plans[kind]).entry_ok, exitOk: (kind === 'scalp' ? d.scalp : d.plans[kind]).exit_ok }), d.charts[kind].m)}
    <p class="muted note habitnote">Leaks, areas to improve and problem rates below use <b>paper + live</b> trades together (${h.charts[kind].m.n} with a result${period === 'all' ? '' : ' in this period'}) - the same habits show up in both.</p>
    <div class="improve">${focusBlockHtml(h.focus[kind])}${await improvementsCard(kind, title)}</div>
    ${areasBlockHtml(h.areas[kind])}
    ${kind === 'scalp' ? problemRatesHtml(h.scalp) : ''}
    ${chartBlockHtml(kind, title, d.charts[kind])}
    ${detail}
  `;
  wireFilters(el);
  renderCharts(el, d.charts);
}
