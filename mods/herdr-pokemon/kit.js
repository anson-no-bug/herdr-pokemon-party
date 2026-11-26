// Restrained Pokemon Design System for herdr-pokemon v2.
// Clean, eye-friendly porcelain/slate chrome by default (zero muddy colors or visual clutter),
// with crisp Pokemon accents (Poke Ball spaces, Party portraits + HP bars, rich 2D Overworld).
// Optional "retro" pixel-font accent toggle kept in Theme & Habitat Settings.

import { div, image, svg } from "gpui-kit";
import { h_flex } from "gpui-base";
import { theme, settings, shared, setShared, openOverlay, layout } from "herdr";

export const MOD = "herdr-pokemon";
export const ASSETS = `mods/${MOD}/assets`;

export const STYLE_KEY = "herdr-pokemon.style";
export const LANG_KEY = "herdr-pokemon.lang";
export const BIOME_KEY = "herdr-pokemon.biome";
export const BIOME_INTERVAL_KEY = "herdr-pokemon.biome-interval";
export const WEATHER_KEY = "herdr-pokemon.weather";
export const WEATHER_INTERVAL_KEY = "herdr-pokemon.weather-interval";
export const TIME_KEY = "herdr-pokemon.time";
export const SPACE_BALLS_KEY = "herdr-pokemon.space-balls";
export const WIN_W_KEY = "herdr-pokemon.win-w";
export const HABITAT_RELEASE_KEY = "herdr-pokemon.hab-release";
export const HABITAT_RECALL_KEY = "herdr-pokemon.hab-recall";

// Global language preference ("zh" | "en" | "ja" | "ko", default "zh") — switches the entire Pokemon ecosystem cleanly!
export const SUPPORTED_LANGS = ["zh", "en", "ja", "ko"];
export const lang = () => {
  const v = shared(LANG_KEY);
  return SUPPORTED_LANGS.includes(v) ? v : "zh";
};
export const isZh = () => lang() === "zh";
export const setLang = (next) => setShared(LANG_KEY, SUPPORTED_LANGS.includes(next) ? next : "zh");
export const tr = (zh, en, ja, ko) => {
  const l = lang();
  if (l === "zh") return zh;
  if (l === "ja") return ja ?? en;
  if (l === "ko") return ko ?? en;
  return en;
};

export const BALL_TYPES = [
  { id: "poke",    name: "Poké Ball",    cn: "精灵球", ja: "モンスターボール", ko: "몬스터볼", accent: "#e04646" },
  { id: "great",   name: "Great Ball",   cn: "超级球", ja: "スーパーボール",   ko: "수퍼볼",   accent: "#3a7bd5" },
  { id: "ultra",   name: "Ultra Ball",   cn: "高级球", ja: "ハイパーボール",   ko: "하이퍼볼", accent: "#d4a017" },
  { id: "master",  name: "Master Ball",  cn: "大师球", ja: "マスターボール",   ko: "마스터볼", accent: "#7d4bc6" },
  { id: "premier", name: "Premier Ball", cn: "纪念球", ja: "プレミアボール",   ko: "프리미어볼", accent: "#d94545" },
  { id: "heal",    name: "Heal Ball",    cn: "治愈球", ja: "ヒールボール",     ko: "힐볼",     accent: "#e06c9f" },
  { id: "dive",    name: "Dive Ball",    cn: "潜水球", ja: "ダイブボール",     ko: "다이브볼", accent: "#3aa6d6" },
  { id: "dusk",    name: "Dusk Ball",    cn: "黑暗球", ja: "ダークボール",     ko: "다크볼",   accent: "#2f8a53" },
  { id: "luxury",  name: "Luxury Ball",  cn: "豪华球", ja: "ゴージャスボール", ko: "럭셔리볼", accent: "#c99a1e" },
  { id: "nest",    name: "Nest Ball",    cn: "巢穴球", ja: "ネストボール",     ko: "네스트볼", accent: "#5da652" },
];
export const ballLabel = (b) => tr(b.cn, b.name, b.ja, b.ko);

export const ballAsset = (id, open = false) =>
  `${ASSETS}/balls/${BALL_TYPES.some((b) => b.id === id) ? id : "poke"}${open ? "-open" : ""}.svg`;
export const iconAsset = (name) => `${ASSETS}/icons/${name}.svg`;
export const fileIconAsset = (name) => `${ASSETS}/file-icons/${name}.svg`;
export const mapAsset = (biomeId) => `${ASSETS}/maps/${biomeId}.png`;
export const mapFgAsset = (biomeId) => `${ASSETS}/maps/${biomeId}_fg.png`;
export const fxAsset = (name) => `${ASSETS}/fx/${name}.svg`;
export const fxGifAsset = (name) => `${ASSETS}/fx/${name}.gif`;

// Default is clean restrained ("balanced"); user can opt into "retro" pixel UI anytime in Settings.
export const styleMode = () => (shared(STYLE_KEY) === "retro" ? "retro" : "balanced");
export const isRetro = () => styleMode() === "retro";
export const toggleStyleMode = () => setShared(STYLE_KEY, isRetro() ? "balanced" : "retro");

export const PIXEL_FONT = "Pixelated MS Sans Serif";
export const BADGE_FONT = "Silkscreen";

export function applyUiFont(el) {
  return isRetro() ? el.font_family(PIXEL_FONT) : el;
}

export function applyBadgeFont(el) {
  return isRetro() ? el.font_family(BADGE_FONT) : el.font_semibold();
}

export function palette() {
  const t = theme();
  const dark = Boolean(settings()?.dark);
  return {
    t,
    dark,
    ink: dark ? "#0f1218" : "#1e232b",
    frameOuter: t.border ?? (dark ? "#2a3142" : "#dfe3ea"),
    frameInner: dark ? "#222836" : "#eceff4",
    chrome: t.chrome ?? (dark ? "#13161e" : "#f6f7f9"),
    surface: t.surface ?? (dark ? "#1a1e29" : "#ffffff"),
    popover: t.popover ?? (dark ? "#1d2230" : "#ffffff"),
    raised: t.raised ?? (dark ? "#232938" : "#f0f2f5"),
    hover: t.hover ?? (dark ? "#283042" : "#eaedf2"),
    selected: t.selected ?? (dark ? "#24344d" : "#e4edf9"),
    bg: t.background ?? (dark ? "#161922" : "#ffffff"),
    canvas: t.canvas ?? (dark ? "#0f1218" : "#eef0f4"),
    border: t.border ?? (dark ? "#2a3142" : "#dfe3ea"),
    input: t.input ?? (dark ? "#3a4359" : "#cfd5df"),
    fg: t.foreground ?? (dark ? "#e6e9ef" : "#1e232b"),
    muted: t.muted ?? (dark ? "#9aa3b5" : "#5c6473"),
    dim: t.dim ?? (dark ? "#687287" : "#8b93a3"),
    red: dark ? "#ef5350" : "#dc2626",
    redDark: dark ? "#b91c1c" : "#b91c1c",
    teal: dark ? "#22c55e" : "#16a34a",
    blue: dark ? "#60a5fa" : "#2563eb",
    gold: dark ? "#f59e0b" : "#d97706",
    working: t.working ?? "#d97706",
    blocked: t.blocked ?? "#dc2626",
    done: t.done ?? "#16a34a",
    idle: t.idle ?? "#94a3b8",
  };
}

export function alpha(c, hexAlpha) {
  return typeof c === "string" && /^#[0-9a-f]{6}$/i.test(c) ? c + hexAlpha : c;
}

// Restrained clean card frame (switches to classic double-border only in retro mode).
// Pass { autoHeight: true } for `kind: "popup"` overlays so they size to content instead of collapsing!
export function rpgFrame(body, opts = {}) {
  const p = palette();
  const box = (el) => (opts.autoHeight ? el.w_full() : el.size_full().min_h(0));
  if (isRetro()) {
    return box(div())
      .rounded(5)
      .bg(opts.outer ?? p.fg)
      .p(2)
      .child(
        box(div())
          .rounded(3)
          .bg(p.frameInner)
          .p(2)
          .child(applyUiFont(box(div()).rounded(2).bg(opts.bg ?? p.popover).text_color(p.fg).child(body))),
      );
  }
  return box(div())
    .rounded(12)
    .border_1()
    .border_color(opts.outer ?? p.border)
    .bg(opts.bg ?? p.popover)
    .shadow_lg()
    .text_color(p.fg)
    .overflow_hidden()
    .child(body);
}

export function rpgButton(id, label, onClick, opts = {}) {
  const p = palette();
  const variant = opts.variant ?? "neutral";
  const r = isRetro() ? 4 : 8;
  const bg =
    variant === "primary" ? p.red
    : variant === "teal" ? p.blue
    : variant === "selected" ? p.selected
    : p.raised;
  const fg =
    variant === "primary" || variant === "teal" ? "#ffffff"
    : p.fg;
  const border =
    variant === "primary" ? p.red
    : variant === "teal" ? p.blue
    : p.input;

  return h_flex()
    .id(id)
    .h(opts.h ?? 31)
    .px(opts.px ?? 13)
    .gap(6)
    .items_center()
    .justify_center()
    .rounded(r)
    .border_1()
    .border_color(border)
    .bg(bg)
    .text_color(fg)
    .text_size(opts.textSize ?? 12.2)
    .font_medium()
    .cursor_pointer()
    .hover((s) => s.opacity(0.88))
    .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
    .when(Boolean(onClick), (el) => el.on_click(onClick))
    .when(Boolean(opts.cursor) && isRetro(), (el) =>
      el.child(svg(iconAsset("cursor")).size(8).flex_none().text_color(fg)))
    .child(label);
}

// Clean miniature Pokemon HP/Status bar (kept crisp & understated).
export function hpBar(status, width = 42) {
  const p = palette();
  const color =
    status === "blocked" ? p.blocked
    : status === "working" ? p.working
    : status === "done" ? p.done
    : p.idle;
  const pct =
    status === "blocked" ? 0.28
    : status === "working" ? 0.72
    : status === "done" ? 1.0
    : 0.42;
  const fillW = Math.max(4, Math.round((width - 2) * pct));
  return h_flex()
    .w(width)
    .h(5)
    .p(1)
    .rounded_full()
    .bg(p.dark ? "#2c3447" : "#dde2eb")
    .items_center()
    .child(
      div()
        .w(fillW)
        .h(3)
        .rounded_full()
        .bg(color)
        .when(status === "working" || status === "blocked", (el) =>
          el.loop("opacity", { from: 0.5, to: 1, period: status === "blocked" ? 700 : 1200 })),
    );
}

export function pokeBall(ballId, size = 18, opts = {}) {
  return div()
    .relative()
    .size(size)
    .flex_none()
    .child(image(ballAsset(ballId, Boolean(opts.open))).size(size));
}

export function findNode(node, id) {
  if (node?.id === id) return node;
  for (const child of node?.children ?? []) {
    const found = findNode(child, id);
    if (found) return found;
  }
  return null;
}

export const isSidebarNarrow = () => (findNode(layout(), "sidebar")?.size?.px ?? Infinity) < 160;

export function openPokeDialog(kind, dialogProps = {}, size = {}) {
  return openOverlay({
    mod: MOD,
    kind: "dialog",
    frame: "none",
    width: size.width ?? 420,
    height: size.height ?? 210,
    props: { role: "dialog", kind, ...dialogProps },
  });
}

export function openPokeMenu(tab, target, opts = {}) {
  return openOverlay({
    mod: MOD,
    kind: "popup",
    frame: "none",
    width: opts.width ?? 230,
    height: opts.height ?? 285,
    props: { role: "menu", tab, target },
  });
}

export function openPokeNewMenu() {
  return openOverlay({
    mod: MOD,
    kind: "popup",
    frame: "none",
    width: 268,
    height: 450,
    props: { role: "new-menu" },
  });
}

export function openPokePicker(pickerProps = {}) {
  return openOverlay({
    mod: MOD,
    kind: "dialog",
    frame: "none",
    width: 660,
    height: 590,
    props: { role: "picker", ...pickerProps },
  });
}

export function openHabitatPrefs() {
  return openOverlay({
    mod: MOD,
    kind: "popup",
    frame: "none",
    width: 320,
    height: 262,
    props: { role: "dialog", kind: "habitat-prefs" },
  });
}

export function askCloseSpace(space, ballId = "poke") {
  if (!space) return;
  const n = space.tabs?.length ?? 1;
  return openPokeDialog("confirm", {
    title: `Close ${space.name}?`,
    caption: n > 1 ? `Ends ${n} running tabs in this space` : "Ends the running terminal in this space",
    ball: ballId,
    confirmLabel: "Close",
    cancelLabel: "Cancel",
    command: { name: "space.close", args: { id: space.id, confirmed: true } },
  }, { width: 356, height: 132 });
}

export function askCloseTab(space, tab, ballId = "poke") {
  if (!tab) return;
  const count = space?.tabs?.length ?? 1;
  if (count <= 1 && space) {
    return openPokeDialog("confirm", {
      title: `Close ${space.name}?`,
      caption: "Last tab — closing ends this space",
      ball: ballId,
      confirmLabel: "Close",
      cancelLabel: "Cancel",
      command: { name: "tab.close", args: { id: tab.id, confirmed: true } },
    }, { width: 356, height: 132 });
  }
  return openPokeDialog("confirm", {
    title: `Close ${tab.name}?`,
    caption: "Ends the running terminal in this tab",
    ball: ballId,
    confirmLabel: "Close",
    cancelLabel: "Cancel",
    command: { name: "tab.close", args: { id: tab.id, confirmed: true } },
  }, { width: 356, height: 132 });
}
