const FEEDS = [
  {name:'Economic Times',url:'https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms'},
  {name:'Moneycontrol',url:'https://www.moneycontrol.com/rss/marketreports.xml'},
  {name:'NDTV Profit',url:'https://feeds.feedburner.com/ndtvprofit-latest'}
];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clean=s=>String(s||'').replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;/g,' ').replace(/&amp;/g,'&').replace(/&#39;/g,"'").replace(/&quot;/g,'"').replace(/\s+/g,' ').trim();
const dateOf=x=>{const d=new Date(x);return Number.isNaN(+d)?null:d};
function classify(item){
 const t=(item.title+' '+item.description).toLowerCase();
 const buckets=[];
 if(/block deal|bulk deal|order win|contract|results|earnings|guidance|board meeting|acquisition|merger|stake sale|promoter|pledge|regulatory|approval|fii|dii|crude|rupee|inflation|rbi|fed|global cues|gap up|gap down|pre.?open|breakout|volume|downgrade|upgrade/.test(t)) buckets.push('intraday');
 if(/order win|contract|capacity|expansion|capex|earnings|results|guidance|margin|market share|product launch|regulatory|approval|acquisition|merger|sector|policy|interest rate|rbi|trade deal|export|import/.test(t)) buckets.push('swing');
 if(/dividend|bonus|split|buyback|record date|ex.?date|annual report|debt|cash flow|profit|revenue|valuation|promoter|governance|long.?term|investment|fundamental|quarterly results|earnings/.test(t)) buckets.push('investing');
 return buckets.length?buckets:['intraday','swing'];
}
function articleCard(x){
 const d=dateOf(x.pubDate), when=d?d.toLocaleString('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit',timeZone:'Asia/Kolkata'}):'Time unavailable';
 const cats=classify(x);
 return `<article class="dm-article"><div class="dm-meta"><span>${esc(x.source)}</span><span>${esc(when)} IST</span></div><a class="dm-headline" href="${esc(x.link)}" target="_blank" rel="noopener noreferrer">${esc(clean(x.title))}</a><p>${esc(clean(x.description).slice(0,330))}${clean(x.description).length>330?'…':''}</p><div class="dm-tags">${cats.map(c=>`<span class="dm-tag dm-${c}">${c.toUpperCase()}</span>`).join('')}</div></article>`;
}
async function loadFeed(){
 const results=await Promise.allSettled(FEEDS.map(async f=>{
  const url='https://api.rss2json.com/v1/api.json?rss_url='+encodeURIComponent(f.url);
  const res=await fetch(url,{cache:'no-store'});if(!res.ok)throw new Error(f.name+' feed unavailable');
  const data=await res.json();if(data.status!=='ok')throw new Error(f.name+' feed unavailable');
  return (data.items||[]).map(x=>({...x,source:f.name}));
 }));
 const items=results.flatMap(x=>x.status==='fulfilled'?x.value:[]);
 const unique=new Map();
 for(const x of items){const k=clean(x.title).toLowerCase();if(k&&!unique.has(k))unique.set(k,x);}
 return [...unique.values()].sort((a,b)=>(+(dateOf(b.pubDate)||0))-(+(dateOf(a.pubDate)||0)));
}
export async function render(_p,el){
 el.innerHTML=`<div class="head"><div><h1>Daily Market</h1><p class="muted">India equities news desk · verified headlines from linked publishers, grouped by trading horizon</p></div><button class="btn sm" id="dmRefresh">↻ Refresh</button></div>
 <section class="dm-pulse"><div><span class="dm-kicker">PRE-MARKET CHECKLIST</span><h2>Know the catalyst before the candle</h2><p>Read the source, check the exchange filing, then confirm price and volume before acting.</p></div><div class="dm-checks"><span>Global cues</span><span>Results &amp; filings</span><span>Flows &amp; macro</span><span>Corporate actions</span></div></section>
 <div class="dm-tabs" role="tablist"><button class="dm-tab active" data-tab="all">All news</button><button class="dm-tab" data-tab="intraday">Intraday</button><button class="dm-tab" data-tab="swing">Swing</button><button class="dm-tab" data-tab="investing">Investing</button></div>
 <div id="dmStatus" class="muted dm-status">Loading latest headlines…</div><div id="dmFeed" class="dm-feed"></div>
 <section class="dm-sources"><h3>Primary source checks</h3><a href="https://www.nseindia.com/companies-listing/corporate-filings-announcements" target="_blank" rel="noopener">NSE corporate announcements ↗</a><a href="https://www.bseindia.com/corporates/ann.html" target="_blank" rel="noopener">BSE corporate announcements ↗</a><a href="https://www.nseindia.com/market-data/live-equity-market" target="_blank" rel="noopener">NSE live market ↗</a></section>
 <p class="muted dm-disclaimer">News classification is automated and is a research aid, not a buy/sell recommendation. Headlines can be delayed or incomplete. Verify material information with NSE/BSE filings and use your own entry, liquidity and risk rules. Feed availability depends on publisher RSS and the public RSS conversion service.</p>`;
 let items=[],active='all';
 const draw=()=>{
  const filtered=active==='all'?items:items.filter(x=>classify(x).includes(active));
  document.getElementById('dmFeed').innerHTML=filtered.length?filtered.map(articleCard).join(''):'<section class="card"><p class="muted">No matching headlines were returned. Refresh later or use the primary exchange links below.</p></section>';
  document.querySelectorAll('.dm-tab').forEach(b=>b.classList.toggle('active',b.dataset.tab===active));
 };
 const refresh=async()=>{
  const status=document.getElementById('dmStatus');status.textContent='Refreshing publisher feeds…';
  document.getElementById('dmRefresh').disabled=true;
  try{items=await loadFeed();status.textContent=items.length?`Showing ${items.length} unique headlines · latest publisher timestamps shown in IST`:'No headlines returned by the feeds.';draw();}
  catch(e){status.textContent='Could not load live feeds right now. Use the primary source links below and try again.';document.getElementById('dmFeed').innerHTML='<section class="card"><p class="muted">The RSS service is temporarily unavailable. No headlines have been fabricated.</p></section>';}
  finally{document.getElementById('dmRefresh').disabled=false;}
 };
 el.querySelectorAll('.dm-tab').forEach(b=>b.addEventListener('click',()=>{active=b.dataset.tab;draw();}));
 document.getElementById('dmRefresh').addEventListener('click',refresh);
 await refresh();
}
