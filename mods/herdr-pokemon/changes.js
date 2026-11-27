// VS Log (Changes Panel) — Git Changes, Diff Preview & Quick Commit in GBA Pokemon RPG style!

import { div, svg, image } from "gpui-kit";
import { v_flex, h_flex, InputState, Input } from "gpui-base";
import { spaces, panes, focused, exec, readTextFile, watchFolder, run, layout, window, checking } from "herdr";
import { palette, isRetro, applyUiFont, applyBadgeFont, rpgButton, iconAsset, findNode } from "./kit.js";

function location() {
  const space = spaces().find((s) => s.active), f = focused();
  const pane = f?.pane ? panes().find((p) => p.pane === f.pane) : null;
  const on = f?.pane === null ? (f.terminal?.includes("/") ? f.terminal.split("/")[0] : null) : space?.machine ?? null;
  return { cwd: pane?.cwd || f?.cwd || space?.folder, on };
}
const key = () => JSON.stringify(location());
const READ = ["--no-optional-locks", "-c", "core.fsmonitor=false", "-c", "diff.autoRefreshIndex=false"];

export default class ChangesPanel {
  init(_p, cx) {
    this.files = [];
    this.diffLines = [];
    this.open = null;
    this.message = "";
    this.busy = false;
    this.note = null;
    this.error = null;
    this.input = InputState.new({ placeholder: "Commit message…" });
    this.input.on("change", (_e, cx) => { this.message = this.input.value(); cx.notify(); });
    this.input.on("submit", (_e, cx) => this.commit(cx));
    this.dirty = false;
    if (checking()) return;
    if (this.isShown()) this.refresh(cx);
    cx.timer.every(10000, (cx) => {
      if (!this.isShown() || window()?.active === false) return;
      this.refresh(cx);
    });
  }

  isShown() {
    const root = layout();
    const panel = findNode(root, "panel");
    const body = findNode(root, "panel-body");
    return Boolean(panel && !panel.hidden && body?.active === "changes");
  }

  current(ctx) { return this.context === ctx && key() === ctx.key; }

  watch(root, ctx, cx) {
    if (ctx.on || ctx.watch?.root === root) return;
    ctx.watch?.pending?.cancel();
    const watch = { root };
    ctx.watch = watch;
    cx.spawn(async (cx) => {
      try {
        while (this.context === ctx && ctx.watch === watch) {
          watch.pending = watchFolder(root);
          const paths = await watch.pending;
          if (paths.length && ctx.watch === watch && this.current(ctx)) {
            if (!this.isShown() || window()?.visible === false) this.dirty = true;
            else this.refresh(cx);
          }
        }
      } catch { if (ctx.watch === watch) ctx.watch = null; }
    });
  }

  refresh(cx) {
    const { cwd, on } = location(), next = key();
    if (next !== this.context?.key) {
      this.context?.watch?.pending?.cancel();
      this.context = { key: next, cwd, on };
      this.root = null; this.files = []; this.open = null; this.diffLines = [];
      this.error = null; this.note = null; this.loading = false;
    }
    if (!cwd || this.loading || this.busy) return;
    const ctx = this.context;
    this.loading = true;
    cx.spawn(async (cx) => {
      try {
        const top = await exec("git", ["rev-parse", "--show-toplevel"], { cwd, on });
        if (!this.current(ctx)) return;
        if (top.code !== 0) { this.root = null; this.files = []; this.diffLines = []; this.error = "Not a git repository"; return; }
        const root = top.stdout.trim();
        const git = (args) => exec("git", [...READ, ...args], { cwd: root, on });
        this.watch(root, ctx, cx);
        const status = await git(["status", "--porcelain=v1", "-z", "--no-renames", "--untracked-files=all"]);
        if (!this.current(ctx)) return;
        if (status.code !== 0) throw new Error(status.stderr);
        const entries = status.stdout.split("\0").filter(Boolean).slice(0, 500);
        const files = entries.map((entry) => {
          const xy = entry.slice(0, 2), path = entry.slice(3), fresh = xy === "??";
          const s = xy.includes("U") ? "U" : xy.includes("D") ? "D" : fresh || xy.includes("A") ? "A" : "M";
          return { path, status: s, fresh };
        });
        this.root = root; this.on = on; this.files = files; this.error = null;
        if (this.open && !files.some((f) => f.path === this.open)) { this.open = null; this.diffLines = []; }
        if (!this.open && files.length) this.open = files[0].path;
        if (this.open) await this.loadDiff(this.open, ctx);
      } catch (e) { if (this.current(ctx)) this.error = String(e); }
      finally { if (this.context === ctx) this.loading = false; cx.notify(); }
    });
  }

  async loadDiff(path, ctx) {
    const file = this.files.find((f) => f.path === path);
    if (!file || !this.root) { this.diffLines = []; return; }
    try {
      let raw = "";
      if (file.fresh) {
        const text = await readTextFile(`${this.root}/${path}`, { on: this.on });
        raw = text ? text.split("\n").slice(0, 120).map((l) => `+${l}`).join("\n") : "(binary or unreadable)";
      } else {
        const r = await exec("git", [...READ, "diff", "HEAD", "--", path], { cwd: this.root, on: this.on });
        raw = r.stdout || "(no textual diff)";
      }
      if (!this.current(ctx) || this.open !== path) return;
      this.diffLines = raw.split("\n").slice(0, 160);
    } catch { this.diffLines = ["(cannot load diff)"]; }
  }

  commit(cx) {
    const msg = this.message.trim();
    if (!msg || !this.root || this.busy) return;
    this.busy = true; this.note = null; cx.notify();
    const root = this.root, on = this.on;
    cx.spawn(async (cx) => {
      try {
        const add = await exec("git", ["add", "-A"], { cwd: root, on });
        if (add.code !== 0) throw new Error(add.stderr);
        const cm = await exec("git", ["commit", "-m", msg], { cwd: root, on });
        if (cm.code !== 0) throw new Error(cm.stderr || cm.stdout);
        this.message = ""; this.input.set_value("");
        this.note = "Committed!";
      } catch (e) { this.note = String(e.message ?? e); }
      finally { this.busy = false; this.refresh(cx); cx.notify(); }
    });
  }

  render(cx) {
    if (this.isShown() && (this.dirty || key() !== this.context?.key)) {
      this.dirty = false;
      this.refresh(cx);
    }
    const p = palette();
    const retro = isRetro();

    return applyUiFont(
      v_flex()
        .size_full()
        .min_h(0)
        .rounded(retro ? 4 : 10)
        .border(retro ? 2 : 1)
        .border_color(p.frameOuter)
        .bg(p.surface)
        .overflow_hidden()
        .child(
          h_flex()
            .h(38)
            .px(12)
            .gap(8)
            .flex_none()
            .items_center()
            .bg(p.surface)
            .border_b(1)
            .border_color(p.border)
            .child(div().flex_1().text_size(12.8).font_semibold().text_color(p.fg).child(`Changes (${this.files.length})`))
            .child(
              div()
                .id("chg-close")
                .size(22)
                .flex().items_center().justify_center()
                .rounded(5).text_color(p.dim).cursor_pointer()
                .hover((s) => s.bg(p.hover).text_color(p.fg))
                .on_click(() => run("layout.hide", { id: "panel" }))
                .child(svg("mods/pane/close.svg").size(11)),
            ),
        )
        .when(Boolean(this.error), (el) => el.child(div().p(12).text_size(12).text_color(p.dim).child(this.error)))
        .when(!this.error && this.files.length === 0, (el) =>
          el.child(div().p(12).text_size(12).text_color(p.dim).child("Working tree clean! No changes.")),
        )
        // Changed files list
        .when(this.files.length > 0, (el) =>
          el.child(
            v_flex()
              .h(180)
              .flex_none()
              .p(6)
              .gap(2)
              .overflow_y_scrollbar()
              .mode("always")
              .children(
                this.files.map((f) => {
                  const sel = this.open === f.path;
                  const col = f.status === "A" ? p.done : f.status === "D" ? p.blocked : p.working;
                  return h_flex()
                    .id(`cg-${f.path}`)
                    .h(25)
                    .px(7)
                    .gap(7)
                    .items_center()
                    .flex_none()
                    .rounded(retro ? 3 : 5)
                    .bg(sel ? p.selected : "#00000000")
                    .hover((s) => s.bg(p.hover))
                    .cursor_pointer()
                    .on_click((_e, cx) => {
                      this.open = f.path;
                      const ctx = this.context;
                      cx.spawn(async (cx) => { await this.loadDiff(f.path, ctx); cx.notify(); });
                    })
                    .child(div().w(14).flex_none().text_size(10.5).font_bold().text_color(col).child(f.status))
                    .child(div().flex_1().min_w(0).truncate().text_size(11.5).text_color(sel ? p.fg : p.muted).child(f.path));
                }),
              ),
          ),
        )
        // Diff viewer
        .when(this.diffLines.length > 0, (el) =>
          el.child(
            v_flex()
              .flex_1()
              .min_h(0)
              .border_t(retro ? 2 : 1)
              .border_color(p.frameOuter)
              .bg(p.bg)
              .p(6)
              .overflow_y_scrollbar()
              .mode("always")
              .children(
                this.diffLines.map((line, i) => {
                  const add = line.startsWith("+") && !line.startsWith("+++");
                  const del = line.startsWith("-") && !line.startsWith("---");
                  const hunk = line.startsWith("@@");
                  return div()
                    .id(`dl-${i}`)
                    .px(4)
                    .text_size(11)
                    .text_color(add ? p.done : del ? p.blocked : hunk ? p.blue : p.muted)
                    .child(line || " ");
                }),
              ),
          ),
        )
        // Commit Bar
        .when(Boolean(this.root), (el) =>
          el.child(
            v_flex()
              .flex_none()
              .p(8)
              .gap(6)
              .bg(p.chrome)
              .border_t(retro ? 2 : 1)
              .border_color(p.frameOuter)
              .when(Boolean(this.note), (n) => n.child(div().text_size(10.5).text_color(p.teal).truncate().child(this.note)))
              .child(
                h_flex().gap(6)
                  .child(
                    Input.new(this.input)
                      .flex_1()
                      .h(30)
                      .px(8)
                      .rounded(retro ? 3 : 6)
                      .border_1()
                      .border_color(p.frameOuter)
                      .bg(p.bg)
                      .text_size(12)
                      .text_color(p.fg),
                  )
                  .child(rpgButton("chg-commit", this.busy ? "…" : "Commit", (_e, cx) => this.commit(cx), { variant: "teal", h: 30, px: 10 })),
              ),
          ),
        ),
    );
  }
}
