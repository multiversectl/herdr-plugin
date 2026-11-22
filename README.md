# multiversectl for herdr

Work in [multiversectl](https://multiversectl.dev) universes from [herdr](https://herdr.dev): each universe is a space (a workspace) whose terminal starts in the universe's folder, the parent of its repositories' checkouts; each repository gets its own tab when you ask for it.

herdr comes as two programs, and this repository has a piece for each:

| | herdr app (desktop) | herdr (terminal) |
|---|---|---|
| What | a layout: a **Universes** side panel, **Open universe…** in the + menu, `alt-u` | a plugin: sidebar labels, a picker and a status popup |
| Where | [`multiverse/`](multiverse/) | the repository root (`herdr-plugin.toml`) |

Both need `multiversectl` on `PATH`.

### Platforms

| | Linux | macOS | Windows |
|---|---|---|---|
| herdr app layout | yes (x86_64, arm64) | yes (Apple silicon, as the herdr app) | no |
| herdr terminal plugin | yes (amd64, arm64) | yes (Intel, Apple silicon) | no |

Windows is out because multiversectl itself has no Windows build; inside WSL it is Linux, and both work there. `multiversectl-herdr` is a static binary, so any distribution runs it, glibc or musl; installing needs `sh`, `curl` or `wget`, and `sha256sum` or `shasum`. On Linux the panel opens addresses with `xdg-open`, else `gio open`, else `sensible-browser`.

## herdr app

The **Universes** panel sits beside Files and Changes. Its **Web view** button opens multiversectl's web view (`multiversectl server open`, which starts it when needed). It lists every universe, each marked with a ring of gems (dim when stopped); click one to open it as a space named after it, with one terminal in the universe's folder. Inside a universe's space it shows the universe's state and services up, terminal openers for the universe (its ring) and each repository (the repository's gem; `+` when it is not open yet), its addresses in two tabs, by name through the proxy or by IP and port (click to open; a dot says whether the service runs), and **Up**, **Down**, **Sync** and **Doctor**.

To add it, ask the agent in your herdr app to add the layout from this repository's `multiverse/` folder (it follows `multiverse/RECIPE.md`), or install it from [herdr.dev/layouts](https://herdr.dev/layouts/), or copy it yourself:

```sh
git clone https://github.com/multiversectl/herdr-plugin
cp herdr-plugin/multiverse/layouts/multiverse.json ~/.config/herdr-app/layouts/
cp -R herdr-plugin/multiverse/mods/* ~/.config/herdr-app/mods/
# add "alt-u": "mod.open:multiverse" to "global" in ~/.config/herdr-app/keys.json
herdr-app do layout.switch '{"name":"multiverse"}'
```

`ctrl-shift-l` switches back to your own layout.

### Gems

A repository is a gem whose colour comes from its name, so it has the same one in every universe, and in multiversectl's web view; a universe, made of repositories, is the ring of all six. `node tools/gems.mjs` draws them into `multiverse/mods/multiverse/gems/`.

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

## Versions

Every merge to `main` is released by [semantic-release](https://semantic-release.gitbook.io) as a patch version (0.0.1, 0.0.2, …); commits are titled `fix: …`. The release writes the version into `herdr-plugin.toml` and tags it, so you can pin one:

```sh
herdr plugin install multiversectl/herdr-plugin --ref v0.0.1
```
