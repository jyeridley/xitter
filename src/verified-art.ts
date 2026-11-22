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

const CHECK = 'svg[data-testid="icon-verified"]';
const GOLD = ":has(linearGradient)";
const GREY = ':has(path[fill="#829aab" i])';
const PICK = { gold: `${CHECK}${GOLD}`, grey: `${CHECK}${GREY}`, blue: `${CHECK}:not(${GOLD}):not(${GREY})` };

function art(type: string): string | null {
	try {
		const body = readFileSync(`${PUBLIC_DIR}/verified-${type}.webp`);
		return `/public/verified-${type}.webp?v=${Bun.hash(body).toString(36)}`;
	} catch {
		return null;
	}
}

export function verifiedArtCss(): string {
	return (["blue", "gold", "grey"] as const)
		.map((t) => {
			const url = art(t);
			return url
				? `${PICK[t]}{background:url("${url}") center/contain no-repeat!important;color:transparent!important;fill:transparent!important}${PICK[t]}>*{visibility:hidden!important}`
				: "";
		})
		.join("");
}

export const verifiedArtScript = () => {
	const css = verifiedArtCss();
	return css
		? `(function(){var s=document.createElement("style");s.setAttribute("data-xitter-verified-art","");s.textContent=${JSON.stringify(css)};(document.head||document.documentElement).appendChild(s)})();`
		: "";
};
