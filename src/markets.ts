// BSE, the Bloxburg Stock Exchange, at /i/markets and bse.jye.supply: staff (the admin role) and
// any account can list companies (checkmarked ones show as verified), prices drift a little
// every two seconds, and every signed-in account trades with its money
// (money.ts: the wallet's balance is the cash; a buy takes from it and a sale
// pays into it, in the same transaction as the shares). Everyone sees the same
// market (Postgres); signed out, or with Money off, it's read-only. A port
// of Jye's one-file tradex.html, whose page script is markets-client.js. The BSE name is on every page people see.
//
// Trades move the price (a buy multiplies it up, a sell multiplies it down);
// the two-second tick is a small wiggle around that, with a rare news shock.
// Like the election page (election.ts), a browser opening /i/markets gets it
// inside the client with its side bars (tidy.ts frames /i/markets/embed in the
// main column); frames, ?embed=1 and link fetchers get the page alone.

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Viewer } from "./auth";
import { getViewer, login, startSession, sessionCookies, clearedCookies, SECURE, sessionKey } from "./auth";
import { BSE_NAME, BSE_OAUTH_CLIENT_ID, BSE_SHORT, PUBLIC_ORIGIN, bseOrigin, isBseHost, isBseHostName, isOwnOrigin, requestOrigin } from "./config";
import { recordSignIn, requestCountry } from "./login-history";
import { isReserved, usernameProblem } from "./invites";
import { forgetHeld, handleHeld } from "./held";
import { blockedNameIn, forbiddenText } from "./names";
import { looksBlank } from "./text-clean";
import { newId } from "./ids";
import { passwordStep } from "./password-sign-in";
import { loadLook, nightModeCookies } from "./themes/api";
import { answerChallenge } from "./two-factor";
import { redeemBseAuthorizationCode } from "./oauth";
import { sql } from "./db";
import { hateIn, hateInName } from "./hate";
import { avatarSrc } from "./model";
import { serveAvatar } from "./media";
import { GUEST_ID } from "./blocks";
import { art, artType } from "./verified-art";
import { acceptDisclaimer, balanceOf, disclaimerAccepted, disclaimerText, economy } from "./money";
import { PRICE_FLOOR, MAX_PRICE, clampPrice, impactOf } from "./markets-price";
import { hit, limitedResponse } from "./ratelimit";
import { NAME_MAX, feature, hasBlockedPhrase, settings } from "./settings";
import { MONEY_ICON } from "./tidy";

export const MARKETS_PATH = "/i/markets";
const API = `${MARKETS_PATH}/api/`;
const OWN_HOST = new URL(PUBLIC_ORIGIN).host;
// what an account may list (staff list any number)
export const SECTORS = ["Food & Drink", "Retail", "Technology", "Energy", "Transport", "Real Estate", "Finance", "Entertainment", "Health", "Industrial", "Services", "Other"];
const OWN_MAX = 2;
const HIST = 500; // price points kept per company (the original's cap)
const HIST_SENT = 200; // the most the page draws (its widest range)
const INDEX = 300; // market-cap points kept
const LOGS = 300;
const CATS = ["Markets", "Corporate", "Economy", "Policy", "Major event"];
const MAX_LOGO = 1_000_000;
// the walk (see tick): a small wiggle each two-second step, as a fraction of the price.
// Trades move the price a lot more; fair value follows them, so this
// pull does not walk a trade back. Rare news shocks are applied after the wiggle.
const STEP = 0.0004, PULL = 0.02, FAIR_DRIFT = 0.00015;
const SHOCK_ODDS = 0.00018; // about one per company every three hours
const SEED = 120; // steps of history a new listing starts with

const esc = (t: string) => String(t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const json = (v: unknown, status = 200) => Response.json(v, { status, headers: { "cache-control": "no-store" } });
const fail = (message: string, status = 400) => json({ error: message }, status);
const fmt = (n: number) => "$" + Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
// a share price: four decimals under a dollar, where its moves are
const fmtP = (n: number) => (n < 1 ? "$" + Number(n).toFixed(4) : fmt(n));
const big = (n: number) => (n >= 1e12 ? "$" + (n / 1e12).toFixed(2) + "T" : n >= 1e9 ? "$" + (n / 1e9).toFixed(2) + "B" : n >= 1e6 ? "$" + (n / 1e6).toFixed(2) + "M" : fmt(n));
const pct = (a: number, b: number) => (b ? ((a - b) / b) * 100 : 0);
const sg = (x: number) => (x >= 0 ? "+" : "") + x.toFixed(2) + "%";
const isAdmin = (v: Viewer | undefined) => v?.role === "admin";
const moneyOn = () => feature("money");
const coinName = () => `${settings().instance_name} Money`;

// ---------- the market's clock ----------

let ticking = false;
let ticks = 0;
let changed = 0; // bumped by every write: the shared state's cache key
async function tick() {
	if (ticking) return;
	ticking = true;
	try {
		// each listed price takes a small random step (log-normal, so a $100
		// stock moves as visibly as a $1,000 one), pulled gently back towards a fair
		// value that follows trades and wanders only slightly itself; prices keep
		// six decimals, so no move is rounded away. Volume trickles in, more for
		// the bigger companies. A rare news shock (±10–40% and a headline) is applied after.
		const moved = await sql`with u as (
			update market_companies set
				fair = least(${MAX_PRICE}, greatest(${PRICE_FLOOR}, coalesce(fair, price::float8) * exp(random_normal(0, ${FAIR_DRIFT})))),
				price = greatest(${PRICE_FLOOR}, least(${MAX_PRICE}, round((price::float8 * exp(random_normal(0, ${STEP}) + ${PULL} * ln(coalesce(fair, price::float8) / price::float8)))::numeric, 6))),
				volume = volume + floor(power(random(), 2) * greatest(12, shares / 20000.0))::bigint
			where not suspended returning id, price)
			insert into market_history (company_id, price) select id, price from u returning company_id`;
		if (moved.length) {
			await sql`insert into market_index (value) select coalesce(sum(price * shares), 0)::float8 from market_companies`;
			changed++;
		}
		await newsShocks();
		if (++ticks % 30 === 1) await prune();
	} catch (e) {
		if (ticks % 300 === 0) console.error("markets tick", e);
	} finally {
		ticking = false;
	}
}
// a market with history: the walk a price took to get where it is, run
// backwards from it, two seconds a step, so a new listing (or one whose chart
// is flat) looks like it has been trading for a while. Prices only; nobody's
// shares or Money are touched.
const normal = () => Math.sqrt(-2 * Math.log(1 - Math.random())) * Math.cos(2 * Math.PI * Math.random());
function pastWalk(price: number, n: number): number[] {
	const out = [price];
	let p = price;
	for (let i = 1; i < n; i++) {
		p = Math.max(PRICE_FLOOR, p * Math.exp(-(normal() * STEP * 1.6) + 0.04 * Math.log(price / p)));
		out.unshift(Number(p.toFixed(6)));
	}
	return out;
}
async function seedHistory(db: typeof sql, id: string, price: number, n = SEED) {
	const walk = pastWalk(price, n), now = Date.now();
	const ts = walk.map((_, i) => new Date(now - (n - 1 - i) * 2000 - 1000).toISOString());
	await db`insert into market_history (company_id, t, price) select ${id}, t::timestamptz, p::numeric from unnest(${ts}::text[], ${walk.map(String)}::text[]) as x(t, p)`;
	return walk;
}
// companies whose chart is flat or nearly empty get a past; then a flat market-cap line is redrawn from them
async function revive() {
	const flat = await sql`select c.id::text, c.price::float8 as price from market_companies c
		where (select count(distinct h.price) from market_history h where h.company_id = c.id) <= 3
			or (select count(*) from market_history h where h.company_id = c.id) < 20`;
	for (const c of flat) {
		await sql.begin(async (tx) => {
			await tx`delete from market_history where company_id = ${c.id}`;
			await seedHistory(tx, c.id, c.price);
			await tx`update market_companies set volume = greatest(volume, floor(shares * (0.004 + random() * 0.008))::bigint) where id = ${c.id}`;
		});
	}
	const [ix] = await sql`select count(*)::int as n, count(distinct round(value::numeric, 4))::int as d from (select value from market_index order by id desc limit ${INDEX}) x`;
	if (flat.length || ix.n < 20 || ix.d <= 1) await redrawIndex();
	if (flat.length) changed++;
}
async function redrawIndex() {
	await sql.begin(async (tx) => {
		await tx`delete from market_index`;
		await tx`insert into market_index (t, value)
			select g.t, coalesce(sum(coalesce((select h.price from market_history h where h.company_id = c.id and h.t <= g.t order by h.t desc limit 1), c.price) * c.shares), 0)::float8
			from (select distinct date_trunc('second', t) as t from market_history order by 1 desc limit ${INDEX}) g cross join market_companies c group by g.t order by g.t`;
	});
}
// a new listing opens with a past: its chart, a day's worth of volume, a headline, and the market-cap line follows
async function listedWithHistory(db: typeof sql, id: string, price: number, name: string, ticker: string) {
	const walk = await seedHistory(db, id, price);
	await db`update market_companies set prev_close = ${walk[0]}, fair = ${price}, volume = floor(shares * (0.004 + random() * 0.008))::bigint where id = ${id}`;
	await db`insert into market_headlines (text, cat, ticker) values (${`${name} (${ticker}) lists on the BSE at ${fmt(price)}`}, 'Corporate', ${ticker})`;
	setTimeout(() => redrawIndex().then(() => changed++).catch(() => {}), 500);
}
// flat charts get their past first, then the clock starts
if (process.env.MARKETS_TICK !== "0")
	setTimeout(() => {
		revive()
			.catch((e) => console.error("markets revive", e))
			.finally(() => setInterval(tick, 2000).unref?.());
	}, 3000).unref?.();

async function prune() {
	await sql`delete from market_history h using (select id from (select id, row_number() over (partition by company_id order by id desc) rn from market_history) x where rn > ${HIST}) d where h.id = d.id`;
	await sql`delete from market_index where id <= (select id from market_index order by id desc offset ${INDEX} limit 1)`;
}

const SHOCK_UP = [
	(n: string, t: string, p: number) => `${n} (${t}) jumps ${p}% on a surprise burst of demand`,
	(n: string, t: string, p: number) => `${n} (${t}) rallies ${p}% after a strong outlook`,
	(n: string, t: string, p: number) => `${n} (${t}) surges ${p}% on unexpected buying`,
];
const SHOCK_DOWN = [
	(n: string, t: string, p: number) => `${n} (${t}) sinks ${p}% after a sudden wave of selling`,
	(n: string, t: string, p: number) => `${n} (${t}) drops ${p}% on a weak outlook`,
	(n: string, t: string, p: number) => `${n} (${t}) slides ${p}% after investors rush for the exit`,
];
async function newsShocks() {
	const rows = (await sql`select id::text, ticker, name, price::float8 from market_companies where not suspended`) as { id: string; ticker: string; name: string; price: number }[];
	for (const c of rows) {
		if (Math.random() >= SHOCK_ODDS) continue;
		const shock = 0.1 + Math.random() * 0.3;
		const up = Math.random() < 0.5;
		const price = clampPrice(c.price * (up ? 1 + shock : 1 - shock));
		const pct = Math.round(shock * 100);
		const lines = up ? SHOCK_UP : SHOCK_DOWN;
		const text = lines[Math.floor(Math.random() * lines.length)]!(c.name, c.ticker, pct);
		await sql`update market_companies set price = ${price}, fair = ${price} where id = ${c.id}`;
		await sql`insert into market_history (company_id, price) values (${c.id}, ${price})`;
		await sql`insert into market_headlines (text, cat, ticker, breaking) values (${text}, 'Major event', ${c.ticker}, ${shock >= 0.25})`;
		changed++;
	}
}

async function log(action: string, viewer?: Viewer) {
	await sql`insert into market_logs (action) values (${viewer ? `${action} · @${viewer.screen_name}` : action})`;
	await sql`delete from market_logs where id <= (select id from market_logs order by id desc offset ${LOGS} limit 1)`;
}
async function event(name: string, detail: string, viewer: Viewer) {
	await sql`insert into market_events (name, detail) values (${name}, ${detail})`;
	await log(`EVENT ${name} · ${detail}`, viewer);
}
// the original's reprice(): a new price, a point on its chart, a log line
async function reprice(id: string, ticker: string, price: number, why: string, viewer: Viewer) {
	const p = clampPrice(price);
	await sql`update market_companies set price = ${p}, fair = ${p} where id = ${id}`;
	await sql`insert into market_history (company_id, price) values (${id}, ${p})`;
	await log(`${ticker} ${fmtP(p)} (${why})`, viewer);
}

// ---------- what the page draws ----------

type Owner = { id: string; handle: string; name: string; bse: boolean; link: string | null; badge: string | null; avatar: string; custom: boolean; sq: boolean };
const DEFAULT_PFP = "/abs/sticky/default_profile_images/default_profile_normal.png";
// an account's picture, sized for the market's rows and headers; our own uploads stay
// on this host's path so they load wherever the market is opened from
const pfpOf = (url: string | null | undefined): string => {
	const id = url && /^\/media\/(\d{1,19})$/.exec(url)?.[1];
	return id ? `/profile_images/${id}_x96.jpg` : (avatarSrc(url) ?? DEFAULT_PFP);
};
// organisations and governments have square pictures across the site, people round ones (model.ts pictureShape)
const squareBadge = (t: string | null | undefined) => t === "business" || t === "government";
type Company = { id: string; name: string; ticker: string; logo: string; img: string; sq: boolean; price: number; prevClose: number; shares: number; volume: number; listed: number; suspended: boolean; sector: string; description: string; owner: Owner | null; holders: any[]; holderCount: number; trades: any[]; hist: [number, number][] };
type Shared = { companies: Company[]; index: [number, number][]; headlines: any[]; events: any[]; gap: number };
let cache: { key: number; at: number; value: Promise<Shared> } | undefined;

async function loadShared(): Promise<Shared> {
	// who holds each company and its latest trades, public on its page: a BSE-only
	// account shows its linked social account's picture and checkmark
	const PERSON = sql`u.screen_name as handle, u.name, u.bse_only, case when u.bse_only then l.verified_type else u.verified_type end as badge,
		case when u.bse_only then coalesce(l.avatar_url, u.discord_avatar) else u.avatar_url end as avatar, l.screen_name as link`;
	const [rows, hist, index, headlines, events, gap, holders, trades] = await Promise.all([
		sql`select c.id::text, c.name, c.ticker, c.logo_v, c.logo is not null as has_logo, c.price::float8, c.prev_close::float8, c.shares::float8, c.volume::float8, (extract(epoch from c.listed_at) * 1000)::float8 as listed, c.suspended,
			coalesce(c.sector, '') as sector, coalesce(c.description, '') as description, u.id::text as owner_id, u.screen_name as owner_handle, u.name as owner_name, u.bse_only as owner_bse, l.screen_name as owner_link,
			case when u.bse_only then l.verified_type else u.verified_type end as owner_badge, case when u.bse_only then coalesce(l.avatar_url, u.discord_avatar) else u.avatar_url end as owner_avatar
			from market_companies c left join users u on u.id = c.owner_id and u.status <> 'suspended' and u.deactivated_at is null
			left join users l on l.id = u.bse_link_id and l.status <> 'suspended' and l.deactivated_at is null order by c.id`,
		sql`select company_id::text as c, (extract(epoch from t) * 1000)::float8 as t, price::float8 as p from (select company_id, t, price, id, row_number() over (partition by company_id order by id desc) rn from market_history) x where rn <= ${HIST_SENT} order by company_id, id`,
		sql`select (extract(epoch from t) * 1000)::float8 as t, value from (select * from market_index order by id desc limit ${INDEX}) x order by id`,
		sql`select id::text, text, cat, ticker, breaking, (extract(epoch from created_at) * 1000)::float8 as t from market_headlines order by id desc limit 100`,
		sql`select id::text, name, detail, (extract(epoch from created_at) * 1000)::float8 as t from market_events order by id desc limit 100`,
		sql`select value from market_state where key = 'gap'`,
		sql`select x.c, x.qty, x.n, ${PERSON} from (select company_id::text as c, user_id, qty, count(*) over (partition by company_id)::int as n,
				row_number() over (partition by company_id order by qty desc, user_id) as rn
				from market_holdings h where qty > 0 and exists (select 1 from users v where v.id = h.user_id and v.status <> 'suspended' and v.deactivated_at is null)) x
			join users u on u.id = x.user_id left join users l on l.id = u.bse_link_id and l.status <> 'suspended' and l.deactivated_at is null
			where x.rn <= 25 order by x.c, x.qty desc`,
		sql`select x.ticker, x.side, x.qty, x.price::float8 as price, (extract(epoch from x.created_at) * 1000)::float8 as t, ${PERSON}
			from (select ticker, side, qty, price, created_at, user_id, row_number() over (partition by ticker order by id desc) as rn from market_txns where created_at > now() - interval '30 days') x
			join users u on u.id = x.user_id left join users l on l.id = u.bse_link_id and l.status <> 'suspended' and l.deactivated_at is null
			where x.rn <= 15 and u.status <> 'suspended' and u.deactivated_at is null order by x.ticker, x.created_at desc`,
	]);
	const person = (r: any) => ({ handle: r.handle, name: r.name, bse: !!r.bse_only, link: r.link ?? null, badge: r.badge ?? null, avatar: pfpOf(r.avatar), sq: squareBadge(r.badge) });
	const holdersBy = new Map<string, { list: any[]; n: number }>();
	for (const r of holders) {
		const e = holdersBy.get(r.c) ?? holdersBy.set(r.c, { list: [], n: r.n }).get(r.c)!;
		e.list.push({ ...person(r), qty: r.qty });
	}
	const tradesBy = new Map<string, any[]>();
	for (const r of trades) (tradesBy.get(r.ticker) ?? tradesBy.set(r.ticker, []).get(r.ticker)!).push({ ...person(r), side: r.side, qty: r.qty, price: r.price, t: r.t });
	const byCo = new Map<string, [number, number][]>();
	for (const h of hist) (byCo.get(h.c) ?? byCo.set(h.c, []).get(h.c)!).push([h.t, h.p]);
	return {
		companies: rows.map((c: any) => {
			const logo = c.has_logo ? `${MARKETS_PATH}/logo/${c.id}?v=${c.logo_v}` : "";
			const owner: Owner | null = c.owner_id ? { id: c.owner_id, handle: c.owner_handle, name: c.owner_name, bse: !!c.owner_bse, link: c.owner_link ?? null, badge: c.owner_badge ?? null, avatar: pfpOf(c.owner_avatar), custom: !!c.owner_avatar, sq: squareBadge(c.owner_badge) } : null;
			// the founder's own picture first, then an uploaded logo, then the founder's default one; none at all draws the ticker
			const img = owner?.custom ? owner.avatar : logo || owner?.avatar || "";
			return {
			id: c.id, name: c.name, ticker: c.ticker, logo, img, sq: owner ? owner.sq : !!logo,
			price: c.price, prevClose: c.prev_close, shares: c.shares, volume: c.volume, listed: c.listed, suspended: c.suspended,
			sector: c.sector, description: c.description,
			owner,
			holders: holdersBy.get(c.id)?.list ?? [],
			holderCount: holdersBy.get(c.id)?.n ?? 0,
			trades: tradesBy.get(c.ticker) ?? [],
			hist: byCo.get(c.id) ?? [],
		};
		}),
		index: index.map((x: any) => [x.t, x.value]),
		headlines: headlines.map((h: any) => ({ id: h.id, text: h.text, cat: h.cat, ticker: h.ticker ?? "", brk: h.breaking, t: h.t })),
		events: events.map((e: any) => ({ id: e.id, name: e.name, detail: e.detail, t: e.t })),
		gap: gap[0]?.value ?? 0,
	};
}
// one read of the market per tick, however many are watching
function shared(): Promise<Shared> {
	if (!cache || cache.key !== changed || Date.now() - cache.at > 5000) {
		const value = loadShared();
		cache = { key: changed, at: Date.now(), value };
		value.catch(() => (cache = undefined));
	}
	return cache.value;
}

// an account's side of the market: its money (money.ts) are its cash
async function account(viewer: Viewer) {
	const on = moneyOn();
	const [[u], holdings, txns, [owned]] = await Promise.all([
		sql`select u.status, u.name, u.bse_only, case when u.bse_only then l.verified_type else u.verified_type end as verified_type,
			case when u.bse_only then coalesce(l.avatar_url, u.discord_avatar) else u.avatar_url end as avatar_url, l.screen_name as link_handle
			from users u left join users l on l.id = u.bse_link_id and l.status <> 'suspended' and l.deactivated_at is null where u.id = ${viewer.id}`,
		sql`select company_id::text as id, qty, cost from market_holdings where user_id = ${viewer.id}`,
		sql`select side, ticker, qty, price::float8, coalesce(total_cents::float8 / 100, total::float8) as total, (extract(epoch from created_at) * 1000)::float8 as t from market_txns where user_id = ${viewer.id} order by id desc limit 100`,
		sql`select count(*)::int as n from market_companies where owner_id = ${viewer.id}`,
	]);
	// the wallet is only made (with the instance's starting balance) once Money is on
	const cents = on ? await balanceOf(viewer.id) : null;
	const accepted = on ? await disclaimerAccepted(viewer.id) : false;
	const canList = !!u && u.status !== "restricted" && u.status !== "suspended";
	return {
		handle: viewer.screen_name,
		bse: !!u?.bse_only,
		link: u?.link_handle ?? null,
		name: u?.name ?? viewer.screen_name,
		avatar: pfpOf(u?.avatar_url),
		sq: squareBadge(u?.verified_type),
		cash: cents === null ? null : cents / 100,
		accepted,
		badge: u?.verified_type ?? null,
		canList: canList || isAdmin(viewer),
		owned: owned.n,
		ownMax: isAdmin(viewer) ? null : OWN_MAX,
		holdings: Object.fromEntries(holdings.map((h: any) => [h.id, { qty: h.qty, cost: h.cost }])),
		txns,
	};
}

async function state(viewer: Viewer | undefined) {
	const [s, me] = await Promise.all([shared(), viewer ? account(viewer) : null]);
	const on = moneyOn();
	return {
		...s, me, admin: isAdmin(viewer), instance: settings().instance_name,
		money: { on, name: coinName(), disclaimer: on && me && !me.accepted ? disclaimerText() : null },
		sectors: SECTORS,
		// the instance's own checkmark art (verified-art.ts), the pictures the rest of the site shows
		checks: { blue: art("blue"), gold: art("gold"), grey: art("grey") },
	};
}

// ---------- trading ----------

class Refusal extends Error {
	constructor(message: string, readonly status = 400) {
		super(message);
	}
}

// A buy takes its money from the wallet and a sale pays into it, in one
// transaction with the shares: the company's row, then the wallet, then the
// holding are locked, so two orders at once can't spend the same coins.
async function trade(viewer: Viewer, body: any) {
	if (!moneyOn()) throw new Refusal("Trading opens once Money is turned on.");
	const side = body?.side === "sell" ? "sell" : body?.side === "buy" ? "buy" : null;
	const q = Math.floor(Number(body?.qty));
	if (!side) throw new Refusal("Choose buy or sell");
	if (!(q > 0) || q > 1e9) throw new Refusal("Enter a quantity");
	const [me] = await sql`select status from users where id = ${viewer.id}`;
	if (me?.status === "restricted") throw new Refusal("Your account can't trade right now.");
	if (!(await disclaimerAccepted(viewer.id))) throw new Refusal(`Accept the ${coinName()} terms first.`);
	await sql.begin(async (tx) => {
		const [c] = await tx`select id::text, ticker, price::float8, shares, suspended from market_companies where id = ${idOf(body?.id)} for update`;
		if (!c) throw new Refusal("Company not found");
		if (c.suspended) throw new Refusal("This listing is suspended");
		const recent = await tx`select user_id::text as id from market_txns where ticker = ${c.ticker} and side = ${side} and created_at > now() - interval '15 minutes' and user_id <> ${viewer.id}::bigint`;
		const sameSide = new Set((recent as { id: string }[]).map((r) => r.id)).size;
		const { post, fill } = impactOf(side, q, Number(c.shares), c.price, sameSide);
		await tx`insert into money_wallets (user_id, balance_cents) values (${viewer.id}::bigint, ${economy().starting_cents}) on conflict (user_id) do nothing`;
		const [w] = await tx`select balance_cents::bigint as cents from money_wallets where user_id = ${viewer.id}::bigint for update`;
		const cents = Math.round(q * fill * 100);
		if (!Number.isSafeInteger(cents) || cents < 0 || (side === "buy" && cents <= 0)) throw new Refusal("That order is too big");
		if (side === "buy") {
			if (cents > Number(w.cents)) throw new Refusal("You don't have enough money for that.");
			await tx`update money_wallets set balance_cents = balance_cents - ${cents} where user_id = ${viewer.id}::bigint`;
			await tx`insert into market_holdings (user_id, company_id, qty, cost) values (${viewer.id}, ${c.id}, ${q}, ${cents / 100})
				on conflict (user_id, company_id) do update set qty = market_holdings.qty + excluded.qty, cost = market_holdings.cost + excluded.cost`;
		} else {
			const [h] = await tx`select qty, cost from market_holdings where user_id = ${viewer.id} and company_id = ${c.id} for update`;
			if (!h || h.qty < q) throw new Refusal("You don't have that many shares");
			const avg = h.cost / h.qty;
			if (h.qty - q < 0.0001) await tx`delete from market_holdings where user_id = ${viewer.id} and company_id = ${c.id}`;
			else await tx`update market_holdings set qty = qty - ${q}, cost = cost - ${avg * q} where user_id = ${viewer.id} and company_id = ${c.id}`;
			await tx`update money_wallets set balance_cents = balance_cents + ${cents} where user_id = ${viewer.id}::bigint`;
		}
		await tx`update market_companies set volume = volume + ${q}, price = ${post}, fair = ${post} where id = ${c.id}`;
		await tx`insert into market_history (company_id, price) values (${c.id}, ${post})`;
		await tx`insert into market_txns (user_id, side, ticker, qty, price, total, total_cents) values (${viewer.id}, ${side}, ${c.ticker}, ${q}, ${fill}, ${cents / 100}, ${cents})`;
	});
	changed++;
}

// ---------- listing: any account in good standing, and staff ----------

function cleanText(v: unknown, max: number) {
	const t = String(v ?? "").replace(/\s+/g, " ").trim();
	if ([...t].length > max) throw new Refusal(`Keep it under ${max} characters`);
	if (t && (hateIn(t) || hasBlockedPhrase(t))) throw new Refusal("That text can't be used here");
	return t;
}
async function register(viewer: Viewer, b: any) {
	const [u] = await sql`select verified_type, status from users where id = ${viewer.id}`;
	if (!u || u.status === "restricted" || u.status === "suspended") throw new Refusal("Your account can't list a company right now.", 403);
	const name = cleanText(b.name, 50), tk = String(b.ticker ?? "").trim().toUpperCase();
	const sector = SECTORS.includes(b.sector) ? b.sector : null;
	const description = cleanText(b.description, 200);
	const price = Number(b.price), sh = Math.floor(Number(b.shares));
	if ([...name].length < 2) throw new Refusal("Give the company a name");
	if (!/^[A-Z]{2,5}$/.test(tk)) throw new Refusal("Tickers are 2 to 5 letters");
	if (!sector) throw new Refusal("Choose a sector");
	if (description.length < 10) throw new Refusal("Describe the company in a sentence");
	if (!(price >= PRICE_FLOOR && price <= 1000)) throw new Refusal("The starting price is between $100 and $1,000");
	if (!(sh >= 1000 && sh <= 10_000_000)) throw new Refusal("Shares outstanding are between 1,000 and 10,000,000");
	const p = clampPrice(Math.round(price * 100) / 100);
	await sql.begin(async (tx) => {
		// one account's listings counted under a lock of its own, so two at once can't both fit
		await tx`select pg_advisory_xact_lock(hashtext(${`market-list:${viewer.id}`}))`;
		const [n] = await tx`select count(*)::int as n from market_companies where owner_id = ${viewer.id}`;
		if (n.n >= OWN_MAX) throw new Refusal(`You can list up to ${OWN_MAX} companies`);
		const [c] = await tx`insert into market_companies (name, ticker, price, prev_close, shares, owner_id, sector, description)
			values (${name}, ${tk}, ${p}, ${p}, ${sh}, ${viewer.id}, ${sector}, ${description}) on conflict (ticker) do nothing returning id`;
		if (!c) throw new Refusal("That ticker is taken");
		await listedWithHistory(tx, c.id, p, name, tk);
	});
	await log(`REGISTERED ${tk}`, viewer);
}
// a company's founder (or staff) keeps its name, sector, line and logo up to date
async function editCompany(viewer: Viewer, b: any) {
	const [c] = await sql`select id::text, ticker, owner_id::text from market_companies where id = ${idOf(b.id)}`;
	if (!c) throw new Refusal("Company not found", 404);
	if (c.owner_id !== viewer.id && !isAdmin(viewer)) throw new Refusal("Only its founder can edit this company", 403);
	const name = cleanText(b.name, 50), description = cleanText(b.description, 200);
	const sector = SECTORS.includes(b.sector) ? b.sector : null;
	if ([...name].length < 2) throw new Refusal("Give the company a name");
	if (!sector) throw new Refusal("Choose a sector");
	await sql`update market_companies set name = ${name}, sector = ${sector}, description = ${description} where id = ${c.id}`;
	await log(`EDITED ${c.ticker}`, viewer);
}

// ---------- staff ----------

// staff can tie any company to an account by @handle, so it wears that account's picture and checkmark;
// undefined leaves it as it is, an empty one unlinks it
async function ownerOf(v: unknown): Promise<string | null | undefined> {
	if (v === undefined || v === null) return undefined;
	const h = String(v).trim().replace(/^@/, "");
	if (!h) return null;
	if (!/^[A-Za-z0-9_]{1,15}$/.test(h)) throw new Refusal("That isn't a username");
	const [u] = await sql`select id::text from users where lower(screen_name) = lower(${h}) and deactivated_at is null`;
	if (!u) throw new Refusal(`No account @${h}`);
	return u.id;
}

function logoOf(v: unknown): { bytes: Buffer; type: string } | null | undefined {
	if (v === undefined || v === null || v === "") return undefined;
	const m = /^data:(image\/(?:png|jpeg|gif|webp));base64,([A-Za-z0-9+/=]+)$/.exec(String(v));
	if (!m) throw new Refusal("The logo must be a PNG, JPEG, GIF or WebP image");
	const bytes = Buffer.from(m[2], "base64");
	if (bytes.length > MAX_LOGO) throw new Refusal("The logo must be under 1 MB");
	return { bytes, type: m[1] };
}
const tickerOf = (v: unknown) => String(v ?? "").trim().toUpperCase().slice(0, 6);
const idOf = (v: unknown) => String(v ?? "").replace(/\D/g, "").slice(0, 19) || "0";
async function company(id: unknown) {
	const [c] = await sql`select id::text, ticker, name, price::float8 from market_companies where id = ${idOf(id)}`;
	if (!c) throw new Refusal("No company");
	return c as { id: string; ticker: string; name: string; price: number };
}
async function listed() {
	return (await sql`select id::text, ticker, price::float8 from market_companies where not suspended`) as { id: string; ticker: string; price: number }[];
}

const ADMIN: Record<string, (b: any, v: Viewer) => Promise<unknown>> = {
	async list(b, v) {
		const name = String(b.name ?? "").trim().slice(0, 80), tk = tickerOf(b.ticker), price = Number(b.price), sh = Math.floor(Number(b.shares));
		if (!name || !tk || !(price >= PRICE_FLOOR) || !(sh > 0)) throw new Refusal("Enter name, ticker, a price of at least $100, and shares");
		if (price > 1e12 || sh > 1e15) throw new Refusal("That's too big a number");
		const logo = logoOf(b.logo);
		const p = clampPrice(Math.round(price * 100) / 100);
		const sector = SECTORS.includes(b.sector) ? b.sector : null, description = cleanText(b.description, 200) || null;
		const owner = (await ownerOf(b.owner)) ?? null;
		const [c] = await sql`insert into market_companies (name, ticker, price, prev_close, shares, logo, logo_type, sector, description, owner_id)
			values (${name}, ${tk}, ${p}, ${p}, ${sh}, ${logo?.bytes ?? null}, ${logo?.type ?? null}, ${sector}, ${description}, ${owner}) on conflict (ticker) do nothing returning id`;
		if (!c) throw new Refusal("Ticker already listed");
		await listedWithHistory(sql, c.id, p, name, tk);
		await log("LISTED " + tk, v);
	},
	async edit(b, v) {
		const c = await company(b.id);
		const name = String(b.name ?? "").trim().slice(0, 80), tk = tickerOf(b.ticker), sh = Math.floor(Number(b.shares));
		if (!name || !tk || !(sh > 0) || sh > 1e15) throw new Refusal("Name, ticker and shares are required");
		const [clash] = await sql`select 1 from market_companies where ticker = ${tk} and id <> ${c.id}`;
		if (clash) throw new Refusal("Ticker in use");
		const logo = logoOf(b.logo), owner = await ownerOf(b.owner);
		if (owner !== undefined) await sql`update market_companies set owner_id = ${owner} where id = ${c.id}`;
		if (logo) await sql`update market_companies set name = ${name}, ticker = ${tk}, shares = ${sh}, logo = ${logo.bytes}, logo_type = ${logo.type}, logo_v = logo_v + 1 where id = ${c.id}`;
		else await sql`update market_companies set name = ${name}, ticker = ${tk}, shares = ${sh} where id = ${c.id}`;
		if (tk !== c.ticker) await sql`update market_headlines set ticker = ${tk} where ticker = ${c.ticker}`;
		await log("EDITED " + tk, v);
	},
	async clearLogo(b, v) {
		const c = await company(b.id);
		await sql`update market_companies set logo = null, logo_type = null, logo_v = logo_v + 1 where id = ${c.id}`;
		await log("LOGO REMOVED " + c.ticker, v);
	},
	async suspend(b, v) {
		const c = await company(b.id);
		const [r] = await sql`update market_companies set suspended = not suspended where id = ${c.id} returning suspended`;
		await log((r.suspended ? "SUSPENDED " : "RESUMED ") + c.ticker, v);
	},
	async remove(b, v) {
		const c = await company(b.id);
		await sql`delete from market_companies where id = ${c.id}`;
		await log("DELETED " + c.ticker, v);
	},
	// Market controls: the whole market, one company, an exact price, a dollar step
	async market(b, v) {
		const p = Number(b.pct);
		if (!p || !isFinite(p) || p <= -100) throw new Refusal("Enter a percentage");
		for (const c of await listed()) await reprice(c.id, c.ticker, c.price * (1 + p / 100), "market " + (p > 0 ? "boost" : "crash"), v);
		await log(`MARKET ${p > 0 ? "BOOST" : "CRASH"} ${p}%`, v);
	},
	async companyPct(b, v) {
		const c = await company(b.id), p = Number(b.pct), d = Number(b.dir) < 0 ? -1 : 1;
		if (!(p > 0) || !isFinite(p)) throw new Refusal("Enter a percentage");
		await reprice(c.id, c.ticker, c.price * (1 + (d * p) / 100), "company " + (d > 0 ? "boost" : "crash"), v);
	},
	async setPrice(b, v) {
		const c = await company(b.id), p = Number(b.price);
		if (!(p >= PRICE_FLOOR) || p > 1e12) throw new Refusal("Enter a price of at least $100");
		await reprice(c.id, c.ticker, p, "set price", v);
	},
	async adjust(b, v) {
		const c = await company(b.id), a = Number(b.amount);
		if (!a || !isFinite(a)) throw new Refusal("Enter an amount");
		await reprice(c.id, c.ticker, c.price + a, "adjust", v);
	},
	// Events
	async eventMarket(b, v) {
		const p = Number(b.pct), sign = Number(b.sign) < 0 ? -1 : 1;
		if (!(p > 0) || !isFinite(p) || (sign < 0 && p >= 100)) throw new Refusal("Enter a percentage");
		for (const c of await listed()) await reprice(c.id, c.ticker, c.price * (1 + (sign * p) / 100), "market " + (sign < 0 ? "crash" : "boost"), v);
		await event(sign < 0 ? "Market Crash" : "Market Boost", `${sign < 0 ? "-" : "+"}${p}% on all listed companies`, v);
	},
	async randomDrop(b, v) {
		const p = Number(b.pct), n = Math.floor(Number(b.count));
		const L = await listed();
		if (!(p > 0) || p >= 100) throw new Refusal("Enter a percentage");
		if (!(n > 0) || !L.length) throw new Refusal("Enter how many companies, and make sure some are listed");
		const pick = [...L].sort(() => Math.random() - 0.5).slice(0, Math.min(n, L.length));
		for (const c of pick) await reprice(c.id, c.ticker, c.price * (1 - p / 100), "random drop", v);
		await event("Random Drop", `${pick.map((c) => c.ticker).join(", ")} down ${p}%`, v);
	},
	async tax(b, v) {
		const r = Number(b.rate);
		if (!(r > 0 && r < 100)) throw new Refusal("Enter a tax rate between 0 and 100");
		const k = 1 - r / 100;
		let g = 0;
		await sql.begin(async (tx) => {
			const [s] = await tx`select coalesce(sum(c.price::float8 * h.qty * ${r} / 100), 0)::float8 as g from market_holdings h join market_companies c on c.id = h.company_id`;
			g = s.g;
			await tx`update market_holdings set qty = qty * ${k}, cost = cost * ${k}`;
			await tx`delete from market_holdings where qty < 0.0001`;
			await tx`insert into market_state (key, value) values ('gap', ${g}) on conflict (key) do update set value = market_state.value + excluded.value`;
		});
		await event("Tax Season", `${r}% of holdings taxed · ${fmt(g)} to market gap`, v);
	},
	async scandal(_b, v) {
		await sql.begin(async (tx) => {
			// the half each investor pulls out is paid into their money
			await tx`insert into money_wallets (user_id, balance_cents) select distinct user_id, 0 from market_holdings on conflict (user_id) do nothing`;
			await tx`update money_wallets w set balance_cents = w.balance_cents + s.v from (select h.user_id, round(sum(c.price::float8 * h.qty * 0.5) * 100)::bigint v from market_holdings h join market_companies c on c.id = h.company_id group by h.user_id) s where s.user_id = w.user_id`;
			await tx`update market_holdings set qty = qty * 0.5, cost = cost * 0.5`;
			await tx`delete from market_holdings where qty < 0.0001`;
		});
		await event("Political Scandal", "Half of all holdings cashed out to Money", v);
	},
	// Headlines
	async headline(b, v) {
		const text = String(b.text ?? "").trim().slice(0, 280);
		if (!text) throw new Refusal("Enter a headline");
		const cat = CATS.includes(b.cat) ? b.cat : "Markets";
		const tk = tickerOf(b.ticker) || null;
		await sql`insert into market_headlines (text, cat, ticker, breaking) values (${text}, ${cat}, ${tk}, ${!!b.breaking})`;
		await log("HEADLINE " + text.slice(0, 50), v);
	},
	async editHeadline(b, v) {
		const text = String(b.text ?? "").trim().slice(0, 280);
		const [h] = await sql`update market_headlines set text = coalesce(nullif(${text}, ''), text), breaking = ${!!b.breaking} where id = ${idOf(b.id)} returning id`;
		if (!h) throw new Refusal("No headline");
		await log("EDITED HEADLINE", v);
	},
	async deleteHeadline(b, v) {
		await sql`delete from market_headlines where id = ${idOf(b.id)}`;
		await log("DELETED HEADLINE", v);
	},
};

async function adminData() {
	const [accounts, logs] = await Promise.all([
		// everyone who has traded, with their money balance
		sql`select u.screen_name, u.name, coalesce(w.balance_cents, 0)::float8 / 100 as cash, (extract(epoch from i.first) * 1000)::float8 as created,
			(select count(*)::int from market_holdings h where h.user_id = i.user_id) as positions,
			(select coalesce(sum(h.qty * c.price::float8), 0)::float8 from market_holdings h join market_companies c on c.id = h.company_id where h.user_id = i.user_id) as equity
			from (select user_id, min(created_at) as first from market_txns group by user_id) i join users u on u.id = i.user_id left join money_wallets w on w.user_id = i.user_id order by i.first`,
		sql`select action as a, (extract(epoch from created_at) * 1000)::float8 as t from market_logs order by id desc limit ${LOGS}`,
	]);
	return { accounts, logs };
}

// ---------- the page ----------

let client: { js: string; css: string } | undefined;
const BSE_PUBLIC = join(import.meta.dir, "..", "public");
function logoInner(file: string): string {
	return readFileSync(join(BSE_PUBLIC, file), "utf8")
		.replace(/<svg[^>]*>/, "")
		.replace(/<\/svg>\s*$/, "")
		.replace(/<title>[^<]*<\/title>/, "")
		.trim();
}
const BSE_LOGO_LIGHT = logoInner("bse-logo-light.svg");
const BSE_LOGO_DARK = logoInner("bse-logo.svg");
const BSE_ICONS = `<link rel="icon" type="image/svg+xml" href="/public/bse-favicon.svg">
<link rel="icon" type="image/png" sizes="16x16" href="/public/bse-favicon-16.png">
<link rel="icon" type="image/png" sizes="32x32" href="/public/bse-favicon-32.png">
<link rel="icon" type="image/png" sizes="192x192" href="/public/bse-icon-192.png">
<link rel="apple-touch-icon" sizes="180x180" href="/public/bse-apple-touch.png">`;
const BSE_WORDMARK = `<span class="logo-wrap" aria-hidden="true"><img class="logo logo-on-dark" src="/public/bse-logo-light.svg" alt=""><img class="logo logo-on-light" src="/public/bse-logo.svg" alt=""></span>`;
function bseLogoMark(x: number, y: number, height: number, light = false): string {
	const scale = height / 723;
	return `<g transform="translate(${x} ${y}) scale(${scale.toFixed(5)})">${light ? BSE_LOGO_LIGHT : BSE_LOGO_DARK}</g>`;
}
function bsePublicFile(name: string, type: string): Response {
	return new Response(Bun.file(join(BSE_PUBLIC, name)), { headers: { "content-type": type, "cache-control": "public, max-age=86400", "x-content-type-options": "nosniff" } });
}

function clientFiles() {
	if (!client || process.env.NODE_ENV !== "production") {
		const src = readFileSync(join(import.meta.dir, "markets-client.js"), "utf8");
		const [css, js] = src.split("/*---SCRIPT---*/");
		client = { css: css.replace(/^\/\*---STYLE---\*\/\s*/, ""), js };
	}
	return client;
}

function companyBy(s: Shared, ticker: string | null) {
	return ticker ? s.companies.find((c) => c.ticker === ticker.toUpperCase()) : undefined;
}
function describeMarket(s: Shared) {
	const all = s.companies, L = all.filter((c) => !c.suspended);
	if (!all.length) return "No companies are listed yet.";
	const mc = all.reduce((t, c) => t + c.price * c.shares, 0), base = all.reduce((t, c) => t + c.prevClose * c.shares, 0);
	return `Total market cap ${big(mc)} (${sg(pct(mc, base))}) · ${all.length} listed compan${all.length === 1 ? "y" : "ies"}, ${L.length} active.`;
}
function describeCompany(c: Company) {
	return `${c.name} (${c.ticker}) ${fmtP(c.price)} ${sg(pct(c.price, c.prevClose))} · market cap ${big(c.price * c.shares)} · volume ${c.volume.toLocaleString("en-US")}${c.sector ? ` · ${c.sector}` : ""}${c.owner ? ` · founded by @${c.owner.handle}` : ""}${c.suspended ? " · SUSPENDED" : ""}`;
}

const HOME_DESC = "One open stock and trading API that websites, Discord bots and apps can all use, so every Bloxburg Politics community shares one economy. Live prices and trading with Money.";
async function page(req: Request, viewer: Viewer | undefined, opts: { standalone?: boolean; ticker?: string | null; view?: string | null } = {}): Promise<Response> {
	const url = new URL(req.url);
	const st = await state(viewer);
	const standalone = opts.standalone ?? isBseHost(req);
	const ticker = opts.ticker ?? url.searchParams.get("c");
	const co = companyBy(st, ticker);
	const inst = settings().instance_name;
	const title = co ? `${co.ticker} · ${co.name}` : standalone ? BSE_NAME : "BSE";
	const home = standalone && !co && (!opts.view || opts.view === "home");
	const desc = co ? describeCompany(co) : home ? HOME_DESC : describeMarket(st);
	const v = Math.floor(Date.now() / 60000).toString(36);
	const origin = standalone ? (isBseHost(req) ? requestOrigin(req) : bseOrigin()) : PUBLIC_ORIGIN;
	const VIEW_PATH: Record<string, string> = { dash: "/overview", list: "/markets", acct: "/portfolio", admin: "/admin", new: "/new" };
	const path = standalone ? (co ? `/c/${co.ticker}` : (opts.view && VIEW_PATH[opts.view]) || "/") : `${MARKETS_PATH}${co ? `?c=${encodeURIComponent(co.ticker)}` : ""}`;
	const image = `${origin}${MARKETS_PATH}/og.png?${co ? `c=${encodeURIComponent(co.ticker)}&` : ""}v=${v}`;
	const canonical = `${origin}${path}`;
	const siteName = standalone ? BSE_NAME : inst;
	const ogTitle = co ? `${BSE_SHORT} · ${co.ticker} · ${co.name}` : home ? `${BSE_SHORT} | ${BSE_NAME}` : BSE_NAME;
	const head = [
		["property", "og:title", ogTitle],
		["property", "og:description", desc],
		["property", "og:type", "website"],
		["property", "og:url", canonical],
		["property", "og:site_name", siteName],
		["property", "og:image", image],
		["property", "og:image:width", "1200"],
		["property", "og:image:height", "630"],
		["name", "twitter:card", "summary_large_image"],
		["name", "twitter:title", ogTitle],
		["name", "twitter:description", desc],
		["name", "twitter:image", image],
		["name", "description", desc],
	].map(([a, k, c]) => `<meta ${a}="${k}" content="${esc(c)}">`).join("\n");
	const f = clientFiles();
	const boot = JSON.stringify({
		state: st,
		csrf: viewer?.csrf ?? null,
		signedIn: !!viewer,
		coin: MONEY_ICON,
		site: standalone ? "bse" : "app",
		home: PUBLIC_ORIGIN,
		bse: bseOrigin(),
		name: BSE_NAME,
		short: BSE_SHORT,
	}).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
	const docTitle = co ? `${co.ticker} · ${co.name} · ${BSE_SHORT}` : home ? `${BSE_SHORT} | ${BSE_NAME}` : standalone ? BSE_NAME : `${BSE_SHORT} · ${inst}`;
	const html = `<!DOCTYPE html>
<html lang="en" data-theme="light"${standalone ? ' data-site="bse"' : ""}><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(docTitle)}</title>
<link rel="canonical" href="${esc(canonical)}">
${head}
${standalone ? BSE_ICONS : ""}
<meta name="theme-color" content="#ffffff">
<style>${f.css}</style></head>
<body><div id="app"></div>
<script>window.TRADEX=${boot};</script>
<script>${f.js}</script></body></html>`;
	return new Response(html, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff" } });
}

// ---------- the share picture ----------

async function png(svg: string): Promise<Buffer> {
	const p = Bun.spawn(["ffmpeg", "-hide_banner", "-loglevel", "error", "-f", "svg_pipe", "-i", "-", "-frames:v", "1", "-f", "image2", "-c:v", "png", "-"], { stdin: new Blob([svg]), stdout: "pipe", stderr: "pipe" });
	const out = Buffer.from(await new Response(p.stdout).arrayBuffer());
	if ((await p.exited) !== 0 || !out.length) throw new Error(`markets image: ${await new Response(p.stderr).text()}`);
	return out;
}
// X's checkmark, the one the site and the market's pages draw
const BLUE_CHECK = "M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z";
const GOLD_CHECK = '<linearGradient gradientUnits="userSpaceOnUse" id="oga" x1="4.411" x2="18.083" y1="2.495" y2="21.508"><stop offset="0" stop-color="#f4e72a"/><stop offset=".539" stop-color="#cd8105"/><stop offset=".68" stop-color="#cb7b00"/><stop offset="1" stop-color="#f4ec26"/><stop offset="1" stop-color="#f4e72a"/></linearGradient><linearGradient gradientUnits="userSpaceOnUse" id="ogb" x1="5.355" x2="16.361" y1="3.395" y2="19.133"><stop offset="0" stop-color="#f9e87f"/><stop offset=".406" stop-color="#e2b719"/><stop offset=".989" stop-color="#e2b719"/></linearGradient><g clip-rule="evenodd" fill-rule="evenodd"><path d="M13.324 3.848L11 1.6 8.676 3.848l-3.201-.453-.559 3.184L2.06 8.095 3.48 11l-1.42 2.904 2.856 1.516.559 3.184 3.201-.452L11 20.4l2.324-2.248 3.201.452.559-3.184 2.856-1.516L18.52 11l1.42-2.905-2.856-1.516-.559-3.184zm-7.09 7.575l3.428 3.428 5.683-6.206-1.347-1.247-4.4 4.795-2.072-2.072z" fill="url(#oga)"/><path d="M13.101 4.533L11 2.5 8.899 4.533l-2.895-.41-.505 2.88-2.583 1.37L4.2 11l-1.284 2.627 2.583 1.37.505 2.88 2.895-.41L11 19.5l2.101-2.033 2.895.41.505-2.88 2.583-1.37L17.8 11l1.284-2.627-2.583-1.37-.505-2.88zm-6.868 6.89l3.429 3.428 5.683-6.206-1.347-1.247-4.4 4.795-2.072-2.072z" fill="url(#ogb)"/><path d="M6.233 11.423l3.429 3.428 5.65-6.17.038-.033-.005 1.398-5.683 6.206-3.429-3.429-.003-1.405.005.003z" fill="#d18800"/></g>';
const badgeSvg = (t: string | null | undefined) => (!t ? "" : t === "business" ? GOLD_CHECK : `<path fill="${t === "blue" ? "#1d9bf0" : "#829aab"}" d="${BLUE_CHECK}"/>`);
// the company's picture for its card, as the market pages show it: the founder's, else its logo
async function ogPicture(c: Company | undefined): Promise<string | null> {
	try {
		if (c?.owner?.custom && c.owner.avatar.startsWith("/profile_images/")) {
			const path = c.owner.avatar.replace(/_x96\.jpg$/, "_200x200.jpg");
			const guest = { id: GUEST_ID, screen_name: "", name: "", status: "active", role: null } as unknown as Viewer;
			const r = await serveAvatar(new Request(PUBLIC_ORIGIN + path), path, guest);
			if (r.ok) return `data:${r.headers.get("content-type")};base64,${Buffer.from(await r.arrayBuffer()).toString("base64")}`;
		}
		if (c?.logo) {
			const [r] = await sql`select logo, logo_type from market_companies where id = ${c.id} and logo is not null`;
			if (r) return `data:${r.logo_type};base64,${Buffer.from(r.logo).toString("base64")}`;
		}
	} catch {}
	return null;
}
// the instance's checkmark art as PNG, which the card renderer can draw (X's drawing without it)
const artPng = new Map<string, Promise<string | null>>();
function checkArt(verifiedType: string | null | undefined): Promise<string | null> {
	const t = artType(verifiedType);
	if (!t || !art(t)) return Promise.resolve(null);
	let p = artPng.get(t);
	if (!p) {
		p = (async () => {
			const proc = Bun.spawn(["ffmpeg", "-hide_banner", "-loglevel", "error", "-i", join(process.env.PUBLIC_DIR ?? "public", `verified-${t}.webp`), "-frames:v", "1", "-f", "image2", "-c:v", "png", "-"], { stdout: "pipe", stderr: "pipe" });
			const out = Buffer.from(await new Response(proc.stdout).arrayBuffer());
			return (await proc.exited) === 0 && out.length ? `data:image/png;base64,${out.toString("base64")}` : null;
		})();
		artPng.set(t, p);
	}
	return p;
}
// DejaVu Sans Bold's capitals, near enough to set the checkmark after a ticker
const capWidth = (t: string, size: number) => [...t].reduce((w, ch) => w + (/[IJ]/.test(ch) ? 0.4 : /[MW]/.test(ch) ? 1.02 : 0.78), 0) * size;
function ogSvg(s: Shared, c: Company | undefined, pic: string | null = null, check: string | null = null, origin: string = PUBLIC_ORIGIN): string {
	const FONT = "DejaVu Sans, Helvetica, Arial, sans-serif";
	const all = s.companies;
	const mc = all.reduce((t, x) => t + x.price * x.shares, 0), base = all.reduce((t, x) => t + x.prevClose * x.shares, 0);
	const values = c ? c.hist.map((h) => h[1]) : s.index.map((x) => x[1]);
	const change = c ? pct(c.price, c.prevClose) : pct(mc, base);
	const up = change >= 0;
	const col = (values.length > 1 ? values[values.length - 1] >= values[0] : up) ? "#118a4e" : "#c62828";
	let chart = "";
	if (values.length > 1) {
		const mn = Math.min(...values), mx = Math.max(...values), r = mx - mn || 1, W = 1088, H = 250;
		const line = values.map((y, i) => `${((i / (values.length - 1)) * W).toFixed(1)},${(H - 8 - ((y - mn) / r) * (H - 16)).toFixed(1)}`).join(" ");
		chart = `<g transform="translate(56 300)"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${col}" stop-opacity=".4"/><stop offset="1" stop-color="${col}" stop-opacity="0"/></linearGradient></defs><polygon points="0,${H} ${line} ${W},${H}" fill="url(#g)"/><polyline fill="none" stroke="${col}" stroke-width="4" stroke-linejoin="round" points="${line}"/></g>`;
	}
	const head = c ? `${esc(c.ticker)}` : "Total market cap";
	// a company's card wears its picture (round for people, rounded-square for organisations) and its founder's checkmark
	const tx = c ? 160 : 56;
	let face = "";
	if (c) {
		const shape = c.sq ? `<rect x="56" y="94" width="84" height="84" rx="18"/>` : `<circle cx="98" cy="136" r="42"/>`;
		face = pic
			? `<defs><clipPath id="pf">${shape}</clipPath></defs><rect x="56" y="94" width="84" height="84" fill="#f3f3f3" clip-path="url(#pf)"/><image x="56" y="94" width="84" height="84" preserveAspectRatio="xMidYMid slice" clip-path="url(#pf)" href="${pic}"/>`
			: `<g fill="#f3f3f3">${shape}</g><text x="98" y="145" font-size="22" font-weight="800" fill="#5b5b5b" text-anchor="middle">${esc(c.ticker.slice(0, 4))}</text>`;
		const b = badgeSvg(c.owner?.badge), bx = (tx + capWidth(c.ticker, 34) + 8).toFixed(0);
		if (check) face += `<image x="${bx}" y="99" width="36" height="36" href="${check}"/>`;
		else if (b) face += `<g transform="translate(${(tx + capWidth(c.ticker, 34) + 8).toFixed(0)} 101) scale(1.55)">${b}</g>`;
	}
	const sub = c ? esc(c.name) + (c.sector ? ` · ${esc(c.sector)}` : "") + (c.owner ? ` · @${esc(c.owner.handle)}` : "") + (c.suspended ? " · SUSPENDED" : "") : all.length ? `${all.length} listed compan${all.length === 1 ? "y" : "ies"}` : "No companies listed yet";
	const value = c ? fmtP(c.price) : big(mc);
	const pill = all.length ? `<text x="56" y="${c ? 275 : 263}" font-size="24" font-weight="700" fill="${up ? "#118a4e" : "#c62828"}">${up ? "▲" : "▼"} ${Math.abs(change).toFixed(2)}%</text>` : "";
	return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" font-family="${FONT}">
<rect width="1200" height="630" fill="#ffffff"/>
<rect width="1200" height="10" fill="#7bcdee"/>
${bseLogoMark(56, 36, 34)}
<text x="1144" y="78" font-size="22" fill="#5b5b5b" text-anchor="end">${esc(BSE_NAME)}</text>
${face}<text x="${tx}" y="${c ? 128 : 132}" font-size="34" font-weight="700" fill="#000000">${head}</text>
<text x="${tx}" y="${c ? 166 : 168}" font-size="24" fill="#5b5b5b">${sub}</text>
<text x="56" y="${c ? 232 : 222}" font-size="52" font-weight="800" fill="#000000">${value}</text>
${pill}${chart}
<text x="1144" y="610" font-size="20" fill="#5b5b5b" text-anchor="end">${esc(ogFoot(c?.ticker ?? null, origin))}</text>
</svg>`;
}
const pictures = new Map<string, Promise<Buffer>>();
function ogFoot(ticker: string | null, origin: string): string {
	try {
		const host = new URL(origin).host;
		if (isBseHostName(host) || host.startsWith("trade.") || host.startsWith("bse.")) return ticker ? `${host}/c/${ticker}` : host;
		return `${host}${MARKETS_PATH}${ticker ? `?c=${ticker}` : ""}`;
	} catch {
		return OWN_HOST;
	}
}
async function ogImage(ticker: string | null, origin: string = PUBLIC_ORIGIN): Promise<Buffer> {
	const s = await shared();
	const c = companyBy(s, ticker);
	const key = `${c?.ticker ?? ""}:${origin}:${Math.floor(Date.now() / 60000)}`;
	let p = pictures.get(key);
	if (!p) {
		p = Promise.all([ogPicture(c), checkArt(c?.owner?.badge)]).then(([pic, check]) => png(ogSvg(s, c, pic, check, origin)));
		pictures.set(key, p);
		p.catch(() => pictures.delete(key));
		if (pictures.size > 30) pictures.delete(pictures.keys().next().value!);
	}
	return p;
}

// ---------- a stock's picture to download (the Export image button) ----------

// DejaVu Sans Bold's advance widths, near enough to set the checkmark after a name
function textWidth(t: string, size: number): number {
	let w = 0;
	for (const ch of t) {
		if (/[ilj'|.,:;!]/.test(ch)) w += 0.34;
		else if (/[ftrI ]/.test(ch)) w += 0.45;
		else if (/[mwMW]/.test(ch)) w += 1.04;
		else if (/[A-Z]/.test(ch)) w += 0.77;
		else if (/[0-9a-z]/.test(ch)) w += 0.68;
		else w += 0.8;
	}
	return w * size;
}
function fitText(t: string, size: number, max: number): string {
	if (textWidth(t, size) <= max) return t;
	let s = t;
	while (s.length > 1 && textWidth(s + "…", size) > max) s = s.slice(0, -1);
	return s.trimEnd() + "…";
}
// a smooth line through the points (Catmull-Rom as cubic Béziers)
function smoothPath(pts: [number, number][]): string {
	if (pts.length < 3) return "M" + pts.map((p) => p.map((n) => n.toFixed(1)).join(",")).join(" L");
	let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
	for (let i = 0; i < pts.length - 1; i++) {
		const p0 = pts[i - 1] ?? pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] ?? p2;
		const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6], c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
		d += ` C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
	}
	return d;
}
const RANGES: Record<string, [number, string]> = { "30": [30, "1M"], "90": [90, "3M"], "200": [200, "All"] };
function exportSvg(c: Company, range: number, label: string, pic: string | null, check: string | null, origin: string = PUBLIC_ORIGIN): string {
	const FONT = "DejaVu Sans, Helvetica, Arial, sans-serif";
	const W = 1200, H = 675, S = 2;
	const hist = c.hist.slice(-range).map((h) => h[1]);
	const values = hist.length ? hist : [c.price];
	const change = pct(c.price, c.prevClose), up = change >= 0;
	const lo = Math.min(...values), hi = Math.max(...values);
	const col = (values.length > 1 ? values[values.length - 1] >= values[0] : up) ? "#118a4e" : "#c62828";
	// the chart
	const cx = 48, cy = 250, cw = W - 96, ch = 250;
	let chart = "";
	if (values.length > 1) {
		const r = hi - lo || 1;
		const pts = values.map((y, i): [number, number] => [cx + (i / (values.length - 1)) * cw, cy + 10 + (1 - (y - lo) / r) * (ch - 20)]);
		const d = smoothPath(pts);
		const grid = [0, 1, 2, 3].map((k) => `<line x1="${cx}" x2="${cx + cw}" y1="${(cy + (k * ch) / 3).toFixed(1)}" y2="${(cy + (k * ch) / 3).toFixed(1)}" stroke="#d9d9d9" stroke-width="1"/>`).join("");
		const last = pts[pts.length - 1];
		chart = `${grid}<defs><linearGradient id="fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${col}" stop-opacity=".35"/><stop offset="1" stop-color="${col}" stop-opacity="0"/></linearGradient></defs>`
			+ `<path d="${d} L${(cx + cw).toFixed(1)},${cy + ch} L${cx},${cy + ch} Z" fill="url(#fill)"/>`
			+ `<path d="${d}" fill="none" stroke="${col}" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"/>`
			+ `<circle cx="${last[0].toFixed(1)}" cy="${last[1].toFixed(1)}" r="7" fill="${col}" fill-opacity=".25"/><circle cx="${last[0].toFixed(1)}" cy="${last[1].toFixed(1)}" r="4" fill="${col}"/>`;
	} else chart = `<text x="${W / 2}" y="${cy + ch / 2}" font-size="22" fill="#5b5b5b" text-anchor="middle">No trading history yet</text>`;
	// the face: rounded square for organisations, circle for people, the ticker when there's no picture
	const ax = 48, ay = 44, as = 88;
	const shape = c.sq ? `<rect x="${ax}" y="${ay}" width="${as}" height="${as}" rx="20"/>` : `<circle cx="${ax + as / 2}" cy="${ay + as / 2}" r="${as / 2}"/>`;
	const face = pic
		? `<defs><clipPath id="pf">${shape}</clipPath></defs><rect x="${ax}" y="${ay}" width="${as}" height="${as}" fill="#f3f3f3" clip-path="url(#pf)"/><image x="${ax}" y="${ay}" width="${as}" height="${as}" preserveAspectRatio="xMidYMid slice" clip-path="url(#pf)" href="${pic}"/>`
		: `<g fill="#f3f3f3">${shape}</g><text x="${ax + as / 2}" y="${ay + as / 2 + 8}" font-size="22" font-weight="800" fill="#5b5b5b" text-anchor="middle">${esc(c.ticker.slice(0, 4))}</text>`;
	const tx = ax + as + 20;
	const name = fitText(c.name, 34, W - 48 - Math.max(textWidth(fmtP(c.price), 50), 300) - tx - 70);
	const nx = tx + textWidth(name, 34) + 10;
	const b = badgeSvg(c.owner?.badge);
	const mark = check ? `<image x="${nx.toFixed(0)}" y="${ay + 6}" width="34" height="34" href="${check}"/>` : b ? `<g transform="translate(${nx.toFixed(0)} ${ay + 8}) scale(1.45)">${b}</g>` : "";
	const sub = `${esc(c.ticker)}${c.sector ? ` · ${esc(c.sector)}` : ""}${c.suspended ? " · SUSPENDED" : ""}`;
	// the price and how it moved, top right
	const pillText = `${up ? "▲" : "▼"} ${Math.abs(change).toFixed(2)}%`, pw = 40 + pillText.length * 14;
	const price = `<text x="${W - 48}" y="${ay + 50}" font-size="50" font-weight="800" fill="#000000" text-anchor="end">${fmtP(c.price)}</text>`
		+ `<text x="${W - 48}" y="${ay + 92}" font-size="21" font-weight="700" fill="${up ? "#118a4e" : "#c62828"}" text-anchor="end">${pillText}</text>`
		+ `<text x="${W - 48}" y="${ay + 114}" font-size="16" fill="#5b5b5b" text-anchor="end">since listing</text>`;
	const tag = `<rect x="48" y="${cy - 52}" width="64" height="30" rx="0" fill="#000"/><text x="80" y="${cy - 31}" font-size="16" font-weight="700" fill="#ffffff" text-anchor="middle">${label}</text>`
		+ `<text x="124" y="${cy - 31}" font-size="16" fill="#5b5b5b">Price history</text>`;
	// the key numbers
	const stats: [string, string][] = [["Market cap", big(c.price * c.shares)], ["Volume", Math.round(c.volume).toLocaleString("en-US")], [`Range (${label})`, `${fmtP(lo)} – ${fmtP(hi)}`], ["Shares", Math.round(c.shares).toLocaleString("en-US")]];
	const sy = cy + ch + 22, colW = (W - 96) / 4;
	const row = `<rect x="48" y="${sy}" width="${W - 96}" height="76" rx="0" fill="#fff" stroke="#000"/>`
		+ stats.map(([k, v], i) => `<text x="${72 + i * colW}" y="${sy + 30}" font-size="16" fill="#5b5b5b">${esc(k)}</text><text x="${72 + i * colW}" y="${sy + 58}" font-size="22" font-weight="700" fill="#000000">${esc(fitText(v, 22, colW - 30))}</text>`).join("");
	const foot = `${bseLogoMark(48, H - 38, 20)}`
		+ `<text x="${W - 48}" y="${H - 22}" font-size="17" fill="#5b5b5b" text-anchor="end">${esc(new URL(origin).host)}</text>`;
	return `<svg xmlns="http://www.w3.org/2000/svg" width="${W * S}" height="${H * S}" viewBox="0 0 ${W} ${H}" font-family="${FONT}">
<rect width="${W}" height="${H}" fill="#ffffff"/>
<rect width="${W}" height="8" fill="#7bcdee"/>
${face}<text x="${tx}" y="${ay + 36}" font-size="34" font-weight="700" fill="#000000">${esc(name)}</text>${mark}
<text x="${tx}" y="${ay + 72}" font-size="22" fill="#5b5b5b">${sub}</text>
${price}${tag}${chart}${row}${foot}
</svg>`;
}
// the picture the page shows: the founder's or the logo, else the site's default one; anything else (an outside address) draws the ticker
async function exportPicture(c: Company): Promise<string | null> {
	const pic = await ogPicture(c);
	if (pic || c.img !== DEFAULT_PFP) return pic;
	try {
		return `data:image/png;base64,${readFileSync(join(import.meta.dir, "..", "client", DEFAULT_PFP)).toString("base64")}`;
	} catch {
		return null;
	}
}
const exports_ = new Map<string, Promise<Buffer>>();
async function exportImage(ticker: string | null, r: string | null, origin: string = PUBLIC_ORIGIN): Promise<Buffer | null> {
	const s = await shared();
	const c = companyBy(s, ticker);
	if (!c) return null;
	const [range, label] = RANGES[r ?? ""] ?? RANGES["90"];
	const key = `${c.ticker}:${range}:${origin}:${Math.floor(Date.now() / 15000)}`;
	let p = exports_.get(key);
	if (!p) {
		p = Promise.all([exportPicture(c), checkArt(c.owner?.badge)]).then(([pic, check]) => png(exportSvg(c, range, label, pic, check, origin)));
		exports_.set(key, p);
		p.catch(() => exports_.delete(key));
		if (exports_.size > 20) exports_.delete(exports_.keys().next().value!);
	}
	return p;
}

// ---------- a link to the market in a post: its card (posts.ts) ----------

function bseTickerPath(pathname: string): string | null {
	const m = /^\/c\/([A-Za-z]{2,5})(?:\/edit)?\/?$/.exec(pathname);
	return m ? m[1].toUpperCase() : null;
}
function isBsePublicHost(host: string): boolean {
	return isBseHostName(host);
}
export function isMarketLink(url: string): boolean {
	try {
		const u = new URL(url);
		if (u.host === OWN_HOST && (u.pathname === MARKETS_PATH || u.pathname === `${MARKETS_PATH}/`)) return true;
		if (isBsePublicHost(u.host) && (u.pathname === "/" || u.pathname === "" || u.pathname === "/overview" || bseTickerPath(u.pathname) || u.pathname === "/markets")) return true;
		return false;
	} catch {
		return false;
	}
}
export async function marketLinkCard(url: string): Promise<Record<string, unknown>> {
	const s = await shared();
	const u = new URL(url);
	const ticker = u.searchParams.get("c") || bseTickerPath(u.pathname);
	const c = companyBy(s, ticker);
	const v = Math.floor(Date.now() / 60000).toString(36);
	const standalone = isBsePublicHost(u.host);
	const origin = standalone ? `${u.protocol}//${u.host}` : PUBLIC_ORIGIN;
	const str = (x: string) => ({ string_value: x, type: "STRING" });
	const img = { image_value: { url: `${origin}${MARKETS_PATH}/og.png?${c ? `c=${encodeURIComponent(c.ticker)}&` : ""}v=${v}`, width: 1200, height: 630, alt: c ? `${c.ticker} price chart` : "Market cap chart" }, type: "IMAGE" };
	const values: Record<string, unknown> = {
		title: str(c ? `${BSE_SHORT} · ${c.ticker} · ${c.name}` : BSE_NAME),
		description: str(c ? describeCompany(c) : describeMarket(s)),
		domain: str(standalone ? u.host : OWN_HOST),
		vanity_url: { ...str(standalone ? u.host : OWN_HOST), scribe_key: "vanity_url" },
		card_url: { ...str(url), scribe_key: "card_url" },
	};
	for (const key of ["thumbnail_image", "thumbnail_image_large", "thumbnail_image_original", "summary_photo_image", "summary_photo_image_large", "summary_photo_image_original", "photo_image_full_size", "photo_image_full_size_large", "photo_image_full_size_original"]) values[key] = img;
	return {
		rest_id: url,
		legacy: {
			binding_values: Object.entries(values).map(([key, value]) => ({ key, value })),
			card_platform: { platform: { audience: { name: "production" }, device: { name: "Swift", version: "12" } } },
			name: "summary_large_image",
			url,
			user_refs_results: [],
		},
	};
}

// ---------- routes ----------


// ---------- the BSE's own site (bse.jye.supply) ----------

const optsIp = (req: Request) => req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
// a relative path on the BSE site, or "/" when the value isn't one of ours
function bseNext(raw: string | null): string {
	if (!raw) return "/";
	try {
		if (raw.startsWith("/") && !raw.startsWith("//") && !raw.includes("\\")) return raw;
		const u = new URL(raw);
		if (isBsePublicHost(u.host)) return (u.pathname || "/") + u.search;
	} catch {}
	return "/";
}

const OAUTH_COOKIE = `${SECURE ? "__Host-" : ""}bse_oauth`;
function signedInOn(session: { token: string; csrf: string; userId: string }, location: string, clearOauth = true, status = 303): Response {
	const headers = new Headers({ location });
	for (const c of sessionCookies(session)) headers.append("set-cookie", c);
	if (clearOauth) headers.append("set-cookie", `${OAUTH_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax${SECURE}`);
	return new Response(null, { status, headers });
}
function oauthErrorPage(message: string, next: string): Response {
	const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Sign in · ${esc(BSE_SHORT)}</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#fff;color:#1a1a1a;font:16px Inter,Helvetica Neue,Arial,sans-serif}main{width:min(520px,calc(100vw - 32px))}h1{font-size:28px;letter-spacing:-.025em}a{color:#0a4a73}p{color:#5b5b5b}</style></head>
<body><main><h1>Couldn't sign in</h1><p>${esc(message)}</p><p><a href="/login?next=${encodeURIComponent(next)}">Try again</a> · <a href="/">${esc(BSE_NAME)}</a></p></main></body></html>`;
	return new Response(html, { status: 400, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
}
function sparkline(hist: [number, number][], up: boolean): string {
	const pts = hist.slice(-40);
	if (pts.length < 2) return "";
	const ys = pts.map((p) => p[1]);
	const min = Math.min(...ys), max = Math.max(...ys), span = max - min || 1;
	const w = 64, h = 22;
	const d = pts.map((p, i) => `${((i / (pts.length - 1)) * w).toFixed(1)},${(h - ((p[1] - min) / span) * (h - 2) - 1).toFixed(1)}`).join(" ");
	return `<svg class="spark" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" aria-hidden="true"><polyline fill="none" stroke="${up ? "#118a4e" : "#c62828"}" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round" points="${d}"/></svg>`;
}
async function marketTape(): Promise<string> {
	const rows = (await shared()).companies.filter((c) => !c.suspended).sort((a, b) => b.price * b.shares - a.price * a.shares).slice(0, 10);
	if (!rows.length) return "";
	const chips = rows
		.map((c) => {
			const ch = pct(c.price, c.prevClose);
			const up = ch >= 0;
			return `<a class="chip" href="/c/${esc(c.ticker)}"><span class="nm">${esc(c.name)}</span><span>${esc(c.ticker)}</span><span class="mono">${esc(fmtP(c.price))}</span><span class="${up ? "u" : "d"}">${up ? "▲" : "▼"} ${Math.abs(ch).toFixed(2)}%</span></a>`;
		})
		.join("");
	return `<div class="tape" aria-label="Live market prices"><div class="tick-row"><div class="tick-mkt">BSE<svg viewBox="0 0 12 8" aria-hidden="true"><path d="M1 2l5 5 5-5"/></svg></div><div class="lane"><div class="track">${chips}${chips}</div></div></div></div>`;
}

const LOGIN_CSRF_COOKIE = `${SECURE ? "__Host-" : ""}bse_login`;
function loginCsrfCookie(token: string): string {
	return `${LOGIN_CSRF_COOKIE}=${token}; Path=/; HttpOnly; Max-Age=600; SameSite=Lax${SECURE}`;
}
function newLoginCsrf(): string {
	return randomBytes(32).toString("hex");
}
function loginCsrfFrom(req: Request): string | undefined {
	const v = parseCookie(req, LOGIN_CSRF_COOKIE);
	return v && /^[0-9a-f]{64}$/i.test(v) ? v : undefined;
}
function sameCsrf(a: string, b: string): boolean {
	if (!a || !b) return false;
	const x = Buffer.from(a), y = Buffer.from(b);
	return x.length === y.length && x.length > 0 && timingSafeEqual(x, y);
}
function validLoginPost(req: Request, csrf: string): boolean {
	return isOwnOrigin(req.headers.get("origin")) && req.headers.get("origin") === requestOrigin(req) && sameCsrf(parseCookie(req, LOGIN_CSRF_COOKIE) ?? "", csrf);
}

const LOGIN_CSS = `@font-face{font-family:"Inter";font-style:normal;font-weight:100 900;font-display:swap;src:url("/public/fonts/inter.woff2") format("woff2")}
@font-face{font-family:"IBM Plex Mono";font-style:normal;font-weight:400;font-display:swap;src:url("/public/fonts/ibm-plex-mono-400.woff2") format("woff2")}
@font-face{font-family:"IBM Plex Mono";font-style:normal;font-weight:500;font-display:swap;src:url("/public/fonts/ibm-plex-mono-500.woff2") format("woff2")}
:root{--ink:#000;--txt:#1a1a1a;--mut:#5b5b5b;--bg:#fff;--elev:#fff;--card:#fff;--line:#d9d9d9;--band:#f3f3f3;--hover:rgba(0,0,0,.04);--up:#118a4e;--dn:#c62828;--accent:#7bcdee;--deep:#0a4a73;--btn:#000;--btntxt:#fff;--field:#fff;--sans:"Inter","Helvetica Neue",Arial,sans-serif;--mono:"IBM Plex Mono",ui-monospace,Menlo,Consolas,monospace;color-scheme:light}
*{box-sizing:border-box}
html,body{margin:0;min-height:100%;background:#fff;color:var(--txt);font:400 16px/1.5 var(--sans);-webkit-font-smoothing:antialiased}
a{color:var(--deep);text-decoration:none}a:hover{text-decoration:underline}
a:focus-visible,button:focus-visible,input:focus-visible{outline:3px solid var(--accent);outline-offset:2px}
.num,.mono{font-family:var(--mono);font-variant-numeric:tabular-nums}
.bsehead{display:flex;align-items:center;gap:24px;padding:0 32px;height:84px;background:#fff;position:sticky;top:0;z-index:8}
.wordmark{display:flex;align-items:center;gap:12px;color:var(--ink);text-decoration:none;font-weight:700}
.wordmark:hover{text-decoration:none}
.logo-wrap{display:flex;align-items:center;line-height:0}
.logo-wrap .logo{height:48px;width:auto;display:block}
.logo-wrap .logo-on-dark{display:none}
.logo-wrap .logo-on-light{display:block}
.wordmark .bname{display:none}
.hnav{display:flex;align-items:center;gap:32px;margin-left:8px;white-space:nowrap}
.hnav a{color:var(--ink);font-weight:500;font-size:1.05rem;padding:6px 0;border-bottom:3px solid transparent;text-decoration:none}
.hnav a:hover{border-bottom-color:var(--ink);text-decoration:none}
.bsehead .grow{flex:1}
.bsehead .glink{color:var(--mut);font-size:13px;font-weight:500;white-space:nowrap}
.tape{padding:24px 32px 8px;background:#fff;overflow:hidden}
.tick-row{display:flex;gap:16px;align-items:stretch;max-width:1240px;margin:0 auto}
.tick-mkt{flex:none;width:140px;background:#000;color:#fff;font:600 1.05rem var(--sans);padding:0 20px;display:flex;align-items:center;justify-content:space-between;box-shadow:0 6px 14px -6px rgba(0,0,0,.45)}
.tick-mkt svg{width:14px;height:14px;fill:currentColor}
.lane{flex:1;overflow:hidden;min-width:0;-webkit-mask-image:linear-gradient(90deg,transparent,#000 3%,#000 97%,transparent);mask-image:linear-gradient(90deg,transparent,#000 3%,#000 97%,transparent)}
.track{display:flex;gap:16px;width:max-content;animation:tick 55s linear infinite}
.tape:hover .track{animation-play-state:paused}
@keyframes tick{to{transform:translateX(-50%)}}
@media(prefers-reduced-motion:reduce){.track{animation:none;overflow-x:auto;width:auto;max-width:100%;scrollbar-width:none}}
.chip{display:flex;align-items:center;border:1px solid var(--line);border-left:8px solid var(--accent);height:56px;white-space:nowrap;font-size:1rem;color:var(--ink);text-decoration:none;background:#fff;padding:0;gap:0}
.chip:hover{text-decoration:none;background:var(--band)}
.chip>span,.chip>b{padding:0 16px;border-right:1px solid var(--line);height:100%;display:flex;align-items:center;font-weight:500}
.chip>span:last-child{border-right:0}
.chip .nm{font-weight:500;max-width:220px;overflow:hidden;text-overflow:ellipsis}
.chip .u{color:var(--up)}.chip .d{color:var(--dn)}
.up{color:var(--up)}.dn{color:var(--dn)}
.wrap{display:grid;place-items:center;padding:48px 16px 64px;min-height:calc(100vh - 160px);background:repeating-radial-gradient(circle at 72% 0,rgba(255,255,255,.13) 0 2px,transparent 2px 30px),radial-gradient(circle at 72% 0,#43b6e6 0,#1a7fb5 50%,#0a4a73 90%)}
.card{width:min(440px,100%);border:2px solid #000;padding:36px 32px 28px;background:#fff}
h1{margin:0 0 6px;font-size:2rem;letter-spacing:-.025em;font-weight:800;color:var(--ink)}
.note{margin:0 0 22px;color:var(--mut);font-size:14px}
label{display:block;margin:0 0 14px}
label>span{display:block;font-size:12.5px;color:var(--mut);margin-bottom:6px;font-weight:600}
input{width:100%;min-height:44px;padding:10px 12px;border:1px solid var(--line);border-radius:0;background:#fff;color:var(--ink);font:inherit}
input:focus{outline:0;border-color:#000;box-shadow:0 0 0 3px var(--accent)}
.error{color:var(--dn);margin:0 0 14px;font-size:14px}
button{width:100%;min-height:48px;border:2px solid #000;border-radius:0;background:#000;color:#fff;font:600 1rem var(--sans);cursor:pointer;margin-top:4px}
button:hover{background:#222}
.links{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;margin:16px 0 0;font-size:13px}
.links a{color:var(--deep)}
.back{margin:12px 0 0;text-align:center;font-size:13px}
label>span.at{display:flex;align-items:center;border:1px solid var(--line);background:#fff;font-size:inherit;font-weight:400;color:var(--ink);margin:0}
label .at b{padding:0 2px 0 12px;color:var(--mut);font-weight:600}
label .at input{border:0;padding-left:2px}
label .at:focus-within{border-color:#000;box-shadow:0 0 0 3px var(--accent)}
label .at input:focus{box-shadow:none}
label small{display:block;margin-top:6px;color:var(--mut);font-size:12px}
label i{font-style:normal;font-weight:400;color:var(--mut)}
.note.small{font-size:12.5px;margin:-2px 0 16px}
.or{display:flex;align-items:center;gap:12px;margin:20px 0 14px;color:var(--mut);font-size:13px}
.or::before,.or::after{content:"";flex:1;border-top:1px solid var(--line)}
.btn{display:flex;align-items:center;justify-content:center;min-height:48px;border:2px solid #000;background:#000;color:#fff;font:600 1rem var(--sans);text-decoration:none;padding:0 18px}
.btn:hover{background:#222;text-decoration:none}
.btn.alt,button.alt{background:#fff;color:#000}
.btn.alt:hover,button.alt:hover{background:var(--band)}
.ok{color:var(--up);margin:0 0 14px;font-size:14px}
.btn.discord{margin-top:10px;background:#5865f2;border-color:#5865f2;gap:10px}
.btn.discord:hover{background:#4752c4;border-color:#4752c4}
.btn.discord svg{width:20px;height:20px;fill:#fff}
input.pw{display:block;width:100%;margin:6px 0 10px}
.linked.dc img:first-child{border-radius:50%}
h2{font-size:1.1rem;margin:22px 0 10px;padding-top:18px;border-top:1px solid var(--line);color:var(--ink)}
.facts{display:grid;grid-template-columns:auto 1fr;gap:8px 18px;margin:8px 0 6px;font-size:15px}
.facts dt{color:var(--mut);font-weight:600;font-size:13px;padding-top:2px}
.facts dd{margin:0;color:var(--ink);overflow-wrap:anywhere}
.tag{display:inline-block;margin-left:6px;padding:1px 6px;border:1px solid #000;font-size:11px;font-weight:700;letter-spacing:.02em;vertical-align:2px}
.linked{display:flex;align-items:center;gap:12px;margin:4px 0 12px}
.linked img:first-child{width:48px;height:48px;border-radius:50%;object-fit:cover}
.linked img.sq{border-radius:6px}
.linked .ck{width:18px;height:18px;vertical-align:-3px;margin-left:4px}
.fine{margin:28px 0 0;text-align:center;color:var(--mut);font-size:12px}
.fine a{color:inherit;text-decoration:underline}
@media(max-width:800px){.hnav{display:none}}
@media(max-width:700px){.tick-mkt{width:88px;padding:0 12px}.tape{padding:18px 16px 6px}.bsehead{padding:0 16px;height:64px}.logo-wrap .logo{height:36px}.wrap{padding:28px 12px 40px}.card{padding:28px 20px 22px}}`;

// ---------- the exchange's own pages around accounts: sign in, sign up, settings ----------
const AUTH_NAV = `<nav class="hnav" aria-label="Primary"><a href="/markets">Listings</a><a href="/portfolio">Trading</a><a href="/overview">Market Data</a><a href="/#insights">Insights</a><a href="/#about">About</a></nav>`;
async function bsePage(title: string, main: string, opts: { status?: number; csrf?: string; description?: string } = {}): Promise<Response> {
	const inst = settings().instance_name;
	const tape = await marketTape();
	const html = `<!DOCTYPE html>
<html lang="en" data-theme="light" data-site="bse"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
${BSE_ICONS}
<meta name="theme-color" content="#ffffff">
<meta name="description" content="${esc(opts.description ?? `Your ${BSE_NAME} account.`)}">
<style>${LOGIN_CSS}</style></head>
<body>
<header class="bsehead"><a class="wordmark" href="/" aria-label="${esc(BSE_SHORT)}">${BSE_WORDMARK}<span class="bname">${esc(BSE_NAME)}</span></a>${AUTH_NAV}<div class="grow"></div><a class="glink" href="${esc(PUBLIC_ORIGIN)}">${esc(inst)}</a></header>
${tape}
<div class="wrap"><main class="card">
${main}
</main></div>
<p class="fine"><a href="/">${esc(BSE_NAME)}</a> · © 2026 Bloxburg Stock Exchange. Independent community project. Not affiliated with Roblox, Welcome to Bloxburg or the NYSE.</p>
</body></html>`;
	const headers = new Headers({ "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff" });
	if (opts.csrf) headers.append("set-cookie", loginCsrfCookie(opts.csrf));
	return new Response(html, { status: opts.status ?? 200, headers });
}

async function loginPage(req: Request, opts: { next: string; error?: string; status?: number; challenge?: string; typed?: string; csrf?: string }): Promise<Response> {
	const inst = settings().instance_name;
	const csrf = opts.csrf || loginCsrfFrom(req) || newLoginCsrf();
	const next = opts.next;
	const twoFactor = !!opts.challenge;
	const title = twoFactor ? `Enter your code · ${BSE_SHORT}` : `Sign in · ${BSE_SHORT}`;
	const fields = twoFactor
		? `<input type="hidden" name="challenge" value="${esc(opts.challenge!)}">
<label><span>Verification code</span><input name="code" inputmode="numeric" autocomplete="one-time-code" autofocus required aria-label="Verification code"></label>`
		: `<label><span>Handle</span><input name="username" value="${esc(opts.typed ?? "")}" autocomplete="username" autocapitalize="off" spellcheck="false" maxlength="320" required autofocus></label>
<label><span>Password</span><input name="password" type="password" autocomplete="current-password" maxlength="1024" required></label>`;
	const q = `?next=${encodeURIComponent(next)}`;
	const main = `<h1>${twoFactor ? "Enter your verification code" : `Sign in to ${esc(BSE_SHORT)}`}</h1>
<p class="note">${twoFactor ? `Open your authenticator app and enter the code for ${esc(inst)}, or use a backup code.` : `Use your BSE account. If you've always traded with your ${esc(inst)} account, its username and password still work here.`}</p>
${opts.error ? `<p class="error" role="alert">${esc(opts.error)}</p>` : ""}
<form method="post" action="/login" autocomplete="on">
<input type="hidden" name="csrf" value="${esc(csrf)}">
<input type="hidden" name="next" value="${esc(next)}">
${fields}
<button type="submit">${twoFactor ? "Verify" : "Sign in"}</button>
</form>
${twoFactor
	? `<p class="back"><a href="/login${q}">Back to sign in</a></p>`
	: `<div class="or"><span>or</span></div>
<a class="btn alt" href="/auth/bs${q}">Sign in with ${esc(inst)}</a>
${discordOn() ? `<a class="btn discord" href="/auth/discord/start${q}">${DISCORD_MARK}Sign in with Discord</a>` : ""}
<p class="links"><a href="/signup${q}">Create a BSE account</a><a href="${esc(PUBLIC_ORIGIN)}/account/forgot">Forgot a ${esc(inst)} password</a></p>`}`;
	return bsePage(title, main, { status: opts.status, csrf, description: `Sign in to ${BSE_NAME} with a BSE account or your ${inst} account.` });
}

async function signupPage(req: Request, opts: { next: string; error?: string; status?: number; typed?: { username?: string; name?: string }; csrf?: string }): Promise<Response> {
	const inst = settings().instance_name;
	const csrf = opts.csrf || loginCsrfFrom(req) || newLoginCsrf();
	const q = `?next=${encodeURIComponent(opts.next)}`;
	const main = `<h1>Create a BSE account</h1>
<p class="note">Trade, hold Money and list companies without a ${esc(inst)} account. You can link one later in your account settings.</p>
${opts.error ? `<p class="error" role="alert">${esc(opts.error)}</p>` : ""}
<form method="post" action="/signup" autocomplete="on">
<input type="hidden" name="csrf" value="${esc(csrf)}">
<input type="hidden" name="next" value="${esc(opts.next)}">
<label><span>Name</span><input name="name" value="${esc(opts.typed?.name ?? "")}" autocomplete="name" maxlength="${NAME_MAX}" required autofocus aria-describedby="nm-help"><small id="nm-help">Shown on your portfolio, companies and trades.</small></label>
<label><span>Handle</span><span class="at"><b>@</b><input name="username" value="${esc(opts.typed?.username ?? "")}" autocomplete="username" autocapitalize="off" spellcheck="false" minlength="3" maxlength="15" pattern="@?[A-Za-z0-9_]{3,15}" required aria-describedby="un-help"></span><small id="un-help">3–15 letters, digits or underscores; you sign in with it. Handles are shared with ${esc(inst)}, so one that's taken there can't be used.</small></label>
<label><span>Password</span><input name="password" type="password" autocomplete="new-password" minlength="8" maxlength="256" required></label>
<label><span>Confirm password</span><input name="password2" type="password" autocomplete="new-password" minlength="8" maxlength="256" required></label>
<p class="note small">A BSE account has no email, so it can't be reset by email. Link a ${esc(inst)} account in settings to be able to sign in with it too.</p>
<button type="submit">Create account</button>
</form>
<p class="links"><a href="/login${q}">I already have an account</a></p>`;
	return bsePage(`Create an account · ${BSE_SHORT}`, main, { status: opts.status, csrf, description: `Create a ${BSE_NAME} account.` });
}

// a BSE-only account: a row in users marked bse_only, its password hashed as
// every other account's is (auth.ts createUser); the same handle rules as
// sign-up on the social site (invites.ts), so a social handle can't be taken
async function bseSignUp(f: { username: string; name: string; password: string; password2: string; country: string | null }): Promise<string> {
	const screenName = f.username.trim().replace(/^@/, "");
	if (looksBlank(f.name)) throw new Refusal("Enter your name.");
	const name = f.name.trim();
	if (settings().signup_mode === "closed") throw new Refusal("Sign-up is closed right now.");
	const problem = usernameProblem(screenName);
	if (problem) throw new Refusal(problem);
	if (isReserved(screenName)) throw new Refusal("That username is reserved.");
	if (await handleHeld(screenName)) throw new Refusal("That username isn't available.");
	if (blockedNameIn(screenName, name) || hateInName(screenName, name) || forbiddenText(name)) throw new Refusal("That username or name isn't allowed here.");
	if (name.length > NAME_MAX) throw new Refusal(`Names are at most ${NAME_MAX} characters.`);
	if (f.password.length < 8) throw new Refusal("Passwords are at least 8 characters.");
	if (f.password.length > 256) throw new Refusal("Passwords are at most 256 characters.");
	if (f.password !== f.password2) throw new Refusal("The passwords don't match.");
	const hash = await Bun.password.hash(f.password);
	const id = newId();
	await sql.begin(async (tx) => {
		const [taken] = await tx`select 1 from users where lower(screen_name) = lower(${screenName})`;
		if (taken) throw new Refusal("That username is taken.");
		await tx`insert into users (id, screen_name, name, password_hash, bse_only, signup_source, signup_country)
			values (${id}::bigint, ${screenName}, ${name}, ${hash}, true, 'BSE', ${f.country})`;
	});
	forgetHeld();
	return id;
}

async function bseSignupRoute(req: Request, viewer: Viewer | undefined): Promise<Response> {
	const url = new URL(req.url);
	if (viewer) return Response.redirect(bseNext(url.searchParams.get("next")), 302);
	if (req.method === "GET" || req.method === "HEAD") return signupPage(req, { next: bseNext(url.searchParams.get("next")) });
	if (req.method !== "POST") return new Response("method not allowed", { status: 405 });
	const form = await req.formData().catch(() => undefined);
	const field = (k: string) => String(form?.get(k) ?? "");
	const next = bseNext(field("next") || url.searchParams.get("next"));
	const typed = { username: field("username").trim(), name: field("name") };
	if (!form || !validLoginPost(req, field("csrf"))) return signupPage(req, { next, error: "That form expired. Try again.", status: 403, typed });
	try {
		await bseSignUp({ username: field("username"), name: field("name"), password: field("password"), password2: field("password2"), country: requestCountry(req) ?? null });
	} catch (e) {
		if (e instanceof Refusal) return signupPage(req, { next, error: e.message, status: 400, typed });
		throw e;
	}
	const session = await login(typed.username.replace(/^@/, ""), field("password"), { bse: true });
	if (!session) return loginPage(req, { next, error: "Your account was made. Sign in to continue.", typed: typed.username });
	return finishBseSignIn(req, session, next);
}

// "Sign in with Bloxburg Social" and linking one: Xitter's own authorization
// code + PKCE flow on the social site, where its sign-in proves the account
function oauthCookie(payload: string): string {
	return `${OAUTH_COOKIE}=${encodeURIComponent(payload)}; Path=/; HttpOnly; Max-Age=600; SameSite=Lax${SECURE}`;
}
const urlRandom = (n: number) => randomBytes(n).toString("base64url");
const challengeFor = (verifier: string) => createHash("sha256").update(verifier).digest("base64url");
async function bseAuthStart(req: Request, viewer: Viewer | undefined): Promise<Response> {
	const url = new URL(req.url);
	const link = url.searchParams.has("link");
	const next = link ? "/account" : bseNext(url.searchParams.get("next"));
	if (link && !viewer) return Response.redirect(`/login?next=${encodeURIComponent("/account")}`, 302);
	if (link && !viewer!.bse_only) return Response.redirect("/account", 302);
	if (!link && viewer) return Response.redirect(next, 302);
	const h = hit("auth", optsIp(req));
	if (!h.ok) return limitedResponse(h);
	const redirect = `${requestOrigin(req)}/auth/callback`;
	const state = urlRandom(24), verifier = urlRandom(32);
	const payload = Buffer.from(JSON.stringify({ state, verifier, next, redirect, mode: link ? "link" : "signin", uid: link ? viewer!.id : null }), "utf8").toString("base64url");
	const params = new URLSearchParams({ response_type: "code", client_id: BSE_OAUTH_CLIENT_ID, redirect_uri: redirect, scope: "read", state, code_challenge: challengeFor(verifier), code_challenge_method: "S256" });
	const headers = new Headers({ location: `${PUBLIC_ORIGIN}/oauth/authorize?${params}`, "cache-control": "no-store" });
	headers.append("set-cookie", oauthCookie(payload));
	return new Response(null, { status: 302, headers });
}

const ACCOUNT_NOTES: Record<string, [string, boolean]> = {
	linked: ["Your Bloxburg Social account is linked.", false],
	unlinked: ["Your Bloxburg Social account is unlinked.", false],
	taken: ["That Bloxburg Social account is already linked to another BSE account.", true],
	self: ["That account can't be linked.", true],
	expired: ["That took too long. Try linking again.", true],
	failed: ["Bloxburg Social didn't finish signing in. Try again.", true],
	dlinked: ["Your Discord account is linked.", false],
	dunlinked: ["Your Discord account is unlinked.", false],
	dtaken: ["That Discord account is already linked to another BSE account.", true],
	dfailed: ["Discord didn't finish signing in. Try again.", true],
	lastway: ["Add a password or link another account first: that's your only way to sign in.", true],
	pwset: ["Your password is saved.", false],
	pwbad: ["Passwords are 8 to 256 characters and have to match.", true],
};
async function accountPage(req: Request, viewer: Viewer): Promise<Response> {
	const inst = settings().instance_name;
	const [u] = await sql`select u.screen_name, u.name, u.bse_only, u.created_at, u.bse_linked_at, u.discord_id, u.discord_avatar, u.discord_linked_at, u.bse_passwordless,
			l.screen_name as l_handle, l.name as l_name, l.avatar_url as l_avatar, l.verified_type as l_badge
		from users u left join users l on l.id = u.bse_link_id where u.id = ${viewer.id}::bigint`;
	const m = ACCOUNT_NOTES[new URL(req.url).searchParams.get("m") ?? ""];
	const note = m ? `<p class="${m[1] ? "error" : "ok"}" role="status">${esc(m[0])}</p>` : "";
	const check = (t: string | null) => {
		const at = artType(t), src = at && art(at);
		return src ? `<img class="ck" src="${esc(src)}" alt="${t === "business" ? "Verified organization" : t === "blue" ? "Verified account" : "Government account"}">` : "";
	};
	let body: string;
	if (u.bse_only) {
		const linked = u.l_handle
			? `<div class="linked"><img src="${esc(pfpOf(u.l_avatar))}" alt="" class="${squareBadge(u.l_badge) ? "sq" : ""}"><div><b>${esc(u.l_name)}</b>${check(u.l_badge)}<div class="note">@${esc(u.l_handle)} · linked ${esc(new Date(u.bse_linked_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }))}</div></div></div>
<p class="note">Its picture and checkmark show on your account and companies here, and "Sign in with ${esc(inst)}" signs in to this account. Balances stay separate.</p>
<form method="post" action="/account/unlink"><input type="hidden" name="csrf" value="${esc(viewer.csrf)}"><button type="submit" class="alt">Unlink ${esc(inst)} account</button></form>`
			: `<p class="note">Link a ${esc(inst)} account to show its picture and checkmark here and to sign in with it. You'll sign in on ${esc(inst)} to prove it's yours.</p>
<a class="btn" href="/auth/bs?link=1">Link a ${esc(inst)} account</a>`;
		const csrfIn = `<input type="hidden" name="csrf" value="${esc(viewer.csrf)}">`;
		const discordBlock = u.discord_id
			? `<div class="linked dc"><img src="${esc(u.discord_avatar || DEFAULT_PFP)}" alt=""><div><b>Discord</b><div class="note">Linked ${esc(new Date(u.discord_linked_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }))}. "Sign in with Discord" signs in to this account.</div></div></div>
<form method="post" action="/account/discord/unlink">${csrfIn}<button type="submit" class="alt">Unlink Discord</button></form>`
			: `<p class="note">Link your Discord account to sign in with it. Only your Discord name and picture are read.</p>
<a class="btn discord" href="/auth/discord/start?link=1">${DISCORD_MARK}Link Discord</a>`;
		const passwordForm = `<p class="note">This account was made with Discord and has no password. Add one to also sign in with your handle.</p>
<form method="post" action="/account/password">${csrfIn}<label><span>Password</span><input class="pw" name="password" type="password" autocomplete="new-password" minlength="8" maxlength="256" required></label><label><span>Confirm password</span><input class="pw" name="password2" type="password" autocomplete="new-password" minlength="8" maxlength="256" required></label><button type="submit">Save password</button></form>`;
		body = `<dl class="facts"><dt>Name</dt><dd>${esc(u.name)}</dd><dt>Handle</dt><dd>@${esc(u.screen_name)} <span class="tag">BSE account</span></dd><dt>Joined</dt><dd>${esc(new Date(u.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }))}</dd></dl>
<h2>${esc(inst)} account</h2>${linked}${discordOn() || u.discord_id ? `<h2>Discord account</h2>${discordBlock}` : ""}${u.bse_passwordless ? `<h2>Password</h2>${passwordForm}` : ""}`;
	} else {
		body = `<dl class="facts"><dt>Name</dt><dd>${esc(u.name)}</dd><dt>Handle</dt><dd>@${esc(u.screen_name)} <span class="tag">${esc(inst)} account</span></dd></dl>
<p class="note">You sign in to ${esc(BSE_SHORT)} with your ${esc(inst)} account. Your balance, holdings and companies stay tied to it. Change your picture, name or password on <a href="${esc(PUBLIC_ORIGIN)}/settings/account">${esc(inst)}</a>.</p>`;
	}
	const main = `<h1>Your account</h1>${note}${body}
<p class="links"><a href="/portfolio">Portfolio</a><a href="/logout">Sign out</a></p>`;
	return bsePage(`Account · ${BSE_SHORT}`, main);
}
async function bseAccountRoute(req: Request, viewer: Viewer | undefined, p: string): Promise<Response> {
	if (!viewer) return Response.redirect(`/login?next=${encodeURIComponent("/account")}`, 302);
	if (p === "/account" || p === "/settings") {
		if (req.method !== "GET" && req.method !== "HEAD") return new Response("method not allowed", { status: 405 });
		return accountPage(req, viewer);
	}
	// /account/unlink
	if (req.method !== "POST") return new Response("method not allowed", { status: 405 });
	const form = await req.formData().catch(() => undefined);
	const origin = req.headers.get("origin");
	if (!form || origin !== requestOrigin(req) || !sameCsrf(String(form.get("csrf") ?? ""), viewer.csrf)) return new Response("This form expired. Go back and try again.", { status: 403 });
	if (p === "/account/password") {
		const pw = String(form.get("password") ?? ""), pw2 = String(form.get("password2") ?? "");
		if (pw.length < 8 || pw.length > 256 || pw !== pw2) return Response.redirect("/account?m=pwbad", 303);
		const hash = await Bun.password.hash(pw);
		await sql`update users set password_hash = ${hash}, bse_passwordless = false where id = ${viewer.id}::bigint and bse_only and bse_passwordless`;
		return Response.redirect("/account?m=pwset", 303);
	}
	// an account made with Discord has no password until one is added: whichever
	// way is unlinked, one other way to sign in has to be left
	if (p === "/account/discord/unlink") {
		const done = await sql`update users set discord_id = null, discord_avatar = null, discord_linked_at = null where id = ${viewer.id}::bigint and bse_only and discord_id is not null
			and (not bse_passwordless or bse_link_id is not null) returning id`;
		if (!done.length) return Response.redirect("/account?m=lastway", 303);
		changed++;
		return Response.redirect("/account?m=dunlinked", 303);
	}
	const done = await sql`update users set bse_link_id = null, bse_linked_at = null where id = ${viewer.id}::bigint and bse_only and bse_link_id is not null
		and (not bse_passwordless or discord_id is not null) returning id`;
	if (!done.length) return Response.redirect("/account?m=lastway", 303);
	changed++;
	return Response.redirect("/account?m=unlinked", 303);
}

async function finishBseSignIn(req: Request, session: { token: string; csrf: string; userId: string }, next: string): Promise<Response> {
	const [u] = await sql`select status from users where id = ${session.userId}::bigint`;
	if (u?.status === "suspended") {
		await sql`delete from sessions where token = ${sessionKey(session.token)}`;
		return loginPage(req, { next, error: "This account is suspended.", status: 403 });
	}
	try {
		await recordSignIn(req, session);
		const res = signedInOn(session, next);
		for (const c of nightModeCookies(await loadLook(session.userId))) res.headers.append("set-cookie", c);
		res.headers.append("set-cookie", `${LOGIN_CSRF_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax${SECURE}`);
		return res;
	} catch {
		return loginPage(req, { next, error: "That account can't sign in right now.", status: 403 });
	}
}

async function bseLogin(req: Request, viewer: Viewer | undefined): Promise<Response> {
	const url = new URL(req.url);
	if (viewer) return Response.redirect(bseNext(url.searchParams.get("next")), 302);
	if (req.method === "GET" || req.method === "HEAD") return loginPage(req, { next: bseNext(url.searchParams.get("next")) });
	if (req.method !== "POST") return new Response("method not allowed", { status: 405 });
	const form = await req.formData().catch(() => undefined);
	const field = (k: string) => String(form?.get(k) ?? "");
	const next = bseNext(field("next") || url.searchParams.get("next"));
	if (!form || !validLoginPost(req, field("csrf"))) return loginPage(req, { next, error: "That sign-in form expired. Try again.", status: 403, typed: field("username") });
	const h = hit("auth", optsIp(req));
	if (!h.ok) return limitedResponse(h);
	if (field("challenge")) {
		const answered = await answerChallenge(field("challenge"), field("code").trim());
		if (answered.session) return finishBseSignIn(req, answered.session, next);
		if (answered.unknown) return loginPage(req, { next, error: "That sign-in took too long. Enter your password again.", status: 401 });
		return loginPage(req, { next, error: answered.error ?? "That code isn't right.", status: 401, challenge: answered.error?.startsWith("Too many") ? undefined : field("challenge") });
	}
	const step = await passwordStep(field("username"), field("password"), { bse: true });
	if ("challenge" in step) return loginPage(req, { next, challenge: step.challenge });
	if ("error" in step) return loginPage(req, { next, error: step.error, status: step.error.startsWith("Too many") ? 429 : 401, typed: field("username").trim() });
	return finishBseSignIn(req, step.session, next);
}


// ---------- Sign in with Discord: authorization code + PKCE, scope identify only ----------
// the API base can be pointed at a stand-in when testing
const DISCORD_API = (process.env.DISCORD_API_BASE ?? "https://discord.com/api").replace(/\/$/, "");
const DISCORD_COOKIE = `${SECURE ? "__Host-" : ""}bse_discord`;
const DISCORD_MARK = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-4.500L12 21l-2.500-3H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"/><circle cx="8.800" cy="11" r="1.600" fill="#5865f2"/><circle cx="15.200" cy="11" r="1.600" fill="#5865f2"/></svg>`;
const discordKeys = () => ({ id: (process.env.DISCORD_CLIENT_ID ?? "").trim(), secret: (process.env.DISCORD_CLIENT_SECRET ?? "").trim() });
const discordOn = () => { const k = discordKeys(); return !!k.id && !!k.secret; };
const clearDiscordCookie = `${DISCORD_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax${SECURE}`;

async function discordStart(req: Request, viewer: Viewer | undefined): Promise<Response> {
	const url = new URL(req.url);
	const link = url.searchParams.has("link");
	const next = link ? "/account" : bseNext(url.searchParams.get("next"));
	if (!discordOn()) return oauthErrorPage("Sign in with Discord isn't set up here.", next);
	if (link && !viewer) return Response.redirect(`/login?next=${encodeURIComponent("/account")}`, 302);
	if (link && !viewer!.bse_only) return Response.redirect("/account", 302);
	if (!link && viewer) return Response.redirect(next, 302);
	const redirect = `${requestOrigin(req)}/auth/discord/callback`;
	const state = urlRandom(24), verifier = urlRandom(32);
	const payload = Buffer.from(JSON.stringify({ state, verifier, next, redirect, mode: link ? "link" : "signin", uid: link ? viewer!.id : null }), "utf8").toString("base64url");
	const params = new URLSearchParams({ response_type: "code", client_id: discordKeys().id, scope: "identify", redirect_uri: redirect, state, code_challenge: challengeFor(verifier), code_challenge_method: "S256" });
	const headers = new Headers({ location: `https://discord.com/oauth2/authorize?${params}`, "cache-control": "no-store" });
	headers.append("set-cookie", `${DISCORD_COOKIE}=${encodeURIComponent(payload)}; Path=/; HttpOnly; Max-Age=600; SameSite=Lax${SECURE}`);
	return new Response(null, { status: 302, headers });
}

// the Discord user behind an authorization code: id, names, avatar. Nothing else is asked for or kept.
async function discordIdentity(code: string, redirect: string, verifier: string): Promise<{ id: string; username: string; globalName: string | null; avatar: string | null } | undefined> {
	const k = discordKeys();
	try {
		const t = await fetch(`${DISCORD_API}/oauth2/token`, {
			method: "POST",
			headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
			body: new URLSearchParams({ client_id: k.id, client_secret: k.secret, grant_type: "authorization_code", code, redirect_uri: redirect, code_verifier: verifier }),
			signal: AbortSignal.timeout(10_000),
		});
		if (!t.ok) return undefined;
		const tok = (await t.json()) as { access_token?: string };
		if (!tok.access_token) return undefined;
		const me = await fetch(`${DISCORD_API}/users/@me`, { headers: { authorization: `Bearer ${tok.access_token}`, accept: "application/json" }, signal: AbortSignal.timeout(10_000) });
		// let go of the token: it was only needed for this one lookup
		fetch(`${DISCORD_API}/oauth2/token/revoke`, {
			method: "POST",
			headers: { "content-type": "application/x-www-form-urlencoded" },
			body: new URLSearchParams({ client_id: k.id, client_secret: k.secret, token: tok.access_token, token_type_hint: "access_token" }),
			signal: AbortSignal.timeout(5_000),
		}).catch(() => {});
		if (!me.ok) return undefined;
		const u = (await me.json()) as { id?: string; username?: string; global_name?: string | null; avatar?: string | null };
		if (!u.id || !/^\d{15,25}$/.test(u.id) || typeof u.username !== "string") return undefined;
		const avatar = u.avatar && /^(a_)?[0-9a-f]{16,40}$/.test(u.avatar) ? `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.png?size=128` : null;
		return { id: u.id, username: u.username, globalName: typeof u.global_name === "string" ? u.global_name : null, avatar };
	} catch {
		return undefined;
	}
}

// a free handle from a Discord username, by the same rules as signing up: letters, digits and
// underscores, 3 to 15 long, not reserved, held, blocked or taken; a number is added when it's taken
async function freeHandle(username: string): Promise<string> {
	const clean = username.normalize("NFKD").replace(/[^A-Za-z0-9_]+/g, "").replace(/^_+|_+$/g, "");
	let base = clean.slice(0, 15);
	if (base.length < 3) base = (base + "bse").slice(0, 8);
	const ok = async (h: string) => !usernameProblem(h) && !isReserved(h) && !(await handleHeld(h)) && !blockedNameIn(h, h) && !hateInName(h, h)
		&& !(await sql`select 1 from users where lower(screen_name) = lower(${h})`).length;
	if (await ok(base)) return base;
	for (let i = 0; i < 40; i++) {
		const digits = i < 20 ? 2 : i < 30 ? 3 : 4;
		const suffix = String(Math.floor(Math.random() * 10 ** digits)).padStart(digits, "0");
		const h = base.slice(0, 15 - suffix.length) + suffix;
		if (await ok(h)) return h;
	}
	return "bse" + randomBytes(5).toString("hex").slice(0, 10);
}

async function discordCreate(d: { id: string; username: string; globalName: string | null; avatar: string | null }): Promise<string | undefined> {
	if (settings().signup_mode === "closed") return undefined;
	for (let tries = 0; tries < 5; tries++) {
		const handle = await freeHandle(d.username);
		let name = (d.globalName ?? d.username).trim().replace(/\s+/g, " ");
		if (looksBlank(name) || name.length > NAME_MAX || blockedNameIn(handle, name) || hateInName(handle, name) || forbiddenText(name)) name = handle;
		const id = newId();
		// no password to type: the stored one is a hash of random bytes nobody has
		const hash = await Bun.password.hash(randomBytes(32).toString("hex"));
		try {
			await sql`insert into users (id, screen_name, name, password_hash, bse_only, bse_passwordless, signup_source, discord_id, discord_avatar, discord_linked_at)
				values (${id}::bigint, ${handle}, ${name}, ${hash}, true, true, 'BSE', ${d.id}, ${d.avatar}, now())`;
			forgetHeld();
			return id;
		} catch {
			// the handle was taken a moment ago, or this Discord account was just made by another request
			const [again] = await sql`select id::text from users where discord_id = ${d.id}`;
			if (again) return again.id;
		}
	}
	return undefined;
}

async function discordCallback(req: Request): Promise<Response> {
	const url = new URL(req.url);
	let stored: { state?: string; verifier?: string; next?: string; redirect?: string; mode?: string; uid?: string | null } | undefined;
	try {
		const raw = parseCookie(req, DISCORD_COOKIE);
		if (raw) stored = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
	} catch {}
	const next = bseNext(stored?.next ?? "/");
	const linking = stored?.mode === "link";
	const back = (m: string) => {
		const headers = new Headers({ location: `/account?m=${m}` });
		headers.append("set-cookie", clearDiscordCookie);
		return new Response(null, { status: 303, headers });
	};
	const bad = (message: string) => { const r = oauthErrorPage(message, next); r.headers.append("set-cookie", clearDiscordCookie); return r; };
	if (url.searchParams.get("error") === "access_denied") return linking ? back("dfailed") : bad("You cancelled signing in.");
	if (url.searchParams.get("error")) return linking ? back("dfailed") : bad("Discord couldn't authorize this sign-in.");
	const code = url.searchParams.get("code") ?? "", state = url.searchParams.get("state") ?? "";
	if (!stored?.verifier || !stored.redirect || !code || !state || !sameCsrf(state, stored.state ?? "")) return linking ? back("expired") : bad("That sign-in expired. Try again.");
	const d = await discordIdentity(code, stored.redirect, stored.verifier);
	if (!d) return linking ? back("dfailed") : bad("Discord didn't finish authorizing this sign-in.");
	if (linking) {
		const viewer = await getViewer(req);
		if (!viewer || !viewer.bse_only || viewer.id !== stored.uid) return back("expired");
		try {
			const done = await sql`update users set discord_id = ${d.id}, discord_avatar = ${d.avatar}, discord_linked_at = now() where id = ${viewer.id}::bigint and bse_only and discord_id is null
				and not exists (select 1 from users o where o.discord_id = ${d.id}) returning id`;
			if (!done.length) return back("dtaken");
		} catch {
			return back("dtaken");
		}
		changed++;
		return back("dlinked");
	}
	let [found] = await sql`select id::text, status from users where discord_id = ${d.id} and bse_only and deactivated_at is null`;
	if (found?.status === "suspended") return bad("This account is suspended.");
	let userId: string | undefined = found?.id;
	if (userId) await sql`update users set discord_avatar = ${d.avatar} where id = ${userId}::bigint and discord_avatar is distinct from ${d.avatar}`;
	else userId = await discordCreate(d);
	if (!userId) return bad(settings().signup_mode === "closed" ? "Sign-up is closed right now." : "Couldn't make your account. Try again.");
	try {
		const session = await startSession(userId);
		const res = await finishBseSignIn(req, session, next);
		res.headers.append("set-cookie", clearDiscordCookie);
		return res;
	} catch {
		return bad("That account can't sign in right now.");
	}
}

// back from Bloxburg Social: sign in (to the BSE account linked to it, or the
// social account itself, as before), or link it to the signed-in BSE account
async function bseAuthCallback(req: Request): Promise<Response> {
	const url = new URL(req.url);
	const nextGuess = bseNext(url.searchParams.get("next"));
	let stored: { state?: string; verifier?: string; next?: string; redirect?: string; mode?: string; uid?: string | null } | undefined;
	try {
		const raw = parseCookie(req, OAUTH_COOKIE);
		if (raw) stored = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
	} catch {}
	const next = bseNext(stored?.next ?? nextGuess);
	const linking = stored?.mode === "link";
	const back = (m: string) => {
		const headers = new Headers({ location: `/account?m=${m}` });
		headers.append("set-cookie", `${OAUTH_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax${SECURE}`);
		return new Response(null, { status: 303, headers });
	};
	if (url.searchParams.get("error") === "access_denied") return linking ? back("failed") : oauthErrorPage("You cancelled signing in.", next);
	if (url.searchParams.get("error")) return linking ? back("failed") : oauthErrorPage("Bloxburg Social couldn't authorize this sign-in.", next);
	const code = url.searchParams.get("code") ?? "", state = url.searchParams.get("state") ?? "";
	if (!stored?.verifier || !stored.redirect || !state || !sameCsrf(state, stored.state ?? "")) return linking ? back("expired") : oauthErrorPage("That sign-in expired. Try again.", next);
	const h = hit("auth", optsIp(req));
	if (!h.ok) return limitedResponse(h);
	const userId = await redeemBseAuthorizationCode(req, stored.redirect, code, stored.verifier);
	if (!userId) return linking ? back("failed") : oauthErrorPage("Bloxburg Social didn't finish authorizing this sign-in.", next);
	if (linking) {
		const viewer = await getViewer(req);
		if (!viewer || !viewer.bse_only || viewer.id !== stored.uid) return back("expired");
		const [target] = await sql`select bse_only, status from users where id = ${userId}::bigint and deactivated_at is null`;
		if (!target || target.bse_only || target.status === "suspended" || userId === viewer.id) return back("self");
		try {
			const done = await sql`update users set bse_link_id = ${userId}::bigint, bse_linked_at = now() where id = ${viewer.id}::bigint and bse_only
				and not exists (select 1 from users o where o.bse_link_id = ${userId}::bigint and o.id <> ${viewer.id}::bigint) returning id`;
			if (!done.length) return back("taken");
		} catch {
			return back("taken");
		}
		changed++;
		return back("linked");
	}
	const [linked] = await sql`select id::text from users where bse_link_id = ${userId}::bigint and bse_only and status <> 'suspended' and deactivated_at is null`;
	try {
		const session = await startSession(linked?.id ?? userId);
		const res = await finishBseSignIn(req, session, next);
		res.headers.append("set-cookie", `${OAUTH_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax${SECURE}`);
		return res;
	} catch {
		return oauthErrorPage("That account can't sign in right now.", next);
	}
}
function parseCookie(req: Request, name: string): string | undefined {
	const all = req.headers.get("cookie") ?? "";
	for (const part of all.split(/;\s*/)) {
		const i = part.indexOf("=");
		if (i > 0 && part.slice(0, i) === name) return decodeURIComponent(part.slice(i + 1));
	}
	return undefined;
}
function bseLogout(next = "/"): Response {
	const headers = new Headers({ location: bseNext(next) });
	for (const c of clearedCookies()) headers.append("set-cookie", c);
	headers.append("set-cookie", `${OAUTH_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax${SECURE}`);
	return new Response(null, { status: 302, headers });
}

function mapBsePage(pathname: string, q: URLSearchParams): { view?: string; ticker?: string | null } | null {
	if (pathname === "/" || pathname === "") return q.get("c") ? { ticker: q.get("c") } : { view: "home" };
	if (pathname === "/overview") return { view: "dash" };
	if (pathname === "/markets" || pathname === "/list") return { view: "list" };
	if (pathname === "/portfolio") return { view: "acct" };
	if (pathname === "/admin") return { view: "admin" };
	if (pathname === "/new" || pathname === "/list-company") return { view: "new" };
	const tk = bseTickerPath(pathname);
	if (tk) return { ticker: tk, view: /\/edit\/?$/.test(pathname) ? "edit" : "co" };
	return null;
}
const BSE_PASS = [/^\/abs\//, /^\/public\//, /^\/profile_images\//, /^\/media\//, /^\/i\/xitter\//, /^\/healthz$/, /^\/sw\.js$/];
// the BSE's own host: pretty paths, its own layout, and a way to sign in with a Bloxburg Social account
export async function bseSite(req: Request, opts: { ip: string }): Promise<Response | undefined> {
	if (!isBseHost(req)) return;
	const url = new URL(req.url);
	const p = url.pathname;
	if (p === "/favicon.ico") return bsePublicFile("bse-favicon.ico", "image/x-icon");
	if (p === "/apple-touch-icon.png" || p === "/apple-touch-icon-precomposed.png") return bsePublicFile("bse-apple-touch.png", "image/png");
	if (BSE_PASS.some((r) => r.test(p))) return;
	const viewer = await getViewer(req);
	if (p === "/login") return bseLogin(req, viewer);
	if (p === "/signup" || p === "/join") return bseSignupRoute(req, viewer);
	if (p === "/auth/bs") return bseAuthStart(req, viewer);
	if (p === "/auth/discord/start") return discordStart(req, viewer);
	if (p === "/auth/discord/callback") return discordCallback(req);
	if (p === "/account" || p === "/settings" || p === "/account/unlink" || p === "/account/discord/unlink" || p === "/account/password") return bseAccountRoute(req, viewer, p);
	if (p === "/auth" || p === "/auth/" || p === "/auth/callback" || p === "/auth/callback/") return bseAuthCallback(req);
	if (p === "/logout") return bseLogout(url.searchParams.get("next") ?? "/");
	if (p === MARKETS_PATH || p.startsWith(`${MARKETS_PATH}/`)) {
		return marketsRoute(req, p, viewer, { clientShell: false, ip: opts.ip });
	}
	const mapped = mapBsePage(p, url.searchParams);
	if (!mapped) {
		if (req.method === "GET" && (req.headers.get("sec-fetch-dest") === "document" || req.headers.get("accept")?.includes("text/html"))) {
			return Response.redirect(PUBLIC_ORIGIN + p + url.search, 302);
		}
		return new Response("not found", { status: 404 });
	}
	if (req.method !== "GET" && req.method !== "HEAD") return new Response("method not allowed", { status: 405 });
	return page(req, viewer, { standalone: true, ticker: mapped.ticker, view: mapped.view });
}

export async function marketsRoute(req: Request, p: string, viewer: Viewer | undefined, opts: { clientShell: boolean; ip: string }): Promise<Response | undefined> {
	if (p !== MARKETS_PATH && !p.startsWith(`${MARKETS_PATH}/`)) return;
	const url = new URL(req.url);
	if (p === MARKETS_PATH || p === `${MARKETS_PATH}/` || p === `${MARKETS_PATH}/embed`) {
		if (req.method !== "GET" && req.method !== "HEAD") return new Response("method not allowed", { status: 405 });
		const top = p !== `${MARKETS_PATH}/embed` && req.headers.get("sec-fetch-dest") === "document" && !url.searchParams.has("embed");
		if (top && opts.clientShell) return undefined;
		return page(req, viewer);
	}
	if (p === `${MARKETS_PATH}/connect` || p === `${MARKETS_PATH}/connect/`) {
		const next = bseNext(url.searchParams.get("next"));
		return Response.redirect(`${bseOrigin()}/login?next=${encodeURIComponent(next)}`, 302);
	}
	if (p === `${MARKETS_PATH}/export.png`) {
		const h = hit("read", viewer ? `user:${viewer.id}` : `guest:${opts.ip}`);
		if (!h.ok) return limitedResponse(h);
		const origin = isBseHost(req) ? requestOrigin(req) : PUBLIC_ORIGIN;
		const body = await exportImage(url.searchParams.get("c"), url.searchParams.get("r"), origin);
		if (!body) return new Response("not found", { status: 404 });
		const t = (companyBy(await shared(), url.searchParams.get("c"))?.ticker ?? "stock").replace(/[^A-Za-z0-9_-]/g, "");
		return new Response(body, { headers: { "content-type": "image/png", "content-disposition": `attachment; filename="${t}-stock.png"`, "cache-control": "no-store", "x-content-type-options": "nosniff" } });
	}
	if (p === `${MARKETS_PATH}/og.png`) {
		const origin = isBseHost(req) ? requestOrigin(req) : PUBLIC_ORIGIN;
		const body = await ogImage(url.searchParams.get("c"), origin);
		return new Response(body, { headers: { "content-type": "image/png", "cache-control": url.searchParams.has("v") ? "public, max-age=300" : "public, max-age=30" } });
	}
	const logo = /^\/i\/markets\/logo\/(\d{1,19})$/.exec(p);
	if (logo) {
		const [r] = await sql`select logo, logo_type from market_companies where id = ${logo[1]} and logo is not null`;
		if (!r) return new Response("not found", { status: 404 });
		return new Response(r.logo, { headers: { "content-type": r.logo_type, "cache-control": "public, max-age=86400", "x-content-type-options": "nosniff", "content-security-policy": "default-src 'none'" } });
	}
	if (!p.startsWith(API)) return new Response("not found", { status: 404 });
	const what = p.slice(API.length);
	const h = hit(req.method === "GET" ? "read" : "write", viewer ? `user:${viewer.id}` : `guest:${opts.ip}`);
	if (!h.ok) return limitedResponse(h);
	if (what === "state" && req.method === "GET") return json(await state(viewer));
	if (req.method !== "POST" && !(what === "admin" && req.method === "GET")) return fail("not found", 404);
	if (!viewer) return fail("Sign in to trade", 401);
	// writes come from this site's own page, with the session's token
	if (req.method === "POST" && (!isOwnOrigin(req.headers.get("origin")) || req.headers.get("x-csrf-token") !== viewer.csrf)) return fail("Reload the page and try again", 403);
	try {
		const body = req.method === "POST" ? ((await req.json().catch(() => null)) ?? {}) : {};
		if (what === "trade") {
			await trade(viewer, body);
			return json(await state(viewer));
		}
		if (what === "accept") {
			if (!moneyOn()) throw new Refusal("Money is off");
			await acceptDisclaimer(viewer.id);
			return json(await state(viewer));
		}
		if (what === "register") {
			await register(viewer, body);
			changed++;
			return json(await state(viewer));
		}
		if (what === "company") {
			await editCompany(viewer, body);
			changed++;
			return json(await state(viewer));
		}
		if (!isAdmin(viewer)) return fail("Staff only", 403);
		if (what === "admin") return json(await adminData());
		const action = /^admin\/(\w+)$/.exec(what)?.[1];
		const run = action && Object.hasOwn(ADMIN, action) ? ADMIN[action] : undefined;
		if (!run) return fail("not found", 404);
		await run(body, viewer);
		changed++;
		return json({ ok: true, state: await state(viewer), admin: await adminData() });
	} catch (e) {
		if (e instanceof Refusal) return fail(e.message, e.status);
		console.error("markets", e);
		return fail("Something went wrong", 500);
	}
}
