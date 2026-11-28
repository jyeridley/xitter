import { expect, test } from "bun:test";
import { avatarUrl, companyImage, ImageError, processImage } from "../src/markets-images";

// a 2×2 opaque PNG
const PNG = Buffer.from(
	"iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAACXBIWXMAAAABAAAAAQBPJcTWAAAAEklEQVR4nGP4y8CAFWEXHbQSAPZwP0G2GkFNAAAAAElFTkSuQmCC",
	"base64",
);

test("avatar fallbacks: BSE pfp, then Discord, then linked or social, then none", () => {
	expect(avatarUrl({ bse_avatar_url: "/media/1", discord_avatar: "https://cdn.discordapp.com/a.png", link_avatar: "/media/2", avatar_url: "/media/3", bse_only: true })).toBe("/media/1");
	expect(avatarUrl({ discord_avatar: "https://cdn.discordapp.com/a.png", link_avatar: "/media/2", bse_only: true })).toBe("https://cdn.discordapp.com/a.png");
	expect(avatarUrl({ link_avatar: "/media/2", avatar_url: "/media/3", bse_only: true })).toBe("/media/2");
	expect(avatarUrl({ link_avatar: "/media/2", avatar_url: "/media/3", bse_only: false })).toBe("/media/3");
	expect(avatarUrl({ bse_only: true })).toBeNull();
	expect(avatarUrl({ avatar_url: "/media/3", bse_only: false })).toBe("/media/3");
});

test("a company image is only its own logo, never a person's picture", () => {
	expect(companyImage("/i/markets/logo/1?v=2")).toBe("/i/markets/logo/1?v=2");
	expect(companyImage("")).toBe("");
	expect(companyImage(null)).toBe("");
});

test("processImage accepts a PNG and returns a stripped, resized picture", async () => {
	const pfp = await processImage(PNG, "pfp");
	expect(pfp.type === "image/jpeg" || pfp.type === "image/png").toBe(true);
	expect(pfp.bytes.length).toBeGreaterThan(32);
	expect(pfp.width).toBe(400);
	expect(pfp.height).toBe(400);
	const logo = await processImage(PNG, "logo");
	expect(logo.width).toBeLessThanOrEqual(256);
	expect(logo.height).toBeLessThanOrEqual(256);
	const banner = await processImage(PNG, "banner");
	expect(banner.width).toBe(1500);
	expect(banner.height).toBe(500);
});

test("processImage refuses a non-image, an empty one, and one that is too big", async () => {
	await expect(processImage(Buffer.from("hello"), "pfp")).rejects.toBeInstanceOf(ImageError);
	await expect(processImage(Buffer.alloc(0), "logo")).rejects.toThrow("Choose an image");
	await expect(processImage(Buffer.alloc(2_000_001), "pfp")).rejects.toThrow("2 MB");
	await expect(processImage(Buffer.alloc(1_000_001), "logo")).rejects.toThrow("1 MB");
});
