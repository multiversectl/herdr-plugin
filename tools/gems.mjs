// Draws the gems: one stone per colour (a repository's mark) and the ring of
// all six (a universe's). `node tools/gems.mjs` writes them into the mod.
// The web view (multiversectl web/src/app/shared/ui/gem.ts) draws the same.
import { writeFileSync, mkdirSync } from "node:fs";

export const GEMS = {
  red:    ["#ff4d4d", "#ffc2b8", "#7a0812"],
  blue:   ["#4d86ff", "#c2d6ff", "#0b237a"],
  orange: ["#ff9433", "#ffd9b0", "#7a3300"],
  yellow: ["#ffd633", "#fff5bf", "#7a5c00"],
  purple: ["#b85cff", "#ecd1ff", "#43087a"],
  green:  ["#45d957", "#c9ffc0", "#0a5c17"],
};
export const ORDER = ["red", "blue", "yellow", "green", "purple", "orange"];

// The stone on a 24 grid: an uneven oval of facets around a bright core.
const RIM = [[12, 2.8], [16.6, 4.6], [19, 9.4], [18.2, 15.2], [14, 20.4], [9.2, 20], [5.6, 15.8], [5, 9.6], [7.6, 4.8]];
const TABLE = [[12, 7.4], [15, 9], [15.4, 12.8], [12.8, 15.8], [9.6, 15.2], [8.4, 11.6], [9.4, 8.4]];
const pts = (p, s = 1, dx = 0, dy = 0) => p.map(([x, y]) => `${(x * s + dx).toFixed(2)},${(y * s + dy).toFixed(2)}`).join(" ");

export function stone(colour, id, s = 1, dx = 0, dy = 0, glow = true) {
  const [base, light, dark] = GEMS[colour];
  const cx = 12 * s + dx, cy = 11.6 * s + dy;
  const facets = RIM.map(([x, y], i) => {
    const [tx, ty] = TABLE[Math.round((i * TABLE.length) / RIM.length) % TABLE.length];
    return `M${(x * s + dx).toFixed(2)} ${(y * s + dy).toFixed(2)}L${(tx * s + dx).toFixed(2)} ${(ty * s + dy).toFixed(2)}`;
  }).join("");
  const r = 1.6 * s;
  return `<defs><radialGradient id="${id}g" cx="${cx}" cy="${cy}" r="${11.5 * s}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${base}" stop-opacity=".55"/><stop offset="1" stop-color="${base}" stop-opacity="0"/></radialGradient>`
    + `<radialGradient id="${id}s" cx="${cx - 1 * s}" cy="${cy - 1.2 * s}" r="${9 * s}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${light}"/><stop offset=".45" stop-color="${base}"/><stop offset="1" stop-color="${dark}"/></radialGradient></defs>`
    + (glow ? `<circle cx="${cx}" cy="${cy}" r="${11.5 * s}" fill="url(#${id}g)"/>` : "")
    + `<polygon points="${pts(RIM, s, dx, dy)}" fill="url(#${id}s)" stroke="${light}" stroke-opacity=".7" stroke-width="${0.6 * s}" stroke-linejoin="round"/>`
    + `<polygon points="${pts(TABLE, s, dx, dy)}" fill="${light}" fill-opacity=".18" stroke="#fff" stroke-opacity=".35" stroke-width="${0.45 * s}" stroke-linejoin="round"/>`
    + `<path d="${facets}" stroke="#fff" stroke-opacity=".28" stroke-width="${0.4 * s}"/>`
    + `<path d="M${cx - 0.6 * s} ${cy - 1 * s}l${0.5 * s} ${-2.6 * s}l${0.5 * s} ${2.6 * s}l${2.6 * s} ${0.5 * s}l${-2.6 * s} ${0.5 * s}l${-0.5 * s} ${2.6 * s}l${-0.5 * s} ${-2.6 * s}l${-2.6 * s} ${-0.5 * s}z" fill="#fff" fill-opacity=".9"/>`
    + `<circle cx="${cx - 0.1 * s}" cy="${cy - 0.5 * s}" r="${r * 0.55}" fill="#fff"/>`;
}

// The six stones in a ring, the first at the top.
export function ring(id) {
  return ORDER.map((c, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 3;
    const s = 0.4, x = 12 + 7.4 * Math.cos(a) - 12 * s, y = 12 + 7.6 * Math.sin(a) - 11.6 * s;
    return stone(c, `${id}${i}`, s, x, y, true);
  }).join("");
}

const svg = (body) => `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="1.5 0.5 21 22" fill="none">${body}</svg>\n`;

if (import.meta.url === `file://${process.argv[1]}`) {
  const dir = new URL("../multiverse/mods/multiverse/gems/", import.meta.url);
  mkdirSync(dir, { recursive: true });
  for (const c of ORDER) writeFileSync(new URL(`${c}.svg`, dir), svg(stone(c, "a")));
  writeFileSync(new URL("ring.svg", dir), svg(ring("r")));
}
