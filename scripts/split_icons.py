#!/usr/bin/env python3
"""Split the contact-sheet ``static/images/icons.png`` into one PNG per
labeled icon size, and emit the favicon / logo assets the Hugo theme
(``onweru/compose``) expects.

The source is a 1254x1254 sheet containing nine icons arranged in three
rows, each with a "<size>x<size>" label:

    Row 1:  16, 32, 48, 64, 128
    Row 2:  180, 192, 256
    Row 3:  512

Each icon is rendered inside a slightly larger rounded "card" background.
We locate each card via row/column projections of a brightness mask, then
resize the cropped card to the labeled pixel size using LANCZOS resampling.

Outputs:
  * static/images/icons/icon_<W>x<H>.png            (all 9 labeled sizes)
  * static/images/logo.png                          (256x256, used in the nav)
  * static/favicons/favicon-16x16.png               (theme-expected filename)
  * static/favicons/favicon-32x32.png               (theme-expected filename)
  * static/favicons/apple-touch-icon.png            (180x180)
  * static/favicons/favicon.ico                     (multi-res 16/32/48)
"""

from __future__ import annotations

import shutil
from pathlib import Path

from PIL import Image

REPO_ROOT = Path(__file__).resolve().parent.parent
SOURCE = REPO_ROOT / "static" / "images" / "icons.png"
ICONS_DIR = REPO_ROOT / "static" / "images" / "icons"
FAVICON_DIR = REPO_ROOT / "static" / "favicons"
LOGO_PATH = REPO_ROOT / "static" / "images" / "logo.png"

# Which split icon (by labeled size) to use as the nav logo. Our
# _custom.sass override renders the logo at CSS max-width 9rem (~162px @
# root 18px). 256 keeps the asset comfortably crisp on 2x retina displays
# (which need ~324 device px at that CSS size, so 256 is ~1.58x density).
LOGO_SIZE = 256

# Brightness threshold (0-255) used to separate card pixels from the dark
# page background when projecting onto the row/column axes.
THRESHOLD = 30

# Vertical bands containing each row of icons, determined empirically from
# the 1254x1254 source. Each band is (y_top, y_bottom) inclusive and
# excludes the white text labels underneath.
ROW_BANDS = [
    (69, 265),    # 16, 32, 48, 64, 128
    (324, 628),   # 180, 192, 256
    (689, 1152),  # 512
]

# Labeled icon sizes per row, left-to-right.
ROW_SIZES = [
    [16, 32, 48, 64, 128],
    [180, 192, 256],
    [512],
]


def _runs(flags: list[bool]) -> list[tuple[int, int]]:
    """Return inclusive (start, end) index pairs for each run of True."""
    out: list[tuple[int, int]] = []
    n = len(flags)
    i = 0
    while i < n:
        if flags[i]:
            j = i
            while j < n and flags[j]:
                j += 1
            out.append((i, j - 1))
            i = j
        else:
            i += 1
    return out


def _column_runs(mask: Image.Image, y0: int, y1: int) -> list[tuple[int, int]]:
    w, _ = mask.size
    data = mask.tobytes()
    col_bright = [False] * w
    for y in range(y0, y1 + 1):
        row = data[y * w:(y + 1) * w]
        for x, v in enumerate(row):
            if v and not col_bright[x]:
                col_bright[x] = True
    return _runs(col_bright)


def _row_runs(mask: Image.Image, x0: int, x1: int, y0: int, y1: int) -> list[tuple[int, int]]:
    w, _ = mask.size
    data = mask.tobytes()
    row_bright = [False] * (y1 - y0 + 1)
    for y in range(y0, y1 + 1):
        if any(data[y * w + x0:y * w + x1 + 1]):
            row_bright[y - y0] = True
    runs = _runs(row_bright)
    return [(a + y0, b + y0) for a, b in runs]


# Minimum width of a column run to be considered a real icon card.
# Anything narrower is treated as edge noise from threshold artifacts.
MIN_CARD_WIDTH = 30


def main() -> None:
    if not SOURCE.exists():
        raise SystemExit(f"Source image not found: {SOURCE}")

    # Wipe and recreate output dirs so stale files don't linger.
    if ICONS_DIR.exists():
        for child in ICONS_DIR.iterdir():
            if child.is_file():
                child.unlink()
    ICONS_DIR.mkdir(parents=True, exist_ok=True)

    if FAVICON_DIR.exists():
        shutil.rmtree(FAVICON_DIR)
    FAVICON_DIR.mkdir(parents=True, exist_ok=True)

    img = Image.open(SOURCE).convert("RGB")
    mask = img.convert("L").point(lambda v: 255 if v > THRESHOLD else 0)

    # Crop each labeled card once, resize to its labeled size, and keep the
    # PIL Image around so we can also use it for favicons / logo without
    # re-reading the source.
    sized: dict[int, Image.Image] = {}

    for band, sizes in zip(ROW_BANDS, ROW_SIZES):
        y0_band, y1_band = band
        col_runs = [
            (x0, x1) for (x0, x1) in _column_runs(mask, y0_band, y1_band)
            if (x1 - x0 + 1) >= MIN_CARD_WIDTH
        ]
        if len(col_runs) != len(sizes):
            raise SystemExit(
                f"Expected {len(sizes)} cards in band {band}, found "
                f"{len(col_runs)}: {col_runs}"
            )

        for (x0, x1), size in zip(col_runs, sizes):
            row_runs = _row_runs(mask, x0, x1, y0_band, y1_band)
            # The card is the tallest run within the band; ignore any tiny
            # extras (none expected here, but be defensive).
            row_runs.sort(key=lambda r: r[1] - r[0], reverse=True)
            y0, y1 = row_runs[0]

            card = img.crop((x0, y0, x1 + 1, y1 + 1))
            resized = card.resize((size, size), Image.LANCZOS)
            sized[size] = resized
            out_path = ICONS_DIR / f"icon_{size}x{size}.png"
            resized.save(out_path, format="PNG", optimize=True)
            print(
                f"  card ({x0},{y0})-({x1},{y1}) "
                f"[{card.size[0]}x{card.size[1]}] -> {out_path.name}"
            )

    # --- Favicon set expected by layouts/_partials/head/index.html ---
    required = {16, 32, 48, 180}
    missing = required - sized.keys()
    if missing:
        raise SystemExit(f"Missing sizes for favicon generation: {missing}")

    sized[16].save(FAVICON_DIR / "favicon-16x16.png", format="PNG", optimize=True)
    sized[32].save(FAVICON_DIR / "favicon-32x32.png", format="PNG", optimize=True)
    sized[180].save(FAVICON_DIR / "apple-touch-icon.png", format="PNG", optimize=True)

    # Multi-resolution favicon.ico - Pillow embeds each requested size.
    sized[48].save(
        FAVICON_DIR / "favicon.ico",
        format="ICO",
        sizes=[(16, 16), (32, 32), (48, 48)],
    )
    print(f"  wrote favicon set under {FAVICON_DIR.relative_to(REPO_ROOT)}/")

    # --- Logo for the nav (used by layouts/_partials/nav.html) ---
    if LOGO_SIZE not in sized:
        raise SystemExit(f"LOGO_SIZE {LOGO_SIZE} was not produced by the split step")
    sized[LOGO_SIZE].save(LOGO_PATH, format="PNG", optimize=True)
    print(f"  wrote logo -> {LOGO_PATH.relative_to(REPO_ROOT)}")


if __name__ == "__main__":
    main()
