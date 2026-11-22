// /i/electionnov22 as a Xitter page: the election's results (election-data.ts)
// in the site's own look, column, header and tabs. The artifact itself stays
// at /i/electionnov22/classic (election.ts).

import type { Viewer } from "./auth";
import { accountPage, esc } from "./account-page";
import { PUBLIC_ORIGIN } from "./config";
import { settings } from "./settings";
import { electionStatic, electionSummary, fillOf, PARTY_COLOR, type Summary } from "./election-data";

export const ELECTION_TITLE = "Election Night in America";

const n = (v: number) => v.toLocaleString("en-US");
const ini = (s: string) => s.split(/\s+/).filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "?";
const CHECK = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 20c-.264 0-.52-.104-.707-.293l-4.785-4.785c-.39-.39-.39-1.023 0-1.414s1.023-.39 1.414 0l3.946 3.945L18.075 4.41c.32-.45.94-.558 1.395-.24.45.318.56.942.24 1.394L9.817 19.577c-.17.24-.438.395-.732.42-.028.002-.057.003-.085.003z"/></svg>`;

export function headline(s: Summary): string {
	const [a, b] = s.cands;
	if (!a || !b) return ELECTION_TITLE;
	const lead = s.winner ? `${a.name} wins` : a.ev === b.ev ? "Tied" : `${a.name} leads`;
	return `${lead}: ${a.ev}–${b.ev}`;
}

export function describe(s: Summary): string {
	const [a, b] = s.cands;
	const parts = s.cands.filter((c) => c.ev || c.p !== "I").map((c) => `${c.name} (${c.p}) ${c.ev} EV${c.pv ? `, ${c.pv}` : ""}`);
	const congress = s.congress.map((c) => `${c.name.replace("U.S. ", "")} ${c.won.D}D–${c.won.R}R`).join(" · ");
	return `${s.mode === "final" ? "Final results" : "Live results"}: ${parts.join(" · ")}. ${congress}.${a && b ? "" : ""}`;
}

export function mapSvg(s: Summary, cls = "el-map", strokeVar = "var(--bg)"): string {
	const D = electionStatic();
	const by = new Map(s.states.map((x) => [x.k, x]));
	const paths = Object.entries(D.PATHS)
		.map(([k, v]) => `<path d="${v.d}" data-k="${k}" fill="${fillOf(by.get(k), s.mode)}"><title>${esc(D.NAMES[k] ?? k)} · ${D.EV[k]} EV</title></path>`)
		.join("");
	return `<svg class="${cls}" viewBox="0 0 975 610" role="img" aria-label="Electoral map" style="--el-stroke:${strokeVar}">${paths}</svg>`;
}

function candCards(s: Summary): string {
	const main = s.cands.filter((c) => c.p !== "I");
	const ind = s.cands.find((c) => c.p === "I");
	const card = (c: Summary["cands"][0]) => `<div class="el-cand${s.winner === c.p ? " win" : ""}" style="--pc:${PARTY_COLOR[c.p]}">
<div class="el-av">${esc(ini(c.name))}${s.winner === c.p ? `<span class="el-ok">${CHECK}</span>` : ""}</div>
<div class="el-cmeta"><div class="el-cname">${esc(c.name)}</div><div class="dim">${esc(c.party)}${c.pv ? ` · ${esc(c.pv)}` : ""}</div>${s.winner === c.p ? `<div class="el-won">Projected winner</div>` : ""}</div>
<div class="el-ev"><b>${c.ev}</b><span>electoral votes</span></div></div>`;
	const total = 538;
	const D = s.cands.find((c) => c.p === "D")?.ev ?? 0;
	const R = s.cands.find((c) => c.p === "R")?.ev ?? 0;
	const I = ind?.ev ?? 0;
	return `<div class="el-cands">${main.map(card).join("")}</div>
<div class="el-bar" aria-label="Electoral votes: ${D} Democrat, ${R} Republican${I ? `, ${I} Independent` : ""}"><i style="width:${(D / total) * 100}%;background:${PARTY_COLOR.D}"></i><i style="width:${(I / total) * 100}%;background:${PARTY_COLOR.I}"></i><span></span><i style="width:${(R / total) * 100}%;background:${PARTY_COLOR.R}"></i><em></em></div>
<div class="el-barlbl dim"><span>${D}</span><span><b>270</b> to win</span><span>${R}</span></div>
${ind && (ind.ev || ind.votes) ? `<div class="el-ind" style="--pc:${PARTY_COLOR.I}"><span class="el-dot"></span><b>${esc(ind.name)}</b><span class="dim">Independent${ind.pv ? ` · ${esc(ind.pv)}` : ""}</span><span class="el-indev"><b>${ind.ev}</b> EV</span></div>` : ""}`;
}

function margin(v: { d: number; r: number; i: number; t: number } | undefined): string {
	if (!v?.t) return "";
	const arr = [["D", v.d], ["R", v.r], ["I", v.i]].sort((a, b) => (b[1] as number) - (a[1] as number)) as [string, number][];
	return `${arr[0][0]} +${(((arr[0][1] - arr[1][1]) / v.t) * 100).toFixed(1)}`;
}

function stateRow(s: Summary, x: Summary["states"][0]): string {
	const name = s.cands.find((c) => c.p === x.p)?.name ?? "";
	const status = !x.rating ? "Not yet rated" : x.called || s.mode === "final" ? `${esc(name)} wins` : `${esc(x.rating.startsWith("T") ? "Toss-up" : `Leans ${name}`)}`;
	return `<button class="el-row" data-k="${x.k}" type="button"><span class="el-sw" style="background:${fillOf(x, s.mode)}"></span><span class="el-rname"><b>${esc(x.name)}</b><span class="dim">${status}</span></span><span class="el-rr"><b>${x.ev} EV</b><span class="dim">${margin(x.votes)}</span></span></button>`;
}

function congressCard(c: Summary["congress"][0], full: boolean): string {
	const seg = (p: "D" | "R") => `<i style="width:${(c.won[p] / c.seats) * 100}%;background:${PARTY_COLOR[p]}"></i>`;
	const head = `<div class="el-chead"><b>${esc(c.name)}</b><span class="dim">${c.control ? `${c.control === "D" ? "Democrats" : "Republicans"} win control` : `${c.maj} for control`}</span></div>
<div class="el-bar sm">${seg("D")}<span></span>${seg("R")}<em style="left:${(c.maj / c.seats) * 100}%"></em></div>
<div class="el-barlbl dim"><span style="color:${PARTY_COLOR.D}"><b>${c.won.D}</b> D</span><span>${c.seats} seats up</span><span style="color:${PARTY_COLOR.R}"><b>${c.won.R}</b> R</span></div>`;
	if (!full) return `<div class="el-box">${head}</div>`;
	const races = c.races
		.map((r) => `<div class="el-race${r.won ? " won" : ""}" style="--pc:${PARTY_COLOR[r.p] ?? "#71767b"}"><span class="el-dot"></span><span class="el-rname"><b>${esc(r.name)} (${esc(r.p)})</b><span class="dim">${esc(r.seat)} · ${esc(r.state)}</span></span><span class="el-tag">${r.won ? `${CHECK}Won` : "Lost"}</span></div>`)
		.join("");
	return `<section class="el-box">${head}<div class="el-races">${races}</div></section>`;
}

function timeline(s: Summary): string {
	if (!s.timeline.length) return `<p class="dim el-empty">Nothing yet. Calls will show up here as they come in.</p>`;
	return `<ol class="el-tl">${s.timeline.map((e) => `<li style="--pc:${e.color}"><span class="el-dot"></span><div><b>${esc(e.title)}</b>${e.sub ? `<div class="dim">${esc(e.sub)}</div>` : ""}</div><time class="dim">${esc(e.clock)} ET</time></li>`).join("")}</ol>`;
}

const CSS = `
.col{width:min(600px,100%)}
main{padding:0;gap:0}
:root{--el-u:#d6dbdf}
@media (prefers-color-scheme:dark){:root:not([data-theme]){--el-u:#3b3f43}}
:root[data-theme="dark"]{--el-u:#3b3f43}:root[data-theme="dim"]{--el-u:#3d4b58}
.el-hero{padding:12px 16px 4px;display:grid;gap:4px}
.el-pill{display:inline-flex;align-items:center;gap:6px;font-size:13px;font-weight:700;padding:2px 10px;border-radius:9999px;background:var(--surface);color:var(--muted);vertical-align:middle}
.el-pill.live{background:rgb(244 33 46 / .12);color:#f4212e}.el-pill.live::before{content:"";width:7px;height:7px;border-radius:50%;background:currentColor;animation:elp 1.6s infinite}
@keyframes elp{50%{opacity:.3}}
.el-tabs{position:sticky;top:53px;z-index:1;display:flex;border-bottom:1px solid var(--border);background:var(--bar);-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);margin-top:8px}
.el-tabs a{flex:1;display:flex;justify-content:center;color:var(--muted);font-weight:500;padding:0 8px;text-decoration:none!important}
.el-tabs a span{position:relative;padding:16px 0}
.el-tabs a[aria-selected="true"]{color:var(--text);font-weight:700}
.el-tabs a[aria-selected="true"] span::after{content:"";position:absolute;left:0;right:0;bottom:0;height:4px;border-radius:9999px;background:var(--accent)}
@media (hover:hover){.el-tabs a:hover{background:var(--hover)}}
.el-panel{padding:16px;display:grid;gap:16px}
.el-panel[hidden]{display:none}
.el-cands{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.el-cand{border:1px solid var(--border);border-radius:16px;padding:12px;display:grid;grid-template-columns:auto 1fr;gap:8px 12px;align-items:center;position:relative;overflow:hidden}
.el-cand::before{content:"";position:absolute;inset:0 0 auto;height:4px;background:var(--pc)}
.el-cand.win{border-color:color-mix(in srgb,var(--pc) 55%,var(--border))}
.el-av{position:relative;width:48px;height:48px;border-radius:50%;display:grid;place-items:center;background:var(--pc);color:#fff;font-weight:800;font-size:17px}
.el-ok{position:absolute;right:-4px;bottom:-4px;width:22px;height:22px;border-radius:50%;background:var(--success);display:grid;place-items:center;border:2px solid var(--bg)}
.el-ok svg{width:12px;height:12px;fill:#fff}
.el-cname{font-weight:700;line-height:20px}
.el-won{font-size:13px;font-weight:700;color:var(--success)}
.el-ev{grid-column:1/-1;display:flex;align-items:baseline;gap:6px}
.el-ev b{font-size:40px;line-height:44px;font-weight:800;color:var(--pc);font-variant-numeric:tabular-nums}
.el-ev span{color:var(--muted);font-size:13px}
.el-bar{position:relative;display:flex;height:14px;border-radius:9999px;overflow:hidden;background:var(--el-u)}
.el-bar.sm{height:10px}
.el-bar span{flex:1}
.el-bar em{position:absolute;left:50.18%;top:-2px;bottom:-2px;width:2px;background:var(--text)}
.el-barlbl{display:flex;justify-content:space-between;font-size:13px;margin-top:-10px}
.el-barlbl b{color:var(--text)}
.el-ind{display:flex;align-items:center;gap:8px;border:1px solid var(--border);border-radius:9999px;padding:6px 14px;font-size:14px}
.el-indev{margin-left:auto}
.el-dot{width:10px;height:10px;border-radius:50%;background:var(--pc);flex:none}
.el-mapbox{border:1px solid var(--border);border-radius:16px;padding:8px;display:grid;gap:8px}
.el-map{display:block;width:100%;height:auto}
.el-map path{stroke:var(--el-stroke);stroke-width:1;stroke-linejoin:round;cursor:pointer;transition:opacity .15s}
@media (hover:hover){.el-map path:hover{opacity:.8}}
.el-legend{display:flex;flex-wrap:wrap;gap:4px 14px;justify-content:center;font-size:13px;color:var(--muted)}
.el-legend span{display:inline-flex;align-items:center;gap:6px}.el-legend i{width:10px;height:10px;border-radius:3px}
.el-h{font-size:20px;line-height:24px;font-weight:800;margin:4px 0 -4px}
.el-box{border:1px solid var(--border);border-radius:16px;padding:12px 16px;display:grid;gap:12px}
.el-chead{display:flex;justify-content:space-between;align-items:baseline;gap:8px;flex-wrap:wrap}
.el-two{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.el-list{border:1px solid var(--border);border-radius:16px;overflow:hidden}
.el-row{all:unset;box-sizing:border-box;display:flex;align-items:center;gap:12px;width:100%;padding:12px 16px;border-top:1px solid var(--border);cursor:pointer;color:var(--text)}
.el-row:first-child{border-top:0}
@media (hover:hover){.el-row:hover{background:var(--hover)}}
.el-row:focus-visible{outline:2px solid var(--accent);outline-offset:-2px}
.el-sw{width:6px;align-self:stretch;border-radius:3px;flex:none}
.el-rname{display:grid;flex:1;min-width:0}.el-rname .dim{font-size:14px}
.el-rr{display:grid;text-align:right;font-variant-numeric:tabular-nums}
.el-races{display:grid}
.el-race{display:flex;align-items:center;gap:12px;padding:10px 0;border-top:1px solid var(--border)}
.el-race:not(.won){opacity:.6}
.el-tag{display:inline-flex;align-items:center;gap:4px;font-size:13px;font-weight:700;color:var(--muted)}
.el-race.won .el-tag{color:var(--success)}.el-tag svg{width:14px;height:14px;fill:currentColor}
.el-tl{list-style:none;margin:0;padding:0;border:1px solid var(--border);border-radius:16px;overflow:hidden}
.el-tl li{display:flex;gap:12px;align-items:flex-start;padding:12px 16px;border-top:1px solid var(--border)}
.el-tl li:first-child{border-top:0}
.el-tl .el-dot{margin-top:5px}.el-tl li>div{flex:1;min-width:0}.el-tl time{font-size:13px;white-space:nowrap}
.el-foot{display:flex;gap:16px;flex-wrap:wrap;font-size:14px;padding:0 16px 16px}
.el-empty{padding:16px}
dialog.el-sheet{border:0;padding:0;border-radius:16px;background:var(--bg);color:var(--text);width:min(600px,calc(100vw - 32px));max-height:min(90vh,800px);box-shadow:0 0 15px rgb(101 119 134 / .2),0 0 3px 1px rgb(101 119 134 / .15)}
dialog.el-sheet::backdrop{background:rgb(91 112 131 / .4)}
.el-shead{position:sticky;top:0;display:flex;align-items:center;gap:20px;min-height:53px;padding:0 16px;background:var(--bar);-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px)}
.el-shead button{all:unset;display:grid;place-items:center;width:36px;height:36px;margin-left:-8px;border-radius:50%;cursor:pointer}
.el-shead button svg{width:20px;height:20px;fill:currentColor}
@media (hover:hover){.el-shead button:hover{background:var(--hover)}}
.el-sbody{padding:0 16px 16px;display:grid;gap:12px}
.el-vrow{display:flex;align-items:center;gap:10px;font-variant-numeric:tabular-nums}
.el-vrow .el-rname{font-weight:700}
.el-cmap{width:100%;height:auto;max-height:360px}
.el-cmap path{stroke:var(--bg);stroke-linejoin:round}
@media (max-width:500px){.el-cands{grid-template-columns:1fr}.el-two{grid-template-columns:1fr}.el-ev b{font-size:34px}}
`;

const SCRIPT = (mode: string, updatedAt: number, view: string) => `(function(){
var tabs=[].slice.call(document.querySelectorAll(".el-tabs a")),panels=[].slice.call(document.querySelectorAll(".el-panel"));
function show(id,push){if(!document.getElementById(id))id="results";tabs.forEach(function(t){t.setAttribute("aria-selected",String(t.getAttribute("href")==="#"+id))});panels.forEach(function(p){p.hidden=p.id!==id});if(push)history.replaceState(null,"","#"+id)}
tabs.forEach(function(t){t.addEventListener("click",function(e){e.preventDefault();show(t.getAttribute("href").slice(1),true);scrollTo({top:0})})});
show((location.hash||"#results").slice(1),false);
var dlg=document.getElementById("elSheet"),PC={D:"${PARTY_COLOR.D}",R:"${PARTY_COLOR.R}",I:"${PARTY_COLOR.I}"},NM=__NAMES__;
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
function shade(v){if(!v||!v.t)return"var(--el-u)";var a=[["D",v.d],["R",v.r],["I",v.i]].sort(function(x,y){return y[1]-x[1]});var m=(a[0][1]-a[1][1])/v.t;return "color-mix(in srgb,"+PC[a[0][0]]+" "+Math.round(35+Math.min(1,m/.4)*65)+"%,var(--bg))"}
function open(k){
	var row=document.querySelector('.el-row[data-k="'+k+'"]');
	document.getElementById("elSheetT").textContent=row?row.querySelector("b").textContent:k;
	var body=document.getElementById("elSheetB");body.innerHTML='<p class="dim">Loading…</p>';
	if(dlg.showModal)dlg.showModal();else dlg.setAttribute("open","");
	if("${mode}"!=="final"){body.innerHTML=row?'<p>'+esc(row.querySelector(".el-rname .dim").textContent)+' · '+esc(row.querySelector(".el-rr b").textContent)+'</p><p class="dim">County results show once the night\\'s results are final.</p>':"";return}
	fetch("${"/i/electionnov22"}/api/state?k="+encodeURIComponent(k)).then(function(r){return r.json()}).then(function(d){
		if(!d||!d.counties){body.innerHTML='<p class="dim">No county results for this one.</p>';return}
		var t=Math.max(1,d.state.t),h='<div class="dim">'+d.ev+' electoral vote'+(d.ev>1?'s':'')+' · '+d.state.t.toLocaleString()+' votes · 100% reporting</div>';
		[["D",d.state.d],["R",d.state.r],["I",d.state.i]].filter(function(a){return a[1]}).sort(function(a,b){return b[1]-a[1]}).forEach(function(a,i){h+='<div class="el-vrow" style="--pc:'+PC[a[0]]+'"><span class="el-dot"></span><span class="el-rname">'+esc(NM[a[0]])+(i===0?' ✓':'')+'</span><span>'+a[1].toLocaleString()+'</span><b style="min-width:52px;text-align:right">'+(a[1]/t*100).toFixed(1)+'%</b></div>'});
		var b=d.bb,p=Math.max(b[2],b[3])*.04,sw=Math.max(.15,Math.max(b[2],b[3])/900);
		h+='<svg class="el-cmap" viewBox="'+[b[0]-p,b[1]-p,b[2]+p*2,b[3]+p*2].join(" ")+'">'+d.counties.map(function(c){return '<path d="'+c.d+'" fill="'+shade(c.v||d.state)+'" stroke-width="'+sw+'"><title>'+esc(c.n)+(c.v?': '+[["D",c.v.d],["R",c.v.r],["I",c.v.i]].filter(function(a){return a[1]}).sort(function(a,b){return b[1]-a[1]}).map(function(a){return NM[a[0]].split(" ").pop()+" "+(a[1]/Math.max(1,c.v.t)*100).toFixed(1)+"%"}).join(" · "):'')+'</title></path>'}).join("")+'</svg><div class="dim" style="font-size:13px">'+d.counties.length+' counties · modeled from the night\\'s statewide result</div>';
		body.innerHTML=h;
	},function(){body.innerHTML='<p class="dim">Couldn\\'t load counties.</p>'});
}
document.addEventListener("click",function(e){var t=e.target.closest&&e.target.closest("[data-k]");if(!t||t.closest("dialog"))return;open(t.getAttribute("data-k"))});
document.getElementById("elClose").onclick=function(){dlg.close?dlg.close():dlg.removeAttribute("open")};
dlg.addEventListener("click",function(e){if(e.target===dlg)dlg.close()});
// live: a new result reloads the page, on the same tab
var seen=${updatedAt};
setInterval(function(){if(document.hidden||dlg.open)return;fetch("/i/electionnov22/api/summary?view=${view}").then(function(r){return r.json()}).then(function(s){if(s&&s.updatedAt&&s.updatedAt!==seen)location.reload()},function(){})},20000);
})();`;

export async function electionPage(req: Request, viewer: Viewer | undefined): Promise<Response> {
	const url = new URL(req.url);
	const view = url.searchParams.get("view") === "archive" ? "archive" : "auto";
	const s = await electionSummary(view);
	const v = s.updatedAt.toString(36);
	const title = headline(s);
	const desc = describe(s);
	const image = `${PUBLIC_ORIGIN}/i/electionnov22/og.png?v=${v}`;
	const canonical = `${PUBLIC_ORIGIN}/i/electionnov22`;
	const head = [
		["property", "og:title", `${ELECTION_TITLE} · ${title}`],
		["property", "og:description", desc],
		["property", "og:type", "website"],
		["property", "og:url", canonical],
		["property", "og:site_name", settings().instance_name],
		["property", "og:image", image],
		["property", "og:image:width", "1200"],
		["property", "og:image:height", "630"],
		["name", "twitter:card", "summary_large_image"],
		["name", "twitter:title", `${ELECTION_TITLE} · ${title}`],
		["name", "twitter:description", desc],
		["name", "twitter:image", image],
		["name", "description", desc],
	]
		.map(([a, k, c]) => `<meta ${a}="${k}" content="${esc(c)}">`)
		.join("\n");
	const keys = s.states.filter((x) => x.key && x.k.length === 2);
	const names = JSON.stringify(Object.fromEntries(s.cands.map((c) => [c.p, c.name]))).replace(/</g, "\\u003c");
	const legend = s.mode === "final"
		? s.cands.filter((c) => c.ev).map((c) => `<span><i style="background:${PARTY_COLOR[c.p]}"></i>${esc(c.name)}</span>`).join("")
		: `<span><i style="background:${PARTY_COLOR.D}"></i>Called D</span><span><i style="background:#93a7ee"></i>Leans D</span><span><i style="background:#d9b23a"></i>Toss-up</span><span><i style="background:#efa0ab"></i>Leans R</span><span><i style="background:${PARTY_COLOR.R}"></i>Called R</span>`;
	const when = new Date(s.updatedAt).toLocaleString("en-US", { timeZone: "America/New_York", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
	const body = `<div class="el-hero"><h1>${esc(s.title)}</h1><div class="dim"><span class="el-pill${s.mode === "live" ? " live" : ""}">${s.mode === "live" ? "Live" : "Final"}</span> ${esc(s.subtitle)} · Updated ${esc(when)} ET</div></div>
<nav class="el-tabs" role="tablist"><a href="#results" role="tab"><span>Results</span></a><a href="#states" role="tab"><span>States</span></a><a href="#congress" role="tab"><span>Congress</span></a><a href="#timeline" role="tab"><span>Timeline</span></a></nav>
<section class="el-panel" id="results" role="tabpanel">
${candCards(s)}
<div class="el-mapbox">${mapSvg(s)}<div class="el-legend">${legend}</div></div>
<div class="el-two">${s.congress.map((c) => congressCard(c, false)).join("")}</div>
<h2 class="el-h">Battlegrounds</h2>
<div class="el-list">${keys.map((x) => stateRow(s, x)).join("")}</div>
${s.totalVotes ? `<p class="dim">${n(s.totalVotes)} votes counted nationwide.</p>` : ""}
</section>
<section class="el-panel" id="states" role="tabpanel" hidden><div class="el-list">${s.states.map((x) => stateRow(s, x)).join("")}</div></section>
<section class="el-panel" id="congress" role="tabpanel" hidden>${s.congress.map((c) => congressCard(c, true)).join("")}</section>
<section class="el-panel" id="timeline" role="tabpanel" hidden>${timeline(s)}</section>
<div class="el-foot">${s.mode === "live" ? `<a href="/i/electionnov22?view=archive">November 2026 archive</a>` : view === "archive" ? `<a href="/i/electionnov22">Live map</a>` : ""}<a href="/i/electionnov22/classic">Classic map and editor</a></div>
<dialog class="el-sheet" id="elSheet"><div class="el-shead"><button id="elClose" type="button" aria-label="Close"><svg viewBox="0 0 24 24"><path d="M10.59 12L4.54 5.96l1.42-1.42L12 10.59l6.04-6.05 1.42 1.42L13.41 12l6.05 6.04-1.42 1.42L12 13.41l-6.04 6.05-1.42-1.42L10.59 12z"/></svg></button><div class="title" id="elSheetT"></div></div><div class="el-sbody" id="elSheetB"></div></dialog>
<script>${SCRIPT(s.mode, s.updatedAt, view).replace("__NAMES__", names)}</script>`;
	return accountPage({ req, title: ELECTION_TITLE, body, viewer: viewer ?? null, back: { href: "/home", label: "Back" }, cache: "no-cache", css: CSS, head, referrer: null });
}
