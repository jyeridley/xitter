import { expect, test } from "bun:test";
import { mediaIdOf } from "../src/markets-snapshot";

test("media ids are read from BSE and banner paths, not from remote URLs", () => {
	expect(mediaIdOf("/media/123")).toBe("123");
	expect(mediaIdOf("/media/2124287638872522752")).toBe("2124287638872522752");
	expect(mediaIdOf("/media/banner/456")).toBe("456");
	expect(mediaIdOf("https://cdn.discordapp.com/avatars/1/x.png")).toBe(null);
	expect(mediaIdOf("/profile_images/123_x96.jpg")).toBe(null);
	expect(mediaIdOf(null)).toBe(null);
	expect(mediaIdOf("")).toBe(null);
});
