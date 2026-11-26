#!/usr/bin/env python3
"""Generates v2 assets for herdr-pokemon:
1. 4 crisp 2D Top-Down GBA Pokemon Overworld Tile Maps (PNG, pure stdlib zlib+struct, 2x pixel scale!)
   - meadow.png  (Pallet Meadow Plaza: grass tiles, dirt crossroads + central battle arena, blue pond + lily pads, top-down trees, fence, flowers, Pokecenter roof)
   - lake.png    (Cerulean Cove: sparkling top-down lake shoreline, wooden boardwalk dock, warm beach sand, grassy clearing)
   - autumn.png  (Ecruteak Shrine Courtyard: autumn meadow, stone-paved plaza arena, red shrine rails, fallen maple leaves, koi pond)
   - moon.png    (Mt. Moon Plateau: starlit twilight grass, glowing moonstone clearing circle, crater rocks, mystic pool, crystals)
2. 24 distinct VSCode/Material-style File-Type SVG icons for the Files panel!
3. Updated restrained layout preview SVG.
"""
import os, struct, zlib, math

ROOT = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.join(ROOT, "mods", "herdr-pokemon", "assets")
MAPS_DIR = os.path.join(ASSETS, "maps")
FICON_DIR = os.path.join(ASSETS, "file-icons")
LAYOUTS_DIR = os.path.join(ROOT, "layouts")

for d in (MAPS_DIR, FICON_DIR, LAYOUTS_DIR):
    os.makedirs(d, exist_ok=True)


# ---- Pure-Python PNG writer (crisp 2x nearest-neighbor upscale!) ----

def save_png_2x(path, grid, w, h):
    """grid: bytearray of length w*h*3 (RGB). Upscales 2x pixel-perfect and saves PNG."""
    W, H = w * 2, h * 2
    raw = bytearray()
    for y in range(h):
        row = bytearray(W * 3)
        base = y * w * 3
        for x in range(w):
            r, g, b = grid[base + x * 3], grid[base + x * 3 + 1], grid[base + x * 3 + 2]
            o = x * 6
            row[o] = r; row[o + 1] = g; row[o + 2] = b
            row[o + 3] = r; row[o + 4] = g; row[o + 5] = b
        raw.append(0); raw.extend(row)
        raw.append(0); raw.extend(row)

    def chunk(tag, data):
        c = tag + data
        return struct.pack(">I", len(data)) + c + struct.pack(">I", zlib.crc32(c) & 0xFFFFFFFF)

    ihdr = struct.pack(">IIBBBBB", W, H, 8, 2, 0, 0, 0)
    png = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr) + chunk(b"IDAT", zlib.compress(bytes(raw), 6)) + chunk(b"IEND", b"")
    with open(path, "wb") as f:
        f.write(png)


def save_rgba_png_2x(path, grid, w, h):
    """grid: bytearray of length w*h*4 (RGBA). Upscales 2x pixel-perfect and saves transparent PNG."""
    W, H = w * 2, h * 2
    raw = bytearray()
    for y in range(h):
        row = bytearray(W * 4)
        base = y * w * 4
        for x in range(w):
            r, g, b, a = grid[base + x * 4], grid[base + x * 4 + 1], grid[base + x * 4 + 2], grid[base + x * 4 + 3]
            o = x * 8
            row[o] = r; row[o + 1] = g; row[o + 2] = b; row[o + 3] = a
            row[o + 4] = r; row[o + 5] = g; row[o + 6] = b; row[o + 7] = a
        raw.append(0); raw.extend(row)
        raw.append(0); raw.extend(row)

    def chunk(tag, data):
        c = tag + data
        return struct.pack(">I", len(data)) + c + struct.pack(">I", zlib.crc32(c) & 0xFFFFFFFF)

    ihdr = struct.pack(">IIBBBBB", W, H, 8, 6, 0, 0, 0)
    png = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr) + chunk(b"IDAT", zlib.compress(bytes(raw), 6)) + chunk(b"IEND", b"")
    with open(path, "wb") as f:
        f.write(png)


class RgbaCanvas:
    def __init__(self, w, h):
        self.w = w
        self.h = h
        self.buf = bytearray(w * h * 4)

    def px(self, x, y, col, a=255):
        if 0 <= x < self.w and 0 <= y < self.h:
            r, g, b = col if isinstance(col, tuple) else hex_rgb(col)
            i = (y * self.w + x) * 4
            self.buf[i] = r; self.buf[i + 1] = g; self.buf[i + 2] = b; self.buf[i + 3] = a

    def rect(self, x, y, w, h, col, a=255):
        c = col if isinstance(col, tuple) else hex_rgb(col)
        for yy in range(max(0, y), min(self.h, y + h)):
            for xx in range(max(0, x), min(self.w, x + w)):
                self.px(xx, yy, c, a)

    def ellipse(self, cx, cy, rx, ry, col, a=255):
        c = col if isinstance(col, tuple) else hex_rgb(col)
        for y in range(int(cy - ry - 1), int(cy + ry + 2)):
            for x in range(int(cx - rx - 1), int(cx + rx + 2)):
                dx = (x - cx) / max(1, rx)
                dy = (y - cy) / max(1, ry)
                if dx * dx + dy * dy <= 1.0:
                    self.px(x, y, c, a)


def draw_tree_canopy_fg(fg, cx, cy, pal):
    """Draw ONLY the upper leafy canopy crown onto transparent foreground for GBA Y-depth occlusion!"""
    fg.ellipse(cx, cy - 3, 13, 10, pal["outline"])
    fg.ellipse(cx, cy - 3, 12, 9, pal["dark"])
    fg.ellipse(cx - 1, cy - 5, 10, 7, pal["mid"])
    fg.ellipse(cx - 3, cy - 7, 6, 4, pal["light"])
    fg.ellipse(cx + 4, cy - 5, 4, 3, pal["light"])


def draw_palm_canopy_fg(fg, cx, cy):
    for dx, dy, rx, ry in [(-8, -1, 7, 3), (8, -1, 7, 3), (-5, -5, 6, 3), (5, -5, 6, 3), (0, -6, 4, 5)]:
        fg.ellipse(cx + dx, cy + dy, rx, ry, "#1f5e32")
        fg.ellipse(cx + dx, cy + dy - 1, max(2, rx - 1), max(2, ry - 1), "#3da852")
    fg.ellipse(cx, cy - 3, 3, 2, "#7ee072")


def draw_tall_grass_fg(fg, x0, y0, cols, rows, pal):
    """Upper pixel blade tips of tall grass so walking Pokemon look waist-deep inside GBA grass!"""
    for gy in range(rows):
        for gx in range(cols):
            tx = x0 + gx * 8
            ty = y0 + gy * 7
            for bx in (1, 3, 5):
                fg.px(tx + bx, ty + 1, pal["grass_l"], 220)
                fg.px(tx + bx, ty + 2, pal["grass_m"], 200)
                fg.px(tx + bx + 1, ty + 2, pal["grass_l"], 190)


def draw_reeds_fg(fg, x, y, dark="#2d6e3e", light="#5ab568", tip="#a3e635"):
    """Tall swaying shoreline reeds in the foreground layer so swimmers/walkers pass naturally behind them!"""
    for dx, h in [(-3, 7), (-1, 10), (1, 8), (3, 6)]:
        for dy in range(h):
            col = light if dy >= h - 3 else dark
            fg.px(x + dx, y - dy, col, 240 if dy < h - 1 else 210)
        if h >= 9:
            fg.px(x + dx, y - h, tip, 220)


def draw_pier_rail_fg(fg, x0, y0, w, h, rail="#a67547", dark="#6e4726"):
    """Foreground lower railing + posts of bridges/piers so Pokemon crossing bridges tuck cleanly behind the front rail!"""
    ry = y0 + h - 3
    fg.rect(x0, ry, w, 2, rail, 245)
    fg.rect(x0, ry + 2, w, 1, dark, 250)
    for px in range(x0 + 4, x0 + w - 2, 16):
        fg.rect(px, ry - 2, 3, 5, dark, 250)
        fg.rect(px + 1, ry - 2, 1, 4, rail, 250)


def draw_water_mist_fg(fg, cx, cy, rx, ry):
    """Translucent foreground waterfall spray & foam puffs for 3D plunge-pool depth!"""
    fg.ellipse(cx, cy, rx, ry, "#e0f7ff", 165)
    fg.ellipse(cx - 2, cy - 1, max(2, rx - 3), max(1, ry - 1), "#ffffff", 195)


def blend_rgb(c1, c2, t):
    return (
        int(c1[0] + (c2[0] - c1[0]) * t),
        int(c1[1] + (c2[1] - c1[1]) * t),
        int(c1[2] + (c2[2] - c1[2]) * t),
    )


def apply_water_depth_pass(cv, water_fn, spec):
    """Adds authentic GBA 3D water depth to every biome:
    - Recessed earthen/rocky embankment wall along north shores (water visibly sits BELOW land!)
    - Cool cast bank shadow falling into the top 4px of water under overhangs
    - Crisp foamy surf rim along east/west/south shorelines
    - Layered sinusoidal pixel caustic ripples & subtle shallow submerged pebbles!
    """
    W, H = cv.w, cv.h
    mask = bytearray(W * H)
    for y in range(H):
        row = y * W
        for x in range(W):
            if water_fn(x, y):
                mask[row + x] = 1

    w_mid = hex_rgb(spec["water"])
    w_deep = hex_rgb(spec["water_deep"])
    w_edge = hex_rgb(spec["water_edge"])
    w_hi = hex_rgb(spec["water_hi"])
    bank_dark = blend_rgb(hex_rgb(spec["path_edge"]), (28, 22, 18), 0.55)
    bank_mid = blend_rgb(hex_rgb(spec["path_edge"]), (60, 44, 30), 0.35)
    w_shadow = blend_rgb(w_deep, (10, 26, 48), 0.45)
    w_shadow_soft = blend_rgb(w_deep, (16, 42, 72), 0.25)

    for y in range(H):
        row = y * W
        for x in range(W):
            if not mask[row + x]:
                continue
            # Check how close we are to land above (recessed north bank drop-off!)
            up_land = 0
            for dy in (1, 2, 3, 4, 5):
                if y - dy >= 0 and not mask[(y - dy) * W + x]:
                    up_land = dy
                    break
            # Check lateral/bottom proximity to shore
            side_land = False
            near_shore = False
            for dx, dy in ((-1, 0), (1, 0), (0, 1), (-2, 0), (2, 0), (0, 2)):
                nx, ny = x + dx, y + dy
                if 0 <= nx < W and 0 <= ny < H and not mask[ny * W + nx]:
                    near_shore = True
                    if abs(dx) <= 1 and abs(dy) <= 1:
                        side_land = True
                    break

            if up_land == 1:
                # Crisp recessed earthen embankment rim right beneath the grass/sand overhang
                cv.px(x, y, bank_dark)
            elif up_land == 2:
                cv.px(x, y, bank_mid if (x // 2) % 3 != 0 else bank_dark)
            elif up_land == 3:
                # Cool recessed shadow on water surface just below the bank wall
                cv.px(x, y, w_shadow)
            elif up_land == 4:
                cv.px(x, y, w_shadow_soft if (x + y) % 2 == 0 else w_deep)
            elif up_land == 5 and (x % 4 == 0):
                cv.px(x, y, w_shadow_soft)
            elif side_land:
                # Sparkling frothy surf line where water laps against east/west/south banks
                cv.px(x, y, w_hi if (x + y * 2) % 5 < 2 else w_edge)
            elif near_shore:
                # Translucent turquoise shallows with occasional submerged stones
                hv = hhash(x // 2, y // 2)
                if hv > 238:
                    cv.px(x, y, w_hi)
                elif hv < 20:
                    cv.px(x, y, w_shadow_soft)
                else:
                    cv.px(x, y, w_edge)
            else:
                # Organic GBA pixel caustic wave texture across open water (breaks up flat solid color!)
                wave = math.sin(x * 0.14 + y * 0.35) + 0.5 * math.cos(x * 0.08 - y * 0.25)
                if wave > 1.28 and (x + y) % 2 == 0:
                    cv.px(x, y, w_edge)
                elif wave < -1.15 and hhash(x // 3, y // 2) < 95:
                    cv.px(x, y, w_deep)



def hex_rgb(h):
    h = h.lstrip("#")
    return int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)


class Canvas:
    def __init__(self, w, h, bg):
        self.w = w
        self.h = h
        r, g, b = hex_rgb(bg)
        self.buf = bytearray([r, g, b] * (w * h))

    def px(self, x, y, col):
        if 0 <= x < self.w and 0 <= y < self.h:
            r, g, b = col if isinstance(col, tuple) else hex_rgb(col)
            i = (y * self.w + x) * 3
            self.buf[i] = r; self.buf[i + 1] = g; self.buf[i + 2] = b

    def rect(self, x, y, w, h, col):
        c = col if isinstance(col, tuple) else hex_rgb(col)
        for yy in range(max(0, y), min(self.h, y + h)):
            for xx in range(max(0, x), min(self.w, x + w)):
                self.px(xx, yy, c)

    def ellipse(self, cx, cy, rx, ry, col):
        c = col if isinstance(col, tuple) else hex_rgb(col)
        for y in range(int(cy - ry - 1), int(cy + ry + 2)):
            for x in range(int(cx - rx - 1), int(cx + rx + 2)):
                dx = (x - cx) / max(1, rx)
                dy = (y - cy) / max(1, ry)
                if dx * dx + dy * dy <= 1.0:
                    self.px(x, y, c)

    def ring(self, cx, cy, rx, ry, col, thickness=1.5):
        c = col if isinstance(col, tuple) else hex_rgb(col)
        for y in range(int(cy - ry - 2), int(cy + ry + 3)):
            for x in range(int(cx - rx - 2), int(cx + rx + 3)):
                dx = (x - cx) / max(1, rx)
                dy = (y - cy) / max(1, ry)
                d = math.sqrt(dx * dx + dy * dy)
                if 1.0 - thickness / max(rx, ry) <= d <= 1.0:
                    self.px(x, y, c)


def hhash(x, y):
    n = (x * 374761393 + y * 668265263) ^ (x * 1274126177)
    n = ((n ^ (n >> 13)) * 1274126177) & 0xFFFFFFFF
    return (n ^ (n >> 16)) & 0xFF


def draw_topdown_tree(cv, cx, cy, pal):
    # Shadow underneath
    cv.ellipse(cx, cy + 8, 12, 5, pal["shadow"])
    # Trunk
    cv.rect(cx - 3, cy + 2, 6, 8, pal["trunk"])
    cv.rect(cx + 1, cy + 2, 2, 8, pal["trunk_d"])
    # Lush GBA top-down layered canopy
    cv.ellipse(cx, cy - 3, 13, 10, pal["outline"])
    cv.ellipse(cx, cy - 3, 12, 9, pal["dark"])
    cv.ellipse(cx - 1, cy - 5, 10, 7, pal["mid"])
    cv.ellipse(cx - 3, cy - 7, 6, 4, pal["light"])
    cv.ellipse(cx + 4, cy - 5, 4, 3, pal["light"])


def draw_tall_grass_patch(cv, x0, y0, cols, rows, pal):
    for gy in range(rows):
        for gx in range(cols):
            tx = x0 + gx * 8
            ty = y0 + gy * 7
            cv.rect(tx + 1, ty + 4, 6, 2, pal["grass_d"])
            # 3 crisp pixel blades
            for bx in (1, 3, 5):
                cv.px(tx + bx, ty + 1, pal["grass_l"])
                cv.px(tx + bx, ty + 2, pal["grass_m"])
                cv.px(tx + bx, ty + 3, pal["grass_d"])
                cv.px(tx + bx + 1, ty + 2, pal["grass_l"])


def draw_flower(cv, x, y, petal, center="#ffe45e"):
    cv.px(x, y - 1, petal); cv.px(x, y + 1, petal)
    cv.px(x - 1, y, petal); cv.px(x + 1, y, petal)
    cv.px(x, y, center)


def draw_fence(cv, x0, y0, count, col="#c79b6b", dark="#8c633b"):
    # Horizontal rails
    cv.rect(x0, y0 + 2, count * 10, 2, col)
    cv.rect(x0, y0 + 5, count * 10, 2, dark)
    for i in range(count + 1):
        px = x0 + i * 10
        cv.rect(px, y0, 3, 8, dark)
        cv.rect(px + 1, y0, 1, 7, col)


def draw_pokecenter_topdown(cv, x0, y0):
    # Shadow
    cv.rect(x0 + 2, y0 + 22, 34, 6, "#467d46")
    # Wall front
    cv.rect(x0 + 2, y0 + 13, 32, 12, "#2d323d")
    cv.rect(x0 + 3, y0 + 14, 30, 10, "#f5f4f0")
    # Windows & door
    cv.rect(x0 + 6, y0 + 16, 6, 5, "#60b8eb")
    cv.rect(x0 + 24, y0 + 16, 6, 5, "#60b8eb")
    cv.rect(x0 + 15, y0 + 17, 6, 7, "#3a4559")
    cv.rect(x0 + 16, y0 + 18, 4, 6, "#88d4fa")
    # Iconic GBA red domed roof
    cv.rect(x0, y0 + 3, 36, 11, "#2d323d")
    cv.rect(x0 + 1, y0 + 2, 34, 11, "#d94545")
    cv.rect(x0 + 3, y0 + 3, 30, 3, "#f27474")
    cv.rect(x0 + 1, y0 + 11, 34, 2, "#a32929")
    # White Poke Ball crest on roof
    cv.rect(x0 + 15, y0 + 5, 6, 5, "#ffffff")
    cv.rect(x0 + 15, y0 + 7, 6, 1, "#d94545")
    cv.rect(x0 + 17, y0 + 7, 2, 1, "#ffffff")


def draw_signpost(cv, x, y):
    cv.rect(x + 3, y + 7, 3, 4, "#6e4b2a")
    cv.rect(x, y, 9, 7, "#593b1f")
    cv.rect(x + 1, y + 1, 7, 5, "#d6ab78")
    cv.rect(x + 2, y + 2, 5, 1, "#7d5630")
    cv.rect(x + 2, y + 4, 4, 1, "#7d5630")


def meadow_river_x(y):
    """Diagonal S-curving river centerline across Pallet Valley (from x~285 top to x~505 bottom)."""
    return 395.0 + (y - 65.0) * 1.45 + 34.0 * math.sin(y * 0.055)


def lake_coast_x(y):
    """Cerulean Archipelago shoreline (left ~40% lush peninsula, right ~60% shimmering bay)."""
    return 316.0 + 28.0 * math.sin(y * 0.052 + 0.4) - 12.0 * math.cos(y * 0.09)


def autumn_left_pond_x(y):
    """Ecruteak West Koi Pond right shoreline (x~155)."""
    return 152.0 + 22.0 * math.sin(y * 0.055 + 0.8) - 8.0 * math.cos(y * 0.09)


def autumn_right_pond_x(y):
    """Ecruteak East Koi Pond left shoreline (x~605)."""
    return 608.0 - 22.0 * math.sin(y * 0.055 + 0.2) + 8.0 * math.cos(y * 0.09)


def draw_reeds(cv, x, y, dark="#2d6e3e", light="#5ab568"):
    for dx, h in [(-2, 6), (0, 8), (2, 5)]:
        for dy in range(h):
            cv.px(x + dx, y - dy, light if dy > h - 3 else dark)


def draw_pier(cv, x0, y0, w, h, wood="#c49464", dark="#7a5230", rail="#a67547", shadow="#1f5a85"):
    cv.rect(x0 + 2, y0 + h, w, 3, shadow)
    for px in range(x0 + 4, x0 + w - 2, 16):
        cv.rect(px, y0 + h - 1, 3, 4, dark)
    cv.rect(x0, y0, w, h, dark)
    cv.rect(x0 + 1, y0 + 1, w - 2, h - 2, wood)
    for px in range(x0 + 4, x0 + w - 2, 5):
        cv.rect(px, y0 + 1, 1, h - 2, dark)
    cv.rect(x0, y0, w, 2, rail)
    cv.rect(x0, y0 + h - 2, w, 2, dark)


def draw_lily(cv, lx, ly, water_col, leaf_d="#2f8a42", leaf_l="#54b862", blossom=False):
    cv.ellipse(lx, ly, 5, 3, leaf_d)
    cv.ellipse(lx - 1, ly - 1, 3, 2, leaf_l)
    cv.px(lx + 3, ly, water_col)
    if blossom:
        draw_flower(cv, lx - 1, ly - 1, "#ff9ec4", "#ffe45e")


def draw_stone_lantern(cv, x, y):
    cv.rect(x + 2, y + 8, 5, 2, "#595e6b")
    cv.rect(x + 3, y + 4, 3, 4, "#8a909e")
    cv.rect(x + 1, y + 1, 7, 3, "#6d7382")
    cv.rect(x + 3, y + 2, 3, 2, "#ffe58a")
    cv.rect(x + 2, y, 5, 1, "#595e6b")


def draw_crystal_rock(cv, rx, ry, water_ring=None):
    if water_ring:
        cv.ellipse(rx, ry + 3, 12, 5, water_ring)
    cv.ellipse(rx, ry, 9, 6, "#2c344d")
    cv.ellipse(rx - 1, ry - 1, 6, 4, "#4b5980")
    cv.rect(rx - 2, ry - 2, 3, 2, "#9be8ff")


def paint_grass_base(cv, W, H, spec, forest_fn):
    for y in range(H):
        for x in range(W):
            v = hhash(x // 2, y // 2)
            if forest_fn(x, y):
                if v < 92:
                    cv.px(x, y, spec["grass_alt"])
                elif v > 244:
                    cv.px(x, y, spec["grass_hi"])
            else:
                if v < 22:
                    cv.px(x, y, spec["grass_alt"])
                elif v > 240:
                    cv.px(x, y, spec["grass_hi"])
            if x % 24 == 5 and y % 18 == 9:
                cv.px(x, y, spec["grass_tuft"])
                cv.px(x + 2, y, spec["grass_tuft"])
                cv.px(x + 1, y + 1, spec["grass_tuft"])


def draw_cactus(cv, x, y):
    # Classic GBA desert cactus with subtle highlight & shadow
    cv.ellipse(x + 2, y + 11, 5, 2, "#b89056")
    cv.rect(x, y, 5, 12, "#245933")
    cv.rect(x + 1, y + 1, 3, 10, "#3a8f4d")
    cv.rect(x + 1, y + 1, 1, 9, "#63bd6d")
    # Left arm
    cv.rect(x - 4, y + 3, 4, 4, "#245933")
    cv.rect(x - 3, y + 2, 2, 4, "#3a8f4d")
    # Right arm
    cv.rect(x + 5, y + 4, 4, 4, "#245933")
    cv.rect(x + 6, y + 3, 2, 4, "#3a8f4d")


def draw_palm_tree(cv, cx, cy):
    cv.ellipse(cx + 2, cy + 10, 10, 4, "#b89056")
    # Curved trunk
    cv.rect(cx - 1, cy + 2, 4, 9, "#7d5231")
    cv.rect(cx, cy + 2, 2, 8, "#a67046")
    # Star-shaped lush palm fronds
    for dx, dy, rx, ry in [(-8, -1, 7, 3), (8, -1, 7, 3), (-5, -5, 6, 3), (5, -5, 6, 3), (0, -6, 4, 5)]:
        cv.ellipse(cx + dx, cy + dy, rx, ry, "#1f5e32")
        cv.ellipse(cx + dx, cy + dy - 1, max(2, rx - 1), max(2, ry - 1), "#3da852")
    cv.ellipse(cx, cy - 3, 3, 2, "#7ee072")


def draw_cliff_wall(cv, x0, y0, w, h, rock_d="#594032", rock_m="#876148", rock_l="#b08361", top_edge="#3d2b21"):
    """Crisp GBA vertical pixel rock cliff face showing dramatic multi-tier elevation drop!"""
    cv.rect(x0, y0, w, 2, top_edge)
    cv.rect(x0, y0 + 2, w, h - 2, rock_m)
    cv.rect(x0, y0 + h - 3, w, 3, rock_d)
    # Stratified vertical pixel rock ridges
    for rx in range(x0 + 3, x0 + w - 3, 9):
        cv.rect(rx, y0 + 2, 2, h - 4, rock_d)
        cv.rect(rx + 2, y0 + 2, 2, h - 5, rock_l)
    # Bottom cliff drop shadow on lower ground
    cv.rect(x0, y0 + h, w, 4, "#3a4f38")


def draw_stairs(cv, x0, y0, w, h, wood="#d1a066", dark="#7a532c"):
    cv.rect(x0, y0, w, h, dark)
    for sy in range(y0 + 1, y0 + h - 1, 3):
        cv.rect(x0 + 1, sy, w - 2, 2, wood)


def generate_biome_map(name, spec):
    """7 genuinely distinct top-down Pokemon overworld ecosystem topologies (760x130 -> 1520x260 PNG)!"""
    W, H = 760, 130
    cv = Canvas(W, H, spec["grass"])
    sand_col = spec.get("sand", spec["path"])
    sand_edge = spec.get("sand_edge", spec["path_edge"])

    # =========================================================================
    # 1. MEADOW: Pallet Winding River (Diagonal S-River + West Forest + East Town & PokeCenter + 2 Bridges!)
    # =========================================================================
    if name == "meadow":
        paint_grass_base(cv, W, H, spec, lambda x, y: x < 210)
        # Dirt trails on west meadow & east town
        cv.rect(0, 58, W, 18, spec["path_edge"])
        cv.rect(0, 60, W, 14, spec["path"])
        cv.rect(132, 18, 18, H - 18, spec["path_edge"])
        cv.rect(134, 20, 14, H - 20, spec["path"])
        # Cozy town clearing on EAST bank (x~605, y~70)
        cv.ellipse(605, 72, 74, 32, spec["path_edge"])
        cv.ellipse(605, 72, 71, 29, spec["arena"])
        cv.ring(605, 72, 62, 23, spec["arena_ring"], 1.5)
        cv.ring(605, 72, 14, 6, spec["arena_ring"], 1.2)
        cv.rect(592, 72, 27, 1, spec["arena_ring"])

        # Diagonal S-curving river cutting right across the valley!
        half_w = 52.0
        for y in range(H):
            rc = meadow_river_x(y)
            for x in range(max(0, int(rc - half_w - 16)), min(W, int(rc + half_w + 16))):
                dist = abs(x - rc)
                if dist > half_w + 12:
                    continue
                elif dist > half_w + 9:
                    if (x + y) % 2 == 0:
                        cv.px(x, y, sand_edge)
                elif dist > half_w:
                    cv.px(x, y, sand_edge if hhash(x, y) < 22 else sand_col)
                elif dist > half_w - 4:
                    cv.px(x, y, spec["water_hi"] if (y + x // 3) % 5 == 0 else spec["water_edge"])
                elif dist > half_w - 15:
                    cv.px(x, y, spec["water"])
                else:
                    cv.px(x, y, spec["water"] if hhash(x // 4, y // 2) > 240 else spec["water_deep"])
        apply_water_depth_pass(cv, lambda x, y: abs(x - meadow_river_x(y)) <= half_w, spec)

        # Two charming wooden bridges crossing the winding river!
        # Upper-center main road bridge (y=56..76) & lower stepping bridge (y=96..112)
        b1x = int(meadow_river_x(66) - half_w - 8)
        draw_pier(cv, b1x, 56, int(half_w * 2 + 16), 20)
        # River ripples, lily pads & reeds
        for ry in (20, 38, 92, 114):
            rc = int(meadow_river_x(ry))
            cv.rect(rc - 14, ry, 10, 1, spec["water_hi"])
            cv.rect(rc + 8, ry + 4, 8, 1, spec["water_hi"])
            draw_reeds(cv, int(rc - half_w - 2), ry, spec["grass_d"], spec["grass_l"])
            draw_reeds(cv, int(rc + half_w + 2), ry, spec["grass_d"], spec["grass_l"])
        for ry, off, bl in [(26, -18, True), (42, 22, False), (92, -20, True), (108, 18, False)]:
            draw_lily(cv, int(meadow_river_x(ry) + off), ry, spec["water"], blossom=bl)

        # West forest tall grass & fence, East PokeCenter & town trees
        for gx, gy in [(22, 84), (74, 96), (174, 90), (42, 32), (174, 28)]:
            draw_tall_grass_patch(cv, gx, gy, 5, 3, spec)
        draw_fence(cv, 60, 20, 6)
        draw_pokecenter_topdown(cv, 586, 6)
        draw_signpost(cv, 568, 24)
        for tx, ty in [(18, 18), (48, 16), (82, 14), (18, 52), (48, 52), (18, 108), (58, 114),
                       (182, 16), (222, 18), (470, 16), (512, 16), (656, 16), (704, 18), (738, 48), (736, 108)]:
            draw_topdown_tree(cv, tx, ty, spec["tree"])
        for fx, fy, fl in [(96, 42, spec["fl1"]), (106, 46, spec["fl2"]), (212, 88, spec["fl1"]), (224, 94, spec["fl2"]),
                           (518, 46, spec["fl1"]), (528, 50, spec["fl2"]), (696, 86, spec["fl1"]), (706, 90, spec["fl2"])]:
            draw_flower(cv, fx, fy, fl)

    # =========================================================================
    # 2. LAKE: Cerulean Archipelago (Left Tropical Beach Peninsula + Huge Bay + Center & Far Islands + Long Pier!)
    # =========================================================================
    elif name == "lake":
        paint_grass_base(cv, W, H, spec, lambda x, y: x < 175)
        # Coastal beach road leading straight onto the long boardwalk pier
        cv.rect(0, 56, 336, 18, spec["path_edge"])
        cv.rect(0, 58, 336, 14, spec["path"])
        cv.rect(114, 18, 18, H - 18, spec["path_edge"])
        cv.rect(116, 20, 14, H - 20, spec["path"])

        # Expansive shimmering archipelago ocean bay on right ~60%
        for y in range(H):
            sx = lake_coast_x(y)
            for x in range(max(0, int(sx - 24)), W):
                d = x - sx
                if d < -20:
                    continue
                elif d < -17:
                    if (x + y) % 2 == 0:
                        cv.px(x, y, sand_edge)
                elif d < -2:
                    cv.px(x, y, sand_edge if hhash(x, y) < 24 else sand_col)
                elif d < 3:
                    cv.px(x, y, spec["water_hi"] if (y + x // 3) % 5 == 0 else spec["water_edge"])
                elif d < 18:
                    cv.px(x, y, spec["water_edge"] if d < 8 else spec["water"])
                elif d < 72:
                    cv.px(x, y, spec["water_edge"] if hhash(x // 4, y // 2) > 246 else spec["water"])
                else:
                    cv.px(x, y, spec["water"] if hhash(x // 4, y // 2) > 242 else spec["water_deep"])

        # Scenic Central Beach Island (x=512, y=66) linked by long boardwalk pier + VS Battle Ring!
        cv.ellipse(512, 66, 54, 30, spec["water_edge"])
        cv.ellipse(512, 66, 48, 25, sand_col)
        cv.ellipse(512, 65, 38, 18, spec["grass"])
        cv.ellipse(512, 65, 32, 15, spec["arena"])
        cv.ring(512, 65, 29, 13, spec["arena_ring"], 1.3)
        cv.ring(512, 65, 8, 4, spec["arena_ring"], 1.1)
        cv.rect(504, 65, 17, 1, spec["arena_ring"])
        # Far-right rocky/grassy islet (x=706, y=36)
        cv.ellipse(706, 36, 36, 20, spec["water_edge"])
        cv.ellipse(706, 36, 30, 15, sand_col)
        cv.ellipse(706, 35, 20, 9, spec["grass"])
        apply_water_depth_pass(
            cv,
            lambda x, y: (
                x >= lake_coast_x(y)
                and ((x - 512) / 48.0) ** 2 + ((y - 66) / 25.0) ** 2 > 1.0
                and ((x - 706) / 30.0) ** 2 + ((y - 36) / 15.0) ** 2 > 1.0
            ),
            spec,
        )
        draw_topdown_tree(cv, 712, 26, spec["tree"])

        # Long wooden boardwalk pier connecting West Beach Peninsula to Central Island!
        draw_pier(cv, 306, 56, 168, 18)

        # Ocean wave glints, lily pads, reeds
        for rx, ry in [(380, 26), (436, 36), (595, 30), (632, 68), (584, 102), (420, 104), (685, 100), (366, 94)]:
            cv.rect(rx, ry, 10, 1, spec["water_hi"])
            cv.rect(rx + 3, ry + 2, 5, 1, spec["water_edge"])
        for lx, ly, bl in [(394, 34, True), (446, 24, False), (605, 92, True), (648, 86, False), (386, 108, True)]:
            draw_lily(cv, lx, ly, spec["water"], blossom=bl)
        for ry in (22, 42, 92, 114):
            draw_reeds(cv, int(lake_coast_x(ry)) - 1, ry, spec["grass_d"], spec["grass_l"])

        for gx, gy in [(20, 84), (66, 96), (156, 92), (160, 28)]:
            draw_tall_grass_patch(cv, gx, gy, 5, 3, spec)
        draw_signpost(cv, 268, 38)
        for tx, ty in [(18, 18), (50, 16), (84, 16), (18, 52), (46, 50), (18, 108), (56, 114), (218, 16), (254, 18), (222, 112), (534, 52)]:
            draw_topdown_tree(cv, tx, ty, spec["tree"])
        for fx, fy, fl in [(152, 46, spec["fl1"]), (164, 42, spec["fl2"]), (212, 86, spec["fl2"]), (224, 92, spec["fl1"]), (496, 60, spec["fl1"])]:
            draw_flower(cv, fx, fy, fl)

    # =========================================================================
    # 3. AUTUMN: Ecruteak Twin-Pond Shrine (West Koi Pond + Central Stone Courtyard & Maple Woods + East Koi Pond!)
    # =========================================================================
    elif name == "autumn":
        paint_grass_base(cv, W, H, spec, lambda x, y: (170 < x < 280) or (480 < x < 590) or y < 34)
        # Symmetrical stone-paved shrine promenade & central courtyard
        cv.rect(146, 56, 468, 20, spec["path_edge"])
        cv.rect(146, 58, 468, 16, spec["path"])
        cv.rect(370, 18, 20, H - 18, spec["path_edge"])
        cv.rect(372, 20, 16, H - 20, spec["path"])
        # Central Zen Stone Courtyard (x=380, y=68)
        cv.ellipse(380, 68, 86, 36, spec["path_edge"])
        cv.ellipse(380, 68, 82, 33, spec["arena"])
        cv.ring(380, 68, 72, 26, spec["arena_ring"], 1.5)
        cv.ring(380, 68, 18, 8, spec["arena_ring"], 1.2)

        # Twin Koi Ponds: FAR LEFT (x < left_x) AND FAR RIGHT (x > right_x)!
        for y in range(H):
            lx = autumn_left_pond_x(y)
            rx = autumn_right_pond_x(y)
            for x in range(0, min(W, int(lx + 18))):
                d = lx - x  # positive inside water
                if d < -12:
                    continue
                elif d < -2:
                    cv.px(x, y, sand_edge if hhash(x, y) < 22 else sand_col)
                elif d < 3:
                    cv.px(x, y, spec["water_hi"] if (y + x // 3) % 5 == 0 else spec["water_edge"])
                elif d < 18:
                    cv.px(x, y, spec["water"])
                else:
                    cv.px(x, y, spec["water"] if hhash(x // 4, y // 2) > 240 else spec["water_deep"])
            for x in range(max(0, int(rx - 18)), W):
                d = x - rx  # positive inside water
                if d < -12:
                    continue
                elif d < -2:
                    cv.px(x, y, sand_edge if hhash(x, y) < 22 else sand_col)
                elif d < 3:
                    cv.px(x, y, spec["water_hi"] if (y + x // 3) % 5 == 0 else spec["water_edge"])
                elif d < 18:
                    cv.px(x, y, spec["water"])
                else:
                    cv.px(x, y, spec["water"] if hhash(x // 4, y // 2) > 240 else spec["water_deep"])
        apply_water_depth_pass(
            cv,
            lambda x, y: x <= autumn_left_pond_x(y) or x >= autumn_right_pond_x(y),
            spec,
        )

        # Red lacquered shrine viewing piers over BOTH koi ponds!
        draw_pier(cv, 102, 57, 64, 18, wood="#b84a39", dark="#6e2217", rail="#d9624c", shadow="#26546e")
        draw_pier(cv, 594, 57, 64, 18, wood="#b84a39", dark="#6e2217", rail="#d9624c", shadow="#26546e")

        # Koi pond ripples, lotus pads & reeds on both sides
        for x, y in [(44, 34), (92, 42), (56, 92), (108, 104), (668, 36), (712, 48), (656, 94), (710, 102)]:
            cv.rect(x, y, 10, 1, spec["water_hi"])
        for lx, ly, bl in [(64, 28, True), (82, 86, False), (40, 104, True), (690, 32, True), (674, 88, False), (722, 96, True)]:
            draw_lily(cv, lx, ly, spec["water"], leaf_d="#3e7d4a", leaf_l="#64a668", blossom=bl)
        for ry in (22, 42, 92, 114):
            draw_reeds(cv, int(autumn_left_pond_x(ry)) + 1, ry, spec["grass_d"], spec["grass_l"])
            draw_reeds(cv, int(autumn_right_pond_x(ry)) - 1, ry, spec["grass_d"], spec["grass_l"])

        # Crimson shrine fences, stone lanterns, autumn maple groves flanking north & south
        draw_fence(cv, 212, 22, 5, col="#d44b3e", dark="#8c261e")
        draw_fence(cv, 492, 22, 5, col="#d44b3e", dark="#8c261e")
        draw_stone_lantern(cv, 294, 42)
        draw_stone_lantern(cv, 458, 42)
        draw_stone_lantern(cv, 294, 88)
        draw_stone_lantern(cv, 458, 88)
        for gx, gy in [(216, 88), (500, 88), (224, 32), (496, 32)]:
            draw_tall_grass_patch(cv, gx, gy, 5, 3, spec)
        for tx, ty in [(194, 16), (274, 16), (318, 16), (442, 16), (486, 16), (564, 16),
                       (196, 110), (264, 112), (494, 112), (566, 110)]:
            draw_topdown_tree(cv, tx, ty, spec["tree"])
        for fx, fy, fl in [(254, 48, spec["fl1"]), (264, 52, spec["fl2"]), (496, 48, spec["fl2"]), (506, 52, spec["fl1"])]:
            draw_flower(cv, fx, fy, fl)

    # =========================================================================
    # 4. MOON: Mt. Moon Caldera Ring (CENTER Glowing Crater Lake + Surrounding Starlit Rocky Highland + Bridges!)
    # =========================================================================
    elif name == "moon":
        paint_grass_base(cv, W, H, spec, lambda x, y: x < 165 or x > 595)
        # Outer ring starlit trail circling the central crater lake!
        cv.ring(380, 66, 198, 54, spec["path_edge"], 16)
        cv.ring(380, 66, 198, 54, spec["path"], 12)
        cv.rect(0, 58, 226, 16, spec["path_edge"])
        cv.rect(0, 60, 226, 12, spec["path"])
        # West Starlit Moonstone VS Battle Ring (x=132, y=66)
        cv.ellipse(132, 66, 58, 25, spec["path_edge"])
        cv.ellipse(132, 66, 54, 22, spec["arena"])
        cv.ring(132, 66, 48, 19, spec["arena_ring"], 1.4)
        cv.ring(132, 66, 12, 5, spec["arena_ring"], 1.2)
        cv.rect(120, 66, 25, 1, spec["arena_ring"])
        cv.rect(534, 58, 226, 16, spec["path_edge"])
        cv.rect(534, 60, 226, 12, spec["path"])

        # HUGE CENTER GLOWING MOONLIGHT CRATER LAKE (cx=380, cy=66, rx=142, ry=44)!
        cx, cy, rx, ry = 380.0, 66.0, 142.0, 44.0
        for y in range(H):
            for x in range(215, 546):
                nx = (x - cx) / rx
                ny = (y - cy) / ry
                d = math.sqrt(nx * nx + ny * ny)
                if d > 1.12:
                    continue
                elif d > 1.02:
                    cv.px(x, y, sand_edge if hhash(x, y) < 25 else sand_col)
                elif d > 0.96:
                    cv.px(x, y, spec["water_hi"] if (x + y) % 5 == 0 else spec["water_edge"])
                elif d > 0.80:
                    cv.px(x, y, spec["water"])
                else:
                    cv.px(x, y, spec["water"] if hhash(x // 4, y // 2) > 240 else spec["water_deep"])

        # Cute glowing moonstone sanctuary islet dead-center of the crater lake + West/East stone bridges!
        apply_water_depth_pass(
            cv,
            lambda x, y: (
                math.hypot((x - 380.0) / 142.0, (y - 66.0) / 44.0) <= 1.0
                and ((x - 380.0) / 20.0) ** 2 + ((y - 66.0) / 9.0) ** 2 > 1.0
            ),
            spec,
        )
        draw_pier(cv, 230, 59, 66, 14, wood="#687899", dark="#39445e", rail="#8ba3cc", shadow="#142947")
        draw_pier(cv, 464, 59, 66, 14, wood="#687899", dark="#39445e", rail="#8ba3cc", shadow="#142947")
        cv.ellipse(380, 66, 26, 12, spec["water_edge"])
        cv.ellipse(380, 66, 20, 9, "#4b5980")
        cv.ellipse(380, 66, 10, 4, "#9be8ff")

        # Glowing ripples & crystal boulders in water and around the crater plateau
        for x, y in [(312, 42), (436, 42), (324, 90), (428, 92), (376, 34), (374, 98)]:
            cv.rect(x, y, 10, 1, spec["water_hi"])
        for crx, cry, wr in [(318, 86, spec["water_edge"]), (446, 44, spec["water_edge"]),
                             (88, 32, None), (162, 102, None), (602, 28, None), (674, 98, None), (138, 26, None), (656, 36, None)]:
            draw_crystal_rock(cv, crx, cry, wr)

        for gx, gy in [(24, 86), (82, 96), (620, 88), (696, 86)]:
            draw_tall_grass_patch(cv, gx, gy, 5, 3, spec)
        for tx, ty in [(18, 18), (52, 16), (18, 54), (22, 108), (194, 16), (566, 16),
                       (708, 16), (740, 20), (740, 56), (736, 108)]:
            draw_topdown_tree(cv, tx, ty, spec["tree"])
        for fx, fy, fl in [(106, 46, spec["fl1"]), (116, 50, spec["fl2"]), (636, 46, spec["fl2"]), (648, 50, spec["fl1"])]:
            draw_flower(cv, fx, fy, fl)

    # =========================================================================
    # 5. OCEAN (EXTREME WATER): Cinnabar Coral Atoll (~85% Deep Open Sea + 2 Tiny Coral Sandbar Atolls + Slender Bridge!)
    # =========================================================================
    elif name == "ocean":
        # Rich seamless deep ocean with organic turquoise shallows around the two atolls
        for y in range(H):
            for x in range(W):
                v = hhash(x // 4, y // 2)
                d_center = min(math.hypot((x - 224) / 140, (y - 68) / 55), math.hypot((x - 536) / 140, (y - 64) / 55))
                if d_center > 1.25:
                    cv.px(x, y, spec["water"] if v > 236 else spec["water_deep"])
                else:
                    cv.px(x, y, spec["water_edge"] if v > 246 else (spec["water_deep"] if v < 44 else spec["water"]))
        # Submerged bright coral reef shelves under the turquoise water
        for cx, cy, rx, ry in [(115, 36, 42, 16), (378, 98, 52, 18), (645, 34, 46, 16), (620, 104, 38, 14)]:
            cv.ellipse(cx, cy, rx, ry, "#2fa8cc")
            cv.ellipse(cx + 4, cy - 1, rx - 12, ry - 5, "#4cc3de")
        # Two tiny sandy coral atolls — West Atoll (224, 68) with VS Battle Ring & East Atoll (536, 64)!
        for ix, iy, rx, ry in [(224, 68, 58, 28), (536, 64, 52, 25)]:
            cv.ellipse(ix, iy, rx + 10, ry + 6, spec["water_edge"])
            cv.ellipse(ix, iy, rx, ry, sand_col)
            cv.ellipse(ix, iy, rx - 14, ry - 9, spec["grass"])
        # Etched sandy VS Battle Ring on West Coral Atoll
        cv.ellipse(224, 68, 42, 18, spec["arena"])
        cv.ring(224, 68, 38, 16, spec["arena_ring"], 1.3)
        cv.ring(224, 68, 10, 4, spec["arena_ring"], 1.1)
        cv.rect(214, 68, 21, 1, spec["arena_ring"])
        apply_water_depth_pass(
            cv,
            lambda x, y: (
                ((x - 224.0) / 58.0) ** 2 + ((y - 68.0) / 28.0) ** 2 > 1.0
                and ((x - 536.0) / 52.0) ** 2 + ((y - 64.0) / 25.0) ** 2 > 1.0
            ),
            spec,
        )
        # Long slender wooden ocean footbridge connecting the two tiny atolls!
        draw_pier(cv, 272, 60, 222, 14, wood="#cfa16d", dark="#7d5632", rail="#e3ba88", shadow="#165a85")
        # Palm trees on the two tiny atolls + flowers + starfish/coral speckles
        draw_palm_tree(cv, 200, 56)
        draw_palm_tree(cv, 558, 52)
        for fx, fy, fl in [(238, 72, "#ff7eb6"), (246, 66, "#ffe45e"), (516, 68, "#ff7eb6")]:
            draw_flower(cv, fx, fy, fl)
        # Ocean sparkles & drifting wave crests everywhere!
        for rx, ry in [(64, 28), (140, 88), (78, 104), (344, 32), (432, 30), (358, 102), (452, 96), (642, 46), (696, 82), (618, 108)]:
            cv.rect(rx, ry, 12, 1, spec["water_hi"])
            cv.rect(rx + 4, ry + 2, 6, 1, spec["water_edge"])
        for lx, ly in [(178, 34), (482, 34), (294, 96), (610, 62)]:
            cv.ellipse(lx, ly, 4, 3, "#f472b6")  # pink coral head peeking out!
            cv.px(lx, ly - 1, "#fbcfe8")

    # =========================================================================
    # 6. DESERT (EXTREME LAND): Sunbaked Red-Rock Desert (~93% Golden Sand Dunes & Mesas + 1 Tiny Hidden Oasis Pool!)
    # =========================================================================
    elif name == "desert":
        # Warm rippled golden desert sand floor with wind-blown dune stripes
        for y in range(H):
            for x in range(W):
                v = hhash(x // 2, y // 2)
                dune = math.sin(x * 0.025 + y * 0.08)
                if dune > 0.65:
                    cv.px(x, y, spec["grass_hi"])
                elif dune < -0.65:
                    cv.px(x, y, spec["grass_alt"])
                elif v < 18:
                    cv.px(x, y, spec["grass_alt"])
                elif v > 242:
                    cv.px(x, y, spec["grass_hi"])
        # Packed canyon caravan trail + central dusty sandstone battle ring
        cv.rect(0, 60, W, 16, spec["path_edge"])
        cv.rect(0, 62, W, 12, spec["path"])
        cv.ellipse(310, 68, 80, 32, spec["path_edge"])
        cv.ellipse(310, 68, 76, 29, spec["arena"])
        cv.ring(310, 68, 66, 23, spec["arena_ring"], 1.4)
        # Red-rock sandstone mesas along the north & west ridges (dramatic desert relief!)
        draw_cliff_wall(cv, 16, 6, 164, 24, rock_d="#7a3b22", rock_m="#b35c37", rock_l="#d98555", top_edge="#542514")
        cv.rect(16, 0, 164, 8, "#d98555")
        draw_cliff_wall(cv, 442, 6, 146, 22, rock_d="#7a3b22", rock_m="#b35c37", rock_l="#d98555", top_edge="#542514")
        cv.rect(442, 0, 146, 8, "#d98555")
        # ONE tiny precious emerald desert oasis pool tucked in lower-right (x=662, y=88, rx=44, ry=22)!
        ox, oy = 664, 88
        cv.ellipse(ox, oy, 56, 28, "#7ab858")   # lush green oasis grass halo
        cv.ellipse(ox, oy, 46, 22, spec["water_edge"])
        cv.ellipse(ox, oy + 1, 41, 18, spec["water"])
        cv.ellipse(ox + 2, oy + 2, 26, 10, spec["water_deep"])
        apply_water_depth_pass(cv, lambda x, y: math.hypot((x - ox) / 41.0, (y - (oy + 1)) / 18.0) <= 1.0, spec)
        cv.rect(ox - 12, oy - 3, 9, 1, spec["water_hi"])
        cv.rect(ox + 8, oy + 4, 8, 1, spec["water_hi"])
        draw_palm_tree(cv, ox - 44, oy - 18)
        draw_palm_tree(cv, ox + 40, oy - 20)
        draw_reeds(cv, ox - 38, oy + 8, "#2c7036", "#58b863")
        draw_reeds(cv, ox + 38, oy + 10, "#2c7036", "#58b863")
        # Desert cacti, dry boulders & signpost
        for cx, cy in [(74, 42), (146, 94), (218, 28), (424, 96), (512, 42), (566, 98), (724, 26)]:
            draw_cactus(cv, cx, cy)
        for bx, by in [(106, 104), (476, 98), (602, 34)]:
            cv.ellipse(bx, by + 3, 10, 4, "#b89056")
            cv.ellipse(bx, by, 9, 6, "#8c5738")
            cv.ellipse(bx - 2, by - 2, 5, 3, "#bf805a")
        draw_signpost(cv, 396, 44)

    # =========================================================================
    # 7. CLIFF (EXTREME ELEVATION): Mt. Chimney Stepped Terraces & Waterfall Gorge!
    # =========================================================================
    else:
        # Three distinct elevation tiers with crisp vertical GBA rock cliff faces + cascading waterfall!
        # Base lower gorge floor (y: 52..130)
        paint_grass_base(cv, W, H, spec, lambda x, y: x < 140 or x > 620)
        # UPPER HIGHLAND PLATEAU (top tier y: 0..40 across left & right ridges, high bright highland grass!)
        cv.rect(0, 0, 326, 34, "#8fd468")
        cv.rect(434, 0, 326, 34, "#8fd468")
        for y in range(34):
            for x in range(W):
                if 326 <= x < 434:
                    continue
                if hhash(x // 2, y // 2) < 30:
                    cv.px(x, y, "#7cc257")
        # Vertical GBA rock cliff wall dropping sharply from Upper Highland (y=34..54) down to Lower Valley!
        draw_cliff_wall(cv, 0, 32, 326, 22)
        draw_cliff_wall(cv, 434, 32, 326, 22)
        # Center Canyon Headwall + RUSHING TURQUOISE WATERFALL cascading down the cliff (x=326..434)!
        draw_cliff_wall(cv, 326, 24, 108, 30, rock_d="#403840", rock_m="#665863", rock_l="#8c7a87", top_edge="#2b242b")
        # Upper mountain river feeding the waterfall (y=0..26)
        cv.rect(348, 0, 64, 26, spec["water"])
        cv.rect(344, 0, 4, 26, spec["water_edge"])
        cv.rect(412, 0, 4, 26, spec["water_edge"])
        # Vertical cascading waterfall curtain (x=350..410, y=24..56) with foamy vertical streaks!
        cv.rect(350, 24, 60, 34, "#58c4f5")
        for wx in range(354, 408, 6):
            cv.rect(wx, 25, 2, 31, "#d9f6ff" if (wx // 6) % 2 == 0 else "#9be2ff")
        # Misty waterfall plunge pool & canyon river flowing south (x=330..430, y=54..130)!
        cv.ellipse(380, 74, 68, 30, spec["water_edge"])
        cv.ellipse(380, 76, 62, 26, spec["water"])
        cv.ellipse(380, 80, 44, 16, spec["water_deep"])
        cv.rect(350, 96, 60, 34, spec["water"])
        cv.rect(345, 96, 5, 34, spec["water_edge"])
        cv.rect(410, 96, 5, 34, spec["water_edge"])
        apply_water_depth_pass(
            cv,
            lambda x, y: (
                (348 <= x < 412 and (y < 26 or y >= 96))
                or math.hypot((x - 380.0) / 62.0, (y - 76.0) / 26.0) <= 1.0
            ),
            spec,
        )
        # Foamy white waterfall splash clouds right where waterfall hits the plunge pool!
        for fx, fy, rx in [(358, 57, 10), (374, 59, 13), (392, 58, 12), (404, 56, 9)]:
            cv.ellipse(fx, fy, rx, 4, "#ffffff")
            cv.ellipse(fx, fy + 2, rx - 2, 3, "#bae6fd")

        # SECOND STEPPED TERRACE LEDGE on far-left & far-right lower corners (dramatic 3-level height!)
        draw_cliff_wall(cv, 0, 96, 152, 16)
        cv.rect(0, 112, 152, 18, "#66ab54")
        draw_cliff_wall(cv, 608, 96, 152, 16)
        cv.rect(608, 112, 152, 18, "#66ab54")

        # Wooden cliff staircases connecting Upper Plateau <-> Mid Valley <-> Lower Ledge!
        draw_stairs(cv, 198, 32, 26, 24)
        draw_stairs(cv, 536, 32, 26, 24)
        draw_stairs(cv, 108, 96, 22, 18)
        draw_stairs(cv, 630, 96, 22, 18)

        # Suspension wooden canyon bridge spanning right across the waterfall river!
        draw_pier(cv, 314, 100, 132, 16, wood="#c49464", dark="#6e4726", rail="#e0b482", shadow="#1e5478")

        # Valley dirt trails connecting stairs & bridge + West Valley VS Battle Ring (x=212, y=76)!
        cv.rect(198, 56, 26, 48, spec["path"])
        cv.rect(536, 56, 26, 48, spec["path"])
        cv.rect(198, 102, 118, 12, spec["path"])
        cv.rect(444, 102, 118, 12, spec["path"])
        cv.ellipse(212, 76, 56, 22, spec["path_edge"])
        cv.ellipse(212, 76, 52, 19, spec["arena"])
        cv.ring(212, 76, 46, 16, spec["arena_ring"], 1.4)
        cv.ring(212, 76, 11, 5, spec["arena_ring"], 1.2)
        cv.rect(201, 76, 23, 1, spec["arena_ring"])

        # Mountain pines on upper plateau + rocky boulders + flowers
        for tx, ty in [(26, 14), (66, 12), (112, 14), (274, 12), (484, 12), (642, 14), (690, 12), (732, 14), (36, 74), (722, 74)]:
            draw_topdown_tree(cv, tx, ty, spec["tree"])
        for gx, gy in [(248, 66), (476, 66)]:
            draw_tall_grass_patch(cv, gx, gy, 5, 3, spec)
        for rx, ry in [(352, 78), (398, 82), (370, 120)]:
            cv.rect(rx, ry, 10, 1, spec["water_hi"])

    save_png_2x(os.path.join(MAPS_DIR, f"{name}.png"), cv.buf, W, H)

    # Also emit transparent foreground depth layer (*_fg.png) containing mid/lower tree crowns,
    # palm fronds, tall-grass blade tips, shoreline reeds, bridge front railings & waterfall mist
    # so ground AND swimming Pokemon tuck naturally behind 3D world geometry!
    fg = RgbaCanvas(W, H)
    if name == "meadow":
        for gx, gy in [(22, 84), (74, 96), (174, 90)]:
            draw_tall_grass_fg(fg, gx, gy, 5, 3, spec)
        for tx, ty in [(18, 52), (48, 52), (18, 108), (58, 114), (738, 48), (736, 108)]:
            draw_tree_canopy_fg(fg, tx, ty, spec["tree"])
        b1x = int(meadow_river_x(66) - 52 - 8)
        draw_pier_rail_fg(fg, b1x, 56, int(52 * 2 + 16), 20)
        for ry in (38, 92, 114):
            rc = int(meadow_river_x(ry))
            draw_reeds_fg(fg, int(rc - 54), ry + 1, spec["grass_d"], spec["grass_l"])
            draw_reeds_fg(fg, int(rc + 54), ry + 1, spec["grass_d"], spec["grass_l"])
    elif name == "lake":
        for gx, gy in [(20, 84), (66, 96), (156, 92)]:
            draw_tall_grass_fg(fg, gx, gy, 5, 3, spec)
        for tx, ty in [(18, 52), (46, 50), (18, 108), (56, 114), (222, 112), (534, 52)]:
            draw_tree_canopy_fg(fg, tx, ty, spec["tree"])
        draw_pier_rail_fg(fg, 306, 56, 168, 18)
        for ry in (42, 92, 114):
            draw_reeds_fg(fg, int(lake_coast_x(ry)) - 1, ry + 1, spec["grass_d"], spec["grass_l"])
    elif name == "autumn":
        for gx, gy in [(216, 88), (500, 88)]:
            draw_tall_grass_fg(fg, gx, gy, 5, 3, spec)
        for tx, ty in [(196, 110), (264, 112), (494, 112), (566, 110)]:
            draw_tree_canopy_fg(fg, tx, ty, spec["tree"])
        draw_pier_rail_fg(fg, 102, 57, 64, 18, rail="#d9624c", dark="#6e2217")
        draw_pier_rail_fg(fg, 594, 57, 64, 18, rail="#d9624c", dark="#6e2217")
        for ry in (42, 92, 114):
            draw_reeds_fg(fg, int(autumn_left_pond_x(ry)) + 1, ry + 1, spec["grass_d"], spec["grass_l"], "#f5a747")
            draw_reeds_fg(fg, int(autumn_right_pond_x(ry)) - 1, ry + 1, spec["grass_d"], spec["grass_l"], "#f5a747")
    elif name == "moon":
        for gx, gy in [(24, 86), (82, 96), (620, 88), (696, 86)]:
            draw_tall_grass_fg(fg, gx, gy, 5, 3, spec)
        for tx, ty in [(18, 54), (22, 108), (740, 56), (736, 108)]:
            draw_tree_canopy_fg(fg, tx, ty, spec["tree"])
        draw_pier_rail_fg(fg, 230, 59, 66, 14, rail="#8ba3cc", dark="#39445e")
        draw_pier_rail_fg(fg, 464, 59, 66, 14, rail="#8ba3cc", dark="#39445e")
        # Glowing crystal outcrop on south rim of crater lake
        fg.ellipse(318, 85, 8, 5, "#2c344d", 245)
        fg.ellipse(317, 84, 5, 3, "#4b5980", 245)
        fg.rect(316, 83, 3, 2, "#9be8ff", 250)
    elif name == "ocean":
        draw_palm_canopy_fg(fg, 200, 56)
        draw_palm_canopy_fg(fg, 558, 52)
        draw_pier_rail_fg(fg, 272, 60, 222, 14, rail="#e3ba88", dark="#7d5632")
    elif name == "desert":
        draw_palm_canopy_fg(fg, 664 - 44, 88 - 18)
        draw_palm_canopy_fg(fg, 664 + 40, 88 - 20)
        draw_reeds_fg(fg, 664 - 38, 88 + 9, "#2c7036", "#58b863")
        draw_reeds_fg(fg, 664 + 38, 88 + 11, "#2c7036", "#58b863")
        for cx, cy in [(146, 94), (424, 96), (566, 98)]:
            fg.rect(cx, cy, 5, 6, "#245933")
            fg.rect(cx + 1, cy + 1, 3, 5, "#3a8f4d")
            fg.rect(cx + 1, cy + 1, 1, 4, "#63bd6d")
    else:  # cliff
        for gx, gy in [(248, 66), (476, 66)]:
            draw_tall_grass_fg(fg, gx, gy, 5, 3, spec)
        for tx, ty in [(36, 74), (722, 74)]:
            draw_tree_canopy_fg(fg, tx, ty, spec["tree"])
        draw_pier_rail_fg(fg, 314, 100, 132, 16, rail="#e0b482", dark="#6e4726")
        for fx, fy, rx in [(358, 57, 10), (376, 59, 13), (394, 58, 12), (404, 56, 9)]:
            draw_water_mist_fg(fg, fx, fy, rx, 4)

    save_rgba_png_2x(os.path.join(MAPS_DIR, f"{name}_fg.png"), fg.buf, W, H)


BIOME_SPECS = {
    "meadow": {
        "grass": "#7ec868", "grass_alt": "#72bd5d", "grass_hi": "#90d678", "grass_tuft": "#5da64b",
        "grass_d": "#3d853a", "grass_m": "#55ad4c", "grass_l": "#8be072",
        "path": "#e6d8b3", "path_edge": "#cbb88d", "arena": "#ede2c2", "arena_ring": "#d4c39a",
        "water": "#4faee8", "water_deep": "#3891cf", "water_edge": "#87d1f7", "water_hi": "#d6f2ff",
        "fl1": "#f25c6e", "fl2": "#57a8f5",
        "tree": {"outline": "#1e4024", "dark": "#32753b", "mid": "#4ca350", "light": "#7ed175", "trunk": "#8a5a36", "trunk_d": "#5e3b22", "shadow": "#589c49"},
    },
    "lake": {
        "grass": "#76c474", "grass_alt": "#68b567", "grass_hi": "#8cd488", "grass_tuft": "#529c54",
        "grass_d": "#357d44", "grass_m": "#4ca35a", "grass_l": "#7dd686",
        "path": "#efe4c4", "path_edge": "#d4c59e", "arena": "#f5ecd2", "arena_ring": "#d9cba6",
        "water": "#3ca2e0", "water_deep": "#2782bf", "water_edge": "#82d4fa", "water_hi": "#e0f7ff",
        "fl1": "#54b4f5", "fl2": "#ff9ec4",
        "tree": {"outline": "#1c3d29", "dark": "#2e7346", "mid": "#47a163", "light": "#79cf8e", "trunk": "#8a5a36", "trunk_d": "#5e3b22", "shadow": "#539954"},
    },
    "autumn": {
        "grass": "#cf9c55", "grass_alt": "#c28e48", "grass_hi": "#deb068", "grass_tuft": "#ad7938",
        "grass_d": "#8f4e28", "grass_m": "#bd6d33", "grass_l": "#e89c4a",
        "path": "#e8d7b7", "path_edge": "#c9b38f", "arena": "#efe2c8", "arena_ring": "#d1bc97",
        "water": "#4b95bf", "water_deep": "#36789e", "water_edge": "#89c2de", "water_hi": "#d9f0fa",
        "fl1": "#e04c38", "fl2": "#f7c244",
        "tree": {"outline": "#3d1e14", "dark": "#a63b26", "mid": "#d96634", "light": "#f5a747", "trunk": "#6e442c", "trunk_d": "#4a2c1c", "shadow": "#9e7039"},
    },
    "moon": {
        "grass": "#2d4252", "grass_alt": "#263847", "grass_hi": "#375063", "grass_tuft": "#1e2e3b",
        "grass_d": "#1a3036", "grass_m": "#274a4d", "grass_l": "#427878",
        "path": "#55627a", "path_edge": "#3f495e", "arena": "#606e8a", "arena_ring": "#88a4cc",
        "water": "#285082", "water_deep": "#1b3961", "water_edge": "#4c82bd", "water_hi": "#9be2ff",
        "fl1": "#70d6ff", "fl2": "#c792ea",
        "tree": {"outline": "#111824", "dark": "#1d3640", "mid": "#2c545c", "light": "#488085", "trunk": "#453430", "trunk_d": "#2e211e", "shadow": "#1f2e3b"},
    },
    "ocean": {
        "grass": "#6ec76e", "grass_alt": "#5fb860", "grass_hi": "#84db84", "grass_tuft": "#4ba34c",
        "grass_d": "#327a3d", "grass_m": "#4aa356", "grass_l": "#7bd984",
        "path": "#f5e3b3", "path_edge": "#dec892", "arena": "#faecc6", "arena_ring": "#e3cf9d",
        "sand": "#f5e3b3", "sand_edge": "#dec892",
        "water": "#2693d6", "water_deep": "#1873b5", "water_edge": "#79d4f7", "water_hi": "#e0f7ff",
        "fl1": "#ff7eb6", "fl2": "#ffe45e",
        "tree": {"outline": "#1b3d26", "dark": "#2c7341", "mid": "#45a35e", "light": "#78d48b", "trunk": "#8a5a36", "trunk_d": "#5e3b22", "shadow": "#c7b17f"},
    },
    "desert": {
        "grass": "#e3bd7d", "grass_alt": "#d4ab68", "grass_hi": "#f0ce92", "grass_tuft": "#c49854",
        "grass_d": "#47853b", "grass_m": "#62ab4e", "grass_l": "#8cd472",
        "path": "#cfa165", "path_edge": "#b5854c", "arena": "#d9ae73", "arena_ring": "#bd8f55",
        "sand": "#e3bd7d", "sand_edge": "#c99d5d",
        "water": "#32a8c2", "water_deep": "#1e859e", "water_edge": "#7be0eb", "water_hi": "#e0fcff",
        "fl1": "#f97316", "fl2": "#fde047",
        "tree": {"outline": "#1e3d21", "dark": "#2d6e35", "mid": "#479c4e", "light": "#7acc78", "trunk": "#8a5a36", "trunk_d": "#5e3b22", "shadow": "#b89056"},
    },
    "cliff": {
        "grass": "#74ba64", "grass_alt": "#66ab57", "grass_hi": "#87cc76", "grass_tuft": "#539446",
        "grass_d": "#397836", "grass_m": "#4fa148", "grass_l": "#7ed472",
        "path": "#d4c39f", "path_edge": "#b5a27d", "arena": "#ded0b1", "arena_ring": "#c2b08c",
        "water": "#3c9fd9", "water_deep": "#257ab5", "water_edge": "#87d6fa", "water_hi": "#e3f8ff",
        "fl1": "#f59e0b", "fl2": "#60a5fa",
        "tree": {"outline": "#183322", "dark": "#255c38", "mid": "#39824f", "light": "#64b075", "trunk": "#70482b", "trunk_d": "#4a2e1a", "shadow": "#4e8a45"},
    },
}

for bname, spec in BIOME_SPECS.items():
    generate_biome_map(bname, spec)


def generate_gba_battle_bg():
    """Classic GBA Pokemon FireRed / Emerald diagonal battle stage (260x110 -> 520x220 crisp 2x PNG)!
    Clean pastel horizon sky, distant soft hills, top-right opponent turf pad & bottom-left player turf pad.
    """
    W, H = 260, 110
    cv = Canvas(W, H, "#d8f0f8")

    # 1. Classic GBA horizontal sky bands (soft sky blue -> pale cream horizon)
    sky_bands = [
        (0, 14, "#b8e2f8"),
        (14, 26, "#ccebf9"),
        (26, 38, "#e0f4fa"),
        (38, 48, "#eef9ea"),
    ]
    for y0, y1, col in sky_bands:
        cv.rect(0, y0, W, y1 - y0, col)
    # Subtle pixel cloud wisps high in the sky
    for cx, cy, rx, ry in [(44, 14, 22, 4), (118, 10, 26, 4), (206, 16, 24, 4)]:
        cv.ellipse(cx, cy, rx, ry, "#ffffff")
        cv.ellipse(cx + 6, cy + 2, rx - 6, max(2, ry - 1), "#eef8ff")

    # 2. Distant rolling GBA emerald hills & treeline silhouette along horizon (y=40..54)
    for x in range(W):
        h_hill = int(44 + 4 * math.sin(x * 0.045) + 2 * math.cos(x * 0.11))
        for y in range(h_hill, 56):
            cv.px(x, y, "#88cc7c" if y < h_hill + 3 else "#74bc6c")

    # 3. Clean pastel meadow battleground floor (classic FireRed light green stripes)
    for y in range(52, H):
        col = "#d0ecb0" if y < 64 else "#c4e69e" if y < 82 else "#b8de8e"
        cv.rect(0, y, W, 1, col)
        # Subtle GBA horizontal scan-stripe texture
        if y % 6 == 0:
            cv.rect(0, y, W, 1, "#ddf2c2" if y < 74 else "#c6e8a4")

    # 4. Top-Right OPPONENT Diagonal Turf Platform (cx=192, cy=56)
    cv.ellipse(192, 58, 48, 15, "#8cc472")   # soft base shadow
    cv.ellipse(192, 56, 46, 14, "#eaf4c8")   # crisp GBA light rim
    cv.ellipse(192, 56, 42, 12, "#9ed878")   # lush turf top
    cv.ellipse(192, 55, 34, 8,  "#b2e68c")   # inner sunlit highlight

    # 5. Bottom-Left PLAYER Foreground Turf Platform (cx=72, cy=98)
    cv.ellipse(72, 101, 62, 18, "#80b868")   # base shadow
    cv.ellipse(72, 98,  60, 17, "#eaf4c8")   # crisp GBA light rim
    cv.ellipse(72, 98,  55, 14, "#98d472")   # lush turf top
    cv.ellipse(72, 97,  44, 10, "#aee488")   # inner sunlit highlight

    save_png_2x(os.path.join(MAPS_DIR, "battle-bg.png"), cv.buf, W, H)


generate_gba_battle_bg()


# ---- 2. Distinct VSCode/Material-Style File-Type SVG Icons (16x16) ----

def write(path, content):
    with open(path, "w", encoding="utf-8") as f:
        f.write(content.strip() + "\n")


def badge_file_svg(bg, label, fg="#ffffff"):
    fs = 6.2 if len(label) <= 2 else 5.0
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
  <path d="M3 1.5h6.5L13 5v9.5a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-12a1 1 0 0 1 1-1z" fill="{bg}" opacity="0.14" stroke="{bg}" stroke-width="1.1"/>
  <path d="M9.5 1.5V5H13" fill="none" stroke="{bg}" stroke-width="1.1"/>
  <rect x="2" y="7.2" width="12" height="6.8" rx="1.6" fill="{bg}"/>
  <text x="8" y="12.6" text-anchor="middle" font-family="ui-monospace,SFMono-Regular,Menlo,sans-serif" font-weight="700" font-size="{fs}" fill="{fg}">{label}</text>
</svg>"""


FILE_BADGES = {
    "ts":     ("#3178c6", "TS",  "#ffffff"),
    "tsx":    ("#0284c7", "TSX", "#ffffff"),
    "js":     ("#eab308", "JS",  "#1e232b"),
    "jsx":    ("#06b6d4", "JSX", "#ffffff"),
    "py":     ("#3b82f6", "PY",  "#ffffff"),
    "go":     ("#00add8", "GO",  "#ffffff"),
    "rs":     ("#ea580c", "RS",  "#ffffff"),
    "json":   ("#ca8a04", "{}",  "#ffffff"),
    "md":     ("#475569", "MD",  "#ffffff"),
    "html":   ("#e34f26", "<>",  "#ffffff"),
    "css":    ("#2563eb", "#",   "#ffffff"),
    "sh":     ("#16a34a", "$_",  "#ffffff"),
    "yaml":   ("#cb3837", "YML", "#ffffff"),
    "toml":   ("#7c3aed", "TML", "#ffffff"),
    "sql":    ("#0891b2", "SQL", "#ffffff"),
    "docker": ("#2496ed", "DKR", "#ffffff"),
    "git":    ("#f05032", "GIT", "#ffffff"),
    "img":    ("#9333ea", "IMG", "#ffffff"),
    "lock":   ("#64748b", "LCK", "#ffffff"),
    "env":    ("#d97706", "ENV", "#ffffff"),
    "xml":    ("#f97316", "XML", "#ffffff"),
    "java":   ("#dc2626", "JAV", "#ffffff"),
}

for k, (bg, lbl, fg) in FILE_BADGES.items():
    write(os.path.join(FICON_DIR, f"{k}.svg"), badge_file_svg(bg, lbl, fg))

# Folder closed / open & default file
write(os.path.join(FICON_DIR, "folder.svg"), """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
  <path d="M1.8 3.5A1.3 1.3 0 0 1 3.1 2.2h3.1l1.4 1.6h5.3a1.3 1.3 0 0 1 1.3 1.3v7.6a1.3 1.3 0 0 1-1.3 1.3H3.1a1.3 1.3 0 0 1-1.3-1.3V3.5z" fill="#60a5fa" opacity="0.22" stroke="#3b82f6" stroke-width="1.2"/>
</svg>""")

write(os.path.join(FICON_DIR, "folder-open.svg"), """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
  <path d="M1.8 3.5A1.3 1.3 0 0 1 3.1 2.2h3.1l1.4 1.6h5.1a1.2 1.2 0 0 1 1.2 1.2v1.2H2.5l-.7 2.5V3.5z" fill="#60a5fa" opacity="0.28" stroke="#3b82f6" stroke-width="1.1"/>
  <path d="M2.2 6.4h12.2l-1.4 6.4a1.2 1.2 0 0 1-1.2 1H2.8a1.1 1.1 0 0 1-1.1-1.3l.5-6.1z" fill="#3b82f6" opacity="0.26" stroke="#2563eb" stroke-width="1.2"/>
</svg>""")

write(os.path.join(FICON_DIR, "file.svg"), """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
  <path d="M3.2 1.8h6.2L13 5.4v8.8a1 1 0 0 1-1 1H3.2a1 1 0 0 1-1-1V2.8a1 1 0 0 1 1-1z" fill="#94a3b8" opacity="0.16" stroke="#64748b" stroke-width="1.15"/>
  <path d="M9.4 1.8v3.6H13" fill="none" stroke="#64748b" stroke-width="1.15"/>
  <path d="M5 8.5h6M5 11.2h4.2" stroke="#64748b" stroke-width="1.1" stroke-linecap="round"/>
</svg>""")


# ---- 3. Clean Restrained Layout Preview SVG ----

write(os.path.join(LAYOUTS_DIR, "herdr-pokemon.svg"), """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200">
  <rect width="320" height="200" rx="8" fill="#eef0f4"/>
  <rect x="6" y="6" width="76" height="188" rx="6" fill="#f6f7f9" stroke="#dfe3ea" stroke-width="1.5"/>
  <circle cx="20" cy="40" r="5" fill="#e04646" stroke="#222" stroke-width="1"/>
  <rect x="30" y="37" width="42" height="5" rx="2" fill="#1e232b" opacity="0.7"/>
  <circle cx="20" cy="56" r="5" fill="#3a7bd5" stroke="#222" stroke-width="1"/>
  <rect x="30" y="53" width="36" height="5" rx="2" fill="#1e232b" opacity="0.35"/>
  <rect x="14" y="96" width="14" height="14" rx="4" fill="#fde047" stroke="#dfe3ea" stroke-width="1"/>
  <rect x="32" y="98" width="40" height="5" rx="2" fill="#1e232b" opacity="0.65"/>
  <rect x="32" y="106" width="28" height="3" rx="1.5" fill="#16a34a"/>
  <rect x="88" y="6" width="226" height="20" rx="6" fill="#f6f7f9" stroke="#dfe3ea" stroke-width="1.2"/>
  <rect x="88" y="32" width="226" height="84" rx="6" fill="#ffffff" stroke="#dfe3ea" stroke-width="1.2"/>
  <rect x="88" y="122" width="226" height="62" rx="6" fill="#7ec868" stroke="#dfe3ea" stroke-width="1.2"/>
  <ellipse cx="201" cy="154" rx="42" ry="18" fill="#ede2c2"/>
  <ellipse cx="282" cy="146" rx="22" ry="12" fill="#4faee8"/>
  <circle cx="184" cy="152" r="6" fill="#ffd94a" stroke="#222" stroke-width="1"/>
  <circle cx="218" cy="154" r="6" fill="#60a5fa" stroke="#222" stroke-width="1"/>
  <rect x="88" y="187" width="226" height="8" rx="3" fill="#f6f7f9"/>
</svg>""")

print("Generated v2 2D overworld maps & 25 file-type SVG icons!")
