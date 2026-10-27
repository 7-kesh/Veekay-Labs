// Calendar card on the Portfolio page. Fetches every closed trade once (both accounts), then the
// Live / Paper toggle, month / year view and the arrows just re-draw from memory.
import { listScalpTrades, listPlans, getSettings } from '../db.js';
import { num as calcNum } from '../calc.js';
import { dayTotals, calendarHtml } from '../calendar.js';

export async function mountCalendar(host) {
  const now = new Date();
  const [scalp, options, swing, settings] = await Promise.all([listScalpTrades({}), listPlans('options'), listPlans('swing'), getSettings()]);
  const balance = calcNum(settings.account_balance);
  const entries = [
    ...scalp.filter(r => typeof r.net_pnl === 'number').map(r => ({ date: r.date, pnl: r.net_pnl, account: r.account || 'paper' })),
    ...[...options, ...swing].filter(p => p.status === 'closed' && typeof p.realized_pl === 'number')
      .map(p => ({ date: p.exit_date || p.plan_date, pnl: p.realized_pl, account: p.account || 'paper' })),
  ];
  const state = { account: 'live', view: 'month', y: now.getFullYear(), m: now.getMonth() };

  const draw = () => {
    const totals = dayTotals(entries.filter(e => e.account === state.account));
    host.innerHTML = calendarHtml(state, totals, balance);
  };
  host.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.account) state.account = b.dataset.account;
    else if (b.dataset.view) state.view = b.dataset.view;
    else if (b.dataset.nav) {
      const d = Number(b.dataset.nav);
      if (state.view === 'year') state.y += d;
      else { state.m += d; if (state.m < 0) { state.m = 11; state.y--; } else if (state.m > 11) { state.m = 0; state.y++; } }
    } else if (b.dataset.gomonth !== undefined) { state.m = Number(b.dataset.gomonth); state.view = 'month'; }
    else return;
    draw();
  });
  draw();
}
