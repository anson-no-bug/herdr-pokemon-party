#!/usr/bin/env python3
"""
Pure-stdlib GBA / Gen-5 Pixel-Art Animated Battle FX GIF generator for herdr-pokemon.
Zero external dependencies (pure Python stdlib GIF89a + LZW + PNG preview sheet).
Every effect is drawn on a crisp 1x GBA pixel grid with authentic dark outlines,
4-5 shade 16-bit palettes, dynamic per-frame choreography, and upscaled 2x pixel-perfect.
"""

import math
import os
import random
import struct
import zlib

ROOT = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.join(ROOT, "mods", "herdr-pokemon", "assets", "fx")
os.makedirs(OUT_DIR, exist_ok=True)


def hex_rgb(s):
    h = s.lstrip("#")
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16))


# ---- Minimal Pixel Canvas (indexed palette: 0 = transparent!) ----
class Canvas:
    def __init__(self, w, h):
        self.w = w
        self.h = h
        self.buf = bytearray(w * h)  # palette indices, 0 = transparent

    def put(self, x, y, c):
        ix, iy = int(round(x)), int(round(y))
        if 0 <= ix < self.w and 0 <= iy < self.h:
            self.buf[iy * self.w + ix] = c

    def get(self, x, y):
        if 0 <= x < self.w and 0 <= y < self.h:
            return self.buf[y * self.w + x]
        return 0

    def disk(self, cx, cy, r, c):
        if r <= 0:
            return
        r2 = r * r
        x0 = max(0, int(math.floor(cx - r)))
        x1 = min(self.w - 1, int(math.ceil(cx + r)))
        y0 = max(0, int(math.floor(cy - r)))
        y1 = min(self.h - 1, int(math.ceil(cy + r)))
        for y in range(y0, y1 + 1):
            dy2 = (y - cy) ** 2
            row = y * self.w
            for x in range(x0, x1 + 1):
                if (x - cx) ** 2 + dy2 <= r2:
                    self.buf[row + x] = c

    def rect(self, x0, y0, x1, y1, c):
        ix0 = max(0, int(round(min(x0, x1))))
        ix1 = min(self.w - 1, int(round(max(x0, x1))))
        iy0 = max(0, int(round(min(y0, y1))))
        iy1 = min(self.h - 1, int(round(max(y0, y1))))
        for y in range(iy0, iy1 + 1):
            row = y * self.w
            for x in range(ix0, ix1 + 1):
                self.buf[row + x] = c

    def ring(self, cx, cy, rx, ry, c, width=1.4):
        if rx <= 1 or ry <= 1:
            return
        steps = max(24, int(round(max(rx, ry) * 7)))
        for i in range(steps):
            a = (i / steps) * math.tau
            x = cx + math.cos(a) * rx
            y = cy + math.sin(a) * ry
            if width <= 1.2:
                self.put(x, y, c)
            else:
                self.disk(x, y, width * 0.5, c)

    def line(self, x0, y0, x1, y1, c, width=1.0):
        dx = x1 - x0
        dy = y1 - y0
        steps = max(1, int(math.ceil(math.hypot(dx, dy) * 1.5)))
        r = width * 0.5
        for i in range(steps + 1):
            t = i / steps
            x = x0 + dx * t
            y = y0 + dy * t
            if width <= 1.2:
                self.put(x, y, c)
            else:
                self.disk(x, y, r, c)

    def polyline(self, pts, c, width=1.0):
        for i in range(len(pts) - 1):
            self.line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], c, width)

    def polygon(self, pts, c):
        if len(pts) < 3:
            return
        ys = [p[1] for p in pts]
        min_y = max(0, int(math.floor(min(ys))))
        max_y = min(self.h - 1, int(math.ceil(max(ys))))
        n = len(pts)
        for y in range(min_y, max_y + 1):
            fy = y + 0.5
            xs = []
            for i in range(n):
                x1, y1 = pts[i]
                x2, y2 = pts[(i + 1) % n]
                if (y1 <= fy < y2) or (y2 <= fy < y1):
                    xs.append(x1 + (fy - y1) * (x2 - x1) / (y2 - y1))
            xs.sort()
            row = y * self.w
            for i in range(0, len(xs) - 1, 2):
                a = max(0, int(math.ceil(xs[i])))
                b = min(self.w - 1, int(math.floor(xs[i + 1])))
                for x in range(a, b + 1):
                    self.buf[row + x] = c

    def hit_star(self, cx, cy, r_out, r_in, points, rot, c):
        pts = []
        for i in range(points * 2):
            ang = rot + i * math.pi / points
            r = r_out if i % 2 == 0 else r_in
            pts.append((cx + math.cos(ang) * r, cy + math.sin(ang) * r))
        self.polygon(pts, c)

    def sparkle(self, cx, cy, size, c_out, c_core):
        ix, iy = int(round(cx)), int(round(cy))
        for d in range(1, size + 1):
            self.put(ix + d, iy, c_out)
            self.put(ix - d, iy, c_out)
            self.put(ix, iy + d, c_out)
            self.put(ix, iy - d, c_out)
        self.put(ix, iy, c_core)
        if size >= 3:
            self.put(ix + 1, iy, c_core)
            self.put(ix - 1, iy, c_core)
            self.put(ix, iy + 1, c_core)
            self.put(ix, iy - 1, c_core)

    def add_outline(self, c_out):
        src = bytes(self.buf)
        w, h = self.w, self.h
        for y in range(h):
            row = y * w
            for x in range(w):
                if src[row + x] != 0:
                    continue
                if (
                    (x > 0 and src[row + x - 1] != 0)
                    or (x + 1 < w and src[row + x + 1] != 0)
                    or (y > 0 and src[row - w + x] != 0)
                    or (y + 1 < h and src[row + w + x] != 0)
                ):
                    self.buf[row + x] = c_out

    def scale2x(self):
        W, H = self.w * 2, self.h * 2
        out = bytearray(W * H)
        src = self.buf
        w = self.w
        for y in range(self.h):
            srow = y * w
            drow0 = (y * 2) * W
            drow1 = drow0 + W
            for x in range(w):
                v = src[srow + x]
                if v:
                    dx = x * 2
                    out[drow0 + dx] = v
                    out[drow0 + dx + 1] = v
                    out[drow1 + dx] = v
                    out[drow1 + dx + 1] = v
        return out, W, H


# ---- Pure-Python GIF89a + Variable-Width LZW Encoder ----
def lzw_encode(indices, min_code_size):
    clear_code = 1 << min_code_size
    eoi_code = clear_code + 1
    code_size = min_code_size + 1
    next_code = eoi_code + 1
    max_code = (1 << code_size) - 1

    table = {(i,): i for i in range(clear_code)}
    out_bytes = bytearray()
    bit_buf = 0
    bit_cnt = 0

    def emit(code):
        nonlocal bit_buf, bit_cnt
        bit_buf |= code << bit_cnt
        bit_cnt += code_size
        while bit_cnt >= 8:
            out_bytes.append(bit_buf & 0xFF)
            bit_buf >>= 8
            bit_cnt -= 8

    emit(clear_code)
    if indices:
        seq = (indices[0],)
        for px in indices[1:]:
            nxt = seq + (px,)
            if nxt in table:
                seq = nxt
            else:
                emit(table[seq])
                if next_code < 4096:
                    table[nxt] = next_code
                    next_code += 1
                    if next_code - 1 > max_code and code_size < 12:
                        code_size += 1
                        max_code = (1 << code_size) - 1
                else:
                    emit(clear_code)
                    table = {(i,): i for i in range(clear_code)}
                    code_size = min_code_size + 1
                    next_code = eoi_code + 1
                    max_code = (1 << code_size) - 1
                seq = (px,)
        emit(table[seq])
    emit(eoi_code)
    if bit_cnt > 0:
        out_bytes.append(bit_buf & 0xFF)

    # Pack into GIF sub-blocks (max 255 bytes each)
    blocks = bytearray([min_code_size])
    pos = 0
    n = len(out_bytes)
    while pos < n:
        chunk = out_bytes[pos:pos + 255]
        blocks.append(len(chunk))
        blocks.extend(chunk)
        pos += len(chunk)
    blocks.append(0)
    return bytes(blocks)


def save_gif(canvases, palette_hex, filename, delay_cs=7):
    """Save indexed pixel canvases (upscaled 2x NEAREST) as a clean transparent GIF89a."""
    # Palette index 0 is transparent black; fill power-of-2 Global Color Table
    colors = [(0, 0, 0)] + [hex_rgb(h) for h in palette_hex]
    gct_bits = max(2, (len(colors) - 1).bit_length())
    gct_size = 1 << gct_bits
    while len(colors) < gct_size:
        colors.append((0, 0, 0))

    scaled = [c.scale2x() for c in canvases]
    W, H = scaled[0][1], scaled[0][2]

    out = bytearray()
    out.extend(b"GIF89a")
    packed = 0x80 | ((gct_bits - 1) << 4) | (gct_bits - 1)
    out.extend(struct.pack("<HHBBB", W, H, packed, 0, 0))
    for r, g, b in colors:
        out.extend((r, g, b))

    # NETSCAPE2.0 loop=0
    out.extend(b"\x21\xFF\x0BNETSCAPE2.0\x03\x01\x00\x00\x00")

    min_code_size = max(2, gct_bits)
    for buf, fw, fh in scaled:
        # Graphic Control Extension: disposal=2 (restore to background), transparent index=0
        out.extend(struct.pack("<BBBBHBB", 0x21, 0xF9, 4, 0x09, delay_cs, 0, 0))
        # Image Descriptor
        out.extend(struct.pack("<BHHHHB", 0x2C, 0, 0, fw, fh, 0))
        out.extend(lzw_encode(buf, min_code_size))

    out.append(0x3B)  # Trailer
    path = os.path.join(OUT_DIR, filename)
    with open(path, "wb") as f:
        f.write(out)
    return path, scaled, colors


# ---- Pure-Python PNG preview sheet writer for visual QA ----
def write_png_rgba(path, buf, w, h):
    raw = bytearray()
    stride = w * 4
    for y in range(h):
        raw.append(0)
        raw.extend(buf[y * stride:(y + 1) * stride])

    def chunk(tag, data):
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)

    ihdr = struct.pack(">IIBBBBB", w, h, 8, 6, 0, 0, 0)
    png = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr) + chunk(b"IDAT", zlib.compress(bytes(raw), 6)) + chunk(b"IEND", b"")
    with open(path, "wb") as f:
        f.write(png)


def build_preview_sheet(records):
    cols = 4
    cw, ch = 200, 156
    rows = math.ceil(len(records) / cols)
    W, H = cols * cw, rows * ch
    img = bytearray(W * H * 4)

    def fill_rect(x0, y0, x1, y1, rgb):
        r, g, b = rgb
        for y in range(max(0, y0), min(H, y1)):
            row = y * W * 4
            for x in range(max(0, x0), min(W, x1)):
                o = row + x * 4
                img[o] = r; img[o + 1] = g; img[o + 2] = b; img[o + 3] = 255

    fill_rect(0, 0, W, H, hex_rgb("#1e293b"))

    for idx, (name, scaled, colors) in enumerate(records):
        r_idx, c_idx = divmod(idx, cols)
        ox, oy = c_idx * cw, r_idx * ch
        fill_rect(ox + 6, oy + 6, ox + cw - 6, oy + ch - 6, hex_rgb("#334155"))
        # GBA grass pad oval
        gx, gy = ox + cw // 2, oy + ch - 28
        gr, gg, gb = hex_rgb("#65a30d")
        for y in range(gy - 12, gy + 13):
            for x in range(gx - 48, gx + 49):
                if ((x - gx) / 48.0) ** 2 + ((y - gy) / 12.0) ** 2 <= 1.0:
                    o = (y * W + x) * 4
                    img[o] = gr; img[o + 1] = gg; img[o + 2] = gb; img[o + 3] = 255
        # Composite peak frame (~frame 4)
        peak = scaled[min(4, len(scaled) - 1)]
        fbuf, fw, fh = peak
        px0 = ox + (cw - fw) // 2
        py0 = oy + (ch - fh) // 2
        for y in range(fh):
            dy = py0 + y
            if dy < 0 or dy >= H:
                continue
            drow = dy * W * 4
            srow = y * fw
            for x in range(fw):
                ci = fbuf[srow + x]
                if ci == 0:
                    continue
                dx = px0 + x
                if 0 <= dx < W:
                    cr, cg, cb = colors[ci]
                    o = drow + dx * 4
                    img[o] = cr; img[o + 1] = cg; img[o + 2] = cb; img[o + 3] = 255

    out_path = "/Users/anson/.gemini/antigravity-cli/brain/9fc0429e-2735-4a64-9fa7-e3c6efd10d86/scratch/battle_fx_preview.png"
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    write_png_rgba(out_path, img, W, H)
    return out_path


# ===========================================================================
# 1. THUNDERBOLT / THUNDER
# ===========================================================================
def gen_thunder():
    W, H = 56, 76
    # 1:outline, 2:amber, 3:yellow, 4:white, 5:cyan
    pal = ["#1e1b4b", "#f59e0b", "#fde047", "#ffffff", "#7dd3fc"]
    paths = [
        [(28, 1), (22, 14), (33, 25), (24, 39), (32, 50), (27, 60)],
        [(30, 1), (35, 13), (23, 27), (34, 40), (25, 51), (29, 60)],
        [(26, 1), (20, 16), (31, 28), (22, 42), (33, 52), (28, 60)],
        [(29, 1), (34, 15), (24, 24), (32, 38), (23, 49), (28, 60)],
    ]
    frames = []
    for fi in range(11):
        c = Canvas(W, H)
        if fi <= 4:
            r = 4 + fi * 1.8 if fi <= 2 else 9 - (fi - 2) * 2.5
            c.disk(28, 7, r, 2)
            c.disk(28, 7, max(1, r - 2), 3)
            c.disk(28, 7, max(1, r - 3.5), 4)

        if 1 <= fi <= 7:
            pts = paths[fi % len(paths)]
            seg = pts[:4] if fi == 1 else pts
            tw = 5.5 if fi in (2, 3, 4) else (3.8 if fi in (1, 5) else 2.2)
            c.polyline(seg, 2, tw + 2.2)
            c.polyline(seg, 3, tw)
            if tw >= 3:
                c.polyline(seg, 4, max(1.2, tw - 2.2))
            if 2 <= fi <= 6:
                p2 = seg[2]
                side = -1 if fi % 2 == 0 else 1
                twig = [p2, (p2[0] + side * 10, p2[1] + 8), (p2[0] + side * 15, p2[1] + 15)]
                c.polyline(twig, 3, 2.0)
                c.polyline(twig[:2], 4, 1.0)

        if 2 <= fi <= 9:
            t = fi - 2
            rx = 10 + t * 2.4
            ry = 4 + t * 0.9
            if t <= 5:
                c.ring(28, 61, rx, ry, 2, 2.0)
                c.ring(28, 61, max(2, rx - 1.5), max(1, ry - 0.8), 3, 1.0)
            if t <= 4:
                c.hit_star(28, 60, 14 - t * 1.5, 6 - t * 0.6, 8, fi * 0.4, 3)
                c.hit_star(28, 60, 8 - t * 0.8, 3, 8, fi * 0.4 + 0.2, 4)
            rng = random.Random(100 + fi)
            for _ in range(6 if t <= 4 else 3):
                ang = rng.uniform(0, math.tau)
                r0 = 7 + t * 2.1
                c.sparkle(28 + math.cos(ang) * r0, 58 + math.sin(ang) * r0 * 0.55, 3 if t < 4 else 2, 3 if rng.random() > 0.3 else 5, 4)

        c.add_outline(1)
        frames.append(c)
    return ("b-thunder.gif", *save_gif(frames, pal, "b-thunder.gif", delay_cs=6)[1:])


# ===========================================================================
# 2. FLAMETHROWER / FIRE BLAST
# ===========================================================================
def gen_fire():
    W, H = 64, 64
    # 1:outline, 2:red, 3:orange, 4:yellow, 5:cream, 6:smoke-dk, 7:smoke-lt
    pal = ["#450a0a", "#dc2626", "#f97316", "#fde047", "#fef9c3", "#64748b", "#cbd5e1"]
    frames = []
    for fi in range(11):
        c = Canvas(W, H)
        cx, cy = 32, 40

        if fi <= 8:
            grow = min(1.0, (fi + 1) / 2.8)
            fade = max(0.0, 1.0 - max(0, fi - 5) / 4.0)
            amp = grow * fade
            tongues = [
                (-13, 3, 9.5, 19, 0.2),
                (13, 3, 9.5, 18, 1.1),
                (-6, 1, 11, 25, 2.3),
                (6, 2, 11, 23, 3.5),
                (0, 5, 13, 29, 4.7),
            ]
            for ox, oy, rw, rh, ph in tongues:
                wob = math.sin(fi * 1.15 + ph) * 3.0
                fx = cx + ox * amp + wob * 0.4
                fy = cy + oy - max(0, fi - 4) * 2.2
                rb = max(2.0, rw * amp)
                ht = max(4.0, rh * amp)
                c.disk(fx, fy, rb, 2)
                c.polygon([(fx - rb * 0.9, fy), (fx + wob, fy - ht), (fx + rb * 0.9, fy)], 2)
                rm = max(1.5, rb * 0.74)
                c.disk(fx, fy + 1, rm, 3)
                c.polygon([(fx - rm * 0.8, fy + 1), (fx + wob * 0.6, fy - ht * 0.78), (fx + rm * 0.8, fy + 1)], 3)
                if amp > 0.42:
                    ry = max(1.0, rb * 0.46)
                    c.disk(fx, fy + 2, ry, 4)
                    c.polygon([(fx - ry * 0.7, fy + 2), (fx + wob * 0.3, fy - ht * 0.48), (fx + ry * 0.7, fy + 2)], 4)
                    c.disk(fx, fy + 2, max(1.0, ry - 2.0), 5)

        if fi >= 6:
            t = fi - 6
            for sox, soy, sr in [(-11, -7, 6.5), (10, -9, 7.0), (0, -15, 8.0), (-4, 1, 5.5)]:
                rr = sr - t * 1.1
                if rr >= 2.0:
                    sx = cx + sox + math.sin(t + sox) * 2
                    sy = cy + soy - t * 3.8
                    c.disk(sx, sy, rr, 6)
                    c.disk(sx - 1, sy - 1, max(1.0, rr - 2.0), 7)

        rng = random.Random(200 + fi)
        for _ in range(9 if fi <= 7 else 5):
            ang = rng.uniform(-math.pi * 0.92, -math.pi * 0.08)
            dist = 7 + fi * 2.7 + rng.uniform(0, 8)
            c.sparkle(cx + math.cos(ang) * dist, cy + math.sin(ang) * dist, 2 if fi < 7 else 1, 3, 4 if fi < 6 else 5)

        c.add_outline(1)
        frames.append(c)
    return ("b-fire.gif", *save_gif(frames, pal, "b-fire.gif", delay_cs=7)[1:])


# ===========================================================================
# 3. HYDRO PUMP / SURF / WATER SHURIKEN
# ===========================================================================
def gen_water():
    W, H = 68, 60
    # 1:outline, 2:deep, 3:mid, 4:cyan, 5:white
    pal = ["#1e3a8a", "#0369a1", "#0ea5e9", "#7dd3fc", "#ffffff"]
    frames = []
    for fi in range(11):
        c = Canvas(W, H)
        cx, cy = 34, 40

        if fi <= 8:
            rx = 12 + fi * 2.3
            ry = 4.5 + fi * 0.75
            c.ring(cx, cy + 5, rx, ry, 2, 2.6)
            c.ring(cx, cy + 4, rx - 1, ry - 0.8, 4, 1.2)

        if 1 <= fi <= 7:
            peak = 1.0 - abs(fi - 3.5) / 3.8
            hc = max(6.0, 32.0 * peak)
            wc = max(5.0, 13.0 * (0.6 + 0.5 * peak))
            c.polygon([
                (cx - wc - 4, cy + 7), (cx - wc, cy + 5 - hc * 0.6), (cx - wc - 5, cy + 3 - hc),
                (cx, cy - hc - 2),
                (cx + wc + 5, cy + 3 - hc), (cx + wc, cy + 5 - hc * 0.6), (cx + wc + 4, cy + 7),
            ], 2)
            c.polygon([
                (cx - wc, cy + 6), (cx - wc + 2, cy + 4 - hc * 0.7), (cx, cy - hc + 1),
                (cx + wc - 2, cy + 4 - hc * 0.7), (cx + wc, cy + 6),
            ], 3)
            for fx_off in (-wc - 2, -wc * 0.5, 0, wc * 0.5, wc + 2):
                fy_off = cy + 2 - hc + abs(fx_off) * 0.3 + math.sin(fi + fx_off) * 2
                c.disk(cx + fx_off, fy_off, 4.0 if abs(fx_off) < 6 else 3.0, 4)
                c.disk(cx + fx_off - 1, fy_off - 1, 2.0, 5)

        if fi >= 2:
            t = (fi - 2) / 8.0
            drops = [(-1.0, -1.2, 4), (-0.6, -1.5, 5), (0.0, -1.7, 4), (0.6, -1.5, 5), (1.0, -1.2, 4), (-1.2, -0.7, 3), (1.2, -0.7, 3)]
            for vx, vy, r0 in drops:
                bx = cx + vx * (10 + t * 22)
                by = cy - 4 + vy * (16 * t) + 22 * (t ** 2)
                br = max(1.2, r0 * (1.1 - t * 0.55))
                if fi <= 8:
                    c.disk(bx, by, br, 3)
                    c.disk(bx - 0.8, by - 0.8, max(1.0, br - 1.2), 4)
                    c.put(bx - max(1, int(br * 0.4)), by - max(1, int(br * 0.4)), 5)
                else:
                    c.ring(bx, by, br + 1, br + 1, 5, 1.0)

        c.add_outline(1)
        frames.append(c)
    return ("b-water.gif", *save_gif(frames, pal, "b-water.gif", delay_cs=6)[1:])


# ===========================================================================
# 4. RAZOR LEAF / LEAF STORM / ENERGY BALL
# ===========================================================================
def gen_leaf():
    W, H = 64, 64
    # 1:outline, 2:dark, 3:mid, 4:mint, 5:white
    pal = ["#14532d", "#15803d", "#22c55e", "#bbf7d0", "#ffffff"]

    def draw_leaf(c, cx, cy, ang, scale):
        ca, sa = math.cos(ang), math.sin(ang)
        for lx in range(-5, 6):
            mw = int(round((1.0 - (lx / 5.5) ** 2) * 2.5 * scale))
            for ly in range(-mw, mw + 1):
                rx = cx + (lx * scale * ca - ly * sa)
                ry = cy + (lx * scale * sa + ly * ca)
                col = 4 if (ly == 0 and -3 <= lx <= 3) or (ly < 0 and abs(lx) < 3) else (2 if ly == mw else 3)
                c.put(rx, ry, col)

    frames = []
    for fi in range(11):
        c = Canvas(W, H)
        cx, cy = 32, 32
        t = fi / 10.0

        if 1 <= fi <= 6:
            for k in (-1, 0, 1):
                sh = (fi - 3) * 5
                x0, y0 = cx - 20 + sh + k * 6, cy + 16 - sh + k * 5
                x1, y1 = cx + 16 + sh + k * 6, cy - 20 - sh + k * 5
                c.line(x0, y0, x1, y1, 3, 2.8)
                c.line(x0 + 2, y0 - 2, x1 - 2, y1 + 2, 4, 1.1)

        if 3 <= fi <= 6:
            r = 14 - abs(fi - 4.5) * 3.5
            c.hit_star(cx, cy, r, r * 0.45, 6, fi * 0.5, 4)
            c.hit_star(cx, cy, r * 0.55, r * 0.25, 6, fi * 0.5, 5)

        for k in range(7):
            ang = k * (math.tau / 7) + fi * 0.55
            rad = 6 + t * 22 + (k % 2) * 3
            if fi < 9 or k % 2 == 0:
                draw_leaf(c, cx + math.cos(ang) * rad, cy + math.sin(ang) * rad * 0.78, ang + fi * 0.8, 0.98 if fi < 7 else 0.72)

        for k in range(4):
            a = k * 1.57 + fi * 0.4
            c.sparkle(cx + math.cos(a) * (10 + fi * 1.8), cy + math.sin(a) * (8 + fi * 1.6), 2, 4, 5)

        c.add_outline(1)
        frames.append(c)
    return ("b-leaf.gif", *save_gif(frames, pal, "b-leaf.gif", delay_cs=6)[1:])


# ===========================================================================
# 5. ICE BEAM (Faceted crystal freeze -> explosive shatter!)
# ===========================================================================
def gen_ice():
    W, H = 64, 64
    # 1:outline, 2:deep, 3:mid, 4:light, 5:white
    pal = ["#0c4a6e", "#0284c7", "#38bdf8", "#bae6fd", "#ffffff"]
    frames = []
    for fi in range(11):
        c = Canvas(W, H)
        cx, cy = 32, 34

        if fi <= 6:
            s = min(1.0, (fi + 1) / 2.8)
            c.polygon([(cx, cy - 24 * s), (cx - 10 * s, cy - 8 * s), (cx - 7 * s, cy + 14 * s), (cx + 7 * s, cy + 14 * s), (cx + 10 * s, cy - 8 * s)], 3)
            c.polygon([(cx - 19 * s, cy - 10 * s), (cx - 14 * s, cy + 12 * s), (cx - 4 * s, cy + 12 * s), (cx - 6 * s, cy - 4 * s)], 3)
            c.polygon([(cx + 19 * s, cy - 10 * s), (cx + 14 * s, cy + 12 * s), (cx + 4 * s, cy + 12 * s), (cx + 6 * s, cy - 4 * s)], 3)
            c.polygon([(cx, cy - 24 * s), (cx - 10 * s, cy - 8 * s), (cx - 4 * s, cy + 13 * s), (cx, cy + 13 * s)], 4)
            c.polygon([(cx, cy - 24 * s), (cx + 10 * s, cy - 8 * s), (cx + 6 * s, cy + 13 * s), (cx, cy + 13 * s)], 2)
            if fi in (4, 5):
                off = (fi - 4) * 8 - 4
                c.line(cx - 12, cy - 12 + off, cx + 12, cy - 2 + off, 5, 2.8)
            if fi == 6:
                c.polyline([(cx, cy - 16), (cx - 3, cy - 2), (cx + 4, cy + 10)], 5, 1.2)
                c.line(cx - 3, cy - 2, cx - 13, cy + 4, 5, 1.2)
                c.line(cx + 1, cy + 2, cx + 12, cy - 4, 5, 1.2)
        else:
            t = (fi - 6) / 4.0
            if fi == 7:
                c.hit_star(cx, cy, 18, 7, 8, 0.2, 5)
            shards = [(-1.0, -1.1), (-0.3, -1.4), (0.4, -1.3), (1.1, -0.9), (-1.3, -0.1), (1.3, -0.1), (-1.0, 0.8), (1.0, 0.8), (-0.4, 1.1), (0.4, 1.1)]
            for idx, (vx, vy) in enumerate(shards):
                sx = cx + vx * (6 + t * 22)
                sy = cy + vy * (6 + t * 18) + t * t * 7
                sz = max(2.0, 6.2 - t * 3.5)
                ang = math.atan2(vy, vx) + fi * 0.4
                pts = [
                    (sx + math.cos(ang) * sz, sy + math.sin(ang) * sz),
                    (sx + math.cos(ang + 2.2) * sz * 0.6, sy + math.sin(ang + 2.2) * sz * 0.6),
                    (sx + math.cos(ang - 2.2) * sz * 0.6, sy + math.sin(ang - 2.2) * sz * 0.6),
                ]
                c.polygon(pts, 5 if idx % 2 == 0 else 4)

        rng = random.Random(300 + fi)
        for _ in range(5):
            c.sparkle(cx + rng.uniform(-22, 22), cy + rng.uniform(-22, 18), 2, 4, 5)

        c.add_outline(1)
        frames.append(c)
    return ("b-ice.gif", *save_gif(frames, pal, "b-ice.gif", delay_cs=7)[1:])


# ===========================================================================
# 6. SLASH / LEAF BLADE / CLOSE COMBAT / QUICK ATTACK (X-Slash + GBA Hit-Star!)
# ===========================================================================
def gen_slash():
    W, H = 64, 64
    # 1:outline, 2:orange, 3:yellow, 4:cyan, 5:white
    pal = ["#1e293b", "#f97316", "#fde047", "#7dd3fc", "#ffffff"]

    def draw_arc(c, flip_x, prog):
        po, pi, co, ci = [], [], [], []
        n = 12
        for i in range(n + 1):
            u = (i / n) * min(1.0, prog)
            t = -1.0 + 2.0 * u
            x = 32 + (t * 22) * (-1 if flip_x else 1)
            y = 32 + t * 20 - (1 - t * t) * 7
            th = math.sin(u * math.pi) * (5.2 if prog < 1.1 else max(0.5, 5.2 * (1.5 - prog)))
            po.append((x - th * 0.5, y - th))
            pi.append((x + th * 0.5, y + th))
            co.append((x, y - max(0.8, th * 0.45)))
            ci.append((x, y + max(0.8, th * 0.45)))
        c.polygon(po + list(reversed(pi)), 4 if flip_x else 3)
        c.polygon(co + list(reversed(ci)), 5)

    frames = []
    for fi in range(10):
        c = Canvas(W, H)
        cx, cy = 32, 32

        if fi <= 4:
            draw_arc(c, True, (fi + 1) * 0.38)
        if 2 <= fi <= 6:
            draw_arc(c, False, (fi - 1) * 0.38)

        if 3 <= fi <= 9:
            t = fi - 3
            if t <= 4:
                ro = 19 - t * 2.5
                c.hit_star(cx, cy, ro, ro * 0.38, 8, t * 0.15, 2)
                c.hit_star(cx, cy, ro * 0.78, ro * 0.30, 8, t * 0.15 + 0.1, 3)
                c.hit_star(cx, cy, ro * 0.45, ro * 0.18, 8, t * 0.15, 5)
            if t <= 5:
                rr = 9 + t * 3.5
                c.ring(cx, cy, rr, rr, 3 if t < 3 else 5, 2.0 if t < 2 else 1.2)
            for k in range(6):
                a = k * (math.tau / 6) + 0.3
                dist = 10 + t * 3.8
                c.sparkle(cx + math.cos(a) * dist, cy + math.sin(a) * dist, 2 if t < 4 else 1, 3, 5)

        c.add_outline(1)
        frames.append(c)
    return ("b-slash.gif", *save_gif(frames, pal, "b-slash.gif", delay_cs=6)[1:])


# ===========================================================================
# 7. EARTHQUAKE / GIGA IMPACT / BODY SLAM
# ===========================================================================
def gen_quake():
    W, H = 72, 56
    # 1:outline, 2:rock-dk, 3:rock-md, 4:rock-hi, 5:dust-dk, 6:dust-lt, 7:crack
    pal = ["#29160a", "#78350f", "#b45309", "#f59e0b", "#a8a29e", "#e7e5e4", "#451a03"]
    boulders = [(-16, -24, 7, 0.2), (-5, -31, 8, 1.4), (7, -29, 8, 2.3), (18, -22, 6, 3.5), (-22, -16, 5, 4.1), (22, -15, 5, 5.0)]

    def draw_rock(c, cx, cy, r, rot):
        angs = [0.0, 0.9, 1.9, 2.8, 3.9, 5.1]
        rms = [1.0, 0.85, 1.05, 0.82, 0.96, 0.88]
        pts = [(cx + math.cos(a + rot) * r * rm, cy + math.sin(a + rot) * r * rm) for a, rm in zip(angs, rms)]
        c.polygon(pts, 3)
        c.polygon([pts[0], pts[5], (cx, cy), pts[1]], 4)
        c.polygon([pts[2], pts[3], pts[4], (cx, cy)], 2)

    frames = []
    for fi in range(11):
        c = Canvas(W, H)
        cx, gy = 36, 44

        if fi <= 8:
            sp = min(28, 8 + fi * 5)
            c.polyline([(cx - sp, gy), (cx - sp * 0.5, gy + 3), (cx - 4, gy - 2), (cx + 5, gy + 3), (cx + sp * 0.5, gy - 1), (cx + sp, gy + 1)], 7, 2.8)
            c.ring(cx, gy + 1, 10 + fi * 3.0, 4 + fi * 0.9, 5, 2.0 if fi < 5 else 1.2)

        if 1 <= fi <= 9:
            t = (fi - 1) / 8.0
            for side in (-1, 1):
                for k in range(3):
                    dx = cx + side * (10 + k * 7 + t * 14)
                    dy = gy - 2 - k * 3 - t * 6
                    rr = (6 - k) * (1.0 - t * 0.65)
                    if rr >= 2.0:
                        c.disk(dx, dy, rr, 5)
                        c.disk(dx - 1, dy - 1, max(1.0, rr - 2.0), 6)

        if fi >= 1:
            t = (fi - 1) / 9.0
            for ox, vy, r, rot0 in boulders:
                bx = cx + ox * (0.45 + t * 0.95)
                by = gy + vy * math.sin(t * math.pi)
                br = max(2.0, r * (1.0 - max(0, t - 0.65) * 1.4))
                if by <= gy + 6:
                    draw_rock(c, bx, by, br, rot0 + fi * 0.5)

        c.add_outline(1)
        frames.append(c)
    return ("b-quake.gif", *save_gif(frames, pal, "b-quake.gif", delay_cs=7)[1:])


# ===========================================================================
# 8. PSYCHIC / SHADOW BALL / DRAGON PULSE
# ===========================================================================
def gen_psychic():
    W, H = 64, 64
    # 1:outline, 2:dark, 3:mid, 4:pink, 5:white
    pal = ["#2e1065", "#581c87", "#9333ea", "#e879f9", "#fdf4ff"]
    frames = []
    for fi in range(11):
        c = Canvas(W, H)
        cx, cy = 32, 32

        for k in range(3):
            ph = fi - k * 2
            if 0 <= ph <= 7:
                rx = 6 + ph * 3.5
                ry = 4 + ph * 2.7
                c.ring(cx, cy, rx, ry, 4 if ph % 2 == 0 else 3, 2.2 if ph < 5 else 1.2)
                if ph <= 4:
                    c.ring(cx, cy, max(2, rx - 2), max(2, ry - 2), 5, 1.0)

        if 1 <= fi <= 7:
            r = 12 if fi in (3, 4) else (8 if fi in (2, 5) else 5)
            c.disk(cx, cy, r, 2)
            c.disk(cx, cy, max(2, r - 3), 3)
            c.disk(cx - 1, cy - 1, max(1, r - 5), 4)
            if fi in (3, 4, 5):
                c.hit_star(cx, cy, r + 5, r * 0.5, 6, fi * 0.45, 4)
                c.disk(cx, cy, max(2, r - 6), 5)

        for k in range(6):
            ang = k * (math.tau / 6) + fi * 0.45
            rad = 10 + fi * 1.8
            c.sparkle(cx + math.cos(ang) * rad, cy + math.sin(ang) * rad, 3 if fi in (3, 4, 5) else 2, 4, 5)

        c.add_outline(1)
        frames.append(c)
    return ("b-psychic.gif", *save_gif(frames, pal, "b-psychic.gif", delay_cs=7)[1:])


# ===========================================================================
# 9. HYPER BEAM / SOLAR BEAM (Diagonal P1 & CPU variants!)
# ===========================================================================
def gen_beam(from_p1=True):
    W, H = 96, 64
    # 1:outline, 2:orange, 3:yellow, 4:white
    pal = ["#431407", "#f97316", "#fde047", "#ffffff"]
    x0, y0 = (14, 52) if from_p1 else (82, 12)
    x1, y1 = (82, 12) if from_p1 else (14, 52)
    frames = []
    for fi in range(11):
        c = Canvas(W, H)

        if fi <= 3:
            r = 5 + fi * 3
            c.hit_star(x0, y0, r, r * 0.4, 8, fi * 0.5, 3)
            c.disk(x0, y0, max(2, r * 0.5), 4)

        if 1 <= fi <= 8:
            reach = 0.55 if fi == 1 else 1.0
            bx = x0 + (x1 - x0) * reach
            by = y0 + (y1 - y0) * reach
            th = 13.0 if fi in (3, 4, 5) else (9.5 if fi in (2, 6) else (5.5 if fi in (1, 7) else 2.8))
            c.line(x0, y0, bx, by, 2, th + 4.0)
            c.line(x0, y0, bx, by, 3, th)
            if th >= 5:
                c.line(x0, y0, bx, by, 4, max(2.0, th - 4.5))

            for k in range(3):
                u = ((fi * 0.24 + k * 0.33) % 0.92) + 0.05
                if u <= reach:
                    nx, ny = x0 + (x1 - x0) * u, y0 + (y1 - y0) * u
                    c.ring(nx, ny, 6.5, 9.5, 3, 2.0)
                    c.ring(nx, ny, 4.5, 7.5, 4, 1.0)

            if fi >= 2:
                br = 18 if fi in (3, 4, 5) else (13 if fi in (2, 6) else 8)
                c.hit_star(x1, y1, br, br * 0.45, 8, fi * 0.4, 2)
                c.hit_star(x1, y1, br * 0.72, br * 0.32, 8, fi * 0.4 + 0.2, 3)
                c.disk(x1, y1, max(2, br * 0.35), 4)

        if fi >= 6:
            rng = random.Random(400 + fi)
            for _ in range(8):
                u = rng.uniform(0.1, 1.0)
                c.sparkle(x0 + (x1 - x0) * u + rng.uniform(-9, 9), y0 + (y1 - y0) * u + rng.uniform(-9, 9), 2, 3, 4)

        c.add_outline(1)
        frames.append(c)
    fn = "b-beam-p1.gif" if from_p1 else "b-beam-cpu.gif"
    return (fn, *save_gif(frames, pal, fn, delay_cs=6)[1:])


# ===========================================================================
# 10. RECOVER / SYNTHESIS
# ===========================================================================
def gen_heal():
    W, H = 60, 64
    # 1:outline, 2:green, 3:mint, 4:white
    pal = ["#14532d", "#16a34a", "#86efac", "#ffffff"]
    frames = []
    for fi in range(11):
        c = Canvas(W, H)
        cx, cy = 30, 50

        for k in range(2):
            p = fi - k * 3
            if 0 <= p <= 7:
                c.ring(cx, cy - p * 3, 12 + p * 2, 4 + p * 0.6, 3 if k == 0 else 2, 2.0 if p < 5 else 1.1)

        for k in range(6):
            ang = k * (math.tau / 6) + fi * 0.35
            x = cx + math.cos(ang) * (14 + (k % 2) * 5)
            y = 54 - fi * 3.8 - (k * 4) % 16
            if 6 <= y <= 58:
                sz = 3 if k % 2 == 0 else 2
                col = 3 if k % 2 == 0 else 2
                c.rect(x - sz, y - 1, x + sz, y + 1, col)
                c.rect(x - 1, y - sz, x + 1, y + sz, col)
                c.put(x, y, 4)

        for k in range(4):
            a = k * 1.57 - fi * 0.4
            c.sparkle(cx + math.cos(a) * 18, 46 - fi * 3.2 + (k % 2) * 8, 2, 3, 4)

        c.add_outline(1)
        frames.append(c)
    return ("b-heal.gif", *save_gif(frames, pal, "b-heal.gif", delay_cs=7)[1:])


# ===========================================================================
# 11. SWORDS DANCE / DRAGON DANCE / CALM MIND
# ===========================================================================
def gen_buff():
    W, H = 60, 64
    # 1:outline, 2:red, 3:amber, 4:yellow, 5:white
    pal = ["#451a03", "#ef4444", "#f59e0b", "#fde047", "#ffffff"]
    frames = []
    for fi in range(11):
        c = Canvas(W, H)
        cx, cy = 30, 36

        for ox, ph in [(-15, 0), (-5, 2), (6, 1), (16, 3)]:
            top_y = max(6, int(round(56 - (fi + ph) * 5.2)))
            bot_y = min(58, top_y + 18)
            if bot_y > top_y + 4:
                c.rect(cx + ox - 2, top_y, cx + ox + 2, bot_y, 3)
                c.rect(cx + ox - 1, top_y + 2, cx + ox + 1, bot_y - 2, 4)

        for k in range(4):
            ang = k * (math.tau / 4) + fi * 0.52
            sx = cx + math.cos(ang) * 20
            sy = cy + math.sin(ang) * 9 - fi * 0.8
            c.polygon([(sx, sy - 9), (sx - 2.2, sy - 2), (sx + 2.2, sy - 2)], 5)
            c.rect(sx - 1, sy - 2, sx + 1, sy + 5, 4)
            c.rect(sx - 3, sy + 2, sx + 3, sy + 3, 2)
            c.put(sx, sy + 6, 3)

        c.add_outline(1)
        frames.append(c)
    return ("b-buff.gif", *save_gif(frames, pal, "b-buff.gif", delay_cs=7)[1:])


# ===========================================================================
# 12. PROTECT
# ===========================================================================
def gen_protect():
    W, H = 64, 64
    # 1:outline, 2:mid, 3:light, 4:white
    pal = ["#0369a1", "#38bdf8", "#bae6fd", "#ffffff"]
    frames = []
    for fi in range(10):
        c = Canvas(W, H)
        cx, cy = 32, 34
        s = min(1.0, (fi + 1) / 2.2)
        rx, ry = 23 * s, 21 * s

        c.ring(cx, cy, rx, ry, 2, 2.8)
        c.ring(cx, cy, max(2, rx - 2), max(2, ry - 2), 3, 1.6)

        for hx, hy in [(0, -9), (-10, -2), (10, -2), (0, 5), (-9, 11), (9, 11)]:
            px_c, py_c = cx + hx * s, cy + hy * s
            pts = [(px_c + math.cos(k * math.pi / 3) * 6 * s, py_c + math.sin(k * math.pi / 3) * 5 * s) for k in range(6)]
            for k in range(6):
                c.line(pts[k][0], pts[k][1], pts[(k + 1) % 6][0], pts[(k + 1) % 6][1], 3, 1.0)

        sweep = -24 + fi * 6
        for t in range(-18, 19):
            x = cx + sweep + t * 0.6
            y = cy + t
            if ((x - cx) / max(1, rx)) ** 2 + ((y - cy) / max(1, ry)) ** 2 <= 0.92:
                c.put(x, y, 4)
                c.put(x + 1, y, 3)

        for k in range(4):
            a = k * 1.57 + fi * 0.35
            c.sparkle(cx + math.cos(a) * rx, cy + math.sin(a) * ry, 2, 3, 4)

        c.add_outline(1)
        frames.append(c)
    return ("b-protect.gif", *save_gif(frames, pal, "b-protect.gif", delay_cs=7)[1:])


# ===========================================================================
# 13. MASTER BALL RECALL ("收入宝可梦" — red energy beam vortex -> Master Ball snap!)
# ===========================================================================
def gen_recall():
    W, H = 64, 64
    # 1:outline, 2:purple, 3:pink, 4:crimson, 5:light-pink, 6:white, 7:gold
    pal = ["#1e1b4b", "#7c3aed", "#ec4899", "#ef4444", "#fbcfe8", "#ffffff", "#fde047"]
    frames = []
    for fi in range(11):
        c = Canvas(W, H)
        cx, cy = 32, 32

        # Converging red-pink recall energy beams pulling in from bottom-left (frames 0-6)
        if fi <= 6:
            t = fi / 6.0
            for k in range(5):
                ang = math.pi * 0.62 + (k - 2) * 0.24
                r_far = 28 * (1.0 - t * 0.55)
                r_near = max(3, 12 * (1.0 - t))
                x0 = cx + math.cos(ang) * r_far
                y0 = cy + math.sin(ang) * r_far
                x1 = cx + math.cos(ang) * r_near
                y1 = cy + math.sin(ang) * r_near
                c.line(x0, y0, x1, y1, 4, 3.0 if k == 2 else 1.8)
                c.line(x0, y0, x1, y1, 5, 1.2)
            # Absorbing energy ring shrinking into the ball
            rr = max(4, 24 - fi * 3.2)
            c.ring(cx, cy, rr, rr, 4, 2.0)
            c.ring(cx, cy, max(2, rr - 2), max(2, rr - 2), 5, 1.0)

        # Pixel Master Ball at center (opens to absorb on 1-4, snaps shut with flash on 5-10!)
        wob = 0 if fi < 7 else (2 if fi in (7, 9) else -2)
        bx, by = cx + wob, cy
        gap = 4 if 1 <= fi <= 4 else 0
        # Top purple dome
        c.disk(bx, by - gap, 11, 2)
        c.rect(bx - 11, by - gap, bx + 11, by + 12, 0)  # clip lower half
        # Pink wings
        c.disk(bx - 7, by - gap - 5, 3, 3)
        c.disk(bx + 7, by - gap - 5, 3, 3)
        # White 'M'
        c.rect(bx - 2, by - gap - 6, bx - 2, by - gap - 3, 6)
        c.rect(bx + 2, by - gap - 6, bx + 2, by - gap - 3, 6)
        c.line(bx - 2, by - gap - 6, bx, by - gap - 4, 6, 1.0)
        c.line(bx + 2, by - gap - 6, bx, by - gap - 4, 6, 1.0)
        # Bottom white dome
        for yy in range(0, 12):
            for xx in range(-11, 12):
                if xx * xx + yy * yy <= 121:
                    c.put(bx + xx, by + gap + yy, 6)
        # Equator belt & glowing center button
        if gap == 0:
            c.rect(bx - 11, by - 1, bx + 11, by + 1, 1)
            c.disk(bx, by, 3.2, 6)
            c.disk(bx, by, 1.6, 3 if fi in (5, 6) else 5)
        else:
            # Blinding red-white absorption core inside open Master Ball!
            c.hit_star(bx, by, 10, 4, 6, fi * 0.5, 4)
            c.disk(bx, by, 5, 6)

        # Snap-shut starburst & catch-complete golden stars (frames 5-10)
        if fi in (5, 6):
            c.hit_star(bx, by, 18 if fi == 5 else 13, 6, 8, fi * 0.4, 5)
            c.hit_star(bx, by, 11 if fi == 5 else 7, 3, 8, fi * 0.4, 6)
        if fi >= 7:
            t = fi - 7
            for ox, oy in [(-14, -14), (0, -18), (14, -14)]:
                c.sparkle(bx + ox, by + oy - t * 2, 3 if t < 2 else 2, 7, 6)

        c.add_outline(1)
        frames.append(c)
    return ("b-recall.gif", *save_gif(frames, pal, "b-recall.gif", delay_cs=6)[1:])


# ===========================================================================
# 14. MASTER BALL RELEASE ("放出宝可梦" — Master Ball pops open -> starburst + sparkles!)
# ===========================================================================
def gen_release():
    W, H = 64, 64
    # 1:outline, 2:purple, 3:pink, 4:lavender, 5:white, 6:gold
    pal = ["#1e1b4b", "#7c3aed", "#ec4899", "#e9d5ff", "#ffffff", "#fde047"]
    frames = []
    for fi in range(11):
        c = Canvas(W, H)
        cx, cy = 32, 32

        # Expanding concentric release light rings (frames 2-9)
        for k in range(2):
            p = fi - 2 - k * 2
            if 0 <= p <= 7:
                rr = 8 + p * 3.8
                c.ring(cx, cy, rr, rr, 3 if k == 0 else 4, 2.5 if p < 4 else 1.2)
                if p <= 3:
                    c.ring(cx, cy, max(2, rr - 2), max(2, rr - 2), 5, 1.0)

        # Master Ball pops open (frames 0-4)
        if fi <= 4:
            gap = 0 if fi == 0 else (fi * 2.5)
            # Top half
            for yy in range(-10, 1):
                for xx in range(-10, 11):
                    if xx * xx + yy * yy <= 100:
                        c.put(cx + xx, cy - gap + yy, 2)
            c.disk(cx - 6, cy - gap - 4, 2.5, 3)
            c.disk(cx + 6, cy - gap - 4, 2.5, 3)
            # Bottom half
            for yy in range(0, 11):
                for xx in range(-10, 11):
                    if xx * xx + yy * yy <= 100:
                        c.put(cx + xx, cy + gap + yy, 5)
            if fi == 0:
                c.rect(cx - 10, cy - 1, cx + 10, cy + 1, 1)
                c.disk(cx, cy, 3, 5)

        # Blinding white-magenta release starburst (frames 1-7)
        if 1 <= fi <= 7:
            r = 8 + fi * 5 if fi <= 3 else 25 - (fi - 3) * 4.5
            c.hit_star(cx, cy, r, r * 0.36, 8, fi * 0.25, 3)
            c.hit_star(cx, cy, r * 0.80, r * 0.30, 8, fi * 0.25 + 0.15, 4)
            c.hit_star(cx, cy, r * 0.52, r * 0.22, 8, fi * 0.25, 5)

        # Glittering release stars shooting outward (frames 3-10)
        if fi >= 3:
            t = fi - 3
            for k in range(8):
                ang = k * (math.tau / 8) + 0.25
                dist = 8 + t * 3.6
                c.sparkle(cx + math.cos(ang) * dist, cy + math.sin(ang) * dist, 3 if t < 4 else 2, 6 if k % 2 == 0 else 3, 5)

        c.add_outline(1)
        frames.append(c)
    return ("b-release.gif", *save_gif(frames, pal, "b-release.gif", delay_cs=6)[1:])


# ===========================================================================
# 15. GOURD / MASTER BALL VORTEX SUCTION ("金角大王葫芦吸入旋涡" — wide funnel!)
# ===========================================================================
def gen_vortex_in():
    W, H = 120, 64
    # 1:outline, 2:purple, 3:pink, 4:crimson, 5:light-pink, 6:white, 7:gold
    pal = ["#1e1b4b", "#7c3aed", "#ec4899", "#ef4444", "#fbcfe8", "#ffffff", "#fde047"]
    frames = []
    mx, my = 104, 52  # Master Ball mouth at bottom-right!
    for fi in range(11):
        c = Canvas(W, H)
        t = fi / 10.0

        # 7 curved pixel suction wind ribbons spiraling from upper-left straight into (mx, my)!
        if fi <= 8:
            for k in range(7):
                u0 = ((fi * 0.14 + k * 0.14) % 0.85)
                u1 = min(1.0, u0 + 0.34)
                pts = []
                spread = (k - 3) * 14.0
                for step in range(9):
                    u = u0 + (u1 - u0) * (step / 8.0)
                    # Funnel narrows quadratically into the gourd mouth!
                    funnel = (1.0 - u) ** 1.45
                    swirl = math.sin(u * 9.0 + fi * 0.7 + k) * 5.0 * funnel
                    x = mx - (1.0 - u) * 96.0 + spread * 0.28 * funnel
                    y = my - (1.0 - u) * 42.0 + spread * funnel + swirl
                    pts.append((x, y))
                col = 4 if k % 2 == 0 else 3
                c.polyline(pts, col, 2.6 if k in (2, 3, 4) else 1.6)
                if k in (2, 3, 4):
                    c.polyline(pts[2:], 5, 1.0)

            # 3 concentric suction funnel rings shrinking into the mouth!
            for r_i in range(3):
                p = ((fi * 0.16 + r_i * 0.33) % 1.0)
                dist = (1.0 - p) * 68.0
                rx = max(3.0, (1.0 - p) * 16.0)
                ry = max(4.0, (1.0 - p) * 22.0)
                cx = mx - dist
                cy = my - dist * 0.42
                c.ring(cx, cy, rx, ry, 5 if r_i % 2 == 0 else 4, 1.5)

        # Open Master Ball at mouth (bottom-right) snapping shut on frames 7-10!
        gap = 4 if fi <= 6 else 0
        for yy in range(-9, 1):
            for xx in range(-9, 10):
                if xx * xx + yy * yy <= 81:
                    c.put(mx + xx, my - gap + yy, 2)
        c.disk(mx - 5, my - gap - 4, 2.2, 3)
        c.disk(mx + 5, my - gap - 4, 2.2, 3)
        for yy in range(0, 10):
            for xx in range(-9, 10):
                if xx * xx + yy * yy <= 81:
                    c.put(mx + xx, my + gap + yy, 6)
        if gap > 0:
            c.hit_star(mx, my, 9, 3.5, 6, fi * 0.55, 4)
            c.disk(mx, my, 4.5, 6)
        else:
            c.rect(mx - 9, my - 1, mx + 9, my + 1, 1)
            c.disk(mx, my, 2.8, 6)
            c.disk(mx, my, 1.4, 3 if fi in (7, 8) else 5)
            if fi in (7, 8):
                c.hit_star(mx, my, 15, 5, 8, fi * 0.4, 5)
                c.hit_star(mx, my, 9, 3, 8, fi * 0.4, 6)
            if fi >= 8:
                for ox, oy in [(-12, -12), (0, -16), (10, -10)]:
                    c.sparkle(mx + ox, my + oy - (fi - 8) * 2, 2, 7, 6)

        c.add_outline(1)
        frames.append(c)
    return ("b-vortex-in.gif", *save_gif(frames, pal, "b-vortex-in.gif", delay_cs=6)[1:])


# ===========================================================================
# 16. GOURD / MASTER BALL VORTEX RELEASE ("大师球喷涌展开旋涡" — wide fan!)
# ===========================================================================
def gen_vortex_out():
    W, H = 120, 64
    # 1:outline, 2:purple, 3:pink, 4:lavender, 5:white, 6:gold
    pal = ["#1e1b4b", "#7c3aed", "#ec4899", "#e9d5ff", "#ffffff", "#fde047"]
    frames = []
    mx, my = 104, 52
    for fi in range(11):
        c = Canvas(W, H)
        t = fi / 10.0

        # Master Ball pops open at mouth (frames 0-5)
        if fi <= 5:
            gap = min(5, fi * 1.8)
            for yy in range(-9, 1):
                for xx in range(-9, 10):
                    if xx * xx + yy * yy <= 81:
                        c.put(mx + xx, my - gap + yy, 2)
            c.disk(mx - 5, my - gap - 4, 2.2, 3)
            c.disk(mx + 5, my - gap - 4, 2.2, 3)
            for yy in range(0, 10):
                for xx in range(-9, 10):
                    if xx * xx + yy * yy <= 81:
                        c.put(mx + xx, my + gap + yy, 5)
            c.hit_star(mx, my, 10 + fi * 2.5 if fi <= 3 else 18 - (fi - 3) * 4, 4, 8, fi * 0.35, 3)
            c.disk(mx, my, 5, 5)

        # 7 bright lavender-white expansion wind ribbons erupting OUT from (mx, my) across the whole canvas!
        if 1 <= fi <= 9:
            prog = min(1.0, fi / 6.5)
            for k in range(7):
                u0 = max(0.0, prog - 0.55)
                u1 = prog
                pts = []
                spread = (k - 3) * 15.0
                for step in range(9):
                    u = u0 + (u1 - u0) * (step / 8.0)
                    fan = u ** 1.25
                    swirl = math.sin(u * 8.0 - fi * 0.8 + k) * 4.5 * fan
                    x = mx - u * 98.0 + spread * 0.25 * fan
                    y = my - u * 44.0 + spread * fan + swirl
                    pts.append((x, y))
                c.polyline(pts, 3 if k % 2 == 0 else 4, 2.8 if k in (2, 3, 4) else 1.8)
                c.polyline(pts[2:], 5, 1.1)

            # Expanding fountain rings shooting outward!
            for r_i in range(3):
                p = fi * 0.14 - r_i * 0.22
                if 0.05 <= p <= 0.98:
                    dist = p * 76.0
                    rx = 4.0 + p * 16.0
                    ry = 5.0 + p * 22.0
                    c.ring(mx - dist, my - dist * 0.44, rx, ry, 4 if r_i % 2 == 0 else 3, 1.8 if p < 0.7 else 1.0)

        # Glittering gold & lavender release stars fanning out (frames 3-10)
        if fi >= 3:
            rng = random.Random(700 + fi)
            for k in range(8):
                u = min(1.0, (fi - 2) * 0.13 + rng.uniform(-0.08, 0.12))
                sp = (k - 3.5) * 14.0
                sx = mx - u * 94.0 + rng.uniform(-5, 5)
                sy = my - u * 40.0 + sp * u + rng.uniform(-4, 4)
                c.sparkle(sx, sy, 3 if fi < 7 else 2, 6 if k % 2 == 0 else 3, 5)

        c.add_outline(1)
        frames.append(c)
    return ("b-vortex-out.gif", *save_gif(frames, pal, "b-vortex-out.gif", delay_cs=6)[1:])


def main():
    records = [
        gen_thunder(),
        gen_fire(),
        gen_water(),
        gen_leaf(),
        gen_ice(),
        gen_slash(),
        gen_quake(),
        gen_psychic(),
        gen_beam(True),
        gen_beam(False),
        gen_heal(),
        gen_buff(),
        gen_protect(),
        gen_recall(),
        gen_release(),
        gen_vortex_in(),
        gen_vortex_out(),
    ]
    total = 0
    for name, _, _ in records:
        sz = os.path.getsize(os.path.join(OUT_DIR, name))
        total += sz
        print(f"  {name:16s} {sz:6d} B")
    print(f"Generated {len(records)} animated GBA pixel-art FX GIFs ({total / 1024:.1f} KB total)")
    prev = build_preview_sheet(records)
    print(f"Preview sheet: {prev}")


if __name__ == "__main__":
    main()
