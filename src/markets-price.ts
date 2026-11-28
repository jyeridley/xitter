// Hard floor and ceiling for every BSE price: trades, the tick, news shocks,
// fair value, admin edits and new listings all clamp through clampPrice().
export const PRICE_FLOOR = 100;
export const MAX_PRICE = 1e12;
// a buy or sell: Δln(price) = IMPACT_K × (qty / shares) × (1 + MOMENTUM_PER × other
// distinct investors on this side in the last 15 minutes), capped at 5× per order.
// The order fills at the midpoint of the pre- and post-trade price, so a round trip
// of the same size prints no profit — unless a sell is stopped by the floor, in
// which case the fill is the midpoint of the pre-trade price and the floor.
export const IMPACT_K = 2000, MOMENTUM_PER = 0.55, IMPACT_CAP = Math.log(5);

export function clampPrice(p: number): number {
	if (!Number.isFinite(p) || p <= PRICE_FLOOR) return PRICE_FLOOR;
	if (p >= MAX_PRICE) return MAX_PRICE;
	return Number(p.toFixed(6));
}

// Compute the move first, then clamp, so a sale at or near the floor still
// fills and just cannot take the price under $100.
export function impactOf(side: "buy" | "sell", qty: number, shares: number, price: number, recentSameSide: number): { post: number; fill: number } {
	const momentum = 1 + MOMENTUM_PER * Math.max(0, recentSameSide);
	const logMove = Math.min(IMPACT_K * (qty / Math.max(shares, 1)) * momentum, IMPACT_CAP);
	const post = clampPrice(price * Math.exp((side === "buy" ? 1 : -1) * logMove));
	return { post, fill: clampPrice((price + post) / 2) };
}
