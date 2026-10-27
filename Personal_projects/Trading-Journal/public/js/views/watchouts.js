// "Watch-outs": your biggest scalp leaks as short pointers for live trading - shown on Today and on
// the scalp form. Built from paper + live trades together (the same habits show up in both).
// Never breaks the page it sits on: any failure just leaves the card out.
import { statsData } from '../stats.js';
import { money, esc } from '../format.js';

export async function watchoutsHtml() {
  try {
    const d = await statsData('all', 'all');
    const leaks = d.focus.scalp.slice(0, 3);
    if (!leaks.length) return '';
    const n = d.scalp.n, top = d.scalp.violations[0];
    return `<section class="card watch"><h2>Watch-outs <small class="muted">your biggest leaks, from paper + live trades</small></h2>
      <ol class="watchlist">${leaks.map(f => `<li><b>${esc(f.directive)}</b>
        <span class="muted">${f.n} trades · ${money(f.cost)} lost${f.share ? ` · ${f.share}% of all losses` : ''}</span></li>`).join('')}</ol>
      ${top && n ? `<p class="muted note">Most common problem: <b>${esc(top[0])}</b> on ${top[1]} of ${n} trades (${Math.round(1000 * top[1] / n) / 10}%). <a href="#/stats/scalp?period=all&account=all">Full breakdown</a></p>` : ''}
    </section>`;
  } catch { return ''; }
}

// Fills a mount point after the page has rendered, so it never delays the page.
export function mountWatchouts(host) {
  if (!host) return;
  watchoutsHtml().then(html => { if (document.body.contains(host)) host.innerHTML = html; });
}
