import { cameraOf, depthOf, iso, pathOf } from "./iso-kit.mjs";

// LEGO proportions in millimetres: one stud is 8 wide, a plate 3.2 tall, a brick three plates.
export const STUD = 8;
export const PLATE = 3.2;
export const BRICK = 9.6;
export const STUD_R = 2.4;
export const STUD_H = 1.7;
export const GAP = 0.1;

export const COLORS = {
  red: "#c91a09",
  yellow: "#f2cd37",
  blue: "#0055bf",
  green: "#237841",
  "bright-green": "#4b9f4a",
  lime: "#bbe90b",
  white: "#f6f6f2",
  black: "#27313a",
  "light-gray": "#a0a5a9",
  "dark-gray": "#6c6e68",
  tan: "#e4cd9e",
  "dark-tan": "#958a73",
  brown: "#7a3f1d",
  orange: "#fe8a18",
  azure: "#36aebf",
  skin: "#f6d01e",
  "trans-yellow": "#f5cd2f",
  "trans-clear": "#e8f4f8",
};

const channels = (color) => [1, 3, 5].map((at) => parseInt(color.slice(at, at + 2), 16));
const hexOf = (rgb) => `#${rgb.map((value) => Math.round(Math.max(0, Math.min(255, value))).toString(16).padStart(2, "0")).join("")}`;
export const colorOf = (name) => COLORS[name] ?? name;
export function mix(a, b, t) {
  const [from, to] = [channels(colorOf(a)), channels(colorOf(b))];
  return hexOf(from.map((value, index) => value + (to[index] - value) * t));
}
const lightness = (color) => {
  const [r, g, b] = channels(colorOf(color));
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
};

// Light from behind the left shoulder: tops brightest, the +y face mid, the +x face darkest,
// the way the faces read in a LEGO building-instructions booklet.
const unit = (v) => {
  const length = Math.hypot(...v) || 1;
  return v.map((value) => value / length);
};
export const LIGHT = unit([-0.35, 0.55, 1]);
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export function tone(color, intensity) {
  return intensity >= 0.8 ? mix(color, "#ffffff", (intensity - 0.8) * 0.6) : mix(color, "#000000", (0.8 - intensity) * 0.42);
}
export const edgeOf = (color) => (lightness(color) < 0.22 ? mix(color, "#ffffff", 0.28) : mix(color, "#000000", 0.55));

export function viewOf(projection) {
  const { sinA, cosA, sinE, cosE } = cameraOf(projection);
  return [cosA * cosE, sinA * cosE, sinE];
}

function newell(points) {
  const n = [0, 0, 0];
  points.forEach((a, index) => {
    const b = points[(index + 1) % points.length];
    n[0] += (a[1] - b[1]) * (a[2] + b[2]);
    n[1] += (a[2] - b[2]) * (a[0] + b[0]);
    n[2] += (a[0] - b[0]) * (a[1] + b[1]);
  });
  return unit(n);
}
const mean = (points) => points.reduce((sum, p) => [sum[0] + p[0] / points.length, sum[1] + p[1] / points.length, sum[2] + p[2] / points.length], [0, 0, 0]);
const keyOf = (p) => p.map((value) => Math.round(value * 100)).join(",");

// A convex solid given as its faces (3D polygons). Visible faces are filled by how they face the
// light; edges between two visible faces that meet at an angle are creases, and edges between a
// visible and a hidden face are the silhouette.
export function solidSvg(faces, color, projection, { trans = false, glow = false, crease = 28 } = {}) {
  const view = viewOf(projection);
  const centre = mean(faces.flat());
  const shaped = faces.map((points) => {
    let normal = newell(points);
    if (dot(normal, mean(points).map((value, index) => value - centre[index])) < 0) normal = normal.map((value) => -value);
    return { points, normal, visible: dot(normal, view) > 1e-6 };
  });
  const edges = new Map();
  shaped.forEach((face, which) =>
    face.points.forEach((a, index) => {
      const b = face.points[(index + 1) % face.points.length];
      const key = [keyOf(a), keyOf(b)].sort().join("|");
      const entry = edges.get(key) ?? { a, b, faces: [] };
      entry.faces.push(which);
      edges.set(key, entry);
    }),
  );
  const fills = shaped
    .filter((face) => face.visible)
    .map((face) => {
      const fill = tone(color, Math.max(0, dot(face.normal, LIGHT)));
      return `<path d="${pathOf(face.points.map((p) => iso(p, projection)), true)}" fill="${fill}" stroke="${fill}"/>`;
    });
  const limit = Math.cos((crease * Math.PI) / 180);
  let outline = "";
  let creases = "";
  for (const { a, b, faces: owners } of edges.values()) {
    const seen = owners.filter((which) => shaped[which].visible);
    const d = pathOf([iso(a, projection), iso(b, projection)]);
    if (seen.length === 1 && (owners.length === 1 || seen.length < owners.length)) outline += d;
    else if (seen.length === 2 && dot(shaped[owners[0]].normal, shaped[owners[1]].normal) < limit) creases += d;
  }
  const edge = edgeOf(color);
  return `<g class="lb"${trans ? " data-trans" : ""}${glow ? " data-glow" : ""}>${fills.join("")}<path class="lb-crease" d="${creases}" stroke="${edge}"/><path class="lb-edge" d="${outline}" stroke="${edge}"/></g>`;
}

// Face builders. Every builder returns a list of 3D polygons for solidSvg.
export function prismFaces(ring, z0, z1) {
  const bottom = ring.map(([x, y]) => [x, y, z0]);
  const top = ring.map(([x, y]) => [x, y, z1]);
  const sides = ring.map((_, index) => {
    const next = (index + 1) % ring.length;
    return [bottom[index], bottom[next], top[next], top[index]];
  });
  return [top, [...bottom].reverse(), ...sides];
}
export const boxFaces = (x0, y0, z0, x1, y1, z1) => prismFaces([[x0, y0], [x1, y0], [x1, y1], [x0, y1]], z0, z1);
export const circleOf = (cx, cy, r, steps = 24) =>
  Array.from({ length: steps }, (_, step) => {
    const angle = (step / steps) * Math.PI * 2;
    return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
  });
export const cylinderFaces = (cx, cy, r, z0, z1, steps = 24) => prismFaces(circleOf(cx, cy, r, steps), z0, z1);
// A profile drawn in the (across, z) plane and pushed along the x or y axis: slopes, arches, wedges.
export function extrudeFaces(profile, axis, from, to) {
  const at = (u, v, w) => (axis === "y" ? [u, w, v] : [w, u, v]);
  const a = profile.map(([u, v]) => at(u, v, from));
  const b = profile.map(([u, v]) => at(u, v, to));
  const sides = profile.map((_, index) => {
    const next = (index + 1) % profile.length;
    return [a[index], a[next], b[next], b[index]];
  });
  return [a, [...b].reverse(), ...sides];
}
// A frustum between two horizontal circles: cones, dishes, lamp shades.
export function frustumFaces(cx, cy, r0, z0, r1, z1, steps = 24) {
  const low = circleOf(cx, cy, r0, steps).map(([x, y]) => [x, y, z0]);
  const high = circleOf(cx, cy, r1, steps).map(([x, y]) => [x, y, z1]);
  const sides = low.map((_, index) => {
    const next = (index + 1) % steps;
    return [low[index], low[next], high[next], high[index]];
  });
  return [high, [...low].reverse(), ...sides];
}

// A stud is cheap: a side band and a top ellipse, since a level circle projects to an ellipse.
export function studSvg(cx, cy, z, color, projection, { r = STUD_R, h = STUD_H } = {}) {
  const { sinE, k } = cameraOf(projection);
  const [sx, sy] = iso([cx, cy, z + h], projection);
  const [, by] = iso([cx, cy, z], projection);
  const rx = r * k;
  const ry = rx * sinE;
  const drop = by - sy;
  const f = (value) => Math.round(value * 100) / 100;
  const side = `M${f(sx - rx)} ${f(sy)}v${f(drop)}a${f(rx)} ${f(ry)} 0 0 0 ${f(rx * 2)} 0v${f(-drop)}`;
  const top = `M${f(sx - rx)} ${f(sy)}a${f(rx)} ${f(ry)} 0 1 0 ${f(rx * 2)} 0a${f(rx)} ${f(ry)} 0 1 0 ${f(-rx * 2)} 0Z`;
  const edge = edgeOf(color);
  return `<path class="lb-stud" d="${side}Z" fill="${tone(color, 0.42)}"/><path class="lb-stud" d="${top}" fill="${tone(color, 0.86)}"/><path class="lb-edge" d="${side}${top}" stroke="${edge}"/>`;
}
export function studsSvg(points, color, projection, options) {
  return [...points]
    .sort((a, b) => depthOf(a, projection) - depthOf(b, projection))
    .map(([x, y, z]) => studSvg(x, y, z, color, projection, options))
    .join("");
}

// Pieces. Positions and sizes are on the LEGO grid: x, y, w, d in studs, z and h in plates.
// Every piece is { box, svg(P) } so a scene can put them in painter's order.
export function boxOf(x0, y0, z0, x1, y1, z1) {
  return { x0, y0, z0, x1, y1, z1 };
}
export function brick({ x, y, z = 0, w = 1, d = 1, h = 3, color, studs = true, trans = false, ...rest }) {
  const x0 = x * STUD + GAP;
  const y0 = y * STUD + GAP;
  const x1 = (x + w) * STUD - GAP;
  const y1 = (y + d) * STUD - GAP;
  const z0 = z * PLATE;
  const z1 = (z + h) * PLATE;
  const tops = [];
  if (studs) for (let i = 0; i < w; i++) for (let j = 0; j < d; j++) tops.push([(x + i + 0.5) * STUD, (y + j + 0.5) * STUD, z1]);
  return {
    kind: "brick",
    ...rest,
    color,
    grid: { x, y, z, w, d, h },
    box: boxOf(x0, y0, z0, x1, y1, z1),
    svg: (P) => solidSvg(boxFaces(x0, y0, z0, x1, y1, z1), color, P, { trans }) + studsSvg(tops, color, P),
  };
}
export const plate = (options) => brick({ h: 1, ...options });
export const tile = (options) => brick({ h: 1, studs: false, ...options });
export function round({ x, y, z = 0, w = 1, h = 3, color, studs = true, trans = false, glow = false, steps = 24, ...rest }) {
  const r = (w * STUD) / 2 - GAP;
  const cx = (x + w / 2) * STUD;
  const cy = (y + w / 2) * STUD;
  const z0 = z * PLATE;
  const z1 = (z + h) * PLATE;
  return {
    kind: "round",
    ...rest,
    color,
    grid: { x, y, z, w, d: w, h },
    circle: [cx, cy, r],
    box: boxOf(cx - r, cy - r, z0, cx + r, cy + r, z1),
    svg: (P) => solidSvg(cylinderFaces(cx, cy, r, z0, z1, steps), color, P, { trans, glow }) + (studs ? studsSvg([[cx, cy, z1]], color, P) : ""),
  };
}
// A free-form piece: any faces, with its bounding box worked out for the sort.
export function custom({ faces, color, trans = false, glow = false, extra, ...rest }) {
  const all = faces.flat();
  const lo = [0, 1, 2].map((axis) => Math.min(...all.map((p) => p[axis])));
  const hi = [0, 1, 2].map((axis) => Math.max(...all.map((p) => p[axis])));
  return {
    kind: "custom",
    ...rest,
    color,
    box: rest.box ?? boxOf(lo[0], lo[1], lo[2], hi[0], hi[1], hi[2]),
    svg: (P) => solidSvg(faces, color, P, { trans, glow }) + (extra ? extra(P) : ""),
  };
}
// A straight pipe in millimetres, along "x", "y" or "z" from `from` to `to`, through the point
// `at` = the other two coordinates ([y, z] for "x", [x, z] for "y", [x, y] for "z").
// Pipes run into what they connect, so the audit lets them overlap other pieces.
export function pipe({ axis, from, to, at: [a, c], r = 2.4, color = "blue", steps = 14, ...rest }) {
  const faces = axis === "z" ? cylinderFaces(a, c, r, from, to, steps) : extrudeFaces(circleOf(a, c, r, steps), axis, from, to);
  return custom({ faces, color, kind: "pipe", overlaps: true, ...rest });
}
// Several solids that move and sort as one piece (a minifigure, a lamp head), listed back to front.
export function group({ parts, box, ...rest }) {
  const boxes = parts.map((part) => part.box);
  return {
    kind: "group",
    ...rest,
    box: box ?? boxOf(Math.min(...boxes.map((b) => b.x0)), Math.min(...boxes.map((b) => b.y0)), Math.min(...boxes.map((b) => b.z0)), Math.max(...boxes.map((b) => b.x1)), Math.max(...boxes.map((b) => b.y1)), Math.max(...boxes.map((b) => b.z1))),
    svg: (P) => parts.map((part) => part.svg(P)).join(""),
  };
}

// A minifigure standing at stud (x, y) on plate level z, facing +y (towards the viewer's left) or,
// with facing: "x", towards +x (the viewer's right). With legs: null it is seated: its waist is at
// z, as on a seat or in a kart.
export function minifig({ x, y, z = 0, torso = "red", legs = "blue", hair = "brown", hat, facing = "y", ...rest }) {
  const cx = x * STUD;
  const cy = y * STUD;
  const z0 = z * PLATE;
  const skin = "skin";
  // Local coordinates: s across the shoulders, f towards the face.
  const toWorld = (s, f) => (facing === "x" ? [cx + f, cy + s] : [cx + s, cy + f]);
  const box = (s0, s1, f0, f1, za, zb) => {
    const [ax, ay] = toWorld(s0, f0);
    const [bx, by] = toWorld(s1, f1);
    return boxFaces(Math.min(ax, bx), Math.min(ay, by), za, Math.max(ax, bx), Math.max(ay, by), zb);
  };
  const slab = (profile, f0, f1) => (facing === "x" ? extrudeFaces(profile.map(([s, v]) => [cy + s, v]), "x", cx + f0, cx + f1) : extrudeFaces(profile.map(([s, v]) => [cx + s, v]), "y", cy + f0, cy + f1));
  const seated = legs === null;
  const legParts = seated ? [] : [-1, 1].map((side) => custom({ faces: box(side * 0.2 - (side < 0 ? 3.8 : 0), side * 0.2 + (side > 0 ? 3.8 : 0), -2.6, 3, z0, z0 + 11.2), color: legs }));
  const hips = seated ? [] : [custom({ faces: box(-4, 4, -2.6, 2.6, z0 + 11.2, z0 + 13.4), color: legs })];
  const waist = seated ? z0 : z0 + 13.4;
  const neck = waist + 11.6;
  const torsoPart = custom({ faces: slab([[-7.6, waist], [7.6, waist], [6, neck], [-6, neck]], -3.2, 3.2), color: torso });
  const arm = (side) => custom({ faces: slab([[-1.8, neck - 1.6], [1.8, neck - 1.6], [1.8 + side * 0.8, waist + 1.2], [-1.8 + side * 0.8, waist + 1.2]].map(([u, v]) => [side * 7.4 + u, v]), -1.9, 1.9), color: torso });
  const hand = (side) => {
    const [hx, hy] = toWorld(side * 8.2, 0.8);
    return round({ x: hx / STUD - 0.2, y: hy / STUD - 0.2, z: (waist - 2) / PLATE, w: 0.4, h: 1.1, color: skin, studs: false, steps: 12 });
  };
  const headZ = neck + 0.8;
  const head = custom({ faces: cylinderFaces(cx, cy, 4.6, headZ, headZ + 8.6, 20), color: skin, extra: (P) => faceSvg(cx, cy, 4.6, headZ, P, facing) });
  const neckPart = custom({ faces: cylinderFaces(cx, cy, 2.4, neck, headZ, 12), color: skin });
  const top = hat
    ? custom({ faces: cylinderFaces(cx, cy, 5.4, headZ + 7.8, headZ + 10.6, 20), color: hat, extra: (P) => studSvg(cx, cy, headZ + 10.6, hat, P, { r: 2.2 }) })
    : custom({ faces: frustumFaces(cx, cy, 5.2, headZ + 6.4, 4.2, headZ + 10.8, 20), color: hair });
  const [lo, hi] = [toWorld(-9, -3.2), toWorld(9, 3.2)];
  return group({
    kind: "minifig",
    ...rest,
    box: boxOf(Math.min(lo[0], hi[0]), Math.min(lo[1], hi[1]), z0, Math.max(lo[0], hi[0]), Math.max(lo[1], hi[1]), headZ + 11),
    parts: [...legParts, ...hips, arm(-1), torsoPart, arm(1), hand(-1), hand(1), neckPart, head, top],
  });
}
// Two eyes and a smile printed on the side of a minifigure head that faces +y (or +x).
function faceSvg(cx, cy, r, z, projection, facing = "y") {
  const on = (angle, height) => {
    const [a, b] = [Math.sin(angle) * r * 1.01, Math.cos(angle) * r * 1.01];
    return iso(facing === "x" ? [cx + b, cy + a, z + height] : [cx + a, cy + b, z + height], projection);
  };
  const eyes = [-0.42, 0.42].map((angle) => on(angle, 5.4));
  const smile = Array.from({ length: 9 }, (_, step) => {
    const t = step / 8 - 0.5;
    return on(t * 1.1, 3 - Math.cos(t * Math.PI) * 1.2 + 0.4);
  });
  return `${eyes.map(([x, y]) => `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="0.9" fill="#1b1b1b"/>`).join("")}<path class="lb-face" d="${pathOf(smile)}"/>`;
}

// Painter's order for pieces that don't pass through each other. Where two pieces overlap on
// screen and are apart along some axis, the one nearer the viewer along that axis goes later.
function screenBox(box, projection) {
  const points = [];
  for (const x of [box.x0, box.x1]) for (const y of [box.y0, box.y1]) for (const z of [box.z0, box.z1 + STUD_H]) points.push(iso([x, y, z], projection));
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
}
const centreDepth = (box, projection) => depthOf([(box.x0 + box.x1) / 2, (box.y0 + box.y1) / 2, (box.z0 + box.z1) / 2], projection);
export function orderPieces(pieces, projection) {
  const [vx, vy] = [cameraOf(projection).cosA, cameraOf(projection).sinA];
  const n = pieces.length;
  const rects = pieces.map((piece) => screenBox(piece.box, projection));
  const depth = pieces.map((piece) => centreDepth(piece.box, projection));
  const later = Array.from({ length: n }, () => []);
  const waiting = new Array(n).fill(0);
  const e = 1e-6;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const [ri, rj] = [rects[i], rects[j]];
      if (ri[2] <= rj[0] || rj[2] <= ri[0] || ri[3] <= rj[1] || rj[3] <= ri[1]) continue;
      const [a, b] = [pieces[i].box, pieces[j].box];
      let jFront;
      if (a.z1 <= b.z0 + e) jFront = true;
      else if (b.z1 <= a.z0 + e) jFront = false;
      else if (a.x1 <= b.x0 + e) jFront = vx > 0;
      else if (b.x1 <= a.x0 + e) jFront = vx <= 0;
      else if (a.y1 <= b.y0 + e) jFront = vy > 0;
      else if (b.y1 <= a.y0 + e) jFront = vy <= 0;
      else jFront = depth[j] >= depth[i];
      const [first, second] = jFront ? [i, j] : [j, i];
      later[first].push(second);
      waiting[second]++;
    }
  }
  const order = [];
  const ready = new Set(pieces.map((_, index) => index).filter((index) => waiting[index] === 0));
  const left = new Set(pieces.map((_, index) => index));
  while (left.size) {
    let pick = -1;
    const pool = ready.size ? ready : left;
    for (const index of pool) if (pick < 0 || depth[index] < depth[pick]) pick = index;
    ready.delete(pick);
    left.delete(pick);
    order.push(pieces[pick]);
    for (const next of later[pick]) if (left.has(next) && --waiting[next] === 0) ready.add(next);
  }
  return order;
}

// The whole scene in painter's order. Each piece is wrapped so a lesson can hide it until its
// building step, then drop it into place.
export function sceneSvg(pieces, projection) {
  const count = new Map();
  return orderPieces(pieces, projection)
    .map((piece) => {
      const step = piece.step ?? 0;
      const index = count.get(step) ?? 0;
      count.set(step, index + 1);
      const data = (piece.id ? ` data-id="${piece.id}"` : "") + (piece.until !== undefined ? ` data-until="${piece.until}"` : "");
      return `<g class="lb-piece" data-step="${step}"${data} style="--i:${index}">${piece.svg(projection)}</g>`;
    })
    .join("");
}

export const BRICK_CSS = `
.lb path{stroke-width:.45;stroke-linejoin:round}
.lb .lb-edge,.lb-edge{fill:none;stroke-width:.9;stroke-linejoin:round;stroke-linecap:round}
.lb .lb-crease{fill:none;stroke-width:.6;stroke-opacity:.55;stroke-linecap:round}
.lb-stud{stroke:none}
.lb[data-trans]>path:not(.lb-edge):not(.lb-crease){fill-opacity:.78}
.lb-face{fill:none;stroke:#1b1b1b;stroke-width:.8;stroke-linecap:round}
.iso-svg .lb-hose{fill:none;stroke-linecap:butt;stroke-linejoin:round;vector-effect:none}
.lb-ring{fill:none;stroke-width:.7;stroke-opacity:.6;stroke-linecap:round}
`;
