import { supabase } from '../supabase-client.js';
import { esc } from '../format.js';

const num = v => Number.isFinite(Number(v)) ? Number(v) : 0;
const money = v => new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(num(v));
const className = v => v === 'equity' ? 'Investing' : v === 'etf' ? 'ETFs' : 'Mutual funds';
const palette = ['#6477e8','#20a486','#e4a044'];

export async function render(_p,el) {
  el.innerHTML = '<section class="card">Loading graphs…</section>';
  const [holdingsRes,txRes,intradayRes,plansRes] = await Promise.all([
    supabase.from('asset_holding_snapshots').select('*').order('as_of_date',{ascending:false}),
    supabase.from('asset_transactions').select('asset_class,transaction_type,symbol,trade_date,units,price,fees'),
    supabase.from('scalp_trades').select('date,ticker,net_pnl,account'),
    supabase.from('plans').select('kind,plan_date,exit_date,realized_pl,status,account').in('kind',['options','swing'])
  ]);
  for (const r of [holdingsRes,txRes,intradayRes,plansRes]) if (r.error) throw r.error;

  // A broker snapshot is a position, not a trade. Collapse repeated broker rows by ISIN
  // without summing potentially overlapping accounts; keep the largest reported position.
  const unique = new Map();
  for (const r of holdingsRes.data || []) {
    const key = (r.asset_class || '') + ':' + String(r.isin || r.symbol || '').toUpperCase();
    const prev = unique.get(key);
    if (!prev || num(r.units) > num(prev.units)) unique.set(key,r);
  }
  const holdings = [...unique.values()];
  const tx = txRes.data || [];
  const tradeRows = [
    ...(intradayRes.data || []).map(x=>({date:x.date,pnl:num(x.net_pnl),workspace:'Intraday'})),
    ...(plansRes.data || []).filter(x=>x.status==='closed' && x.realized_pl!==null).map(x=>({date:x.exit_date||x.plan_date,pnl:num(x.realized_pl),workspace:x.kind==='swing'?'Swing':'Intraday'}))
  ].filter(x=>x.date);
  const invested = holdings.reduce((s,x)=>s+num(x.invested_value),0);
  const value = holdings.reduce((s,x)=>s+num(x.current_value),0);
  const unreal = holdings.reduce((s,x)=>s+num(x.unrealized_pnl),0);
  const allocation = ['equity','mutual_fund','etf'].map(k=>({key:k,label:className(k),value:holdings.filter(x=>x.asset_class===k).reduce((s,x)=>s+num(x.current_value),0)})).filter(x=>x.value>0);
  const totalAlloc = allocation.reduce((s,x)=>s+x.value,0);
  let angle=0;
  const gradient = allocation.map((x,i)=>{const start=angle;angle+=totalAlloc?x.value/totalAlloc*360:0;return palette[i]+' '+start+'deg '+angle+'deg';}).join(',');
  const sorted = [...holdings].sort((a,b)=>num(b.current_value)-num(a.current_value));
  const maxValue = Math.max(1,...sorted.map(x=>num(x.current_value)));
  const pnlRows = [...holdings].sort((a,b)=>Math.abs(num(b.unrealized_pnl))-Math.abs(num(a.unrealized_pnl))).slice(0,10);
  const maxPnl = Math.max(1,...pnlRows.map(x=>Math.abs(num(x.unrealized_pnl))));
  const monthly = new Map();
  for (const x of tradeRows) { const k=String(x.date).slice(0,7); monthly.set(k,(monthly.get(k)||0)+x.pnl); }
  const months=[...monthly.entries()].sort((a,b)=>a[0].localeCompare(b[0])).slice(-12);
  const maxMonth=Math.max(1,...months.map(x=>Math.abs(x[1])));
  const tradePnl=tradeRows.reduce((s,x)=>s+x.pnl,0);
  const wins=tradeRows.filter(x=>x.pnl>0).length;

  el.innerHTML = `
    <div class="head"><div><h1>Graphs &amp; Performance</h1><p class="muted">Visual analysis of your imported holdings and recorded trade history.</p></div></div>
    <div class="tiles">
      <div class="tile"><span>Portfolio market value</span><b>${money(value)}</b></div>
      <div class="tile"><span>Invested value</span><b>${money(invested)}</b></div>
      <div class="tile"><span>Unrealised P&amp;L</span><b class="${unreal>=0?'pos':'neg'}">${money(unreal)}</b></div>
      <div class="tile"><span>Closed trades recorded</span><b>${tradeRows.length}</b></div>
    </div>
    <div class="grid2" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:14px">
      <section class="card"><h2>Asset allocation</h2>
        ${totalAlloc ? `<div style="display:flex;align-items:center;gap:22px;flex-wrap:wrap;padding:12px 0"><div role="img" aria-label="Asset allocation donut chart" style="width:176px;height:176px;flex:0 0 176px;border-radius:50%;background:conic-gradient(${gradient});position:relative"><div style="position:absolute;inset:34px;border-radius:50%;background:var(--card);display:grid;place-items:center;text-align:center"><div><b>${money(value)}</b><div class="muted" style="font-size:11px">Total value</div></div></div></div><div style="display:grid;gap:10px">${allocation.map((x,i)=>`<div style="display:flex;gap:8px;align-items:center"><i style="width:11px;height:11px;border-radius:3px;background:${palette[i]}"></i><span>${x.label}</span><b>${(x.value/totalAlloc*100).toFixed(1)}%</b><span class="muted">${money(x.value)}</span></div>`).join('')}</div></div>` : '<p class="muted">No holdings snapshots found to plot.</p>'}
      </section>
      <section class="card"><h2>Invested vs market value</h2>
        <div style="display:flex;gap:18px;flex-wrap:wrap;margin:8px 0 16px"><span><i style="display:inline-block;width:10px;height:10px;background:#6477e8;border-radius:2px"></i> Invested</span><span><i style="display:inline-block;width:10px;height:10px;background:#20a486;border-radius:2px"></i> Market value</span></div>
        ${allocation.map(x=>{const cost=holdings.filter(h=>h.asset_class===x.key).reduce((s,h)=>s+num(h.invested_value),0);const scale=Math.max(1,cost,x.value);return `<div style="margin:14px 0"><b>${x.label}</b><div style="display:grid;gap:5px;margin-top:6px"><div style="height:12px;background:var(--line);border-radius:8px;overflow:hidden"><div style="height:100%;width:${cost/scale*100}%;background:#6477e8"></div></div><div style="height:12px;background:var(--line);border-radius:8px;overflow:hidden"><div style="height:100%;width:${x.value/scale*100}%;background:#20a486"></div></div></div><div class="muted" style="font-size:12px">${money(cost)} invested · ${money(x.value)} current</div></div>`}).join('') || '<p class="muted">No asset values available.</p>'}
      </section>
    </div>
    <section class="card"><h2>Largest holdings by market value</h2><p class="muted note">Top 10 positions, ranked by imported current value.</p>
      ${sorted.length ? sorted.slice(0,10).map(x=>`<div style="margin:13px 0"><div style="display:flex;justify-content:space-between;gap:12px"><b>${esc(x.name||x.symbol||'Holding')}</b><span>${money(x.current_value)}</span></div><div style="height:12px;background:var(--line);border-radius:8px;margin-top:6px;overflow:hidden"><div style="height:100%;width:${num(x.current_value)/maxValue*100}%;background:#6477e8;border-radius:8px"></div></div><div class="muted" style="font-size:12px">${className(x.asset_class)} · ${esc(x.broker||'Broker statement')}</div></div>`).join('') : '<p class="muted">No imported holdings available.</p>'}
    </section>
    <section class="card"><h2>Unrealised P&amp;L by holding</h2><p class="muted note">Green bars are gains; red bars are losses. Values come from the broker snapshots.</p>
      ${pnlRows.length ? pnlRows.map(x=>{const v=num(x.unrealized_pnl);return `<div style="margin:13px 0"><div style="display:flex;justify-content:space-between;gap:12px"><b>${esc(x.name||x.symbol||'Holding')}</b><b class="${v>=0?'pos':'neg'}">${money(v)}</b></div><div style="height:12px;background:var(--line);border-radius:8px;margin-top:6px;overflow:hidden"><div style="height:100%;width:${Math.abs(v)/maxPnl*100}%;background:${v>=0?'var(--pos)':'var(--neg)'};border-radius:8px"></div></div></div>`}).join('') : '<p class="muted">No unrealised P&amp;L values found.</p>'}
    </section>
    <section class="card"><h2>Monthly realised trading P&amp;L</h2>
      ${months.length ? `<div style="display:flex;align-items:flex-end;gap:10px;overflow-x:auto;min-height:210px;padding:12px 0">${months.map(([m,v])=>`<div style="min-width:58px;flex:1;text-align:center;font-size:11px"><div style="height:145px;display:flex;align-items:flex-end;justify-content:center;background:var(--bg);border-radius:6px"><i title="${money(v)}" style="display:block;width:26px;height:${Math.max(2,Math.abs(v)/maxMonth*100)}%;background:${v>=0?'var(--pos)':'var(--neg)'};border-radius:5px 5px 0 0"></i></div><b class="${v>=0?'pos':'neg'}">${money(v)}</b><div class="muted">${m}</div></div>`).join('')}</div><p class="muted note">${tradeRows.length} closed trades · ${money(tradePnl)} total realised P&amp;L · ${(wins/tradeRows.length*100).toFixed(1)}% winners</p>` : '<p class="muted">No closed trade records have been imported yet, so a truthful trading-performance chart cannot be plotted. Import your Zerodha/Groww tradebook or journal trades to populate this graph.</p>'}
    </section>
    <p class="muted note">Holdings charts use the latest imported broker snapshots, not live prices. Duplicate ISIN positions are conservatively represented by the largest reported quantity to avoid double-counting. Portfolio P&amp;L is not a full return calculation and excludes dividends, taxes and external cash flows.</p>
  `;
}
