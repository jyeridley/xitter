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
