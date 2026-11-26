import { supabase } from '../supabase-client.js';
import { esc } from '../format.js';

const money = v => new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:2}).format(Number(v||0));
const num = v => Number.isFinite(Number(v)) ? Number(v) : 0;
const today = () => { const d=new Date(); return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10); };
const fmtDate = v => v ? new Date(v+'T00:00:00').toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : '—';
function metrics(rows){
 const invested=rows.reduce((s,r)=>s+num(r.issue_price)*num(r.allotted_quantity),0);
 const listing=rows.reduce((s,r)=>s+(r.listing_price===null?0:(num(r.listing_price)-num(r.issue_price))*num(r.allotted_quantity)),0);
 const realized=rows.reduce((s,r)=>s+(r.average_sell_price===null?0:(num(r.average_sell_price)-num(r.issue_price))*num(r.sold_quantity)),0);
 const held=rows.reduce((s,r)=>s+Math.max(0,num(r.allotted_quantity)-num(r.sold_quantity)),0);
 return {invested,listing,realized,held};
}
function card(r){
 const remain=Math.max(0,num(r.allotted_quantity)-num(r.sold_quantity));
 const listing=r.listing_price===null?null:(num(r.listing_price)-num(r.issue_price))*num(r.allotted_quantity);
 const realized=r.average_sell_price===null?null:(num(r.average_sell_price)-num(r.issue_price))*num(r.sold_quantity);
 return `<article class="ipo-card">
  <div class="ipo-cardhead"><div><h3>${esc(r.ipo_name)}</h3><div class="ipo-meta">${r.symbol?'<span>'+esc(r.symbol)+'</span>':''}<span>Allotted ${fmtDate(r.allotment_date)}</span></div></div><div class="ipo-actions"><button class="btn sm" type="button" data-edit="${r.id}">Edit entry</button><button class="btn sm danger" type="button" data-delete="${r.id}">Delete</button></div></div>
  <div class="ipo-stats">
   <div><small>Issue price</small><b>${money(r.issue_price)}</b></div><div><small>Allotted quantity</small><b>${num(r.allotted_quantity)}</b></div>
   <div><small>Listing price</small><b>${r.listing_price===null?'Not entered':money(r.listing_price)}</b></div>
   <div><small>Listing gain / loss</small><b class="${listing===null?'':listing>=0?'pos':'neg'}">${listing===null?'—':money(listing)}</b></div>
   <div><small>Quantity sold</small><b>${num(r.sold_quantity)}</b></div><div><small>Average sell price</small><b>${r.average_sell_price===null?'—':money(r.average_sell_price)}</b></div>
   <div><small>Realised gain / loss</small><b class="${realized===null?'':realized>=0?'pos':'neg'}">${realized===null?'—':money(realized)}</b></div>
   <div><small>Holding for long term</small><b>${remain} shares</b></div>
  </div>
  ${r.notes?'<p class="ipo-notes">'+esc(r.notes)+'</p>':''}
 </article>`;
}
function formValues(form,r={}){
 const set=(name,value)=>{const input=form.elements[name];if(input)input.value=value??'';};
 set('id',r.id||'');set('ipo_name',r.ipo_name||'');set('symbol',r.symbol||'');set('allotment_date',r.allotment_date||today());
 set('issue_price',r.issue_price??'');set('allotted_quantity',r.allotted_quantity??'');set('listing_price',r.listing_price??'');
 set('sold_quantity',r.sold_quantity??0);set('average_sell_price',r.average_sell_price??'');set('last_sell_date',r.last_sell_date||'');set('notes',r.notes||'');
 form.querySelector('[type=submit]').textContent=r.id?'Save changes':'Add IPO';
 form.querySelector('#ipoCancel').hidden=!r.id;
}
export async function render(_p,el){
 el.innerHTML='<section class="card">Loading IPO investments…</section>';
 const {data:rows,error}=await supabase.from('ipo_investments').select('*').order('allotment_date',{ascending:false}).order('created_at',{ascending:false});
 if(error)throw error;
 el.innerHTML=`
 <div class="head"><div><h1>IPO Gains &amp; Investing</h1><p class="muted">Track IPO allotments, listing gains, partial exits and the shares you keep for the long term.</p></div></div>
 <div class="tiles ipo-tiles"><div class="tile"><span>Total IPOs</span><b id="ipoCount">0</b></div><div class="tile"><span>Allotted cost</span><b id="ipoInvested">₹0</b></div><div class="tile"><span>Listing gain / loss*</span><b id="ipoListing">—</b></div><div class="tile"><span>Realised gain / loss*</span><b id="ipoRealized">—</b></div><div class="tile"><span>Long-term shares held</span><b id="ipoHeld">0</b></div></div>
 <section class="card"><div class="ipo-formhead"><div><h2 id="ipoFormTitle">Add IPO allotment</h2><p class="muted">Enter the allotment first. Come back after listing or after selling to update the same entry.</p></div></div>
 <form id="ipoForm" class="ipo-form">
  <input type="hidden" name="id">
  <label>IPO name<input name="ipo_name" required maxlength="140" placeholder="e.g. Example Limited"></label>
  <label>Symbol (optional)<input name="symbol" maxlength="32" placeholder="NSE ticker"></label>
  <label>Allotment date<input name="allotment_date" type="date" value="${today()}"></label>
  <label>Issue price (₹)<input name="issue_price" type="number" min="0" step="0.01" required placeholder="e.g. 100"></label>
  <label>Allotted quantity<input name="allotted_quantity" type="number" min="0.0001" step="0.0001" required placeholder="e.g. 15"></label>
  <label>Listing price (₹)<input name="listing_price" type="number" min="0" step="0.01" placeholder="Update after listing"></label>
  <label>Total quantity sold<input name="sold_quantity" type="number" min="0" step="0.0001" value="0"></label>
  <label>Average sell price (₹)<input name="average_sell_price" type="number" min="0" step="0.01" placeholder="Weighted average sale price"></label>
  <label>Last sell date<input name="last_sell_date" type="date"></label>
  <label class="ipo-wide">Notes<textarea name="notes" rows="2" maxlength="1000" placeholder="Lot details, multiple sale notes, long-term thesis…"></textarea></label>
  <div class="ipo-wide ipo-formactions"><button class="btn primary" type="submit">Add IPO</button><button class="btn" id="ipoCancel" type="button" hidden>Cancel edit</button></div>
 </form>
 <p class="muted ipo-help">Listing gain/loss = (listing price − issue price) × allotted quantity. Realised gain/loss = (average sell price − issue price) × quantity sold. Long-term holding = allotted quantity − quantity sold. These are gross estimates before taxes, brokerage and other charges. Enter a weighted average sell price if you sold in multiple orders.</p>
 </section>
 <section class="card"><div class="ipo-listhead"><div><h2>Your IPO portfolio</h2><p class="muted">Select Edit entry to update listing or sale details later.</p></div><span class="fb-count" id="ipoRowsCount">${rows.length} entries</span></div><div id="ipoList" class="ipo-list"></div></section>
 <p class="muted ipo-help">Your entries are stored in your signed-in KeshavTrades account in Supabase and are private to your account.</p>`;
 const form=el.querySelector('#ipoForm');
 const draw=items=>{
  const m=metrics(items);
  el.querySelector('#ipoCount').textContent=items.length;
  el.querySelector('#ipoInvested').textContent=money(m.invested);
  const listingEl=el.querySelector('#ipoListing');listingEl.textContent=money(m.listing);listingEl.className=m.listing>=0?'pos':'neg';
  const realizedEl=el.querySelector('#ipoRealized');realizedEl.textContent=money(m.realized);realizedEl.className=m.realized>=0?'pos':'neg';
  el.querySelector('#ipoHeld').textContent=m.held.toLocaleString('en-IN');
  el.querySelector('#ipoRowsCount').textContent=items.length+' entries';
  el.querySelector('#ipoList').innerHTML=items.length?items.map(card).join(''):'<div class="fb-empty">No IPOs recorded yet. Add your first allotment above.</div>';
 };
 draw(rows);
 formValues(form);
 form.addEventListener('submit',async e=>{
  e.preventDefault();const fd=new FormData(form),id=String(fd.get('id')||'');
  const issue=num(fd.get('issue_price')),qty=num(fd.get('allotted_quantity')),sold=num(fd.get('sold_quantity'));
  if(sold>qty){alert('Quantity sold cannot exceed allotted quantity.');return;}
  const listingRaw=String(fd.get('listing_price')||''),sellRaw=String(fd.get('average_sell_price')||'');
  const payload={ipo_name:String(fd.get('ipo_name')).trim(),symbol:String(fd.get('symbol')).trim().toUpperCase()||null,allotment_date:String(fd.get('allotment_date')||'')||null,issue_price:issue,allotted_quantity:qty,listing_price:listingRaw===''?null:num(listingRaw),sold_quantity:sold,average_sell_price:sellRaw===''?null:num(sellRaw),last_sell_date:String(fd.get('last_sell_date')||'')||null,notes:String(fd.get('notes')||'').trim()};
  const btn=form.querySelector('[type=submit]');btn.disabled=true;
  try{
   let result;
   if(id)result=await supabase.from('ipo_investments').update(payload).eq('id',id);
   else result=await supabase.from('ipo_investments').insert(payload);
   if(result.error)throw result.error;
   const fresh=await supabase.from('ipo_investments').select('*').order('allotment_date',{ascending:false}).order('created_at',{ascending:false});
   if(fresh.error)throw fresh.error;
   rows.splice(0,rows.length,...(fresh.data||[]));draw(rows);form.reset();formValues(form);el.querySelector('#ipoFormTitle').textContent='Add IPO allotment';
  }catch(err){alert('Could not save IPO: '+(err.message||err));}
  finally{btn.disabled=false;}
 });
 el.querySelector('#ipoCancel').addEventListener('click',()=>{form.reset();formValues(form);el.querySelector('#ipoFormTitle').textContent='Add IPO allotment';});
 el.querySelector('#ipoList').addEventListener('click',async e=>{
  const edit=e.target.closest('[data-edit]'),del=e.target.closest('[data-delete]');
  if(edit){const r=rows.find(x=>x.id===edit.dataset.edit);if(r){formValues(form,r);el.querySelector('#ipoFormTitle').textContent='Update '+r.ipo_name;form.scrollIntoView({behavior:'smooth',block:'start'});}return;}
  if(del){const r=rows.find(x=>x.id===del.dataset.delete);if(!r||!confirm('Delete '+r.ipo_name+' from your IPO tracker?'))return;const out=await supabase.from('ipo_investments').delete().eq('id',r.id);if(out.error){alert('Could not delete IPO: '+out.error.message);return;}const fresh=await supabase.from('ipo_investments').select('*').order('allotment_date',{ascending:false}).order('created_at',{ascending:false});if(fresh.error)throw fresh.error;rows.splice(0,rows.length,...(fresh.data||[]));draw(rows);}
 });
}
