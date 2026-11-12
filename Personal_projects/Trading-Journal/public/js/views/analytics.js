import { supabase } from '../supabase-client.js';
import { esc } from '../format.js';

const inr = v => new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(Number(v||0));
const pct = v => (v*100).toFixed(1)+'%';
const monthKey = d => String(d||'').slice(0,7);
const monthLabel = k => { const [y,m]=k.split('-'); return new Date(Number(y),Number(m)-1,1).toLocaleDateString('en-IN',{month:'short',year:'2-digit'}); };
const sum = (a,fn) => a.reduce((s,x)=>s+fn(x),0);
const safe = v => Number.isFinite(Number(v)) ? Number(v) : 0;

function holdingRows(transactions, prices) {
  const map=new Map();
  for(const r of [...transactions].sort((a,b)=>(a.trade_date||'').localeCompare(b.trade_date||'')||a.id-b.id)){
    const symbol=String(r.symbol||'').toUpperCase();
    const key=String(r.asset_class||'')+':'+symbol;
    if(!map.has(key)) map.set(key,{symbol,name:r.name||symbol,units:0,cost:0,asset_class:r.asset_class});
    const h=map.get(key), qty=safe(r.units), gross=qty*safe(r.price)+safe(r.fees);
    if(r.transaction_type==='buy'){h.units+=qty;h.cost+=gross;}
    else if(h.units>0){const avg=h.cost/h.units;h.cost=Math.max(0,h.cost-avg*qty);h.units=Math.max(0,h.units-qty);}
    if(r.name)h.name=r.name;
  }
  return [...map.values()].filter(h=>h.units>1e-8).map(h=>{
    const p=prices.find(x=>String(x.symbol).toUpperCase()===h.symbol&&x.asset_class===h.asset_class);
    const price=p?safe(p.market_price):null, value=price===null?h.cost:h.units*price;
    return {...h,value,pnl:price===null?null:value-h.cost,priced:price!==null};
  });
}
function barRows(rows,max,labelFn,valueFn,cls=''){
  return rows.map(r=>{const v=valueFn(r);return '<div class="an-barrow"><div class="an-barlabel"><span>'+esc(labelFn(r))+'</span><b>'+inr(v)+'</b></div><div class="an-track"><i class="'+cls+'" style="width:'+Math.max(0,Math.min(100,v/Math.max(1,max)*100))+'%"></i></div></div>';}).join('');
}

export async function render(params,el){
  el.innerHTML='<section class="card"><p class="muted">Loading your portfolio analytics…</p></section>';
  const [eq,mf,etf,priceRows,scalp,plans]=await Promise.all([
    supabase.from('asset_transactions').select('*').eq('asset_class','equity'),
    supabase.from('asset_transactions').select('*').eq('asset_class','mutual_fund'),
    supabase.from('asset_transactions').select('*').eq('asset_class','etf'),
    supabase.from('asset_market_prices').select('*'),
    supabase.from('scalp_trades').select('date,ticker,net_pnl,account'),
    supabase.from('plans').select('kind,plan_date,exit_date,realized_pl,status,account').in('kind',['options','swing'])
  ]);
  for(const r of [eq,mf,etf,priceRows,scalp,plans])if(r.error)throw r.error;
  const tx=[...(eq.data||[]),...(mf.data||[]),...(etf.data||[])], prices=priceRows.data||[];
  const holdings=holdingRows(tx,prices);
  const invested=sum(holdings,h=>h.cost), market=sum(holdings,h=>h.value), unrealized=sum(holdings,h=>h.pnl||0);
  const knownScalp=(scalp.data||[]).filter(x=>x.net_pnl!==null), closedPlans=(plans.data||[]).filter(x=>x.status==='closed'&&x.realized_pl!==null);
  const tradeRows=[...knownScalp.map(x=>({date:x.date,pnl:safe(x.net_pnl),kind:'Intraday'})),...closedPlans.map(x=>({date:x.exit_date||x.plan_date,pnl:safe(x.realized_pl),kind:x.kind==='options'?'Intraday plans':'Swing'}))].sort((a,b)=>(a.date||'').localeCompare(b.date||''));
  const realized=sum(tradeRows,x=>x.pnl), wins=tradeRows.filter(x=>x.pnl>0).length, winRate=tradeRows.length?wins/tradeRows.length:0;
  const classNames={equity:'Investing',mutual_fund:'Mutual funds',etf:'ETFs'};
  const classRows=['equity','mutual_fund','etf'].map(k=>({name:classNames[k],value:sum(holdings.filter(h=>h.asset_class===k),h=>h.value)})).filter(x=>x.value>0).sort((a,b)=>b.value-a.value);
  const topHoldings=[...holdings].sort((a,b)=>b.value-a.value).slice(0,8);
  const monthly=new Map();
  for(const r of tx){const k=monthKey(r.trade_date);if(!k)continue;monthly.set(k,(monthly.get(k)||0)+(r.transaction_type==='buy'?1:-1)*safe(r.units)*safe(r.price));}
  const monthRows=[...monthly.entries()].sort((a,b)=>a[0].localeCompare(b[0])).slice(-12).map(([month,value])=>({month,value}));
  const maxMonth=Math.max(1,...monthRows.map(x=>Math.abs(x.value)));
  const monthBars=monthRows.map(x=>'<div class="an-month"><div class="an-monthbar"><i style="height:'+Math.max(2,Math.abs(x.value)/maxMonth*100)+'%"></i></div><b>'+esc(inr(x.value))+'</b><span>'+esc(monthLabel(x.month))+'</span></div>').join('');
  const unpriced=holdings.filter(h=>!h.priced).length;
  const css='<style>.an-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(165px,1fr));gap:12px;margin:14px 0}.an-tile{background:var(--card);border:1px solid var(--line);border-left:4px solid var(--sec);border-radius:10px;padding:12px 14px}.an-tile span{display:block;color:var(--muted);font-size:11px;text-transform:uppercase;font-weight:700}.an-tile b{font-size:21px}.an-cols{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:14px}.an-barrow{margin:12px 0}.an-barlabel{display:flex;justify-content:space-between;gap:10px;font-size:13px;margin-bottom:5px}.an-track{height:10px;background:var(--line);border-radius:9px;overflow:hidden}.an-track i{display:block;height:100%;background:var(--sec);border-radius:9px}.an-track i.green{background:var(--pos)}.an-legend{font-size:12px;color:var(--muted)}.an-months{display:flex;align-items:flex-end;gap:8px;overflow-x:auto;min-height:190px;padding:12px 2px}.an-month{min-width:58px;flex:1;display:flex;flex-direction:column;align-items:center;gap:5px;font-size:10px}.an-monthbar{height:115px;width:24px;display:flex;align-items:flex-end;background:color-mix(in srgb,var(--sec) 8%,var(--card));border-radius:6px 6px 0 0;overflow:hidden}.an-monthbar i{display:block;width:100%;background:var(--sec);border-radius:6px 6px 0 0}.an-month b{font-size:10px;white-space:nowrap}.an-month span{color:var(--muted)}.an-note{font-size:12px;color:var(--muted)}@media(max-width:600px){.an-cols{grid-template-columns:1fr}}</style>';
  el.innerHTML=css+`
    <div class="head"><div><h1>Portfolio overview <small>investments + trading performance</small></h1><p class="muted">A consolidated view of your recorded holdings and closed trades.</p></div><a class="btn sm" href="#/investing">Add investment</a></div>
    <div class="an-grid">
      <div class="an-tile"><span>Invested cost</span><b>${inr(invested)}</b></div>
      <div class="an-tile"><span>Current holdings value</span><b>${inr(market)}</b></div>
      <div class="an-tile"><span>Unrealised investment P&amp;L</span><b class="${unrealized>=0?'pos':'neg'}">${inr(unrealized)}</b></div>
      <div class="an-tile"><span>Realised trading P&amp;L</span><b class="${realized>=0?'pos':'neg'}">${inr(realized)}</b></div>
      <div class="an-tile"><span>Closed trades</span><b>${tradeRows.length}</b><small>${tradeRows.length?pct(winRate)+' profitable':'No closed trades yet'}</small></div>
      <div class="an-tile"><span>Active holdings</span><b>${holdings.length}</b><small>${unpriced} without updated price/NAV</small></div>
    </div>
    <div class="an-cols">
      <section class="card"><h2>Asset allocation</h2><p class="an-legend">Current value by workspace</p>
        ${classRows.length?barRows(classRows,Math.max(1,...classRows.map(x=>x.value)),x=>x.name,x=>x.value):'<p class="muted">Add holdings to see allocation.</p>'}
      </section>
      <section class="card"><h2>Largest holdings</h2><p class="an-legend">Ranked by current value (or cost where price is missing)</p>
        ${topHoldings.length?barRows(topHoldings,Math.max(1,...topHoldings.map(x=>x.value)),x=>x.symbol,x=>x.value,'green'):'<p class="muted">No active holdings yet.</p>'}
      </section>
    </div>
    <section class="card"><h2>Monthly net investment</h2><p class="an-legend">Buys minus sells, based on recorded transaction price and fees excluded. Last 12 active months.</p>
      ${monthRows.length?'<div class="an-months">'+monthBars+'</div>':'<p class="muted">Record investment transactions to build this chart.</p>'}
    </section>
    <section class="card"><h2>Trading performance</h2>
      <div class="an-grid">
        <div class="an-tile"><span>Intraday + plans + Swing</span><b>${inr(realized)}</b></div>
        <div class="an-tile"><span>Win rate</span><b>${tradeRows.length?pct(winRate):'—'}</b></div>
        <div class="an-tile"><span>Winning / losing trades</span><b>${wins} / ${tradeRows.length-wins}</b></div>
      </div>
      <div class="scroll"><table class="dense"><thead><tr><th>Workspace</th><th>Closed trades</th><th>Net P&amp;L</th></tr></thead><tbody>
      ${['Intraday','Intraday plans','Swing'].map(k=>{const a=tradeRows.filter(x=>x.kind===k);return '<tr><td>'+k+'</td><td>'+a.length+'</td><td class="'+(sum(a,x=>x.pnl)>=0?'pos':'neg')+'">'+inr(sum(a,x=>x.pnl))+'</td></tr>';}).join('')}
      </tbody></table></div>
      <p class="an-note">Trade P&amp;L is shown in the source currency of your trading records; asset values are displayed in INR. Confirm that all trade accounts use INR before comparing totals.</p>
    </section>
    <section class="card"><h2>Holdings snapshot</h2><div class="scroll"><table class="dense"><thead><tr><th>Asset</th><th>Workspace</th><th>Units</th><th>Cost basis</th><th>Latest value</th><th>Unrealised P&amp;L</th><th>Price status</th></tr></thead><tbody>
      ${holdings.map(h=>'<tr><td><b>'+esc(h.symbol)+'</b><br><span class="muted">'+esc(h.name)+'</span></td><td>'+classNames[h.asset_class]+'</td><td>'+h.units.toFixed(4)+'</td><td>'+inr(h.cost)+'</td><td>'+inr(h.value)+'</td><td class="'+((h.pnl||0)>=0?'pos':'neg')+'">'+(h.pnl===null?'—':inr(h.pnl))+'</td><td>'+(h.priced?'<span class="pos">Updated</span>':'<span class="warn">Cost estimate</span>')+'</td></tr>').join('')||'<tr><td colspan="7" class="muted">No active holdings.</td></tr>'}
      </tbody></table></div>
      <p class="an-note">${unpriced?unpriced+' holding(s) still use cost as a value estimate. Update latest price/NAV in the Investing or MF / ETFs pages. ':''}Market prices are manual; this dashboard does not connect to brokers or live market feeds.</p>
    </section>
    <p class="an-note">This dashboard covers tracked investments and closed-trade results. It is not a full net-worth statement: cash balances, liabilities, dividends, taxes and external accounts are not included. Sector allocation needs sector data per holding, which the current records do not collect.</p>
  `;
}
