// Pokemon RPG Context Menu (handles space, tab, pane, and terminal_menu right-clicks!).

import { div, svg, image } from "gpui-kit";
import { v_flex, h_flex } from "gpui-base";
import { run, props, closeOverlay, openOverlay, keys, terminals, spaces, panes, exec } from "herdr";
import {
  palette, rpgFrame, iconAsset, pokeBall, openPokeDialog, openPokePicker,
  askCloseSpace, askCloseTab,
} from "./kit.js";
import { ballForSpace } from "./pokemon.js";

function place(s) {
  const tabs = new Set((s.tabs ?? []).map((c) => c.id));
  return panes().find((p) => tabs.has(p.tab) && p.cwd)?.cwd || s.folder;
}

async function checkout(folder, on) {
  const top = await exec("git", ["rev-parse", "--show-toplevel"], { cwd: folder, on });
  const common = await exec("git", ["rev-parse", "--path-format=absolute", "--git-common-dir"], { cwd: folder, on });
  if (top.code !== 0 || common.code !== 0) return null;
  return common.stdout.trim() === `${top.stdout.trim()}/.git` ? "main" : "linked";
}

function shortcut(name, args) {
  const value = args && Object.values(args)[0];
  const k = keys().find((b) => b.section === "global" && (b.action === name || b.action === `${name}:${value}`));
  return k ? k.keys : "";
}

export default class Menu {
  init(pr, cx) {
    this.p = pr ?? props() ?? {};
    this.at = 0;
    this.git = null;
    this.handle = cx.focus_handle();
    this.handle.focus();
    const space = this.p?.tab === "space" && spaces().find((s) => s.id === this.p.target?.id);
    const folder = space && place(space);
    if (folder) {
      cx.spawn(async (cx) => {
        this.git = await checkout(folder, space.machine).catch(() => null);
        cx.notify();
      });
    }
  }

  items() {
    const p = this.p ?? {};
    const tg = p.target ?? {};
    switch (p.tab) {
      case "pane": {
        const all = terminals();
        const term = all.find((t) => t.address === tg.terminal);
        const parent = term?.parent && all.find((t) => t.address === term.parent);
        const toProgram = term?.labels?.["herdr.right-click"] === "program";
        const inTab = panes().some((pn) => pn.pane === tg.pane);
        return [
          ...(inTab
            ? [
                { label: "Rename pane", cmd: "pane.rename", args: { pane: tg.pane } },
                { label: "Split right", cmd: "pane.split", args: { direction: "right", pane: tg.pane } },
                { label: "Split down", cmd: "pane.split", args: { direction: "down", pane: tg.pane } },
                { label: "Zoom pane", cmd: "pane.zoom", args: { pane: tg.pane } },
              ]
            : []),
          ...(term
            ? [
                toProgram
                  ? { label: "Use Herdr right-click menu", cmd: "terminal.right_click", args: { terminal: term.address, to: "menu" } }
                  : { label: "Send right-clicks to pane", cmd: "terminal.right_click", args: { terminal: term.address, to: "program" } },
              ]
            : []),
          ...(parent ? [{ label: `Send back to ${parent.name || parent.address}`, cmd: "terminal.park", args: { terminal: term.address } }] : []),
          ...(inTab ? [{ sep: true }, { label: "Close pane", cmd: "pane.close", args: { pane: tg.pane }, danger: true }] : []),
        ];
      }
      case "tab": {
        const sp = spaces().find((s) => s.id === tg.space) ?? spaces().find((s) => s.active);
        const tb = sp?.tabs?.find((t) => t.id === tg.id);
        return [
          { label: "Rename tab", custom: () => tb && openPokeDialog("prompt", { title: "Rename Tab", subtitle: "重命名标签页", value: tb.name, command: { name: "tab.rename", args: { id: tb.id } } }, { width: 410, height: 196 }) },
          { label: "New tab", cmd: "tab.new", args: { space: tg.space } },
          { sep: true },
          { label: "Close tab", danger: true, custom: () => tb && askCloseTab(sp, tb, ballForSpace(sp)) },
        ];
      }
      case "space": {
        const sp = spaces().find((s) => s.id === tg.id);
        const ballId = ballForSpace(sp);
        return [
          {
            label: "Choose Poké Ball…",
            ball: ballId,
            custom: () => sp && openPokePicker({ mode: "ball", spaceId: sp.id, spaceName: sp.name, currentBall: ballId }),
          },
          {
            label: "Rename space",
            custom: () => sp && openPokeDialog("prompt", { title: "Rename Space", subtitle: "重命名精灵球空间", value: sp.name, ball: ballId, command: { name: "space.rename", args: { id: sp.id } } }, { width: 410, height: 196 }),
          },
          ...(this.git
            ? [
                { label: "New worktree…", worktree: { space: tg.id, action: "new" } },
                { label: "Open worktree…", worktree: { space: tg.id, action: "open" } },
              ]
            : []),
          ...(this.git === "linked" ? [{ label: "Remove worktree…", worktree: { space: tg.id, action: "remove" } }] : []),
          { sep: true },
          { label: "Close space", danger: true, custom: () => sp && askCloseSpace(sp, ballId) },
        ];
      }
      default:
        return [
          { label: "New Poké Ball Space", cmd: "space.new", args: {} },
          { label: "Theme & Habitat Settings", custom: () => openPokeDialog("settings", {}, { width: 520, height: 430 }) },
          { label: "Keybinds", cmd: "app.help", args: {} },
        ];
    }
  }

  choose(it) {
    if (!it || it.sep) return;
    closeOverlay(props()?.overlay);
    if (it.custom) it.custom();
    else if (it.worktree) openOverlay({ mod: "worktree", kind: "dialog", ...(it.worktree.action === "open" ? { width: 560, height: 480 } : { width: 440, height: 260 }), props: it.worktree });
    else if (it.cmd) run(it.cmd, it.args ?? {});
  }

  render() {
    const p = palette();
    const list = this.items();
    const actionItems = list.filter((x) => !x.sep);
    if (this.at >= actionItems.length) this.at = Math.max(0, actionItems.length - 1);

    let idx = 0;
    return rpgFrame(
      v_flex()
        .id("poke-menu")
        .track_focus(this.handle)
        .w_full()
        .min_h(0)
        .p(6)
        .gap(2)
        .text_size(12.2)
        .on_key_down((e, cx) => {
          if (e.key === "down") this.at = (this.at + 1) % Math.max(1, actionItems.length);
          else if (e.key === "up") this.at = (this.at + actionItems.length - 1) % Math.max(1, actionItems.length);
          else if (e.key === "enter") this.choose(actionItems[this.at]);
          else if (e.key === "escape") closeOverlay(props().overlay);
          else return;
          cx.notify();
        })
        .children(
          list.map((it, rawI) => {
            if (it.sep) return div().mx(6).my(3).h(1).bg(p.frameInner);
            const myIdx = idx++;
            const selected = myIdx === this.at;
            return h_flex()
              .id(`pm-${rawI}`)
              .h(30)
              .px(8)
              .gap(8)
              .rounded(3)
              .items_center()
              .text_color(it.danger ? p.red : p.fg)
              .when(selected, (el) => el.bg(p.selected))
              .hover((s) => s.bg(p.hover))
              .cursor_pointer()
              .on_hover((on, cx) => { if (on && this.at !== myIdx) { this.at = myIdx; cx.notify(); } })
              .on_click(() => this.choose(it))
              .child(div().w(10).flex_none().child(selected ? svg(iconAsset("cursor")).size(8).text_color(it.danger ? p.red : p.fg) : ""))
              .when(Boolean(it.ball), (el) => el.child(pokeBall(it.ball, 15, { open: true })))
              .child(div().flex_1().truncate().child(it.label))
              .when(Boolean(it.cmd), (el) =>
                el.child(div().text_size(10.5).text_color(p.dim).child(shortcut(it.cmd, it.args))),
              );
          }),
        ),
      { autoHeight: true },
    );
  }
}
