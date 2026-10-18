import { LIGHT, edgeOf, mix, tone } from "./brick.mjs";

// LEGO parts that turn, a simple 3D mode. A spinning group is a set of
// faces at rest; the page turns them about an axis through a pivot and redraws the group every
// frame with the bricks' own shading. It can also be lit by a light in the scene (a sun): faces that
// look away from it fall into night, and faces marked as lamps light up there, like windows.
//
// Build side: spinData(meshes, { pivot, axis, sun }) packs the faces; spinSvg(id) is the empty group
// to put in the scene. Page side: spinRuntime(...) (inlined by lesson.mjs as lesson.spin(id)) returns
// { angle, set(angle), lit(point) }.

const unit = (v) => {
  const length = Math.hypot(...v) || 1;
  return v.map((value) => value / length);
};
const mean = (points) => points.reduce((s, p) => [s[0] + p[0] / points.length, s[1] + p[1] / points.length, s[2] + p[2] / points.length], [0, 0, 0]);
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

// Faces of a convex solid (lists of points, as brick.mjs builds them) with outward normals.
export function withNormals(polys) {
  const centre = mean(polys.flat());
  return polys.map((points) => {
    let normal = newell(points);
    const c = mean(points);
    if (normal[0] * (c[0] - centre[0]) + normal[1] * (c[1] - centre[1]) + normal[2] * (c[2] - centre[2]) < 0) normal = normal.map((v) => -v);
    return { points, normal };
  });
}

// meshes: [{ color, faces: [{ points, normal, color?, lamp? }], name? }], in millimetres at rest. Every
// mesh of one group is painted in one depth order, so a house on a globe hides behind it; a named
// mesh can be shown or hidden from the page with spin.show(name, on).
export function spinData(meshes, { pivot, axis = "z", sun = null, night = "#16204a" }) {
  const keyOf = (p) => p.map((v) => Math.round(v * 100)).join(",");
  return {
    pivot,
    axis,
    sun,
    night,
    light: LIGHT,
    meshes: meshes.map(({ color, faces, name }) => {
      const index = new Map();
      const vertices = [];
      const at = (p) => {
        const key = keyOf(p);
        if (!index.has(key)) {
          index.set(key, vertices.length);
          vertices.push(p.map((v) => Math.round(v * 1000) / 1000));
        }
        return index.get(key);
      };
      const packed = faces.map((face) => ({ v: face.points.map(at), n: face.normal.map((v) => Math.round(v * 1e4) / 1e4), c: face.color ?? color, lamp: face.lamp ? 1 : 0 }));
      const edges = new Map();
      packed.forEach((face, which) =>
        face.v.forEach((a, i) => {
          const b = face.v[(i + 1) % face.v.length];
          const key = a < b ? `${a}|${b}` : `${b}|${a}`;
          const entry = edges.get(key) ?? [a, b];
          entry.push(which);
          edges.set(key, entry);
        }),
      );
      const colours = [...new Set(packed.map((face) => face.c))];
      const shade = Object.fromEntries(colours.map((c) => [c, Array.from({ length: 21 }, (_, i) => tone(c, i / 20))]));
      const edge = Object.fromEntries(colours.map((c) => [c, edgeOf(c)]));
      const dark = Object.fromEntries(colours.map((c) => [c, Array.from({ length: 21 }, (_, i) => mix(tone(c, i / 20), night, 0.72))]));
      return { name, vertices, faces: packed, edges: [...edges.values()], shade, dark, edge };
    }),
  };
}

export const spinSvg = (id, extra = "") => `<g class="lb-spin" data-spin="${id}"${extra}></g>`;

// Runs in the page, with the kit's iso, depthOf, cameraOf and pathOf in scope.
export function spinRuntime(node, data, projection) {
  const { pivot, axis, sun, light } = data;
  const { sinA, cosA, sinE, cosE } = cameraOf(projection);
  const view = [cosA * cosE, sinA * cosE, sinE];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const turn = (p, c, s, about) => {
    const [x, y, z] = [p[0] - about[0], p[1] - about[1], p[2] - about[2]];
    if (axis === "z") return [about[0] + c * x - s * y, about[1] + s * x + c * y, about[2] + z];
    if (axis === "y") return [about[0] + c * x + s * z, about[1] + y, about[2] - s * x + c * z];
    return [about[0] + x, about[1] + c * y - s * z, about[2] + s * y + c * z];
  };
  const toward = sun ? (p) => {
    const d = [sun[0] - p[0], sun[1] - p[1], sun[2] - p[2]];
    const l = Math.hypot(...d) || 1;
    return [d[0] / l, d[1] / l, d[2] / l];
  } : null;
  const smooth = (a, b, x) => {
    const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  };
  const limit = Math.cos((30 * Math.PI) / 180);
  const hidden = new Set();
  const spin = {
    angle: 0,
    show(name, on) {
      if (on) hidden.delete(name);
      else hidden.add(name);
      spin.set(spin.angle);
    },
    // How much sun a point of the group gets at the current angle, 0 (night) to 1 (day), from the
    // rest-pose point and its rest-pose outward direction.
    lit(point, normal) {
      if (!toward) return 1;
      const [c, s] = [Math.cos(spin.angle), Math.sin(spin.angle)];
      const p = turn(point, c, s, pivot);
      const n = turn(normal, c, s, [0, 0, 0]);
      return smooth(-0.12, 0.22, dot(n, toward(p)));
    },
    set(angle) {
      spin.angle = angle;
      const [c, s] = [Math.cos(angle), Math.sin(angle)];
      const items = [];
      for (const mesh of data.meshes) {
        if (mesh.name && hidden.has(mesh.name)) continue;
        const vertices = mesh.vertices.map((p) => turn(p, c, s, pivot));
        const faces = mesh.faces.map((face) => {
          const normal = turn(face.n, c, s, [0, 0, 0]);
          const points = face.v.map((i) => vertices[i]);
          const centre = points.reduce((sum, p) => [sum[0] + p[0], sum[1] + p[1], sum[2] + p[2]], [0, 0, 0]).map((v) => v / points.length);
          return { face, normal, points, centre, visible: dot(normal, view) > 1e-6, depth: depthOf(centre, projection), lines: "" };
        });
        for (const [a, b, ...owners] of mesh.edges) {
          const seen = owners.filter((i) => faces[i].visible);
          if (!seen.length) continue;
          const owner = seen.reduce((best, i) => (faces[i].depth > faces[best].depth ? i : best));
          const d = pathOf([iso(vertices[a], projection), iso(vertices[b], projection)]);
          const colour = mesh.edge[faces[owner].face.c];
          if (seen.length < owners.length || owners.length === 1) faces[owner].lines += `<path class="lb-edge" d="${d}" stroke="${colour}"/>`;
          else if (dot(faces[owners[0]].normal, faces[owners[1]].normal) < limit) faces[owner].lines += `<path class="lb-crease" d="${d}" stroke="${colour}"/>`;
        }
        for (const f of faces) {
          if (!f.visible) continue;
          const i = Math.round(Math.max(0, Math.min(1, dot(f.normal, light))) * 20);
          // Day or night is a matter of where on the turning body a face is, not of which way the face
          // looks: a house's back wall is not in the night. So it goes by the direction out from the pivot.
          const out = [f.centre[0] - pivot[0], f.centre[1] - pivot[1], f.centre[2] - pivot[2]];
          const length = Math.hypot(...out) || 1;
          const day = toward ? smooth(-0.12, 0.22, dot(out.map((v) => v / length), toward(f.centre))) : 1;
          let fill = day > 0.5 ? mesh.shade[f.face.c][i] : mesh.dark[f.face.c][i];
          if (day > 0.02 && day < 0.98) fill = day > 0.5 ? mesh.shade[f.face.c][Math.round(i * (0.6 + 0.4 * day))] : mesh.dark[f.face.c][i];
          if (f.face.lamp && day < 0.35) fill = "#ffd84a";
          items.push([f.depth, `<path d="${pathOf(f.points.map((p) => iso(p, projection)), true)}" fill="${fill}" stroke="${fill}"/>${f.lines}`]);
        }
      }
      items.sort((a, b) => a[0] - b[0]);
      node.innerHTML = `<g class="lb">${items.map((item) => item[1]).join("")}</g>`;
    },
  };
  return spin;
}
