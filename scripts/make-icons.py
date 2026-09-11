#!/usr/bin/env python3
"""Render PNG home-screen icons from the same mark as icon.svg."""
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "icons"
OUT.mkdir(exist_ok=True)


def draw_mark(size: int, radius_scale: float = 28 / 128) -> Image.Image:
    img = Image.new("RGBA", (size, size), (18, 21, 28, 255))
    draw = ImageDraw.Draw(img)
    r = max(8, int(size * radius_scale))
    # rounded square is already the canvas; inner glow + check
    pad = int(size * 22 / 128)
    inner = [pad, pad, size - pad - 1, size - pad - 1]
    glow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    gdraw = ImageDraw.Draw(glow)
    gdraw.rounded_rectangle(inner, radius=int(size * 18 / 128), fill=(125, 211, 252, 46))
    img.alpha_composite(glow)

    w = max(3, int(size * 10 / 128))
    p1 = (int(size * 38 / 128), int(size * 66 / 128))
    p2 = (int(size * 54 / 128), int(size * 82 / 128))
    p3 = (int(size * 90 / 128), int(size * 42 / 128))
    draw.line([p1, p2, p3], fill=(125, 211, 252, 255), width=w, joint="curve")
    # round line caps
    rad = w // 2
    for p in (p1, p2, p3):
        draw.ellipse((p[0] - rad, p[1] - rad, p[0] + rad, p[1] + rad), fill=(129, 140, 248, 255))
    draw.line([p1, p2, p3], fill=(129, 140, 248, 230), width=max(2, w - 2), joint="curve")
    return img


def save(name: str, size: int) -> None:
    draw_mark(size).save(OUT / name, "PNG")


def main() -> None:
    save("icon-180.png", 180)
    save("icon-192.png", 192)
    save("icon-512.png", 512)
    # iOS home screen prefers apple-touch-icon.png at site root
    draw_mark(180).save(ROOT / "apple-touch-icon.png", "PNG")
    print("wrote icons")


if __name__ == "__main__":
    main()
