// Sleek Floating Top-Right Notification Card!
// Icon: Open Poke Ball with anime golden spiky starburst "!" (or emerald "✓" for done).
// Right side: concise, high-clarity professional copy.

import { div, image, svg } from "gpui-kit";
import { v_flex, h_flex } from "gpui-base";
import { props, closeOverlay, openOverlay, run, shared, setShared, checking } from "herdr";
import { palette, iconAsset, MOD, WIN_W_KEY } from "./kit.js";

const TOAST_ID_KEY = "herdr-pokemon.toast-id";
export const LAST_TOAST_KEY = "herdr-pokemon.last-toast";

function formatCopy(pr) {
  const rawTitle = String(pr.title ?? "").trim();
  const rawBody = String(pr.body ?? "").split("\n", 1)[0].trim();

  // Turn verbose "Antigravity needs you" / "open-ses / 1" into concise pro copy:
  // Headline: space/target ("open-ses"), Badge: "Waiting" / "Done", Sub: "Antigravity"
  const needsMatch = /^(.+?)\s+(?:needs you|is waiting|blocked)$/i.exec(rawTitle);
  const doneMatch = /^(.+?)\s+(?:finished|done|completed)$/i.exec(rawTitle);

  if (needsMatch && rawBody) {
    const space = rawBody.split(/\s*\/\s*/)[0] || rawBody;
    return {
      kind: "alert",
      headline: space,
      badge: "Waiting",
      sub: `${needsMatch[1]} · Input required`,
    };
  }
  if (doneMatch && rawBody) {
    const space = rawBody.split(/\s*\/\s*/)[0] || rawBody;
    return {
      kind: "done",
      headline: space,
      badge: "Done",
      sub: `${doneMatch[1]} · Task complete`,
    };
  }
  const kind = pr.level === "success" ? "done" : "alert";
  return {
    kind,
    headline: rawTitle || "Notice",
    badge: pr.level === "error" ? "Error" : pr.level === "success" ? "Done" : null,
    sub: rawBody || null,
  };
}

export default class Toast {
  init(pr, cx) {
    this.p = pr ?? props() ?? {};
    this.floating = Boolean(this.p.floating);
    if (checking()) return;

    // Relocate Herdr's bottom-right toast to Herdr's overall top-right rounded corner,
    // inset cleanly (12px from right, 10px from top) so borders never overlap!
    // Omit `key` so Herdr never reuses a stale saved position when the window resizes.
    if (!this.floating && this.p.overlay) {
      const winW = Number(shared(WIN_W_KEY)) || 1280;
      const w = 264;
      const h = 54;
      const x = Math.max(16, Math.round(winW - w - 12));
      const y = 10;
      const { overlay, ...rest } = this.p;
      const info = formatCopy(rest);
      setShared(LAST_TOAST_KEY, { key: `${info.kind}:${info.headline}`, at: Date.now() });
      closeOverlay(overlay);
      const prev = shared(TOAST_ID_KEY);
      if (typeof prev === "string") closeOverlay(prev);
      const nextId = openOverlay({
        mod: MOD,
        kind: "window",
        frame: "none",
        width: w,
        height: h,
        at: { x, y },
        props: { role: "toast", floating: true, ...rest },
      });
      setShared(TOAST_ID_KEY, nextId);
      return;
    }

    const info = formatCopy(this.p);
    const defaultMs = info.kind === "alert" ? 6000 : 4500;
    const ms = Number(this.p.timeout) > 0 ? Number(this.p.timeout) : defaultMs;
    cx.timer.after(ms, () => {
      const id = props()?.overlay;
      if (id) closeOverlay(id);
    });
  }

  render() {
    if (!this.floating) return div();
    const p = palette();
    const pr = this.p ?? props() ?? {};
    const info = formatCopy(pr);
    const isDone = info.kind === "done";

    // Subtle tinted card surface + crisp semantic border so notifications pop cleanly over white/dark terminals!
    const cardBg = isDone
      ? (p.dark ? "#132a1f" : "#f0fdf4")
      : (p.dark ? "#2b2010" : "#fffbeb");
    const cardHover = isDone
      ? (p.dark ? "#173526" : "#dcfce7")
      : (p.dark ? "#362814" : "#fef3c7");
    const cardBorder = isDone
      ? (p.dark ? "#22c55e88" : "#86efac")
      : (p.dark ? "#f59e0b88" : "#fcd34d");
    const badgeBg = isDone
      ? (p.dark ? "#166534" : "#bbf7d0")
      : (p.dark ? "#92400e" : "#fde68a");
    const badgeFg = isDone
      ? (p.dark ? "#bbf7d0" : "#15803d")
      : (p.dark ? "#fef3c7" : "#92400e");

    return div()
      .id("poke-toast-card")
      .size_full()
      .p(2)
      .child(
        h_flex()
          .size_full()
          .px(11)
          .gap(10)
          .items_center()
          .rounded(11)
          .border_1()
          .border_color(cardBorder)
          .bg(cardBg)
          .shadow_lg()
          .cursor_pointer()
          .hover((s) => s.bg(cardHover))
          .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
          .on_click(() => {
            if (pr.action?.name) run(pr.action.name, pr.action.args ?? {});
            closeOverlay(props().overlay);
          })
          // 45-deg side-angle left-opening Poke Ball + anime starburst icon
          .child(
            div()
              .size(36)
              .flex_none()
              .flex()
              .items_center()
              .justify_center()
              .child(image(iconAsset(isDone ? "toast-done" : "toast-alert")).size(36)),
          )
          // Concise professional copy
          .child(
            v_flex()
              .flex_1()
              .min_w(0)
              .gap(2)
              .child(
                h_flex()
                  .items_center()
                  .gap(6)
                  .child(div().min_w(0).truncate().text_size(12.5).font_semibold().text_color(p.fg).child(info.headline))
                  .when(Boolean(info.badge), (el) =>
                    el.child(
                      div()
                        .flex_none()
                        .px(5)
                        .py(1)
                        .rounded(4)
                        .bg(badgeBg)
                        .text_size(9.5)
                        .font_semibold()
                        .text_color(badgeFg)
                        .child(info.badge),
                    ),
                  ),
              )
              .when(Boolean(info.sub), (el) =>
                el.child(div().truncate().text_size(11).text_color(p.muted).child(info.sub)),
              ),
          )
          // Subtle close button
          .child(
            div()
              .id("toast-x")
              .size(20)
              .flex_none()
              .flex()
              .items_center()
              .justify_center()
              .rounded(5)
              .text_color(p.dim)
              .hover((s) => s.bg(badgeBg).text_color(p.fg))
              .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
              .on_click((_e, cx) => { cx.stop_propagation(); closeOverlay(props().overlay); })
              .child(svg("mods/pane/close.svg").size(10)),
          ),
      );
  }
}
