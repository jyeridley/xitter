// End-to-end test of BSE admin verify/unverify against a running local server:
//   bun scripts/test-markets-verify.ts [base=http://127.0.0.1:3001] [host=trade.localhost:3001]
// Makes throwaway staff and user accounts and a temporary listing, then deletes them.
import { SQL } from "bun";

const base = process.argv[2] ?? "http://127.0.0.1:3001";
const host = process.argv[3] ?? "trade.localhost:3001";
const origin = `http://${host}`;
let fails = 0, passes = 0;
const ok = (cond: unknown, what: string, extra?: unknown) => {
	if (cond) passes++;
	else {
		fails++;
		console.log("FAIL", what, extra ?? "");
	}
};

class Jar {
	c = new Map<string, string>();
	take(res: Response) {
		for (const line of res.headers.getSetCookie()) {
			const [kv] = line.split(";"), i = kv.indexOf("=");
			const k = kv.slice(0, i), v = kv.slice(i + 1);
			if (!v || /max-age=0/i.test(line)) this.c.delete(k);
			else this.c.set(k, v);
		}
	}
	get header() { return [...this.c].map(([k, v]) => `${k}=${v}`).join("; "); }
}
async function req(path: string, init: RequestInit & { jar?: Jar; form?: Record<string, string>; json?: unknown; xorigin?: string; csrf?: string } = {}) {
	const headers = new Headers(init.headers);
	headers.set("host", host);
	headers.set("x-forwarded-host", host);
	if (init.jar?.header) headers.set("cookie", init.jar.header);
	if (init.csrf) headers.set("x-csrf-token", init.csrf);
	if (init.form) {
		headers.set("content-type", "application/x-www-form-urlencoded");
		init.body = new URLSearchParams(init.form).toString();
	}
	if (init.json !== undefined) {
		headers.set("content-type", "application/json");
		init.body = JSON.stringify(init.json);
	}
	if (init.method === "POST" && !headers.has("origin")) headers.set("origin", init.xorigin ?? origin);
	const res = await fetch(base + path, { ...init, headers, redirect: "manual" });
	init.jar?.take(res);
	return res;
}
const hidden = (html: string, name: string) => new RegExp(`name="${name}" value="([^"]*)"`).exec(html)?.[1]?.replaceAll("&amp;", "&").replaceAll("&quot;", '"');
const tradex = (html: string) => {
	const m = /window\.TRADEX=(\{.*?\});<\/script>/s.exec(html);
	if (!m) return null;
	return JSON.parse(m[1].replace(/\\u003c/g, "<"));
};

const stamp = Date.now().toString(36).slice(-6);
const adminHandle = `vfa${stamp}`, userHandle = `vfu${stamp}`, pass = "Passw0rd!vf" + stamp;
const ticker = ("V" + stamp).slice(0, 6).toUpperCase();
const db = new SQL(process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? undefined as any);
const ids: string[] = [];

async function signUp(handleName: string) {
	const jar = new Jar();
	const page = await req("/signup", { jar });
	const csrf = hidden(await page.text(), "csrf")!;
	const res = await req("/signup", { method: "POST", jar, form: { csrf, name: "Verify Test", username: handleName, password: pass, password2: pass } });
	ok(res.status === 303, `sign up ${handleName}`, res.status);
	return jar;
}

try {
	const adminJar = await signUp(adminHandle);
	const userJar = await signUp(userHandle);
	const people = await db`select id::text, screen_name, verified_type, bse_verified from users where screen_name in (${adminHandle}, ${userHandle})`;
	for (const u of people) ids.push(u.id);
	ok(people.length === 2, "both accounts exist");
	ok(people.every((u: any) => u.verified_type == null && u.bse_verified == null), "signup did not change verified fields");
	await db`update users set role = 'admin' where screen_name = ${adminHandle}`;

	const home = await (await req("/", { jar: adminJar })).text();
	const boot = tradex(home);
	ok(boot?.csrf && boot?.state?.admin, "staff session has csrf and admin flag");
	const csrf = boot.csrf as string;

	const forbidden = await req("/i/markets/api/admin/verifyCompany", { method: "POST", jar: userJar, csrf: tradex(await (await req("/", { jar: userJar })).text())?.csrf, json: { id: "1", on: true } });
	ok(forbidden.status === 403, "non-staff verify is refused", forbidden.status);

	const noCsrf = await req("/i/markets/api/admin/verifyCompany", { method: "POST", jar: adminJar, csrf: "nope", json: { id: "1", on: true } });
	ok(noCsrf.status === 403, "verify without csrf is refused", noCsrf.status);

	const listed = await req("/i/markets/api/admin/list", { method: "POST", jar: adminJar, csrf, json: { name: "Verify Co", ticker, price: 100, shares: 1000 } });
	ok(listed.status === 200, "staff can list a throwaway company", listed.status);
	const listedBody = await listed.json();
	const co = (listedBody.state?.companies ?? []).find((c: any) => c.ticker === ticker);
	ok(co && co.verified === false, "a new listing starts unverified", co);
	const [coRow] = await db`select id::text, verified from market_companies where ticker = ${ticker}`;
	ok(coRow && coRow.verified === false, "db: new company unverified");

	const vCo = await req("/i/markets/api/admin/verifyCompany", { method: "POST", jar: adminJar, csrf, json: { id: co.id, on: true } });
	const vCoBody = await vCo.json();
	ok(vCo.status === 200, "verify company", vCo.status);
	const coOn = (vCoBody.state?.companies ?? []).find((c: any) => c.ticker === ticker);
	ok(coOn?.verified === true, "company is verified in state");
	ok((vCoBody.admin?.logs ?? []).some((l: any) => String(l.a).startsWith("VERIFIED " + ticker)), "verified company is logged", vCoBody.admin?.logs?.[0]);

	const uCo = await req("/i/markets/api/admin/verifyCompany", { method: "POST", jar: adminJar, csrf, json: { id: co.id, on: false } });
	const uCoBody = await uCo.json();
	ok((uCoBody.state?.companies ?? []).find((c: any) => c.ticker === ticker)?.verified === false, "company unverified in state");
	ok((uCoBody.admin?.logs ?? []).some((l: any) => String(l.a).startsWith("UNVERIFIED " + ticker)), "unverified company is logged");

	const [user] = await db`select id::text, verified_type, bse_verified from users where screen_name = ${userHandle}`;
	const vUser = await req("/i/markets/api/admin/verifyUser", { method: "POST", jar: adminJar, csrf, json: { id: user.id, on: true } });
	const vUserBody = await vUser.json();
	ok(vUser.status === 200, "verify user", vUser.status);
	const acc = (vUserBody.admin?.accounts ?? []).find((a: any) => a.screen_name === userHandle);
	ok(acc?.verified === true && acc?.badge === "blue", "user shows as verified on BSE", acc);
	ok((vUserBody.admin?.logs ?? []).some((l: any) => String(l.a).includes("VERIFIED @" + userHandle)), "verified user is logged");
	const [afterOn] = await db`select verified_type, bse_verified from users where screen_name = ${userHandle}`;
	ok(afterOn.bse_verified === true && afterOn.verified_type == null, "bse_verified set; social verified_type untouched");

	// inherit: a social-style badge still shows when bse_verified is left null
	await db`update users set bse_only = false, bse_verified = null, verified_type = 'business' where screen_name = ${userHandle}`;
	await db`insert into market_accounts (user_id) values (${user.id}::bigint) on conflict (user_id) do nothing`;
	const inherit = await req("/i/markets/api/admin", { method: "GET", jar: adminJar });
	const inheritBody = await inherit.json();
	const accI = (inheritBody.accounts ?? []).find((a: any) => a.screen_name === userHandle);
	ok(accI?.verified === true && accI?.badge === "business", "null bse_verified inherits the existing badge", accI);

	const hide = await req("/i/markets/api/admin/verifyUser", { method: "POST", jar: adminJar, csrf, json: { id: user.id, on: false } });
	const hideBody = await hide.json();
	const accH = (hideBody.admin?.accounts ?? []).find((a: any) => a.screen_name === userHandle);
	ok(accH?.verified === false && !accH?.badge, "unverify hides the tick on BSE", accH);
	const [afterOff] = await db`select verified_type, bse_verified from users where screen_name = ${userHandle}`;
	ok(afterOff.bse_verified === false && afterOff.verified_type === "business", "unverify does not clear the social badge");

	const adminPage = await (await req("/admin", { jar: adminJar })).text();
	ok(adminPage.includes("data-a=verifyCo") && adminPage.includes("data-a=verifyUser"), "admin page has verify controls");
	ok(adminPage.includes("Filter") && adminPage.includes("Verified (") && adminPage.includes("Unverified ("), "admin lists have verified filters");
} finally {
	try {
		if (ticker) await db`delete from market_companies where ticker = ${ticker}`;
		for (const id of ids) {
			await db`delete from sessions where user_id = ${id}::bigint`;
			await db`delete from money_wallets where user_id = ${id}::bigint`;
			await db`delete from market_accounts where user_id = ${id}::bigint`;
			await db`delete from users where id = ${id}::bigint`;
		}
	} catch (e) {
		console.log("cleanup error", e);
	}
	await db.end?.();
	console.log(`${passes} passed, ${fails} failed`);
	if (fails) process.exit(1);
}
