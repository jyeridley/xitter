/*---STYLE---*/
:root{--bg:#000;--card:#16181c;--card2:#202327;--line:#2f3336;--txt:#e7e9ea;--mut:#71767b;--hover:rgba(231,233,234,.06);--up:#00ba7c;--dn:#f4212e;--upbg:rgba(0,186,124,.14);--dnbg:rgba(244,33,46,.14);--accent:#1d9bf0;--btn:#eff3f4;--btntxt:#0f1419;--field:#000;color-scheme:dark}
html[data-theme=dim]{--bg:#15202b;--card:#1e2732;--card2:#273340;--line:#38444d;--txt:#f7f9f9;--mut:#8b98a5;--hover:rgba(247,249,249,.06);--field:#15202b}
html[data-theme=light]{--bg:#fff;--card:#f7f9f9;--card2:#eff3f4;--line:#eff3f4;--txt:#0f1419;--mut:#536471;--hover:rgba(15,20,25,.04);--upbg:rgba(0,186,124,.1);--dnbg:rgba(244,33,46,.08);--btn:#0f1419;--btntxt:#fff;--field:#fff;color-scheme:light}
html[data-theme=light] .card,html[data-theme=light] .tile{border-color:#e6ecf0}
*{box-sizing:border-box}
html,body{margin:0;background:var(--bg);color:var(--txt);font:15px/1.35 TwitterChirp,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased}
a{color:var(--accent);text-decoration:none}a:hover{text-decoration:underline}
.num{font-variant-numeric:tabular-nums}
.bar{position:sticky;top:0;z-index:6;background:color-mix(in srgb,var(--bg) 85%,transparent);-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);display:flex;align-items:center;gap:16px;padding:0 16px;height:53px}
.bar[hidden]{display:none}
.bar h1{font-size:20px;font-weight:800;margin:0;letter-spacing:-.01em;line-height:24px}
.bar .sub{color:var(--mut);font-size:13px;display:flex;align-items:center;gap:4px}
.bar .grow{flex:1}
.iconbtn{display:inline-flex;width:34px;height:34px;align-items:center;justify-content:center;border-radius:50%;color:var(--txt);margin-left:-8px;cursor:pointer;border:0;background:none;padding:0;min-height:0}
.iconbtn:hover{background:var(--hover);text-decoration:none}
.iconbtn svg{width:20px;height:20px;fill:currentColor}
.coin{display:inline-flex;width:1em;height:1em;vertical-align:-.12em;margin-right:3px}
.coin svg{width:100%;height:100%;fill:currentColor}
nav.tabs{display:flex;border-bottom:1px solid var(--line);overflow-x:auto;scrollbar-width:none}
nav.tabs::-webkit-scrollbar{display:none}
nav.tabs a{flex:1 0 auto;text-align:center;color:var(--mut);font-weight:500;padding:0 16px;height:53px;display:flex;align-items:center;justify-content:center;position:relative;text-decoration:none;white-space:nowrap}
nav.tabs a:hover{background:var(--hover)}
nav.tabs a.on{color:var(--txt);font-weight:700}
nav.tabs a.on::after{content:"";position:absolute;bottom:0;left:50%;transform:translateX(-50%);min-width:56px;width:calc(100% - 32px);max-width:80px;height:4px;border-radius:2px;background:var(--accent)}
button{background:none;border:1px solid var(--line);color:var(--txt);padding:0 16px;border-radius:9999px;cursor:pointer;font:inherit;font-size:14px;font-weight:700;min-height:36px;white-space:nowrap;transition:background .15s}
button:hover{background:var(--hover)}
button:disabled{opacity:.5;cursor:default}
button.primary{background:var(--btn);color:var(--btntxt);border-color:var(--btn)}
button.primary:hover{filter:brightness(.92)}
button.accent{background:var(--accent);color:#fff;border-color:var(--accent)}
button.buy{background:var(--up);border-color:var(--up);color:#fff}
button.sell{background:var(--dn);border-color:var(--dn);color:#fff}
button.danger{color:var(--dn);border-color:color-mix(in srgb,var(--dn) 45%,transparent)}
button.small{min-height:30px;padding:0 12px;font-size:13px}
button.big{min-height:44px;font-size:15px;width:100%}
input,select,textarea{background:var(--field);border:1px solid var(--line);color:var(--txt);padding:10px 12px;border-radius:8px;font:inherit;width:100%;min-height:44px}
html[data-theme=light] input,html[data-theme=light] select,html[data-theme=light] textarea{border-color:#cfd9de}
textarea{resize:vertical;min-height:72px}
input:focus,select:focus,textarea:focus{outline:0;border-color:var(--accent);box-shadow:0 0 0 1px var(--accent)}
label.f{display:block;margin-bottom:14px}
label.f>span{display:flex;justify-content:space-between;font-size:13px;color:var(--mut);margin-bottom:6px}
main{padding:12px 16px 24px;max-width:1280px;margin:auto}
.news{display:flex;gap:10px;align-items:center;padding:10px 16px;border-bottom:1px solid var(--line);font-size:13px;overflow:hidden;white-space:nowrap;-webkit-mask:linear-gradient(90deg,#000 85%,transparent);mask:linear-gradient(90deg,#000 85%,transparent)}
.news .track{display:flex;gap:10px;align-items:center;overflow-x:auto;scrollbar-width:none}
.news .track::-webkit-scrollbar{display:none}
.tag{display:inline-block;background:var(--card2);color:var(--txt);font-weight:700;padding:3px 8px;border-radius:6px;font-size:11px;letter-spacing:.02em}
.tag.brk{background:var(--dn);color:#fff}
.tag.live{background:var(--accent);color:#fff}
.dot{color:var(--mut)}
.grid{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(240px,1fr))}
.card{border:1px solid var(--line);background:var(--bg);border-radius:16px;padding:16px;margin-bottom:12px;overflow:hidden}
.tile{background:var(--card);border-radius:16px;padding:16px;border:1px solid transparent;overflow:hidden;min-width:0}
.lbl{color:var(--mut);font-size:13px}
.cap{color:var(--mut);font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.06em}
.h2{font-size:20px;font-weight:800;margin:0 0 4px;letter-spacing:-.01em}
.big{font-size:32px;font-weight:800;letter-spacing:-.02em;font-variant-numeric:tabular-nums;line-height:1.15}
.mid{font-size:22px;font-weight:800;letter-spacing:-.01em;font-variant-numeric:tabular-nums}
.up{color:var(--up)}.dn{color:var(--dn)}
.pill{display:inline-flex;align-items:center;gap:3px;padding:3px 8px;border-radius:999px;font-size:13px;font-weight:700;font-variant-numeric:tabular-nums;white-space:nowrap}
.pill.up{background:var(--upbg);color:var(--up)}.pill.dn{background:var(--dnbg);color:var(--dn)}
.pill svg{width:10px;height:10px;fill:currentColor}
.row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.row>*{flex:1 1 140px}
.between{display:flex;justify-content:space-between;align-items:center;gap:12px}
.logo-img{width:40px;height:40px;border-radius:10px;object-fit:cover;background:var(--card2);display:inline-flex;align-items:center;justify-content:center;color:var(--mut);font-size:11px;font-weight:800;flex:0 0 auto;letter-spacing:.02em}
.logo-img.lg{width:56px;height:56px;border-radius:14px;font-size:14px}
.logo-img.sm{width:28px;height:28px;border-radius:8px;font-size:9px}
.seg{display:inline-flex;background:var(--card2);border-radius:999px;padding:3px;flex:0 0 auto}
.seg button{border:0;background:none;color:var(--mut);padding:0 12px;border-radius:999px;min-height:30px;font-weight:700;font-size:13px}
.seg button.on{background:var(--bg);color:var(--txt);box-shadow:0 1px 2px rgba(0,0,0,.2)}
.list{display:flex;flex-direction:column}
.item{display:flex;align-items:center;gap:12px;padding:12px 16px;cursor:pointer;border-bottom:1px solid var(--line);transition:background .15s;min-width:0}
.item:hover{background:var(--hover)}
.item:last-child{border-bottom:0}
.item .who{flex:1;min-width:0}
.item .t1{font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.item .t2{color:var(--mut);font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.item .px{text-align:right;flex:0 0 auto}
.item .px .t1{font-variant-numeric:tabular-nums}
.panel{border:1px solid var(--line);border-radius:16px;overflow:hidden;margin-bottom:12px}
.panel>.hd{padding:14px 16px 10px;display:flex;justify-content:space-between;align-items:center;gap:8px}
.panel>.hd h3{margin:0;font-size:17px;font-weight:800}
.spark{width:72px;height:28px;flex:0 0 auto}
.chart{position:relative;cursor:crosshair;touch-action:pan-y}
.chart svg{width:100%;display:block}
.xh{display:none;position:absolute;top:0;bottom:0;width:1px;background:var(--mut);opacity:.6;pointer-events:none}
.tip{display:none;position:absolute;top:4px;background:var(--txt);color:var(--bg);padding:4px 8px;border-radius:6px;font-size:12px;font-weight:700;pointer-events:none;white-space:nowrap;transform:translateX(-50%)}
.pulse{display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--up);margin-right:6px;vertical-align:middle;animation:pl 1.4s infinite}@keyframes pl{0%,100%{opacity:1}50%{opacity:.25}}
.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:var(--line);border-top:1px solid var(--line)}
.stats>div{background:var(--bg);padding:12px 16px;min-width:0}
.stats b{display:block;font-size:15px;font-variant-numeric:tabular-nums;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.empty{text-align:center;padding:44px 24px}
.empty h2{font-size:26px;font-weight:800;margin:0 0 8px;letter-spacing:-.02em}
.empty p{color:var(--mut);margin:0 auto 20px;max-width:400px}
.note{color:var(--mut);font-size:14px}
.banner{display:flex;gap:12px;align-items:center;padding:12px 16px;border-radius:12px;background:color-mix(in srgb,var(--accent) 12%,transparent);color:var(--txt);font-size:14px;margin-bottom:12px}
.banner b{font-weight:700}
.ticket .side{display:grid;grid-template-columns:1fr 1fr;background:var(--card2);border-radius:999px;padding:3px;margin-bottom:14px}
.ticket .side button{border:0;min-height:34px;color:var(--mut)}
.ticket .side button.on.b{background:var(--up);color:#fff}
.ticket .side button.on.s{background:var(--dn);color:#fff}
.qty{display:flex;align-items:center;gap:8px}
.qty input{text-align:center;font-size:18px;font-weight:700;font-variant-numeric:tabular-nums}
.qty button{width:44px;height:44px;padding:0;flex:0 0 44px;font-size:20px;line-height:1}
.presets{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin:10px 0 14px}
.presets button{min-height:30px;font-size:13px;padding:0}
.sum{display:flex;justify-content:space-between;font-size:14px;padding:4px 0;color:var(--mut)}
.sum b{color:var(--txt);font-variant-numeric:tabular-nums}
.founder{display:inline-flex;align-items:center;gap:6px;color:var(--txt);font-size:14px}
.founder img{width:20px;height:20px;border-radius:50%}
.founder.sq img{border-radius:4px}
.badge{width:16px;height:16px;flex:0 0 auto;vertical-align:-3px}
.dlg{max-width:560px;margin:0 auto}
.preview{display:flex;gap:12px;align-items:center;padding:12px;border:1px dashed var(--line);border-radius:12px;margin-bottom:14px}
.err{color:var(--dn);font-size:14px;min-height:20px;margin-bottom:6px}
#toast{position:absolute;left:50%;transform:translateX(-50%);background:var(--accent);color:#fff;padding:12px 18px;border-radius:8px;font-size:15px;font-weight:600;z-index:50;box-shadow:0 4px 16px rgba(0,0,0,.25);max-width:90%;text-align:center;transition:opacity .2s}
#toast.bad{background:var(--dn)}
table{width:100%;border-collapse:collapse;font-variant-numeric:tabular-nums;font-size:14px}
td,th{padding:10px 8px;border-bottom:1px solid var(--line);text-align:right;white-space:nowrap}
td:first-child,th:first-child{text-align:left}
th{color:var(--mut);font-weight:600;font-size:12px}
details.card summary{list-style:none;cursor:pointer;font-weight:800;font-size:17px}details.card summary::-webkit-details-marker{display:none}
.ad h3{margin:0 0 12px;font-size:17px;font-weight:800}
.ad .row{margin-bottom:8px}
.search{position:relative;margin-bottom:12px}
.search input{border-radius:999px;padding-left:40px;background:var(--card);border-color:transparent}
.search svg{position:absolute;left:14px;top:13px;width:18px;height:18px;fill:var(--mut)}
@media(max-width:700px){.stats{grid-template-columns:repeat(2,1fr)}.m{display:none}main{padding:10px 12px 20px}.big{font-size:28px}.spark{width:56px}.item{padding:12px}}
/*---SCRIPT---*/
(function(){
var B=window.TRADEX,CSRF=B.csrf,COIN=B.coin;
var db=B.state;
var framed=window.top!==window;
var $=function(s){return document.querySelector(s)};
var esc=function(s){return String(s==null?'':s).replace(/[&<>"']/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]})};
var fmt=function(n){return '$'+Number(n).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})};
var big=function(n){return n>=1e12?'$'+(n/1e12).toFixed(2)+'T':n>=1e9?'$'+(n/1e9).toFixed(2)+'B':n>=1e6?'$'+(n/1e6).toFixed(2)+'M':fmt(n)};
var pct=function(a,b){return b?(a-b)/b*100:0};
var sg=function(x){return (x>=0?'+':'')+x.toFixed(2)+'%'};
var chg=function(c){return pct(c.price,c.prevClose)};
var qn=function(q){return Number(q).toLocaleString('en-US',{maximumFractionDigits:4})};
var coin='<span class=coin title="Equicoins"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="'+COIN+'"/></svg></span>';
var eq=function(n){return coin+fmt(n)};
var C=function(id){return db.companies.find(function(x){return x.id===id})};
var CT=function(t){return db.companies.find(function(x){return x.ticker===String(t||'').toUpperCase()})};
var Q=new URLSearchParams(location.search);
var PAGES=['list','acct','admin','new','edit'];
var S={page:Q.get('c')&&Q.get('p')!=='edit'?'co':(PAGES.indexOf(Q.get('p'))>=0?Q.get('p'):'dash'),cid:null,range:60,ir:150,side:'buy',q:'',find:''};
if(Q.get('c')){var c0=CT(Q.get('c'));S.cid=c0?c0.id:null}
var AD=null,EDIT=null,BUSY=false;

/* ---------- the client's theme and colour ---------- */
function theme(){
 var t='dark',accent=null;
 try{
  if(framed){var pb=getComputedStyle(parent.document.body).backgroundColor;t=/255, 255, 255/.test(pb)?'light':/21, 32, 43/.test(pb)?'dim':'dark';
   var post=parent.document.querySelector('a[data-testid="SideNav_NewTweet_Button"],[data-testid="FloatingActionButtons_Tweet_Button"] a,a[href="/compose/post"]');if(post){var bg=getComputedStyle(post).backgroundColor;if(bg&&!/rgba\(0, 0, 0, 0\)|transparent|rgb\(239, 243, 244\)|rgb\(15, 20, 25\)/.test(bg))accent=bg}}
  else if(window.matchMedia&&matchMedia('(prefers-color-scheme: light)').matches)t='light';
 }catch(e){}
 document.documentElement.setAttribute('data-theme',t);
 if(accent)document.documentElement.style.setProperty('--accent',accent);
}
theme();setInterval(theme,3000);

function api(path,body){
 return fetch('/i/markets/api/'+path,body===undefined?{credentials:'same-origin'}:{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json','x-csrf-token':CSRF||''},body:JSON.stringify(body)})
  .then(function(r){return r.json().catch(function(){return {error:'Something went wrong'}}).then(function(j){if(!r.ok)throw new Error(j.error||(j.errors&&j.errors[0]&&j.errors[0].message)||'Something went wrong');return j})});
}
function go(p,x){
 var q=new URLSearchParams();
 if(Q.has('embed'))q.set('embed',Q.get('embed'));
 if(p==='co'||p==='edit'){var c=C(x);q.set('c',c?c.ticker:x)}
 if(p!=='dash'&&p!=='co')q.set('p',p);
 var s=q.toString();location.assign(location.pathname+(s?'?'+s:''));
}
// links to the client's own pages move the client, not the frame
function client(path){try{if(framed&&parent.__xitterGo){parent.__xitterGo(path);return}}catch(e){}top.location.assign(path)}
var toastT;
function toast(msg,bad){
 var t=$('#toast');if(!t){t=document.createElement('div');t.id='toast';document.body.appendChild(t)}
 t.textContent=msg;t.className=bad?'bad':'';t.style.opacity=1;
 var top=window.scrollY+window.innerHeight-90;
 try{if(framed){var r=frameElement.getBoundingClientRect();top=Math.max(0,-r.top)+parent.innerHeight-Math.max(0,r.top)-90-(parent.innerWidth<700?60:0)}}catch(e){}
 t.style.top=Math.max(10,Math.min(top,document.body.scrollHeight-60))+'px';
 clearTimeout(toastT);toastT=setTimeout(function(){t.style.opacity=0},2600);
}
function viewTop(){try{if(framed){var r=frameElement.getBoundingClientRect();if(r.top<0)parent.scrollBy(0,r.top)}}catch(e){}window.scrollTo(0,0)}

/* ---------- PIECES ---------- */
var CHECK='M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.66-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.33 2.19c-1.4-.46-2.91-.2-3.92.81s-1.26 2.52-.8 3.91c-1.31.67-2.2 1.91-2.2 3.34s.89 2.67 2.2 3.34c-.46 1.39-.21 2.9.8 3.91s2.52 1.26 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.68-.88 3.34-2.19c1.39.45 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34zm-11.71 4.2L6.8 12.46l1.41-1.42 2.26 2.26 4.8-5.23 1.47 1.36-6.2 6.77z';
function badge(t){if(!t)return '';var col=t==='blue'?'#1d9bf0':t==='business'?'#e2b719':'#829aab';return '<svg class=badge viewBox="0 0 24 24" aria-label="Verified"><path fill="'+col+'" d="'+CHECK+'"/></svg>'}
var ARROW_UP='<svg viewBox="0 0 10 10"><path d="M5 1l4 6H1z"/></svg>',ARROW_DN='<svg viewBox="0 0 10 10"><path d="M5 9L1 3h8z"/></svg>';
var pill=function(x){return '<span class="pill '+(x>=0?'up':'dn')+'">'+(x>=0?ARROW_UP:ARROW_DN)+Math.abs(x).toFixed(2)+'%</span>'};
var logo=function(c,cls){return c.logo?'<img class="logo-img '+(cls||'')+'" src="'+esc(c.logo)+'" alt="">':'<span class="logo-img '+(cls||'')+'">'+esc(c.ticker.slice(0,4))+'</span>'};
function founder(o){if(!o)return '';return '<a class="founder'+(o.badge==='business'?' sq':'')+'" href="/'+esc(o.handle)+'" data-client="/'+esc(o.handle)+'"><img src="'+esc(o.avatar)+'" alt=""><b>'+esc(o.name)+'</b>'+badge(o.badge)+'<span class=lbl>@'+esc(o.handle)+'</span></a>'}
function headlines(){
 if(!db.headlines.length)return '';
 return '<div class=news><span class="tag live">MARKET HEADLINES</span><div class=track>'+db.headlines.map(function(h){return (h.brk?'<span class="tag brk">BREAKING</span>':'')+'<span class=lbl>'+esc(h.cat)+'</span><span>'+(h.ticker?'<b>'+esc(h.ticker)+'</b> ':'')+esc(h.text)+'</span>'}).join('<span class=dot>·</span>')+'</div></div>'}
var CH={};
function path(v,W,H,pad){var mn=Math.min.apply(null,v),mx=Math.max.apply(null,v),r=(mx-mn)||1;return v.map(function(y,i){return (i/(v.length-1)*W).toFixed(1)+','+(H-pad-(y-mn)/r*(H-2*pad)).toFixed(1)}).join(' ')}
function chart(h,key,H,colOverride){
 H=H||220;
 if(h.length<2)return '<div class=lbl style="padding:40px 16px;text-align:center">Collecting live prices…</div>';
 var v=h.map(function(x){return x[1]}),up=v[v.length-1]>=v[0],col=colOverride||(up?'var(--up)':'var(--dn)'),W=600,line=path(v,W,H,10),id='g'+key;
 CH[key]=h;
 return '<div class=chart data-hov="'+key+'"><svg viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="none" style="height:'+H+'px"><defs><linearGradient id="'+id+'" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="'+col+'" stop-opacity=".28"/><stop offset="1" stop-color="'+col+'" stop-opacity="0"/></linearGradient></defs><polygon points="0,'+H+' '+line+' '+W+','+H+'" fill="url(#'+id+')"/><polyline fill="none" stroke="'+col+'" stroke-width="2.25" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke" points="'+line+'"/></svg><div class=xh></div><div class=tip></div></div>'}
function hov(e,el){var d=CH[el.getAttribute('data-hov')];if(!d||!d.length)return;var r=el.getBoundingClientRect(),x=(e.touches?e.touches[0].clientX:e.clientX),f=Math.min(1,Math.max(0,(x-r.left)/r.width));var p=d[Math.round(f*(d.length-1))],xh=el.querySelector('.xh'),tip=el.querySelector('.tip');xh.style.display='block';xh.style.left=(f*100)+'%';tip.style.display='block';tip.style.left=Math.min(Math.max(f*100,12),88)+'%';tip.textContent=fmt(p[1])+' · '+new Date(p[0]).toLocaleTimeString([], {hour:'numeric',minute:'2-digit',second:'2-digit'})}
function unhov(el){el.querySelector('.xh').style.display='none';el.querySelector('.tip').style.display='none'}
['mousemove','touchmove'].forEach(function(ev){document.addEventListener(ev,function(e){var el=e.target.closest&&e.target.closest('[data-hov]');document.querySelectorAll('[data-hov]').forEach(function(x){if(x!==el)unhov(x)});if(el)hov(e,el)},{passive:true})});
document.addEventListener('mouseleave',function(){document.querySelectorAll('[data-hov]').forEach(unhov)});
function spark(c){var h=c.hist.slice(-30);if(h.length<2)return '<span class=spark></span>';var v=h.map(function(x){return x[1]}),col=v[v.length-1]>=v[0]?'var(--up)':'var(--dn)';return '<svg class=spark viewBox="0 0 72 28" preserveAspectRatio="none"><polyline fill="none" stroke="'+col+'" stroke-width="1.75" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke" points="'+path(v,72,28,3)+'"/></svg>'}
function item(c,right){return '<div class=item data-go="co" data-id="'+c.id+'">'+logo(c)+'<div class=who><div class=t1>'+esc(c.name)+'</div><div class=t2>'+esc(c.ticker)+(c.sector?' · '+esc(c.sector):'')+(c.suspended?' · Suspended':'')+'</div></div>'+spark(c)+'<div class=px>'+(right||('<div class="t1 num">'+fmt(c.price)+'</div>'+pill(chg(c))))+'</div></div>'}
function listCta(){
 if(!db.me)return '';
 if(db.me.canList)return '<div class="tile between" style="margin-bottom:12px"><div><div style="font-weight:800">List your company</div><div class=lbl>'+(db.admin?'Staff can list any number of companies.':'Accounts with a blue or gold checkmark can list up to '+db.me.ownMax+' companies ('+db.me.owned+' listed).')+'</div></div><button class=primary data-go="new" style="flex:0 0 auto">List a company</button></div>';
 return '';
}
function emptyMarket(){return '<div class="card empty"><h2>No companies yet</h2><p>Nothing is listed on the market yet. Staff, and accounts with a blue or gold checkmark, can list a company'+(db.me&&db.me.canList?' right now.':'.')+'</p>'+(db.me&&db.me.canList?'<button class=primary data-go="new">List a company</button>':'')+'</div>'}
function moneyBanner(){
 if(!db.money.on)return '<div class=banner><span class=coin style="font-size:20px;flex:0 0 auto">'+coin+'</span><div><b>Trading opens when Equicoins is turned on.</b> '+(db.admin?'Turn on Equicoins under Admin › Features, and every account trades with its own balance.':'Prices are live, but buying and selling waits for '+esc(db.money.name)+'.')+'</div></div>';
 return '';
}

/* ---------- PAGES ---------- */
function dash(){
 var all=db.companies,L=all.filter(function(c){return !c.suspended});
 if(!all.length)return headlines()+'<main>'+moneyBanner()+emptyMarket()+'</main>';
 var mc=all.reduce(function(s,c){return s+c.price*c.shares},0),base=all.reduce(function(s,c){return s+c.prevClose*c.shares},0),perf=pct(mc,base);
 var G=L.slice().sort(function(a,b){return chg(b)-chg(a)}).filter(function(c){return chg(c)>=0}),D=L.slice().sort(function(a,b){return chg(a)-chg(b)}).filter(function(c){return chg(c)<0}),V=L.slice().sort(function(a,b){return b.volume-a.volume}),R=all.slice().sort(function(a,b){return b.listed-a.listed});
 var ix=db.index.slice(-S.ir),first=ix.length?ix[0][1]:mc,last=ix.length?ix[ix.length-1][1]:mc,d=last-first;
 var hero='<div class=tile style="padding:16px 0 0;margin-bottom:12px"><div class=between style="padding:0 16px;align-items:flex-start"><div><div class=lbl>Total market cap</div><div class=big>'+big(mc)+'</div><div class=row style="gap:8px;margin-top:6px"><span class="num '+(d>=0?'up':'dn')+'" style="flex:0 0 auto;font-weight:700">'+(d>=0?'+':'−')+fmt(Math.abs(d))+'</span><span style="flex:0 0 auto">'+pill(pct(last,first))+'</span></div></div><div class=seg>'+[[30,'1M'],[150,'5M'],[300,'All']].map(function(a){return '<button class="'+(S.ir===a[0]?'on':'')+'" data-ir="'+a[0]+'">'+a[1]+'</button>'}).join('')+'</div></div><div style="margin-top:8px">'+chart(ix,'ix',180)+'</div></div>';
 var mine='';
 if(db.me&&db.me.cash!=null){var hv=holdingsValue();mine='<div class=tile data-go="acct" style="cursor:pointer;grid-column:1/-1"><div class=lbl>Your portfolio</div><div class=mid style="margin-top:4px">'+eq(db.me.cash+hv)+'</div><div class=lbl style="margin-top:4px">'+fmt(db.me.cash)+' Equicoins · '+fmt(hv)+' in shares</div></div>'}
 var panel=function(t,arr){return '<div class=panel><div class=hd><h3>'+t+'</h3></div><div class=list>'+(arr.slice(0,5).map(function(c){return item(c)}).join('')||'<div class=lbl style="padding:0 16px 16px">None right now</div>')+'</div></div>'};
 return headlines()+'<main>'+moneyBanner()+hero
 +'<div class=grid style="margin-bottom:12px;grid-template-columns:repeat(auto-fit,minmax(150px,1fr))">'
 +'<div class=tile><div class=lbl>Market performance</div><div class="mid '+(perf>=0?'up':'dn')+'" style="margin-top:4px">'+sg(perf)+'</div><div class=lbl style="margin-top:4px">vs. previous close</div></div>'
 +'<div class=tile><div class=lbl>Listed companies</div><div class=mid style="margin-top:4px">'+all.length+'</div><div class=lbl style="margin-top:4px">'+L.length+' active · '+(all.length-L.length)+' suspended</div></div>'
 +mine+'</div>'+listCta()
 +'<div class=grid style="grid-template-columns:repeat(auto-fit,minmax(300px,1fr));align-items:start">'+panel('Top gainers',G)+panel('Top decliners',D)+panel('Most active',V)+panel('Recently listed',R)+'</div></main>'}
function list(){
 if(!db.companies.length)return '<main>'+moneyBanner()+emptyMarket()+'</main>';
 var f=S.find.trim().toLowerCase();
 var rows=db.companies.filter(function(c){return !f||c.ticker.toLowerCase().indexOf(f)>=0||c.name.toLowerCase().indexOf(f)>=0||(c.sector||'').toLowerCase().indexOf(f)>=0});
 return '<main>'+listCta()+'<div class=search><svg viewBox="0 0 24 24"><path d="M10.25 3.75c-3.59 0-6.5 2.91-6.5 6.5s2.91 6.5 6.5 6.5c1.795 0 3.419-.726 4.596-1.904 1.178-1.177 1.904-2.801 1.904-4.596 0-3.59-2.91-6.5-6.5-6.5zm-8.5 6.5c0-4.694 3.806-8.5 8.5-8.5s8.5 3.806 8.5 8.5c0 1.986-.682 3.815-1.824 5.262l4.781 4.781-1.414 1.414-4.781-4.781c-1.447 1.142-3.276 1.824-5.262 1.824-4.694 0-8.5-3.806-8.5-8.5z"/></svg><input id=find type=search placeholder="Search companies" value="'+esc(S.find)+'" autocomplete=off></div>'
 +'<div class=panel><div class=list id=rows>'+rowsOf(rows)+'</div></div></main>'}
function rowsOf(rows){return rows.map(function(c){return item(c,'<div class="t1 num">'+fmt(c.price)+'</div><div class=t2>'+big(c.price*c.shares)+' cap</div>')}).join('')||'<div class=lbl style="padding:16px">No companies match.</div>'}
function holdingsValue(){if(!db.me)return 0;return Object.keys(db.me.holdings).reduce(function(s,id){var c=C(id);return s+(c?c.price*db.me.holdings[id].qty:0)},0)}
function owned(c){var h=db.me&&db.me.holdings[c.id];return h?h.qty:0}
function coChart(c){return chart(c.hist.slice(-S.range),'co'+c.id,240)}
function ticket(c){
 if(!db.me)return '<div class=tile><div style="font-weight:800;margin-bottom:4px">Trade '+esc(c.ticker)+'</div><div class=note style="margin-bottom:12px">Sign in to buy and sell with your Equicoins.</div><button class="primary big" data-client="/i/flow/login">Sign in</button></div>';
 if(!db.money.on)return '<div class=tile><div style="font-weight:800;margin-bottom:4px">Trade '+esc(c.ticker)+'</div><div class=note>Trading opens when Equicoins is turned on.</div></div>';
 if(!db.me.accepted)return '<div class=tile><div style="font-weight:800;margin-bottom:6px">Before you trade</div><div class=note style="margin-bottom:12px">'+esc(db.money.disclaimer||'')+'</div><button class="primary big" data-accept>Accept and continue</button></div>';
 if(c.suspended)return '<div class=tile><div style="font-weight:800;margin-bottom:4px">Trading paused</div><div class=note>This listing is suspended.</div></div>';
 var buy=S.side==='buy';
 return '<div class="tile ticket"><div class=side><button class="'+(buy?'on b':'')+'" data-side=buy>Buy</button><button class="'+(!buy?'on s':'')+'" data-side=sell>Sell</button></div>'
 +'<div class=lbl style="margin-bottom:6px">Shares</div><div class=qty><button data-step=-1 aria-label="Fewer">−</button><input id=qty type=number inputmode=numeric min=1 step=1 placeholder="0" value="'+esc(S.q)+'"><button data-step=1 aria-label="More">+</button></div>'
 +'<div class=presets>'+[25,50,75,100].map(function(p){return '<button data-preset="'+p+'">'+(p===100?'Max':p+'%')+'</button>'}).join('')+'</div>'
 +'<div class=sum><span>Price</span><b id=tk-px>'+fmt(c.price)+'</b></div><div class=sum><span>Estimated '+(buy?'cost':'proceeds')+'</span><b id=tk-tot>'+fmt(0)+'</b></div><div class=sum><span>Equicoins after</span><b id=tk-after>'+fmt(db.me.cash)+'</b></div>'
 +'<div class=err id=tk-err></div><button class="big '+(buy?'buy':'sell')+'" id=tk-go>'+(buy?'Buy ':'Sell ')+esc(c.ticker)+'</button>'
 +'<div class=lbl style="margin-top:10px;text-align:center">'+coin+fmt(db.me.cash)+' Equicoins available · you own '+qn(owned(c))+'</div></div>'}
function maxQty(c){return S.side==='buy'?Math.floor(db.me.cash/c.price):Math.floor(owned(c))}
function updTicket(){var c=C(S.cid);if(!c||!$('#tk-go'))return;var q=Math.floor(+($('#qty').value||0));S.q=$('#qty').value;var tot=q>0?q*c.price:0,buy=S.side==='buy',after=buy?db.me.cash-tot:db.me.cash+tot;
 $('#tk-px').textContent=fmt(c.price);$('#tk-tot').textContent=fmt(tot);var a=$('#tk-after');a.textContent=(after<0?'−':'')+fmt(Math.abs(after));a.className=after<0?'dn':'';
 var err=buy&&after<0?'Not enough Equicoins':!buy&&q>owned(c)?'You own '+qn(owned(c))+' shares':'';$('#tk-err').textContent=err;$('#tk-go').disabled=!!err||!(q>0)||BUSY}
function coPage(){var c=C(S.cid);if(!c)return '<main><div class="card empty"><h2>Company not found</h2><p>It may have been delisted.</p><button data-go="list">Browse the market</button></div></main>';
 var news=db.headlines.filter(function(h){return h.ticker===c.ticker});
 var canEdit=db.me&&(db.admin||(c.owner&&c.owner.handle===db.me.handle));
 var h=db.me&&db.me.holdings[c.id];
 var pos=h?'<div class=tile><div style="font-weight:800;margin-bottom:8px">Your position</div><div class=sum><span>Shares</span><b>'+qn(h.qty)+'</b></div><div class=sum><span>Market value</span><b id=pos-v>'+fmt(h.qty*c.price)+'</b></div><div class=sum><span>Average cost</span><b>'+fmt(h.cost/h.qty)+'</b></div><div class=sum><span>Return</span><b id=pos-r class="'+(h.qty*c.price-h.cost>=0?'up':'dn')+'">'+(h.qty*c.price-h.cost>=0?'+':'−')+fmt(Math.abs(h.qty*c.price-h.cost))+'</b></div></div>':'';
 return '<main>'+moneyBanner()+'<div class=card style="padding:0">'
 +'<div class=between style="padding:16px 16px 0;align-items:flex-start"><div style="display:flex;gap:12px;align-items:center;min-width:0">'+logo(c,'lg')+'<div style="min-width:0"><div class=h2 style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+esc(c.name)+'</div><div class=lbl>'+esc(c.ticker)+(c.sector?' · '+esc(c.sector):'')+(c.suspended?' · <span class="tag brk">SUSPENDED</span>':'')+'</div></div></div>'+(canEdit?'<button class=small data-go="edit" data-id="'+c.id+'" style="flex:0 0 auto">Edit</button>':'')+'</div>'
 +'<div style="padding:12px 16px 0"><div class=big id=px>'+fmt(c.price)+'</div><div class=row style="gap:8px;margin-top:4px"><span id=chg style="flex:0 0 auto">'+pill(chg(c))+'</span><span class=lbl style="flex:0 0 auto">Equicoins · since listing</span></div></div>'
 +'<div class=between style="padding:10px 16px 0"><span class=lbl><span class=pulse></span>Live</span><div class=seg>'+[[20,'20'],[60,'60'],[200,'200']].map(function(a){return '<button class="'+(S.range===a[0]?'on':'')+'" data-range="'+a[0]+'">'+a[1]+'</button>'}).join('')+'</div></div>'
 +'<div id=live style="margin-top:6px">'+coChart(c)+'</div>'
 +'<div class=stats id=stats>'+stats(c)+'</div></div>'
 +'<div class=grid style="grid-template-columns:repeat(auto-fit,minmax(260px,1fr));align-items:start;margin-bottom:12px">'+ticket(c)+(pos||'')
 +'<div class=tile><div style="font-weight:800;margin-bottom:6px">About</div><div style="margin-bottom:10px">'+(c.description?esc(c.description):'<span class=note>No description yet.</span>')+'</div>'+(c.owner?'<div class=lbl style="margin-bottom:4px">Founded by</div>'+founder(c.owner):'<div class=lbl>Listed by '+esc(db.instance)+' staff</div>')+'</div></div>'
 +(news.length?'<div class=panel><div class=hd><h3>News</h3></div><div class=list>'+news.map(function(h){return '<div class=item style="cursor:default;display:block">'+(h.brk?'<span class="tag brk">BREAKING</span> ':'')+'<span class=lbl>'+esc(h.cat)+' · '+new Date(h.t).toLocaleDateString()+'</span><div style="margin-top:4px">'+esc(h.text)+'</div></div>'}).join('')+'</div></div>':'')
 +'</main>'}
function stats(c){return '<div><span class=lbl>Market cap</span><b>'+big(c.price*c.shares)+'</b></div><div><span class=lbl>Volume</span><b>'+c.volume.toLocaleString()+'</b></div><div><span class=lbl>Shares</span><b>'+c.shares.toLocaleString()+'</b></div><div><span class=lbl>Listed</span><b>'+new Date(c.listed).toLocaleDateString()+'</b></div>'}
function updateLive(){var c=C(S.cid);if(!c)return;var l=$('#live');if(l&&!l.querySelector('.xh[style*="block"]'))l.innerHTML=coChart(c);var p=$('#px');if(p)p.textContent=fmt(c.price);var g=$('#chg');if(g)g.innerHTML=pill(chg(c));var s=$('#stats');if(s)s.innerHTML=stats(c);var h=db.me&&db.me.holdings[c.id];if(h&&$('#pos-v')){$('#pos-v').textContent=fmt(h.qty*c.price);var r=h.qty*c.price-h.cost,e=$('#pos-r');e.textContent=(r>=0?'+':'−')+fmt(Math.abs(r));e.className=r>=0?'up':'dn'}updTicket()}
function trade(){var c=C(S.cid),q=Math.floor(+$('#qty').value);
 if(!c||!(q>0)||BUSY)return;BUSY=true;$('#tk-go').disabled=true;
 api('trade',{id:c.id,side:S.side,qty:q}).then(function(st){BUSY=false;db=st;S.q='';render();toast((S.side==='buy'?'Bought ':'Sold ')+qn(q)+' '+c.ticker+' for '+fmt(q*c.price))},function(e){BUSY=false;toast(e.message,true);updTicket()})}
function acct(){if(!db.me)return '<main><div class="card empty"><h2>Your portfolio</h2><p>Sign in to trade with your Equicoins.</p><button class=primary data-client="/i/flow/login">Sign in</button></div></main>';
 var a=db.me;
 var rows=Object.keys(a.holdings).map(function(id){var c=C(id),p=a.holdings[id];return c?{c:c,qty:p.qty,cost:p.cost,v:c.price*p.qty}:null}).filter(Boolean).sort(function(x,y){return y.v-x.v});
 var val=rows.reduce(function(s,e){return s+e.v},0),cost=rows.reduce(function(s,e){return s+e.cost},0),ret=val-cost;
 return '<main>'+moneyBanner()+'<div class=tile style="margin-bottom:12px"><div class=lbl>Total value</div><div class=big>'+(a.cash==null?fmt(val):eq(a.cash+val))+'</div>'
 +'<div class=row style="gap:20px;margin-top:10px">'+(a.cash==null?'':'<div style="flex:0 0 auto"><div class=lbl>Equicoins</div><div style="font-weight:700" class=num>'+fmt(a.cash)+'</div></div>')+'<div style="flex:0 0 auto"><div class=lbl>In shares</div><div style="font-weight:700" class=num>'+fmt(val)+'</div></div><div style="flex:0 0 auto"><div class=lbl>Return</div><div style="font-weight:700" class="num '+(ret>=0?'up':'dn')+'">'+(ret>=0?'+':'−')+fmt(Math.abs(ret))+'</div></div></div></div>'
 +'<div class=panel><div class=hd><h3>Holdings</h3><span class=lbl>@'+esc(a.handle)+'</span></div><div class=list>'+(rows.map(function(e){var r=e.v-e.cost;return item(e.c,'<div class="t1 num">'+fmt(e.v)+'</div><div class="t2 '+(r>=0?'up':'dn')+'">'+(r>=0?'+':'−')+fmt(Math.abs(r))+'</div>').replace('<div class=t2>'+esc(e.c.ticker),'<div class=t2>'+qn(e.qty)+' shares · '+esc(e.c.ticker))}).join('')||'<div class=lbl style="padding:0 16px 16px">No holdings yet. Pick a company on the Markets tab to buy your first shares.</div>')+'</div></div>'
 +'<div class=panel><div class=hd><h3>Activity</h3></div>'+(a.txns.length?'<div style="overflow-x:auto"><table><tr><th>Order</th><th>Shares</th><th class=m>Price</th><th>Total</th><th class=m>When</th></tr>'
 +a.txns.map(function(t){return '<tr><td><span class="'+(t.side==='buy'?'up':'dn')+'" style="font-weight:700">'+(t.side==='buy'?'Buy':'Sell')+'</span> '+esc(t.ticker)+'</td><td>'+qn(t.qty)+'</td><td class=m>'+fmt(t.price)+'</td><td>'+(t.side==='buy'?'−':'+')+fmt(t.total)+'</td><td class=m>'+new Date(t.t).toLocaleString([], {month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})+'</td></tr>'}).join('')+'</table></div>':'<div class=lbl style="padding:0 16px 16px">No orders yet.</div>')+'</div></main>'}

/* ---------- LISTING A COMPANY ---------- */
function companyForm(c){
 var isNew=!c;
 if(!db.me)return '<main><div class="card empty"><h2>List a company</h2><p>Sign in first.</p></div></main>';
 if(isNew&&!db.me.canList)return '<main><div class="card empty"><h2>List a company</h2><p>Accounts with a blue or gold checkmark can list a company on the market. Staff can list one for anyone.</p><button data-go="dash">Back to Markets</button></div></main>';
 if(isNew&&db.me.ownMax!=null&&db.me.owned>=db.me.ownMax)return '<main><div class="card empty"><h2>You\'ve listed '+db.me.owned+' companies</h2><p>Each account can list up to '+db.me.ownMax+'.</p><button data-go="dash">Back to Markets</button></div></main>';
 var sec=(db.sectors||[]).map(function(s){return '<option'+(c&&c.sector===s?' selected':'')+'>'+esc(s)+'</option>'}).join('');
 return '<main><div class=dlg><div class=card style="padding:20px">'
 +'<div class=h2>'+(isNew?'List a company':'Edit '+esc(c.ticker))+'</div><div class=note style="margin-bottom:18px">'+(isNew?'It trades in Equicoins from the moment it\'s listed. '+(db.admin?'':'You\'re shown as its founder.'):'The ticker, share count and price are set by staff.')+'</div>'
 +'<div class=preview>'+'<span id=pv-logo>'+(c?logo(c,'lg'):'<span class="logo-img lg">LOGO</span>')+'</span><div style="min-width:0"><div style="font-weight:800" id=pv-name>'+(c?esc(c.name):'Company name')+'</div><div class=lbl id=pv-sub>'+(c?esc(c.ticker)+' · '+esc(c.sector||''):'TICKER · Sector')+'</div></div><div style="margin-left:auto;text-align:right" id=pv-cap>'+(c?'<div class=num style="font-weight:700">'+fmt(c.price)+'</div><div class=lbl>'+big(c.price*c.shares)+' cap</div>':'')+'</div></div>'
 +'<label class=f><span>Company name<i id=n-name>0/50</i></span><input id=f-name maxlength=50 value="'+(c?esc(c.name):'')+'" placeholder="Bloxburg Burgers"></label>'
 +(isNew?'<div class=row style="gap:12px"><label class=f><span>Ticker</span><input id=f-ticker maxlength=5 placeholder="BURG" style="text-transform:uppercase;font-weight:700;letter-spacing:.05em"></label><label class=f><span>Sector</span><select id=f-sector>'+sec+'</select></label></div>':'<label class=f><span>Sector</span><select id=f-sector>'+sec+'</select></label>')
 +'<label class=f><span>What it does<i id=n-desc>0/200</i></span><textarea id=f-desc maxlength=200 placeholder="Burgers and fries, made fresh on Main Street.">'+(c?esc(c.description||''):'')+'</textarea></label>'
 +(isNew?'<div class=row style="gap:12px"><label class=f><span>Starting price (Equicoins)</span><input id=f-price type=number min=0.1 max=1000 step=0.01 placeholder="10.00"></label><label class=f><span>Shares outstanding</span><input id=f-shares type=number min=1000 max=10000000 step=1 placeholder="100000"></label></div><div class=note style="margin:-6px 0 14px">Price $0.10–$1,000 · 1,000–10,000,000 shares · tickers are 2–5 letters.</div>':'')
 +'<label class=f><span>Logo <i>PNG, JPEG, GIF or WebP, under 1 MB</i></span><input id=f-logo type=file accept="image/png,image/jpeg,image/gif,image/webp"></label>'
 +(c&&c.logo?'<label class=row style="gap:8px;margin:-6px 0 14px;font-size:14px"><input id=f-clear type=checkbox style="width:auto;min-height:0;flex:0 0 auto"> <span style="flex:1">Remove the current logo</span></label>':'')
 +'<div class=err id=f-err></div><div class=row style="gap:8px"><button data-back>Cancel</button><button class=primary id=f-go>'+(isNew?'List company':'Save')+'</button></div></div></div></main>'}
var LOGO='';
function formPreview(){var n=$('#f-name');if(!n)return;var t=$('#f-ticker'),p=$('#f-price'),s=$('#f-shares');$('#n-name').textContent=n.value.length+'/50';$('#n-desc').textContent=$('#f-desc').value.length+'/200';$('#pv-name').textContent=n.value||'Company name';
 var tk=t?t.value.toUpperCase().replace(/[^A-Z]/g,''):'';if(t&&t.value!==tk)t.value=tk;if(t)$('#pv-sub').textContent=(tk||'TICKER')+' · '+$('#f-sector').value;
 if(p&&+p.value>0){$('#pv-cap').innerHTML='<div class=num style="font-weight:700">'+fmt(+p.value)+'</div><div class=lbl>'+(+s.value>0?big(p.value*s.value)+' cap':'')+'</div>'}
 if(LOGO)$('#pv-logo').innerHTML='<img class="logo-img lg" src="'+LOGO+'" alt="">'}
function readFile(input){return new Promise(function(res,rej){var f=input&&input.files&&input.files[0];if(!f)return res('');if(f.size>1e6)return rej(new Error('The logo must be under 1 MB'));var r=new FileReader();r.onload=function(){res(r.result)};r.onerror=function(){rej(new Error('Could not read that file'))};r.readAsDataURL(f)})}
function submitCompany(){
 var c=S.page==='edit'?C(S.cid):null,err=$('#f-err'),btn=$('#f-go');
 var body={name:$('#f-name').value.trim(),sector:$('#f-sector').value,description:$('#f-desc').value.trim(),logo:LOGO||''};
 if(c){body.id=c.id;body.clearLogo=!!($('#f-clear')&&$('#f-clear').checked)}else{body.ticker=$('#f-ticker').value.trim().toUpperCase();body.price=+$('#f-price').value;body.shares=+$('#f-shares').value}
 var bad=body.name.length<2?'Give the company a name':!c&&!/^[A-Z]{2,5}$/.test(body.ticker)?'Tickers are 2 to 5 letters':!c&&CT(body.ticker)?'That ticker is taken':body.description.length<10?'Describe the company in a sentence':!c&&!(body.price>=0.1&&body.price<=1000)?'The starting price is between $0.10 and $1,000':!c&&!(body.shares>=1000&&body.shares<=10000000)?'Shares outstanding are between 1,000 and 10,000,000':'';
 if(bad){err.textContent=bad;return}
 err.textContent='';btn.disabled=true;
 api(c?'company':'register',body).then(function(st){db=st;var t=c?c.ticker:body.ticker;toast(c?'Saved':t+' is listed');setTimeout(function(){go('co',(CT(t)||{}).id||t)},500)},function(e){err.textContent=e.message;btn.disabled=false});
}

/* ---------- ADMIN ---------- */
function act(action,body,ask){if(ask&&!confirm(ask))return Promise.resolve();
 return api('admin/'+action,body||{}).then(function(r){db=r.state;AD=r.admin;render();toast('Done')},function(e){toast(e.message,true)})}
function adminPage(){
 if(!db.admin)return '<main><div class="card empty"><h2>Staff only</h2><p>The market\'s admin panel is for '+esc(db.instance)+' staff with the admin role.</p></div></main>';
 if(!AD){api('admin').then(function(r){AD=r;render()},function(e){AD={accounts:[],logs:[],error:e.message};render()});return '<main><div class=note>Loading…</div></main>'}
 return '<main class=ad>'+moneyBanner()+adCo()+adCtl()+adEvents()+adHl()
 +'<details class=card'+(S.openAcc?' open':'')+' data-d=acc><summary>Investors ('+AD.accounts.length+')</summary><br>'+adAcc()+'</details>'
 +'<details class=card'+(S.openLog?' open':'')+' data-d=log><summary>Activity log</summary><br>'+adLog()+'</details></main>'}
function adCo(){var e=EDIT&&C(EDIT);var sec='<option value="">Sector (optional)</option>'+(db.sectors||[]).map(function(s){return '<option>'+esc(s)+'</option>'}).join('');
 return (e?editForm(e):'')+'<div class=card><h3>List a company</h3><div class=row>'
 +'<input id=cn placeholder="Company name" maxlength=80><input id=ct placeholder="Ticker" maxlength=6><input id=cp type=number step=0.01 min=0.01 placeholder="Initial price"><input id=cs type=number min=1 placeholder="Shares outstanding"></div>'
 +'<div class=row><select id=csec>'+sec+'</select><input id=cdesc maxlength=200 placeholder="Description (optional)"></div>'
 +'<div class=row><input id=cl type=file accept="image/png,image/jpeg,image/gif,image/webp"><button class=primary data-a=list>List company</button></div></div>'
 +'<div class="card" style="padding:0"><div style="overflow-x:auto"><table><tr><th>Company</th><th>Price</th><th class=m>Founder</th><th>Status</th><th></th></tr>'
 +(db.companies.map(function(c){return '<tr><td><span style="display:inline-flex;gap:8px;align-items:center">'+logo(c,'sm')+'<b>'+esc(c.ticker)+'</b> <span class=lbl>'+esc(c.name)+'</span></span></td><td>'+fmt(c.price)+'</td><td class=m>'+(c.owner?'@'+esc(c.owner.handle):'<span class=lbl>staff</span>')+'</td><td>'+(c.suspended?'<span class="tag brk">Suspended</span>':'Active')+'</td><td><button class=small data-a=edCo data-id="'+c.id+'">Edit</button> <button class=small data-a=suspend data-id="'+c.id+'">'+(c.suspended?'Resume':'Suspend')+'</button> <button class="small danger" data-a=remove data-id="'+c.id+'">Delete</button></td></tr>'}).join('')||'<tr><td colspan=5 class=lbl>No companies</td></tr>')+'</table></div></div>'}
function editForm(c){return '<div class=card style="border-color:var(--accent)"><h3>Editing '+esc(c.ticker)+'</h3>'
 +'<div class=row><label class=f><span>Company name</span><input id=en maxlength=80 value="'+esc(c.name)+'"></label><label class=f><span>Ticker</span><input id=et maxlength=6 value="'+esc(c.ticker)+'"></label><label class=f><span>Shares outstanding</span><input id=es type=number min=1 value="'+c.shares+'"></label></div>'
 +'<div class=row style="align-items:center">'+logo(c,'lg')+'<label class=f style="flex:2 1 200px;margin:0"><span>Upload new logo</span><input id=el type=file accept="image/png,image/jpeg,image/gif,image/webp"></label></div><br>'
 +'<div class=row><button class=primary data-a=saveEdit>Save changes</button><button data-a=cancelEdit>Cancel</button><button data-a=clearLogo data-id="'+c.id+'">Remove logo</button></div></div>'}
function opts(){return db.companies.map(function(c){return '<option value="'+c.id+'">'+esc(c.ticker)+' · '+fmt(c.price)+'</option>'}).join('')}
function adCtl(){var o=opts();
 return '<div class=card><h3>Market controls</h3>'
 +'<div class=row><input id=mp type=number min=0 step=0.1 placeholder="% for whole market"><button data-a=mkt data-sign=-1>Crash all</button><button class=primary data-a=mkt data-sign=1>Boost all</button></div>'
 +'<div class=row><select id=cg>'+o+'</select><input id=cgp type=number min=0 step=0.1 placeholder="%"><button data-a=coPct data-dir=-1>Crash</button><button class=primary data-a=coPct data-dir=1>Boost</button></div>'
 +'<div class=row><select id=sg>'+o+'</select><input id=sp type=number min=0.01 step=0.01 placeholder="Set exact price"><button data-a=setExact>Set price</button></div>'
 +'<div class=row><select id=ag>'+o+'</select><input id=ad type=number step=0.01 placeholder="± amount"><button data-a=adjust>Adjust</button></div></div>'}
function adEvents(){var ev=db.events||[];
 return '<div class=card><h3>Events</h3>'
 +'<div class=lbl>Market gap</div><div class=mid style="margin-bottom:14px">'+eq(db.gap||0)+'</div>'
 +'<div class=row><input id=em type=number min=0.1 max=99 step=0.1 placeholder="Market %"><button data-a=evMarket data-sign=-1>Market Crash</button><button class=primary data-a=evMarket data-sign=1>Market Boost</button></div>'
 +'<div class=row><input id=rc type=number min=1 step=1 placeholder="How many companies"><input id=er type=number min=0.1 max=99 step=0.1 placeholder="Drop %"><button data-a=evRandom>Random Drop</button></div>'
 +'<div class=row><input id=tr type=number min=0.1 max=99 step=0.1 placeholder="Tax %"><button class=primary data-a=runTax>Tax Season!</button></div>'
 +'<div class=row><button data-a=runScandal style="flex:0 0 auto">Political Scandal</button><span class=lbl style="flex:2 1 200px">Every investor pulls out half of their holdings into Equicoins.</span></div>'
 +'<div class=lbl style="margin-top:12px">History</div>'+(ev.map(function(e){return '<div style="padding:8px 0;border-bottom:1px solid var(--line);font-size:14px"><span class=lbl>'+new Date(e.t).toLocaleString()+'</span> · '+esc(e.name)+' — '+esc(e.detail)+'</div>'}).join('')||'<div class=lbl style="padding:8px 0">No events yet</div>')+'</div>'}
function adHl(){return '<div class=card><h3>Headlines</h3><input id=ht placeholder="Headline" maxlength=280 style="margin-bottom:8px"><div class=row>'
 +'<select id=hc><option>Markets</option><option>Corporate</option><option>Economy</option><option>Policy</option><option>Major event</option></select>'
 +'<select id=hk><option value="">No ticker</option>'+db.companies.map(function(c){return '<option>'+esc(c.ticker)+'</option>'}).join('')+'</select>'
 +'<label class=lbl style="flex:0 0 auto;display:flex;gap:6px;align-items:center"><input type=checkbox id=hb style="width:auto;min-height:0"> BREAKING</label>'
 +'<button class=primary data-a=pubHl>Publish</button></div>'
 +'<div style="overflow-x:auto;margin-top:8px"><table>'+(db.headlines.map(function(h){return '<tr><td style="white-space:normal">'+(h.brk?'<span class="tag brk">BREAKING</span> ':'')+esc(h.text)+'<div class=lbl>'+esc(h.cat)+(h.ticker?' · '+esc(h.ticker):'')+'</div></td><td><button class=small data-a=edHl data-id="'+h.id+'">Edit</button> <button class="small danger" data-a=delHl data-id="'+h.id+'">Delete</button></td></tr>'}).join('')||'<tr><td class=lbl>No headlines</td></tr>')+'</table></div></div>'}
function adAcc(){var A=AD.accounts;return '<div class=lbl>Everyone who has traded, with their Equicoins balance</div><div style="overflow-x:auto"><table><tr><th>Account</th><th>Equicoins</th><th class=m>In shares</th><th class=m>Positions</th><th class=m>First trade</th></tr>'
 +(A.map(function(a){return '<tr><td>@'+esc(a.screen_name)+' <span class=lbl>'+esc(a.name)+'</span></td><td>'+fmt(a.cash)+'</td><td class=m>'+fmt(a.equity)+'</td><td class=m>'+a.positions+'</td><td class=m>'+new Date(a.created).toLocaleDateString()+'</td></tr>'}).join('')||'<tr><td colspan=5 class=lbl>No investors yet</td></tr>')+'</table></div>'}
function adLog(){return (AD.logs.map(function(e){return '<div style="padding:8px 0;border-bottom:1px solid var(--line);font-size:14px"><span class=lbl>'+new Date(e.t).toLocaleString()+'</span> · '+esc(e.a)+'</div>'}).join('')||'<p class=lbl>No activity yet.</p>')}
var V=function(s){var e=$(s);return e?e.value:''};
var ADMIN={
 list:function(){var name=V('#cn').trim(),tk=V('#ct').trim().toUpperCase(),price=+V('#cp'),sh=+V('#cs');
  if(!name||!tk||!(price>0)||!(sh>0))return toast('Enter name, ticker, price and shares',true);
  if(CT(tk))return toast('Ticker already listed',true);
  readFile($('#cl')).then(function(logo){return act('list',{name:name,ticker:tk,price:price,shares:sh,logo:logo,sector:V('#csec'),description:V('#cdesc')})},function(e){toast(e.message,true)})},
 edCo:function(id){EDIT=id;render();viewTop()},
 cancelEdit:function(){EDIT=null;render()},
 saveEdit:function(){var c=C(EDIT);if(!c)return;var n=V('#en').trim(),T=V('#et').trim().toUpperCase(),s=+V('#es');
  if(!n||!T||!(s>0))return toast('Name, ticker and shares are required',true);
  if(db.companies.some(function(x){return x!==c&&x.ticker===T}))return toast('Ticker in use',true);
  readFile($('#el')).then(function(logo){return act('edit',{id:c.id,name:n,ticker:T,shares:s,logo:logo}).then(function(){EDIT=null;render()})},function(e){toast(e.message,true)})},
 clearLogo:function(id){act('clearLogo',{id:id})},
 suspend:function(id){act('suspend',{id:id})},
 remove:function(id){var c=C(id);act('remove',{id:id},'Delete '+c.ticker+'? Everyone\'s shares in it go with it.')},
 mkt:function(_,el){var p=Math.abs(+V('#mp'))*(+el.getAttribute('data-sign'));if(!p)return toast('Enter a percentage',true);act('market',{pct:p},(p>0?'Boost':'Crash')+' all listed companies by '+Math.abs(p)+'%?')},
 coPct:function(_,el){var p=+V('#cgp');if(!V('#cg'))return toast('No company',true);if(!(p>0))return toast('Enter a percentage',true);act('companyPct',{id:V('#cg'),pct:p,dir:+el.getAttribute('data-dir')})},
 setExact:function(){var p=+V('#sp');if(!V('#sg'))return toast('No company',true);if(!(p>0))return toast('Enter a price',true);act('setPrice',{id:V('#sg'),price:p})},
 adjust:function(){var a=+V('#ad');if(!V('#ag'))return toast('No company',true);if(!a)return toast('Enter an amount',true);act('adjust',{id:V('#ag'),amount:a})},
 evMarket:function(_,el){var sign=+el.getAttribute('data-sign'),p=+V('#em');if(!(p>0))return toast('Enter a percentage',true);act('eventMarket',{pct:p,sign:sign},(sign<0?'Market crash':'Market boost')+' of '+p+'% on all listed companies?')},
 evRandom:function(){var p=+V('#er'),n=+V('#rc'),L=db.companies.filter(function(c){return !c.suspended});if(!(p>0))return toast('Enter a percentage',true);if(!(n>0)||!L.length)return toast('Enter how many companies, and make sure some are listed',true);var k=Math.min(n,L.length);act('randomDrop',{pct:p,count:n},'Drop '+k+' random compan'+(k>1?'ies':'y')+' by '+p+'%?')},
 runTax:function(){var r=+V('#tr');if(!(r>0&&r<100))return toast('Enter a tax rate between 0 and 100',true);act('tax',{rate:r},'Tax '+r+'% of every account\'s holdings and send it to the market gap?')},
 runScandal:function(){act('scandal',{},'Political Scandal: every investor pulls out half of their holdings into Equicoins?')},
 pubHl:function(){var text=V('#ht').trim();if(!text)return toast('Enter a headline',true);act('headline',{text:text,cat:V('#hc'),ticker:V('#hk'),breaking:$('#hb').checked})},
 edHl:function(id){var h=db.headlines.find(function(x){return x.id===id});var t=prompt('Edit headline',h.text);if(t===null)return;var b=confirm('Mark as BREAKING? OK = yes, Cancel = no');act('editHeadline',{id:id,text:t.trim()||h.text,breaking:b})},
 delHl:function(id){act('deleteHeadline',{id:id},'Delete this headline?')}
};

/* ---------- ROUTER ---------- */
var BACK='<svg viewBox="0 0 24 24"><path d="M7.414 13l5.043 5.04-1.414 1.42L3.586 12l7.457-7.46 1.414 1.42L7.414 11H21v2H7.414z"/></svg>';
function tabs(){return [['dash','Overview'],['list','Markets']].concat(db.me?[['acct','Portfolio']]:[]).concat(db.admin?[['admin','Admin']]:[])}
function render(){
 var co=(S.page==='co'||S.page==='edit')&&C(S.cid);
 var title=S.page==='co'&&co?co.ticker:S.page==='new'?'List a company':S.page==='edit'&&co?'Edit '+co.ticker:'Markets';
 var sub=S.page==='co'&&co?esc(co.name):db.me&&db.me.cash!=null?coin+fmt(db.me.cash)+' Equicoins':'TradeX · '+esc(db.money.name);
 var back=S.page==='co'||S.page==='new'||S.page==='edit'||!framed;
 var bar='<div class=bar>'+(back?'<button class=iconbtn data-back aria-label="Back">'+BACK+'</button>':'')+'<div class=grow><h1>'+esc(title)+'</h1><div class=sub>'+sub+'</div></div>'+(db.me&&db.me.canList&&S.page!=='new'&&S.page!=='edit'?'<button class="small primary" data-go="new" style="flex:0 0 auto">List a company</button>':'')+'</div>';
 var nav=S.page==='new'||S.page==='edit'?'':'<nav class=tabs>'+tabs().map(function(t){return '<a href="#" data-go="'+t[0]+'" class="'+(S.page===t[0]||(t[0]==='list'&&S.page==='co')?'on':'')+'">'+t[1]+'</a>'}).join('')+'</nav>';
 var body={dash:dash,list:list,co:coPage,acct:acct,admin:adminPage,new:function(){return companyForm(null)},edit:function(){return co?companyForm(co):coPage()}}[S.page]();
 var y=window.scrollY,old=$('.bar'),hid=!!(old&&old.hidden),f=document.activeElement&&document.activeElement.id,sel=f&&document.activeElement.selectionStart;
 $('#app').innerHTML=bar+nav+body;
 // the client's own header stands in for ours on a phone (tidy.ts)
 if(hid)$('.bar').hidden=true;
 if(f&&$('#'+f)){var el=$('#'+f);el.focus();try{if(sel!=null)el.setSelectionRange(sel,sel)}catch(e){}}
 window.scrollTo(0,y);
 updTicket();formPreview();
 document.title=(S.page==='co'&&co?co.ticker+' · '+co.name:title)+' · '+db.instance;
}
document.addEventListener('click',function(e){
 var t=e.target.closest('[data-go],[data-ir],[data-range],[data-side],[data-step],[data-preset],[data-a],[data-back],[data-client],[data-accept],#tk-go,#f-go');if(!t)return;
 if(t.hasAttribute('data-client')){e.preventDefault();client(t.getAttribute('data-client'));return}
 if(t.hasAttribute('data-go')){e.preventDefault();go(t.getAttribute('data-go'),t.getAttribute('data-id')||undefined);return}
 if(t.hasAttribute('data-back')){e.preventDefault();if(!framed&&S.page==='dash'){location.assign('/home');return}var c=C(S.cid);if(S.page==='edit'&&c)go('co',c.id);else if(S.page==='co'||S.page==='new'||S.page==='edit')go(Q.get('from')||'list');else client('/home');return}
 if(t.hasAttribute('data-ir')){S.ir=+t.getAttribute('data-ir');render();return}
 if(t.hasAttribute('data-range')){S.range=+t.getAttribute('data-range');render();return}
 if(t.hasAttribute('data-side')){S.side=t.getAttribute('data-side');render();return}
 if(t.hasAttribute('data-accept')){t.disabled=true;api('accept',{}).then(function(st){db=st;render()},function(er){toast(er.message,true);t.disabled=false});return}
 if(t.hasAttribute('data-step')){var i=$('#qty');i.value=Math.max(0,Math.floor(+i.value||0)+(+t.getAttribute('data-step')));updTicket();return}
 if(t.hasAttribute('data-preset')){var c2=C(S.cid);if(!c2)return;$('#qty').value=Math.floor(maxQty(c2)*(+t.getAttribute('data-preset'))/100)||'';updTicket();return}
 if(t.id==='tk-go'){trade();return}
 if(t.id==='f-go'){submitCompany();return}
 var f=ADMIN[t.getAttribute('data-a')];if(f)f(t.getAttribute('data-id'),t);
});
document.addEventListener('input',function(e){
 if(e.target.id==='qty')updTicket();
 if(e.target.id==='find'){S.find=e.target.value;var r=$('#rows');if(r){var f=S.find.trim().toLowerCase();r.innerHTML=rowsOf(db.companies.filter(function(c){return !f||c.ticker.toLowerCase().indexOf(f)>=0||c.name.toLowerCase().indexOf(f)>=0||(c.sector||'').toLowerCase().indexOf(f)>=0}))}}
 if(/^f-/.test(e.target.id))formPreview();
});
document.addEventListener('change',function(e){if(e.target.id==='f-logo'){readFile(e.target).then(function(d){LOGO=d;formPreview()},function(er){e.target.value='';LOGO='';toast(er.message,true)})}if(e.target.id==='f-sector')formPreview()});
document.addEventListener('toggle',function(e){var d=e.target;if(d.getAttribute&&d.getAttribute('data-d')==='acc')S.openAcc=d.open;if(d.getAttribute&&d.getAttribute('data-d')==='log')S.openLog=d.open},true);
document.addEventListener('keydown',function(e){if(e.key==='Enter'&&e.target.id==='qty'){e.preventDefault();trade()}});
render();
// the market moves every two seconds on the server; the page follows it
var busy=false;
setInterval(function(){
 if(busy||document.hidden)return;busy=true;
 api('state').then(function(st){
  db=st;busy=false;
  if(S.page==='dash'||S.page==='acct')render();
  else if(S.page==='list'){var r=$('#rows');if(r){var f=S.find.trim().toLowerCase();r.innerHTML=rowsOf(db.companies.filter(function(c){return !f||c.ticker.toLowerCase().indexOf(f)>=0||c.name.toLowerCase().indexOf(f)>=0||(c.sector||'').toLowerCase().indexOf(f)>=0}))}else render()}
  else if(S.page==='co')updateLive();
 },function(){busy=false});
},2000);
})();
