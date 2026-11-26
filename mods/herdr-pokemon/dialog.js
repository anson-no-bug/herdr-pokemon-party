// Authentic GBA/NDS Double-Bordered Pokemon RPG Dialogs:
//   - "confirm": Replaces Herdr's stock "Close space?" / "Close tab?" dialog with a Pokemon RPG dialogue box!
//   - "prompt":  RPG text input dialog for renaming spaces / tabs.
//   - "settings": Quick GBA Retro vs Balanced Soft style, Daylight/Night theme, Biome, Time, Weather panel.

import { div, image, svg } from "gpui-kit";
import { v_flex, h_flex, InputState, Input } from "gpui-base";
import { props, closeOverlay, run, shared, setShared, settings } from "herdr";
import {
  palette, isRetro, styleMode, STYLE_KEY, BIOME_KEY, BIOME_INTERVAL_KEY, WEATHER_KEY, WEATHER_INTERVAL_KEY, TIME_KEY,
  lang, setLang, isZh, tr, rpgFrame, rpgButton, pokeBall, iconAsset, applyBadgeFont,
} from "./kit.js";
import { BIOMES, WEATHERS, biomeIntervalMin, weatherIntervalMin } from "./habitat.js";

export default class Dialog {
  init(pr, cx) {
    this.p = pr ?? props() ?? {};
    this.kind = this.p.kind ?? "confirm";
    this.sel = 1; // default focus on Confirm (0 = Cancel, 1 = Confirm)
    this.handle = cx.focus_handle();
    if (this.kind === "prompt") {
      this.input = InputState.new({ placeholder: this.p.placeholder ?? "Enter a name…" });
      if (this.p.value) this.input.set_value(String(this.p.value));
      this.input.on("submit", () => this.submitPrompt());
      this.input.focus();
      cx.timer.after(120, () => this.input.focus());
    } else {
      this.handle.focus();
    }
  }

  close() {
    closeOverlay(props().overlay);
  }

  confirmYes() {
    const cmd = this.p.command;
    this.close();
    if (cmd?.name) run(cmd.name, cmd.args ?? {});
  }

  submitPrompt() {
    const val = this.input?.value?.() ?? "";
    const cmd = this.p.command;
    this.close();
    if (cmd?.name) run(cmd.name, { ...(cmd.args ?? {}), name: val.trim() });
  }

  renderConfirm() {
    const p = palette();
    const d = this.p;
    const ballId = d.ball ?? "poke";

    // Standard destructive-dialog pattern (HIG / Linear):
    // - Cancel stays neutral (never red); Close keeps destructive red semantics in both states.
    // - The keyboard-selected button is ALWAYS solid-filled + surrounded by a crisp 2px focus ring!
    const btn = (id, label, idx, destructive, onClick) => {
      const selected = this.sel === idx;
      const bg = selected
        ? (destructive ? p.red : p.ink)
        : (destructive ? (p.dark ? "#2c181b" : "#fef2f2") : p.surface);
      const fg = selected
        ? "#ffffff"
        : (destructive ? p.red : p.fg);
      const border = selected
        ? (destructive ? p.red : p.ink)
        : (destructive ? (p.dark ? "#5c262d" : "#fca5a5") : p.input);
      const ring = selected
        ? (destructive ? "#ef444466" : "#3b82f688")
        : "#00000000";

      return div()
        .p(2)
        .rounded(9)
        .border(2)
        .border_color(ring)
        .child(
          h_flex()
            .id(id)
            .h(28)
            .px(14)
            .items_center()
            .justify_center()
            .rounded(6)
            .border_1()
            .border_color(border)
            .bg(bg)
            .text_color(fg)
            .text_size(12.2)
            .font_medium()
            .cursor_pointer()
            .hover((s) => s.opacity(0.9))
            .on_hover((on, cx) => { if (on && this.sel !== idx) { this.sel = idx; cx.notify(); } })
            .on_click(onClick)
            .child(label),
        );
    };

    return div()
      .id("poke-confirm")
      .track_focus(this.handle)
      .on_key_down((e, cx) => {
        if (e.key === "escape") this.close();
        else if (e.key === "left" || e.key === "right" || e.key === "tab") {
          this.sel = this.sel === 0 ? 1 : 0;
          cx.notify();
        } else if (e.key === "enter") {
          if (this.sel === 1) this.confirmYes();
          else this.close();
        } else return;
        cx.stop_propagation();
      })
      .size_full()
      .rounded(12)
      .border_1()
      .border_color(p.border)
      .bg(p.popover)
      .overflow_hidden()
      .child(
        v_flex()
          .size_full()
          // Structured content header: icon badge + 2-line title/caption hierarchy
          .child(
            h_flex()
              .flex_1()
              .px(18)
              .gap(13)
              .items_center()
              .child(
                h_flex()
                  .size(38)
                  .flex_none()
                  .rounded(10)
                  .bg(p.dark ? "#2c1d22" : "#fef2f2")
                  .border_1()
                  .border_color(p.dark ? "#4c262d" : "#fecaca")
                  .items_center()
                  .justify_center()
                  // Closed Poke Ball = recalling/closing the space
                  .child(pokeBall(ballId, 22, { open: false })),
              )
              .child(
                v_flex()
                  .flex_1()
                  .min_w(0)
                  .gap(2)
                  .child(div().truncate().text_size(14).font_semibold().text_color(p.fg).child(d.title ?? "Close space?"))
                  .when(Boolean(d.caption), (el) =>
                    el.child(div().truncate().text_size(12).text_color(p.muted).child(d.caption)),
                  ),
              ),
          )
          // Crisp separated action footer
          .child(
            h_flex()
              .h(50)
              .flex_none()
              .px(16)
              .items_center()
              .justify_between()
              .bg(p.chrome)
              .rounded_b(11)
              .border_t(1)
              .border_color(p.border)
              .child(
                div()
                  .text_size(11)
                  .text_color(p.dim)
                  .child("← → Select"),
              )
              .child(
                h_flex()
                  .gap(4)
                  .child(btn("dlg-cancel", d.cancelLabel ?? "Cancel", 0, false, () => this.close()))
                  .child(btn("dlg-confirm", d.confirmLabel ?? "Close", 1, true, () => this.confirmYes())),
              ),
          ),
      );
  }

  renderPrompt() {
    const p = palette();
    const d = this.p;
    return rpgFrame(
      v_flex()
        .id("poke-prompt")
        .size_full()
        .p(16)
        .gap(12)
        .on_key_down((e, cx) => {
          if (e.key === "escape") { this.close(); cx.stop_propagation(); }
        })
        .child(
          h_flex().items_center().justify_between()
            .child(
              h_flex().gap(8).items_center()
                .when(Boolean(d.ball), (el) => el.child(pokeBall(d.ball, 20, { open: true })))
                .child(
                  v_flex().gap(1)
                    .child(div().text_size(14.5).font_bold().text_color(p.fg).child(d.title ?? "Rename"))
                    .when(Boolean(d.subtitle), (el) => el.child(div().text_size(11).text_color(p.muted).child(d.subtitle))),
                ),
            )
            .child(applyBadgeFont(div().text_size(9.5).text_color(p.dim).child("ESC"))),
        )
        .child(
          Input.new(this.input)
            .h(34)
            .px(10)
            .rounded(isRetro() ? 3 : 6)
            .border(2)
            .border_color(p.frameOuter)
            .bg(p.bg)
            .text_size(13)
            .text_color(p.fg),
        )
        .child(
          h_flex().justify_end().gap(8)
            .child(rpgButton("pr-cancel", "Cancel", () => this.close(), { variant: "neutral" }))
            .child(rpgButton("pr-ok", "Save", () => this.submitPrompt(), { variant: "teal", cursor: true })),
        ),
    );
  }

  renderSettings(cx) {
    const p = palette();
    const curStyle = styleMode();
    const curBiome = shared(BIOME_KEY) ?? "meadow";
    const curWeather = shared(WEATHER_KEY) ?? "clear";
    const curTime = shared(TIME_KEY) ?? "auto";
    const dark = Boolean(settings()?.dark);

    const chip = (id, label, active, onClick) =>
      h_flex()
        .id(id)
        .h(26)
        .px(10)
        .gap(5)
        .items_center()
        .rounded(isRetro() ? 3 : 6)
        .border(active ? 2 : 1)
        .border_color(active ? p.frameOuter : p.frameInner)
        .bg(active ? p.selected : p.surface)
        .text_size(11.5)
        .font_medium()
        .text_color(active ? p.fg : p.muted)
        .cursor_pointer()
        .hover((s) => s.bg(p.hover))
        .on_click((_e, cx) => { onClick(); cx.notify(); })
        .when(active, (el) => el.child(svg(iconAsset("cursor")).size(7).text_color(p.red)))
        .child(label);

    const section = (title, rowEl) =>
      v_flex().gap(6)
        .child(applyBadgeFont(div().text_size(9.5).font_bold().text_color(p.muted).child(title)))
        .child(rowEl);

    return rpgFrame(
      v_flex()
        .id("poke-settings")
        .track_focus(this.handle)
        .on_key_down((e, cx) => {
          if (e.key === "escape") { this.close(); cx.stop_propagation(); }
        })
        .size_full()
        .p(16)
        .gap(12)
        .child(
          h_flex().items_center().justify_between()
            .child(
              h_flex().gap(8).items_center()
                .child(image(iconAsset("pokedex")).size(20))
                .child(div().text_size(15).font_bold().text_color(p.fg).child(tr("主题与生态设置", "Theme & Habitat Settings", "テーマ・生態園設定", "테마 및 생태원 설정"))),
            )
            .child(applyBadgeFont(div().text_size(9.5).text_color(p.dim).child("ESC"))),
        )
        .child(
          section(
            tr("语言", "LANGUAGE", "言語", "언어"),
            h_flex().gap(6).flex_wrap()
              .child(chip("lg-zh", "中文", lang() === "zh", () => setLang("zh")))
              .child(chip("lg-en", "English", lang() === "en", () => setLang("en")))
              .child(chip("lg-ja", "日本語", lang() === "ja", () => setLang("ja")))
              .child(chip("lg-ko", "한국어", lang() === "ko", () => setLang("ko"))),
          ),
        )
        .child(
          section(
            tr("界面风格", "UI STYLE", "UI スタイル", "UI 스타일"),
            h_flex().gap(6).flex_wrap()
              .child(chip("st-bal", tr("简约克制（推荐）", "Clean Restrained (Recommended)", "クリーン（推奨）", "깔끔한 모드 (추천)"), curStyle === "balanced", () => setShared(STYLE_KEY, "balanced")))
              .child(chip("st-retro", tr("复古像素风", "GBA Retro Pixel", "GBA レトロドット", "GBA 레트로 픽셀"), curStyle === "retro", () => setShared(STYLE_KEY, "retro"))),
          ),
        )
        .child(
          section(
            tr("主题配色", "COLOR THEME", "カラーテーマ", "컬러 테마"),
            h_flex().gap(6).flex_wrap()
              .child(chip("th-day", tr("浅色白天", "Clean Light", "ライト", "라이트"), !dark, () => run("app.theme", { name: "herdr-pokemon" })))
              .child(chip("th-night", tr("深色夜晚", "Dark Slate", "ダーク", "다크"), dark, () => run("app.theme", { name: "herdr-pokemon-night" }))),
          ),
        )
        .child(
          section(
            tr("生态地图", "HABITAT BIOME", "生態園マップ", "생태원 맵"),
            h_flex().gap(6).flex_wrap()
              .children(BIOMES.map((b) => chip(`bm-${b.id}`, tr(b.cn, b.name, b.ja, b.ko), curBiome === b.id, () => setShared(BIOME_KEY, b.id)))),
          ),
        )
        .child(
          section(
            tr("昼夜光线", "TIME OF DAY", "時間帯", "시간대"),
            h_flex().gap(6).flex_wrap()
              .children([
                ["auto", tr("自动", "Auto", "自動", "자동")],
                ["day", tr("白天", "Day", "昼", "낮")],
                ["dusk", tr("黄昏", "Dusk", "夕方", "노을")],
                ["night", tr("夜晚", "Night", "夜", "밤")],
              ].map(([tm, lbl]) => chip(`tm-${tm}`, lbl, curTime === tm, () => setShared(TIME_KEY, tm)))),
          ),
        )
        .child(
          section(
            tr("天气", "WEATHER", "天候", "날씨"),
            h_flex().gap(6).flex_wrap()
              .children(WEATHERS.map((w) => chip(`wt-${w.id}`, tr(w.cn, w.label, w.ja, w.ko), curWeather === w.id, () => setShared(WEATHER_KEY, w.id)))),
          ),
        )
        .child(div().flex_1())
        .child(h_flex().justify_end().child(rpgButton("st-done", tr("完成", "Done", "完了", "완료"), () => this.close(), { variant: "teal", cursor: true }))),
    );
  }

  renderHabitatPrefs() {
    const p = palette();
    const curBiome = shared(BIOME_KEY) ?? "meadow";
    const curMapMin = biomeIntervalMin();
    const curWMin = weatherIntervalMin();
    const curLang = lang();

    const seg = (id, label, active, onClick) =>
      h_flex()
        .id(id)
        .h(24)
        .px(8)
        .flex_1()
        .items_center()
        .justify_center()
        .rounded(6)
        .border_1()
        .border_color(active ? p.blue : p.border)
        .bg(active ? p.selected : p.surface)
        .text_size(11)
        .font_medium()
        .text_color(active ? p.fg : p.muted)
        .cursor_pointer()
        .hover((s) => s.bg(p.hover).text_color(p.fg))
        .on_click(onClick)
        .child(label);

    const mapOpts = [
      { v: 0, label: tr("关闭", "Off", "オフ", "끄기") },
      { v: 10, label: tr("10分", "10m", "10分", "10분") },
      { v: 30, label: tr("30分", "30m", "30分", "30분") },
      { v: 60, label: tr("1小时", "1h", "1時間", "1시간") },
      { v: 120, label: tr("2小时", "2h", "2時間", "2시간") },
    ];
    const wOpts = [
      { v: 0, label: tr("关闭", "Off", "オフ", "끄기") },
      { v: 3, label: tr("3分", "3m", "3分", "3분") },
      { v: 10, label: tr("10分", "10m", "10分", "10분") },
      { v: 30, label: tr("30分", "30m", "30分", "30분") },
    ];

    return rpgFrame(
      v_flex()
        .id("poke-hab-prefs")
        .track_focus(this.handle)
        .on_key_down((e, cx) => { if (e.key === "escape") { this.close(); cx.stop_propagation(); } })
        .w_full()
        .p(12)
        .gap(10)
        // 4-Language global selector (ZH / EN / JA / KO)
        .child(
          v_flex().gap(5)
            .child(div().text_size(10.5).font_semibold().text_color(p.muted).child(tr("显示语言", "Language", "表示言語", "표시 언어")))
            .child(
              h_flex().gap(4)
                .child(seg("hp-lang-zh", "中文", curLang === "zh", () => setLang("zh")))
                .child(seg("hp-lang-en", "EN", curLang === "en", () => setLang("en")))
                .child(seg("hp-lang-ja", "日本語", curLang === "ja", () => setLang("ja")))
                .child(seg("hp-lang-ko", "한국어", curLang === "ko", () => setLang("ko"))),
            ),
        )
        // Quick 7-biome icon row
        .child(
          v_flex().gap(5)
            .child(div().text_size(10.5).font_semibold().text_color(p.muted).child(tr("生态地图", "Map", "マップ", "맵")))
            .child(
              h_flex().gap(4).items_center().children(
                BIOMES.map((b) => {
                  const on = b.id === curBiome;
                  return h_flex()
                    .id(`hp-b-${b.id}`)
                    .flex_1()
                    .h(28)
                    .items_center()
                    .justify_center()
                    .rounded(7)
                    .border_1()
                    .border_color(on ? p.blue : p.border)
                    .bg(on ? p.selected : p.surface)
                    .cursor_pointer()
                    .hover((s) => s.bg(p.hover))
                    .tooltip(tr(b.cn, b.name, b.ja, b.ko))
                    .on_click(() => setShared(BIOME_KEY, b.id))
                    .child(image(iconAsset(`env-${b.id}`)).size(15));
                }),
              ),
            ),
        )
        // Map auto-rotation interval
        .child(
          v_flex().gap(5)
            .child(div().text_size(10.5).font_semibold().text_color(p.muted).child(tr("地图轮换间隔", "Map Rotation", "マップ自動切替", "맵 자동 전환")))
            .child(
              h_flex().gap(4).children(
                mapOpts.map((o) => seg(`hp-mi-${o.v}`, o.label, curMapMin === o.v, () => setShared(BIOME_INTERVAL_KEY, o.v))),
              ),
            ),
        )
        // Weather auto-rotation interval
        .child(
          v_flex().gap(5)
            .child(div().text_size(10.5).font_semibold().text_color(p.muted).child(tr("天气轮换间隔", "Weather Cycle", "天候自動切替", "날씨 자동 전환")))
            .child(
              h_flex().gap(4).children(
                wOpts.map((o) => seg(`hp-wi-${o.v}`, o.label, curWMin === o.v, () => setShared(WEATHER_INTERVAL_KEY, o.v))),
              ),
            ),
        ),
      { autoHeight: true },
    );
  }

  render(cx) {
    if (this.kind === "prompt") return this.renderPrompt();
    if (this.kind === "settings") return this.renderSettings(cx);
    if (this.kind === "habitat-prefs") return this.renderHabitatPrefs();
    return this.renderConfirm();
  }
}
