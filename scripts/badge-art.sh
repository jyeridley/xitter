#!/usr/bin/env bash
# Usage: scripts/badge-art.sh BLUE.png GOLD.png GREY.png
# Trims each picture to its content, fits it in a 96x96 transparent square and
# writes public/verified-{blue,gold,grey}.webp (src/verified-art.ts serves them).
set -euo pipefail
cd "$(dirname "$0")/.."
python3 - "$@" <<'PY'
import sys
from PIL import Image
for src, t in zip(sys.argv[1:4], ["blue", "gold", "grey"]):
    im = Image.open(src).convert("RGBA")
    box = im.getchannel("A").getbbox()
    if box: im = im.crop(box)
    im.thumbnail((96, 96), Image.LANCZOS)
    out = Image.new("RGBA", (96, 96), (0, 0, 0, 0))
    out.paste(im, ((96 - im.width) // 2, (96 - im.height) // 2), im)
    out.save(f"public/verified-{t}.webp", "WEBP", quality=90, method=6)
    print(t, src, "->", f"public/verified-{t}.webp")
PY
