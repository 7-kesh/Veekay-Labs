import { supabase } from '../supabase-client.js';

const START = '2026-11-12';
const KEY_PREFIX = 'keshavtrades-portfolio-monthly-excel-uploads';
const pad = n => String(n).padStart(2, '0');
const monthKey = (year, month) => `${year}-${pad(month + 1)}`;
const dueDate = (year, month) => `${year}-${pad(month + 1)}-12`;
const pretty = key => new Date(Number(key.slice(0,4)), Number(key.slice(5,7))-1, 12)
  .toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' });

function makeMonths() {
  const start = new Date(Number(START.slice(0,4)), Number(START.slice(5,7))-1, 1);
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth() + 6, 1);
  const rows = [];
  for (let d = new Date(start); d <= end; d.setMonth(d.getMonth() + 1)) {
    const key = monthKey(d.getFullYear(), d.getMonth());
    rows.push({ key, due: dueDate(d.getFullYear(), d.getMonth()) });
  }
  return rows;
}

export async function render(_params, el) {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  const storageKey = `${KEY_PREFIX}:${user?.id || 'local'}`;
  let completed = {};
  try { completed = JSON.parse(localStorage.getItem(storageKey) || '{}') || {}; } catch { completed = {}; }
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${pad(today.getMonth()+1)}-${pad(today.getDate())}`;
  const months = makeMonths();

  const rows = months.map(m => {
    const done = Boolean(completed[m.key]);
    const status = done ? 'Uploaded' : m.due < todayKey ? 'Overdue' : m.due === todayKey ? 'Due today' : 'Upcoming';
    const cls = done ? 'pos' : status === 'Overdue' ? 'neg' : '';
    return `<div class="card" style="display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;margin:10px 0">
      <div><h3 style="margin:0 0 4px">${new Date(Number(m.key.slice(0,4)),Number(m.key.slice(5,7))-1,1).toLocaleDateString('en-IN',{month:'long',year:'numeric'})}</h3>
      <p class="muted" style="margin:0">Upload due: ${pretty(m.key)}</p><b class="${cls}" style="display:inline-block;margin-top:7px">${status}</b></div>
      <button class="btn sm ${done ? '' : 'primary'}" type="button" data-month="${m.key}">${done ? 'Undo upload' : 'Mark Excel uploaded'}</button>
    </div>`;
  }).join('');

  const dueNow = months.find(m => m.due === todayKey);
  el.innerHTML = `
    <div class="head"><div><h1>Monthly Excel reminders</h1><p class="muted">Portfolio · Recurring monthly upload checklist</p></div><a class="btn sm" href="#/stats/portfolio">← Back to Portfolio</a></div>
    <section class="card"><h2>Upload your monthly stats</h2>
      <p>Starting <b>12 November 2026</b>, upload your latest broker / portfolio Excel statistics on the <b>12th of every month</b>.</p>
      <p class="muted">This page keeps a monthly checklist. When you have uploaded that month's Excel file, mark it complete. To import a statement into the journal, use AI Import.</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap"><a class="btn primary" href="#/ai-import">Open AI Import</a>${dueNow ? '<span class="badge">First reminder is due today</span>' : ''}</div>
    </section>
    <section class="card"><h2>Monthly schedule</h2><p class="muted">The checklist starts on 12 November 2026 and continues on the 12th each month.</p>${rows}</section>
    <p class="muted note">Completion is saved in this browser for your signed-in account. This is an in-app checklist, not a push notification or email alert; open Portfolio to see upcoming and overdue uploads.</p>`;
  el.querySelectorAll('[data-month]').forEach(button => button.addEventListener('click', () => {
    const key = button.dataset.month;
    if (completed[key]) delete completed[key];
    else completed[key] = new Date().toISOString();
    try { localStorage.setItem(storageKey, JSON.stringify(completed)); }
    catch { alert('Could not save the checklist in this browser.'); }
    render(_params, el);
  }));
}
