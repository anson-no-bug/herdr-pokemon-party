// Clean Files Panel with proper per-file-type color-coded SVG icons, lazy tree,
// git status badges, drag-to-terminal paths, and read-only syntax-highlighted preview!

import { div, svg, image } from "gpui-kit";
import { v_flex, h_flex, Editor, EditorState } from "gpui-base";
import { spaces, panes, focused, exec, readTextFile, watchFolder, theme, settings, run, checking } from "herdr";
import { palette, applyUiFont, fileIconAsset } from "./kit.js";

function location() {
  const space = spaces().find((s) => s.active), f = focused();
  const pane = f?.pane ? panes().find((p) => p.pane === f.pane) : null;
  const on = f?.pane === null ? (f.terminal?.includes("/") ? f.terminal.split("/")[0] : null) : space?.machine ?? null;
  return { cwd: pane?.cwd || f?.cwd || space?.folder, on, space: space?.id };
}
const key = () => JSON.stringify(location());
const LANG = { ts: "js", tsx: "js", mts: "js", cts: "js", jsx: "js", mjs: "js", toml: "yaml", jsonc: "json", svelte: "html", vue: "html" };
const PER_FOLDER = 400, TOTAL = 4000;

const EXT_ICON = {
  ts: "ts", mts: "ts", cts: "ts",
  tsx: "tsx",
  js: "js", mjs: "js", cjs: "js",
  jsx: "jsx",
  py: "py", pyi: "py",
  go: "go", mod: "go", sum: "go",
  rs: "rs",
  json: "json", jsonc: "json", json5: "json",
  md: "md", mdx: "md",
  html: "html", htm: "html", svelte: "html", vue: "html",
  css: "css", scss: "css", sass: "css", less: "css",
  sh: "sh", bash: "sh", zsh: "sh", fish: "sh",
  yml: "yaml", yaml: "yaml",
  toml: "toml",
  sql: "sql",
  png: "img", jpg: "img", jpeg: "img", gif: "img", svg: "img", webp: "img", ico: "img",
  lock: "lock",
  xml: "xml", plist: "xml",
  java: "java", kt: "java",
  env: "env",
};

function iconForEntry(name, isDir, isOpen) {
  if (isDir) return fileIconAsset(isOpen ? "folder-open" : "folder");
  const lower = name.toLowerCase();
  if (lower === "dockerfile" || lower.startsWith("dockerfile.") || lower.includes("docker-compose")) return fileIconAsset("docker");
  if (lower.startsWith(".git")) return fileIconAsset("git");
  if (lower.startsWith(".env")) return fileIconAsset("env");
  if (lower.endsWith(".lock") || lower === "package-lock.json" || lower === "bun.lockb" || lower === "yarn.lock") return fileIconAsset("lock");
  const ext = lower.includes(".") ? lower.split(".").pop() : "";
  return fileIconAsset(EXT_ICON[ext] ?? "file");
}

async function directory(path, on) {
  const script = 'n=0; for p in "$1"/* "$1"/.[!.]* "$1"/..?*; do [ -e "$p" ] || [ -L "$p" ] || continue; name=${p##*/}; [ "$name" = .git ] && continue; if [ -d "$p" ]; then kind=d; else kind=f; fi; printf "%s\\0%s\\0" "$kind" "$name"; n=$((n+1)); [ "$n" -gt 400 ] && break; done; test -d "$1"';
  const r = await exec("sh", ["-c", script, "files", path], { on });
  if (r.code !== 0) throw new Error(r.stderr || "Cannot list this folder");
  const fields = r.stdout.split("\0"), out = [];
  for (let i = 0; i + 1 < fields.length; i += 2) out.push({ name: fields[i + 1], dir: fields[i] === "d" });
  return out;
}

export default class FilesPanel {
  init(_p, cx) {
    this.saved = new Map();
    this.entries = new Map();
    this.folders = new Set();
    this.pending = new Set();
    this.marks = {};
    this.file = null;
    this.editor = null;
    if (checking()) return;
    this.refresh(cx);
    cx.timer.every(10000, (cx) => this.refresh(cx));
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
          if (paths.length && ctx.watch === watch && this.current(ctx)) this.refresh(cx);
        }
      } catch { if (ctx.watch === watch) ctx.watch = null; }
    });
  }

  async loadFolder(path, ctx) {
    const entries = await directory(path ? `${ctx.cwd}/${path}` : ctx.cwd, ctx.on);
    if (!this.current(ctx) || (path && !this.folders.has(path))) return;
    const used = [...this.entries.entries()].filter(([p]) => p !== path).reduce((n, [, e]) => n + e.length, 0);
    this.entries.set(path, entries.slice(0, Math.max(0, Math.min(PER_FOLDER, TOTAL - used))).sort((a, b) => Number(b.dir) - Number(a.dir) || a.name.localeCompare(b.name)));
  }

  refresh(cx) {
    const { cwd, on } = location(), next = key();
    if (next !== this.context?.key) {
      if (this.context) {
        this.saved.set(this.context.key, { folders: this.folders, file: this.file });
        this.context.watch?.pending?.cancel();
      }
      const saved = this.saved.get(next);
      this.context = { key: next, cwd, on };
      this.root = cwd; this.on = on;
      this.entries = new Map();
      this.folders = new Set(saved?.folders);
      this.pending = new Set();
      this.marks = {};
      this.show(null);
      this.error = null;
      this.loading = false;
      if (saved?.file) this.show(saved.file, cx);
    }
    if (!cwd || this.loading) return;
    const ctx = this.context;
    this.loading = true;
    cx.spawn(async (cx) => {
      try {
        this.watch(cwd, ctx, cx);
        for (const path of ["", ...this.folders]) {
          if (!this.current(ctx)) return;
          await this.loadFolder(path, ctx);
        }
        const top = await exec("git", ["rev-parse", "--show-toplevel"], { cwd, on }).catch(() => null);
        const marks = {};
        if (top?.code === 0) {
          const status = await exec("git", ["--no-optional-locks", "-c", "core.fsmonitor=false", "status", "--porcelain=v1", "-z", "--no-renames", "--untracked-files=all"], { cwd, on }).catch(() => null);
          if (status?.code === 0) {
            for (const entry of status.stdout.split("\0").filter(Boolean).slice(0, TOTAL)) {
              const xy = entry.slice(0, 2);
              marks[`${top.stdout.trim()}/${entry.slice(3)}`] = xy === "??" || xy.includes("A") ? "A" : xy.includes("U") ? "U" : xy.includes("D") ? "D" : "M";
            }
          }
        }
        if (!this.current(ctx)) return;
        this.marks = marks; this.error = null;
      } catch (e) { if (this.current(ctx)) this.error = String(e); }
      finally { if (this.context === ctx) this.loading = false; cx.notify(); }
    });
  }

  toggle(path, cx) {
    if (this.folders.has(path)) {
      for (const f of [...this.folders]) if (f === path || f.startsWith(path + "/")) { this.folders.delete(f); this.entries.delete(f); }
      cx.notify();
    } else {
      this.folders.add(path);
      if (!this.entries.has(path) && !this.pending.has(path)) {
        const ctx = this.context;
        this.pending.add(path);
        cx.spawn(async (cx) => {
          try { await this.loadFolder(path, ctx); } catch {}
          finally { this.pending.delete(path); cx.notify(); }
        });
      }
      cx.notify();
    }
  }

  show(path, cx) {
    this.editor?.release?.();
    this.file = path;
    this.editor = null;
    this.previewError = null;
    cx?.notify?.();
    if (!path || !this.root || !cx) return;
    const ctx = this.context;
    const full = `${this.root}/${path}`;
    const ext = path.includes(".") ? path.split(".").pop().toLowerCase() : "txt";
    const language = LANG[ext] ?? ext;
    cx.spawn(async (cx) => {
      try {
        const text = await readTextFile(full, { on: ctx.on });
        if (!this.current(ctx) || this.file !== path) return;
        if (text === null) { this.previewError = "This file is no longer available"; return; }
        if (text.includes("\0")) { this.previewError = "Binary file · no text preview"; return; }
        const t = theme();
        this.editor = EditorState.new({
          language,
          readonly: true,
          value: text.length > 350000 ? text.slice(0, 350000) + "\n… (file truncated)" : text,
          syntax: { keyword: t.ansi5, string: t.ansi2, comment: t.dim, function: t.ansi4, type: t.ansi3, number: t.ansi1, constant: t.ansi6 },
        });
      } catch { if (this.file === path && this.current(ctx)) this.previewError = "Cannot preview this file (binary, too large, or unreadable)"; }
      finally { cx.notify(); }
    });
  }

  flatRows(dir = "", depth = 0) {
    const out = [];
    for (const e of this.entries.get(dir) ?? []) {
      const p = dir ? `${dir}/${e.name}` : e.name;
      out.push({ ...e, path: p, depth });
      if (e.dir && this.folders.has(p)) out.push(...this.flatRows(p, depth + 1));
    }
    return out;
  }

  render(cx) {
    if (key() !== this.context?.key) this.refresh(cx);
    const p = palette();
    const rows = this.flatRows();
    const rootName = this.root ? this.root.split("/").pop() || "/" : "No folder";

    return applyUiFont(
      v_flex()
        .size_full()
        .min_h(0)
        .rounded(10)
        .border_1()
        .border_color(p.border)
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
            .when(Boolean(this.file), (el) =>
              el.child(div().id("files-back").px(4).cursor_pointer().text_color(p.muted).hover((s) => s.text_color(p.fg)).on_click((_e, cx) => { this.show(null); cx.notify(); }).child("←")),
            )
            .child(div().text_size(12.8).font_semibold().text_color(p.fg).child("Files"))
            .child(div().flex_1().min_w(0).truncate().text_right().text_size(11.5).text_color(p.dim).child(this.file ?? rootName))
            .child(
              div()
                .id("files-close")
                .size(22)
                .flex().items_center().justify_center()
                .rounded(5).text_color(p.dim).cursor_pointer()
                .hover((s) => s.bg(p.hover).text_color(p.fg))
                .on_click(() => run("layout.hide", { id: "panel" }))
                .child(svg("mods/pane/close.svg").size(11)),
            ),
        )
        .when(Boolean(this.error), (el) => el.child(div().p(10).text_size(12).text_color(p.blocked).child(this.error)))
        .when(!this.file, (el) =>
          el.child(
            v_flex()
              .id("bag-tree")
              .flex_1()
              .min_h(0)
              .p(6)
              .gap(1)
              .overflow_y_scrollbar()
              .mode("always")
              .children(
                rows.map((r) => {
                  const full = `${this.root}/${r.path}`;
                  const mark = this.marks[full];
                  const open = r.dir && this.folders.has(r.path);
                  const markCol = mark === "A" ? p.done : mark === "D" ? p.blocked : p.working;
                  return h_flex()
                    .id(`f-${r.path}`)
                    .h(26)
                    .pl(6 + r.depth * 15)
                    .pr(8)
                    .gap(6)
                    .items_center()
                    .flex_none()
                    .rounded(6)
                    .hover((s) => s.bg(p.hover))
                    .cursor_pointer()
                    .drag_paths([full], { on: this.on })
                    .on_click((_e, cx) => (r.dir ? this.toggle(r.path, cx) : this.show(r.path, cx)))
                    .child(
                      r.dir
                        ? svg(`mods/files/chevron-${open ? "down" : "right"}.svg`).size(11).flex_none().text_color(p.dim)
                        : div().w(11).flex_none(),
                    )
                    .child(image(iconForEntry(r.name, r.dir, open)).size(15).flex_none())
                    .child(div().flex_1().min_w(0).truncate().text_size(12.5).text_color(r.dir ? p.fg : p.muted).when(r.dir, (el) => el.font_medium()).child(r.name))
                    .when(Boolean(mark), (el) => el.child(div().flex_none().text_size(10.5).font_semibold().text_color(markCol).child(mark)));
                }),
              ),
          ),
        )
        .when(Boolean(this.file), (el) => {
          const s = settings();
          return el.child(
            this.editor
              ? Editor.new(this.editor).font_family(s.font_family).text_size(s.font_size).flex_1().min_h(0)
              : div().p(12).text_size(12).text_color(p.dim).child(this.previewError ?? "Loading file…"),
          );
        }),
    );
  }
}
