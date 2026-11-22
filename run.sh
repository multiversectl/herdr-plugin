#!/bin/sh
# Runs multiversectl-herdr: the copy build.sh fetched, else one on PATH.
here=$(dirname "$0")
if [ -x "$here/bin/multiversectl-herdr" ]; then
  exec "$here/bin/multiversectl-herdr" "$@"
fi
if command -v multiversectl-herdr >/dev/null 2>&1; then
  exec multiversectl-herdr "$@"
fi
echo "multiversectl-herdr not found: reinstall the plugin, or put it on PATH (make install in multiversectl)" >&2
exit 1
