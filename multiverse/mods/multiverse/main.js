// Universes: every multiversectl universe on this machine.
//
// As a side panel (props { panel: true }, beside Files and Changes): the
// universe you are in, with its state, repositories, addresses and controls
// (up, down, sync, doctor, terminal), then every universe. As a popup
// (mod.open, alt-u): the list alone. Clicking a universe opens it as a space
// named after it with one terminal in the universe's folder; a repository's tab
// opens from its chip. One already open is shown.

import { View, div, svg, image } from "gpui-kit";
import { v_flex, h_flex } from "gpui-base";
import { theme, checking, props, closeOverlay } from "herdr";
import { ICON, gem, tone, universes, key, spaceOf, current, open, showRepo, act, addresses, browse, doctor, universeTerminal, webView } from "./data.js";

// How often the list is read again: universes start and stop outside Herdr.
const EVERY = 10000;
const SPIN = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

// A universe: its repositories' gems in a ring, size px across, dim when it
// does not run. A pair sits side by side; one alone fills it.
function ring(u, size) {
  const n = u.repos.length;
  const box = div().relative().size(size).flex_none().opacity(u.state === "running" ? 1 : u.state === "partial" ? 0.8 : 0.45);
  if (n === 0) return box;
  if (n === 1) return box.child(image(gem(u, u.repos[0])).absolute().left(size * 0.1).top(size * 0.1).size(size * 0.8));
  const s = Math.round(size * (n === 2 ? 0.52 : n <= 4 ? 0.46 : 0.4));
  const r = (size - s) / 2;
  const start = n === 2 ? Math.PI : -Math.PI / 2;
  return box.children(u.repos.map((repo, i) => {
    const a = start + (i * 2 * Math.PI) / n;
    return image(gem(u, repo)).absolute().size(s)
      .left(Math.round(size / 2 + r * Math.cos(a) - s / 2)).top(Math.round(size / 2 + r * Math.sin(a) - s / 2));
  }));
}

export default class Universes extends View {
  init(_props, cx) {
    this.panel = Boolean(props()?.panel);
    this.list = null; // null: not read yet
    this.error = null;
    this.busy = {}; // universe key -> the verb running
    this.links = {}; // universe key -> { at: state when read, list: its addresses } (list null: reading)
    this.linkTab = {}; // universe key -> the addresses tab shown
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

  openWeb(cx) {
    if (this.webBusy) return;
    this.webBusy = true;
    cx.notify();
    cx.spawn(async (cx) => {
      await webView();
      this.webBusy = false;
      cx.notify();
    });
  }

  // The card's addresses, read again when the universe's state has moved.
  loadLinks(cx, u) {
    const k = key(u);
    const at = `${u.state} ${u.up}`;
    if (this.links[k] && this.links[k].at === at) return;
    this.links[k] = { at, list: this.links[k]?.list ?? null };
    cx.spawn(async (cx) => {
      try {
        this.links[k] = { at, list: await addresses(u) };
      } catch {
        this.links[k] = { at, list: [] };
      }
      cx.notify();
    });
  }

  render(cx) {
    const t = theme();
    const title = (text) => div().text_size(11).font_semibold().text_color(t.dim).child(text);
    const header = h_flex().px(12).pt(12).pb(6).justify_between().items_center()
      .child(title(this.panel ? "UNIVERSE" : "UNIVERSES"))
      .child(h_flex().gap(4).items_center()
        .child(h_flex().id("mv-web").h(22).px(7).gap(5).items_center().rounded(5).text_size(12)
          .text_color(t.muted).border(1).border_color(t.border)
          .hover((s) => s.bg(t.hover).text_color(t.foreground))
          .tooltip("Open multiversectl's web view (multiversectl server open)")
          .on_click((_e, cx) => this.openWeb(cx))
          .child(this.webBusy ? div().frames(SPIN, 90) : svg("mods/multiverse/web.svg").size(12))
          .child("Web view"))
        .child(div().id("mv-refresh").text_size(12).text_color(t.dim).px(6).rounded(4)
          .hover((s) => s.bg(t.hover).text_color(t.foreground))
          .tooltip("Read the universes again")
          .on_click((_e, cx) => { this.links = {}; this.refresh(cx); })
          .child(this.reading ? div().frames(SPIN, 90) : "↻")));

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

    return v_flex().mx(10).p(12).gap(10).rounded(10).bg(t.background).border(1).border_color(t.border)
      .child(h_flex().gap(8).items_center()
        .child(ring(u, 30))
        .child(v_flex().flex_1().min_w(0)
          .child(div().font_semibold().truncate().child(u.name))
          .child(div().text_size(11).text_color(t.dim).truncate()
            .child(h_flex().gap(4).items_center()
              .child(div().text_color(tone(t, u.state)).child(ICON[u.state] ?? "◌"))
              .child(`${u.multiverse} · ${u.state}${u.up ? ` · ${u.up} up` : ""}`)))))
      .when(Boolean(busy), (el) => el.child(h_flex().gap(6).text_size(12).text_color(t.working)
        .child(div().frames(SPIN, 90)).child(`${busy}…`)))
      .child(h_flex().flex_wrap().gap(6)
        .child(button("up", "▶ Up", (_e, cx) => this.run(cx, u, "up"), u.state !== "running"))
        .child(button("down", "■ Down", (_e, cx) => this.run(cx, u, "down")))
        .child(button("sync", "⟳ Sync", (_e, cx) => this.run(cx, u, "sync")))
        .child(button("doctor", "Doctor", () => doctor(u))))
      .child(v_flex().gap(4)
        .child(div().text_size(11).text_color(t.dim).child("TERMINALS"))
        .child(h_flex().flex_wrap().gap(4)
          .child(this.opener(t, u, "universe", "universe", activeTab, () => universeTerminal(u), "the universe's folder"))
          .children(u.repos.map((r) => this.opener(t, u, `r-${r}`, r, activeTab, () => showRepo(u, r), r)))))
      .child(this.addressesView(t, u));
  }

  // The universe's addresses, a tab per way of reaching them: by name through
  // the proxy, or by IP and port (from other devices too). Each says which
  // host and service it is, and whether that service runs.
  addressesView(t, u) {
    const k = key(u);
    const list = this.links[k]?.list;
    const title = div().text_size(11).text_color(t.dim).child("ADDRESSES");
    if (!list) return v_flex().gap(4).child(title).child(div().text_size(12).text_color(t.dim).child("…"));
    if (list.length === 0) return v_flex().gap(4).child(title).child(div().text_size(12).text_color(t.dim).child("none"));

    const kinds = [
      { id: "name", label: "By name", tip: "Through multiversectl's proxy, by hostname" },
      { id: "ip", label: "By IP", tip: "A port on this machine's address: other devices on the network reach it too" },
    ].map((x) => ({ ...x, list: list.filter((a) => a.kind === x.id) }));
    const shown = kinds.find((x) => x.id === this.linkTab[k]) ?? kinds.find((x) => x.list.length > 0);
    const empty = {
      name: "No host is reached by name: each one is a forwarded port (portForward: only).",
      ip: "No host has a forwarded port: each one is reached by name, through the proxy.",
    };

    const tabs = h_flex().gap(2).p(2).rounded(6).bg(t.raised).children(kinds.map((x) => {
      const on = x.id === shown.id;
      return h_flex().id(`mv-at-${x.id}`).px(8).h(22).gap(5).items_center().rounded(4).text_size(12)
        .bg(on ? t.background : t.raised).text_color(on ? t.foreground : x.list.length ? t.muted : t.dim)
        .when(on, (el) => el.border(1).border_color(t.border))
        .hover((s) => s.text_color(t.foreground))
        .tooltip(x.tip)
        .on_click((_e, cx) => { this.linkTab[k] = x.id; cx.notify(); })
        .child(x.label)
        .child(div().text_size(11).text_color(t.dim).child(String(x.list.length)));
    }));

    const rows = shown.list.map((a, i) =>
      h_flex().id(`mv-url-${shown.id}-${i}`).gap(8).items_center().py(3).px(4).rounded(5)
        .hover((s) => s.bg(t.hover))
        .tooltip(a.running ? `Open ${a.url}` : `${a.app}/${a.service} is not running: ${a.url}`)
        .on_click(() => browse(a.url))
        .child(div().flex_none().size(6).rounded(3).bg(a.running ? t.done : t.dim))
        .child(v_flex().flex_1().min_w(0)
          .child(h_flex().gap(6).items_center()
            .child(div().text_size(12).font_semibold().text_color(a.running ? t.foreground : t.muted).child(a.host))
            .child(div().text_size(11).text_color(t.dim).truncate().child(`${a.app} · ${a.service}`)))
          .child(div().text_size(12).truncate().text_color(a.running ? t.accent : t.dim).child(a.url.replace(/^https?:\/\//, "")))));

    return v_flex().gap(6)
      .child(h_flex().justify_between().items_center().child(title).child(tabs))
      .child(div().text_size(11).text_color(t.dim).child(shown.list.length ? shown.tip : empty[shown.id]))
      .child(v_flex().gap(1).children(rows));
  }

  // A chip that opens a terminal, or goes to the one open: the universe's ring
  // or the repository's gem, the tab's name, and a tooltip saying which. Shown: accent; open: plain;
  // not yet open: muted, with a dashed look of a thinner border.
  opener(t, u, id, name, activeTab, onClick, where) {
    const tab = spaceOf(u)?.tabs.find((x) => x.name === name);
    const shown = Boolean(tab) && name === activeTab;
    const fg = shown ? t.accent_foreground : tab ? t.foreground : t.muted;
    return h_flex().id(`mv-term-${id}`).h(24).px(7).gap(5).items_center().rounded(5).text_size(12)
      .bg(shown ? t.accent : tab ? t.raised : t.surface)
      .border(1).border_color(shown ? t.accent : t.border)
      .text_color(fg)
      .hover((s) => s.bg(shown ? t.accent : t.hover).text_color(shown ? t.accent_foreground : t.foreground))
      .tooltip(tab ? `Go to ${name === "universe" ? "the universe's" : `${name}'s`} terminal` : `Open a terminal in ${where}`)
      .on_click(onClick)
      // On the accent a gem sits on a light disc, or its colour is lost.
      .child(name === "universe"
        ? div().p(shown ? 1 : 0).rounded(9).when(shown, (el) => el.bg(t.background)).child(ring(u, 15))
        : div().p(shown ? 1 : 0).rounded(7).when(shown, (el) => el.bg(t.background)).child(image(gem(u, name)).size(12)))
      .child(div().when(name === "universe", (el) => el.font_semibold()).child(name))
      .when(!tab, (el) => el.child(div().text_size(11).text_color(t.dim).child("+")));
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
      .child(ring(u, 20))
      .child(div().flex_1().truncate().text_color(space ? t.foreground : t.muted).child(u.name))
      .child(div().flex_none().text_size(11).text_color(t.dim).child(space ? "open" : u.up ?? ""));
    if (!space || this.panel) return row;

    // In the popup, an open universe lists its repositories.
    const activeTab = space.tabs.find((x) => x.active)?.name;
    const repos = h_flex().flex_wrap().gap(4).ml(30).mr(10).mb(4).children(
      u.repos.map((r) =>
        h_flex().id(`mv-r-${k}-${r}`).px(6).py(1).gap(4).items_center().rounded(4).text_size(11)
          .bg(shown && r === activeTab ? t.accent : t.raised)
          .text_color(shown && r === activeTab ? t.accent_foreground : t.muted)
          .hover((s) => s.text_color(t.foreground))
          .tooltip(space.tabs.some((x) => x.name === r) ? `Go to ${r}'s terminal` : `Open a terminal in ${r}`)
          .on_click(() => { this.done(); showRepo(u, r); })
          .child(image(gem(u, r)).size(12).flex_none())
          .child(r)));
    return v_flex().child(row).child(repos);
  }
}
