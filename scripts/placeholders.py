"""Generate the neutral placeholder imagery used by the hero collage, the
image-reveal links and the rules image trail.

No external assets are used: every image is produced procedurally (halftone,
hatching, grain, ruler and grid textures in black and white, plus duotone
variants on the ESDI accent colours). Replace any file in public/placeholders/
with a real photograph of the same name to swap the imagery.

Usage:  py scripts/placeholders.py
"""

from __future__ import annotations

import math
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

OUT = Path(__file__).resolve().parent.parent / "public" / "placeholders"
OUT.mkdir(parents=True, exist_ok=True)

INK = (0, 0, 0)
PAPER = (255, 255, 255)
GREEN = (105, 170, 150)
RED = (230, 85, 65)
BLUE = (120, 150, 200)
YELLOW = (250, 220, 50)
SURFACE = (226, 228, 231)

SCALE = 2  # draw at 2x then downsample for clean edges


def finish(img: Image.Image, name: str, grain: float = 0.0, seed: int = 0) -> None:
    w, h = img.size
    img = img.resize((w // SCALE, h // SCALE), Image.LANCZOS)
    if grain > 0:
        rng = random.Random(seed)
        noise = Image.new("L", img.size)
        px = noise.load()
        for y in range(img.size[1]):
            for x in range(img.size[0]):
                px[x, y] = max(0, min(255, int(128 + rng.gauss(0, 255 * grain))))
        img = Image.blend(img.convert("RGB"), Image.merge("RGB", (noise, noise, noise)), 0.12)
    img.convert("RGB").save(OUT / f"{name}.webp", "WEBP", quality=82, method=6)
    print("wrote", name, img.size)


def halftone(w: int, h: int, field, fg=INK, bg=PAPER, step: int = 18) -> Image.Image:
    """field(x, y) -> darkness in [0, 1]; draws dots on a rotated grid."""
    W, H = w * SCALE, h * SCALE
    s = step * SCALE
    img = Image.new("RGB", (W, H), bg)
    d = ImageDraw.Draw(img)
    angle = math.radians(45)
    ca, sa = math.cos(angle), math.sin(angle)
    span = int(math.hypot(W, H)) + s
    for gy in range(-span, span, s):
        for gx in range(-span, span, s):
            x = gx * ca - gy * sa + W / 2
            y = gx * sa + gy * ca + H / 2
            if -s <= x <= W + s and -s <= y <= H + s:
                v = max(0.0, min(1.0, field(x / W, y / H)))
                r = (s * 0.72) * math.sqrt(v)
                if r > 0.6:
                    d.ellipse([x - r, y - r, x + r, y + r], fill=fg)
    return img


def sphere(cx: float, cy: float, rad: float):
    def f(u: float, v: float) -> float:
        dx, dy = (u - cx) / rad, (v - cy) / rad
        dist = math.hypot(dx, dy)
        if dist > 1:
            return 0.08
        light = 0.5 + 0.5 * (dx * 0.6 + dy * 0.7)
        return 0.15 + 0.85 * light * (1 - 0.3 * (1 - dist))
    return f


def hatching(w: int, h: int, seed: int, fg=INK, bg=PAPER) -> Image.Image:
    rng = random.Random(seed)
    W, H = w * SCALE, h * SCALE
    img = Image.new("RGB", (W, H), bg)
    d = ImageDraw.Draw(img)
    spacing = 9 * SCALE
    for i in range(-H, W + H, spacing):
        wave = rng.uniform(0.6, 1.0)
        width = max(1, int((2 + 6 * (0.5 + 0.5 * math.sin(i / (W * 0.18)))) * wave * SCALE / 2))
        d.line([(i, 0), (i - H, H)], fill=fg, width=width)
    # a cut-out rectangle to suggest an object on the bench
    x0, y0 = int(W * 0.18), int(H * 0.38)
    d.rectangle([x0, y0, x0 + int(W * 0.56), y0 + int(H * 0.3)], fill=bg)
    d.rectangle([x0, y0, x0 + int(W * 0.56), y0 + int(H * 0.3)], outline=fg, width=3 * SCALE)
    return img


def ruler(w: int, h: int, bg=YELLOW, fg=INK) -> Image.Image:
    W, H = w * SCALE, h * SCALE
    img = Image.new("RGB", (W, H), bg)
    d = ImageDraw.Draw(img)
    band_h = int(H * 0.34)
    y0 = int(H * 0.33)
    d.rectangle([0, y0, W, y0 + band_h], fill=PAPER)
    unit = W / 24
    for i in range(0, 25):
        x = int(i * unit)
        length = band_h * (0.55 if i % 5 == 0 else 0.28)
        d.line([(x, y0), (x, y0 + length)], fill=fg, width=3 * SCALE if i % 5 == 0 else 2 * SCALE)
    d.rectangle([0, y0, W, y0 + band_h], outline=fg, width=3 * SCALE)
    return img


def grid_paper(w: int, h: int, fg=INK, bg=PAPER) -> Image.Image:
    W, H = w * SCALE, h * SCALE
    img = Image.new("RGB", (W, H), bg)
    d = ImageDraw.Draw(img)
    s = 14 * SCALE
    for x in range(0, W, s):
        d.line([(x, 0), (x, H)], fill=(170, 170, 170), width=1 * SCALE)
    for y in range(0, H, s):
        d.line([(0, y), (W, y)], fill=(170, 170, 170), width=1 * SCALE)
    # a bold drafted part: L-bracket with a drilled hole
    t = int(W * 0.16)
    x0, y0 = int(W * 0.22), int(H * 0.2)
    x1, y1 = int(W * 0.8), int(H * 0.8)
    d.rectangle([x0, y0, x0 + t, y1], fill=fg)
    d.rectangle([x0, y1 - t, x1, y1], fill=fg)
    r = int(t * 0.28)
    cx, cy = x0 + t // 2, y0 + int(t * 0.9)
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=bg)
    return img


def grain_gradient(w: int, h: int, top=(30, 30, 30), bottom=(235, 235, 235)) -> Image.Image:
    W, H = w * SCALE, h * SCALE
    img = Image.new("RGB", (W, H))
    d = ImageDraw.Draw(img)
    for y in range(H):
        t = y / max(1, H - 1)
        t = t * t * (3 - 2 * t)
        c = tuple(int(top[i] + (bottom[i] - top[i]) * t) for i in range(3))
        d.line([(0, y), (W, y)], fill=c)
    # a soft vertical form (a stool leg / tool handle silhouette)
    mask = Image.new("L", (W, H), 0)
    md = ImageDraw.Draw(mask)
    md.rounded_rectangle([int(W * 0.42), int(H * 0.18), int(W * 0.58), int(H * 0.96)], radius=int(W * 0.08), fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(6 * SCALE))
    shade = Image.new("RGB", (W, H), (12, 12, 12))
    img = Image.composite(shade, img, mask)
    return img


def cut_paper(w: int, h: int, seed: int, colors) -> Image.Image:
    rng = random.Random(seed)
    W, H = w * SCALE, h * SCALE
    img = Image.new("RGB", (W, H), colors[0])
    d = ImageDraw.Draw(img)
    for c in colors[1:]:
        pts = []
        cx, cy = rng.uniform(0.25, 0.75) * W, rng.uniform(0.25, 0.75) * H
        n = rng.randint(4, 6)
        rad = rng.uniform(0.25, 0.42) * min(W, H)
        for k in range(n):
            a = 2 * math.pi * k / n + rng.uniform(-0.3, 0.3)
            rr = rad * rng.uniform(0.7, 1.15)
            pts.append((cx + rr * math.cos(a), cy + rr * math.sin(a)))
        d.polygon(pts, fill=c)
    return img


# Hero collage shots (portrait / landscape mixes, like the ESDI collage)
finish(halftone(360, 560, sphere(0.48, 0.42, 0.42)), "hero-01", grain=0.04, seed=1)
finish(hatching(520, 380, seed=7), "hero-02")
finish(ruler(560, 340), "hero-03")
finish(grid_paper(380, 520), "hero-04")
finish(grain_gradient(340, 560), "hero-05", grain=0.06, seed=5)
finish(halftone(520, 360, lambda u, v: 0.15 + 0.85 * (1 - v) * (0.5 + 0.5 * math.sin(u * 7.0)), fg=INK, bg=YELLOW, step=16), "hero-06")
finish(cut_paper(420, 520, seed=11, colors=[SURFACE, INK, BLUE]), "hero-07")
finish(halftone(400, 400, sphere(0.5, 0.5, 0.46), fg=INK, bg=GREEN, step=20), "hero-08")

# Inline image-reveal links (small, 150px wide in the layout)
finish(grid_paper(300, 220), "reveal-01")
finish(halftone(300, 220, sphere(0.5, 0.55, 0.5), step=14), "reveal-02", grain=0.03, seed=3)

# Rules image trail (square-ish, max 20rem in the layout)
finish(cut_paper(320, 320, seed=21, colors=[YELLOW, INK]), "trail-01")
finish(cut_paper(320, 320, seed=22, colors=[BLUE, PAPER, INK]), "trail-02")
finish(halftone(320, 320, sphere(0.5, 0.5, 0.45), fg=INK, bg=RED, step=16), "trail-03")
finish(hatching(320, 320, seed=23), "trail-04")
finish(ruler(320, 320, bg=GREEN), "trail-05")
finish(grain_gradient(320, 320), "trail-06", grain=0.05, seed=6)
finish(cut_paper(320, 320, seed=24, colors=[SURFACE, RED, INK]), "trail-07")
