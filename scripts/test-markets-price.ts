import { expect, test } from "bun:test";
import { PRICE_FLOOR, MAX_PRICE, clampPrice, impactOf } from "../src/markets-price";

test("PRICE_FLOOR is $100", () => {
	expect(PRICE_FLOOR).toBe(100);
});

test("clampPrice floors at $100 and caps at MAX_PRICE", () => {
	expect(clampPrice(100)).toBe(100);
	expect(clampPrice(99.99)).toBe(100);
	expect(clampPrice(0)).toBe(100);
	expect(clampPrice(-50)).toBe(100);
	expect(clampPrice(Number.NEGATIVE_INFINITY)).toBe(100);
	expect(clampPrice(NaN)).toBe(100);
	expect(clampPrice(MAX_PRICE)).toBe(MAX_PRICE);
	expect(clampPrice(MAX_PRICE + 1)).toBe(MAX_PRICE);
	expect(clampPrice(150.1234567)).toBe(150.123457);
});

test("a buy from the floor still lifts the price", () => {
	const { post, fill } = impactOf("buy", 10, 1_000_000, PRICE_FLOOR, 0);
	expect(post).toBeGreaterThan(PRICE_FLOOR);
	expect(fill).toBeGreaterThan(PRICE_FLOOR);
	expect(fill).toBeCloseTo((PRICE_FLOOR + post) / 2, 6);
});

test("a sell at the floor stays at $100 and still fills", () => {
	const { post, fill } = impactOf("sell", 10, 1_000_000, PRICE_FLOOR, 0);
	expect(post).toBe(PRICE_FLOOR);
	expect(fill).toBe(PRICE_FLOOR);
});

test("a sell that would break the floor is clamped after the move", () => {
	// 400 shares of a 1,000,000 book is a large down move (more than 50%)
	const pre = 110;
	const { post, fill } = impactOf("sell", 400, 1_000_000, pre, 0);
	expect(post).toBe(PRICE_FLOOR);
	expect(fill).toBe(clampPrice((pre + PRICE_FLOOR) / 2));
	expect(fill).toBeGreaterThanOrEqual(PRICE_FLOOR);
	expect(fill).toBeLessThan(pre);
});

test("a lone round trip above the floor prints no profit", () => {
	const pre = 200;
	const buy = impactOf("buy", 10, 1_000_000, pre, 0);
	const sell = impactOf("sell", 10, 1_000_000, buy.post, 0);
	expect(sell.fill).toBeCloseTo(buy.fill, 6);
	expect(sell.post).toBeCloseTo(pre, 5);
});

test("new listings and admin edits below the floor clamp to $100", () => {
	expect(clampPrice(0.1)).toBe(PRICE_FLOOR);
	expect(clampPrice(1)).toBe(PRICE_FLOOR);
	expect(clampPrice(99)).toBe(PRICE_FLOOR);
	expect(clampPrice(100)).toBe(PRICE_FLOOR);
	expect(clampPrice(100.5)).toBe(100.5);
});
