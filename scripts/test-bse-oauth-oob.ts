// End-to-end test of the out-of-band OAuth callback page and PKCE public-client
// flow against a running server:
//   bun scripts/test-bse-oauth-oob.ts [base=http://127.0.0.1:3001] [host=trade.localhost:3001]
// Makes a throwaway account and app, then deletes them. Never logs the authorization code.
import { createHash, randomBytes } from "node:crypto";
import { SQL } from "bun";

const base = process.argv[2] ?? "http://127.0.0.1:3001";
const host = process.argv[3] ?? "trade.localhost:3001";
const origin = `http://${host}`;
const TRADE_CB = "https://trade.xitter.space/oauth/discord-callback";
const SUPPLY_CB = "https://bse.jye.supply/oauth/discord-callback";
let fails = 0, passes = 0;
const ok = (cond: unknown, what: string, extra?: unknown) => {
	if (cond) passes++;
	else {
		fails++;
		console.log("FAIL", what, extra ?? "");
	}
};

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
const handle = `oobe${stamp}`, pass = "Passw0rd!oob" + stamp;
const db = new SQL(process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? undefined as any);

async function signUp() {
	const jar = new Jar();
	const page = await req("/signup", { jar });
	const csrf = hidden(await page.text(), "csrf")!;
	const res = await req("/signup", { method: "POST", jar, form: { csrf, name: "OOB Tester", username: handle, password: pass, password2: pass } });
	ok(res.status === 303, `sign up ${handle}`, res.status);
	return jar;
}
async function pageCsrf(jar: Jar, path = "/developers") {
	const html = await (await req(path, { jar })).text();
	return hidden(html, "csrf")!;
}
function authorizeQuery(clientId: string, redirect: string, challenge: string, state: string, scope = "read") {
	const q = new URLSearchParams({ response_type: "code", client_id: clientId, redirect_uri: redirect, scope, state, code_challenge: challenge, code_challenge_method: "S256" });
	return q;
}

try {
	// ---- the page itself: no auth, headers, escaping, alias, copy format
	const xss = `</div><script>window.pwned=1</script>&"'<>`;
	const shown = await req(`/oauth/discord-callback?code=${encodeURIComponent("bse_code_demo")}&state=${encodeURIComponent(xss)}`);
	ok(shown.status === 200, "callback page is public (no auth)", shown.status);
	ok(shown.headers.get("cache-control")?.includes("no-store"), "Cache-Control: no-store");
	ok((shown.headers.get("referrer-policy") ?? "").toLowerCase() === "no-referrer", "Referrer-Policy: no-referrer");
	ok((shown.headers.get("x-robots-tag") ?? "").includes("noindex"), "X-Robots-Tag: noindex");
	ok(!(shown.headers.get("set-cookie") ?? "").includes("session"), "no session cookie is set");
	const html = await shown.text();
	ok(html.includes("<h1>Paste this into Discord</h1>"), "heading text");
	ok(html.includes("bse_code_demo"), "code is shown");
	ok(html.includes("&lt;/div&gt;&lt;script&gt;") && html.includes("&amp;") && html.includes("&quot;") && !html.includes("<script>window.pwned"), "query values are HTML-escaped");
	ok(html.includes("Copy code") && html.includes("Copy state") && html.includes("Copy both"), "copy buttons for each value and both");
	ok(html.includes('{"code":"…","state":"…"}') || html.includes("{&quot;code&quot;:&quot;…&quot;,&quot;state&quot;:&quot;…&quot;}"), "copy-both format is documented on the page");
	ok(html.includes('name="robots"') && html.includes("noindex"), "robots noindex meta");
	ok(html.includes('name="referrer"') && html.includes("no-referrer"), "referrer meta");

	const alias = await req(`/oauth/oob?code=${encodeURIComponent("bse_code_demo")}&state=st`);
	ok(alias.status === 200 && (await alias.text()).includes("<h1>Paste this into Discord</h1>"), " /oauth/oob is an alias");

	const errPage = await req(`/oauth/discord-callback?error=access_denied&error_description=${encodeURIComponent("the person said no")}`);
	const errHtml = await errPage.text();
	ok(errPage.status === 200 && errHtml.includes("access_denied") && errHtml.includes("the person said no"), "error and error_description are shown");
	ok(errHtml.includes('{"error":"…","error_description":"…"}') || errHtml.includes("{&quot;error&quot;"), "error copy-both format is documented");

	const empty = await req("/oauth/discord-callback");
	const emptyHtml = await empty.text();
	ok(empty.status === 200 && emptyHtml.includes("Paste this into Discord") && emptyHtml.includes(TRADE_CB) && emptyHtml.includes(SUPPLY_CB), "empty page lists the registerable URIs");
	ok((await req("/oauth/discord-callback", { method: "POST" })).status === 405, "POST is refused");

	const docs = await (await req("/developers/docs")).text();
	const docsPlain = docs.replaceAll("&quot;", '"').replaceAll("&amp;", "&");
	ok(docsPlain.includes("/oauth/discord-callback") && docsPlain.includes('{"code":"bse_code_…","state":"…"}') && docsPlain.includes("Copy both") && docsPlain.includes("client_secret") && docsPlain.includes("code_verifier"), "docs describe the out-of-band page and copy format");

	// ---- throwaway app: exact-match accepts both production URIs; PKCE public client, no secret
	const jar = await signUp();
	const csrf = await pageCsrf(jar);
	ok(csrf, "signed in: csrf on the portal");
	const made = await req("/developers/apps", { method: "POST", jar, form: { csrf, name: "OOB E2E App", description: "throwaway", website: "", redirect_uris: `${TRADE_CB}\n${SUPPLY_CB}` } });
	const madeHtml = await made.text();
	ok(made.status === 200 && madeHtml.includes("Copy the secret now"), "app registered with both production OOB URIs", made.status);
	const clientId = /bse_[A-Za-z0-9_-]{20,40}/.exec(madeHtml.split("Client ID")[1] ?? "")?.[0] ?? "";
	ok(!!clientId, "client id present");

	const verifier = b64u(randomBytes(48)), challenge = b64u(createHash("sha256").update(verifier).digest());
	const state = "st-" + stamp;
	const q = authorizeQuery(clientId, TRADE_CB, challenge, state);
	const consent = await req(`/oauth/authorize?${q}`, { jar });
	ok(consent.status === 200, "consent screen renders for the trade.xitter.space URI", consent.status);
	const form: Record<string, string> = { decision: "allow" };
	const consentHtml = await consent.text();
	for (const n of ["csrf", "client_id", "redirect_uri", "scope", "state", "code_challenge", "code_challenge_method", "response_type"]) {
		const v = hidden(consentHtml, n);
		if (v !== undefined) form[n] = v;
	}
	ok(form.redirect_uri === TRADE_CB, "consent posts the exact registered redirect URI");
	const allowed = await req("/oauth/authorize", { method: "POST", jar, form });
	ok(allowed.status === 302 || allowed.status === 303, "allow redirects", allowed.status);
	const loc = allowed.headers.get("location") ?? "";
	let code = "";
	try {
		const landed = new URL(loc);
		ok(landed.origin + landed.pathname === TRADE_CB, "redirect lands on the registered trade.xitter.space URI");
		ok(landed.searchParams.get("state") === state, "state is returned unchanged");
		code = landed.searchParams.get("code") ?? "";
		ok(code.startsWith("bse_code_"), "authorization code is present");
	} catch {
		ok(false, "allow Location was not a valid URL");
	}

	// show the code on the BSE-hosted page (same path, test host)
	const page = await req(`/oauth/discord-callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`);
	const pageHtml = await page.text();
	ok(page.status === 200 && pageHtml.includes(code) && pageHtml.includes(state), "callback page displays the issued code and state");

	// public client: PKCE, no client_secret
	const noSecret = await req("/oauth/token", { method: "POST", form: { grant_type: "authorization_code", code, redirect_uri: TRADE_CB, client_id: clientId, code_verifier: verifier } });
	ok(noSecret.status === 200, "PKCE public client exchanges the code with no secret", noSecret.status);
	const tok = await noSecret.json() as { access_token?: string; token_type?: string; error?: string };
	ok(tok.token_type === "Bearer" && !!tok.access_token, "token response has a bearer access token");
	const me = await req("/api/v1/me", { bearer: tok.access_token });
	ok(me.status === 200, "access token works on /api/v1/me", me.status);
	const meBody = await me.json() as { handle?: string };
	ok(meBody.handle === handle, "token belongs to the throwaway account");

	// the code is single-use
	const reuse = await req("/oauth/token", { method: "POST", form: { grant_type: "authorization_code", code, redirect_uri: TRADE_CB, client_id: clientId, code_verifier: verifier } });
	ok(reuse.status === 400, "the code cannot be reused", reuse.status);

	// same flow against the bse.jye.supply URI (and a public client still needs the verifier)
	const verifier2 = b64u(randomBytes(48)), challenge2 = b64u(createHash("sha256").update(verifier2).digest());
	const q2 = authorizeQuery(clientId, SUPPLY_CB, challenge2, "st2-" + stamp);
	const consent2 = await req(`/oauth/authorize?${q2}`, { jar });
	const form2: Record<string, string> = { decision: "allow" };
	const consent2Html = await consent2.text();
	for (const n of ["csrf", "client_id", "redirect_uri", "scope", "state", "code_challenge", "code_challenge_method", "response_type"]) {
		const v = hidden(consent2Html, n);
		if (v !== undefined) form2[n] = v;
	}
	const allowed2 = await req("/oauth/authorize", { method: "POST", jar, form: form2 });
	const loc2 = allowed2.headers.get("location") ?? "";
	let code2 = "";
	try {
		const landed2 = new URL(loc2);
		ok(landed2.origin + landed2.pathname === SUPPLY_CB, "redirect lands on the registered bse.jye.supply URI");
		code2 = landed2.searchParams.get("code") ?? "";
	} catch {
		ok(false, "second allow Location was not a valid URL");
	}
	const noVerifier = await req("/oauth/token", { method: "POST", form: { grant_type: "authorization_code", code: code2, redirect_uri: SUPPLY_CB, client_id: clientId } });
	ok(noVerifier.status === 401 || noVerifier.status === 400, "public client without the PKCE verifier is refused", noVerifier.status);
	// codes are single-use (consumed even on a failed exchange); issue a fresh one
	const verifier3 = b64u(randomBytes(48)), challenge3 = b64u(createHash("sha256").update(verifier3).digest());
	const q4 = authorizeQuery(clientId, SUPPLY_CB, challenge3, "st3-" + stamp);
	const consent4 = await req(`/oauth/authorize?${q4}`, { jar });
	const form4: Record<string, string> = { decision: "allow" };
	const consent4Html = await consent4.text();
	for (const n of ["csrf", "client_id", "redirect_uri", "scope", "state", "code_challenge", "code_challenge_method", "response_type"]) {
		const v = hidden(consent4Html, n);
		if (v !== undefined) form4[n] = v;
	}
	const allowed4 = await req("/oauth/authorize", { method: "POST", jar, form: form4 });
	let code3 = "";
	try { code3 = new URL(allowed4.headers.get("location") ?? "").searchParams.get("code") ?? ""; } catch {}
	const tok2 = await req("/oauth/token", { method: "POST", form: { grant_type: "authorization_code", code: code3, redirect_uri: SUPPLY_CB, client_id: clientId, code_verifier: verifier3 } });
	ok(tok2.status === 200, "PKCE public client works with the bse.jye.supply URI", tok2.status);

	// deny → error query on the registered URI
	const q3 = authorizeQuery(clientId, TRADE_CB, challenge, "deny-" + stamp);
	const consent3 = await req(`/oauth/authorize?${q3}`, { jar });
	const form3: Record<string, string> = { decision: "deny" };
	const consent3Html = await consent3.text();
	for (const n of ["csrf", "client_id", "redirect_uri", "scope", "state", "code_challenge", "code_challenge_method", "response_type"]) {
		const v = hidden(consent3Html, n);
		if (v !== undefined) form3[n] = v;
	}
	const denied = await req("/oauth/authorize", { method: "POST", jar, form: form3 });
	const dloc = denied.headers.get("location") ?? "";
	try {
		const d = new URL(dloc);
		ok(d.origin + d.pathname === TRADE_CB && d.searchParams.get("error") === "access_denied", "deny redirects to the OOB URI with access_denied");
	} catch {
		ok(false, "deny Location was not a valid URL");
	}
} finally {
	const [u] = await db`select id::text from users where screen_name = ${handle}`;
	if (u) {
		await db`delete from bse_apps where owner_id = ${u.id}::bigint`;
		await db`delete from sessions where user_id = ${u.id}::bigint`;
		await db`delete from money_wallets where user_id = ${u.id}::bigint`;
		await db`delete from market_accounts where user_id = ${u.id}::bigint`;
		await db`delete from users where id = ${u.id}::bigint`;
	}
	await db.close();
}
console.log(`${passes} passed, ${fails} failed`);
process.exit(fails ? 1 : 0);
