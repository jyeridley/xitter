// bs.xitter.space: the instance's own checkmark art. Drop
// public/verified-{blue,gold,grey}.webp in (scripts/badge-art.sh makes them)
// and the client's checkmark svg (testID "icon-verified") shows that picture
// instead of X's drawing, by type:
//   gold  = Business (X's gold check has a linearGradient)
//   grey  = Government, organisations and officials (X's grey check: a path filled #829aab)
//   blue  = every other check (verified people, affiliates)
// Pure CSS, so it holds however often React redraws the check. A type without
// its file keeps X's drawing. The address carries a hash of the file, so the
// browser and Cloudflare keep it for a year and a new picture is a new address.

import { readFileSync } from "node:fs";

const PUBLIC_DIR = process.env.PUBLIC_DIR ?? "public";
export const VERIFIED_ART = /^verified-(blue|gold|grey)\.webp$/;

// the check after a name, and the big one on the "Verified account" sheet
// (X shows its own blue rosette there; gold and grey have none of their own)
const CHECK = 'svg[data-testid="icon-verified"]';
const SHEET = 'svg[data-testid="verificationBadge"]';
const GOLD = ":has(linearGradient)";
const GREY = ':has(path[fill="#829aab" i])';
const pick = (svg: string) => ({ gold: `${svg}${GOLD}`, grey: `${svg}${GREY}`, blue: `${svg}:not(${GOLD}):not(${GREY})` });

function art(type: string): string | null {
	try {
		const body = readFileSync(`${PUBLIC_DIR}/verified-${type}.webp`);
		return `/public/verified-${type}.webp?v=${Bun.hash(body).toString(36)}`;
	} catch {
		return null;
	}
}

// The art fills its square; X's rosette sits inside its box with room
// around it. At 85% and centred the tilted square looks the same size as the
// rosette did. A little room either side keeps it off the name and off an
// affiliate's badge after it; overflow stays visible so its corners never clip.
const SIZE = "85%";

export function verifiedArtCss(): string {
	const rules = (["blue", "gold", "grey"] as const).map((t) => {
		const url = art(t);
		if (!url) return "";
		const sel = [pick(CHECK)[t], pick(SHEET)[t]];
		return `${sel.join(",")}{background:url("${url}") center/${SIZE} no-repeat!important;color:transparent!important;fill:transparent!important;overflow:visible!important}` +
			`${sel.map((s) => `${s}>*`).join(",")}{visibility:hidden!important}` +
			`${pick(CHECK)[t]}{margin-inline-start:.16em!important;margin-inline-end:.12em!important}`;
	});
	return rules.join("");
}

export const verifiedArtScript = () => {
	const css = verifiedArtCss();
	return css
		? `(function(){var s=document.createElement("style");s.setAttribute("data-xitter-verified-art","");s.textContent=${JSON.stringify(css)};(document.head||document.documentElement).appendChild(s)})();`
		: "";
};
