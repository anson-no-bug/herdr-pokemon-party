// Agents sidebar list (always sorted by Priority — clean, zero mode clutter!).
// Features:
// - Pixel-framed PMDCollab expressive portraits (Normal / Determined / Worried / Happy)
// - Miniature status HP bar + icon-only Pin button on hover
// - Right-click any agent to swap its Pokemon in Pokedex Picker.

import { div, image, svg } from "gpui-kit";
import { v_flex, h_flex } from "gpui-base";
import { agents, terminals, panes, focused, spaces, run, setAgentOrder, window, checking } from "herdr";
import {
  palette, applyUiFont, tr, hpBar, iconAsset, isSidebarNarrow, openPokePicker,
} from "./kit.js";
import { assignPokemon, portraitFor, nameOf, slotOf, levelInfo, isShiny } from "./pokemon.js";
import { toggleSidebar } from "./brand.js";

const clean = (s) => (s ?? "").replace(/^[^\p{L}\p{N}]+/u, "").trim();

function leadPanes(all) {
  const leads = new Map();
  for (const p of all) {
    if (!p.terminal) continue;
    const current = leads.get(p.tab);
    if (!current || (!current.program?.agent && (p.program?.agent || (!current.focused && p.focused)))) leads.set(p.tab, p);
  }
  return leads;
}

function titleOf(tab, l) {
  const prog = l?.program?.name;
  const live = clean(l?.title);
  const telling = live && live !== prog && !/^[~/]|^[A-Za-z]:\\/.test(live) && !live.includes("@") && live.toLowerCase() !== l?.program?.key;
  return (tab.name === prog || !tab.named) && telling ? live : tab.name;
}

const RANK = { blocked: 4, done: 3, working: 2, idle: 1 };
const kidStatus = (k, listed) => {
  const s = listed.get(k.address) ?? k.status;
  return s === "error" ? "blocked" : s === "done" ? "idle" : s;
};
const SECTION = { 4: "Needs You", 3: "Done", 2: "Working", 1: "Idle" };
const SECTION_STATUS = { 4: "blocked", 3: "done", 2: "working" };

function duration(ms) {
  const m = Math.floor(ms / 60000);
  if (m < 1) return "<1m";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return h < 24 ? `${h}h` : `${Math.floor(h / 24)}d`;
}

function progIcon(p, size, color) {
  if (!p?.icon) return null;
  return p.tint ? svg(p.icon).size(size).flex_none().text_color(color) : image(p.icon).w(size).h(size).flex_none();
}

export default class Agents {
  init(_pr, cx) {
    this.folded = new Set();
    this.hovered = null;
    try { this.changed = JSON.parse(localStorage.getItem("poke.changed") ?? "{}"); }
    catch { this.changed = {}; }
    if (!checking()) cx.timer.every(30000, (cx) => { if (window()?.visible !== false) cx.notify(); });
  }

  track(list, now) {
    let dirty = false;
    for (const a of list) {
      const s = a.status === "done" ? "idle" : a.status;
      if (this.changed[a.address]?.s === s) continue;
      this.changed[a.address] = { s, at: now };
      dirty = true;
    }
    if (!dirty) return;
    const listed = new Set(list.map((a) => a.address));
    for (const [k, c] of Object.entries(this.changed)) if (!listed.has(k) && now - c.at > 30 * 86400000) delete this.changed[k];
    localStorage.setItem("poke.changed", JSON.stringify(this.changed));
  }

  since(a) { return this.changed[a.address]?.at ?? 0; }

  hold(list) {
    const cur = list.find((a) => a.focused);
    const same = cur && cur.address === this.held?.address;
    if (!same || cur.status !== "idle") this.held = cur ? { address: cur.address, rank: RANK[cur.status] ?? 0 } : null;
  }

  rank(a) {
    const sawDone = a.address === this.held?.address && this.held.rank === RANK.done && a.status === "idle";
    return sawDone ? RANK.done : RANK[a.status] ?? 0;
  }

  tree(all, addr, lead = []) {
    const kids = all.filter((k) => k.parent === addr && k.state === "live");
    return kids.flatMap((k, i) => {
      const last = i === kids.length - 1;
      return [{ t: k, lines: [...lead, last ? "└" : "├"] }, ...this.tree(all, k.address, [...lead, last ? "" : "│"])];
    });
  }

  avatar(id, a, p) {
    const shiny = isShiny(slotOf(a));
    const pic = id ? portraitFor(id, a.status, shiny) : null;
    const borderCol =
      a.status === "blocked" ? p.blocked
      : a.status === "working" ? p.working
      : a.status === "done" ? p.done
      : p.border;
    if (pic?.kind === "portrait") {
      return div()
        .size(34)
        .flex_none()
        .rounded(7)
        .border_1()
        .border_color(borderCol)
        .overflow_hidden()
        .bg(p.raised)
        .child(image(pic.path).size(34));
    }
    if (pic?.kind === "icon") {
      return h_flex()
        .size(30)
        .flex_none()
        .rounded(7)
        .border_1()
        .border_color(borderCol)
        .bg(p.raised)
        .items_center()
        .justify_center()
        .child(image(pic.path).w(24).h(18));
    }
    return h_flex()
      .size(28)
      .flex_none()
      .rounded(7)
      .border_1()
      .border_color(borderCol)
      .bg(p.raised)
      .items_center()
      .justify_center()
      .child(progIcon(a.program, 16, p.fg) ?? div().text_size(11).child("●"));
  }

  subRow(p, s, shown) {
    const k = s.t;
    const st = kidStatus(k, this.listed);
    const pic = progIcon(k.program, 13, p.fg);
    const on = k.address === shown;
    return h_flex()
      .id(`sub-${k.address}`)
      .pl(32)
      .pr(8)
      .rounded(6)
      .h(24)
      .flex_none()
      .gap(6)
      .items_center()
      .text_size(11.5)
      .when(on, (el) => el.bg(p.selected))
      .hover((s) => s.bg(p.hover))
      .cursor_pointer()
      .on_click(() => run("terminal.peek", { terminal: k.address }))
      .child(div().text_color(p.dim).child(s.lines.join("")))
      .when(Boolean(pic), (el) => el.child(pic))
      .child(div().flex_1().truncate().text_color(on ? p.fg : p.muted).child(k.name || k.template || k.program?.name || k.address))
      .child(div().size(6).rounded_full().bg(p[st] ?? p.idle));
  }

  render() {
    const p = palette();
    const collapsed = isSidebarNarrow();
    let list = agents();
    const { ids } = assignPokemon(list);
    this.listed = new Map(list.map((a) => [a.address, a.status]));
    const all = terminals();
    const shown = focused()?.agent;
    const now = Date.now();
    this.track(list, now);
    this.hold(list);

    // Always sorted by Priority (Needs You > Done > Working > Idle), pinned first
    const urgency = new Map(list.map((a) => [a.address, Math.max(this.rank(a), ...this.tree(all, a.address).map((s) => RANK[kidStatus(s.t, this.listed)] ?? 0))]));
    const rankOf = (a) => urgency.get(a.address);
    list = [...list].sort((x, y) => rankOf(y) - rankOf(x) || this.since(y) - this.since(x) || y.seq - x.seq);
    const pinned = list.filter((a) => a.pinned);
    const rest = list.filter((a) => !a.pinned);
    list = [...pinned, ...rest];
    setAgentOrder(list.map((a) => a.address));

    const leads = leadPanes(panes());
    const tabLabels = new Map(spaces().flatMap((s) => s.tabs).map((tab) => [tab.id, titleOf(tab, leads.get(tab.id))]));
    const labels = new Map(list.map((a) => [a.address, tabLabels.get(a.tab) ?? (a.title || a.program?.name || "")]));
    const detail = new Map(list.map((a) => [a.address, /^\d+$/.test(labels.get(a.address)) ? null : labels.get(a.address)]));

    const row = (a) => {
      const id = ids[a.address];
      const more = detail.get(a.address);
      if (collapsed) {
        return h_flex()
          .id(`ag-rail-${a.address}`)
          .h(32)
          .px(4)
          .flex_none()
          .items_center()
          .justify_center()
          .rounded(6)
          .when(a.focused, (el) => el.bg(p.selected))
          .hover((s) => s.bg(p.hover))
          .cursor_pointer()
          .tooltip(`${nameOf(id)} · ${a.space_name} (${a.status})`)
          .on_click(() => run("pane.focus", { pane: a.pane }))
          .child(this.avatar(id, a, p));
      }

      const when = this.since(a);
      const isPinned = a.pinned;
      const title = a.space_name || labels.get(a.address);
      const hovered = this.hovered === a.address;
      const slot = slotOf(a);
      const shiny = isShiny(slot);
      const lv = levelInfo(id, slot);
      const monLabel = `${nameOf(id)}${shiny ? " ✨" : ""}`;
      const evoTip = lv.locked
        ? tr(`${monLabel} · ${lv.level}级（已锁定进化）`, `${monLabel} · Lv.${lv.level} (Evolution locked)`)
        : lv.nextId
          ? tr(`${monLabel} · ${lv.level}级（经验 ${lv.xp}/${lv.needXp} → ${nameOf(lv.nextId)}）`, `${monLabel} · Lv.${lv.level} (${lv.xp}/${lv.needXp} XP → ${nameOf(lv.nextId)})`)
          : tr(`${monLabel} · ${lv.level}级（最终形态）`, `${monLabel} · Lv.${lv.level} (Final form)`);

      return h_flex()
        .id(`ag-${a.address}`)
        .px(7)
        .py(5)
        .flex_none()
        .rounded(8)
        .border_1()
        .border_color(a.focused ? p.border : "#00000000")
        .bg(a.focused ? p.selected : "#00000000")
        .items_center()
        .gap(8)
        .cursor_pointer()
        .hover((s) => s.bg(p.hover))
        .on_hover((on, cx) => {
          if (on) this.hovered = a.address;
          else if (this.hovered === a.address) this.hovered = null;
          cx.notify();
        })
        .on_click(() => run("pane.focus", { pane: a.pane }))
        .on_mouse_down("right", (_e, cx) => {
          cx.stop_propagation();
          openPokePicker({ mode: "pokemon", slot: slotOf(a), current: id, tag: title });
        })
        .child(this.avatar(id, a, p))
        .child(
          v_flex()
            .flex_1()
            .min_w(0)
            .gap(3)
            .child(
              h_flex().items_center().gap(4)
                .child(div().min_w(0).truncate().text_size(12.2).font_semibold().text_color(a.status === "idle" && !a.focused ? p.muted : p.fg).child(title))
                .when(Boolean(more), (el) => el.child(div().flex_1().min_w(0).truncate().text_size(10.5).text_color(p.dim).child(`· ${more}`))),
            )
            .child(
              h_flex().items_center().gap(6)
                .child(hpBar(a.status, 42))
                .child(div().flex_1().min_w(0).truncate().text_size(10).text_color(p.dim).tooltip(evoTip).child(tr(`${monLabel} · ${lv.level}级`, `${monLabel} · Lv.${lv.level}`)))
                .when(hovered, (el) =>
                  el.child(
                    div().id(`pin-${a.address}`).size(20).flex().items_center().justify_center()
                      .rounded(5).text_color(p.dim).cursor_pointer()
                      .hover((s) => s.bg(p.hover).text_color(p.fg))
                      .tooltip(isPinned ? "Unpin" : "Pin to top")
                      .on_click((_e, cx) => {
                        cx.stop_propagation();
                        run("terminal.pin", { terminal: a.address, pinned: !isPinned });
                        this.hovered = null; cx.notify();
                      })
                      .child(svg(`mods/workspace-chrome/${isPinned ? "pin-off" : "pin"}.svg`).size(12)),
                  ),
                )
                .when(!hovered && Boolean(when), (el) =>
                  el.child(div().flex_none().text_size(10).text_color(p.dim).child(duration(now - when))),
                ),
            ),
        );
    };

    const withKids = (a) => {
      const subs = collapsed ? [] : this.tree(all, a.address);
      const r = row(a);
      if (this.folded.has(a.address)) return [r];
      return [r, ...subs.map((s) => this.subRow(p, s, shown))];
    };

    const groups = pinned.length ? [{ id: "pinned", label: "Pinned", status: null, members: pinned }] : [];
    for (const a of rest) {
      const r = rankOf(a) || RANK.idle;
      const id = `sec-${r}`;
      if (groups.at(-1)?.id === id) groups.at(-1).members.push(a);
      else groups.push({ id, label: SECTION[r], status: SECTION_STATUS[r], members: [a] });
    }

    const header = (g) => {
      const open = !this.folded.has(g.id);
      return h_flex()
        .id(g.id)
        .px(8)
        .pt(6)
        .h(24)
        .flex_none()
        .gap(6)
        .items_center()
        .text_size(10.5)
        .font_semibold()
        .cursor_pointer()
        .on_click((_e, cx) => { open ? this.folded.add(g.id) : this.folded.delete(g.id); cx.notify(); })
        .child(div().truncate().text_color(p[g.status] ?? p.dim).child(g.label))
        .child(div().text_color(p.dim).child(`${g.members.length}`))
        .child(div().flex_1())
        .when(!open, (el) => el.child(svg(iconAsset("chevron-right")).size(9).text_color(p.dim)));
    };

    const rows = collapsed
      ? list.flatMap(withKids)
      : groups.flatMap((g) => [header(g), ...(this.folded.has(g.id) ? [] : g.members.flatMap(withKids))]);

    return applyUiFont(
      v_flex()
        .size_full()
        .min_h(0)
        .bg(p.chrome)
        .border_t(1)
        .border_color(p.border)
        .text_size(12.5)
        .when(!collapsed, (el) =>
          el.child(
            h_flex()
              .px(12)
              .h(32)
              .flex_none()
              .items_center()
              .gap(6)
              .child(div().text_size(11.5).font_semibold().text_color(p.muted).child("Agents"))
              .child(div().text_size(11).text_color(p.dim).child(`${list.length}`)),
          ),
        )
        .when(list.length === 0 && !collapsed, (el) =>
          el.child(div().px(12).py(8).text_size(11.5).text_color(p.dim).child("No active agents yet.")),
        )
        .child(
          v_flex()
            .id("ag-list")
            .flex_1()
            .min_h(0)
            .px(collapsed ? 2 : 7)
            .gap(2)
            .overflow_y_scrollbar()
            .mode("always")
            .children(rows),
        )
        .when(collapsed, (el) =>
          el.child(
            h_flex().h(28).items_center().justify_center()
              .child(div().id("ag-expand").px(8).py(2).rounded(5).text_color(p.muted).cursor_pointer().hover((s) => s.bg(p.hover).text_color(p.fg)).on_click(toggleSidebar).child("»")),
          ),
        ),
    );
  }
}
