// Pokemon Party Tab Bar + Layout Command Dispatcher (handles Cmd+W RPG close confirm!).

import { div, svg, image } from "gpui-kit";
import { h_flex, ScrollHandle } from "gpui-base";
import { spaces, panes, agents, run, window, shared, setShared, layout, settings, nextCommand, notify, checking } from "herdr";
import {
  palette, isRetro, applyUiFont, pokeBall, iconAsset, findNode,
  openPokeMenu, openPokeNewMenu, openPokeDialog, openPokePicker,
  askCloseTab, askCloseSpace, toggleStyleMode, WIN_W_KEY,
} from "./kit.js";
import { assignPokemon, ballForSpace, dexForPane, menuIconPath, hasMenuIcon, slotOf } from "./pokemon.js";

const clean = (s) => (s ?? "").replace(/^[^\p{L}\p{N}\p{Ps}\p{Pi}]+/u, "").replace(/^\[ [!.] \] /, "").trim();

function tabLabel(tab, lead) {
  const prog = lead?.program?.name;
  const base = tab.named ? tab.name : prog ?? "Terminal";
  if (!lead?.program?.agent) return base;
  const live = clean(lead.title);
  const path = /^[~/]|^[A-Za-z]:\\/.test((lead.title ?? "").replace(/^[^\p{L}\p{N}~/]+/u, ""));
  const telling = live && live !== lead.terminal && live !== prog && !path && !live.includes("@") && live.toLowerCase() !== lead.program.key;
  return (tab.name === prog || !tab.named) && telling ? live : base;
}

export default class Tabs {
  init(_p, cx) {
    this.pressed = null;
    this.scroll = ScrollHandle.new();
    try { this.panels = JSON.parse(localStorage.getItem("poke.panels") ?? "{}"); } catch { this.panels = {}; }
    if (!this.panels || typeof this.panels !== "object" || Array.isArray(this.panels)) this.panels = {};
    this.swipe = { acc: 0, steps: 0, at: 0, last: 0 };
    if (checking()) return;

    // Central key-command handler for layout:herdr-pokemon bindings
    cx.spawn(async (cx) => {
      for (;;) {
        const cmd = await nextCommand();
        this.handleCommand(cmd);
        cx.notify();
      }
    });
  }

  handleCommand(cmd) {
    const sp = spaces().find((s) => s.active);
    const tab = sp?.tabs?.find((t) => t.active);
    if (cmd === "close_tab") {
      if (tab) askCloseTab(sp, tab, ballForSpace(sp));
    } else if (cmd === "close_space") {
      if (sp) askCloseSpace(sp, ballForSpace(sp));
    } else if (cmd === "rename_tab" && tab) {
      openPokeDialog("prompt", {
        title: "Rename Tab",
        subtitle: "重命名标签页",
        value: tab.name,
        command: { name: "tab.rename", args: { id: tab.id } },
      }, { width: 410, height: 196 });
    } else if (cmd === "rename_space" && sp) {
      openPokeDialog("prompt", {
        title: "Rename Space",
        subtitle: "重命名精灵球空间",
        value: sp.name,
        ball: ballForSpace(sp),
        command: { name: "space.rename", args: { id: sp.id } },
      }, { width: 410, height: 196 });
    } else if (cmd === "pick") {
      const list = agents();
      const a = list.find((x) => x.focused) ?? list[0];
      if (a) openPokePicker({ mode: "pokemon", slot: slotOf(a), current: assignPokemon(list).ids[a.address], tag: a.space_name });
    } else if (cmd === "style") {
      toggleStyleMode();
    } else if (cmd === "settings") {
      openPokeDialog("settings", {}, { width: 520, height: 430 });
    } else if (cmd === "new_menu") {
      openPokeNewMenu();
    } else if (cmd === "test_toast") {
      notify({ title: "Antigravity needs you", body: "open-ses / 1", level: "warning", timeout: 4000 });
    }
  }

  wheel(e) {
    if (e.delta_lines) {
      if (e.delta_lines.y) run(e.delta_lines.y > 0 ? "tab.prev" : "tab.next");
      return;
    }
    const s = this.swipe, now = Date.now();
    if (e.touch_phase === "started" || now - s.at > 250 || e.delta.y * s.acc < 0) Object.assign(s, { acc: 0, steps: 0 });
    s.at = now;
    s.acc += e.delta.y;
    const need = s.steps ? 60 : 20;
    if (Math.abs(s.acc) < need || now - s.last < 100) return;
    s.acc -= Math.sign(s.acc) * need;
    s.steps++;
    s.last = now;
    run(e.delta.y > 0 ? "tab.prev" : "tab.next");
  }

  syncPanel(space, panel, body, enabled) {
    if (!space || !panel) return;
    const now = panel.hidden ? null : body?.active ?? null;
    if (space.id !== this.space) {
      const first = this.space === undefined;
      this.space = space.id; this.pending = null;
      if (!(first && !(space.id in this.panels))) {
        const stored = this.panels[space.id] ?? null, want = enabled.includes(stored) ? stored : null;
        if (want !== now) {
          this.pending = { want, until: Date.now() + 1000 };
          if (want) { run("layout.select", { stack: "panel-body", child: want }); run("layout.show", { id: "panel" }); }
          else run("layout.hide", { id: "panel" });
          return;
        }
      }
    }
    if (this.pending) {
      if (this.pending.want !== now && Date.now() < this.pending.until) return;
      this.pending = null;
    }
    if (this.panels[space.id] === now) return;
    this.panels[space.id] = now;
    localStorage.setItem("poke.panels", JSON.stringify(this.panels));
  }

  render() {
    const p = palette();
    const retro = isRetro();
    const space = spaces().find((s) => s.active);
    const ballId = ballForSpace(space);
    const shown = space?.tabs ?? [];
    const active = shown.findIndex((tab) => tab.active);
    const selected = shown[active]?.id;
    if (selected !== this.selected || active !== this.selectedIndex) {
      this.selected = selected;
      this.selectedIndex = active;
      if (active >= 0) this.scroll.scroll_to_item(active);
    }

    const stop = (_e, cx) => cx.stop_propagation();
    const allPanes = panes();

    const item = (c, i) => {
      const lead = allPanes.find((pn) => pn.tab === c.id && pn.program?.agent) ?? allPanes.find((pn) => pn.tab === c.id);
      const dex = lead?.pane ? dexForPane(lead.pane) : null;
      const program = lead?.program;
      const name = tabLabel(c, lead);

      let iconEl = null;
      if (dex && hasMenuIcon(dex)) {
        iconEl = image(menuIconPath(dex)).w(20).h(15).flex_none();
      } else if (program?.icon) {
        iconEl = program.tint ? svg(program.icon).size(13).flex_none().text_color(p.muted) : image(program.icon).size(13).flex_none();
      } else {
        iconEl = pokeBall(ballId, 14, { open: c.active });
      }

      return h_flex()
        .id(`tab-${c.id}`)
        .h(28)
        .px(9)
        .gap(6)
        .rounded(retro ? 3 : 7)
        .items_center()
        .flex_none()
        .text_size(12.2)
        .when(i <= active, (el) => el.on_size_change((_size, cx) => { this.scroll.scroll_to_item(active); cx.notify(); }))
        .border(c.active ? (retro ? 2 : 1) : 1)
        .border_color(c.active ? p.frameOuter : "#00000000")
        .bg(c.active ? p.bg : p.chrome)
        .text_color(c.active ? p.fg : p.muted)
        .hover((s) => s.bg(c.active ? p.bg : p.hover))
        .cursor_pointer()
        .on_mouse_down("left", (e, cx) => {
          cx.stop_propagation();
          this.pressed = i;
          if (e.click_count === 2) {
            openPokeDialog("prompt", {
              title: "Rename Tab",
              subtitle: "重命名标签页",
              value: c.name,
              command: { name: "tab.rename", args: { id: c.id } },
            }, { width: 410, height: 196 });
          }
        })
        .on_mouse_up("left", () => {
          const from = this.pressed; this.pressed = null;
          if (from !== null && from !== i) run("tab.move", { id: shown[from].id, index: space.tabs.findIndex((x) => x.id === c.id) + 1 });
          else run("tab.select", { id: c.id });
        })
        .on_mouse_down("right", (_e, cx) => {
          cx.stop_propagation();
          openPokeMenu("tab", { id: c.id, space: space.id });
        })
        .when(c.active && retro, (el) => el.child(svg(iconAsset("cursor")).size(7).flex_none().text_color(p.red)))
        .child(iconEl)
        .child(div().max_w(165).truncate().font_medium().child(c.zoomed ? `${name} [Z]` : name))
        .when(c.status === "working", (el) => el.child(div().size(7).rounded_full().bg(p.working).loop("opacity", { from: 0.35, to: 1, period: 900 })))
        .when(c.status === "blocked" || c.status === "done", (el) => el.child(div().size(7).rounded_full().bg(p[c.status])))
        .when(c.active, (el) =>
          el.child(
            div()
              .id(`close-${c.id}`)
              .size(18)
              .flex()
              .items_center()
              .justify_center()
              .rounded(retro ? 2 : 4)
              .text_color(p.dim)
              .hover((s) => s.bg(p.red).text_color("#ffffff"))
              .tooltip("Close tab (Pokémon Confirm)")
              .on_mouse_down("left", stop)
              .on_click((_e, cx) => {
                cx.stop_propagation();
                askCloseTab(space, c, ballId);
              })
              .child(svg(iconAsset("close")).size(9)),
          ),
        );
    };

    const root = layout(), sidebar = findNode(root, "sidebar"), w = window();
    const lightsPadding = w?.platform === "macos" && w.titlebar === "none" && !w.fullscreen && root?.traffic_lights
      ? Math.max(10, (root.traffic_lights[0] + 64) / settings().zoom - (sidebar?.hidden ? 0 : sidebar?.size?.px ?? 0))
      : 10;

    const panel = findNode(root, "panel"), body = findNode(root, "panel-body");
    const enabled = shared("workspace.panels") ?? ["files", "changes"];
    this.syncPanel(space, panel, body, enabled);

    const rpgToolBtn = (id, ico, label, activeBtn, tip, action) =>
      h_flex()
        .id(id)
        .h(26)
        .px(8)
        .gap(5)
        .flex_none()
        .items_center()
        .rounded(retro ? 3 : 6)
        .border(activeBtn ? (retro ? 2 : 1) : 1)
        .border_color(activeBtn ? p.frameOuter : "#00000000")
        .bg(activeBtn ? p.selected : p.raised)
        .text_size(11.5)
        .font_medium()
        .text_color(activeBtn ? p.fg : p.muted)
        .cursor_pointer()
        .hover((s) => s.bg(p.hover).border_color(p.frameOuter).text_color(p.fg))
        .tooltip(tip)
        .on_mouse_down("left", stop)
        .on_click(action)
        .child(typeof ico === "string" ? image(iconAsset(ico)).size(15).flex_none() : ico)
        .when(Boolean(label), (el) => el.child(label));

    const panelOn = (id) => Boolean(panel && !panel.hidden && body?.active === id);

    return applyUiFont(
      h_flex()
        .id("poke-tabs-bar")
        .size_full()
        .min_w(0)
        .px(10)
        .pl(lightsPadding)
        .gap(5)
        .items_center()
        .bg(p.chrome)
        .border_b(1)
        .border_color(p.border)
        .on_size_change((size) => {
          const z = Number(settings()?.zoom) > 0 ? Number(settings().zoom) : 1;
          const sideW = sidebar?.hidden ? 0 : (sidebar?.size?.px ?? 272);
          const total = Math.round(sideW + size.width / z);
          if (Math.abs((Number(shared(WIN_W_KEY)) || 0) - total) > 6) setShared(WIN_W_KEY, total);
        })
        .on_mouse_up("left", () => { this.pressed = null; })
        .on_scroll_wheel((e) => this.wheel(e))
        // Active Space Poke Ball crest
        .when(Boolean(space), (el) =>
          el.child(
            div()
              .id("tab-space-ball")
              .flex_none()
              .mr(2)
              .cursor_pointer()
              .tooltip(`Space: ${space.name} · Click to switch Poké Ball`)
              .on_mouse_down("left", stop)
              .on_click(() => openPokePicker({ mode: "ball", spaceId: space.id, spaceName: space.name, currentBall: ballId }))
              .child(pokeBall(ballId, 18, { open: true })),
          ),
        )
        .child(
          h_flex()
            .id("tab-scroll")
            .flex_1()
            .min_w(0)
            .h_full()
            .items_center()
            .gap(4)
            .overflow_x_scrollbar()
            .track_scroll(this.scroll)
            .on_size_change((_size, cx) => { if (active >= 0) { this.scroll.scroll_to_item(active); cx.notify(); } })
            .children(shown.map(item)),
        )
        // Custom Pokemon RPG Right-side actions: + Summon, Files (Bag), Changes (VS Log)
        .child(
          rpgToolBtn(
            "tab-new",
            svg(iconAsset("plus")).size(11).text_color(p.red),
            "New",
            false,
            "Summon Agent / New Tab / New Poké Ball Space",
            () => openPokeNewMenu(),
          ),
        )
        .when(enabled.includes("files"), (el) =>
          el.child(
            rpgToolBtn(
              "panel-files",
              "bag",
              "Files",
              panelOn("files"),
              "Trainer's Bag · Project Files",
              () => {
                if (panelOn("files")) run("layout.hide", { id: "panel" });
                else { run("layout.select", { stack: "panel-body", child: "files" }); run("layout.show", { id: "panel" }); }
              },
            ),
          ),
        )
        .when(enabled.includes("changes"), (el) =>
          el.child(
            rpgToolBtn(
              "panel-changes",
              "vs",
              "Changes",
              panelOn("changes"),
              "VS Log · Git Changes & Diff",
              () => {
                if (panelOn("changes")) run("layout.hide", { id: "panel" });
                else { run("layout.select", { stack: "panel-body", child: "changes" }); run("layout.show", { id: "panel" }); }
              },
            ),
          ),
        )
        .when(w?.buttons, (el) =>
          el
            .child(rpgToolBtn("win-min", div().child("−"), "", false, "Minimize", () => run("window.minimize")))
            .child(rpgToolBtn("win-max", div().child("□"), "", false, "Maximize", () => run("window.maximize")))
            .child(rpgToolBtn("win-close", svg(iconAsset("close")).size(10), "", false, "Close", () => run("window.close"))),
        ),
    );
  }
}
