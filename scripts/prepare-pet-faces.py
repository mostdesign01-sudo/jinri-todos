#!/usr/bin/env python3
"""Crop generated 3D / pixel faces and drop the dark studio background."""
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = Path("/opt/cursor/artifacts/assets")
OUT = ROOT / "icons"

MOODS = ("idle", "dusk", "night", "overdue", "done", "poke")


def flood_clear(img: Image.Image, limit: int = 48) -> Image.Image:
    rgba = img.convert("RGBA")
    px = rgba.load()
    w, h = rgba.size
    seen = [[False] * w for _ in range(h)]
    stack = [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)]
    for x in range(0, w, 8):
        stack.extend([(x, 0), (x, h - 1)])
    for y in range(0, h, 8):
        stack.extend([(0, y), (w - 1, y)])
    while stack:
        x, y = stack.pop()
        if x < 0 or y < 0 or x >= w or y >= h or seen[y][x]:
            continue
        r, g, b, a = px[x, y]
        mx = max(r, g, b)
        sat = mx - min(r, g, b)
        if a == 0 or mx > limit or sat > 20:
            continue
        seen[y][x] = True
        px[x, y] = (r, g, b, 0)
        stack.extend(((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)))
    labels = [[-1] * w for _ in range(h)]
    sizes = []
    next_id = 0
    for y in range(h):
        for x in range(w):
            if px[x, y][3] == 0 or labels[y][x] != -1:
                continue
            count = 0
            q = [(x, y)]
            labels[y][x] = next_id
            while q:
                cx, cy = q.pop()
                count += 1
                for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                    if 0 <= nx < w and 0 <= ny < h and labels[ny][nx] == -1 and px[nx, ny][3]:
                        labels[ny][nx] = next_id
                        q.append((nx, ny))
            sizes.append(count)
            next_id += 1
    if sizes:
        keep = max(range(len(sizes)), key=lambda i: sizes[i])
        for y in range(h):
            for x in range(w):
                if labels[y][x] != -1 and labels[y][x] != keep:
                    r, g, b, _ = px[x, y]
                    px[x, y] = (r, g, b, 0)
    return rgba


def crop_pad(img: Image.Image, pad_ratio: float = 0.08) -> Image.Image:
    bbox = img.getbbox()
    if not bbox:
        return img
    x0, y0, x1, y1 = bbox
    pad = int(max(x1 - x0, y1 - y0) * pad_ratio)
    x0 = max(0, x0 - pad)
    y0 = max(0, y0 - pad)
    x1 = min(img.width, x1 + pad)
    y1 = min(img.height, y1 + pad)
    side = max(x1 - x0, y1 - y0)
    cx = (x0 + x1) // 2
    cy = (y0 + y1) // 2
    half = side // 2
    box = (
        max(0, cx - half),
        max(0, cy - half),
        min(img.width, cx + half),
        min(img.height, cy + half),
    )
    return img.crop(box)


def fit(img: Image.Image, size: int, nearest: bool = False) -> Image.Image:
    resample = Image.NEAREST if nearest else Image.LANCZOS
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    copy = img.copy()
    copy.thumbnail((size, size), resample)
    canvas.paste(copy, ((size - copy.width) // 2, (size - copy.height) // 2), copy)
    return canvas


def convert(src_name: str, dest_name: str, size: int, nearest: bool, limit: int) -> None:
    src = SRC / src_name
    img = flood_clear(Image.open(src), limit=limit)
    img = crop_pad(img)
    img = fit(img, size, nearest=nearest)
    dest = OUT / dest_name
    img.save(dest, "PNG")
    print("wrote", dest, img.size)


def main() -> None:
    OUT.mkdir(exist_ok=True)
    for mood in MOODS:
        convert("xiaosha3d-" + mood + ".png", "face3d-" + mood + ".png", 256, False, 50)
        convert("pixel-" + mood + ".png", "facepx-" + mood + ".png", 160, True, 28)
    print("done")


if __name__ == "__main__":
    main()
