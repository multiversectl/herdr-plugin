// What the Universes mod knows and does, through the multiversectl command
// line: `status -o json` and `universe ls -o json -m <multiverse>` to read,
// `universe up|down|sync|urls|doctor <universe> -m <multiverse>` to act.

import { exec, spaces, panes, focused, run, window, notify } from "herdr";

export const ICON = { running: "●", partial: "◐", stopped: "○", created: "◌" };

// The gems (gems/*.svg, drawn by tools/gems.mjs): a repository is a stone, its
// colour from its name, so a repository has the same one in every universe; a
// universe, made of repositories, is the ring of them all. The web view
// (multiversectl server open) picks colours the same way.
const GEMS = ["red", "blue", "yellow", "green", "purple", "orange"];
export const RING = "mods/multiverse/gems/ring.svg";
export function gemOf(name) {
  let h = 0x811c9dc5;
  for (const ch of new TextEncoder().encode(name)) h = Math.imul(h ^ ch, 0x01000193) >>> 0;
  return `mods/multiverse/gems/${GEMS[h % GEMS.length]}.svg`;
}
// How bright a universe's ring shows: lit when it runs, dim when it does not.
export function glow(state) {
  return state === "running" ? 1 : state === "partial" ? 0.75 : 0.4;
}

export function tone(t, state) {
  if (state === "running") return t.done;
  if (state === "partial") return t.working;
  return t.dim;
}

async function mvctl(args, timeout = 20000) {
  const r = await exec("multiversectl", args, { timeout });
  if (r.code !== 0) throw new Error((r.stderr || r.stdout).trim() || `multiversectl ${args.join(" ")} failed`);
  return r.stdout;
}

// Every universe of every multiverse, in multiversectl's order.
export async function universes() {
  const st = JSON.parse(await mvctl(["status", "-o", "json"]));
  const out = [];
  for (const mv of st.multiverses ?? []) {
    if (mv.error) continue;
    const ls = JSON.parse(await mvctl(["universe", "ls", "-o", "json", "-m", mv.name]));
    for (const u of ls.universes ?? []) {
      out.push({
        multiverse: mv.name,
        name: u.name,
        state: u.state,
        up: u.up,
        dir: u.dir,
        repos: Object.keys(u.checkout ?? {}).sort(),
        checkout: u.checkout ?? {},
        branch: Object.values(u.branch ?? {})[0] ?? null,
      });
    }
  }
  return out;
}

export const key = (u) => `${u.multiverse}/${u.name}`;

// The space open for a universe: one named after it.
export const spaceOf = (u) => spaces().find((s) => s.named && s.name === u.name);

const within = (path, dir) => Boolean(path && dir) && (path === dir || path.startsWith(dir + "/"));

// The universe the person is in now: the shown space's, else the focused
// terminal's folder's.
export function current(list) {
  const shown = spaces().find((s) => s.active);
  if (shown) {
    const bySpace = list.find((u) => shown.named && shown.name === u.name);
    if (bySpace) return bySpace;
  }
  const cwd = focused()?.cwd ?? panes().find((p) => p.focused)?.cwd;
  return list.find((u) => within(cwd, u.dir)) ?? null;
}

// Opens a universe as a space named after it, with one terminal: the
// universe's own, in its folder (the parent of every repository's checkout).
// Repositories get their tabs when asked for (showRepo). One already open is
// shown.
export function open(u) {
  const s = spaceOf(u);
  if (s) {
    run("space.select", { id: s.id });
    return;
  }
  run("space.new", { name: u.name, folder: u.dir, tab: "universe", machine: "" });
}

// Shows a repository's tab in the universe's space, opening what is missing.
export function showRepo(u, repo) {
  const s = spaceOf(u);
  if (!s) return open(u);
  run("space.select", { id: s.id });
  const tab = s.tabs.find((t) => t.name === repo);
  if (tab) run("tab.select", { id: tab.id });
  else run("tab.new", { name: repo, folder: u.checkout[repo] });
}

// The universe's own terminal: a tab named "universe" in its folder, the one
// holding every repository's checkout. One already open is shown.
export function universeTerminal(u) {
  const s = spaceOf(u);
  if (s) {
    run("space.select", { id: s.id });
    const tab = s.tabs.find((t) => t.name === "universe");
    if (tab) return run("tab.select", { id: tab.id });
  }
  run("tab.new", { name: "universe", space: s?.id, folder: u.dir });
}

// Runs `multiversectl universe <verb> <universe>` and says how it went.
export async function act(u, verb) {
  const args = ["universe", verb, u.name, "-m", u.multiverse];
  try {
    await mvctl(args, 600000);
    notify({ title: `${u.name}: ${verb} done`, level: "success", timeout: 4000 });
  } catch (e) {
    notify({ title: `${u.name}: ${verb} failed`, body: String(e?.message ?? e).slice(0, 300), level: "error" });
  }
}

// multiversectl's web view: `server open` starts it when it is not running
// and opens it in the browser.
export async function webView() {
  try {
    await mvctl(["server", "open"], 60000);
  } catch (e) {
    notify({ title: "Web view did not open", body: String(e?.message ?? e).slice(0, 300), level: "error" });
  }
}

// Every address of a universe's services, from `universe ls <universe> -o
// json,wide`: which app, host and service it is, whether that service runs,
// and how it is reached. "name": a hostname through multiversectl's proxy;
// "ip": a forwarded port on this machine's address, which other devices on
// the network reach too.
export async function addresses(u) {
  const ls = JSON.parse(await mvctl(["universe", "ls", u.name, "-o", "json,wide", "-m", u.multiverse]));
  const w = (ls.universes ?? [])[0];
  const out = [];
  for (const app of w?.apps ?? []) {
    const state = {};
    for (const svc of app.services ?? []) state[svc.name] = svc.state;
    for (const h of app.urls ?? []) {
      out.push({
        app: app.key,
        host: String(h.host ?? "").replace(/:forward$/, ""),
        service: h.service,
        url: h.url,
        kind: byIP(h.url) ? "ip" : "name",
        running: state[h.service] === "running",
      });
    }
  }
  return out;
}

// An address whose host is an IP literal is a forwarded port.
function byIP(url) {
  const host = String(url).replace(/^[a-z]+:\/\//, "").replace(/\/.*$/, "").replace(/:\d+$/, "");
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.startsWith("[");
}

// Opens a URL in the browser: `open` on macOS; on Linux the first opener
// the desktop has (xdg-utils, GLib, Debian's alternatives).
export async function browse(url) {
  const openers = window()?.platform === "macos"
    ? [["open", [url]]]
    : [["xdg-open", [url]], ["gio", ["open", url]], ["sensible-browser", [url]]];
  for (const [cmd, args] of openers) {
    try {
      const r = await exec(cmd, args, { timeout: 10000 });
      if (r.code === 0) return;
    } catch {
      // not installed: try the next one
    }
  }
  notify({ title: "No browser opener", body: `Open ${url} yourself: none of xdg-open, gio or sensible-browser worked.`, level: "warning" });
}

// A check reads best in a terminal: a tab in the universe's space that
// stays until the person closes it.
export function doctor(u) {
  const s = spaceOf(u);
  const cmd = `multiversectl universe doctor ${shq(u.name)} -m ${shq(u.multiverse)}; printf '\\n[enter to close] '; read _`;
  run("tab.new", { name: "doctor", space: s?.id, folder: u.dir, argv: ["sh", "-c", cmd] });
}

const shq = (s) => `'${String(s).replace(/'/g, `'\\''`)}'`;
