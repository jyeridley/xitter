// Pictures used on the BSE: a person's profile picture or banner, a company's
// logo, an app's logo. Bytes are resized, re-encoded and stripped of EXIF
// (ffmpeg -map_metadata -1) so a phone's GPS never stays in the file.
// A company logo is never taken from a person's picture, and the other way
// around: the two are stored and shown separately.

import { mkdirSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { sql } from "./db";
import { newId } from "./ids";
import { MEDIA_DIR, sniffImage } from "./media";
import { FFMPEG, spawnLimited } from "./video";

export const MAX_PFP_BYTES = 2_000_000;
export const MAX_LOGO_BYTES = 1_000_000;
export const PFP_SIDE = 400;
export const BANNER = { w: 1500, h: 500 };
export const LOGO_SIDE = 256;
const MAX_EDGE = 8000;
const MAX_PIXELS = 40_000_000;
const TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);

export class ImageError extends Error {}

export type PhotoKind = "pfp" | "banner" | "logo";
export type Processed = { bytes: Buffer; type: "image/jpeg" | "image/png"; width: number; height: number };

const caps: Record<PhotoKind, number> = { pfp: MAX_PFP_BYTES, banner: MAX_PFP_BYTES, logo: MAX_LOGO_BYTES };

// which picture to show for an account on the BSE, in the order the site promises:
// their BSE pfp, then Discord, then a linked Bloxburg Social (or their own social
// picture if they signed in with that account), then the caller uses the default
export function avatarUrl(u: {
	bse_avatar_url?: string | null;
	discord_avatar?: string | null;
	bse_only?: boolean | null;
	avatar_url?: string | null;
	link_avatar?: string | null;
}): string | null {
	// after the one-time snapshot, BSE display uses only the BSE-owned picture
	return u.bse_avatar_url || null;
}

// a company shows only its own logo; the founder's picture is never a stand-in
export function companyImage(logo: string | null | undefined): string {
	return logo || "";
}

function filter(kind: PhotoKind): string {
	if (kind === "pfp") {
		// square, centered: scale the short side to the box, then crop the middle
		return `scale='if(gte(iw,ih),-1,${PFP_SIDE})':'if(gte(iw,ih),${PFP_SIDE},-1)':force_original_aspect_ratio=increase,crop=${PFP_SIDE}:${PFP_SIDE}`;
	}
	if (kind === "banner") {
		const { w, h } = BANNER;
		return `scale='if(gte(iw/${w},ih/${h}),-1,${w})':'if(gte(iw/${w},ih/${h}),${h},-1)':force_original_aspect_ratio=increase,crop=${w}:${h}`;
	}
	return `scale='min(iw,${LOGO_SIDE})':'min(ih,${LOGO_SIDE})':force_original_aspect_ratio=decrease`;
}

export async function processImage(data: Buffer, kind: PhotoKind): Promise<Processed> {
	if (!data.length) throw new ImageError("Choose an image.");
	if (data.length > caps[kind]) throw new ImageError(kind === "logo" ? "The logo must be under 1 MB." : "The image must be under 2 MB.");
	const image = sniffImage(data);
	if (!image || !TYPES.has(image.mime)) throw new ImageError("Use a PNG, JPEG, GIF or WebP image.");
	if (image.width < 1 || image.height < 1 || image.width > MAX_EDGE || image.height > MAX_EDGE || image.width * image.height > MAX_PIXELS)
		throw new ImageError("That image is too large.");
	const alpha = image.mime === "image/png" || image.mime === "image/webp";
	const codec = alpha
		? ["-c:v", "png", "-pred", "mixed", "-f", "image2pipe"]
		: ["-c:v", "mjpeg", "-q:v", "3", "-pix_fmt", "yuvj420p", "-f", "image2pipe"];
	const fmt = image.mime === "image/jpeg" ? "jpeg_pipe" : image.mime === "image/png" ? "png_pipe" : image.mime === "image/webp" ? "webp_pipe" : "gif";
	const p = spawnLimited(
		[FFMPEG, "-hide_banner", "-loglevel", "error", "-noautorotate", "-f", fmt, "-i", "pipe:0", "-frames:v", "1", "-vf", filter(kind), "-map_metadata", "-1", ...codec, "pipe:1"],
		20_000,
		"ignore",
		data,
	);
	const [buf, code] = await Promise.all([new Response(p.stdout).arrayBuffer(), p.exited]);
	if (code !== 0) throw new ImageError("That image couldn't be read.");
	const bytes = Buffer.from(buf);
	const made = sniffImage(bytes);
	if (!made || made.width < 1 || made.height < 1) throw new ImageError("That image couldn't be read.");
	const type: Processed["type"] = made.mime === "image/png" ? "image/png" : "image/jpeg";
	return { bytes, type, width: made.width, height: made.height };
}

// a data: URL as the markets page sends, or raw bytes from a form file
export async function imageFrom(v: unknown, kind: PhotoKind): Promise<Processed | undefined> {
	if (v === undefined || v === null || v === "") return undefined;
	let data: Buffer;
	if (typeof Blob !== "undefined" && v instanceof Blob) {
		if (v.size > caps[kind]) throw new ImageError(kind === "logo" ? "The logo must be under 1 MB." : "The image must be under 2 MB.");
		data = Buffer.from(await v.arrayBuffer());
	} else if (typeof v === "string") {
		const m = /^data:(image\/(?:png|jpeg|gif|webp));base64,([A-Za-z0-9+/=]+)$/.exec(v);
		if (!m) throw new ImageError(kind === "logo" ? "The logo must be a PNG, JPEG, GIF or WebP image." : "Use a PNG, JPEG, GIF or WebP image.");
		data = Buffer.from(m[2], "base64");
	} else if (Buffer.isBuffer(v)) data = v;
	else throw new ImageError("Use a PNG, JPEG, GIF or WebP image.");
	return processImage(data, kind);
}


const fileOf = (id: string) => join(MEDIA_DIR, id);

// stored as a regular photo so /profile_images and /media/banner serve it to
// anyone (cacheFor treats bse_avatar_url / bse_banner_url like the social ones)
export async function storeAccountPhoto(userId: string, data: Buffer, kind: "pfp" | "banner"): Promise<{ id: string; mime: string } | { error: string }> {
	let photo: Processed;
	try {
		photo = await processImage(data, kind);
	} catch (e) {
		return { error: e instanceof ImageError ? e.message : "That image couldn't be read." };
	}
	const id = newId();
	mkdirSync(MEDIA_DIR, { recursive: true });
	writeFileSync(fileOf(id), photo.bytes);
	try {
		await sql`insert into media (id, user_id, kind, mime, size, width, height, compressed)
			values (${id}::bigint, ${userId}::bigint, 'photo', ${photo.type}, ${photo.bytes.length}, ${photo.width}, ${photo.height}, true)`;
	} catch {
		rmSync(fileOf(id), { force: true });
		return { error: "The image couldn't be saved." };
	}
	return { id, mime: photo.type };
}

export function removeStoredPhoto(url: string | null | undefined) {
	const id = url && (/^\/media\/(?:banner\/)?(\d{1,19})$/.exec(url)?.[1] ?? /^\/media\/(\d{1,19})$/.exec(url)?.[1]);
	if (!id) return;
	const path = fileOf(id);
	if (existsSync(path)) rmSync(path, { force: true });
}
