// The BSE developer portal: apps (/developers), OAuth2 authorization-code
// sign-in with PKCE (/oauth/authorize, /oauth/token, /oauth/revoke), and the
// public API (/api/v1). Accounts are only ever made on the BSE site; an app
// gets an access token for an account that signed in here and said yes.
// Secrets, codes and tokens are stored as SHA-256 hashes, codes work once,
// and orders go through the same trade path as the website (markets.ts).

import type { Viewer } from "./auth";
import { requestOrigin, isOwnOrigin } from "./config";
import { ImageError, imageFrom } from "./markets-images";
import { sql } from "./db";
import { newId } from "./ids";
import { balanceOf } from "./money";
import {
	ACCESS_TTL_S, APPS_PER_USER, CODE_TTL_S, DevError, REFRESH_TTL_S, SCOPES, challengeOf, checkApp, hasScope, newAccessToken, newClientId, newClientSecret, newCode,
	newRefreshToken, parseScopes, pkceOk, redirectAllowed, safeEqual, scopeString, sha256, takeLimit, validChallenge, type AppInput, type Limit,
} from "./markets-dev-core";

export { DevError };
export type TradeResult = { id: string; ticker: string; side: "buy" | "sell"; qty: number; fill: number; total_cents: number; before: number; after: number };
export type Deps = {
	page: (title: string, main: string, opts?: { status?: number; wide?: boolean; description?: string }) => Promise<Response>;
	esc: (s: string) => string;
	// the site's text filter; throws DevError on blocked words
	cleanText: (v: unknown, max: number) => string;
	// the website's own trade path; throws DevError when an order is refused
	trade: (viewer: { id: string }, body: any, app: { id: string; name: string }) => Promise<TradeResult>;
	ip: string;
};

type App = { id: string; owner_id: string; name: string; description: string; website: string; redirects: string[]; client_id: string; secret_hash: string; disabled: boolean; created_at: Date; secret_rotated_at: Date | null; owner_handle?: string; owner_name?: string; logo_v: number; has_logo: boolean };
const redirectsOf = (v: unknown): string[] => {
	try {
		const a = typeof v === "string" ? JSON.parse(v) : v;
		return Array.isArray(a) ? a.map(String) : [];
	} catch {
		return [];
	}
};
const toApp = (r: any): App => ({ ...r, redirects: redirectsOf(r.redirect_uris), disabled: !!r.disabled, logo_v: Number(r.logo_v || 0), has_logo: !!r.has_logo });
const appLogo = (a: { id: string; has_logo?: boolean; logo_v?: number }) => (a.has_logo ? `/i/markets/app-logo/${a.id}?v=${a.logo_v || 0}` : "");
const appMark = (a: { id: string; name: string; has_logo?: boolean; logo_v?: number }, esc: (s: string) => string, cls = "app-ico") =>
	a.has_logo ? `<img class="${cls}" src="${esc(appLogo(a))}" alt="">` : "";
async function saveAppLogo(appId: string, file: unknown) {
	const im = await imageFrom(file instanceof File && file.size ? file : undefined, "logo");
	if (im) await sql`update bse_apps set logo = ${im.bytes}, logo_type = ${im.type}, logo_v = logo_v + 1 where id = ${appId}::bigint`;
}
const APP_COLS = sql`a.id::text, a.owner_id::text, a.name, a.description, a.website, a.redirect_uris, a.client_id, a.secret_hash, a.disabled, a.created_at, a.secret_rotated_at, a.logo_v, a.logo is not null as has_logo, o.screen_name as owner_handle, coalesce(nullif(o.bse_name, ''), o.name) as owner_name`;

// ---------- apps ----------

export async function appsOf(ownerId: string): Promise<App[]> {
	return (await sql`select ${APP_COLS} from bse_apps a join users o on o.id = a.owner_id where a.owner_id = ${ownerId}::bigint order by a.created_at`).map(toApp);
}
async function appOf(id: string, ownerId: string): Promise<App | undefined> {
	if (!/^\d{1,19}$/.test(id)) return;
	const [r] = await sql`select ${APP_COLS} from bse_apps a join users o on o.id = a.owner_id where a.id = ${id}::bigint and a.owner_id = ${ownerId}::bigint`;
	return r ? toApp(r) : undefined;
}
export async function appByClientId(clientId: string): Promise<App | undefined> {
	if (!/^bse_[A-Za-z0-9_-]{20,40}$/.test(clientId)) return;
	const [r] = await sql`select ${APP_COLS} from bse_apps a join users o on o.id = a.owner_id where a.client_id = ${clientId}`;
	return r ? toApp(r) : undefined;
}
export async function createApp(ownerId: string, input: AppInput): Promise<{ id: string; clientId: string; secret: string }> {
	const [n] = await sql`select count(*)::int as n from bse_apps where owner_id = ${ownerId}::bigint`;
	if (n.n >= APPS_PER_USER) throw new DevError(`You can register up to ${APPS_PER_USER} apps.`);
	const id = newId(), clientId = newClientId(), secret = newClientSecret();
	await sql`insert into bse_apps (id, owner_id, name, description, website, redirect_uris, client_id, secret_hash)
		values (${id}::bigint, ${ownerId}::bigint, ${input.name}, ${input.description}, ${input.website}, ${JSON.stringify(input.redirects)}::text::jsonb, ${clientId}, ${sha256(secret)})`;
	return { id, clientId, secret };
}
async function updateApp(id: string, ownerId: string, input: AppInput) {
	await sql`update bse_apps set name = ${input.name}, description = ${input.description}, website = ${input.website}, redirect_uris = ${JSON.stringify(input.redirects)}::text::jsonb
		where id = ${id}::bigint and owner_id = ${ownerId}::bigint`;
}
async function regenerateSecret(id: string, ownerId: string): Promise<string | undefined> {
	const secret = newClientSecret();
	const done = await sql`update bse_apps set secret_hash = ${sha256(secret)}, secret_rotated_at = now() where id = ${id}::bigint and owner_id = ${ownerId}::bigint returning id`;
	return done.length ? secret : undefined;
}
async function deleteApp(id: string, ownerId: string) {
	await sql`delete from bse_apps where id = ${id}::bigint and owner_id = ${ownerId}::bigint`;
}
const secretMatches = (app: App, secret: string) => safeEqual(sha256(secret), app.secret_hash);

// ---------- codes and tokens ----------

async function issueCode(app: App, userId: string, scopes: string[], redirectUri: string, challenge: string | null): Promise<string> {
	const code = newCode();
	await sql`delete from bse_auth_codes where expires_at < now()`;
	await sql`insert into bse_auth_codes (code_hash, app_id, user_id, scopes, redirect_uri, code_challenge, expires_at)
		values (${sha256(code)}, ${app.id}::bigint, ${userId}::bigint, ${scopeString(scopes)}, ${redirectUri}, ${challenge}, now() + ${CODE_TTL_S} * interval '1 second')`;
	return code;
}
async function issueTokens(appId: string, userId: string, scopes: string, confidential: boolean) {
	const access = newAccessToken(), refresh = newRefreshToken();
	await sql`delete from bse_tokens where refresh_expires_at < now() - interval '7 days' or (revoked_at is not null and revoked_at < now() - interval '30 days')`;
	await sql`insert into bse_tokens (id, app_id, user_id, access_hash, refresh_hash, scopes, access_expires_at, refresh_expires_at, confidential)
		values (${newId()}::bigint, ${appId}::bigint, ${userId}::bigint, ${sha256(access)}, ${sha256(refresh)}, ${scopes}, now() + ${ACCESS_TTL_S} * interval '1 second', now() + ${REFRESH_TTL_S} * interval '1 second', ${confidential})`;
	return { access_token: access, token_type: "Bearer", expires_in: ACCESS_TTL_S, refresh_token: refresh, scope: scopes };
}
type TokenInfo = { id: string; app_id: string; app_name: string; user_id: string; scopes: string; handle: string; name: string };
async function tokenInfo(req: Request): Promise<TokenInfo | undefined> {
	const m = /^Bearer\s+(\S{10,300})$/i.exec(req.headers.get("authorization") ?? "");
	if (!m) return;
	const [t] = await sql`select t.id::text, t.app_id::text, a.name as app_name, t.user_id::text, t.scopes, u.screen_name as handle, u.name
		from bse_tokens t join bse_apps a on a.id = t.app_id and not a.disabled join users u on u.id = t.user_id
		where t.access_hash = ${sha256(m[1])} and t.revoked_at is null and t.access_expires_at > now() and u.deactivated_at is null and u.status <> 'suspended'`;
	if (t) sql`update bse_tokens set last_used_at = now() where id = ${t.id}::bigint and (last_used_at is null or last_used_at < now() - interval '1 minute')`.then(() => {}, () => {});
	return t as TokenInfo | undefined;
}
// a grant is everything an app was given by one account
export async function revokeGrant(userId: string, appId: string) {
	if (!/^\d{1,19}$/.test(appId)) return;
	await sql`update bse_tokens set revoked_at = now() where user_id = ${userId}::bigint and app_id = ${appId}::bigint and revoked_at is null`;
}
export type Grant = { app_id: string; app_name: string; website: string; developer: string; scopes: string[]; since: Date; logo: string };
export async function connectedApps(userId: string): Promise<Grant[]> {
	const rows = await sql`select a.id::text as app_id, a.name as app_name, a.website, o.screen_name as developer, t.scopes, t.created_at, a.logo_v, a.logo is not null as has_logo
		from bse_tokens t join bse_apps a on a.id = t.app_id join users o on o.id = a.owner_id
		where t.user_id = ${userId}::bigint and t.revoked_at is null and t.refresh_expires_at > now() and not a.disabled order by t.created_at`;
	const by = new Map<string, Grant>();
	for (const r of rows) {
		const g = by.get(r.app_id) ?? { app_id: r.app_id, app_name: r.app_name, website: r.website, developer: r.developer, scopes: [], since: r.created_at, logo: r.has_logo ? `/i/markets/app-logo/${r.app_id}?v=${r.logo_v}` : "" };
		for (const s of String(r.scopes).split(" ")) if (s && !g.scopes.includes(s)) g.scopes.push(s);
		if (r.created_at < g.since) g.since = r.created_at;
		by.set(r.app_id, g);
	}
	return [...by.values()];
}

// ---------- shared bits ----------

const csrfOk = (req: Request, form: FormData | undefined, viewer: Viewer) => {
	const origin = req.headers.get("origin");
	const given = String(form?.get("csrf") ?? "");
	return !!form && !!origin && isOwnOrigin(origin) && origin === requestOrigin(req) && safeEqual(given, viewer.csrf);
};
const cors = (res: Response) => {
	res.headers.set("access-control-allow-origin", "*");
	res.headers.set("access-control-allow-headers", "authorization, content-type, idempotency-key");
	res.headers.set("access-control-allow-methods", "GET, POST, OPTIONS");
	res.headers.set("access-control-expose-headers", "x-ratelimit-limit, x-ratelimit-remaining, x-ratelimit-reset, retry-after");
	res.headers.set("access-control-max-age", "86400");
	return res;
};
const limitHeaders = (l: Limit): Record<string, string> => ({ "x-ratelimit-limit": String(l.limit), "x-ratelimit-remaining": String(l.remaining), "x-ratelimit-reset": String(Math.ceil(l.reset / 1000)) });
const date = (d: Date | string | null) => (d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "");
const redirectTo = (loc: string, status = 303) => new Response(null, { status, headers: { location: loc, "cache-control": "no-store" } });

// ---------- OAuth: authorize ----------

type AuthParams = { app: App; redirectUri: string; scopes: string[]; state: string | null; challenge: string | null };
type AuthProblem = { page: string } | { back: string; error: string; description: string; state: string | null; redirectUri: string };
async function readAuth(get: (k: string) => string | null): Promise<AuthParams | AuthProblem> {
	const app = await appByClientId(get("client_id") ?? "");
	if (!app || app.disabled) return { page: "This app isn't available. Check the client_id, or ask the app's developer." };
	let redirectUri = get("redirect_uri") ?? "";
	if (!redirectUri && app.redirects.length === 1) redirectUri = app.redirects[0];
	if (!redirectUri) return { page: "The app didn't say where to send you back (redirect_uri)." };
	if (!redirectAllowed(app.redirects, redirectUri)) return { page: "That redirect_uri isn't one this app registered, so you were not sent back. Redirect URIs have to match exactly." };
	const state = get("state");
	const bad = (error: string, description: string): AuthProblem => ({ back: error, error, description, state, redirectUri });
	if ((get("response_type") ?? "code") !== "code") return bad("unsupported_response_type", "Only response_type=code is supported.");
	const scopes = parseScopes(get("scope"));
	if (!scopes) return bad("invalid_scope", `Unknown scope. Use ${Object.keys(SCOPES).join(", ")}.`);
	const challenge = get("code_challenge") || null;
	if (challenge) {
		if ((get("code_challenge_method") ?? "plain") !== "S256") return bad("invalid_request", "code_challenge_method must be S256.");
		if (!validChallenge(challenge)) return bad("invalid_request", "code_challenge isn't a valid S256 challenge.");
	}
	return { app, redirectUri, scopes, state, challenge };
}
const isProblem = (r: AuthParams | AuthProblem): r is AuthProblem => "page" in r || "back" in r;
function backWith(uri: string, params: Record<string, string | null>): Response {
	const u = new URL(uri);
	for (const [k, v] of Object.entries(params)) if (v !== null) u.searchParams.set(k, v);
	return redirectTo(u.href);
}
const problemResponse = (d: Deps, r: AuthProblem): Promise<Response> | Response =>
	"page" in r
		? d.page("Can't sign in · BSE", `<h1>Can't connect this app</h1><p class="note">${d.esc(r.page)}</p><p class="links"><a href="/">Bloxburg Stock Exchange</a></p>`, { status: 400 })
		: backWith(r.redirectUri, { error: r.error, error_description: r.description, state: r.state });

async function authorizeRoute(req: Request, viewer: Viewer | undefined, d: Deps): Promise<Response> {
	const url = new URL(req.url);
	if (req.method === "GET" || req.method === "HEAD") {
		const a = await readAuth((k) => url.searchParams.get(k));
		if (isProblem(a)) return problemResponse(d, a);
		// accounts are only made on the BSE: sign in or sign up here first, then come back
		if (!viewer) return redirectTo(`/login?next=${encodeURIComponent(url.pathname + url.search)}`, 302);
		return consentPage(req, viewer, a, d);
	}
	if (req.method !== "POST") return new Response("method not allowed", { status: 405 });
	if (!viewer) return redirectTo(`/login?next=${encodeURIComponent("/")}`, 302);
	const form = await req.formData().catch(() => undefined);
	if (!csrfOk(req, form, viewer)) return d.page("Expired · BSE", `<h1>That form expired</h1><p class="note">Go back to the app and start again.</p>`, { status: 403 });
	const a = await readAuth((k) => (form!.has(k) ? String(form!.get(k)) : null));
	if (isProblem(a)) return problemResponse(d, a);
	if (String(form!.get("decision")) !== "allow") return backWith(a.redirectUri, { error: "access_denied", error_description: "The user said no.", state: a.state });
	const code = await issueCode(a.app, viewer.id, a.scopes, a.redirectUri, a.challenge);
	return backWith(a.redirectUri, { code, state: a.state });
}

async function consentPage(req: Request, viewer: Viewer, a: AuthParams, d: Deps): Promise<Response> {
	const e = d.esc;
	const host = (() => { try { return new URL(a.redirectUri).host; } catch { return ""; } })();
	const scopes = a.scopes.map((s) => `<div class="scope"><b>${e(SCOPES[s].label)}</b><div class="note" style="margin:2px 0 0">${e(SCOPES[s].detail)}</div></div>`).join("");
	const hidden = (k: string, v: string | null) => (v === null ? "" : `<input type="hidden" name="${k}" value="${e(v)}">`);
	const next = new URL(req.url);
	const main = `<h1 class="row" style="align-items:center;gap:14px">${appMark(a.app, e, "app-ico")} <span>Connect ${e(a.app.name)}</span></h1>
<p class="note"><b>${e(a.app.name)}</b> by <b>${e(a.app.owner_name || a.app.owner_handle || "")}</b> (@${e(a.app.owner_handle ?? "")}) wants to use your BSE account${a.app.website ? ` · <a href="${e(a.app.website)}" rel="noopener noreferrer nofollow" target="_blank">${e(new URL(a.app.website).host)}</a>` : ""}.</p>
${a.app.description ? `<p class="note">${e(a.app.description)}</p>` : ""}
<h2>It will be able to</h2>${scopes}
<p class="note" style="margin-top:14px">You'll be sent back to <b>${e(host)}</b>. You can disconnect any app later in your account settings. Your password is never shared.</p>
<form method="post" action="/oauth/authorize">
<input type="hidden" name="csrf" value="${e(viewer.csrf)}">
${hidden("client_id", a.app.client_id)}${hidden("redirect_uri", a.redirectUri)}${hidden("scope", scopeString(a.scopes))}${hidden("state", a.state)}${hidden("code_challenge", a.challenge)}${a.challenge ? hidden("code_challenge_method", "S256") : ""}${hidden("response_type", "code")}
<div class="btns"><button type="submit" name="decision" value="deny" class="alt">Cancel</button><button type="submit" name="decision" value="allow">Allow</button></div>
</form>
<p class="links"><span>Signed in as @${e(viewer.screen_name)}</span><a href="/logout?next=${encodeURIComponent(next.pathname + next.search)}">Not you?</a></p>`;
	return d.page(`Connect ${a.app.name} · BSE`, main, { description: "Let an app use your BSE account." });
}

// ---------- OAuth: token and revoke ----------

const oauthJson = (body: unknown, status = 200, extra: Record<string, string> = {}) =>
	cors(Response.json(body, { status, headers: { "cache-control": "no-store", pragma: "no-cache", ...extra } }));
const oauthFail = (error: string, description: string, status = 400) =>
	oauthJson({ error, error_description: description }, status, status === 401 ? { "www-authenticate": 'Basic realm="BSE"' } : {});

async function bodyOf(req: Request): Promise<Record<string, string>> {
	const type = req.headers.get("content-type") ?? "";
	const out: Record<string, string> = {};
	try {
		if (type.includes("application/json")) {
			const j = await req.json();
			if (j && typeof j === "object") for (const [k, v] of Object.entries(j)) if (typeof v === "string") out[k] = v;
		} else for (const [k, v] of (await req.formData()).entries()) if (typeof v === "string") out[k] = v;
	} catch {}
	return out;
}
// the client proves itself with its secret (body or HTTP Basic), or is a public client (PKCE) with just its id
async function clientFor(req: Request, body: Record<string, string>): Promise<{ app?: App; confidential: boolean; failed?: boolean }> {
	let id = body.client_id ?? "", secret = body.client_secret ?? "";
	const basic = /^Basic\s+(\S+)$/i.exec(req.headers.get("authorization") ?? "");
	if (basic) {
		const raw = Buffer.from(basic[1], "base64").toString("utf8"), i = raw.indexOf(":");
		if (i > 0) {
			id = decodeURIComponent(raw.slice(0, i));
			secret = decodeURIComponent(raw.slice(i + 1));
		}
	}
	const app = await appByClientId(id);
	if (!app || app.disabled) return { confidential: false, failed: true };
	if (secret) return secretMatches(app, secret) ? { app, confidential: true } : { failed: true, confidential: false };
	return { app, confidential: false };
}

async function tokenRoute(req: Request): Promise<Response> {
	if (req.method === "OPTIONS") return cors(new Response(null, { status: 204 }));
	if (req.method !== "POST") return oauthFail("invalid_request", "Use POST.", 405);
	const body = await bodyOf(req);
	const client = await clientFor(req, body);
	if (client.failed || !client.app) return oauthFail("invalid_client", "Unknown app, disabled app, or wrong client secret.", 401);
	const app = client.app;
	const type = body.grant_type;
	if (type === "authorization_code") {
		const code = body.code ?? "";
		if (!code || code.length > 200) return oauthFail("invalid_request", "code is required.");
		// single use: the row is gone the moment it's read, whatever happens next
		const [c] = await sql`delete from bse_auth_codes where code_hash = ${sha256(code)} returning app_id::text, user_id::text, scopes, redirect_uri, code_challenge, expires_at > now() as live`;
		if (!c || !c.live || c.app_id !== app.id) return oauthFail("invalid_grant", "That code is wrong, used or expired.");
		if (!body.redirect_uri || !safeEqual(body.redirect_uri, c.redirect_uri)) return oauthFail("invalid_grant", "redirect_uri doesn't match the authorization request.");
		if (c.code_challenge) {
			if (!body.code_verifier || !pkceOk(c.code_challenge, body.code_verifier)) return oauthFail("invalid_grant", "code_verifier doesn't match the code_challenge.");
		} else if (!client.confidential) return oauthFail("invalid_client", "Send client_secret, or use PKCE (code_challenge) for a public client.", 401);
		const [u] = await sql`select 1 from users where id = ${c.user_id}::bigint and deactivated_at is null and status <> 'suspended'`;
		if (!u) return oauthFail("invalid_grant", "That account can't sign in.");
		return oauthJson(await issueTokens(app.id, c.user_id, c.scopes, client.confidential));
	}
	if (type === "refresh_token") {
		const refresh = body.refresh_token ?? "";
		if (!refresh || refresh.length > 300) return oauthFail("invalid_request", "refresh_token is required.");
		// rotated on every use: the old one stops working
		const [t] = await sql`update bse_tokens set revoked_at = now()
			where refresh_hash = ${sha256(refresh)} and app_id = ${app.id}::bigint and revoked_at is null and refresh_expires_at > now()
				and (${client.confidential} or not confidential)
			returning user_id::text, scopes, confidential`;
		if (!t) return oauthFail("invalid_grant", "That refresh token is wrong, used, revoked or expired.");
		return oauthJson(await issueTokens(app.id, t.user_id, t.scopes, t.confidential));
	}
	return oauthFail("unsupported_grant_type", "Use authorization_code or refresh_token.");
}

// RFC 7009: always 200, so a probe learns nothing
async function revokeRoute(req: Request): Promise<Response> {
	if (req.method === "OPTIONS") return cors(new Response(null, { status: 204 }));
	if (req.method !== "POST") return oauthFail("invalid_request", "Use POST.", 405);
	const body = await bodyOf(req);
	const client = await clientFor(req, body);
	if (client.failed || !client.app) return oauthFail("invalid_client", "Unknown app, disabled app, or wrong client secret.", 401);
	const token = body.token ?? "";
	if (token && token.length < 300) {
		const h = sha256(token);
		await sql`update bse_tokens set revoked_at = now() where (access_hash = ${h} or refresh_hash = ${h}) and app_id = ${client.app.id}::bigint and revoked_at is null`;
	}
	return oauthJson({});
}

// ---------- the API ----------

const apiJson = (body: unknown, status = 200, extra: Record<string, string> = {}) => cors(Response.json(body, { status, headers: { "cache-control": "no-store", ...extra } }));
const apiFail = (status: number, code: string, message: string, extra: Record<string, string> = {}) => apiJson({ error: { code, message } }, status, extra);
const money = (n: number) => Math.round(n * 1e6) / 1e6;
const companyOut = (c: any) => ({
	ticker: c.ticker, name: c.name, sector: c.sector || null, price: Number(c.price), prev_close: Number(c.prev_close),
	change_pct: Number(c.prev_close) ? money(((Number(c.price) - Number(c.prev_close)) / Number(c.prev_close)) * 100) : 0,
	shares: Number(c.shares), market_cap: money(Number(c.price) * Number(c.shares)), volume: Number(c.volume), suspended: !!c.suspended,
});

async function apiRoute(req: Request, p: string, d: Deps): Promise<Response> {
	if (req.method === "OPTIONS") return cors(new Response(null, { status: 204 }));
	const path = p.replace(/^\/api\/v1\/?/, "").replace(/\/+$/, "");
	const parts = path ? path.split("/") : [];
	const isOrders = parts[0] === "orders";
	const token = await tokenInfo(req);
	const hadBearer = /^Bearer\s/i.test(req.headers.get("authorization") ?? "");
	// one window per token (orders have their own, smaller one); public data is limited per address
	const lim = token
		? isOrders && req.method === "POST" ? takeLimit(`o:${token.id}`, 30, 60_000) : takeLimit(`t:${token.id}`, 120, 60_000)
		: takeLimit(`ip:${d.ip}`, 60, 60_000);
	const lh = limitHeaders(lim);
	if (!lim.ok) return apiFail(429, "rate_limited", "Too many requests. Slow down and retry.", { ...lh, "retry-after": String(Math.max(1, Math.ceil((lim.reset - Date.now()) / 1000))) });
	const need = (scope: string): Response | undefined => {
		if (!token) return apiFail(401, "invalid_token", hadBearer ? "That access token is invalid, expired or revoked." : "Send an access token: Authorization: Bearer <token>.", { ...lh, "www-authenticate": `Bearer realm="BSE"${hadBearer ? ', error="invalid_token"' : ""}` });
		if (!hasScope(token.scopes, scope)) return apiFail(403, "insufficient_scope", `This token needs the "${scope}" scope.`, { ...lh, "www-authenticate": `Bearer error="insufficient_scope", scope="${scope}"` });
	};
	const ok = (body: unknown, status = 200) => apiJson(body, status, lh);
	const fail = (status: number, code: string, message: string) => apiFail(status, code, message, lh);

	if (!parts.length) return ok({ name: "Bloxburg Stock Exchange API", version: 1, docs: `${requestOrigin(req)}/developers/docs`, endpoints: ["GET /api/v1/markets", "GET /api/v1/markets/{ticker}", "GET /api/v1/me", "GET /api/v1/portfolio", "GET /api/v1/orders", "POST /api/v1/orders"] });

	if ((parts[0] === "markets" || parts[0] === "companies") && parts.length === 1 && req.method === "GET") {
		const rows = await sql`select ticker, name, sector, price, prev_close, shares, volume, suspended from market_companies order by ticker`;
		return ok({ companies: rows.map(companyOut) });
	}
	if ((parts[0] === "markets" || parts[0] === "companies") && parts.length === 2 && req.method === "GET") {
		const ticker = parts[1].toUpperCase();
		if (!/^[A-Z]{2,6}$/.test(ticker)) return fail(404, "not_found", "No such company.");
		const [c] = await sql`select id::text, ticker, name, sector, description, price, prev_close, shares, volume, suspended, listed_at from market_companies where ticker = ${ticker}`;
		if (!c) return fail(404, "not_found", "No such company.");
		const points = Math.min(500, Math.max(1, Math.floor(Number(new URL(req.url).searchParams.get("points") ?? 200)) || 200));
		const hist = await sql`select t, price from (select id, t, price from market_history where company_id = ${c.id}::bigint order by id desc limit ${points}) x order by id`;
		return ok({ ...companyOut(c), description: c.description || "", listed_at: new Date(c.listed_at).toISOString(), history: hist.map((h: any) => ({ t: new Date(h.t).toISOString(), price: Number(h.price) })) });
	}
	if (parts[0] === "me" && parts.length === 1 && req.method === "GET") {
		const denied = need("read");
		if (denied) return denied;
		const cents = await balanceOf(token!.user_id);
				const [av] = await sql`select coalesce(u.bse_avatar_url, u.discord_avatar, case when u.bse_only then l.avatar_url else u.avatar_url end) as avatar, coalesce(nullif(u.bse_name, ''), u.name) as name
			from users u left join users l on l.id = u.bse_link_id and l.status <> 'suspended' and l.deactivated_at is null where u.id = ${token!.user_id}::bigint`;
		const origin = requestOrigin(req);
		const avatar = av?.avatar ? (String(av.avatar).startsWith("http") ? av.avatar : origin + (String(av.avatar).startsWith("/media/") && !String(av.avatar).includes("banner") && /^\/media\/(\d{1,19})$/.test(av.avatar) ? `/profile_images/${/^\/media\/(\d{1,19})$/.exec(av.avatar)![1]}_x96.jpg` : av.avatar)) : `${origin}/abs/sticky/default_profile_images/default_profile_normal.png`;
		return ok({ id: token!.user_id, handle: token!.handle, name: av?.name ?? token!.name, avatar, cash: cents / 100, cash_cents: cents, scope: token!.scopes, app: token!.app_name });
	}
	if ((parts[0] === "portfolio" || parts[0] === "holdings") && parts.length === 1 && req.method === "GET") {
		const denied = need("read");
		if (denied) return denied;
		const rows = await sql`select c.ticker, c.name, c.price::float8 as price, h.qty, h.cost from market_holdings h join market_companies c on c.id = h.company_id where h.user_id = ${token!.user_id}::bigint and h.qty > 0 order by c.ticker`;
		const holdings = rows.map((r: any) => {
			const value = r.qty * r.price, pnl = value - r.cost;
			return { ticker: r.ticker, name: r.name, qty: Number(r.qty), avg_cost: r.qty ? money(r.cost / r.qty) : 0, cost: money(r.cost), price: r.price, value: money(value), pnl: money(pnl), pnl_pct: r.cost ? money((pnl / r.cost) * 100) : 0 };
		});
		const cents = await balanceOf(token!.user_id), equity = holdings.reduce((t: number, h: any) => t + h.value, 0);
		return ok({ cash: cents / 100, equity: money(equity), total: money(cents / 100 + equity), holdings });
	}
	if (isOrders && parts.length === 1 && req.method === "GET") {
		const denied = need("read");
		if (denied) return denied;
		const rows = await sql`select id::text, ticker, side, qty, price::float8 as price, coalesce(total_cents::float8 / 100, total::float8) as total, created_at, app_name from market_txns where user_id = ${token!.user_id}::bigint order by id desc limit 50`;
		return ok({ orders: rows.map((r: any) => ({ id: r.id, ticker: r.ticker, side: r.side, qty: Number(r.qty), price: r.price, total: money(r.total), time: new Date(r.created_at).toISOString(), app: r.app_name ?? null })) });
	}
	if (isOrders && parts.length === 1 && req.method === "POST") {
		const denied = need("trade");
		if (denied) return denied;
		const body = await bodyOf(req.clone());
		let qtyRaw: unknown = body.qty;
		if (req.headers.get("content-type")?.includes("application/json")) {
			try { qtyRaw = ((await req.clone().json()) as any)?.qty; } catch {}
		}
		const ticker = String(body.ticker ?? "").trim().toUpperCase(), side = String(body.side ?? "").toLowerCase();
		const qty = typeof qtyRaw === "number" ? qtyRaw : Number(qtyRaw);
		if (!/^[A-Z]{2,6}$/.test(ticker)) return fail(400, "invalid_ticker", "ticker is required, like BURG.");
		if (side !== "buy" && side !== "sell") return fail(400, "invalid_side", 'side is "buy" or "sell".');
		if (!Number.isInteger(qty) || qty < 1 || qty > 1e9) return fail(400, "invalid_qty", "qty is a whole number of shares, 1 or more.");
		try {
			const t = await d.trade({ id: token!.user_id }, { ticker, side, qty }, { id: token!.app_id, name: token!.app_name });
			const cents = await balanceOf(token!.user_id);
			return ok({ order: { id: t.id, ticker: t.ticker, side: t.side, qty: t.qty, fill_price: t.fill, total: t.total_cents / 100, price_before: t.before, price_after: t.after, app: token!.app_name }, cash: cents / 100 }, 201);
		} catch (e) {
			if (e instanceof DevError) return fail(e.status, e.code === "invalid_request" ? "order_rejected" : e.code, e.message);
			throw e;
		}
	}
	if (!["GET", "POST"].includes(req.method)) return fail(405, "method_not_allowed", "Use GET or POST.");
	return fail(404, "not_found", "No such endpoint. See /developers/docs.");
}

// ---------- pages: the portal ----------

const fmtList = (d: Deps, items: string[]) => `<ul style="margin:6px 0 0;padding-left:18px">${items.map((i) => `<li class="mono" style="font-size:13px;overflow-wrap:anywhere">${d.esc(i)}</li>`).join("")}</ul>`;
const NOTES: Record<string, [string, boolean]> = {
	saved: ["Saved.", false],
	deleted: ["App deleted. Its tokens stopped working.", false],
	bad: ["That didn't work.", true],
};
const hiddenCsrf = (v: Viewer, d: Deps) => `<input type="hidden" name="csrf" value="${d.esc(v.csrf)}">`;
function appForm(d: Deps, viewer: Viewer, action: string, a?: Partial<App>, button = "Register app"): string {
	const e = d.esc;
	const current = a?.id && a.has_logo ? `<div class="row" style="align-items:center;margin:0 0 10px">${appMark(a as App, e)}<span class="note" style="margin:0">Current logo</span></div>` : "";
	return `<form method="post" action="${e(action)}" enctype="multipart/form-data">${hiddenCsrf(viewer, d)}
<label><span>App name</span><input name="name" value="${e(a?.name ?? "")}" maxlength="50" required></label>
<label><span>Description</span><textarea name="description" maxlength="300" placeholder="What does your app do? People see this when they connect it.">${e(a?.description ?? "")}</textarea></label>
<label><span>Website</span><input name="website" type="url" value="${e(a?.website ?? "")}" placeholder="https://example.com" maxlength="200"></label>
<label class="file"><span>Logo</span>${current}<input type="file" name="logo" accept="image/png,image/jpeg,image/gif,image/webp"></label>
<label><span>Redirect URIs <i>(one per line)</i></span><textarea name="redirect_uris" required placeholder="https://example.com/callback">${e((a?.redirects ?? []).join("\n"))}</textarea><small>Where people are sent back after they say yes. They have to match exactly. https only (http://localhost works for development).</small></label>
<button type="submit">${e(button)}</button></form>`;
}
async function portalPage(req: Request, viewer: Viewer | undefined, d: Deps): Promise<Response> {
	const e = d.esc;
	const m = NOTES[new URL(req.url).searchParams.get("m") ?? ""];
	const note = m ? `<p class="${m[1] ? "error" : "ok"}" role="status">${e(m[0])}</p>` : "";
	if (!viewer) {
		const next = encodeURIComponent("/developers");
		return d.page("Developers · BSE", `<h1>Build on the BSE</h1>
<p class="note">Register an app, get API keys, and let people trade from your site. Everyone signs up and signs in here, on the BSE, so every account and every Money balance stays in one place. Your app connects to an account through a sign-in screen the person approves, then trades with an API key.</p>
<div class="btns"><a class="btn" href="/login?next=${next}">Sign in</a><a class="btn alt" href="/signup?next=${next}">Create a BSE account</a></div>
<p class="links"><a href="/developers/docs">Read the docs</a><a href="/markets">Browse the market</a></p>`, { wide: true, description: "Register apps and get API keys for the Bloxburg Stock Exchange." });
	}
	const apps = await appsOf(viewer.id);
	const list = apps.length
		? `<div class="apps">${apps.map((a) => `<div class="app"><div class="row" style="justify-content:space-between;align-items:center"><div class="row" style="align-items:center;gap:12px;min-width:0">${appMark(a, e)}<h3 style="margin:0">${e(a.name)}${a.disabled ? ` <span class="tag" style="border-color:var(--dn);color:var(--dn)">Disabled</span>` : ""}</h3></div><a class="btn sm" href="/developers/apps/${e(a.id)}">Manage</a></div>
<div class="meta">Registered ${e(date(a.created_at))}${a.website ? ` · ${e(new URL(a.website).host)}` : ""}</div>
<dl class="kv"><dt>Client ID</dt><dd class="mono">${e(a.client_id)}</dd><dt>Redirect URIs</dt><dd>${fmtList(d, a.redirects)}</dd></dl></div>`).join("")}</div>`
		: `<p class="note">You haven't registered an app yet.</p>`;
	const admin = viewer.role === "admin" ? `<a href="/developers/admin">All apps (admin)</a>` : "";
	return d.page("Developers · BSE", `<h1>Developer portal</h1>
<p class="note">Register apps to get a client ID and secret. People connect your app through the BSE sign-in screen, and it trades for them with an access token. <a href="/developers/docs">Read the docs</a>.</p>${note}
<h2>Your apps</h2>${list}
<h2>Register an app</h2>${appForm(d, viewer, "/developers/apps")}
<p class="links"><a href="/developers/docs">API docs</a>${admin}<a href="/account">Account settings</a></p>`, { wide: true, description: "Register apps and get API keys for the Bloxburg Stock Exchange." });
}
async function secretPage(d: Deps, title: string, app: { id: string; name: string }, clientId: string, secret: string): Promise<Response> {
	const e = d.esc;
	return d.page(`${title} · BSE`, `<h1>${e(title)}</h1>
<p class="note"><b>${e(app.name)}</b></p>
<label><span>Client ID</span></label><div class="secret">${e(clientId)}</div>
<label><span>Client secret</span></label><div class="secret" id="client-secret">${e(secret)}</div>
<div class="warn"><b>Copy the secret now.</b> It's shown once. We only keep a hash of it, so it can't be shown again. If you lose it, regenerate it. Never put it in a web page or mobile app: public apps should use PKCE and no secret.</div>
<div class="btns"><a class="btn" href="/developers/apps/${e(app.id)}">Done</a><a class="btn alt" href="/developers/docs">Read the docs</a></div>`, { wide: true });
}
async function appPage(req: Request, viewer: Viewer, app: App, d: Deps, error = ""): Promise<Response> {
	const e = d.esc;
	const m = NOTES[new URL(req.url).searchParams.get("m") ?? ""];
	const note = error ? `<p class="error" role="alert">${e(error)}</p>` : m ? `<p class="${m[1] ? "error" : "ok"}" role="status">${e(m[0])}</p>` : "";
	const [use] = await sql`select (select count(distinct user_id)::int from bse_tokens where app_id = ${app.id}::bigint and revoked_at is null and refresh_expires_at > now()) as users,
		(select count(*)::int from market_txns where app_id = ${app.id}::bigint) as orders`;
	return d.page(`${app.name} · Developers · BSE`, `<h1 class="row" style="align-items:center;gap:14px">${appMark(app, e)}<span>${e(app.name)}${app.disabled ? ` <span class="tag" style="border-color:var(--dn);color:var(--dn)">Disabled</span>` : ""}</span></h1>
<p class="note">${app.disabled ? "Staff disabled this app: it can't sign anyone in and its tokens stopped working." : "Registered " + e(date(app.created_at)) + (app.secret_rotated_at ? ` · secret regenerated ${e(date(app.secret_rotated_at))}` : "")}</p>${note}
<dl class="kv"><dt>Client ID</dt><dd class="mono">${e(app.client_id)}</dd><dt>Client secret</dt><dd class="note" style="margin:0">Hidden. Regenerate it below if you've lost it.</dd><dt>Connected people</dt><dd>${use.users}</dd><dt>Orders placed</dt><dd>${use.orders}</dd></dl>
<h2>Details</h2>${appForm(d, viewer, `/developers/apps/${app.id}`, app, "Save changes")}${app.has_logo ? `<form method="post" action="/developers/apps/${e(app.id)}" style="margin-top:8px">${hiddenCsrf(viewer, d)}<input type="hidden" name="name" value="${e(app.name)}"><input type="hidden" name="description" value="${e(app.description)}"><input type="hidden" name="website" value="${e(app.website)}"><input type="hidden" name="redirect_uris" value="${e(app.redirects.join("\n"))}"><input type="hidden" name="remove_logo" value="1"><button type="submit" class="sm alt">Remove logo</button></form>` : ""}
<h2>Client secret</h2><p class="note">Make a new secret. The old one stops working at once; tokens people already gave your app keep working.</p>
<form method="post" action="/developers/apps/${e(app.id)}/secret" onsubmit="return confirm('Regenerate the client secret? The old one stops working immediately.')">${hiddenCsrf(viewer, d)}<button type="submit" class="alt">Regenerate secret</button></form>
<h2>Delete app</h2><p class="note">Deleting the app disconnects everyone who connected it. Orders they placed stay in their history.</p>
<form method="post" action="/developers/apps/${e(app.id)}/delete" onsubmit="return confirm('Delete this app? This can\\'t be undone.')">${hiddenCsrf(viewer, d)}<button type="submit" class="alt danger">Delete app</button></form>
<p class="links"><a href="/developers">All apps</a><a href="/developers/docs">API docs</a></p>`, { wide: true });
}
const appError = (e: unknown) => (e instanceof DevError ? e.message : null);

async function portalRoute(req: Request, p: string, viewer: Viewer | undefined, d: Deps): Promise<Response | undefined> {
	const path = p.replace(/\/+$/, "");
	if (path === "/developers/docs") return docsPage(req, d);
	if (path === "/developers" && (req.method === "GET" || req.method === "HEAD")) return portalPage(req, viewer, d);
	if (path === "/developers/admin") return adminPage(req, viewer, d);
	if (path === "/developers/admin/toggle") return adminToggle(req, viewer, d);
	if (!viewer) return redirectTo(`/login?next=${encodeURIComponent("/developers")}`, 302);
	if (path === "/developers/apps" && req.method === "POST") {
		const form = await req.formData().catch(() => undefined);
		if (!csrfOk(req, form, viewer)) return d.page("Expired · BSE", `<h1>That form expired</h1><p class="note"><a href="/developers">Go back</a> and try again.</p>`, { status: 403 });
		try {
			const input = checkApp(Object.fromEntries(form!.entries()), d.cleanText);
			const made = await createApp(viewer.id, input);
			try { await saveAppLogo(made.id, form!.get("logo")); }
			catch (le) { if (!(le instanceof ImageError)) throw le; }
			return secretPage(d, "App registered", { id: made.id, name: input.name }, made.clientId, made.secret);
		} catch (e) {
			const msg = appError(e);
			if (!msg) throw e;
			const r = await portalPage(req, viewer, d);
			const html = (await r.text()).replace(`<h2>Your apps</h2>`, `<p class="error" role="alert">${d.esc(msg)}</p><h2>Your apps</h2>`);
			return new Response(html, { status: 400, headers: r.headers });
		}
	}
	const m = /^\/developers\/apps\/(\d{1,19})(?:\/(secret|delete))?$/.exec(path);
	if (!m) return undefined;
	const app = await appOf(m[1], viewer.id);
	if (!app) return d.page("Not found · BSE", `<h1>App not found</h1><p class="links"><a href="/developers">All apps</a></p>`, { status: 404, wide: true });
	if (req.method === "GET" || req.method === "HEAD") return m[2] ? undefined : appPage(req, viewer, app, d);
	if (req.method !== "POST") return new Response("method not allowed", { status: 405 });
	const form = await req.formData().catch(() => undefined);
	if (!csrfOk(req, form, viewer)) return d.page("Expired · BSE", `<h1>That form expired</h1><p class="note"><a href="/developers">Go back</a> and try again.</p>`, { status: 403 });
	if (m[2] === "secret") {
		const secret = await regenerateSecret(app.id, viewer.id);
		return secret ? secretPage(d, "New client secret", app, app.client_id, secret) : redirectTo("/developers?m=bad");
	}
	if (m[2] === "delete") {
		await deleteApp(app.id, viewer.id);
		return redirectTo("/developers?m=deleted");
	}
	try {
		await updateApp(app.id, viewer.id, checkApp(Object.fromEntries(form!.entries()), d.cleanText));
		if (String(form!.get("remove_logo") ?? "") === "1") await sql`update bse_apps set logo = null, logo_type = null, logo_v = logo_v + 1 where id = ${app.id}::bigint`;
		else try { await saveAppLogo(app.id, form!.get("logo")); } catch (le) { if (!(le instanceof ImageError)) throw le; else return appPage(req, viewer, app, d, le.message); }
		return redirectTo(`/developers/apps/${app.id}?m=saved`);
	} catch (e) {
		const msg = appError(e);
		if (!msg) throw e;
		const r = await appPage(req, viewer, app, d, msg);
		return new Response(await r.text(), { status: 400, headers: r.headers });
	}
}

// ---------- admin ----------

async function adminPage(req: Request, viewer: Viewer | undefined, d: Deps): Promise<Response> {
	if (!viewer) return redirectTo(`/login?next=${encodeURIComponent("/developers/admin")}`, 302);
	if (viewer.role !== "admin") return d.page("Not found · BSE", `<h1>Not found</h1>`, { status: 404 });
	const e = d.esc;
	const rows = await sql`select a.id::text, a.name, a.client_id, a.disabled, a.created_at, o.screen_name as owner, a.logo_v, a.logo is not null as has_logo,
		(select count(distinct user_id)::int from bse_tokens t where t.app_id = a.id and t.revoked_at is null and t.refresh_expires_at > now()) as users,
		(select count(*)::int from market_txns x where x.app_id = a.id) as orders
		from bse_apps a join users o on o.id = a.owner_id order by a.created_at desc`;
	const body = rows.length
		? `<table class="t"><thead><tr><th>App</th><th>Developer</th><th>Registered</th><th>People</th><th>Orders</th><th>Status</th><th></th></tr></thead><tbody>${rows.map((r: any) => `<tr><td><div class="row" style="align-items:center;gap:10px">${r.has_logo ? `<img class="app-ico" src="${e(`/i/markets/app-logo/${r.id}?v=${r.logo_v}`)}" alt="">` : ""}<div><b>${e(r.name)}</b><div class="mono" style="font-size:12px;color:var(--mut)">${e(r.client_id)}</div></div></div></td><td>@${e(r.owner)}</td><td>${e(date(r.created_at))}</td><td>${r.users}</td><td>${r.orders}</td><td>${r.disabled ? `<span class="tag" style="border-color:var(--dn);color:var(--dn)">Disabled</span>` : "Active"}</td>
<td><form method="post" action="/developers/admin/toggle">${hiddenCsrf(viewer, d)}<input type="hidden" name="id" value="${e(r.id)}"><button type="submit" class="sm ${r.disabled ? "" : "alt danger"}">${r.disabled ? "Enable" : "Disable"}</button></form></td></tr>`).join("")}</tbody></table>`
		: `<p class="note">No apps have been registered yet.</p>`;
	return d.page("Developer apps · Admin · BSE", `<h1>Developer apps</h1><p class="note">Disabling an app stops it signing anyone in and invalidates its tokens straight away. Enabling it brings it back.</p>${body}<p class="links"><a href="/developers">Developer portal</a><a href="/admin">BSE admin</a></p>`, { wide: true });
}
async function adminToggle(req: Request, viewer: Viewer | undefined, d: Deps): Promise<Response> {
	if (!viewer || viewer.role !== "admin" || req.method !== "POST") return new Response("not found", { status: 404 });
	const form = await req.formData().catch(() => undefined);
	if (!csrfOk(req, form, viewer)) return d.page("Expired · BSE", `<h1>That form expired</h1><p class="note"><a href="/developers/admin">Go back</a>.</p>`, { status: 403 });
	const id = String(form!.get("id") ?? "");
	if (/^\d{1,19}$/.test(id)) {
		const [a] = await sql`update bse_apps set disabled = not disabled where id = ${id}::bigint returning name, disabled`;
		if (a) await sql`insert into market_logs (action) values (${`APP ${a.disabled ? "DISABLED" : "ENABLED"} ${a.name} · @${viewer.screen_name}`})`;
	}
	return redirectTo("/developers/admin");
}

// ---------- the account page's list of connected apps ----------

export function connectedAppsHtml(grants: Grant[], viewer: Viewer, d: Deps): string {
	const e = d.esc;
	if (!grants.length) return `<h2>Connected apps</h2><p class="note">No apps are connected to your account. Apps you allow to use it show up here, and you can disconnect them at any time.</p>`;
	return `<h2>Connected apps</h2>${grants.map((g) => `<div class="app" style="margin:10px 0"><div class="row" style="justify-content:space-between;align-items:center"><div class="row" style="align-items:center;gap:12px;min-width:0">${g.logo ? `<img class="app-ico" src="${e(g.logo)}" alt="">` : ""}<div><b>${e(g.app_name)}</b>${g.website ? ` · <a href="${e(g.website)}" rel="noopener noreferrer nofollow" target="_blank">${e(new URL(g.website).host)}</a>` : ""}
<div class="note" style="margin:2px 0 0">By @${e(g.developer)} · can ${g.scopes.map((s) => e(SCOPES[s]?.label.toLowerCase() ?? s)).join(" and ")} · connected ${e(date(g.since))}</div></div></div>
<form method="post" action="/account/apps/revoke" style="margin:0">${hiddenCsrf(viewer, d)}<input type="hidden" name="app" value="${e(g.app_id)}"><button type="submit" class="sm alt">Revoke</button></form></div></div>`).join("")}`;
}
export async function revokeFromAccount(req: Request, viewer: Viewer, d: Deps): Promise<Response> {
	const form = await req.formData().catch(() => undefined);
	if (!csrfOk(req, form, viewer)) return new Response("This form expired. Go back and try again.", { status: 403 });
	await revokeGrant(viewer.id, String(form!.get("app") ?? ""));
	return redirectTo("/account?m=revoked");
}

// ---------- docs ----------

function docsPage(req: Request, d: Deps): Promise<Response> {
	const e = d.esc, o = requestOrigin(req);
	const code = (t: string) => `<pre><code>${e(t)}</code></pre>`;
	const main = `<div class="doc"><h1>BSE developer docs</h1>
<p class="note">Let people trade on the Bloxburg Stock Exchange from your own site or app. Accounts and Money live on the BSE: people sign up and sign in here, approve your app, and your app trades for them with an access token. Base URL: <code class="i">${e(o)}</code></p>
<nav class="toc"><a href="#quickstart">Quick start</a><a href="#flow">Authorization</a><a href="#scopes">Scopes</a><a href="#api">Endpoints</a><a href="#orders">How orders work</a><a href="#errors">Errors &amp; limits</a></nav>

<h2 id="quickstart">Quick start</h2>
<ol><li><a href="/developers">Register an app</a> with your redirect URI(s). Copy the <b>client ID</b> and <b>client secret</b> (shown once).</li>
<li>Send people to the authorize URL. They sign in (or sign up) on the BSE, then see what your app asks for.</li>
<li>They're sent back to your redirect URI with a <code class="i">code</code>. Exchange it for an access token.</li>
<li>Call the API with <code class="i">Authorization: Bearer &lt;access_token&gt;</code>.</li></ol>
<p>Market data needs no token at all:</p>${code(`curl ${o}/api/v1/markets`)}

<h2 id="flow">Authorization (OAuth 2.0 authorization code, PKCE supported)</h2>
<h3>1. Send the person to authorize</h3>${code(`${o}/oauth/authorize
  ?response_type=code
  &client_id=YOUR_CLIENT_ID
  &redirect_uri=https%3A%2F%2Fexample.com%2Fcallback
  &scope=read%20trade
  &state=RANDOM_STRING
  &code_challenge=BASE64URL_SHA256_OF_VERIFIER   (PKCE, recommended)
  &code_challenge_method=S256`)}
<p><code class="i">redirect_uri</code> must match one you registered, exactly. <code class="i">state</code> comes back unchanged: check it. Only <code class="i">S256</code> PKCE is accepted. If they say no you get <code class="i">?error=access_denied&amp;state=…</code>.</p>
<h3>2. Exchange the code for tokens</h3>
<p>Codes work once and expire after 5 minutes.</p>${code(`curl -X POST ${o}/oauth/token \\
  -d grant_type=authorization_code \\
  -d code=CODE_FROM_THE_REDIRECT \\
  -d redirect_uri=https://example.com/callback \\
  -d client_id=YOUR_CLIENT_ID \\
  -d client_secret=YOUR_CLIENT_SECRET \\
  -d code_verifier=YOUR_PKCE_VERIFIER   # only if you sent a code_challenge`)}
${code(`{ "access_token": "bse_at_…", "token_type": "Bearer", "expires_in": 3600,
  "refresh_token": "bse_rt_…", "scope": "read trade" }`)}
<p><b>Confidential apps</b> (a server) send the <code class="i">client_secret</code>. <b>Public apps</b> (a browser or mobile app) must not hold a secret: use PKCE and send only the <code class="i">client_id</code> and <code class="i">code_verifier</code> (43–128 characters from <code class="i">A-Z a-z 0-9 - . _ ~</code>). You can also authenticate with HTTP Basic (<code class="i">client_id:client_secret</code>).</p>
<h3>3. Refresh</h3>
<p>Access tokens last 1 hour. Refresh tokens last 30 days and are rotated: each use gives a new pair and the old refresh token stops working.</p>${code(`curl -X POST ${o}/oauth/token \\
  -d grant_type=refresh_token -d refresh_token=bse_rt_… \\
  -d client_id=YOUR_CLIENT_ID -d client_secret=YOUR_CLIENT_SECRET`)}
<h3>4. Revoke</h3>
<p>Revoke an access or refresh token when someone signs out of your app. People can also disconnect your app any time under <i>Account settings → Connected apps</i>, and every token it holds stops working.</p>${code(`curl -X POST ${o}/oauth/revoke -d token=bse_at_… \\
  -d client_id=YOUR_CLIENT_ID -d client_secret=YOUR_CLIENT_SECRET`)}

<h2 id="scopes">Scopes</h2>
<table class="t"><thead><tr><th>Scope</th><th>Lets the app</th></tr></thead><tbody>
<tr><td><code class="i">read</code></td><td>${e(SCOPES.read.detail)} (<code class="i">GET /me</code>, <code class="i">/portfolio</code>, <code class="i">GET /orders</code>). The default when you ask for none.</td></tr>
<tr><td><code class="i">trade</code></td><td>${e(SCOPES.trade.detail)} (<code class="i">POST /orders</code>). Ask for <code class="i">read trade</code> to also show balances.</td></tr></tbody></table>
<p>Public market data (<code class="i">GET /markets</code>) needs no scope and no token.</p>

<h2 id="api">Endpoints</h2>
<p>Base <code class="i">${e(o)}/api/v1</code>. Everything is JSON. Send <code class="i">Authorization: Bearer &lt;token&gt;</code> where a scope is listed. CORS is open, so you can call it from a browser.</p>
<h3>GET /markets <span class="tag">public</span></h3>
<p>Every listed company with its price. <code class="i">/companies</code> is an alias.</p>${code(`curl ${o}/api/v1/markets`)}
${code(`{ "companies": [ { "ticker": "BURG", "name": "Bloxburg Social", "sector": "Technology", "price": 114.55, "prev_close": 100,
  "change_pct": 14.55, "shares": 1000000, "market_cap": 114550000, "volume": 55549, "suspended": false } ] }`)}
<h3>GET /markets/{ticker} <span class="tag">public</span></h3>
<p>One company, with its price history (oldest first). <code class="i">?points=</code> up to 500.</p>${code(`curl "${o}/api/v1/markets/BURG?points=100"`)}
${code(`{ "ticker": "BURG", "name": "…", "price": 114.55, "description": "…", "listed_at": "2026-11-20T…Z",
  "history": [ { "t": "2026-11-28T08:40:02.000Z", "price": 114.2 }, … ] }`)}
<h3>GET /me <span class="tag">read</span></h3>${code(`curl ${o}/api/v1/me -H "Authorization: Bearer $TOKEN"`)}
${code(`{ "id": "21265…", "handle": "avery", "name": "Avery", "cash": 1000, "cash_cents": 100000, "scope": "read trade", "app": "My App" }`)}
<h3>GET /portfolio <span class="tag">read</span></h3>
<p>Cash, and each holding with its cost and gain. <code class="i">/holdings</code> is an alias.</p>${code(`curl ${o}/api/v1/portfolio -H "Authorization: Bearer $TOKEN"`)}
${code(`{ "cash": 885.4, "equity": 114.6, "total": 1000, "holdings": [ { "ticker": "BURG", "qty": 1, "avg_cost": 114.6, "cost": 114.6,
  "price": 114.6, "value": 114.6, "pnl": 0, "pnl_pct": 0 } ] }`)}
<h3>GET /orders <span class="tag">read</span></h3><p>The account's last 50 orders, with the app that placed each (null: the website).</p>${code(`curl ${o}/api/v1/orders -H "Authorization: Bearer $TOKEN"`)}
<h3>POST /orders <span class="tag">trade</span></h3>
<p><code class="i">qty</code> is a whole number of shares.</p>${code(`curl -X POST ${o}/api/v1/orders \\
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \\
  -d '{"ticker":"BURG","side":"buy","qty":2}'`)}
${code(`{ "order": { "id": "21265…", "ticker": "BURG", "side": "buy", "qty": 2, "fill_price": 114.7, "total": 229.4,
    "price_before": 114.6, "price_after": 114.83, "app": "My App" }, "cash": 770.6 }`)}

<h2 id="orders">How orders work</h2>
<p>Orders use exactly the same path as the website, so everything on the site applies: <b>price impact</b> (a buy pushes the price up, a sell pushes it down, more when other people are piling in), a <b>$100 price floor</b>, and balance checks (you can't spend more cash than the account has or sell shares it doesn't hold). An order fills at the <b>midpoint</b> between the price before and after its own impact. Each order records which app placed it. The account must have accepted the Money terms once on the BSE site.</p>

<h2 id="errors">Errors and limits</h2>
<p>Errors are JSON with the right HTTP status: <code class="i">{ "error": { "code": "…", "message": "…" } }</code></p>
<table class="t"><thead><tr><th>Status</th><th>Code</th><th>Meaning</th></tr></thead><tbody>
<tr><td>400</td><td><code class="i">invalid_ticker</code> <code class="i">invalid_side</code> <code class="i">invalid_qty</code> <code class="i">order_rejected</code></td><td>Bad input, or the BSE refused the order (not enough money, not enough shares, suspended listing…). <code class="i">message</code> says which.</td></tr>
<tr><td>401</td><td><code class="i">invalid_token</code></td><td>Missing, expired, revoked, or the app was disabled. Refresh it, or send the person through authorization again.</td></tr>
<tr><td>403</td><td><code class="i">insufficient_scope</code></td><td>The token wasn't granted that scope.</td></tr>
<tr><td>404</td><td><code class="i">not_found</code></td><td>No such company or endpoint.</td></tr>
<tr><td>429</td><td><code class="i">rate_limited</code></td><td>Slow down. See <code class="i">Retry-After</code>.</td></tr></tbody></table>
<p>Limits are per access token: <b>120 requests a minute</b>, and <b>30 orders a minute</b> on top. Public market data without a token is limited per address (60 a minute). Every response has <code class="i">X-RateLimit-Limit</code>, <code class="i">-Remaining</code> and <code class="i">-Reset</code> headers.</p>
<p class="links"><a href="/developers">Developer portal</a><a href="/markets">Market</a></p></div>`;
	return d.page("Docs · Developers · BSE", main, { wide: true, description: "How to connect an app to the Bloxburg Stock Exchange API." });
}

// ---------- the entry ----------

export async function devRoute(req: Request, p: string, viewer: Viewer | undefined, d: Deps): Promise<Response | undefined> {
	try {
		if (p === "/api/v1" || p.startsWith("/api/v1/")) return await apiRoute(req, p, d);
		if (p === "/oauth/token") return await tokenRoute(req);
		if (p === "/oauth/revoke") return await revokeRoute(req);
		if (p === "/oauth/authorize") return await authorizeRoute(req, viewer, d);
		if (p === "/developers" || p.startsWith("/developers/")) return await portalRoute(req, p, viewer, d);
	} catch (e) {
		// never log what was sent: only that something failed
		console.error("developer portal:", e instanceof Error ? e.message : "error");
		if (p.startsWith("/api/v1")) return apiFail(500, "server_error", "Something went wrong.");
		if (p.startsWith("/oauth/")) return oauthFail("server_error", "Something went wrong.", 500);
		throw e;
	}
}

export { challengeOf };
