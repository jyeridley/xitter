/*---STYLE---*/
:root{--bg:#000;--panel:#16181c;--line:#2f3336;--txt:#e7e9ea;--mut:#71767b;--up:#22c55e;--dn:#ef4444;--accent:#1d9bf0}
*{box-sizing:border-box}
html,body{margin:0;background:var(--bg);color:var(--txt);font:15px/1.35 TwitterChirp,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}
a{color:var(--accent);text-decoration:none}a:hover{text-decoration:underline}
.bar{position:sticky;top:0;z-index:6;background:rgba(0,0,0,.65);-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);display:flex;align-items:center;gap:20px;padding:0 16px;height:53px}
.bar[hidden]{display:none}
.bar h1{font-size:20px;font-weight:800;margin:0;letter-spacing:-.01em}
.bar .sub{color:var(--mut);font-size:13px}
.bar .back{color:var(--txt);font-size:20px;line-height:1;display:inline-flex;width:34px;height:34px;align-items:center;justify-content:center;border-radius:50%;margin-left:-8px}
.bar .back:hover{background:rgba(239,243,244,.1);text-decoration:none}
nav.tabs{display:flex;border-bottom:1px solid var(--line);overflow-x:auto;scrollbar-width:none}
nav.tabs a{flex:1 0 auto;text-align:center;color:var(--mut);font-weight:500;padding:0 16px;height:53px;display:flex;align-items:center;justify-content:center;position:relative;text-decoration:none;white-space:nowrap}
nav.tabs a:hover{background:rgba(231,233,234,.1)}
nav.tabs a.on{color:var(--txt);font-weight:700}
nav.tabs a.on::after{content:"";position:absolute;bottom:0;left:50%;transform:translateX(-50%);width:56px;height:4px;border-radius:2px;background:var(--accent)}
button{background:none;border:1px solid #536471;color:var(--txt);padding:7px 16px;border-radius:9999px;cursor:pointer;font:inherit;font-size:14px;font-weight:700;min-height:36px}
button:hover{background:rgba(239,243,244,.1)}
button.primary{background:#eff3f4;color:#0f1419;border-color:#eff3f4}
button.primary:hover{background:#d7dbdc}
button.danger{color:#f4212e;border-color:#67070f}
input,select{background:#000;border:1px solid var(--line);color:var(--txt);padding:10px 12px;border-radius:6px;font:inherit;width:100%}
input:focus,select:focus{outline:0;border-color:var(--accent);box-shadow:0 0 0 1px var(--accent)}
main{padding:16px;max-width:1280px;margin:auto}
.news{display:flex;gap:10px;align-items:center;padding:10px 16px;border-bottom:1px solid var(--line);font-size:13px;overflow-x:auto;white-space:nowrap;scrollbar-width:thin}
.tag{background:#eff3f4;color:#0f1419;font-weight:700;padding:2px 6px;border-radius:4px;font-size:11px}
.brk{background:#f4212e;color:#fff}
.grid{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(260px,1fr))}
.card{border:1px solid var(--line);background:#000;border-radius:16px;padding:16px;margin-bottom:12px;overflow-x:auto}
.lbl{color:var(--mut);font-size:12px;text-transform:uppercase;letter-spacing:.06em}
table{width:100%;border-collapse:collapse;font-variant-numeric:tabular-nums;font-size:14px}
td,th{padding:9px 6px;border-bottom:1px solid var(--line);text-align:right;white-space:nowrap}
td:first-child,th:first-child{text-align:left}
th{color:var(--mut);font-weight:500;font-size:12px}
.up{color:var(--up)}.dn{color:var(--dn)}
tr.click{cursor:pointer}tr.click:hover{background:rgba(231,233,234,.05)}
.row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.row>*{flex:1 1 140px}
.logo-img{width:24px;height:24px;border-radius:6px;object-fit:cover;vertical-align:middle;margin-right:8px;background:#202327;display:inline-block;color:var(--mut)}
svg{width:100%;height:220px;display:block}
.pulse{display:inline-block;width:7px;height:7px;border-radius:50%;background:#22c55e;margin-right:4px;vertical-align:middle;animation:pl 1.2s infinite}@keyframes pl{0%,100%{opacity:1}50%{opacity:.2}}
.w{background:var(--panel);border-radius:16px;padding:18px 20px;overflow:hidden}
.big{font-size:30px;font-weight:800;letter-spacing:-.02em;font-variant-numeric:tabular-nums}
.pill{display:inline-block;padding:3px 8px;border-radius:999px;font-size:12px;margin-top:4px;font-weight:600}
.pill.up{background:#1d3a2a;color:#4ade80}.pill.dn{background:#3a1d1d;color:#f87171}
.seg{display:inline-flex;background:#2a2d31;border-radius:999px;padding:3px;flex-shrink:0}
.seg button{border:0;background:none;color:#8b98a5;padding:5px 11px;border-radius:999px;min-height:0;font-weight:600}
.seg button.on{background:#000;color:#fff}
.wl{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid #2a2d31;cursor:pointer}
.wl:last-child{border-bottom:0}
.empty{text-align:center;padding:48px 20px}
.empty h2{font-size:31px;font-weight:800;margin:0 0 8px;letter-spacing:-.02em}
.empty p{color:var(--mut);margin:0 auto 20px;max-width:380px}
.note{color:var(--mut);font-size:14px}
details.card summary{list-style:none}details.card summary::-webkit-details-marker{display:none}
@media(max-width:640px){.m{display:none}main{padding:10px}.big{font-size:26px}}
/*---SCRIPT---*/
(function(){
var B=window.TRADEX,CSRF=B.csrf,SIGNED=B.signedIn;
var db=B.state;
var framed=window.top!==window;
var $=function(s){return document.querySelector(s)};
var esc=function(s){return String(s).replace(/[&<>"']/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]})};
var fmt=function(n){return '$'+Number(n).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})};
var big=function(n){return n>=1e12?'$'+(n/1e12).toFixed(2)+'T':n>=1e9?'$'+(n/1e9).toFixed(2)+'B':n>=1e6?'$'+(n/1e6).toFixed(2)+'M':fmt(n)};
var pct=function(a,b){return b?(a-b)/b*100:0};
var sg=function(x){return (x>=0?'+':'')+x.toFixed(2)+'%'};
var chg=function(c){return pct(c.price,c.prevClose)};
var cls=function(c){return chg(c)>=0?'up':'dn'};
var qn=function(q){return Number(q).toLocaleString('en-US',{maximumFractionDigits:4})};
var C=function(id){return db.companies.find(function(x){return x.id===id})};
var CT=function(t){return db.companies.find(function(x){return x.ticker===String(t||'').toUpperCase()})};
var Q=new URLSearchParams(location.search);
var S={page:Q.get('c')?'co':(['list','acct','admin'].indexOf(Q.get('p'))>=0?Q.get('p'):'dash'),cid:null,range:60,ir:150,dc:null};
if(S.page==='co'){var c0=CT(Q.get('c'));S.cid=c0?c0.id:null}
var AD=null,EDIT=null;
window.S=S;

function api(path,body){
 return fetch('/i/markets/api/'+path,body===undefined?{credentials:'same-origin'}:{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json','x-csrf-token':CSRF||''},body:JSON.stringify(body)})
  .then(function(r){return r.json().catch(function(){return {error:'Something went wrong'}}).then(function(j){if(!r.ok)throw new Error(j.error||(j.errors&&j.errors[0]&&j.errors[0].message)||'Something went wrong');return j})});
}
function go(p,x){
 var q=new URLSearchParams();
 if(Q.has('embed'))q.set('embed',Q.get('embed'));
 if(p==='co'){var c=C(x);q.set('c',c?c.ticker:x)}else if(p!=='dash')q.set('p',p);
 var s=q.toString();location.assign(location.pathname+(s?'?'+s:''));
}
function signIn(){return framed?'/i/flow/login':'/i/flow/login'}

/* ---------- COMPONENTS ---------- */
var logo=function(c){return c.logo?'<img class=logo-img src="'+esc(c.logo)+'" alt="">':'<span class=logo-img style="text-align:center;line-height:24px;font-size:9px">'+esc(c.ticker.slice(0,3))+'</span>'};
function headlines(){return '<div class=news><span class=tag>U.S Now | MARKET HEADLINES</span>'+(db.headlines.map(function(h){return (h.brk?'<span class="tag brk">BREAKING</span>':'')+'<span class=lbl>'+esc(h.cat)+'</span><span>'+(h.ticker?'<b>'+esc(h.ticker)+'</b> ':'')+esc(h.text)+'</span>'}).join('<span style="color:#333">•</span>')||'<span class=lbl>No headlines published</span>')+'</div>'}
var CH={};
function chart(h,key,force){if(h.length<2)return '<p class=lbl>Not enough price history yet.</p>';
 var id=key||('c'+Math.random().toString(36).slice(2,7));
 var v=h.map(function(x){return x[1]}),mn=Math.min.apply(null,v),mx=Math.max.apply(null,v),r=(mx-mn)||1,W=800,H=240,col=force||(v[v.length-1]>=v[0]?'#22c55e':'#ef4444');
 var line=v.map(function(y,i){return (i/(v.length-1)*W).toFixed(1)+','+(H-10-(y-mn)/r*(H-20)).toFixed(1)}).join(' ');
 CH[id]=h.map(function(x){return {t:x[0],v:x[1]}});
 return '<div class=chart id="'+id+'" data-hov style="position:relative;cursor:crosshair"><svg viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="none"><defs><linearGradient id="g'+id+'" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="'+col+'" stop-opacity=".35"/><stop offset="1" stop-color="'+col+'" stop-opacity="0"/></linearGradient></defs><polygon points="0,'+H+' '+line+' '+W+','+H+'" fill="url(#g'+id+')"/><polyline fill="none" stroke="'+col+'" stroke-width="2" vector-effect="non-scaling-stroke" points="'+line+'"/></svg><div class=xh style="display:none;position:absolute;top:0;bottom:0;width:1px;background:#555"></div><div class=tip style="display:none;position:absolute;top:6px;background:#fff;color:#000;padding:4px 8px;border-radius:4px;font-size:12px;pointer-events:none;white-space:nowrap"></div></div><div class=lbl style="padding:8px 20px 0"><span class=pulse></span>LIVE · High '+fmt(mx)+' · Low '+fmt(mn)+' · '+h.length+' ticks</div>'}
function hov(e,el){var d=CH[el.id];if(!d||!d.length)return;var r=el.getBoundingClientRect(),f=Math.min(1,Math.max(0,(e.clientX-r.left)/r.width));var p=d[Math.round(f*(d.length-1))],xh=el.querySelector('.xh'),tip=el.querySelector('.tip');xh.style.display='block';xh.style.left=(f*100)+'%';tip.style.display='block';tip.style.left=Math.min(f*100,78)+'%';tip.textContent=fmt(p.v)+' · '+new Date(p.t).toLocaleTimeString()}
function unhov(el){el.querySelector('.xh').style.display='none';el.querySelector('.tip').style.display='none'}
document.addEventListener('mousemove',function(e){var el=e.target.closest&&e.target.closest('[data-hov]');document.querySelectorAll('[data-hov]').forEach(function(x){if(x!==el)unhov(x)});if(el)hov(e,el)});
function spark(c){var h=c.hist.slice(-30);if(h.length<2)return '';var v=h.map(function(x){return x[1]}),mn=Math.min.apply(null,v),mx=Math.max.apply(null,v),r=(mx-mn)||1,col=v[v.length-1]>=v[0]?'#22c55e':'#ef4444';var pts=v.map(function(y,i){return (i/(v.length-1)*60).toFixed(1)+','+(16-(y-mn)/r*14).toFixed(1)}).join(' ');return '<svg viewBox="0 0 60 18" style="width:60px;height:18px;vertical-align:middle;margin-left:8px;flex:0 0 auto"><polyline fill="none" stroke="'+col+'" stroke-width="1.5" points="'+pts+'"/></svg>'}
function area(v){if(v.length<2)return '<div class=lbl style="padding:20px">Collecting live data…</div>';
 var mn=Math.min.apply(null,v),mx=Math.max.apply(null,v),r=(mx-mn)||1,W=600,H=160,col=v[v.length-1]>=v[0]?'#4ade80':'#f87171';
 var line=v.map(function(y,i){return (i/(v.length-1)*W).toFixed(1)+','+(H-8-(y-mn)/r*(H-16)).toFixed(1)}).join(' ');
 var id='a'+Math.random().toString(36).slice(2,7);
 return '<svg viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="none" style="height:160px;display:block"><defs><linearGradient id="'+id+'" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="'+col+'" stop-opacity=".45"/><stop offset="1" stop-color="'+col+'" stop-opacity="0"/></linearGradient></defs><polygon points="0,'+H+' '+line+' '+W+','+H+'" fill="url(#'+id+')"/><polyline fill="none" stroke="'+col+'" stroke-width="2" vector-effect="non-scaling-stroke" points="'+line+'"/></svg>'}
var pill=function(x){return '<span class="pill '+(x>=0?'up':'dn')+'">'+(x>=0?'▲':'▼')+' '+Math.abs(x).toFixed(2)+'%</span>'};
function emptyMarket(){return '<div class="card empty"><h2>No companies yet</h2><p>Nothing is listed on the market yet. Staff can list a company from the Admin tab'+(db.admin?'':', then trading opens here')+'.</p>'+(db.admin?'<button class=primary data-go="admin">List a company</button>':'')+'</div>'}

/* ---------- PAGES ---------- */
function dash(){
 var all=db.companies,L=all.filter(function(c){return !c.suspended});
 if(!all.length)return headlines()+'<main>'+emptyMarket()+'</main>';
 var mc=all.reduce(function(s,c){return s+c.price*c.shares},0),base=all.reduce(function(s,c){return s+c.prevClose*c.shares},0),perf=pct(mc,base);
 var G=L.slice().sort(function(a,b){return chg(b)-chg(a)}),D=L.slice().sort(function(a,b){return chg(a)-chg(b)}),V=L.slice().sort(function(a,b){return b.volume-a.volume}),R=all.slice().sort(function(a,b){return b.listed-a.listed});
 var wrow=function(c){return '<div class=wl style="'+(S.dc===c.id?'background:#0b0c0e;border-radius:12px;padding-left:8px;padding-right:8px':'')+'" data-pick="'+c.id+'"><div style="min-width:70px;overflow:hidden"><div>'+esc(c.ticker)+'</div><div class=lbl style="text-transform:none;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+esc(c.name)+'</div></div>'+spark(c)+'<div style="text-align:right"><div>'+fmt(c.price)+'</div>'+pill(chg(c))+'</div></div>'};
 var wlist=function(t,arr){return '<div class=w><div class=lbl>'+t+'</div><div style="margin-top:6px">'+(arr.slice(0,5).map(wrow).join('')||'<div class=lbl style="padding:12px 0">None yet</div>')+'</div></div>'};
 var ix=db.index.slice(-S.ir),first=ix.length?ix[0][1]:mc,last=ix.length?ix[ix.length-1][1]:mc,d=last-first;
 var hero='<div class=w style="grid-column:1/-1"><div class=row style="justify-content:space-between;flex-wrap:nowrap"><div><div class=lbl>Total market cap</div><div class=big>'+big(mc)+'</div></div><div class=seg>'+[[30,'1M'],[150,'5M'],[300,'All']].map(function(a){return '<button class="'+(S.ir===a[0]?'on':'')+'" data-ir="'+a[0]+'">'+a[1]+'</button>'}).join('')+'</div></div>'
 +'<div class=row style="gap:8px;margin-top:4px"><span class="'+(d>=0?'up':'dn')+'" style="flex:0 0 auto">'+(d>=0?'+':'-')+fmt(Math.abs(d))+'</span><span style="flex:0 0 auto">'+pill(pct(last,first))+'</span></div>'
 +'<div style="margin:14px -20px -18px">'+area(ix.map(function(x){return x[1]}))+'</div></div>';
 var sel=S.dc&&C(S.dc);
 var selW=sel?'<div class=w style="grid-column:1/-1"><div class=row style="justify-content:space-between;flex-wrap:nowrap"><div><div class=lbl>'+esc(sel.name)+' · '+esc(sel.ticker)+'</div><div class=big>'+fmt(sel.price)+' <span class="pill '+cls(sel)+'" style="font-size:13px">'+sg(chg(sel))+'</span></div></div><div class=row style="flex:0 0 auto;gap:6px"><button data-go="co" data-id="'+sel.id+'">Open</button><button data-pick="'+sel.id+'">Close</button></div></div><div style="margin:12px -20px 0">'+chart(sel.hist.slice(-S.range),'dc'+sel.id)+'</div></div>':'';
 return headlines()+'<main><div class=grid>'+hero+selW
 +'<div class=w><div class=lbl>Market performance</div><div class="big '+(perf>=0?'up':'dn')+'" style="margin-top:6px">'+sg(perf)+'</div><div class=lbl style="margin-top:6px">vs. previous close</div></div>'
 +'<div class=w><div class=lbl>Listed companies</div><div class=big style="margin-top:6px">'+all.length+'</div><div class=lbl style="margin-top:6px">'+L.length+' active · '+(all.length-L.length)+' suspended</div></div>'
 +wlist('Top gainers',G)+wlist('Top decliners',D)+wlist('Most active',V)+wlist('Recently added',R)
 +'</div></main>'}
function list(){if(!db.companies.length)return '<main>'+emptyMarket()+'</main>';
 return '<main><div class=card><table><tr><th>Company</th><th>Price</th><th>Change</th><th class=m>Mkt cap</th><th class=m>Volume</th><th class=m>Status</th></tr>'
 +db.companies.map(function(c){return '<tr class=click data-go="co" data-id="'+c.id+'"><td>'+logo(c)+esc(c.ticker)+' <span class=lbl style="text-transform:none">'+esc(c.name)+'</span>'+spark(c)+'</td><td>'+fmt(c.price)+'</td><td class="'+cls(c)+'">'+sg(chg(c))+'</td><td class=m>'+big(c.price*c.shares)+'</td><td class=m>'+c.volume.toLocaleString()+'</td><td class=m>'+(c.suspended?'SUSPENDED':'Active')+'</td></tr>'}).join('')
 +'</table></div></main>'}
function owned(c){var h=db.me&&db.me.holdings[c.id];return h?h.qty:0}
function coChart(c){var h=db.me&&db.me.holdings[c.id];var pts=c.hist.slice(-S.range);
 var ser=h?pts.map(function(x){return [x[0],x[1]*h.qty]}):pts;
 var col=h?(c.price*h.qty>=h.cost?'#22c55e':'#ef4444'):null;
 return chart(ser,'co'+c.id,col).replace(/<div class=lbl style="padding[^"]*">[\s\S]*$/,'')}
function coPage(){var c=C(S.cid);if(!c)return '<main><div class="card empty"><h2>Company not found</h2><p>It may have been delisted.</p><button data-go="list">← Markets</button></div></main>';
 var news=db.headlines.filter(function(h){return h.ticker===c.ticker});
 var right=db.me?'<div style="text-align:right"><div class=lbl>You own '+qn(owned(c))+' shares</div><div class=big id=own style="font-size:22px">'+fmt(owned(c)*c.price)+'</div></div>':'<div style="text-align:right"><div class=lbl>Market cap</div><div class=big style="font-size:22px">'+big(c.price*c.shares)+'</div></div>';
 var trade=db.me?'<div class=w style="margin-top:12px"><div class=row style="justify-content:space-between;margin-bottom:10px"><span class=note style="flex:1 1 auto">Cash '+fmt(db.me.cash)+'</span></div>'+(c.suspended?'<div class=note>This listing is suspended. Trading is paused.</div>':'<input id=qty type=number min=1 step=1 placeholder="Quantity"><br><br><div class=row><button class=primary data-trade=buy id=buyb>Buy at '+fmt(c.price)+'</button><button data-trade=sell>Sell</button></div>')+'</div>'
  :'<div class=w style="margin-top:12px"><div class=row><span class=note style="flex:2 1 220px">Sign in to trade '+esc(c.ticker)+' with your $5,000 of play cash.</span><a href="'+signIn()+'" target=_top style="flex:0 0 auto"><button class=primary>Sign in</button></a></div></div>';
 return '<main><div class=w><div class=row style="justify-content:space-between;flex-wrap:nowrap;align-items:flex-start"><div><div class=lbl style="text-transform:none">'+logo(c)+esc(c.name)+' · '+esc(c.ticker)+(c.suspended?' <span class=tag>SUSPENDED</span>':'')+'</div><div class=big id=px style="margin-top:4px">'+fmt(c.price)+'</div><div id=chg>'+pill(chg(c))+'</div></div>'+right+'</div>'
 +'<div class=row style="justify-content:flex-end;margin-top:10px"><div class=seg style="flex:0 0 auto">'+[[20,'20'],[60,'60'],[200,'200']].map(function(a){return '<button class="'+(S.range===a[0]?'on':'')+'" data-range="'+a[0]+'">'+a[1]+' pts</button>'}).join('')+'</div></div>'
 +'<div id=live style="margin:10px -20px 0">'+coChart(c)+'</div><div class=lbl id=stats style="margin-top:10px">'+stats(c)+'</div></div>'
 +trade
 +(news.length?'<div class=w style="margin-top:12px"><div class=lbl>News</div>'+news.map(function(h){return '<p style="margin:10px 0 0">'+(h.brk?'<span class="tag brk">BREAKING</span> ':'')+'<span class=lbl>'+esc(h.cat)+'</span><br>'+esc(h.text)+'</p>'}).join('')+'</div>':'')
 +'</main>'}
function stats(c){return '<span class=pulse></span>LIVE · Mkt cap '+big(c.price*c.shares)+' · Volume '+c.volume.toLocaleString()+' · '+c.shares.toLocaleString()+' shares · Listed '+new Date(c.listed).toLocaleDateString()}
function updateLive(){var c=C(S.cid);if(!c)return;var l=$('#live');if(l)l.innerHTML=coChart(c);var p=$('#px');if(p)p.textContent=fmt(c.price);var g=$('#chg');if(g)g.innerHTML=pill(chg(c));var o=$('#own');if(o)o.textContent=fmt(owned(c)*c.price);var s=$('#stats');if(s)s.innerHTML=stats(c);var b=$('#buyb');if(b)b.textContent='Buy at '+fmt(c.price)}
function trade(side){var c=C(S.cid),q=Math.floor(+$('#qty').value);
 if(!c)return;if(c.suspended)return alert('This listing is suspended');
 if(!(q>0))return alert('Enter a quantity');
 api('trade',{id:c.id,side:side,qty:q}).then(function(st){db=st;render()},function(e){alert(e.message)})}
function acct(){if(!db.me)return '<main><div class="card empty"><h2>Your account</h2><p>Sign in to trade with $5,000 of play cash.</p><a href="'+signIn()+'" target=_top><button class=primary>Sign in</button></a></div></main>';
 var a=db.me;
 var eq=Object.keys(a.holdings).map(function(id){var c=C(id),p=a.holdings[id];return c?{c:c,qty:p.qty,cost:p.cost,v:c.price*p.qty}:null}).filter(Boolean);
 var val=eq.reduce(function(s,e){return s+e.v},0);
 return '<main><div class=grid>'
 +'<div class=w><div class=lbl>Cash</div><div class=big style="margin-top:6px">'+fmt(a.cash)+'</div><div class=lbl style="margin-top:6px;text-transform:none">Total equity '+fmt(val+a.cash)+' · @'+esc(a.handle)+' since '+new Date(a.created).toLocaleDateString()+'</div></div>'
 +'<div class=w><div class=lbl>Equity by company</div><div style="margin-top:6px">'+(eq.map(function(e){return '<div class=wl data-go="co" data-id="'+e.c.id+'"><div><div>'+esc(e.c.ticker)+'</div><div class=lbl style="text-transform:none">'+qn(e.qty)+' shares</div></div><div style="text-align:right"><div>'+fmt(e.v)+'</div><div class="'+(e.v-e.cost>=0?'up':'dn')+'" style="font-size:12px">'+(e.v-e.cost>=0?'+':'-')+fmt(Math.abs(e.v-e.cost))+'</div></div></div>'}).join('')||'<div class=lbl style="padding:12px 0">No holdings yet</div>')+'</div></div>'
 +'</div><div class=card style="margin-top:12px"><div class=lbl>Transactions</div><br><table><tr><th>Time</th><th>Side</th><th>Ticker</th><th>Qty</th><th class=m>Price</th><th>Total</th></tr>'
 +(a.txns.map(function(t){return '<tr><td>'+new Date(t.t).toLocaleString()+'</td><td class="'+(t.side==='buy'?'up':'dn')+'">'+t.side.toUpperCase()+'</td><td>'+esc(t.ticker)+'</td><td>'+qn(t.qty)+'</td><td class=m>'+fmt(t.price)+'</td><td>'+fmt(t.total)+'</td></tr>'}).join('')||'<tr><td colspan=6 class=lbl>No transactions</td></tr>')+'</table></div></main>'}

/* ---------- ADMIN ---------- */
function readFile(input){return new Promise(function(res,rej){var f=input&&input.files&&input.files[0];if(!f)return res('');if(f.size>1e6)return rej(new Error('The logo must be under 1 MB'));var r=new FileReader();r.onload=function(){res(r.result)};r.onerror=function(){rej(new Error('Could not read that file'))};r.readAsDataURL(f)})}
function act(action,body,ask){if(ask&&!confirm(ask))return Promise.resolve();
 return api('admin/'+action,body||{}).then(function(r){db=r.state;AD=r.admin;render()},function(e){alert(e.message)})}
function adminPage(){
 if(!db.admin)return '<main><div class="card empty"><h2>Staff only</h2><p>The market\'s admin panel is for '+esc(db.instance)+' staff with the admin role.</p></div></main>';
 if(!AD){api('admin').then(function(r){AD=r;render()},function(e){AD={accounts:[],logs:[],error:e.message};render()});return '<main><div class=note>Loading…</div></main>'}
 return '<main>'+adCo()+adCtl()+adEvents()+adHl()
 +'<details class=card'+(S.openAcc?' open':'')+' data-d=acc><summary class=lbl style="cursor:pointer">Accounts ('+AD.accounts.length+')</summary><br>'+adAcc()+'</details>'
 +'<details class=card'+(S.openLog?' open':'')+' data-d=log><summary class=lbl style="cursor:pointer">Activity log</summary><br>'+adLog()+'</details></main>'}
function adCo(){var e=EDIT&&C(EDIT);return (e?editForm(e):'')+'<div class=card><div class=lbl>List a company</div><br><div class=row>'
 +'<input id=cn placeholder="Company name" maxlength=80><input id=ct placeholder="Ticker" maxlength=6><input id=cp type=number step=0.01 min=0.01 placeholder="Initial price"><input id=cs type=number min=1 placeholder="Shares outstanding"></div><br>'
 +'<div class=row><input id=cl type=file accept="image/png,image/jpeg,image/gif,image/webp"><button class=primary data-a=list>List company</button></div></div>'
 +'<div class=card><table><tr><th>Ticker</th><th>Name</th><th>Price</th><th class=m>Shares</th><th>Status</th><th></th></tr>'
 +(db.companies.map(function(c){return '<tr><td>'+logo(c)+esc(c.ticker)+'</td><td>'+esc(c.name)+'</td><td>'+fmt(c.price)+'</td><td class=m>'+c.shares.toLocaleString()+'</td><td>'+(c.suspended?'Suspended':'Active')+'</td><td><button data-a=edCo data-id="'+c.id+'">Edit</button> <button data-a=suspend data-id="'+c.id+'">'+(c.suspended?'Resume':'Suspend')+'</button> <button class=danger data-a=remove data-id="'+c.id+'">Delete</button></td></tr>'}).join('')||'<tr><td colspan=6 class=lbl>No companies</td></tr>')+'</table></div>'}
function editForm(c){return '<div class=card style="border-color:#eff3f4"><div class=lbl>Editing company</div><br>'
 +'<div class=row><div><div class=lbl>Company name</div><input id=en maxlength=80 value="'+esc(c.name)+'"></div><div><div class=lbl>Ticker</div><input id=et maxlength=6 value="'+esc(c.ticker)+'"></div><div><div class=lbl>Shares outstanding</div><input id=es type=number min=1 value="'+c.shares+'"></div></div><br>'
 +'<div class=row style="align-items:center">'+(c.logo?'<img src="'+esc(c.logo)+'" style="width:48px;height:48px;border-radius:6px;object-fit:cover;flex:0 0 48px">':'<span class=lbl style="flex:0 0 auto">No logo</span>')+'<div style="flex:2 1 200px"><div class=lbl>Upload new logo</div><input id=el type=file accept="image/png,image/jpeg,image/gif,image/webp"></div></div><br>'
 +'<div class=row><button class=primary data-a=saveEdit>Save changes</button><button data-a=cancelEdit>Cancel</button><button data-a=clearLogo data-id="'+c.id+'">Remove logo</button></div></div>'}
function opts(){return db.companies.map(function(c){return '<option value="'+c.id+'">'+esc(c.ticker)+' · '+fmt(c.price)+'</option>'}).join('')}
function adCtl(){var o=opts();
 return '<div class=card><div class=lbl style="margin-bottom:10px">Market controls</div>'
 +'<div class=row><input id=mp type=number min=0 step=0.1 placeholder="% for whole market"><button data-a=mkt data-sign=-1>Crash all</button><button class=primary data-a=mkt data-sign=1>Boost all</button></div><br>'
 +'<div class=row><select id=cg>'+o+'</select><input id=cgp type=number min=0 step=0.1 placeholder="%"><button data-a=coPct data-dir=-1>Crash</button><button class=primary data-a=coPct data-dir=1>Boost</button></div><br>'
 +'<div class=row><select id=sg>'+o+'</select><input id=sp type=number min=0.01 step=0.01 placeholder="Set exact price"><button data-a=setExact>Set price</button></div><br>'
 +'<div class=row><select id=ag>'+o+'</select><input id=ad type=number step=0.01 placeholder="± $ amount"><button data-a=adjust>Adjust $</button></div></div>'}
function adEvents(){var ev=db.events||[];
 return '<div class=card><div class=lbl>Events</div><br>'
 +'<div class=lbl>Market gap</div><div class=big style="font-size:22px;margin-bottom:14px">'+fmt(db.gap||0)+'</div>'
 +'<div class=row><input id=em type=number min=0.1 max=99 step=0.1 placeholder="Market %"><button data-a=evMarket data-sign=-1>Market Crash</button><button class=primary data-a=evMarket data-sign=1>Market Boost</button></div><br>'
 +'<div class=row><input id=rc type=number min=1 step=1 placeholder="How many companies"><input id=er type=number min=0.1 max=99 step=0.1 placeholder="Drop %"><button data-a=evRandom>Random Drop</button></div><br>'
 +'<div class=row><input id=tr type=number min=0.1 max=99 step=0.1 placeholder="Tax %"><button class=primary data-a=runTax>Tax Season!</button></div><br>'
 +'<div class=row><button data-a=runScandal>Political Scandal</button><span class=lbl style="flex:2 1 200px">Every investor pulls out half of their holdings into cash.</span></div>'
 +'<br><div class=lbl>History</div>'+(ev.map(function(e){return '<div style="padding:6px 0;border-bottom:1px solid var(--line)"><span class=lbl>'+new Date(e.t).toLocaleString()+'</span> &nbsp;'+esc(e.name)+' — '+esc(e.detail)+'</div>'}).join('')||'<div class=lbl style="padding:8px 0">No events yet</div>')+'</div>'}
function adHl(){return '<div class=card><div class=lbl>Publish headline</div><br><input id=ht placeholder="Headline" maxlength=280><br><br><div class=row>'
 +'<select id=hc><option>Markets</option><option>Corporate</option><option>Economy</option><option>Policy</option><option>Major event</option></select>'
 +'<select id=hk><option value="">No ticker</option>'+db.companies.map(function(c){return '<option>'+esc(c.ticker)+'</option>'}).join('')+'</select>'
 +'<label class=lbl style="flex:0 0 auto;display:flex;gap:6px;align-items:center"><input type=checkbox id=hb style="width:auto"> BREAKING</label>'
 +'<button class=primary data-a=pubHl>Publish</button></div></div>'
 +'<div class=card><table><tr><th>Headline</th><th class=m>Category</th><th class=m>Ticker</th><th></th></tr>'
 +(db.headlines.map(function(h){return '<tr><td style="white-space:normal">'+(h.brk?'<span class="tag brk">BREAKING</span> ':'')+esc(h.text)+'</td><td class=m>'+esc(h.cat)+'</td><td class=m>'+esc(h.ticker||'—')+'</td><td><button data-a=edHl data-id="'+h.id+'">Edit</button> <button class=danger data-a=delHl data-id="'+h.id+'">Delete</button></td></tr>'}).join('')||'<tr><td colspan=4 class=lbl>No headlines</td></tr>')+'</table></div>'}
function adAcc(){var A=AD.accounts;return '<div class=lbl style="text-transform:none">'+A.length+' account'+(A.length===1?'':'s')+' opened · each starts with $5,000</div><br><table><tr><th>Account</th><th>Cash</th><th class=m>Equity</th><th class=m>Positions</th><th class=m>Opened</th></tr>'
 +(A.map(function(a){return '<tr><td>@'+esc(a.screen_name)+' <span class=lbl style="text-transform:none">'+esc(a.name)+'</span></td><td>'+fmt(a.cash)+'</td><td class=m>'+fmt(a.equity)+'</td><td class=m>'+a.positions+'</td><td class=m>'+new Date(a.created).toLocaleDateString()+'</td></tr>'}).join('')||'<tr><td colspan=5 class=lbl>No accounts yet</td></tr>')+'</table>'}
function adLog(){return (AD.logs.map(function(e){return '<div style="padding:6px 0;border-bottom:1px solid var(--line)"><span class=lbl>'+new Date(e.t).toLocaleString()+'</span> &nbsp; '+esc(e.a)+'</div>'}).join('')||'<p class=lbl>No activity yet.</p>')}
var V=function(s){var e=$(s);return e?e.value:''};
var ADMIN={
 list:function(){var name=V('#cn').trim(),tk=V('#ct').trim().toUpperCase(),price=+V('#cp'),sh=+V('#cs');
  if(!name||!tk||!(price>0)||!(sh>0))return alert('Enter name, ticker, price and shares');
  if(db.companies.some(function(c){return c.ticker===tk}))return alert('Ticker already listed');
  readFile($('#cl')).then(function(logo){return act('list',{name:name,ticker:tk,price:price,shares:sh,logo:logo})},function(e){alert(e.message)})},
 edCo:function(id){EDIT=id;render();window.scrollTo(0,0)},
 cancelEdit:function(){EDIT=null;render()},
 saveEdit:function(){var c=C(EDIT);if(!c)return;var n=V('#en').trim(),T=V('#et').trim().toUpperCase(),s=+V('#es');
  if(!n||!T||!(s>0))return alert('Name, ticker and shares are required');
  if(db.companies.some(function(x){return x!==c&&x.ticker===T}))return alert('Ticker in use');
  readFile($('#el')).then(function(logo){return act('edit',{id:c.id,name:n,ticker:T,shares:s,logo:logo}).then(function(){EDIT=null;render()})},function(e){alert(e.message)})},
 clearLogo:function(id){act('clearLogo',{id:id})},
 suspend:function(id){act('suspend',{id:id})},
 remove:function(id){var c=C(id);act('remove',{id:id},'Delete '+c.ticker+'? Everyone\'s shares in it go with it.')},
 mkt:function(_,el){var p=Math.abs(+V('#mp'))*(+el.getAttribute('data-sign'));if(!p)return alert('Enter a percentage');act('market',{pct:p},(p>0?'Boost':'Crash')+' all listed companies by '+Math.abs(p)+'%?')},
 coPct:function(_,el){var p=+V('#cgp');if(!V('#cg'))return alert('No company');if(!(p>0))return alert('Enter a percentage');act('companyPct',{id:V('#cg'),pct:p,dir:+el.getAttribute('data-dir')})},
 setExact:function(){var p=+V('#sp');if(!V('#sg'))return alert('No company');if(!(p>0))return alert('Enter a price');act('setPrice',{id:V('#sg'),price:p})},
 adjust:function(){var a=+V('#ad');if(!V('#ag'))return alert('No company');if(!a)return alert('Enter an amount');act('adjust',{id:V('#ag'),amount:a})},
 evMarket:function(_,el){var sign=+el.getAttribute('data-sign'),p=+V('#em');if(!(p>0))return alert('Enter a percentage');act('eventMarket',{pct:p,sign:sign},(sign<0?'Market crash':'Market boost')+' of '+p+'% on all listed companies?')},
 evRandom:function(){var p=+V('#er'),n=+V('#rc'),L=db.companies.filter(function(c){return !c.suspended});if(!(p>0))return alert('Enter a percentage');if(!(n>0)||!L.length)return alert('Enter how many companies, and make sure some are listed');var k=Math.min(n,L.length);act('randomDrop',{pct:p,count:n},'Drop '+k+' random compan'+(k>1?'ies':'y')+' by '+p+'%?')},
 runTax:function(){var r=+V('#tr');if(!(r>0&&r<100))return alert('Enter a tax rate between 0 and 100');act('tax',{rate:r},'Tax '+r+'% of every account\'s holdings and send it to the market gap?')},
 runScandal:function(){act('scandal',{},'Political Scandal: every investor pulls out half of their holdings into cash?')},
 pubHl:function(){var text=V('#ht').trim();if(!text)return alert('Enter a headline');act('headline',{text:text,cat:V('#hc'),ticker:V('#hk'),breaking:$('#hb').checked})},
 edHl:function(id){var h=db.headlines.find(function(x){return x.id===id});var t=prompt('Edit headline',h.text);if(t===null)return;var b=confirm('Mark as BREAKING? OK = yes, Cancel = no');act('editHeadline',{id:id,text:t.trim()||h.text,breaking:b})},
 delHl:function(id){act('deleteHeadline',{id:id},'Delete this headline?')}
};

/* ---------- ROUTER ---------- */
var TABS=[['dash','Dashboard'],['list','Markets']].concat(db.me?[['acct','Account']]:[]).concat(db.admin?[['admin','Admin']]:[]);
function render(){
 var title=S.page==='co'&&C(S.cid)?C(S.cid).ticker:'Markets';
 var bar='<div class=bar>'+(S.page==='co'?'<a class=back href="?" data-go="list" aria-label="Back">←</a>':(!framed?'<a class=back href="/home" aria-label="'+esc(db.instance)+'">←</a>':''))+'<div><h1>'+esc(title)+'</h1>'+(S.page==='co'&&C(S.cid)?'<div class=sub>'+esc(C(S.cid).name)+'</div>':'<div class=sub>TradeX'+(db.me?' · '+fmt(db.me.cash)+' cash':'')+'</div>')+'</div></div>';
 var nav='<nav class=tabs>'+TABS.map(function(t){return '<a href="#" data-go="'+t[0]+'" class="'+(S.page===t[0]||(t[0]==='list'&&S.page==='co')?'on':'')+'">'+t[1]+'</a>'}).join('')+'</nav>';
 var body={dash:dash,list:list,co:coPage,acct:acct,admin:adminPage}[S.page]();
 var y=window.scrollY;
 $('#app').innerHTML=bar+nav+body;
 window.scrollTo(0,y);
 document.title=(S.page==='co'&&C(S.cid)?C(S.cid).ticker+' · '+C(S.cid).name:'Markets')+' · '+db.instance;
}
document.addEventListener('click',function(e){
 var t=e.target.closest('[data-go],[data-pick],[data-ir],[data-range],[data-trade],[data-a]');if(!t)return;
 if(t.hasAttribute('data-go')){e.preventDefault();var g=t.getAttribute('data-go');go(g,t.getAttribute('data-id')||undefined);return}
 if(t.hasAttribute('data-pick')){var id=t.getAttribute('data-pick');S.dc=S.dc===id?null:id;render();return}
 if(t.hasAttribute('data-ir')){S.ir=+t.getAttribute('data-ir');render();return}
 if(t.hasAttribute('data-range')){S.range=+t.getAttribute('data-range');render();return}
 if(t.hasAttribute('data-trade')){trade(t.getAttribute('data-trade'));return}
 var f=ADMIN[t.getAttribute('data-a')];if(f)f(t.getAttribute('data-id'),t);
});
document.addEventListener('toggle',function(e){var d=e.target;if(d.getAttribute&&d.getAttribute('data-d')==='acc')S.openAcc=d.open;if(d.getAttribute&&d.getAttribute('data-d')==='log')S.openLog=d.open},true);
document.addEventListener('keydown',function(e){if(e.key==='Enter'&&e.target.id==='qty'){e.preventDefault();trade('buy')}});
render();
// the market moves every two seconds on the server; the page follows it
var busy=false;
setInterval(function(){
 if(busy||document.hidden)return;busy=true;
 api('state').then(function(st){
  db=st;busy=false;
  if(S.page==='dash'||S.page==='list'||S.page==='acct')render();else if(S.page==='co')updateLive();
 },function(){busy=false});
},2000);
})();
