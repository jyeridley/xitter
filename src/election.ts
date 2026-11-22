// /i/electionnov22: Jye's "Election Night in America" Claude artifact
// (election/), served whole as its own page, outside the X client. Its
// claude.use("db" | "user" | "room") runtime is election/election-shim.js
// with the API below: documents in election_docs, readable by anyone,
// written by Xitter admins only; the room is a server-sent event stream.

import { readFileSync, readdirSync } from "node:fs";
import type { Viewer } from "./auth";
import { PUBLIC_ORIGIN } from "./config";
import { sql } from "./db";
import { electionCardHtml } from "./election-card";
import { electionSummary, stateDetail } from "./election-data";
import { electionImage } from "./election-og";
import { electionPage } from "./election-page";

export const ELECTION_PATH = "/i/electionnov22";
const DIR = new URL("../election/", import.meta.url).pathname;
const API = `${ELECTION_PATH}/api/`;

type Assets = { page: string; files: Map<string, { body: Buffer; type: string }>; base: string };
let assets: Assets | undefined;

function load(): Assets {
	const files = new Map<string, { body: Buffer; type: string }>();
	for (const f of readdirSync(`${DIR}counties`)) if (/^[A-Z]{2}\.json$/.test(f)) files.set(`counties/${f}`, { body: readFileSync(`${DIR}counties/${f}`), type: "application/json" });
	for (const f of readdirSync(`${DIR}fonts`)) if (f.endsWith(".woff2")) files.set(f, { body: readFileSync(`${DIR}fonts/${f}`), type: "font/woff2" });
	const shim = readFileSync(`${DIR}election-shim.js`);
	const fontCss = readFileSync(`${DIR}fonts/fonts.css`, "utf8");
	// one hash over everything the page loads: a new file is a new address
	const hash = Bun.hash(Buffer.concat([shim, Buffer.from(fontCss), ...[...files.values()].map((f) => f.body)])).toString(36);
	const base = `${ELECTION_PATH}/a/${hash}`;
	files.set("shim.js", { body: shim, type: "text/javascript; charset=utf-8" });
	files.set("fonts.css", { body: Buffer.from(fontCss.replaceAll("FONTBASE", base)), type: "text/css; charset=utf-8" });

	let page = readFileSync(`${DIR}index.html`, "utf8");
	const swap = (from: string | RegExp, to: string) => {
		const before = page;
		page = page.replace(from, to);
		if (page === before) throw new Error(`election page: ${from} not found`);
	};
	const title = "Election Night in America";
	const desc = "Live results map for election night, Nov 22, on Bloxburg Social.";
	swap(
		/<title>[^<]*<\/title>/,
		`<script src="${base}/shim.js"></script>
<title>${title}</title>
<meta property="og:title" content="${title}">
<meta property="og:description" content="${desc}">
<meta property="og:type" content="website">
<meta property="og:url" content="${PUBLIC_ORIGIN}${ELECTION_PATH}/classic">
<meta name="description" content="${desc}">
<meta name="theme-color" content="#101418">`,
	);
	swap(/<link rel="preconnect" href="https:\/\/fonts\.googleapis\.com">\s*/, "");
	swap(/<link href="https:\/\/fonts\.googleapis\.com\/css2[^"]*" rel="stylesheet">/, `<link rel="stylesheet" href="${base}/fonts.css">`);
	page = page.replaceAll("fetch('counties/'+", `fetch('${base}/counties/'+`);
	swap(
		/<\/body>/,
		`<a href="/i/electionnov22" id="xitterBack" style="position:fixed;left:10px;bottom:10px;z-index:2147483000;font:600 12px/1 Barlow,system-ui,sans-serif;color:#fff;background:rgba(16,20,24,.72);padding:7px 10px;border-radius:999px;text-decoration:none;letter-spacing:.02em;-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px)">← Results</a>
</body>`,
	);
	return { page, files, base };
}

const DOC_PATH = /^(maps\/(main|photos)|cphotos\/[SH]\d{1,3})$/;
const MAX_DOC = 1_500_000;

// the room: open streams, each a viewer or an editor
type Peer = { send: (s: string) => void; kind: "viewer" | "editor" };
const peers = new Set<Peer>();
const MAX_PEERS = 1000;
const enc = new TextEncoder();
function broadcast(m: unknown) {
	const line = `data: ${JSON.stringify(m)}\n\n`;
	for (const p of peers) p.send(line);
}
let peersTimer: ReturnType<typeof setTimeout> | undefined;
function peersChanged() {
	clearTimeout(peersTimer);
	peersTimer = setTimeout(() => broadcast({ ev: "$peers", peers: [...peers].map((p) => ({ kind: p.kind })) }), 500);
}

const json = (v: unknown, status = 200) => Response.json(v, { status, headers: { "cache-control": "no-store" } });
const isAdmin = (v: Viewer | undefined) => v?.role === "admin";
// writes come from this site's own page
const sameSite = (req: Request) => req.headers.get("origin") === PUBLIC_ORIGIN;

export async function electionRoute(req: Request, p: string, viewer: Viewer | undefined): Promise<Response | undefined> {
	if (p !== ELECTION_PATH && !p.startsWith(`${ELECTION_PATH}/`)) return;
	assets ??= load();
	if (p === ELECTION_PATH || p === `${ELECTION_PATH}/`) {
		if (req.method !== "GET" && req.method !== "HEAD") return new Response("method not allowed", { status: 405 });
		return electionPage(req, viewer);
	}
	if (p === `${ELECTION_PATH}/og.png` || p === `${ELECTION_PATH}/map.png`) {
		const view = new URL(req.url).searchParams.get("view") === "archive" ? "archive" : "auto";
		const body = await electionImage(p.endsWith("og.png") ? "og" : "map", view);
		// the address carries the result (?v=), so a versioned one keeps
		return new Response(body, { headers: { "content-type": "image/png", "cache-control": new URL(req.url).searchParams.has("v") ? "public, max-age=300" : "public, max-age=30" } });
	}
	if (p === `${ELECTION_PATH}/classic` || p === `${ELECTION_PATH}/classic/`) {
		if (req.method !== "GET" && req.method !== "HEAD") return new Response("method not allowed", { status: 405 });
		return new Response(assets.page, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-cache", "x-content-type-options": "nosniff" } });
	}
	const a = /^\/i\/electionnov22\/a\/([a-z0-9]+)\/(.+)$/.exec(p);
	if (a) {
		const f = assets.files.get(a[2]);
		if (!f) return new Response("not found", { status: 404 });
		const current = assets.base.endsWith(`/${a[1]}`);
		return new Response(f.body, { headers: { "content-type": f.type, "cache-control": current ? "public, max-age=31536000, immutable" : "no-cache" } });
	}
	if (!p.startsWith(API)) return new Response("not found", { status: 404 });
	const what = p.slice(API.length);
	const url = new URL(req.url);

	if (what === "me") return json({ canWrite: isAdmin(viewer) });
	if (what === "summary" && req.method === "GET") return Response.json(await electionSummary(url.searchParams.get("view") === "archive" ? "archive" : "auto"), { headers: { "cache-control": "public, max-age=10" } });
	if (what === "card" && req.method === "GET")
		return new Response(electionCardHtml(await electionSummary()), { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=15", "x-content-type-options": "nosniff" } });
	if (what === "state" && req.method === "GET") {
		const d = stateDetail(url.searchParams.get("k") ?? "");
		return d ? Response.json(d, { headers: { "cache-control": "public, max-age=3600" } }) : json({ error: "not found" }, 404);
	}

	if (what === "doc") {
		const path = url.searchParams.get("path") ?? "";
		if (!DOC_PATH.test(path)) return json({ error: "bad path" }, 400);
		if (req.method === "GET") {
			const [r] = await sql`select data, (extract(epoch from updated_at) * 1000)::bigint::text as v from election_docs where path = ${path}`;
			const v = r ? Number(r.v) : 0;
			if (url.searchParams.get("v") === String(v)) return json({ same: true, v });
			return json(r ? { exists: true, data: r.data, v } : { exists: false, v: 0 });
		}
		if (req.method !== "POST") return json({ error: "method" }, 405);
		if (!isAdmin(viewer) || !sameSite(req)) return json({ error: "admins only" }, 403);
		const raw = await req.text();
		if (raw.length > MAX_DOC) return json({ error: "too big" }, 413);
		let body: any;
		try {
			body = JSON.parse(raw);
		} catch {
			return json({ error: "bad json" }, 400);
		}
		if (body?.delete === true) {
			await sql`delete from election_docs where path = ${path}`;
			broadcast({ ev: "$doc", path });
			return json({ v: 0 });
		}
		if (!body || typeof body.data !== "object" || body.data === null || Array.isArray(body.data)) return json({ error: "data must be an object" }, 400);
		const [r] = await sql`insert into election_docs (path, data, updated_at) values (${path}, ${JSON.stringify(body.data)}::text::jsonb, clock_timestamp())
			on conflict (path) do update set data = excluded.data, updated_at = excluded.updated_at
			returning (extract(epoch from updated_at) * 1000)::bigint::text as v`;
		broadcast({ ev: "$doc", path });
		return json({ v: Number(r.v) });
	}

	if (what === "col" && req.method === "GET") {
		const name = url.searchParams.get("name") ?? "";
		if (name !== "cphotos") return json({ error: "bad collection" }, 400);
		const rows = await sql`select substr(path, 9) as id, data from election_docs where path like 'cphotos/%' order by path`;
		return json({ docs: rows.map((r: any) => ({ id: r.id, data: r.data })) });
	}

	if (what === "room" && req.method === "GET") {
		if (peers.size >= MAX_PEERS) return new Response("busy", { status: 503 });
		let peer: Peer | undefined;
		let ping: ReturnType<typeof setInterval> | undefined;
		const stream = new ReadableStream({
			start(c) {
				const send = (s: string) => {
					try {
						c.enqueue(enc.encode(s));
					} catch {
						close();
					}
				};
				const close = () => {
					if (!peer) return;
					peers.delete(peer);
					peer = undefined;
					clearInterval(ping);
					peersChanged();
				};
				peer = { send, kind: isAdmin(viewer) ? "editor" : "viewer" };
				peers.add(peer);
				send("retry: 3000\n\n");
				// Bun closes a connection quiet for 10 s (and Cloudflare after 100 s)
				ping = setInterval(() => send(": ping\n\n"), 8000);
				req.signal.addEventListener("abort", close);
				peersChanged();
			},
			cancel() {
				if (peer) peers.delete(peer);
				clearInterval(ping);
				peersChanged();
			},
		});
		return new Response(stream, { headers: { "content-type": "text/event-stream", "cache-control": "no-store", "x-accel-buffering": "no" } });
	}
	if (what === "room" && req.method === "POST") {
		if (!isAdmin(viewer) || !sameSite(req)) return json({ error: "admins only" }, 403);
		const raw = await req.text();
		if (raw.length > 16000) return json({ error: "too big" }, 413);
		let m: any;
		try {
			m = JSON.parse(raw);
		} catch {
			return json({ error: "bad json" }, 400);
		}
		if (typeof m?.ev !== "string" || !/^[a-z]{1,20}$/.test(m.ev)) return json({ error: "bad event" }, 400);
		broadcast({ ev: m.ev, data: m.data ?? null, tab: String(m.tab ?? "").slice(0, 40), me: String(m.me ?? "").slice(0, 40) });
		return json({ ok: true });
	}
	return json({ error: "not found" }, 404);
}
