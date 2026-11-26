// Pokemon Trainer Plate Pane Header!
// Shows the pane's Pokemon mini-icon (or program icon), title, live cwd, GBA HP/status badge,
// and custom RPG split/zoom/close buttons.

import { div, svg, image } from "gpui-kit";
import { h_flex } from "gpui-base";
import { panes, props, run, home, shared } from "herdr";
import { palette, isRetro, applyUiFont, hpBar, iconAsset, openPokePicker } from "./kit.js";
import { dexForPane, menuIconPath, hasMenuIcon, nameOf } from "./pokemon.js";

function shortFolder(cwd) {
  if (!cwd) return "";
  const h = home();
  return cwd === h ? "~" : cwd.startsWith(h + "/") ? "~" + cwd.slice(h.length) : cwd;
}

export default class PaneHeader {
  init() { this.hovered = false; }

  me() {
    return panes().find((pn) => pn.pane === props()?.pane);
  }

  btn(p, id, ico, tip, command, args) {
    return div()
      .id(id)
      .size(22)
      .flex()
      .items_center()
      .justify_center()
      .rounded(isRetro() ? 3 : 4)
      .border_1()
      .border_color("#00000000")
      .text_color(p.muted)
      .cursor_pointer()
      .tooltip(tip)
      .hover((s) => s.bg(p.hover).border_color(p.frameOuter).text_color(p.fg))
      .on_click((_e, cx) => { cx.stop_propagation(); run(command, args); })
      .child(svg(iconAsset(ico)).size(11));
  }

  render() {
    const p = palette();
    const retro = isRetro();
    const pn = this.me();
    if (!pn) return div();

    const dex = dexForPane(pn.pane);
    const name = pn.name || ((pn.program?.agent || pn.program?.shell) && pn.program.name) || pn.title || pn.program?.name || "shell";
    const st = pn.status;

    let pic = null;
    if (dex && hasMenuIcon(dex)) {
      pic = div()
        .id(`ph-mon-${pn.pane}`)
        .cursor_pointer()
        .tooltip(`${nameOf(dex)} · Click to change Pokémon`)
        .on_click((_e, cx) => {
          cx.stop_propagation();
          openPokePicker({ mode: "pokemon", slot: pn.pane, current: dex, tag: name });
        })
        .child(image(menuIconPath(dex)).w(22).h(17).flex_none());
    } else if (pn.program?.icon) {
      pic = pn.program.tint
        ? svg(pn.program.icon).size(14).flex_none().text_color(p.muted)
        : image(pn.program.icon).size(14).flex_none();
    }

    return applyUiFont(
      h_flex()
        .id(`pane-head-${pn.pane}`)
        .size_full()
        .px(10)
        .gap(7)
        .items_center()
        .bg(pn.focused ? p.surface : p.chrome)
        .border_b(retro ? 2 : 1)
        .border_color(p.frameOuter)
        .text_size(12)
        .on_hover((hovered, cx) => { this.hovered = hovered; cx.notify(); })
        .on_click(() => run("pane.focus", { pane: pn.pane }))
        .when(Boolean(pic), (el) => el.child(pic))
        .child(div().flex_none().truncate().max_w(240).font_semibold().text_color(p.fg).child(name))
        .when(Boolean(dex), (el) =>
          el.child(div().flex_none().px(5).py(1).rounded(retro ? 2 : 4).bg(p.raised).border_1().border_color(p.frameInner).text_size(10).text_color(p.muted).child(nameOf(dex))),
        )
        .child(div().flex_1().min_w(0).truncate().text_size(11).text_color(p.dim).child(shortFolder(pn.cwd)))
        .when(Boolean(st), (el) =>
          el.child(
            h_flex().gap(6).items_center().flex_none()
              .child(hpBar(st, 36))
              .when(st === "blocked", (b) =>
                b.child(div().px(6).h(18).flex().items_center().rounded(3).bg(p.blocked).text_size(10).font_bold().text_color("#ffffff").child("Needs you")),
              ),
          ),
        )
        .when(this.hovered, (el) =>
          el
            .child(this.btn(p, `ph-r-${pn.pane}`, "split-r", "Split Right (⌘D)", "pane.split", { direction: "right", pane: pn.pane }))
            .child(this.btn(p, `ph-d-${pn.pane}`, "split-d", "Split Down (⌘⇧D)", "pane.split", { direction: "down", pane: pn.pane }))
            .child(this.btn(p, `ph-z-${pn.pane}`, "zoom", pn.zoomed ? "Unzoom" : "Zoom (⌘⇧↵)", "pane.zoom", { pane: pn.pane }))
            .child(this.btn(p, `ph-x-${pn.pane}`, "close", "Close Pane", "pane.close", { pane: pn.pane })),
        ),
    );
  }
}
