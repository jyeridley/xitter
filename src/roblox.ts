// Roblox account linking (Settings > Roblox account): OAuth 2.0 with PKCE
// against Roblox's own sign-in, which proves the person owns the Roblox account.
// What's kept is the Roblox id, username and display name, never the tokens.
// The profile shows "<username> (verified)" with the Roblox logo in its meta row
// (ROBLOX_SCRIPT), signed in or out.

import { createHash, randomBytes } from "node:crypto";
import { accountPage, esc } from "./account-page";
import type { Viewer } from "./auth";
import { GUEST_ID, hiddenFromGuests } from "./blocks";
import { PUBLIC_ORIGIN } from "./config";
import { sql } from "./db";

const OAUTH_BASE = (process.env.ROBLOX_OAUTH_BASE ?? "https://apis.roblox.com").replace(/\/$/, "");
export const ROBLOX_REDIRECT_URI = process.env.ROBLOX_REDIRECT_URI ?? `${PUBLIC_ORIGIN}/i/roblox/callback`;
const clientId = () => process.env.ROBLOX_CLIENT_ID ?? "";
const clientSecret = () => process.env.ROBLOX_CLIENT_SECRET ?? "";
export const robloxConfigured = () => !!clientId() && !!clientSecret();

// the Roblox logo: a tilted square with a square hole, on a 24 by 24 grid
export const ROBLOX_ICON = "M5.49 0.73L23.27 5.49L18.51 23.27L0.73 18.51ZM9.06 13.70L13.70 14.94L14.94 10.30L10.30 9.06Z";

// sign-ins under way: state -> who started it and the PKCE verifier (10 minutes)
const pending = new Map<string, { userId: string; verifier: string; at: number }>();
const TTL = 10 * 60_000;
const b64url = (b: Buffer) => b.toString("base64url");

function sweep() {
	const now = Date.now();
	for (const [k, v] of pending) if (now - v.at > TTL) pending.delete(k);
	while (pending.size > 5000) pending.delete(pending.keys().next().value!);
}

const back = (q: string) => new Response(null, { status: 303, headers: { location: `/account/roblox${q}` } });

export type RobloxLink = { id: string; username: string; display_name: string | null; linked_at: Date; show: boolean };

async function linkOf(userId: string): Promise<RobloxLink | null> {
	const [r] = await sql`select roblox_id::text as id, roblox_username as username, roblox_display_name as display_name, roblox_linked_at as linked_at, roblox_show as show
		from users where id = ${userId}::bigint and roblox_id is not null`;
	return (r as RobloxLink) ?? null;
}

const CSS = `.rbx{display:flex;align-items:center;gap:12px;margin:0 0 16px;border:1px solid var(--border);border-radius:16px;padding:12px 14px}
.rbx svg{width:22px;height:22px;fill:var(--muted);flex:none}
.rbx .who{flex:1;min-width:0}
.rbx a{color:var(--text)}
.choice{display:flex;align-items:flex-start;gap:12px;margin:0 0 16px;border:1px solid var(--border);border-radius:16px;padding:12px 14px;cursor:pointer;font-size:15px;line-height:20px;color:var(--text)}
.choice input{width:20px;min-height:20px;height:20px;margin:0;padding:0;flex:none;accent-color:var(--accent)}
.row{display:flex;gap:12px;flex-wrap:wrap}
.notice{color:var(--text)}`;

const MESSAGES: Record<string, string> = {
	linked: "Your Roblox account is linked.",
	unlinked: "Your Roblox account is unlinked.",
	saved: "Saved.",
	taken: "That Roblox account is already linked to another account here.",
	denied: "Linking was cancelled on Roblox.",
	expired: "That link attempt expired or came from another sign-in. Try again.",
	failed: "Roblox didn't confirm the account. Try again in a moment.",
	off: "Roblox linking isn't set up on this instance yet.",
};

async function page(req: Request, viewer: Viewer, note = "") {
	const link = await linkOf(viewer.id);
	const msg = MESSAGES[note] ?? "";
	const bad = ["taken", "denied", "expired", "failed", "off"].includes(note);
	const icon = `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill-rule="evenodd" d="${ROBLOX_ICON}"/></svg>`;
	const body = link
		? `<div class="rbx">${icon}<div class="who"><b><a href="https://www.roblox.com/users/${esc(link.id)}/profile" target="_blank" rel="noopener noreferrer">${esc(link.username)}</a></b>${link.display_name && link.display_name !== link.username ? ` <span class="dim">· ${esc(link.display_name)}</span>` : ""}<br><span class="dim small">Linked ${esc(link.linked_at.toISOString().slice(0, 10))}</span></div></div>
<form method="post" action="/account/roblox">
<input type="hidden" name="csrf" value="${esc(viewer.csrf)}"><input type="hidden" name="action" value="show">
<label class="choice"><input type="checkbox" name="show" value="1"${link.show ? " checked" : ""} onchange="this.form.submit()"><span><b>Show on profile</b><br><span class="dim">Your profile shows ${esc(link.username)} (verified) with the Roblox logo, next to the date you joined.</span></span></label>
<button type="submit" class="secondary">Save</button>
</form>
<form method="post" action="/account/roblox" onsubmit="return confirm('Unlink your Roblox account?')">
<input type="hidden" name="csrf" value="${esc(viewer.csrf)}"><input type="hidden" name="action" value="unlink">
<button type="submit" class="secondary">Unlink</button>
</form>`
		: `<form method="post" action="/i/roblox/connect" target="_top">
<input type="hidden" name="csrf" value="${esc(viewer.csrf)}">
<button type="submit"${robloxConfigured() ? "" : " disabled"}>Link Roblox account</button>
</form>
<p class="dim small">You sign in on roblox.com; we keep your Roblox id, username and display name, nothing else.</p>`;
	return accountPage({
		req,
		viewer,
		title: "Roblox account",
		css: CSS,
		status: 200,
		body: `<h1>Roblox account</h1>
<p class="dim">Link your Roblox account to show it, verified, on your profile.</p>
${msg ? `<p class="${bad ? "error" : "notice"}" role="${bad ? "alert" : "status"}">${esc(msg)}</p>` : ""}
${body}`,
	});
}

// Settings > Roblox account
export async function robloxSettingsRoute(req: Request, url: URL, viewer: Viewer): Promise<Response> {
	if (req.method !== "POST") return page(req, viewer, url.searchParams.get("m") ?? "");
	const form = await req.formData().catch(() => undefined);
	if (String(form?.get("csrf") ?? "") !== viewer.csrf) return back("?m=expired");
	const action = String(form?.get("action") ?? "");
	if (action === "unlink") {
		await sql`update users set roblox_id = null, roblox_username = null, roblox_display_name = null, roblox_linked_at = null, roblox_show = true where id = ${viewer.id}::bigint`;
		return back("?m=unlinked");
	}
	if (action === "show") {
		await sql`update users set roblox_show = ${form?.has("show") ?? false} where id = ${viewer.id}::bigint`;
		return back("?m=saved");
	}
	return back("");
}

// POST /i/roblox/connect: off to Roblox's consent page
export async function robloxConnect(req: Request, viewer: Viewer | undefined): Promise<Response> {
	if (!viewer) return new Response(null, { status: 303, headers: { location: "/i/flow/login" } });
	if (req.method !== "POST") return back("");
	const form = await req.formData().catch(() => undefined);
	if (String(form?.get("csrf") ?? "") !== viewer.csrf) return back("?m=expired");
	if (!robloxConfigured()) return back("?m=off");
	sweep();
	const state = b64url(randomBytes(24));
	const verifier = b64url(randomBytes(48));
	pending.set(state, { userId: viewer.id, verifier, at: Date.now() });
	const q = new URLSearchParams({
		client_id: clientId(),
		redirect_uri: ROBLOX_REDIRECT_URI,
		scope: "openid profile",
		response_type: "code",
		state,
		code_challenge: b64url(createHash("sha256").update(verifier).digest()),
		code_challenge_method: "S256",
	});
	return new Response(null, { status: 302, headers: { location: `${OAUTH_BASE}/oauth/v1/authorize?${q}`, "cache-control": "no-store" } });
}

// GET /i/roblox/callback?code=&state=
export async function robloxCallback(url: URL, viewer: Viewer | undefined): Promise<Response> {
	const state = url.searchParams.get("state") ?? "";
	const started = pending.get(state);
	if (started) pending.delete(state);
	if (!viewer) return new Response(null, { status: 303, headers: { location: "/i/flow/login" } });
	if (url.searchParams.get("error")) return back("?m=denied");
	const code = url.searchParams.get("code") ?? "";
	if (!started || started.userId !== viewer.id || Date.now() - started.at > TTL || !code) return back("?m=expired");
	try {
		const token = await fetch(`${OAUTH_BASE}/oauth/v1/token`, {
			method: "POST",
			headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
			body: new URLSearchParams({ grant_type: "authorization_code", code, code_verifier: started.verifier, redirect_uri: ROBLOX_REDIRECT_URI, client_id: clientId(), client_secret: clientSecret() }),
			signal: AbortSignal.timeout(10_000),
		});
		if (!token.ok) throw new Error(`token ${token.status}`);
		const { access_token } = (await token.json()) as { access_token?: string };
		if (!access_token) throw new Error("no access token");
		const info = await fetch(`${OAUTH_BASE}/oauth/v1/userinfo`, { headers: { authorization: `Bearer ${access_token}`, accept: "application/json" }, signal: AbortSignal.timeout(10_000) });
		if (!info.ok) throw new Error(`userinfo ${info.status}`);
		const u = (await info.json()) as { sub?: string; preferred_username?: string; nickname?: string; name?: string };
		const id = String(u.sub ?? "");
		const username = String(u.preferred_username ?? "").slice(0, 50);
		if (!/^\d{1,19}$/.test(id) || !username) throw new Error("userinfo without an id or username");
		const display = String(u.nickname || u.name || "").slice(0, 100) || null;
		const [other] = await sql`select 1 from users where roblox_id = ${id}::bigint and id <> ${viewer.id}::bigint`;
		if (other) return back("?m=taken");
		try {
			await sql`update users set roblox_id = ${id}::bigint, roblox_username = ${username}, roblox_display_name = ${display}, roblox_linked_at = now(), roblox_show = true where id = ${viewer.id}::bigint`;
		} catch {
			return back("?m=taken"); // the unique index, if two link at once
		}
		return back("?m=linked");
	} catch (e) {
		console.error(`roblox link failed: ${(e as Error).message}`);
		return back("?m=failed");
	}
}

// GET /i/roblox/profiles?names=a,b: the links to show, for the profile script
export async function robloxProfiles(url: URL, viewer: Viewer | undefined): Promise<Response> {
	const names = [...new Set((url.searchParams.get("names") ?? "").split(",").map((n) => n.trim().toLowerCase()).filter((n) => /^[a-z0-9_]{1,50}$/.test(n)))].slice(0, 50);
	const out: Record<string, { id: string; username: string }> = {};
	if (names.length) {
		const guest = !viewer || viewer.id === GUEST_ID;
		const rows = await sql`select lower(u.screen_name) as name, u.roblox_id::text as id, u.roblox_username as username from users u
			where lower(u.screen_name) = any(${sql.array(names, "TEXT")}) and u.roblox_id is not null and u.roblox_show and u.status <> 'suspended'
			${guest ? sql`and not ${hiddenFromGuests(sql`u`)}` : sql``}`;
		for (const r of rows) out[r.name] = { id: r.id, username: r.username };
	}
	return Response.json(out, { headers: { "cache-control": "private, max-age=60" } });
}

// the profile meta row's item, drawn from the joined date next to it
export const ROBLOX_CSS = `a[data-xitter-roblox]{text-decoration:none}a[data-xitter-roblox]:hover{text-decoration:underline}`;
export const ROBLOX_SCRIPT = `(function(){var known={},waiting={},timer=null,D=${JSON.stringify(ROBLOX_ICON)};
function nameOf(){var m=/^\\/([A-Za-z0-9_]{1,50})(?:\\/(?:with_replies|media|highlights|articles|likes|superfollows|affiliates|verified_followers|followers|following))?\\/?$/.exec(location.pathname);return m?m[1].toLowerCase():""}
function paint(){var items=document.querySelector('[data-testid="primaryColumn"] [data-testid="UserProfileHeader_Items"]');if(!items)return;var n=nameOf();var mine=items.querySelector("[data-xitter-roblox]");
if(!n){if(mine)mine.remove();return}
if(!(n in known)){waiting[n]=1;if(!timer)timer=setTimeout(ask,60);return}
var r=known[n];if(!r){if(mine)mine.remove();return}
var href="https://www.roblox.com/users/"+r.id+"/profile",text=r.username+" (verified)";
if(mine&&mine.getAttribute("data-xitter-roblox")===n&&mine.getAttribute("href")===href&&items.lastElementChild===mine)return;
if(mine)mine.remove();
var join=items.querySelector('[data-testid="UserJoinDate"]')||items.lastElementChild;if(!join)return;
var a=document.createElement("a");a.setAttribute("data-xitter-roblox",n);a.href=href;a.target="_blank";a.rel="noopener noreferrer";a.className=join.className;a.setAttribute("data-testid","UserRoblox");a.style.color=getComputedStyle(join).color;a.dir="ltr";a.title="Roblox account, verified by Roblox sign-in";
var svg=join.querySelector("svg");if(svg){var s=svg.cloneNode(false);s.setAttribute("viewBox","0 0 24 24");s.innerHTML='<g><path fill-rule="evenodd" d="'+D+'"></path></g>';a.appendChild(s)}
a.appendChild(document.createTextNode(text));items.appendChild(a)}
function ask(){timer=null;var names=Object.keys(waiting);if(!names.length)return;names.forEach(function(n){delete waiting[n];known[n]=null});
fetch("/i/roblox/profiles?names="+encodeURIComponent(names.join(",")),{credentials:"include"}).then(function(r){return r.ok?r.json():{}}).then(function(f){names.forEach(function(n){known[n]=f[n]||null});paint()}).catch(function(){})}
var busy=false;new MutationObserver(function(){if(busy)return;busy=true;requestAnimationFrame(function(){busy=false;paint()})}).observe(document.documentElement,{childList:true,subtree:true});paint()})();`;
