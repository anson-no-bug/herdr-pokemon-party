#!/usr/bin/env python3
"""Generates crisp pixel-art SVG assets for the herdr-pokemon theme:
- 10 iconic Poke Balls (closed + open/glowing variants)
- Pixel-art Pokemon UI icons (tinted & full-color)
- Interactive habitat props (tall grass, berries, attack VFX, emotes)
- Multi-layer biome scenery (Pallet Meadow, Cerulean Lake, Ecruteak Autumn, Mt. Moon Night)
- Layout preview SVG
"""
import os

ROOT = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.join(ROOT, "mods", "herdr-pokemon", "assets")
BALLS_DIR = os.path.join(ASSETS, "balls")
ICONS_DIR = os.path.join(ASSETS, "icons")
SCENES_DIR = os.path.join(ASSETS, "scenes")
FX_DIR = os.path.join(ASSETS, "fx")
LAYOUTS_DIR = os.path.join(ROOT, "layouts")

for d in (BALLS_DIR, ICONS_DIR, SCENES_DIR, FX_DIR, LAYOUTS_DIR):
    os.makedirs(d, exist_ok=True)


def write(path, content):
    with open(path, "w", encoding="utf-8") as f:
        f.write(content.strip() + "\n")


def grid_svg(rows, palette, view_w=None, view_h=None):
    h = view_h or len(rows)
    w = view_w or max(len(r) for r in rows)
    rects = []
    for y, row in enumerate(rows):
        x = 0
        while x < len(row):
            ch = row[x]
            if ch in (".", " "):
                x += 1
                continue
            color = palette.get(ch)
            if not color:
                x += 1
                continue
            x2 = x + 1
            while x2 < len(row) and row[x2] == ch:
                x2 += 1
            rects.append(f'<rect x="{x}" y="{y}" width="{x2-x}" height="1" fill="{color}"/>')
            x = x2
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" shape-rendering="crispEdges">\n'
        + "\n".join("  " + r for r in rects)
        + "\n</svg>"
    )


# ---- 1. 10 Iconic Pixel-Art Poke Balls (16x16) ----

BALL_GRID = [
    ".....oooooo.....",
    "...ooTTTTTToo...",
    "..oTThhTTTTTTo..",
    ".oTThhTTTTTTTTTo",
    ".oTTTTTTTTTTTddo",
    "oTTTTTTTTTTTTddo",
    "oTTTTTooooTTTddo",
    "oooooooCCooooooo",
    "oBBBBBoCCoBBBBBo",
    "oBBBBBoCCoBBBBBo",
    "oBBBBBBooBBBBsso",
    ".oBBBBBBBBBBsso.",
    ".oBBBBBBBBBBsso.",
    "..oBBBBBBBBsso..",
    "...ooBBBBssoo...",
    ".....oooooo.....",
]

# Variants with special top markings
BALL_MARKINGS = {
    "great": [
        ".....oooooo.....",
        "...ooTTTTTToo...",
        "..oAATTTThTTAAo.",
        ".oAAhTTTTTTTAAo.",
        ".oATTTTTTTTTddo.",
        "oTTTTTTTTTTTTddo",
        "oTTTTTooooTTTddo",
        "oooooooCCooooooo",
        "oBBBBBoCCoBBBBBo",
        "oBBBBBoCCoBBBBBo",
        "oBBBBBBooBBBBsso",
        ".oBBBBBBBBBBsso.",
        ".oBBBBBBBBBBsso.",
        "..oBBBBBBBBsso..",
        "...ooBBBBssoo...",
        ".....oooooo.....",
    ],
    "ultra": [
        ".....oooooo.....",
        "...ooTAAAAToo...",
        "..oTTAATThTTTo..",
        ".oTTAAhTTTTTAAo.",
        ".oTTAAATTTAAddo.",
        "oTTTAAATTTTAddo.",
        "oTTTTTooooTTTddo",
        "oooooooCCooooooo",
        "oBBBBBoCCoBBBBBo",
        "oBBBBBoCCoBBBBBo",
        "oBBBBBBooBBBBsso",
        ".oBBBBBBBBBBsso.",
        ".oBBBBBBBBBBsso.",
        "..oBBBBBBBBsso..",
        "...ooBBBBssoo...",
        ".....oooooo.....",
    ],
    "master": [
        ".....oooooo.....",
        "...ooTTTTTToo...",
        "..oAAhTTThTAAo..",
        ".oAAATTTTTTAAAo.",
        ".oAATWTTTTWTddo.",
        "oTTTWWTWTWWTddo.",
        "oTTTTTooooTTTddo",
        "oooooooCCooooooo",
        "oBBBBBoCCoBBBBBo",
        "oBBBBBoCCoBBBBBo",
        "oBBBBBBooBBBBsso",
        ".oBBBBBBBBBBsso.",
        ".oBBBBBBBBBBsso.",
        "..oBBBBBBBBsso..",
        "...ooBBBBssoo...",
        ".....oooooo.....",
    ],
    "luxury": [
        ".....oooooo.....",
        "...ooTTTTTToo...",
        "..oTTAAAAAAATo..",
        ".oTTAhTTTTTTATo.",
        ".oTTTTTTTTTTTddo",
        "oAAAAAAAAAAAAAdd",
        "oTTTTTooooTTTddo",
        "oAAAAAoCCoAAAAAo",
        "oBBBBBoCCoBBBBBo",
        "oBBBBBoCCoBBBBBo",
        "oBBBBBBooBBBBsso",
        ".oBBBBBBBBBBsso.",
        ".oBBBBBBBBBBsso.",
        "..oBBBBBBBBsso..",
        "...ooBBBBssoo...",
        ".....oooooo.....",
    ],
    "nest": [
        ".....oooooo.....",
        "...ooTTTTTToo...",
        "..oTThhTTTTTTo..",
        ".oTTAAAAAAATTTTo",
        ".oTTTTTTTTTTTddo",
        "oTTTAAAAAAATTddo",
        "oTTTTTooooTTTddo",
        "oooooooCCooooooo",
        "oBBBBBoCCoBBBBBo",
        "oBBBBBoCCoBBBBBo",
        "oBBBBBBooBBBBsso",
        ".oBBBBBBBBBBsso.",
        ".oBBBBBBBBBBsso.",
        "..oBBBBBBBBsso..",
        "...ooBBBBssoo...",
        ".....oooooo.....",
    ],
    "dusk": [
        ".....oooooo.....",
        "...ooTTTTTToo...",
        "..oTThhAAATTTTo.",
        ".oTThTAAAATTTTTo",
        ".oTTTAAAAAATTddo",
        "oTTTTTAAAATTTddo",
        "oTTTTTooooTTTddo",
        "oAAAAAoCCoAAAAAo",
        "oBBBBBoCCoBBBBBo",
        "oBBBBBoCCoBBBBBo",
        "oBBBBBBooBBBBsso",
        ".oBBBBBBBBBBsso.",
        ".oBBBBBBBBBBsso.",
        "..oBBBBBBBBsso..",
        "...ooBBBBssoo...",
        ".....oooooo.....",
    ],
    "dive": [
        ".....oooooo.....",
        "...ooTTTTTToo...",
        "..oTThhTTTTTTo..",
        ".oTThTTTTTTTTTTo",
        ".oTAAATTTAAATTdo",
        "oTAAAATTTTAAAddo",
        "oTTTTTooooTTTddo",
        "oooooooCCooooooo",
        "oBBBBBoCCoBBBBBo",
        "oBBBBBoCCoBBBBBo",
        "oBBBBBBooBBBBsso",
        ".oBBBBBBBBBBsso.",
        ".oBBBBBBBBBBsso.",
        "..oBBBBBBBBsso..",
        "...ooBBBBssoo...",
        ".....oooooo.....",
    ],
    "heal": [
        ".....oooooo.....",
        "...ooTTTTTToo...",
        "..oTThhTTTTTTo..",
        ".oTAAhTTTTTAATTo",
        ".oTAAATTTAAATTdo",
        "oTTTTTTTTTTTTddo",
        "oTTTTTooooTTTddo",
        "oBBBBBoCCoBBBBBo",
        "oAAAAAoCCoAAAAAo",
        "oBBBBBoCCoBBBBBo",
        "oBBBBBBooBBBBsso",
        ".oBBBBBBBBBBsso.",
        ".oBBBBBBBBBBsso.",
        "..oBBBBBBBBsso..",
        "...ooBBBBssoo...",
        ".....oooooo.....",
    ],
}

BALL_STYLES = {
    "poke":    {"o": "#22242c", "T": "#e04646", "h": "#ff8f8f", "d": "#b42b2b", "B": "#f6f5ef", "s": "#cfd3d8", "C": "#ffffff", "A": "#e04646", "W": "#ffffff"},
    "great":   {"o": "#22242c", "T": "#3a7bd5", "h": "#7db5ff", "d": "#2557a1", "B": "#f6f5ef", "s": "#cfd3d8", "C": "#ffffff", "A": "#e64545", "W": "#ffffff"},
    "ultra":   {"o": "#22242c", "T": "#3b3e4a", "h": "#676c7e", "d": "#262830", "B": "#f6f5ef", "s": "#cfd3d8", "C": "#ffffff", "A": "#f2c138", "W": "#ffffff"},
    "master":  {"o": "#22242c", "T": "#7d4bc6", "h": "#b084f5", "d": "#572f94", "B": "#f6f5ef", "s": "#cfd3d8", "C": "#ffffff", "A": "#e85ba8", "W": "#ffffff"},
    "premier": {"o": "#22242c", "T": "#f7f6f0", "h": "#ffffff", "d": "#d8dae0", "B": "#f7f6f0", "s": "#cfd3d8", "C": "#e84848", "A": "#e84848", "W": "#ffffff"},
    "heal":    {"o": "#22242c", "T": "#f28cb6", "h": "#ffc2dc", "d": "#cc5e8c", "B": "#fce8f1", "s": "#e2bfd0", "C": "#80d6ff", "A": "#f5d76e", "W": "#ffffff"},
    "dive":    {"o": "#22242c", "T": "#3aa6d6", "h": "#8ce0ff", "d": "#247ba3", "B": "#d8f4ff", "s": "#9ed4ea", "C": "#ffffff", "A": "#226597", "W": "#ffffff"},
    "dusk":    {"o": "#1c1f24", "T": "#2f7d4d", "h": "#5ec284", "d": "#1d5232", "B": "#2b303a", "s": "#1c2028", "C": "#f0a030", "A": "#d44b3e", "W": "#ffffff"},
    "luxury":  {"o": "#1c1d22", "T": "#343742", "h": "#63687a", "d": "#22242b", "B": "#2b2d36", "s": "#1e2028", "C": "#f5c542", "A": "#e04b4b", "W": "#f5c542"},
    "nest":    {"o": "#22242c", "T": "#5da652", "h": "#9be08e", "d": "#3c7a33", "B": "#f6f2df", "s": "#d5cfb4", "C": "#ffffff", "A": "#e8c448", "W": "#ffffff"},
}

OPEN_OVERLAY = [
    ".....oooooo.....",
    "...ooTTTTTToo...",
    "..oTThhTTTTTTo..",
    ".oTThhTTTTTTddo.",
    ".oooooooooooooo.",
    "oGGGGGGGGGGGGGG.",
    "oGggggggggggggGo",
    "oooooooCCooooooo",
    "oBBBBBoCCoBBBBBo",
    "oBBBBBoCCoBBBBBo",
    "oBBBBBBooBBBBsso",
    ".oBBBBBBBBBBsso.",
    ".oBBBBBBBBBBsso.",
    "..oBBBBBBBBsso..",
    "...ooBBBBssoo...",
    ".....oooooo.....",
]

for name, pal in BALL_STYLES.items():
    grid = BALL_MARKINGS.get(name, BALL_GRID)
    if name == "premier":
        # Premier ball has a signature crimson band
        p = dict(pal)
        p["R"] = "#e04646"
        g = [row.replace("oooooooCCooooooo", "oRRRRRoCCoRRRRRo") for row in grid]
        write(os.path.join(BALLS_DIR, f"{name}.svg"), grid_svg(g, p))
    else:
        write(os.path.join(BALLS_DIR, f"{name}.svg"), grid_svg(grid, pal))
    pal_open = dict(pal, G="#fff5b8", g="#ffffff", C="#ffe46b")
    write(os.path.join(BALLS_DIR, f"{name}-open.svg"), grid_svg(OPEN_OVERLAY, pal_open))


# ---- 2. Pixel-Art Pokemon UI Icons (16x16) ----

COLOR_ICONS = {
    # Trainer's Bag (for Files panel)
    "bag": (
        [
            ".....oooooo.....",
            "....oBBBBBBoo...",
            "...oB......BBo..",
            "..ooBBBBBBBBoo..",
            ".oRRRRRRRRRRRRo.",
            ".oRhhRRRRRRRddo.",
            "oRRRRRYYYYRRRddo",
            "oRRRRRYyyYRRRddo",
            "oRooooYYYYoooRdo",
            "oRRRRRRRRRRRRddo",
            "oRRddRRRRRRddddo",
            "oRRRRRRRRRRRRddo",
            ".oRRRRRRRRRRddo.",
            ".oRRRRRRRRRRddo.",
            "..oooooooooooo..",
            "................",
        ],
        {"o": "#2b2520", "R": "#d9534f", "h": "#ff9995", "d": "#a83330", "B": "#7c5838", "Y": "#f4c94b", "y": "#fff2a6"},
    ),
    # VS Seeker / Battle Log (for Changes panel)
    "vs": (
        [
            "................",
            "..oooooooooooo..",
            ".oBBBBBBBBBBBBo.",
            ".oBhhBBBBBBBddo.",
            "oBBooooooooooBdo",
            "oBBoDDDDDDDDooBo",
            "oBBoDY.YD.YYooBo",
            "oBBoDY.YDY..ooBo",
            "oBBoD.Y.D.Y.ooBo",
            "oBBoD.Y.DDY.ooBo",
            "oBBoDDDDDDDDooBo",
            "oBBooooooooooBdo",
            ".oBBBrrBggBBddo.",
            ".oBBBBBBBBBBddo.",
            "..oooooooooooo..",
            "................",
        ],
        {"o": "#222530", "B": "#3d78c9", "h": "#7db8ff", "d": "#275291", "D": "#1d2938", "Y": "#ffd94a", "r": "#e84c4c", "g": "#4cc970"},
    ),
    # Pokedex (for Brand / Search)
    "pokedex": (
        [
            "..ooooooooooo...",
            ".oRRRRRRRRRRRo..",
            ".oRooRRrryyRRo..",
            ".oRoBoRRRRRRdo..",
            ".oRooRRRRRRRdo..",
            ".oRRRRRRRRRRdo..",
            ".oRooooooooRdo..",
            ".oRoSSSSSSoRdo..",
            ".oRoSssssSoRdo..",
            ".oRoSssssSoRdo..",
            ".oRooooooooRdo..",
            ".oRRRddRRRRddo..",
            ".oRRddddRRRddo..",
            ".oRRRddRRRRddo..",
            "..ooooooooooo...",
            "................",
        ],
        {"o": "#261d1d", "R": "#d93b3b", "d": "#a62424", "B": "#46b8ff", "r": "#ff7070", "y": "#ffd94a", "S": "#9be3a8", "s": "#d4f7da"},
    ),
    # Poke Center (for Settings)
    "pokecenter": (
        [
            "....oooooooo....",
            "..ooRRRRRRRRo...",
            ".oRRhhRRRRRRdo..",
            "oRRRRRWWWWRRRdo.",
            "oRRRRWWPPWWRRdo.",
            "oRRRRRWWWWRRRdo.",
            "ooooooooooooooo.",
            "oWWWWWWWWWWWWWo.",
            "oWWBBBWWBBBWWWo.",
            "oWWBBBWWBBBWWWo.",
            "oWWWWWWWWWWWWWo.",
            "oWWWWooooWWWWWo.",
            "oWWWooBBooWWWWo.",
            "oWWWooBBooWWWWo.",
            "ooooooooooooooo.",
            "................",
        ],
        {"o": "#2b2520", "R": "#e04848", "h": "#ff9696", "d": "#b02a2a", "W": "#f8f4e8", "P": "#e04848", "B": "#75c6eb"},
    ),
    # Link Cable (for Add Machine)
    "link": (
        [
            "................",
            "....ooooo.......",
            "...oGGGGGoo.....",
            "...oGyyGGGo.....",
            "...oGGGGGGoo....",
            "....oooGGoo.....",
            "......oGGo......",
            ".....oGGo.......",
            "....oGGo........",
            "...oGGo.........",
            "..ooGGooo.......",
            ".oGGGGGGo.......",
            ".oGyyGGGo.......",
            ".oGGGGGGo.......",
            "..oooooo........",
            "................",
        ],
        {"o": "#232733", "G": "#6f7b91", "y": "#ffd94a"},
    ),
    # Oran Berry (Blue)
    "berry-oran": (
        [
            "......ooo.......",
            ".....oGGGo......",
            "....oGGgGGo.....",
            ".....ooGoo......",
            "...oooBBBooo....",
            "..oBBhhBBBBBo...",
            ".oBBhhBBBBBBdo..",
            ".oBBBBBBBBBBdo..",
            ".oBBBBBBBBBBdo..",
            ".oBBBBBBBBBddo..",
            "..oBBBBBBBddo...",
            "...oBBBBBddo....",
            "....ooooooo.....",
        ],
        {"o": "#1d2738", "G": "#4ca84c", "g": "#8ae077", "B": "#3b8beb", "h": "#94d0ff", "d": "#245da8"},
    ),
    # Sitrus Berry (Gold)
    "berry-sitrus": (
        [
            "......ooo.......",
            ".....oGGGo......",
            "....oGGgGGo.....",
            ".....ooGoo......",
            "....ooYYYoo.....",
            "...oYYhhYYYo....",
            "..oYYhhYYYYdo...",
            ".oYYYYYYYYYYdo..",
            ".oYYYYYYYYYYdo..",
            ".oYYYYYYYYYddo..",
            "..oYYYYYYYddo...",
            "...oYYYYYddo....",
            "....ooooooo.....",
        ],
        {"o": "#302410", "G": "#4ca84c", "g": "#8ae077", "Y": "#f2be38", "h": "#fff09c", "d": "#c78d1c"},
    ),
    # Pecha Berry (Pink)
    "berry-pecha": (
        [
            "......ooo.......",
            ".....oGGGo......",
            "....oGGgGGo.....",
            ".....ooGoo......",
            "...ooPPPPPoo....",
            "..oPPhhPPPPPo...",
            ".oPPhhPPPPPPdo..",
            ".oPPPPPPPPPPdo..",
            "..oPPPPPPPPddo..",
            "...oPPPPPPddo...",
            "....oPPPPddo....",
            ".....oPPddo.....",
            "......oooo......",
        ],
        {"o": "#361c28", "G": "#4ca84c", "g": "#8ae077", "P": "#f278a8", "h": "#ffc4dc", "d": "#c94b7d"},
    ),
    # Tall Grass tuft (normal & rustled)
    "grass": (
        [
            "....o.....o.....",
            "...oGo...oGo..o.",
            ".o.oGo..oGGooGo.",
            "oGooGGo.oGgoGGo.",
            "oGgoGGooGgooGgo.",
            "oGgoGGgoGgooGgo.",
            "oGGgGGggGGgoGGo.",
            "oDDDDDDDDDDDDDo.",
            ".ooooooooooooo..",
        ],
        {"o": "#1d4222", "G": "#48a848", "g": "#7ee068", "D": "#2e7535"},
    ),
    "grass-rustle": (
        [
            "..o.......o.....",
            ".oGo...o..oGo...",
            "oGgo..oGo..oGo..",
            ".oGgo.oGgo.oGgo.",
            "..oGGooGGooGGo..",
            ".oGGggGGggGGgo..",
            "oGGGgGGGGgGGGgo.",
            "oDDDDDDDDDDDDDo.",
            ".ooooooooooooo..",
        ],
        {"o": "#1d4222", "G": "#5cc454", "g": "#a6f28a", "D": "#34853c"},
    ),
    # Crossed Swords (Sparring)
    "swords": (
        [
            ".oo........oo...",
            "oSSo......oSSo..",
            ".oSSo....oSSo...",
            "..oSSo..oSSo....",
            "...oSSooSSo.....",
            "....oSSSSo......",
            "...oSSooSSo.....",
            "..oSSo..oSSo....",
            ".oGGGo..oGGGo...",
            "..oGo....oGo....",
            ".oBo......oBo...",
            "..o........o....",
        ],
        {"o": "#22242c", "S": "#e8eef5", "G": "#f2c138", "B": "#a85c32"},
    ),
    # Heart Emote
    "heart": (
        [
            "..ooo...ooo..",
            ".oRRRo.oRRRo.",
            "oRhRRRoRRRRRo",
            "oRhRRRRRRRRdo",
            "oRRRRRRRRRRdo",
            ".oRRRRRRRRdo.",
            "..oRRRRRRdo..",
            "...oRRRRdo...",
            "....oRRdo....",
            ".....odo.....",
            "......o......",
        ],
        {"o": "#3b1720", "R": "#f04868", "h": "#ff9eb2", "d": "#bd2445"},
    ),
    # Music Note Emote
    "music": (
        [
            "......oooooo.",
            ".....oYYYYYYo",
            ".....oYYooYYo",
            ".....oYYooYYo",
            ".....oYo..oYo",
            "....ooYo.ooYo",
            "...oYYYo.oYYo",
            "...oYYYo.oYYo",
            "....ooo...oo.",
        ],
        {"o": "#2c2210", "Y": "#ffd24a"},
    ),
}

for name, (grid, pal) in COLOR_ICONS.items():
    write(os.path.join(ICONS_DIR, f"{name}.svg"), grid_svg(grid, pal))

# Monochrome tinted pixel icons (currentColor) for crisp buttons/indicators
MONO_ICONS = {
    "plus": [
        "................",
        "......oooo......",
        "......oooo......",
        "......oooo......",
        "......oooo......",
        "..oooooooooooo..",
        "..oooooooooooo..",
        "..oooooooooooo..",
        "..oooooooooooo..",
        "......oooo......",
        "......oooo......",
        "......oooo......",
        "......oooo......",
        "................",
    ],
    "close": [
        "................",
        "..ooo......ooo..",
        "..oooo....oooo..",
        "...oooo..oooo...",
        "....oooooooo....",
        ".....oooooo.....",
        ".....oooooo.....",
        "....oooooooo....",
        "...oooo..oooo...",
        "..oooo....oooo..",
        "..ooo......ooo..",
        "................",
    ],
    "cursor": [
        "oo......",
        "oooo....",
        "oooooo..",
        "oooooooo",
        "oooooo..",
        "oooo....",
        "oo......",
    ],
    "search": [
        "....oooooo......",
        "..oo......oo....",
        ".o..........o...",
        ".o..........o...",
        ".o..........o...",
        ".o..........o...",
        "..oo......oo....",
        "....oooooo..oo..",
        "............ooo.",
        ".............ooo",
        "..............oo",
    ],
    "sidebar": [
        "oooooooooooooo",
        "oo...oo.....oo",
        "oo...oo.....oo",
        "oo...oo.....oo",
        "oo...oo.....oo",
        "oo...oo.....oo",
        "oo...oo.....oo",
        "oo...oo.....oo",
        "oo...oo.....oo",
        "oooooooooooooo",
    ],
    "branch": [
        "..ooo......ooo..",
        ".oo.oo....oo.oo.",
        "..ooo......ooo..",
        "...oo......oo...",
        "...oo.....oo....",
        "...oo...ooo.....",
        "...oooooo.......",
        "...oo...........",
        "..ooo...........",
        ".oo.oo..........",
        "..ooo...........",
    ],
    "chevron-down": [
        "..........",
        "oo......oo",
        ".oo....oo.",
        "..oo..oo..",
        "...oooo...",
        "....oo....",
        "..........",
    ],
    "chevron-right": [
        "..oo......",
        "..ooo.....",
        "...ooo....",
        "....ooo...",
        "...ooo....",
        "..ooo.....",
        "..oo......",
    ],
    "pokeball-mono": [
        "....oooooo....",
        "..oo......oo..",
        ".o..........o.",
        ".o..........o.",
        "o....oooo....o",
        "ooooo....ooooo",
        "o....oooo....o",
        ".o..........o.",
        ".o..........o.",
        "..oo......oo..",
        "....oooooo....",
    ],
    "split-r": [
        "oooooooooooooo",
        "oo....oo....oo",
        "oo....oo....oo",
        "oo....oo....oo",
        "oo....oo....oo",
        "oo....oo....oo",
        "oo....oo....oo",
        "oo....oo....oo",
        "oooooooooooooo",
    ],
    "split-d": [
        "oooooooooooooo",
        "oo..........oo",
        "oo..........oo",
        "oo..........oo",
        "oooooooooooooo",
        "oo..........oo",
        "oo..........oo",
        "oo..........oo",
        "oooooooooooooo",
    ],
    "zoom": [
        "oooo....oooo",
        "oo........oo",
        "............",
        "............",
        "oo........oo",
        "oooo....oooo",
    ],
}

for name, grid in MONO_ICONS.items():
    write(os.path.join(ICONS_DIR, f"{name}.svg"), grid_svg(grid, {"o": "currentColor"}))


# ---- 3. Attack VFX Pixel SVGs (for Pokemon Sparring!) ----

FX_SPRITES = {
    "fire": (
        [
            ".....oo.....",
            "....oRRo....",
            "...oRYYRo...",
            "..oRRYYRRo..",
            ".oRRYWWYRRo.",
            ".oRYYWWYYRo.",
            "..oRYYYYRo..",
            "...oRRRRo...",
            "....oooo....",
        ],
        {"o": "#59170b", "R": "#f04e23", "Y": "#ffbd2e", "W": "#fff7cc"},
    ),
    "water": (
        [
            ".....oo.....",
            "....oBBo....",
            "...oBhhBo...",
            "..oBBhBBBo..",
            ".oBBhBBBBBo.",
            ".oBBBBBBBdo.",
            "..oBBBBBdo..",
            "...ooBBoo...",
            ".....oo.....",
        ],
        {"o": "#143c66", "B": "#3ea8f5", "h": "#b8ecff", "d": "#246eb8"},
    ),
    "electric": (
        [
            ".....oooo...",
            "....oYYYo...",
            "...oYYWo....",
            "..oYYWoooo..",
            ".oYYYYYYYYo.",
            "..ooooWYYo..",
            ".....oYYo...",
            "....oYYo....",
            "...ooo......",
        ],
        {"o": "#4d3500", "Y": "#ffe033", "W": "#ffffff"},
    ),
    "grass": (
        [
            ".......ooo..",
            ".....ooGGGo.",
            "...ooGggGGo.",
            "..oGGgGGGdo.",
            ".oGGGGGddo..",
            "oGGGGddoo...",
            ".oGddoo.....",
            "..ooo.......",
        ],
        {"o": "#183d1e", "G": "#4cc456", "g": "#a8f79c", "d": "#2a8034"},
    ),
    "psychic": (
        [
            "...oooooo...",
            ".ooPPPPPPoo.",
            "oPPoWWWWoPPo",
            "oPoWPPPPWoPo",
            "oPoWPWWPWoPo",
            "oPoWPPPPWoPo",
            "oPPoWWWWoPPo",
            ".ooPPPPPPoo.",
            "...oooooo...",
        ],
        {"o": "#3c134a", "P": "#d95ee6", "W": "#ffe0ff"},
    ),
    "impact": (
        [
            ".....oo.....",
            ".o...oYo..o.",
            "..oo.oYo.oo.",
            "...ooWWoo...",
            "oooWWWWWWooo",
            "...ooWWoo...",
            "..oo.oYo.oo.",
            ".o...oYo..o.",
            ".....oo.....",
        ],
        {"o": "#402208", "Y": "#ffd644", "W": "#ffffff"},
    ),
}

for name, (grid, pal) in FX_SPRITES.items():
    write(os.path.join(FX_DIR, f"{name}.svg"), grid_svg(grid, pal))


# ---- 4. Layered Pixel-Art Habitat Props (Trees, Clouds, PokeCenter, Lighthouse, Torii, Flowers) ----

SCENE_PROPS = {
    "cloud": (
        [
            "......oooooo........",
            "....ooWWWWWWoo......",
            "..ooWWWWWWWWWWooo...",
            ".oWWWWWWWWWWWWWWWoo.",
            "oWWWWWWWWWWWWWWWWWWo",
            "oWWWWWWWWWWWWWWWWWWo",
            ".oSSSSWWWWWWWWSSSSo.",
            "..ooooSSSSSSSSoooo..",
            "......oooooooo......",
        ],
        {"o": "#a7c4d9", "W": "#ffffff", "S": "#e1f0fa"},
    ),
    "tree-meadow": (
        [
            ".....oooooo.....",
            "...ooGGGGGGoo...",
            "..oGGggGGGGGGoo.",
            ".oGGgggGGGGGGddo",
            ".oGGGGGGGGGGGddo",
            "oGGggGGGGGGddddo",
            "oGGGGGGGGGdddddo",
            ".oGGGGGGGdddddo.",
            "..ooGGddddddoo..",
            "....oooTTToo....",
            "......oTTdo.....",
            "......oTTdo.....",
            ".....ooTTdoo....",
            "....oooooooo....",
        ],
        {"o": "#1d3d22", "G": "#4ba34b", "g": "#85db72", "d": "#2f7337", "T": "#8f5c38", "D": "#633d22"},
    ),
    "tree-autumn": (
        [
            ".....oooooo.....",
            "...ooOOOOOOoo...",
            "..oOOyyOOOOOOoo.",
            ".oOOyyyOOOOOOddo",
            ".oOOOOOOOOOOOddo",
            "oOOyyOOOOOOddddo",
            "oOOOOOOOOOdddddo",
            ".oOOOOOOOdddddo.",
            "..ooOOddddddoo..",
            "....oooTTToo....",
            "......oTTdo.....",
            "......oTTdo.....",
            ".....ooTTdoo....",
            "....oooooooo....",
        ],
        {"o": "#3d1e15", "O": "#d96236", "y": "#f7b34d", "d": "#a33822", "T": "#6e4630"},
    ),
    "tree-pine": (
        [
            ".......oo.......",
            "......oGGo......",
            ".....oGgGGo.....",
            "....oGGGGddo....",
            ".....ooGdoo.....",
            "....oGGGGGdo....",
            "...oGGgGGGddo...",
            "..oGGGGGGGGddo..",
            "...ooGGGGddoo...",
            "..oGGgGGGGGGdo..",
            ".oGGGGGGGGGGddo.",
            "..oooGGGGddooo..",
            "......oTTdo.....",
            ".....oooooo.....",
        ],
        {"o": "#16262e", "G": "#2e5e5e", "g": "#52918a", "d": "#1d3f42", "T": "#593c2e"},
    ),
    "pokehouse": (
        [
            "....oooooooooo....",
            "..ooRRRRRRRRRRoo..",
            ".oRRhhRRRRRRRRddo.",
            "oRRRRRRWWWWWRRRddo",
            "oRRRRRWWPPWWRRRddo",
            "oRRRRRRWWWWWRRRddo",
            "oooooooooooooooooo",
            "oWWWWWWWWWWWWWWWWo",
            "oWWBBBWWWWWWBBBWWo",
            "oWWBBBWWWWWWBBBWWo",
            "oWWWWWWooooWWWWWWo",
            "oWWWWWoBBBBooWWWWo",
            "oWWWWWoBBBBooWWWWo",
            "oooooooooooooooooo",
        ],
        {"o": "#2c2420", "R": "#d94545", "h": "#ff8f8f", "d": "#a32828", "W": "#f5efe2", "P": "#d94545", "B": "#6cc0e5"},
    ),
    "torii": (
        [
            "oooooooooooooooooo",
            "oRRRRRRRRRRRRRRRRo",
            ".oooRRRRRRRRRRooo.",
            "...oRRo....oRRo...",
            "..oRRRRRRRRRRRRo..",
            "...oRRo....oRRo...",
            "...oRRo....oRRo...",
            "...oRRo....oRRo...",
            "...oRRo....oRRo...",
            "...oRRo....oRRo...",
            "..ooBBo....ooBBo..",
            "..ooooo....ooooo..",
        ],
        {"o": "#2e1612", "R": "#d44235", "B": "#2b2b33"},
    ),
    "lighthouse": (
        [
            ".....oooo.....",
            "....oRRRRo....",
            "...oRRRRRRo...",
            "....oYYYYo....",
            "....oYWWYo....",
            "...oooooooo...",
            "....oWWWWo....",
            "....oRRRRo....",
            "....oWWWWo....",
            "...oWWWWWWo...",
            "...oRRRRRRo...",
            "...oWWWWWWo...",
            "..oWWWWWWWWo..",
            "..oooooooooo..",
        ],
        {"o": "#232a36", "R": "#d94545", "W": "#f4f6fa", "Y": "#ffe26a"},
    ),
    "flower-red": (
        [
            "..oo..",
            ".oRRo.",
            "oRYYRo",
            ".oRRo.",
            "..oGo.",
            ".oGGo.",
            "..oo..",
        ],
        {"o": "#223b20", "R": "#f05468", "Y": "#ffe052", "G": "#48a848"},
    ),
    "flower-blue": (
        [
            "..oo..",
            ".oBBo.",
            "oBWWBo",
            ".oBBo.",
            "..oGo.",
            ".oGGo.",
            "..oo..",
        ],
        {"o": "#1c2c3d", "B": "#52a8f5", "W": "#fff7cc", "G": "#48a848"},
    ),
    "rock-moon": (
        [
            "....ooooo.....",
            "..ooGGGGGoo...",
            ".oGGhGGGGddo..",
            "oGGhGGGGGGddo.",
            "oGGGGGGGGdddo.",
            "oGGGddGGddddo.",
            ".ooooooooooo..",
        ],
        {"o": "#1a1d2b", "G": "#5a627d", "h": "#8c96b8", "d": "#3c4257"},
    ),
}

for name, (grid, pal) in SCENE_PROPS.items():
    write(os.path.join(SCENES_DIR, f"{name}.svg"), grid_svg(grid, pal))


# ---- 5. Layout Preview SVG (shown in Herdr Settings > Layouts) ----

PREVIEW_SVG = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200">
  <rect width="320" height="200" rx="8" fill="#e6e1d3"/>
  <!-- Sidebar -->
  <rect x="6" y="6" width="76" height="188" rx="4" fill="#f5f1e3" stroke="#363c4a" stroke-width="2"/>
  <rect x="12" y="14" width="64" height="14" rx="2" fill="#d94545"/>
  <circle cx="20" cy="21" r="4" fill="#63c8ff" stroke="#222" stroke-width="1"/>
  <!-- Poke Ball spaces -->
  <circle cx="20" cy="44" r="5" fill="#e04646" stroke="#222" stroke-width="1.2"/>
  <rect x="15" y="44" width="10" height="5" fill="#fff"/>
  <rect x="30" y="41" width="42" height="6" rx="1" fill="#363c4a" opacity="0.7"/>
  <circle cx="20" cy="60" r="5" fill="#3a7bd5" stroke="#222" stroke-width="1.2"/>
  <rect x="30" y="57" width="36" height="6" rx="1" fill="#363c4a" opacity="0.4"/>
  <circle cx="20" cy="76" r="5" fill="#3b3e4a" stroke="#222" stroke-width="1.2"/>
  <rect x="30" y="73" width="38" height="6" rx="1" fill="#363c4a" opacity="0.4"/>
  <!-- Party -->
  <line x1="12" y1="92" x2="76" y2="92" stroke="#363c4a" stroke-width="1.5"/>
  <rect x="14" y="100" width="14" height="14" rx="2" fill="#ffe066" stroke="#222" stroke-width="1"/>
  <rect x="32" y="102" width="40" height="5" rx="1" fill="#363c4a" opacity="0.7"/>
  <rect x="32" y="110" width="28" height="3" rx="1" fill="#46a85c"/>
  <rect x="14" y="120" width="14" height="14" rx="2" fill="#82b8ff" stroke="#222" stroke-width="1"/>
  <rect x="32" y="122" width="38" height="5" rx="1" fill="#363c4a" opacity="0.5"/>
  <rect x="32" y="130" width="22" height="3" rx="1" fill="#e6a23c"/>
  <!-- Tab bar -->
  <rect x="88" y="6" width="226" height="22" rx="4" fill="#f5f1e3" stroke="#363c4a" stroke-width="2"/>
  <rect x="94" y="10" width="64" height="14" rx="2" fill="#ffffff" stroke="#363c4a" stroke-width="1.5"/>
  <rect x="256" y="10" width="24" height="14" rx="2" fill="#d9534f"/>
  <rect x="284" y="10" width="24" height="14" rx="2" fill="#3d78c9"/>
  <!-- Terminal Pane -->
  <rect x="88" y="34" width="226" height="104" rx="4" fill="#fcfaf2" stroke="#363c4a" stroke-width="2"/>
  <rect x="88" y="34" width="226" height="16" rx="3" fill="#e9e4d4"/>
  <rect x="98" y="58" width="140" height="5" rx="1" fill="#363c4a" opacity="0.35"/>
  <rect x="98" y="68" width="180" height="5" rx="1" fill="#363c4a" opacity="0.25"/>
  <rect x="98" y="78" width="120" height="5" rx="1" fill="#46a85c" opacity="0.5"/>
  <!-- Interactive Habitat -->
  <rect x="88" y="144" width="226" height="38" rx="4" fill="#9cd8f5" stroke="#363c4a" stroke-width="2"/>
  <rect x="89" y="164" width="224" height="17" fill="#63ba59"/>
  <circle cx="140" cy="166" r="7" fill="#ffd94a" stroke="#222" stroke-width="1.2"/>
  <circle cx="176" cy="166" r="7" fill="#66b3ff" stroke="#222" stroke-width="1.2"/>
  <text x="155" y="160" font-size="10" fill="#ff5533">⚡</text>
  <!-- Status bar -->
  <rect x="88" y="185" width="226" height="9" rx="2" fill="#363c4a"/>
</svg>"""

write(os.path.join(LAYOUTS_DIR, "herdr-pokemon.svg"), PREVIEW_SVG)
print("Generated all pixel-art SVG assets successfully!")
