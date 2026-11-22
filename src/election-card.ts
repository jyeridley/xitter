// A post linking /i/electionnov22 gets a card: on the server, X's
// summary_large_image card with the share image (so any client, and any site
// unfurling it, shows the current map); in our client, a script draws the
// Xitter-styled results card over it, fetched from api/card.

import { PUBLIC_ORIGIN } from "./config";
import { electionSummary, PARTY_COLOR, type Summary } from "./election-data";
import { describe, ELECTION_TITLE, headline } from "./election-page";

const OWN_HOST = new URL(PUBLIC_ORIGIN).host;
const esc = (t: string) => t.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export function isElectionLink(url: string): boolean {
	try {
		const u = new URL(url);
		return u.host === OWN_HOST && /^\/i\/electionnov22(?:\/(?!api\/|a\/)[^]*)?$/.test(u.pathname);
	} catch {
		return false;
	}
}

export async function electionLinkCard(url: string): Promise<Record<string, unknown>> {
	const s = await electionSummary();
	const v = s.updatedAt.toString(36);
	const str = (x: string) => ({ string_value: x, type: "STRING" });
	const img = { image_value: { url: `${PUBLIC_ORIGIN}/i/electionnov22/og.png?v=${v}`, width: 1200, height: 630, alt: `${ELECTION_TITLE}: electoral map` }, type: "IMAGE" };
	const values: Record<string, unknown> = {
		title: str(`${ELECTION_TITLE} · ${headline(s)}`),
		description: str(describe(s)),
		domain: str(OWN_HOST),
		vanity_url: { ...str(OWN_HOST), scribe_key: "vanity_url" },
		card_url: { ...str(url), scribe_key: "card_url" },
	};
	for (const key of ["thumbnail_image", "thumbnail_image_large", "thumbnail_image_original", "summary_photo_image", "summary_photo_image_large", "summary_photo_image_original", "photo_image_full_size", "photo_image_full_size_large", "photo_image_full_size_original"]) values[key] = img;
	return {
		rest_id: url,
		legacy: {
			binding_values: Object.entries(values).map(([key, value]) => ({ key, value })),
			card_platform: { platform: { audience: { name: "production" }, device: { name: "Swift", version: "12" } } },
			name: "summary_large_image",
			url,
			user_refs_results: [],
		},
	};
}

// the card as our client draws it
export function electionCardHtml(s: Summary): string {
	const v = s.updatedAt.toString(36);
	const D = s.cands.find((c) => c.p === "D")?.ev ?? 0;
	const R = s.cands.find((c) => c.p === "R")?.ev ?? 0;
	const I = s.cands.find((c) => c.p === "I")?.ev ?? 0;
	const rows = s.cands
		.filter((c) => c.p !== "I" || c.ev)
		.map((c) => `<div class="xe-row" style="--pc:${PARTY_COLOR[c.p]}"><span class="xe-dot"></span><span class="xe-name">${esc(c.name)}${s.winner === c.p ? ` <span class="xe-ok">✓</span>` : ""}</span><span class="xe-dim">${c.pv ? esc(c.pv) : ""}</span><b>${c.ev}</b></div>`)
		.join("");
	const congress = s.congress.map((c) => `${esc(c.name.replace("U.S. ", ""))} <b style="color:${PARTY_COLOR.D}">${c.won.D}</b>–<b style="color:${PARTY_COLOR.R}">${c.won.R}</b>`).join(" · ");
	return `<a class="xe-card" href="/i/electionnov22" data-xe-go="/i/electionnov22">
<div class="xe-mapwrap"><img class="xe-map" src="/i/electionnov22/map.png?v=${v}" alt="Electoral map" loading="lazy"><span class="xe-pill${s.mode === "live" ? " live" : ""}">${s.mode === "live" ? "LIVE" : "FINAL"}</span></div>
<div class="xe-body"><div class="xe-title">${esc(ELECTION_TITLE)}</div><div class="xe-dim">${esc(s.subtitle)}</div>
${rows}
<div class="xe-bar"><i style="width:${(D / 538) * 100}%;background:${PARTY_COLOR.D}"></i><i style="width:${(I / 538) * 100}%;background:${PARTY_COLOR.I}"></i><span></span><i style="width:${(R / 538) * 100}%;background:${PARTY_COLOR.R}"></i><em></em></div>
<div class="xe-foot xe-dim"><span>270 to win</span><span>${congress}</span></div></div></a>`;
}

export const ELECTION_CARD_CSS = `.xe-card{display:block;margin-top:12px;border:1px solid color-mix(in srgb,currentColor 18%,transparent);border-radius:16px;overflow:hidden;color:inherit!important;text-decoration:none!important;font-family:TwitterChirp,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:20px;transition:background-color .2s}
.xe-card:hover{background:color-mix(in srgb,currentColor 3%,transparent)}
.xe-mapwrap{position:relative;background:#000;border-bottom:1px solid color-mix(in srgb,currentColor 18%,transparent)}
.xe-map{display:block;width:100%;aspect-ratio:1200/628;object-fit:cover}
.xe-pill{position:absolute;left:12px;top:12px;font-size:12px;font-weight:700;letter-spacing:.04em;padding:2px 8px;border-radius:4px;background:rgb(0 0 0 / .77);color:#fff}
.xe-pill.live{background:#f4212e}
.xe-body{padding:12px;display:grid;gap:6px}
.xe-title{font-weight:700}
.xe-dim{color:color-mix(in srgb,currentColor 55%,transparent);font-size:14px}
.xe-row{display:flex;align-items:center;gap:8px;font-variant-numeric:tabular-nums}
.xe-row b{font-size:20px;font-weight:800;color:var(--pc);min-width:44px;text-align:right}
.xe-name{flex:1;font-weight:700;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.xe-ok{color:#00ba7c}
.xe-dot{width:10px;height:10px;border-radius:50%;background:var(--pc);flex:none}
.xe-bar{position:relative;display:flex;height:8px;border-radius:9999px;overflow:hidden;background:color-mix(in srgb,currentColor 18%,transparent);margin-top:4px}
.xe-bar span{flex:1}.xe-bar em{position:absolute;left:50.18%;top:0;bottom:0;width:2px;background:currentColor}
.xe-foot{display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;font-size:13px}
.xe-foot b{font-weight:700}
[data-xe-hidden]{display:none!important}`;

export const ELECTION_CARD_SCRIPT = `(function(){
	var LINK=/\\/i\\/electionnov22(?:[/?#]|$)/,html=null,at=0,busy=false;
	function fetchCard(){if(busy)return;busy=true;fetch("/i/electionnov22/api/card",{credentials:"same-origin"}).then(function(r){return r.ok?r.text():null}).then(function(t){busy=false;at=Date.now();if(t&&t!==html){html=t;document.querySelectorAll("[data-xe-card]").forEach(function(c){c.innerHTML=html})}draw()},function(){busy=false})}
	function linked(w){return [].some.call(w.querySelectorAll("a[href]"),function(a){var h=a.getAttribute("href")||"";try{var u=new URL(h,location.href);return u.host===location.host&&LINK.test(u.pathname)}catch(e){return false}})}
	function draw(){
		var want=false;
		document.querySelectorAll('[data-testid="card.wrapper"]:not([data-xe-hidden])').forEach(function(w){
			if(!w.closest("article")||!linked(w))return;
			want=true;if(!html)return;
			var box=document.createElement("div");box.setAttribute("data-xe-card","");box.innerHTML=html;
			w.setAttribute("data-xe-hidden","");w.parentNode.insertBefore(box,w.nextSibling);
		});
		document.querySelectorAll("[data-xe-card]").forEach(function(c){var w=c.previousElementSibling;if(!w||!w.hasAttribute("data-xe-hidden"))c.remove()});
		if(want&&(!html||Date.now()-at>30000))fetchCard();
	}
	document.addEventListener("click",function(e){var a=e.target.closest&&e.target.closest("[data-xe-card] a");if(!a||e.metaKey||e.ctrlKey||e.shiftKey||e.button)return;e.stopPropagation()},true);
	var q=0;new MutationObserver(function(){if(q)return;q=requestAnimationFrame(function(){q=0;draw()})}).observe(document.documentElement,{childList:true,subtree:true});
})();`;

// /i/electionnov22 inside the client: the client draws its not-found page
// there, with no right side bar, and tidy.ts frames the page in its place.
// This puts X's right side bar beside it, drawn like the client's: search,
// What's happening and Who to follow, or "New to …" signed out.
export const ELECTION_SIDE_CSS = `#xitter-elside{flex:none;position:sticky;top:0;align-self:flex-start;width:350px;margin-left:30px;padding-bottom:64px;font-family:TwitterChirp,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:20px}
#xitter-elside .xs-in{position:sticky;top:0;display:grid;gap:16px;padding-top:0}
#xitter-elside .xs-search{position:sticky;top:0;z-index:1;padding:4px 0 8px;background:var(--xs-bg)}
#xitter-elside .xs-search label{display:flex;align-items:center;gap:12px;height:42px;padding:0 16px;border-radius:9999px;border:1px solid transparent;background:var(--xs-field);color:var(--xs-dim);cursor:text}
#xitter-elside .xs-search label:focus-within{background:var(--xs-bg)}
#xitter-elside .xs-search label:focus-within{border-color:var(--xt-accent,#1d9bf0);box-shadow:inset 0 0 0 1px var(--xt-accent,#1d9bf0)}
#xitter-elside .xs-search svg{width:18px;height:18px;fill:currentColor;flex:none}
#xitter-elside .xs-search input{all:unset;flex:1;min-width:0;color:var(--xs-fg);font-size:15px}
#xitter-elside .xs-card{border:1px solid var(--xs-line);border-radius:16px;overflow:hidden}
#xitter-elside .xs-card h2{margin:0;padding:12px 16px;font-size:20px;line-height:24px;font-weight:800;color:var(--xs-fg)}
#xitter-elside .xs-item{display:block;padding:12px 16px;color:var(--xs-fg);text-decoration:none;cursor:pointer}
#xitter-elside .xs-item:hover{background:var(--xs-hover)}
#xitter-elside .xs-dim{color:var(--xs-dim);font-size:13px;line-height:16px}
#xitter-elside .xs-tag{font-weight:700;margin:2px 0}
#xitter-elside .xs-more{display:block;padding:16px;color:var(--xt-accent,#1d9bf0);text-decoration:none}
#xitter-elside .xs-more:hover{background:var(--xs-hover)}
#xitter-elside .xs-user{display:flex;align-items:center;gap:12px}
#xitter-elside .xs-user img{width:40px;height:40px;border-radius:50%;object-fit:cover;flex:none}
#xitter-elside .xs-who{flex:1;min-width:0}
#xitter-elside .xs-who div{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#xitter-elside .xs-who b{font-weight:700}
#xitter-elside .xs-btn{all:unset;box-sizing:border-box;min-height:32px;padding:0 16px;border-radius:9999px;background:var(--xs-fg);color:var(--xs-bg);font-weight:700;font-size:14px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center}
#xitter-elside .xs-btn.done{background:transparent;color:var(--xs-fg);border:1px solid var(--xs-line)}
#xitter-elside .xs-new{padding:12px 16px;display:grid;gap:12px}
#xitter-elside .xs-new h2{padding:0}
#xitter-elside .xs-new .xs-btn{min-height:40px;width:100%;font-size:15px}
#xitter-elside .xs-foot{padding:0 16px;display:flex;flex-wrap:wrap;gap:2px 12px}
#xitter-elside .xs-foot a{color:inherit;text-decoration:none}#xitter-elside .xs-foot a:hover{text-decoration:underline}
/* signed out on a phone the page sits in the guest home, whose feed tabs aren't the page's */
html[data-xitter-election] [data-xs-hide]{display:none!important}
[data-xs-row]{flex-direction:row!important;align-items:flex-start!important;max-width:none!important}
@media (max-width:999px){[data-xs-row]{max-width:600px!important}}
@media (max-width:1077px){#xitter-elside{width:290px;margin-left:20px}}
@media (max-width:999px){#xitter-elside{display:none}}`;

export const ELECTION_SIDE_SCRIPT = `(function(){
	var PATH="/i/electionnov22",data=null,asked=false;
	function go(p){if(window.__xitterGo)window.__xitterGo(p);else location.assign(p)}
	function csrf(){return (document.cookie.match(/(?:^|;\\s*)ct0=([^;]+)/)||[])[1]||""}
	function esc(s){return String(s==null?"":s).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
	var SEARCH='<svg viewBox="0 0 24 24"><path d="M10.25 3.75c-3.59 0-6.5 2.91-6.5 6.5s2.91 6.5 6.5 6.5c1.795 0 3.419-.726 4.596-1.904 1.178-1.177 1.904-2.801 1.904-4.596 0-3.59-2.91-6.5-6.5-6.5zm-8.5 6.5c0-4.694 3.806-8.5 8.5-8.5s8.5 3.806 8.5 8.5c0 1.986-.682 3.815-1.824 5.262l4.781 4.781-1.414 1.414-4.781-4.781c-1.447 1.142-3.276 1.824-5.262 1.824-4.694 0-8.5-3.806-8.5-8.5z"></path></svg>';
	function colors(el){
		var bg=getComputedStyle(document.body).backgroundColor,fg=getComputedStyle(document.body).color;
		if(!bg||bg==="rgba(0, 0, 0, 0)")bg="#fff";
		var dark=/rgb\\((\\d+)/.exec(bg);dark=dark&&+dark[1]<100;
		el.style.setProperty("--xs-bg",bg);el.style.setProperty("--xs-fg",fg);
		el.style.setProperty("--xs-dim",dark?"rgb(113,118,123)":"rgb(83,100,113)");
		el.style.setProperty("--xs-line",dark?(bg.indexOf("21, 32, 43")>0?"rgb(56,68,77)":"rgb(47,51,54)"):"rgb(239,243,244)");
		el.style.setProperty("--xs-hover",dark?"rgba(255,255,255,.03)":"rgba(0,0,0,.03)");
		el.style.setProperty("--xs-field",dark?(bg.indexOf("21, 32, 43")>0?"rgb(39,51,64)":"rgb(32,35,39)"):"rgb(239,243,244)");
	}
	function render(el){
		var d=data,h='<div class="xs-in">';
		if(d.guest){
			h+='<div class="xs-card xs-new"><h2>New to '+esc(d.instance)+'?</h2><div class="xs-dim">Sign up now to get your own personalized timeline!</div><a class="xs-btn" href="/i/flow/signup" data-xs-go="/i/flow/signup">Create account</a><div class="xs-dim">By signing up, you agree to the Terms of Service and Privacy Policy, including Cookie Use.</div></div>';
		}else{
			h+='<form class="xs-search" role="search"><label>'+SEARCH+'<input type="search" placeholder="Search" aria-label="Search query" enterkeyhint="search"></label></form>';
			if(d.trends&&d.trends.length){h+='<section class="xs-card"><h2>What\\u2019s happening</h2>';d.trends.forEach(function(t){h+='<a class="xs-item" href="/search?q='+encodeURIComponent(t.tag)+'&src=trend_click&vertical=trends" data-xs-go="/search?q='+encodeURIComponent(t.tag)+'&src=trend_click&vertical=trends"><div class="xs-dim">'+esc(t.label)+'</div><div class="xs-tag">'+esc(t.tag)+'</div><div class="xs-dim">'+t.posts.toLocaleString()+' post'+(t.posts===1?'':'s')+'</div></a>'});h+='<a class="xs-more" href="/explore" data-xs-go="/explore/tabs/trending">Show more</a></section>'}
			if(d.follow&&d.follow.length){h+='<section class="xs-card"><h2>Who to follow</h2>';d.follow.forEach(function(u){h+='<div class="xs-item xs-user" data-xs-go="/'+esc(u.screen_name)+'"><img src="'+esc(u.avatar)+'" alt=""><div class="xs-who"><div><b>'+esc(u.name)+'</b></div><div class="xs-dim" style="font-size:15px;line-height:20px">@'+esc(u.screen_name)+'</div></div><button class="xs-btn" type="button" data-xs-follow="'+esc(u.id)+'">Follow</button></div>'});h+='<a class="xs-more" href="/i/connect_people" data-xs-go="/i/connect_people">Show more</a></section>'}
		}
		h+='<nav class="xs-foot xs-dim" aria-label="Footer"><a href="/tos" data-xs-go="/tos">Terms of Service</a><a href="/privacy" data-xs-go="/privacy">Privacy Policy</a><a href="/i/electionnov22/classic">Classic map</a><span>\\u00a9 2026 '+esc(d.instance)+'</span></nav></div>';
		el.innerHTML=h;
		var f=el.querySelector(".xs-search");
		if(f)f.addEventListener("submit",function(e){e.preventDefault();var q=f.querySelector("input").value.trim();if(q)go("/search?q="+encodeURIComponent(q)+"&src=typed_query")});
	}
	function place(){
		var f=document.getElementById("xitter-pane"),el=document.getElementById("xitter-elside");
		var here=location.pathname===PATH||location.pathname===PATH+"/";
		document.documentElement.toggleAttribute("data-xitter-election",here);
		if(here){var n=document.querySelector('[data-testid="TopNavBar"] nav');if(n&&!n.closest("[data-xs-hide]")){var e=n;while(e.parentElement&&e.parentElement.offsetHeight<100&&e.parentElement.getAttribute("data-testid")!=="TopNavBar")e=e.parentElement;e.setAttribute("data-xs-hide","")}}
		if(!here||!f||f.hasAttribute("data-col")){if(el)el.remove();return}
		if(!data){if(!asked){asked=true;fetch(PATH+"/api/side",{credentials:"same-origin"}).then(function(r){return r.json()}).then(function(d){data=d;place()},function(){asked=false})}return}
		if(el&&el.previousElementSibling===f)return;
		if(el)el.remove();
		el=document.createElement("aside");el.id="xitter-elside";el.setAttribute("aria-label","Trending");
		colors(el);render(el);
		// the frame and the bar side by side, the column as wide as X's
		var parent=f.parentNode;parent.setAttribute("data-xs-row","");
		f.style.width="600px";f.style.maxWidth="100%";f.style.flex="none";
		f.style.borderLeft=f.style.borderRight="1px solid "+el.style.getPropertyValue("--xs-line");
		parent.insertBefore(el,f.nextSibling);
	}
	document.addEventListener("click",function(e){
		var b=e.target.closest&&e.target.closest("#xitter-elside [data-xs-follow]");
		if(b){e.preventDefault();e.stopPropagation();if(b.classList.contains("done"))return;
			fetch("/i/api/1.1/friendships/create.json",{method:"POST",credentials:"include",headers:{"x-csrf-token":csrf(),"content-type":"application/x-www-form-urlencoded"},body:"user_id="+encodeURIComponent(b.getAttribute("data-xs-follow"))})
				.then(function(r){if(r.ok){b.classList.add("done");b.textContent="Following"}},function(){});return}
		var a=e.target.closest&&e.target.closest("#xitter-elside [data-xs-go]");
		if(!a||e.metaKey||e.ctrlKey||e.shiftKey||e.button)return;
		e.preventDefault();go(a.getAttribute("data-xs-go"));
	},true);
	var q=0;new MutationObserver(function(){if(q)return;q=requestAnimationFrame(function(){q=0;place()})}).observe(document.documentElement,{childList:true,subtree:true});
	window.addEventListener("popstate",function(){setTimeout(place,0)});
})();`;
