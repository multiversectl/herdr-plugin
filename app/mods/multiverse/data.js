// What the Universes mod knows and does, through the multiversectl command
// line: `status -o json` and `universe ls -o json -m <multiverse>` to read,
// `universe up|down|sync|urls|doctor <universe> -m <multiverse>` to act.

import { exec, spaces, panes, focused, run, window, notify } from "herdr";

export const ICON = { running: "●", partial: "◐", stopped: "○", created: "◌" };

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

// Opens a universe as a space named after it, a tab per repository in its
// checkout; one already open is shown.
export function open(u) {
  const s = spaceOf(u);
  if (s) {
    run("space.select", { id: s.id });
    return;
  }
  const [first, ...rest] = u.repos;
  run("space.new", { name: u.name, folder: first ? u.checkout[first] : u.dir, tab: first, machine: "" });
  // A new space is shown at once, so its tabs go to it.
  for (const r of rest) run("tab.new", { name: r, folder: u.checkout[r], focus: false });
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

export async function urls(u) {
  const out = await mvctl(["universe", "urls", u.name, "-m", u.multiverse]);
  return out.split("\n").map((l) => l.trim()).filter((l) => /^https?:\/\//.test(l));
}

export function browse(url) {
  const opener = window()?.platform === "macos" ? "open" : "xdg-open";
  exec(opener, [url]).catch(() => {});
}

// A check reads best in a terminal: a tab in the universe's space that
// stays until the person closes it.
export function doctor(u) {
  const s = spaceOf(u);
  const cmd = `multiversectl universe doctor ${shq(u.name)} -m ${shq(u.multiverse)}; printf '\\n[enter to close] '; read _`;
  run("tab.new", { name: "doctor", space: s?.id, folder: u.dir, argv: ["sh", "-c", cmd] });
}

const shq = (s) => `'${String(s).replace(/'/g, `'\\''`)}'`;
