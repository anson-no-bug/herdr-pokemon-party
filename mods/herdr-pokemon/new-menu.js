// Pokemon RPG "+" Summon / New Menu popup.

import { div, svg, image } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { spaces, panes, knownAgents, run, openOverlay, closeOverlay, props, window, keys, shared, setShared, checking } from "herdr";
import { palette, rpgFrame, iconAsset, pokeBall, applyBadgeFont } from "./kit.js";

const KNOWN = "new-menu.agents";

function shortcut(name) {
  const k = keys().find((b) => b.section === "global" && b.action === name);
  if (!k?.keys.trim()) return "";
  const mac = window()?.platform === "macos";
  const names = mac ? { ctrl: "⌃", alt: "⌥", shift: "⇧", cmd: "⌘", fn: "fn" } : { ctrl: "Ctrl", alt: "Alt", shift: "Shift", cmd: "Super", fn: "Fn" };
  return k.keys.trim().split(/\s+/).map((stroke) => {
    const parts = stroke.split("-");
    let key = parts.pop();
    if (key === "") { key = "-"; parts.pop(); }
    const held = new Set(parts.map((m) => m.toLowerCase()));
    const label = key.length === 1 ? key.toUpperCase() : key[0].toUpperCase() + key.slice(1).toLowerCase();
    return [...Object.keys(names).filter((m) => held.has(m)).map((m) => names[m]), label].join(mac ? "" : "+");
  }).join(" ");
}

export default class NewMenu {
  init(_p, cx) {
    const machine = spaces().find((s) => s.active)?.machine;
    const where = machine ?? "";
    this.agents = shared(KNOWN)?.[where] ?? [];
    this.hovered = null;
    this.handle = cx.focus_handle();
    this.handle.focus();
    if (checking()) return;
    cx.spawn(async (cx) => {
      try {
        this.agents = await knownAgents({ on: machine });
        setShared(KNOWN, { ...shared(KNOWN), [where]: this.agents });
      } catch { this.failed = true; }
      cx.notify();
    });
  }

  row(p, id, icon, name, action, hint = "", enabled = true) {
    const on = this.hovered === id;
    return h_flex()
      .id(id)
      .h(30)
      .px(8)
      .gap(8)
      .rounded(3)
      .items_center()
      .flex_none()
      .text_color(enabled ? p.fg : p.dim)
      .when(enabled, (el) => el.cursor_pointer().hover((s) => s.bg(p.selected)))
      .on_hover((h, cx) => { if (enabled) { this.hovered = h ? id : null; cx.notify(); } })
      .on_click(() => { if (enabled) { closeOverlay(props().overlay); action(); } })
      .child(div().w(9).flex_none().child(on && enabled ? svg(iconAsset("cursor")).size(7).text_color(p.red) : ""))
      .child(icon)
      .child(div().flex_1().truncate().child(name))
      .child(div().text_size(10.5).text_color(p.dim).child(hint));
  }

  render() {
    const p = palette();
    const space = spaces().find((s) => s.active);
    const installed = this.agents.filter((a) => a.installed);
    const choices = this.failed ? installed : [...installed, ...this.agents.filter((a) => !a.installed).slice(0, 2)];

    const popH = Math.min(440, 178 + Math.max(1, choices.length + (this.failed ? 1 : 0)) * 30);

    return rpgFrame(
      v_flex()
        .id("poke-new-menu")
        .track_focus(this.handle)
        .w_full()
        .h(popH)
        .min_h(0)
        .p(8)
        .gap(2)
        .text_size(12.2)
        .on_key_down((e) => {
          if (e.key === "escape") { closeOverlay(props().overlay); return; }
          if (e.modifiers.control || e.modifiers.platform || e.modifiers.alt) return;
          const agent = /^[1-9]$/.test(e.key) ? installed[Number(e.key) - 1] : null;
          if (!agent) return;
          closeOverlay(props().overlay);
          run("tab.new", { name: agent.name, space: space?.id, argv: agent.run });
        })
        .child(applyBadgeFont(div().px(8).pt(2).pb(4).text_size(9.5).font_bold().text_color(p.red).child("SUMMON / NEW")))
        .child(this.row(p, "nm-term", svg("icons/shell.svg").size(14).text_color(p.fg), "Terminal", () => run("tab.new", { space: space?.id }), shortcut("tab.new")))
        .child(applyBadgeFont(div().px(8).pt(8).pb(3).text_size(9.5).text_color(p.dim).child("CODING AGENTS (1-9)")))
        .child(
          v_flex()
            .flex_1()
            .min_h(0)
            .overflow_y_scrollbar()
            .children(
              choices.map((a, i) =>
                this.row(
                  p,
                  `nm-${a.key}`,
                  a.tint ? svg(a.icon).size(14).text_color(p.fg) : image(a.icon).size(14),
                  a.name,
                  () => run("tab.new", { name: a.name, space: space?.id, argv: a.run }),
                  a.installed ? (i < 9 ? `[${i + 1}]` : "") : "not installed",
                  a.installed,
                ),
              ),
            )
            .when(this.failed || this.agents.length === 0, (el) =>
              el.child(div().px(10).py(6).text_size(11).text_color(p.dim).child(this.failed ? "Could not check installed agents" : "Scanning tall grass for agents…")),
            ),
        )
        .child(div().h(1).mx(4).my(4).bg(p.frameInner))
        .child(this.row(p, "nm-space", pokeBall("poke", 14, { open: true }), "New Poké Ball Space", () => run("space.new"), shortcut("space.new")))
        .child(this.row(p, "nm-wt-new", svg(iconAsset("branch")).size(13).text_color(p.teal), "New worktree…", () => openOverlay({ mod: "worktree", kind: "dialog", width: 460, height: 280, props: { space: space?.id, folder: panes().find((x) => x.focused)?.cwd, action: "new" } }), "", Boolean(space)))
        .child(this.row(p, "nm-wt-open", svg(iconAsset("branch")).size(13).text_color(p.blue), "Open worktree…", () => openOverlay({ mod: "worktree", kind: "dialog", width: 560, height: 480, props: { space: space?.id, folder: panes().find((x) => x.focused)?.cwd, action: "open" } }), "", Boolean(space))),
      { autoHeight: true },
    );
  }
}
