import { supabase } from '../supabase-client.js';
import { esc } from '../format.js';
const money=v=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(Number(v||0));
const num=v=>Number.isFinite(Number(v))?Number(v):0;
const month=d=>String(d||'').slice(0,7);
const label=k=>{const [y,m]=k.split('-');return new Date(+y,+m-1,1).toLocaleDateString('en-IN',{month:'short',year:'2-digit'});};
export async function render(_p,el){
 el.innerHTML='<section class="card">Loading graphs…</section>';
 const [a,b,c]=await Promise.all([supabase.from('asset_transactions').select('asset_class,transaction_type,symbol,trade_date,units,price,fees'),supabase.from('scalp_trades').select('date,ticker,net_pnl,account'),supabase.from('plans').select('kind,plan_date,exit_date,realized_pl,status,account').in('kind',['options','swing'])]);
 for(const r of [a,b,c])if(r.error)throw r.error;
 const assets=a.data||[], intraday=(b.data||[]).map(x=>({date:x.date,pnl:num(x.net_pnl),workspace:'Intraday',type:'trade'})),plans=(c.data||[]).filter(x=>x.status==='closed'&&x.realized_pl!==null).map(x=>({date:x.exit_date||x.plan_date,pnl:num(x.realized_pl),workspace:x.kind==='swing'?'Swing':'Intraday plans',type:'trade'}));
 const trades=[...intraday,...plans].filter(x=>x.date);
 const transactions=assets.map(x=>({...x,date:x.trade_date,workspace:x.asset_class==='equity'?'Investing':x.asset_class==='mutual_fund'?'Mutual funds':'ETFs',amount:(x.transaction_type==='buy'?1:-1)*num(x.units)*num(x.price),type:'investment'}));
 const allDates=[...trades.map(x=>x.date),...transactions.map(x=>x.date)].sort();
 const min=allDates[0]||'2020-01-01',max=allDates.at(-1)||new Date().toISOString().slice(0,10);
 el.innerHTML=`<div class="head"><div><h1>Graphs &amp; Performance</h1><p class="muted">Dedicated visual analytics for your trades, stocks, mutual funds and ETFs.</p></div></div>
 <section class="card"><div class="filters" style="display:flex;gap:12px;flex-wrap:wrap;align-items:end"><label class="fld">Workspace<select id="gWorkspace"><option value="all">All workspaces</option><option>Intraday</option><option>Intraday plans</option><option>Swing</option><option>Investing</option><option>Mutual funds</option><option>ETFs</option></select></label><label class="fld">From<input id="gFrom" type="date" value="${min}"></label><label class="fld">To<input id="gTo" type="date" value="${max}"></label><button class="btn" id="gReset" type="button">Reset filters</button></div></section>
 <div id="gContent"></div>`;
 const draw=()=>{
  const ws=el.querySelector('#gWorkspace').value,from=el.querySelector('#gFrom').value,to=el.querySelector('#gTo').value;
  const pick=x=>(ws==='all'||x.workspace===ws)&&(!from||x.date>=from)&&(!to||x.date<=to);
  const t=trades.filter(pick),inv=transactions.filter(pick),pnl=t.reduce((s,x)=>s+x.pnl,0),wins=t.filter(x=>x.pnl>0).length;
  const monthly=new Map();for(const x of t){const k=month(x.date);if(k)monthly.set(k,(monthly.get(k)||0)+x.pnl);}
  for(const x of inv){const k=month(x.date);if(k)monthly.set(k,(monthly.get(k)||0)+x.amount);}
  const rows=[...monthly.entries()].sort((x,y)=>x[0].localeCompare(y[0])).slice(-18),maxAbs=Math.max(1,...rows.map(x=>Math.abs(x[1])));
  const workspaceNames=['Intraday','Intraday plans','Swing','Investing','Mutual funds','ETFs'];
  const breakdown=workspaceNames.map(w=>({w,trades:t.filter(x=>x.workspace===w),inv:inv.filter(x=>x.workspace===w)})).filter(x=>x.trades.length||x.inv.length);
  const tradeBars=workspaceNames.map(w=>({w,v:t.filter(x=>x.workspace===w).reduce((s,x)=>s+x.pnl,0)})).filter(x=>x.v!==0),maxTrade=Math.max(1,...tradeBars.map(x=>Math.abs(x.v)));
  el.querySelector('#gContent').innerHTML=`<div class="tiles"><div class="tile"><span>Closed trades</span><b>${t.length}</b></div><div class="tile"><span>Realised trading P&amp;L</span><b class="${pnl>=0?'pos':'neg'}">${money(pnl)}</b></div><div class="tile"><span>Trade win rate</span><b>${t.length?(wins/t.length*100).toFixed(1)+'%':'—'}</b></div><div class="tile"><span>Investment transactions</span><b>${inv.length}</b></div></div>
 <section class="card"><h2>Monthly activity &amp; performance</h2><p class="muted note">Bars combine realised trading P&amp;L and net investment flows (buys minus sells); read as separate source-currency amounts, not a consolidated return.</p>${rows.length?'<div style="display:flex;align-items:flex-end;gap:9px;overflow-x:auto;min-height:220px;padding:12px 0">'+rows.map(([k,v])=>`<div style="min-width:54px;flex:1;text-align:center;font-size:11px"><div style="height:145px;display:flex;align-items:flex-end;justify-content:center;background:var(--bg);border-radius:6px"><i title="${money(v)}" style="display:block;width:25px;height:${Math.max(2,Math.abs(v)/maxAbs*100)}%;background:${v>=0?'var(--pos)':'var(--neg)'};border-radius:5px 5px 0 0"></i></div><b>${money(v)}</b><div class="muted">${label(k)}</div></div>`).join('')+'</div>':'<p class="muted">No data for this filter and date range.</p>'}</section>
 <section class="card"><h2>Realised trading P&amp;L by workspace</h2>${tradeBars.length?tradeBars.map(x=>`<div style="margin:13px 0"><div style="display:flex;justify-content:space-between"><b>${x.w}</b><span class="${x.v>=0?'pos':'neg'}">${money(x.v)}</span></div><div style="height:11px;background:var(--line);border-radius:8px;margin-top:5px;overflow:hidden"><div style="height:100%;width:${Math.abs(x.v)/maxTrade*100}%;background:${x.v>=0?'var(--pos)':'var(--neg)'}"></div></div></div>`).join(''):'<p class="muted">No closed trades in this selection.</p>'}</section>
 <section class="card"><h2>Workspace breakdown</h2><div class="tablewrap"><table class="dense"><thead><tr><th>Workspace</th><th>Trades</th><th>Realised P&amp;L</th><th>Investment transactions</th><th>Net investment flow</th></tr></thead><tbody>${breakdown.map(x=>{const p=x.trades.reduce((s,r)=>s+r.pnl,0),v=x.inv.reduce((s,r)=>s+r.amount,0);return `<tr><td>${x.w}</td><td>${x.trades.length}</td><td class="${p>=0?'pos':'neg'}">${money(p)}</td><td>${x.inv.length}</td><td>${money(v)}</td></tr>`;}).join('')||'<tr><td colspan="5">No matching data.</td></tr>'}</tbody></table></div></section>
 <p class="muted note">Trading P&amp;L and investment cash flows may use different source currencies. This page does not convert currencies, calculate time-weighted returns, or include dividends, taxes or live market prices. The current source tables expose closed-trade results and recorded investment transactions only.</p>`;
 };
 ['gWorkspace','gFrom','gTo'].forEach(id=>el.querySelector('#'+id).addEventListener('change',draw));
 el.querySelector('#gReset').addEventListener('click',()=>{el.querySelector('#gWorkspace').value='all';el.querySelector('#gFrom').value=min;el.querySelector('#gTo').value=max;draw();});
 draw();
}
