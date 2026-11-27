// Deep 2D Top-Down Pokemon Battle & Social Playground Engine!
// Operates on a true 2D (x, y) overworld plane with strict terrain awareness & bridge pathfinding:
//   1. Multi-round 2D Arena Battles (true arrival wait, terrain-valid dry/shore/aquatic arenas,
//      single-cycle crisp Attack/Hurt/Hop anims, melee lunges, elemental volleys, dodges, popups, HP bars)
//   2. 2D Zig-Zag Tag / Chase (water-safe paths)
//   3. Sprint Race (water-safe dry lanes or aquatic swim race, true lineup arrival -> GO -> sprint!)
//   4. Spot Hangout (terrain-valid circle, true arrival -> chat emotes & hops)
//   5. Charming Solo Break (happy stretch/hop or clean single-strike elemental practice, NEVER red '!')
//   6. Agent-Done Celebration (dry-path neighbors gather, others cheer from their spot!)

import { tr } from "./kit.js";
import { nameOf, elementOf, habitatOf, spriteCacheKey, isShiny, slotOf, MOVE_POOL, ULTIMATE_MOVES, ELEMENT_COLORS, effectiveness, moveName } from "./pokemon.js";
import {
  canWalkTerrain, pathClear, terrainAtScreen, buildWalkPath, vsArenaBounds,
  pickBattleArena, pickSpectatorSpot, pickGatherSpot, pickTagPoint, pickRaceTrack,
} from "./terrain.js";

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const rand = (lo, hi) => lo + Math.random() * (hi - lo);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

export const SLOT = 168;

export function currentPos(m, now) {
  if (!m) return { x: 240, y: 120 };
  if (!m.moving || m.dur <= 0) return { x: m.x, y: m.y };
  const f = clamp((now - m.start) / m.dur, 0, 1);
  return {
    x: m.fromX + (m.targetX - m.fromX) * f,
    y: m.fromY + (m.targetY - m.fromY) * f,
  };
}

export function dirForDelta(dx, dy, fallback = "d") {
  if (Math.abs(dx) < 2 && Math.abs(dy) < 2) return fallback;
  if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? "r" : "l";
  return dy >= 0 ? "d" : "u";
}

export function walkTo2D(m, tx, ty, speed, now, bounds, keepWaypoints = false) {
  if (!keepWaypoints) m.waypoints = [];
  const cur = currentPos(m, now);
  const nx = clamp(tx, bounds.minX, bounds.maxX);
  const ny = clamp(ty, bounds.minY, bounds.maxY);
  const dx = nx - cur.x, dy = ny - cur.y;
  const dist = Math.hypot(dx, dy);
  m.x = cur.x; m.y = cur.y;
  m.fromX = cur.x; m.fromY = cur.y;
  m.targetX = nx; m.targetY = ny;
  m.dir = dirForDelta(dx, dy, m.dir);
  m.start = now;
  if (dist < 4) {
    m.moving = false;
    m.dur = 120;
    return 0;
  }
  m.dur = Math.max(220, Math.round((dist / speed) * 1000));
  m.moving = true;
  return m.dur;
}

export function walkPath2D(m, path, speed, now, bounds) {
  if (!path || !path.length) return 0;
  m.pathSpeed = speed;
  const [first, ...rest] = path;
  m.waypoints = rest;
  return walkTo2D(m, first.x, first.y, speed, now, bounds, true);
}

// Advances queued bridge/rim waypoints seamlessly as each segment completes. Returns true if a new leg started.
export function advanceWaypoints(m, now, bounds) {
  if (!m || !m.waypoints?.length) return false;
  if (m.moving && now < m.start + m.dur) return false;
  if (m.moving) {
    m.moving = false;
    m.x = m.targetX;
    m.y = m.targetY;
  }
  while (m.waypoints.length) {
    const next = m.waypoints.shift();
    const dur = walkTo2D(m, next.x, next.y, m.pathSpeed || 90, now, bounds, true);
    if (dur > 0) return true;
  }
  return false;
}

export function hasArrived(m, now) {
  if (!m) return true;
  if (m.waypoints?.length) return false;
  if (!m.moving) return true;
  return now >= m.start + m.dur;
}

export function stopWalk2D(m, now) {
  if (!m) return;
  const cur = currentPos(m, now);
  m.x = m.fromX = m.targetX = cur.x;
  m.y = m.fromY = m.targetY = cur.y;
  m.moving = false;
  m.waypoints = [];
  m.dur = 140;
}

export function setEmote(m, kind, now, ms = 1800) {
  m.emote = kind;
  m.emoteUntil = now + ms;
}

export function setAnim(m, anim, now, ms = 680) {
  m.anim = anim; // "attackR" | "attackL" | "hurt" | "hop"
  m.animUntil = now + ms;
}

// Look up the exact single-cycle duration (ms) of an animation from cached sprite metadata so one-shot
// actions play cleanly ONCE without frantic multi-loop twitching!
function animDurationMs(sprites, agent, dexId, animKey, fallbackMs = 680) {
  if (!sprites || !dexId) return fallbackMs;
  const shiny = agent ? isShiny(slotOf(agent)) : false;
  const meta = sprites[spriteCacheKey(dexId, shiny)] ?? sprites[spriteCacheKey(dexId, false)];
  const d = meta?.[animKey]?.durMs;
  if (typeof d === "number" && d >= 180) return clamp(Math.round(d + 40), 420, 1100);
  return fallbackMs;
}

export class InteractionEngine2D {
  constructor() {
    this.events = []; // Active multi-Pokemon activities
    this.fx = [];     // { id, kind, x, y, toX, toY, born, dur }
    this.popups = []; // Floating damage / status callouts: { id, text, x, y, color, born, dur }
    this.banner = null;
    this.vsWaiting = null; // { addr, biomeId, until, cx, cy, lx, rx }
    this.nextSocialAt = Date.now() + rand(6500, 11500);
    this.nonBattleStreak = 0;
    this.seq = 1;
  }

  isBusy(addr) {
    if (this.vsWaiting?.addr === addr) return true;
    return this.events.some((e) => e.participants.includes(addr));
  }

  // Cleanly detach a Pokemon from any active event or VS waiting slot (e.g. when grabbed by user!)
  cancelParticipant(addr) {
    if (this.vsWaiting?.addr === addr) this.vsWaiting = null;
    this.events = this.events.filter((e) => !e.participants.includes(addr));
  }

  // Called when the user drops a grabbed Pokemon into the map's VS Arena!
  // 1st Pokemon waits eagerly in the left corner; dropping a 2nd Pokemon instantly starts an EPIC VS Showdown!
  onDropIntoVsArena(addr, list, mons, ids, now, bounds, env) {
    const m = mons[addr];
    if (!m || !env?.biomeId || !env?.mapBox) return null;
    const vs = vsArenaBounds(env.biomeId, env.mapBox, bounds);

    // Don't interrupt an already-running Epic VS Showdown; let the newcomer cheer nearby!
    const activeEpic = this.events.find((e) => e.kind === "battle" && e.tier === "epic");
    if (activeEpic && activeEpic.a !== addr && activeEpic.b !== addr) {
      setEmote(m, "music", now, 2000);
      setAnim(m, "hop", now, 600);
      this.addPopup("CHEER! ♪", m.x, m.y - 36, "#f59e0b", now, 1200);
      return { started: "spectate" };
    }

    // Check if another challenger is already waiting inside this biome's VS Arena!
    const w = this.vsWaiting;
    const validWaiter =
      w &&
      w.addr !== addr &&
      w.biomeId === env.biomeId &&
      now < w.until &&
      mons[w.addr] &&
      !mons[w.addr].grabbed &&
      list.some((x) => x.address === w.addr && x.status !== "blocked");

    if (validWaiter) {
      const a = w.addr;
      const b = addr;
      this.vsWaiting = null;
      this.cancelParticipant(a);
      this.cancelParticipant(b);
      walkTo2D(mons[a], vs.lx, vs.cy, 190, now, bounds);
      walkTo2D(mons[b], vs.rxPos, vs.cy, 190, now, bounds);
      mons[a].dir = "r";
      mons[b].dir = "l";
      setEmote(mons[a], "swords", now, 2200);
      setEmote(mons[b], "swords", now, 2200);
      this.addPopup("⚡ VS!", vs.cx, vs.cy - 34, "#f59e0b", now, 1300);
      return { started: "minigame", p1: a, cpu: b };
    }

    // Otherwise register as 1P (player-controlled!) waiting in the center VS pad!
    this.cancelParticipant(addr);
    m.airborne = false;
    m.perchRest = false;
    m.burrowed = false;
    walkTo2D(m, vs.lx, vs.cy, 180, now, bounds);
    m.dir = "r";
    setEmote(m, "swords", now, 26000);
    setAnim(m, "hop", now, 540);
    this.vsWaiting = {
      addr,
      biomeId: env.biomeId,
      until: now + 26000,
      cx: vs.cx,
      cy: vs.cy,
      lx: vs.lx,
      rx: vs.rxPos,
    };
    this.addPopup("1P 就绪! ⚔", vs.lx, vs.cy - 40, "#2563eb", now, 1600);
    this.banner = {
      text: `🎮 1P ${nameOf(ids[addr])} 已入场！再拖入 1 只对手 (CPU) 开启对战`,
      color: "#2563eb",
      until: now + 4200,
    };
    return { started: "waiting", addr };
  }

  startEpicBattle(a, b, vs, list, mons, ids, now, bounds, env) {
    const mA = mons[a], mB = mons[b];
    if (!mA || !mB) return false;
    mA.burrowed = false; mB.burrowed = false;
    mA.perchRest = false; mB.perchRest = false;
    walkTo2D(mA, vs.lx, vs.cy, 190, now, bounds);
    walkTo2D(mB, vs.rxPos, vs.cy, 190, now, bounds);
    setEmote(mA, "swords", now, 2200);
    setEmote(mB, "swords", now, 2200);

    // Up to 3 free spectators rush over from valid terrain to watch the championship match!
    const spectators = [];
    const others = list.filter(
      (x) => x.address !== a && x.address !== b && mons[x.address] && !mons[x.address].grabbed && x.status !== "blocked" && !this.isBusy(x.address),
    ).slice(0, 3);
    others.forEach((spObj, idx) => {
      const spAddr = spObj.address;
      const spPos = currentPos(mons[spAddr], now);
      const spHab = habitatOf(ids[spAddr]);
      const spot = env?.biomeId && env?.mapBox
        ? pickSpectatorSpot(env.biomeId, spHab, spPos, vs.cx, vs.cy, idx, env.mapBox, bounds)
        : null;
      if (spot) {
        spectators.push(spAddr);
        walkPath2D(mons[spAddr], spot.path, 130, now, bounds);
        setEmote(mons[spAddr], "star", now, 2000);
      }
    });

    this.nonBattleStreak = 0;
    this.events.push({
      id: `epic-${this.seq++}`,
      kind: "battle",
      tier: "epic",
      a, b, spectators,
      participants: [a, b, ...spectators],
      cx: vs.cx, lx: vs.lx, rx: vs.rxPos, cy: vs.cy,
      maxHp: 150,
      hpA: 150, hpB: 150,
      turn: 0,
      maxTurns: 6,
      usedUltA: false,
      usedUltB: false,
      lastAnimMs: 700,
      stage: "approach",
      stageAt: now,
    });
    this.addPopup("⚡ VS START!", vs.cx, vs.cy - 34, "#f59e0b", now, 1600);
    this.addFx("electric", vs.cx, vs.cy, vs.cx, vs.cy, now, 620);
    this.banner = {
      text: `⚡ EPIC VS SHOWDOWN: ${nameOf(ids[a])} vs ${nameOf(ids[b])}!`,
      color: "#eab308",
      until: now + 3200,
    };
    return true;
  }

  addPopup(text, x, y, color, now, dur = 1250) {
    this.popups.push({ id: `pop-${this.seq++}`, text, x, y, color, born: now, dur });
    if (this.popups.length > 10) this.popups.shift();
  }

  addFx(kind, x, y, toX, toY, now, dur = 680) {
    this.fx.push({ id: `fx-${this.seq++}`, kind, x, y, toX, toY, born: now, dur });
  }

  onAgentDone(doneAddr, list, mons, ids, now, bounds, env = null) {
    const dm = mons[doneAddr];
    if (!dm) return;
    const dp = currentPos(dm, now);
    setAnim(dm, "hop", now, 1100);
    setEmote(dm, "star", now, 2800);
    this.addPopup(tr("完成！★", "DONE! ★"), dp.x, dp.y - 36, "#16a34a", now, 1800);
    for (const other of list) {
      if (other.address === doneAddr || this.isBusy(other.address)) continue;
      const om = mons[other.address];
      if (!om) continue;
      const op = currentPos(om, now);
      if (Math.hypot(op.x - dp.x, op.y - dp.y) < 340) {
        const ang = Math.atan2(op.y - dp.y, op.x - dp.x);
        const tx = clamp(dp.x + Math.cos(ang) * 58, bounds.minX, bounds.maxX);
        const ty = clamp(dp.y + Math.sin(ang) * 34, bounds.minY, bounds.maxY);
        const hab = habitatOf(ids[other.address]);
        if (env?.biomeId && env?.mapBox) {
          const path = buildWalkPath(env.biomeId, hab, op.x, op.y, tx, ty, env.mapBox, bounds);
          if (path) walkPath2D(om, path, 92, now, bounds);
        } else {
          walkTo2D(om, tx, ty, 88, now, bounds);
        }
        setEmote(om, "music", now, 2400);
        setAnim(om, "hop", now, 900);
      }
    }
    this.banner = {
      text: tr(`★ ${nameOf(ids[doneAddr])} 完成了任务，大家来庆祝啦！`, `★ ${nameOf(ids[doneAddr])} finished its task! Party cheers!`),
      color: "#16a34a",
      until: now + 3200,
    };
  }

  // Scatter participants back to their natural terrain habitats after an event ends
  // using dry-land / bridge waypoint paths so land Pokemon NEVER cross water on the way home!
  disperse(addrs, mons, ids, now, bounds, env = null) {
    const spanX = bounds.maxX - bounds.minX;
    addrs.forEach((addr, idx) => {
      const m = mons[addr];
      if (!m) return;
      const cur = currentPos(m, now);
      if (env?.pickTarget && ids?.[addr]) {
        const pt = env.pickTarget(ids[addr], cur.x, cur.y);
        if (pt.path?.length) walkPath2D(m, pt.path, rand(52, 74), now, bounds);
        else walkTo2D(m, pt.x, pt.y, rand(52, 74), now, bounds);
      } else {
        const sector = (idx + Math.floor(Math.random() * 4)) % 4;
        const sx = bounds.minX + (sector * 0.25 + rand(0.04, 0.21)) * spanX;
        const sy = rand(bounds.minY + 6, bounds.maxY - 6);
        walkTo2D(m, sx, sy, rand(46, 68), now, bounds);
      }
      m.pauseUntil = now + rand(2200, 5600);
    });
  }

  // ---- 1. Multi-Round 2D Arena Battle (Terrain-Aware & True Arrival!) ----

  startBattle(freeAgents, mons, ids, now, bounds, env) {
    if (freeAgents.length < 2) return false;
    const shuffled = [...freeAgents].sort(() => Math.random() - 0.5);
    let chosen = null;

    // Try pairs until we find two fighters that can cleanly reach a shared dry/shore/aquatic arena!
    for (let i = 0; i < shuffled.length && !chosen; i++) {
      for (let j = i + 1; j < shuffled.length && !chosen; j++) {
        const aObj = shuffled[i], bObj = shuffled[j];
        const a = aObj.address, b = bObj.address;
        const posA = currentPos(mons[a], now), posB = currentPos(mons[b], now);
        const habA = habitatOf(ids[a]), habB = habitatOf(ids[b]);
        const arena = env?.biomeId && env?.mapBox
          ? pickBattleArena(env.biomeId, habA, posA, habB, posB, env.mapBox, bounds)
          : {
              cx: bounds.arenaX, cy: bounds.arenaY,
              lx: bounds.arenaX - 58, rx: bounds.arenaX + 58,
              pathA: [{ x: bounds.arenaX - 58, y: bounds.arenaY }],
              pathB: [{ x: bounds.arenaX + 58, y: bounds.arenaY }],
            };
        if (arena) {
          chosen = { aObj, bObj, a, b, arena };
        }
      }
    }
    if (!chosen) return false;

    const { a, b, arena } = chosen;
    walkPath2D(mons[a], arena.pathA, 148, now, bounds);
    walkPath2D(mons[b], arena.pathB, 148, now, bounds);
    setEmote(mons[a], "swords", now, 2200);
    setEmote(mons[b], "swords", now, 2200);

    // At most 1-2 spectators watch from valid nearby terrain!
    const spectators = [];
    const others = shuffled.filter((x) => x.address !== a && x.address !== b).slice(0, 2);
    others.forEach((spObj, idx) => {
      const spAddr = spObj.address;
      const spPos = currentPos(mons[spAddr], now);
      const spHab = habitatOf(ids[spAddr]);
      const spot = env?.biomeId && env?.mapBox
        ? pickSpectatorSpot(env.biomeId, spHab, spPos, arena.cx, arena.cy, idx, env.mapBox, bounds)
        : null;
      if (spot) {
        spectators.push(spAddr);
        walkPath2D(mons[spAddr], spot.path, 112, now, bounds);
        setEmote(mons[spAddr], "music", now, 1600);
      }
    });

    this.nonBattleStreak = 0;
    this.events.push({
      id: `bat-${this.seq++}`,
      kind: "battle",
      a, b, spectators,
      participants: [a, b, ...spectators],
      cx: arena.cx, lx: arena.lx, rx: arena.rx, cy: arena.cy,
      hpA: 100, hpB: 100,
      turn: 0,
      maxTurns: 4,
      lastAnimMs: 680,
      stage: "approach",
      stageAt: now,
    });
    this.banner = {
      text: tr(`⚔ 切磋对战：${nameOf(ids[a])} 对阵 ${nameOf(ids[b])}`, `⚔ Friendly Battle: ${nameOf(ids[a])} vs ${nameOf(ids[b])}`),
      color: "#dc2626",
      until: now + 2800,
    };
    return true;
  }

  stepBattle(ev, list, mons, ids, now, bounds, env) {
    const mA = mons[ev.a], mB = mons[ev.b];
    const elapsed = now - ev.stageAt;

    if (ev.stage === "approach") {
      advanceWaypoints(mA, now, bounds);
      advanceWaypoints(mB, now, bounds);
      for (const sp of ev.spectators) advanceWaypoints(mons[sp], now, bounds);

      const readyA = hasArrived(mA, now);
      const readyB = hasArrived(mB, now);
      // Wait until BOTH fighters have actually converged face-to-face at the arena (safety cap 5.8s)!
      if (!(readyA && readyB) && elapsed < 5800) return false;

      stopWalk2D(mA, now); stopWalk2D(mB, now);
      mA.dir = "r"; mB.dir = "l";
      for (const sp of ev.spectators) {
        const ms = mons[sp];
        if (!ms) continue;
        if (hasArrived(ms, now)) {
          stopWalk2D(ms, now);
          const spPos = currentPos(ms, now);
          ms.dir = spPos.y < ev.cy ? "d" : "u";
          setEmote(ms, "music", now, 1600);
        }
      }
      ev.stage = "turn";
      ev.stageAt = now;
      return true;
    }

    if (ev.stage === "turn") {
      const isA = ev.turn % 2 === 0;
      const atkAddr = isA ? ev.a : ev.b;
      const defAddr = isA ? ev.b : ev.a;
      const mAtk = mons[atkAddr], mDef = mons[defAddr];
      const aAtk = list.find((x) => x.address === atkAddr);
      const aDef = list.find((x) => x.address === defAddr);
      const atkId = ids[atkAddr], defId = ids[defAddr];
      const atkHab = habitatOf(atkId), defHab = habitatOf(defId);
      const isEpic = ev.tier === "epic";
      const atkElem = elementOf(atkId), defElem = elementOf(defId);
      const atkHp = isA ? ev.hpA : ev.hpB;
      const usedUlt = isA ? ev.usedUltA : ev.usedUltB;
      // Higher-tier Epic VS Battles unleash signature Ultimate Moves mid-to-late showdown!
      const isUlt = isEpic && !usedUlt && (ev.turn >= 3 || atkHp <= 88);
      if (isUlt) {
        if (isA) ev.usedUltA = true;
        else ev.usedUltB = true;
      }
      const move = isUlt ? ULTIMATE_MOVES[atkElem] : pick(MOVE_POOL[atkElem]);
      const pAtk = currentPos(mAtk, now), pDef = currentPos(mDef, now);

      const atkAnim = isA ? "attackR" : "attackL";
      const atkMs = animDurationMs(env?.sprites, aAtk, atkId, atkAnim, 680);
      const hurtMs = animDurationMs(env?.sprites, aDef, defId, "hurt", 620);
      ev.lastAnimMs = Math.max(atkMs, hurtMs) + (isUlt ? 180 : 0);

      mAtk.dir = isA ? "r" : "l";
      mDef.dir = isA ? "l" : "r";
      setAnim(mAtk, atkAnim, now, atkMs);
      if (isUlt) {
        mAtk.evoGlowUntil = Math.max(mAtk.evoGlowUntil || 0, now + 1150);
        this.addPopup(`⚡ ${move.name.toUpperCase()}!`, pAtk.x, pAtk.y - 44, "#eab308", now, 1450);
      }

      const safeStep = (hab, fromPos, toX, toY) => {
        const nx = clamp(toX, bounds.minX, bounds.maxX);
        const ny = clamp(toY, bounds.minY, bounds.maxY);
        if (!env?.biomeId || !env?.mapBox) return { x: nx, y: ny };
        if (canWalkTerrain(hab, terrainAtScreen(env.biomeId, nx, ny, env.mapBox)) && pathClear(env.biomeId, hab, fromPos.x, fromPos.y, nx, ny, env.mapBox)) {
          return { x: nx, y: ny };
        }
        return null;
      };

      const dodged = !isUlt && Math.random() < 0.16;
      if (dodged) {
        const dy = Math.random() < 0.5 ? -22 : 22;
        const step = safeStep(defHab, pDef, pDef.x, pDef.y + dy) ?? safeStep(defHab, pDef, pDef.x, pDef.y - dy);
        if (step) walkTo2D(mDef, step.x, step.y, 165, now, bounds);
        else setAnim(mDef, "hop", now, 480);
        this.addPopup(tr("闪避！", "MISS!"), pDef.x, pDef.y - 34, "#64748b", now, 1100);
        this.banner = {
          text: tr(`⚔ ${nameOf(atkId)} 使出${moveName(move)}，被 ${nameOf(defId)} 闪开了！`, `⚔ ${nameOf(atkId)} used ${moveName(move)} — ${nameOf(defId)} dodged!`),
          color: "#64748b",
          until: now + 1500,
        };
      } else {
        // Execute Melee Lunge or Multi-Projectile Elemental Volley
        if (!move.ranged) {
          const lungeStep = safeStep(atkHab, pAtk, pDef.x + (isA ? -28 : 28), pDef.y);
          if (lungeStep) walkTo2D(mAtk, lungeStep.x, lungeStep.y, 260, now, bounds);
          this.addFx(atkElem, pDef.x, pDef.y, pDef.x, pDef.y, now, 620);
          this.addFx("impact", pDef.x, pDef.y, pDef.x, pDef.y, now, 520);
        } else {
          const count = move.count ?? 2;
          for (let k = 0; k < count; k++) {
            const spreadY = (k - (count - 1) / 2) * 14;
            this.addFx(atkElem, pAtk.x + (isA ? 18 : -18), pAtk.y + spreadY * 0.45, pDef.x, pDef.y + spreadY * 0.65, now, 540 + k * 120);
          }
        }
        // Damage calc with real type effectiveness & crit!
        const mult = effectiveness(atkElem, defElem);
        const crit = Math.random() < 0.22;
        const dmg = Math.round(rand(22, 34) * mult * (crit ? 1.42 : 1));
        if (isA) ev.hpB = Math.max(8, ev.hpB - dmg);
        else ev.hpA = Math.max(8, ev.hpA - dmg);

        // Defender recoils & plays ONE clean Hurt anim (never knocked into water!)
        setAnim(mDef, "hurt", now, hurtMs);
        const knockStep = safeStep(defHab, pDef, pDef.x + (isA ? 18 : -18), pDef.y);
        if (knockStep) walkTo2D(mDef, knockStep.x, knockStep.y, 160, now, bounds);

        const tag = crit ? tr(`要害 -${dmg}`, `CRIT -${dmg}`) : mult > 1.1 ? tr(`绝佳 -${dmg}`, `SUPER -${dmg}`) : `-${dmg}`;
        const col = crit ? "#dc2626" : mult > 1.1 ? "#ea580c" : ELEMENT_COLORS[atkElem];
        this.addPopup(tag, pDef.x, pDef.y - 38, col, now, 1300);
        this.banner = {
          text: tr(
            `⚔ ${nameOf(atkId)} 使出${moveName(move)}！${mult > 1.1 ? "效果绝佳！" : crit ? "击中要害！" : ""}`,
            `⚔ ${nameOf(atkId)} used ${moveName(move)}!${mult > 1.1 ? " Super effective!" : crit ? " Critical hit!" : ""}`,
          ),
          color: ELEMENT_COLORS[atkElem],
          until: now + 1600,
        };
      }

      // Spectators cheer!
      for (const sp of ev.spectators) {
        const ms = mons[sp];
        if (ms) { setEmote(ms, dodged ? "?" : "star", now, 1000); setAnim(ms, "hop", now, 520); }
      }

      ev.turn++;
      ev.stage = "recover";
      ev.stageAt = now;
      return true;
    }

    if (ev.stage === "recover") {
      if (elapsed < Math.max(1050, (ev.lastAnimMs || 680) + 220)) return false;
      // Return fighters cleanly to their arena spots
      walkTo2D(mA, ev.lx, ev.cy, 145, now, bounds);
      walkTo2D(mB, ev.rx, ev.cy, 145, now, bounds);
      if (ev.turn >= ev.maxTurns || ev.hpA <= 14 || ev.hpB <= 14) {
        const isEpic = ev.tier === "epic";
        const winAddr = ev.hpA >= ev.hpB ? ev.a : ev.b;
        const loseAddr = winAddr === ev.a ? ev.b : ev.a;
        ev.winner = winAddr;
        const winM = mons[winAddr], loseM = mons[loseAddr];
        setAnim(winM, "hop", now, isEpic ? 1700 : 1400);
        setEmote(winM, "star", now, isEpic ? 2800 : 2200);
        setEmote(loseM, "heart", now, 2200);
        if (isEpic) {
          winM.evoGlowUntil = Math.max(winM.evoGlowUntil || 0, now + 2600);
          env?.onBattleXp?.(winAddr, loseAddr, true);
        }
        const wp = currentPos(winM, now);
        this.addPopup(tr("★ 获胜！", "★ WIN!"), wp.x, wp.y - 42, "#d97706", now, 1900);
        for (const sp of ev.spectators) {
          if (mons[sp]) { setEmote(mons[sp], "music", now, 2000); setAnim(mons[sp], "hop", now, 850); }
        }
        this.banner = {
          text: tr(`★ ${nameOf(ids[winAddr])} 赢得了切磋对战！`, `★ ${nameOf(ids[winAddr])} won the battle!`),
          color: "#16a34a",
          until: now + 2600,
        };
        ev.stage = "finish";
        ev.stageAt = now;
      } else {
        ev.stage = "waitTurn";
        ev.stageAt = now;
      }
      return true;
    }

    if (ev.stage === "waitTurn") {
      if (!(hasArrived(mA, now) && hasArrived(mB, now)) && elapsed < 950) return false;
      stopWalk2D(mA, now); stopWalk2D(mB, now);
      mA.dir = "r"; mB.dir = "l";
      ev.stage = "turn";
      ev.stageAt = now;
      return true;
    }

    if (ev.stage === "finish") {
      if (elapsed < 1900) return false;
      setEmote(mA, "heart", now, 1500);
      setEmote(mB, "heart", now, 1500);
      mA.pauseUntil = now + rand(1200, 3200);
      mB.pauseUntil = now + rand(1200, 3200);
      return "done";
    }
    return false;
  }

  // ---- 2. 2D Terrain-Aware Tag / Chase ----

  startTag(freeAgents, mons, ids, now, bounds, env) {
    if (freeAgents.length < 2) return false;
    const shuffled = [...freeAgents].sort(() => Math.random() - 0.5);
    for (let i = 0; i < shuffled.length; i++) {
      for (let j = i + 1; j < shuffled.length; j++) {
        const runner = shuffled[i].address, chaser = shuffled[j].address;
        const posR = currentPos(mons[runner], now), posC = currentPos(mons[chaser], now);
        const habR = habitatOf(ids[runner]), habC = habitatOf(ids[chaser]);
        const target = env?.biomeId && env?.mapBox
          ? pickTagPoint(env.biomeId, habR, posR, habC, posC, env.mapBox, bounds)
          : null;
        if (!target) continue;
        walkPath2D(mons[runner], target.pathR, 122, now, bounds);
        walkPath2D(mons[chaser], target.pathC, 114, now, bounds);
        setEmote(mons[runner], "music", now, 2200);
        setEmote(mons[chaser], "music", now, 1400);
        this.events.push({
          id: `tag-${this.seq++}`,
          kind: "tag",
          runner, chaser,
          participants: [runner, chaser],
          leg: 0,
          stageAt: now,
        });
        this.banner = {
          text: tr(`♪ ${nameOf(ids[runner])} 和 ${nameOf(ids[chaser])} 正在玩捉迷藏！`, `♪ ${nameOf(ids[runner])} & ${nameOf(ids[chaser])} are playing tag!`),
          color: "#2563eb",
          until: now + 2400,
        };
        return true;
      }
    }
    return false;
  }

  stepTag(ev, mons, ids, now, bounds, env) {
    const elapsed = now - ev.stageAt;
    const mR = mons[ev.runner], mC = mons[ev.chaser];
    advanceWaypoints(mR, now, bounds);
    advanceWaypoints(mC, now, bounds);
    if (elapsed < 2000 && !(hasArrived(mR, now) && hasArrived(mC, now))) return false;
    ev.leg++;
    if (ev.leg <= 2) {
      if (ev.leg === 2) {
        const tmp = ev.runner; ev.runner = ev.chaser; ev.chaser = tmp;
        const p = currentPos(mons[ev.runner], now);
        this.addPopup(tr("抓到啦！", "TAG!"), p.x, p.y - 34, "#2563eb", now, 1100);
      }
      const posR = currentPos(mons[ev.runner], now), posC = currentPos(mons[ev.chaser], now);
      const habR = habitatOf(ids[ev.runner]), habC = habitatOf(ids[ev.chaser]);
      const target = env?.biomeId && env?.mapBox
        ? pickTagPoint(env.biomeId, habR, posR, habC, posC, env.mapBox, bounds)
        : null;
      if (target) {
        walkPath2D(mons[ev.runner], target.pathR, 124, now, bounds);
        walkPath2D(mons[ev.chaser], target.pathC, 114, now, bounds);
        setEmote(mons[ev.runner], "music", now, 1800);
        setEmote(mons[ev.chaser], "music", now, 1800);
        ev.stageAt = now;
        return true;
      }
    }
    stopWalk2D(mR, now); stopWalk2D(mC, now);
    setAnim(mR, "hop", now, 700); setAnim(mC, "hop", now, 700);
    setEmote(mR, "heart", now, 1600); setEmote(mC, "heart", now, 1600);
    return "done";
  }

  // ---- 3. Terrain-Safe 2D Sprint Race ----

  startRace(freeAgents, mons, ids, now, bounds, env) {
    if (freeAgents.length < 2) return false;
    const shuffled = [...freeAgents].sort(() => Math.random() - 0.5);
    const racers = shuffled.slice(0, Math.min(3, shuffled.length)).map((x) => x.address);
    const habsByAddr = {};
    const posByAddr = {};
    for (const addr of racers) {
      habsByAddr[addr] = habitatOf(ids[addr]);
      posByAddr[addr] = currentPos(mons[addr], now);
    }
    const track = env?.biomeId && env?.mapBox
      ? pickRaceTrack(env.biomeId, racers, habsByAddr, posByAddr, env.mapBox, bounds)
      : null;
    if (!track) return false;

    for (const addr of racers) {
      walkPath2D(mons[addr], track.lanes[addr].approach, 136, now, bounds);
      setEmote(mons[addr], "star", now, 1400);
    }
    this.events.push({
      id: `race-${this.seq++}`,
      kind: "race",
      racers,
      participants: [...racers],
      startX: track.startX,
      finishX: track.finishX,
      lanes: track.lanes,
      stage: "lineup",
      stageAt: now,
    });
    this.banner = {
      text: tr(`🏁 赛跑开始：${racers.map((a) => nameOf(ids[a])).join("、")}`, `🏁 Race: ${racers.map((a) => nameOf(ids[a])).join(" vs ")}`),
      color: "#d97706",
      until: now + 2600,
    };
    return true;
  }

  stepRace(ev, mons, ids, now, bounds) {
    const elapsed = now - ev.stageAt;
    for (const addr of ev.racers) advanceWaypoints(mons[addr], now, bounds);

    if (ev.stage === "lineup") {
      const allLinedUp = ev.racers.every((addr) => hasArrived(mons[addr], now));
      if (!allLinedUp && elapsed < 4600) return false;
      ev.stage = "sprint";
      ev.stageAt = now;
      let fastest = ev.racers[0], bestSpeed = 0;
      ev.racers.forEach((addr) => {
        const m = mons[addr];
        stopWalk2D(m, now);
        const ly = ev.lanes?.[addr]?.y ?? currentPos(m, now).y;
        const spd = rand(130, 172);
        if (spd > bestSpeed) { bestSpeed = spd; fastest = addr; }
        walkTo2D(m, ev.finishX, ly, spd, now, bounds);
        setEmote(m, "music", now, 1800);
      });
      ev.winner = fastest;
      this.banner = { text: tr("🏁 预备——冲刺！", "🏁 GO!! Sprint to the finish!"), color: "#16a34a", until: now + 1800 };
      return true;
    }
    if (ev.stage === "sprint") {
      const wm = mons[ev.winner];
      if (!hasArrived(wm, now) && elapsed < 3200) return false;
      ev.stage = "finish";
      ev.stageAt = now;
      for (const addr of ev.racers) stopWalk2D(mons[addr], now);
      if (wm) {
        const wp = currentPos(wm, now);
        setAnim(wm, "hop", now, 1200);
        setEmote(wm, "star", now, 2000);
        this.addPopup(tr("★ 第一名！", "★ 1ST!"), wp.x, wp.y - 38, "#d97706", now, 1800);
        this.banner = {
          text: tr(`★ ${nameOf(ids[ev.winner])} 获得了赛跑冠军！`, `★ ${nameOf(ids[ev.winner])} won the race!`),
          color: "#d97706",
          until: now + 2400,
        };
      }
      return true;
    }
    if (ev.stage === "finish" && elapsed >= 1700) return "done";
    return false;
  }

  // ---- 4. Terrain-Safe Spot Hangout (True Arrival!) ----

  startGather(freeAgents, mons, ids, now, bounds, env) {
    if (freeAgents.length < 2) return false;
    const shuffled = [...freeAgents].sort(() => Math.random() - 0.5);
    const members = shuffled.slice(0, Math.min(3, shuffled.length)).map((x) => x.address);
    const habsByAddr = {};
    const posByAddr = {};
    for (const addr of members) {
      habsByAddr[addr] = habitatOf(ids[addr]);
      posByAddr[addr] = currentPos(mons[addr], now);
    }
    const spot = env?.biomeId && env?.mapBox
      ? pickGatherSpot(env.biomeId, members, habsByAddr, posByAddr, env.mapBox, bounds)
      : null;
    if (!spot) return false;

    for (const addr of members) {
      walkPath2D(mons[addr], spot.slots[addr].path, 108, now, bounds);
    }
    this.events.push({
      id: `gath-${this.seq++}`,
      kind: "gather",
      members,
      participants: [...members],
      cx: spot.cx, cy: spot.cy,
      step: 0,
      stageAt: now,
    });
    this.banner = {
      text: tr(`💬 闲聊聚会：${members.map((a) => nameOf(ids[a])).join("、")}`, `💬 Hanging out: ${members.map((a) => nameOf(ids[a])).join(" & ")}`),
      color: "#7c3aed",
      until: now + 2200,
    };
    return true;
  }

  stepGather(ev, mons, _ids, now, bounds) {
    const elapsed = now - ev.stageAt;
    for (const addr of ev.members) advanceWaypoints(mons[addr], now, bounds);

    if (ev.step === 0) {
      const allHere = ev.members.every((addr) => hasArrived(mons[addr], now));
      if (!allHere && elapsed < 4600) return false;
      ev.members.forEach((addr) => {
        const m = mons[addr];
        stopWalk2D(m, now);
        const p = currentPos(m, now);
        m.dir = dirForDelta(ev.cx - p.x, ev.cy - p.y, "d");
      });
      setEmote(mons[ev.members[0]], "?", now, 1200);
      ev.step = 1; ev.stageAt = now;
      return true;
    }
    if (ev.step === 1 && elapsed >= 1200) {
      const speaker = mons[ev.members[1 % ev.members.length]];
      setEmote(speaker, "music", now, 1200);
      setAnim(speaker, "hop", now, 620);
      ev.step = 2; ev.stageAt = now;
      return true;
    }
    if (ev.step === 2 && elapsed >= 1200) {
      ev.members.forEach((addr) => {
        setEmote(mons[addr], "heart", now, 1500);
        setAnim(mons[addr], "hop", now, 700);
      });
      ev.step = 3; ev.stageAt = now;
      return true;
    }
    if (ev.step === 3 && elapsed >= 1400) return "done";
    return false;
  }

  // ---- 5. Charming Solo Break (happy hop stretch OR clean single-strike elemental practice; NEVER red '!') ----

  startSoloBreak(agent, mons, ids, now, bounds, env) {
    const addr = agent.address;
    const m = mons[addr];
    if (!m) return false;
    stopWalk2D(m, now);
    const p = currentPos(m, now);
    const dexId = ids[addr];

    if (Math.random() < 0.65) {
      // Cheerful happy stretch / music hop (never looks like a broken air-punch!)
      const hopMs = animDurationMs(env?.sprites, agent, dexId, "hop", 720);
      setAnim(m, "hop", now, hopMs);
      setEmote(m, Math.random() < 0.55 ? "music" : "heart", now, 1800);
      this.events.push({ id: `solo-${this.seq++}`, kind: "train", addr, participants: [addr], dur: hopMs + 280, stageAt: now });
      return true;
    }

    // Clean single-strike elemental practice with swords icon (NEVER red '!')
    const elem = elementOf(dexId);
    const dir = p.x < bounds.arenaX ? "r" : "l";
    const animKey = dir === "r" ? "attackR" : "attackL";
    const atkMs = animDurationMs(env?.sprites, agent, dexId, animKey, 660);
    m.dir = dir;
    setAnim(m, animKey, now, atkMs);
    setEmote(m, "swords", now, 1300);
    this.addFx(elem, p.x + (dir === "r" ? 20 : -20), p.y, p.x + (dir === "r" ? 76 : -76), p.y, now, 620);
    this.events.push({ id: `tr-${this.seq++}`, kind: "train", addr, participants: [addr], dur: atkMs + 260, stageAt: now });
    return true;
  }

  tick(list, mons, ids, now, bounds, env = null) {
    let changed = false;
    const socialGap = () => (env?.eco ? rand(28000, 45000) : rand(16000, 26000));

    const beforeFx = this.fx.length;
    this.fx = this.fx.filter((f) => now - f.born < f.dur);
    if (this.fx.length !== beforeFx) changed = true;

    const beforePop = this.popups.length;
    this.popups = this.popups.filter((p) => now - p.born < p.dur);
    if (this.popups.length !== beforePop) changed = true;

    if (this.banner && now >= this.banner.until) { this.banner = null; changed = true; }

    // Expire or validate VS Arena waiting challenger
    if (this.vsWaiting) {
      const w = this.vsWaiting;
      const a = list.find((x) => x.address === w.addr);
      const wm = mons[w.addr];
      const invalid = !a || !wm || a.status === "blocked" || wm.grabbed || (env?.biomeId && w.biomeId !== env.biomeId) || now >= w.until;
      if (invalid) {
        if (wm && wm.emote === "swords") wm.emote = null;
        this.vsWaiting = null;
        changed = true;
      } else if (!wm.moving && wm.dir !== "r") {
        wm.dir = "r";
      }
    }

    for (const a of list) {
      const m = mons[a.address];
      if (!m) continue;
      if (m.emote && now >= m.emoteUntil) { m.emote = null; changed = true; }
      if (m.anim && now >= m.animUntil) { m.anim = null; changed = true; }
    }

    // Advance active events
    for (let i = this.events.length - 1; i >= 0; i--) {
      const ev = this.events[i];
      const valid = ev.participants.every((addr) => {
        const a = list.find((x) => x.address === addr);
        return a && mons[addr] && !mons[addr].grabbed && a.status !== "blocked";
      });
      if (!valid) { this.events.splice(i, 1); changed = true; continue; }

      let res = false;
      if (ev.kind === "battle") res = this.stepBattle(ev, list, mons, ids, now, bounds, env);
      else if (ev.kind === "tag") res = this.stepTag(ev, mons, ids, now, bounds, env);
      else if (ev.kind === "race") res = this.stepRace(ev, mons, ids, now, bounds);
      else if (ev.kind === "gather") res = this.stepGather(ev, mons, ids, now, bounds);
      else if (ev.kind === "train") res = now - ev.stageAt >= (ev.dur ?? 950) ? "done" : false;

      if (res === "done") {
        // Scatter Pokemon back to their natural terrain habitats & wait before the next social event!
        if (ev.kind !== "train") {
          this.disperse(ev.participants, mons, ids, now, bounds, env);
        }
        this.events.splice(i, 1);
        this.nextSocialAt = now + socialGap();
        changed = true;
      } else if (res) {
        changed = true;
      }
    }

    // Lively, balanced social cadence between multi-Pokemon activities
    // Battle (38%, guaranteed after 3 non-battle events!), Tag (22%), Gather (22%), Race (12%), Solo (6%)
    if (now >= this.nextSocialAt && this.events.length === 0) {
      const free = list.filter((a) => mons[a.address] && !mons[a.address].grabbed && a.status !== "blocked" && mons[a.address].mood !== "sleep" && !this.isBusy(a.address));
      if (free.length >= 2) {
        this.nextSocialAt = now + socialGap();
        const forceBattle = this.nonBattleStreak >= 3;
        const roll = Math.random();
        let started = false;

        if (forceBattle || roll < 0.38) {
          started = this.startBattle(free, mons, ids, now, bounds, env);
        } else if (roll < 0.60) {
          started = this.startTag(free, mons, ids, now, bounds, env);
          if (started) this.nonBattleStreak++;
        } else if (roll < 0.82) {
          started = this.startGather(free, mons, ids, now, bounds, env);
          if (started) this.nonBattleStreak++;
        } else if (roll < 0.94) {
          started = this.startRace(free, mons, ids, now, bounds, env);
          if (started) this.nonBattleStreak++;
        } else {
          started = this.startSoloBreak(pick(free), mons, ids, now, bounds, env);
          if (started) this.nonBattleStreak++;
        }
        // Fallback: if chosen activity couldn't find a valid terrain spot (e.g. tight island), try battle then gather!
        if (!started) {
          started = this.startBattle(free, mons, ids, now, bounds, env)
            || this.startGather(free, mons, ids, now, bounds, env);
        }
        if (started) changed = true;
      } else if (free.length === 1 && free[0].status === "working") {
        this.nextSocialAt = now + (env?.eco ? rand(32000, 48000) : rand(24000, 38000));
        if (this.startSoloBreak(free[0], mons, ids, now, bounds, env)) changed = true;
      } else {
        this.nextSocialAt = now + (env?.eco ? rand(24000, 36000) : rand(14000, 22000));
      }
    }

    return changed;
  }

  battleFor(addr) {
    return this.events.find((e) => e.kind === "battle" && (e.a === addr || e.b === addr)) ?? null;
  }
}
