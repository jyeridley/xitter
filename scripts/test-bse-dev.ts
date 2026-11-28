// End-to-end test of the BSE developer portal against a running server:
//   bun scripts/test-bse-dev.ts [base=http://127.0.0.1:3001] [host=trade.localhost:3001] [company=PNY]
// Makes a throwaway account and app, runs register → authorize → token → buy → portfolio →
// refresh → revoke → 401, plus the refusals, then deletes what it made (and its trades).
// Local servers only: it signs up an account, which it deletes again at the end.
import { createHash, randomBytes } from "node:crypto";
import { SQL } from "bun";

const base = process.argv[2] ?? "http://127.0.0.1:3001";
const host = process.argv[3] ?? "trade.localhost:3001";
const ticker = process.argv[4] ?? "PNY";
const origin = `http://${host}`;
const REDIRECT = "https://client.example.test/callback";
let fails = 0, passes = 0;
const ok = (cond: unknown, what: string, extra?: unknown) => {
	if (cond) passes++;
	else {
		fails++;
		console.log("FAIL", what, extra ?? "");
	}
};

// a browser's cookies
class Jar {
	c = new Map<string, string>();
	take(res: Response) {
		for (const line of res.headers.getSetCookie()) {
			const [kv] = line.split(";"), i = kv.indexOf("=");
			const k = kv.slice(0, i), v = kv.slice(i + 1);
			if (!v || /max-age=0/i.test(line)) this.c.delete(k);
			else this.c.set(k, v);
		}
	}
	get header() { return [...this.c].map(([k, v]) => `${k}=${v}`).join("; "); }
}
async function req(path: string, init: RequestInit & { jar?: Jar; form?: Record<string, string>; json?: unknown; bearer?: string; xorigin?: string } = {}) {
	const headers = new Headers(init.headers);
	headers.set("host", host);
	headers.set("x-forwarded-host", host);
	if (init.jar?.header) headers.set("cookie", init.jar.header);
	if (init.form) {
		headers.set("content-type", "application/x-www-form-urlencoded");
		init.body = new URLSearchParams(init.form).toString();
	}
	if (init.json !== undefined) {
		headers.set("content-type", "application/json");
		init.body = JSON.stringify(init.json);
	}
	if (init.bearer) headers.set("authorization", `Bearer ${init.bearer}`);
	if (init.method === "POST" && !headers.has("origin")) headers.set("origin", init.xorigin ?? origin);
	const res = await fetch(base + path, { ...init, headers, redirect: "manual" });
	init.jar?.take(res);
	return res;
}
const hidden = (html: string, name: string) => new RegExp(`name="${name}" value="([^"]*)"`).exec(html)?.[1]?.replaceAll("&amp;", "&").replaceAll("&quot;", '"');
const b64u = (b: Buffer) => b.toString("base64url");

const stamp = Date.now().toString(36).slice(-6);
const handle = `e2e${stamp}`, pass = "Passw0rd!e2e" + stamp, other = `e2o${stamp}`;
const db = new SQL(process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? undefined as any);
let userIds: string[] = [];

async function signUp(handleName: string) {
	const jar = new Jar();
	const page = await req("/signup", { jar });
	const csrf = hidden(await page.text(), "csrf")!;
	const res = await req("/signup", { method: "POST", jar, form: { csrf, name: "E2E Trader", username: handleName, password: pass, password2: pass } });
	ok(res.status === 303, `sign up ${handleName}`, res.status);
	return jar;
}
async function pageCsrf(jar: Jar, path = "/developers") {
	const html = await (await req(path, { jar })).text();
	return hidden(html, "csrf")!;
}
async function authorize(jar: Jar, clientId: string, scope: string, challenge?: string, redirect = REDIRECT, state = "st" + stamp) {
	const q = new URLSearchParams({ response_type: "code", client_id: clientId, redirect_uri: redirect, scope, state });
	if (challenge) { q.set("code_challenge", challenge); q.set("code_challenge_method", "S256"); }
	return { q, res: await req(`/oauth/authorize?${q}`, { jar }) };
}
async function consent(jar: Jar, clientId: string, scope: string, challenge: string | undefined, decision = "allow") {
	const { res } = await authorize(jar, clientId, scope, challenge);
	ok(res.status === 200, "consent screen renders", res.status);
	const html = await res.text();
	const form: Record<string, string> = { decision };
	for (const n of ["csrf", "client_id", "redirect_uri", "scope", "state", "code_challenge", "code_challenge_method", "response_type"]) {
		const v = hidden(html, n);
		if (v !== undefined) form[n] = v;
	}
	return { html, res: await req("/oauth/authorize", { method: "POST", jar, form }) };
}
const token = (form: Record<string, string>) => req("/oauth/token", { method: "POST", form });

try {
	// ---- sign in on the BSE, accept the Money terms, register an app
	const jar = await signUp(handle);
	const csrf = await pageCsrf(jar);
	ok(csrf, "signed in: csrf on the portal");
	const accept = await req("/i/markets/api/accept", { method: "POST", jar, headers: { "x-csrf-token": csrf }, json: {} });
	ok(accept.status === 200, "accept the Money terms", accept.status);

	const signedOutPortal = await (await req("/developers")).text();
	ok(signedOutPortal.includes("Create a BSE account"), "signed-out portal points to BSE sign up");
	ok((await req("/developers/apps", { method: "POST", form: { name: "x" } })).status === 302, "signed-out register goes to sign in");

	const bad = await req("/developers/apps", { method: "POST", jar, form: { csrf, name: "Bad App", redirect_uris: "http://evil.example/cb" } });
	ok(bad.status === 400 && (await bad.text()).includes("valid redirect URI"), "http redirect refused", bad.status);
	const noCsrf = await req("/developers/apps", { method: "POST", jar, form: { csrf: "nope", name: "Bad", redirect_uris: REDIRECT } });
	ok(noCsrf.status === 403, "app form without the csrf token refused", noCsrf.status);
	const xsite = await req("/developers/apps", { method: "POST", jar, xorigin: "https://evil.example", form: { csrf, name: "Bad", redirect_uris: REDIRECT } });
	ok(xsite.status === 403, "cross-site app form refused", xsite.status);

	const made = await req("/developers/apps", { method: "POST", jar, form: { csrf, name: "E2E Test App", description: "end to end", website: "https://client.example.test", redirect_uris: `${REDIRECT}\nhttp://localhost:5173/cb` } });
	const madeHtml = await made.text();
	ok(made.status === 200 && madeHtml.includes("Copy the secret now"), "app registered and its secret shown", made.status);
	const clientId = /bse_[A-Za-z0-9_-]{20,40}/.exec(madeHtml.split("Client ID")[1] ?? "")?.[0] ?? "";
	const secret = /bse_secret_[A-Za-z0-9_-]+/.exec(madeHtml)?.[0] ?? "";
	ok(clientId && secret, "client id and secret present");
	const [row] = await db`select secret_hash, id::text from bse_apps where client_id = ${clientId}`;
	const appId = row.id as string;
	ok(row.secret_hash === createHash("sha256").update(secret).digest("hex") && !row.secret_hash.includes("secret"), "only the secret's hash is stored");
	const portal = await (await req("/developers", { jar })).text();
	ok(portal.includes("E2E Test App") && portal.includes(clientId) && !portal.includes(secret), "portal lists the app without its secret");

	// ---- authorize: signed out goes to sign in; bad redirect never redirects
	const verifier = b64u(randomBytes(48)), challenge = b64u(createHash("sha256").update(verifier).digest());
	const signedOut = await authorize(new Jar(), clientId, "read trade", challenge);
	ok(signedOut.res.status === 302 && signedOut.res.headers.get("location")!.startsWith("/login?next="), "signed-out authorize goes to BSE sign in", signedOut.res.headers.get("location"));
	const badRedir = await authorize(jar, clientId, "read", challenge, "https://client.example.test/callback/");
	ok(badRedir.res.status === 400 && !badRedir.res.headers.get("location"), "redirect_uri must match exactly (no redirect)", badRedir.res.status);
	const noApp = await authorize(jar, "bse_doesnotexistdoesnotexist", "read", challenge);
	ok(noApp.res.status === 400, "unknown client_id", noApp.res.status);
	const badScope = await authorize(jar, clientId, "read admin", challenge);
	ok(badScope.res.status === 303 && badScope.res.headers.get("location")!.includes("error=invalid_scope") && badScope.res.headers.get("location")!.includes("state=st"), "unknown scope redirects with invalid_scope and state");

	// deny
	const denied = await consent(jar, clientId, "read", challenge, "deny");
	ok(denied.res.headers.get("location")!.startsWith(REDIRECT + "?error=access_denied"), "deny sends access_denied", denied.res.headers.get("location"));

	// allow
	const c1 = await consent(jar, clientId, "read trade", challenge);
	ok(c1.html.includes("E2E Test App") && c1.html.includes("@" + handle) && c1.html.includes("Buy and sell"), "consent names the app, its developer and the scopes");
	const back = new URL(c1.res.headers.get("location")!);
	const code = back.searchParams.get("code")!;
	ok(back.origin + back.pathname === REDIRECT && code && back.searchParams.get("state") === "st" + stamp, "redirected back with code and state", back.href);
	const [codeRow] = await db`select code_hash from bse_auth_codes where app_id = ${appId}::bigint`;
	ok(codeRow && codeRow.code_hash !== code, "the code is stored hashed");

	// ---- token: negatives first, then the real exchange (a failed try burns the code)
	const wrongVerifier = await token({ grant_type: "authorization_code", code, redirect_uri: REDIRECT, client_id: clientId, code_verifier: b64u(randomBytes(48)) });
	ok(wrongVerifier.status === 400 && (await wrongVerifier.json()).error === "invalid_grant", "wrong PKCE verifier refused");
	const burned = await token({ grant_type: "authorization_code", code, redirect_uri: REDIRECT, client_id: clientId, code_verifier: verifier });
	ok(burned.status === 400, "a code is burned by a failed try", burned.status);

	const c2 = await consent(jar, clientId, "read trade", challenge);
	const code2 = new URL(c2.res.headers.get("location")!).searchParams.get("code")!;
	const wrongSecret = await token({ grant_type: "authorization_code", code: code2, redirect_uri: REDIRECT, client_id: clientId, client_secret: secret + "x", code_verifier: verifier });
	ok(wrongSecret.status === 401 && (await wrongSecret.json()).error === "invalid_client", "wrong client secret refused");
	const wrongRedirect = await token({ grant_type: "authorization_code", code: code2, redirect_uri: REDIRECT + "x", client_id: clientId, client_secret: secret, code_verifier: verifier });
	ok(wrongRedirect.status === 400, "token redirect_uri must match");

	const c3 = await consent(jar, clientId, "read trade", challenge);
	const code3 = new URL(c3.res.headers.get("location")!).searchParams.get("code")!;
	const tok = await token({ grant_type: "authorization_code", code: code3, redirect_uri: REDIRECT, client_id: clientId, client_secret: secret, code_verifier: verifier });
	const t = await tok.json() as any;
	ok(tok.status === 200 && t.access_token?.startsWith("bse_at_") && t.refresh_token?.startsWith("bse_rt_") && t.token_type === "Bearer" && t.expires_in === 3600 && t.scope === "read trade", "code exchanged for tokens", t);
	ok(tok.headers.get("cache-control") === "no-store", "token responses aren't cacheable");
	const reuse = await token({ grant_type: "authorization_code", code: code3, redirect_uri: REDIRECT, client_id: clientId, client_secret: secret, code_verifier: verifier });
	ok(reuse.status === 400, "a code works once", reuse.status);
	const [stored] = await db`select access_hash, refresh_hash from bse_tokens where app_id = ${appId}::bigint order by created_at desc limit 1`;
	ok(stored.access_hash === createHash("sha256").update(t.access_token).digest("hex") && stored.access_hash !== t.access_token, "tokens are stored hashed");

	// confidential app without PKCE needs the secret
	const c4 = await consent(jar, clientId, "read", undefined);
	const code4 = new URL(c4.res.headers.get("location")!).searchParams.get("code")!;
	const noSecret = await token({ grant_type: "authorization_code", code: code4, redirect_uri: REDIRECT, client_id: clientId });
	ok(noSecret.status === 401, "without PKCE the secret is required", noSecret.status);

	// ---- the API
	const A = t.access_token as string;
	const pub = await req("/api/v1/markets");
	const pubJson = await pub.json() as any;
	ok(pub.status === 200 && pubJson.companies.some((c: any) => c.ticker === ticker) && pub.headers.get("access-control-allow-origin") === "*" && pub.headers.get("x-ratelimit-limit"), "public markets (no token) with CORS and rate headers");
	const one = await (await req(`/api/v1/markets/${ticker.toLowerCase()}?points=5`)).json() as any;
	ok(one.ticker === ticker && one.price >= 100 && Array.isArray(one.history) && one.history.length <= 5, "company by ticker with history");
	ok((await req("/api/v1/markets/ZZZZ")).status === 404, "unknown ticker is a JSON 404");
	const preflight = await req("/api/v1/orders", { method: "OPTIONS" });
	ok(preflight.status === 204 && preflight.headers.get("access-control-allow-headers")?.includes("authorization"), "CORS preflight");

	const none = await req("/api/v1/me");
	ok(none.status === 401 && (await none.json()).error.code === "invalid_token" && none.headers.get("www-authenticate"), "no token: JSON 401");
	const me = await (await req("/api/v1/me", { bearer: A })).json() as any;
	ok(me.handle === handle && me.cash === 1000 && me.app === "E2E Test App", "GET /me", me);
	const before = one.price as number;
	const qty = 2;
	const buy = await req("/api/v1/orders", { method: "POST", bearer: A, json: { ticker, side: "buy", qty } });
	const bj = await buy.json() as any;
	ok(buy.status === 201 && bj.order.ticker === ticker && bj.order.qty === qty && bj.order.app === "E2E Test App" && bj.order.price_after > bj.order.price_before, "buy through the API (price impact applies)", bj);
	ok(bj.order.fill_price > bj.order.price_before - 1e-9 && bj.order.fill_price < bj.order.price_after + 1e-9, "fill is between the price before and after");
	ok(Math.abs(bj.cash - (1000 - bj.order.total)) < 0.011, "cash fell by the total", bj);
	const pf = await (await req("/api/v1/portfolio", { bearer: A })).json() as any;
	ok(pf.holdings.length === 1 && pf.holdings[0].ticker === ticker && pf.holdings[0].qty === qty && Math.abs(pf.cash - bj.cash) < 1e-9, "portfolio shows the holding", pf);
	const [txn] = await db`select app_id::text, app_name from market_txns where user_id = (select id from users where screen_name = ${handle}) order by id desc limit 1`;
	ok(txn.app_id === appId && txn.app_name === "E2E Test App", "the trade records which app placed it");
	const orders = await (await req("/api/v1/orders", { bearer: A })).json() as any;
	ok(orders.orders[0].app === "E2E Test App", "order history names the app");

	const floorSell = await req("/api/v1/orders", { method: "POST", bearer: A, json: { ticker, side: "sell", qty: 5 } });
	ok(floorSell.status === 400 && (await floorSell.json()).error.message.includes("shares"), "can't sell shares you don't hold", floorSell.status);
	const huge = await req("/api/v1/orders", { method: "POST", bearer: A, json: { ticker, side: "buy", qty: 5_000_000 } });
	ok(huge.status === 400, "can't buy more than your money covers (or the listing holds)", huge.status);
	for (const [body, code] of [[{ ticker: "??", side: "buy", qty: 1 }, "invalid_ticker"], [{ ticker, side: "hold", qty: 1 }, "invalid_side"], [{ ticker, side: "buy", qty: 1.5 }, "invalid_qty"], [{ ticker, side: "buy", qty: 0 }, "invalid_qty"]] as const) {
		const r = await req("/api/v1/orders", { method: "POST", bearer: A, json: body });
		ok(r.status === 400 && (await r.json()).error.code === code, `order validation: ${code}`, r.status);
	}
	const sell = await req("/api/v1/orders", { method: "POST", bearer: A, json: { ticker, side: "sell", qty } });
	ok(sell.status === 201, "sell back through the API", sell.status);

	// ---- scopes: a read-only token can't trade
	const c5 = await consent(jar, clientId, "read", challenge);
	const code5 = new URL(c5.res.headers.get("location")!).searchParams.get("code")!;
	const ro = await (await token({ grant_type: "authorization_code", code: code5, redirect_uri: REDIRECT, client_id: clientId, client_secret: secret, code_verifier: verifier })).json() as any;
	const roBuy = await req("/api/v1/orders", { method: "POST", bearer: ro.access_token, json: { ticker, side: "buy", qty: 1 } });
	ok(roBuy.status === 403 && (await roBuy.json()).error.code === "insufficient_scope", "read-only token can't trade");
	ok((await req("/api/v1/me", { bearer: ro.access_token })).status === 200, "read-only token can read");

	// ---- the account page lists the app; refresh rotates
	const acct = await (await req("/account", { jar })).text();
	ok(acct.includes("Connected apps") && acct.includes("E2E Test App"), "account settings lists the connected app");
	const rf = await token({ grant_type: "refresh_token", refresh_token: t.refresh_token, client_id: clientId, client_secret: secret });
	const t2 = await rf.json() as any;
	ok(rf.status === 200 && t2.access_token && t2.access_token !== A, "refresh gives a new pair");
	const oldRefresh = await token({ grant_type: "refresh_token", refresh_token: t.refresh_token, client_id: clientId, client_secret: secret });
	ok(oldRefresh.status === 400, "a used refresh token is dead");
	ok((await req("/api/v1/me", { bearer: A })).status === 401, "refreshing retires the old access token with it");

	// ---- revoke one token via /oauth/revoke
	const rv = await req("/oauth/revoke", { method: "POST", form: { token: t2.access_token, client_id: clientId, client_secret: secret } });
	ok(rv.status === 200, "revoke endpoint answers 200");
	ok((await req("/api/v1/me", { bearer: t2.access_token })).status === 401, "revoked access token → 401");
	ok((await token({ grant_type: "refresh_token", refresh_token: t2.refresh_token, client_id: clientId, client_secret: secret })).status === 400, "revoking a token revokes its refresh token too");

	// ---- revoke from account settings → 401 everywhere
	const acsrf = await pageCsrf(jar, "/account");
	const rvAcct = await req("/account/apps/revoke", { method: "POST", jar, form: { csrf: acsrf, app: appId } });
	ok(rvAcct.status === 303, "revoke from account settings", rvAcct.status);
	ok((await req("/api/v1/me", { bearer: ro.access_token })).status === 401, "after revoke: /me → 401");
	ok((await req("/api/v1/portfolio", { bearer: ro.access_token })).status === 401, "after revoke: portfolio → 401");
	ok((await req("/api/v1/orders", { method: "POST", bearer: ro.access_token, json: { ticker, side: "buy", qty: 1 } })).status === 401, "after revoke: orders → 401");
	ok(!(await (await req("/account", { jar })).text()).includes("E2E Test App"), "revoked app leaves the connected list");

	// ---- another account can't touch this app, admin disable
	const jar2 = await signUp(other);
	const csrf2 = await pageCsrf(jar2);
	ok((await req(`/developers/apps/${appId}`, { jar: jar2 })).status === 404, "another account can't open the app");
	ok((await req(`/developers/apps/${appId}/delete`, { method: "POST", jar: jar2, form: { csrf: csrf2 } })).status === 404, "another account can't delete the app");
	ok((await req("/developers/admin", { jar: jar2 })).status === 404, "admin list is staff-only");
	const [{ n: stillThere }] = await db`select count(*)::int as n from bse_apps where id = ${appId}::bigint`;
	ok(stillThere === 1, "the app is still there");

	// disable by hand (the admin button does the same update) and check it bites
	await db`update bse_apps set disabled = true where id = ${appId}::bigint`;
	ok((await authorize(jar, clientId, "read", challenge)).res.status === 400, "disabled app can't authorize");
	ok((await token({ grant_type: "refresh_token", refresh_token: "x".repeat(20), client_id: clientId, client_secret: secret })).status === 401, "disabled app can't use the token endpoint");
	await db`update bse_apps set disabled = false where id = ${appId}::bigint`;

	// a live token dies with a disabled app
	const c6 = await consent(jar, clientId, "read", challenge);
	const code6 = new URL(c6.res.headers.get("location")!).searchParams.get("code")!;
	const live = await (await token({ grant_type: "authorization_code", code: code6, redirect_uri: REDIRECT, client_id: clientId, client_secret: secret, code_verifier: verifier })).json() as any;
	ok((await req("/api/v1/me", { bearer: live.access_token })).status === 200, "new token works");
	await db`update bse_apps set disabled = true where id = ${appId}::bigint`;
	ok((await req("/api/v1/me", { bearer: live.access_token })).status === 401, "a disabled app's tokens stop working");
	await db`update bse_apps set disabled = false where id = ${appId}::bigint`;

	// ---- regenerate the secret, edit, delete
	const csrfA = await pageCsrf(jar, `/developers/apps/${appId}`);
	const regen = await req(`/developers/apps/${appId}/secret`, { method: "POST", jar, form: { csrf: csrfA } });
	const secret2 = /bse_secret_[A-Za-z0-9_-]+/.exec(await regen.text())?.[0] ?? "";
	ok(regen.status === 200 && secret2 && secret2 !== secret, "regenerate shows a new secret once");
	ok((await token({ grant_type: "refresh_token", refresh_token: live.refresh_token, client_id: clientId, client_secret: secret })).status === 401, "the old secret stopped working");
	ok((await token({ grant_type: "refresh_token", refresh_token: live.refresh_token, client_id: clientId, client_secret: secret2 })).status === 200, "the new secret works");
	const edit = await req(`/developers/apps/${appId}`, { method: "POST", jar, form: { csrf: csrfA, name: "E2E Renamed", description: "x", website: "", redirect_uris: REDIRECT } });
	ok(edit.status === 303, "edit saved", edit.status);
	ok((await (await req(`/developers/apps/${appId}`, { jar })).text()).includes("E2E Renamed"), "edit shows");
	const del = await req(`/developers/apps/${appId}/delete`, { method: "POST", jar, form: { csrf: csrfA } });
	ok(del.status === 303, "delete app", del.status);
	ok((await req("/api/v1/me", { bearer: live.access_token })).status === 401, "deleting the app kills its tokens");
	const rows = await db`select count(*)::int as n from bse_tokens where app_id = ${appId}::bigint`;
	ok(rows[0].n === 0, "its token rows are gone");

	// ---- the API rate limit: a token over its window gets 429 with Retry-After
	const jar3 = jar;
	const made2 = await req("/developers/apps", { method: "POST", jar: jar3, form: { csrf, name: "E2E Limit", redirect_uris: REDIRECT } });
	const h2 = await made2.text();
	const cid2 = /bse_[A-Za-z0-9_-]{20,40}/.exec(h2.split("Client ID")[1] ?? "")![0], sec2 = /bse_secret_[A-Za-z0-9_-]+/.exec(h2)![0];
	const cc = await consent(jar3, cid2, "read", undefined);
	const lt = await (await token({ grant_type: "authorization_code", code: new URL(cc.res.headers.get("location")!).searchParams.get("code")!, redirect_uri: REDIRECT, client_id: cid2, client_secret: sec2 })).json() as any;
	let limited: Response | undefined;
	for (let i = 0; i < 125 && !limited; i++) {
		const r = await req("/api/v1/me", { bearer: lt.access_token });
		if (r.status === 429) limited = r;
	}
	ok(limited && limited.headers.get("retry-after") && (await limited.json()).error.code === "rate_limited", "per-token rate limit → 429 with Retry-After");
} finally {
	// ---- clean up: the test accounts, their trades and apps. Restore the company's volume.
	for (const h of [handle, other]) {
		const [u] = await db`select id::text from users where screen_name = ${h}`;
		if (!u) continue;
		const tx = await db`select ticker, qty from market_txns where user_id = ${u.id}::bigint`;
		for (const r of tx) await db`update market_companies set volume = greatest(0, volume - ${r.qty}) where ticker = ${r.ticker}`;
		await db`delete from market_txns where user_id = ${u.id}::bigint`;
		await db`delete from market_holdings where user_id = ${u.id}::bigint`;
		await db`delete from money_wallets where user_id = ${u.id}::bigint`;
		await db`delete from sessions where user_id = ${u.id}::bigint`;
		await db`delete from users where id = ${u.id}::bigint`;
	}
	await db.close();
}
console.log(`${passes} passed, ${fails} failed`);
process.exit(fails ? 1 : 0);
