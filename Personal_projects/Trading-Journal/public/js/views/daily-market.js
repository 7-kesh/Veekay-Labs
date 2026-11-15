const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dateOf=x=>{const d=new Date(x);return Number.isNaN(+d)?null:d};
const fmt=x=>{const d=dateOf(x);return d?d.toLocaleString('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit',timeZone:'Asia/Kolkata'})+' IST':'Time unavailable'};
function card(x,category){
 const bias=String(x.bias||'unclear').toLowerCase();
 return `<article class="dm-article"><div class="dm-meta"><span>${esc(x.company||x.ticker||'Market update')}</span><span>${esc(fmt(x.published_at))}</span></div><a class="dm-headline" href="${esc(x.url||'#')}" target="_blank" rel="noopener noreferrer">${esc(x.headline||x.title||'Market update')}</a><p><b>What changed:</b> ${esc(x.what_changed||x.detail||'See linked source for details.')}</p><p><b>Why it matters:</b> ${esc(x.why_it_matters||x.risk||'Check price and volume reaction before acting.')}</p><div class="dm-tags"><span class="dm-tag dm-${category}">${category.toUpperCase()}</span><span class="dm-tag">${esc(bias.toUpperCase())} · ${esc(x.confidence||'Unrated')}</span><span class="dm-tag">${esc(x.source||'Source')}</span></div><p class="dm-risk"><b>Risk / invalidation:</b> ${esc(x.risk||'Recheck the original filing and live market response.')}</p></article>`;
}
export async function render(_p,el){
 el.innerHTML=`<div class="head"><div><h1>Daily Market</h1><p class="muted">Indian equities · daily research brief published to this site</p></div><button class="btn sm" id="dmRefresh">↻ Refresh</button></div>
 <section class="dm-pulse"><div><span class="dm-kicker">PRE-MARKET DESK</span><h2 id="dmDate">Loading today's brief…</h2><p id="dmSummary">Loading the latest published market preparation.</p></div><div class="dm-checks"><span>Nifty / Sensex</span><span>Global cues</span><span>Flows &amp; macro</span><span>Company filings</span></div></section>
 <div class="dm-tabs" role="tablist"><button class="dm-tab active" data-tab="all">All news</button><button class="dm-tab" data-tab="intraday">Intraday</button><button class="dm-tab" data-tab="swing">Swing</button><button class="dm-tab" data-tab="investing">Investing</button></div>
 <div id="dmStatus" class="muted dm-status">Loading latest site update…</div><div id="dmCues" class="dm-cues"></div><div id="dmFeed" class="dm-feed"></div>
 <section class="dm-sources"><h3>Primary source checks</h3><a href="https://www.nseindia.com/companies-listing/corporate-filings-announcements" target="_blank" rel="noopener">NSE corporate announcements ↗</a><a href="https://www.bseindia.com/corporates/ann.html" target="_blank" rel="noopener">BSE corporate announcements ↗</a><a href="https://www.nseindia.com/market-data/live-equity-market" target="_blank" rel="noopener">NSE live market ↗</a></section>
 <p class="muted dm-disclaimer">This is a research and readiness aid, not a buy/sell recommendation. Bias and relevance are analytical judgments, not guarantees. Verify filings, prices, liquidity and risk before trading.</p>`;
 let brief=null,active='all';
 const draw=()=>{
  const categories=['intraday','swing','investing'];
  const selected=active==='all'?categories:[active];
  const rows=selected.flatMap(c=>(brief?.sections?.[c]||[]).map(x=>({x,c})));
  document.getElementById('dmFeed').innerHTML=rows.length?rows.map(({x,c})=>card(x,c)).join(''):`<section class="card"><p class="muted">${brief?.no_material_updates?'No material verified updates were found for this horizon in this edition.':'No published items in this section yet. The daily publisher will populate it after the next successful run.'}</p></section>`;
  document.querySelectorAll('.dm-tab').forEach(b=>b.classList.toggle('active',b.dataset.tab===active));
 };
 const refresh=async()=>{
  const status=document.getElementById('dmStatus');status.textContent='Checking the latest published site brief…';
  document.getElementById('dmRefresh').disabled=true;
  try{
   const res=await fetch('./data/daily-market.json?v='+Date.now(),{cache:'no-store'});
   if(!res.ok)throw new Error('No published brief yet');
   brief=await res.json();
   document.getElementById('dmDate').textContent='Market preparation · '+(brief.market_date||'Latest edition');
   document.getElementById('dmSummary').textContent=brief.market_summary||'No market summary supplied in this edition.';
   const cues=[...(brief.global_cues||[]),...(brief.macro||[]).map(x=>({title:x.name,detail:[x.value,x.context].filter(Boolean).join(' · '),source:x.source,url:x.url}))];
   document.getElementById('dmCues').innerHTML=cues.length?'<h3>Global cues & macro dashboard</h3>'+cues.map(x=>`<article class="dm-cue"><b>${esc(x.title)}</b><p>${esc(x.detail)}</p><a href="${esc(x.url||'#')}" target="_blank" rel="noopener noreferrer">${esc(x.source||'Source')} ↗</a></article>`).join(''):'';
   status.textContent='Last site update: '+fmt(brief.updated_at)+' · '+(brief.no_material_updates?'No material updates flagged':'Source-linked daily edition');
   draw();
  }catch(e){status.textContent='No daily brief has been published to the site yet, or the data file is temporarily unavailable.';document.getElementById('dmFeed').innerHTML='<section class="card"><p class="muted">The page reads its daily edition from the KeshavTrades site data file. It will not substitute unverified live RSS headlines.</p></section>';document.getElementById('dmCues').innerHTML='';}
  finally{document.getElementById('dmRefresh').disabled=false;}
 };
 el.querySelectorAll('.dm-tab').forEach(b=>b.addEventListener('click',()=>{active=b.dataset.tab;draw();}));
 document.getElementById('dmRefresh').addEventListener('click',refresh);
 await refresh();
}
