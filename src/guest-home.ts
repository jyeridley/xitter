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
	return text.replace(whole, `${routeEl},${electionEl}`);
}

const VIEWER_GUARD = /if\(!([\w$]+)\)throw Error\("RichHomeTimeline: useModule requires a viewerUserId"\)/;

export function patchGuestTimeline(text: string): string {
	if (!text.includes("RichHomeTimeline: useModule requires a viewerUserId")) return text;
	return text.replace(VIEWER_GUARD, (whole, viewer) => `if(!${viewer}){if(!window.__XITTER_GUEST_HOME__)throw Error("RichHomeTimeline: useModule requires a viewerUserId");${viewer}="0"}`);
}

export const GUEST_CSS = `[data-testid="primaryColumn"] div:has(nav div[role="tab"]):not(:has([data-testid="cellInnerDiv"])),[data-testid="primaryColumn"] div:has([data-testid="tweetTextarea_0_label"]):has([data-testid="toolBar"]):not(:has([data-testid="cellInnerDiv"])){display:none!important}`;

// Jye's election page signed in: the client's own Bookmarks screen, side bar
// and all, under /i/electionnov22 too, which tidy.ts covers with the page in
// the main column (signed out it is the guest home's, above)
const BOOKMARKS_ROUTE = /\(0,([\w$]+)\.jsx\)\(([\w$]+)\.Route,\{component:([\w$]+),exact:!0,path:"\/i\/bookmarks"\},"\/i\/bookmarks"\)/;

export function patchElectionRoute(text: string): string {
	if (text.includes('"/i/electionnov22"')) return text;
	const m = BOOKMARKS_ROUTE.exec(text);
	if (!m) return text;
	const [whole, jsx, router, component] = m;
	return text.replace(whole, `(0,${jsx}.jsx)(${router}.Route,{component:${component},exact:!0,path:"/i/electionnov22"},"/i/electionnov22"),${whole}`);
}
