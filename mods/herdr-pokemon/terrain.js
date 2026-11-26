// Exact 1:1 2D Terrain Geometry, Bridge Waypoint Pathfinding & Social Arena Pickers
// matching all 7 distinct ecosystem topologies in generate_v2_assets.py!
//   1. meadow: Diagonal S-curving river cutting across a lush valley (west forest, east town, bridge!)
//   2. lake:   Cerulean Archipelago (west peninsula, huge bay, long boardwalk pier, center & far islands!)
//   3. autumn: Ecruteak Twin-Pond Shrine (west & east koi ponds, central stone courtyard, maple woods!)
//   4. moon:   Mt. Moon Caldera Ring (CENTER glowing crater lake ringed by starlit rocky plateau & bridges!)
//   5. ocean:  Cinnabar Coral Atoll (~85% deep ocean + 2 coral atolls + slender bridge!)
//   6. desert: Sandstone Oasis (~93% desert dunes & mesas + 1 oasis spring!)
//   7. cliff:  Mt. Chimney Waterfall Gorge (terraces, cascading waterfall, plunge pool & canyon bridge!)

export const LOGICAL_W = 760;
export const LOGICAL_H = 130;
export const MAP_PNG_W = 1520;
export const MAP_PNG_H = 260;

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const rand = (lo, hi) => lo + Math.random() * (hi - lo);

export function computeMapBox(width, height) {
  const cover = Math.max(width / MAP_PNG_W, height / MAP_PNG_H);
  const drawW = Math.ceil(MAP_PNG_W * cover);
  const drawH = Math.ceil(MAP_PNG_H * cover);
  return {
    left: Math.round((width - drawW) / 2),
    top: Math.round((height - drawH) / 2),
    drawW,
    drawH,
  };
}

export function screenToMap(sx, sy, box) {
  return {
    mx: ((sx - box.left) / Math.max(1, box.drawW)) * LOGICAL_W,
    my: ((sy - box.top) / Math.max(1, box.drawH)) * LOGICAL_H,
  };
}

export function mapToScreen(mx, my, box) {
  return {
    x: box.left + (mx / LOGICAL_W) * box.drawW,
    y: box.top + (my / LOGICAL_H) * box.drawH,
  };
}

function meadowRiverX(my) {
  return 395.0 + (my - 65.0) * 1.45 + 34.0 * Math.sin(my * 0.055);
}

function lakeCoastX(my) {
  return 316.0 + 28.0 * Math.sin(my * 0.052 + 0.4) - 12.0 * Math.cos(my * 0.09);
}

function autumnLeftPondX(my) {
  return 152.0 + 22.0 * Math.sin(my * 0.055 + 0.8) - 8.0 * Math.cos(my * 0.09);
}

function autumnRightPondX(my) {
  return 608.0 - 22.0 * Math.sin(my * 0.055 + 0.2) + 8.0 * Math.cos(my * 0.09);
}

export function terrainAtMap(biomeId, mx, my) {
  // 1. Pallet Winding River (diagonal S-river across center + bridge)
  if (biomeId === "meadow") {
    const rc = meadowRiverX(my);
    const b1x = meadowRiverX(66) - 60;
    if (mx >= b1x && mx <= b1x + 120 && my >= 55 && my <= 77) return "bridge";
    const dist = Math.abs(mx - rc);
    if (dist <= 51) return "water";
    if (dist <= 65) return "shore";
    if (mx < 210) return "forest";
    return "land";
  }

  // 2. Cerulean Archipelago (west peninsula, long pier, center & far islands, big ocean bay)
  if (biomeId === "lake") {
    if (mx >= 306 && mx <= 474 && my >= 55 && my <= 75) return "bridge";
    // Center beach island
    const d1 = ((mx - 512) / 47) ** 2 + ((my - 66) / 24) ** 2;
    if (d1 <= 1.0) return d1 <= 0.55 ? "land" : "shore";
    // Far-right grassy islet
    const d2 = ((mx - 706) / 29) ** 2 + ((my - 36) / 14) ** 2;
    if (d2 <= 1.0) return "shore";
    const sx = lakeCoastX(my);
    if (mx >= sx + 2) return "water";
    if (mx >= sx - 18) return "shore";
    if (mx < 175) return "forest";
    return "land";
  }

  // 3. Ecruteak Twin-Pond Shrine (far-left koi pond + center courtyard/woods + far-right koi pond)
  if (biomeId === "autumn") {
    if (my >= 56 && my <= 76 && ((mx >= 102 && mx <= 166) || (mx >= 594 && mx <= 658))) return "bridge";
    const lx = autumnLeftPondX(my);
    const rx = autumnRightPondX(my);
    if (mx <= lx - 2 || mx >= rx + 2) return "water";
    if (mx <= lx + 12 || mx >= rx - 12) return "shore";
    if ((mx > 170 && mx < 280) || (mx > 480 && mx < 590)) return "forest";
    return "land";
  }

  // 4. Mt. Moon Caldera Ring (CENTER glowing crater lake + outer rocky highland + west/east bridges!)
  if (biomeId === "moon") {
    if (my >= 58 && my <= 74 && ((mx >= 230 && mx <= 296) || (mx >= 464 && mx <= 530))) return "bridge";
    if (((mx - 380) / 20) ** 2 + ((my - 66) / 9) ** 2 <= 1.0) return "shore";
    const cd = Math.hypot((mx - 380) / 142, (my - 66) / 44);
    if (cd <= 0.99) return "water";
    if (cd <= 1.12) return "shore";
    if (mx < 165 || mx > 595) return "forest";
    return "land";
  }

  // 5. Cinnabar Coral Atoll (EXTREME WATER ~85% ocean + 2 tiny coral atolls + slender bridge!)
  if (biomeId === "ocean") {
    if (mx >= 272 && mx <= 494 && my >= 59 && my <= 75) return "bridge";
    const a1 = ((mx - 224) / 57) ** 2 + ((my - 68) / 27) ** 2;
    if (a1 <= 1.0) return a1 <= 0.52 ? "forest" : "shore";
    const a2 = ((mx - 536) / 51) ** 2 + ((my - 64) / 24) ** 2;
    if (a2 <= 1.0) return a2 <= 0.52 ? "forest" : "shore";
    return "water";
  }

  // 6. Sunbaked Desert Oasis (EXTREME LAND ~93% sand dunes & mesas + 1 tiny oasis spring!)
  if (biomeId === "desert") {
    const od = Math.hypot((mx - 664) / 41, (my - 88) / 18);
    if (od <= 1.0) return "water";
    if (od <= 1.38) return "forest"; // lush palm-shaded oasis rim
    return "land";
  }

  // 7. Mt. Chimney Stepped Terraces (EXTREME ELEVATION: upper plateau, cliff drop, waterfall plunge pool & bridge!)
  if (mx >= 314 && mx <= 446 && my >= 99 && my <= 117) return "bridge";
  if (mx >= 346 && mx <= 414 && (my <= 56 || my >= 96)) return "water";
  if (Math.hypot((mx - 380) / 62, (my - 76) / 26) <= 1.0) return "water";
  if (my <= 32) return "forest"; // elevated highland pine plateau
  return "land";
}

export function terrainAtScreen(biomeId, x, y, box) {
  const { mx, my } = screenToMap(x, y, box);
  return terrainAtMap(biomeId, mx, my);
}

export function canWalkTerrain(hab, terr) {
  if (terr !== "water") return true;
  return Boolean(hab?.canSwim || hab?.canFly);
}

// Dense line-of-sight water check (~every 10px) so land-bound Pokemon NEVER cut across narrow rivers or ponds!
export function pathClear(biomeId, hab, x0, y0, x1, y1, box) {
  if (hab?.canSwim || hab?.canFly) return true;
  const dist = Math.hypot(x1 - x0, y1 - y0);
  const steps = Math.max(4, Math.min(48, Math.ceil(dist / 10)));
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const px = x0 + (x1 - x0) * t;
    const py = y0 + (y1 - y0) * t;
    if (terrainAtScreen(biomeId, px, py, box) === "water") return false;
  }
  return true;
}

// Known dry-land bridge / rim waypoint connectors (in logical map coords) so land Pokemon
// genuinely walk ACROSS bridges or AROUND lakes instead of stepping onto water!
function dryConnectorsMap(biomeId) {
  if (biomeId === "meadow") {
    const b1x = meadowRiverX(66) - 60;
    return [
      [[b1x - 10, 66], [b1x + 130, 66]],
      [[b1x + 130, 66], [b1x - 10, 66]],
    ];
  }
  if (biomeId === "lake") {
    return [
      [[294, 65], [486, 65]],
      [[486, 65], [294, 65]],
    ];
  }
  if (biomeId === "ocean") {
    return [
      [[256, 67], [510, 66]],
      [[510, 66], [256, 67]],
    ];
  }
  if (biomeId === "cliff") {
    return [
      [[302, 108], [458, 108]],
      [[458, 108], [302, 108]],
    ];
  }
  if (biomeId === "moon") {
    // Dry starlit rim looping around the central crater lake (north or south!)
    return [
      [[210, 36], [380, 14], [550, 36]],
      [[550, 36], [380, 14], [210, 36]],
      [[210, 100], [380, 118], [550, 100]],
      [[550, 100], [380, 118], [210, 100]],
    ];
  }
  if (biomeId === "desert") {
    return [
      [[608, 66], [664, 54]],
      [[664, 54], [608, 66]],
    ];
  }
  return [];
}

function clampPt(pt, bounds) {
  return {
    x: clamp(pt.x, bounds.minX, bounds.maxX),
    y: clamp(pt.y, bounds.minY, bounds.maxY),
  };
}

// Build a clean dry-land (or direct swim/fly) waypoint path from (x0, y0) to (x1, y1).
// Returns an array of { x, y } waypoints (length 1..4), or null if no non-water path exists!
export function buildWalkPath(biomeId, hab, x0, y0, x1, y1, box, bounds) {
  const dest = clampPt({ x: x1, y: y1 }, bounds);
  if (!canWalkTerrain(hab, terrainAtScreen(biomeId, dest.x, dest.y, box))) return null;
  if (hab?.canSwim || hab?.canFly) return [dest];
  if (pathClear(biomeId, hab, x0, y0, dest.x, dest.y, box)) return [dest];

  // Try routing across the biome's bridge or dry lake rim!
  const connectors = dryConnectorsMap(biomeId);
  let best = null;
  let bestLen = Infinity;
  for (const chain of connectors) {
    const pts = chain.map(([mx, my]) => clampPt(mapToScreen(mx, my, box), bounds));
    const full = [{ x: x0, y: y0 }, ...pts, dest];
    let ok = true;
    let total = 0;
    for (let i = 0; i < full.length - 1; i++) {
      const a = full[i], b = full[i + 1];
      if (!canWalkTerrain(hab, terrainAtScreen(biomeId, b.x, b.y, box)) || !pathClear(biomeId, hab, a.x, a.y, b.x, b.y, box)) {
        ok = false;
        break;
      }
      total += Math.hypot(b.x - a.x, b.y - a.y);
    }
    if (ok && total < bestLen) {
      bestLen = total;
      best = [...pts, dest];
    }
  }
  return best;
}

// Find the closest valid walkable point on screen (used when a land Pokemon is stranded in water after biome switch
// or when a ground subagent follows a flying parent over a lake!).
export function nearestWalkable(biomeId, hab, x, y, box, bounds) {
  const cx = clamp(x, bounds.minX, bounds.maxX);
  const cy = clamp(y, bounds.minY, bounds.maxY);
  const t0 = terrainAtScreen(biomeId, cx, cy, box);
  if (canWalkTerrain(hab, t0)) return { x: cx, y: cy, terrain: t0 };

  for (let r = 14; r <= 420; r += 16) {
    const samples = Math.min(24, Math.max(10, Math.round(r / 12)));
    for (let i = 0; i < samples; i++) {
      const ang = (i / samples) * Math.PI * 2;
      const tx = clamp(cx + Math.cos(ang) * r, bounds.minX, bounds.maxX);
      const ty = clamp(cy + Math.sin(ang) * r * 0.72, bounds.minY, bounds.maxY);
      const terr = terrainAtScreen(biomeId, tx, ty, box);
      if (canWalkTerrain(hab, terr)) return { x: tx, y: ty, terrain: terr };
    }
  }
  const safeMap = safeHubMap(biomeId);
  const safe = clampPt(mapToScreen(safeMap[0], safeMap[1], box), bounds);
  return { x: safe.x, y: safe.y, terrain: "land" };
}

function safeHubMap(biomeId) {
  return biomeId === "meadow" ? [605, 72]
    : biomeId === "lake" ? [210, 66]
    : biomeId === "autumn" ? [380, 68]
    : biomeId === "moon" ? [130, 66]
    : biomeId === "ocean" ? [224, 68]
    : biomeId === "desert" ? [310, 68]
    : [210, 74];
}

// Pick a natural 2D roaming point suited to this Pokemon's species & current biome topology!
// Returns { x, y, terrain, path } where `path` is a guaranteed dry-land waypoint list for land Pokemon.
export function pickTerrainTarget(biomeId, hab, curX, curY, box, bounds, { initial = false } = {}) {
  const roll = Math.random();
  let wanted = null;
  if (hab?.canSwim) {
    wanted = roll < 0.72 ? "water" : roll < 0.88 ? "shore" : "land";
  } else if (hab?.canFly) {
    wanted = roll < 0.55 ? "forest" : roll < 0.80 ? "water" : "land";
  } else if (hab?.prefers === "forest") {
    wanted = roll < 0.55 ? "forest" : "land";
  } else {
    wanted = roll < 0.22 ? "shore" : roll < 0.34 ? "bridge" : "land";
  }

  let fallback = null;
  for (let i = 0; i < 42; i++) {
    const tx = rand(bounds.minX, bounds.maxX);
    const ty = rand(bounds.minY, bounds.maxY);
    if (!initial && Math.hypot(tx - curX, ty - curY) < 28) continue;
    const terr = terrainAtScreen(biomeId, tx, ty, box);
    if (!canWalkTerrain(hab, terr)) continue;
    const path = initial ? [{ x: tx, y: ty }] : buildWalkPath(biomeId, hab, curX, curY, tx, ty, box, bounds);
    if (!path) continue;
    if (!fallback) fallback = { x: tx, y: ty, terrain: terr, path };
    if (
      terr === wanted ||
      (wanted === "shore" && (terr === "shore" || terr === "bridge")) ||
      (wanted === "land" && (terr === "land" || terr === "shore" || terr === "bridge"))
    ) {
      return { x: tx, y: ty, terrain: terr, path };
    }
  }
  if (fallback) return fallback;
  if (!initial) {
    // Stay safely on our current reachable bank instead of walking across water to another hub!
    const near = nearestWalkable(biomeId, hab, curX, curY, box, bounds);
    return { x: near.x, y: near.y, terrain: near.terrain, path: [{ x: near.x, y: near.y }] };
  }
  const safeMap = safeHubMap(biomeId);
  const safe = clampPt(mapToScreen(safeMap[0], safeMap[1], box), bounds);
  return { x: safe.x, y: safe.y, terrain: "land", path: [safe] };
}

// ---- Terrain-Aware Social Spot Pickers (Battles, Hangouts, Races, Tag!) ----

// Pick a valid battle arena where Fighter A stands at (lx, cy) and Fighter B stands at (rx, cy),
// BOTH strictly respecting terrain and reachable via dry paths/bridges (or aquatic duel if both swim!).
export function pickBattleArena(biomeId, habA, posA, habB, posB, box, bounds) {
  const halfGap = 58;
  const bothSwim = Boolean(habA?.canSwim && habB?.canSwim);
  const wantWater = bothSwim && Math.random() < 0.50;
  let best = null;
  let bestScore = Infinity;

  for (let i = 0; i < 64; i++) {
    const cx = rand(bounds.minX + halfGap + 8, bounds.maxX - halfGap - 8);
    const cy = rand(bounds.minY + 18, bounds.maxY - 16);
    const lx = cx - halfGap;
    const rx = cx + halfGap;
    const tL = terrainAtScreen(biomeId, lx, cy, box);
    const tR = terrainAtScreen(biomeId, rx, cy, box);
    if (!canWalkTerrain(habA, tL) || !canWalkTerrain(habB, tR)) continue;
    // Also ensure the arena center isn't a water trap for melee lunges if either fighter is land-bound
    const tC = terrainAtScreen(biomeId, cx, cy, box);
    if ((!habA?.canSwim && !habA?.canFly && tC === "water") || (!habB?.canSwim && !habB?.canFly && tC === "water")) {
      // Allow shoreline duels ONLY if the swimmer is on the water side and land mon is on shore!
      const isShoreDuel = (tL === "water" && tR !== "water" && habA?.canSwim) || (tR === "water" && tL !== "water" && habB?.canSwim);
      if (!isShoreDuel) continue;
    }

    const pathA = buildWalkPath(biomeId, habA, posA.x, posA.y, lx, cy, box, bounds);
    if (!pathA) continue;
    const pathB = buildWalkPath(biomeId, habB, posB.x, posB.y, rx, cy, box, bounds);
    if (!pathB) continue;

    // Prefer nearby arenas so fighters converge briskly and smoothly!
    const dist = Math.hypot(lx - posA.x, cy - posA.y) + Math.hypot(rx - posB.x, cy - posB.y);
    let penalty = dist;
    if (wantWater && (tL !== "water" || tR !== "water")) penalty += 220;
    if (pathA.length > 1) penalty += 140;
    if (pathB.length > 1) penalty += 140;
    if (penalty < bestScore) {
      bestScore = penalty;
      best = { cx, cy, lx, rx, pathA, pathB, aquatic: tL === "water" && tR === "water" };
    }
  }
  return best;
}

// Pick a valid spectator spot near (cx, cy) that respects the spectator's terrain!
export function pickSpectatorSpot(biomeId, hab, pos, cx, cy, idx, box, bounds) {
  const candidates = [
    [cx + (idx === 0 ? -24 : 28), cy - 42],
    [cx + (idx === 0 ? 24 : -28), cy + 38],
    [cx - 98, cy - 16],
    [cx + 98, cy - 16],
    [cx - 94, cy + 20],
    [cx + 94, cy + 20],
  ];
  for (const [sx0, sy0] of candidates) {
    const pt = clampPt({ x: sx0, y: sy0 }, bounds);
    if (!canWalkTerrain(hab, terrainAtScreen(biomeId, pt.x, pt.y, box))) continue;
    const path = buildWalkPath(biomeId, hab, pos.x, pos.y, pt.x, pt.y, box, bounds);
    if (path) return { x: pt.x, y: pt.y, path };
  }
  return null;
}

// Pick a hangout circle reachable by all participating members without crossing water!
export function pickGatherSpot(biomeId, members, habsByAddr, posByAddr, box, bounds) {
  const rx = 44, ry = 22;
  let best = null;
  let bestScore = Infinity;

  for (let i = 0; i < 48; i++) {
    const cx = rand(bounds.minX + 64, bounds.maxX - 64);
    const cy = rand(bounds.minY + 24, bounds.maxY - 22);
    const slots = {};
    let ok = true;
    let totalDist = 0;
    for (let k = 0; k < members.length; k++) {
      const addr = members[k];
      const ang = (k / members.length) * Math.PI * 2 + 0.4;
      const pt = clampPt({ x: cx + Math.cos(ang) * rx, y: cy + Math.sin(ang) * ry }, bounds);
      const hab = habsByAddr[addr];
      const pos = posByAddr[addr];
      if (!canWalkTerrain(hab, terrainAtScreen(biomeId, pt.x, pt.y, box))) { ok = false; break; }
      const path = buildWalkPath(biomeId, hab, pos.x, pos.y, pt.x, pt.y, box, bounds);
      if (!path) { ok = false; break; }
      slots[addr] = { x: pt.x, y: pt.y, path };
      totalDist += Math.hypot(pt.x - pos.x, pt.y - pos.y) + (path.length - 1) * 120;
    }
    if (ok && totalDist < bestScore) {
      bestScore = totalDist;
      best = { cx, cy, slots };
    }
  }
  return best;
}

// Pick a clean tag chase target reachable by both runner and chaser without crossing water!
export function pickTagPoint(biomeId, habR, posR, habC, posC, box, bounds) {
  for (let i = 0; i < 44; i++) {
    const tx = rand(bounds.minX + 26, bounds.maxX - 26);
    const ty = rand(bounds.minY + 12, bounds.maxY - 12);
    if (Math.hypot(tx - posR.x, ty - posR.y) < 55) continue;
    const tR = terrainAtScreen(biomeId, tx, ty, box);
    if (!canWalkTerrain(habR, tR) || !canWalkTerrain(habC, tR)) continue;
    const pathR = buildWalkPath(biomeId, habR, posR.x, posR.y, tx, ty, box, bounds);
    if (!pathR) continue;
    const cx = clamp(tx + (tx > bounds.arenaX ? -38 : 38), bounds.minX, bounds.maxX);
    const tC = terrainAtScreen(biomeId, cx, ty, box);
    if (!canWalkTerrain(habC, tC)) continue;
    const pathC = buildWalkPath(biomeId, habC, posC.x, posC.y, cx, ty, box, bounds);
    if (!pathC) continue;
    return { rx: tx, ry: ty, cx, cy: ty, pathR, pathC };
  }
  return null;
}

// Pick a 100% obstacle/water-free sprint race track (or aquatic swim race if all racers swim)!
export function pickRaceTrack(biomeId, racers, habsByAddr, posByAddr, box, bounds) {
  const span = bounds.maxX - bounds.minX;
  const trackLen = Math.min(340, Math.max(150, Math.round(span * 0.42)));
  const laneStep = 22;

  for (let attempt = 0; attempt < 56; attempt++) {
    const startX = rand(bounds.minX + 20, Math.max(bounds.minX + 24, bounds.maxX - trackLen - 20));
    const finishX = startX + trackLen;
    const baseY = rand(bounds.minY + 10, Math.max(bounds.minY + 14, bounds.maxY - (racers.length - 1) * laneStep - 10));

    let ok = true;
    const lanes = {};
    for (let idx = 0; idx < racers.length; idx++) {
      const addr = racers[idx];
      const hab = habsByAddr[addr];
      const pos = posByAddr[addr];
      const ly = clamp(baseY + idx * laneStep, bounds.minY, bounds.maxY);
      if (!canWalkTerrain(hab, terrainAtScreen(biomeId, startX, ly, box))) { ok = false; break; }
      if (!canWalkTerrain(hab, terrainAtScreen(biomeId, finishX, ly, box))) { ok = false; break; }
      if (!pathClear(biomeId, hab, startX, ly, finishX, ly, box)) { ok = false; break; }
      const approach = buildWalkPath(biomeId, hab, pos.x, pos.y, startX, ly, box, bounds);
      if (!approach) { ok = false; break; }
      lanes[addr] = { y: ly, approach };
    }
    if (ok) return { startX, finishX, lanes };
  }
  return null;
}

// Animated GPU water-surface glints, drifting wave ripples & waterfall streaks tailored to each biome!
export function waterSparkleCoords(biomeId, box) {
  const pts = biomeId === "meadow"
    ? [
        [324, 20, 14], [358, 38, 12], [392, 66, 13], [418, 86, 14], [458, 108, 15],
        [338, 30, 9], [434, 98, 10], [478, 118, 11],
      ]
    : biomeId === "lake"
      ? [
          [382, 26, 16], [442, 36, 14], [596, 28, 16], [638, 68, 15], [418, 104, 16],
          [682, 98, 15], [362, 88, 12], [576, 108, 14], [468, 116, 13],
        ]
      : biomeId === "autumn"
        ? [
            [44, 32, 13], [92, 44, 11], [62, 92, 14], [104, 108, 12],
            [666, 36, 13], [712, 48, 12], [658, 94, 14], [710, 104, 12],
          ]
        : biomeId === "moon"
          ? [
              [312, 42, 14], [436, 42, 14], [326, 90, 14], [430, 92, 14],
              [376, 32, 12], [374, 100, 12], [290, 68, 11], [470, 68, 11],
            ]
          : biomeId === "ocean"
            ? [
                [64, 28, 18], [142, 92, 16], [348, 32, 18], [440, 30, 16],
                [364, 100, 18], [644, 46, 17], [696, 84, 16], [96, 112, 15], [468, 110, 15],
              ]
            : biomeId === "desert"
              ? [[652, 84, 10], [672, 92, 10], [662, 88, 8]]
              : [[354, 78, 13], [398, 80, 13], [376, 90, 14], [376, 118, 12], [378, 14, 11]];
  return pts.map(([mx, my, w]) => ({ ...mapToScreen(mx, my, box), w: Math.max(8, Math.round((w / LOGICAL_W) * box.drawW)) }));
}

// Compact center-placed VS Trigger Pad on EVERY map (always dead-center mx≈380 on guaranteed dry ground/bridge,
// small & unobtrusive so it never dominates the map — drop 2 Pokémon here to launch the VS Battle minigame!).
export const VS_ARENAS_MAP = {
  meadow: { mx: 380, my: 66, rx: 32, ry: 14, label: "Pallet VS" },
  lake:   { mx: 390, my: 65, rx: 32, ry: 14, label: "Cerulean VS" },
  autumn: { mx: 380, my: 68, rx: 34, ry: 15, label: "Shrine VS" },
  moon:   { mx: 380, my: 66, rx: 30, ry: 13, label: "Moonstone VS" },
  ocean:  { mx: 384, my: 67, rx: 32, ry: 14, label: "Atoll VS" },
  desert: { mx: 380, my: 68, rx: 34, ry: 15, label: "Oasis VS" },
  cliff:  { mx: 380, my: 108, rx: 32, ry: 14, label: "Canyon VS" },
};

export function vsArenaBounds(biomeId, box, bounds = null) {
  const spec = VS_ARENAS_MAP[biomeId] ?? VS_ARENAS_MAP.meadow;
  const center = mapToScreen(spec.mx, spec.my, box);
  // Keep the VS trigger pad intentionally compact (~44x24px radius) so it's just a neat trigger spot in the middle!
  const rx = clamp(Math.round((spec.rx / LOGICAL_W) * box.drawW), 32, 48);
  const ry = clamp(Math.round((spec.ry / LOGICAL_H) * box.drawH), 18, 26);
  const cx = bounds ? clamp(center.x, bounds.minX + 40, bounds.maxX - 40) : center.x;
  const cy = bounds ? clamp(center.y, bounds.minY + 14, bounds.maxY - 12) : center.y;
  const gap = Math.min(44, Math.max(28, Math.round(rx * 0.72)));
  return {
    cx,
    cy,
    rx,
    ry,
    lx: bounds ? clamp(cx - gap, bounds.minX, bounds.maxX) : cx - gap,
    rxPos: bounds ? clamp(cx + gap, bounds.minX, bounds.maxX) : cx + gap,
    label: spec.label,
  };
}

export function isInsideVsArena(biomeId, sx, sy, box, bounds = null) {
  const a = vsArenaBounds(biomeId, box, bounds);
  // Generous drop radius (1.35x) around the compact pad so dropping feels effortless!
  const dx = (sx - a.cx) / (a.rx * 1.35);
  const dy = (sy - a.cy) / (a.ry * 1.45);
  return dx * dx + dy * dy <= 1.0;
}

// Animated cascading waterfall streaks + plunge mist for Mt. Chimney ("cliff")!
export function waterfallCoords(biomeId, box) {
  if (biomeId !== "cliff") return null;
  const topLeft = mapToScreen(352, 24, box);
  const botRight = mapToScreen(408, 57, box);
  const mistCenter = mapToScreen(380, 58, box);
  return {
    x: topLeft.x,
    y: topLeft.y,
    w: Math.max(20, botRight.x - topLeft.x),
    h: Math.max(16, botRight.y - topLeft.y),
    mistX: mistCenter.x,
    mistY: mistCenter.y,
  };
}
