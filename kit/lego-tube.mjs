import { cameraOf, iso, pathOf } from "./iso-kit.mjs";
import { boxOf, edgeOf, tone } from "./brick.mjs";

// LEGO hoses, flexible tubes and cables: the LEGO counterpart of tube.mjs. Seen in an orthographic
// camera a round tube is the same width everywhere, so it is drawn as strokes along its centre line:
// a dark edge, the body, a highlight towards the light, and rings if it is a ribbed hose. A long tube
// is cut into short chunks so each sorts on its own among the bricks it passes.

const f = (value) => Math.round(value * 100) / 100;

// A smooth curve through points (Catmull–Rom), in millimetres.
export function curve(points, { samples = 8 } = {}) {
  if (points.length < 3) return points.map((p) => [...p]);
  const out = [];
  for (let i = 0; i + 1 < points.length; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    for (let s = 0; s < samples; s++) {
      const t = s / samples;
      const t2 = t * t;
      const t3 = t2 * t;
      out.push([0, 1, 2].map((k) => 0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3)));
    }
  }
  out.push([...points[points.length - 1]]);
  return out;
}
// A cable hanging between two points, dropping `drop` mm at the middle.
export function sag(from, to, drop, count = 12) {
  return Array.from({ length: count + 1 }, (_, i) => {
    const t = i / count;
    return [0, 1, 2].map((k) => from[k] + (to[k] - from[k]) * t - (k === 2 ? drop * 4 * t * (1 - t) : 0));
  });
}
// Even spacing along a polyline, so rings and chunks are regular.
export function resample(points, spacing) {
  const out = [points[0]];
  let carry = 0;
  for (let i = 1; i < points.length; i++) {
    const [a, b] = [points[i - 1], points[i]];
    const length = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    let at = spacing - carry;
    while (at <= length) {
      const t = at / length;
      out.push([0, 1, 2].map((k) => a[k] + (b[k] - a[k]) * t));
      at += spacing;
    }
    carry = length - (at - spacing);
  }
  const last = points[points.length - 1];
  const end = out[out.length - 1];
  if (Math.hypot(last[0] - end[0], last[1] - end[1], last[2] - end[2]) > spacing * 0.2) out.push([...last]);
  return out;
}

function strokesSvg(points, projection, { r, color, ribbed, pitch, ribsFrom = 0, capStart, capEnd }) {
  const { k } = cameraOf(projection);
  const w = 2 * r * k;
  const screen = points.map((p) => iso(p, projection));
  const d = pathOf(screen);
  const edge = edgeOf(color);
  const body = tone(color, 0.58);
  const shine = tone(color, 1);
  const parts = [
    `<path class="lb-hose" d="${d}" stroke="${edge}" stroke-width="${f(w + 1.3)}"/>`,
    `<path class="lb-hose" d="${d}" stroke="${body}" stroke-width="${f(w)}"/>`,
    `<path class="lb-hose" d="${d}" stroke="${shine}" stroke-width="${f(w * 0.3)}" stroke-opacity=".75" transform="translate(${f(-w * 0.16)} ${f(-w * 0.2)})"/>`,
  ];
  if (ribbed) {
    let rings = "";
    const step = Math.max(1, Math.round(pitch));
    for (let i = (step - (ribsFrom % step)) % step; i < points.length; i += step) {
      const a = screen[Math.max(0, i - 1)];
      const b = screen[Math.min(screen.length - 1, i + 1)];
      const length = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      const [nx, ny] = [-(b[1] - a[1]) / length, (b[0] - a[0]) / length];
      const [x, y] = screen[i];
      rings += `M${f(x - nx * w * 0.5)} ${f(y - ny * w * 0.5)}L${f(x + nx * w * 0.5)} ${f(y + ny * w * 0.5)}`;
    }
    parts.push(`<path class="lb-ring" d="${rings}" stroke="${edge}"/>`);
  }
  const cap = ([x, y]) => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(w / 2)}" fill="${body}" stroke="${edge}" stroke-width=".9"/>`;
  if (capStart) parts.push(cap(screen[0]));
  if (capEnd) parts.push(cap(screen[screen.length - 1]));
  return `<g class="lb-tube">${parts.join("")}</g>`;
}

// A hose as scene pieces: give it to sceneSvg with the bricks. `points` is its centre line in mm
// (pass it through curve() for bends); `ribbed` adds rings every `pitch` mm, like a Technic hose.
export function hose({ points, r = 2.4, color = "black", ribbed = false, pitch = 2.4, chunk = 14, caps = true, ...rest }) {
  const dense = resample(points, 1);
  const size = Math.max(4, Math.round(chunk));
  const pieces = [];
  for (let from = 0; from < dense.length - 1; from += size) {
    const to = Math.min(dense.length - 1, from + size + 1);
    const part = dense.slice(from, to + 1);
    const lo = [0, 1, 2].map((axis) => Math.min(...part.map((p) => p[axis])) - r);
    const hi = [0, 1, 2].map((axis) => Math.max(...part.map((p) => p[axis])) + r);
    pieces.push({
      overlaps: true,
      float: true,
      ...rest,
      kind: "hose",
      color,
      box: boxOf(lo[0], lo[1], lo[2], hi[0], hi[1], hi[2]),
      svg: (P) => strokesSvg(part, P, { r, color, ribbed, pitch, ribsFrom: from, capStart: caps && from === 0, capEnd: caps && to === dense.length - 1 }),
    });
  }
  return pieces;
}
// The same tube as one piece of markup, for overlays above the scene (a cable in the air).
export function tubeSvg(points, projection, { r = 1, color = "black", ribbed = false, pitch = 2.4, caps = false } = {}) {
  return strokesSvg(resample(points, 1), projection, { r, color, ribbed, pitch, capStart: caps, capEnd: caps });
}

