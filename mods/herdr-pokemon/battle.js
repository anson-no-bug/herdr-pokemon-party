// Authentic Classic GBA Pokemon Battle Minigame (inline inside the Habitat panel!)
//   - Classic GBA diagonal 3/4 perspective: Player BACK sprite (bottom-left) vs Opponent FRONT sprite (top-right)
//   - Simple crisp GBA pixel-art battle backdrop (battle-bg.png, zero overworld clutter, zero black bars!)
//   - Authentic GBA cream-parchment HP plates (#f8f8e8 + #2e443c ink border + classic yellow HP capsule!)
//   - Authentic GBA dark-teal RPG dialogue box + cream 2x2 Move Selector with hover ▶ cursor!
//   - Persistent fixed 4 moves per Pokemon slot (rolled once when generated, re-rolled when changing Pokemon!)
//   - Real Token-Scaled Damage across Claude Code / Codex / Pi / Antigravity!

import { div, image } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { terminals, shared, playSound, checking } from "herdr";
import { iconAsset, mapAsset, fxGifAsset, tr, isZh } from "./kit.js";
import { computeMapBox } from "./terrain.js";
import {
  nameOf, elementOf, ELEMENT_COLORS, elemLabel, moveName, effectiveness,
  movesForSlot, tokenDamageMult, formatTokens, estimateTokensFromActivity, measureAgentTokens,
  ensureBattleSprite, portraitFor, hasMenuIcon, menuIconPath,
  levelInfo, slotXpOf, saveXpBatch, ensureCry, crySetOf, CRY_KEY, spriteCacheKey,
} from "./pokemon.js";

const MAX_HP = 180;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// Authentic GBA / Gen-5 Pixel-Art Battle FX Mapping (招式维度逐帧像素特效!):
// Maps every move ID / element to a dedicated animated pixel-art GIF + GBA staging parameters.
const MOVE_FX_SPEC = {
  // Vertical sky lightning bolt + dark sky flash
  thunder: "thunder", thunderbolt: "thunder", discharge: "thunder", "pika-volt": "thunder", "zippy-zap": "thunder",
  // Diagonal GBA Hyper Beam / Solar Beam / Overheat
  "hyper-beam": "beam", "solar-beam": "beam", "zap-cannon": "beam", "hydro-cannon": "beam",
  "blast-hydro": "beam", overheat: "beam", "zard-blast": "beam",
  // Roaring multi-tongue pixel flames
  flamethrower: "fire", "fire-blast": "fire", "lava-plume": "fire", "flare-blitz": "fire",
  "flame-charge": "fire", "fire-punch": "fire",
  // Crashing pixel wave & geyser splash
  "hydro-pump": "water", surf: "water", scald: "water", waterfall: "water",
  liquidation: "water", "aqua-jet": "water", "water-shuri": "water", "gren-shuri": "water",
  // Faceted pixel ice crystal freeze -> shatter
  "ice-beam": "ice",
  // Spinning razor pixel leaves & emerald wind slashes
  "razor-leaf": "leaf", "leaf-storm": "leaf", "energy-ball": "leaf", "venu-frenzy": "leaf",
  "grassy-glide": "leaf", "wood-hammer": "leaf",
  // Warping violet psychic rings & spectral orb detonation
  psychic: "psychic", psystrike: "psychic", "m2-strike": "psychic", "shadow-ball": "psychic",
  "geng-shadow": "psychic", "shadow-sneak": "psychic", "dragon-pulse": "psychic", "luca-aura": "psychic",
  // Cracking ground fissure + erupting pixel boulders + stage shake
  earthquake: "quake", "body-slam": "quake", "giga-impact": "quake", "snor-giga": "quake",
  "volt-tackle": "quake", "rai-volt": "quake", "spark-strike": "quake", "zen-headbutt": "quake",
  // Twin curved pixel katana/claw X-slash + iconic GBA Hit-Star
  "leaf-blade": "slash", "psycho-cut": "slash", "close-combat": "slash", "iron-tail": "slash",
  "air-slash": "slash", "quick-attack": "slash", "quick-slash": "slash", "extreme-spd": "slash",
  "ray-ascent": "slash",
};

const FX_META = {
  thunder: { gif: "b-thunder", w: 108, h: 146, anchor: "target-sky", dim: 0.36, flash: "#fef08a", shake: 7 },
  fire:    { gif: "b-fire",    w: 118, h: 118, anchor: "target",     dim: 0.28, flash: "#fb923c", shake: 5 },
  water:   { gif: "b-water",   w: 126, h: 112, anchor: "target",     dim: 0.24, flash: "#38bdf8", shake: 5 },
  leaf:    { gif: "b-leaf",    w: 118, h: 118, anchor: "target",     dim: 0.20, flash: "#86efac", shake: 4 },
  ice:     { gif: "b-ice",     w: 118, h: 118, anchor: "target",     dim: 0.32, flash: "#bae6fd", shake: 6 },
  slash:   { gif: "b-slash",   w: 118, h: 118, anchor: "target",     dim: 0.14, flash: "#ffffff", shake: 6 },
  quake:   { gif: "b-quake",   w: 134, h: 106, anchor: "target-low", dim: 0.22, flash: "#fde68a", shake: 11 },
  psychic: { gif: "b-psychic", w: 120, h: 120, anchor: "target",     dim: 0.38, flash: "#e879f9", shake: 6 },
  beam:    { gif: "b-beam",    w: 196, h: 130, anchor: "diagonal",   dim: 0.38, flash: "#fde047", shake: 8 },
  heal:    { gif: "b-heal",    w: 110, h: 118, anchor: "self",       dim: 0.14, flash: "#bbf7d0", shake: 0 },
  buff:    { gif: "b-buff",    w: 110, h: 118, anchor: "self",       dim: 0.16, flash: "#fef08a", shake: 0 },
  guard:   { gif: "b-protect", w: 116, h: 116, anchor: "self",       dim: 0.14, flash: "#bae6fd", shake: 0 },
};

function battleFxForMove(move, isP1) {
  let key = move.kind;
  if (!key) {
    key = MOVE_FX_SPEC[move.id] ?? (
      move.elem === "electric" ? "thunder"
      : move.elem === "fire" ? "fire"
      : move.elem === "water" ? "water"
      : move.elem === "grass" ? "leaf"
      : move.elem === "psychic" ? "psychic"
      : "slash"
    );
  }
  const spec = FX_META[key] ?? FX_META.slash;
  const gif = key === "beam" ? (isP1 ? "b-beam-p1" : "b-beam-cpu") : spec.gif;
  return { key, ...spec, gif };
}

function makeFighter(info, term, cachedSprites) {
  const est = estimateTokensFromActivity(term, info.slot);
  const lv = levelInfo(info.dexId, info.slot).level;
  const cached = cachedSprites?.[spriteCacheKey(info.dexId, Boolean(info.shiny))]
    ?? cachedSprites?.[spriteCacheKey(info.dexId, false)]
    ?? null;
  return {
    addr: info.addr,
    slot: info.slot,
    dexId: info.dexId,
    shiny: Boolean(info.shiny),
    tag: info.tag || nameOf(info.dexId),
    name: nameOf(info.dexId),
    elem: elementOf(info.dexId),
    level: lv,
    hp: MAX_HP,
    maxHp: MAX_HP,
    atkBoost: 0,
    guarding: false,
    tokens: est.tokens,
    turns: est.turns,
    tokenSource: est.source,
    tokenMult: tokenDamageMult(est.tokens),
    // Fixed 4 moves persisted per slot (re-rolled only when Pokemon species changes!)
    moves: movesForSlot(info.slot, info.dexId),
    lungeX: 0,
    lungeY: 0,
    flash: false,
    fainted: false,
    backSprite: null,
    frontSprite: null,
    fallbackSprite: cached,
  };
}

export default class EmbeddedBattle {
  constructor(opts, cx) {
    this.onClose = opts.onClose ?? (() => {});
    this.biomeId = opts.biomeId ?? "meadow";
    this.handle = cx.focus_handle();
    this.handle.focus();
    this.autoMode = false;
    this.selMove = 0; // Keyboard-selected move index (0..3 in 2x2 GBA grid)
    this.turn = 1;
    this.phase = "intro"; // "intro" -> "choose" -> "animating" -> "victory"
    this.introSlide = false;
    this.winner = null; // "p1" | "cpu"
    this.logText = "";
    this.activeFx = null;   // { id, gif, w, h, anchor, isP1 } authentic GBA pixel-art animated GIF!
    this.stageDim = 0;      // GBA dramatic background dim veil behind pixel FX!
    this.stageFlash = null; // { color, opacity } brief impact flash!
    this.stageShake = 0;    // px horizontal shake for heavy hits & Earthquake!
    this.popups = [];
    this.seq = 1;
    this.closed = false;

    const termMap = new Map(terminals().map((t) => [t.address, t]));
    this.p1 = makeFighter(opts.p1, termMap.get(opts.p1.addr), opts.sprites);
    this.cpu = makeFighter(opts.cpu, termMap.get(opts.cpu.addr), opts.sprites);
    this.logText = tr(
      `野生的 ${this.cpu.name} 出现了！就决定是你了，${this.p1.name}！`,
      `Wild ${this.cpu.name} appeared! Go, ${this.p1.name}!`,
      `野生の ${this.cpu.name} が現れた！ゆけっ ${this.p1.name}！`,
      `야생 ${this.cpu.name}가 나타났다! 가라, ${this.p1.name}!`,
    );

    if (checking()) return;

    cx.timer.after(30, (cx) => {
      if (this.closed) return;
      this.introSlide = true;
      cx.notify();
    });
    cx.timer.after(1550, (cx) => {
      if (this.closed || this.phase !== "intro") return;
      this.enterChoosePhase(cx);
    });

    // Load official front/back GBA-NDS battle sprites, real session tokens, and cries on demand!
    const crySet = crySetOf(shared(CRY_KEY));
    this.loadBattleSprites(cx);
    for (const [idx, fighter] of [[0, this.p1], [1, this.cpu]]) {
      const term = termMap.get(fighter.addr);
      cx.spawn(async (cx) => {
        const measured = await measureAgentTokens(term, fighter.slot).catch(() => null);
        if (measured && !this.closed) {
          fighter.tokens = measured.tokens;
          fighter.turns = measured.turns;
          fighter.tokenSource = measured.source;
          fighter.tokenMult = tokenDamageMult(measured.tokens);
          cx.notify();
        }
      });
      cx.spawn(async () => {
        const cry = await ensureCry(fighter.dexId, crySet).catch(() => null);
        if (cry && !this.closed) {
          if (idx === 0) playSound(cry);
          else cx.timer.after(300, () => { if (!this.closed) playSound(cry); });
        }
      });
    }
  }

  loadBattleSprites(cx) {
    // Player (p1) needs BACK sprite; Opponent (cpu) needs FRONT sprite!
    const p1 = this.p1;
    const cpu = this.cpu;
    if (!p1.backSprite) {
      cx.spawn(async (cx) => {
        const p = await ensureBattleSprite(p1.dexId, "back", { shiny: p1.shiny }).catch(() => null);
        if (p && !this.closed) { p1.backSprite = p; cx.notify(); }
      });
    }
    if (!cpu.frontSprite) {
      cx.spawn(async (cx) => {
        const p = await ensureBattleSprite(cpu.dexId, "front", { shiny: cpu.shiny }).catch(() => null);
        if (p && !this.closed) { cpu.frontSprite = p; cx.notify(); }
      });
    }
  }

  close(cx) {
    if (this.closed) return;
    this.closed = true;
    this.onClose(cx);
  }

  enterChoosePhase(cx) {
    if (this.closed) return;
    this.phase = "choose";
    this.logText = tr(
      `你要让 ${this.p1.name} 做什么？`,
      `What will ${this.p1.name} do?`,
      `${this.p1.name} は どうする？`,
      `${this.p1.name}는 무엇을 할까?`,
    );
    cx.notify();
    if (this.autoMode) {
      cx.timer.after(460, (cx) => {
        if (!this.closed && this.phase === "choose" && this.autoMode) {
          this.onPickMove(this.pickAiMoveIndex(this.p1, this.cpu), cx);
        }
      });
    }
  }

  swapSides(cx) {
    if (this.phase === "animating") return;
    const tmp = this.p1;
    this.p1 = this.cpu;
    this.cpu = tmp;
    this.p1.lungeX = 0; this.p1.lungeY = 0;
    this.cpu.lungeX = 0; this.cpu.lungeY = 0;
    this.loadBattleSprites(cx);
    if (this.phase === "choose") {
      this.logText = `已切换操控！你要让 ${this.p1.name} 做什么？`;
    }
    cx.notify();
  }

  rematch(swapFirst, cx) {
    if (swapFirst) {
      const tmp = this.p1;
      this.p1 = this.cpu;
      this.cpu = tmp;
    }
    for (const f of [this.p1, this.cpu]) {
      f.hp = f.maxHp;
      f.atkBoost = 0;
      f.guarding = false;
      f.lungeX = 0;
      f.lungeY = 0;
      f.flash = false;
      f.fainted = false;
      // Keep each Pokemon's fixed 4 moves; simply restore full PP for the new match!
      for (const m of f.moves) m.curPp = m.maxPp;
    }
    this.turn = 1;
    this.winner = null;
    this.fxList = [];
    this.popups = [];
    this.phase = "intro";
    this.introSlide = false;
    this.logText = `再战一局！就决定是你了，${this.p1.name}！`;
    this.loadBattleSprites(cx);
    cx.notify();
    cx.timer.after(30, (cx) => { if (!this.closed) { this.introSlide = true; cx.notify(); } });
    cx.timer.after(1350, (cx) => { if (!this.closed && this.phase === "intro") this.enterChoosePhase(cx); });
  }

  pickAiMoveIndex(atk, def) {
    const usable = atk.moves.map((m, i) => ({ m, i })).filter(({ m }) => m.curPp > 0);
    if (!usable.length) return 0;
    if (atk.hp < atk.maxHp * 0.40) {
      const heal = usable.find(({ m }) => m.kind === "heal");
      if (heal && Math.random() < 0.72) return heal.i;
    }
    if (atk.atkBoost === 0 && this.turn <= 2) {
      const buff = usable.find(({ m }) => m.kind === "buff");
      if (buff && Math.random() < 0.45) return buff.i;
    }
    const attacks = usable.filter(({ m }) => !m.kind);
    if (attacks.length) {
      let best = attacks[0];
      let bestScore = -1;
      for (const item of attacks) {
        const eff = effectiveness(item.m.elem, def.elem);
        const score = (item.m.power || 60) * eff * (0.8 + Math.random() * 0.4);
        if (score > bestScore) { bestScore = score; best = item; }
      }
      return best.i;
    }
    return usable[Math.floor(Math.random() * usable.length)].i;
  }

  addPopup(side, text, color) {
    const id = `bpop-${this.seq++}`;
    this.popups.push({ id, side, text, color });
    if (this.popups.length > 4) this.popups.shift();
  }

  executeAction(atkSide, moveIdx, cx, onDone) {
    if (this.closed) return;
    const isP1 = atkSide === "p1";
    const atk = isP1 ? this.p1 : this.cpu;
    const def = isP1 ? this.cpu : this.p1;
    const move = atk.moves[moveIdx] ?? atk.moves[0];
    if (move.curPp > 0) move.curPp -= 1;

    atk.guarding = false;
    this.activeFx = null;
    this.stageDim = 0;
    this.stageFlash = null;
    this.stageShake = 0;

    const fx = battleFxForMove(move, isP1);
    const mName = moveName(move);
    const whoZh = isP1 ? "我方 " : "对手 ";
    const whoEn = isP1 ? "" : "Foe ";

    if (move.kind === "heal" || move.kind === "buff" || move.kind === "guard") {
      this.activeFx = { id: `bfx-${this.seq++}`, ...fx, isP1 };
      this.stageDim = fx.dim;
      if (move.kind === "heal") {
        const amt = Math.round(atk.maxHp * 0.36);
        atk.hp = Math.min(atk.maxHp, atk.hp + amt);
        atk.lungeY = -8;
        this.addPopup(atkSide, tr(`回复 +${amt}`, `+${amt} HP`, `回復 +${amt}`, `회복 +${amt}`), "#16a34a");
        this.logText = tr(
          `${whoZh}${atk.name} 使出了【${mName}】，体力回复了！`,
          `${whoEn}${atk.name} used ${mName} and restored HP!`,
          `${atk.name} の ${mName}！ HP が回復した！`,
          `${atk.name}의 ${mName}! 체력이 회복되었다!`,
        );
      } else if (move.kind === "buff") {
        atk.atkBoost = Math.min(2, atk.atkBoost + 1);
        atk.lungeY = -8;
        this.addPopup(atkSide, tr(`攻击提升 ×${(1 + atk.atkBoost * 0.35).toFixed(2)}`, `ATK UP ×${(1 + atk.atkBoost * 0.35).toFixed(2)}`, `こうげきUP ×${(1 + atk.atkBoost * 0.35).toFixed(2)}`, `공격 UP ×${(1 + atk.atkBoost * 0.35).toFixed(2)}`), "#d97706");
        this.logText = tr(
          `${whoZh}${atk.name} 使出了【${mName}】，攻击大幅提高！`,
          `${whoEn}${atk.name} used ${mName}! Attack rose sharply!`,
          `${atk.name} の ${mName}！ こうげきがぐーんと上がった！`,
          `${atk.name}의 ${mName}! 공격이 크게 올랐다!`,
        );
      } else {
        atk.guarding = true;
        atk.atkBoost = Math.min(2, atk.atkBoost + 0.5);
        atk.lungeY = -5;
        this.addPopup(atkSide, tr("守住！", "PROTECT!", "まもった！", "방어!"), "#2563eb");
        this.logText = tr(
          `${whoZh}${atk.name} 使出了【${mName}】，进入防御姿态！`,
          `${whoEn}${atk.name} protected itself with ${mName}!`,
          `${atk.name} は ${mName} で身を守った！`,
          `${atk.name}는 ${mName}로 몸을 지켰다!`,
        );
      }
      cx.notify();
      cx.timer.after(240, (cx) => {
        if (this.closed) return;
        this.stageFlash = { color: fx.flash, opacity: 0.18 };
        cx.notify();
      });
      cx.timer.after(380, (cx) => {
        if (this.closed) return;
        this.stageFlash = null;
        cx.notify();
      });
      cx.timer.after(800, (cx) => {
        if (this.closed) return;
        atk.lungeY = 0;
        this.activeFx = null;
        this.stageDim = 0;
        this.stageFlash = null;
        this.popups = [];
        onDone(cx);
      });
      return;
    }

    // Beat 0 (0ms): Classic GBA diagonal wind-up lunge + announce move!
    const lungeDist = fx.key === "slash" ? 42 : fx.key === "quake" ? 32 : 22;
    atk.lungeX = isP1 ? lungeDist : -lungeDist;
    atk.lungeY = isP1 ? -Math.round(lungeDist * 0.45) : Math.round(lungeDist * 0.45);

    const acc = move.acc ?? 100;
    const missed = Math.random() * 100 > acc;

    if (missed) {
      this.addPopup(isP1 ? "cpu" : "p1", tr("未命中！", "MISS!", "はずれた！", "빗나갔다!"), "#64748b");
      this.logText = tr(
        `${whoZh}${atk.name} 使出了【${mName}】，但没有命中！`,
        `${whoEn}${atk.name} used ${mName}, but it missed!`,
        `${atk.name} の ${mName}！ しかし外れた！`,
        `${atk.name}의 ${mName}! 하지만 빗나갔다!`,
      );
      cx.notify();
      cx.timer.after(780, (cx) => {
        if (this.closed) return;
        atk.lungeX = 0; atk.lungeY = 0;
        this.popups = [];
        onDone(cx);
      });
      return;
    }

    // Pre-compute damage so HP bar, 3-blink hurt flicker & popup fire RIGHT on impact peak!
    const eff = effectiveness(move.elem, def.elem);
    const critChance = 0.14 + (move.critBoost ?? 0);
    const crit = Math.random() < critChance;
    const boostMult = 1 + atk.atkBoost * 0.35;
    const guardMult = def.guarding ? 0.25 : 1.0;
    const variance = 0.90 + Math.random() * 0.18;
    const rawDmg = (move.power * 0.36) * atk.tokenMult * boostMult * eff * (crit ? 1.45 : 1.0) * guardMult * variance;
    const dmg = Math.max(6, Math.round(rawDmg));
    const rec = move.recoil ? Math.max(4, Math.round(dmg * move.recoil)) : 0;

    this.logText = tr(
      `${whoZh}${atk.name} 使出了【${mName}】！`,
      `${whoEn}${atk.name} used ${mName}!`,
      `${atk.name} の ${mName}！`,
      `${atk.name}의 ${mName}!`,
    );
    cx.notify();

    // Beat 1 (95ms): Mount animated GBA pixel-art FX GIF + dramatic backdrop dim veil!
    cx.timer.after(95, (cx) => {
      if (this.closed) return;
      this.activeFx = { id: `bfx-${this.seq++}`, ...fx, isP1 };
      this.stageDim = fx.dim;
      cx.notify();
    });

    // Beat 2 (260ms): IMPACT PEAK! Apply damage, flash, stage shake, and start GBA 3-blink hurt flicker!
    cx.timer.after(260, (cx) => {
      if (this.closed) return;
      atk.lungeX = 0; atk.lungeY = 0;
      def.hp = Math.max(0, def.hp - dmg);
      if (rec) atk.hp = Math.max(1, atk.hp - rec);
      def.flash = true;
      def.lungeX = isP1 ? 10 : -10;
      this.stageFlash = { color: fx.flash, opacity: 0.28 };
      if (fx.shake) this.stageShake = isP1 ? fx.shake : -fx.shake;

      const defSide = isP1 ? "cpu" : "p1";
      const popTag = def.guarding
        ? tr(`挡下 -${dmg}`, `GUARD -${dmg}`, `ガード -${dmg}`, `방어 -${dmg}`)
        : crit
          ? tr(`要害 -${dmg}`, `CRIT -${dmg}`, `きゅうしょ -${dmg}`, `급소 -${dmg}`)
          : eff > 1.1
            ? tr(`绝佳 -${dmg}`, `SUPER -${dmg}`, `ばつぐん -${dmg}`, `효과 굉장 -${dmg}`)
            : `-${dmg}`;
      const popCol = def.guarding ? "#2563eb" : crit ? "#dc2626" : eff > 1.1 ? "#ea580c" : ELEMENT_COLORS[move.elem];
      this.addPopup(defSide, popTag, popCol);

      const recoilTxt = rec ? tr(`（反伤 -${rec}）`, ` (Recoil -${rec})`, `（反動 -${rec}）`, ` (반동 -${rec})`) : "";
      const effTxt = eff > 1.1
        ? tr(" 效果绝佳！", " Super effective!", " 効果はばつぐんだ！", " 효과가 굉장했다!")
        : eff < 0.9
          ? tr(" 效果微弱…", " Not very effective...", " 効果はいまひとつ…", " 효과가 별로인 듯하다…")
          : "";
      const critTxt = crit ? tr(" 击中要害！", " Critical hit!", " 急所に当たった！", " 급소에 맞았다!") : "";
      this.logText = tr(
        `${whoZh}${atk.name} 使出了【${mName}】！造成 ${dmg} 伤害${critTxt}${effTxt}${recoilTxt}`,
        `${whoEn}${atk.name} used ${mName}! -${dmg} HP.${critTxt}${effTxt}${recoilTxt}`,
        `${atk.name} の ${mName}！ ${dmg} ダメージ！${critTxt}${effTxt}${recoilTxt}`,
        `${atk.name}의 ${mName}! ${dmg} 대미지!${critTxt}${effTxt}${recoilTxt}`,
      );
      cx.notify();
    });

    // Classic GBA 3-blink hurt flicker + counter-shake!
    cx.timer.after(340, (cx) => {
      if (this.closed) return;
      def.flash = false;
      this.stageFlash = null;
      if (this.stageShake) this.stageShake = -this.stageShake;
      cx.notify();
    });
    cx.timer.after(420, (cx) => {
      if (this.closed) return;
      def.flash = true;
      this.stageShake = 0;
      cx.notify();
    });
    cx.timer.after(500, (cx) => {
      if (this.closed) return;
      def.flash = false;
      def.lungeX = 0;
      cx.notify();
    });
    cx.timer.after(580, (cx) => {
      if (this.closed) return;
      def.flash = true;
      cx.notify();
    });
    cx.timer.after(660, (cx) => {
      if (this.closed) return;
      def.flash = false;
      cx.notify();
    });

    // Beat 3 (920ms): Clear animated pixel FX & advance turn!
    cx.timer.after(920, (cx) => {
      if (this.closed) return;
      atk.lungeX = 0; atk.lungeY = 0;
      def.flash = false; def.lungeX = 0;
      this.activeFx = null;
      this.stageDim = 0;
      this.stageFlash = null;
      this.stageShake = 0;
      this.popups = [];
      if (def.hp <= 0) {
        def.fainted = true;
        this.finishBattle(atkSide, cx);
      } else {
        onDone(cx);
      }
    });
  }

  finishBattle(winSide, cx) {
    this.phase = "victory";
    this.winner = winSide;
    const winF = winSide === "p1" ? this.p1 : this.cpu;
    const loseF = winSide === "p1" ? this.cpu : this.p1;
    this.logText = winSide === "p1"
      ? tr(`对手 ${loseF.name} 倒下了！我方 ${winF.name} 获胜！（经验 +45 / +20）`, `Foe ${loseF.name} fainted! ${winF.name} won! (+45 / +20 XP)`, `相手の ${loseF.name} はたおれた！ ${winF.name} の勝ち！（経験値 +45 / +20）`, `상대 ${loseF.name}가 쓰러졌다! ${winF.name} 승리! (경험치 +45 / +20)`)
      : tr(`我方 ${loseF.name} 倒下了！对手 ${winF.name} 获胜！（经验 +45 / +20）`, `${loseF.name} fainted! Foe ${winF.name} won! (+45 / +20 XP)`, `${loseF.name} はたおれた！ 相手の ${winF.name} の勝ち！（経験値 +45 / +20）`, `${loseF.name}가 쓰러졌다! 상대 ${winF.name} 승리! (경험치 +45 / +20)`);

    try {
      const updates = {};
      for (const [f, amt] of [[winF, 45], [loseF, 20]]) {
        if (!f.slot) continue;
        const cur = slotXpOf(f.slot);
        updates[f.slot] = { xp: cur.xp + amt, total: cur.total + amt, turns: cur.turns };
      }
      if (Object.keys(updates).length) saveXpBatch(updates);
    } catch {}

    cx.notify();
  }

  onPickMove(moveIdx, cx) {
    if (this.phase !== "choose" || this.closed) return;
    const p1Move = this.p1.moves[moveIdx];
    if (!p1Move || p1Move.curPp <= 0) return;

    this.phase = "animating";
    const cpuIdx = this.pickAiMoveIndex(this.cpu, this.p1);
    const cpuMove = this.cpu.moves[cpuIdx];

    const p1Prio = p1Move.kind === "guard" ? 2 : (p1Move.priority ?? 0);
    const cpuPrio = cpuMove.kind === "guard" ? 2 : (cpuMove.priority ?? 0);
    const p1First = p1Prio !== cpuPrio
      ? p1Prio > cpuPrio
      : (this.p1.level + (this.p1.tokens > this.cpu.tokens ? 3 : 0) + Math.random() * 6) >= (this.cpu.level + 3);

    const first = p1First ? ["p1", moveIdx] : ["cpu", cpuIdx];
    const second = p1First ? ["cpu", cpuIdx] : ["p1", moveIdx];

    this.executeAction(first[0], first[1], cx, (cx) => {
      if (this.closed || this.phase === "victory") return;
      this.executeAction(second[0], second[1], cx, (cx) => {
        if (this.closed || this.phase === "victory") return;
        this.p1.guarding = false;
        this.cpu.guarding = false;
        this.turn += 1;
        this.enterChoosePhase(cx);
      });
    });
  }

  battleSpritePath(f, isP1) {
    if (isP1) {
      return f.backSprite
        ?? f.fallbackSprite?.walkU?.path
        ?? f.fallbackSprite?.idleR?.path
        ?? (hasMenuIcon(f.dexId) ? menuIconPath(f.dexId) : null);
    }
    return f.frontSprite
      ?? f.fallbackSprite?.idleD?.path
      ?? f.fallbackSprite?.walkD?.path
      ?? (hasMenuIcon(f.dexId) ? menuIconPath(f.dexId) : null);
  }

  portraitEl(f, size = 64) {
    const port = portraitFor(f.dexId, "working", f.shiny);
    if (port?.path) return image(port.path).size(size);
    if (hasMenuIcon(f.dexId)) return image(menuIconPath(f.dexId)).w(size).h(Math.round(size * 0.75));
    return div().text_size(13).font_bold().text_color("#ffffff").child(f.name.slice(0, 2));
  }

  // Sleek Compact Centered VS Showdown Card over Frosted Dimmed Current Habitat Backdrop!
  renderIntro(cx, width, height) {
    const slide = this.introSlide;
    const mapBox = computeMapBox(width, height);
    const panelW = Math.min(width - 24, 444);
    const panelH = Math.min(height - 18, 176);
    const portSz = Math.max(70, Math.min(86, panelH - 82));
    const cardW = portSz + 18;
    const leftTarget = 28;
    const rightTarget = panelW - cardW - 28;
    const cardTop = Math.max(12, Math.round((panelH - (portSz + 40)) / 2) - 4);

    const kofPortraitCard = (id, f, isP1, targetLeft, startLeft) =>
      v_flex()
        .id(id)
        .absolute()
        .left(slide ? targetLeft : startLeft)
        .top(cardTop)
        .w(cardW)
        .items_center()
        .gap(5)
        .transition("left", { duration: 320, easing: "ease-out" })
        .child(
          div()
            .relative()
            .size(portSz + 8)
            .p(3)
            .rounded(10)
            .bg(isP1 ? "#1e3a8a" : "#7f1d1d")
            .border(2)
            .border_color(isP1 ? "#60a5fa" : "#f87171")
            .shadow_md()
            .child(
              h_flex()
                .size_full()
                .rounded(7)
                .bg("#0f172a")
                .items_center()
                .justify_center()
                .overflow_hidden()
                .child(this.portraitEl(f, portSz)),
            )
            .child(
              div()
                .absolute()
                .top(-7)
                .when(isP1, (el) => el.left(-6).bg("#2563eb").border_color("#93c5fd"))
                .when(!isP1, (el) => el.right(-6).bg("#dc2626").border_color("#fca5a5"))
                .px(6)
                .py(1)
                .rounded(4)
                .border_1()
                .text_size(9)
                .font_bold()
                .text_color("#ffffff")
                .child(isP1 ? tr("我方", "YOU", "自分", "아군") : tr("对手", "FOE", "相手", "상대")),
            ),
        )
        .child(
          h_flex()
            .px(7)
            .py(1.5)
            .gap(5)
            .items_center()
            .rounded_full()
            .bg("#090d16ee")
            .border_1()
            .border_color(isP1 ? "#3b82f688" : "#ef444488")
            .child(div().text_size(10.5).font_bold().text_color("#ffffff").child(`${f.name}${f.shiny ? "✨" : ""}`))
            .child(div().text_size(9.5).font_bold().text_color("#facc15").child(`×${f.tokenMult.toFixed(2)}`)),
        );

    return h_flex()
      .id("battle-intro-inline")
      .relative()
      .size_full()
      .items_center()
      .justify_center()
      .bg("#0b101d")
      .overflow_hidden()
      .cursor_pointer()
      .on_click((_e, cx) => this.enterChoosePhase(cx))
      // Current living habitat map softened behind a cinematic frosted dark scrim!
      .child(
        image(mapAsset(this.biomeId))
          .absolute()
          .left(mapBox.left)
          .top(mapBox.top)
          .w(mapBox.drawW)
          .h(mapBox.drawH)
          .opacity(0.42),
      )
      .child(div().absolute().inset_0().bg("#0b101d").opacity(0.54))
      // Sleek Compact Centered VS Showdown Card (never stretched across ultrawide screens!)
      .child(
        div()
          .relative()
          .w(panelW)
          .h(panelH)
          .rounded(14)
          .overflow_hidden()
          .bg("#0f172ae6")
          .border(1.5)
          .border_color("#475569aa")
          .shadow_lg()
          // Subtle blue/red aura split contained strictly inside the compact card
          .child(div().absolute().left(0).top(0).w(Math.round(panelW / 2)).h_full().bg("#1d4ed8").opacity(0.14))
          .child(div().absolute().right(0).top(0).w(Math.round(panelW / 2)).h_full().bg("#dc2626").opacity(0.14))
          .child(div().absolute().left(0).top(0).w_full().h(2).bg("#facc1544"))
          .child(kofPortraitCard("intro-p1-band", this.p1, true, leftTarget, leftTarget - 96))
          .child(kofPortraitCard("intro-cpu-band", this.cpu, false, rightTarget, rightTarget + 96))
          .child(
            h_flex()
              .absolute()
              .inset_0()
              .pb(12)
              .items_center()
              .justify_center()
              .child(
                div()
                  .w(108)
                  .h(86)
                  .loop("opacity", { from: 0.88, to: 1.0, period: 320 })
                  .child(image(iconAsset("vs-emblem")).w(108).h(86)),
              ),
          )
          .child(
            h_flex().absolute().left(0).bottom(7).w_full().justify_center()
              .child(
                div().text_size(9.5).text_color("#94a3b8").child(
                  tr("点击或按空格跳过", "Click or press Space to skip", "クリック / Space でスキップ", "클릭 또는 Space로 건너뛰기"),
                ),
              ),
          ),
      );
  }

  // Authentic GBA FireRed / Emerald Cream-Parchment HP Plate!
  renderGbaPlate(f, isP1) {
    const pct = clamp(f.hp / Math.max(1, f.maxHp), 0, 1);
    const hpCol = pct > 0.5 ? "#38c860" : pct > 0.22 ? "#f4b828" : "#e84838";
    const srcNames = isZh()
      ? {
          "claude-log": "来自 Claude 会话用量",
          "codex-log":  "来自 Codex 会话用量",
          "pi-log":     "来自 Pi 会话用量",
          "agy-log":    "来自 Antigravity 会话用量",
        }
      : {
          "claude-log": "Claude session tokens",
          "codex-log":  "Codex session tokens",
          "pi-log":     "Pi session tokens",
          "agy-log":    "Antigravity session tokens",
        };
    const srcHint = srcNames[f.tokenSource] ?? tr(`按 ${f.turns} 轮对话与经验估算`, `Estimated from ${f.turns} turns & XP`);
    const barTrackW = 112;

    return v_flex()
      .w(208)
      .rounded(8)
      .bg("#2c423a")
      .p(2)
      .shadow_md()
      .child(
        v_flex()
          .w_full()
          .px(8)
          .pt(4)
          .pb(isP1 ? 3 : 5)
          .gap(3)
          .rounded(6)
          .bg("#f8f8e8")
          .border_b(2)
          .border_color("#d2d2b8")
          // Row 1: Name + Role Tag + Level
          .child(
            h_flex().items_center().justify_between().gap(4)
              .child(
                h_flex().gap(4).items_center().min_w(0)
                  .child(
                    div().px(4).py(0.5).rounded(3).flex_none()
                      .bg(isP1 ? "#2563eb" : "#dc2626")
                      .text_size(8.2).font_bold().text_color("#ffffff")
                      .child(isP1 ? tr("我方", "YOU", "自分", "아군") : tr("对手", "FOE", "相手", "상대")),
                  )
                  .child(div().text_size(11).font_bold().text_color("#26342e").truncate().child(`${f.name}${f.shiny ? "✨" : ""}`)),
              )
              .child(div().flex_none().text_size(9.5).font_bold().text_color("#465850").child(tr(`${f.level}级`, `Lv.${f.level}`, `Lv.${f.level}`, `Lv.${f.level}`))),
          )
          // Row 2: Authentic GBA dark capsule HP bar!
          .child(
            h_flex().items_center().justify_end().gap(4)
              .child(
                h_flex()
                  .h(10)
                  .pl(5)
                  .pr(2)
                  .gap(4)
                  .items_center()
                  .rounded_full()
                  .bg("#384840")
                  .child(div().text_size(7.8).font_bold().text_color("#facc15").child("HP"))
                  .child(
                    div().w(barTrackW).h(6).p(1).rounded_full().bg("#1f2b26")
                      .child(
                        div()
                          .id(`hp-${isP1 ? "p1" : "cpu"}`)
                          .w(Math.max(0, Math.round((barTrackW - 2) * pct)))
                          .h(4)
                          .rounded_full()
                          .bg(hpCol)
                          .transition("width", { duration: 340, easing: "ease-out" }),
                      ),
                  ),
              ),
          )
          // Row 3: Token Power + Numeric HP (classic GBA shows exact numeric HP on Player plate!)
          .child(
            h_flex().items_center().justify_between()
              .child(
                h_flex().gap(4).items_center()
                  .child(
                    div()
                      .tooltip(tr(`${srcHint} · 消耗越多伤害越高`, `${srcHint} · Higher usage boosts damage`))
                      .text_size(8.8)
                      .font_semibold()
                      .text_color("#b45309")
                      .child(tr(`消耗 ${formatTokens(f.tokens)} · ×${f.tokenMult.toFixed(2)}`, `${formatTokens(f.tokens)} tok · ×${f.tokenMult.toFixed(2)}`)),
                  )
                  .when(f.atkBoost > 0, (el) =>
                    el.child(div().px(3.5).rounded(3).bg("#fef08a").text_size(8).font_bold().text_color("#a16207").child(tr(`攻+${Math.round(f.atkBoost * 35)}%`, `ATK+${Math.round(f.atkBoost * 35)}%`))),
                  ),
              )
              .when(isP1, (el) =>
                el.child(div().text_size(9.5).font_bold().text_color("#26342e").child(`${f.hp}/${f.maxHp}`)),
              ),
          )
          // Classic GBA cyan EXP trim stripe on bottom of Player plate
          .when(isP1, (el) =>
            el.child(
              div().w_full().h(2.5).mt(1).rounded_full().bg("#cbd5e1")
                .child(div().w(96).h(2.5).rounded_full().bg("#38bdf8")),
            ),
          ),
      );
  }

  // Authentic GBA Cream RPG Move Cell with keyboard/mouse ▶ cursor!
  renderGbaMoveBtn(move, idx) {
    const disabled = this.phase !== "choose" || move.curPp <= 0;
    const selected = !disabled && this.selMove === idx;
    const elemCol = ELEMENT_COLORS[move.elem] ?? "#64748b";
    const eff = !move.kind ? effectiveness(move.elem, this.cpu.elem) : 1.0;
    const effLabel = !move.kind
      ? (eff > 1.1 ? tr("克制", "Super") : eff < 0.9 ? tr("微弱", "Resist") : null)
      : null;
    const statLabel = move.kind === "heal"
      ? tr("回复36%", "Heal 36%")
      : move.kind === "buff"
        ? tr("攻击+35%", "ATK +35%")
        : move.kind === "guard"
          ? tr("减伤75%", "Guard 75%")
          : tr(`威力${move.power}${move.priority ? "·先制" : ""}`, `Pow ${move.power}${move.priority ? " · Fast" : ""}`);

    return v_flex()
      .id(`bmove-${idx}`)
      .flex_1()
      .h(48)
      .px(8)
      .py(4)
      .justify_between()
      .rounded(6)
      .border(selected ? 2 : 1.5)
      .border_color(disabled ? "#d4d4bc" : selected ? elemCol : "#a8b2a2")
      .bg(disabled ? "#ececd8" : selected ? "#ffffff" : "#f8f8e8")
      .opacity(disabled ? 0.55 : 1)
      .tooltip(isZh() ? `${move.name} · ${move.desc}` : `${moveName(move)} · ${statLabel}`)
      .on_hover((on, cx) => {
        if (on && !disabled && this.selMove !== idx) {
          this.selMove = idx;
          cx.notify();
        }
      })
      .when(!disabled, (el) =>
        el.cursor_pointer().on_click((_e, cx) => {
          this.selMove = idx;
          this.onPickMove(idx, cx);
        }),
      )
      .child(
        h_flex().items_center().justify_between().gap(4)
          .child(
            h_flex().gap(4).items_center().min_w(0)
              .child(
                div().w(10).text_size(10).font_bold().text_color(selected ? "#dc2626" : "#94a3b8")
                  .child(selected ? "▶" : String(idx + 1)),
              )
              .child(div().text_size(11.5).font_bold().text_color("#26342e").truncate().child(moveName(move))),
          )
          .child(
            div().px(4.5).py(0.5).rounded(3).bg(elemCol).text_size(8.5).font_bold().text_color("#ffffff")
              .child(elemLabel(move.elem)),
          ),
      )
      .child(
        h_flex().items_center().justify_between().gap(4)
          .child(
            h_flex().gap(5).items_center()
              .child(div().text_size(9.5).font_medium().text_color("#54645c").child(statLabel))
              .when(Boolean(effLabel), (el) =>
                el.child(div().text_size(9.5).font_bold().text_color(eff > 1.1 ? "#dc2626" : "#94a3b8").child(effLabel)),
              ),
          )
          .child(div().text_size(9).font_bold().text_color(move.curPp <= 1 ? "#dc2626" : "#64746c").child(`${move.curPp}/${move.maxPp}`)),
      );
  }

  render(cx, width = 1040, height = 220) {
    // Keep GBA battle centered & crisply proportioned on ultrawide monitors (max 920px)!
    const frameW = Math.min(width, 920);
    const deckW = Math.min(392, Math.max(324, Math.round(frameW * 0.43)));
    const stageW = Math.max(320, frameW - deckW);

    return div()
      .id("poke-battle-inline")
      .track_focus(this.handle)
      .relative()
      .size_full()
      .overflow_hidden()
      .border_t(1)
      .border_color("#26342e")
      .bg("#162228")
      .on_key_down((e, cx) => {
        const k = (e.key || "").toLowerCase();
        if (k === "escape") { this.close(cx); cx.stop_propagation(); return; }
        if (this.phase === "intro" && (k === "space" || k === "enter")) {
          this.enterChoosePhase(cx);
          cx.stop_propagation();
          return;
        }
        if (this.phase === "victory" && (k === "enter" || k === "space")) {
          this.close(cx);
          cx.stop_propagation();
          return;
        }
        if (this.phase === "choose") {
          const numIdx = ["1", "2", "3", "4"].indexOf(k);
          if (numIdx >= 0) {
            this.selMove = numIdx;
            this.onPickMove(numIdx, cx);
            cx.stop_propagation();
            return;
          }
          // Full GBA D-Pad keyboard navigation (Arrow keys or WASD + Enter/Space to fire!)
          let next = this.selMove;
          if (k === "left" || k === "a") next = this.selMove % 2 === 1 ? this.selMove - 1 : this.selMove + 1;
          else if (k === "right" || k === "d") next = this.selMove % 2 === 0 ? this.selMove + 1 : this.selMove - 1;
          else if (k === "up" || k === "w") next = this.selMove >= 2 ? this.selMove - 2 : this.selMove + 2;
          else if (k === "down" || k === "s") next = this.selMove < 2 ? this.selMove + 2 : this.selMove - 2;
          else if (k === "enter" || k === "space") {
            this.onPickMove(this.selMove, cx);
            cx.stop_propagation();
            return;
          }
          if (next !== this.selMove) {
            this.selMove = next;
            cx.notify();
            cx.stop_propagation();
          }
        }
      })
      .when(this.phase === "intro", (el) => el.child(this.renderIntro(cx, width, height)))
      .when(this.phase !== "intro", (el) => {
        const p1Spr = this.battleSpritePath(this.p1, true);
        const cpuSpr = this.battleSpritePath(this.cpu, false);
        // Exact GBA diagonal coordinates matching battle-bg.png turf platforms!
        // Opponent platform: (192/260 = 0.738, 56/110 = 0.509)
        // Player platform:   ( 72/260 = 0.277, 98/110 = 0.891)
        const cpuCenterX = Math.round(stageW * 0.738);
        const cpuFootY = Math.round(height * 0.53);
        const p1CenterX = Math.round(stageW * 0.277);
        const p1FootY = Math.round(height * 0.93);
        const cpuSz = Math.max(66, Math.min(86, Math.round(height * 0.39)));
        const p1Sz = Math.max(76, Math.min(98, Math.round(height * 0.45)));

        const gbaMiniBtn = (id, text, active, tip, onClick) =>
          h_flex()
            .id(id)
            .h(20)
            .px(7)
            .items_center()
            .rounded(4)
            .border_1()
            .border_color(active ? "#facc15" : "#78989c")
            .bg(active ? "#3c686e" : "#1c343a")
            .text_size(9.5)
            .font_bold()
            .text_color(active ? "#fef08a" : "#e2f1f2")
            .cursor_pointer()
            .hover((s) => s.bg("#365c64"))
            .tooltip(tip)
            .on_click(onClick)
            .child(text);

        return el.child(
          h_flex()
            .size_full()
            .justify_center()
            .child(
              h_flex()
                .w(frameW)
                .h_full()
                .border_x(width > frameW + 4 ? 2 : 0)
                .border_color("#2e443c")
                // LEFT: Authentic GBA Diagonal Battle Stage (fills 100% height — ZERO black bars!)
                .child(
                  div()
                    .id("battle-stage-bg")
                    .relative()
                    .w(stageW)
                    .h_full()
                    .flex_none()
                    .overflow_hidden()
                    .bg("#d8f0f8")
                    .child(
                      image(mapAsset("battle-bg"))
                        .absolute()
                        .left(this.stageShake)
                        .top(0)
                        .w(stageW)
                        .h(height)
                        .transition("left", { duration: 80, easing: "linear" }),
                    )
                    // Classic GBA Stage Dimming Veil behind sprites & pixel FX on big moves!
                    .when(this.stageDim > 0, (el) =>
                      el.child(div().absolute().inset_0().bg("#0b1020").opacity(this.stageDim)),
                    )
                    // TOP-RIGHT (斜前方): Opponent FRONT battle sprite!
                    .child(
                      h_flex()
                        .id("stage-cpu")
                        .absolute()
                        .left(cpuCenterX - Math.round(cpuSz / 2) + this.cpu.lungeX + this.stageShake)
                        .top(Math.max(4, cpuFootY - cpuSz + this.cpu.lungeY + (this.cpu.fainted ? 22 : 0)))
                        .size(cpuSz)
                        .items_end()
                        .justify_center()
                        .opacity(this.cpu.fainted ? 0.18 : this.cpu.flash ? 0.22 : 1)
                        .transition("left", { duration: 150, easing: "ease-out" })
                        .transition("top", { duration: 150, easing: "ease-out" })
                        .when(Boolean(cpuSpr), (x) => x.child(image(cpuSpr).w(cpuSz).h(cpuSz))),
                    )
                    // BOTTOM-LEFT: Player BACK battle sprite (over-the-shoulder GBA angle!)
                    .child(
                      h_flex()
                        .id("stage-p1")
                        .absolute()
                        .left(p1CenterX - Math.round(p1Sz / 2) + this.p1.lungeX + this.stageShake)
                        .top(Math.max(24, p1FootY - p1Sz + this.p1.lungeY + (this.p1.fainted ? 24 : 0)))
                        .size(p1Sz)
                        .items_end()
                        .justify_center()
                        .opacity(this.p1.fainted ? 0.18 : this.p1.flash ? 0.22 : 1)
                        .transition("left", { duration: 150, easing: "ease-out" })
                        .transition("top", { duration: 150, easing: "ease-out" })
                        .when(Boolean(p1Spr), (x) => x.child(image(p1Spr).w(p1Sz).h(p1Sz))),
                    )
                    // Classic GBA Diagonal Status Plates: Opponent TOP-LEFT, Player BOTTOM-RIGHT!
                    .child(div().absolute().left(10).top(10).child(this.renderGbaPlate(this.cpu, false)))
                    .child(div().absolute().right(10).bottom(10).child(this.renderGbaPlate(this.p1, true)))
                    // Authentic GBA Pixel-Art Animated Battle FX GIF (Thunder / Fire / Water / Ice / Leaf / Slash / Quake / Psychic / Beam / Heal / Buff / Protect!)
                    .when(Boolean(this.activeFx), (el) => {
                      const f = this.activeFx;
                      const fxScale = clamp(height / 215, 0.72, 1.15);
                      const fw = Math.round(f.w * fxScale);
                      const fh = Math.round(f.h * fxScale);
                      const atkX = f.isP1 ? p1CenterX : cpuCenterX;
                      const atkFoot = f.isP1 ? p1FootY : cpuFootY;
                      const atkSz = f.isP1 ? p1Sz : cpuSz;
                      const defX = f.isP1 ? cpuCenterX : p1CenterX;
                      const defFoot = f.isP1 ? cpuFootY : p1FootY;
                      const defSz = f.isP1 ? cpuSz : p1Sz;
                      let fxLeft, fxTop;
                      if (f.anchor === "diagonal") {
                        fxLeft = Math.round((p1CenterX + cpuCenterX) / 2 - fw / 2);
                        fxTop = Math.round((p1FootY - p1Sz * 0.45 + cpuFootY - cpuSz * 0.45) / 2 - fh / 2);
                      } else if (f.anchor === "self") {
                        fxLeft = Math.round(atkX - fw / 2);
                        fxTop = Math.round(atkFoot - atkSz * 0.52 - fh / 2);
                      } else if (f.anchor === "target-sky") {
                        fxLeft = Math.round(defX - fw / 2);
                        fxTop = Math.round(defFoot - fh * 0.86);
                      } else if (f.anchor === "target-low") {
                        fxLeft = Math.round(defX - fw / 2);
                        fxTop = Math.round(defFoot - fh * 0.74);
                      } else {
                        fxLeft = Math.round(defX - fw / 2);
                        fxTop = Math.round(defFoot - defSz * 0.52 - fh / 2);
                      }
                      return el.child(
                        div()
                          .id(f.id)
                          .absolute()
                          .left(fxLeft + this.stageShake)
                          .top(fxTop)
                          .w(fw)
                          .h(fh)
                          .child(image(fxGifAsset(f.gif)).w(fw).h(fh)),
                      );
                    })
                    // Brief GBA Impact Flash!
                    .when(Boolean(this.stageFlash), (el) =>
                      el.child(div().absolute().inset_0().bg(this.stageFlash.color).opacity(this.stageFlash.opacity)),
                    )
                    // Floating Damage / Status Popups right over target!
                    .children(
                      this.popups.map((pop) =>
                        h_flex()
                          .id(pop.id)
                          .absolute()
                          .left((pop.side === "p1" ? p1CenterX : cpuCenterX) - 62)
                          .top(Math.max(8, (pop.side === "p1" ? p1FootY - p1Sz - 12 : cpuFootY - cpuSz - 4)))
                          .w(124)
                          .justify_center()
                          .child(
                            div()
                              .px(7).py(1.5).rounded(5).bg("#111827e6")
                              .border_1().border_color(pop.color)
                              .text_size(11).font_bold().text_color("#ffffff")
                              .child(pop.text),
                          ),
                      ),
                    ),
                )
                // RIGHT: Authentic GBA FireRed/Emerald Dark-Teal Dialogue + Cream 4-Move Box!
                .child(
                  v_flex()
                    .w(deckW)
                    .h_full()
                    .flex_none()
                    .p(7)
                    .gap(6)
                    .bg("#2c423a")
                    // 1. Classic GBA Double-Bordered Dark-Teal RPG Dialogue Box
                    .child(
                      div()
                        .w_full()
                        .rounded(7)
                        .bg("#c8a048")
                        .p(2)
                        .child(
                          v_flex()
                            .w_full()
                            .px(9)
                            .py(5)
                            .gap(4)
                            .rounded(5)
                            .bg("#284850")
                            .border(1.5)
                            .border_color("#f8f8e8")
                            // Header row with turn + minimal controls (no swap button!)
                            .child(
                              h_flex().items_center().justify_between().gap(4)
                                .child(div().text_size(9.5).font_bold().text_color("#fef08a").child(tr(`第 ${this.turn} 回合 · 宝可梦对战`, `Turn ${this.turn} · Pokémon Battle`, `${this.turn} ターン目 · ポケモンバトル`, `${this.turn}턴 · 포켓몬 배틀`)))
                                .child(
                                  h_flex().gap(5).items_center()
                                    .child(
                                      gbaMiniBtn("bat-auto", this.autoMode ? tr("自动:开", "Auto: On", "オート:ON", "자동:ON") : tr("自动", "Auto", "オート", "자동"), this.autoMode, tr("开启后自动替我方出招", "Auto-battle for your Pokémon", "自動で技を選択して戦います", "자동으로 기술을 선택해 전투합니다"), (_e, cx) => {
                                        this.autoMode = !this.autoMode;
                                        cx.notify();
                                        if (this.autoMode && this.phase === "choose") {
                                          this.onPickMove(this.pickAiMoveIndex(this.p1, this.cpu), cx);
                                        }
                                      }),
                                    )
                                    .child(
                                      div()
                                        .id("bat-esc-hint")
                                        .px(5)
                                        .py(1)
                                        .rounded(4)
                                        .text_size(9.5)
                                        .font_medium()
                                        .text_color("#a7c8cb")
                                        .cursor_pointer()
                                        .hover((s) => s.text_color("#ffffff"))
                                        .on_click((_e, cx) => this.close(cx))
                                        .child(tr("ESC 退出", "ESC Exit", "ESC 終了", "ESC 종료")),
                                    ),
                                ),
                            )
                            // RPG Dialogue Line
                            .child(
                              div()
                                .text_size(11.5)
                                .font_semibold()
                                .text_color("#ffffff")
                                .truncate()
                                .child(this.logText),
                            ),
                        ),
                    )
                    // 2. Classic GBA Cream 2x2 Fixed Move Selector Box (or clean ESC-to-exit end card!)
                    .child(
                      v_flex()
                        .flex_1()
                        .w_full()
                        .p(6)
                        .gap(6)
                        .rounded(7)
                        .bg("#e8e8d0")
                        .border(2)
                        .border_color("#f8f8e8")
                        .when(this.phase !== "victory", (x) =>
                          x
                            .child(
                              h_flex().gap(6)
                                .child(this.renderGbaMoveBtn(this.p1.moves[0], 0))
                                .child(this.renderGbaMoveBtn(this.p1.moves[1], 1)),
                            )
                            .child(
                              h_flex().gap(6)
                                .child(this.renderGbaMoveBtn(this.p1.moves[2], 2))
                                .child(this.renderGbaMoveBtn(this.p1.moves[3], 3)),
                            ),
                        )
                        .when(this.phase === "victory", (x) =>
                          x.child(
                            v_flex()
                              .id("bat-victory-exit")
                              .flex_1()
                              .items_center()
                              .justify_center()
                              .gap(4)
                              .cursor_pointer()
                              .on_click((_e, cx) => this.close(cx))
                              .child(
                                div()
                                  .text_size(13)
                                  .font_bold()
                                  .text_color(this.winner === "p1" ? "#15803d" : "#b91c1c")
                                  .child(this.winner === "p1" ? tr("战斗胜利！", "Victory!", "バトル勝利！", "배틀 승리!") : tr("战斗结束", "Battle Over", "バトル終了", "배틀 종료")),
                              )
                              .child(
                                div()
                                  .text_size(10.5)
                                  .font_medium()
                                  .text_color("#54645c")
                                  .child(tr("按 ESC 退出", "Press ESC to exit", "ESC キーで戻る", "ESC 키를 눌러 나가기")),
                              ),
                          ),
                        ),
                    ),
                ),
            ),
        );
      });
  }
}
