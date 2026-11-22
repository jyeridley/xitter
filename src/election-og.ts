// The election's share image (og.png, 1200×630) and the map alone (map.png)
// for its card in posts: SVG drawn here, made a PNG by ffmpeg's librsvg.

import { electionStatic, electionSummary, fillOf, PARTY_COLOR, type Summary } from "./election-data";
import { ELECTION_TITLE } from "./election-page";

const esc = (t: string) => t.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const FONT = "DejaVu Sans, Helvetica, Arial, sans-serif";

function mapPaths(s: Summary, unknown: string, stroke: string, width: number): string {
	const D = electionStatic();
	const by = new Map(s.states.map((x) => [x.k, x]));
	return Object.entries(D.PATHS)
		.map(([k, v]) => `<path d="${v.d}" fill="${fillOf(by.get(k), s.mode).replace("var(--el-u)", unknown)}" stroke="${stroke}" stroke-width="${width}" stroke-linejoin="round"/>`)
		.join("");
}

function ogSvg(s: Summary): string {
	const [a, b] = s.cands;
	const row = (c: Summary["cands"][0], y: number) => `
<rect x="56" y="${y}" width="8" height="112" rx="4" fill="${PARTY_COLOR[c.p]}"/>
<text x="84" y="${y + 34}" font-size="30" font-weight="700" fill="#e7e9ea">${esc(c.name)}${s.winner === c.p ? " ✓" : ""}</text>
<text x="84" y="${y + 64}" font-size="22" fill="#71767b">${esc(c.party)}${c.pv ? ` · ${esc(c.pv)}` : ""}</text>
<text x="84" y="${y + 112}" font-size="44" font-weight="800" fill="${PARTY_COLOR[c.p] === PARTY_COLOR.D ? "#6f8cff" : "#ff5a6e"}">${c.ev}<tspan font-size="22" font-weight="400" fill="#71767b" dx="10">electoral votes</tspan></text>`;
	const D = s.cands.find((c) => c.p === "D")?.ev ?? 0;
	const R = s.cands.find((c) => c.p === "R")?.ev ?? 0;
	const I = s.cands.find((c) => c.p === "I")?.ev ?? 0;
	const W = 1088;
	return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" font-family="${FONT}">
<rect width="1200" height="630" fill="#000"/>
<text x="56" y="76" font-size="38" font-weight="800" fill="#e7e9ea">${esc(ELECTION_TITLE)}</text>
<rect x="56" y="96" width="${s.mode === "live" ? 86 : 92}" height="34" rx="17" fill="${s.mode === "live" ? "#3a0c10" : "#16181c"}"/>
<text x="${s.mode === "live" ? 99 : 102}" y="120" font-size="19" font-weight="700" text-anchor="middle" fill="${s.mode === "live" ? "#f4212e" : "#8b98a5"}">${s.mode === "live" ? "● LIVE" : "FINAL"}</text>
<text x="${s.mode === "live" ? 156 : 162}" y="120" font-size="21" fill="#71767b">${esc(s.subtitle)}</text>
${a ? row(a, 170) : ""}${b ? row(b, 318) : ""}
<g transform="translate(520 128) scale(0.62)">${mapPaths(s, "#3b3f43", "#000", 1.4)}</g>
<g transform="translate(56 520)">
<rect width="${W}" height="22" rx="11" fill="#3b3f43"/>
<clipPath id="c"><rect width="${W}" height="22" rx="11"/></clipPath>
<g clip-path="url(#c)"><rect width="${(D / 538) * W}" height="22" fill="${PARTY_COLOR.D}"/><rect x="${(D / 538) * W}" width="${(I / 538) * W}" height="22" fill="${PARTY_COLOR.I}"/><rect x="${W - (R / 538) * W}" width="${(R / 538) * W}" height="22" fill="${PARTY_COLOR.R}"/></g>
<rect x="${W * (270 / 538) - 1.5}" y="-6" width="3" height="34" fill="#e7e9ea"/>
<text x="${W / 2}" y="56" font-size="20" fill="#71767b" text-anchor="middle">270 to win</text>
</g>
<text x="1144" y="604" font-size="20" fill="#71767b" text-anchor="end">bs.xitter.space/i/electionnov22</text>
</svg>`;
}

function mapOnlySvg(s: Summary): string {
	return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="628" viewBox="-60 -10 1095 640"><rect x="-60" y="-10" width="1095" height="640" fill="#000"/>${mapPaths(s, "#3b3f43", "#000", 1.2)}</svg>`;
}

async function png(svg: string): Promise<Buffer> {
	const p = Bun.spawn(["ffmpeg", "-hide_banner", "-loglevel", "error", "-f", "svg_pipe", "-i", "-", "-frames:v", "1", "-f", "image2", "-c:v", "png", "-"], { stdin: new Blob([svg]), stdout: "pipe", stderr: "pipe" });
	const out = Buffer.from(await new Response(p.stdout).arrayBuffer());
	if ((await p.exited) !== 0 || !out.length) throw new Error(`election image: ${await new Response(p.stderr).text()}`);
	return out;
}

const made = new Map<string, Promise<Buffer>>();
// one picture per kind and result: a new result is a new picture
export async function electionImage(kind: "og" | "map", view: "auto" | "archive" = "auto"): Promise<Buffer> {
	const s = await electionSummary(view);
	const key = `${kind}:${s.mode}:${s.updatedAt}`;
	let p = made.get(key);
	if (!p) {
		p = png(kind === "og" ? ogSvg(s) : mapOnlySvg(s));
		made.set(key, p);
		p.catch(() => made.delete(key));
		if (made.size > 20) made.delete(made.keys().next().value!);
	}
	return p;
}
