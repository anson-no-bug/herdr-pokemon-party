#!/usr/bin/env python3
"""Generates clean minimalist UI icon SVGs for habitat scene/weather switchers
and true 3/4 45-degree side-opening Poke Ball toast icons (opening toward the left!).
"""
import math
import os

ROOT = os.path.dirname(os.path.abspath(__file__))
ICONS = os.path.join(ROOT, "mods", "herdr-pokemon", "assets", "icons")
FX = os.path.join(ROOT, "mods", "herdr-pokemon", "assets", "fx")
os.makedirs(ICONS, exist_ok=True)
os.makedirs(FX, exist_ok=True)


def write(name, content):
    with open(os.path.join(ICONS, name), "w", encoding="utf-8") as f:
        f.write(content.strip() + "\n")


def write_fx(name, content):
    with open(os.path.join(FX, name), "w", encoding="utf-8") as f:
        f.write(content.strip() + "\n")


# ---- 1. True 45-degree 3/4 Side-Opening Poke Ball Icons (Zero SVG transforms) ----
# Pure baked coordinates so resvg / GPUI / ImageMagick all render identically!
# Perspective: Poke Ball resting at 3/4 side view, hinge on the RIGHT-BACK,
# lid swung open ~46 deg upward-right so the mouth opens toward the UPPER-LEFT.

def ellipse_poly(cx, cy, rx, ry, angle_deg, n=36):
    rad = math.radians(angle_deg)
    ca, sa = math.cos(rad), math.sin(rad)
    pts = []
    for i in range(n):
        t = 2.0 * math.pi * i / n
        lx = rx * math.cos(t)
        ly = ry * math.sin(t)
        x = cx + lx * ca - ly * sa
        y = cy + lx * sa + ly * ca
        pts.append(f"{x:.2f},{y:.2f}")
    return " ".join(pts)


def dome_path(hx, hy, R, open_deg):
    """Exact semicircle dome hinged at (hx, hy) opened upward-right by open_deg."""
    rad = math.radians(open_deg)
    # Left rim endpoint starts at (hx - 2R, hy), rotated clockwise (left -> up) by open_deg
    lx = hx - 2.0 * R * math.cos(rad)
    ly = hy - 2.0 * R * math.sin(rad)
    # Center of mouth
    mx = (hx + lx) / 2.0
    my = (hy + ly) / 2.0
    # Outer semicircle from (lx, ly) to (hx, hy) sweeping clockwise (upper-right bulge)
    d = f"M{lx:.2f},{ly:.2f} A{R:.2f},{R:.2f} 0 0,1 {hx:.2f},{hy:.2f} Z"
    # Highlight arc inside dome
    hr = R * 0.72
    a1 = math.radians(-145 + open_deg)
    a2 = math.radians(-58 + open_deg)
    h1x, h1y = mx + hr * math.cos(a1), my + hr * math.sin(a1)
    h2x, h2y = mx + hr * math.cos(a2), my + hr * math.sin(a2)
    hi_d = f"M{h1x:.2f},{h1y:.2f} A{hr:.2f},{hr:.2f} 0 0,1 {h2x:.2f},{h2y:.2f}"
    return d, hi_d, (mx, my), (lx, ly)


def starburst_poly(cx, cy, r_outer, r_inner, spikes=9, rot_deg=-15, jitter=True):
    pts = []
    total = spikes * 2
    for i in range(total):
        ang = math.radians(rot_deg + i * 360.0 / total)
        if i % 2 == 0:
            # Slightly irregular anime spikes for authentic manga energy
            scale = 1.0 + (0.14 if (i // 2) % 3 == 0 else (-0.08 if (i // 2) % 2 == 0 else 0.04)) if jitter else 1.0
            r = r_outer * scale
        else:
            r = r_inner
        pts.append(f"{cx + r * math.cos(ang):.2f},{cy + r * math.sin(ang):.2f}")
    return " ".join(pts)


def rotated_poly(pts, cx, cy, angle_deg):
    rad = math.radians(angle_deg)
    ca, sa = math.cos(rad), math.sin(rad)
    out = []
    for x, y in pts:
        dx, dy = x - cx, y - cy
        out.append(f"{cx + dx * ca - dy * sa:.2f},{cy + dx * sa + dy * ca:.2f}")
    return " ".join(out)


def open_ball_toast_svg(lid_main, lid_shade, lid_hi, lid_in, glow_col, burst_outer, burst_stroke, burst_inner, glyph_svg, btn_dot):
    # Ball bottom center and radius
    cx, cy, R = 21.8, 23.6, 10.6
    hx, hy = cx + R, cy            # Right-back hinge: (32.4, 23.6)
    open_deg = 48.0                # True 48-degree side opening toward UPPER-LEFT
    rim_ry = 3.5                   # 3/4 vertical perspective foreshortening

    dome_d, hi_d, (mx, my), (lx, ly) = dome_path(hx, hy, R, open_deg)
    # Lid underside ellipse (oriented along the mouth line at angle = open_deg)
    lid_in_outer = ellipse_poly(mx, my, R * 0.99, rim_ry * 0.85, open_deg)
    lid_in_inner = ellipse_poly(mx, my, R * 0.78, rim_ry * 0.52, open_deg)

    # Bottom bowl rim ellipse (horizontal with subtle -4 deg lively tilt? Keep horizontal 0 deg for clean resting ground)
    bowl_rim_outer = ellipse_poly(cx, cy, R, rim_ry, 0)
    bowl_rim_inner = ellipse_poly(cx, cy, R * 0.83, rim_ry * 0.68, 0)

    # Starburst anchored inside the open mouth, bursting cleanly toward UPPER-LEFT
    bx, by = 14.5, 14.6
    burst_pts = starburst_poly(bx, by, 9.6, 5.2, spikes=9, rot_deg=-22, jitter=True)
    burst_in_pts = starburst_poly(bx, by, 6.4, 3.5, spikes=9, rot_deg=-22, jitter=True)
    lid_bounce = ellipse_poly(mx - 0.4, my + 0.3, 4.6, 1.15, open_deg)

    # 3/4 left-front release button (at ~45 deg to the left of center on the front equator!)
    # On the front ellipse x = cx + R*cos(a), y = cy + rim_ry*sin(a), a = 128 deg -> left-front!
    a_btn = math.radians(126)
    btn_x = cx + R * math.cos(a_btn)   # ~15.6
    btn_y = cy + rim_ry * math.sin(a_btn)  # ~26.4
    btn_outer = ellipse_poly(btn_x, btn_y, 2.55, 2.95, 16)
    btn_inner = ellipse_poly(btn_x - 0.15, btn_y, 1.15, 1.35, 16)

    # Front lip curve of the bottom bowl (from left edge through front to right hinge)
    front_bowl = (
        f"M{cx - R:.2f},{cy:.2f} "
        f"A{R:.2f},{rim_ry:.2f} 0 0,0 {hx:.2f},{hy:.2f} "
        f"A{R:.2f},{R:.2f} 0 0,1 {cx - R:.2f},{cy:.2f} Z"
    )
    # Soft 3D crescent shading on the right-lower side of white bottom shell
    bowl_shade = (
        f"M{cx + 0.5:.2f},{cy + R - 0.5:.2f} "
        f"A{R - 0.4:.2f},{R - 0.4:.2f} 0 0,0 {hx - 0.5:.2f},{hy + 0.5:.2f} "
        f"C{hx - 2.6:.2f},{hy + 5.8:.2f} {cx + 5.2:.2f},{cy + R - 1.5:.2f} {cx + 0.5:.2f},{cy + R - 0.5:.2f} Z"
    )
    # Thick dark front rim curve (equator seam)
    front_lip = f"M{cx - R:.2f},{cy:.2f} A{R:.2f},{rim_ry:.2f} 0 0,0 {hx:.2f},{hy:.2f}"

    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">
  <!-- Ground shadow -->
  <ellipse cx="{cx + 0.4:.2f}" cy="{cy + R + 1.5:.2f}" rx="9.2" ry="2.0" fill="#0f172a" opacity="0.14"/>

  <!-- 1. Open bottom bowl interior (back rim + hollow + warm energy glow) -->
  <polygon points="{bowl_rim_outer}" fill="#1e293b"/>
  <polygon points="{bowl_rim_inner}" fill="#334155"/>
  <ellipse cx="{cx - 1.2:.2f}" cy="{cy:.2f}" rx="6.6" ry="1.9" fill="{glow_col}" opacity="0.65"/>

  <!-- 2. Upper dome lid hinged at RIGHT, opened 48 deg toward UPPER-LEFT -->
  <path d="{dome_d}" fill="{lid_main}" stroke="#1e293b" stroke-width="1.65" stroke-linejoin="round"/>
  <!-- Dome glossy highlight -->
  <path d="{hi_d}" fill="none" stroke="{lid_hi}" stroke-width="1.8" stroke-linecap="round"/>
  <!-- Concave underside of the opened lid (key 3D 45-deg depth cue!) -->
  <polygon points="{lid_in_outer}" fill="#1e293b" stroke="#1e293b" stroke-width="1.1" stroke-linejoin="round"/>
  <polygon points="{lid_in_inner}" fill="{lid_in}"/>
  <!-- Warm bounce light reflecting on inside of lid -->
  <polygon points="{lid_bounce}" fill="{glow_col}" opacity="0.34"/>

  <!-- 3. Anime spiky starburst bursting OUT of the mouth toward UPPER-LEFT -->
  <polygon points="{burst_pts}" fill="{burst_outer}" stroke="{burst_stroke}" stroke-width="1.25" stroke-linejoin="round"/>
  <polygon points="{burst_in_pts}" fill="{burst_inner}"/>
  {glyph_svg}

  <!-- 4. Front white bottom hemisphere (overlaps bottom of starburst for true 3D depth!) -->
  <path d="{front_bowl}" fill="#ffffff" stroke="#1e293b" stroke-width="1.65" stroke-linejoin="round"/>
  <path d="{bowl_shade}" fill="#e2e8f0"/>
  <!-- Crisp equator seam lip -->
  <path d="{front_lip}" fill="none" stroke="#1e293b" stroke-width="1.9" stroke-linecap="round"/>
  <!-- Right hinge accent dot -->
  <circle cx="{hx:.2f}" cy="{hy:.2f}" r="1.45" fill="#1e293b"/>

  <!-- 5. Foreshortened 3/4 left-front release button -->
  <polygon points="{btn_outer}" fill="#ffffff" stroke="#1e293b" stroke-width="1.55" stroke-linejoin="round"/>
  <polygon points="{btn_inner}" fill="{btn_dot}"/>
</svg>"""


# Crisp baked exclamation mark (angled -12 deg to match the upper-left burst)
_exc_bar = rotated_poly([(13.3, 9.8), (15.7, 9.8), (15.3, 15.8), (13.7, 15.8)], 14.5, 14.6, -12)
_exc_dot = ellipse_poly(15.1, 18.1, 1.45, 1.45, 0, n=16)
ALERT_GLYPH = f"""<polygon points="{_exc_bar}" fill="#991b1b" stroke="#991b1b" stroke-width="0.6" stroke-linejoin="round"/>
  <polygon points="{_exc_dot}" fill="#991b1b"/>"""

DONE_GLYPH = """<path d="M10.7,14.8 L13.4,17.6 L18.4,11.8" fill="none" stroke="#14532d" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>"""

write("toast-alert.svg", open_ball_toast_svg("#ef4444", "#dc2626", "#fca5a5", "#451a03", "#fde047", "#facc15", "#b45309", "#fef08a", ALERT_GLYPH, "#facc15"))
write("toast-done.svg", open_ball_toast_svg("#22c55e", "#16a34a", "#bbf7d0", "#052e16", "#86efac", "#4ade80", "#15803d", "#dcfce7", DONE_GLYPH, "#4ade80"))


# ---- 2. Minimalist Crisp Biome Icons (16x16) ----

write("env-meadow.svg", """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
  <circle cx="8" cy="6.2" r="4.4" fill="#22c55e" stroke="#15803d" stroke-width="1.2"/>
  <circle cx="6.6" cy="5.0" r="1.4" fill="#86efac"/>
  <rect x="7.1" y="10.2" width="1.8" height="4.2" rx="0.6" fill="#92400e"/>
</svg>""")

write("env-lake.svg", """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
  <path d="M2,6.5 Q4.5,4.2 7,6.5 T12,6.5 T14.5,6.5" fill="none" stroke="#0284c7" stroke-width="1.8" stroke-linecap="round"/>
  <path d="M2,10.5 Q4.5,8.2 7,10.5 T12,10.5 T14.5,10.5" fill="none" stroke="#38bdf8" stroke-width="1.8" stroke-linecap="round"/>
</svg>""")

write("env-autumn.svg", """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
  <path d="M8,2 L9.8,5.6 L13.6,5.2 L11.2,8.4 L13.2,11.6 L9.0,10.8 L8,14 L7.0,10.8 L2.8,11.6 L4.8,8.4 L2.4,5.2 L6.2,5.6 Z"
        fill="#ea580c" stroke="#9a3412" stroke-width="1.0" stroke-linejoin="round"/>
</svg>""")

write("env-moon.svg", """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
  <path d="M11.6,10.6 A5.2,5.2 0 0,1 5.4,4.4 A5.2,5.2 0 1,0 11.6,10.6 Z"
        fill="#6366f1" stroke="#3730a3" stroke-width="1.1" stroke-linejoin="round"/>
  <circle cx="11.5" cy="4.2" r="1.1" fill="#fbbf24"/>
</svg>""")

write("env-ocean.svg", """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
  <circle cx="8" cy="8" r="6" fill="#0ea5e9" stroke="#0369a1" stroke-width="1"/>
  <path d="M3.5,8.5 Q5.8,6.5 8,8.5 T12.5,8.5" fill="none" stroke="#e0f2fe" stroke-width="1.4" stroke-linecap="round"/>
  <path d="M5,11.2 Q6.5,9.8 8,11.2 T11,11.2" fill="none" stroke="#bae6fd" stroke-width="1.2" stroke-linecap="round"/>
  <ellipse cx="8" cy="5.2" rx="2.6" ry="1.3" fill="#fde68a"/>
</svg>""")

write("env-desert.svg", """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
  <path d="M1.5,13.5 Q5,9.5 9,12 Q12.5,10 14.5,13.5 Z" fill="#f59e0b" opacity="0.55"/>
  <rect x="6.7" y="3" width="2.6" height="10.2" rx="1.2" fill="#22c55e" stroke="#15803d" stroke-width="0.9"/>
  <path d="M6.7,8.2 H4.4 V5.6" fill="none" stroke="#15803d" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M6.7,8.2 H4.4 V5.6" fill="none" stroke="#22c55e" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M9.3,9.2 H11.6 V6.6" fill="none" stroke="#15803d" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M9.3,9.2 H11.6 V6.6" fill="none" stroke="#22c55e" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/>
</svg>""")

write("env-cliff.svg", """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
  <polygon points="1.5,13.5 6.2,4.2 10.6,13.5" fill="#92400e" stroke="#78350f" stroke-width="0.9" stroke-linejoin="round"/>
  <polygon points="6.6,13.5 10.6,6.2 14.5,13.5" fill="#b45309" stroke="#78350f" stroke-width="0.9" stroke-linejoin="round"/>
  <polygon points="4.8,7.0 6.2,4.2 7.6,7.0 6.2,6.2" fill="#86efac"/>
  <path d="M8.8,9.8 V13.4" stroke="#38bdf8" stroke-width="1.8" stroke-linecap="round"/>
</svg>""")

write("hab-gear.svg", """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
  <path d="M6.6,2.0 H9.4 L9.8,3.6 C10.4,3.8 10.9,4.1 11.4,4.5 L12.9,3.9 L14.3,6.3 L13.0,7.3 C13.1,7.8 13.1,8.2 13.0,8.7 L14.3,9.7 L12.9,12.1 L11.4,11.5 C10.9,11.9 10.4,12.2 9.8,12.4 L9.4,14.0 H6.6 L6.2,12.4 C5.6,12.2 5.1,11.9 4.6,11.5 L3.1,12.1 L1.7,9.7 L3.0,8.7 C2.9,8.2 2.9,7.8 3.0,7.3 L1.7,6.3 L3.1,3.9 L4.6,4.5 C5.1,4.1 5.6,3.8 6.2,3.6 Z"
        fill="#64748b" stroke="#334155" stroke-width="0.8" stroke-linejoin="round"/>
  <circle cx="8" cy="8" r="2.2" fill="#f8fafc" stroke="#334155" stroke-width="0.8"/>
</svg>""")


# ---- 3. Minimalist Crisp Weather Icons (16x16) ----

write("w-sunny.svg", """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
  <circle cx="8" cy="8" r="3.4" fill="#f59e0b" stroke="#d97706" stroke-width="1"/>
  <g stroke="#f59e0b" stroke-width="1.4" stroke-linecap="round">
    <line x1="8" y1="1.6" x2="8" y2="3.1"/><line x1="8" y1="12.9" x2="8" y2="14.4"/>
    <line x1="1.6" y1="8" x2="3.1" y2="8"/><line x1="12.9" y1="8" x2="14.4" y2="8"/>
    <line x1="3.5" y1="3.5" x2="4.6" y2="4.6"/><line x1="11.4" y1="11.4" x2="12.5" y2="12.5"/>
    <line x1="12.5" y1="3.5" x2="11.4" y2="4.6"/><line x1="4.6" y1="11.4" x2="3.5" y2="12.5"/>
  </g>
</svg>""")

write("w-breeze.svg", """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
  <path d="M2,6.2 H10.5 A1.8,1.8 0 1,0 9.4,3.4" fill="none" stroke="#10b981" stroke-width="1.6" stroke-linecap="round"/>
  <path d="M2,9.8 H12.2 A1.8,1.8 0 1,1 11.2,12.8" fill="none" stroke="#34d399" stroke-width="1.6" stroke-linecap="round"/>
</svg>""")

write("w-petals.svg", """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
  <g fill="#f472b6" stroke="#db2777" stroke-width="0.8">
    <circle cx="8" cy="4.4" r="2.2"/><circle cx="11.4" cy="6.9" r="2.2"/>
    <circle cx="10.1" cy="10.9" r="2.2"/><circle cx="5.9" cy="10.9" r="2.2"/>
    <circle cx="4.6" cy="6.9" r="2.2"/>
  </g>
  <circle cx="8" cy="8" r="1.6" fill="#fef08a"/>
</svg>""")

write("w-drizzle.svg", """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
  <path d="M4.2,9.8 H12.0 A2.4,2.4 0 0,0 11.8,5.0 A3.3,3.3 0 0,0 5.4,4.2 A2.6,2.6 0 0,0 4.2,9.8 Z"
        fill="#94a3b8" stroke="#64748b" stroke-width="1"/>
  <g stroke="#38bdf8" stroke-width="1.5" stroke-linecap="round">
    <line x1="5.5" y1="11.8" x2="4.8" y2="14.0"/>
    <line x1="8.5" y1="11.8" x2="7.8" y2="14.0"/>
    <line x1="11.5" y1="11.8" x2="10.8" y2="14.0"/>
  </g>
</svg>""")

write("w-rainbow.svg", """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
  <path d="M2.2,12 A5.8,5.8 0 0,1 13.8,12" fill="none" stroke="#ef4444" stroke-width="1.7" stroke-linecap="round"/>
  <path d="M4.0,12 A4.0,4.0 0 0,1 12.0,12" fill="none" stroke="#facc15" stroke-width="1.7" stroke-linecap="round"/>
  <path d="M5.8,12 A2.2,2.2 0 0,1 10.2,12" fill="none" stroke="#3b82f6" stroke-width="1.7" stroke-linecap="round"/>
</svg>""")

write("w-fireflies.svg", """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
  <path d="M8,2.2 L9.2,6.2 L13.2,7.4 L9.2,8.6 L8,12.6 L6.8,8.6 L2.8,7.4 L6.8,6.2 Z" fill="#facc15" stroke="#ca8a04" stroke-width="0.8" stroke-linejoin="round"/>
  <circle cx="12.6" cy="3.6" r="1.2" fill="#fde047"/>
  <circle cx="3.6" cy="12.2" r="1.0" fill="#fde047"/>
</svg>""")

write("w-storm.svg", """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
  <path d="M4.0,9.4 H12.2 A2.4,2.4 0 0,0 11.8,4.6 A3.3,3.3 0 0,0 5.4,3.9 A2.6,2.6 0 0,0 4.0,9.4 Z"
        fill="#64748b" stroke="#475569" stroke-width="1"/>
  <polygon points="8.6,9.0 6.4,12.2 8.2,12.2 7.2,15.0 10.6,11.2 8.7,11.2" fill="#facc15" stroke="#ca8a04" stroke-width="0.6" stroke-linejoin="round"/>
</svg>""")

write("w-snow.svg", """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
  <g stroke="#38bdf8" stroke-width="1.5" stroke-linecap="round">
    <line x1="8" y1="2" x2="8" y2="14"/>
    <line x1="2.8" y1="5" x2="13.2" y2="11"/>
    <line x1="13.2" y1="5" x2="2.8" y2="11"/>
  </g>
  <circle cx="8" cy="8" r="1.6" fill="#e0f2fe" stroke="#0284c7" stroke-width="0.8"/>
</svg>""")


# ---- 4. Pixel-Art Swimming Water Splash, Submerged Shadow & Ripples (wraps around submerged Pokemon!) ----
# Back ripple ring + underwater submerged silhouette shadow (renders BEHIND the submerged Pokemon body)
write("swim-back.svg", """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 22">
  <!-- Deep underwater body silhouette tint so the Pokemon looks physically inside the water -->
  <ellipse cx="24" cy="14" rx="15" ry="6.2" fill="#0c4a6e" opacity="0.34"/>
  <ellipse cx="24" cy="11.5" rx="22" ry="7.2" fill="#0284c7" opacity="0.24"/>
  <ellipse cx="24" cy="11.5" rx="21.5" ry="6.8" fill="none" stroke="#bae6fd" stroke-width="1.4" opacity="0.82"/>
  <ellipse cx="24" cy="12" rx="15.5" ry="4.4" fill="none" stroke="#ffffff" stroke-width="1.3" opacity="0.72"/>
</svg>""")

# Front pixel-art water meniscus + frothy white crest + splash droplets (renders OVER the waterline seam!)
write("swim-front.svg", """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 22">
  <!-- Rich translucent lower water-surface meniscus seamlessly masking the submerged lower body -->
  <path d="M4,11.5 Q12,9.2 19,11.5 Q24,13.4 29,11.5 Q36,9.2 44,11.5 Q43,18.2 24,19.4 Q5,18.2 4,11.5 Z"
        fill="#0284c7" opacity="0.46"/>
  <path d="M7,12.2 Q15,10.8 24,12.2 Q33,10.8 41,12.2 Q39,17.0 24,17.8 Q9,17.0 7,12.2 Z"
        fill="#38bdf8" opacity="0.44"/>
  <!-- Crisp pixel-style white foam collar right along the waterline -->
  <path d="M6.5,11.2 Q11.5,8.2 16.5,10.8 Q20.5,12.6 24,10.0 Q27.5,12.6 31.5,10.8 Q36.5,8.2 41.5,11.2"
        fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" opacity="0.96"/>
  <!-- Secondary shimmering ripple arc underneath foam -->
  <path d="M10.5,15.2 Q17.5,17.4 24,16.4 Q30.5,17.4 37.5,15.2"
        fill="none" stroke="#e0f2fe" stroke-width="1.4" stroke-linecap="round" opacity="0.90"/>
  <!-- Lively pixel water splash droplets kicking up on left & right sides! -->
  <rect x="3.5" y="6" width="2.6" height="2.6" rx="1" fill="#ffffff" opacity="0.95"/>
  <rect x="7.8" y="3.2" width="2.2" height="2.8" rx="0.9" fill="#e0f2fe" opacity="0.90"/>
  <rect x="41.8" y="6" width="2.6" height="2.6" rx="1" fill="#ffffff" opacity="0.95"/>
  <rect x="38" y="3.2" width="2.2" height="2.8" rx="0.9" fill="#e0f2fe" opacity="0.90"/>
  <rect x="14.5" y="6.8" width="2" height="1.8" rx="0.8" fill="#ffffff" opacity="0.88"/>
  <rect x="31.5" y="6.8" width="2" height="1.8" rx="0.8" fill="#ffffff" opacity="0.88"/>
</svg>""")

# ---- 5. Pixel-Art Ground/Rock Burrowing Dirt Mound & Clods (wraps around half-buried Pokemon!) ----
write("burrow-back.svg", """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 20">
  <ellipse cx="24" cy="12" rx="20" ry="6.2" fill="#3f2716" opacity="0.58"/>
  <ellipse cx="24" cy="11.5" rx="16.5" ry="4.5" fill="#29180d" opacity="0.82"/>
</svg>""")

write("burrow-front.svg", """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 20">
  <!-- Rich dug-up pixel earth mound wrapping around the Pokemon's lower half -->
  <path d="M5,13 Q9,8.5 14,10.5 Q19,7.5 24,10 Q29,7.5 34,10.5 Q39,8.5 43,13 Q42,17.8 24,18.2 Q6,17.8 5,13 Z"
        fill="#7c4d2b" stroke="#452712" stroke-width="1.3" stroke-linejoin="round"/>
  <!-- Lighter sunlit soil highlights & pebbles -->
  <path d="M8.5,12.5 Q13,10.2 17.5,12.2 Q24,10.5 30.5,12.2 Q35,10.2 39.5,12.5"
        fill="none" stroke="#b07546" stroke-width="1.6" stroke-linecap="round"/>
  <rect x="13" y="13.5" width="3.2" height="2.2" rx="0.8" fill="#59341a"/>
  <rect x="23" y="14.2" width="3.5" height="2.2" rx="0.8" fill="#a1683c"/>
  <rect x="32.5" y="13.2" width="3" height="2.2" rx="0.8" fill="#59341a"/>
  <!-- Kicked-up dirt clods & rock pebbles -->
  <rect x="4" y="6.5" width="2.6" height="2.4" rx="0.8" fill="#8f5b34" stroke="#452712" stroke-width="0.6"/>
  <rect x="9" y="4" width="2.2" height="2.2" rx="0.8" fill="#b07546"/>
  <rect x="41.5" y="6.5" width="2.6" height="2.4" rx="0.8" fill="#8f5b34" stroke="#452712" stroke-width="0.6"/>
  <rect x="37" y="4" width="2.2" height="2.2" rx="0.8" fill="#b07546"/>
</svg>""")

# ---- 6. KOF / Arcade-Style Dynamic Slashed VS Emblem (Pure baked vector polygons, zero SVG transforms!) ----
write("vs-emblem.svg", """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 110">
  <!-- Diagonal arcade lightning slash & energy flare behind VS -->
  <polygon points="104,4 116,4 66,54 88,54 34,106 22,106 68,58 46,58" fill="#facc15" opacity="0.92"/>
  <polygon points="108,8 113,8 65,55 82,55 32,102 27,102 70,57 52,57" fill="#fef08a"/>
  <!-- Outer fiery crimson-orange energy shards -->
  <polygon points="16,24 44,18 32,34" fill="#ef4444" opacity="0.85"/>
  <polygon points="124,86 96,92 108,76" fill="#3b82f6" opacity="0.85"/>
  <polygon points="12,68 34,62 24,74" fill="#f97316" opacity="0.8"/>
  <polygon points="128,40 106,46 116,34" fill="#38bdf8" opacity="0.8"/>

  <!-- Hard arcade drop shadow under VS letters -->
  <polygon points="18,22 39,22 48,64 66,22 84,22 54,90 36,90" fill="#090d16" opacity="0.88"/>
  <path d="M126,28 L120,42 L95,42 L92,50 L114,50 C123,50 128,57 125,68 L121,81 C118,89 111,94 100,94 L66,94 L72,80 L99,80 L103,70 L82,70 C73,70 68,63 71,52 L75,39 C78,31 85,26 96,26 Z" fill="#090d16" opacity="0.88"/>

  <!-- Bold italicized 'V' (metallic gold-crimson bevel) -->
  <polygon points="14,18 36,18 45,62 64,18 83,18 52,86 33,86" fill="#dc2626" stroke="#111827" stroke-width="4.5" stroke-linejoin="round"/>
  <polygon points="18,21 34,21 44,68 65,21 79,21 50,82 36,82" fill="#f97316"/>
  <!-- Upper gold metallic sheen facets on left & right arms of 'V' (clean open V-notch!) -->
  <polygon points="18,21 34,21 40,52 27,52" fill="#facc15"/>
  <polygon points="65,21 79,21 63,52 51,52" fill="#facc15"/>
  <polygon points="20,23 32,23 35,34 25,34" fill="#fef9c3" opacity="0.9"/>
  <polygon points="66,23 76,23 70,34 61,34" fill="#fef9c3" opacity="0.9"/>

  <!-- Bold italicized 'S' overlapping dynamically with 'V' -->
  <path d="M123,24 L117,39 L92,39 L89,47 L111,47 C120,47 125,54 122,65 L118,78 C115,86 108,91 97,91 L63,91 L69,76 L96,76 L100,66 L79,66 C70,66 65,59 68,48 L72,35 C75,27 82,22 93,22 Z"
        fill="#dc2626" stroke="#111827" stroke-width="4.5" stroke-linejoin="round"/>
  <path d="M120,26 L115,37 L90,37 L86,49 L110,49 C117,49 121,55 119,64 L115,76 C113,83 107,87 97,87 L67,87 L72,78 L98,78 L103,64 L80,64 C73,64 69,58 71,49 L75,37 C77,30 83,26 93,26 Z"
        fill="#f97316"/>
  <!-- Metallic gold upper highlight on 'S' -->
  <path d="M120,26 L115,37 L90,37 L86,49 L110,49 C115,49 118,52 119,56 L72,56 C70,54 70,51 71,49 L75,37 C77,30 83,26 93,26 Z"
        fill="#facc15"/>
  <polygon points="82,29 115,29 112,34 79,34" fill="#fef9c3" opacity="0.9"/>

  <!-- Crisp spark highlights -->
  <polygon points="62,48 68,44 65,51 71,54 64,55 61,61 59,54 53,51 60,50" fill="#ffffff"/>
  <circle cx="24" cy="84" r="2.2" fill="#fef08a"/>
  <circle cx="122" cy="18" r="2.4" fill="#fef08a"/>
</svg>""")

# ---- 7. Ultra-Lightweight Move-Level Battle FX SVGs (~1KB each, zero runtime bloat!) ----
write_fx("bolt.svg", """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 48">
  <polygon points="22,2 8,24 17,24 11,46 30,20 20,20" fill="#facc15" stroke="#b45309" stroke-width="2" stroke-linejoin="round"/>
  <polygon points="21,6 12,22 19,22 15,39 26,22 19,22" fill="#fef9c3"/>
</svg>""")

write_fx("wave.svg", """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 32">
  <path d="M4,26 C10,8 24,4 38,10 C32,12 31,18 44,24 C32,29 14,30 4,26 Z" fill="#0ea5e9" stroke="#0369a1" stroke-width="2" stroke-linejoin="round"/>
  <path d="M9,21 C15,10 25,8 35,12" fill="none" stroke="#e0f2fe" stroke-width="2.6" stroke-linecap="round"/>
  <circle cx="38" cy="10" r="2.5" fill="#ffffff"/>
  <circle cx="43" cy="16" r="1.8" fill="#bae6fd"/>
</svg>""")

write_fx("bubble.svg", """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36">
  <circle cx="18" cy="18" r="14" fill="#38bdf8" stroke="#0284c7" stroke-width="2.2"/>
  <circle cx="18" cy="18" r="10" fill="#7dd3fc" opacity="0.7"/>
  <ellipse cx="13" cy="12" rx="4" ry="2.5" fill="#ffffff" opacity="0.92"/>
  <circle cx="24" cy="24" r="2" fill="#e0f2fe" opacity="0.85"/>
</svg>""")

write_fx("ice.svg", """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36">
  <polygon points="18,2 30,18 18,34 6,18" fill="#67e8f9" stroke="#0891b2" stroke-width="2" stroke-linejoin="round"/>
  <polygon points="18,6 25,18 18,30 11,18" fill="#cffafe"/>
  <polygon points="18,8 21,18 18,22 15,18" fill="#ffffff"/>
</svg>""")

write_fx("slash.svg", """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 44 44">
  <path d="M6,36 Q20,20 38,6 Q26,24 10,40 Z" fill="#ffffff" stroke="#ef4444" stroke-width="2" stroke-linejoin="round"/>
  <path d="M8,8 Q22,20 38,36 Q20,24 6,12 Z" fill="#fef08a" stroke="#ea580c" stroke-width="1.8" stroke-linejoin="round"/>
  <circle cx="22" cy="22" r="4" fill="#ffffff"/>
</svg>""")

write_fx("beam.svg", """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">
  <circle cx="20" cy="20" r="16" fill="#fde047" opacity="0.45"/>
  <circle cx="20" cy="20" r="11" fill="#f97316" stroke="#ffffff" stroke-width="2"/>
  <circle cx="20" cy="20" r="6" fill="#ffffff"/>
</svg>""")

write_fx("rock.svg", """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36">
  <polygon points="6,28 10,12 22,6 32,16 28,30 14,32" fill="#a16207" stroke="#451a03" stroke-width="2.2" stroke-linejoin="round"/>
  <polygon points="11,14 21,9 28,16 20,20" fill="#d97706"/>
  <polygon points="14,13 20,10 23,14 17,16" fill="#fde68a" opacity="0.7"/>
</svg>""")

write_fx("heal.svg", """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <circle cx="16" cy="16" r="12" fill="#4ade80" opacity="0.32"/>
  <path d="M13,6 H19 V13 H26 V19 H19 V26 H13 V19 H6 V13 H13 Z" fill="#22c55e" stroke="#14532d" stroke-width="1.5" stroke-linejoin="round"/>
  <path d="M14.5,8.5 H17.5 V14.5 H23.5 V17.5 H17.5 V23.5 H14.5 V17.5 H8.5 V14.5 H14.5 Z" fill="#bbf7d0"/>
</svg>""")

write_fx("buff.svg", """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36">
  <polygon points="18,4 31,18 24,18 24,31 12,31 12,18 5,18" fill="#facc15" stroke="#b45309" stroke-width="2" stroke-linejoin="round"/>
  <polygon points="18,8 26,17 21,17 21,28 15,28 15,17 10,17" fill="#fef9c3"/>
</svg>""")

write_fx("shield.svg", """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 56 56">
  <polygon points="28,4 49,16 49,40 28,52 7,40 7,16" fill="#38bdf8" opacity="0.28" stroke="#bae6fd" stroke-width="2.6" stroke-linejoin="round"/>
  <polygon points="28,11 43,20 43,36 28,45 13,36 13,20" fill="none" stroke="#ffffff" stroke-width="1.6" opacity="0.85"/>
  <path d="M18,22 L28,16 L38,22" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round"/>
</svg>""")

print("Generated 45-deg side-opening Poke Ball icons + 12 minimalist biome/weather icons + swim/burrow/VS + 10 move FX SVGs!")
