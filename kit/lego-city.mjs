import { iso, pathOf } from "./iso-kit.mjs";
import { GAP, PLATE, STUD, boxFaces, brick, custom, extrudeFaces, group, plate, round, tile } from "./brick.mjs";
import { ball, wheel } from "./lego-round.mjs";

// LEGO City, ready-made: road plates with markings, sidewalks, building fronts with framed windows,
// awnings and signs, round-leaved trees and bushes, flowers, street furniture, a car and a dog. Each
// builder returns a list of scene pieces, so spread it into the scene: pieces.push(...tree({ … })).
// Grid sizes are in studs and plates, like brick.mjs.

export const ROAD = "#a0a5a9";
export const PAVEMENT = "#c9ccc8";

// A road plate: smooth light grey, with a dashed white centre line along x or y.
// `skip` is a [from, to] stretch (in studs along the road) left without dashes, for a crossing.
export function road({ x, y, w, d, z = 0, along = "x", dashes = true, skip = null, step = 0 }) {
  const out = [tile({ x, y, z, w, d, color: ROAD, step })];
  if (!dashes) return out;
  const top = (z + 1) * PLATE;
  // Markings are paint: tyres may stand on them.
  const mark = (x0, y0, x1, y1) => custom({ faces: boxFaces(x0, y0, top, x1, y1, top + 0.3), color: "white", step, overlaps: true });
  const clear = (s) => !skip || s + 2 <= skip[0] || s >= skip[1];
  if (along === "x") for (let s = x + 1; s + 2 <= x + w; s += 4) { if (clear(s)) out.push(mark(s * STUD, (y + d / 2 - 0.25) * STUD, (s + 2) * STUD, (y + d / 2 + 0.25) * STUD)); }
  else for (let s = y + 1; s + 2 <= y + d; s += 4) { if (clear(s)) out.push(mark((x + w / 2 - 0.25) * STUD, s * STUD, (x + w / 2 + 0.25) * STUD, (s + 2) * STUD)); }
  return out;
}
// A zebra crossing on a road: white stripes running across it, so a road along x gets stripes along y.
export function crossing({ x, y, w, d, z = 0, along = "x", step = 0 }) {
  const top = (z + 1) * PLATE;
  const out = [];
  if (along === "x") for (let s = y + 0.5; s + 1 <= y + d; s += 1.6) out.push(custom({ faces: boxFaces(x * STUD, s * STUD, top, (x + w) * STUD, (s + 0.9) * STUD, top + 0.3), color: "white", step, overlaps: true }));
  else for (let s = x + 0.5; s + 1 <= x + w; s += 1.6) out.push(custom({ faces: boxFaces(s * STUD, y * STUD, top, (s + 0.9) * STUD, (y + d) * STUD, top + 0.3), color: "white", step, overlaps: true }));
  return out;
}
// A raised sidewalk of 2x2 tiles, a curb's height above the road.
export function sidewalk({ x, y, w, d, z = 0, h = 2, color = PAVEMENT, step = 0 }) {
  const out = [];
  for (let i = x; i < x + w; i += 2) for (let j = y; j < y + d; j += 2) out.push(tile({ x: i, y: j, z, w: Math.min(2, x + w - i), d: Math.min(2, y + d - j), h, color, step }));
  return out;
}

// A round-leaved tree: a trunk of brown round bricks under a crown of green leaf balls.
export function tree({ x, y, z = 1, size = 1, color = "bright-green", step = 0 }) {
  const trunk = Math.round(3 + size * 2);
  const out = [];
  for (let i = 0; i < trunk; i++) out.push(round({ x, y, z: z + i * 3, w: 1, h: 3, color: "brown", studs: false, steps: 14, step, offGrid: size % 1 !== 0 }));
  const [cx, cy] = [(x + 0.5) * STUD, (y + 0.5) * STUD];
  const base = (z + trunk * 3) * PLATE;
  const r = 9 * size;
  out.push(group({
    kind: "crown",
    step,
    float: true,
    overlaps: true,
    parts: [
      ball({ at: [cx - r * 0.5, cy - r * 0.35, base + r * 0.7], r: r * 0.78, color: "green", steps: 12, rings: 8 }),
      ball({ at: [cx, cy, base + r * 1.15], r, color, steps: 14, rings: 9 }),
      ball({ at: [cx + r * 0.45, cy + r * 0.45, base + r * 0.65], r: r * 0.72, color, steps: 12, rings: 8 }),
    ],
  }));
  return out;
}
// A low bush of three leaf balls.
export function bush({ x, y, z = 1, size = 1, step = 0 }) {
  const [cx, cy, cz] = [x * STUD, y * STUD, z * PLATE];
  const r = 5 * size;
  return [group({
    kind: "bush",
    step,
    overlaps: true,
    parts: [
      ball({ at: [cx - r * 0.6, cy - r * 0.3, cz + r * 0.8], r: r * 0.85, color: "green", steps: 10, rings: 7 }),
      ball({ at: [cx + r * 0.6, cy - r * 0.2, cz + r * 0.8], r: r * 0.8, color: "bright-green", steps: 10, rings: 7 }),
      ball({ at: [cx, cy + r * 0.4, cz + r * 0.9], r, color: "bright-green", steps: 10, rings: 7 }),
    ],
  })];
}
// Flowers: round 1x1 plates in white or yellow, scattered on the grass.
export function flowers(spots, { z = 1, step = 0 } = {}) {
  return spots.map(([x, y, color = "white"]) => round({ x, y, z, w: 1, h: 1, color, step, offGrid: true }));
}

// A park bench facing +y: a brown seat and back on two dark grey legs.
export function bench({ x, y, z = 2, step = 0 }) {
  return [
    brick({ x, y, z, w: 1, d: 1, h: 2, color: "dark-gray", studs: false, step }),
    brick({ x: x + 3, y, z, w: 1, d: 1, h: 2, color: "dark-gray", studs: false, step }),
    tile({ x, y, z: z + 2, w: 4, d: 1, color: "brown", step }),
    brick({ x, y, z: z + 3, w: 4, d: 0.5, h: 3, color: "brown", studs: false, step }),
  ];
}
// A litter bin: a dark green round bin with a grey lid.
export function bin({ x, y, z = 2, step = 0 }) {
  return [round({ x, y, z, w: 1, h: 3, color: "green", studs: false, steps: 14, step }), round({ x, y, z: z + 3, w: 1, h: 1, color: "dark-gray", step, steps: 14 })];
}
// A fire hydrant.
export function hydrant({ x, y, z = 2, step = 0 }) {
  return [round({ x, y, z, w: 1, h: 3, color: "red", studs: false, steps: 14, step }), round({ x: x + 0.25, y: y + 0.25, z: z + 3, w: 0.5, h: 1, color: "red", step, offGrid: true, steps: 10 })];
}

// A car along x, its bonnet towards +x: chassis, a coloured body, a windscreen and side windows,
// headlights, tail lights and four wheels. 8 studs long and 4 wide.
export function car({ x, y, z = 1, color = "blue", step = 0 }) {
  const [x0, y0] = [x * STUD, y * STUD];
  const r = 6.4;
  const axle = z * PLATE + r;
  const out = [];
  [x0 + 1.6 * STUD, x0 + 6.4 * STUD].forEach((wx) => [y0 + 2, y0 + 4 * STUD - 2].forEach((wy) => out.push(wheel({ at: [wx, wy, axle], axis: "y", r, width: 4, step, steps: 16 }))));
  const deck = axle + 1.6;
  out.push(custom({ faces: boxFaces(x0 + 1, y0 + 4.2, axle - 1.6, x0 + 8 * STUD - 1, y0 + 4 * STUD - 4.2, deck), color: "black", step, overlaps: true }));
  out.push(custom({ faces: boxFaces(x0 + GAP, y0 + 4.2, deck, x0 + 8 * STUD - GAP, y0 + 4 * STUD - 4.2, deck + 2 * PLATE), color, step }));
  const roofZ = deck + 2 * PLATE;
  out.push(custom({ faces: extrudeFaces([[x0 + 1.4 * STUD, roofZ], [x0 + 5.8 * STUD, roofZ], [x0 + 4.9 * STUD, roofZ + 2.8 * PLATE], [x0 + 1.8 * STUD, roofZ + 2.8 * PLATE]], "y", y0 + 5, y0 + 4 * STUD - 5), color: "#bfe3f2", trans: true, step }));
  out.push(custom({ faces: boxFaces(x0 + 1.7 * STUD, y0 + 4.6, roofZ + 2.8 * PLATE, x0 + 5 * STUD, y0 + 4 * STUD - 4.6, roofZ + 3.4 * PLATE), color, step }));
  out.push(custom({ faces: boxFaces(x0 + 8 * STUD - GAP, y0 + 6, deck + 1.6, x0 + 8 * STUD + 0.4, y0 + 10, deck + 3.6), color: "trans-yellow", trans: true, step, overlaps: true }));
  out.push(custom({ faces: boxFaces(x0 + 8 * STUD - GAP, y0 + 4 * STUD - 10, deck + 1.6, x0 + 8 * STUD + 0.4, y0 + 4 * STUD - 6, deck + 3.6), color: "trans-yellow", trans: true, step, overlaps: true }));
  return out;
}

// A dog standing on stud (x, y), facing +x: body, head with a snout and ears, four legs and a tail.
export function dog({ x, y, z = 2, color = "brown", step = 0 }) {
  const [cx, cy, cz] = [x * STUD, y * STUD, z * PLATE];
  const part = (x0, y0, z0, x1, y1, z1, c = color) => custom({ faces: boxFaces(cx + x0, cy + y0, cz + z0, cx + x1, cy + y1, cz + z1), color: c });
  return [group({
    kind: "dog",
    step,
    box: { x0: cx - 8, y0: cy - 3, z0: cz, x1: cx + 9, y1: cy + 3, z1: cz + 13 },
    parts: [
      part(-6, -2.4, 0, -4.4, -0.8, 4), part(3.4, -2.4, 0, 5, -0.8, 4),
      part(-7.6, -0.6, 6, -5.6, 0.6, 10),
      part(-6.4, -2.6, 4, 5.4, 2.6, 8.6),
      part(-6, 0.8, 0, -4.4, 2.4, 4), part(3.4, 0.8, 0, 5, 2.4, 4),
      part(3.6, -2.4, 7.4, 8, 2.4, 12.4),
      part(8, -1.4, 7.6, 10, 1.4, 10.2),
      part(4.4, -3, 10.4, 6.6, -1.8, 13, "#4a2a12"), part(4.4, 1.8, 10.4, 6.6, 3, 13, "#4a2a12"),
    ],
  })];
}

// A building front: a block `w` studs wide and `d` deep, its face towards +y, `floors` storeys of
// `floorH` bricks. Each storey has framed windows; the ground floor has a door, and optionally an
// awning of red and white stripes and a sign with a symbol. Windows carry data-id="window", so
// CITY_CSS lights them at night.
export function building({ x, y, w, d = 4, z = 1, floors = 2, floorH = 4, color = "tan", trim = "white", awning = null, sign = null, door = 1, step = 0 }) {
  const out = [];
  const storey = floorH * 3;
  for (let f = 0; f < floors; f++)
    for (let c = 0; c < floorH; c++) out.push(brick({ x, y, z: z + f * storey + c * 3, w, d, h: 3, color: f === 0 && c === floorH - 1 ? trim : color, studs: false, step }));
  const top = z + floors * storey;
  out.push(plate({ x: x - 0.5, y: y - 0.5, z: top, w: w + 1, d: d + 1, color: trim, studs: false, step, offGrid: true }));
  out.push(plate({ x, y, z: top + 1, w, d, color: "dark-gray", step }));
  const face = (y + d) * STUD;
  const onFace = (x0, x1, z0, z1, color, depth = 0.6, extra) => custom({ faces: boxFaces(x0 * STUD, face - GAP, z0 * PLATE, x1 * STUD, face + depth, z1 * PLATE), color, step, extra, overlaps: true });
  for (let f = 0; f < floors; f++) {
    const base = z + f * storey;
    const slots = Math.max(1, Math.floor((w - 1) / 3));
    const gap = (w - slots * 2) / (slots + 1);
    for (let i = 0; i < slots; i++) {
      const wx = x + gap + i * (2 + gap);
      if (f === 0 && i === door) {
        out.push(onFace(wx - 0.2, wx + 2.2, base, base + storey - 2.4, trim, 0.4));
        out.push(onFace(wx + 0.1, wx + 1.9, base, base + storey - 3, "#2b4a6b", 0.7));
        continue;
      }
      const [z0, z1] = [base + 3, base + storey - 2.4];
      out.push(onFace(wx - 0.2, wx + 2.2, z0 - 0.4, z1 + 0.4, trim, 0.4));
      out.push({ ...onFace(wx + 0.1, wx + 1.9, z0, z1, "#9fd2ea", 0.7), id: "window" });
      out.push(onFace(wx - 0.4, wx + 2.4, z0 - 0.8, z0 - 0.2, trim, 1.6));
    }
  }
  if (awning) {
    // Stripes slope down and out from the wall above the ground floor.
    const az = (z + storey - 2.2) * PLATE;
    const stripes = Math.round(w * 1.5);
    for (let i = 0; i < stripes; i++) {
      const [ax0, ax1] = [(x + (i * w) / stripes) * STUD, (x + ((i + 1) * w) / stripes) * STUD];
      out.push(custom({ faces: extrudeFaces([[face, az + 4], [face + 0.6, az + 4], [face + 6, az - 1], [face + 6, az - 2.2], [face + 0.6, az + 2]], "x", ax0, ax1), color: i % 2 ? "white" : awning, step, overlaps: true }));
    }
  }
  if (sign) {
    const sz = z + floors * storey - 4.4;
    out.push(onFace(x + w / 2 - 2.2, x + w / 2 + 2.2, sz, sz + 3.4, sign.color ?? "red", 0.8, (P) => signSymbol(sign.symbol, (x + w / 2) * STUD, face + 0.85, (sz + 1.7) * PLATE, P)));
  }
  return out;
}
// A symbol on a sign, drawn flat on the face: a pizza slice, a cup, a cross, a drop.
function signSymbol(kind, cx, y, cz, P) {
  const at = (dx, dz) => iso([cx + dx, y, cz + dz], P);
  const poly = (points, fill) => `<path d="${pathOf(points.map(([dx, dz]) => at(dx, dz)), true)}" fill="${fill}"/>`;
  if (kind === "pizza") return poly([[-4.6, 3.2], [4.6, 3.2], [0, -4]], "#f2cd37") + poly([[-4.6, 3.2], [4.6, 3.2], [4.2, 4.2], [-4.2, 4.2]], "#c9862a") + [[-1.6, 1.6], [1.4, 1.8], [0, -0.8]].map(([dx, dz]) => poly(Array.from({ length: 8 }, (_, i) => [dx + Math.cos((i / 8) * Math.PI * 2) * 0.9, dz + Math.sin((i / 8) * Math.PI * 2) * 0.9]), "#c91a09")).join("");
  if (kind === "cup") return poly([[-3, 3.6], [3, 3.6], [2.2, -3.4], [-2.2, -3.4]], "#ffffff") + poly([[3, 2.4], [5, 2.4], [5, -0.6], [2.6, -0.6]], "#ffffff");
  if (kind === "cross") return poly([[-1.2, 4], [1.2, 4], [1.2, -4], [-1.2, -4]], "#ffffff") + poly([[-4, 1.2], [4, 1.2], [4, -1.2], [-4, -1.2]], "#ffffff");
  return "";
}

// Lit windows at night, for lessons with a sky: add to the lesson's css.
export const CITY_CSS = `
.lb-lesson[data-night] [data-id="window"] .lb path:not(.lb-edge):not(.lb-crease){fill:#ffd36a}
`;
