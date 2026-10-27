// Calendar card on the Portfolio page. The caller starts fetching the entries as early as
// possible and hands them in, so the calendar never waits behind a second round of queries; the
// area / Live-Paper toggles, month / year view and arrows just re-draw from memory.
import { capitalSummary, overallSummary } from '../capital.js';
import { dayTotals, calendarHtml, splitFuture } from '../calendar.js';
import { money, esc } from '../format.js';

const localToday = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

export function mountCalendar(host, allEntries, settings) {
  const now = new Date();
  const { shown: entries, future } = splitFuture(allEntries, localToday());
  const state = { account: 'live', area: 'all', view: 'month', y: now.getFullYear(), m: now.getMonth() };

  const draw = () => {
    const totals = dayTotals(entries.filter(e => e.account === state.account && (state.area === 'all' || e.kind === state.area)));
    // % is of the selected area's portfolio level (all areas together for "All")
    const o = { account: state.account };
    const base = state.area === 'all' ? overallSummary(settings, entries.concat(future), [], o) : capitalSummary(settings, state.area, entries.concat(future), [], o);
    const balance = base.level || base.start;
    const fut = future.filter(e => e.account === state.account && (state.area === 'all' || e.kind === state.area));
    host.innerHTML = calendarHtml(state, totals, balance)
      + (fut.length ? `<p class="muted note">${fut.length} closed trade${fut.length === 1 ? ' is' : 's are'} dated in the future and left out: ${fut.map(e => `${esc(e.kind)} ${esc(e.date)} (${money(e.pnl)})`).join(', ')}. Fix the exit date to include ${fut.length === 1 ? 'it' : 'them'}.</p>` : '');
  };
  host.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.account) state.account = b.dataset.account;
    else if (b.dataset.area) state.area = b.dataset.area;
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
