import { depthOf, iso, pathOf } from "./iso-kit.mjs";
import { GAP, LIGHT, PLATE, STUD, boxOf, edgeOf, studSvg, tone, viewOf } from "./brick.mjs";

// Round LEGO parts made by turning a profile around an axis: domes, cones, barrels, balls, dishes
// and wheels. Kept simple: flat facets shaded like the rest of
// the bricks, painted back to front so concave parts (a dish, a wheel's hub) read correctly.

const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const unit = (v) => {
  const length = Math.hypot(...v) || 1;
  return v.map((value) => value / length);
};
const AXES = {
  x: { a: [1, 0, 0], u: [0, 1, 0], v: [0, 0, 1] },
  y: { a: [0, 1, 0], u: [1, 0, 0], v: [0, 0, 1] },
  z: { a: [0, 0, 1], u: [1, 0, 0], v: [0, 1, 0] },
};
const keyOf = (p) => p.map((value) => Math.round(value * 100)).join(",");

// A profile is a list of [t, r]: t along the axis from `at`, r out from it. Walk it so the solid is
// on your left: up the axis side first, out along the bottom, up the outside, back in along the top.
// Each face then knows its outward normal from the profile, which works for concave parts too.
export function revolveFaces(profile, { at = [0, 0, 0], axis = "z", steps = 32 } = {}) {
  const { a, u, v } = AXES[axis];
  const ring = (t, r, angle) => {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    return [0, 1, 2].map((i) => at[i] + a[i] * t + (u[i] * c + v[i] * s) * r);
  };
  const faces = [];
  for (let i = 0; i + 1 < profile.length; i++) {
    const [t0, r0] = profile[i];
    const [t1, r1] = profile[i + 1];
    if (r0 < 1e-6 && r1 < 1e-6) continue;
    const nt = -(r1 - r0);
    const nr = t1 - t0;
    for (let j = 0; j < steps; j++) {
      const a0 = (j / steps) * Math.PI * 2;
      const a1 = ((j + 1) / steps) * Math.PI * 2;
      const mid = (a0 + a1) / 2;
      const radial = [0, 1, 2].map((k) => u[k] * Math.cos(mid) + v[k] * Math.sin(mid));
      const normal = unit([0, 1, 2].map((k) => a[k] * nt + radial[k] * nr));
      const points = [ring(t0, r0, a0), ring(t0, r0, a1), ring(t1, r1, a1), ring(t1, r1, a0)].filter((p, index, all) => index === 0 || keyOf(p) !== keyOf(all[index - 1]));
      if (keyOf(points[0]) === keyOf(points[points.length - 1])) points.pop();
      if (points.length >= 3) faces.push({ points, normal, smooth: r0 > 1e-6 && r1 > 1e-6 && Math.abs(nr) > Math.abs(nt) * 0.2 });
    }
  }
  return faces;
}

// Faces with known normals, painted back to front. Creases are drawn where two visible faces meet at
// an angle, the outline where a visible face meets a hidden one; each line goes on with the later of
// its faces, so nearer faces cover what they should.
export function meshSvg(faces, color, projection, { trans = false, crease = 30 } = {}) {
  const view = viewOf(projection);
  const shown = faces
    .map((face) => ({ ...face, depth: depthOf(face.points.reduce((s, p) => [s[0] + p[0], s[1] + p[1], s[2] + p[2]], [0, 0, 0]).map((value) => value / face.points.length), projection) }))
    .map((face) => ({ ...face, visible: dot(face.normal, view) > 1e-6 }));
  const order = shown.map((_, index) => index).filter((index) => shown[index].visible).sort((i, j) => shown[i].depth - shown[j].depth);
  const rank = new Map(order.map((index, place) => [index, place]));
  const edges = new Map();
  shown.forEach((face, which) =>
    face.points.forEach((a, index) => {
      const b = face.points[(index + 1) % face.points.length];
      const key = [keyOf(a), keyOf(b)].sort().join("|");
      const entry = edges.get(key) ?? { a, b, faces: [] };
      entry.faces.push(which);
      edges.set(key, entry);
    }),
  );
  const limit = Math.cos((crease * Math.PI) / 180);
  const lines = order.map(() => ({ outline: "", crease: "" }));
  for (const { a, b, faces: owners } of edges.values()) {
    const seen = owners.filter((which) => shown[which].visible);
    if (!seen.length) continue;
    const owner = seen.reduce((best, which) => (rank.get(which) > rank.get(best) ? which : best));
    const d = pathOf([iso(a, projection), iso(b, projection)]);
    if (seen.length < owners.length || owners.length === 1) lines[rank.get(owner)].outline += d;
    else if (dot(shown[owners[0]].normal, shown[owners[1]].normal) < limit) lines[rank.get(owner)].crease += d;
  }
  const edge = edgeOf(color);
  const parts = order.map((index, place) => {
    const fill = tone(color, Math.max(0, dot(shown[index].normal, LIGHT)));
    const { outline, crease: creaseD } = lines[place];
    return `<path d="${pathOf(shown[index].points.map((p) => iso(p, projection)), true)}" fill="${fill}"${trans ? "" : ` stroke="${fill}"`}/>${creaseD ? `<path class="lb-crease" d="${creaseD}" stroke="${edge}"/>` : ""}${outline ? `<path class="lb-edge" d="${outline}" stroke="${edge}"/>` : ""}`;
  });
  return `<g class="lb"${trans ? " data-trans" : ""}>${parts.join("")}</g>`;
}

const boxAround = (faces) => {
  const all = faces.flatMap((face) => face.points);
  const lo = [0, 1, 2].map((axis) => Math.min(...all.map((p) => p[axis])));
  const hi = [0, 1, 2].map((axis) => Math.max(...all.map((p) => p[axis])));
  return boxOf(lo[0], lo[1], lo[2], hi[0], hi[1], hi[2]);
};

// Any turned part, in millimetres. `extra(P)` draws on top (a stud, a print).
export function turned({ profile, at, axis = "z", steps = 32, color, trans = false, extra, ...rest }) {
  const faces = revolveFaces(profile, { at, axis, steps });
  const circle = axis === "z" ? [at[0], at[1], Math.max(...profile.map(([, r]) => r))] : undefined;
  return { kind: "turned", ...rest, color, circle, box: rest.box ?? boxAround(faces), svg: (P) => meshSvg(faces, color, P, { trans }) + (extra ? extra(P) : "") };
}

// Grid parts: x, y, w in studs, z and h in plates, like brick.mjs.
const centreOf = (x, y, w) => [(x + w / 2) * STUD, (y + w / 2) * STUD];
const arc = (from, to, count, fn) => Array.from({ length: count + 1 }, (_, i) => fn(from + ((to - from) * i) / count));

// A dome: a short round collar with a half sphere on it (the 2x2 and 4x4 domes).
export function dome({ x, y, z = 0, w = 2, color, trans = false, ...rest }) {
  const R = (w * STUD) / 2 - GAP;
  const collar = PLATE;
  const profile = [[0, 0], [0, R], [collar, R], ...arc(0, Math.PI / 2, 10, (angle) => [collar + Math.sin(angle) * R, Math.cos(angle) * R]).slice(1)];
  return turned({ ...rest, kind: "dome", grid: { x, y, z, w, d: w }, profile, at: [...centreOf(x, y, w), z * PLATE], color, trans });
}
// A cone, with the stud on its tip for 1x1 and 2x2 cones.
export function cone({ x, y, z = 0, w = 1, h = 3, top, color, studs = true, trans = false, ...rest }) {
  const R = (w * STUD) / 2 - GAP;
  const r = top ?? (w <= 1 ? 2.4 : R * 0.3);
  const H = h * PLATE;
  const [cx, cy] = centreOf(x, y, w);
  return turned({
    ...rest,
    kind: "cone",
    grid: { x, y, z, w, d: w, h },
    profile: [[0, 0], [0, R], [0.8, R], [H, r], [H, 0]],
    at: [cx, cy, z * PLATE],
    color,
    trans,
    extra: studs ? (P) => studSvg(cx, cy, z * PLATE + H, color, P, { r: Math.min(2.4, r) }) : undefined,
  });
}
// A barrel standing up, with two hoops (the 2x2 barrel is 6 plates tall).
export function barrel({ x, y, z = 0, w = 2, h = 6, color = "brown", ...rest }) {
  const R = (w * STUD) / 2 - GAP;
  const H = h * PLATE;
  const bulge = (t) => R * (0.86 + 0.14 * Math.sin(Math.PI * t));
  const profile = [[0, 0], ...arc(0, 1, 8, (t) => [t * H, bulge(t)]), [H, 0]];
  return turned({ ...rest, kind: "barrel", grid: { x, y, z, w, d: w, h }, profile, at: [...centreOf(x, y, w), z * PLATE], color, steps: 28 });
}
// A ball centred anywhere, in millimetres (the Earth, a ball, a planet).
export function ball({ at, r, color, trans = false, steps = 28, ...rest }) {
  const profile = arc(Math.PI, 0, 14, (angle) => [Math.cos(angle) * r, Math.sin(angle) * r]);
  return turned({ ...rest, kind: "ball", profile, at, color, trans, steps });
}
// A dish: a shallow bowl, open side up (a radar or satellite dish) or down (a lamp shade, an umbrella).
export function dish({ x, y, z = 0, w = 4, depth = 6, up = true, color, ...rest }) {
  const R = (w * STUD) / 2 - GAP;
  const t = 1;
  const curve = (r) => depth * (r / R) ** 2;
  const shell = arc(0, R, 10, (r) => r);
  const back = [...shell].reverse();
  const profile = up
    ? [...shell.map((r) => [curve(r), r]), ...back.map((r) => [curve(r) + t, Math.max(0, r - 0.5)])]
    : [...shell.map((r) => [depth - curve(r), r]), ...back.map((r) => [depth - curve(r) + t, r])];
  return turned({ ...rest, kind: "dish", grid: { x, y, z, w, d: w }, profile, at: [...centreOf(x, y, w), z * PLATE], color, steps: 36 });
}
// A wheel on an axle along x or y: a black tyre with a rounded tread around a rim with a sunken hub.
// `at` is the wheel's centre in millimetres.
export function wheel({ at, axis = "y", r = 7, width = 6, tire = "black", rim = "light-gray", ...rest }) {
  const half = width / 2;
  const rimR = r * 0.62;
  const round = Math.min(half, r * 0.25);
  const tread = [[-half, rimR], [-half, r - round], ...arc(Math.PI, Math.PI / 2, 4, (angle) => [-half + round + Math.cos(angle) * round, r - round + Math.sin(angle) * round]).slice(1), ...arc(Math.PI / 2, 0, 4, (angle) => [half - round + Math.cos(angle) * round, r - round + Math.sin(angle) * round]).slice(1), [half, rimR]];
  const tyre = revolveFaces([...tread, tread[0]], { at, axis, steps: 32 });
  const hub = revolveFaces([[-half + 0.6, 0], [-half + 0.6, rimR], [half - 0.6, rimR], [half - 0.6, rimR * 0.45], [half - 1.6, rimR * 0.45], [half - 1.6, 0]], { at, axis, steps: 24 });
  const box = boxAround([...tyre, ...hub]);
  return { ...rest, kind: "wheel", box, svg: (P) => meshSvg(tyre, tire, P) + meshSvg(hub, rim, P) };
}
