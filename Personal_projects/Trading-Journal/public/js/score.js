// Trading score (0-100) and the two overview widgets built from it: the win-rate gauge and the
// six-axis radar. Pure (no DOM), so it is unit tested in Node. Each axis is scored against a
// fixed, documented target so the number means the same thing every time you look at it.

export const TARGETS = { win_pct: 60, profit_factor: 2, payoff: 2, expectancy_r: 0.5 };
export const MIN_SAMPLE = 20;

const clamp = v => Math.max(0, Math.min(100, v));
const r0 = v => Math.round(v);

// m: perf.js metrics; points: [{date, pnl}]; entryOk / exitOk: {pct} or null (rules followed);
// risk: dollars per 1R.
export function tradingScore({ m, points = [], entryOk = null, exitOk = null, risk = 20 }) {
  const axes = [];
  const add = (key, label, score, raw, target) => axes.push({ key, label, score: score === null ? null : r0(clamp(score)), raw, target });

  add('win', 'Win %', m.win_pct == null ? null : m.win_pct / TARGETS.win_pct * 100,
    m.win_pct == null ? '–' : `${m.win_pct}%`, `${TARGETS.win_pct}% = 100`);

  let pf = m.profit_factor;
  if (pf == null && m.wins > 0 && m.losses === 0) pf = Infinity;
  add('pf', 'Profit factor', pf == null ? null : (pf === Infinity ? 100 : pf / TARGETS.profit_factor * 100),
    pf == null ? '–' : (pf === Infinity ? 'no losses' : String(pf)), `${TARGETS.profit_factor} = 100`);

  let rr = m.payoff;
  if (rr == null && m.wins > 0 && m.losses === 0) rr = Infinity;
  add('rr', 'Risk:Reward', rr == null ? null : (rr === Infinity ? 100 : rr / TARGETS.payoff * 100),
    rr == null ? '–' : (rr === Infinity ? 'no losses' : `${rr}×`), `${TARGETS.payoff}× = 100`);

  const expR = m.expectancy == null || !risk ? null : m.expectancy / risk;
  add('exp', 'Expectancy', expR == null ? null : expR / TARGETS.expectancy_r * 100,
    expR == null ? '–' : `${Math.round(expR * 100) / 100} R`, `${TARGETS.expectancy_r} R = 100`);

  const disc = [entryOk, exitOk].map(x => (x && x.pct != null ? x.pct : null)).filter(v => v !== null);
  add('disc', 'Discipline', disc.length ? disc.reduce((a, b) => a + b, 0) / disc.length : null,
    disc.length ? `${r0(disc.reduce((a, b) => a + b, 0) / disc.length)}%` : '–', 'entries and exits by the rules');

  const days = new Map();
  for (const p of points) if (p.date) days.set(p.date, (days.get(p.date) || 0) + (p.pnl || 0));
  const green = [...days.values()].filter(v => v >= 0).length;
  add('cons', 'Consistency', days.size >= 3 ? 100 * green / days.size : null,
    days.size >= 3 ? `${green} of ${days.size} days` : '–', 'share of days at or above $0');

  const have = axes.filter(a => a.score !== null);
  const overall = have.length >= 3 ? r0(have.reduce((s, a) => s + a.score, 0) / have.length) : null;
  return { axes, overall, n: m.n, lowSample: m.n < MIN_SAMPLE };
}

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const pt = (cx, cy, r, deg) => { const a = deg * Math.PI / 180; return [cx + r * Math.cos(a), cy - r * Math.sin(a)]; };
const f1 = v => Math.round(v * 10) / 10;

// Semi-circle win-rate gauge: teal = share of wins, muted red = losses, flat trades leave a gap.
export function gaugeSvg(m) {
  const cx = 110, cy = 112, r = 88, sw = 18;
  const arc = (from, to) => {
    const [x1, y1] = pt(cx, cy, r, from), [x2, y2] = pt(cx, cy, r, to);
    return `M${f1(x1)} ${f1(y1)} A${r} ${r} 0 0 1 ${f1(x2)} ${f1(y2)}`;
  };
  const n = m.n || 0;
  const winDeg = n ? 180 * m.wins / n : 0, lossDeg = n ? 180 * m.losses / n : 0;
  let body = `<path d="${arc(180, 0.001)}" fill="none" stroke="var(--line)" stroke-width="${sw}"/>`;
  if (n && m.wins) body += `<path d="${arc(180, 180 - winDeg)}" fill="none" stroke="var(--pos)" stroke-width="${sw}" stroke-linecap="butt"/>`;
  if (n && m.losses) body += `<path d="${arc(lossDeg + 0.001, 0.001)}" fill="none" stroke="var(--neg)" stroke-width="${sw}" stroke-linecap="butt"/>`;
  return `<svg viewBox="0 0 220 124" class="gauge" role="img" aria-label="Win rate ${m.win_pct == null ? 'not available' : m.win_pct + ' percent'}">${body}</svg>`;
}

// Six-axis radar of the score axes (0-100 each), rings at 25/50/75/100.
export function radarSvg(axes) {
  const cx = 150, cy = 120, R = 78, n = axes.length;
  const ang = i => 90 - i * 360 / n;
  const ring = k => axes.map((_, i) => pt(cx, cy, R * k, ang(i)).map(f1).join(',')).join(' ');
  let s = `<svg viewBox="0 0 300 240" class="radar" role="img" aria-label="Score by area">`;
  for (const k of [0.25, 0.5, 0.75, 1]) s += `<polygon points="${ring(k)}" fill="none" stroke="var(--line)" stroke-width="1"/>`;
  axes.forEach((_, i) => { const [x, y] = pt(cx, cy, R, ang(i)); s += `<line x1="${cx}" y1="${cy}" x2="${f1(x)}" y2="${f1(y)}" stroke="var(--line)"/>`; });
  const poly = axes.map((a, i) => pt(cx, cy, R * (a.score || 0) / 100, ang(i)).map(f1).join(',')).join(' ');
  s += `<polygon points="${poly}" fill="var(--sec)" fill-opacity=".16" stroke="var(--sec)" stroke-width="2" stroke-linejoin="round"/>`;
  axes.forEach((a, i) => {
    const [x, y] = pt(cx, cy, R * (a.score || 0) / 100, ang(i));
    s += `<circle cx="${f1(x)}" cy="${f1(y)}" r="3.5" fill="#fff" stroke="var(--sec)" stroke-width="2"><title>${esc(a.label)}: ${a.score === null ? 'not enough data' : a.score + '/100 (' + esc(a.raw) + ')'}</title></circle>`;
    const [lx, ly] = pt(cx, cy, R + 16, ang(i));
    const anchor = Math.abs(lx - cx) < 6 ? 'middle' : (lx > cx ? 'start' : 'end');
    s += `<text x="${f1(lx)}" y="${f1(ly + 4)}" text-anchor="${anchor}">${esc(a.label)}</text>`;
  });
  return s + '</svg>';
}

// The two cards as one HTML block. `title` is the page's trade-type label.
export function overviewHtml(score, m) {
  const gauge = `<section class="card ov-gauge"><h2>Trade win %</h2>
    <div class="gaugewrap">${gaugeSvg(m)}<div class="gnum">${m.win_pct == null ? '–' : Math.round(m.win_pct) + '%'}</div></div>
    <div class="gbadges"><span class="gb w">${m.wins} W</span>${m.flat ? `<span class="gb f">${m.flat} flat</span>` : ''}<span class="gb l">${m.losses} L</span></div></section>`;
  const pos = score.overall === null ? 0 : score.overall;
  const card = `<section class="card ov-score"><h2>Trading score <small>${score.n} trade${score.n === 1 ? '' : 's'}</small></h2>
    <div class="scorebody"><div class="radarwrap">${radarSvg(score.axes)}</div>
    <div class="scoreside"><span class="lab">Your score</span><b class="scorebig">${score.overall === null ? '–' : score.overall}</b>
      <div class="scorebar"><i style="left:${pos}%"></i></div><div class="scorescale"><span>0</span><span>50</span><span>100</span></div>
      ${score.lowSample ? `<p class="muted note">Fewer than 20 trades here, so treat this as a rough read.</p>` : ''}</div></div>
    <p class="muted note">Each area is scored 0-100 against a target: ${score.axes.map(a => `${esc(a.label)} (${esc(a.target)})`).join(' · ')}. The score is their average.</p></section>`;
  return `<div class="overview">${gauge}${card}</div>`;
}
