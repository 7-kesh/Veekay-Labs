import { supabase } from '../supabase-client.js';
import { esc } from '../format.js';
const money=v=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(Number(v||0));
const num=v=>Number.isFinite(Number(v))?Number(v):0;
const pad=v=>String(v).padStart(2,'0');
const keyDate=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const monthLabel=d=>d.toLocaleDateString('en-IN',{month:'long',year:'numeric'});
export async function render(_p,el){
 el.innerHTML='<section class="card">Loading activity…</section>';
 const [t,p,a,u]=await Promise.all([
  supabase.from('scalp_trades').select('id,date,ticker,net_pnl').order('date'),
  supabase.from('plans').select('id,kind,ticker,status,plan_date,entry_date,exit_date,realized_pl').order('plan_date'),
  supabase.from('asset_transactions').select('id,asset_class,transaction_type,symbol,name,trade_date,units,price,fees').order('trade_date'),
  supabase.from('ai_import_batches').select('id,filename,broker,file_type,created_at').order('created_at')
 ]);
 for(const r of [t,p,a,u])if(r.error)throw r.error;
 const events=[];
 for(const x of t.data||[])if(x.date)events.push({date:x.date,kind:'Intraday trade',title:x.ticker||'Trade',detail:x.net_pnl==null?'P&L not recorded':'Realised '+money(x.net_pnl)});
 for(const x of p.data||[]){const label=x.kind==='swing'?'Swing':'Intraday plan';if(x.plan_date)events.push({date:x.plan_date,kind:label+' planned',title:x.ticker||label,detail:x.status||'Planned'});if(x.entry_date&&x.entry_date!==x.plan_date)events.push({date:x.entry_date,kind:label+' entry',title:x.ticker||label,detail:'Entry'});if(x.exit_date)events.push({date:x.exit_date,kind:label+' exit',title:x.ticker||label,detail:x.realized_pl==null?'P&L not recorded':'Realised '+money(x.realized_pl)});}
 for(const x of a.data||[])if(x.trade_date)events.push({date:x.trade_date,kind:'Investment '+x.transaction_type,title:x.name||x.symbol,detail:x.asset_class.replace('_',' ')+' · '+num(x.units)+' units @ '+money(x.price)});
 for(const x of u.data||[])if(x.created_at)events.push({date:x.created_at.slice(0,10),kind:'Excel / statement uploaded',title:x.filename,detail:[x.broker,x.file_type].filter(Boolean).join(' · ')||'AI Import'});
 events.sort((x,y)=>x.date.localeCompare(y.date));
 const byMonth=new Map();
 const add=(date,v,type)=>{if(!date||v==null)return;const k=date.slice(0,7);if(!byMonth.has(k))byMonth.set(k,{intraday:0,swing:0,count:0});byMonth.get(k)[type]+=num(v);byMonth.get(k).count++;};
 for(const x of t.data||[])add(x.date,x.net_pnl,'intraday');
 for(const x of p.data||[])if(x.kind==='swing')add(x.exit_date||x.plan_date,x.realized_pl,'swing');
 let cursor=new Date(new Date().getFullYear(),new Date().getMonth(),1);
 const drawCalendar=()=>{
  const first=new Date(cursor.getFullYear(),cursor.getMonth(),1),start=new Date(first);start.setDate(1-first.getDay());
  let html='<div class="calendar-grid calendar-head">'+['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d=>'<div>'+d+'</div>').join('')+'</div><div class="calendar-grid">';
  for(let i=0;i<42;i++){const d=new Date(start);d.setDate(start.getDate()+i);const k=keyDate(d),list=events.filter(e=>e.date===k);html+='<div class="calendar-day '+(d.getMonth()===cursor.getMonth()?'':'outside')+'"><b>'+d.getDate()+'</b>'+list.slice(0,3).map(e=>'<div class="calendar-event" title="'+esc(e.kind+' · '+e.title+' · '+e.detail)+'"><span>'+esc(e.kind)+'</span><small>'+esc(e.title)+'</small></div>').join('')+(list.length>3?'<small>+'+(list.length-3)+' more</small>':'')+'</div>';}
  return html+'</div>';
 };
 const rows=[...byMonth.entries()].sort((x,y)=>y[0].localeCompare(x[0])).map(([k,v])=>{const total=v.intraday+v.swing;return '<tr><td>'+esc(new Date(+k.slice(0,4),+k.slice(5,7)-1,1).toLocaleDateString('en-IN',{month:'long',year:'numeric'}))+'</td><td class="'+(v.intraday>=0?'pos':'neg')+'">'+money(v.intraday)+'</td><td class="'+(v.swing>=0?'pos':'neg')+'">'+money(v.swing)+'</td><td class="'+(total>=0?'pos':'neg')+'"><b>'+money(total)+'</b></td><td>'+v.count+'</td></tr>';}).join('');
 el.innerHTML='<div class="head"><div><h1>Activity Calendar & Monthly P&amp;L</h1><p class="muted">Portfolio · Trades, swings, investments and uploads</p></div><a class="btn sm" href="#/stats/portfolio">← Portfolio</a></div><section class="card"><div style="display:flex;align-items:center;justify-content:space-between;gap:10px"><button class="btn sm" id="prevMonth">← Previous</button><h2 id="monthTitle" style="margin:0">'+monthLabel(cursor)+'</h2><button class="btn sm" id="nextMonth">Next →</button></div><div id="monthCalendar" style="margin-top:14px">'+drawCalendar()+'</div><p class="muted note">Events use the trade date, plan/entry/exit date, investment transaction date or AI Import upload date.</p></section><section class="card"><h2>Monthly realised gain / loss</h2><p class="muted">Calculated from recorded Intraday net P&amp;L and Swing realised P&amp;L. Investment transactions appear on the calendar, but are excluded from realised P&amp;L until cost-basis matching for investment sales is available.</p><div class="tablewrap"><table class="dense"><thead><tr><th>Month</th><th>Intraday</th><th>Swing</th><th>Combined realised P&amp;L</th><th>Records</th></tr></thead><tbody>'+(rows||'<tr><td colspan="5" class="muted">No realised P&amp;L records yet. This table will populate as closed trades and swings are recorded.</td></tr>')+'</tbody></table></div></section><section class="card"><h2>Activity log</h2><div class="tablewrap"><table class="dense"><thead><tr><th>Date</th><th>Activity</th><th>Item</th><th>Details</th></tr></thead><tbody>'+(events.slice().reverse().map(e=>'<tr><td>'+esc(e.date)+'</td><td>'+esc(e.kind)+'</td><td>'+esc(e.title)+'</td><td>'+esc(e.detail)+'</td></tr>').join('')||'<tr><td colspan="4" class="muted">No activity recorded yet.</td></tr>')+'</tbody></table></div></section>';
 const update=()=>{el.querySelector('#monthTitle').textContent=monthLabel(cursor);el.querySelector('#monthCalendar').innerHTML=drawCalendar();};
 el.querySelector('#prevMonth').addEventListener('click',()=>{cursor=new Date(cursor.getFullYear(),cursor.getMonth()-1,1);update();});
 el.querySelector('#nextMonth').addEventListener('click',()=>{cursor=new Date(cursor.getFullYear(),cursor.getMonth()+1,1);update();});
}
