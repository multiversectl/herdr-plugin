#!/bin/sh
# Copies the gems from multiversectl, where web/tools/gems.mjs draws them, so
# the Universes panel and the web view of `multiversectl server open` show the
# same ones. With no argument it downloads them from multiversectl's main
# branch; with a path it copies them from that multiversectl checkout.
# `--check` only says whether the copies here still match main's.
set -eu
cd "$(dirname "$0")/.."
dst=multiverse/mods/multiverse/gems
src=${1:-}
check=
if [ "$src" = --check ]; then check=1; src=; fi
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
for c in red blue yellow green purple cyan; do
  for f in "$c.svg" "$c-sm.svg"; do
    if [ -n "$src" ]; then
      cp "$src/web/public/gems/$f" "$tmp/$f"
    else
      curl -fsSL --retry 3 "https://raw.githubusercontent.com/multiversectl/multiversectl/main/web/public/gems/$f" -o "$tmp/$f"
    fi
  done
done
if [ -n "$check" ]; then
  diff -r "$tmp" "$dst" && echo "the gems match multiversectl's"
else
  rm -rf "$dst" && mkdir -p "$dst" && cp "$tmp"/*.svg "$dst"/ && echo "copied $(ls "$dst" | wc -l | tr -d ' ') gems into $dst"
fi
