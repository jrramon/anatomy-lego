import { cameraOf, iso, pathOf } from "./iso-kit.mjs";
import { PLATE, STUD, boxFaces, boxOf, custom, cylinderFaces, extrudeFaces, frustumFaces, group, studSvg } from "./brick.mjs";
import { meshSvg, revolveFaces } from "./lego-round.mjs";

// The LEGO minifigure, close to the real one: legs with feet, a hip band, a tapered torso, arms with
// round shoulders that reach forward, C-shaped hands open to the front, a neck, and a head with
// rounded edges, eyebrows, eyes with a highlight and a smile.

const unit = (v) => {
  const length = Math.hypot(...v) || 1;
  return v.map((value) => value / length);
};

// A minifigure standing at stud (x, y) on plate level z, facing +y (towards the viewer's left) or,
// with facing: "x", towards +x (the viewer's right). With legs: null it is seated: its waist is at
// z, as on a seat or in a kart, and its hands come forward as if on a steering wheel.
export function minifig({ x, y, z = 0, torso = "red", legs = "blue", hair = "brown", hat, facing = "y", skin = "skin", ...rest }) {
  const cx = x * STUD;
  const cy = y * STUD;
  const z0 = z * PLATE;
  const seated = legs === null;
  // Local coordinates: s across the shoulders, f towards the face, z up.
  const at = (s, f, h) => (facing === "x" ? [cx + f, cy + s, h] : [cx + s, cy + f, h]);
  const flat = (s, f) => at(s, f, 0).slice(0, 2);
  const box = (s0, s1, f0, f1, za, zb) => {
    const [ax, ay] = flat(s0, f0);
    const [bx, by] = flat(s1, f1);
    return boxFaces(Math.min(ax, bx), Math.min(ay, by), za, Math.max(ax, bx), Math.max(ay, by), zb);
  };
  // A profile in the (s, z) plane pushed along f, or in the (f, z) plane pushed along s.
  const alongF = (profile, f0, f1) => (facing === "x" ? extrudeFaces(profile.map(([s, v]) => [cy + s, v]), "x", cx + f0, cx + f1) : extrudeFaces(profile.map(([s, v]) => [cx + s, v]), "y", cy + f0, cy + f1));
  const alongS = (profile, s0, s1) => (facing === "x" ? extrudeFaces(profile.map(([f, v]) => [cx + f, v]), "y", cy + s0, cy + s1) : extrudeFaces(profile.map(([f, v]) => [cy + f, v]), "x", cx + s0, cx + s1));
  const part = (faces, color) => custom({ faces, color });
  const mesh = (faces, color, extra) => ({ box: boxOf(0, 0, 0, 0, 0, 0), svg: (P) => meshSvg(faces, color, P) + (extra ? extra(P) : "") });

  const parts = [];
  // Legs, each with a foot that steps forward, under a hip band as wide as the torso.
  let waist = z0;
  if (!seated) {
    [-1, 1].forEach((side) => {
      const [s0, s1] = side < 0 ? [-3.9, -0.2] : [0.2, 3.9];
      parts.push(part(box(s0, s1, -2.8, 2.4, z0 + 2.8, z0 + 11.2), legs));
      parts.push(part(box(s0, s1, -2.8, 3.8, z0, z0 + 2.8), legs));
    });
    parts.push(part(box(-7.4, 7.4, -2.8, 2.8, z0 + 11.2, z0 + 12.8), legs));
    waist = z0 + 12.8;
  }
  const neck = waist + 11.4;

  // Arms: a round shoulder, then a sleeve that slopes down and forward to the wrist.
  const reach = seated ? [6.2, waist + 4.6, 3.2, waist + 3] : [3.6, waist + 2.6, 0.4, waist + 1.4];
  const arm = (side) => {
    const [s0, s1] = side < 0 ? [-9.3, -5.9] : [5.9, 9.3];
    return [
      part(alongS([[-2.1, neck - 4.2], [1.9, neck - 4.2], [reach[0], reach[1]], [reach[2], reach[3]]], s0, s1), torso),
      part(alongS([[-2.2, neck - 4.4], [2.2, neck - 4.4], [2.2, neck - 1.6], [1.4, neck - 0.4], [-1.4, neck - 0.4], [-2.2, neck - 1.6]], s0, s1), torso),
    ];
  };
  // A hand: a C-shaped clip around an upright hole, its gap facing forward.
  const hand = (side) => {
    const [hs, hf, top] = seated ? [side * 7.6, reach[0] + 0.8, reach[1] + 0.6] : [side * 7.6, reach[0] + 0.7, reach[1] + 0.2];
    const [outer, inner, tall, gap] = [2.2, 1.2, 2.2, 0.55];
    const ring = (r, angle, h) => at(hs + Math.sin(angle) * r, hf + Math.cos(angle) * r, h);
    const radial = (angle) => {
      const [ax, ay] = flat(Math.sin(angle), Math.cos(angle));
      const [ox, oy] = flat(0, 0);
      return [ax - ox, ay - oy, 0];
    };
    const faces = [];
    const steps = 14;
    for (let j = 0; j < steps; j++) {
      const a0 = gap + ((Math.PI * 2 - 2 * gap) * j) / steps;
      const a1 = gap + ((Math.PI * 2 - 2 * gap) * (j + 1)) / steps;
      const mid = radial((a0 + a1) / 2);
      faces.push({ points: [ring(outer, a0, top - tall), ring(outer, a1, top - tall), ring(outer, a1, top), ring(outer, a0, top)], normal: unit(mid) });
      faces.push({ points: [ring(inner, a0, top), ring(inner, a1, top), ring(inner, a1, top - tall), ring(inner, a0, top - tall)], normal: unit(mid.map((v) => -v)) });
      faces.push({ points: [ring(inner, a0, top), ring(outer, a0, top), ring(outer, a1, top), ring(inner, a1, top)], normal: [0, 0, 1] });
      faces.push({ points: [ring(inner, a0, top - tall), ring(inner, a1, top - tall), ring(outer, a1, top - tall), ring(outer, a0, top - tall)], normal: [0, 0, -1] });
    }
    [gap, Math.PI * 2 - gap].forEach((angle, end) => {
      const tangent = radial(angle + Math.PI / 2);
      faces.push({ points: [ring(inner, angle, top - tall), ring(outer, angle, top - tall), ring(outer, angle, top), ring(inner, angle, top)], normal: unit(end ? tangent : tangent.map((v) => -v)) });
    });
    return mesh(faces, skin);
  };

  const torsoPart = part(alongF([[-7.6, waist], [7.6, waist], [5.8, neck], [-5.8, neck]], -3.2, 3.2), torso);
  const [farArm, nearArm] = [arm(-1), arm(1)];

  // Neck and head: a rounded cylinder with a stud on top when nothing covers it.
  const [hx, hy] = flat(0, 0);
  const headZ = neck + 0.9;
  const R = 4.8;
  const round = (t0, r0, sign) => Array.from({ length: 4 }, (_, i) => {
    const a = (Math.PI / 2) * ((i + 1) / 4);
    return [t0 + sign * (1 - Math.cos(a)) * 1.2, r0 - 1.2 + Math.sin(a) * 1.2];
  });
  const headProfile = [[0, 0], [0, R - 1.2], ...round(0, R, 1).slice(0, 3), [1.2, R], [7.8, R], ...round(9, R, -1).reverse().slice(1), [9, R - 1.2], [9, 0]];
  const neckPart = part(cylinderFaces(hx, hy, 2.6, neck, headZ, 16), skin);
  const headFaces = revolveFaces(headProfile, { at: [hx, hy, headZ], axis: "z", steps: 28 });
  const head = mesh(headFaces, skin, (P) => faceSvg(at, R, headZ, P) + (hat || hair ? "" : studSvg(hx, hy, headZ + 9, skin, P, { r: 2.4, h: 1.6 })));
  const top = hat
    ? custom({ faces: cylinderFaces(hx, hy, 5.6, headZ + 7.6, headZ + 10.4, 24), color: hat, extra: (P) => studSvg(hx, hy, headZ + 10.4, hat, P, { r: 2.2 }) })
    : hair
      ? custom({ faces: frustumFaces(hx, hy, 5.3, headZ + 6.2, 4.3, headZ + 10.8, 24), color: hair })
      : null;

  parts.push(...farArm, hand(-1), torsoPart, ...nearArm, hand(1), neckPart, head);
  if (top) parts.push(top);
  const reachF = seated ? reach[0] + 3 : 6.6;
  const [lo, hi] = [flat(-9.6, -3.2), flat(9.6, reachF)];
  return group({
    kind: "minifig",
    ...rest,
    box: boxOf(Math.min(lo[0], hi[0]), Math.min(lo[1], hi[1]), z0, Math.max(lo[0], hi[0]), Math.max(lo[1], hi[1]), headZ + 11),
    parts,
  });
}

// Eyebrows, eyes with a highlight and a smile, printed on the side of the head that faces forward.
function faceSvg(at, r, z, projection) {
  const on = (angle, height) => iso(at(Math.sin(angle) * r * 1.01, Math.cos(angle) * r * 1.01, z + height), projection);
  const f = (value) => value.toFixed(2);
  const eyes = [-0.4, 0.4].map((angle) => on(angle, 5.1));
  const brows = [-1, 1].map((side) => Array.from({ length: 5 }, (_, i) => {
    const t = i / 4;
    return on(side * (0.2 + t * 0.42), 6.7 + Math.sin(Math.PI * t) * 0.35);
  }));
  const smile = Array.from({ length: 9 }, (_, step) => {
    const t = step / 8 - 0.5;
    return on(t * 1.05 + 0.06, 2.7 - Math.cos(t * Math.PI) * 0.9 + 0.5);
  });
  const ink = "#1b1b1b";
  const { k } = cameraOf(projection);
  const [eye, shine] = [0.62 * k, 0.22 * k];
  return [
    ...eyes.map(([x, y]) => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(eye)}" fill="${ink}"/><circle cx="${f(x + eye * 0.35)}" cy="${f(y - eye * 0.35)}" r="${f(shine)}" fill="#ffffff"/>`),
    ...brows.map((points) => `<path class="lb-face" d="${pathOf(points)}"/>`),
    `<path class="lb-face" d="${pathOf(smile)}"/>`,
  ].join("");
}

