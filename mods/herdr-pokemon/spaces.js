// Spaces as Poke Balls!
// "For Pokemon, a space IS a Poke Ball."
// Every space displays its own pixel-art Poke Ball (10 iconic types, auto-assigned & right-click switchable),
// opens with a warm golden glow when active, shows agent status pips, nests worktrees, and opens
// our Pokemon RPG context menu & Close Space dialog.

import { div, image, svg } from "gpui-kit";
import { v_flex, h_flex, ScrollHandle } from "gpui-base";
import { spaces, machines, panes, run, exec, hc, watchFolder, window, checking } from "herdr";
import {
  palette, isRetro, applyUiFont, applyBadgeFont, pokeBall, iconAsset,
  isSidebarNarrow, openPokeMenu, openPokeDialog,
} from "./kit.js";
import { ballForSpace } from "./pokemon.js";

function place(s, ps) {
  const tabs = new Set((s.tabs ?? []).map((c) => c.id));
  return ps.find((p) => tabs.has(p.tab) && p.cwd)?.cwd || s.folder;
}
const where = (s, ps) => JSON.stringify([s.machine ?? null, place(s, ps)]);
const base = (path) => path.replace(/\/+$/, "").split("/").pop();
const repoName = (common) => {
  if (common.endsWith("/.git")) return base(common.slice(0, -5));
  const own = base(common);
  return own === ".bare" ? base(common.slice(0, -own.length - 1)) : own.replace(/\.git$/, "");
};
const FALLBACK = 60000;
const AT_ONCE = 6;
const SIDE_MIN = 48;
const RAIL_CELL = 34;

async function both(a, b) {
  const done = await Promise.allSettled([a, b]);
  const failed = done.find((d) => d.status === "rejected");
  if (failed) throw failed.reason;
  return done.map((d) => d.value);
}

export default class Spaces {
  init(_p, cx) {
    this.git = {};
    this.checked = {};
    this.unsure = new Set();
    this.pending = new Set();
    this.busy = {};
    this.ready = {};
    this.at = {};
    this.watching = new Map();
    this.shown = new Set(spaces().map((s) => s.id));
    this.born = {};
    this.pressed = null;
    this.over = null;
    this.scroll = ScrollHandle.new();
    this.activeAt = -1;
    this.machines = [];
    try { this.folded = new Set(JSON.parse(localStorage.getItem("poke.machines.folded") ?? "[]")); }
    catch { this.folded = new Set(); }
    if (checking()) return;
    this.refreshMachines(cx);
    cx.timer.every(30000, (cx) => this.refreshMachines(cx));
    cx.timer.every(1500, (cx) => this.checkNew(cx));
  }

  checkNew(cx) {
    if (window()?.visible === false) return;
    const now = Date.now();
    const sp = spaces();
    for (const s of sp) if (!this.shown.has(s.id)) this.born[s.id] ??= now;
    const due = this.due(now, sp, panes());
    if (due.size) this.refreshGit(due, cx);
    if (sp.some((s) => !this.shown.has(s.id))) cx.notify();
  }

  due(now, sp, ps) {
    const at = {};
    for (const s of sp) at[s.id] = where(s, ps);
    const keys = new Set(Object.values(at).filter((k) => JSON.parse(k)[1]));
    for (const k of Object.keys(this.git)) if (!keys.has(k)) {
      delete this.git[k]; delete this.checked[k]; this.unsure.delete(k);
    }
    const repos = new Set(Object.values(this.git).filter(Boolean).map((g) => g.repo));
    for (const [repo, pending] of this.watching) if (!repos.has(JSON.stringify([null, repo]))) {
      this.watching.delete(repo); pending.cancel();
    }
    const due = new Set([...keys].filter((k) => !(k in this.git)));
    for (const [id, k] of Object.entries(at)) if (this.at[id] && this.at[id] !== k && keys.has(k)) due.add(k);
    this.at = at;
    const spaceOf = {};
    for (const s of sp) for (const t of s.tabs ?? []) spaceOf[t.id] = s;
    const busy = {};
    for (const p of ps) {
      if (!p.terminal || !spaceOf[p.tab]) continue;
      busy[p.pane] = p.status === "working" || !(p.program?.shell || p.program?.agent);
      if (this.busy[p.pane] && !busy[p.pane]) this.sameRepo(at[spaceOf[p.tab].id], keys).forEach((k) => due.add(k));
    }
    this.busy = busy;
    for (const m of machines()) {
      const ready = m.layout === "ready";
      if (ready && this.ready[m.name] === false) for (const k of keys) if (JSON.parse(k)[0] === m.name) due.add(k);
      this.ready[m.name] = ready;
    }
    if (window()?.active) {
      for (const k of keys) {
        const asks = this.git[k] || this.unsure.has(k);
        if (asks && !this.folded.has(JSON.parse(k)[0]) && now - (this.checked[k] ?? 0) > FALLBACK) due.add(k);
      }
    }
    return due;
  }

  sameRepo(key, keys) {
    const repo = this.git[key]?.repo;
    return [key, ...(repo ? [...keys].filter((k) => this.git[k]?.repo === repo) : [])];
  }

  refreshMachines(cx) {
    if (window()?.visible === false) return;
    cx.spawn(async (cx) => {
      try {
        const r = await hc(["machine", "ls", "--json"]);
        if (r.code === 0) {
          const next = (JSON.parse(r.stdout).machines ?? []).filter((m) => !m.temporary);
          if (JSON.stringify(next) !== JSON.stringify(this.machines)) {
            this.machines = next;
            cx.notify();
          }
        }
      } catch {}
    });
  }

  refreshGit(keys, cx) {
    for (const k of keys) this.pending.add(k);
    if (this.refreshing) return;
    this.refreshing = true;
    cx.spawn(async (cx) => {
      while (this.pending.size) {
        const batch = [...this.pending];
        this.pending.clear();
        let next = 0;
        await Promise.all(Array.from({ length: Math.min(AT_ONCE, batch.length) }, async () => {
          while (next < batch.length) await this.check(batch[next++], cx);
        }));
      }
      this.refreshing = false;
      cx.notify();
    });
  }

  async check(key, cx) {
    const [on, cwd] = JSON.parse(key);
    this.checked[key] = Date.now();
    this.unsure.delete(key);
    try {
      const [r, common] = await both(
        exec("git", ["rev-parse", "--path-format=absolute", "--show-toplevel"], { cwd, on }),
        exec("git", ["rev-parse", "--path-format=absolute", "--git-common-dir"], { cwd, on }),
      );
      if (r.code !== 0 || common.code !== 0) {
        if (!/not a git repository/i.test(r.code !== 0 ? r.stderr : common.stderr)) {
          this.unsure.add(key); this.git[key] ??= null;
        } else this.git[key] = null;
        return;
      }
      const top = r.stdout.replace(/\n$/, ""), repo = common.stdout.replace(/\n$/, "");
      const [branch, counts] = await both(
        exec("git", ["symbolic-ref", "-q", "HEAD"], { cwd, on }),
        exec("git", ["rev-list", "--left-right", "--count", "HEAD...@{upstream}"], { cwd, on }),
      );
      const name = repoName(repo);
      const [ahead, behind] = counts.code === 0 ? counts.stdout.trim().split(/\s+/).map(Number) : [0, 0];
      this.git[key] = {
        name,
        branch: branch.code === 0 ? branch.stdout.trim().replace(/^refs\/heads\//, "") : "(detached)",
        ahead, behind,
        repo: JSON.stringify([on, repo]),
        linked: repo !== `${top}/.git`,
      };
      if (!on) this.watch(repo, cx);
    } catch {
      this.git[key] ??= null;
      this.unsure.add(key);
    }
  }

  watch(repo, cx) {
    if (this.watching.has(repo)) return;
    const pending = watchFolder(repo);
    this.watching.set(repo, pending);
    cx.spawn(async (cx) => {
      let current = pending;
      try {
        for (;;) {
          await current;
          if (this.watching.get(repo) !== current) return;
          const mine = JSON.stringify([null, repo]);
          const keys = Object.keys(this.git).filter((k) => this.git[k]?.repo === mine);
          if (!keys.length) break;
          this.refreshGit(keys, cx);
          current = watchFolder(repo);
          this.watching.set(repo, current);
        }
      } catch {}
      if (this.watching.get(repo) === current) this.watching.delete(repo);
    });
  }

  ordered() {
    const sp = spaces(), ps = panes();
    const ready = (w) => this.shown.has(w.id) || where(w, ps) in this.git || Date.now() - (this.born[w.id] ??= Date.now()) > 1500;
    for (const w of sp) if (!this.shown.has(w.id) && ready(w)) this.shown.add(w.id);
    const list = sp.map((w, i) => ({ w, i, g: this.git[where(w, ps)] ?? null }));
    const mains = new Set(list.filter((r) => r.g && !r.g.linked).map((r) => r.g.repo));
    const nested = (r) => r.g?.linked && mains.has(r.g.repo);
    const out = [];
    const placed = new Set();
    for (const r of list) {
      if (nested(r)) continue;
      out.push({ ...r, tree: null });
      if (!r.g || r.g.linked || placed.has(r.g.repo)) continue;
      placed.add(r.g.repo);
      const kids = list.filter((k) => nested(k) && k.g.repo === r.g.repo);
      kids.forEach((k, n) => out.push({ ...k, tree: n === kids.length - 1 ? "└─" : "├─" }));
    }
    return out.filter((r) => this.shown.has(r.w.id));
  }

  gitTail(g, tree, name, p) {
    const raw = g.branch ?? "detached";
    const same = (a) => a.toLowerCase() === name.toLowerCase();
    const branch = same(raw) || raw === "master" || raw === "main" ? "" : raw;
    const repo = tree || same(g.name) ? "" : g.name;
    const whereTxt = [repo, branch].filter(Boolean).join(" · ");
    return h_flex()
      .flex_auto()
      .min_w(whereTxt ? SIDE_MIN : 0)
      .gap(4)
      .justify_end()
      .items_center()
      .text_size(11)
      .text_color(p.dim)
      .when(Boolean(whereTxt), (el) => el.child(div().min_w(0).truncate().child(whereTxt)))
      .when(g.ahead > 0, (el) => el.child(div().flex_none().text_color(p.done).child(`↑${g.ahead}`)))
      .when(g.behind > 0, (el) => el.child(div().flex_none().text_color(p.blocked).child(`↓${g.behind}`)));
  }

  ballWithStatus(w, p, size = 20) {
    const ballId = ballForSpace(w);
    const st = w.status;
    const showPip = st === "blocked" || st === "done" || st === "working";
    return div()
      .relative()
      .size(size)
      .flex_none()
      .child(pokeBall(ballId, size, { open: w.active }))
      .when(showPip, (el) =>
        el.child(
          div()
            .absolute()
            .right(-2)
            .bottom(-2)
            .size(7)
            .rounded_full()
            .border_1()
            .border_color(p.chrome)
            .bg(p[st] ?? p.idle),
        ),
      );
  }

  row({ w, i, g, tree }, p) {
    const on = w.active;
    const retro = isRetro();
    const fromIndex = this.pressed === null ? -1 : spaces().findIndex((s) => s.id === this.pressed);
    return v_flex()
      .relative()
      .id(`space-${w.id}`)
      .px(7)
      .h(tree ? 28 : 34)
      .flex_none()
      .justify_center()
      .rounded(retro ? 3 : 8)
      .border(on ? (retro ? 2 : 1) : 1)
      .border_color(on ? p.frameOuter : "#00000000")
      .when(on, (el) => el.bg(p.selected))
      .when(!on, (el) => el.hover((s) => s.bg(p.hover)))
      .cursor_pointer()
      .when(this.pressed === w.id && this.over !== w.id, (el) => el.opacity(0.5))
      .when(this.pressed !== null && this.over === w.id && this.pressed !== w.id, (el) =>
        el.child(
          div().absolute().left(0).right(0).h(2).bg(p.teal)
            .when(fromIndex < i, (line) => line.bottom(0))
            .when(fromIndex > i, (line) => line.top(0)),
        ),
      )
      .on_mouse_down("left", () => { this.pressed = w.id; this.over = w.id; })
      .on_mouse_move((_e, cx) => {
        const source = spaces().find((s) => s.id === this.pressed);
        const over = source && (source.machine ?? null) === (w.machine ?? null) ? w.id : null;
        if (this.pressed !== null && this.over !== over) { this.over = over; cx.notify(); }
      })
      .on_mouse_up("left", (_e, cx) => {
        const from = this.pressed, over = this.over;
        this.pressed = null; this.over = null;
        if (from !== null && over === w.id && from !== w.id) {
          const index = spaces().findIndex((s) => s.id === w.id);
          if (index !== -1) run("space.move", { id: from, index: index + 1 });
        } else if (from === w.id) run("space.select", { id: w.id });
        cx.notify();
      })
      .on_mouse_down("right", (_e, cx) => {
        cx.stop_propagation();
        openPokeMenu("space", { id: w.id });
      })
      .child(
        h_flex()
          .gap(8)
          .items_center()
          .when(Boolean(tree), (el) => el.pl(18).child(svg(iconAsset("branch")).size(12).flex_none().text_color(p.dim)))
          .when(!tree, (el) => el.child(this.ballWithStatus(w, p, 20)))
          .child(div().flex_initial().min_w(SIDE_MIN).truncate().font_medium().text_color(on ? p.fg : p.muted).child(w.name))
          .child(g ? this.gitTail(g, tree, w.name, p) : div().flex_1()),
      );
  }

  compact({ w }, p) {
    return h_flex()
      .flex_none()
      .justify_center()
      .child(
        h_flex()
          .id(`space-rail-${w.id}`)
          .w(RAIL_CELL)
          .h(30)
          .rounded(isRetro() ? 3 : 6)
          .border_1()
          .border_color(w.active ? p.frameOuter : "#00000000")
          .justify_center()
          .items_center()
          .when(w.active, (el) => el.bg(p.selected))
          .when(!w.active, (el) => el.hover((s) => s.bg(p.hover)))
          .cursor_pointer()
          .tooltip(`${w.name} (${w.tabs?.length ?? 0} tabs)`)
          .on_click(() => run("space.select", { id: w.id }))
          .on_mouse_down("right", (_e, cx) => { cx.stop_propagation(); openPokeMenu("space", { id: w.id }); })
          .child(this.ballWithStatus(w, p, 20)),
      );
  }

  render() {
    const p = palette();
    const collapsed = isSidebarNarrow();
    const rows = this.ordered();
    const sp = spaces();
    const draw = (r) => (collapsed ? this.compact(r, p) : this.row(r, p));

    this.activeAt = rows.findIndex((r) => r.w.active);
    const active = sp.find((x) => x.active)?.id;
    if (active !== this.revealed || this.activeAt !== this.revealedAt) {
      this.revealed = active;
      this.revealedAt = this.activeAt;
      if (this.activeAt >= 0) this.scroll.scroll_to_item(this.activeAt);
    }

    return applyUiFont(
      v_flex()
        .size_full()
        .min_h(0)
        .bg(p.chrome)
        .text_size(12.5)
        .child(
          h_flex()
            .h(32)
            .pl(collapsed ? 0 : 12)
            .pr(collapsed ? 0 : 8)
            .items_center()
            .justify_between()
            .when(collapsed, (el) => el.justify_center())
            .when(!collapsed, (el) =>
              el.child(
                h_flex().gap(6).items_center()
                  .child(div().text_size(11.5).font_semibold().text_color(p.muted).child("Spaces"))
                  .child(div().text_size(11).text_color(p.dim).child(`${sp.length}`)),
              ),
            )
            .child(
              div()
                .id("space-new")
                .size(24)
                .flex_none()
                .flex()
                .items_center()
                .justify_center()
                .rounded(isRetro() ? 3 : 6)
                .border_1()
                .border_color("#00000000")
                .text_color(p.muted)
                .cursor_pointer()
                .tooltip("New Poké Ball Space (⌘N)")
                .hover((s) => s.bg(p.hover).border_color(p.frameOuter).text_color(p.fg))
                .on_click(() => run("space.new"))
                .child(svg(iconAsset("plus")).size(12)),
            ),
        )
        .child(
          v_flex()
            .flex_1()
            .min_h(0)
            .px(collapsed ? 0 : 7)
            .pb(10)
            .gap(2)
            .overflow_y_scrollbar()
            .mode("always")
            .track_scroll(this.scroll)
            .on_size_change((_size, cx) => { if (this.activeAt >= 0) { this.scroll.scroll_to_item(this.activeAt); cx.notify(); } })
            .on_mouse_up("left", (_e, cx) => { this.pressed = null; cx.notify(); })
            .children(rows.map(draw)),
        ),
    );
  }
}
