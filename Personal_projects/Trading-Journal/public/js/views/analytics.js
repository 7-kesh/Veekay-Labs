import { supabase } from '../supabase-client.js';
import { esc } from '../format.js';
const inr=v=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(Number(v||0));
const n=v=>Number.isFinite(Number(v))?Number(v):0;
function holdingsFor(rows,prices){
 const map=new Map();
 for(const r of [...rows].sort((a,b)=>(a.trade_date||'').localeCompare(b.trade_date||''))){
  const key=r.asset_class+':'+String(r.symbol||'').toUpperCase();
  if(!map.has(key))map.set(key,{symbol:String(r.symbol||'').toUpperCase(),name:r.name||r.symbol,units:0,cost:0,asset_class:r.asset_class});
  const h=map.get(key),q=n(r.units),gross=q*n(r.price)+n(r.fees);
  if(r.transaction_type==='buy'){h.units+=q;h.cost+=gross;}else if(h.units>0){const avg=h.cost/h.units;h.cost=Math.max(0,h.cost-avg*q);h.units=Math.max(0,h.units-q);}
 }
 return [...map.values()].filter(h=>h.units>1e-8).map(h=>{const p=prices.find(x=>x.asset_class===h.asset_class&&String(x.symbol).toUpperCase()===h.symbol);const value=p?h.units*n(p.market_price):h.cost;return {...h,value,pnl:p?value-h.cost:null,priced:!!p};});
}
export async function render(_p,el){
 el.innerHTML='<section class="card">Loading portfolio…</section>';
 const [tx,pr]=await Promise.all([supabase.from('asset_transactions').select('*'),supabase.from('asset_market_prices').select('*')]);
 if(tx.error)throw tx.error;if(pr.error)throw pr.error;
 const hs=holdingsFor(tx.data||[],pr.data||[]), invested=hs.reduce((s,h)=>s+h.cost,0),value=hs.reduce((s,h)=>s+h.value,0),pnl=hs.reduce((s,h)=>s+(h.pnl||0),0);
 const classes=[['equity','Investing'],['mutual_fund','Mutual funds'],['etf','ETFs']];
 const alloc=classes.map(([k,label])=>({label,value:hs.filter(h=>h.asset_class===k).reduce((s,h)=>s+h.value,0)})).filter(x=>x.value>0);
 const max=Math.max(1,...alloc.map(x=>x.value));
 el.innerHTML=`<div class="head"><div><h1>Portfolio</h1><p class="muted">Your current investment holdings and allocation. Trading performance charts live in the separate Graphs section.</p></div><a class="btn sm" href="#/investing">Add investment</a></div>
 <div class="tiles"><div class="tile"><span>Invested cost</span><b>${inr(invested)}</b></div><div class="tile"><span>Current holdings value</span><b>${inr(value)}</b></div><div class="tile"><span>Unrealised P&amp;L</span><b class="${pnl>=0?'pos':'neg'}">${inr(pnl)}</b></div><div class="tile"><span>Active holdings</span><b>${hs.length}</b></div></div>
 <section class="card"><h2>Asset allocation</h2>${alloc.length?alloc.map(x=>`<div style="margin:14px 0"><div style="display:flex;justify-content:space-between"><b>${x.label}</b><span>${inr(x.value)}</span></div><div style="height:10px;background:var(--line);border-radius:8px;overflow:hidden;margin-top:6px"><div style="height:100%;width:${x.value/max*100}%;background:var(--sec)"></div></div></div>`).join(''):'<p class="muted">Add investment transactions to see allocation.</p>'}</section>
 <section class="card"><h2>Holdings</h2><div class="tablewrap"><table class="dense"><thead><tr><th>Asset</th><th>Workspace</th><th>Units</th><th>Cost basis</th><th>Current value</th><th>Unrealised P&amp;L</th><th>Price status</th></tr></thead><tbody>
 ${hs.map(h=>`<tr><td><b>${esc(h.symbol)}</b><br><span class="muted">${esc(h.name||'')}</span></td><td>${h.asset_class==='equity'?'Investing':h.asset_class==='mutual_fund'?'Mutual funds':'ETFs'}</td><td>${h.units.toFixed(4)}</td><td>${inr(h.cost)}</td><td>${inr(h.value)}</td><td class="${(h.pnl||0)>=0?'pos':'neg'}">${h.pnl===null?'—':inr(h.pnl)}</td><td>${h.priced?'Updated':'Cost estimate'}</td></tr>`).join('')||'<tr><td colspan="7" class="muted">No active holdings recorded yet.</td></tr>'}
 </tbody></table></div><p class="muted note">Prices and NAVs are manually maintained. This is an investment portfolio view, not a full net-worth statement; cash, liabilities, dividends, taxes and external accounts are not included.</p></section>
 <p><a class="btn" href="#/graphs">Open dedicated Graphs →</a></p>`;
}
