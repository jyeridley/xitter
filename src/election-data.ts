// The election's data, read from Jye's artifact (election/index.html: its
// maps, races and November 2026 archive) and the live document it edits
// (election_docs maps/main), for the Xitter-styled page (election-page.ts),
// post cards and share image.

import { readFileSync } from "node:fs";
import { sql } from "./db";

const DIR = new URL("../election/", import.meta.url).pathname;

// the artifact's own declarations, by name, evaluated here as they are there
const NAMES_WANTED = [
	"PATHS", "EV", "NAMES", "POLLS", "KEYS", "CANDS", "CH", "PNAME", "candTag", "candSeat", "party", "hash", "seatCount",
	"ARC", "ANM", "APN", "APC", "ARC_ANCH", "arcMin", "arcClock", "ARC_EV", "aNames", "arcText", "arcCounties",
];

function declaration(src: string, name: string): string {
	const m = new RegExp(`(?:^|[;\\s])((?:const|let)\\s+${name}\\s*=|function\\s+${name}\\s*\\()`).exec(src);
	if (!m) throw new Error(`election data: ${name} not found`);
	const start = m.index + m[0].indexOf(m[1]);
	const fn = m[1].startsWith("function");
	let depth = 0;
	let quote = "";
	for (let i = start; i < src.length; i++) {
		const c = src[i];
		if (quote) {
			if (c === "\\") i++;
			else if (c === quote) quote = "";
			continue;
		}
		if (c === '"' || c === "'" || c === "`") quote = c;
		else if (c === "{" || c === "(" || c === "[") depth++;
		else if (c === "}" || c === ")" || c === "]") {
			depth--;
			if (fn && depth === 0 && c === "}") return src.slice(start, i + 1);
		} else if (c === ";" && depth === 0 && !fn) return src.slice(start, i + 1);
	}
	throw new Error(`election data: ${name} unterminated`);
}

type Cand = [string, string, string, string?];
type Static = {
	PATHS: Record<string, { d: string; c: [number, number] }>;
	EV: Record<string, number>;
	NAMES: Record<string, string>;
	POLLS: [string, string[]][];
	KEYS: Set<string>;
	CANDS: { S: Cand[]; H: Cand[] };
	CH: Record<"S" | "H", { name: string; short: string; seats: number; maj: number }>;
	ARC: any;
	ARC_EV: any[];
	arcText: (e: any) => [string, string, string];
	arcClock: (ts: number) => string;
	arcCounties: (o: any, k: string, force?: string | null) => { state: Votes; cs: { n: string; v: Votes | null }[] };
	party: (v: string) => "D" | "R" | "I" | "";
	candSeat: (ch: string, c: Cand) => string;
};
export type Votes = { d: number; r: number; i: number; o: number; t: number };

let data: Static | undefined;
export function electionStatic(): Static {
	if (data) return data;
	const src = readFileSync(`${DIR}index.html`, "utf8");
	const code = NAMES_WANTED.map((n) => declaration(src, n)).join("\n");
	data = new Function(`${code}\nreturn {${NAMES_WANTED.join(",")}};`)() as Static;
	return data;
}

const counties = new Map<string, any>();
export function countyFile(k: string): any {
	if (!/^[A-Z]{2}$/.test(k)) return undefined;
	if (!counties.has(k)) {
		try {
			counties.set(k, JSON.parse(readFileSync(`${DIR}counties/${k}.json`, "utf8")));
		} catch {
			counties.set(k, undefined);
		}
	}
	return counties.get(k);
}

export const COLORS: Record<string, string> = { D3: "#1f40c8", D2: "#4f6fe0", D1: "#93a7ee", R3: "#c3122f", R2: "#de4d63", R1: "#efa0ab", I3: "#e8660c", I2: "#f0924d", I1: "#f6bf95", T: "#d9b23a" };
export const PARTY_COLOR: Record<string, string> = { D: "#1f40c8", R: "#c3122f", I: "#e8660c" };
const PARTY_NAME: Record<string, string> = { D: "Democrat", R: "Republican", I: "Independent" };

export type StateResult = { k: string; name: string; ev: number; rating: string; p: string; called: boolean; key: boolean; votes?: Votes };
export type Summary = {
	mode: "live" | "final";
	title: string;
	subtitle: string;
	updatedAt: number;
	winner: string;
	cands: { p: string; name: string; party: string; ev: number; states: number; pv: string; votes: number }[];
	states: StateResult[];
	congress: { ch: "S" | "H"; name: string; seats: number; maj: number; won: { D: number; R: number }; control: string; races: { name: string; p: string; seat: string; state: string; won: boolean }[] }[];
	timeline: { at: number; clock: string; title: string; sub: string; color: string }[];
	totalVotes: number;
};

const S = (v: unknown, d = "") => (typeof v === "string" ? v : d);

async function liveDoc(): Promise<any | undefined> {
	const [r] = await sql`select data, (extract(epoch from updated_at) * 1000)::bigint::text as v from election_docs where path = 'maps/main'`;
	if (!r?.data || typeof r.data !== "object" || !Object.keys(r.data.states ?? {}).length) return undefined;
	return { ...r.data, updatedAt: Number(r.v) };
}

let cached: { at: number; key: string; s: Summary } | undefined;

// the results as they stand: the live map while it has anything on it, the
// November 2026 archive (final) otherwise or when asked for
export async function electionSummary(view: "auto" | "archive" = "auto"): Promise<Summary> {
	if (cached && cached.key === view && Date.now() - cached.at < 10_000) return cached.s;
	const D = electionStatic();
	const doc = view === "archive" ? undefined : await liveDoc().catch(() => undefined);
	const s = doc ? fromLive(D, doc) : fromArchive(D);
	cached = { at: Date.now(), key: view, s };
	return s;
}

function tally(D: Static, states: Record<string, string>, counted: (k: string) => boolean) {
	const ev: Record<string, number> = { D: 0, R: 0, I: 0 };
	const n: Record<string, number> = { D: 0, R: 0, I: 0 };
	for (const [k, v] of Object.entries(states)) {
		const p = D.party(v);
		if (!p || !D.EV[k] || !counted(k)) continue;
		ev[p] += D.EV[k];
		if (k.length === 2) n[p]++;
	}
	return { ev, n };
}

function congress(D: Static, cong: Record<"S" | "H", Record<string, unknown>>, maj: Record<string, string>): Summary["congress"] {
	return (["S", "H"] as const).map((ch) => {
		const won = { D: 0, R: 0 };
		const races = D.CANDS[ch].map((c, id) => {
			const w = !!cong[ch]?.[id];
			if (w && (c[1] === "D" || c[1] === "R")) won[c[1]]++;
			return { name: c[0], p: c[1], seat: D.candSeat(ch, c), state: D.NAMES[c[2]] ?? c[2], won: w };
		});
		races.sort((a, b) => Number(b.won) - Number(a.won) || a.state.localeCompare(b.state));
		const control = maj[ch] || (won.D >= D.CH[ch].maj ? "D" : won.R >= D.CH[ch].maj ? "R" : "");
		return { ch, name: D.CH[ch].name, seats: D.CH[ch].seats, maj: D.CH[ch].maj, won, control, races };
	});
}

function stateList(D: Static, states: Record<string, string>, called: (k: string) => boolean, votes?: (k: string) => Votes | undefined): StateResult[] {
	return Object.keys(D.EV)
		.map((k) => {
			const rating = states[k] ?? "";
			return { k, name: D.NAMES[k] ?? k, ev: D.EV[k], rating, p: D.party(rating), called: !!D.party(rating) && called(k), key: D.KEYS.has(k), votes: votes?.(k) };
		})
		.sort((a, b) => b.ev - a.ev || a.name.localeCompare(b.name));
}

function fromArchive(D: Static): Summary {
	const A = D.ARC;
	const { ev, n } = tally(D, A.states, () => true);
	const votes = new Map<string, Votes>();
	const pv = { d: 0, r: 0, i: 0, t: 0 };
	for (const k of Object.keys(A.states)) {
		if (k.length !== 2) continue;
		const o = countyFile(k);
		if (!o) continue;
		const v = D.arcCounties(o, k).state;
		votes.set(k, v);
		pv.d += v.d;
		pv.r += v.r;
		pv.i += v.i;
		pv.t += v.t;
	}
	// ME and NE's districts: their share of the statewide vote isn't kept
	const pres = D.ARC_EV.find((e) => e.type === "pres");
	const winner = pres?.p ?? (ev.D >= 270 ? "D" : ev.R >= 270 ? "R" : "");
	const names: Record<string, string> = { D: A.dName, R: A.rName, I: "Liam Carrington" };
	const pvOf = { D: pv.d, R: pv.r, I: pv.i } as Record<string, number>;
	const cands = (["D", "R", "I"] as const).map((p) => ({ p, name: names[p], party: PARTY_NAME[p], ev: ev[p], states: n[p], votes: pvOf[p], pv: pv.t ? `${((pvOf[p] / pv.t) * 100).toFixed(1)}%` : "" }));
	const maj: Record<string, string> = {};
	for (const e of D.ARC_EV) if (e.type === "major") maj[e.ch] = e.p;
	const timeline = D.ARC_EV.map((e) => {
		const [title, sub, color] = D.arcText(e);
		return { at: e.at, clock: D.arcClock(e.at), title, sub, color: colorOf(color) };
	}).reverse();
	return {
		mode: "final",
		title: A.title || "Election Night in America",
		subtitle: "November 2026 · Final results",
		updatedAt: Math.max(...D.ARC_EV.map((e) => e.at)),
		winner,
		cands: sortCands(cands, winner),
		states: stateList(D, A.states, () => true, (k) => votes.get(k)),
		congress: congress(D, { S: Object.fromEntries(A.cong.S.map((i: number) => [i, 1])), H: Object.fromEntries(A.cong.H.map((i: number) => [i, 1])) }, maj),
		timeline,
		totalVotes: pv.t,
	};
}

function fromLive(D: Static, doc: any): Summary {
	const states: Record<string, string> = {};
	for (const [k, v] of Object.entries(doc.states ?? {})) if (D.EV[k] && typeof v === "string") states[k] = v;
	const calledSet = doc.called ?? {};
	const counted = (k: string) => doc.count === "called" ? !!calledSet[k] : !!calledSet[k];
	const { ev, n } = tally(D, states, counted);
	const names: Record<string, string> = { D: S(doc.dName, "Democrat"), R: S(doc.rName, "Republican"), I: "Liam Carrington" };
	const pop: Record<string, string> = { D: S(doc.dPop), R: S(doc.rPop), I: "" };
	const presItem = (doc.feed ?? []).filter((f: any) => f?.k === "US" && D.party(f.v)).at(-1);
	const winner = presItem ? D.party(presItem.v) : ev.D >= 270 ? "D" : ev.R >= 270 ? "R" : "";
	const cands = (["D", "R", "I"] as const).filter((p) => p !== "I" || ev.I > 0).map((p) => ({ p, name: names[p], party: p === "D" ? S(doc.dParty, "Democrat") : p === "R" ? S(doc.rParty, "Republican") : "Independent", ev: ev[p], states: n[p], votes: 0, pv: pop[p] }));
	const maj: Record<string, string> = {};
	const timeline: Summary["timeline"] = [];
	for (const f of [...(doc.feed ?? [])].reverse().slice(0, 200)) {
		if (!f || typeof f.k !== "string") continue;
		const p = D.party(f.v);
		const clock = D.arcClock(+f.at || 0);
		if (f.k === "US" && p) timeline.push({ at: f.at, clock, title: `${names[p]} elected President`, sub: `${PARTY_NAME[p]} · projected winner of the presidency`, color: PARTY_COLOR[p] });
		else if ((f.k === "MS" || f.k === "MH") && p) {
			maj[f.k[1]] ??= p;
			timeline.push({ at: f.at, clock, title: `${D.PNAME(p)} win control of the ${D.CH[f.k[1] as "S"].short}`, sub: D.CH[f.k[1] as "S"].name, color: PARTY_COLOR[p] });
		} else if (/^[SH]:\d+$/.test(f.k)) {
			const [ch, id] = f.k.split(":");
			const c = D.CANDS[ch as "S"][+id];
			if (c) timeline.push({ at: f.at, clock, title: `${c[0]} wins`, sub: `${D.candSeat(ch, c)} · ${D.NAMES[c[2]] ?? c[2]}`, color: PARTY_COLOR[c[1]] ?? "#71767b" });
		} else if (D.EV[f.k]) {
			if (f.c && p) timeline.push({ at: f.at, clock, title: `${names[p]} wins ${D.NAMES[f.k]}`, sub: `${D.EV[f.k]} electoral vote${D.EV[f.k] > 1 ? "s" : ""} · ${PARTY_NAME[p]}`, color: PARTY_COLOR[p] });
			else if (f.s === "close") timeline.push({ at: f.at, clock, title: `${D.NAMES[f.k]} too close to call`, sub: "", color: "#d9b23a" });
		}
	}
	return {
		mode: "live",
		title: S(doc.title) || "Election Night in America",
		subtitle: S(doc.subtitle) || "Live results",
		updatedAt: +doc.updatedAt || Date.now(),
		winner,
		cands: sortCands(cands, winner),
		states: stateList(D, states, (k) => !!calledSet[k]),
		congress: congress(D, { S: doc.cong?.S ?? {}, H: doc.cong?.H ?? {} }, maj),
		timeline,
		totalVotes: 0,
	};
}

const sortCands = (c: Summary["cands"], winner: string) => [...c].sort((a, b) => Number(b.p === winner) - Number(a.p === winner) || b.ev - a.ev || (a.p === "D" ? -1 : 1));

function colorOf(css: string): string {
	const m = /--(\w+)\)/.exec(css);
	if (!m) return css || "#71767b";
	return ({ DC: PARTY_COLOR.D, RC: PARTY_COLOR.R, IC: PARTY_COLOR.I, U: "#71767b" } as Record<string, string>)[m[1]] ?? "#71767b";
}

export function fillOf(s: StateResult | undefined, mode: Summary["mode"]): string {
	if (!s?.rating) return "var(--el-u)";
	if (mode === "final" || s.called) return PARTY_COLOR[s.p] ?? "var(--el-u)";
	return COLORS[s.rating] ?? "var(--el-u)";
}

// one state's counties: archive results are the artifact's own county model
export function stateDetail(k: string): any {
	const D = electionStatic();
	const base = k.slice(0, 2);
	const o = countyFile(base);
	if (!o || !D.EV[k]) return undefined;
	const force = k.length > 2 ? D.party(D.ARC.states[k]) : null;
	const r = D.arcCounties(o, base, force);
	return { k, name: D.NAMES[k], ev: D.EV[k], bb: o.bb, state: r.state, counties: r.cs.map((c, i) => ({ n: c.n, d: o.c[i][2], v: c.v })) };
}
