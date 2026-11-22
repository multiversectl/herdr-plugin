# multiversectl for herdr

Work in [multiversectl](https://multiversectl.dev) universes from [herdr](https://herdr.dev): each universe is a space (a workspace) whose terminal starts in the universe's folder, the parent of its repositories' checkouts; each repository gets its own tab when you ask for it.

herdr comes as two programs, and this repository has a piece for each:

| | herdr app (desktop) | herdr (terminal) |
|---|---|---|
| What | a layout: a **Universes** side panel, **Open universe…** in the + menu, `alt-u` | a plugin: sidebar labels, a picker and a status popup |
| Where | [`app/`](app/) | the repository root (`herdr-plugin.toml`) |

Both need `multiversectl` on `PATH`.

## herdr app

The **Universes** panel sits beside Files and Changes. It lists every universe; click one to open it as a space named after it, with one terminal in the universe's folder. Inside a universe's space it shows the universe's state and services up, terminal openers for the universe and each repository (a terminal icon; `+` when it is not open yet), its addresses (click to open), and **Up**, **Down**, **Sync** and **Doctor**.

To add it, ask the agent in your herdr app to add the layout from this repository's `app/` folder (it follows `app/RECIPE.md`), or copy it yourself:

```sh
git clone https://github.com/multiversectl/herdr-plugin
cp herdr-plugin/app/layouts/multiverse.json ~/.config/herdr-app/layouts/
cp -R herdr-plugin/app/mods/* ~/.config/herdr-app/mods/
# add "alt-u": "mod.open:multiverse" to "global" in ~/.config/herdr-app/keys.json
herdr-app do layout.switch '{"name":"multiverse"}'
```

`ctrl-shift-l` switches back to your own layout.

## herdr (terminal)

```sh
herdr plugin install multiversectl/herdr-plugin
```

Installing fetches `multiversectl-herdr`, the small binary that does the work, from the latest multiversectl release and checks it against the release's checksums; one already on `PATH` is used instead.

### Open a universe

The `multiversectl.open` action shows a picker of every universe; choosing one opens it as a workspace named after it, with one tab, `universe`, in the universe's folder. One already open is focused. `multiversectl.open-all` opens them all. Bind the picker in `~/.config/herdr/config.toml`:

```toml
[[keys.command]]
key = "prefix+o"
type = "plugin_action"
command = "multiversectl.open"
description = "open a universe"

[[keys.command]]
key = "prefix+u"
type = "plugin_action"
command = "multiversectl.status"
description = "multiverse status"
```

### Labels in the sidebar

The plugin labels every pane and workspace with sidebar tokens. herdr plugins can't change your layout, so add them yourself:

```toml
[ui.sidebar.agents]
rows = [["state_icon", "machine", "workspace", "tab"], ["agent", "$mv_repo", "$mv_up"]]

[ui.sidebar.spaces]
rows = [["state_icon", "workspace"], ["$mv_state", "$mv_up"]]
```

| token | value |
|---|---|
| `$mv_universe` | universe name, or `root` in the multiverse's own checkout |
| `$mv_multiverse` | multiverse name |
| `$mv_repo` | the repository a pane is in |
| `$mv_state` | `running`, `partial`, `stopped` or `created` |
| `$mv_up` | services up, e.g. `6/9` |

On startup, and whenever a pane takes focus, starts an agent or a workspace changes, `multiversectl-herdr sync` asks `multiversectl universe which -o json` where each pane's directory is and sets the tokens. A workspace with no checkout of its own takes the universe most of its panes are in. Labels are display only, and are set again after herdr restarts. Run the `multiversectl.sync` action to relabel by hand.

### Developing

```sh
cd ../multiversectl && make install   # puts multiversectl and multiversectl-herdr on PATH
herdr plugin link .                    # use this checkout; no build step runs
herdr plugin action invoke multiversectl.debug   # writes what herdr passes the plugin to debug.json
```
