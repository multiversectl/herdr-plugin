# Multiverse

Herdr's main layout with a **Universes** side panel for [multiversectl](https://multiversectl.dev): every universe on this machine, each opened as its own space whose terminal starts in the universe's folder, and the universe you are in with its state, repositories, addresses and controls. The + menu gains **Open universe…** and `alt-u` opens a universe picker anywhere.

**What you see**

- Everything of Herdr's `main` layout, unchanged, plus a third side panel beside Files and Changes. Its button in the tab bar reads **Universes**, with an orbit icon (`mods/multiverse/universe.svg`, 16px, stroked in the text color).
- The panel (368px, the side panel's width; `surface` background):
  - Header: `UNIVERSE` in 11px semibold `dim`; at the right a **Web view** button (22px, 1px `border`, a globe icon `mods/multiverse/web.svg`, 12px) and a ↻ refresh (each a braille spinner while busy).
  - When the shown space is a universe's: a card (`background`, 1px `border`, 10px radius, 12px padding) with the state icon in the state's color, the universe's name (semibold), `<multiverse> · <state> · <up> up` (11px `dim`); a row of buttons, **▶ Up** (solid when the universe is not running), **■ Down**, **⟳ Sync**, **Doctor**; `TERMINALS`, a wrapping row of terminal openers: `universe` (semibold) first, then each repository. Each opener is a 24px chip with Herdr's terminal icon (`icons/shell.svg`, 12px) and the tab's name: the shown tab's in `accent`, an open tab's `raised` with `foreground` text, one not open yet `surface` with `muted` text and a trailing `+`; `ADDRESSES`, the universe's URLs without the scheme, in `accent`, one per line.
  - Otherwise: "This space is in no universe. Open one below."
  - `ALL UNIVERSES`: grouped by multiverse (11px `dim` heading), one row per universe: state icon, name, and `open` when it has a space, else its services up (`6/9`). The shown universe's row is `selected`.
- State icons: running ● (`done` color), partial ◐ (`working`), stopped ○ and created ◌ (`dim`).
- The + menu: Herdr's, with **Open universe…** last (the orbit icon, `Alt+U` as its hint).
- `alt-u`, or Open universe…: the same list alone, in a 380×480 dialog (360×520 from `alt-u`), with an open universe's repositories as chips under it.

**How it behaves**

- Clicking a universe opens it as a space named after it with one tab, `universe`, whose terminal starts in the universe's folder (the parent of every repository's checkout). Repositories get tabs only from their chips. A universe that already has a space (a space *named* exactly after it) is shown instead. The picker closes after a click.
- Clicking a repository's opener shows that repository's tab, making it (a terminal in its checkout) when it is missing. Its tooltip says which: "Open a terminal in api" or "Go to api's terminal".
- Up, Down and Sync run `multiversectl universe up|down|sync <universe> -m <multiverse>` (up to 10 minutes); while one runs the card shows a spinner and the verb, and the buttons are dimmed and inert. A toast says how it went (success, or error with multiversectl's message), then the list is read again.
- The `universe` opener shows the universe's own terminal: a tab named `universe` whose terminal starts in the universe's folder, the parent of every repository's checkout. One already open is shown instead.
- Doctor opens a tab named `doctor` in the universe's space running `multiversectl universe doctor`, which waits for enter before it closes.
- Web view runs `multiversectl server open`, which starts the web view when it is not running and opens it in the browser; an error shows as a toast.
- An address opens in the browser (`xdg-open`, or `open` on macOS).
- The list is read on start, every 10 seconds, and on ↻. The panel keeps Herdr's per-space memory: each space remembers whether its side panel was open and which one.

**Built from**

- `layouts/multiverse.json`: a clone of `main` (`layout.clone`). Two changes: the `tabs` block's mod is `multiverse-tabs`, and `panel-body` (the side panel's stack) gains a third child `{ "id": "universes", "type": "block", "content": { "mod": "multiverse", "props": { "panel": true } } }`.
- `mods/multiverse-tabs`: a clone of `tabs` (`mod.clone`). Its panel list is `[...(shared("workspace.panels") ?? ["files", "changes"]), "universes"]`, so the space-switch memory keeps the Universes panel; it adds `panelButton("universes", "Universes", "mods/multiverse/universe.svg")` after Changes; + opens `multiverse-new-menu` (popup, 250×548).
- `mods/multiverse-new-menu`: a clone of `new-menu` with one more row, `universe-open`, opening `{ mod: "multiverse", kind: "dialog", width: 380, height: 480 }`; its height formula grows by one row (31px).
- `mods/multiverse`: `main.js` (the view: panel when `props().panel`, else the list; closes its overlay after acting), `data.js` (reading and acting), `universe.svg`, `web.svg`. `mod.json`: `{ "place": "none", "title": "Universes", "overlay": { "width": 360, "height": 520 } }`.
- `herdr` functions: `exec`, `spaces`, `panes`, `focused`, `run` (`space.new {name, folder, tab, machine: ""}`, `space.select`, `tab.select`, `tab.new {name, space, folder}` for a repository's tab and the universe terminal, with `argv` for Doctor), `notify`, `theme`, `props`, `closeOverlay`, `window`, `checking`.
- Programs it runs: `multiversectl status -o json`, `multiversectl universe ls -o json -m <multiverse>` (for each universe: `name`, `state`, `up`, `dir`, `checkout` {repo: path}, `branch`), `multiversectl universe up|down|sync|urls|doctor <universe> -m <multiverse>`, `multiversectl server open`, `xdg-open`/`open`.
- `keys.json`: `"alt-u": "mod.open:multiverse"` in `global`.

**Watch out**

- Shipped layouts and mods are read-only: clone `main`, `tabs` and `new-menu` and edit the clones, or the next start moves your edits aside.
- `tabs` remembers each space's panel only if the panel's id is in its list; leave `universes` out and switching spaces closes the panel.
- `space.new` shows the new space at once, so the following `tab.new`s (no `space`) land in it; pass `machine: ""` or a space opened from a remote space's click lands on that machine.
- A space is a universe's only when it is *named* exactly after it; renaming the space makes the next click open a second one.
- `herdr-app check` renders the first frame only, before the list is read: open the panel inside a universe's space to see the card.
- It needs `multiversectl` on the app's `PATH` (exec runs with the user's real environment).

**Done when**

- `herdr-app check` passes for `multiverse`, `multiverse-tabs` and `multiverse-new-menu`, and `herdr-app status` shows no errors on the `multiverse` layout.
- The tab bar shows Universes after Changes; clicking it opens the panel, clicking again hides it.
- Clicking a universe makes one space named after it with one tab, `universe`, in the universe's folder; a repository chip adds that repository's tab in its checkout; clicking it again shows that space and makes nothing new.
- Inside that space the card shows the universe, its state, its repositories with the shown tab marked, and its addresses; Down then Up changes the state shown after the toast.
- The + menu ends with Open universe…; `alt-u` opens the picker.
