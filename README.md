# multiversectl for herdr

A [herdr](https://herdr.dev) plugin that shows which [multiversectl](https://multiversectl.dev) universe each agent and workspace is working in, and opens universe status in a popup.

## Install

```sh
herdr plugin install multiversectl/herdr-plugin
```

Needs `multiversectl` on `PATH`. Installing fetches `multiversectl-herdr`, the small binary that does the work, from the latest multiversectl release and checks it against the release's checksums; one already on `PATH` is used instead.

## Show the universe in the sidebar

herdr plugins can't change your layout, so add the tokens to `~/.config/herdr/config.toml` yourself:

```toml
[ui.sidebar.agents]
rows = [["state_icon", "machine", "workspace", "tab"], ["agent", "$mv_universe", "$mv_up"]]

[ui.sidebar.spaces]
rows = [["state_icon", "workspace"], ["branch", "git_status"], ["$mv_universe", "$mv_state"]]
```

| token | value |
|---|---|
| `$mv_universe` | universe name, or `root` in the multiverse's own checkout |
| `$mv_multiverse` | multiverse name |
| `$mv_state` | `running`, `partial`, `stopped` or `created` |
| `$mv_up` | services up, e.g. `6/9` |

## Universe status popup

```toml
[[keys.command]]
key = "prefix+u"
type = "plugin_action"
command = "multiversectl.status"
description = "multiverse status"
```

## How it works

On startup, and whenever a pane or workspace changes, `multiversectl-herdr sync` reads herdr's panes and workspaces, asks `multiversectl universe which -o json` where each one's working directory is, and sets the tokens. Labels are display only, and are set again after herdr restarts.

Run the `multiversectl.sync` action to relabel by hand.

## Developing

```sh
cd ../multiversectl && make install   # puts multiversectl and multiversectl-herdr on PATH
herdr plugin link .                    # use this checkout; no build step runs
herdr plugin action invoke multiversectl.debug   # writes what herdr passes the plugin to debug.json
```
