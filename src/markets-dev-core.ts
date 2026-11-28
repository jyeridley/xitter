// The developer portal's pure pieces: scopes, redirect URIs, PKCE, secrets and
// tokens, input checks, and the API's rate limiter. No database, so unit tests
// can load it (scripts/test-markets-dev-core.ts). The database and the pages
// are markets-dev.ts.

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export class DevError extends Error {
	constructor(message: string, readonly status = 400, readonly code = "invalid_request") {
		super(message);
	}
}

// what an app can ask for; "read" is the default
export const SCOPES: Record<string, { label: string; detail: string }> = {
	read: { label: "Read your account", detail: "See your handle and name, your cash balance, your holdings and your order history." },
	trade: { label: "Buy and sell for you", detail: "Place buy and sell orders with your Money. Every order moves the price, exactly as it does on the BSE website." },
};
export const CODE_TTL_S = 300; // an authorization code: five minutes, once
export const ACCESS_TTL_S = 3600; // an access token: an hour
export const REFRESH_TTL_S = 30 * 86400; // a refresh token: thirty days
export const APPS_PER_USER = 10;
export const REDIRECTS_PER_APP = 10;

export const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
export function safeEqual(a: string, b: string): boolean {
	const x = Buffer.from(a), y = Buffer.from(b);
	return x.length === y.length && x.length > 0 && timingSafeEqual(x, y);
}
const b64 = (n: number) => randomBytes(n).toString("base64url");
export const newClientId = () => `bse_${b64(18)}`;
export const newClientSecret = () => `bse_secret_${b64(32)}`;
export const newCode = () => `bse_code_${b64(32)}`;
export const newAccessToken = () => `bse_at_${b64(32)}`;
export const newRefreshToken = () => `bse_rt_${b64(32)}`;

// "read trade" → ["read","trade"]; empty means read; anything unknown is null
export function parseScopes(raw: string | null | undefined): string[] | null {
	const parts = (raw ?? "").split(/[\s,+]+/).filter(Boolean);
	if (!parts.length) return ["read"];
	const out: string[] = [];
	for (const p of parts) {
		if (!Object.hasOwn(SCOPES, p)) return null;
		if (!out.includes(p)) out.push(p);
	}
	return out;
}
export const scopeString = (s: string[]) => s.join(" ");
export const hasScope = (granted: string, need: string) => granted.split(" ").includes(need);

// a redirect URI an app may register: https, or http on this machine for development;
// no fragment, no credentials
export function validRedirectUri(raw: string): boolean {
	if (raw.length > 500 || /\s/.test(raw)) return false;
	let u: URL;
	try {
		u = new URL(raw);
	} catch {
		return false;
	}
	if (u.hash || u.username || u.password) return false;
	if (u.protocol === "https:") return !!u.hostname && u.hostname !== "localhost.";
	if (u.protocol === "http:") return u.hostname === "localhost" || u.hostname === "127.0.0.1" || u.hostname === "[::1]" || u.hostname.endsWith(".localhost");
	return false;
}
// redirect URIs must match exactly (RFC 6749): a plain string comparison against the registered list
export const redirectAllowed = (registered: string[], given: string) => registered.some((r) => r === given);

// PKCE, S256 only: the verifier is 43–128 characters of the unreserved set
export function validVerifier(v: string): boolean {
	return /^[A-Za-z0-9\-._~]{43,128}$/.test(v);
}
export function validChallenge(c: string): boolean {
	return /^[A-Za-z0-9\-_]{43}$/.test(c);
}
export const challengeOf = (verifier: string) => createHash("sha256").update(verifier).digest("base64url");
export function pkceOk(challenge: string, verifier: string): boolean {
	return validVerifier(verifier) && safeEqual(challenge, challengeOf(verifier));
}

export type AppInput = { name: string; description: string; website: string; redirects: string[] };
// `clean` is the site's text filter (it throws on blocked words)
export function checkApp(body: Record<string, unknown>, clean: (v: unknown, max: number) => string): AppInput {
	const name = clean(body.name, 50), description = clean(body.description, 300);
	if ([...name].length < 2) throw new DevError("Give the app a name of at least 2 characters.");
	let website = String(body.website ?? "").trim();
	if (website) {
		let u: URL | undefined;
		try {
			u = new URL(website);
		} catch {}
		if (!u || u.protocol !== "https:" || website.length > 200) throw new DevError("The website has to be an https:// address.");
		website = u.href;
	}
	const redirects = [...new Set(String(body.redirect_uris ?? "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean))];
	if (!redirects.length) throw new DevError("Add at least one redirect URI.");
	if (redirects.length > REDIRECTS_PER_APP) throw new DevError(`An app can have up to ${REDIRECTS_PER_APP} redirect URIs.`);
	for (const r of redirects) if (!validRedirectUri(r)) throw new DevError(`"${r.slice(0, 80)}" isn't a valid redirect URI. Use https:// (http:// only for localhost), with no #fragment.`);
	return { name, description, website, redirects };
}

// The API's own limiter: a fixed window per key (a token, or an address for public data).
const windows = new Map<string, { n: number; reset: number }>();
export type Limit = { ok: boolean; limit: number; remaining: number; reset: number };
export function takeLimit(key: string, limit: number, windowMs: number, now = Date.now()): Limit {
	let w = windows.get(key);
	if (!w || w.reset <= now) {
		w = { n: 0, reset: now + windowMs };
		windows.set(key, w);
		if (windows.size > 5000) for (const [k, v] of windows) if (v.reset <= now) windows.delete(k);
	}
	w.n++;
	return { ok: w.n <= limit, limit, remaining: Math.max(0, limit - w.n), reset: w.reset };
}
export const resetLimits = () => windows.clear();
