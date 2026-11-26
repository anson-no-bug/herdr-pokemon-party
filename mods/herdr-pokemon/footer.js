// Clean Horizontal Sidebar Footer: Settings | Add machine (side-by-side, compact & balanced).

import { div, image } from "gpui-kit";
import { h_flex } from "gpui-base";
import { run, updates } from "herdr";
import { palette, applyUiFont, iconAsset, isSidebarNarrow } from "./kit.js";

export default class Footer {
  render() {
    const p = palette();
    const collapsed = isSidebarNarrow();
    const hasUpdate = Boolean(updates().app.ready);

    const btn = (id, ico, label, badge, action) =>
      h_flex()
        .id(id)
        .h(28)
        .when(!collapsed, (el) => el.flex_1().px(8).gap(6).justify_center())
        .when(collapsed, (el) => el.relative().w(22).justify_center().tooltip(label))
        .items_center()
        .rounded(7)
        .text_color(p.muted)
        .cursor_pointer()
        .hover((s) => s.bg(p.hover).text_color(p.fg))
        .on_click(action)
        .child(image(iconAsset(ico)).size(15).flex_none())
        .when(!collapsed, (el) => el.child(div().truncate().text_size(12).font_medium().child(label)))
        .when(Boolean(badge), (el) =>
          el.child(div().size(6).rounded_full().bg(p.blue).when(collapsed, (d) => d.absolute().top(3).right(2))),
        );

    return applyUiFont(
      h_flex()
        .size_full()
        .bg(p.chrome)
        .border_t(1)
        .border_color(p.border)
        .px(collapsed ? 3 : 8)
        .gap(collapsed ? 2 : 6)
        .items_center()
        .justify_center()
        .child(btn("ft-settings", "pokecenter", "Settings", hasUpdate, () => run("app.settings")))
        .when(!collapsed, (el) => el.child(div().w(1).h(14).bg(p.border)))
        .child(btn("ft-machine", "link", "Add machine", false, () => run("mod.open", { name: "machine-add" }))),
    );
  }
}
