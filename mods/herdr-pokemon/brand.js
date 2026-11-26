// Clean Restrained Top-Left Brand Header (zero clutter).

import { div, svg } from "gpui-kit";
import { h_flex } from "gpui-base";
import { run, window, shared, setShared, layout } from "herdr";
import { palette, applyUiFont, pokeBall, iconAsset, findNode, isSidebarNarrow } from "./kit.js";

export function toggleSidebar() {
  const width = findNode(layout(), "sidebar")?.size?.px;
  if (!isSidebarNarrow()) setShared("sidebar.width", width);
  setShared("sidebar.collapsed", !isSidebarNarrow());
  run("layout.resize", {
    id: "sidebar",
    px: isSidebarNarrow() ? (shared("sidebar.width") ?? 268) : window()?.platform === "macos" ? 76 : 44,
  });
}

export default class Brand {
  btn(id, content, tip, onClick) {
    const p = palette();
    return div()
      .id(id)
      .size(26)
      .flex_none()
      .flex()
      .items_center()
      .justify_center()
      .rounded(6)
      .text_color(p.muted)
      .cursor_pointer()
      .hover((s) => s.bg(p.hover).text_color(p.fg))
      .tooltip(tip)
      .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
      .on_click(onClick)
      .child(content);
  }

  render() {
    const p = palette();
    const collapsed = isSidebarNarrow();
    const w = window();

    return applyUiFont(
      h_flex()
        .size_full()
        .bg(p.chrome)
        .pl(collapsed ? 6 : 14)
        .pr(10)
        .gap(4)
        .items_center()
        .when(w?.platform === "macos" && !w?.fullscreen && !collapsed, (el) => el.pl(76))
        .when(!collapsed, (el) =>
          el
            .child(
              h_flex()
                .flex_1()
                .min_w(0)
                .gap(8)
                .items_center()
                .child(pokeBall("poke", 18, { open: false }))
                .child(div().truncate().text_size(13.5).font_semibold().text_color(p.fg).child("Herdr")),
            )
            .child(this.btn("brand-search", svg("mods/workspace-chrome/search.svg").size(15), "Quick Open (⌘P)", () => run("mod.open", { name: "picker" }))),
        )
        .when(!(collapsed && w?.platform === "macos"), (el) =>
          el.child(this.btn("brand-sidebar", svg("mods/workspace-chrome/sidebar.svg").size(15), "Toggle Sidebar (⌘B)", toggleSidebar)),
        ),
    );
  }
}
