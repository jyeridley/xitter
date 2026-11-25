// TradeX, Jye's play stock market, at /i/markets: staff (the admin role) list
// companies, prices drift a little every two seconds, and every signed-in
// account trades with $5,000 of play cash it gets on its first visit. Everyone
// sees the same market (Postgres); signed out, it's read-only. A port of Jye's
// one-file tradex.html, whose page script is markets-client.js.
//
// Like the election page (election.ts), a browser opening /i/markets gets it
// inside the client with its side bars (tidy.ts frames /i/markets/embed in the
// main column); frames, ?embed=1 and link fetchers get the page alone.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Viewer } from "./auth";
import { PUBLIC_ORIGIN } from "./config";
import { sql } from "./db";
import { hit, limitedResponse } from "./ratelimit";
import { settings } from "./settings";

export const MARKETS_PATH = "/i/markets";
const API = `${MARKETS_PATH}/api/`;
const OWN_HOST = new URL(PUBLIC_ORIGIN).host;
const START_CASH = 5000;
const HIST = 500; // price points kept per company (the original's cap)
const HIST_SENT = 200; // the most the page draws (its widest range)
const INDEX = 300; // market-cap points kept
const LOGS = 300;
const CATS = ["Markets", "Corporate", "Economy", "Policy", "Major event"];
const MAX_LOGO = 1_000_000;

const esc = (t: string) => String(t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const json = (v: unknown, status = 200) => Response.json(v, { status, headers: { "cache-control": "no-store" } });
const fail = (message: string, status = 400) => json({ error: message }, status);
const fmt = (n: number) => "$" + Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const big = (n: number) => (n >= 1e12 ? "$" + (n / 1e12).toFixed(2) + "T" : n >= 1e9 ? "$" + (n / 1e9).toFixed(2) + "B" : n >= 1e6 ? "$" + (n / 1e6).toFixed(2) + "M" : fmt(n));
const pct = (a: number, b: number) => (b ? ((a - b) / b) * 100 : 0);
const sg = (x: number) => (x >= 0 ? "+" : "") + x.toFixed(2) + "%";
const isAdmin = (v: Viewer | undefined) => v?.role === "admin";

// ---------- the market's clock ----------

let ticking = false;
let ticks = 0;
let changed = 0; // bumped by every write: the shared state's cache key
async function tick() {
	if (ticking) return;
	ticking = true;
	try {
		// the original's walk: each listed price moves up to 0.4% either way
		const moved = await sql`with u as (
			update market_companies set price = greatest(0.01, round((price * (1 + (random() * 2 - 1) * 0.004))::numeric, 2)), volume = volume + floor(random() * 40)::bigint
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
async function prune() {
	await sql`delete from market_history h using (select id from (select id, row_number() over (partition by company_id order by id desc) rn from market_history) x where rn > ${HIST}) d where h.id = d.id`;
	await sql`delete from market_index where id <= (select id from market_index order by id desc offset ${INDEX} limit 1)`;
}
if (process.env.MARKETS_TICK !== "0") setInterval(tick, 2000).unref?.();

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
	const p = Math.max(0.01, Math.round(price * 100) / 100);
	await sql`update market_companies set price = ${p} where id = ${id}`;
	await sql`insert into market_history (company_id, price) values (${id}, ${p})`;
	await log(`${ticker} ${fmt(p)} (${why})`, viewer);
}

// ---------- what the page draws ----------

type Company = { id: string; name: string; ticker: string; logo: string; price: number; prevClose: number; shares: number; volume: number; listed: number; suspended: boolean; hist: [number, number][] };
type Shared = { companies: Company[]; index: [number, number][]; headlines: any[]; events: any[]; gap: number };
let cache: { key: number; at: number; value: Promise<Shared> } | undefined;

async function loadShared(): Promise<Shared> {
	const [rows, hist, index, headlines, events, gap] = await Promise.all([
		sql`select id::text, name, ticker, logo_v, logo is not null as has_logo, price::float8, prev_close::float8, shares::float8, volume::float8, (extract(epoch from listed_at) * 1000)::float8 as listed, suspended from market_companies order by id`,
		sql`select company_id::text as c, (extract(epoch from t) * 1000)::float8 as t, price::float8 as p from (select company_id, t, price, id, row_number() over (partition by company_id order by id desc) rn from market_history) x where rn <= ${HIST_SENT} order by company_id, id`,
		sql`select (extract(epoch from t) * 1000)::float8 as t, value from (select * from market_index order by id desc limit ${INDEX}) x order by id`,
		sql`select id::text, text, cat, ticker, breaking, (extract(epoch from created_at) * 1000)::float8 as t from market_headlines order by id desc limit 100`,
		sql`select id::text, name, detail, (extract(epoch from created_at) * 1000)::float8 as t from market_events order by id desc limit 100`,
		sql`select value from market_state where key = 'gap'`,
	]);
	const byCo = new Map<string, [number, number][]>();
	for (const h of hist) (byCo.get(h.c) ?? byCo.set(h.c, []).get(h.c)!).push([h.t, h.p]);
	return {
		companies: rows.map((c: any) => ({
			id: c.id, name: c.name, ticker: c.ticker, logo: c.has_logo ? `${MARKETS_PATH}/logo/${c.id}?v=${c.logo_v}` : "",
			price: c.price, prevClose: c.prev_close, shares: c.shares, volume: c.volume, listed: c.listed, suspended: c.suspended,
			hist: byCo.get(c.id) ?? [],
		})),
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

// an account's play money, opened with $5,000 on its first visit
async function account(viewer: Viewer) {
	await sql`insert into market_accounts (user_id, cash) values (${viewer.id}, ${START_CASH}) on conflict do nothing`;
	const [[a], holdings, txns] = await Promise.all([
		sql`select cash::float8, (extract(epoch from created_at) * 1000)::float8 as created from market_accounts where user_id = ${viewer.id}`,
		sql`select company_id::text as id, qty, cost from market_holdings where user_id = ${viewer.id}`,
		sql`select side, ticker, qty, price::float8, total::float8, (extract(epoch from created_at) * 1000)::float8 as t from market_txns where user_id = ${viewer.id} order by id desc limit 100`,
	]);
	return {
		handle: viewer.screen_name,
		cash: a.cash,
		created: a.created,
		holdings: Object.fromEntries(holdings.map((h: any) => [h.id, { qty: h.qty, cost: h.cost }])),
		txns,
	};
}

async function state(viewer: Viewer | undefined) {
	const [s, me] = await Promise.all([shared(), viewer ? account(viewer) : null]);
	return { ...s, me, admin: isAdmin(viewer), instance: settings().instance_name };
}

// ---------- trading ----------

class Refusal extends Error {}

async function trade(viewer: Viewer, body: any) {
	const side = body?.side === "sell" ? "sell" : body?.side === "buy" ? "buy" : null;
	const q = Math.floor(Number(body?.qty));
	if (!side) throw new Refusal("Choose buy or sell");
	if (!(q > 0) || q > 1e9) throw new Refusal("Enter a quantity");
	await sql`insert into market_accounts (user_id, cash) values (${viewer.id}, ${START_CASH}) on conflict do nothing`;
	await sql.begin(async (tx) => {
		const [c] = await tx`select id::text, ticker, price::float8, suspended from market_companies where id = ${String(body?.id ?? "0").replace(/\D/g, "") || "0"} for update`;
		if (!c) throw new Refusal("Company not found");
		if (c.suspended) throw new Refusal("This listing is suspended");
		const [a] = await tx`select cash::float8 from market_accounts where user_id = ${viewer.id} for update`;
		const cost = Math.round(q * c.price * 100) / 100;
		if (side === "buy") {
			if (cost > a.cash) throw new Refusal("Insufficient cash");
			await tx`update market_accounts set cash = cash - ${cost} where user_id = ${viewer.id}`;
			await tx`insert into market_holdings (user_id, company_id, qty, cost) values (${viewer.id}, ${c.id}, ${q}, ${cost})
				on conflict (user_id, company_id) do update set qty = market_holdings.qty + excluded.qty, cost = market_holdings.cost + excluded.cost`;
		} else {
			const [h] = await tx`select qty, cost from market_holdings where user_id = ${viewer.id} and company_id = ${c.id} for update`;
			if (!h || h.qty < q) throw new Refusal("Insufficient shares");
			const avg = h.cost / h.qty;
			if (h.qty - q < 0.0001) await tx`delete from market_holdings where user_id = ${viewer.id} and company_id = ${c.id}`;
			else await tx`update market_holdings set qty = qty - ${q}, cost = cost - ${avg * q} where user_id = ${viewer.id} and company_id = ${c.id}`;
			await tx`update market_accounts set cash = cash + ${cost} where user_id = ${viewer.id}`;
		}
		await tx`update market_companies set volume = volume + ${q} where id = ${c.id}`;
		await tx`insert into market_txns (user_id, side, ticker, qty, price, total) values (${viewer.id}, ${side}, ${c.ticker}, ${q}, ${c.price}, ${cost})`;
	});
	changed++;
}

// ---------- staff ----------

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
		const [c] = await sql`insert into market_companies (name, ticker, price, prev_close, shares, logo, logo_type)
			values (${name}, ${tk}, ${p}, ${p}, ${sh}, ${logo?.bytes ?? null}, ${logo?.type ?? null}) on conflict (ticker) do nothing returning id`;
		if (!c) throw new Refusal("Ticker already listed");
		await sql`insert into market_history (company_id, price) values (${c.id}, ${p})`;
		await log("LISTED " + tk, v);
	},
	async edit(b, v) {
		const c = await company(b.id);
		const name = String(b.name ?? "").trim().slice(0, 80), tk = tickerOf(b.ticker), sh = Math.floor(Number(b.shares));
		if (!name || !tk || !(sh > 0) || sh > 1e15) throw new Refusal("Name, ticker and shares are required");
		const [clash] = await sql`select 1 from market_companies where ticker = ${tk} and id <> ${c.id}`;
		if (clash) throw new Refusal("Ticker in use");
		const logo = logoOf(b.logo);
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
			await tx`update market_accounts a set cash = a.cash + s.v from (select h.user_id, sum(c.price::float8 * h.qty * 0.5) v from market_holdings h join market_companies c on c.id = h.company_id group by h.user_id) s where s.user_id = a.user_id`;
			await tx`update market_holdings set qty = qty * 0.5, cost = cost * 0.5`;
			await tx`delete from market_holdings where qty < 0.0001`;
		});
		await event("Political Scandal", "Half of all holdings pulled out to cash", v);
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
		sql`select u.screen_name, u.name, a.cash::float8, (extract(epoch from a.created_at) * 1000)::float8 as created,
			(select count(*)::int from market_holdings h where h.user_id = a.user_id) as positions,
			(select coalesce(sum(h.qty * c.price::float8), 0)::float8 from market_holdings h join market_companies c on c.id = h.company_id where h.user_id = a.user_id) as equity
			from market_accounts a join users u on u.id = a.user_id order by a.created_at`,
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
	return `${c.name} (${c.ticker}) ${fmt(c.price)} ${sg(pct(c.price, c.prevClose))} · market cap ${big(c.price * c.shares)} · volume ${c.volume.toLocaleString("en-US")}${c.suspended ? " · SUSPENDED" : ""}`;
}

async function page(req: Request, viewer: Viewer | undefined): Promise<Response> {
	const url = new URL(req.url);
	const st = await state(viewer);
	const co = companyBy(st, url.searchParams.get("c"));
	const name = settings().instance_name;
	const title = co ? `${co.ticker} · ${co.name}` : "Markets";
	const desc = co ? describeCompany(co) : describeMarket(st);
	const v = Math.floor(Date.now() / 60000).toString(36);
	const image = `${PUBLIC_ORIGIN}${MARKETS_PATH}/og.png?${co ? `c=${encodeURIComponent(co.ticker)}&` : ""}v=${v}`;
	const canonical = `${PUBLIC_ORIGIN}${MARKETS_PATH}${co ? `?c=${encodeURIComponent(co.ticker)}` : ""}`;
	const head = [
		["property", "og:title", `TradeX · ${title}`],
		["property", "og:description", desc],
		["property", "og:type", "website"],
		["property", "og:url", canonical],
		["property", "og:site_name", name],
		["property", "og:image", image],
		["property", "og:image:width", "1200"],
		["property", "og:image:height", "630"],
		["name", "twitter:card", "summary_large_image"],
		["name", "twitter:title", `TradeX · ${title}`],
		["name", "twitter:description", desc],
		["name", "twitter:image", image],
		["name", "description", desc],
	].map(([a, k, c]) => `<meta ${a}="${k}" content="${esc(c)}">`).join("\n");
	const f = clientFiles();
	const boot = JSON.stringify({ state: st, csrf: viewer?.csrf ?? null, signedIn: !!viewer }).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
	const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)} · ${esc(name)}</title>
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
function ogSvg(s: Shared, c: Company | undefined): string {
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
	const sub = c ? esc(c.name) + (c.suspended ? " · SUSPENDED" : "") : all.length ? `${all.length} listed compan${all.length === 1 ? "y" : "ies"}` : "No companies listed yet";
	const value = c ? fmt(c.price) : big(mc);
	const pill = all.length ? `<rect x="56" y="232" width="170" height="44" rx="22" fill="${up ? "#1d3a2a" : "#3a1d1d"}"/><text x="141" y="263" font-size="24" font-weight="700" text-anchor="middle" fill="${up ? "#4ade80" : "#f87171"}">${up ? "▲" : "▼"} ${Math.abs(change).toFixed(2)}%</text>` : "";
	return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" font-family="${FONT}">
<rect width="1200" height="630" fill="#000"/>
<text x="56" y="70" font-size="26" font-weight="800" letter-spacing="4" fill="#e7e9ea">TRADEX</text>
<text x="1144" y="70" font-size="22" fill="#71767b" text-anchor="end">${esc(settings().instance_name)} Markets</text>
<text x="56" y="132" font-size="34" font-weight="700" fill="#e7e9ea">${head}</text>
<text x="56" y="168" font-size="24" fill="#71767b">${sub}</text>
<text x="56" y="222" font-size="52" font-weight="800" fill="#ffffff">${value}</text>
${pill}${chart}
<text x="1144" y="610" font-size="20" fill="#71767b" text-anchor="end">${esc(OWN_HOST)}${MARKETS_PATH}${c ? `?c=${esc(c.ticker)}` : ""}</text>
</svg>`;
}
const pictures = new Map<string, Promise<Buffer>>();
async function ogImage(ticker: string | null): Promise<Buffer> {
	const s = await shared();
	const c = companyBy(s, ticker);
	const key = `${c?.ticker ?? ""}:${Math.floor(Date.now() / 60000)}`;
	let p = pictures.get(key);
	if (!p) {
		p = png(ogSvg(s, c));
		pictures.set(key, p);
		p.catch(() => pictures.delete(key));
		if (pictures.size > 30) pictures.delete(pictures.keys().next().value!);
	}
	return p;
}

// ---------- a link to the market in a post: its card (posts.ts) ----------

export function isMarketLink(url: string): boolean {
	try {
		const u = new URL(url);
		return u.host === OWN_HOST && (u.pathname === MARKETS_PATH || u.pathname === `${MARKETS_PATH}/`);
	} catch {
		return false;
	}
}
export async function marketLinkCard(url: string): Promise<Record<string, unknown>> {
	const s = await shared();
	const c = companyBy(s, new URL(url).searchParams.get("c"));
	const v = Math.floor(Date.now() / 60000).toString(36);
	const str = (x: string) => ({ string_value: x, type: "STRING" });
	const img = { image_value: { url: `${PUBLIC_ORIGIN}${MARKETS_PATH}/og.png?${c ? `c=${encodeURIComponent(c.ticker)}&` : ""}v=${v}`, width: 1200, height: 630, alt: c ? `${c.ticker} price chart` : "Market cap chart" }, type: "IMAGE" };
	const values: Record<string, unknown> = {
		title: str(c ? `TradeX · ${c.ticker} · ${c.name}` : "TradeX · Markets"),
		description: str(c ? describeCompany(c) : describeMarket(s)),
		domain: str(OWN_HOST),
		vanity_url: { ...str(OWN_HOST), scribe_key: "vanity_url" },
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

export async function marketsRoute(req: Request, p: string, viewer: Viewer | undefined, opts: { clientShell: boolean; ip: string }): Promise<Response | undefined> {
	if (p !== MARKETS_PATH && !p.startsWith(`${MARKETS_PATH}/`)) return;
	const url = new URL(req.url);
	if (p === MARKETS_PATH || p === `${MARKETS_PATH}/` || p === `${MARKETS_PATH}/embed`) {
		if (req.method !== "GET" && req.method !== "HEAD") return new Response("method not allowed", { status: 405 });
		const top = p !== `${MARKETS_PATH}/embed` && req.headers.get("sec-fetch-dest") === "document" && !url.searchParams.has("embed");
		if (top && opts.clientShell) return undefined;
		return page(req, viewer);
	}
	if (p === `${MARKETS_PATH}/og.png`) {
		const body = await ogImage(url.searchParams.get("c"));
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
	if (req.method === "POST" && (req.headers.get("origin") !== PUBLIC_ORIGIN || req.headers.get("x-csrf-token") !== viewer.csrf)) return fail("Reload the page and try again", 403);
	try {
		if (what === "trade") {
			await trade(viewer, await req.json().catch(() => null));
			return json(await state(viewer));
		}
		if (!isAdmin(viewer)) return fail("Staff only", 403);
		if (what === "admin") return json(await adminData());
		const action = /^admin\/(\w+)$/.exec(what)?.[1];
		const run = action && Object.hasOwn(ADMIN, action) ? ADMIN[action] : undefined;
		if (!run) return fail("not found", 404);
		await run((await req.json().catch(() => null)) ?? {}, viewer);
		changed++;
		return json({ ok: true, state: await state(viewer), admin: await adminData() });
	} catch (e) {
		if (e instanceof Refusal) return fail(e.message);
		console.error("markets", e);
		return fail("Something went wrong", 500);
	}
}
