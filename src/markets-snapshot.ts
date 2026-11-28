// One-time: copy each BSE account's currently visible profile into BSE-owned
// fields, including a private copy of any picture that still lived on a social
// media row, then leave the social profile untouched.
import { copyFileSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { sql } from "./db";
import { newId } from "./ids";
import { MEDIA_DIR } from "./media";
import { processImage } from "./markets-images";

const STEP = "bse_profile_snapshot";
const mediaId = (url: string | null | undefined) => {
	if (!url) return null;
	return /^\/media\/(?:banner\/)?(\d{1,19})$/.exec(url)?.[1] ?? null;
};

async function copyMedia(userId: string, url: string, kind: "pfp" | "banner"): Promise<string | null> {
	const id = mediaId(url);
	if (id) {
		const src = join(MEDIA_DIR, id);
		if (!existsSync(src)) return null;
		const [row] = await sql`select mime, size, width, height from media where id = ${id}::bigint`;
		const destId = newId();
		mkdirSync(MEDIA_DIR, { recursive: true });
		copyFileSync(src, join(MEDIA_DIR, destId));
		try {
			await sql`insert into media (id, user_id, kind, mime, size, width, height, compressed)
				values (${destId}::bigint, ${userId}::bigint, 'photo', ${row?.mime ?? "image/jpeg"}, ${row?.size ?? 0}, ${row?.width ?? 0}, ${row?.height ?? 0}, true)`;
		} catch (e) {
			rmSync(join(MEDIA_DIR, destId), { force: true });
			throw e;
		}
		return kind === "banner" ? `/media/banner/${destId}` : `/media/${destId}`;
	}
	if (/^https:\/\/cdn\.discordapp\.com\//i.test(url) || /^https:\/\/media\.discordapp\.net\//i.test(url)) {
		try {
			const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
			if (!res.ok) return null;
			const buf = Buffer.from(await res.arrayBuffer());
			if (!buf.length || buf.length > 2_000_000) return null;
			const photo = await processImage(buf, kind);
			const destId = newId();
			mkdirSync(MEDIA_DIR, { recursive: true });
			writeFileSync(join(MEDIA_DIR, destId), photo.bytes);
			try {
				await sql`insert into media (id, user_id, kind, mime, size, width, height, compressed)
					values (${destId}::bigint, ${userId}::bigint, 'photo', ${photo.type}, ${photo.bytes.length}, ${photo.width}, ${photo.height}, true)`;
			} catch (e) {
				rmSync(join(MEDIA_DIR, destId), { force: true });
				throw e;
			}
			return `/media/${destId}`;
		} catch {
			return null;
		}
	}
	return null;
}

export type SnapshotReport = {
	accounts: number;
	names: number;
	avatars: number;
	avatarsFailed: string[];
	banners: number;
	checks: number;
	skipped: boolean;
};

export async function snapshotBseProfiles(): Promise<SnapshotReport> {
	const [done] = await sql`select 1 from schema_steps where name = ${STEP}`;
	if (done) return { accounts: 0, names: 0, avatars: 0, avatarsFailed: [], banners: 0, checks: 0, skipped: true };
	const rows = await sql`select u.id::text, u.screen_name, u.name, u.avatar_url, u.banner_url, u.discord_avatar,
		u.bse_only, u.bse_name, u.bse_avatar_url, u.bse_banner_url, u.bse_verified, u.bse_verified_type,
		u.verified_type, l.avatar_url as l_avatar, l.banner_url as l_banner, l.verified_type as l_badge
		from users u
		left join users l on l.id = u.bse_link_id and l.status <> 'suspended' and l.deactivated_at is null
		where u.deactivated_at is null
			and (u.bse_only
				or exists (select 1 from market_txns t where t.user_id = u.id)
				or exists (select 1 from market_accounts a where a.user_id = u.id)
				or exists (select 1 from market_companies c where c.owner_id = u.id))`;
	const report: SnapshotReport = { accounts: rows.length, names: 0, avatars: 0, avatarsFailed: [], banners: 0, checks: 0, skipped: false };
	for (const u of rows) {
		if (!u.bse_name) {
			await sql`update users set bse_name = ${u.name || u.screen_name} where id = ${u.id}::bigint and bse_name is null`;
			report.names++;
		}
		const visibleAvatar = u.bse_avatar_url || u.discord_avatar || (u.bse_only ? u.l_avatar : u.avatar_url) || null;
		const needsCopy = visibleAvatar && (!u.bse_avatar_url || mediaId(u.bse_avatar_url) === mediaId(u.avatar_url) || mediaId(u.bse_avatar_url) === mediaId(u.l_avatar));
		if (needsCopy) {
			const copied = await copyMedia(u.id, visibleAvatar, "pfp");
			if (copied) {
				await sql`update users set bse_avatar_url = ${copied} where id = ${u.id}::bigint`;
				report.avatars++;
			} else if (!u.bse_avatar_url) report.avatarsFailed.push(u.screen_name);
		}
		// banners are only shown on BSE when already in bse_banner_url; don't invent one
		if (u.bse_banner_url && (mediaId(u.bse_banner_url) === mediaId(u.banner_url) || mediaId(u.bse_banner_url) === mediaId(u.l_banner))) {
			const copied = await copyMedia(u.id, u.bse_banner_url, "banner");
			if (copied) {
				await sql`update users set bse_banner_url = ${copied} where id = ${u.id}::bigint`;
				report.banners++;
			}
		}
		const inherit = u.bse_only ? u.l_badge : u.verified_type;
		if (u.bse_verified == null && u.bse_verified_type == null) {
			if (inherit) {
				await sql`update users set bse_verified = true, bse_verified_type = ${inherit} where id = ${u.id}::bigint and bse_verified is null and bse_verified_type is null`;
				report.checks++;
			} else {
				await sql`update users set bse_verified = false, bse_verified_type = null where id = ${u.id}::bigint and bse_verified is null and bse_verified_type is null`;
			}
		}
	}
	await sql`insert into schema_steps (name) values (${STEP}) on conflict do nothing`;
	return report;
}

// used by tests: copy one local media path without the one-time guard
export const copyAccountMediaForTest = copyMedia;
export const mediaIdOf = mediaId;
