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
  // A block between two horizontal quads, given as [s, f] corners at heights zTop and zBottom.
  const block = (topQuad, zTop, bottomQuad, zBottom) => {
    const top = topQuad.map(([u, v]) => at(u, v, zTop));
    const bottom = bottomQuad.map(([u, v]) => at(u, v, zBottom));
    return [top, [...bottom].reverse(), ...top.map((_, i) => [bottom[i], bottom[(i + 1) % 4], top[(i + 1) % 4], top[i]])];
  };
  const quad = (s0, s1, f0, f1) => [[s0, f0], [s1, f0], [s1, f1], [s0, f1]];

  // Legs: two thick blocks that fill the hips between them, each ending in a foot that steps forward,
  // under a hip band as wide and deep as the torso. Sizes are a real minifigure's, in millimetres.
  let waist = z0;
  if (!seated) {
    [-1, 1].forEach((side) => {
      const [s0, s1] = side < 0 ? [-7.6, -0.2] : [0.2, 7.6];
      // The foot first: the leg stands on it, so only a small step of the foot shows in front.
      parts.push(part(box(s0, s1, -3.9, 4.6, z0, z0 + 3.2), legs));
      parts.push(part(box(s0, s1, -3.9, 3.0, z0 + 3.2, z0 + 11.6), legs));
    });
    parts.push(part(box(-7.8, 7.8, -3.9, 3.9, z0 + 11.6, z0 + 14.2), legs));
    waist = z0 + 14.2;
  }
  const neck = waist + 12.4;

  // Arms hang outside the torso from a round shoulder, opening out a little and coming slightly
  // forward to the wrist; seated, they reach forward over the lap.
  const wrist = seated ? { s: [7.0, 10.4], f: [3.0, 6.6], z: waist + 3.0 } : { s: [7.6, 11.0], f: [-0.2, 3.6], z: waist + 0.8 };
  const arm = (side) => {
    const m = (pair) => (side < 0 ? [-pair[1], -pair[0]] : pair);
    const [ts0, ts1] = m([6.0, 9.4]);
    const [bs0, bs1] = m(wrist.s);
    return [
      part(block(quad(ts0, ts1, -2.0, 2.0), neck - 2.4, quad(bs0, bs1, wrist.f[0], wrist.f[1]), wrist.z), torso),
      part(alongS([[-2.1, neck - 3.6], [2.1, neck - 3.6], [2.1, neck - 1.9], [1.4, neck - 0.8], [-1.4, neck - 0.8], [-2.1, neck - 1.9]], ts0 - 0.1, ts1 + 0.1), torso),
    ];
  };
  const reach = [wrist.f[1], wrist.z];
  // A hand: a C-shaped clip around an upright hole, its gap facing forward.
  const hand = (side) => {
    const hs = side * ((wrist.s[0] + wrist.s[1]) / 2);
    const [hf, top] = [reach[0] - 0.4, reach[1] + 0.5];
    const [outer, inner, tall, gap] = [2.3, 1.3, 2.4, 0.6];
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

  const torsoPart = part(alongF([[-7.8, waist], [7.8, waist], [6.0, neck], [-6.0, neck]], -3.9, 3.9), torso);
  const [farArm, nearArm] = [arm(-1), arm(1)];

  // Neck and head: a rounded cylinder with a stud on top when nothing covers it.
  const [hx, hy] = flat(0, 0);
  const headZ = neck + 1.0;
  const R = 4.9;
  const H = 9.6;
  const round = (t0, r0, sign) => Array.from({ length: 4 }, (_, i) => {
    const a = (Math.PI / 2) * ((i + 1) / 4);
    return [t0 + sign * (1 - Math.cos(a)) * 1.4, r0 - 1.4 + Math.sin(a) * 1.4];
  });
  const headProfile = [[0, 0], [0, R - 1.4], ...round(0, R, 1).slice(0, 3), [1.4, R], [H - 1.4, R], ...round(H, R, -1).reverse().slice(1), [H, R - 1.4], [H, 0]];
  const neckPart = part(cylinderFaces(hx, hy, 2.9, neck, headZ, 16), skin);
  const headFaces = revolveFaces(headProfile, { at: [hx, hy, headZ], axis: "z", steps: 28 });
  // The stud on top of a bare head is hollow, as on the classic head.
  const hollow = (P) => `<path d="${pathOf(Array.from({ length: 16 }, (_, i) => iso([hx + Math.cos((i / 16) * Math.PI * 2) * 1.5, hy + Math.sin((i / 16) * Math.PI * 2) * 1.5, headZ + H + 1.7], P)), true)}" fill="#8a7414"/>`;
  const head = mesh(headFaces, skin, (P) => faceSvg(at, R, headZ, P) + (hat || hair ? "" : studSvg(hx, hy, headZ + H, skin, P, { r: 2.5, h: 1.7 }) + hollow(P)));
  const top = hat
    ? custom({ faces: cylinderFaces(hx, hy, 5.7, headZ + 8, headZ + 10.8, 24), color: hat, extra: (P) => studSvg(hx, hy, headZ + 10.8, hat, P, { r: 2.2 }) })
    : hair
      ? custom({ faces: frustumFaces(hx, hy, 5.4, headZ + 6.6, 4.4, headZ + 11.2, 24), color: hair })
      : null;

  parts.push(...farArm, hand(-1), torsoPart, ...nearArm, hand(1), neckPart, head);
  if (top) parts.push(top);
  const reachF = reach[0] + 2;
  const [lo, hi] = [flat(-11.6, -3.9), flat(11.6, Math.max(4.5, reachF))];
  return group({
    kind: "minifig",
    ...rest,
    box: boxOf(Math.min(lo[0], hi[0]), Math.min(lo[1], hi[1]), z0, Math.max(lo[0], hi[0]), Math.max(lo[1], hi[1]), headZ + 11.4),
    parts,
  });
}

// Eyebrows, eyes with a highlight and a smile, printed on the side of the head that faces forward.
function faceSvg(at, r, z, projection) {
  const on = (angle, height) => iso(at(Math.sin(angle) * r * 1.01, Math.cos(angle) * r * 1.01, z + height), projection);
  const f = (value) => value.toFixed(2);
  const eyes = [-0.4, 0.4].map((angle) => on(angle, 5.4));
  const brows = [-1, 1].map((side) => Array.from({ length: 5 }, (_, i) => {
    const t = i / 4;
    return on(side * (0.2 + t * 0.42), 7.1 + Math.sin(Math.PI * t) * 0.35);
  }));
  const smile = Array.from({ length: 9 }, (_, step) => {
    const t = step / 8 - 0.5;
    return on(t * 1.05 + 0.06, 2.9 - Math.cos(t * Math.PI) * 0.9 + 0.5);
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

