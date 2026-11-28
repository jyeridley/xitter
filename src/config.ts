export const PORT = Number(process.env.PORT ?? 3000);
// where browsers reach this instance, e.g. https://xit.example.org
export const PUBLIC_ORIGIN = (process.env.PUBLIC_ORIGIN ?? `http://localhost:${PORT}`).replace(/\/$/, "");
export const PUBLIC_HOSTNAME = new URL(PUBLIC_ORIGIN).hostname;

// the Bloxburg Stock Exchange's own site: same app and accounts, its own host
export const BSE_HOST = "trade.bs.xitter.space";
export const BSE_NAME = "Bloxburg Stock Exchange";
export const BSE_SHORT = "BSE";
export const requestHostname = (req: Request) => (req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "").toLowerCase().split(",")[0].trim().split(":")[0];
export const isBseHost = (req: Request) => {
	const h = requestHostname(req);
	return h === BSE_HOST || h === "trade.localhost" || h === "bse.localhost";
};
export function bseOrigin(): string {
	if (PUBLIC_HOSTNAME === "localhost" || PUBLIC_HOSTNAME === "127.0.0.1") {
		const port = new URL(PUBLIC_ORIGIN).port;
		return `http://trade.localhost${port ? `:${port}` : ""}`;
	}
	return `https://${BSE_HOST}`;
}
// this instance's own pages: the main site and the BSE site (and those hosts over http when developing)
export function isOwnOrigin(origin: string | null): boolean {
	if (!origin) return false;
	let u: URL;
	try {
		u = new URL(origin);
	} catch {
		return false;
	}
	const host = u.hostname.toLowerCase();
	if (origin === PUBLIC_ORIGIN || host === PUBLIC_HOSTNAME) return true;
	if (host === BSE_HOST) return true;
	if ((host === "trade.localhost" || host === "bse.localhost") && (PUBLIC_HOSTNAME === "localhost" || PUBLIC_HOSTNAME === "127.0.0.1")) return true;
	return false;
}
export function requestOrigin(req: Request): string {
	const forwarded = (req.headers.get("x-forwarded-proto") ?? "").split(",")[0].trim();
	const host = (req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? new URL(PUBLIC_ORIGIN).host).split(",")[0].trim();
	const name = host.split(":")[0].toLowerCase();
	const proto = forwarded || (PUBLIC_ORIGIN.startsWith("https:") && name !== "localhost" && name !== "127.0.0.1" && !name.endsWith(".localhost") ? "https" : "http");
	return `${proto}://${host}`;
}

// other sites of this instance that may make and use its passkeys, e.g.
// https://m.xit.example.org; browsers only allow subdomains of PUBLIC_HOSTNAME
export const PASSKEY_ORIGINS = [
	PUBLIC_ORIGIN,
	...(process.env.PASSKEY_ORIGINS ?? "")
		.split(",")
		.map((s) => s.trim().replace(/\/$/, ""))
		.filter((s) => /^https:\/\/[^/]+$/.test(s) && new URL(s).hostname.endsWith("." + PUBLIC_HOSTNAME)),
];

export const MAX_POST_MEDIA = 20;
