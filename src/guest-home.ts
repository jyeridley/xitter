const REDIRECT = /\(0,([\w$]+)\.jsx\)\(([\w$]+)\.A,\{exact:!0,from:"\/home",to:"\/"\},"home_redirect_lo"\)/;
const ROUTE = /\(0,[\w$]+\.jsx\)\(([\w$]+)\.Route,\{component:[\w$]+,exact:!0,path:"\/"\},"home_lo"\)/;
const PRELOAD = /case"\/home":return\{key:"\/home",load:\(\)=>([\w$]+)\.b\(\)\}/;
const REQUIRE = /([\w$]+)\.d\([\w$]+,\["createLoggedOutRoutes"/;
const esc = (s: string) => s.replace(/\$/g, "\\$");

function homeModuleId(text: string): string | undefined {
	const preload = PRELOAD.exec(text);
	if (!preload) return undefined;
	const before = text.slice(Math.max(0, preload.index - 200_000), preload.index);
	const binding = new RegExp(`[,;\\s]${esc(preload[1])}=[\\w$]+\\((\\d{1,9})\\)`, "g");
	let id: string | undefined;
	for (const m of before.matchAll(binding)) id = m[1];
	return id;
}

function unguardedHome(text: string, id: string): { lazyModule: string; lazyFn: string } | undefined {
	// the module's require is its third parameter: n in older builds, r in newer
	const head = new RegExp(`[,{]${id}\\(e,t,([\\w$]+)\\)\\{`).exec(text);
	if (!head) return undefined;
	const req = head[1];
	const body = text.slice(head.index, head.index + 4000);
	const wrap = /\(0,([\w$]+)\.v\)\(\(0,([\w$]+)\.([\w$]+)\)\(([\w$]+)\)\)/.exec(body);
	if (!wrap) return undefined;
	const lazy = new RegExp(`[,\\s]${esc(wrap[2])}=${esc(req)}\\((\\d{1,9})\\)`).exec(body);
	return lazy ? { lazyModule: lazy[1], lazyFn: wrap[3] } : undefined;
}

export function patchGuestHome(text: string): string {
	if (!text.includes('"home_redirect_lo"')) return text;
	const redirect = REDIRECT.exec(text);
	const route = ROUTE.exec(text);
	const require = REQUIRE.exec(text);
	const id = homeModuleId(text);
	const home = id && unguardedHome(text, id);
	if (!redirect || !route || !require || !id || !home) return text;
	const [whole, jsx, redirectNs] = redirect;
	const n = require[1];
	const guestHome = `(window.__xitterGuestHome||(window.__xitterGuestHome=${n}(${home.lazyModule}).${home.lazyFn}(${n}(${id}).b)))`;
	const routeEl = `(0,${jsx}.jsx)(${route[1]}.Route,{exact:!0,path:"/home",render:e=>window.__XITTER_GUEST_HOME__?(0,${jsx}.jsx)(${guestHome},{...e}):(0,${jsx}.jsx)(${redirectNs}.A,{to:"/"})},"home_redirect_lo")`;
	// Jye's election page (election.ts) signed out: the guest home's frame, side
	// bars and all, which tidy.ts covers with the page in the main column
	const electionEl = `(0,${jsx}.jsx)(${route[1]}.Route,{exact:!0,path:"/i/electionnov22",render:e=>window.__XITTER_GUEST_HOME__?(0,${jsx}.jsx)(${guestHome},{...e}):(0,${jsx}.jsx)(${redirectNs}.A,{to:"/"})},"election_lo")`;
	const marketsEl = `(0,${jsx}.jsx)(${route[1]}.Route,{exact:!0,path:"/i/markets",render:e=>window.__XITTER_GUEST_HOME__?(0,${jsx}.jsx)(${guestHome},{...e}):(0,${jsx}.jsx)(${redirectNs}.A,{to:"/"})},"markets_lo")`;
	return text.replace(whole, `${routeEl},${electionEl},${marketsEl}`);
}

const VIEWER_GUARD = /if\(!([\w$]+)\)throw Error\("RichHomeTimeline: useModule requires a viewerUserId"\)/;

export function patchGuestTimeline(text: string): string {
	if (!text.includes("RichHomeTimeline: useModule requires a viewerUserId")) return text;
	return text.replace(VIEWER_GUARD, (whole, viewer) => `if(!${viewer}){if(!window.__XITTER_GUEST_HOME__)throw Error("RichHomeTimeline: useModule requires a viewerUserId");${viewer}="0"}`);
}

// signed out, the home screen's composer hides; its tabs show (For you, and the
// pinned lists: All is every public post, newest first) but not Following.
// Only on home: Explore and search keep their headers (data-xg-home, GUEST_SCRIPT)
export const GUEST_CSS = `html[data-xg-home] [data-testid="primaryColumn"] div:has([data-testid="tweetTextarea_0_label"]):has([data-testid="toolBar"]):not(:has([data-testid="cellInnerDiv"])),html[data-xg-home] [role="presentation"]:has(> [data-xg-following]),html[data-xg-home] button[aria-label="Manage timelines"]{display:none!important}
#xg-search{padding:4px 0 12px;background:inherit}
#xg-search label{display:flex;align-items:center;gap:12px;height:42px;padding:0 16px;border-radius:9999px;border:1px solid rgba(128,128,128,.35);color:rgb(113,118,123);cursor:text}
#xg-search label:focus-within{border-color:var(--xt-accent,#1d9bf0);box-shadow:inset 0 0 0 1px var(--xt-accent,#1d9bf0)}
#xg-search svg{width:18px;height:18px;fill:currentColor;flex:none}
#xg-search input{all:unset;flex:1;min-width:0;font:15px/20px -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}`;
// signed out the side bar has no search box; this puts one on top, like the
// signed-in one (search and Explore have their own in the header)
export const GUEST_SCRIPT = `(function(){var last,ICON='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10.25 3.75c-3.59 0-6.5 2.91-6.5 6.5s2.91 6.5 6.5 6.5c1.795 0 3.419-.726 4.596-1.904 1.178-1.177 1.904-2.801 1.904-4.596 0-3.59-2.91-6.5-6.5-6.5zm-8.5 6.5c0-4.694 3.806-8.5 8.5-8.5s8.5 3.806 8.5 8.5c0 1.986-.682 3.815-1.824 5.262l4.781 4.781-1.414 1.414-4.781-4.781c-1.447 1.142-3.276 1.824-5.262 1.824-4.694 0-8.5-3.806-8.5-8.5z"></path></svg>';
function go(u){history.pushState({},"",u);dispatchEvent(new PopStateEvent("popstate",{state:{}}))}
function box(){var side=document.querySelector('[data-testid="sidebarColumn"]');var p=location.pathname;var own=p.indexOf("/search")===0||p.indexOf("/explore")===0;var have=document.getElementById("xg-search");if(have&&(own||!side||!side.contains(have))){have.remove();have=null}if(have||own||!side||side.querySelector('[data-testid="SearchBox_Search_Input"]'))return;var el=side;while(el.children.length===1)el=el.children[0];var fx=[].find.call(el.children,function(k){return getComputedStyle(k).position==="fixed"});if(fx){el=fx;while(el.children.length===1)el=el.children[0]}if(!el.querySelector("aside, section, nav"))return;var f=document.createElement("form");f.id="xg-search";f.setAttribute("role","search");f.innerHTML='<label>'+ICON+'<input type="search" placeholder="Search" aria-label="Search query" enterkeyhint="search" data-testid="SearchBox_Search_Input"></label>';f.style.backgroundColor=getComputedStyle(document.body).backgroundColor;f.querySelector("input").style.color=getComputedStyle(document.body).color;f.addEventListener("submit",function(e){e.preventDefault();var q=f.querySelector("input").value.trim();if(q)go("/search?q="+encodeURIComponent(q)+"&src=typed_query")});el.insertBefore(f,el.firstChild)}
function tick(){var p=location.pathname,h=p==="/"||p==="/home";if(h!==last){last=h;document.documentElement.toggleAttribute("data-xg-home",h)}if(h)document.querySelectorAll('[role="tab"]').forEach(function(t){if(t.textContent.trim()==="Following")t.setAttribute("data-xg-following","")});box()}setInterval(tick,300);tick()})();`;

// Jye's election page signed in: the client's own Bookmarks screen, side bar
// and all, under /i/electionnov22 too, which tidy.ts covers with the page in
// the main column (signed out it is the guest home's, above)
const BOOKMARKS_ROUTE = /\(0,([\w$]+)\.jsx\)\(([\w$]+)\.Route,\{component:([\w$]+),exact:!0,path:"\/i\/bookmarks"\},"\/i\/bookmarks"\)/;

export function patchElectionRoute(text: string): string {
	const m = BOOKMARKS_ROUTE.exec(text);
	if (!m) return text;
	const [whole, jsx, router, component] = m;
	// and the BSE (markets.ts) the same way
	const add = ["/i/electionnov22", "/i/markets"].filter((p) => !text.includes(`"${p}"`));
	if (!add.length) return text;
	return text.replace(whole, `${add.map((p) => `(0,${jsx}.jsx)(${router}.Route,{component:${component},exact:!0,path:"${p}"},"${p}")`).join(",")},${whole}`);
}

// Signed out, search, lists and Explore are the signed-in client's own screens
// too: the signed-out routes get them from bundle.Routes, whose lazy loaders are
// copied over (they only name chunk and module ids, which are global)
const LAZY = (v: string) => new RegExp(`[,\\s]${esc(v)}=(?:\\(0,[\\w$]+\\.v\\)\\()?\\(0,([\\w$]+)\\.([\\w$]+)\\)\\((\\(\\)=>Promise\\.all\\(\\[[^\\]]*\\]\\)\\.then\\(\\(\\)=>([\\w$]+)\\(\\d{1,9}\\)\\))\\)`);

function routesLoader(routes: string, component: string): { wrapper: string; fn: string; loader: string; req: string } | undefined {
	const m = LAZY(component).exec(routes);
	if (!m) return undefined;
	const [, wrapper, fn, loader, req] = m;
	const mod = new RegExp(`[,\\s]${esc(wrapper)}=${esc(req)}\\((\\d{1,9})\\)`).exec(routes);
	return mod ? { wrapper: mod[1], fn, loader, req } : undefined;
}

export function guestScreens(routes: string): { path: string; key: string; exact: boolean; wrapper: string; fn: string; loader: string; req: string }[] {
	const out = [];
	const search = /\{component:([\w$]+),path:"\/search"\},"\/search"\)/.exec(routes);
	const listVar = /[,(]([\w$]+)=`\/i\/lists\/\$\{[\w$]+\.[\w$]+\}`,/.exec(routes);
	const list = listVar && new RegExp(`\\{component:([\\w$]+),path:${esc(listVar[1])}\\},${esc(listVar[1])}\\)`).exec(routes);
	for (const [m, path, key, exact] of [[search, "/search", "search_lo", false], [list, "/i/lists/:listId(\\\\d+)", "list_lo", false]] as const) {
		// a wrapper (e=>jsx(Lazy,{...e,canonicalizeUrl:!0})) is followed to its screen
		const inner = m && new RegExp(`[,\\s]${esc(m[1])}=e=>\\(0,[\\w$]+\\.jsx\\)\\(([\\w$]+),\\{\\.\\.\\.e[,}]`).exec(routes);
		const l = m && routesLoader(routes, inner ? inner[1] : m[1]);
		if (l) out.push({ path, key, exact, ...l });
	}
	return out;
}

// the chunks the signed-in app loads before its routes (main.js); signed out
// they are not there, and the borrowed screens need modules from them
const SIGNED_IN_CHUNKS = /\?\([\w$]+=Promise\.all\(\[([^\]]*)\]\)\.then\(\(\)=>[\w$]+\(\d+\)\),[\w$]+=Promise\.all\(\[([^\]]*)\]\)\.then\(\(\)=>[\w$]+\(\d+\)\),[\w$]+=Promise\.all\(\[([^\]]*)\]\)\.then\(\(\)=>[\w$]+\(\d+\)\)\.then\(e=>e\.createRoutes\(\)\)/;

export function signedInChunks(main: string | undefined): string[] {
	const m = main && SIGNED_IN_CHUNKS.exec(main);
	if (!m) return [];
	return [...new Set(m.slice(1).join(",").match(/\.e\((\d{1,9})\)/g)?.map((x) => x.slice(3, -1)) ?? [])];
}

export function patchGuestScreens(text: string, routes: string | undefined, main?: string): string {
	if (!routes || !text.includes('"home_redirect_lo"') || text.includes('"search_lo"')) return text;
	const redirect = REDIRECT.exec(text);
	const route = ROUTE.exec(text);
	const require = REQUIRE.exec(text);
	if (!redirect || !route || !require) return text;
	const [whole, jsx, redirectNs] = redirect;
	const n = require[1];
	const chunks = signedInChunks(main);
	const els = guestScreens(routes).map((s) => {
		const own = s.loader.replace(new RegExp(`(^|[^\\w$.])${esc(s.req)}(?=\\.e\\(|\\()`, "g"), `$1${n}`);
		const loader = chunks.length ? `()=>Promise.all([${chunks.map((c) => `${n}.e(${c})`).join(",")}]).then(${own})` : own;
		const comp = `(window.__xg_${s.key}||(window.__xg_${s.key}=${n}(${s.wrapper}).${s.fn}(${loader})))`;
		return `(0,${jsx}.jsx)(${route[1]}.Route,{${s.exact ? "exact:!0," : ""}path:"${s.path}",render:e=>window.__XITTER_GUEST_HOME__?(0,${jsx}.jsx)(${comp},{...e}):(0,${jsx}.jsx)(${redirectNs}.A,{to:"/"})},"${s.key}")`;
	});
	// Explore is preloaded from the signed-out bundle itself, like home
	const explore = /case"\/explore":return\{key:"\/explore",load:\(\)=>([\w$]+)\.([\w$]+)\(\)\}/.exec(text);
	const id = homeModuleId(text);
	const home = id && unguardedHome(text, id);
	if (explore && home) {
		const before = text.slice(Math.max(0, explore.index - 200_000), explore.index);
		let eid: string | undefined;
		for (const m of before.matchAll(new RegExp(`[,;\\s]${esc(explore[1])}=[\\w$]+\\((\\d{1,9})\\)`, "g"))) eid = m[1];
		if (eid) els.push(`(0,${jsx}.jsx)(${route[1]}.Route,{path:"/explore",render:e=>window.__XITTER_GUEST_HOME__?(0,${jsx}.jsx)((window.__xg_explore_lo||(window.__xg_explore_lo=${n}(${home.lazyModule}).${home.lazyFn}(${n}(${eid}).${explore[2]}))),{...e}):(0,${jsx}.jsx)(${redirectNs}.A,{to:"/"})},"explore_lo")`);
	}
	if (!els.length) return text;
	return text.replace(whole, `${els.join(",")},${whole}`);
}

// signed out, the client asks for the post alone (TweetResultByRestId); a guest
// here may read the replies too, so it asks for the conversation (TweetDetail)
const REPLIES_FLAG = /(withReplies:([\w$]+)=!0\}\)=>)\2\?/;

export function patchGuestReplies(text: string): string {
	if (!text.includes("fetchTweetDetail:({")) return text;
	return text.replace(REPLIES_FLAG, (_w, head, flag) => `${head}(${flag}||window.__XITTER_GUEST_HOME__)?`);
}
