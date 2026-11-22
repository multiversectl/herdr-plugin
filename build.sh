#!/bin/sh
# Fetches multiversectl-herdr for this machine from the latest multiversectl
# release into bin/, checked against the release's checksums.txt. herdr runs
# this once, on `herdr plugin install`.
set -eu

if command -v multiversectl-herdr >/dev/null 2>&1; then
  echo "using $(command -v multiversectl-herdr)"
  exit 0
fi

case "$(uname -s)" in
  Linux) os=linux ;;
  Darwin) os=darwin ;;
  *) echo "unsupported OS: $(uname -s)" >&2; exit 1 ;;
esac
case "$(uname -m)" in
  x86_64|amd64) arch=amd64 ;;
  arm64|aarch64) arch=arm64 ;;
  *) echo "unsupported CPU: $(uname -m)" >&2; exit 1 ;;
esac

name="multiversectl-herdr_${os}_${arch}"
base="https://github.com/multiversectl/multiversectl/releases/latest/download"
mkdir -p bin
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

curl -fsSL --retry 3 "$base/$name" -o "$tmp/$name"
curl -fsSL --retry 3 "$base/checksums.txt" -o "$tmp/checksums.txt"

want=$(awk -v n="$name" '$2 == n { print $1 }' "$tmp/checksums.txt")
if [ -z "$want" ]; then
  echo "$name is not in the release's checksums.txt" >&2
  exit 1
fi
if command -v sha256sum >/dev/null 2>&1; then
  got=$(sha256sum "$tmp/$name" | awk '{ print $1 }')
else
  got=$(shasum -a 256 "$tmp/$name" | awk '{ print $1 }')
fi
if [ "$got" != "$want" ]; then
  echo "checksum mismatch for $name" >&2
  exit 1
fi

mv "$tmp/$name" bin/multiversectl-herdr
chmod +x bin/multiversectl-herdr
echo "installed bin/multiversectl-herdr ($(bin/multiversectl-herdr version))"
