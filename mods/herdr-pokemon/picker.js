// Pokedex & Poke Ball Picker Dialog!
// Clean macOS/Linear-inspired chrome:
//   - Header band with current partner summary + compact Shiny & Lock Evo toggles
//   - Recessed search bar + single-line segmented Generation tabs (zero awkward wrapping!)
//   - Perfectly proportioned 6x4 card grid (24 per page, zero half-clipped rows!) with true on-demand icon loading
//   - Quiet footer band with subtle Cry switcher & minimalist pagination

import { div, image, svg } from "gpui-kit";
import { h_flex, v_flex, InputState, Input } from "gpui-base";
import { props, closeOverlay, shared, setShared, playSound, notify, checking } from "herdr";
import {
  palette, isRetro, isZh, tr, alpha, rpgFrame, pokeBall, iconAsset,
  BALL_TYPES,
} from "./kit.js";
import {
  GEN_TABS, genOf, nameOf, matchPokedex, savePicks, resetSlotXp, resetSlotMoves, movesForSlot, setBallForSpace,
  ensureIconsFor, hasMenuIcon, menuIconPath, CRY_SETS, crySetOf, CRY_KEY, ensureCry,
  isShiny, rollShinyForSlot, isEvoLocked, setEvoLocked, sizeScaleOf, sizeLabelOf,
} from "./pokemon.js";

const PAGE_SIZE = 24; // Exact 6 cols x 4 rows fit inside 660x590 dialog with zero vertical clipping!

export default class Picker {
  init(pr, cx) {
    this.p = pr ?? props() ?? {};
    this.mode = this.p.mode ?? "pokemon";
    this.filter = "";
    this.genTab = genOf(this.p.current ?? 25);
    const initialList = matchPokedex("", this.genTab);
    const curIdx = initialList.indexOf(this.p.current ?? 25);
    this.page = curIdx >= 0 ? Math.floor(curIdx / PAGE_SIZE) : 0;
    this.loadedKey = "";
    this.handle = cx.focus_handle();
    if (this.mode === "pokemon") {
      this.input = InputState.new({ placeholder: tr("搜索宝可梦名称或编号…", "Search Pokémon by name or #number…") });
      this.input.on("change", (_e, cx) => {
        this.filter = this.input.value();
        this.page = 0;
        this.loadVisibleIcons(cx);
        cx.notify();
      });
      this.input.on("submit", () => {
        const shown = matchPokedex(this.input.value(), this.genTab);
        if (shown.length === 1) this.choosePokemon(shown[0]);
      });
      this.input.focus();
      if (!checking()) {
        cx.timer.after(180, () => this.input.focus());
        this.loadVisibleIcons(cx);
      }
    } else {
      this.handle.focus();
    }
  }

  visibleSlice() {
    const shown = matchPokedex(this.filter, this.genTab);
    const totalPages = Math.max(1, Math.ceil(shown.length / PAGE_SIZE));
    const page = Math.max(0, Math.min(this.page, totalPages - 1));
    this.page = page;
    const slice = shown.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
    return { shown, slice, page, totalPages };
  }

  // Strictly on-demand: only downloads/caches icons for the <=24 cards currently on screen!
  loadVisibleIcons(cx) {
    if (checking()) return;
    const { slice } = this.visibleSlice();
    const missing = slice.filter((id) => !hasMenuIcon(id));
    if (!missing.length) return;
    const key = missing.join(",");
    if (key === this.loadedKey) return;
    this.loadedKey = key;
    cx.spawn(async (cx) => {
      try { await ensureIconsFor(missing); }
      catch {}
      cx.notify();
    });
  }

  choosePokemon(id) {
    savePicks({ [this.p.slot]: id });
    if (id !== this.p.current) {
      resetSlotXp(this.p.slot);
      resetSlotMoves(this.p.slot);
      movesForSlot(this.p.slot, id);
      const shinyHit = rollShinyForSlot(this.p.slot);
      if (shinyHit) {
        notify({
          title: tr("✨ 遇见了稀有闪光宝可梦！", "✨ Rare Shiny Pokémon Encountered!"),
          body: tr(`恭喜！这只 ${nameOf(id)} 是极稀有的闪光个体！`, `Lucky! This ${nameOf(id)} is a rare Shiny!`),
          level: "info",
          timeout: 5000,
        });
      }
    }
    closeOverlay(props().overlay);
  }

  chooseBall(ballId) {
    if (this.p.spaceId) setBallForSpace(this.p.spaceId, ballId);
    closeOverlay(props().overlay);
  }

  setCries(set, cx) {
    setShared(CRY_KEY, set);
    cx.notify();
    const id = this.p.current;
    if (!(id >= 1)) return;
    cx.spawn(async () => {
      try {
        const path = await ensureCry(id, set);
        if (path && crySetOf(shared(CRY_KEY)) === set) playSound(path);
      } catch {}
    });
  }

  closeBtn(p) {
    return h_flex()
      .id("pk-close-x")
      .size(26)
      .flex_none()
      .items_center()
      .justify_center()
      .rounded(7)
      .text_color(p.dim)
      .cursor_pointer()
      .hover((el) => el.bg(p.hover).text_color(p.fg))
      .tooltip(tr("关闭 (Esc)", "Close (Esc)"))
      .on_click(() => closeOverlay(props().overlay))
      .child(svg(iconAsset("close")).size(12));
  }

  renderBallPicker() {
    const p = palette();
    const current = this.p.currentBall ?? "poke";
    const rCard = isRetro() ? 4 : 10;

    return rpgFrame(
      v_flex()
        .id("ball-picker")
        .track_focus(this.handle)
        .on_key_down((e, cx) => { if (e.key === "escape") { closeOverlay(props().overlay); cx.stop_propagation(); } })
        .size_full()
        .min_h(0)
        // Clean header band
        .child(
          h_flex()
            .h(56)
            .px(18)
            .flex_none()
            .items_center()
            .justify_between()
            .bg(p.chrome)
            .border_b(1)
            .border_color(p.border)
            .child(
              h_flex().gap(10).items_center()
                .child(
                  h_flex().size(32).rounded(8).bg(p.surface).border_1().border_color(p.border).items_center().justify_center()
                    .child(pokeBall(current, 20, { open: true })),
                )
                .child(
                  v_flex().gap(1)
                    .child(div().text_size(14).font_semibold().text_color(p.fg).child(tr("选择精灵球", "Choose Poké Ball")))
                    .child(div().text_size(11).text_color(p.muted).child(tr(`${this.p.spaceName ?? "当前空间"} · 空间专属精灵球`, `${this.p.spaceName ?? "Current Space"} · Space Poké Ball`))),
                ),
            )
            .child(this.closeBtn(p)),
        )
        // Grid body
        .child(
          div().flex_1().min_h(0).p(16).overflow_y_scrollbar().child(
            h_flex().flex_wrap().gap(10).children(
              BALL_TYPES.map((b) => {
                const on = b.id === current;
                return v_flex()
                  .id(`bpick-${b.id}`)
                  .w(116)
                  .h(100)
                  .p(8)
                  .gap(6)
                  .items_center()
                  .justify_center()
                  .rounded(rCard)
                  .border(on ? 2 : 1)
                  .border_color(on ? b.accent : p.border)
                  .bg(on ? alpha(b.accent, p.dark ? "22" : "12") : p.surface)
                  .hover((s) => s.bg(p.hover).border_color(on ? b.accent : p.input))
                  .cursor_pointer()
                  .on_click(() => this.chooseBall(b.id))
                  .child(
                    h_flex().gap(8).items_center()
                      .child(pokeBall(b.id, 28, { open: false }))
                      .child(pokeBall(b.id, 28, { open: true })),
                  )
                  .child(div().text_size(11.5).font_semibold().text_color(p.fg).child(isZh() ? b.cn : b.name));
              }),
            ),
          ),
        ),
    );
  }

  renderPokemonPicker(cx) {
    const p = palette();
    const { shown, slice, page, totalPages } = this.visibleSlice();
    const curCry = crySetOf(shared(CRY_KEY));
    const slot = this.p.slot;
    const curId = this.p.current ?? 25;
    const shinyOn = isShiny(slot);
    const evoLocked = isEvoLocked(slot);
    const szScale = sizeScaleOf(slot);
    const szTag = sizeLabelOf(szScale);
    const searching = Boolean(this.filter.trim());
    const r = isRetro() ? 4 : 8;

    // Clear macOS-style sliding toggle switch: knob on LEFT + neutral track = OFF, knob on RIGHT + accent track = ON.
    // Label always stays fixed so current ON/OFF state is unmistakable at a glance!
    const toggleSwitch = (id, on, accentCol, label, tip, onClick) =>
      h_flex()
        .id(id)
        .h(26)
        .pl(9)
        .pr(6)
        .gap(7)
        .items_center()
        .rounded_full()
        .border_1()
        .border_color(on ? alpha(accentCol, p.dark ? "66" : "44") : p.border)
        .bg(on ? alpha(accentCol, p.dark ? "1c" : "0d") : p.surface)
        .cursor_pointer()
        .hover((el) => el.bg(on ? alpha(accentCol, p.dark ? "28" : "16") : p.hover))
        .tooltip(tip)
        .on_click(onClick)
        .child(
          div()
            .text_size(11)
            .font_medium()
            .text_color(on ? p.fg : p.muted)
            .child(label),
        )
        .child(
          h_flex()
            .w(26)
            .h(15)
            .p(2)
            .rounded_full()
            .items_center()
            .when(on, (el) => el.justify_end().bg(accentCol))
            .when(!on, (el) => el.justify_start().bg(p.dark ? "#3a4359" : "#cbd5e1"))
            .child(
              div()
                .size(11)
                .rounded_full()
                .bg("#ffffff")
                .shadow_sm(),
            ),
        );

    const navBtn = (id, label, disabled, onClick) =>
      h_flex()
        .id(id)
        .h(26)
        .px(10)
        .items_center()
        .justify_center()
        .rounded(7)
        .border_1()
        .border_color(disabled ? "#00000000" : p.border)
        .bg(disabled ? "#00000000" : p.surface)
        .text_size(11.5)
        .font_medium()
        .text_color(disabled ? p.dim : p.fg)
        .opacity(disabled ? 0.45 : 1)
        .when(!disabled, (el) => el.cursor_pointer().hover((s) => s.bg(p.hover)).on_click(onClick))
        .child(label);

    return rpgFrame(
      v_flex()
        .id("poke-picker")
        .size_full()
        .min_h(0)
        .bg(p.popover)
        .on_key_down((e, cx) => {
          if (e.key === "escape") { closeOverlay(props().overlay); cx.stop_propagation(); }
        })
        // 1. Clean Top Header Band (56px)
        .child(
          h_flex()
            .h(56)
            .px(16)
            .flex_none()
            .items_center()
            .justify_between()
            .gap(10)
            .bg(p.chrome)
            .border_b(1)
            .border_color(p.border)
            .child(
              h_flex().gap(10).items_center().min_w(0)
                .child(
                  h_flex()
                    .size(34)
                    .flex_none()
                    .rounded(9)
                    .bg(p.surface)
                    .border_1()
                    .border_color(p.border)
                    .items_center()
                    .justify_center()
                    .child(
                      hasMenuIcon(curId)
                        ? image(menuIconPath(curId)).w(30).h(23)
                        : image(iconAsset("pokedex")).size(20),
                    ),
                )
                .child(
                  v_flex().gap(1).min_w(0)
                    .child(div().text_size(13.8).font_semibold().text_color(p.fg).child(tr("选择搭档", "Choose Partner")))
                    .child(
                      div().text_size(11).text_color(p.muted).truncate().child(
                        tr(
                          `${this.p.tag ?? "智能体"} · #${String(curId).padStart(3, "0")} ${nameOf(curId)}${shinyOn ? " ✦" : ""} · 体型 ${szTag} (${Math.round(szScale * 100)}%)`,
                          `${this.p.tag ?? "Agent"} · #${String(curId).padStart(3, "0")} ${nameOf(curId)}${shinyOn ? " ✦" : ""} · Size ${szTag} (${Math.round(szScale * 100)}%)`,
                        ),
                      ),
                    ),
                ),
            )
            .child(
              h_flex().gap(6).items_center().flex_none()
                .when(Boolean(slot) && shinyOn, (el) =>
                  el.child(
                    h_flex()
                      .h(24)
                      .px(8)
                      .gap(4)
                      .items_center()
                      .rounded_full()
                      .border_1()
                      .border_color(alpha("#d97706", p.dark ? "77" : "55"))
                      .bg(alpha("#d97706", p.dark ? "22" : "14"))
                      .text_size(11)
                      .font_semibold()
                      .text_color("#d97706")
                      .tooltip(tr("稀有随机闪光个体（1/64 概率）", "Rare natural Shiny individual (1/64 odds)"))
                      .child(tr("✦ 闪光", "✦ Shiny")),
                  ),
                )
                .when(Boolean(slot), (el) =>
                  el.child(
                    toggleSwitch(
                      "pk-evolock-toggle",
                      evoLocked,
                      p.blue,
                      tr("锁定进化", "Lock Evo"),
                      evoLocked
                        ? tr("锁定进化：已开启（保持当前形态，等级照常提升）· 点击解除", "Evolution Lock: ON (keeps form, levels still grow) · Click to unlock")
                        : tr("锁定进化：已关闭（积累经验自动进化）· 点击锁定当前形态", "Evolution Lock: OFF (auto-evolves with XP) · Click to lock"),
                      (_e, cx) => { setEvoLocked(slot, !evoLocked); cx.notify(); },
                    ),
                  ),
                )
                .child(this.closeBtn(p)),
            ),
        )
        // 2. Compact Search + Single-Line Segmented Generation Bar
        .child(
          v_flex()
            .px(16)
            .pt(12)
            .pb(6)
            .gap(8)
            .flex_none()
            .child(
              Input.new(this.input)
                .h(34)
                .flex_none()
                .px(11)
                .rounded(r)
                .border_1()
                .border_color(p.input)
                .bg(p.bg)
                .text_size(12.5)
                .text_color(p.fg),
            )
            .child(
              h_flex().items_center().justify_between().gap(8)
                .child(
                  // macOS-style single-line segmented tab track (never wraps!)
                  h_flex()
                    .p(3)
                    .gap(2)
                    .rounded(r)
                    .bg(p.raised)
                    .border_1()
                    .border_color(p.frameInner)
                    .children(
                      GEN_TABS.map((g) => {
                        const active = !searching && this.genTab === g.id;
                        return h_flex()
                          .id(`gen-${g.id}`)
                          .h(24)
                          .px(10)
                          .items_center()
                          .rounded(isRetro() ? 3 : 6)
                          .bg(active ? p.surface : "#00000000")
                          .border_1()
                          .border_color(active ? p.border : "#00000000")
                          .text_size(11.2)
                          .when(active, (el) => el.font_semibold().text_color(p.fg))
                          .when(!active, (el) => el.font_medium().text_color(p.muted).hover((s) => s.text_color(p.fg)))
                          .cursor_pointer()
                          .tooltip(isZh() ? g.cn : g.label)
                          .on_click((_e, cx) => {
                            this.genTab = g.id;
                            this.page = 0;
                            if (this.filter) {
                              this.filter = "";
                              this.input.set_value("");
                            }
                            this.loadVisibleIcons(cx);
                            cx.notify();
                          })
                          .child(isZh() ? g.cn : g.label);
                      }),
                    ),
                )
                .child(
                  div().flex_none().text_size(11).text_color(p.dim).child(
                    searching ? tr(`找到 ${shown.length} 只`, `${shown.length} found`) : tr(`共 ${shown.length} 只`, `${shown.length}`),
                  ),
                ),
            ),
        )
        // 3. Perfectly Proportioned 6 x 4 Card Grid (24 cards, zero half-cut rows!)
        .child(
          div().flex_1().min_h(0).px(16).py(8).overflow_y_scrollbar().child(
            h_flex().flex_wrap().gap(8).children(
              slice.map((id) => {
                const current = id === curId;
                const ready = hasMenuIcon(id);
                return v_flex()
                  .id(`pk-${id}`)
                  .relative()
                  .w(95)
                  .h(84)
                  .flex_none()
                  .px(4)
                  .pt(6)
                  .pb(6)
                  .items_center()
                  .justify_between()
                  .rounded(isRetro() ? 4 : 10)
                  .border(current ? 2 : 1)
                  .border_color(current ? p.blue : p.frameInner)
                  .bg(current ? p.selected : p.surface)
                  .hover((s) => s.bg(current ? p.selected : p.hover).border_color(current ? p.blue : p.input))
                  .cursor_pointer()
                  .on_click(() => this.choosePokemon(id))
                  .child(
                    div()
                      .absolute()
                      .left(7)
                      .top(5)
                      .text_size(9)
                      .text_color(current ? p.blue : p.dim)
                      .child(`#${String(id).padStart(3, "0")}`),
                  )
                  .child(
                    h_flex().flex_1().items_center().justify_center().pt(4).child(
                      ready
                        ? image(menuIconPath(id)).w(56).h(42).flex_none()
                        : div().text_size(11).text_color(p.dim).child("···"),
                    ),
                  )
                  .child(
                    div()
                      .max_w(86)
                      .truncate()
                      .text_size(10.8)
                      .when(current, (el) => el.font_semibold().text_color(p.fg))
                      .when(!current, (el) => el.font_medium().text_color(p.muted))
                      .child(nameOf(id)),
                  );
              }),
            ),
          ),
        )
        // 4. Quiet Footer Band: Subtle Cry Segmented Switch + Minimal Pagination (44px)
        .child(
          h_flex()
            .h(44)
            .px(16)
            .flex_none()
            .items_center()
            .justify_between()
            .bg(p.chrome)
            .border_t(1)
            .border_color(p.border)
            .child(
              h_flex().gap(6).items_center()
                .child(div().text_size(11).text_color(p.dim).child(tr("叫声", "Cry")))
                .child(
                  h_flex()
                    .p(2)
                    .gap(2)
                    .rounded(7)
                    .bg(p.raised)
                    .border_1()
                    .border_color(p.frameInner)
                    .children(
                      CRY_SETS.map((s) => {
                        const on = s.id === curCry;
                        const sLbl = s.id === "letsgo" ? tr("去皮去伊", "Let's Go") : tr("经典", "Showdown");
                        return h_flex()
                          .id(`cry-${s.id}`)
                          .h(20)
                          .px(8)
                          .items_center()
                          .rounded(5)
                          .bg(on ? p.surface : "#00000000")
                          .text_size(10.5)
                          .when(on, (el) => el.font_semibold().text_color(p.fg))
                          .when(!on, (el) => el.text_color(p.muted).hover((x) => x.text_color(p.fg)))
                          .cursor_pointer()
                          .on_click((_e, cx) => this.setCries(s.id, cx))
                          .child(sLbl);
                      }),
                    ),
                ),
            )
            .when(totalPages > 1, (el) =>
              el.child(
                h_flex().gap(8).items_center()
                  .child(
                    navBtn("pk-prev", tr("‹ 上一页", "‹ Prev"), page <= 0, (_e, cx) => {
                      this.page -= 1;
                      this.loadVisibleIcons(cx);
                      cx.notify();
                    }),
                  )
                  .child(div().text_size(11).font_medium().text_color(p.muted).child(`${page + 1} / ${totalPages}`))
                  .child(
                    navBtn("pk-next", tr("下一页 ›", "Next ›"), page >= totalPages - 1, (_e, cx) => {
                      this.page += 1;
                      this.loadVisibleIcons(cx);
                      cx.notify();
                    }),
                  ),
              ),
            )
            .when(totalPages <= 1, (el) =>
              el.child(div().text_size(11).text_color(p.dim).child(tr("点击任意宝可梦切换", "Click any Pokémon to switch"))),
            ),
        ),
    );
  }

  render(cx) {
    return this.mode === "ball" ? this.renderBallPicker() : this.renderPokemonPicker(cx);
  }
}
