import { expect, test } from "bun:test";
import { isBseOobPath, legacyBseRedirect } from "../src/config";

test("OOB callback paths are recognized, with or without a trailing slash", () => {
	expect(isBseOobPath("/oauth/discord-callback")).toBe(true);
	expect(isBseOobPath("/oauth/discord-callback/")).toBe(true);
	expect(isBseOobPath("/oauth/oob")).toBe(true);
	expect(isBseOobPath("/oauth/oob/")).toBe(true);
	expect(isBseOobPath("/oauth/authorize")).toBe(false);
	expect(isBseOobPath("/auth/discord/callback")).toBe(false);
	expect(isBseOobPath("/oauth/discord-callback/extra")).toBe(false);
});

test("trade.xitter.space 301 keeps path and query once BSE_HOST moves, but exempts the OOB pages", () => {
	expect(legacyBseRedirect("trade.xitter.space", "/markets", "?x=1", "bse.jye.supply")).toBe("https://bse.jye.supply/markets?x=1");
	expect(legacyBseRedirect("trade.xitter.space", "/login", "", "bse.jye.supply")).toBe("https://bse.jye.supply/login");
	// query must be preserved on ordinary paths (authorization codes live in the query)
	const q = "?code=keep-me&state=st";
	expect(legacyBseRedirect("trade.xitter.space", "/developers", q, "bse.jye.supply")).toBe("https://bse.jye.supply/developers" + q);
	// OOB pages stay on the registered host so the exact redirect URI still matches
	expect(legacyBseRedirect("trade.xitter.space", "/oauth/discord-callback", q, "bse.jye.supply")).toBeNull();
	expect(legacyBseRedirect("trade.xitter.space", "/oauth/oob", q, "bse.jye.supply")).toBeNull();
	expect(legacyBseRedirect("trade.xitter.space", "/oauth/discord-callback/", q, "bse.jye.supply")).toBeNull();
	// no redirect while trade.xitter.space is still the canonical host
	expect(legacyBseRedirect("trade.xitter.space", "/markets", "?x=1", "trade.xitter.space")).toBeNull();
	expect(legacyBseRedirect("bse.jye.supply", "/markets", "", "bse.jye.supply")).toBeNull();
});
