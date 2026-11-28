/*---STYLE---*/
@font-face{font-family:"Inter";font-style:normal;font-weight:100 900;font-display:swap;src:url("/public/fonts/inter.woff2") format("woff2")}
@font-face{font-family:"IBM Plex Mono";font-style:normal;font-weight:400;font-display:swap;src:url("/public/fonts/ibm-plex-mono-400.woff2") format("woff2")}
@font-face{font-family:"IBM Plex Mono";font-style:normal;font-weight:500;font-display:swap;src:url("/public/fonts/ibm-plex-mono-500.woff2") format("woff2")}
:root{
 --ink:#000;--txt:#1a1a1a;--mut:#5b5b5b;--faint:#5b5b5b;
 --bg:#fff;--elev:#fff;--card:#fff;--card2:#f3f3f3;--band:#f3f3f3;
 --line:#d9d9d9;--line2:#c8c8c8;
 --hover:rgba(0,0,0,.04);--accent:#7bcdee;--accent2:#43b6e6;--accentbg:rgba(123,205,238,.22);--deep:#0a4a73;
 --up:#118a4e;--dn:#c62828;--upbg:rgba(17,138,78,.1);--dnbg:rgba(198,40,40,.1);
 --btn:#000;--btntxt:#fff;--field:#fff;
 --shadow:0 1px 0 var(--line);--radius:0;--radius-sm:0;
 --dock-h:0px;
 --sans:"Inter","Helvetica Neue",Arial,sans-serif;
 --mono:"IBM Plex Mono",ui-monospace,Menlo,Consolas,monospace;
 color-scheme:light;
}
*{box-sizing:border-box}
html,body{margin:0;background:var(--bg);color:var(--txt);
 font:400 16px/1.5 var(--sans);
 -webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}
html[data-site=bse] body{padding-bottom:var(--dock-h)}
h1,h2,h3,.h2,.big,.coname{color:var(--ink);letter-spacing:-.025em}
a{color:var(--deep);text-decoration:none}
a:hover{text-decoration:underline}
a:focus-visible,button:focus-visible,input:focus-visible,select:focus-visible,textarea:focus-visible,summary:focus-visible{
 outline:3px solid var(--accent);outline-offset:2px}
.num,.px,.pxc,table,.tr,.big,.mid,.pill,.chg,th,td,.mono{font-variant-numeric:tabular-nums;font-feature-settings:"tnum";font-family:var(--mono)}
/* chrome */
.bsehead{display:flex;align-items:center;gap:32px;padding:0 32px;height:84px;
 position:sticky;top:0;z-index:20;background:#fff}
.wordmark{display:flex;align-items:center;gap:12px;color:var(--ink);text-decoration:none;font-weight:700;flex:0 0 auto}
.wordmark:hover{text-decoration:none}
.logo-wrap{display:flex;align-items:center;flex:0 0 auto;line-height:0}
.logo-wrap .logo{height:48px;width:auto;display:block}
.logo-wrap .logo-on-dark{display:none}
.logo-wrap .logo-on-light{display:block}
.wordmark .bname{font-size:13px;font-weight:500;color:var(--mut);letter-spacing:.01em;padding-left:14px;border-left:1px solid var(--line)}
html[data-site=bse] .wordmark .bname{display:none}
.bsefoot .brand{display:flex;align-items:center;margin:0 0 16px}
.bsefoot .logo-wrap .logo{height:36px}
.bar .inapp{margin-right:8px}
.bar .logo-wrap .logo{height:32px}
.hnav{display:flex;align-items:center;gap:32px;margin-left:8px;flex:1;white-space:nowrap}
.hnav a{color:var(--ink);font-weight:500;font-size:1.05rem;padding:6px 0;border-bottom:3px solid transparent;border-radius:0;text-decoration:none}
.hnav a:hover,.hnav a.on{border-bottom-color:var(--ink);background:transparent;color:var(--ink);text-decoration:none}
.bsehead .grow{flex:1}
.hsearch{position:relative;width:300px;border-bottom:2px solid var(--ink);flex:0 0 auto}
.hsearch input{width:100%;min-height:40px;padding:8px 32px 8px 4px;border-radius:0;background:transparent;border:0;color:var(--ink);font:400 1.05rem var(--sans)}
.hsearch input::placeholder{color:#7fa5b8}
.hsearch svg{position:absolute;right:0;top:50%;width:20px;height:20px;transform:translateY(-50%);fill:var(--ink);pointer-events:none}
#qsug{display:none;position:absolute;left:0;right:0;top:calc(100% + 8px);background:#fff;border:1px solid #000;border-radius:0;box-shadow:0 8px 20px rgba(0,0,0,.08);overflow:hidden;z-index:30}
#qsug.open{display:block}
#qsug a{display:flex;align-items:center;gap:10px;padding:10px 12px;color:var(--ink);text-decoration:none}
#qsug a:hover,#qsug a.active{background:var(--band);text-decoration:none}
.bal{display:inline-flex;align-items:center;gap:6px;padding:6px 0;border-radius:0;background:transparent;border:0;border-bottom:2px solid transparent;font-weight:600;font-size:14px;font-variant-numeric:tabular-nums;font-family:var(--mono);color:var(--ink);text-decoration:none;white-space:nowrap}
.bal:hover{text-decoration:none;border-bottom-color:var(--ink)}
.acct{position:relative}
.acct>summary{list-style:none;display:flex;align-items:center;gap:8px;cursor:pointer;padding:4px 0;border-radius:0;border:0;color:var(--ink);font-weight:600;font-size:14px}
.acct>summary::-webkit-details-marker{display:none}
.acct>summary:hover,.acct[open]>summary{background:transparent}
.acct img,.me img{width:28px;height:28px;border-radius:0;object-fit:cover;background:var(--band);border:1px solid var(--line)}
.acctm{position:absolute;right:0;top:calc(100% + 8px);min-width:200px;background:#fff;border:1px solid #000;border-radius:0;box-shadow:0 8px 20px rgba(0,0,0,.08);padding:8px;z-index:40}
.acctm a,.acctm .rowl{display:block;padding:10px 10px;border-radius:0;color:var(--ink);text-decoration:none;font-weight:600;font-size:13px}
.acctm a:hover{background:var(--band);text-decoration:none}
.acctm .lbl{padding:4px 10px 8px}
.bsehead .glink{color:var(--mut);font-size:13px;font-weight:500;white-space:nowrap}
.bsehead .me{display:flex;align-items:center;gap:8px;color:var(--ink);text-decoration:none;font-weight:600;font-size:14px}
.bsehead .me:hover{text-decoration:none}
/* ticker tape */
.tape{padding:24px 32px 8px;background:#fff;overflow:hidden}
.tape .tick-row{display:flex;gap:16px;align-items:stretch;max-width:1240px;margin:0 auto}
.tick-mkt{flex:none;width:140px;background:#000;color:#fff;font:600 1.05rem var(--sans);padding:0 20px;display:flex;align-items:center;justify-content:space-between;box-shadow:0 6px 14px -6px rgba(0,0,0,.45)}
.tick-mkt svg{width:14px;height:14px;fill:currentColor}
.tape .lane{flex:1;overflow:hidden;min-width:0;-webkit-mask-image:linear-gradient(90deg,transparent,#000 3%,#000 97%,transparent);mask-image:linear-gradient(90deg,transparent,#000 3%,#000 97%,transparent)}
.tape .track{display:flex;gap:16px;width:max-content;padding:0;animation:tick 55s linear infinite}
.tape:hover .track{animation-play-state:paused}
@keyframes tick{to{transform:translateX(-50%)}}
@media(prefers-reduced-motion:reduce){
 .tape .track{animation:none;overflow-x:auto;width:auto;max-width:100%;scrollbar-width:none}
 .chart svg,.pill,button,.tr.go,.tile,.card{transition:none!important}
}
.chip{display:flex;align-items:center;border:1px solid var(--line);border-left:8px solid var(--accent);height:56px;white-space:nowrap;font-size:1rem;color:var(--ink);text-decoration:none;background:#fff;border-radius:0;padding:0;gap:0}
.chip:hover{text-decoration:none;background:var(--band)}
.chip>span,.chip>b{padding:0 16px;border-right:1px solid var(--line);height:100%;display:flex;align-items:center;gap:8px;font-weight:500}
.chip>span:last-child{border-right:0}
.chip .nm{font-weight:500;max-width:220px;overflow:hidden;text-overflow:ellipsis}
.chip .mono,.chip .num{font-family:var(--mono);font-weight:400}
.chip .u{color:var(--up)}.chip .d{color:var(--dn);font-weight:500}
@media(max-width:700px){.tick-mkt{width:88px;padding:0 12px;font-size:.95rem}.tape{padding:18px 16px 6px}}
/* page chrome (in-app + inner pages) */
.bar{position:sticky;top:0;z-index:6;background:#fff;display:flex;align-items:center;gap:16px;padding:0 32px;height:64px;border-bottom:1px solid var(--line)}
html[data-site=bse] .bar{top:84px}
.bar[hidden]{display:none}
.bar h1{font-size:18px;font-weight:800;margin:0;letter-spacing:-.02em;line-height:24px}
.bar .sub{color:var(--mut);font-size:13px;display:flex;align-items:center;gap:4px}
.bar .grow{flex:1}
.iconbtn{display:inline-flex;width:36px;height:36px;align-items:center;justify-content:center;border-radius:0;color:var(--ink);margin-left:-8px;cursor:pointer;border:0;background:none;padding:0;min-height:0}
.iconbtn:hover{background:var(--hover)}
.iconbtn svg{width:20px;height:20px;fill:currentColor}
.coin{display:inline-flex;width:1em;height:1em;vertical-align:-.12em;margin-right:3px}
.coin svg{width:100%;height:100%;fill:currentColor}
nav.tabs{display:flex;border-bottom:1px solid var(--line);overflow-x:auto;scrollbar-width:none;background:var(--bg)}
nav.tabs::-webkit-scrollbar{display:none}
nav.tabs a{flex:1 0 auto;text-align:center;color:var(--mut);font-weight:600;padding:0 16px;height:48px;display:flex;align-items:center;justify-content:center;position:relative;text-decoration:none;white-space:nowrap;font-size:13.5px}
nav.tabs a:hover{background:var(--hover);text-decoration:none}
nav.tabs a.on{color:var(--txt);font-weight:700}
nav.tabs{border-bottom:1px solid #000}
nav.tabs a.on{color:#000}
nav.tabs a.on::after{content:"";position:absolute;bottom:0;left:0;right:0;transform:none;width:100%;max-width:none;min-width:0;height:4px;border-radius:0;background:var(--accent)}
/* controls */
button{background:#fff;border:2px solid #000;color:var(--ink);padding:0 22px;border-radius:0;cursor:pointer;font:600 14px var(--sans);min-height:42px;white-space:nowrap;transition:background .15s,border-color .15s,filter .15s}
button:hover{background:var(--band);border-color:#000}
button:disabled{opacity:.45;cursor:default}
button.primary,a.primary{background:#000;color:#fff;border-color:#000}
button.primary:hover,a.primary:hover{background:#222;color:#fff;text-decoration:none;filter:none}
a.primary{display:inline-flex;align-items:center;justify-content:center;padding:0 22px;min-height:42px;border-radius:0;border:2px solid #000;font:600 14px var(--sans);text-decoration:none;line-height:1}
button.accent{background:var(--accent);color:#000;border-color:var(--accent)}
button.accent:hover{background:#9ad8f2;color:#000}
button.buy{background:var(--up);border-color:var(--up);color:#fff}
button.sell{background:var(--dn);border-color:var(--dn);color:#fff}
button.danger{color:var(--dn);border-color:var(--dn);background:transparent}
button.small{min-height:36px;padding:0 16px;font-size:13px}
.hbtns{display:flex;gap:8px;flex:0 0 auto;align-items:center}
button.xp{display:inline-flex;align-items:center;gap:6px}
button.xp svg{flex:0 0 auto}
button.xp.busy svg{animation:xpb 1s ease-in-out infinite}
@keyframes xpb{50%{transform:translateY(2px)}}
@media(max-width:520px){button.xp{width:36px;min-height:36px;padding:0;justify-content:center}button.xp .xpl{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}}
button.big{min-height:46px;font-size:15px;width:100%}
input,select,textarea{background:#fff;border:1px solid var(--line);color:var(--ink);padding:10px 12px;border-radius:0;font:inherit;width:100%;min-height:44px;transition:border-color .15s,box-shadow .15s}
textarea{resize:vertical;min-height:72px}
input:focus,select:focus,textarea:focus{outline:0;border-color:#000;box-shadow:0 0 0 3px var(--accent)}
label.f{display:block;margin-bottom:14px}
label.f>span{display:flex;justify-content:space-between;font-size:12.5px;color:var(--mut);margin-bottom:6px;font-weight:600}
/* layout */
main{padding:20px 24px 48px;max-width:1240px;margin:auto}
.news{display:flex;gap:10px;align-items:center;padding:10px 16px;border-bottom:1px solid var(--line);font-size:13px;overflow:hidden;white-space:nowrap;-webkit-mask:linear-gradient(90deg,#000 85%,transparent);mask:linear-gradient(90deg,#000 85%,transparent)}
.news .track{display:flex;gap:10px;align-items:center;overflow-x:auto;scrollbar-width:none}
.news .track::-webkit-scrollbar{display:none}
.tag{display:inline-block;background:var(--card2);color:var(--txt);font-weight:700;padding:3px 8px;border-radius:6px;font-size:11px;letter-spacing:.04em;text-transform:uppercase}
.tag.brk{background:var(--dn);color:#fff}
.tag.live{background:var(--accent);color:#fff}
.dot{color:var(--mut)}
.grid{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(240px,1fr))}
.card,.tile,.panel{border:0;border-top:4px solid var(--ink);background:#fff;border-radius:0;box-shadow:0 1px 0 var(--line);overflow:hidden}
.card{padding:16px;margin-bottom:12px}
.tile{padding:16px;margin:0}
.lbl{color:var(--mut);font-size:12.5px;font-weight:600}
.cap{color:var(--mut);font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em}
.h2{font-size:22px;font-weight:800;margin:0 0 4px;letter-spacing:-.03em}
.big{font-size:34px;font-weight:750;letter-spacing:-.03em;font-variant-numeric:tabular-nums;line-height:1.1}
.mid{font-size:22px;font-weight:750;letter-spacing:-.02em;font-variant-numeric:tabular-nums}
.up{color:var(--up)}.dn{color:var(--dn)}
.pill{display:inline-flex;align-items:center;gap:3px;padding:2px 0;border-radius:0;font-size:13px;font-weight:600;font-variant-numeric:tabular-nums;font-family:var(--mono);white-space:nowrap;background:transparent!important}
.pill.up{background:var(--upbg);color:var(--up)}.pill.dn{background:var(--dnbg);color:var(--dn)}
.pill svg{width:10px;height:10px;fill:currentColor}
.row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.row>*{flex:1 1 140px}
.between{display:flex;justify-content:space-between;align-items:center;gap:12px}
.logo-img{width:40px;height:40px;border-radius:0;object-fit:cover;background:var(--band);display:inline-flex;align-items:center;justify-content:center;color:var(--mut);font-size:11px;font-weight:800;flex:0 0 auto;letter-spacing:.02em}
.logo-img.lg{width:56px;height:56px;border-radius:0;font-size:14px}
.logo-img.sm{width:28px;height:28px;border-radius:0;font-size:9px}
img.logo-img{border:1px solid var(--line);box-sizing:border-box}
.logo-img.round{border-radius:50%!important}
.nm{display:flex;align-items:center;gap:4px;min-width:0}.nm>span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}.nm .badge{flex:0 0 auto}
.h2.nm .badge{width:20px;height:20px}
.seg{display:inline-flex;background:transparent;border-radius:0;padding:0;flex:0 0 auto;border-bottom:1px solid #000;gap:0}
.seg button{border:0;border-bottom:4px solid transparent;background:none;color:var(--mut);padding:8px 14px;border-radius:0;min-height:36px;font-weight:600;font-size:13px;margin-bottom:-1px}
.seg button.on{background:transparent;color:#000;box-shadow:none;border-bottom-color:var(--accent)}
.list{display:flex;flex-direction:column}
.item{display:flex;align-items:center;gap:12px;padding:12px 16px;cursor:pointer;border-bottom:1px solid var(--line);transition:background .15s;min-width:0}
.item:hover{background:var(--hover)}
.item:last-child{border-bottom:0}
.item .who{flex:1;min-width:0}
.item .t1{font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.item .t2{color:var(--mut);font-size:12.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.item .px{text-align:right;flex:0 0 auto}
.item .px .t1{font-variant-numeric:tabular-nums}
.panel{margin-bottom:12px}
.panel>.hd{padding:14px 16px 10px;display:flex;justify-content:space-between;align-items:center;gap:8px}
.panel>.hd h3{margin:0;font-size:15px;font-weight:750;letter-spacing:-.01em}
.spark{width:72px;height:28px;flex:0 0 auto}
.chart{position:relative;cursor:crosshair;touch-action:pan-y}
.chart svg{width:100%;display:block}
.chart .cgrid{stroke:var(--line);stroke-width:1;vector-effect:non-scaling-stroke}
.xh{display:none;position:absolute;top:0;bottom:0;width:1px;background:var(--mut);opacity:.7;pointer-events:none}
.tip{display:none;position:absolute;top:10px;background:#fff;color:var(--ink);border:1px solid #000;padding:6px 10px;border-radius:0;font-size:12px;font-weight:700;pointer-events:none;white-space:nowrap;transform:translateX(-50%);box-shadow:var(--shadow);font-variant-numeric:tabular-nums}
.pulse{display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--up);margin-right:6px;vertical-align:middle;box-shadow:0 0 0 0 rgba(17,138,78,.6);animation:pl 1.6s infinite}
@keyframes pl{0%{box-shadow:0 0 0 0 rgba(17,138,78,.55)}70%{box-shadow:0 0 0 7px rgba(17,138,78,0)}100%{opacity:1}}
.mstatus{display:inline-flex;align-items:center;gap:2px;font-size:12.5px;font-weight:650;color:var(--mut);letter-spacing:.01em}
.mstatus .live{color:var(--up);font-weight:700}
.stats{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:1px;background:var(--line);border-top:1px solid var(--line)}
.stats>div{background:var(--card);padding:14px 16px;min-width:0}
.stats b{display:block;font-size:15px;font-variant-numeric:tabular-nums;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px}
.empty{text-align:center;padding:56px 24px;background:#fff;border:2px solid #000;border-top-width:2px;box-shadow:none;margin-top:12px}
.empty h2{font-size:26px;font-weight:800;margin:0 0 8px;letter-spacing:-.03em}
.empty p{color:var(--mut);margin:0 auto 20px;max-width:400px}
.note{color:var(--mut);font-size:14px}
/* overview */
.hero-stage{position:relative;margin:8px 0 28px;padding:24px 0 0;overflow:hidden;
 background:repeating-radial-gradient(circle at 72% 38%,rgba(255,255,255,.13) 0 2px,transparent 2px 30px),radial-gradient(circle at 72% 38%,#43b6e6 0,#1a7fb5 38%,#0a4a73 80%)}
.hero-stage::after{content:"";position:absolute;right:16%;top:14%;width:160px;height:160px;border-radius:50%;background:radial-gradient(circle,#5fd0f2 0 28%,rgba(255,255,255,.9) 29% 31%,transparent 32%);pointer-events:none}
html[data-site=bse] .hero-stage{margin-left:calc(50% - 50vw);margin-right:calc(50% - 50vw);width:100vw;padding:28px calc(50vw - 50%) 0}
.hero{display:grid;gap:16px;grid-template-columns:minmax(0,1.7fr) minmax(240px,1fr);margin:0;position:relative;z-index:1;align-items:end;max-width:1240px}
html[data-site=bse] .hero-stage .hero{margin:0 auto;padding:0 32px}
.hero-main{padding:28px 32px 24px;background:#fff;border:2px solid #000;border-bottom:0;border-radius:0;overflow:hidden}
.hero-main .hero-top{padding:0;align-items:flex-start}
.hero-main .chart{margin-top:8px}
.kpis{display:flex;flex-direction:column;gap:12px;padding-bottom:0}
.kpis .tile{flex:1;background:#fff;border-top:4px solid #000}
.kpis .tile[data-go]:hover{cursor:pointer;background:var(--band)}
.cta{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:32px;margin:8px 0 28px;background:#000;color:#fff;border:0;border-radius:0}
.cta .t{font-weight:800;letter-spacing:-.02em;color:#fff}
.cta .lbl{color:rgba(255,255,255,.8)}
.cta button.primary,.cta .primary{background:var(--accent);color:#000;border-color:var(--accent)}
.cta button.primary:hover,.cta .primary:hover{background:#9ad8f2;color:#000}
.movers{display:grid;gap:12px;grid-template-columns:repeat(2,minmax(0,1fr));align-items:start}
.movers .panel{margin:0}
.newsfeed .item{cursor:default;display:block}
.newsfeed .item:hover{background:transparent}
/* tables */
table{width:100%;border-collapse:collapse;font-variant-numeric:tabular-nums;font-size:14px}
td,th{padding:11px 10px;border-bottom:1px solid var(--line);text-align:right;white-space:nowrap}
td:first-child,th:first-child{text-align:left}
th{color:var(--mut);font-weight:650;font-size:11.5px;text-transform:uppercase;letter-spacing:.05em}
.tbl{border:0;border-top:4px solid #000;border-radius:0;overflow:x auto;overflow:hidden;margin:8px 0 16px;background:#fff;box-shadow:0 1px 0 var(--line)}
.tr{display:grid;grid-template-columns:minmax(0,2.4fr) minmax(90px,1fr) 100px 100px minmax(90px,1fr) minmax(80px,.9fr);gap:12px;align-items:center;padding:12px 16px;border-bottom:1px solid var(--line);font-variant-numeric:tabular-nums}
.tr:last-child{border-bottom:0}
.tr>*{min-width:0;text-align:right}.tr>:first-child{text-align:left}
.tr.th{color:var(--mut);font-size:.9rem;font-weight:600;padding:14px 20px;background:#fff;text-transform:none;letter-spacing:0}
.tr.go{cursor:pointer;transition:background .15s}.tr.go:hover{background:var(--hover)}
.tr .co{display:flex;align-items:center;gap:12px;min-width:0}
.tr .co .who{min-width:0}.tr .t2{color:var(--mut);font-size:12.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tr .spark{width:100px;height:32px;justify-self:end}
.capm{display:none}
.tr.hold{grid-template-columns:minmax(0,2.4fr) minmax(70px,.8fr) minmax(80px,1fr) minmax(90px,1fr) minmax(90px,1fr) 100px}
.thb{all:unset;cursor:pointer;color:inherit;font:inherit;letter-spacing:inherit;text-transform:inherit;display:inline-flex;align-items:center;gap:4px;justify-content:flex-end}
.tr.th>:first-child .thb{justify-content:flex-start}
.thb:hover,.thb.on{color:var(--txt)}
.filters{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 14px}
.filters button{min-height:36px;font-size:13px;background:transparent;border-color:transparent;border-bottom:3px solid transparent;border-radius:0}
.filters button.on{border-bottom-color:var(--accent);color:#000;background:transparent}
.search{position:relative;margin-bottom:12px}
.search input{border-radius:0;padding-left:40px;background:#fff;border:0;border-bottom:2px solid #000}
.search svg{position:absolute;left:10px;top:13px;width:18px;height:18px;fill:var(--ink)}
.wide2{display:grid;gap:16px;grid-template-columns:minmax(0,1fr) 340px;align-items:start}
.rail{display:flex;flex-direction:column;gap:12px;position:sticky;top:100px}
.coname{font-size:24px;font-weight:800;letter-spacing:-.02em}
.big.xl{font-size:42px;letter-spacing:-.04em}
.cohead{padding:20px 20px 0;align-items:flex-start}
/* ticket / forms / misc */
.unv{display:flex;gap:10px;align-items:flex-start;padding:14px 16px;border-radius:0;background:#fff8e8;border:0;border-top:4px solid #c47d00;color:var(--txt);font-size:13px;line-height:1.45}
.unv svg{flex:0 0 auto;color:#f59e0b;margin-top:1px}.unv b{display:block;font-size:14px;margin-bottom:2px}.unv span{color:var(--mut)}
.cknote{display:flex;gap:8px;align-items:flex-start;color:var(--mut);font-size:12.5px;padding:8px 4px;line-height:1.45}.cknote svg{flex:0 0 auto;opacity:.8;margin-top:2px}
.banner{display:flex;gap:12px;align-items:center;padding:16px 18px;border-radius:0;background:#000;color:#fff;font-size:14px;margin-bottom:16px;border:0}
.banner b{font-weight:700}
.ticket{padding:18px}
.ticket .side{display:grid;grid-template-columns:1fr 1fr;background:transparent;border-radius:0;padding:0;margin-bottom:16px;border:0;border-bottom:1px solid #000}
.ticket .side button{border:0;border-bottom:4px solid transparent;min-height:40px;color:var(--mut);background:transparent;border-radius:0;margin-bottom:-1px}
.ticket .side button.on.b{background:transparent;color:var(--up);border-bottom-color:var(--up)}
.ticket .side button.on.s{background:transparent;color:var(--dn);border-bottom-color:var(--dn)}
.qty{display:flex;align-items:center;gap:8px}
.qty input{text-align:center;font-size:20px;font-weight:700;font-variant-numeric:tabular-nums}
.qty button{width:44px;height:44px;padding:0;flex:0 0 44px;font-size:20px;line-height:1}
.presets{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin:10px 0 14px}
.presets button{min-height:32px;font-size:13px;padding:0}
.sum{display:flex;justify-content:space-between;font-size:13.5px;padding:5px 0;color:var(--mut)}
.sum b{color:var(--txt);font-variant-numeric:tabular-nums}
.founder{display:inline-flex;align-items:center;gap:6px;color:var(--txt);font-size:14px;text-decoration:none}
.founder:hover{text-decoration:none;color:var(--accent)}
.founder img{width:22px;height:22px;border-radius:50%}
.founder.sq img{border-radius:4px}
.badge{width:18px;height:18px;flex:0 0 auto;vertical-align:-3px}
.badge.art{display:inline-block;background-position:center;background-size:85%;background-repeat:no-repeat;margin:0 1px 0 2px}
.h2.nm .badge,.coname .badge{width:22px;height:22px}
.dlg{max-width:560px;margin:0 auto}
.dlg.wide{max-width:760px}
.preview{display:flex;gap:12px;align-items:center;padding:14px;border:1px dashed var(--line2);border-radius:0;margin-bottom:16px;background:var(--band)}
.err{color:var(--dn);font-size:14px;min-height:20px;margin-bottom:6px}
#toast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);background:#000;color:#fff;padding:12px 18px;border-radius:0;font-size:14px;font-weight:650;z-index:80;box-shadow:0 8px 20px rgba(0,0,0,.18);max-width:90%;text-align:center;transition:opacity .2s;top:auto}
#toast.bad{background:var(--dn);color:#fff}
details.card summary{list-style:none;cursor:pointer;font-weight:800;font-size:17px}details.card summary::-webkit-details-marker{display:none}
.ad h3{margin:0 0 12px;font-size:16px;font-weight:750}
.ad .row{margin-bottom:8px}
.adgrid{display:grid;gap:12px;grid-template-columns:repeat(2,minmax(0,1fr));align-items:start}
.adgrid>.card{margin:0}.adgrid>.full{grid-column:1/-1}
/* portfolio */
.summary{display:grid;gap:12px;grid-template-columns:minmax(0,1.4fr) minmax(0,1fr);margin-bottom:16px}
.alloc{display:flex;height:10px;border-radius:0;overflow:hidden;background:var(--band);margin:12px 0 8px;border:1px solid var(--line)}
.alloc>span{display:block;height:100%}
.alloc-leg{display:flex;flex-wrap:wrap;gap:10px 16px;font-size:12px;color:var(--mut)}
.alloc-leg i{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:6px}
/* footer + dock */
.bsefoot{max-width:1240px;margin:16px auto 0;padding:40px 32px 56px;border-top:1px solid var(--line);color:var(--mut);font-size:.92rem}
.bsefoot .flinks{display:flex;flex-wrap:wrap;gap:8px 18px;margin-bottom:14px}
.bsefoot a{color:var(--mut);font-weight:600}
.bsefoot a:hover{color:var(--txt)}
.dock{display:none}
@media(max-width:980px){
 .wide2{grid-template-columns:minmax(0,1fr) 300px}
 .tr{grid-template-columns:minmax(0,2fr) minmax(80px,1fr) 84px 80px minmax(80px,1fr)}
 .tr>:nth-child(6){display:none}
 .tr.hold{grid-template-columns:minmax(0,2fr) 70px minmax(80px,1fr) minmax(80px,1fr) minmax(80px,1fr)}
 .hsearch{width:min(200px,22vw)}
 .wordmark .bname{display:none}
 .wordmark .logo-wrap .logo{height:40px}
 .stats{grid-template-columns:repeat(3,1fr)}
}
@media(max-width:820px){
 .wide2{grid-template-columns:minmax(0,1fr);gap:12px}
 .lcol{display:contents!important}.lcol>.card{order:1}.rail{order:2}.lcol>:not(.card){order:3}
 .rail{position:static}.adgrid{grid-template-columns:minmax(0,1fr)}
 .summary{grid-template-columns:1fr}
}
@media(max-width:800px){
 html[data-site=bse]{--dock-h:64px}
 html[data-site=bse] .hnav,html[data-site=bse] .hsearch,html[data-site=bse] .bsehead .glink,html[data-site=bse] .bal span.lab{display:none}
 .dock{display:flex;position:fixed;left:0;right:0;bottom:0;z-index:25;background:#fff;border-top:1px solid #000;padding:6px 8px calc(6px + env(safe-area-inset-bottom));justify-content:space-around}
 .dock a{flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;color:var(--mut);text-decoration:none;font-size:10px;font-weight:650;padding:6px 4px;border-radius:0}
 .dock a svg{width:22px;height:22px;fill:currentColor}
 .dock a.on{color:#000}
 .dock a:hover{text-decoration:none;background:var(--band)}
 .bsefoot{padding-bottom:24px}
}
@media(max-width:700px){
 .hero{grid-template-columns:minmax(0,1fr)}
 .kpis{display:grid;grid-template-columns:1fr 1fr}
 .kpis>.tile:nth-child(3){grid-column:1/-1}
 .movers{grid-template-columns:minmax(0,1fr)}
 .tr{grid-template-columns:minmax(0,1fr) auto;gap:4px 12px}
 .tr>:nth-child(n+3){display:none}.tr.th{display:none}.capm{display:block!important;margin-top:2px}.dsk{display:none}
 .tr.hold{grid-template-columns:minmax(0,1fr) auto}
 .big.xl{font-size:34px}.coname{font-size:20px}
 .stats{grid-template-columns:repeat(2,1fr)}.m{display:none}
 main{padding:14px 14px 28px}.big{font-size:28px}.spark{width:56px}.item{padding:12px}
 .cta{flex-direction:column;align-items:flex-start}
 .bsehead{padding:0 16px;height:64px;gap:16px}
 .wordmark .logo-wrap .logo{height:36px}
 .hero-main{padding:22px 18px 18px}
 html[data-site=bse] .hero-stage .hero{padding:0 16px}
 .hero-stage::after{right:6%;width:110px;height:110px}
}
/* ---------- home page (from the bse.jye.fyi / bse.jye.supply homepage) ---------- */
html[data-site=bse]{scroll-behavior:smooth;scroll-padding-top:110px}
main.hm{max-width:none;padding:0;margin:0;font:400 17px/1.6 var(--sans);color:var(--txt)}
.hm a{color:inherit;text-decoration:none}
.hm h1,.hm h2,.hm h3{margin:0;color:var(--ink);letter-spacing:-.025em;line-height:1.08;font-family:var(--sans)}
.hm h1{font-size:clamp(2.3rem,5vw,3.6rem);font-weight:800}
.hm h2{font-size:clamp(1.8rem,3.4vw,2.6rem);font-weight:800;margin-bottom:16px}
.hm h3{font-size:1.25rem;font-weight:700;margin-bottom:8px}
.hm p{margin:0 0 14px;max-width:68ch}
.hm .muted{color:var(--mut)}
.hm-wrap{max-width:1240px;margin:0 auto;padding:0 32px}
.hm-notice{background:#000;color:#fff;text-align:center;padding:26px 24px;font:700 1.5rem/1.3 var(--sans);letter-spacing:-.02em}
.hm-notice a{color:var(--accent);text-decoration:none}
.hm-notice a:hover{text-decoration:underline}
.hm-delay{text-align:right;font-size:.9rem;font-style:italic;color:var(--ink);margin:14px auto 0;max-width:1240px;padding:0 32px}
.hm-hero{position:relative;min-height:640px;display:flex;align-items:flex-end;margin-top:20px;overflow:hidden;
 background:repeating-radial-gradient(circle at 72% 38%,rgba(255,255,255,.13) 0 2px,transparent 2px 30px),radial-gradient(circle at 72% 38%,#43b6e6 0,#1a7fb5 38%,#0a4a73 80%)}
.hm-hero::after{content:"";position:absolute;right:16%;top:18%;width:210px;height:210px;border-radius:50%;background:radial-gradient(circle,#5fd0f2 0 28%,rgba(255,255,255,.9) 29% 31%,transparent 32%)}
.hm-card{position:relative;z-index:1;background:#fff;border:2px solid #000;border-bottom:0;max-width:760px;padding:44px 48px 40px;margin-left:calc(max(32px,(100vw - 1240px)/2 + 32px))}
.hm-card p{font-size:1.2rem;margin:16px 0 24px}
.hm-cta{display:flex;gap:12px;flex-wrap:wrap}
.hm .hm-btn{display:inline-block;font:600 1rem var(--sans);padding:14px 26px;text-decoration:none;background:#000;color:#fff;border:2px solid #000;border-radius:0}
.hm .hm-btn:hover{background:#222;text-decoration:none}
.hm .hm-btn.alt{background:#fff;color:#000}
.hm .hm-btn.alt:hover{background:var(--band)}
.hm-sec{padding:84px 0}
.hm-sec.band{background:var(--band)}
.hm-kicker{font-weight:700;font-size:1rem;color:var(--ink);border-bottom:3px solid var(--accent);display:inline-block;padding-bottom:4px;margin-bottom:18px}
.hm-cols{display:grid;grid-template-columns:1fr 1fr;gap:32px;margin-top:32px}
.hm-box{background:#fff;border-top:4px solid #000;padding:26px 28px 22px;box-shadow:0 1px 0 var(--line)}
.hm-box.blue{border-top-color:var(--accent)}
.hm-box ul{margin:0;padding-left:20px}
.hm-box li{margin-bottom:8px}
.hm-more{display:flex;gap:12px;flex-wrap:wrap;margin-top:28px}
.hm table{width:100%;border-collapse:collapse}
.hm-tbl{background:#fff;border-top:4px solid #000;overflow-x:auto;margin-top:28px}
.hm-tbl th,.hm-tbl td{padding:15px 20px;text-align:left;border-bottom:1px solid var(--line);vertical-align:top;font-family:var(--sans);font-feature-settings:normal}
.hm-tbl th{font-weight:600;font-size:.9rem;color:var(--mut)}
.hm-tbl code,.hm .mono{font-family:var(--mono);font-size:.92rem}
.hm-tbl td.r,.hm-tbl th.r{text-align:right}
.hm-tbl td.mono{font-family:var(--mono)}
.hm-tbl tbody tr:hover td{background:var(--band)}
.hm-verb{display:inline-block;font:500 .75rem var(--mono);background:#000;color:#fff;padding:2px 8px;margin-right:10px}
.hm-verb.g{background:var(--accent);color:#000}
.hm-up{color:var(--up)}.hm-down{color:var(--dn)}
.hm-tabs{display:flex;gap:0;margin-top:28px;border-bottom:1px solid #000}
.hm-tab{font:600 1rem var(--sans);padding:12px 22px;border:0;border-radius:0;background:transparent;cursor:pointer;color:var(--mut);border-bottom:4px solid transparent;margin-bottom:-1px;min-height:0}
.hm-tab[aria-selected="true"]{color:#000;border-bottom-color:var(--accent)}
.hm pre{margin:0;background:#000;color:#e9eef1;padding:24px 28px;overflow-x:auto;font:400 .92rem/1.7 var(--mono)}
.hm pre[hidden]{display:none}
.hm .c{color:#8a98a0}.hm .k{color:var(--accent)}.hm .s{color:#9be3b8}
.hm-steps{list-style:none;margin:32px 0 0;padding:0;display:grid;grid-template-columns:repeat(4,1fr);gap:24px;counter-reset:s}
.hm-steps li{counter-increment:s;border-top:4px solid #000;padding-top:14px}
.hm-steps li::before{content:counter(s);font:800 2rem var(--sans);color:var(--ink);display:block;margin-bottom:4px}
.hm-steps p{font-size:.97rem;color:var(--mut)}
.hm-three{display:grid;grid-template-columns:repeat(3,1fr);gap:32px;margin-top:32px}
.hm-three .hm-box p{color:var(--mut);margin:0;font-size:.98rem}
.hm-road{list-style:none;margin:32px 0 0;padding:0;border-top:1px solid #000}
.hm-road li{display:grid;grid-template-columns:240px 1fr;gap:24px;padding:22px 0;border-bottom:1px solid var(--line)}
.hm-road b{font-size:1.15rem;color:var(--ink)}
.hm-road span{color:var(--mut)}
.hm details{border-bottom:1px solid var(--line);padding:18px 0;background:transparent;border-radius:0}
.hm summary{cursor:pointer;font-weight:600;font-size:1.1rem;color:var(--ink)}
.hm details p{margin:10px 0 0;color:var(--mut)}
.hm-join{background:#000;color:#fff;padding:64px 0}
.hm-join h2{color:#fff}
.hm-join p{opacity:.85}
.hm-join .hm-btn{background:var(--accent);border-color:var(--accent);color:#000}
.hm-join .hm-btn:hover{background:#9ad8f2}
.hm-join .hm-btn.alt{background:transparent;color:#fff;border-color:#fff}
.hm-join .hm-btn.alt:hover{background:#222}
@media(max-width:900px){.hm-steps{grid-template-columns:1fr 1fr}}
@media(max-width:860px){.hm-three{grid-template-columns:1fr}}
@media(max-width:800px){.hm-hero{min-height:520px}.hm-hero::after{right:8%;width:130px;height:130px}.hm-card{margin-left:0;padding:28px 22px;max-width:none;border-left:0;border-right:0}.hm-cols{grid-template-columns:1fr}.hm-sec{padding:56px 0}}
@media(max-width:700px){.hm-road li{grid-template-columns:1fr;gap:4px}.hm-wrap,.hm-delay{padding:0 20px}}
@media(max-width:640px){.hm-notice{font-size:1.15rem;padding:18px}}
@media(max-width:520px){.hm-steps{grid-template-columns:1fr}}
@media(prefers-reduced-motion:reduce){html[data-site=bse]{scroll-behavior:auto}}
.hm+.bsefoot{margin-top:0}
.bsefoot .fine{display:flex;justify-content:space-between;gap:8px 16px;flex-wrap:wrap;margin-top:18px;padding-top:16px;border-top:1px solid var(--line);font-size:.88rem}
/*---SCRIPT---*/
(function(){
var B=window.TRADEX,CSRF=B.csrf,COIN=B.coin,SITE=B.site||'app',HOME=B.home||'',BSE_NAME=B.name||'Bloxburg Stock Exchange',BSE_SHORT=B.short||'BSE';
var db=B.state;
var framed=window.top!==window && SITE!=='bse';
var $=function(s){return document.querySelector(s)};
var esc=function(s){return String(s==null?'':s).replace(/[&<>"']/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]})};
var fmt=function(n){return '$'+Number(n).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})};
var fp=function(n){n=Number(n);return n<1?'$'+n.toFixed(4):fmt(n)};
var big=function(n){return n>=1e12?'$'+(n/1e12).toFixed(2)+'T':n>=1e9?'$'+(n/1e9).toFixed(2)+'B':n>=1e6?'$'+(n/1e6).toFixed(2)+'M':fmt(n)};
var pct=function(a,b){return b?(a-b)/b*100:0};
var sg=function(x){return (x>=0?'+':'')+x.toFixed(2)+'%'};
var chg=function(c){return pct(c.price,c.prevClose)};
var qn=function(q){return Number(q).toLocaleString('en-US',{maximumFractionDigits:4})};
var coin='<span class=coin title="Money"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="'+COIN+'"/></svg></span>';
var eq=function(n){return coin+fmt(n)};
var C=function(id){return db.companies.find(function(x){return x.id===id})};
var CT=function(t){return db.companies.find(function(x){return x.ticker===String(t||'').toUpperCase()})};
var Q=new URLSearchParams(location.search);
var PAGES=['list','acct','admin','new','edit'];
function bootRoute(){
 if(SITE==='bse'){
  var path=location.pathname.replace(/\/+$/,'')||'/';
  if(path==='/markets'||path==='/list')return {page:'list'};
  if(path==='/portfolio')return {page:'acct'};
  if(path==='/admin')return {page:'admin'};
  if(path==='/new'||path==='/list-company')return {page:'new'};
  var m=path.match(/^\/c\/([A-Za-z]{2,5})(?:\/(edit))?$/i);
  if(m)return {page:m[2]?'edit':'co',ticker:m[1]};
  if(path==='/overview')return {page:'dash'};
  return {page:Q.get('c')?'co':'home',ticker:Q.get('c')};
 }
 return {page:Q.get('c')&&Q.get('p')!=='edit'?'co':(PAGES.indexOf(Q.get('p'))>=0?Q.get('p'):'dash'),ticker:Q.get('c')};
}
var R=bootRoute();
var S={page:R.page,cid:null,range:90,ir:150,side:'buy',q:'',find:'',sort:'mcap',dir:-1,sector:'',qtop:''};
if(R.ticker){var c0=CT(R.ticker);S.cid=c0?c0.id:null}
var AD=null,EDIT=null,BUSY=false;

/* ---------- the client's theme and colour ---------- */
function theme(){
 document.documentElement.setAttribute('data-theme','light');
 var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute('content','#ffffff');
}
theme();

function api(path,body){
 return fetch('/i/markets/api/'+path,body===undefined?{credentials:'same-origin'}:{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json','x-csrf-token':CSRF||''},body:JSON.stringify(body)})
  .then(function(r){return r.json().catch(function(){return {error:'Something went wrong'}}).then(function(j){if(!r.ok)throw new Error(j.error||(j.errors&&j.errors[0]&&j.errors[0].message)||'Something went wrong');return j})});
}
function pathOf(p,x){
 if(SITE==='bse'){
  if(p==='home')return '/';
  if(p==='dash')return '/overview';
  if(p==='list')return '/markets';
  if(p==='acct')return '/portfolio';
  if(p==='admin')return '/admin';
  if(p==='new')return '/new';
  var c=C(x);var tk=c?c.ticker:x;
  if(p==='edit')return '/c/'+tk+'/edit';
  return '/c/'+tk;
 }
 var q=new URLSearchParams();
 if(Q.has('embed'))q.set('embed',Q.get('embed'));
 if(p==='co'||p==='edit'){var c=C(x);q.set('c',c?c.ticker:x)}
 if(p!=='dash'&&p!=='co')q.set('p',p);
 var s=q.toString();
 return (location.pathname.indexOf('/i/markets')===0?location.pathname:'/i/markets')+(s?'?'+s:'');
}
function go(p,x){location.assign(pathOf(p,x))}
function signInHref(){return SITE==='bse'?'/login?next='+encodeURIComponent(location.pathname+location.search):'/i/flow/login'}
// links to the client's own pages move the client, not the frame
function client(path){try{if(framed&&parent.__xitterGo){parent.__xitterGo(path);return}}catch(e){}top.location.assign(path)}
var toastT;
function toast(msg,bad){
 var t=$('#toast');if(!t){t=document.createElement('div');t.id='toast';document.body.appendChild(t)}
 t.textContent=msg;t.className=bad?'bad':'';t.style.opacity=1;t.style.top='auto';
 t.style.bottom=(SITE==='bse'&&innerWidth<800)?'80px':(framed?'24px':'24px');
 clearTimeout(toastT);toastT=setTimeout(function(){t.style.opacity=0},2600);
}
function viewTop(){try{if(framed){var r=frameElement.getBoundingClientRect();if(r.top<0)parent.scrollBy(0,r.top)}}catch(e){}window.scrollTo(0,0)}

/* ---------- PIECES ---------- */
// the checkmarks the site draws (X's own): blue, the gold organisation badge, grey for government
var BLUE_CHECK='M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z',GOLD_CHECK='<linearGradient gradientUnits="userSpaceOnUse" id="IDa" x1="4.411" x2="18.083" y1="2.495" y2="21.508"><stop offset="0" stop-color="#f4e72a"/><stop offset=".539" stop-color="#cd8105"/><stop offset=".68" stop-color="#cb7b00"/><stop offset="1" stop-color="#f4ec26"/><stop offset="1" stop-color="#f4e72a"/></linearGradient><linearGradient gradientUnits="userSpaceOnUse" id="IDb" x1="5.355" x2="16.361" y1="3.395" y2="19.133"><stop offset="0" stop-color="#f9e87f"/><stop offset=".406" stop-color="#e2b719"/><stop offset=".989" stop-color="#e2b719"/></linearGradient><g clip-rule="evenodd" fill-rule="evenodd"><path d="M13.324 3.848L11 1.6 8.676 3.848l-3.201-.453-.559 3.184L2.06 8.095 3.48 11l-1.42 2.904 2.856 1.516.559 3.184 3.201-.452L11 20.4l2.324-2.248 3.201.452.559-3.184 2.856-1.516L18.52 11l1.42-2.905-2.856-1.516-.559-3.184zm-7.09 7.575l3.428 3.428 5.683-6.206-1.347-1.247-4.4 4.795-2.072-2.072z" fill="url(#IDa)"/><path d="M13.101 4.533L11 2.5 8.899 4.533l-2.895-.41-.505 2.88-2.583 1.37L4.2 11l-1.284 2.627 2.583 1.37.505 2.88 2.895-.41L11 19.5l2.101-2.033 2.895.41.505-2.88 2.583-1.37L17.8 11l1.284-2.627-2.583-1.37-.505-2.88zm-6.868 6.89l3.429 3.428 5.683-6.206-1.347-1.247-4.4 4.795-2.072-2.072z" fill="url(#IDb)"/><path d="M6.233 11.423l3.429 3.428 5.65-6.17.038-.033-.005 1.398-5.683 6.206-3.429-3.429-.003-1.405.005.003z" fill="#d18800"/></g>',BN=0;
function badge(t){if(!t)return '';var art=db.checks&&db.checks[t==='business'?'gold':t.indexOf('government')===0?'grey':'blue'];if(art)return '<span class="badge art" role=img aria-label="'+(t==='business'?'Verified organization':t==='blue'?'Verified account':'Government account')+'" style="background-image:url(\''+esc(art)+'\')"></span>';var lbl=t==='business'?'Verified organization':t==='blue'?'Verified account':'Government account';if(t==='business'){var id='xb'+(BN++);return '<svg class=badge viewBox="0 0 22 22" role=img aria-label="'+lbl+'">'+GOLD_CHECK.replace(/ID/g,id)+'</svg>'}return '<svg class=badge viewBox="0 0 22 22" role=img aria-label="'+lbl+'"><path fill="'+(t==='blue'?'#1d9bf0':'#829aab')+'" d="'+BLUE_CHECK+'"/></svg>'}
var ARROW_UP='<svg viewBox="0 0 10 10"><path d="M5 1l4 6H1z"/></svg>',ARROW_DN='<svg viewBox="0 0 10 10"><path d="M5 9L1 3h8z"/></svg>';
var pill=function(x){return '<span class="pill '+(x>=0?'up':'dn')+'">'+(x>=0?ARROW_UP:ARROW_DN)+Math.abs(x).toFixed(2)+'%</span>'};
// a company wears its founder's picture (round for people, rounded-square for organisations), else its logo, else its ticker
var logo=function(c,cls){return c.img?'<img class="logo-img '+(cls||'')+(c.sq?'':' round')+'" src="'+esc(c.img)+'" alt="" data-tk="'+esc(c.ticker.slice(0,4))+'">':'<span class="logo-img '+(cls||'')+'">'+esc(c.ticker.slice(0,4))+'</span>'};
// its name with the founder's checkmark
function nm(c,cls){return '<div class="nm '+(cls||'')+'"><span>'+esc(c.name)+'</span>'+badge(c.owner&&c.owner.badge)+'</div>'}
function founder(o){if(!o)return '';return '<a class="founder'+(o.sq?' sq':'')+'" href="/'+esc(o.handle)+'" data-client="/'+esc(o.handle)+'"><img src="'+esc(o.avatar)+'" alt=""><b>'+esc(o.name)+'</b>'+badge(o.badge)+'<span class=lbl>@'+esc(o.handle)+'</span></a>'}
function headlines(){
 if(!db.headlines.length)return '';
 return '<div class=news><span class="tag live">MARKET HEADLINES</span><div class=track>'+db.headlines.map(function(h){return (h.brk?'<span class="tag brk">BREAKING</span>':'')+'<span class=lbl>'+esc(h.cat)+'</span><span>'+(h.ticker?'<b>'+esc(h.ticker)+'</b> ':'')+esc(h.text)+'</span>'}).join('<span class=dot>·</span>')+'</div></div>'}
var CH={};
function path(v,W,H,pad){var mn=Math.min.apply(null,v),mx=Math.max.apply(null,v),r=(mx-mn)||1;return v.map(function(y,i){return (i/(v.length-1)*W).toFixed(1)+','+(H-pad-(y-mn)/r*(H-2*pad)).toFixed(1)}).join(' ')}
function chart(h,key,H,colOverride){
 H=H||220;
 if(h.length<2)return '<div class=lbl style="padding:40px 16px;text-align:center">Collecting live prices…</div>';
 var v=h.map(function(x){return x[1]}),up=v[v.length-1]>=v[0],col=colOverride||(up?'var(--up)':'var(--dn)'),W=640,pad=12,line=path(v,W,H,pad),id='g'+key;
 CH[key]=h;
 var mn=Math.min.apply(null,v),mx=Math.max.apply(null,v),r=(mx-mn)||1;
 var ly=(H-pad-(v[v.length-1]-mn)/r*(H-2*pad)).toFixed(1),grid='';
 for(var i=1;i<=3;i++) grid+='<line class=cgrid x1="0" y1="'+(H*i/4).toFixed(1)+'" x2="'+W+'" y2="'+(H*i/4).toFixed(1)+'"/>';
 return '<div class=chart data-hov="'+key+'"><svg viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="none" style="height:'+H+'px"><defs><linearGradient id="'+id+'" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="'+col+'" stop-opacity=".32"/><stop offset="1" stop-color="'+col+'" stop-opacity="0"/></linearGradient></defs>'+grid+'<polygon points="0,'+H+' '+line+' '+W+','+H+'" fill="url(#'+id+')"/><polyline fill="none" stroke="'+col+'" stroke-width="2.25" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke" points="'+line+'"/><circle cx="'+W+'" cy="'+ly+'" r="3.5" fill="'+col+'"/></svg><div class=xh></div><div class=tip></div></div>'}
function hov(e,el){var d=CH[el.getAttribute('data-hov')];if(!d||!d.length)return;var r=el.getBoundingClientRect(),x=(e.touches?e.touches[0].clientX:e.clientX),f=Math.min(1,Math.max(0,(x-r.left)/r.width));var p=d[Math.round(f*(d.length-1))],xh=el.querySelector('.xh'),tip=el.querySelector('.tip');xh.style.display='block';xh.style.left=(f*100)+'%';tip.style.display='block';tip.style.left=Math.min(Math.max(f*100,12),88)+'%';tip.textContent=fp(p[1])+' · '+new Date(p[0]).toLocaleTimeString([], {hour:'numeric',minute:'2-digit',second:'2-digit'})}
function unhov(el){el.querySelector('.xh').style.display='none';el.querySelector('.tip').style.display='none'}
['mousemove','touchmove'].forEach(function(ev){document.addEventListener(ev,function(e){var el=e.target.closest&&e.target.closest('[data-hov]');document.querySelectorAll('[data-hov]').forEach(function(x){if(x!==el)unhov(x)});if(el)hov(e,el)},{passive:true})});
document.addEventListener('mouseleave',function(){document.querySelectorAll('[data-hov]').forEach(unhov)});
function spark(c){var h=c.hist.slice(-30);if(h.length<2)return '<span class=spark></span>';var v=h.map(function(x){return x[1]}),col=v[v.length-1]>=v[0]?'var(--up)':'var(--dn)';return '<svg class=spark viewBox="0 0 72 28" preserveAspectRatio="none"><polyline fill="none" stroke="'+col+'" stroke-width="1.75" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke" points="'+path(v,72,28,3)+'"/></svg>'}
function item(c,right){return '<div class=item data-go="co" data-id="'+c.id+'">'+logo(c)+'<div class=who>'+nm(c,'t1')+'<div class=t2>'+esc(c.ticker)+(c.sector?' · '+esc(c.sector):'')+(c.suspended?' · Suspended':'')+'</div></div>'+spark(c)+'<div class=px>'+(right||('<div class="t1 num">'+fp(c.price)+'</div>'+pill(chg(c))))+'</div></div>'}
var SHIELD='<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6z"/><path d="M12 8v4.5M12 16h.01"/></svg>';
function verified(c){return !!(c&&c.owner&&c.owner.badge)}
function unvText(){return 'Companies without a checkmark aren\'t officially verified by '+esc(db.instance||'us')+'.'}
function unvBanner(){return '<div class=unv role=note>'+SHIELD+'<div><b>Unverified company</b><span>'+unvText()+' Do your own research before trading.</span></div></div>'}
function checkNote(){return '<div class=cknote>'+SHIELD+'<span>A checkmark next to a company means its founder is verified. '+unvText()+(SITE!=='bse'&&B.bse?' <a href="'+esc(B.bse)+'">Open the BSE site</a>':'')+'</span></div>'}
function listCta(){
 if(!db.me||!db.me.canList)return '';
 return '<div class=cta><div><div class=t>List your company</div><div class=lbl style="margin-top:2px">'+(db.admin?'Staff can list any number of companies.':'Any account can list up to '+db.me.ownMax+' companies ('+db.me.owned+' listed).'+(db.me.badge?'':' Without a checkmark, yours show as unverified.'))+'</div></div><button class=primary data-go="new" style="flex:0 0 auto">List a company</button></div>';
}
function emptyMarket(){return '<div class="card empty"><h2>No companies yet</h2><p>Nothing is listed on the market yet. Anyone with an account can list a company'+(db.me&&db.me.canList?' right now.':'.')+'</p>'+(db.me&&db.me.canList?'<button class=primary data-go="new">List a company</button>':'')+'</div>'}
function moneyBanner(){
 if(!db.money.on)return '<div class=banner><span class=coin style="font-size:20px;flex:0 0 auto">'+coin+'</span><div><b>Trading opens when Money is turned on.</b> '+(db.admin?'Turn on Money under Admin › Features, and every account trades with its own balance.':'Prices are live, but buying and selling waits for '+esc(db.money.name)+'.')+'</div></div>';
 return '';
}


function dayPnL(){if(!db.me)return 0;return Object.keys(db.me.holdings).reduce(function(s,id){var c=C(id),h=db.me.holdings[id];return s+(c?(c.price-c.prevClose)*h.qty:0)},0)}
function allocBlock(){
 var me=db.me;if(!me)return '';
 var rows=Object.keys(me.holdings).map(function(id){var c=C(id),h=me.holdings[id];return c?{c:c,v:c.price*h.qty}:null}).filter(Boolean).sort(function(a,b){return b.v-a.v});
 var cash=me.cash||0,hv=rows.reduce(function(s,e){return s+e.v},0),tot=cash+hv;
 if(!(tot>0))return '<div class=lbl>Nothing allocated yet.</div>';
 var cols=['#7bcdee','#0a4a73','#118a4e','#c62828','#1a7fb5','#c47d00','#5b5b5b','#43b6e6'];
 var parts=rows.slice(0,7).map(function(e,i){return {n:e.c.ticker,v:e.v,col:cols[i%cols.length]}});
 if(rows.length>7) parts.push({n:'Other',v:rows.slice(7).reduce(function(s,e){return s+e.v},0),col:cols[7]});
 if(cash>0) parts.push({n:'Money',v:cash,col:'#5b5b5b'});
 return '<div class=alloc aria-hidden="true">'+parts.map(function(p){return '<span style="width:'+(p.v/tot*100).toFixed(2)+'%;background:'+p.col+'"></span>'}).join('')+'</div>'
  +'<div class=alloc-leg>'+parts.map(function(p){return '<span><i style="background:'+p.col+'"></i>'+esc(p.n)+' '+(p.v/tot*100).toFixed(0)+'%</span>'}).join('')+'</div>';
}
function newsFeed(){
 if(!db.headlines.length)return '';
 return '<section class="panel newsfeed"><div class=hd><h3>Headlines</h3></div><div class=list>'+db.headlines.slice(0,8).map(function(h){
  return '<div class=item>'+(h.brk?'<span class="tag brk">Breaking</span> ':'')+'<span class=lbl>'+esc(h.cat)+(h.ticker?' · '+esc(h.ticker):'')+' · '+new Date(h.t).toLocaleDateString()+'</span><div style="margin-top:4px">'+(h.ticker?'<b>'+esc(h.ticker)+'</b> ':'')+esc(h.text)+'</div></div>';
 }).join('')+'</div></section>';
}
function filteredCompanies(){
 var f=(S.find||'').trim().toLowerCase(),sec=S.sector||'';
 var rows=db.companies.filter(function(c){if(sec&&c.sector!==sec)return false;return !f||c.ticker.toLowerCase().indexOf(f)>=0||c.name.toLowerCase().indexOf(f)>=0||(c.sector||'').toLowerCase().indexOf(f)>=0});
 var key=S.sort||'mcap',dir=S.dir|| -1;
 var val=function(c){return key==='name'?c.name.toLowerCase():key==='price'?c.price:key==='chg'?chg(c):key==='vol'?c.volume:c.price*c.shares};
 return rows.slice().sort(function(a,b){var x=val(a),y=val(b);return x<y?-dir:x>y?dir:0});
}
function sortBtn(key,label){
 var on=S.sort===key;
 return '<button type="button" class="thb'+(on?' on':'')+'" data-sort="'+key+'">'+label+(on?(S.dir>0?' ↑':' ↓'):'')+'</button>';
}
function sectorBar(){
 var secs=[''].concat(db.sectors||[]).filter(function(s,i,a){return a.indexOf(s)===i});
 if(secs.length<2)return '';
 return '<div class=filters role=tablist aria-label="Sector">'+secs.map(function(s){return '<button type="button" class="'+(S.sector===s?'on':'')+'" data-sector="'+esc(s)+'">'+(s||'All')+'</button>'}).join('')+'</div>';
}
function logoImgs(){
 return '<span class="logo-wrap" aria-hidden="true"><img class="logo logo-on-dark" src="/public/bse-logo-light.svg" alt=""><img class="logo logo-on-light" src="/public/bse-logo.svg" alt=""></span>';
}
var SEARCH_ICO='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10.25 3.75c-3.59 0-6.5 2.91-6.5 6.5s2.91 6.5 6.5 6.5c1.795 0 3.419-.726 4.596-1.904 1.178-1.177 1.904-2.801 1.904-4.596 0-3.59-2.91-6.5-6.5-6.5zm-8.5 6.5c0-4.694 3.806-8.5 8.5-8.5s8.5 3.806 8.5 8.5c0 1.986-.682 3.815-1.824 5.262l4.781 4.781-1.414 1.414-4.781-4.781c-1.447 1.142-3.276 1.824-5.262 1.824-4.694 0-8.5-3.806-8.5-8.5z"/></svg>';
function tape(){
 if(SITE!=='bse'||!db.companies.length)return '';
 var rows=db.companies.filter(function(c){return !c.suspended}).slice().sort(function(a,b){return b.price*b.shares-a.price*a.shares});
 var chips=rows.map(function(c){var x=chg(c);return '<a class=chip href="'+pathOf('co',c.id)+'" data-go="co" data-id="'+c.id+'"><span class=nm>'+esc(c.name)+'</span><span>'+esc(c.ticker)+'</span><span class=mono>'+fp(c.price)+'</span><span class="'+(x>=0?'u':'d')+'">'+(x>=0?'▲':'▼')+' '+Math.abs(x).toFixed(2)+'%</span></a>'}).join('');
 return '<div class=tape aria-label="Live market prices"><div class=tick-row><div class=tick-mkt>BSE<svg viewBox="0 0 12 8" aria-hidden="true"><path d="M1 2l5 5 5-5"/></svg></div><div class=lane><div class=track>'+chips+chips+'</div></div></div></div>';
}
function refreshTape(){var el=$('.tape');if(!el)return;var n=tape();if(n)el.outerHTML=n}
function showSuggest(q){
 var box=$('#qsug');if(!box)return;
 q=(q||'').trim().toLowerCase();
 if(!q){box.className='';box.innerHTML='';return}
 var hits=db.companies.filter(function(c){return c.ticker.toLowerCase().indexOf(q)>=0||c.name.toLowerCase().indexOf(q)>=0}).slice(0,6);
 if(!hits.length){box.className='';box.innerHTML='';return}
 box.innerHTML=hits.map(function(c){return '<a href="'+pathOf('co',c.id)+'" data-go="co" data-id="'+c.id+'">'+logo(c,'sm')+'<span><b>'+esc(c.ticker)+'</b> <span class=lbl>'+esc(c.name)+'</span></span><span class=num>'+fp(c.price)+'</span></a>'}).join('');
 box.className='open';
}
function siteFoot(){
 var note=checkNote();
 if(SITE!=='bse')return note;
 var links='<a href="/" data-go="home">Home</a><a href="/markets" data-go="list">Listings</a><a href="/overview" data-go="dash">Market Data</a>'
  +(db.me?'<a href="/portfolio" data-go="acct">Portfolio</a>':'<a href="'+esc(signInHref())+'">Sign in</a>')
  +(db.me&&db.me.canList?'<a href="/new" data-go="new">List a company</a>':'')
  +(HOME?'<a href="'+esc(HOME)+'">'+esc(db.instance||'Bloxburg Social')+'</a>':'');
 return '<footer class=bsefoot><a class="wordmark brand" href="/" data-go="home" aria-label="'+esc(BSE_SHORT)+'">'+logoImgs()+'</a><div class=flinks>'+links+'</div>'+note+'<div class=fine><span>© 2026 Bloxburg Stock Exchange · BloxburgStockExchange.Org</span><span>Independent community project. Not affiliated with Roblox, Welcome to Bloxburg or the NYSE.</span></div></footer>';
}
function dockNav(){
 if(SITE!=='bse')return '';
 var ico={dash:'<svg viewBox="0 0 24 24"><path d="M4 19h16v2H4zM5 11h3v7H5zm5-6h3v13h-3zm5 4h3v9h-3z"/></svg>',home:'<svg viewBox="0 0 24 24"><path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z"/></svg>',list:'<svg viewBox="0 0 24 24"><path d="M5 5h14v2H5zm0 6h14v2H5zm0 6h14v2H5z"/></svg>',acct:'<svg viewBox="0 0 24 24"><path d="M12 3a5 5 0 110 10 5 5 0 010-10zm0 12c4.4 0 8 2.2 8 5v2H4v-2c0-2.8 3.6-5 8-5z"/></svg>'};
 var items=[['home','Home',ico.home],['list','Markets',ico.list],['dash','Data',ico.dash]].concat(db.me?[['acct','Portfolio',ico.acct]]:[['signin','Sign in',ico.acct]]);
 return '<nav class=dock aria-label="Primary">'+items.map(function(t){
  if(t[0]==='signin') return '<a href="'+esc(signInHref())+'">'+t[2]+t[1]+'</a>';
  return '<a href="'+pathOf(t[0])+'" data-go="'+t[0]+'" class="'+(S.page===t[0]||(t[0]==='list'&&S.page==='co')?'on':'')+'">'+t[2]+t[1]+'</a>';
 }).join('')+'</nav>';
}

/* ---------- HOME (the exchange's front page, ported from the BSE homepage) ---------- */
function homeNotice(){
 return '<div class=hm-notice id=top>The BSE API proposal is open for community feedback. <a href="#join">Read now</a></div>';
}
function homeRows(){
 var rows=db.companies.filter(function(c){return !c.suspended}).slice().sort(function(a,b){return b.price*b.shares-a.price*a.shares}).slice(0,12);
 if(!rows.length)return '<tr><td colspan=4 class=muted>No companies are listed yet.</td></tr>';
 return rows.map(function(c){var x=chg(c);
  return '<tr><td><a href="'+pathOf('co',c.id)+'" data-go="co" data-id="'+c.id+'"><b>'+esc(c.ticker)+'</b></a></td><td>'+esc(c.name)+'</td><td class="r mono">'+fp(c.price)+'</td><td class="r mono '+(x>=0?'hm-up':'hm-down')+'">'+(x>=0?'+':'')+x.toFixed(2)+'%</td></tr>';
 }).join('');
}
function homeNote(){return SITE==='bse'&&db.companies.length?'<p class=hm-delay>Live prices in Money, updated every few seconds.</p>':''}
function home(){
 var me=db.me;
 return '<main class=hm>'
 +'<div class=hm-hero><div class=hm-card><h1>The home of Bloxburg’s political economy</h1>'
 +'<p>One open stock and trading API for every website, Discord bot and app. One set of prices, one set of rules, one economy for all of Bloxburg Politics.</p>'
 +'<div class=hm-cta><a class=hm-btn href="/markets" data-go="list">Start trading</a><a class="hm-btn alt" href="#listings">Read the proposal</a></div></div></div>'
 +'<section class=hm-sec id=listings><div class=hm-wrap><span class=hm-kicker>Listings</span><h2>The problem and the proposal</h2>'
 +'<p class=muted>Each server or group tracks its own stocks, balances and trades today. That duplicates work, produces prices that disagree and stops players trading across communities.</p>'
 +'<div class=hm-cols><div class=hm-box><h3>Today</h3><ul><li>Every community keeps its own ledger, often in a spreadsheet.</li><li>The same company can have a different price in each server.</li><li>Bot developers rebuild market logic from scratch.</li><li>Holdings cannot move between communities.</li></ul></div>'
 +'<div class="hm-box blue"><h3>With a shared API</h3><ul><li>One public source of truth for prices, listings and trades.</li><li>Any site or bot reads it with a single HTTP request.</li><li>Developers add a market in minutes, not weeks.</li><li>Portfolios follow players wherever they play.</li></ul></div></div>'
 +'<div class=hm-more><a class=hm-btn href="/markets" data-go="list">Browse listings</a><a class="hm-btn alt" href="/new" data-go="new">List a company</a></div>'
 +'</div></section>'
 +'<section class="hm-sec band" id=trading><div class=hm-wrap><span class=hm-kicker>Trading</span><h2>What the API would provide</h2>'
 +'<p class=muted>A small REST interface returning JSON. Reading is open. Trading needs an API key tied to a verified player account. The base URL is proposed and may change.</p>'
 +'<div class=hm-tbl><table><thead><tr><th>Endpoint</th><th>What it returns</th></tr></thead><tbody>'
 +'<tr><td><span class="hm-verb g">GET</span><code>/v1/stocks</code></td><td>Every listed stock with its latest price and daily change.</td></tr>'
 +'<tr><td><span class="hm-verb g">GET</span><code>/v1/stocks/{symbol}</code></td><td>One stock’s details, issuer, volume and price history.</td></tr>'
 +'<tr><td><span class="hm-verb g">GET</span><code>/v1/players/{id}/portfolio</code></td><td>A player’s holdings and cash balance.</td></tr>'
 +'<tr><td><span class=hm-verb>POST</span><code>/v1/orders</code></td><td>Places a buy or sell order. Requires an API key.</td></tr>'
 +'<tr><td><span class="hm-verb g">GET</span><code>/v1/leaderboard</code></td><td>Top traders and biggest movers for a chosen period.</td></tr>'
 +'<tr><td><span class=hm-verb>POST</span><code>/v1/webhooks</code></td><td>Sends price alerts and trade events to a Discord channel or URL.</td></tr>'
 +'</tbody></table></div>'
 +'<h3 style="margin-top:56px">Build with it</h3>'
 +'<div class=hm-tabs role=tablist aria-label="Code examples"><button class=hm-tab role=tab aria-selected=true aria-controls=p1 id=t1>Website</button><button class=hm-tab role=tab aria-selected=false aria-controls=p2 id=t2>Discord bot</button><button class=hm-tab role=tab aria-selected=false aria-controls=p3 id=t3>curl</button></div>'
 +HOME_CODE
 +'<h3 style="margin-top:56px">How a trade flows</h3>'
 +'<ol class=hm-steps><li><h3>Request</h3><p>A site or bot sends an order with its API key.</p></li><li><h3>Validate</h3><p>The exchange checks the balance, the symbol and rate limits.</p></li><li><h3>Match</h3><p>The order fills at the current market price and is recorded.</p></li><li><h3>Broadcast</h3><p>Webhooks notify subscribed channels and every client sees the new price.</p></li></ol>'
 +'<div class=hm-more><a class=hm-btn href="'+(me?'/portfolio':esc(signInHref()))+'"'+(me?' data-go=acct':'')+'>'+(me?'Open your portfolio':'Sign in to trade')+'</a></div>'
 +'</div></section>'
 +'<section class=hm-sec id=market-data><div class=hm-wrap><span class=hm-kicker>Market Data</span><h2>One feed, every community</h2>'
 +'<p class=muted>This is the live board from the exchange, the kind any site or bot could display from the same data.</p>'
 +'<div class=hm-tbl><table><thead><tr><th>Symbol</th><th>Company</th><th class=r>Price</th><th class=r>Change</th></tr></thead><tbody id=hm-rows>'+homeRows()+'</tbody></table></div>'
 +'<div class=hm-more><a class="hm-btn alt" href="/overview" data-go="dash">Market overview</a><a class="hm-btn alt" href="/markets" data-go="list">All markets</a></div>'
 +'</div></section>'
 +'<section class="hm-sec band" id=insights><div class=hm-wrap><span class=hm-kicker>Insights</span><h2>Principles and roadmap</h2>'
 +'<div class=hm-three><div class=hm-box><h3>Open by default</h3><p>Market data is free to read, with clear rate limits, so small projects can use it too.</p></div><div class=hm-box><h3>Fair and auditable</h3><p>Every trade is logged and viewable, so players can verify prices and history.</p></div><div class=hm-box><h3>Community governed</h3><p>Listing rules and changes are decided in public with representatives from participating communities.</p></div></div>'
 +'<ol class=hm-road><li><b>Phase 1: Proposal</b><span>Publish this page and gather input from community leaders, bot developers and players.</span></li><li><b>Phase 2: Read-only prototype</b><span>Launch listings, prices and history endpoints with sample companies.</span></li><li><b>Phase 3: Trading and accounts</b><span>Add player accounts, API keys, portfolios and order placement.</span></li><li><b>Phase 4: Integrations</b><span>Release a Discord bot template, a JavaScript SDK and webhook alerts.</span></li><li><b>Phase 5: Public launch</b><span>Open listings to participating communities with published governance rules.</span></li></ol>'
 +'</div></section>'
 +'<section class=hm-sec id=about><div class=hm-wrap><span class=hm-kicker>About</span><h2>Questions people ask</h2><div style="max-width:820px;margin-top:20px">'
 +'<details><summary>Is this live yet?</summary><p>The exchange is open: listings, live prices and trading with Money work on this site today. The shared API described above is still an open proposal.</p></details>'
 +'<details><summary>Does it cost anything?</summary><p>The proposal is for free read access and free keys for community projects. Any change would be announced and discussed first.</p></details>'
 +'<details><summary>Who decides which stocks are listed?</summary><p>Listing criteria would be written publicly, with a review process involving participating communities rather than a single owner.</p></details>'
 +'<details><summary>Is the currency real money?</summary><p>No. Everything is in-game Bloxburg economy value (Money) for roleplay. No real money is involved.</p></details>'
 +'<details><summary>Is this affiliated with Bloxburg, Roblox or the NYSE?</summary><p>No. BSE is an independent community project and is not endorsed by Welcome to Bloxburg, Roblox or any real-world exchange.</p></details>'
 +'</div></div></section>'
 +'<div class=hm-join id=join><div class=hm-wrap><h2>Help shape the exchange</h2><p>Run a community, build bots, or want fair markets? Tell us what you would need from a shared API.</p>'
 +'<div class=hm-cta style="margin-top:22px"><a class=hm-btn href="https://forms.gle/cokNPuWxqYrVGzSB7" target=_blank rel="noopener noreferrer">Send feedback</a><a class="hm-btn alt" href="#listings">Review the proposal</a></div></div></div>'
 +'</main>';
}
var HOME_CODE='<pre id=p1 role=tabpanel aria-labelledby=t1><span class=c>// Show a live price on any web page</span>\n<span class=k>const</span> res = <span class=k>await</span> fetch(<span class=s>"https://api.bse.jyeridley.dev/v1/stocks/BCF"</span>);\n<span class=k>const</span> stock = <span class=k>await</span> res.json();\ndocument.querySelector(<span class=s>"#price"</span>).textContent = <span class=s>`B$${stock.price}`</span>;</pre>'
 +'<pre id=p2 role=tabpanel aria-labelledby=t2 hidden><span class=c>// discord.js slash command: /price BCF</span>\n<span class=k>const</span> res = <span class=k>await</span> fetch(<span class=s>`https://api.bse.jyeridley.dev/v1/stocks/${symbol}`</span>);\n<span class=k>const</span> { name, price, change_pct } = <span class=k>await</span> res.json();\n<span class=k>await</span> interaction.reply(<span class=s>`${name}: B$${price} (${change_pct}%)`</span>);</pre>'
 +'<pre id=p3 role=tabpanel aria-labelledby=t3 hidden><span class=c># Place a buy order (API key required)</span>\ncurl -X POST https://api.bse.jyeridley.dev/v1/orders \\\n  -H <span class=s>"Authorization: Bearer YOUR_KEY"</span> \\\n  -H <span class=s>"Content-Type: application/json"</span> \\\n  -d <span class=s>\'{"symbol":"BCF","side":"buy","quantity":10}\'</span></pre>';
function homeWire(){
 document.querySelectorAll('.hm-tab').forEach(function(t){t.addEventListener('click',function(){
  document.querySelectorAll('.hm-tab').forEach(function(o){var on=o===t;o.setAttribute('aria-selected',on);var p=document.getElementById(o.getAttribute('aria-controls'));if(p)p.hidden=!on});
 })});
}
function homeSpy(){
 if(S.page!=='home')return;
 var cur=null;['insights','about'].forEach(function(id){var el=document.getElementById(id);if(el&&el.getBoundingClientRect().top<160)cur=id});
 document.querySelectorAll('.hnav a[data-sec]').forEach(function(a){a.classList.toggle('on',a.getAttribute('data-sec')===cur)});
}
addEventListener('scroll',homeSpy,{passive:true});

/* ---------- PAGES ---------- */
function dash(){
 var all=db.companies,L=all.filter(function(c){return !c.suspended});
 if(!all.length)return '<main>'+moneyBanner()+emptyMarket()+'</main>';
 var mc=all.reduce(function(s,c){return s+c.price*c.shares},0),base=all.reduce(function(s,c){return s+c.prevClose*c.shares},0),perf=pct(mc,base);
 var G=L.slice().sort(function(a,b){return chg(b)-chg(a)}).filter(function(c){return chg(c)>=0}),D=L.slice().sort(function(a,b){return chg(a)-chg(b)}).filter(function(c){return chg(c)<0}),V=L.slice().sort(function(a,b){return b.volume-a.volume}),R=all.slice().sort(function(a,b){return b.listed-a.listed});
 var ix=db.index.slice(-S.ir),first=ix.length?ix[0][1]:mc,last=ix.length?ix[ix.length-1][1]:mc,d=last-first;
 var vol=all.reduce(function(s,c){return s+c.volume},0);
 var hero='<section class=hero-stage><div class=hero><section class=hero-main><div class="between hero-top"><div><div class=mstatus><span class=pulse></span><span class=live>Market open</span>&nbsp;· Live</div><div class=lbl style="margin-top:10px">Total market cap</div><div class="big xl">'+big(mc)+'</div><div class=row style="gap:8px;margin-top:8px"><span class="num '+(d>=0?'up':'dn')+'" style="flex:0 0 auto;font-weight:700">'+(d>=0?'+':'−')+fmt(Math.abs(d))+'</span><span style="flex:0 0 auto">'+pill(pct(last,first))+'</span></div></div><div class=seg>'+[[30,'1M'],[150,'5M'],[300,'All']].map(function(a){return '<button class="'+(S.ir===a[0]?'on':'')+'" data-ir="'+a[0]+'">'+a[1]+'</button>'}).join('')+'</div></div><div style="margin-top:12px">'+chart(ix,'ix',innerWidth<700?200:260)+'</div></section>';
 var mine=db.me&&db.me.cash!=null?(function(){var hv=holdingsValue(),day=dayPnL();return '<div class=tile data-go="acct"><div class=lbl>Your portfolio</div><div class=mid style="margin-top:4px">'+eq(db.me.cash+hv)+'</div><div class=lbl style="margin-top:6px">'+fmt(db.me.cash)+' Money · '+fmt(hv)+' in shares</div><div class="num '+(day>=0?'up':'dn')+'" style="margin-top:6px;font-weight:700;font-size:13px">'+(day>=0?'+':'−')+fmt(Math.abs(day))+' today</div></div>'})():'<div class=tile><div class=lbl>Shares traded</div><div class=mid style="margin-top:4px">'+vol.toLocaleString()+'</div><div class=lbl style="margin-top:4px">across '+all.length+' compan'+(all.length===1?'y':'ies')+'</div></div>';
 var panel=function(t,arr){return '<div class=panel><div class=hd><h3>'+t+'</h3></div><div class=list>'+(arr.slice(0,5).map(function(c){return item(c)}).join('')||'<div class=lbl style="padding:0 16px 16px">None right now</div>')+'</div></div>'};
 return '<main>'+moneyBanner()
 +hero+'<div class=kpis>'
 +'<div class=tile><div class=lbl>Market performance</div><div class="mid '+(perf>=0?'up':'dn')+'" style="margin-top:4px">'+sg(perf)+'</div><div class=lbl style="margin-top:4px">vs. previous close</div></div>'
 +'<div class=tile><div class=lbl>Listed companies</div><div class=mid style="margin-top:4px">'+all.length+'</div><div class=lbl style="margin-top:4px">'+L.length+' active · '+(all.length-L.length)+' suspended</div></div>'
 +mine+'</div></div></section>'+listCta()
 +'<div class=movers>'+panel('Top gainers',G)+panel('Top decliners',D)+panel('Most active',V)+panel('Recently listed',R)+'</div>'
 +newsFeed()+'</main>';
}

function list(){
 if(!db.companies.length)return '<main>'+moneyBanner()+emptyMarket()+'</main>';
 return '<main>'+listCta()+'<div class=search><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10.25 3.75c-3.59 0-6.5 2.91-6.5 6.5s2.91 6.5 6.5 6.5c1.795 0 3.419-.726 4.596-1.904 1.178-1.177 1.904-2.801 1.904-4.596 0-3.59-2.91-6.5-6.5-6.5zm-8.5 6.5c0-4.694 3.806-8.5 8.5-8.5s8.5 3.806 8.5 8.5c0 1.986-.682 3.815-1.824 5.262l4.781 4.781-1.414 1.414-4.781-4.781c-1.447 1.142-3.276 1.824-5.262 1.824-4.694 0-8.5-3.806-8.5-8.5z"/></svg><input id=find type=search placeholder="Search companies" value="'+esc(S.find)+'" autocomplete=off aria-label="Search companies"></div>'
 +sectorBar()
 +'<div class=tbl id=rows>'+rowsOf(filteredCompanies())+'</div></main>';
}

function rowsOf(rows){if(!rows.length)return '<div class=lbl style="padding:16px">No companies match.</div>';
 return '<div class="tr th"><div>'+sortBtn('name','Company')+'</div><div>'+sortBtn('price','Price')+'</div><div>'+sortBtn('chg','Change')+'</div><div>Chart</div><div>'+sortBtn('mcap','Market cap')+'</div><div>'+sortBtn('vol','Volume')+'</div></div>'
 +rows.map(function(c){return '<div class="tr go" data-go="co" data-id="'+c.id+'"><div class=co>'+logo(c)+'<div class=who>'+nm(c,'t1')+'<div class=t2>'+esc(c.ticker)+(c.sector?' · '+esc(c.sector):'')+(c.suspended?' · Suspended':'')+'</div></div></div>'
 +'<div class=pxc><div style="font-weight:700">'+fp(c.price)+'</div><div class=capm>'+pill(chg(c))+'</div></div><div>'+pill(chg(c))+'</div><div style="display:flex;justify-content:flex-end">'+spark(c)+'</div><div>'+big(c.price*c.shares)+'</div><div>'+c.volume.toLocaleString()+'</div></div>'}).join('');
}

function holdingsValue(){if(!db.me)return 0;return Object.keys(db.me.holdings).reduce(function(s,id){var c=C(id);return s+(c?c.price*db.me.holdings[id].qty:0)},0)}
function owned(c){var h=db.me&&db.me.holdings[c.id];return h?h.qty:0}
function coChart(c){return chart(c.hist.slice(-S.range),'co'+c.id,innerWidth<700?220:320)}
function ticket(c){
 if(!db.me)return '<div class=tile><div style="font-weight:800;margin-bottom:4px">Trade '+esc(c.ticker)+'</div><div class=note style="margin-bottom:12px">Sign in to buy and sell with your money.</div><button class="primary big" data-client="'+signInHref()+'">Sign in</button></div>';
 if(!db.money.on)return '<div class=tile><div style="font-weight:800;margin-bottom:4px">Trade '+esc(c.ticker)+'</div><div class=note>Trading opens when Money is turned on.</div></div>';
 if(!db.me.accepted)return '<div class=tile><div style="font-weight:800;margin-bottom:6px">Before you trade</div><div class=note style="margin-bottom:12px">'+esc(db.money.disclaimer||'')+'</div><button class="primary big" data-accept>Accept and continue</button></div>';
 if(c.suspended)return '<div class=tile><div style="font-weight:800;margin-bottom:4px">Trading paused</div><div class=note>This listing is suspended.</div></div>';
 var buy=S.side==='buy';
 return '<div class="tile ticket"><div class=side><button class="'+(buy?'on b':'')+'" data-side=buy>Buy</button><button class="'+(!buy?'on s':'')+'" data-side=sell>Sell</button></div>'
 +'<div class=lbl style="margin-bottom:6px">Shares</div><div class=qty><button data-step=-1 aria-label="Fewer">−</button><input id=qty type=number inputmode=numeric min=1 step=1 placeholder="0" value="'+esc(S.q)+'"><button data-step=1 aria-label="More">+</button></div>'
 +'<div class=presets>'+[25,50,75,100].map(function(p){return '<button data-preset="'+p+'">'+(p===100?'Max':p+'%')+'</button>'}).join('')+'</div>'
 +'<div class=sum><span>Price</span><b id=tk-px>'+fp(c.price)+'</b></div><div class=sum><span>Estimated '+(buy?'cost':'proceeds')+'</span><b id=tk-tot>'+fmt(0)+'</b></div><div class=sum><span>Money after</span><b id=tk-after>'+fmt(db.me.cash)+'</b></div>'
 +'<div class=err id=tk-err></div><button class="big '+(buy?'buy':'sell')+'" id=tk-go>'+(buy?'Buy ':'Sell ')+esc(c.ticker)+'</button>'
 +'<div class=lbl style="margin-top:10px;text-align:center">'+coin+fmt(db.me.cash)+' Money available · you own '+qn(owned(c))+'</div></div>'}
function maxQty(c){return S.side==='buy'?Math.floor(db.me.cash/c.price):Math.floor(owned(c))}
function updTicket(){var c=C(S.cid);if(!c||!$('#tk-go'))return;var q=Math.floor(+($('#qty').value||0));S.q=$('#qty').value;var tot=q>0?q*c.price:0,buy=S.side==='buy',after=buy?db.me.cash-tot:db.me.cash+tot;
 $('#tk-px').textContent=fp(c.price);$('#tk-tot').textContent=fmt(tot);var a=$('#tk-after');a.textContent=(after<0?'−':'')+fmt(Math.abs(after));a.className=after<0?'dn':'';
 var err=buy&&after<0?'Not enough money':!buy&&q>owned(c)?'You own '+qn(owned(c))+' shares':'';$('#tk-err').textContent=err;$('#tk-go').disabled=!!err||!(q>0)||BUSY}
var EXPORT_ICON='<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12m0 0l-4.5-4.5M12 15l4.5-4.5"/><path d="M4 15v3a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-3"/></svg>';
var EXPORT_OK='<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
function exportImage(b){if(b.disabled)return;var tk=b.getAttribute('data-export'),lab=b.querySelector('.xpl');b.disabled=true;b.classList.add('busy');lab.textContent='Exporting…';
 var done=function(ok){b.classList.remove('busy');b.innerHTML=(ok?EXPORT_OK:EXPORT_ICON)+'<span class=xpl>'+(ok?'Downloaded':'Couldn\'t export')+'</span>';setTimeout(function(){b.disabled=false;b.innerHTML=EXPORT_ICON+'<span class=xpl>Export image</span>'},2200)};
 fetch('/i/markets/export.png?c='+encodeURIComponent(tk)+'&r='+S.range,{credentials:'same-origin'}).then(function(r){if(!r.ok)throw 0;return r.blob()}).then(function(bl){if(!bl.size)throw 0;var u=URL.createObjectURL(bl),a=document.createElement('a');a.href=u;a.download=tk+'-stock.png';document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(u)},4000);done(true)}).catch(function(){done(false)})}
function coPage(){var c=C(S.cid);if(!c)return '<main><div class="card empty"><h2>Company not found</h2><p>It may have been delisted.</p><button data-go="list">Browse the market</button></div></main>';
 var news=db.headlines.filter(function(h){return h.ticker===c.ticker});
 var canEdit=db.me&&(db.admin||(c.owner&&c.owner.handle===db.me.handle));
 var h=db.me&&db.me.holdings[c.id];
 var pos=h?'<div class=tile><div style="font-weight:800;margin-bottom:8px">Your position</div><div class=sum><span>Shares</span><b>'+qn(h.qty)+'</b></div><div class=sum><span>Market value</span><b id=pos-v>'+fmt(h.qty*c.price)+'</b></div><div class=sum><span>Average cost</span><b>'+fp(h.cost/h.qty)+'</b></div><div class=sum><span>Return</span><b id=pos-r class="'+(h.qty*c.price-h.cost>=0?'up':'dn')+'">'+(h.qty*c.price-h.cost>=0?'+':'−')+fmt(Math.abs(h.qty*c.price-h.cost))+'</b></div></div>':(db.me&&db.money.on?'<div class=tile><div style="font-weight:800;margin-bottom:4px">Your position</div><div class=note>You don\'t own any '+esc(c.ticker)+' yet.</div></div>':'');
 var about='<div class=tile><div style="font-weight:800;margin-bottom:6px">About '+esc(c.name)+'</div><div style="margin-bottom:12px">'+(c.description?esc(c.description):'<span class=note>No description yet.</span>')+'</div>'+(c.owner?'<div class=lbl style="margin-bottom:6px">Founded by</div>'+founder(c.owner):'<div class=lbl>Listed by '+esc(db.instance)+' staff</div>')+'</div>';
 var newsP=news.length?'<div class="panel newsfeed" style="margin:0"><div class=hd><h3>News</h3></div><div class=list>'+news.slice(0,6).map(function(h){return '<div class=item>'+(h.brk?'<span class="tag brk">Breaking</span> ':'')+'<span class=lbl>'+esc(h.cat)+' · '+new Date(h.t).toLocaleDateString()+'</span><div style="margin-top:4px">'+esc(h.text)+'</div></div>'}).join('')+'</div></div>':'';
 return '<main>'+moneyBanner()+'<div class=wide2><div class=lcol style="display:flex;flex-direction:column;gap:12px;min-width:0"><div class=card style="padding:0;margin:0">'
 +'<div class="between cohead"><div style="display:flex;gap:14px;align-items:center;min-width:0">'+logo(c,'lg')+'<div style="min-width:0">'+nm(c,'coname')+'<div class=lbl>'+esc(c.ticker)+(c.sector?' · '+esc(c.sector):'')+(c.suspended?' · <span class="tag brk">Suspended</span>':'')+'</div></div></div>'+'<div class=hbtns><button class="small xp" data-export="'+esc(c.ticker)+'" title="Download a picture of this stock" aria-label="Export image">'+EXPORT_ICON+'<span class=xpl>Export image</span></button>'+(canEdit?'<button class=small data-go="edit" data-id="'+c.id+'">Edit</button>':'')+'</div></div>'
 +(verified(c)?'':'<div style="padding:14px 20px 0">'+unvBanner()+'</div>')
 +'<div class=between style="padding:16px 20px 0;align-items:flex-end"><div><div class="big xl" id=px>'+fp(c.price)+'</div><div class=row style="gap:8px;margin-top:6px"><span id=chg style="flex:0 0 auto">'+pill(chg(c))+'</span><span class=lbl style="flex:0 0 auto">vs. previous close</span></div></div>'
 +'<div style="display:flex;align-items:center;gap:12px"><span class=mstatus><span class=pulse></span><span class=live>Live</span></span><div class=seg>'+[[30,'1M'],[90,'3M'],[200,'All']].map(function(a){return '<button class="'+(S.range===a[0]?'on':'')+'" data-range="'+a[0]+'">'+a[1]+'</button>'}).join('')+'</div></div></div>'
 +'<div id=live style="margin-top:10px">'+coChart(c)+'</div>'
 +'<div class=stats id=stats>'+stats(c)+'</div></div>'+about+newsP+'</div>'
 +'<div class=rail>'+ticket(c)+pos+'</div></div></main>';
}

function stats(c){var h=c.hist.slice(-S.range).map(function(x){return x[1]}),lo=h.length?Math.min.apply(null,h):c.price,hi=h.length?Math.max.apply(null,h):c.price;return '<div><span class=lbl>Market cap</span><b>'+big(c.price*c.shares)+'</b></div><div><span class=lbl>Volume</span><b>'+c.volume.toLocaleString()+'</b></div><div><span class=lbl>Range</span><b>'+fp(lo)+' – '+fp(hi)+'</b></div><div><span class=lbl>Shares</span><b>'+c.shares.toLocaleString()+'</b></div><div><span class=lbl>Listed</span><b>'+new Date(c.listed).toLocaleDateString()+'</b></div>'}
function updateLive(){var c=C(S.cid);if(!c)return;var l=$('#live');if(l&&!l.querySelector('.xh[style*="block"]'))l.innerHTML=coChart(c);var p=$('#px');if(p)p.textContent=fp(c.price);var g=$('#chg');if(g)g.innerHTML=pill(chg(c));var s=$('#stats');if(s)s.innerHTML=stats(c);var h=db.me&&db.me.holdings[c.id];if(h&&$('#pos-v')){$('#pos-v').textContent=fmt(h.qty*c.price);var r=h.qty*c.price-h.cost,e=$('#pos-r');e.textContent=(r>=0?'+':'−')+fmt(Math.abs(r));e.className=r>=0?'up':'dn'}updTicket()}
function trade(){var c=C(S.cid),q=Math.floor(+$('#qty').value);
 if(!c||!(q>0)||BUSY)return;BUSY=true;$('#tk-go').disabled=true;
 api('trade',{id:c.id,side:S.side,qty:q}).then(function(st){BUSY=false;db=st;S.q='';render();toast((S.side==='buy'?'Bought ':'Sold ')+qn(q)+' '+c.ticker+' for '+fmt(q*c.price))},function(e){BUSY=false;toast(e.message,true);updTicket()})}
function acct(){if(!db.me)return '<main><div class="card empty"><h2>Your portfolio</h2><p>Sign in to trade with your money.</p><button class=primary data-client="'+signInHref()+'">Sign in</button></div></main>';
 var a=db.me;
 var rows=Object.keys(a.holdings).map(function(id){var c=C(id),p=a.holdings[id];return c?{c:c,qty:p.qty,cost:p.cost,v:c.price*p.qty}:null}).filter(Boolean).sort(function(x,y){return y.v-x.v});
 var val=rows.reduce(function(s,e){return s+e.v},0),cost=rows.reduce(function(s,e){return s+e.cost},0),ret=val-cost,day=dayPnL();
 return '<main>'+moneyBanner()+'<div class=summary><div class=tile><div class=lbl>Total value</div><div class=big>'+(a.cash==null?fmt(val):eq(a.cash+val))+'</div>'
 +'<div class="num '+(day>=0?'up':'dn')+'" style="margin-top:8px;font-weight:700">'+(day>=0?'+':'−')+fmt(Math.abs(day))+' today</div>'
 +'<div class=row style="gap:20px;margin-top:14px">'+(a.cash==null?'':'<div style="flex:0 0 auto"><div class=lbl>Money</div><div style="font-weight:700" class=num>'+fmt(a.cash)+'</div></div>')+'<div style="flex:0 0 auto"><div class=lbl>In shares</div><div style="font-weight:700" class=num>'+fmt(val)+'</div></div><div style="flex:0 0 auto"><div class=lbl>Return</div><div style="font-weight:700" class="num '+(ret>=0?'up':'dn')+'">'+(ret>=0?'+':'−')+fmt(Math.abs(ret))+'</div></div></div></div>'
 +'<div class=tile><div class=lbl>Allocation</div>'+allocBlock()+'</div></div>'
 +'<div class=panel style="padding:0"><div class=hd><h3>Holdings</h3><span class=lbl>@'+esc(a.handle)+'</span></div>'+(rows.length?'<div class="tr th hold"><div>Company</div><div>Shares</div><div>Price</div><div>Value</div><div>Return</div><div>Chart</div></div>'+rows.map(function(e){var r=e.v-e.cost,c=e.c;return '<div class="tr go hold" data-go="co" data-id="'+c.id+'"><div class=co>'+logo(c)+'<div class=who>'+nm(c,'t1')+'<div class=t2>'+qn(e.qty)+' shares · '+esc(c.ticker)+'</div></div></div><div class=pxc><div class=dsk>'+qn(e.qty)+'</div><div class=capm style="font-weight:700">'+fmt(e.v)+'</div><div class="capm '+(r>=0?'up':'dn')+'" style="font-size:13px">'+(r>=0?'+':'−')+fmt(Math.abs(r))+'</div></div><div>'+fp(c.price)+'</div><div>'+fmt(e.v)+'</div><div class="'+(r>=0?'up':'dn')+'">'+(r>=0?'+':'−')+fmt(Math.abs(r))+'</div><div style="display:flex;justify-content:flex-end">'+spark(c)+'</div></div>'}).join(''):'<div class=lbl style="padding:0 16px 16px">No holdings yet. Pick a company on the Markets tab to buy your first shares.</div>')+'</div>'
 +'<div class=panel><div class=hd><h3>Activity</h3></div>'+(a.txns.length?'<div style="overflow-x:auto"><table><tr><th>Order</th><th>Shares</th><th class=m>Price</th><th>Total</th><th class=m>When</th></tr>'
 +a.txns.map(function(t){return '<tr><td><span class="'+(t.side==='buy'?'up':'dn')+'" style="font-weight:700">'+(t.side==='buy'?'Buy':'Sell')+'</span> '+esc(t.ticker)+'</td><td>'+qn(t.qty)+'</td><td class=m>'+fp(t.price)+'</td><td>'+(t.side==='buy'?'−':'+')+fmt(t.total)+'</td><td class=m>'+new Date(t.t).toLocaleString([], {month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})+'</td></tr>'}).join('')+'</table></div>':'<div class=lbl style="padding:0 16px 16px">No orders yet.</div>')+'</div></main>';
}

function companyForm(c){
 var isNew=!c;
 if(!db.me)return '<main><div class="card empty"><h2>List a company</h2><p>Sign in first.</p></div></main>';
 if(isNew&&!db.me.canList)return '<main><div class="card empty"><h2>List a company</h2><p>Your account can\'t list a company right now.</p><button data-go="dash">Back to the BSE</button></div></main>';
 if(isNew&&db.me.ownMax!=null&&db.me.owned>=db.me.ownMax)return '<main><div class="card empty"><h2>You\'ve listed '+db.me.owned+' companies</h2><p>Each account can list up to '+db.me.ownMax+'.</p><button data-go="dash">Back to the BSE</button></div></main>';
 var sec=(db.sectors||[]).map(function(s){return '<option'+(c&&c.sector===s?' selected':'')+'>'+esc(s)+'</option>'}).join('');
 return '<main><div class="dlg wide"><div class=card style="padding:24px">'
 +'<div class=h2>'+(isNew?'List a company':'Edit '+esc(c.ticker))+'</div><div class=note style="margin-bottom:18px">'+(isNew?'It trades in Money from the moment it\'s listed. '+(db.admin?'':'You\'re shown as its founder.'):'The ticker, share count and price are set by staff.')+'</div>'
 +'<div class=preview>'+'<span id=pv-logo>'+(c?logo(c,'lg'):'<img class="logo-img lg'+(db.me.sq?'':' round')+'" src="'+esc(db.me.avatar)+'" alt="">')+'</span><div style="min-width:0"><div class=nm style="font-weight:800"><span id=pv-name>'+(c?esc(c.name):'Company name')+'</span>'+badge(c?(c.owner&&c.owner.badge):db.me.badge)+'</div><div class=lbl id=pv-sub>'+(c?esc(c.ticker)+' · '+esc(c.sector||''):'TICKER · Sector')+'</div></div><div style="margin-left:auto;text-align:right" id=pv-cap>'+(c?'<div class=num style="font-weight:700">'+fp(c.price)+'</div><div class=lbl>'+big(c.price*c.shares)+' cap</div>':'')+'</div></div>'
 +'<label class=f><span>Company name<i id=n-name>0/50</i></span><input id=f-name maxlength=50 value="'+(c?esc(c.name):'')+'" placeholder="Bloxburg Burgers"></label>'
 +(isNew?'<div class=row style="gap:12px"><label class=f><span>Ticker</span><input id=f-ticker maxlength=5 placeholder="BURG" style="text-transform:uppercase;font-weight:700;letter-spacing:.05em"></label><label class=f><span>Sector</span><select id=f-sector>'+sec+'</select></label></div>':'<label class=f><span>Sector</span><select id=f-sector>'+sec+'</select></label>')
 +'<label class=f><span>What it does<i id=n-desc>0/200</i></span><textarea id=f-desc maxlength=200 placeholder="Burgers and fries, made fresh on Main Street.">'+(c?esc(c.description||''):'')+'</textarea></label>'
 +(isNew?'<div class=row style="gap:12px"><label class=f><span>Starting price (Money)</span><input id=f-price type=number min=0.1 max=1000 step=0.01 placeholder="10.00"></label><label class=f><span>Shares outstanding</span><input id=f-shares type=number min=1000 max=10000000 step=1 placeholder="100000"></label></div><div class=note style="margin:-6px 0 14px">Price $0.10–$1,000 · 1,000–10,000,000 shares · tickers are 2–5 letters.</div>':'')
 +(isNew&&!db.admin||c&&c.owner?'<div class=note style="margin:-4px 0 14px">'+(isNew?'Your':'Its founder\'s')+' profile picture and checkmark are the company\'s picture and badge. Change '+(isNew?'your':'their')+' picture on '+(isNew?'your':'their')+' profile and the market follows.</div>':'')
 +(isNew&&!db.admin&&!db.me.badge?'<div class="unv" style="margin:0 0 14px">'+SHIELD+'<div><b>Your company will be listed as unverified</b><span>Your account doesn\'t have a checkmark, so your company won\'t show one. '+unvText()+'</span></div></div>':'')
 +'<div class=err id=f-err></div><div class=row style="gap:8px"><button data-back>Cancel</button><button class=primary id=f-go>'+(isNew?'List company':'Save')+'</button></div></div></div></main>'}
function formPreview(){var n=$('#f-name');if(!n)return;var t=$('#f-ticker'),p=$('#f-price'),s=$('#f-shares');$('#n-name').textContent=n.value.length+'/50';$('#n-desc').textContent=$('#f-desc').value.length+'/200';$('#pv-name').textContent=n.value||'Company name';
 var tk=t?t.value.toUpperCase().replace(/[^A-Z]/g,''):'';if(t&&t.value!==tk)t.value=tk;if(t)$('#pv-sub').textContent=(tk||'TICKER')+' · '+$('#f-sector').value;
 if(p&&+p.value>0){$('#pv-cap').innerHTML='<div class=num style="font-weight:700">'+fmt(+p.value)+'</div><div class=lbl>'+(+s.value>0?big(p.value*s.value)+' cap':'')+'</div>'}}
function readFile(input){return new Promise(function(res,rej){var f=input&&input.files&&input.files[0];if(!f)return res('');if(f.size>1e6)return rej(new Error('The logo must be under 1 MB'));var r=new FileReader();r.onload=function(){res(r.result)};r.onerror=function(){rej(new Error('Could not read that file'))};r.readAsDataURL(f)})}
function submitCompany(){
 var c=S.page==='edit'?C(S.cid):null,err=$('#f-err'),btn=$('#f-go');
 var body={name:$('#f-name').value.trim(),sector:$('#f-sector').value,description:$('#f-desc').value.trim()};
 if(c){body.id=c.id}else{body.ticker=$('#f-ticker').value.trim().toUpperCase();body.price=+$('#f-price').value;body.shares=+$('#f-shares').value}
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
 return '<main class=ad>'+moneyBanner()+'<div class=adgrid>'+adCo()+adCtl()+adEvents()+adHl()
 +'<details class="card full"'+(S.openAcc?' open':'')+' data-d=acc><summary>Investors ('+AD.accounts.length+')</summary><br>'+adAcc()+'</details>'
 +'<details class="card full"'+(S.openLog?' open':'')+' data-d=log><summary>Activity log</summary><br>'+adLog()+'</details></div></main>'}
function adCo(){var e=EDIT&&C(EDIT);var sec='<option value="">Sector (optional)</option>'+(db.sectors||[]).map(function(s){return '<option>'+esc(s)+'</option>'}).join('');
 return (e?editForm(e):'')+'<div class=card><h3>List a company</h3><div class=row>'
 +'<input id=cn placeholder="Company name" maxlength=80><input id=ct placeholder="Ticker" maxlength=6><input id=cp type=number step=0.01 min=0.01 placeholder="Initial price"><input id=cs type=number min=1 placeholder="Shares outstanding"></div>'
 +'<div class=row><select id=csec>'+sec+'</select><input id=cdesc maxlength=200 placeholder="Description (optional)"></div>'
 +'<div class=row><input id=cown maxlength=16 placeholder="Link an account: @username (optional)" autocapitalize=off spellcheck=false><label class=f style="margin:0"><span>Logo, only used without an account</span><input id=cl type=file accept="image/png,image/jpeg,image/gif,image/webp"></label></div>'
 +'<div class=note style="margin:2px 0 10px">A linked account\'s profile picture and checkmark show on the company.</div><div class=row><button class=primary data-a=list>List company</button></div></div>'
 +'<div class="card full" style="padding:0;order:-1"><div style="overflow-x:auto"><table><tr><th>Company</th><th>Price</th><th class=m>Founder</th><th>Status</th><th></th></tr>'
 +(db.companies.map(function(c){return '<tr><td><span style="display:inline-flex;gap:8px;align-items:center">'+logo(c,'sm')+'<b>'+esc(c.ticker)+'</b> <span class="lbl nm" style="display:inline-flex"><span>'+esc(c.name)+'</span>'+badge(c.owner&&c.owner.badge)+'</span></span></td><td>'+fp(c.price)+'</td><td class=m>'+(c.owner?'@'+esc(c.owner.handle):'<span class=lbl>none</span>')+'</td><td>'+(c.suspended?'<span class="tag brk">Suspended</span>':'Active')+'</td><td><button class=small data-a=edCo data-id="'+c.id+'">Edit</button> <button class=small data-a=suspend data-id="'+c.id+'">'+(c.suspended?'Resume':'Suspend')+'</button> <button class="small danger" data-a=remove data-id="'+c.id+'">Delete</button></td></tr>'}).join('')||'<tr><td colspan=5 class=lbl>No companies</td></tr>')+'</table></div></div>'}
function editForm(c){return '<div class="card full" style="border-color:var(--accent);order:-2"><h3>Editing '+esc(c.ticker)+'</h3>'
 +'<div class=row><label class=f><span>Company name</span><input id=en maxlength=80 value="'+esc(c.name)+'"></label><label class=f><span>Ticker</span><input id=et maxlength=6 value="'+esc(c.ticker)+'"></label><label class=f><span>Shares outstanding</span><input id=es type=number min=1 value="'+c.shares+'"></label></div>'
 +'<div class=row style="align-items:flex-end"><label class=f style="margin:0"><span>Linked account <i>blank unlinks it</i></span><input id=eown maxlength=16 placeholder="@username" autocapitalize=off spellcheck=false value="'+(c.owner?'@'+esc(c.owner.handle):'')+'"></label></div><br>'
 +'<div class=row style="align-items:center">'+logo(c,'lg')+'<label class=f style="flex:2 1 200px;margin:0"><span>Logo, only used without an account picture</span><input id=el type=file accept="image/png,image/jpeg,image/gif,image/webp"></label></div><br>'
 +'<div class=row><button class=primary data-a=saveEdit>Save changes</button><button data-a=cancelEdit>Cancel</button><button data-a=clearLogo data-id="'+c.id+'">Remove logo</button></div></div>'}
function opts(){return db.companies.map(function(c){return '<option value="'+c.id+'">'+esc(c.ticker)+' · '+fp(c.price)+'</option>'}).join('')}
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
 +'<div class=row><button data-a=runScandal style="flex:0 0 auto">Political Scandal</button><span class=lbl style="flex:2 1 200px">Every investor pulls out half of their holdings into Money.</span></div>'
 +'<div class=lbl style="margin-top:12px">History</div>'+(ev.map(function(e){return '<div style="padding:8px 0;border-bottom:1px solid var(--line);font-size:14px"><span class=lbl>'+new Date(e.t).toLocaleString()+'</span> · '+esc(e.name)+' — '+esc(e.detail)+'</div>'}).join('')||'<div class=lbl style="padding:8px 0">No events yet</div>')+'</div>'}
function adHl(){return '<div class=card><h3>Headlines</h3><input id=ht placeholder="Headline" maxlength=280 style="margin-bottom:8px"><div class=row>'
 +'<select id=hc><option>Markets</option><option>Corporate</option><option>Economy</option><option>Policy</option><option>Major event</option></select>'
 +'<select id=hk><option value="">No ticker</option>'+db.companies.map(function(c){return '<option>'+esc(c.ticker)+'</option>'}).join('')+'</select>'
 +'<label class=lbl style="flex:0 0 auto;display:flex;gap:6px;align-items:center"><input type=checkbox id=hb style="width:auto;min-height:0"> BREAKING</label>'
 +'<button class=primary data-a=pubHl>Publish</button></div>'
 +'<div style="overflow-x:auto;margin-top:8px"><table>'+(db.headlines.map(function(h){return '<tr><td style="white-space:normal">'+(h.brk?'<span class="tag brk">BREAKING</span> ':'')+esc(h.text)+'<div class=lbl>'+esc(h.cat)+(h.ticker?' · '+esc(h.ticker):'')+'</div></td><td><button class=small data-a=edHl data-id="'+h.id+'">Edit</button> <button class="small danger" data-a=delHl data-id="'+h.id+'">Delete</button></td></tr>'}).join('')||'<tr><td class=lbl>No headlines</td></tr>')+'</table></div></div>'}
function adAcc(){var A=AD.accounts;return '<div class=lbl>Everyone who has traded, with their money balance</div><div style="overflow-x:auto"><table><tr><th>Account</th><th>Money</th><th class=m>In shares</th><th class=m>Positions</th><th class=m>First trade</th></tr>'
 +(A.map(function(a){return '<tr><td>@'+esc(a.screen_name)+' <span class=lbl>'+esc(a.name)+'</span></td><td>'+fmt(a.cash)+'</td><td class=m>'+fmt(a.equity)+'</td><td class=m>'+a.positions+'</td><td class=m>'+new Date(a.created).toLocaleDateString()+'</td></tr>'}).join('')||'<tr><td colspan=5 class=lbl>No investors yet</td></tr>')+'</table></div>'}
function adLog(){return (AD.logs.map(function(e){return '<div style="padding:8px 0;border-bottom:1px solid var(--line);font-size:14px"><span class=lbl>'+new Date(e.t).toLocaleString()+'</span> · '+esc(e.a)+'</div>'}).join('')||'<p class=lbl>No activity yet.</p>')}
var V=function(s){var e=$(s);return e?e.value:''};
var ADMIN={
 list:function(){var name=V('#cn').trim(),tk=V('#ct').trim().toUpperCase(),price=+V('#cp'),sh=+V('#cs');
  if(!name||!tk||!(price>0)||!(sh>0))return toast('Enter name, ticker, price and shares',true);
  if(CT(tk))return toast('Ticker already listed',true);
  readFile($('#cl')).then(function(logo){return act('list',{name:name,ticker:tk,price:price,shares:sh,logo:logo,sector:V('#csec'),description:V('#cdesc'),owner:V('#cown').trim()})},function(e){toast(e.message,true)})},
 edCo:function(id){EDIT=id;render();viewTop()},
 cancelEdit:function(){EDIT=null;render()},
 saveEdit:function(){var c=C(EDIT);if(!c)return;var n=V('#en').trim(),T=V('#et').trim().toUpperCase(),s=+V('#es');
  if(!n||!T||!(s>0))return toast('Name, ticker and shares are required',true);
  if(db.companies.some(function(x){return x!==c&&x.ticker===T}))return toast('Ticker in use',true);
  readFile($('#el')).then(function(logo){return act('edit',{id:c.id,name:n,ticker:T,shares:s,logo:logo,owner:V('#eown').trim()}).then(function(){EDIT=null;render()})},function(e){toast(e.message,true)})},
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
 runScandal:function(){act('scandal',{},'Political Scandal: every investor pulls out half of their holdings into Money?')},
 pubHl:function(){var text=V('#ht').trim();if(!text)return toast('Enter a headline',true);act('headline',{text:text,cat:V('#hc'),ticker:V('#hk'),breaking:$('#hb').checked})},
 edHl:function(id){var h=db.headlines.find(function(x){return x.id===id});var t=prompt('Edit headline',h.text);if(t===null)return;var b=confirm('Mark as BREAKING? OK = yes, Cancel = no');act('editHeadline',{id:id,text:t.trim()||h.text,breaking:b})},
 delHl:function(id){act('deleteHeadline',{id:id},'Delete this headline?')}
};

/* ---------- ROUTER ---------- */
var BACK='<svg viewBox="0 0 24 24"><path d="M7.414 13l5.043 5.04-1.414 1.42L3.586 12l7.457-7.46 1.414 1.42L7.414 11H21v2H7.414z"/></svg>';
function tabs(){return [['dash','Overview'],['list','Markets']].concat(db.me?[['acct','Portfolio']]:[]).concat(db.admin?[['admin','Admin']]:[])}
function bseNav(){
 var P=S.page,L=[['list','Listings',P==='list'||P==='co'||P==='new'||P==='edit'],['acct','Trading',P==='acct'],['dash','Market Data',P==='dash']];
 var h=L.map(function(t){return '<a href="'+pathOf(t[0])+'" data-go="'+t[0]+'" class="'+(t[2]?'on':'')+'">'+t[1]+'</a>'}).join('');
 h+='<a href="/#insights" data-sec=insights>Insights</a><a href="/#about" data-sec=about>About</a>';
 if(db.admin)h+='<a href="/admin" data-go=admin class="'+(P==='admin'?'on':'')+'">Admin</a>';
 return h;
}
function siteHead(){
 if(SITE!=='bse')return '';
 var me=db.me;
 var nav=bseNav();
 var account=me
  ? '<a class=bal href="/portfolio" data-go="acct" title="Money balance">'+coin+'<span class=num>'+fmt(me.cash)+'</span></a><details class=acct><summary>'+(me.avatar?'<img src="'+esc(me.avatar)+'" alt="">':'')+'<span>@'+esc(me.handle)+'</span></summary><div class=acctm><a href="/portfolio" data-go="acct">Portfolio</a><div class=lbl>'+fmt(me.cash)+' Money available</div><a href="/logout">Log out</a></div></details>'
  : '<a class="small primary" href="'+esc(signInHref())+'">Sign in</a>';
 return '<header class=bsehead><a class=wordmark href="/" data-go="home" aria-label="'+esc(BSE_SHORT)+'">'+logoImgs()+'<span class=bname>'+esc(BSE_NAME)+'</span></a><nav class=hnav aria-label="Primary">'+nav+'</nav><div class=grow></div>'
  +'<div class=hsearch>'+SEARCH_ICO+'<input id=qtop type=search placeholder="Search tickers" value="'+esc(S.qtop||'')+'" autocomplete=off aria-label="Search tickers"><div id=qsug role="listbox" aria-label="Matching companies"></div></div>'
  +account
  +(HOME?'<a class=glink href="'+esc(HOME)+'">'+esc(db.instance||'Bloxburg Social')+'</a>':'')+'</header>';
}

function render(){
 var co=(S.page==='co'||S.page==='edit')&&C(S.cid);
 var title=S.page==='co'&&co?co.ticker:S.page==='new'?'List a company':S.page==='edit'&&co?'Edit '+co.ticker:BSE_SHORT;
 var sub=S.page==='co'&&co?esc(co.name):db.me&&db.me.cash!=null?coin+fmt(db.me.cash)+' in Money':BSE_NAME;
 var back=S.page==='co'||S.page==='new'||S.page==='edit'||(!framed&&SITE!=='bse');
 var hideBar=SITE==='bse'&&(S.page==='home'||S.page==='dash'||S.page==='list'||S.page==='acct'||S.page==='admin');
 var inLogo=SITE!=='bse'?'<a class="wordmark inapp" href="'+pathOf('dash')+'" data-go="dash" aria-label="'+esc(BSE_SHORT)+'">'+logoImgs()+'</a>':'';
 var heading=title===BSE_SHORT?'':'<h1>'+esc(title)+'</h1>';
 var bar=hideBar?'':'<div class=bar>'+(back?'<button class=iconbtn data-back aria-label="Back">'+BACK+'</button>':'')+inLogo+'<div class=grow>'+heading+'<div class=sub>'+sub+'</div></div>'+(db.me&&db.me.canList&&S.page!=='new'&&S.page!=='edit'?'<button class="small primary" data-go="new" style="flex:0 0 auto">List a company</button>':'')+'</div>';
 var nav=hideBar||S.page==='new'||S.page==='edit'||SITE==='bse'?'':'<nav class=tabs>'+tabs().map(function(t){return '<a href="'+pathOf(t[0])+'" data-go="'+t[0]+'" class="'+(S.page===t[0]||(t[0]==='list'&&S.page==='co')?'on':'')+'">'+t[1]+'</a>'}).join('')+'</nav>';
 var body={home:home,dash:dash,list:list,co:coPage,acct:acct,admin:adminPage,new:function(){return companyForm(null)},edit:function(){return co?companyForm(co):coPage()}}[S.page]();
 var y=window.scrollY,old=$('.bar'),hid=!!(old&&old.hidden),f=document.activeElement&&document.activeElement.id,sel=f&&document.activeElement.selectionStart;
 $('#app').innerHTML=siteHead()+(S.page==='home'?homeNotice():'')+tape()+(S.page==='home'?homeNote():'')+bar+nav+body+siteFoot()+dockNav();
 if(S.page==='home'){homeWire();homeSpy()}
 if(hid&&$('.bar'))$('.bar').hidden=true;
 if(f&&$('#'+f)){var el=$('#'+f);el.focus();try{if(sel!=null)el.setSelectionRange(sel,sel)}catch(e){}}
 window.scrollTo(0,y);
 updTicket();formPreview();
 document.title=S.page==='co'&&co?co.ticker+' · '+co.name+' · '+BSE_SHORT:(SITE==='bse'?(S.page==='home'?BSE_SHORT+' | '+BSE_NAME:BSE_NAME):BSE_SHORT+' · '+db.instance);
}

document.addEventListener('click',function(e){
 if(!e.target.closest('.hsearch')){var sg=$('#qsug');if(sg)sg.className='';}
 var t=e.target.closest('[data-export],[data-go],[data-ir],[data-range],[data-side],[data-step],[data-preset],[data-a],[data-back],[data-client],[data-accept],[data-sort],[data-sector],#tk-go,#f-go');if(!t)return;
 if(t.hasAttribute('data-client')){e.preventDefault();client(t.getAttribute('data-client'));return}
 if(t.hasAttribute('data-go')){e.preventDefault();go(t.getAttribute('data-go'),t.getAttribute('data-id')||undefined);return}
 if(t.hasAttribute('data-back')){e.preventDefault();if(!framed&&S.page==='dash'){location.assign(SITE==='bse'&&HOME?HOME:'/home');return}var c=C(S.cid);if(S.page==='edit'&&c)go('co',c.id);else if(S.page==='co'||S.page==='new'||S.page==='edit')go(Q.get('from')||'list');else client('/home');return}
 if(t.hasAttribute('data-ir')){S.ir=+t.getAttribute('data-ir');render();return}
 if(t.hasAttribute('data-sort')){var k=t.getAttribute('data-sort');if(S.sort===k)S.dir=-S.dir;else{S.sort=k;S.dir=k==='name'?1:-1}render();return}
 if(t.hasAttribute('data-sector')){S.sector=t.getAttribute('data-sector')||'';render();return}
 if(t.hasAttribute('data-export')){e.preventDefault();exportImage(t);return}
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
 if(e.target.id==='find'){S.find=e.target.value;var r=$('#rows');if(r)r.innerHTML=rowsOf(filteredCompanies())}
 if(e.target.id==='qtop'){S.qtop=e.target.value;showSuggest(e.target.value)}
 if(/^f-/.test(e.target.id))formPreview();
});
document.addEventListener('change',function(e){if(e.target.id==='f-sector')formPreview()});
// a picture that won't load falls back to the ticker
document.addEventListener('error',function(e){var t=e.target;if(t&&t.tagName==='IMG'&&t.classList.contains('logo-img')&&t.getAttribute('data-tk')){var m=document.createElement('span');m.className=t.className.replace(/\bround\b/,'');m.textContent=t.getAttribute('data-tk');t.replaceWith(m)}},true);
document.addEventListener('toggle',function(e){var d=e.target;if(d.getAttribute&&d.getAttribute('data-d')==='acc')S.openAcc=d.open;if(d.getAttribute&&d.getAttribute('data-d')==='log')S.openLog=d.open},true);
document.addEventListener('keydown',function(e){
 if(e.key==='Enter'&&e.target.id==='qty'){e.preventDefault();trade()}
 if(e.key==='Enter'&&e.target.id==='qtop'){
  e.preventDefault();
  var q=e.target.value.trim();S.find=q;S.qtop=q;
  var hits=db.companies.filter(function(c){var x=q.toLowerCase();return c.ticker.toLowerCase().indexOf(x)>=0||c.name.toLowerCase().indexOf(x)>=0});
  if(hits.length===1) go('co',hits[0].id); else go('list');
 }
});
render();
// the market moves every two seconds on the server; the page follows it
var busy=false;
setInterval(function(){
 if(busy||document.hidden)return;busy=true;
 api('state').then(function(st){
  db=st;busy=false;
  if(S.page==='dash'||S.page==='acct')render();
  else if(S.page==='home'){var hr=$('#hm-rows');if(hr)hr.innerHTML=homeRows();refreshTape()}
  else if(S.page==='list'){var r=$('#rows');if(r)r.innerHTML=rowsOf(filteredCompanies());else render();refreshTape()}
  else if(S.page==='co'){updateLive();refreshTape()}
 },function(){busy=false});
},2000);
})();
