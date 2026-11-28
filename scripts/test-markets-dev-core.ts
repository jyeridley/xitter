import { beforeEach, expect, test } from "bun:test";
import {
	DevError, challengeOf, checkApp, hasScope, newAccessToken, newClientId, newClientSecret, newCode, newRefreshToken, parseScopes, pkceOk, redirectAllowed, resetLimits, safeEqual, scopeString,
	sha256, takeLimit, validChallenge, validRedirectUri, validVerifier,
} from "../src/markets-dev-core";

beforeEach(() => resetLimits());

test("secrets and tokens are random, prefixed and never repeat", () => {
	expect(newClientId()).toMatch(/^bse_[A-Za-z0-9_-]{20,40}$/);
	expect(newClientSecret()).toMatch(/^bse_secret_/);
	expect(newCode()).toMatch(/^bse_code_/);
	expect(newAccessToken()).toMatch(/^bse_at_/);
	expect(newRefreshToken()).toMatch(/^bse_rt_/);
	expect(new Set(Array.from({ length: 200 }, newAccessToken)).size).toBe(200);
});

test("sha256 is hex and safeEqual compares in full", () => {
	expect(sha256("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
	expect(safeEqual("a", "a")).toBe(true);
	expect(safeEqual("a", "b")).toBe(false);
	expect(safeEqual("a", "ab")).toBe(false);
	expect(safeEqual("", "")).toBe(false); // an empty secret never matches
});

test("scopes: default read, unknown refused, no repeats", () => {
	expect(parseScopes(null)).toEqual(["read"]);
	expect(parseScopes("")).toEqual(["read"]);
	expect(parseScopes("read trade")).toEqual(["read", "trade"]);
	expect(parseScopes("trade+read,trade")).toEqual(["trade", "read"]);
	expect(parseScopes("read admin")).toBeNull();
	expect(parseScopes("__proto__")).toBeNull();
	expect(scopeString(["read", "trade"])).toBe("read trade");
	expect(hasScope("read trade", "trade")).toBe(true);
	expect(hasScope("read", "trade")).toBe(false);
	expect(hasScope("readtrade", "read")).toBe(false);
});

test("redirect URIs: https, or http on this machine; nothing sneaky", () => {
	for (const ok of ["https://example.com/cb", "https://app.example.com:8443/a?b=c", "http://localhost:3000/cb", "http://127.0.0.1:8080/", "http://app.localhost/x"])
		expect(validRedirectUri(ok)).toBe(true);
	for (const bad of ["http://example.com/cb", "javascript:alert(1)", "https://example.com/cb#frag", "https://user:pw@example.com/", "ftp://x.com/", "example.com/cb", "https://exa mple.com/", "data:text/html,x", ""])
		expect(validRedirectUri(bad)).toBe(false);
	expect(validRedirectUri("https://example.com/" + "a".repeat(600))).toBe(false);
});

test("redirect URIs match exactly", () => {
	const reg = ["https://example.com/cb"];
	expect(redirectAllowed(reg, "https://example.com/cb")).toBe(true);
	expect(redirectAllowed(reg, "https://example.com/cb/")).toBe(false);
	expect(redirectAllowed(reg, "https://example.com/cb?x=1")).toBe(false);
	expect(redirectAllowed(reg, "https://EXAMPLE.com/cb")).toBe(false);
	expect(redirectAllowed(reg, "https://example.com.evil.test/cb")).toBe(false);
	expect(redirectAllowed(reg, "")).toBe(false);
});

test("PKCE S256: the RFC 7636 vector, and wrong verifiers fail", () => {
	const verifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
	const challenge = "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM";
	expect(challengeOf(verifier)).toBe(challenge);
	expect(validVerifier(verifier)).toBe(true);
	expect(validChallenge(challenge)).toBe(true);
	expect(pkceOk(challenge, verifier)).toBe(true);
	expect(pkceOk(challenge, verifier.slice(0, -1) + "A")).toBe(false);
	expect(pkceOk(challenge, "short")).toBe(false);
	expect(pkceOk(challenge, challenge)).toBe(false);
	expect(validChallenge("plain-text")).toBe(false);
	expect(validVerifier("x".repeat(129))).toBe(false);
});

const clean = (v: unknown, max: number) => {
	const t = String(v ?? "").replace(/\s+/g, " ").trim();
	if ([...t].length > max) throw new DevError(`Keep it under ${max} characters`);
	return t;
};
test("checkApp validates and tidies an app form", () => {
	const a = checkApp({ name: "  My  App ", description: "d", website: "https://example.com", redirect_uris: "https://example.com/cb\r\nhttps://example.com/cb\n\nhttp://localhost:3000/cb" }, clean);
	expect(a.name).toBe("My App");
	expect(a.redirects).toEqual(["https://example.com/cb", "http://localhost:3000/cb"]);
	expect(a.website).toBe("https://example.com/");
	expect(() => checkApp({ name: "x", redirect_uris: "https://a.com/" }, clean)).toThrow(DevError);
	expect(() => checkApp({ name: "App", redirect_uris: "" }, clean)).toThrow("redirect URI");
	expect(() => checkApp({ name: "App", redirect_uris: "http://evil.com/cb" }, clean)).toThrow("valid redirect URI");
	expect(() => checkApp({ name: "App", website: "http://x.com", redirect_uris: "https://a.com/" }, clean)).toThrow("https");
	expect(() => checkApp({ name: "App", website: "javascript:1", redirect_uris: "https://a.com/" }, clean)).toThrow(DevError);
	expect(() => checkApp({ name: "App", redirect_uris: Array.from({ length: 11 }, (_, i) => `https://a.com/${i}`).join("\n") }, clean)).toThrow("up to");
});

test("the rate limiter counts per key per window", () => {
	const t = 1_000_000;
	for (let i = 1; i <= 3; i++) expect(takeLimit("k", 3, 60_000, t)).toMatchObject({ ok: true, remaining: 3 - i });
	const over = takeLimit("k", 3, 60_000, t + 10);
	expect(over.ok).toBe(false);
	expect(over.remaining).toBe(0);
	expect(takeLimit("other", 3, 60_000, t + 10).ok).toBe(true);
	expect(takeLimit("k", 3, 60_000, t + 60_001).ok).toBe(true);
});
