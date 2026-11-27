// PokeNav Trainer HUD Status Bar (bottom of the window).
// Clean & spacious: keeps a dedicated Master Ball dock at the far bottom-right corner at all times
// so when you recall the Habitat into it, you immediately see where your Pokémon live & how to release them!

import { div, svg, image } from "gpui-kit";
import { h_flex } from "gpui-base";
import { spaces, agents, run, window, keys, setShared, layout } from "herdr";
import { palette, applyUiFont, tr, findNode, pokeBall, iconAsset, HABITAT_RELEASE_KEY, HABITAT_RECALL_KEY } from "./kit.js";
import { ballForSpace } from "./pokemon.js";

export default class Status {
  paletteHint() {
    const mac = window()?.platform === "macos";
    const mod = { cmd: mac ? "⌘" : "Ctrl+", ctrl: mac ? "⌃" : "Ctrl+", shift: mac ? "⇧" : "Shift+", alt: mac ? "⌥" : "Alt+", option: mac ? "⌥" : "Alt+" };
    const b = keys().find((k) => k.section === "global" && k.action === "app.palette");
    const parts = b && b.keys.endsWith("--") ? [...b.keys.slice(0, -2).split("-"), "-"] : b?.keys.split("-");
    const key = parts && parts.map((x) => mod[x.toLowerCase()] ?? x.toUpperCase()).join("");
    return key ? `${key} Commands` : "Commands";
  }

  render() {
    const p = palette();
    const space = spaces().find((s) => s.active);
    const ballId = ballForSpace(space);
    const list = agents();
    const needs = list.filter((a) => a.status === "blocked").length;
    const habHidden = Boolean(findNode(layout(), "pokemon-habitat")?.hidden);

    return applyUiFont(
      h_flex()
        .size_full()
        .px(12)
        .gap(12)
        .items_center()
        .bg(p.chrome)
        .border_t(1)
        .border_color(p.border)
        .text_size(11.5)
        .text_color(p.muted)
        .child(
          h_flex().gap(6).items_center()
            .child(pokeBall(ballId, 14, { open: true }))
            .child(div().font_medium().text_color(p.fg).child(space?.machine ?? "Local Region")),
        )
        .when(Boolean(space?.branch), (el) =>
          el.child(
            h_flex().gap(5).items_center()
              .child(svg(iconAsset("branch")).size(11).text_color(p.teal))
              .child(space.branch),
          ),
        )
        .child(
          h_flex().gap(5).items_center()
            .child(div().size(7).rounded_full().bg(needs > 0 ? p.blocked : p.teal))
            .child(tr(`队伍 ${list.length}`, `Party ${list.length}`, `パーティ ${list.length}`, `파티 ${list.length}`))
            .when(needs > 0, (el) => el.child(div().font_semibold().text_color(p.blocked).child(tr(`· ${needs} 等待处理`, `· ${needs} waiting!`, `· ${needs} 待機中`, `· ${needs} 대기 중`)))),
        )
        .child(div().flex_1())
        .child(
          div()
            .id("st-palette")
            .px(7)
            .h(22)
            .flex()
            .items_center()
            .rounded(6)
            .text_color(p.dim)
            .cursor_pointer()
            .hover((s) => s.bg(p.hover).text_color(p.fg))
            .on_click(() => run("app.palette"))
            .child(this.paletteHint()),
        )
        .child(div().w(1).h(14).bg(p.border))
        // Persistent, Spacious Pixel-Art Master Ball Dock at the far bottom-right corner!
        // Always anchored here so recalling the Habitat visually docks straight into this ball,
        // and clicking it smoothly bursts open & unfolds the Habitat back out!
        .child(
          h_flex()
            .id("st-masterball-orb")
            .relative()
            .size(28)
            .items_center()
            .justify_center()
            .rounded_full()
            .when(habHidden, (el) =>
              el
                .bg("#7c3aed2a")
                .border_1()
                .border_color("#a855f7aa")
                .shadow_sm(),
            )
            .when(!habHidden, (el) =>
              el
                .bg(p.hover)
                .border_1()
                .border_color(p.border)
                .opacity(0.78),
            )
            .cursor_pointer()
            .hover((s) => s.bg("#7c3aed3d").border_color("#c084fc").opacity(1))
            .tooltip(
              habHidden
                ? tr("点击大师球放出宝可梦生态园", "Click Master Ball to release Pokémon Habitat", "マスターボールを押して生態園を展開", "마스터볼을 눌러 생태원 열기")
                : tr("点击收入大师球并隐藏生态园", "Click to recall Habitat into Master Ball", "マスターボールに生態園を収納", "마스터볼에 생태원 수납"),
            )
            .on_click(() => {
              if (habHidden) {
                setShared(HABITAT_RELEASE_KEY, Date.now());
                run("layout.show", { id: "pokemon-habitat" });
              } else {
                setShared(HABITAT_RECALL_KEY, Date.now());
              }
            })
            .child(
              div()
                .relative()
                .size(20)
                .child(image(iconAsset("pixel-masterball")).size(20)),
            ),
        ),
    );
  }
}
