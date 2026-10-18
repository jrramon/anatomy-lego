// Checks a lesson's pieces the way a builder would.
//   overlap  two pieces pass through each other
//   floating a piece touches nothing that holds it: nothing under it, above it or beside it
//   early    a piece is only held by pieces that appear in a later step, so it floats until then
//   grid     a brick or round piece is off the stud grid (half studs are fine) or between plates
// Pieces opt out with `overlaps: true` (a pipe that runs into a tank), `float: true` (a cloud, a
// hose) or `offGrid: true` (an insulator stack of odd heights).

const TOL = 0.05;

const nameOf = (piece, index) => {
  if (piece.name) return piece.name;
  const g = piece.grid;
  const where = g ? `(${g.x}, ${g.y}, z ${g.z})` : `(${[piece.box.x0, piece.box.y0, piece.box.z0].map((v) => v.toFixed(1)).join(", ")} mm)`;
  return `#${index} ${piece.kind ?? "pieza"}${piece.color ? ` ${piece.color}` : ""} en ${where}${piece.step !== undefined ? `, paso ${piece.step}` : ""}`;
};

const zOverlap = (a, b) => Math.min(a.z1, b.z1) - Math.max(a.z0, b.z0);
// How far two footprints overlap (positive) or are apart (negative), in millimetres.
function footprintGap(p, q) {
  const [a, b] = [p.box, q.box];
  if (p.circle && q.circle) {
    const [ax, ay, ar] = p.circle;
    const [bx, by, br] = q.circle;
    return ar + br - Math.hypot(ax - bx, ay - by);
  }
  if (p.circle || q.circle) {
    const [c, other] = p.circle ? [p.circle, b] : [q.circle, a];
    const [cx, cy, r] = c;
    const dx = Math.max(other.x0 - cx, 0, cx - other.x1);
    const dy = Math.max(other.y0 - cy, 0, cy - other.y1);
    const inside = dx === 0 && dy === 0;
    return inside ? r + Math.min(cx - other.x0, other.x1 - cx, cy - other.y0, other.y1 - cy) : r - Math.hypot(dx, dy);
  }
  return Math.min(Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0), Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0));
}

export function auditPieces(pieces) {
  const issues = [];
  const n = pieces.length;
  const holds = Array.from({ length: n }, () => []);
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const [p, q] = [pieces[i], pieces[j]];
      const z = zOverlap(p.box, q.box);
      if (z < -TOL) continue;
      const flat = footprintGap(p, q);
      if (flat < -TOL) continue;
      if (z > TOL && flat > TOL) {
        if (!p.overlaps && !q.overlaps) issues.push({ type: "overlap", a: i, b: j, message: `${nameOf(p, i)} atraviesa ${nameOf(q, j)}` });
        holds[i].push(j);
        holds[j].push(i);
        continue;
      }
      // Touching: one rests on the other, hangs from it, or leans on its side.
      holds[i].push(j);
      holds[j].push(i);
    }
  }
  pieces.forEach((piece, i) => {
    if (piece.float || piece.box.z0 <= TOL) return;
    const holders = holds[i];
    if (!holders.length) {
      issues.push({ type: "floating", a: i, message: `${nameOf(piece, i)} flota: no toca nada que la sujete` });
      return;
    }
    const step = piece.step ?? 0;
    if (!holders.some((j) => (pieces[j].step ?? 0) <= step)) {
      const first = Math.min(...holders.map((j) => pieces[j].step ?? 0));
      issues.push({ type: "early", a: i, message: `${nameOf(piece, i)} aparece antes que lo que la sujeta (paso ${first})` });
    }
  });
  pieces.forEach((piece, i) => {
    const g = piece.grid;
    if (!g || piece.offGrid) return;
    const half = (v) => Math.abs(v * 2 - Math.round(v * 2)) < 1e-6;
    const whole = (v) => Math.abs(v - Math.round(v)) < 1e-6;
    if (!half(g.x) || !half(g.y) || !whole(g.z) || (g.h !== undefined && !whole(g.h))) issues.push({ type: "grid", a: i, message: `${nameOf(piece, i)} está fuera de la rejilla de studs y placas` });
  });
  return issues;
}

// For build scripts: `node build.mjs --audit` prints every issue and fails on any.
export function auditOrExit(pieces, { label = "auditoría" } = {}) {
  if (!process.argv.includes("--audit")) return;
  const issues = auditPieces(pieces);
  const counts = ["overlap", "floating", "early", "grid"].map((type) => `${type} ${issues.filter((issue) => issue.type === type).length}`);
  for (const issue of issues) console.log(`  ${issue.type.padEnd(8)} ${issue.message}`);
  console.log(`${label}: ${pieces.length} piezas · ${counts.join(" · ")}`);
  if (issues.length) process.exit(1);
  console.log("auditoría superada");
}
