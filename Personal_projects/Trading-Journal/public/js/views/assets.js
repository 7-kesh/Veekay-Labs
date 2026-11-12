import { supabase } from '../supabase-client.js';
import { esc } from '../format.js';
const money = value => new Intl.NumberFormat('en-IN', { style:'currency', currency:'INR', maximumFractionDigits:2 }).format(Number(value || 0));

const CONFIG = {
  equity: { title: 'Investing', subtitle: 'Long-term equity portfolio', route: 'investing', assetClass: 'equity', unit: 'Shares' },
  mutual_fund: { title: 'Mutual Funds', subtitle: 'SIPs and lump-sum investments', route: 'funds', assetClass: 'mutual_fund', unit: 'Units' },
  etf: { title: 'ETFs', subtitle: 'Exchange-traded fund portfolio', route: 'funds', assetClass: 'etf', unit: 'Units' },
};

function snapshotHoldings(rows){
 const groups=new Map();
 for(const r of rows||[]){const key=r.asset_class+':'+(r.isin||r.symbol).toUpperCase();if(!groups.has(key))groups.set(key,[]);groups.get(key).push(r);}
 return [...groups.values()].map(g=>{const r=[...g].sort((x,y)=>Number(y.units)-Number(x.units))[0],units=Number(r.units||0),cost=Number(r.invested_value??units*Number(r.avg_price||0)),value=Number(r.current_value??units*Number(r.close_price||0));return {symbol:r.symbol,name:r.name,isin:r.isin,units,cost,avg:units?cost/units:0,market:r.close_price===null?null:Number(r.close_price),value,pnl:r.unrealized_pnl===null?value-cost:Number(r.unrealized_pnl),asset_class:r.asset_class,brokers:[...new Set(g.map(x=>x.broker))],snapshot:true};});
}
function computeHoldings(rows, prices) {
  const map = new Map();
  for (const r of [...rows].sort((a,b) => a.trade_date.localeCompare(b.trade_date) || a.id-b.id)) {
    const key = r.symbol.toUpperCase();
    if (!map.has(key)) map.set(key, { symbol:key, name:r.name || '', units:0, cost:0 });
    const h = map.get(key);
    const qty = Number(r.units), gross = qty * Number(r.price) + Number(r.fees || 0);
    if (r.transaction_type === 'buy') { h.cost += gross; h.units += qty; }
    else if (h.units > 0) {
      const avg = h.cost / h.units;
      h.cost = Math.max(0, h.cost - avg * qty);
      h.units = Math.max(0, h.units - qty);
    }
    if (r.name) h.name = r.name;
  }
  return [...map.values()].filter(h => h.units > 0.00000001).map(h => {
    const p = prices.find(x => x.symbol.toUpperCase() === h.symbol);
    const market = p ? Number(p.market_price) : null;
    return { ...h, avg: h.cost / h.units, market, value: market === null ? null : h.units * market,
      pnl: market === null ? null : h.units * market - h.cost };
  });
}

export async function renderAssetClass(kind, params, el) {
  const c = CONFIG[kind];
  const fundTabs = kind === 'mutual_fund' || kind === 'etf' ? `<nav class="subtabs"><a class="${kind === 'mutual_fund' ? 'on' : ''}" href="#/funds">Mutual Funds</a><a class="${kind === 'etf' ? 'on' : ''}" href="#/etfs">ETFs</a></nav>` : '';
  const [{ data:userData, error:userError }, { data:rows, error:rowsError }, { data:prices, error:pricesError }, { data:snapshots, error:snapshotError }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from('asset_transactions').select('*').eq('asset_class', c.assetClass).order('trade_date', { ascending:false }).order('id', { ascending:false }),
    supabase.from('asset_market_prices').select('*').eq('asset_class', c.assetClass),
    supabase.from('asset_holding_snapshots').select('*').eq('asset_class', c.assetClass).order('as_of_date',{ascending:false}),
  ]);
  if (userError) throw userError;
  if (rowsError) throw rowsError;
  if (pricesError) throw pricesError;
  if (snapshotError) throw snapshotError;
  const holdings = snapshots?.length ? snapshotHoldings(snapshots) : computeHoldings(rows || [], prices || []);
  const invested = holdings.reduce((s,h)=>s+h.cost,0);
  const value = holdings.reduce((s,h)=>s+(h.value ?? h.cost),0);
  const pnl = holdings.reduce((s,h)=>s+(h.pnl ?? 0),0);
  const graphRows = [...holdings].sort((a,b)=>(b.value ?? b.cost)-(a.value ?? a.cost));
  const graphMax = Math.max(1, ...graphRows.map(h=>Math.max(h.cost, h.value ?? h.cost)));
  const chartHtml = graphRows.length ? `
    <section class="card"><style>.asset-legend{display:flex;gap:18px;flex-wrap:wrap;font-size:12px;margin:8px 0 16px}.asset-legend span{display:flex;align-items:center;gap:6px}.asset-dot{width:9px;height:9px;border-radius:50%;display:inline-block}.asset-dot.cost,.asset-bar.cost{background:#8b98a9}.asset-dot.value,.asset-bar.value{background:#27866a}.asset-bar-row{margin:12px 0}.asset-bar-label{display:flex;justify-content:space-between;gap:12px;font-size:13px;margin-bottom:5px}.asset-bar-track{height:9px;background:var(--line, #e5e7eb);border-radius:8px;overflow:hidden;margin:4px 0}.asset-bar{height:100%;border-radius:8px;min-width:0}</style><h2>Portfolio visualisation <small class="muted">cost basis vs latest value</small></h2>
      <div class="asset-legend"><span><i class="asset-dot cost"></i> Invested cost</span><span><i class="asset-dot value"></i> Current value / cost estimate</span></div>
      <div class="asset-bars">${graphRows.map(h=>`<div class="asset-bar-row">
        <div class="asset-bar-label"><b>${esc(h.symbol)}</b><span>${money(h.value ?? h.cost)}</span></div>
        <div class="asset-bar-track"><div class="asset-bar cost" style="width:${Math.max(0,h.cost/graphMax*100)}%"></div></div>
        <div class="asset-bar-track"><div class="asset-bar value" style="width:${Math.max(0,(h.value ?? h.cost)/graphMax*100)}%"></div></div>
      </div>`).join('')}</div>
      <p class="muted note">Bars compare each holding's invested cost with its latest value. Where no latest price is entered, cost is shown as an estimate.</p>
    </section>` : '';
  el.innerHTML = `
    ${fundTabs}<div class="head"><div><h1>${c.title}</h1><p class="muted">${c.subtitle}. Prices are manually updated; no broker or market feed is connected.</p></div></div>
    ${chartHtml}
    <div class="tiles">
      <div class="tile"><span>Invested cost</span><b>${money(invested)}</b></div>
      <div class="tile"><span>Current value*</span><b>${money(value)}</b></div>
      <div class="tile"><span>Unrealised P&amp;L*</span><b class="${pnl >= 0 ? 'pos':'neg'}">${money(pnl)}</b></div>
      <div class="tile"><span>Holdings</span><b>${holdings.length}</b></div>
    </div>
    <section class="card"><h2>Holdings</h2>
      <div class="tablewrap"><table class="dense"><thead><tr><th>Symbol / ISIN</th><th>Name</th><th>Source</th><th>Units</th><th>Avg cost</th><th>Latest price</th><th>Market value</th><th>P&amp;L</th><th>Update price</th></tr></thead><tbody>
      ${holdings.map(h=>`<tr><td><b>${esc(h.symbol)}</b><br><small class="muted">${esc(h.isin||'')}</small></td><td>${esc(h.name)}</td><td>${h.snapshot?esc(h.brokers.join(' + ')):'Manual'}</td><td>${h.units.toFixed(4)}</td><td>${money(h.avg)}</td><td>${h.market === null ? '—' : money(h.market)}</td><td>${h.value === null ? '—' : money(h.value)}</td><td class="${(h.pnl ?? 0)>=0?'pos':'neg'}">${h.pnl === null ? '—' : money(h.pnl)}</td><td><form class="priceForm" data-symbol="${esc(h.symbol)}" style="display:flex;gap:4px"><input name="price" type="number" min="0" step="0.0001" placeholder="Price" required style="width:95px"><button class="btn sm">Save</button></form></td></tr>`).join('') || '<tr><td colspan="9" class="muted">No holdings yet. Add your first buy transaction below.</td></tr>'}
      </tbody></table></div><p class="muted" style="font-size:12px">Imported broker holdings use statement snapshots and reported closing prices/NAVs. Overlapping ISINs are consolidated conservatively using the largest reported quantity, not added together.</p>
    </section>
    <section class="card"><h2>Add transaction</h2>
      <form id="assetForm" class="filters" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;align-items:end">
        <label class="fld">Action<select name="transaction_type"><option value="buy">Buy / SIP</option><option value="sell">Sell / Redeem</option></select></label>
        <label class="fld">Symbol / code<input name="symbol" required maxlength="32" placeholder="e.g. INFY"></label>
        <label class="fld">Name<input name="name" maxlength="120" placeholder="Asset name"></label>
        <label class="fld">Date<input name="trade_date" type="date" value="${new Date().toISOString().slice(0,10)}" required></label>
        <label class="fld">${c.unit}<input name="units" type="number" min="0.00000001" step="0.00000001" required></label>
        <label class="fld">Price / NAV<input name="price" type="number" min="0" step="0.0001" required></label>
        <label class="fld">Fees<input name="fees" type="number" min="0" step="0.01" value="0"></label>
        <label class="fld">Notes<input name="notes" maxlength="500" placeholder="Optional"></label>
        <button class="btn primary" type="submit">Save transaction</button>
      </form>
    </section>
    <section class="card"><h2>Transaction history</h2><div class="tablewrap"><table class="dense"><thead><tr><th>Date</th><th>Action</th><th>Symbol</th><th>Name</th><th>Units</th><th>Price / NAV</th><th>Fees</th><th></th></tr></thead><tbody>
      ${(rows||[]).map(r=>`<tr><td>${esc(r.trade_date)}</td><td>${r.transaction_type === 'buy' ? 'Buy' : 'Sell'}</td><td><b>${esc(r.symbol)}</b></td><td>${esc(r.name)}</td><td>${Number(r.units).toFixed(4)}</td><td>${money(r.price)}</td><td>${money(r.fees)}</td><td><button class="btn sm danger deleteTxn" data-id="${r.id}">Delete</button></td></tr>`).join('') || '<tr><td colspan="8" class="muted">No transactions recorded.</td></tr>'}
    </tbody></table></div></section>`;
  const userId = userData.user.id;
  el.querySelector('#assetForm').addEventListener('submit', async e => {
    e.preventDefault(); const f = e.currentTarget; const d = Object.fromEntries(new FormData(f));
    if (d.transaction_type === 'sell') { const h = holdings.find(x => x.symbol === d.symbol.trim().toUpperCase()); if (!h || Number(d.units) > h.units + 1e-8) return alert('Sell quantity exceeds the units currently held.'); }
    const { error } = await supabase.from('asset_transactions').insert({ user_id:userId, asset_class:c.assetClass,
      transaction_type:d.transaction_type, symbol:d.symbol.trim().toUpperCase(), name:d.name.trim(), trade_date:d.trade_date,
      units:Number(d.units), price:Number(d.price), fees:Number(d.fees||0), notes:d.notes.trim() });
    if (error) return alert(error.message);
    await renderAssetClass(kind, params, el);
  });
  el.querySelectorAll('.priceForm').forEach(form => form.addEventListener('submit', async e => {
    e.preventDefault(); const symbol=form.dataset.symbol, price=Number(new FormData(form).get('price'));
    const { error } = await supabase.from('asset_market_prices').upsert({ user_id:userId, asset_class:c.assetClass, symbol, market_price:price, price_date:new Date().toISOString().slice(0,10) }, { onConflict:'user_id,asset_class,symbol' });
    if (error) return alert(error.message);
    await renderAssetClass(kind, params, el);
  }));
  el.querySelectorAll('.deleteTxn').forEach(btn => btn.addEventListener('click', async () => {
    if (!confirm('Delete this transaction? Holdings will be recalculated.')) return;
    const { error } = await supabase.from('asset_transactions').delete().eq('id', Number(btn.dataset.id));
    if (error) return alert(error.message);
    await renderAssetClass(kind, params, el);
  }));
}
