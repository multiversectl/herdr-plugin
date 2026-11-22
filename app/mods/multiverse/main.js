// Universes: every multiversectl universe on this machine.
//
// As a side panel (props { panel: true }, beside Files and Changes): the
// universe you are in, with its state, repositories, addresses and controls
// (up, down, sync, doctor), then every universe. As a popup (mod.open, alt-u):
// the list alone. Clicking a universe opens it as a space named after it, a tab
// per repository in its checkout; one already open is shown.

import { View, div } from "gpui-kit";
import { v_flex, h_flex } from "gpui-base";
import { theme, checking, props, closeOverlay } from "herdr";
import { ICON, tone, universes, key, spaceOf, current, open, showRepo, act, urls, browse, doctor } from "./data.js";

// How often the list is read again: universes start and stop outside Herdr.
const EVERY = 10000;
const SPIN = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

export default class Universes extends View {
  init(_props, cx) {
    this.panel = Boolean(props()?.panel);
    this.list = null; // null: not read yet
    this.error = null;
    this.busy = {}; // universe key -> the verb running
    this.links = {}; // universe key -> its URLs
    if (checking()) return;
    this.refresh(cx);
    cx.timer.every(EVERY, (cx) => this.refresh(cx));
  }

  refresh(cx) {
    if (this.reading) return;
    this.reading = true;
    cx.spawn(async (cx) => {
      try {
        this.list = await universes();
        this.error = null;
      } catch (e) {
        this.error = String(e?.message ?? e);
      }
      this.reading = false;
      cx.notify();
    });
  }

  // Opened as a popup, the list closes once it has done its job.
  done() {
    const id = props()?.overlay;
    if (id) closeOverlay(id);
  }

  run(cx, u, verb) {
    const k = key(u);
    if (this.busy[k]) return;
    this.busy[k] = verb;
    cx.notify();
    cx.spawn(async (cx) => {
      await act(u, verb);
      delete this.busy[k];
      cx.notify();
      this.refresh(cx);
    });
  }

  loadLinks(cx, u) {
    const k = key(u);
    if (k in this.links) return;
    this.links[k] = null;
    cx.spawn(async (cx) => {
      try {
        this.links[k] = await urls(u);
      } catch {
        this.links[k] = [];
      }
      cx.notify();
    });
  }

  render(cx) {
    const t = theme();
    const title = (text) => div().text_size(11).font_semibold().text_color(t.dim).child(text);
    const header = h_flex().px(12).pt(12).pb(6).justify_between().items_center()
      .child(title(this.panel ? "UNIVERSE" : "UNIVERSES"))
      .child(div().id("mv-refresh").text_size(12).text_color(t.dim).px(6).rounded(4)
        .hover((s) => s.bg(t.hover).text_color(t.foreground))
        .on_click((_e, cx) => this.refresh(cx))
        .child(this.reading ? div().frames(SPIN, 90) : "↻"));

    let body;
    if (this.error) {
      body = div().px(12).text_size(12).text_color(t.blocked).child(this.error);
    } else if (this.list === null) {
      body = div().px(12).text_size(12).text_color(t.dim).child("reading…");
    } else if (this.list.length === 0) {
      body = div().px(12).text_size(12).text_color(t.dim).child("No universes. multiversectl universe new makes one.");
    } else if (this.panel) {
      const here = current(this.list);
      body = v_flex().gap(10)
        .child(here ? this.card(cx, t, here) : div().px(12).text_size(12).text_color(t.dim).child("This space is in no universe. Open one below."))
        .child(div().px(12).pt(4).child(title("ALL UNIVERSES")))
        .child(v_flex().gap(2).children(this.groups(t)));
    } else {
      body = v_flex().gap(2).children(this.groups(t));
    }

    return v_flex().size_full().bg(this.panel ? t.surface : t.chrome).text_color(t.foreground).text_size(13)
      .child(header)
      .child(v_flex().flex_1().overflow_y_scrollbar().id("mv-scroll").pb(12).child(body));
  }

  // The universe you are in: what it is, and what you can do to it.
  card(cx, t, u) {
    this.loadLinks(cx, u);
    const k = key(u);
    const busy = this.busy[k];
    const space = spaceOf(u);
    const activeTab = space?.tabs.find((x) => x.active)?.name;
    const button = (id, label, onClick, primary = false) =>
      div().id(`mv-${id}`).px(10).py(4).rounded(6).text_size(12)
        .bg(primary ? t.solid : t.raised).text_color(primary ? t.solid_foreground : t.foreground)
        .border(1).border_color(primary ? t.solid : t.border)
        .when(!busy, (el) => el.hover((s) => s.bg(primary ? t.accent : t.hover)).on_click(onClick))
        .when(Boolean(busy), (el) => el.opacity(0.5))
        .child(label);

    const links = this.links[k];
    return v_flex().mx(10).p(12).gap(10).rounded(10).bg(t.background).border(1).border_color(t.border)
      .child(h_flex().gap(8).items_center()
        .child(div().text_size(16).text_color(tone(t, u.state)).child(ICON[u.state] ?? "◌"))
        .child(v_flex().flex_1().min_w(0)
          .child(div().font_semibold().truncate().child(u.name))
          .child(div().text_size(11).text_color(t.dim).truncate()
            .child(`${u.multiverse} · ${u.state}${u.up ? ` · ${u.up} up` : ""}`))))
      .when(Boolean(busy), (el) => el.child(h_flex().gap(6).text_size(12).text_color(t.working)
        .child(div().frames(SPIN, 90)).child(`${busy}…`)))
      .child(h_flex().flex_wrap().gap(6)
        .child(button("up", "▶ Up", (_e, cx) => this.run(cx, u, "up"), u.state !== "running"))
        .child(button("down", "■ Down", (_e, cx) => this.run(cx, u, "down")))
        .child(button("sync", "⟳ Sync", (_e, cx) => this.run(cx, u, "sync")))
        .child(button("doctor", "Doctor", () => doctor(u))))
      .child(v_flex().gap(4)
        .child(div().text_size(11).text_color(t.dim).child("REPOSITORIES"))
        .child(h_flex().flex_wrap().gap(4).children(u.repos.map((r) =>
          div().id(`mv-card-r-${r}`).px(7).py(2).rounded(5).text_size(12)
            .bg(r === activeTab ? t.accent : t.raised)
            .text_color(r === activeTab ? t.accent_foreground : t.muted)
            .hover((s) => s.text_color(t.foreground))
            .on_click(() => showRepo(u, r))
            .child(r)))))
      .child(v_flex().gap(2)
        .child(div().text_size(11).text_color(t.dim).child("ADDRESSES"))
        .children(links === null || links === undefined
          ? [div().text_size(12).text_color(t.dim).child("…")]
          : links.length === 0
            ? [div().text_size(12).text_color(t.dim).child("none")]
            : links.map((url, i) =>
              div().id(`mv-url-${i}`).text_size(12).text_color(t.accent).truncate()
                .hover((s) => s.underline())
                .on_click(() => browse(url))
                .child(url.replace(/^https?:\/\//, "")))));
  }

  groups(t) {
    const byMv = new Map();
    for (const u of this.list) {
      if (!byMv.has(u.multiverse)) byMv.set(u.multiverse, []);
      byMv.get(u.multiverse).push(u);
    }
    const out = [];
    for (const [mv, us] of byMv) {
      out.push(div().px(12).pt(6).pb(2).text_size(11).text_color(t.dim).child(mv));
      for (const u of us) out.push(this.row(t, u));
    }
    return out;
  }

  row(t, u) {
    const k = key(u);
    const space = spaceOf(u);
    const shown = space?.active;
    const row = h_flex().id(`mv-u-${k}`).mx(6).px(6).py(4).gap(8).items_center().rounded(6)
      .when(shown, (el) => el.bg(t.selected))
      .hover((s) => s.bg(shown ? t.selected : t.hover))
      .on_click(() => { this.done(); open(u); })
      .child(div().flex_none().text_color(tone(t, u.state)).child(ICON[u.state] ?? "◌"))
      .child(div().flex_1().truncate().text_color(space ? t.foreground : t.muted).child(u.name))
      .child(div().flex_none().text_size(11).text_color(t.dim).child(space ? "open" : u.up ?? ""));
    if (!space || this.panel) return row;

    // In the popup, an open universe lists its repositories.
    const activeTab = space.tabs.find((x) => x.active)?.name;
    const repos = h_flex().flex_wrap().gap(4).ml(30).mr(10).mb(4).children(
      u.repos.map((r) =>
        div().id(`mv-r-${k}-${r}`).px(6).py(1).rounded(4).text_size(11)
          .bg(shown && r === activeTab ? t.accent : t.raised)
          .text_color(shown && r === activeTab ? t.accent_foreground : t.muted)
          .hover((s) => s.text_color(t.foreground))
          .on_click(() => { this.done(); showRepo(u, r); })
          .child(r)));
    return v_flex().child(row).child(repos);
  }
}
