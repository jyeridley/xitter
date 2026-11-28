// BSE, the Bloxburg Stock Exchange, at /i/markets and trade.xitter.space: staff (the admin role) and
// any account can list companies (checkmarked ones show as verified), prices drift a little
// every two seconds, and every signed-in account trades with its money
// (money.ts: the wallet's balance is the cash; a buy takes from it and a sale
// pays into it, in the same transaction as the shares). Everyone sees the same
// market (Postgres); signed out, or with Money off, it's read-only. A port
// of Jye's one-file tradex.html, whose page script is markets-client.js. The BSE name is on every page people see.
//
// Like the election page (election.ts), a browser opening /i/markets gets it
// inside the client with its side bars (tidy.ts frames /i/markets/embed in the
// main column); frames, ?embed=1 and link fetchers get the page alone.

import { createHash, randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Viewer } from "./auth";
import { getViewer, startSession, sessionCookies, clearedCookies, SECURE } from "./auth";
import { BSE_HOST, BSE_NAME, BSE_OAUTH_CLIENT_ID, BSE_SHORT, PUBLIC_ORIGIN, bseOrigin, isBseHost, isOwnOrigin, requestOrigin } from "./config";
import { recordSignIn } from "./login-history";
import { redeemBseAuthorizationCode } from "./oauth";
import { sql } from "./db";
import { hateIn } from "./hate";
import { avatarSrc } from "./model";
import { serveAvatar } from "./media";
import { GUEST_ID } from "./blocks";
import { art, artType } from "./verified-art";
import { acceptDisclaimer, balanceOf, disclaimerAccepted, disclaimerText, economy } from "./money";
import { hit, limitedResponse } from "./ratelimit";
import { feature, hasBlockedPhrase, settings } from "./settings";
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
// the walk (see tick): per two-second step, as fractions of the price
const STEP = 0.0022, PULL = 0.025, FAIR_DRIFT = 0.0007, JUMP_ODDS = 0.012, JUMP = 0.012;
const MIN_PRICE = 0.0001;
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
		// each listed price takes a small random step (log-normal, so a $0.10
		// stock moves as visibly as a $100 one), pulled gently back towards a fair
		// value that wanders slowly itself, now and then a bigger jump; prices keep
		// six decimals, so no move is rounded away. Volume trickles in, more for
		// the bigger companies.
		const moved = await sql`with u as (
			update market_companies set
				fair = coalesce(fair, price::float8) * exp(random_normal(0, ${FAIR_DRIFT})),
				price = greatest(${MIN_PRICE}, round((price::float8 * exp(random_normal(0, ${STEP}) + ${PULL} * ln(coalesce(fair, price::float8) / price::float8)
					+ case when random() < ${JUMP_ODDS} then random_normal(0, ${JUMP}) else 0 end))::numeric, 6)),
				volume = volume + floor(power(random(), 2) * greatest(12, shares / 20000.0))::bigint
			where not suspended returning id, price)
			insert into market_history (company_id, price) select id, price from u returning company_id`;
		if (!moved.length) return;
		await sql`insert into market_index (value) select coalesce(sum(price * shares), 0)::float8 from market_companies`;
		changed++;
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
		p = Math.max(MIN_PRICE, p * Math.exp(-(normal() * STEP * 1.6) + 0.04 * Math.log(price / p)));
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
	const p = Math.max(MIN_PRICE, Number(price.toFixed(price < 1 ? 6 : 2)));
	await sql`update market_companies set price = ${p} where id = ${id}`;
	await sql`insert into market_history (company_id, price) values (${id}, ${p})`;
	await log(`${ticker} ${fmtP(p)} (${why})`, viewer);
}

// ---------- what the page draws ----------

type Owner = { id: string; handle: string; name: string; badge: string | null; avatar: string; custom: boolean; sq: boolean };
const DEFAULT_PFP = "/abs/sticky/default_profile_images/default_profile_normal.png";
// an account's picture, sized for the market's rows and headers; our own uploads stay
// on this host's path so they load wherever the market is opened from
const pfpOf = (url: string | null | undefined): string => {
	const id = url && /^\/media\/(\d{1,19})$/.exec(url)?.[1];
	return id ? `/profile_images/${id}_x96.jpg` : (avatarSrc(url) ?? DEFAULT_PFP);
};
// organisations and governments have square pictures across the site, people round ones (model.ts pictureShape)
const squareBadge = (t: string | null | undefined) => t === "business" || t === "government";
type Company = { id: string; name: string; ticker: string; logo: string; img: string; sq: boolean; price: number; prevClose: number; shares: number; volume: number; listed: number; suspended: boolean; sector: string; description: string; owner: Owner | null; hist: [number, number][] };
type Shared = { companies: Company[]; index: [number, number][]; headlines: any[]; events: any[]; gap: number };
let cache: { key: number; at: number; value: Promise<Shared> } | undefined;

async function loadShared(): Promise<Shared> {
	const [rows, hist, index, headlines, events, gap] = await Promise.all([
		sql`select c.id::text, c.name, c.ticker, c.logo_v, c.logo is not null as has_logo, c.price::float8, c.prev_close::float8, c.shares::float8, c.volume::float8, (extract(epoch from c.listed_at) * 1000)::float8 as listed, c.suspended,
			coalesce(c.sector, '') as sector, coalesce(c.description, '') as description, u.id::text as owner_id, u.screen_name as owner_handle, u.name as owner_name, u.verified_type as owner_badge, u.avatar_url as owner_avatar
			from market_companies c left join users u on u.id = c.owner_id and u.status <> 'suspended' and u.deactivated_at is null order by c.id`,
		sql`select company_id::text as c, (extract(epoch from t) * 1000)::float8 as t, price::float8 as p from (select company_id, t, price, id, row_number() over (partition by company_id order by id desc) rn from market_history) x where rn <= ${HIST_SENT} order by company_id, id`,
		sql`select (extract(epoch from t) * 1000)::float8 as t, value from (select * from market_index order by id desc limit ${INDEX}) x order by id`,
		sql`select id::text, text, cat, ticker, breaking, (extract(epoch from created_at) * 1000)::float8 as t from market_headlines order by id desc limit 100`,
		sql`select id::text, name, detail, (extract(epoch from created_at) * 1000)::float8 as t from market_events order by id desc limit 100`,
		sql`select value from market_state where key = 'gap'`,
	]);
	const byCo = new Map<string, [number, number][]>();
	for (const h of hist) (byCo.get(h.c) ?? byCo.set(h.c, []).get(h.c)!).push([h.t, h.p]);
	return {
		companies: rows.map((c: any) => {
			const logo = c.has_logo ? `${MARKETS_PATH}/logo/${c.id}?v=${c.logo_v}` : "";
			const owner: Owner | null = c.owner_id ? { id: c.owner_id, handle: c.owner_handle, name: c.owner_name, badge: c.owner_badge ?? null, avatar: pfpOf(c.owner_avatar), custom: !!c.owner_avatar, sq: squareBadge(c.owner_badge) } : null;
			// the founder's own picture first, then an uploaded logo, then the founder's default one; none at all draws the ticker
			const img = owner?.custom ? owner.avatar : logo || owner?.avatar || "";
			return {
			id: c.id, name: c.name, ticker: c.ticker, logo, img, sq: owner ? owner.sq : !!logo,
			price: c.price, prevClose: c.prev_close, shares: c.shares, volume: c.volume, listed: c.listed, suspended: c.suspended,
			sector: c.sector, description: c.description,
			owner,
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
		sql`select verified_type, status, name, avatar_url from users where id = ${viewer.id}`,
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
		const [c] = await tx`select id::text, ticker, price::float8, suspended from market_companies where id = ${idOf(body?.id)} for update`;
		if (!c) throw new Refusal("Company not found");
		if (c.suspended) throw new Refusal("This listing is suspended");
		await tx`insert into money_wallets (user_id, balance_cents) values (${viewer.id}::bigint, ${economy().starting_cents}) on conflict (user_id) do nothing`;
		const [w] = await tx`select balance_cents::bigint as cents from money_wallets where user_id = ${viewer.id}::bigint for update`;
		const cents = Math.round(q * c.price * 100);
		if (!Number.isSafeInteger(cents)) throw new Refusal("That order is too big");
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
		await tx`update market_companies set volume = volume + ${q} where id = ${c.id}`;
		await tx`insert into market_txns (user_id, side, ticker, qty, price, total, total_cents) values (${viewer.id}, ${side}, ${c.ticker}, ${q}, ${c.price}, ${cents / 100}, ${cents})`;
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
	if (!(price >= 0.1 && price <= 1000)) throw new Refusal("The starting price is between $0.10 and $1,000");
	if (!(sh >= 1000 && sh <= 10_000_000)) throw new Refusal("Shares outstanding are between 1,000 and 10,000,000");
	const p = Math.round(price * 100) / 100;
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
		if (!name || !tk || !(price > 0) || !(sh > 0)) throw new Refusal("Enter name, ticker, price and shares");
		if (price > 1e12 || sh > 1e15) throw new Refusal("That's too big a number");
		const logo = logoOf(b.logo);
		const p = Math.round(price * 100) / 100;
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
		if (!(p > 0) || p > 1e12) throw new Refusal("Enter a price");
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

async function page(req: Request, viewer: Viewer | undefined, opts: { standalone?: boolean; ticker?: string | null; view?: string | null } = {}): Promise<Response> {
	const url = new URL(req.url);
	const st = await state(viewer);
	const standalone = opts.standalone ?? isBseHost(req);
	const ticker = opts.ticker ?? url.searchParams.get("c");
	const co = companyBy(st, ticker);
	const inst = settings().instance_name;
	const title = co ? `${co.ticker} · ${co.name}` : standalone ? BSE_NAME : "BSE";
	const desc = co ? describeCompany(co) : describeMarket(st);
	const v = Math.floor(Date.now() / 60000).toString(36);
	const origin = standalone ? (isBseHost(req) ? requestOrigin(req) : bseOrigin()) : PUBLIC_ORIGIN;
	const path = standalone ? (co ? `/c/${co.ticker}` : "/") : `${MARKETS_PATH}${co ? `?c=${encodeURIComponent(co.ticker)}` : ""}`;
	const image = `${origin}${MARKETS_PATH}/og.png?${co ? `c=${encodeURIComponent(co.ticker)}&` : ""}v=${v}`;
	const canonical = `${origin}${path}`;
	const siteName = standalone ? BSE_NAME : inst;
	const ogTitle = co ? `${BSE_SHORT} · ${co.ticker} · ${co.name}` : BSE_NAME;
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
	const docTitle = co ? `${co.ticker} · ${co.name} · ${BSE_SHORT}` : standalone ? BSE_NAME : `${BSE_SHORT} · ${inst}`;
	const html = `<!DOCTYPE html>
<html lang="en"${standalone ? ' data-site="bse"' : ""}><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(docTitle)}</title>
<link rel="canonical" href="${esc(canonical)}">
${head}
<meta name="theme-color" content="#000000">
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
	const col = (values.length > 1 ? values[values.length - 1] >= values[0] : up) ? "#22c55e" : "#ef4444";
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
			? `<defs><clipPath id="pf">${shape}</clipPath></defs><rect x="56" y="94" width="84" height="84" fill="#202327" clip-path="url(#pf)"/><image x="56" y="94" width="84" height="84" preserveAspectRatio="xMidYMid slice" clip-path="url(#pf)" href="${pic}"/>`
			: `<g fill="#202327">${shape}</g><text x="98" y="145" font-size="22" font-weight="800" fill="#8b98a5" text-anchor="middle">${esc(c.ticker.slice(0, 4))}</text>`;
		const b = badgeSvg(c.owner?.badge), bx = (tx + capWidth(c.ticker, 34) + 8).toFixed(0);
		if (check) face += `<image x="${bx}" y="99" width="36" height="36" href="${check}"/>`;
		else if (b) face += `<g transform="translate(${(tx + capWidth(c.ticker, 34) + 8).toFixed(0)} 101) scale(1.55)">${b}</g>`;
	}
	const sub = c ? esc(c.name) + (c.sector ? ` · ${esc(c.sector)}` : "") + (c.owner ? ` · @${esc(c.owner.handle)}` : "") + (c.suspended ? " · SUSPENDED" : "") : all.length ? `${all.length} listed compan${all.length === 1 ? "y" : "ies"}` : "No companies listed yet";
	const value = c ? fmtP(c.price) : big(mc);
	const pill = all.length ? `<rect x="56" y="${c ? 244 : 232}" width="170" height="44" rx="22" fill="${up ? "#1d3a2a" : "#3a1d1d"}"/><text x="141" y="${c ? 275 : 263}" font-size="24" font-weight="700" text-anchor="middle" fill="${up ? "#4ade80" : "#f87171"}">${up ? "▲" : "▼"} ${Math.abs(change).toFixed(2)}%</text>` : "";
	return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" font-family="${FONT}">
<rect width="1200" height="630" fill="#000"/>
<text x="56" y="70" font-size="26" font-weight="800" letter-spacing="4" fill="#e7e9ea">BSE</text>
<text x="1144" y="70" font-size="22" fill="#71767b" text-anchor="end">${esc(BSE_NAME)}</text>
${face}<text x="${tx}" y="${c ? 128 : 132}" font-size="34" font-weight="700" fill="#e7e9ea">${head}</text>
<text x="${tx}" y="${c ? 166 : 168}" font-size="24" fill="#71767b">${sub}</text>
<text x="56" y="${c ? 232 : 222}" font-size="52" font-weight="800" fill="#ffffff">${value}</text>
${pill}${chart}
<text x="1144" y="610" font-size="20" fill="#71767b" text-anchor="end">${esc(ogFoot(c?.ticker ?? null, origin))}</text>
</svg>`;
}
const pictures = new Map<string, Promise<Buffer>>();
function ogFoot(ticker: string | null, origin: string): string {
	try {
		const host = new URL(origin).host;
		if (host === BSE_HOST || host.startsWith("trade.") || host.startsWith("bse.")) return ticker ? `${host}/c/${ticker}` : host;
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
	const col = (values.length > 1 ? values[values.length - 1] >= values[0] : up) ? "#22c55e" : "#ef4444";
	// the chart
	const cx = 48, cy = 250, cw = W - 96, ch = 250;
	let chart = "";
	if (values.length > 1) {
		const r = hi - lo || 1;
		const pts = values.map((y, i): [number, number] => [cx + (i / (values.length - 1)) * cw, cy + 10 + (1 - (y - lo) / r) * (ch - 20)]);
		const d = smoothPath(pts);
		const grid = [0, 1, 2, 3].map((k) => `<line x1="${cx}" x2="${cx + cw}" y1="${(cy + (k * ch) / 3).toFixed(1)}" y2="${(cy + (k * ch) / 3).toFixed(1)}" stroke="#1f2327" stroke-width="1"/>`).join("");
		const last = pts[pts.length - 1];
		chart = `${grid}<defs><linearGradient id="fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${col}" stop-opacity=".35"/><stop offset="1" stop-color="${col}" stop-opacity="0"/></linearGradient></defs>`
			+ `<path d="${d} L${(cx + cw).toFixed(1)},${cy + ch} L${cx},${cy + ch} Z" fill="url(#fill)"/>`
			+ `<path d="${d}" fill="none" stroke="${col}" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"/>`
			+ `<circle cx="${last[0].toFixed(1)}" cy="${last[1].toFixed(1)}" r="7" fill="${col}" fill-opacity=".25"/><circle cx="${last[0].toFixed(1)}" cy="${last[1].toFixed(1)}" r="4" fill="${col}"/>`;
	} else chart = `<text x="${W / 2}" y="${cy + ch / 2}" font-size="22" fill="#71767b" text-anchor="middle">No trading history yet</text>`;
	// the face: rounded square for organisations, circle for people, the ticker when there's no picture
	const ax = 48, ay = 44, as = 88;
	const shape = c.sq ? `<rect x="${ax}" y="${ay}" width="${as}" height="${as}" rx="20"/>` : `<circle cx="${ax + as / 2}" cy="${ay + as / 2}" r="${as / 2}"/>`;
	const face = pic
		? `<defs><clipPath id="pf">${shape}</clipPath></defs><rect x="${ax}" y="${ay}" width="${as}" height="${as}" fill="#202327" clip-path="url(#pf)"/><image x="${ax}" y="${ay}" width="${as}" height="${as}" preserveAspectRatio="xMidYMid slice" clip-path="url(#pf)" href="${pic}"/>`
		: `<g fill="#202327">${shape}</g><text x="${ax + as / 2}" y="${ay + as / 2 + 8}" font-size="22" font-weight="800" fill="#8b98a5" text-anchor="middle">${esc(c.ticker.slice(0, 4))}</text>`;
	const tx = ax + as + 20;
	const name = fitText(c.name, 34, W - 48 - Math.max(textWidth(fmtP(c.price), 50), 300) - tx - 70);
	const nx = tx + textWidth(name, 34) + 10;
	const b = badgeSvg(c.owner?.badge);
	const mark = check ? `<image x="${nx.toFixed(0)}" y="${ay + 6}" width="34" height="34" href="${check}"/>` : b ? `<g transform="translate(${nx.toFixed(0)} ${ay + 8}) scale(1.45)">${b}</g>` : "";
	const sub = `${esc(c.ticker)}${c.sector ? ` · ${esc(c.sector)}` : ""}${c.suspended ? " · SUSPENDED" : ""}`;
	// the price and how it moved, top right
	const pillText = `${up ? "▲" : "▼"} ${Math.abs(change).toFixed(2)}%`, pw = 40 + pillText.length * 14;
	const price = `<text x="${W - 48}" y="${ay + 50}" font-size="50" font-weight="800" fill="#ffffff" text-anchor="end">${fmtP(c.price)}</text>`
		+ `<rect x="${W - 48 - pw}" y="${ay + 66}" width="${pw}" height="38" rx="19" fill="${up ? "#123524" : "#3a1616"}"/><text x="${W - 48 - pw / 2}" y="${ay + 92}" font-size="21" font-weight="700" fill="${up ? "#4ade80" : "#f87171"}" text-anchor="middle">${pillText}</text>`
		+ `<text x="${W - 60 - pw}" y="${ay + 92}" font-size="18" fill="#71767b" text-anchor="end">since listing</text>`;
	const tag = `<rect x="48" y="${cy - 52}" width="64" height="30" rx="15" fill="#16181c" stroke="#2f3336"/><text x="80" y="${cy - 31}" font-size="16" font-weight="700" fill="#e7e9ea" text-anchor="middle">${label}</text>`
		+ `<text x="124" y="${cy - 31}" font-size="16" fill="#71767b">Price history</text>`;
	// the key numbers
	const stats: [string, string][] = [["Market cap", big(c.price * c.shares)], ["Volume", Math.round(c.volume).toLocaleString("en-US")], [`Range (${label})`, `${fmtP(lo)} – ${fmtP(hi)}`], ["Shares", Math.round(c.shares).toLocaleString("en-US")]];
	const sy = cy + ch + 22, colW = (W - 96) / 4;
	const row = `<rect x="48" y="${sy}" width="${W - 96}" height="76" rx="16" fill="#0e1012" stroke="#1f2327"/>`
		+ stats.map(([k, v], i) => `<text x="${72 + i * colW}" y="${sy + 30}" font-size="16" fill="#71767b">${esc(k)}</text><text x="${72 + i * colW}" y="${sy + 58}" font-size="22" font-weight="700" fill="#e7e9ea">${esc(fitText(v, 22, colW - 30))}</text>`).join("");
	const foot = `<text x="48" y="${H - 22}" font-size="17" font-weight="700" fill="#8b98a5">${esc(BSE_NAME)}</text>`
		+ `<text x="${W - 48}" y="${H - 22}" font-size="17" fill="#71767b" text-anchor="end">${esc(new URL(origin).host)}</text>`;
	return `<svg xmlns="http://www.w3.org/2000/svg" width="${W * S}" height="${H * S}" viewBox="0 0 ${W} ${H}" font-family="${FONT}">
<rect width="${W}" height="${H}" fill="#000"/>
${face}<text x="${tx}" y="${ay + 36}" font-size="34" font-weight="700" fill="#e7e9ea">${esc(name)}</text>${mark}
<text x="${tx}" y="${ay + 72}" font-size="22" fill="#71767b">${sub}</text>
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
	const h = host.split(":")[0].toLowerCase();
	return h === BSE_HOST || h === "trade.localhost" || h === "bse.localhost";
}
export function isMarketLink(url: string): boolean {
	try {
		const u = new URL(url);
		if (u.host === OWN_HOST && (u.pathname === MARKETS_PATH || u.pathname === `${MARKETS_PATH}/`)) return true;
		if (isBsePublicHost(u.host) && (u.pathname === "/" || u.pathname === "" || bseTickerPath(u.pathname) || u.pathname === "/markets")) return true;
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


// ---------- the BSE's own site (trade.xitter.space) ----------

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
const challengeFor = (verifier: string) => createHash("sha256").update(verifier).digest("base64url");
const randomUrl = (bytes = 32) => randomBytes(bytes).toString("base64url");

function signedInOn(session: { token: string; csrf: string; userId: string }, location: string, clearOauth = true, status = 303): Response {
	const headers = new Headers({ location });
	for (const c of sessionCookies(session)) headers.append("set-cookie", c);
	if (clearOauth) headers.append("set-cookie", `${OAUTH_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax${SECURE}`);
	return new Response(null, { status, headers });
}
function oauthErrorPage(message: string, next: string): Response {
	const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Sign in · ${esc(BSE_SHORT)}</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#000;color:#e7e9ea;font:15px system-ui,sans-serif}main{width:min(520px,calc(100vw - 32px))}h1{font-size:28px}a{color:#1d9bf0}p{color:#71767b}</style></head>
<body><main><h1>Couldn't sign in</h1><p>${esc(message)}</p><p><a href="/login?next=${encodeURIComponent(next)}">Try again</a> · <a href="/">${esc(BSE_NAME)}</a></p></main></body></html>`;
	return new Response(html, { status: 400, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
}
function oauthCookie(payload: string): string {
	return `${OAUTH_COOKIE}=${encodeURIComponent(payload)}; Path=/; HttpOnly; Max-Age=600; SameSite=Lax${SECURE}`;
}
// start Xitter's built-in authorization-code + PKCE flow on Bloxburg Social
async function bseLogin(req: Request, viewer: Viewer | undefined): Promise<Response> {
	const url = new URL(req.url);
	const next = bseNext(url.searchParams.get("next"));
	if (viewer) return Response.redirect(next, 302);
	const redirect = `${isBseHost(req) ? requestOrigin(req) : bseOrigin()}/auth/callback`;
	const state = randomUrl(24), verifier = randomUrl(32);
	const payload = Buffer.from(JSON.stringify({ state, verifier, next, redirect }), "utf8").toString("base64url");
	const params = new URLSearchParams({
		response_type: "code",
		client_id: BSE_OAUTH_CLIENT_ID,
		redirect_uri: redirect,
		scope: "write",
		state,
		code_challenge: challengeFor(verifier),
		code_challenge_method: "S256",
	});
	const headers = new Headers({ location: `${PUBLIC_ORIGIN}/oauth/authorize?${params}`, "cache-control": "no-store" });
	headers.append("set-cookie", oauthCookie(payload));
	return new Response(null, { status: 302, headers });
}
async function bseAuthCallback(req: Request): Promise<Response> {
	const url = new URL(req.url);
	const nextGuess = bseNext(url.searchParams.get("next"));
	let stored: { state?: string; verifier?: string; next?: string; redirect?: string } | undefined;
	try {
		const raw = parseCookie(req, OAUTH_COOKIE);
		if (raw) stored = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
	} catch {}
	const next = bseNext(stored?.next ?? nextGuess);
	if (url.searchParams.get("error") === "access_denied") return oauthErrorPage("You cancelled signing in.", next);
	if (url.searchParams.get("error")) return oauthErrorPage("Bloxburg Social couldn't authorize this sign-in.", next);
	const code = url.searchParams.get("code") ?? "", state = url.searchParams.get("state") ?? "";
	if (!stored?.verifier || !stored.redirect || !state || state !== stored.state) return oauthErrorPage("That sign-in expired. Try again.", next);
	const h = hit("auth", optsIp(req));
	if (!h.ok) return limitedResponse(h);
	const userId = await redeemBseAuthorizationCode(req, stored.redirect, code, stored.verifier);
	if (!userId) return oauthErrorPage("Bloxburg Social didn't finish authorizing this sign-in.", next);
	try {
		const session = await startSession(userId);
		await recordSignIn(req, session);
		return signedInOn(session, next);
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
	if (pathname === "/" || pathname === "") return { ticker: q.get("c") };
	if (pathname === "/markets" || pathname === "/list") return { view: "list" };
	if (pathname === "/portfolio") return { view: "acct" };
	if (pathname === "/admin") return { view: "admin" };
	if (pathname === "/new" || pathname === "/list-company") return { view: "new" };
	const tk = bseTickerPath(pathname);
	if (tk) return { ticker: tk, view: /\/edit\/?$/.test(pathname) ? "edit" : "co" };
	return null;
}
const BSE_PASS = [/^\/abs\//, /^\/public\//, /^\/profile_images\//, /^\/media\//, /^\/i\/xitter\//, /^\/favicon\.ico$/, /^\/healthz$/, /^\/sw\.js$/];
// the BSE's own host: pretty paths, its own layout, and a way to sign in with a Bloxburg Social account
export async function bseSite(req: Request, opts: { ip: string }): Promise<Response | undefined> {
	if (!isBseHost(req)) return;
	const url = new URL(req.url);
	const p = url.pathname;
	if (BSE_PASS.some((r) => r.test(p))) return;
	const viewer = await getViewer(req);
	if (p === "/login") return bseLogin(req, viewer);
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
