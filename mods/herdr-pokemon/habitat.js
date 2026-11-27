// 2D Top-Down Pokemon Overworld Playground!
// - True 2D (x, y) roaming across a crisp pixel-art GBA overworld map with Y-depth sorting
// - 4 directions (Up/Down/Left/Right) + real PMDCollab Attack, Hurt, Hop & Sleep animations
// - Deep multi-round arena battles (with spectators, projectiles, dodges, floating damage popups)
// - Rich 2D play modes (Tag, Road Race, Plaza Hangout, Solo Training, Done Celebrations)
// - NO ground-click berry feeding (zero click hijacking when clicking Pokemon!)

import { div, image, svg } from "gpui-kit";
import { h_flex } from "gpui-base";
import { agents, terminals, spaces, settings, run, shared, setShared, playSound, notify, layout, window as herdrWindow, checking } from "herdr";
import {
  palette, alpha, applyUiFont, applyBadgeFont, isZh, tr, findNode, isEcoFx,
  BIOME_KEY, BIOME_INTERVAL_KEY, WEATHER_KEY, WEATHER_INTERVAL_KEY, TIME_KEY, HABITAT_RELEASE_KEY, HABITAT_RECALL_KEY,
  iconAsset, mapAsset, mapFgAsset, fxAsset, fxGifAsset, ballAsset, openPokePicker, openHabitatPrefs,
} from "./kit.js";
import {
  nameOf, habitatOf, assignPokemon, savePicks, slotOf, loadSpriteFast, loadSprite2D, ensurePortraits,
  ensureIconsFor, hasMenuIcon, ensureCry, ensureChirp, crySetOf, CRY_KEY, PORTRAITS_KEY,
  imageMagick, VERSION_2D, FLY_VERSION, menuIconPath, nextEvolution, slotXpOf, saveXpBatch, levelInfo,
  baseFormOf, isShiny, isEvoLocked, sizeScaleOf, sizeLabelOf, spriteCacheKey, movesForSlot, resetSlotMoves,
} from "./pokemon.js";
import {
  InteractionEngine2D, SLOT, currentPos, walkTo2D, walkPath2D, advanceWaypoints, stopWalk2D, setAnim, setEmote,
} from "./interactions.js";
import {
  computeMapBox, terrainAtScreen, canWalkTerrain, nearestWalkable, pickTerrainTarget,
  waterSparkleCoords, waterfallCoords,
} from "./terrain.js";
import EmbeddedBattle from "./battle.js";
import { LAST_TOAST_KEY } from "./toast.js";

const LABEL_H = 17;
const SPEED = { working: 76, idle: 38 };
const SLEEP_AFTER = 3 * 60 * 1000;
const CRY_GAP = 1500;

export const BIOMES = [
  { id: "meadow", name: "Pallet River",       cn: "真新镇曲流原野", ja: "マサラ川原",       ko: "태초마을 강변",   defaultWeather: "sunny" },
  { id: "lake",   name: "Cerulean Bay",       cn: "华蓝群岛海湾",   ja: "ハナダ湾",         ko: "블루시티 해만",   defaultWeather: "breeze" },
  { id: "autumn", name: "Ecruteak Shrine",    cn: "缘朱双池神社",   ja: "エンジュ神社",     ko: "인주시티 신사",   defaultWeather: "petals" },
  { id: "moon",   name: "Mt. Moon Caldera",   cn: "月见山环形湖",   ja: "おつきみやま湖",   ko: "달맞이산 호수",   defaultWeather: "fireflies" },
  { id: "ocean",  name: "Cinnabar Atoll",     cn: "红莲珊瑚深海",   ja: "グレン環礁",       ko: "홍련 환초",       defaultWeather: "sunny" },
  { id: "desert", name: "Sandstone Oasis",    cn: "沙砾荒漠绿洲",   ja: "砂漠のオアシス",   ko: "사막 오아시스",   defaultWeather: "breeze" },
  { id: "cliff",  name: "Chimney Waterfall",  cn: "烟囱山瀑布峡谷", ja: "えんとつ山渓谷",   ko: "굴뚝산 폭포",     defaultWeather: "rainbow" },
];

export const WEATHERS = [
  { id: "sunny",     label: "Sunny",     cn: "晴朗",     ja: "晴れ",       ko: "맑음" },
  { id: "breeze",    label: "Breeze",    cn: "微风落叶", ja: "そよ風",     ko: "산들바람" },
  { id: "petals",    label: "Blossom",   cn: "花瓣飘落", ja: "花びら",     ko: "꽃잎" },
  { id: "drizzle",   label: "Drizzle",   cn: "细雨",     ja: "小雨",       ko: "가랑비" },
  { id: "rainbow",   label: "Sunshower", cn: "雨后彩虹", ja: "天気雨",     ko: "여우비 무지개" },
  { id: "fireflies", label: "Fireflies", cn: "萤火虫",   ja: "ホタル",     ko: "반딧불이" },
  { id: "storm",     label: "Shower",    cn: "阵雨",     ja: "にわか雨",   ko: "소나기" },
  { id: "snow",      label: "Snow",      cn: "飘雪",     ja: "雪",         ko: "눈" },
];

// Natural weather cycle order (drizzle/storm naturally lead into rainbow!)
const WEATHER_FLOW = ["sunny", "breeze", "petals", "drizzle", "rainbow", "sunny", "fireflies", "storm", "rainbow", "snow"];

export function biomeIntervalMin() {
  const v = shared(BIOME_INTERVAL_KEY);
  return typeof v === "number" && v >= 0 ? v : 30; // Default: auto-rotate map every 30 minutes
}

export function weatherIntervalMin() {
  const v = shared(WEATHER_INTERVAL_KEY);
  return typeof v === "number" && v >= 0 ? v : 3; // Default: auto-rotate weather every 3 minutes
}

export function activeWeather(now = Date.now(), offset = 0) {
  const wMin = weatherIntervalMin();
  const step = wMin > 0 ? Math.floor(now / (wMin * 60000)) : 0;
  const idx = (step + offset) % WEATHER_FLOW.length;
  const id = WEATHER_FLOW[(idx + WEATHER_FLOW.length) % WEATHER_FLOW.length];
  return WEATHERS.find((w) => w.id === id) ?? WEATHERS[0];
}

export function biomeOf(id) {
  return BIOMES.find((b) => b.id === id) ?? BIOMES[0];
}

export function currentTimeOfDay() {
  const pref = shared(TIME_KEY);
  if (pref === "day" || pref === "dusk" || pref === "night") return pref;
  const h = new Date().getHours();
  if (h >= 19 || h < 6) return "night";
  if (h >= 17 || h < 8) return "dusk";
  return "day";
}

function tabsById() {
  const out = {};
  for (const s of spaces()) for (const t of s.tabs) out[t.id] = { ...t, space_name: s.name };
  return out;
}

function labelsByAddress() {
  const out = {};
  for (const t of terminals()) if (t.labels) out[t.address] = t.labels;
  return out;
}

function tagOf(a, tabs, labels) {
  const l = labels[a.address];
  if (l?.support) return l.support;
  if (l?.fix) return l.fix;
  const t = tabs[a.tab];
  if (t?.named && t.name !== a.app && t.name !== "claude") return t.name;
  return a.space_name || a.tab_name || a.address;
}

function moodOf(a, tabs, now) {
  if (a.status === "blocked") return "blocked";
  if (a.status === "done") return "done";
  if (a.status === "working") return "working";
  const changed = tabs[a.tab]?.changed_at;
  return changed && now - changed > SLEEP_AFTER ? "sleep" : "idle";
}

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const rand = (lo, hi) => lo + Math.random() * (hi - lo);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const zoom = () => (Number(settings()?.zoom) > 0 ? Number(settings().zoom) : 1);

export default class Habitat {
  init(_p, cx) {
    this.width = 1040;
    this.height = 220;
    this.sized = false;
    this.mons = {};
    this.subMons = {};
    this.sprites = {};
    this.cries = {};
    this.portraits = {};
    this.seen = {};
    this.cried = 0;
    this.hover = null;
    this.drag = null;       // { addr, startWinX, startWinY, downAt, active, targetAddr }
    this.lastDragMoveAt = 0;
    this.lastDragEndAt = 0;
    this.battle = null;     // EmbeddedBattle instance rendered inline inside the habitat box!
    this.ballAnim = null;   // { mode: "recall"|"release", id, pulled, collapsed, spread, flash, orbs }
    this.ballAnimSeq = 1;
    this.lastReleaseSeen = 0;
    this.lastRecallSeen = Number(shared(HABITAT_RECALL_KEY) || 0);
    this.magick = null;
    this.weatherOffset = 0;
    this.lastWeatherId = null;
    this.lastBiomeId = null;
    this.lastBiomeRotateAt = Date.now();
    this.lastTickAt = Date.now();
    this.lastBgCheckAt = 0;
    this.lastXpFlush = Date.now();
    this.xpBuf = {};     // { [slot]: { xp, total, turns, dirty } }
    this.workStart = {}; // { [address]: timestamp }
    this.evolving = {};  // { [slot]: { fromId, nextId } }
    this.iconReq = new Set();
    this.engine = new InteractionEngine2D();
    if (checking()) return;

    cx.spawn(async (cx) => {
      this.magick = !!(await imageMagick());
      cx.notify();
    });
    this.tick(cx);
    // If freshly opened from the bottom-right Master Ball dock, arm Release animation BEFORE first paint!
    const initRel = Number(shared(HABITAT_RELEASE_KEY) || 0);
    if (initRel && Date.now() - initRel < 1800) {
      this.lastReleaseSeen = initRel;
      this.triggerRelease(cx, true);
    }
    cx.timer.every(350, (cx) => this.tick(cx));
  }

  isHabitatHidden() {
    return Boolean(findNode(layout(), "pokemon-habitat")?.hidden);
  }

  isWindowVisible() {
    return herdrWindow()?.visible !== false;
  }

  isWindowActive() {
    const w = herdrWindow();
    return !w || (w.visible !== false && w.active !== false);
  }

  bounds() {
    const minX = 68;
    const maxX = Math.max(minX + 80, this.width - 68);
    const minY = Math.max(66, Math.round(this.height * 0.30));
    const maxY = Math.max(minY + 32, this.height - 28);
    return {
      minX, maxX, minY, maxY,
      arenaX: Math.round(this.width * 0.50),
      arenaY: Math.round(minY + (maxY - minY) * 0.55),
    };
  }

  triggerRecall(cx, fromRender = false) {
    if (this.ballAnim) return;
    const total = Math.max(1, agents().length);
    const anim = {
      mode: "recall",
      id: `ball-anim-${this.ballAnimSeq++}`,
      pulledCount: 0,
      collapsed: false,
      flash: false,
    };
    this.ballAnim = anim;
    if (!fromRender) cx.notify();
    // Stagger pulling each real Pokemon sprite ONE BY ONE into the bottom-right Master Ball!
    const stepMs = Math.min(60, Math.max(30, Math.round(210 / total)));
    for (let i = 0; i < total; i++) {
      cx.timer.after(35 + i * stepMs, (cx) => {
        if (this.ballAnim !== anim) return;
        anim.pulledCount = i + 1;
        cx.notify();
      });
    }
    // Pull & compress the entire map canvas into the Master Ball mouth!
    const collapseAt = Math.min(260, 110 + total * stepMs * 0.65);
    cx.timer.after(Math.round(collapseAt), (cx) => {
      if (this.ballAnim !== anim) return;
      anim.collapsed = true;
      cx.notify();
    });
    // Master Ball snaps shut with crimson-white capture flash!
    cx.timer.after(Math.round(collapseAt + 330), (cx) => {
      if (this.ballAnim !== anim) return;
      anim.flash = true;
      cx.notify();
    });
    cx.timer.after(Math.round(collapseAt + 420), (cx) => {
      if (this.ballAnim !== anim) return;
      anim.flash = false;
      cx.notify();
    });
    cx.timer.after(Math.round(collapseAt + 480), (cx) => {
      if (this.ballAnim !== anim) return;
      this.ballAnim = null;
      run("layout.hide", { id: "pokemon-habitat" });
      cx.notify();
    });
  }

  triggerRelease(cx, fromRender = false) {
    const list = agents();
    const total = Math.max(1, list.length);
    const anim = {
      mode: "release",
      id: `ball-anim-${this.ballAnimSeq++}`,
      spread: false,
      releasedCount: 0,
      flash: true,
    };
    this.ballAnim = anim;
    if (!fromRender) cx.notify();
    // Phase 1 (95ms): Paint initial compressed state inside Master Ball first, then unfold the whole map canvas!
    cx.timer.after(95, (cx) => {
      if (this.ballAnim !== anim) return;
      anim.spread = true;
      cx.notify();
    });
    // Phase 2: Shoot each real Pokemon sprite OUT of the Master Ball ONE BY ONE onto the map with a cheerful hop!
    const stepMs = Math.min(70, Math.max(40, Math.round(260 / total)));
    for (let i = 0; i < total; i++) {
      cx.timer.after(160 + i * stepMs, (cx) => {
        if (this.ballAnim !== anim) return;
        anim.releasedCount = i + 1;
        const addr = list[i]?.address;
        if (addr && this.mons[addr]) setAnim(this.mons[addr], "hop", Date.now(), 520);
        cx.notify();
      });
    }
    // Phase 3: Clear lavender-white release glow & finish cleanly
    cx.timer.after(340, (cx) => {
      if (this.ballAnim !== anim) return;
      anim.flash = false;
      cx.notify();
    });
    cx.timer.after(Math.max(760, 520 + total * stepMs), (cx) => {
      if (this.ballAnim !== anim) return;
      this.ballAnim = null;
      cx.notify();
    });
  }

  wantSprite(id, shiny, cx) {
    const key = spriteCacheKey(id, shiny);
    const cur = this.sprites[key];
    const needFly = habitatOf(id).canFly;
    if (cur?.loading || (cur?.version === VERSION_2D && cur?.complete && (!needFly || cur?.flyVer === FLY_VERSION))) return;
    if (cur?.error && Date.now() - cur.at < 60000) return;
    this.sprites[key] = cur?.walkR ? { ...cur, loading: true } : { loading: true };
    cx.spawn(async (cx) => {
      try {
        const fast = await loadSpriteFast(id, { shiny });
        if (fast) {
          this.sprites[key] = fast.complete ? fast : { ...fast, loading: true };
          cx.notify();
          if (fast.complete) return;
        }
        if (this.magick === false) return;
        const full = await loadSprite2D(id, (stageMeta) => {
          // Stage 1 ready (~0.8s): show the new Pokemon walking immediately!
          this.sprites[key] = { ...stageMeta, loading: true };
          cx.notify();
        }, { shiny });
        this.sprites[key] = full;
      } catch (e) {
        if (!this.sprites[key]?.walkR) this.sprites[key] = { error: String(e?.message ?? e), at: Date.now() };
        else delete this.sprites[key].loading;
      }
      cx.notify();
    });
  }

  wantPortraits(id, shiny, cx) {
    const key = spriteCacheKey(id, shiny);
    const cur = this.portraits[key];
    if (cur === "loading" || Array.isArray(cur)) return;
    if (cur?.error && Date.now() - cur.at < 60000) return;
    this.portraits[key] = "loading";
    cx.spawn(async () => {
      try {
        const have = await ensurePortraits(id, { shiny });
        this.portraits[key] = have;
        const all = shared(PORTRAITS_KEY) ?? {};
        if (JSON.stringify(all[key]) !== JSON.stringify(have)) setShared(PORTRAITS_KEY, { ...all, [key]: have });
      } catch (e) {
        this.portraits[key] = { error: String(e?.message ?? e), at: Date.now() };
      }
    });
  }

  wantIcons(ids, cx) {
    const missing = [...new Set(ids)].filter((id) => !hasMenuIcon(id) && !this.iconReq.has(id));
    if (!missing.length) return;
    for (const id of missing) this.iconReq.add(id);
    cx.spawn(async (cx) => {
      try { await ensureIconsFor(missing); }
      catch {}
      finally { for (const id of missing) this.iconReq.delete(id); }
      cx.notify();
    });
  }

  wantCry(id, set, cx) {
    const key = `${set}:${id}`;
    const cur = this.cries[key];
    if (cur === "loading" || cur?.cry) return;
    if (cur?.error && Date.now() - cur.at < 60000) return;
    this.cries[key] = "loading";
    cx.spawn(async () => {
      try {
        const cry = await ensureCry(id, set);
        const chirp = await ensureChirp(id, set).catch(() => cry);
        this.cries[key] = { cry, chirp };
      } catch (e) {
        this.cries[key] = { error: String(e?.message ?? e), at: Date.now() };
      }
    });
  }

  makeSocialEnv(biomeId, mapBox, b, list, eco = isEcoFx()) {
    const pickTargetFor = (dexId, cx0, cy0, opts) =>
      pickTerrainTarget(biomeId, habitatOf(dexId), cx0, cy0, mapBox, b, opts);
    return {
      biomeId,
      mapBox,
      eco,
      sprites: this.sprites,
      pickTarget: pickTargetFor,
      onBattleXp: (winAddr, loseAddr, isEpic) => {
        if (!isEpic) return;
        const grant = (addr, amt) => {
          const a = list.find((x) => x.address === addr);
          if (!a) return;
          const slot = slotOf(a);
          if (!this.xpBuf[slot]) {
            const s0 = slotXpOf(slot);
            this.xpBuf[slot] = { xp: s0.xp, total: s0.total, turns: s0.turns, dirty: false };
          }
          this.xpBuf[slot].xp += amt;
          this.xpBuf[slot].total += amt;
          this.xpBuf[slot].dirty = true;
        };
        grant(winAddr, 35);
        grant(loseAddr, 18);
      },
    };
  }

  activateGrab(cx) {
    const d = this.drag;
    if (!d || d.active) return;
    const m = this.mons[d.addr];
    if (!m) { this.drag = null; return; }
    const now = Date.now();
    d.active = true;
    this.engine.cancelParticipant(d.addr);
    stopWalk2D(m, now);
    m.grabbed = true;
    m.burrowed = false;
    m.burrowUntil = 0;
    m.perchRest = false;
    m.airborne = false;
    m.emote = null;
    m.anim = null;
    // Play cute chirp when picked up!
    const list = agents();
    const { ids } = assignPokemon(list);
    const dexId = ids[d.addr];
    if (dexId && now - this.cried >= CRY_GAP) {
      const set = crySetOf(shared(CRY_KEY));
      const snd = this.cries[`${set}:${dexId}`];
      const path = snd?.chirp ?? snd?.cry;
      if (path) { playSound(path); this.cried = now; }
    }
    cx.notify();
  }

  findDropTarget(dragAddr, x, y, now) {
    let bestAddr = null;
    let bestDist = 64;
    for (const a of agents()) {
      if (a.address === dragAddr || a.status === "blocked") continue;
      const om = this.mons[a.address];
      if (!om) continue;
      const op = currentPos(om, now);
      const dist = Math.hypot(op.x - x, op.y - y);
      if (dist < bestDist) {
        bestDist = dist;
        bestAddr = a.address;
      }
    }
    return bestAddr;
  }

  finishDrag(e, cx) {
    const d = this.drag;
    this.drag = null;
    if (!d || !d.active) return;
    const now = Date.now();
    this.lastDragEndAt = now;
    const m = this.mons[d.addr];
    if (!m) { cx.notify(); return; }

    const b = this.bounds();
    const biomeId = biomeOf(shared(BIOME_KEY)).id;
    const mapBox = computeMapBox(this.width, this.height);
    const list = agents();
    const { ids } = assignPokemon(list);
    const dexId = ids[d.addr];
    const hab = dexId ? habitatOf(dexId) : { canSwim: false, canFly: false };

    let dropX = m.x;
    let dropY = m.y;
    if (e?.local_position) {
      const z = zoom();
      dropX = clamp(e.local_position.x / z, b.minX, b.maxX);
      dropY = clamp(e.local_position.y / z + 14, b.minY, b.maxY);
    }

    m.grabbed = false;
    m.x = m.fromX = m.targetX = dropX;
    m.y = m.fromY = m.targetY = dropY;
    m.moving = false;
    m.waypoints = [];
    m.dur = 120;
    m.pauseUntil = now + 2600;

    // 1. Dropped onto another Pokemon -> launch inline VS Battle right inside the habitat panel!
    const targetAddr = this.findDropTarget(d.addr, dropX, dropY, now);
    if (targetAddr) {
      this.engine.cancelParticipant(d.addr);
      this.engine.cancelParticipant(targetAddr);
      const tabs = tabsById();
      const labels = labelsByAddress();
      const pack = (addr) => {
        const aObj = list.find((x) => x.address === addr);
        const s = aObj ? slotOf(aObj) : addr;
        const id = ids[addr] ?? 25;
        return {
          addr,
          slot: s,
          dexId: id,
          shiny: isShiny(s),
          tag: aObj ? tagOf(aObj, tabs, labels) : nameOf(id),
        };
      };
      this.battle = new EmbeddedBattle({
        biomeId,
        p1: pack(d.addr),
        cpu: pack(targetAddr),
        sprites: this.sprites,
        onClose: (cx) => {
          this.battle = null;
          cx.notify();
        },
      }, cx);
      cx.notify();
      return;
    }

    // 2. Dropped elsewhere on the map: respect water/air/land ecology!
    const terr = terrainAtScreen(biomeId, dropX, dropY, mapBox);
    if (terr === "water") {
      if (hab.canSwim) {
        m.lastTerr = "water";
        setAnim(m, "hop", now, 420);
        this.engine.addFx("water", dropX, dropY + 8, dropX, dropY + 4, now, 440);
        this.engine.addPopup(tr("扑通！", "SPLASH!"), dropX, dropY - 36, "#0284c7", now, 1100);
      } else if (hab.canFly) {
        m.airborne = true;
        m.lastTerr = "water";
        setAnim(m, "hop", now, 420);
      } else {
        // Land Pokemon dropped over water splashes safely onto the nearest dry shore!
        const shore = nearestWalkable(biomeId, hab, dropX, dropY, mapBox, b);
        m.lastTerr = shore.terrain;
        walkTo2D(m, shore.x, shore.y, 185, now, b);
        setAnim(m, "hop", now, 540);
        this.engine.addFx("water", dropX, dropY + 8, dropX, dropY + 4, now, 400);
        this.engine.addPopup(tr("哇呀！", "WHOA!"), dropX, dropY - 36, "#f59e0b", now, 1050);
      }
    } else {
      m.lastTerr = terr;
      setAnim(m, "hop", now, 460);
      setEmote(m, "music", now, 1100);
      if (hab.canFly && !hab.pureFloat) {
        m.airborne = false;
        m.perchRest = true;
        m.pauseUntil = now + 4500;
      }
    }
    cx.notify();
  }

  updateAgentAlertsAndXp(list, ids, set, now, dtSec, cx) {
    let flushXpNow = false;
    const doneAddrs = [];
    const live = new Set();

    for (const a of list) {
      live.add(a.address);
      const slot = slotOf(a);
      const dexId = ids[a.address];
      this.wantCry(dexId, set, cx);
      const was = this.seen[a.address];
      this.seen[a.address] = a.status;

      // ---- Work-XP accumulation (drives authentic progressive evolution!) ----
      if (!this.xpBuf[slot]) {
        const s0 = slotXpOf(slot);
        this.xpBuf[slot] = { xp: s0.xp, total: s0.total, turns: s0.turns, dirty: false };
      } else if (slotXpOf(slot).xp === 0 && this.xpBuf[slot].xp > 0 && !this.xpBuf[slot].dirty) {
        // Picker reset XP after user manually switched species
        this.xpBuf[slot] = { xp: 0, total: 0, turns: 0, dirty: false };
      }
      const xpRec = this.xpBuf[slot];
      if (a.status === "working") {
        if (!this.workStart[a.address]) this.workStart[a.address] = now;
        if (dtSec > 0) {
          const gain = dtSec * 1.2;
          xpRec.xp += gain;
          xpRec.total += gain;
          xpRec.dirty = true;
        }
      } else {
        if (was === "working") {
          const workedMs = now - (this.workStart[a.address] || now);
          if (workedMs >= 12000) {
            xpRec.xp += 28;
            xpRec.total += 28;
            xpRec.turns += 1;
            xpRec.dirty = true;
            flushXpNow = true;
          }
        }
        delete this.workStart[a.address];
      }

      if (was !== undefined && was !== a.status) {
        if (a.status === "blocked" || a.status === "done") {
          const sound = this.cries[`${set}:${dexId}`];
          const path = a.status === "blocked" ? sound?.cry : sound?.chirp;
          if (path && now - this.cried >= CRY_GAP) { playSound(path); this.cried = now; }
        }
        // Guarantee top-right Poke Ball confirmation toast fires whenever an agent becomes blocked
        // (Herdr suppresses its built-in toast when the tab is focused; we wait 260ms & dedupe!).
        if (a.status === "blocked") {
          const spaceLabel = a.space_name || a.tab_name || "Agent";
          const progLabel = a.program?.name || "Agent";
          const bodyText = a.tab_name ? `${spaceLabel} / ${a.tab_name}` : spaceLabel;
          const act = a.pane
            ? { name: "pane.focus", args: { pane: a.pane } }
            : { name: "agent.focus", args: { terminal: a.address } };
          cx.timer.after(260, () => {
            const last = shared(LAST_TOAST_KEY);
            const recent = last && last.key === `alert:${spaceLabel}` && (Date.now() - Number(last.at || 0)) < 2500;
            if (!recent) {
              notify({
                title: `${progLabel} needs you`,
                body: bodyText,
                level: "warning",
                timeout: 6000,
                action: act,
              });
            }
          });
        }
        if (a.status === "done") doneAddrs.push(a.address);
      }
    }

    // Periodically persist dirty Work-XP to shared storage (~every 60s or immediately on turn complete)
    if (flushXpNow || now - this.lastXpFlush >= 60000) {
      const updates = {};
      let any = false;
      for (const [slot, rec] of Object.entries(this.xpBuf)) {
        if (!rec.dirty) continue;
        updates[slot] = { xp: Math.round(rec.xp), total: Math.round(rec.total), turns: rec.turns };
        rec.dirty = false;
        any = true;
      }
      if (any) {
        saveXpBatch(updates);
        this.lastXpFlush = now;
      }
    }

    for (const k of Object.keys(this.seen)) if (!live.has(k)) delete this.seen[k];
    return { live, doneAddrs };
  }

  settleFinishedWalks(now) {
    let settled = false;
    for (const m of Object.values(this.mons)) {
      if (m.moving && now >= m.start + m.dur) {
        m.moving = false;
        m.x = m.targetX;
        m.y = m.targetY;
        m.waypoints = [];
        settled = true;
      }
      if (m.anim && now >= m.animUntil) { m.anim = null; settled = true; }
      if (m.emote && now >= m.emoteUntil) { m.emote = null; settled = true; }
    }
    for (const sm of Object.values(this.subMons)) {
      if (sm.moving && now >= sm.start + sm.dur) {
        sm.moving = false;
        sm.x = sm.targetX;
        sm.y = sm.targetY;
        settled = true;
      }
    }
    return settled;
  }

  tick(cx) {
    if (this.battle) return; // Pause overworld roaming while inline battle is open (zero wasted CPU!)
    const now = Date.now();
    const habHidden = this.isHabitatHidden();
    const winVis = this.isWindowVisible();
    const winActive = this.isWindowActive();

    // Hold-to-grab: holding left mouse button on a Pokemon for >= 200ms lifts it up even before moving!
    if (winActive && !habHidden && this.drag && !this.drag.active && now - this.drag.downAt >= 200) {
      this.activateGrab(cx);
    }

    if (habHidden || !winVis || !winActive) {
      if (now - this.lastBgCheckAt < 1000) return;
      this.lastBgCheckAt = now;
    }

    const list = agents();
    const { ids, fresh } = assignPokemon(list);
    if (Object.keys(fresh).length) savePicks(fresh);

    const set = crySetOf(shared(CRY_KEY));
    const dtSec = clamp((now - (this.lastTickAt || now)) / 1000, 0, 2.5);
    this.lastTickAt = now;
    const { live, doneAddrs } = this.updateAgentAlertsAndXp(list, ids, set, now, dtSec, cx);

    if (habHidden || !winVis) {
      this.settleFinishedWalks(now);
      for (const k of Object.keys(this.mons)) if (!live.has(k)) delete this.mons[k];
      return;
    }

    if (!winActive) {
      let changedBg = this.settleFinishedWalks(now);
      for (const k of Object.keys(this.mons)) if (!live.has(k)) { delete this.mons[k]; changedBg = true; }
      if (changedBg) cx.notify();
      return;
    }

    const tabs = tabsById();
    const neededIcons = [];
    for (const a of list) {
      const id = ids[a.address];
      const shiny = isShiny(slotOf(a));
      neededIcons.push(id);
      this.wantSprite(id, shiny, cx);
      this.wantPortraits(id, shiny, cx);
    }

    const b = this.bounds();
    const biomeId = biomeOf(shared(BIOME_KEY)).id;
    const mapBox = computeMapBox(this.width, this.height);
    const eco = isEcoFx();
    const socialEnv = this.makeSocialEnv(biomeId, mapBox, b, list, eco);
    const pickTargetFor = socialEnv.pickTarget;
    let changed = false;

    list.forEach((a) => {
      const slot = slotOf(a);
      const dexId = ids[a.address];
      const hab = habitatOf(dexId);
      const xpRec = this.xpBuf[slot];

      // Check automatic seamless evolution when stage XP threshold is reached (unless locked)!
      const shiny = isShiny(slot);
      const evo = isEvoLocked(slot) ? null : nextEvolution(dexId, slot);
      if (evo && xpRec && xpRec.xp >= evo.needXp) {
        if (!this.evolving[slot] || this.evolving[slot].fromId !== dexId) {
          this.evolving[slot] = { fromId: dexId, nextId: evo.nextId };
          // Silently preload evolved sprites, portraits & cry so the transformation has zero flicker!
          neededIcons.push(evo.nextId);
          this.wantSprite(evo.nextId, shiny, cx);
          this.wantPortraits(evo.nextId, shiny, cx);
          this.wantCry(evo.nextId, set, cx);
        }
        const evoReady = this.sprites[spriteCacheKey(evo.nextId, shiny)]?.walkR;
        if (evoReady) {
          const oldName = nameOf(dexId);
          const newName = nameOf(evo.nextId);
          delete this.evolving[slot];
          xpRec.xp = 0;
          xpRec.dirty = true;
          saveXpBatch({ [slot]: { xp: 0, total: Math.round(xpRec.total), turns: xpRec.turns } });
          xpRec.dirty = false;
          savePicks({ [slot]: evo.nextId });
          resetSlotMoves(slot);
          movesForSlot(slot, evo.nextId);
          const evoSound = this.cries[`${set}:${evo.nextId}`];
          if (evoSound?.cry) { playSound(evoSound.cry); this.cried = now; }
          const mCur = this.mons[a.address];
          if (mCur) {
            const pNow = currentPos(mCur, now);
            mCur.evoGlowUntil = now + 2800;
            mCur.anim = "hop";
            mCur.animUntil = now + 1300;
            mCur.emote = "star";
            mCur.emoteUntil = now + 3200;
            this.engine.addPopup(tr("进化啦！★", "EVOLVED! ★"), pNow.x, pNow.y - 44, "#eab308", now, 2200);
          }
          this.engine.banner = {
            text: tr(`✨ 哇！${oldName} 进化成了 ${newName}！`, `✨ What?! ${oldName} evolved into ${newName}!`),
            color: "#eab308",
            until: now + 4800,
          };
          changed = true;
        }
      }

      if (doneAddrs.includes(a.address)) {
        this.engine.onAgentDone(a.address, list, this.mons, ids, now, b, socialEnv);
        changed = true;
      }

      let m = this.mons[a.address];
      if (!m) {
        // Lock in this Pokemon's fixed 4 battle moves the moment it is generated!
        movesForSlot(slot, dexId);
        const pt = pickTargetFor(dexId, b.arenaX, b.arenaY, { initial: true });
        m = this.mons[a.address] = {
          x: pt.x, y: pt.y, fromX: pt.x, fromY: pt.y, targetX: pt.x, targetY: pt.y,
          dir: pick(["d", "l", "r"]),
          moving: false, start: 0, dur: 0,
          pauseUntil: now + rand(400, 2000),
          airborne: hab.canFly,
          burrowed: false,
          burrowUntil: 0,
          lastDexId: dexId,
          evoGlowUntil: 0,
          mood: null, emote: null, emoteUntil: 0, anim: null, animUntil: 0,
        };
        changed = true;
      }

      // Dynamic ecosystem transition the instant user switches species (or after evolution)!
      if (m.lastDexId !== dexId) {
        m.lastDexId = dexId;
        m.burrowed = false;
        m.burrowUntil = 0;
        if (hab.canFly) {
          m.airborne = true;
        } else {
          m.airborne = false;
          // If switched to a swimmer while on land, head excitedly toward the lake soon!
          if (hab.canSwim && terrainAtScreen(biomeId, m.x, m.y, mapBox) !== "water") {
            m.pauseUntil = Math.min(m.pauseUntil, now + 450);
          }
        }
        changed = true;
      }

      const mood = moodOf(a, tabs, now);
      if (mood !== m.mood) { m.mood = mood; changed = true; }

      // While user is holding/dragging this Pokemon, pause AI movement so pointer has 100% control!
      if (m.grabbed) return;

      // Keep airborne, burrowed & real-time water immersion states strictly consistent with species, terrain & battles!
      const curNow = currentPos(m, now);
      const curTerr = terrainAtScreen(biomeId, curNow.x, curNow.y, mapBox);
      const prevTerr = m.lastTerr;
      if (prevTerr !== curTerr) {
        m.lastTerr = curTerr;
        // Immediately re-render whenever a moving Pokemon crosses into/out of water so swimmers submerge
        // the exact instant they hit the waterline (never walking across the lake with dry legs)!
        if (prevTerr !== undefined) {
          changed = true;
          if (hab.canSwim && prevTerr !== "water" && curTerr === "water") {
            this.engine.addFx("water", curNow.x, curNow.y + 8, curNow.x, curNow.y + 4, now, 380);
          }
        }
      }
      const busySocial = this.engine.isBusy(a.address);
      const soilOk = curTerr === "land" || curTerr === "forest" || curTerr === "shore";

      if (hab.canFly) {
        if (curTerr === "water") {
          // NEVER land or stand on water! If sleepy over water, fly back onto land to nap.
          if (!m.airborne) { m.airborne = true; changed = true; }
          if (m.perchRest) { m.perchRest = false; changed = true; }
          if (mood === "sleep" && !m.moving && !busySocial) {
            const landPt = pickTerrainTarget(biomeId, { canSwim: false, canFly: false, prefers: "forest" }, m.x, m.y, mapBox, b, { initial: true });
            walkTo2D(m, landPt.x, landPt.y, 92, now, b);
            changed = true;
          }
        } else if (mood === "sleep") {
          if (m.airborne) { m.airborne = false; changed = true; }
        } else if (hab.pureFloat) {
          if (!m.airborne) { m.airborne = true; changed = true; }
        }
      } else if (m.airborne || m.perchRest) {
        m.airborne = false;
        m.perchRest = false;
        changed = true;
      }

      if (m.burrowed && (!hab.canBurrow || !soilOk || busySocial || mood === "blocked" || mood === "sleep")) {
        m.burrowed = false;
        m.burrowUntil = 0;
        changed = true;
      }

      if (m.moving) {
        const f = clamp((now - m.start) / Math.max(1, m.dur), 0, 1);
        if (f >= 1) {
          m.moving = false;
          m.x = m.targetX; m.y = m.targetY;
          if (advanceWaypoints(m, now, b)) {
            changed = true;
          } else if (!busySocial) {
            const endTerr = terrainAtScreen(biomeId, m.x, m.y, mapBox);
            const endSoil = endTerr === "land" || endTerr === "forest" || endTerr === "shore";
            const endDry = endTerr !== "water";
            // Flying/Sky Pokemon occasionally swoop down to perch & rest on land/trees/bridge (NEVER on water!)
            if (hab.canFly && !hab.pureFloat && endDry && (mood === "working" || mood === "idle")) {
              if (Math.random() < 0.58) {
                m.airborne = false;
                m.perchRest = true;
                m.pauseUntil = now + rand(3600, 7600);
              } else {
                m.perchRest = false;
                m.pauseUntil = now + (eco ? rand(2400, 5000) : rand(900, 2000));
              }
            } else if (hab.canFly && endTerr === "water") {
              // Hover briefly over water, then keep flying (never rest on water!)
              m.airborne = true;
              m.perchRest = false;
              m.pauseUntil = now + (eco ? rand(2000, 4200) : rand(800, 1800));
            } else if (hab.canBurrow && endSoil && (mood === "working" || mood === "idle")) {
              // Ground/Rock Pokemon occasionally burrow halfway underground when pausing on soil!
              const chance = hab.deepBurrow ? 0.65 : 0.36;
              if (Math.random() < chance) {
                m.burrowed = true;
                m.burrowUntil = now + rand(4200, 8800);
                m.pauseUntil = m.burrowUntil;
              } else {
                m.burrowed = false;
                m.pauseUntil = now + (mood === "working" ? (eco ? rand(3500, 7500) : rand(1200, 2800)) : (eco ? rand(7000, 14000) : rand(3500, 8500)));
              }
            } else {
              m.burrowed = false;
              m.pauseUntil = now + (mood === "working" ? (eco ? rand(3500, 7500) : rand(1200, 2800)) : (eco ? rand(7000, 14000) : rand(3500, 8500)));
            }
          }
          changed = true;
        } else if (!busySocial && mood !== "working" && mood !== "idle") {
          const cur = currentPos(m, now);
          m.x = m.fromX = m.targetX = cur.x;
          m.y = m.fromY = m.targetY = cur.y;
          m.moving = false; m.waypoints = []; m.dur = 150;
          changed = true;
        }
      } else if (!busySocial && (mood === "working" || mood === "idle") && now >= m.pauseUntil) {
        m.perchRest = false;
        // Pop out of burrow with a cheerful little hop if burrow timer ended!
        if (m.burrowed && now >= m.burrowUntil && Math.random() < 0.72) {
          m.burrowed = false;
          m.anim = "hop";
          m.animUntil = now + 520;
        }
        // Species- & terrain-aware 2D roaming (Water -> lake, Flyers -> ~80% sky / ~20% land + perched rests, Ground/Rock -> burrow, Land -> dry paths & bridges!)
        const pt = pickTargetFor(dexId, m.x, m.y);
        if (Math.hypot(pt.x - m.x, pt.y - m.y) >= 24) {
          if (hab.canFly) {
            const midTerr = terrainAtScreen(biomeId, (m.x + pt.x) / 2, (m.y + pt.y) / 2, mapBox);
            const overWater = curTerr === "water" || pt.terrain === "water" || midTerr === "water";
            m.airborne = hab.alwaysAir || overWater || Math.random() < 0.80;
          }
          // Ground/Rock Pokemon can occasionally tunnel underground when moving across soil!
          if (hab.canBurrow && soilOk && (pt.terrain === "land" || pt.terrain === "forest" || pt.terrain === "shore")) {
            if (!m.burrowed && Math.random() < (hab.deepBurrow ? 0.55 : 0.24)) {
              m.burrowed = true;
              m.burrowUntil = now + 5000;
            }
          } else {
            m.burrowed = false;
          }
          const spd = SPEED[mood] * (m.airborne ? 1.32 : m.burrowed ? 0.78 : 1.0);
          walkPath2D(m, pt.path ?? [{ x: pt.x, y: pt.y }], spd, now, b);
          changed = true;
        } else {
          m.pauseUntil = now + (eco ? rand(2500, 5000) : rand(1200, 2600));
        }
      }
      // If biome switched and a land-bound Pokemon ended up over water, immediately rescue it onto the nearest dry shore
      // (never make a land Pokemon slowly stroll across the open ocean!).
      if (!busySocial && !canWalkTerrain(hab, curTerr)) {
        const shore = nearestWalkable(biomeId, hab, curNow.x, curNow.y, mapBox, b);
        const dist = Math.hypot(shore.x - curNow.x, shore.y - curNow.y);
        if (dist > 64) {
          m.x = m.fromX = m.targetX = shore.x;
          m.y = m.fromY = m.targetY = shore.y;
          m.moving = false; m.waypoints = []; m.dur = 120;
          m.lastTerr = shore.terrain;
        } else if (!m.moving) {
          walkTo2D(m, shore.x, shore.y, 110, now, b);
        }
        changed = true;
      }
      // Keep inside bounds if resized
      if (!m.moving && (m.x < b.minX || m.x > b.maxX || m.y < b.minY || m.y > b.maxY)) {
        m.x = m.fromX = m.targetX = clamp(m.x, b.minX, b.maxX);
        m.y = m.fromY = m.targetY = clamp(m.y, b.minY, b.maxY);
        m.dur = 150;
        changed = true;
      }
    });

    for (const k of Object.keys(this.mons)) if (!live.has(k)) { delete this.mons[k]; changed = true; }

    // ---- Subagent Mini-Follower Entourage (0.65x cute base-form helpers trailing behind parent!) ----
    const allTerms = terminals();
    const termByAddr = new Map(allTerms.map((t) => [t.address, t]));
    const subsByParent = new Map();
    const liveSubs = new Set();
    for (const t of allTerms) {
      if (t.state !== "live" || !t.parent || live.has(t.address)) continue;
      let cur = t.parent;
      let root = null;
      for (let depth = 0; cur && depth < 6; depth++) {
        if (live.has(cur)) { root = cur; break; }
        cur = termByAddr.get(cur)?.parent;
      }
      if (!root) continue;
      liveSubs.add(t.address);
      if (!subsByParent.has(root)) subsByParent.set(root, []);
      subsByParent.get(root).push(t);
    }
    for (const [rootAddr, kids] of subsByParent) {
      const parentMon = this.mons[rootAddr];
      const parentDex = ids[rootAddr];
      if (!parentMon || !parentDex) continue;
      const pPos = currentPos(parentMon, now);
      const d = parentMon.dir ?? "d";
      const backX = d === "r" ? -1 : d === "l" ? 1 : 0;
      const backY = d === "d" ? -1 : d === "u" ? 1 : 0;
      const perpX = backY !== 0 ? 1 : 0;
      const perpY = backX !== 0 ? 1 : 0;
      const subDex = baseFormOf(parentDex);
      const subHab = habitatOf(subDex);
      neededIcons.push(subDex);
      this.wantSprite(subDex, false, cx);

      kids.forEach((k, idx) => {
        const dist = 28 + idx * 19;
        const side = (idx % 2 === 0 ? 1 : -1) * (idx === 0 ? 5 : 9);
        const rawX = clamp(pPos.x + backX * dist + perpX * side, b.minX, b.maxX);
        const rawY = clamp(pPos.y + backY * (dist * 0.72) + perpY * side, b.minY, b.maxY);
        const safeSub = nearestWalkable(biomeId, subHab, rawX, rawY, mapBox, b);
        const tx = safeSub.x;
        const ty = safeSub.y;
        let sm = this.subMons[k.address];
        if (!sm) {
          sm = this.subMons[k.address] = {
            x: tx, y: ty, fromX: tx, fromY: ty, targetX: tx, targetY: ty,
            dir: d, moving: false, start: now, dur: 150,
            lastTerr: safeSub.terrain,
            airborne: Boolean(parentMon.airborne && subHab.canFly),
            parent: rootAddr, dexId: subDex,
          };
          changed = true;
        } else {
          sm.parent = rootAddr;
          sm.dexId = subDex;
          sm.airborne = Boolean(parentMon.airborne && subHab.canFly);
          const sPos = currentPos(sm, now);
          const sTerr = terrainAtScreen(biomeId, sPos.x, sPos.y, mapBox);
          if (sm.lastTerr !== sTerr) { sm.lastTerr = sTerr; changed = true; }
          if (sm.moving && now >= sm.start + sm.dur) {
            sm.moving = false;
            sm.x = sm.targetX;
            sm.y = sm.targetY;
            changed = true;
          }
          if (Math.hypot(tx - sPos.x, ty - sPos.y) > 18) {
            walkTo2D(sm, tx, ty, 94, now, b);
            changed = true;
          } else if (!sm.moving && sm.dir !== d) {
            sm.dir = d;
            changed = true;
          }
        }
      });
    }
    for (const k of Object.keys(this.subMons)) {
      if (!liveSubs.has(k)) { delete this.subMons[k]; changed = true; }
    }

    // Strictly on-demand icon fetch: ONLY for currently active Pokemon!
    this.wantIcons(neededIcons, cx);

    if (this.engine.tick(list, this.mons, ids, now, b, socialEnv)) changed = true;

    // Automatic map rotation (default every 30m, configurable via corner gear popup; manual switch resets timer!)
    if (this.lastBiomeId !== biomeId) {
      this.lastBiomeId = biomeId;
      this.lastBiomeRotateAt = now;
    }
    const bMin = biomeIntervalMin();
    if (bMin > 0 && now - this.lastBiomeRotateAt >= bMin * 60000) {
      const nextIdx = (BIOMES.findIndex((x) => x.id === biomeId) + 1) % BIOMES.length;
      const nextId = BIOMES[nextIdx].id;
      this.lastBiomeId = nextId;
      this.lastBiomeRotateAt = now;
      setShared(BIOME_KEY, nextId);
      changed = true;
    }

    const wNow = activeWeather(now, this.weatherOffset).id;
    if (wNow !== this.lastWeatherId) {
      this.lastWeatherId = wNow;
      setShared(WEATHER_KEY, wNow);
      changed = true;
    }
    if (changed) cx.notify();
  }

  pickSprite(meta, m, mood, now, isAirborne = false, hab = null) {
    if (!meta || !meta.walkR) return null;
    if (m.grabbed) return meta.struggle ?? meta.hurt ?? meta.hop ?? meta.walkD;
    if (m.anim && now < m.animUntil && meta[m.anim]) return meta[m.anim];
    if (mood === "sleep" && !isAirborne) return meta.sleep ?? meta.idleD;
    // Always-airborne birds/butterflies fold their wings and curl up when perched to rest on land!
    if (m.perchRest && !isAirborne && hab?.alwaysAir && !hab?.pureFloat) return meta.sleep ?? meta.idleD;
    const d = (m.dir ?? "d").toUpperCase();
    if (isAirborne) return meta[`fly${d}`] ?? meta.flyR ?? meta[`walk${d}`] ?? meta.walkR;
    if (m.moving) return meta[`walk${d}`] ?? meta.walkD ?? meta.walkR;
    return meta[`idle${d}`] ?? meta.idleD ?? meta.idleR;
  }

  renderEmote(kind) {
    if (kind === "heart") return image(iconAsset("heart")).w(14).h(12);
    if (kind === "music") return image(iconAsset("music")).w(13).h(11);
    if (kind === "swords") return image(iconAsset("swords")).w(16).h(14);
    if (kind === "star") return div().px(5).rounded(4).bg("#f59e0b").text_color("#ffffff").font_bold().text_size(10.5).child("★");
    // Reserve bright red '!' strictly for blocked agents; playful emote '!' uses warm amber!
    if (kind === "!") return div().px(5).rounded(4).bg("#f59e0b").text_color("#ffffff").font_bold().text_size(10.5).child("!");
    if (kind === "?") return div().px(5).rounded(4).bg("#2563eb").text_color("#ffffff").font_bold().text_size(10.5).child("?");
    return null;
  }

  renderWeather(weather, w, h, animateAmbient) {
    if (!weather) return [];
    const items = [];
    if (!animateAmbient) {
      if (weather === "sunny") {
        items.push(div().absolute().left(0).top(0).w(Math.round(w * 0.45)).h(h).bg("#fef9c3").opacity(0.08));
        for (let i = 0; i < 5; i++) {
          const x = Math.round(((i + 0.5) / 5) * w);
          const y0 = 28 + (i * 37) % Math.max(30, h - 46);
          items.push(div().absolute().left(x).top(y0).size(3).rounded_full().bg("#fef08a").opacity(0.42));
        }
        return items;
      }
      if (weather === "breeze") {
        for (let i = 0; i < 7; i++) {
          const x0 = Math.round(((i + 0.4) / 7) * w);
          const y0 = 18 + (i * 31) % Math.max(24, h - 32);
          items.push(div().absolute().left(x0).top(y0).w(6).h(3).rounded(2).bg(i % 3 === 0 ? "#86efac" : i % 3 === 1 ? "#4ade80" : "#fde047").opacity(0.65));
        }
        return items;
      }
      if (weather === "rainbow") {
        const bands = ["#fca5a5", "#fdba74", "#fde047", "#86efac", "#93c5fd", "#c4b5fd"];
        const arcW = Math.round(w * 0.56);
        bands.forEach((col, bi) => {
          const d = arcW - bi * 10;
          items.push(div().absolute().left(Math.round((w - d) / 2)).top(18 + bi * 5).w(d).h(d).rounded_full().border(3).border_color(col).opacity(0.22));
        });
        for (let i = 0; i < 6; i++) {
          const x = Math.round(((i + 0.5) / 6) * w);
          const y0 = 24 + (i * 29) % Math.max(24, h - 38);
          items.push(div().absolute().left(x).top(y0).size(3).rounded_full().bg("#ffffff").opacity(0.55));
        }
        return items;
      }
      if (weather === "storm") {
        items.push(div().absolute().inset_0().bg("#0f172a").opacity(0.14));
        for (let i = 0; i < 10; i++) {
          const x = Math.round(((i + 0.4) / 10) * w);
          const y = 14 + (i * 39) % Math.max(24, h - 34);
          items.push(div().absolute().left(x).top(y).w(1.5).h(12).bg("#93c5fd").opacity(0.42));
        }
        return items;
      }
      if (weather === "fireflies") {
        for (let i = 0; i < 8; i++) {
          const x = Math.round(((i + 0.5) / 8) * w);
          const y0 = 22 + (i * 37) % Math.max(30, h - 42);
          items.push(div().absolute().left(x).top(y0).size(3.5).rounded_full().bg("#fef08a").opacity(0.68));
        }
        return items;
      }
      if (weather === "petals") {
        for (let i = 0; i < 8; i++) {
          const x = Math.round(((i + 0.4) / 8) * w);
          const y = 16 + (i * 33) % Math.max(24, h - 34);
          items.push(div().absolute().left(x).top(y).w(5).h(3.5).rounded(2).bg(i % 2 ? "#f9a8d4" : "#fbcfe8").opacity(0.75));
        }
        return items;
      }
      if (weather === "drizzle") {
        for (let i = 0; i < 8; i++) {
          const x = Math.round(((i + 0.5) / 8) * w);
          const y = 14 + (i * 35) % Math.max(24, h - 34);
          items.push(div().absolute().left(x).top(y).w(1.5).h(10).bg("#bae6fd").opacity(0.45));
          if (i % 3 === 0) {
            const ry = Math.round(h * 0.45 + (i * 19) % Math.max(16, h * 0.45));
            items.push(div().absolute().left(x - 4).top(ry).w(10).h(4).rounded_full().border_1().border_color("#e0f2fe").opacity(0.4));
          }
        }
        return items;
      }
      if (weather === "snow") {
        for (let i = 0; i < 10; i++) {
          const x = Math.round(((i + 0.5) / 10) * w);
          const y = 16 + (i * 29) % Math.max(24, h - 32);
          const sz = i % 3 === 0 ? 4 : 2.5;
          items.push(div().absolute().left(x).top(y).size(sz).rounded_full().bg("#ffffff").opacity(0.7));
        }
        return items;
      }
      return items;
    }

    const n = Math.min(10, Math.max(6, Math.floor(w / 140)));

    if (weather === "sunny") {
      // Soft golden floating sun motes + warm top-left sunbeam glow
      items.push(
        div().absolute().left(0).top(0).w(Math.round(w * 0.45)).h(h).bg("#fef9c3").opacity(0.08)
          .loop("opacity", { from: 0.04, to: 0.11, period: 5200 }),
      );
      for (let i = 0; i < Math.min(8, n); i++) {
        const x = Math.round(((i + 0.4) / Math.min(8, n)) * w);
        const y0 = 26 + (i * 31) % Math.max(30, h - 44);
        items.push(
          div().absolute().left(x).top(y0).size(3).rounded_full().bg("#fef08a")
            .loop("top", { from: y0 - 6, to: y0 + 6, period: 3600 + (i % 4) * 700 })
            .loop("opacity", { from: 0.1, to: 0.65, period: 2800 + (i % 3) * 600 }),
        );
      }
      return items;
    }

    if (weather === "breeze") {
      // Drifting pixel leaves gliding across the meadow on a gentle breeze
      for (let i = 0; i < n; i++) {
        const x0 = Math.round(((i + 0.3) / n) * w) - 40;
        const y0 = 10 + (i * 29) % Math.max(24, h - 30);
        const per = 3000 + (i % 5) * 650;
        items.push(
          div().absolute().left(x0).top(y0).w(6).h(3).rounded(2).bg(i % 3 === 0 ? "#86efac" : i % 3 === 1 ? "#4ade80" : "#fde047")
            .loop("left", { from: x0, to: x0 + 96, period: per })
            .loop("top", { from: y0 - 8, to: y0 + 18, period: per })
            .loop("opacity", { from: 0.85, to: 0.1, period: per }),
        );
      }
      return items;
    }

    if (weather === "rainbow") {
      // True semicircular pastel after-rain rainbow arch (bottom half clipped below the meadow!)
      const bands = ["#fca5a5", "#fdba74", "#fde047", "#86efac", "#93c5fd", "#c4b5fd"];
      const arcW = Math.round(w * 0.56);
      bands.forEach((col, bi) => {
        const d = arcW - bi * 10;
        items.push(
          div().absolute().left(Math.round((w - d) / 2)).top(18 + bi * 5)
            .w(d).h(d)
            .rounded_full().border(3).border_color(col).opacity(0.24),
        );
      });
      for (let i = 0; i < 8; i++) {
        const x = Math.round(((i + 0.5) / 8) * w);
        const y0 = 20 + (i * 27) % Math.max(24, h - 36);
        items.push(
          div().absolute().left(x).top(y0).size(3.5).rounded_full().bg("#ffffff")
            .loop("opacity", { from: 0.1, to: 0.9, period: 1400 + (i % 4) * 400 }),
        );
      }
      return items;
    }

    if (weather === "storm") {
      // Cool mist + rain + occasional soft ambient lightning shimmer
      items.push(div().absolute().inset_0().bg("#0f172a").opacity(0.14));
      items.push(
        div().absolute().inset_0().bg("#e0f2fe").opacity(0)
          .loop("opacity", { from: 0.0, to: 0.16, period: 6400 }),
      );
      for (let i = 0; i < n + 2; i++) {
        const x = Math.round(((i + 0.3) / (n + 2)) * w);
        const per = 520 + (i % 4) * 110;
        items.push(
          div().absolute().left(x).top(-16).w(1.5).h(15).bg("#93c5fd")
            .loop("top", { from: -16, to: h, period: per })
            .loop("left", { from: x + 10, to: x - 14, period: per })
            .loop("opacity", { from: 0.78, to: 0.2, period: per }),
        );
      }
      return items;
    }

    for (let i = 0; i < n; i++) {
      const x = Math.round(((i + 0.5) / n) * w);
      const period = 2600 + (i % 5) * 650;
      if (weather === "fireflies") {
        const y0 = 22 + (i * 37) % Math.max(30, h - 40);
        items.push(
          div().absolute().left(x).top(y0).size(4).rounded_full().bg("#fef08a")
            .loop("top", { from: y0 - 10, to: y0 + 10, period: period + 1000 })
            .loop("opacity", { from: 0.12, to: 0.95, period }),
        );
      } else if (weather === "petals") {
        items.push(
          div().absolute().left(x).top(-6).w(5).h(3.5).rounded(2).bg(i % 2 ? "#f9a8d4" : "#fbcfe8")
            .loop("top", { from: -6, to: h - 8, period: period + 1800 })
            .loop("left", { from: x, to: x + 42, period: period + 1800 })
            .loop("opacity", { from: 0.9, to: 0.2, period: period + 1800 }),
        );
      } else if (weather === "drizzle") {
        const per = 760 + (i % 4) * 160;
        items.push(
          div().absolute().left(x).top(-14).w(1.5).h(11).bg("#bae6fd")
            .loop("top", { from: -14, to: h, period: per })
            .loop("opacity", { from: 0.65, to: 0.2, period: per }),
        );
        if (i % 3 === 0) {
          const ry = Math.round(h * 0.45 + (i * 19) % Math.max(16, h * 0.45));
          items.push(
            div().absolute().left(x - 4).top(ry).w(10).h(4).rounded_full().border_1().border_color("#e0f2fe")
              .loop("opacity", { from: 0.05, to: 0.6, period: 1400 + (i % 3) * 350 }),
          );
        }
      } else if (weather === "snow") {
        const sz = i % 3 === 0 ? 4 : 2.5;
        items.push(
          div().absolute().left(x).top(-6).size(sz).rounded_full().bg("#ffffff")
            .loop("top", { from: -6, to: h - 8, period: period + 2400 })
            .loop("left", { from: x - 10, to: x + 14, period: period + 2400 })
            .loop("opacity", { from: 0.92, to: 0.25, period: period + 2400 }),
        );
      }
    }
    return items;
  }

  render(cx) {
    if (this.isHabitatHidden() && !this.ballAnim) return div();
    const winActive = this.isWindowActive();
    const animateAmbient = !isEcoFx() && winActive && !this.ballAnim;
    const p = palette();
    const wrapDock = (inner) =>
      applyUiFont(
        div()
          .size_full()
          .px(8)
          .py(6)
          .bg(p.canvas)
          .border_t(1)
          .border_color(p.border)
          .child(inner),
      );

    const addRoundedMask = (el) =>
      el
        .child(svg(iconAsset("corner-tl")).absolute().top(0).left(0).size(10).text_color(p.canvas))
        .child(svg(iconAsset("corner-tr")).absolute().top(0).right(0).size(10).text_color(p.canvas))
        .child(svg(iconAsset("corner-bl")).absolute().bottom(0).left(0).size(10).text_color(p.canvas))
        .child(svg(iconAsset("corner-br")).absolute().bottom(0).right(0).size(10).text_color(p.canvas))
        .child(div().absolute().inset_0().rounded(10).border_1().border_color(p.border));

    // If an inline VS Battle is active, render it cleanly inside the rounded habitat dock card!
    if (this.battle) {
      return wrapDock(
        addRoundedMask(
          div()
            .id("poke-habitat")
            .relative()
            .size_full()
            .rounded(10)
            .overflow_hidden()
            .on_size_change((size, cx) => {
              const width = size.width / zoom();
              const height = size.height / zoom();
              if (Math.abs(width - this.width) > 1 || Math.abs(height - this.height) > 1) {
                this.width = width;
                this.height = height;
                this.sized = true;
                cx.notify();
              }
            })
            .child(this.battle.render(cx, this.width, this.height)),
        ),
      );
    }

    const now = Date.now();
    const list = agents();
    // Detect fresh Master Ball release / recall signals from the bottom-right Master Ball dock!
    const relAt = Number(shared(HABITAT_RELEASE_KEY) || 0);
    if (relAt > this.lastReleaseSeen) {
      this.lastReleaseSeen = relAt;
      if (now - relAt < 1800 && !this.ballAnim) {
        this.triggerRelease(cx, true, list);
      }
    }
    const recAt = Number(shared(HABITAT_RECALL_KEY) || 0);
    if (recAt > this.lastRecallSeen) {
      this.lastRecallSeen = recAt;
      if (now - recAt < 1800 && !this.ballAnim) {
        this.triggerRecall(cx, true);
      }
    }
    const tabs = tabsById();
    const labels = labelsByAddress();
    const { ids } = assignPokemon(list);
    const biome = biomeOf(shared(BIOME_KEY));
    const tod = currentTimeOfDay();
    const weatherObj = activeWeather(now, this.weatherOffset);
    const weather = weatherObj.id;
    const b = this.bounds();

    const cardW = Math.max(120, Math.round(this.width));
    const cardH = Math.max(80, Math.round(this.height));
    const ba = this.ballAnim;
    const cardCollapsed = Boolean(
      (ba?.mode === "recall" && ba.collapsed) || (ba?.mode === "release" && !ba.spread),
    );
    const cardDur = ba?.mode === "recall" ? 380 : 420;
    const cardEase = ba?.mode === "recall" ? "ease-in" : "ease-out";

    const root = div()
        .id("poke-habitat")
        .absolute()
        .left(cardCollapsed ? Math.max(0, cardW - 34) : 0)
        .top(cardCollapsed ? Math.max(0, cardH - 22) : 0)
        .w(cardCollapsed ? 24 : cardW)
        .h(cardCollapsed ? 16 : cardH)
        .opacity(cardCollapsed ? (ba?.mode === "release" ? 0.25 : 0.1) : 1)
        .when(Boolean(ba), (el) =>
          el
            .transition("left", { duration: cardDur, easing: cardEase })
            .transition("top", { duration: cardDur, easing: cardEase })
            .transition("width", { duration: cardDur, easing: cardEase })
            .transition("height", { duration: cardDur, easing: cardEase })
            .transition("opacity", { duration: cardDur, easing: cardEase }),
        )
        .rounded(10)
        .overflow_hidden()
        .bg(p.canvas)
        .when(Boolean(this.drag?.active), (el) => el.cursor_grabbing())
        .on_window_mouse_move((e, cx) => {
          const d = this.drag;
          if (!d) return;
          if (e.pressed_button !== "left") {
            this.finishDrag(e, cx);
            return;
          }
          const z = zoom();
          const wx = e.position.x / z;
          const wy = e.position.y / z;
          if (!d.active && Math.hypot(wx - d.startWinX, wy - d.startWinY) >= 5) {
            this.activateGrab(cx);
          }
          if (!d.active) return;
          const nowMove = Date.now();
          if (nowMove - this.lastDragMoveAt < 16) return;
          this.lastDragMoveAt = nowMove;
          const m = this.mons[d.addr];
          if (!m) { this.drag = null; return; }
          const bNow = this.bounds();
          const lx = clamp(e.local_position.x / z, bNow.minX, bNow.maxX);
          const ly = clamp(e.local_position.y / z + 14, bNow.minY, bNow.maxY);
          const dx = lx - m.x;
          if (Math.abs(dx) > 1.5) m.dir = dx > 0 ? "r" : "l";
          m.x = m.fromX = m.targetX = lx;
          m.y = m.fromY = m.targetY = ly;
          m.moving = false;
          m.dur = 1;
          d.targetAddr = this.findDropTarget(d.addr, lx, ly, nowMove);
          cx.notify();
        })
        .on_window_mouse_up("left", (e, cx) => {
          if (this.drag) this.finishDrag(e, cx);
        });

    // 1. Crisp 2D Top-Down GBA Overworld Tile Map PNG — scales directly with gourd suction/ejection!
    const mapBox = computeMapBox(this.width, this.height);
    root.child(
      image(mapAsset(biome.id))
        .id("hab-map-bg")
        .absolute()
        .left(cardCollapsed ? 0 : mapBox.left)
        .top(cardCollapsed ? 0 : mapBox.top)
        .w(cardCollapsed ? 24 : mapBox.drawW)
        .h(cardCollapsed ? 16 : mapBox.drawH)
        .when(Boolean(ba), (el) =>
          el
            .transition("left", { duration: cardDur, easing: cardEase })
            .transition("top", { duration: cardDur, easing: cardEase })
            .transition("width", { duration: cardDur, easing: cardEase })
            .transition("height", { duration: cardDur, easing: cardEase }),
        ),
    );

    // 2. Biome-accurate lake wave shimmers & cascading waterfall streaks
    waterSparkleCoords(biome.id, mapBox).slice(0, 5).forEach((sp, i) => {
      const lx = Math.round(sp.x - sp.w / 2);
      const per = 1800 + (i % 5) * 420;
      root.child(
        div()
          .absolute()
          .left(lx)
          .top(Math.round(sp.y))
          .w(sp.w)
          .h(2)
          .rounded(1)
          .bg(i % 3 === 0 ? "#ffffff" : "#e0f2fe")
          .when(animateAmbient, (el) => el.loop("opacity", { from: 0.16, to: 0.78, period: per }))
          .when(!animateAmbient, (el) => el.opacity(0.42)),
      );
    });
    const wf = waterfallCoords(biome.id, mapBox);
    if (wf) {
      for (let i = 0; i < 4; i++) {
        const sx = Math.round(wf.x + ((i + 0.5) / 4) * wf.w);
        const per = 620 + (i % 3) * 140;
        const staticTop = Math.round(wf.y + ((i % 3) / 3) * Math.max(4, wf.h - 12));
        root.child(
          div()
            .absolute()
            .left(sx)
            .top(animateAmbient ? Math.round(wf.y) : staticTop)
            .w(2.5)
            .h(12)
            .rounded(2)
            .bg(i % 2 === 0 ? "#ffffff" : "#bae6fd")
            .when(animateAmbient, (el) =>
              el.loop("top", { from: Math.round(wf.y), to: Math.round(wf.y + wf.h - 10), period: per }),
            )
            .when(!animateAmbient, (el) => el.opacity(0.55)),
        );
      }
      root.child(
        div()
          .absolute()
          .left(Math.round(wf.mistX - wf.w * 0.6))
          .top(Math.round(wf.mistY - 4))
          .w(Math.round(wf.w * 1.2))
          .h(10)
          .rounded_full()
          .bg("#e0f7ff")
          .when(animateAmbient, (el) => el.loop("opacity", { from: 0.25, to: 0.72, period: 1100 }))
          .when(!animateAmbient, (el) => el.opacity(0.42)),
      );
    }

    // 3. Subtle Time-of-Day tint veil (very light so map stays vibrant & clean!)
    if (tod === "dusk") {
      root.child(div().absolute().inset_0().bg("#f59e0b").opacity(0.09));
    } else if (tod === "night" && biome.id !== "moon") {
      root.child(div().absolute().inset_0().bg("#0f172a").opacity(0.28));
    }

    // 4. Dynamic VS Lock-On Indicator ONLY while dragging one Pokemon over another Pokemon!
    // (Casual overworld sparring happens freely anywhere on the map with zero intrusive arena ring.)
    const dragTargetAddr = this.drag?.active ? this.drag.targetAddr : null;
    if (dragTargetAddr && this.mons[dragTargetAddr]) {
      const tp = currentPos(this.mons[dragTargetAddr], now);
      root.child(
        div()
          .absolute()
          .left(Math.round(tp.x - 36))
          .top(Math.round(tp.y - 16))
          .w(72)
          .h(32)
          .rounded_full()
          .bg("#ef444428")
          .border(2)
          .border_color("#ef4444ee")
          .loop("opacity", { from: 0.55, to: 1.0, period: 420 }),
      );
    }

    // 5. Empty state
    if (list.length === 0) {
      root.child(
        h_flex().absolute().inset_0().items_center().justify_center()
          .child(
            div().px(14).py(6).rounded(8).border_1().border_color(p.border).bg(alpha(p.popover, "eb"))
              .text_size(12).text_color(p.fg)
              .child(tr("启动一个智能体，迎接你的第一只宝可梦吧！", "Start a coding agent to welcome your first Pokémon!")),
          ),
      );
    }

    // 6. Y-DEPTH SORTED Pokemon + Subagent Entourage + Foreground Canopy Occlusion!
    // Layer order: Ground/Swimmers (sorted by Y) -> Transparent Foreground Canopy (*_fg.png) -> Airborne Flyers (sorted by Y)
    const FOOT_Y = 98;
    const SLOT_H = 122;

    const renderSpriteBody = (s, scaleMult, { hab, swimming, burrowed, isAirborne, grabbed, inWater, moving, evoGlowing, shiny }) => {
      const sw = Math.max(8, Math.round(s.w * scaleMult));
      const sh = Math.max(8, Math.round(s.h * scaleMult));
      const bx = s.box.x * scaleMult;
      const by = s.box.y * scaleMult;
      const bw = Math.max(8, s.box.w * scaleMult);
      const bh = Math.max(8, s.box.h * scaleMult);
      const left = Math.round(SLOT / 2 - (bx + bw / 2));
      // Grabbed Pokemon dangles 30px in the air! Swimmers sink ~38%; burrowers sink ~42%; flyers soar 20px high!
      const submerge = (!grabbed && swimming)
        ? Math.round(clamp(bh * 0.38, 7, 18))
        : (!grabbed && burrowed)
          ? Math.round(clamp(bh * (hab.deepBurrow ? 0.28 : 0.42), 7, 18))
          : 0;
      const yOffset = grabbed ? -30 : (swimming || burrowed) ? submerge : isAirborne ? -20 : 0;
      const top = Math.round(FOOT_Y - (by + bh) + yOffset);
      const shadowW = Math.max(10, Math.round(bw * (grabbed ? 0.46 : isAirborne ? 0.50 : 0.68)));
      const clip = sw > 12 && sh > 12 ? Math.max(1, Math.round(2 * scaleMult)) : 0;
      const seamY = FOOT_Y - 1;
      const clipTop = top + clip;
      const clipH = (!grabbed && (swimming || burrowed))
        ? Math.max(8, Math.min(sh - clip * 2, seamY - clipTop))
        : sh - clip * 2;
      const collarW = Math.max(26, Math.min(72, Math.round(bw * (swimming ? 1.44 : 1.38))));
      const collarH = Math.round(collarW * (swimming ? (22 / 48) : (20 / 48)));

      const backLayer = (!grabbed && swimming)
        ? div()
            .absolute()
            .left(Math.round(SLOT / 2 - collarW / 2))
            .top(seamY - Math.round(collarH * 0.55))
            .w(collarW)
            .h(collarH)
            .when(animateAmbient, (el) => el.loop("opacity", { from: 0.65, to: 1.0, period: 1200 }))
            .when(!animateAmbient, (el) => el.opacity(0.85))
            .child(image(iconAsset("swim-back")).w(collarW).h(collarH))
        : (!grabbed && burrowed)
          ? div()
              .absolute()
              .left(Math.round(SLOT / 2 - collarW / 2))
              .top(seamY - Math.round(collarH * 0.52))
              .w(collarW)
              .h(collarH)
              .child(image(iconAsset("burrow-back")).w(collarW).h(collarH))
          : div()
              .absolute()
              .left(Math.round(SLOT / 2 - shadowW / 2))
              .top(grabbed ? FOOT_Y + 2 : isAirborne ? FOOT_Y : FOOT_Y - 3)
              .w(shadowW)
              .h(grabbed ? 4 : isAirborne ? 5 : Math.max(4, Math.round(7 * Math.min(1.1, scaleMult))))
              .rounded_full()
              .bg(grabbed ? "#00000028" : isAirborne ? (inWater ? "#0c4a6e34" : "#00000022") : "#00000036");

      const spriteBox = div()
        .absolute()
        .left(left + clip)
        .top(clipTop)
        .w(sw - clip * 2)
        .h(clipH)
        .overflow_hidden()
        .when(grabbed, (el) =>
          el
            .loop("left", { from: left + clip - 2.5, to: left + clip + 2.5, period: 165 })
            .loop("top", { from: clipTop - 1.5, to: clipTop + 2, period: 220 }),
        )
        .when(animateAmbient && !grabbed && isAirborne, (el) => el.loop("top", { from: clipTop - 2, to: clipTop + 2, period: 1050 }))
        .when(animateAmbient && !grabbed && swimming, (el) => el.loop("top", { from: clipTop - 1, to: clipTop + 1.5, period: 1150 }))
        .when(animateAmbient && !grabbed && burrowed && moving, (el) => el.loop("top", { from: clipTop - 1, to: clipTop + 1, period: 260 }))
        .child(image(s.path).absolute().left(-clip).top(-clip).w(sw).h(sh));

      const bodyEl = div()
        .when(evoGlowing, (el) =>
          el.child(
            div()
              .absolute()
              .left(Math.round(SLOT / 2 - 28))
              .top(Math.max(0, Math.round(FOOT_Y - bh - 12)))
              .size(56)
              .rounded_full()
              .bg("#fef08a55")
              .border(2)
              .border_color("#facc15")
              .loop("opacity", { from: 0.35, to: 1.0, period: 420 }),
          ),
        )
        .child(backLayer)
        .child(spriteBox)
        // Subtle periodic golden star shimmer for Shiny ✨ Pokemon!
        .when(shiny, (el) =>
          el.child(
            div()
              .absolute()
              .left(Math.round(SLOT / 2 + bw * 0.34))
              .top(Math.max(2, Math.round(FOOT_Y - bh + yOffset - 4)))
              .text_size(11)
              .font_bold()
              .text_color("#facc15")
              .when(animateAmbient, (x) => x.loop("opacity", { from: 0.0, to: 0.95, period: 2400 }))
              .when(!animateAmbient, (x) => x.opacity(0.85))
              .child("✦"),
          ),
        )
        .when(!grabbed && swimming, (el) =>
          el.child(
            div()
              .absolute()
              .left(Math.round(SLOT / 2 - collarW / 2))
              .top(seamY - Math.round(collarH * 0.56))
              .w(collarW)
              .h(collarH)
              .when(animateAmbient, (x) =>
                x.loop("top", {
                  from: seamY - Math.round(collarH * 0.56),
                  to: seamY - Math.round(collarH * 0.56) + 1.5,
                  period: 950,
                }),
              )
              .child(image(iconAsset("swim-front")).w(collarW).h(collarH)),
          ),
        )
        .when(!grabbed && burrowed, (el) =>
          el.child(
            div()
              .absolute()
              .left(Math.round(SLOT / 2 - collarW / 2))
              .top(seamY - Math.round(collarH * 0.54))
              .w(collarW)
              .h(collarH)
              .when(animateAmbient && moving, (x) => x.loop("top", { from: seamY - Math.round(collarH * 0.54), to: seamY - Math.round(collarH * 0.54) + 1.2, period: 240 }))
              .child(image(iconAsset("burrow-front")).w(collarW).h(collarH)),
          ),
        );

      return { body: bodyEl, spriteH: bh, headShiftY: yOffset };
    };

    const renderMainAgent = (a, idx) => {
      const id = ids[a.address];
      const slot = slotOf(a);
      const shiny = isShiny(slot);
      const indivScale = sizeScaleOf(slot);
      const fallbackX = b.minX + ((idx + 0.5) / Math.max(1, list.length)) * (b.maxX - b.minX);
      const fallbackY = b.minY + ((idx % 2) * 0.45 + 0.25) * (b.maxY - b.minY);
      const m = this.mons[a.address] ?? { x: fallbackX, y: fallbackY, targetX: fallbackX, targetY: fallbackY, dir: "d", moving: false, dur: 0 };
      const mood = m.mood ?? moodOf(a, tabs, now);
      const meta = this.sprites[spriteCacheKey(id, shiny)] ?? this.sprites[spriteCacheKey(id, false)];
      const tag = tagOf(a, tabs, labels);
      const hovered = this.hover === a.address;
      const drawX = m.moving ? m.targetX : m.x;
      const drawY = m.moving ? m.targetY : m.y;
      const bat = this.engine.battleFor(a.address);
      const batHp = bat ? (bat.a === a.address ? bat.hpA : bat.hpB) : null;
      const batMaxHp = bat?.maxHp ?? 100;
      const batEpic = bat?.tier === "epic";
      const grabbed = Boolean(m.grabbed);

      const curLive = currentPos(m, now);
      const terr = terrainAtScreen(biome.id, curLive.x, curLive.y, mapBox);
      const hab = habitatOf(id);
      const inWater = terr === "water";
      const swimming = !grabbed && inWater && hab.canSwim;
      const isAirborne = !grabbed && hab.canFly && (inWater || hab.pureFloat || (Boolean(m.airborne) && !m.perchRest)) && (mood !== "sleep" || inWater);
      const soilOk = terr === "land" || terr === "forest" || terr === "shore";
      const burrowed = !grabbed && !swimming && !isAirborne && hab.canBurrow && soilOk && Boolean(m.burrowed);
      const evoGlowing = now < (m.evoGlowUntil || 0);

      const s = this.pickSprite(meta, m, mood, now, isAirborne, hab);
      let body;
      let spriteH = 38;
      let headShiftY = 0;
      if (s) {
        const res = renderSpriteBody(s, indivScale, {
          hab, swimming, burrowed, isAirborne, grabbed, inWater, moving: m.moving, evoGlowing, shiny,
        });
        body = res.body;
        spriteH = res.spriteH;
        headShiftY = res.headShiftY;
      } else if (hasMenuIcon(id)) {
        const iw = Math.round(52 * indivScale);
        const ih = Math.round(39 * indivScale);
        spriteH = Math.round(36 * indivScale);
        body = div()
          .child(div().absolute().left(Math.round(SLOT / 2 - 14 * indivScale)).top(FOOT_Y - 3).w(Math.round(28 * indivScale)).h(7).rounded_full().bg("#00000030"))
          .child(image(menuIconPath(id)).absolute().left(Math.round(SLOT / 2 - iw / 2)).top(FOOT_Y - ih + 1 + (grabbed ? -28 : 0)).w(iw).h(ih));
      } else {
        spriteH = 22;
        body = div()
          .absolute().left(SLOT / 2 - 11).top(FOOT_Y - 22 + (grabbed ? -28 : 0)).size(22)
          .opacity(0.75)
          .child(image(ballAsset("poke", false)).size(22));
      }

      const isDragTarget = Boolean(dragTargetAddr && dragTargetAddr === a.address);
      const hasLockOn = Boolean(grabbed && dragTargetAddr);
      const bubble =
        hasLockOn ? div().px(6).py(0.5).rounded(5).bg("#2563eb").border_1().border_color("#93c5fd").text_color("#ffffff").font_bold().text_size(9.5).child(tr("我方", "YOU"))
        : grabbed ? div().px(5).rounded(5).bg("#0ea5e9").text_color("#ffffff").font_bold().text_size(10).child("!?").loop("opacity", { from: 0.65, to: 1, period: 360 })
        : isDragTarget ? div().px(6).py(0.5).rounded(5).bg("#dc2626").border_1().border_color("#fca5a5").text_color("#ffffff").font_bold().text_size(9.5).child(tr("对手", "FOE"))
        : mood === "blocked" ? div().px(6).rounded(5).bg("#dc2626").text_color("#ffffff").font_bold().text_size(11).child("!").when(animateAmbient, (el) => el.loop("opacity", { from: 0.6, to: 1, period: 750 }))
        : m.emote ? this.renderEmote(m.emote)
        : mood === "done" ? div().px(6).rounded(5).bg("#16a34a").text_color("#ffffff").font_bold().text_size(11).child("✓")
        : mood === "sleep" ? (winActive
            ? div().text_color("#ffffff").font_bold().text_size(11).frames(["z", "zZ", "zZz", "zZ"], 1100)
            : div().text_color("#ffffff").font_bold().text_size(11).child("zZz"))
        : null;

      const headY = FOOT_Y - spriteH + headShiftY;
      const dur = grabbed ? 1 : Math.max(1, Math.round(m.moving ? m.dur : m.dur || 150));
      const lv = levelInfo(id, slot);
      // Bottom pill stays clean & concise: always just the project/tab name!
      const label = tag;
      // Split two-compartment RPG nameplate shown ABOVE the Pokemon on hover: [ LV 19 | Eevee ✨ ]
      const showHoverPlate = hovered && !grabbed && !isDragTarget;
      const hoverPlate = showHoverPlate
        ? h_flex()
            .h(20)
            .items_center()
            .rounded(6)
            .overflow_hidden()
            .border_1()
            .border_color(shiny ? "#d97706" : p.blue)
            .shadow_md()
            .child(
              h_flex()
                .h_full()
                .px(5.5)
                .items_center()
                .bg(shiny ? "#d97706" : p.blue)
                .text_size(9.5)
                .font_bold()
                .text_color("#ffffff")
                .child(`LV ${lv.level}`),
            )
            .child(
              h_flex()
                .h_full()
                .px(7)
                .items_center()
                .bg(alpha(p.popover, "f7"))
                .text_size(10)
                .font_semibold()
                .text_color(p.fg)
                .child(`${nameOf(id)}${shiny ? " ✨" : ""}`),
            )
        : null;
      const topOverlay = hoverPlate ?? bubble;

      const ballMouthX = Math.max(48, cardW - 22);
      const ballMouthY = Math.max(32, cardH - 18);
      const isSuckedIn = Boolean(ba?.mode === "recall" && idx < ba.pulledCount);
      const isStillInsideBall = Boolean(ba?.mode === "release" && idx >= ba.releasedCount);
      const isJustReleased = Boolean(ba?.mode === "release" && idx < ba.releasedCount);
      const renderX = (isSuckedIn || isStillInsideBall) ? ballMouthX : drawX;
      const renderY = (isSuckedIn || isStillInsideBall) ? ballMouthY : drawY;
      const monOpacity = (isSuckedIn || isStillInsideBall) ? 0 : 1;
      const moveDur = isSuckedIn ? 300 : isJustReleased ? 340 : dur;
      const moveEase = isSuckedIn ? "ease-in" : isJustReleased ? "ease-out" : "linear";

      return div()
        .id(`mon-${a.address}`)
        .absolute()
        .w(SLOT)
        .h(SLOT_H)
        .left(renderX - SLOT / 2)
        .top(renderY - FOOT_Y)
        .opacity(monOpacity)
        .when(Boolean(ba), (el) =>
          el.transition("opacity", { duration: isSuckedIn ? 260 : 280, easing: moveEase }),
        )
        .when(!grabbed && (m.moving || isSuckedIn || isJustReleased), (el) =>
          el
            .transition("left", { duration: moveDur, easing: moveEase })
            .transition("top", { duration: moveDur, easing: moveEase }),
        )
        .when(!grabbed, (el) => el.cursor_grab())
        .when(grabbed, (el) => el.cursor_grabbing())
        .on_hover((h, cx) => {
          const next = h ? a.address : this.hover === a.address ? null : this.hover;
          if (next !== this.hover) { this.hover = next; cx.notify(); }
        })
        .on_mouse_down("left", (e, cx) => {
          cx.stop_propagation();
          const z = zoom();
          this.drag = {
            addr: a.address,
            startWinX: e.position.x / z,
            startWinY: e.position.y / z,
            downAt: Date.now(),
            active: false,
            targetAddr: null,
          };
          cx.timer.after(210, (cx) => {
            if (this.drag && this.drag.addr === a.address && !this.drag.active) {
              this.activateGrab(cx);
            }
          });
        })
        .on_click(() => {
          if (Date.now() - (this.lastDragEndAt || 0) < 350) return;
          if (a.pane) run("pane.focus", { pane: a.pane });
          else run("agent.focus", { terminal: a.address });
        })
        .on_mouse_down("right", (_e, cx) => {
          cx.stop_propagation();
          openPokePicker({ mode: "pokemon", slot, current: id, tag });
        })
        .child(body)
        .when(batHp !== null, (el) => {
          const pct = clamp(batHp / Math.max(1, batMaxHp), 0, 1);
          const hpColor = pct > 0.5 ? "#22c55e" : pct > 0.22 ? "#f59e0b" : "#ef4444";
          const barW = batEpic ? 46 : 38;
          return el.child(
            h_flex().absolute().left(0).w(SLOT).top(Math.max(0, headY - 12)).justify_center()
              .child(
                h_flex().w(barW).h(batEpic ? 7 : 6).p(1).rounded_full().bg("#111827dd")
                  .when(batEpic, (x) => x.border_1().border_color("#facc15"))
                  .child(div().w(Math.max(3, Math.round((barW - 4) * pct))).h(batEpic ? 4 : 4).rounded_full().bg(hpColor)),
              ),
          );
        })
        .when(Boolean(topOverlay), (el) =>
          el.child(h_flex().absolute().left(0).w(SLOT).top(Math.max(0, headY - (batHp !== null ? 32 : (showHoverPlate ? 24 : 20)))).justify_center().child(topOverlay)))
        .child(
          h_flex().absolute().left(6).w(SLOT - 12).top(FOOT_Y + 4).h(LABEL_H).justify_center().items_center()
            .child(
              h_flex().min_w(0).h(LABEL_H).px(6).gap(4).items_center().rounded_full()
                .bg(hovered || a.focused ? alpha(p.popover, "f2") : alpha(p.popover, "d0"))
                .border_1().border_color(hovered || a.focused ? p.blue : "#00000020")
                .child(div().flex_none().size(5.5).rounded_full().bg(p[a.status] ?? p.idle))
                .child(div().min_w(0).truncate().text_size(10).font_medium().text_color(p.fg).child(label)),
            ),
        );
    };

    const renderSubFollower = (subAddr, sm, term) => {
      const subId = sm.dexId;
      const hab = habitatOf(subId);
      const curLive = currentPos(sm, now);
      const terr = terrainAtScreen(biome.id, curLive.x, curLive.y, mapBox);
      const inWater = terr === "water";
      const swimming = inWater && hab.canSwim;
      const isAirborne = hab.canFly && (inWater || hab.pureFloat || Boolean(sm.airborne));
      const meta = this.sprites[spriteCacheKey(subId, false)];
      const s = this.pickSprite(meta, sm, "working", now, isAirborne, hab);
      const drawX = sm.moving ? sm.targetX : sm.x;
      const drawY = sm.moving ? sm.targetY : sm.y;
      const dur = Math.max(1, Math.round(sm.moving ? sm.dur : sm.dur || 150));
      const subName = term?.name || term?.template || term?.program?.name || "Subagent";
      const st = term?.status === "error" ? "blocked" : term?.status === "done" ? "idle" : (term?.status ?? "working");

      let body;
      if (s) {
        body = renderSpriteBody(s, 0.65, {
          hab, swimming, burrowed: false, isAirborne, inWater, moving: sm.moving, evoGlowing: false, shiny: false,
        }).body;
      } else if (hasMenuIcon(subId)) {
        body = div()
          .child(div().absolute().left(SLOT / 2 - 9).top(FOOT_Y - 2).w(18).h(5).rounded_full().bg("#00000028"))
          .child(image(menuIconPath(subId)).absolute().left(SLOT / 2 - 17).top(FOOT_Y - 25).w(34).h(26));
      } else {
        body = div().absolute().left(SLOT / 2 - 7).top(FOOT_Y - 14).size(14).child(image(ballAsset("poke", false)).size(14));
      }

      return div()
        .id(`submon-${subAddr}`)
        .absolute()
        .w(SLOT)
        .h(SLOT_H)
        .left(drawX - SLOT / 2)
        .top(drawY - FOOT_Y)
        .when(Boolean(sm.moving), (el) =>
          el
            .transition("left", { duration: dur, easing: "linear" })
            .transition("top", { duration: dur, easing: "linear" }),
        )
        .cursor_pointer()
        .tooltip(tr(`${nameOf(subId)}（子代理 · ${subName}）`, `${nameOf(subId)} (Subagent · ${subName})`))
        .on_click(() => run("terminal.peek", { terminal: subAddr }))
        .child(body)
        .child(
          div()
            .absolute()
            .left(SLOT / 2 - 3)
            .top(FOOT_Y + 2)
            .size(5.5)
            .rounded_full()
            .bg(p[st] ?? p.working)
            .border_1()
            .border_color("#ffffffaa"),
        );
    };

    const termMap = new Map(terminals().map((t) => [t.address, t]));
    const groundEntries = [];
    const airEntries = [];
    const grabbedEntries = [];

    list.forEach((a, idx) => {
      const m = this.mons[a.address];
      const y = currentPos(m, now).y;
      const entry = { y, render: () => renderMainAgent(a, idx) };
      if (m?.grabbed) grabbedEntries.push(entry);
      else if (m?.airborne) airEntries.push(entry);
      else groundEntries.push(entry);
    });
    for (const [subAddr, sm] of Object.entries(this.subMons)) {
      const y = currentPos(sm, now).y;
      const entry = { y, render: () => renderSubFollower(subAddr, sm, termMap.get(subAddr)) };
      if (sm.airborne) airEntries.push(entry);
      else groundEntries.push(entry);
    }

    groundEntries.sort((x, y) => x.y - y.y);
    airEntries.sort((x, y) => x.y - y.y);

    for (const e of groundEntries) root.child(e.render());

    // 6b. Transparent GBA Foreground Depth Layer (scales cleanly with gourd suction/ejection too!)
    root.child(
      image(mapFgAsset(biome.id))
        .id("hab-map-fg")
        .absolute()
        .left(cardCollapsed ? 0 : mapBox.left)
        .top(cardCollapsed ? 0 : mapBox.top)
        .w(cardCollapsed ? 24 : mapBox.drawW)
        .h(cardCollapsed ? 16 : mapBox.drawH)
        .when(Boolean(ba), (el) =>
          el
            .transition("left", { duration: cardDur, easing: cardEase })
            .transition("top", { duration: cardDur, easing: cardEase })
            .transition("width", { duration: cardDur, easing: cardEase })
            .transition("height", { duration: cardDur, easing: cardEase }),
        ),
    );

    for (const e of airEntries) root.child(e.render());
    for (const e of grabbedEntries) root.child(e.render());

    // Bold floating KOF VS badge right between the dragged Pokemon & target Pokemon while held!
    if (dragTargetAddr && this.drag?.addr && this.mons[dragTargetAddr] && this.mons[this.drag.addr]) {
      const pA = currentPos(this.mons[this.drag.addr], now);
      const pB = currentPos(this.mons[dragTargetAddr], now);
      const mx = Math.round((pA.x + pB.x) / 2);
      const my = Math.max(24, Math.round((pA.y + pB.y) / 2 - 44));
      root.child(
        h_flex()
          .absolute()
          .left(mx - 64)
          .top(my - 20)
          .w(128)
          .justify_center()
          .child(
            h_flex()
              .px(8)
              .py(2)
              .gap(4)
              .items_center()
              .rounded_full()
              .bg("#0f172aee")
              .border(1.5)
              .border_color("#facc15")
              .shadow_lg()
              .loop("opacity", { from: 0.85, to: 1.0, period: 340 })
              .child(image(iconAsset("vs-emblem")).w(30).h(24))
              .child(div().text_size(10).font_bold().text_color("#ffffff").child(tr("松手开战", "Release!", "離してバトル！", "놓아서 배틀!"))),
          ),
      );
    }

    // 7. 2D Elemental Projectiles & Impact VFX!
    for (const f of this.engine.fx) {
      const t = clamp((now - f.born) / Math.max(1, f.dur), 0, 1);
      const fxX = f.x + (f.toX - f.x) * t;
      const fxY = f.y + (f.toY - f.y) * t - 22;
      root.child(
        div()
          .id(f.id)
          .absolute()
          .left(fxX - 13)
          .top(fxY - 13)
          .w(26).h(26)
          .transition("left", { duration: Math.max(70, Math.round(f.dur * 0.55)), easing: "ease-out" })
          .transition("top", { duration: Math.max(70, Math.round(f.dur * 0.55)), easing: "ease-out" })
          .child(image(fxAsset(f.kind)).w(26).h(26)),
      );
    }

    // 8. Floating Damage / Status Callouts ("-28", "CRIT! -42", "MISS!", "TAG!", "★ WIN!")
    for (const pop of this.engine.popups) {
      const t = clamp((now - pop.born) / Math.max(1, pop.dur), 0, 1);
      root.child(
        div()
          .id(pop.id)
          .absolute()
          .left(pop.x - 42)
          .top(pop.y - t * 24)
          .w(84)
          .flex()
          .justify_center()
          .opacity(1 - t * 0.55)
          .child(
            div().px(6).py(1).rounded(5).bg("#111827cc").text_size(10.5).font_bold().text_color("#ffffff")
              .border_1().border_color(pop.color)
              .child(pop.text),
          ),
      );
    }

    // 9. Weather particles
    root.children(this.renderWeather(weather, this.width, this.height, animateAmbient));

    // 9b. Subtle live Battle / Evolution / Celebration pill banner (top-center, auto-fades cleanly!)
    if (this.engine.banner && now < this.engine.banner.until) {
      root.child(
        h_flex().absolute().top(8).left(0).w_full().justify_center()
          .child(
            div()
              .px(10)
              .py(3)
              .rounded_full()
              .bg(alpha(p.popover, "e8"))
              .border_1()
              .border_color(alpha(this.engine.banner.color, "88"))
              .text_size(10.5)
              .font_semibold()
              .text_color(p.fg)
              .child(this.engine.banner.text),
          ),
      );
    }

    // 10. Ultra-clean icon-only corner buttons (Map + Weather, zero text clutter, zero manual Battle/Play buttons!)
    const iconBtn = (id, ico, tip, onClick) =>
      h_flex()
        .id(id)
        .size(26)
        .items_center()
        .justify_center()
        .rounded(8)
        .border_1()
        .border_color("#0000001e")
        .bg(alpha(p.popover, "cc"))
        .cursor_pointer()
        .hover((s) => s.bg(p.popover))
        .tooltip(tip)
        .on_click((e, cx) => { cx.stop_propagation(); onClick(e, cx); })
        .child(image(iconAsset(ico)).size(15));

    root.child(
      h_flex().absolute().top(8).left(10).items_center().gap(6)
        .child(
          iconBtn(
            "hab-gear",
            "hab-gear",
            tr(
              `生态与语言设置 · 地图(${biomeIntervalMin() ? `${biomeIntervalMin()}分` : "关"}) / 天气(${weatherIntervalMin() ? `${weatherIntervalMin()}分` : "关"})`,
              `Habitat & Language · Map(${biomeIntervalMin() ? `${biomeIntervalMin()}m` : "Off"}) / Weather(${weatherIntervalMin() ? `${weatherIntervalMin()}m` : "Off"})`,
              `生態園＆言語設定 · マップ(${biomeIntervalMin() ? `${biomeIntervalMin()}分` : "オフ"}) / 天候(${weatherIntervalMin() ? `${weatherIntervalMin()}分` : "オフ"})`,
              `생태원 및 언어 설정 · 맵(${biomeIntervalMin() ? `${biomeIntervalMin()}분` : "끄기"}) / 날씨(${weatherIntervalMin() ? `${weatherIntervalMin()}분` : "끄기"})`,
            ),
            () => openHabitatPrefs(),
          ),
        )
        .child(
          iconBtn(
            "hab-biome",
            `env-${biome.id}`,
            tr(`${biome.cn} · 点击切换地图`, `${biome.name} · Click to switch map`, `${biome.ja} · クリックでマップ切替`, `${biome.ko} · 클릭하여 맵 전환`),
            (_e, cx) => {
              const idx = (BIOMES.findIndex((x) => x.id === biome.id) + 1) % BIOMES.length;
              this.lastBiomeRotateAt = Date.now();
              setShared(BIOME_KEY, BIOMES[idx].id);
              cx.notify();
            },
          ),
        )
        .child(
          iconBtn(
            "hab-weather",
            `w-${weatherObj.id}`,
            tr(`${weatherObj.cn} · 点击切换天气`, `${weatherObj.label} · Click for next weather`, `${weatherObj.ja} · クリックで天候切替`, `${weatherObj.ko} · 클릭하여 날씨 전환`),
            (_e, cx) => {
              this.weatherOffset = (this.weatherOffset + 1) % WEATHER_FLOW.length;
              const nextW = activeWeather(Date.now(), this.weatherOffset).id;
              this.lastWeatherId = nextW;
              setShared(WEATHER_KEY, nextW);
              cx.notify();
            },
          ),
        ),
    );

    // 10b. Top-right Pixel-Art GBA Close Button (clicks trigger Master Ball Recall animation -> retracts to orb!)
    if (!this.ballAnim) {
      root.child(
        h_flex()
          .id("hab-hide")
          .absolute()
          .top(8)
          .right(10)
          .size(24)
          .items_center()
          .justify_center()
          .cursor_pointer()
          .hover((s) => s.opacity(0.86))
          .tooltip(tr("收入大师球并隐藏生态园", "Recall into Master Ball & hide Habitat", "マスターボールに生態園を収納", "마스터볼에 생태원 수납"))
          .on_click((e, cx) => {
            cx.stop_propagation();
            this.triggerRecall(cx);
          })
          .child(image(iconAsset("pixel-close")).size(24)),
      );
    }

    // Crisp 4-corner concave SVG masks + top border ring so ZERO map pixels ever poke out of rounded corners!
    addRoundedMask(root);

    // 11. Gourd / Master Ball Vortex Suction & Ejection Overlay ("金角大王葫芦吸入 / 放出" 旋涡动效!)
    const viewport = div()
      .id("poke-habitat-viewport")
      .relative()
      .size_full()
      .on_size_change((size, cx) => {
        const width = size.width / zoom();
        const height = size.height / zoom();
        if (Math.abs(width - this.width) > 1 || Math.abs(height - this.height) > 1) {
          const firstSize = !this.sized;
          this.width = width;
          this.height = height;
          this.sized = true;
          if (firstSize) {
            const bNow = this.bounds();
            const bId = biomeOf(shared(BIOME_KEY)).id;
            const boxNow = computeMapBox(width, height);
            const { ids: curIds } = assignPokemon(agents());
            for (const [addr, m] of Object.entries(this.mons)) {
              const dexId = curIds[addr];
              if (!dexId || m.moving) continue;
              const pt = pickTerrainTarget(bId, habitatOf(dexId), bNow.arenaX, bNow.arenaY, boxNow, bNow, { initial: true });
              m.x = m.fromX = m.targetX = pt.x;
              m.y = m.fromY = m.targetY = pt.y;
            }
          }
          cx.notify();
        }
      })
      .child(root);

    if (this.ballAnim) {
      const ba2 = this.ballAnim;
      const isRecall = ba2.mode === "recall";

      // Crisp GBA Pixel-Art Master Ball Recall / Release Animated GIF anchored right above the bottom-right Master Ball dock!
      const ballX = Math.max(48, Math.round(cardW - 22));
      const ballY = Math.max(32, Math.round(cardH - 18));
      const gifSz = isRecall ? 90 : 98;
      viewport.child(
        div()
          .id(ba2.id)
          .absolute()
          .left(Math.max(0, ballX - Math.round(gifSz * 0.62)))
          .top(Math.max(0, ballY - Math.round(gifSz * 0.68)))
          .size(gifSz)
          .child(image(fxGifAsset(isRecall ? "b-recall" : "b-release")).size(gifSz)),
      );

      // Brief iconic Poké Ball crimson-white / lavender-white capture/release flash!
      if (ba2.flash) {
        viewport.child(
          div()
            .absolute()
            .inset_0()
            .rounded(10)
            .bg(isRecall ? "#fda4af" : "#f5d0fe")
            .opacity(isRecall ? 0.28 : 0.30),
        );
      }
    }

    return wrapDock(viewport);
  }
}
