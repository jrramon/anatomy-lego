import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../kit/iso-kit.mjs";
import * as b from "../../kit/brick.mjs";
import * as l from "../../kit/lesson.mjs";
import * as fig from "../../kit/lego-figure.mjs";
import { auditOrExit } from "../../kit/lego-audit.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const { STUD, PLATE } = b;

const WIDTH = 1000;
const HEIGHT = 600;

// The scene on the LEGO grid: 56 studs along x, 22 deep along y. Water runs from left to right:
// mountain and reservoir, treatment plant, pump and water tower, the main under the garden, the house.
const LONG = 56;
const DEEP = 22;
const EARTH = 6;
const GROUND = PLATE;
const FACE_Y = DEEP * STUD + 0.4;
const PIPE_R = 2.4;
const PIPE_Z = GROUND + PIPE_R + 0.2;
const MAIN_Z = -3 * PLATE;

const MOUNTAIN = [
  { x: 0, y: 0, w: 13, d: 8, color: "dark-gray" },
  { x: 1, y: 0, w: 10, d: 6, color: "dark-gray" },
  { x: 2, y: 0, w: 7, d: 4, color: "light-gray" },
  { x: 3, y: 0, w: 4, d: 2, color: "white" },
];
const LAYER_H = 6;
const STREAM_X = 5.5;
const CLOUD_Z = 38 * PLATE;
const RESERVOIR = { x: 1, y: 9, w: 13, d: 13 };
const WATER_TOP = GROUND + 2;
const DAM = { x: 14, y: 8, w: 2, d: 14 };
const LINE_Y = 11.5;
const SETTLER = { x: 18, y: 9, w: 5 };
const FILTER = { x: 24, y: 9, w: 4, d: 5 };
const TANK_TOP = 7 * PLATE;
const PUMP = { x: 28.5, y: 17, w: 2, d: 2 };
const PUMP_LINE = 18;
const RISE_X = PUMP.x + PUMP.w / 2;
const TOWER = [33, 18];  // the pump's outlet runs along y = 18 straight into the riser
const LEGS_TOP = 25;
const TANK = { r: 24, z0: 25 * PLATE, z1: 34 * PLATE };
const DOWN_Y = 21.4 * STUD;
const HOUSE = { x: 42, y: 10, w: 12, d: 8 };
const TAP_X = 48 * STUD;
const WALL_Y = HOUSE.y + HOUSE.d;
const TAP_Z = 8 * PLATE;
const BUCKET = { x: 47, y: 18.6, h: 3 };
const BUCKET_C = [(BUCKET.x + 1) * STUD, (BUCKET.y + 1) * STUD];

const pieces = [];
const add = (step, piece) => pieces.push({ step, ...piece });
const pipeX = (x0, x1, y, z, color = "blue", r = PIPE_R) => b.pipe({ axis: "x", from: x0, to: x1, at: [y, z], r, color });
const pipeY = (y0, y1, x, z, color = "blue", r = PIPE_R) => b.pipe({ axis: "y", from: y0, to: y1, at: [x, z], r, color });
const pipeUp = (x, y, z0, z1, color = "blue", r = PIPE_R) => b.pipe({ axis: "z", from: z0, to: z1, at: [x, y], r, color });

// Step 0: the ground, the same staggered earth as the streetlamp lesson, grass and a garden path.
for (let row = 0; row < 2; row++) {
  const shift = row ? 2 : 0;
  for (let x = -shift; x < LONG; x += 4) {
    const from = Math.max(0, x);
    const to = Math.min(LONG, x + 4);
    add(0, b.brick({ x: from, y: 0, z: -EARTH + row * 3, w: to - from, d: DEEP, h: 3, color: row ? "brown" : "dark-tan", studs: false }));
  }
}
for (let x = 0; x < LONG; x += 14) for (let y = 0; y < DEEP; y += 11) add(0, b.plate({ x, y, w: 14, d: 11, color: "bright-green" }));
const tree = (x, y, size = 1) => {
  add(0, b.round({ x, y, z: 1, w: 1, h: 3, color: "brown", studs: false }));
  add(0, b.custom({ faces: b.frustumFaces((x + 0.5) * STUD, (y + 0.5) * STUD, 13 * size, 4 * PLATE, 1.5, 4 * PLATE + 34 * size, 20), color: "green" }));
};
tree(37, 2, 1);
tree(40, 6, 0.8);
tree(54, 3, 1);
tree(17, 2, 0.8);
[[35, 13, "red"], [38, 11, "yellow"], [27, 19, "red"], [27, 20, "yellow"], [53, 20, "red"], [41, 20, "yellow"], [20, 18, "red"]].forEach(([x, y, color]) => add(0, b.round({ x, y, z: 1, w: 1, h: 1, color })));

// Step 1: the mountain with snow on top, a cloud, the stream down its steps, the reservoir and its dam.
MOUNTAIN.forEach((layer, index) => add(1, b.brick({ ...layer, z: 1 + index * LAYER_H, h: index === 3 ? 3 : LAYER_H, color: layer.color })));
const layerTop = (index) => (1 + (index + 1) * LAYER_H) * PLATE;
[[3, 2, 3], [5.5, 1.2, 3.6], [8.2, 2.2, 3], [6, 3.4, 2.6]].forEach(([x, y, w]) => add(1, b.round({ x, y, z: 37, w, h: 3, color: "white", studs: false, id: "cloud", float: true, overlaps: true, offGrid: true })));
add(1, b.plate({ x: 4, y: 2.4, z: 36, w: 5, d: 2.4, color: "white", studs: false, id: "cloud", float: true, overlaps: true, offGrid: true }));
[[6, 8, 0], [4, 6, 1], [2, 4, 2]].forEach(([y1, y0, index]) =>
  add(1, b.custom({ faces: b.boxFaces((STREAM_X - 0.7) * STUD, y0 * STUD, layerTop(index), (STREAM_X + 0.7) * STUD, y1 * STUD, layerTop(index) + 0.4), color: "#3d8fd6", trans: true })),
);
add(1, b.custom({ faces: b.boxFaces(RESERVOIR.x * STUD, RESERVOIR.y * STUD, GROUND, (RESERVOIR.x + RESERVOIR.w) * STUD, DEEP * STUD - 0.1, WATER_TOP), color: "#3d8fd6", trans: true }));
add(1, b.brick({ ...DAM, z: 1, h: 6, color: "light-gray" }));
add(1, b.tile({ x: DAM.x, y: DAM.y, z: 7, w: DAM.w, d: DAM.d, color: "dark-gray" }));
add(1, b.tile({ x: 0, y: 8, z: 1, w: 1, d: 14, color: "dark-gray" }));

// Step 2: the treatment plant. A round settling tank, a sand filter, a chlorine tank, and the pipes.
add(2, pipeX((DAM.x + DAM.w) * STUD, SETTLER.x * STUD + 2, LINE_Y * STUD, PIPE_Z));
add(2, b.round({ x: SETTLER.x, y: SETTLER.y, z: 1, w: SETTLER.w, h: 6, color: "light-gray", studs: false, steps: 32 }));
add(2, b.custom({ faces: b.cylinderFaces((SETTLER.x + SETTLER.w / 2) * STUD, (SETTLER.y + SETTLER.w / 2) * STUD, SETTLER.w * 4 - 2.4, TANK_TOP, TANK_TOP + 0.3, 32), color: "#8d9a6a" }));
add(2, b.brick({ ...FILTER, z: 1, h: 6, color: "light-gray", studs: false }));
add(2, b.custom({ faces: b.boxFaces(FILTER.x * STUD + 2.4, FILTER.y * STUD + 2.4, TANK_TOP, (FILTER.x + FILTER.w) * STUD - 2.4, (FILTER.y + FILTER.d) * STUD - 2.4, TANK_TOP + 0.3), color: "tan" }));
add(2, pipeX((SETTLER.x + SETTLER.w) * STUD - 2, FILTER.x * STUD + 1, LINE_Y * STUD, TANK_TOP - 4, "light-gray", 2));
add(2, b.round({ x: 25, y: 16, z: 1, w: 2, h: 6, color: "white", studs: false }));
add(2, b.round({ x: 25, y: 16, z: 7, w: 2, h: 1, color: "yellow" }));
add(2, pipeY(14 * STUD, 16 * STUD + 2, 26 * STUD, PIPE_Z, "white", 1.4));

// Step 3: the pump, the pipe to the water tower, the tower on four legs, and the pipe that comes down.
add(3, pipeX((FILTER.x + FILTER.w) * STUD - 1, RISE_X * STUD, LINE_Y * STUD, PIPE_Z));
add(3, b.round({ x: RISE_X - 0.5, y: LINE_Y - 0.5, z: 1, w: 1, h: 3, color: "blue", studs: false, steps: 16 }));
add(3, pipeY((LINE_Y + 0.5) * STUD, PUMP.y * STUD + 1, RISE_X * STUD, PIPE_Z));
add(3, b.brick({ ...PUMP, z: 1, h: 6, color: "blue", studs: false, id: "pump" }));
add(3, b.round({ x: PUMP.x, y: PUMP.y, z: 7, w: 2, h: 3, color: "dark-gray", id: "pump" }));
add(3, pipeX((PUMP.x + PUMP.w) * STUD - 1, TOWER[0] * STUD, PUMP_LINE * STUD, PIPE_Z));
add(3, pipeUp(TOWER[0] * STUD, TOWER[1] * STUD, PIPE_Z - PIPE_R, TANK.z0));
[[-1.5, -1.5], [1.5, -1.5], [-1.5, 1.5], [1.5, 1.5]].forEach(([dx, dy]) => {
  for (let level = 0; level < 8; level++) add(3, b.round({ x: TOWER[0] + dx - 0.5, y: TOWER[1] + dy - 0.5, z: 1 + level * 3, w: 1, h: 3, color: "dark-gray", studs: false, steps: 16 }));
});
const [tx, ty] = [TOWER[0] * STUD, TOWER[1] * STUD];
add(3, b.custom({ faces: b.cylinderFaces(tx, ty, TANK.r, TANK.z0, TANK.z0 + 3 * PLATE, 32), color: "white" }));
add(3, b.custom({ faces: b.cylinderFaces(tx, ty, TANK.r, TANK.z0 + 3 * PLATE, TANK.z0 + 6 * PLATE, 32), color: "azure" }));
add(3, b.custom({ faces: b.cylinderFaces(tx, ty, TANK.r, TANK.z0 + 6 * PLATE, TANK.z1, 32), color: "white" }));
add(3, b.custom({ faces: b.frustumFaces(tx, ty, TANK.r + 1.5, TANK.z1, 4, TANK.z1 + 3 * PLATE, 32), color: "dark-gray" }));
add(3, b.round({ x: TOWER[0] - 0.5, y: TOWER[1] - 0.5, z: TANK.z1 / PLATE + 3, w: 1, h: 1, color: "dark-gray", steps: 16 }));
add(3, pipeY(ty + TANK.r - 3, DOWN_Y + PIPE_R, tx, TANK.z0 + 4, "blue"));
add(3, pipeUp(tx, DOWN_Y, GROUND, TANK.z0 + 4 + PIPE_R));

// Step 4: the house, its garden, the water meter and the pipe that climbs its front wall.
for (let course = 0; course < 3; course++) add(4, b.brick({ ...HOUSE, z: 1 + course * 3, h: 3, color: "white", studs: false }));
const roofZ = 10 * PLATE;
add(4, b.custom({ faces: b.extrudeFaces([[(HOUSE.y - 0.5) * STUD, roofZ], [(WALL_Y + 0.5) * STUD, roofZ], [(HOUSE.y + HOUSE.d / 2) * STUD, roofZ + 30]], "x", (HOUSE.x - 0.4) * STUD, (HOUSE.x + HOUSE.w + 0.4) * STUD), color: "red" }));
add(4, b.custom({ faces: b.boxFaces(52 * STUD, 12 * STUD, roofZ + 10, 53.4 * STUD, 13.4 * STUD, roofZ + 32), color: "dark-gray", overlaps: true }));
const onWall = (x0, x1, z0, z1, color, depth = 0.6) => b.custom({ faces: b.boxFaces(x0 * STUD, WALL_Y * STUD - 0.1, z0 * PLATE, x1 * STUD, WALL_Y * STUD + depth, z1 * PLATE), color });
add(4, onWall(43, 45, 2, 8, "blue"));
add(4, onWall(50, 53, 4, 8.5, "#9fd8f0"));
add(4, onWall(50, 53, 3.6, 4, "white", 1.4));
add(4, onWall(45.8, 46.8, 5, 8, "#9fd8f0"));
add(4, pipeUp(TAP_X, WALL_Y * STUD + 2, GROUND, TAP_Z + 2, "blue", 1.6));
add(4, b.custom({ faces: b.boxFaces(TAP_X - 4, WALL_Y * STUD + 0.4, 4.4 * PLATE, TAP_X + 4, WALL_Y * STUD + 4.6, 6.2 * PLATE), color: "white", overlaps: true }));
for (let y = WALL_Y; y < DEEP; y++) add(4, b.tile({ x: 43, y, w: 2, d: 1, z: 1, color: "tan" }));
add(4, fig.minifig({ x: 51.6, y: 20.4, z: 1, torso: "yellow", legs: "dark-gray", hair: "black" }));

// Step 5: the tap with its red handle, and a bucket under it.
add(5, pipeY(WALL_Y * STUD + 2, WALL_Y * STUD + 9, TAP_X, TAP_Z, "light-gray", 1.6));
add(5, b.custom({ faces: b.cylinderFaces(TAP_X, WALL_Y * STUD + 8.4, 1.4, TAP_Z - 5, TAP_Z, 12), color: "light-gray", id: "tap", overlaps: true }));
add(5, b.round({ x: TAP_X / STUD - 0.5, y: WALL_Y + 0.4, z: TAP_Z / PLATE + 0.5, w: 1, h: 1, color: "red", id: "tap", steps: 16, offGrid: true, overlaps: true }));
add(5, b.round({ x: BUCKET.x, y: BUCKET.y, z: 1, w: 2, h: BUCKET.h, color: "orange", studs: false, id: "bucket", offGrid: true }));

auditOrExit(pieces);

const P = k.fitProjection(
  [
    ...k.boxCorners({ x: 0, y: 0, w: LONG * STUD, d: DEEP * STUD, r: 0 }, -EARTH * PLATE, 0),
    [tx, ty, TANK.z1 + 16],
    [3 * STUD, 2 * STUD, CLOUD_Z + 14],
  ],
  WIDTH,
  HEIGHT,
  { pad: 26, azimuth: 55 },
);
const at = (point) => k.iso(point, P);

// Routes the water takes. Muddy until the middle of the sand filter, clear after it.
const settleC = [(SETTLER.x + SETTLER.w / 2) * STUD, (SETTLER.y + SETTLER.w / 2) * STUD];
const rain = [[3, 9, 1], [5, 3.6, 3], [8, 6, 1], [6, 12, -1], [10, 15, -1], [3.5, 17, -1], [12, 11, -1], [8.5, 19, -1]].map(([x, y, layer]) => [
  [x * STUD, y * STUD, CLOUD_Z - 4],
  [x * STUD, y * STUD, layer < 0 ? WATER_TOP : layerTop(layer)],
]);
const stream = [
  [STREAM_X * STUD, 2.2 * STUD, layerTop(2) + 0.6],
  [STREAM_X * STUD, 4 * STUD, layerTop(2) + 0.6],
  [STREAM_X * STUD, 4.2 * STUD, layerTop(1) + 0.6],
  [STREAM_X * STUD, 6 * STUD, layerTop(1) + 0.6],
  [STREAM_X * STUD, 6.2 * STUD, layerTop(0) + 0.6],
  [STREAM_X * STUD, 8 * STUD, layerTop(0) + 0.6],
  [STREAM_X * STUD, 8.2 * STUD, WATER_TOP],
  [STREAM_X * STUD, 11 * STUD, WATER_TOP],
];
const muddy = [
  [8 * STUD, 16 * STUD, WATER_TOP],
  [13.6 * STUD, LINE_Y * STUD, WATER_TOP],
  [14.2 * STUD, LINE_Y * STUD, PIPE_Z],
  [SETTLER.x * STUD + 2, LINE_Y * STUD, PIPE_Z],
  [SETTLER.x * STUD + 3, LINE_Y * STUD, TANK_TOP + 1],
  [settleC[0], settleC[1], TANK_TOP + 1],
  [(SETTLER.x + SETTLER.w) * STUD - 3, LINE_Y * STUD, TANK_TOP + 1],
  [(FILTER.x + 1) * STUD, LINE_Y * STUD, TANK_TOP + 1],
  [(FILTER.x + 2) * STUD, LINE_Y * STUD, TANK_TOP + 1],
];
const clean = [
  [(FILTER.x + 2) * STUD, LINE_Y * STUD, TANK_TOP + 1],
  [(FILTER.x + FILTER.w) * STUD - 3, LINE_Y * STUD, TANK_TOP + 1],
  [(FILTER.x + FILTER.w) * STUD, LINE_Y * STUD, PIPE_Z],
  [RISE_X * STUD, LINE_Y * STUD, PIPE_Z],
  [RISE_X * STUD, PUMP_LINE * STUD, PIPE_Z],
  [tx, ty, PIPE_Z],
  [tx, ty, TANK.z0 + 4],
];
const down = [
  [tx, ty + TANK.r - 3, TANK.z0 + 4],
  [tx, DOWN_Y, TANK.z0 + 4],
  [tx, DOWN_Y, GROUND],
];
const main = [
  [tx, FACE_Y, GROUND],
  [tx, FACE_Y, MAIN_Z],
  [LONG * STUD, FACE_Y, MAIN_Z],
];
const branch = [
  [TAP_X, FACE_Y, MAIN_Z],
  [TAP_X, FACE_Y - 8, MAIN_Z],
];
const riser = [
  [TAP_X, WALL_Y * STUD + 2.4, GROUND],
  [TAP_X, WALL_Y * STUD + 2.4, TAP_Z],
  [TAP_X, WALL_Y * STUD + 8.4, TAP_Z],
];
const BUCKET_TOP = (1 + BUCKET.h) * PLATE;
const jet = [
  [TAP_X, WALL_Y * STUD + 8.4, TAP_Z - 5],
  [TAP_X, WALL_Y * STUD + 8.4, BUCKET_TOP - 2],
];

// The main under the garden, in the cutaway, with a ring where the branch turns in towards the house.
const mainSvg = (() => {
  const [rx, ry] = at([TAP_X, FACE_Y, MAIN_Z]);
  const { k: scale } = k.cameraOf(P);
  return `<path class="lb-main" d="${k.pathOf(main.map(at))}"/><circle class="lb-tee" cx="${rx.toFixed(1)}" cy="${ry.toFixed(1)}" r="${(3.4 * scale).toFixed(1)}"/>`;
})();

// The bucket's mouth: dark when empty, and a water surface that fades in as it fills.
const mouthSvg = (() => {
  const { k: scale, sinE } = k.cameraOf(P);
  const [mx, my] = at([BUCKET_C[0], BUCKET_C[1], BUCKET_TOP]);
  const r = (STUD - 1.6) * scale;
  return `<ellipse class="lb-mouth" cx="${mx.toFixed(1)}" cy="${my.toFixed(1)}" rx="${r.toFixed(1)}" ry="${(r * sinE).toFixed(1)}"/><ellipse data-part="fill" class="lb-fill" cx="${mx.toFixed(1)}" cy="${my.toFixed(1)}" rx="${r.toFixed(1)}" ry="${(r * sinE).toFixed(1)}"/>`;
})();

const body = [
  `<defs>${l.tokenDef("w-mud", P, { color: "#a08a4e", r: 2.6 })}${l.tokenDef("w-clean", P, { color: "#4fc3ff", r: 2.6 })}${l.tokenDef("w-drop", P, { color: "#7fd4ff", r: 1.6 })}</defs>`,
  `<g class="lb-scene">${b.sceneSvg(pieces, P)}</g>`,
  `<g class="lb-piece" data-step="4" style="--i:0">${mainSvg}</g>`,
  `<g class="lb-piece" data-step="5" style="--i:4" data-id="bucket">${mouthSvg}</g>`,
  `<path data-part="jet" class="lb-jet" d="${k.pathOf(jet.map(at))}"/>`,
  `<g data-part="tokens"></g>`,
];

const svg = l.lessonSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    "Un paisaje de LEGO. A la izquierda llueve sobre una montaña y el agua llena un embalse con una presa; una depuradora la limpia; una bomba la sube a una torre de agua; una tubería bajo el jardín la lleva hasta una casa, donde un grifo llena un cubo.",
  body,
});

const STEPS = [
  {
    say: "¡Vamos a construir con LEGO el camino que hace el agua hasta el grifo!",
    ask: "¿Tú sabes de dónde sale el agua del grifo?",
    note: "La idea es seguir las piezas azules desde la lluvia hasta el grifo. Si tu peque se pierde, vuelve a señalar dónde están ahora.",
  },
  {
    say: "Todo empieza con la lluvia. El agua cae en las montañas, baja por los ríos y se guarda en un lago enorme con una pared: el embalse.",
    ask: "¿Hacemos que llueva más? (Pulsa «Que llueva» o la nube.)",
    note: "En España hay más de mil grandes embalses. Se llenan con la lluvia y con la nieve que se derrite en primavera. Algunas ciudades también toman agua de ríos o de pozos.",
  },
  {
    say: "El agua del embalse trae tierra y bichitos que no se ven. Por eso va a una fábrica que la limpia, con un filtro de arena como un colador gigante.",
    ask: "¿Ves cómo las piezas entran marrones y salen azules?",
    note: "Es una ETAP (estación de tratamiento de agua potable). Primero la suciedad se junta en grumos que se hunden en el tanque redondo; luego el agua se filtra por arena, y al final se desinfecta, casi siempre con cloro (el tanque blanco).",
  },
  {
    say: "Una bomba sube el agua limpia hasta un depósito muy alto. Desde ahí arriba, el agua baja con fuerza por las tuberías.",
    ask: "¿Por qué crees que el depósito está tan alto?",
    note: "La altura da presión: cada 10 metros de altura empujan con 1 bar más, y a casa suele llegar a 2-4 bares. En España los depósitos suelen estar en lo alto de un cerro, a menudo enterrados; aquí lo dibujamos como torre para que se vea.",
  },
  {
    say: "Por debajo del suelo, una tubería lleva el agua a todas las casas. En la nuestra, el agua espera quietecita a que alguien la necesite.",
    ask: "¿Encuentras la tubería azul debajo del suelo? ¿Y la cajita blanca de la pared?",
    note: "La tubería principal sigue hacia otras casas, así que por ella el agua casi nunca para. Antes de entrar en casa pasa por el contador (la cajita blanca), que mide cuánta se gasta. Dentro de las tuberías el agua está siempre a presión, pero solo se mueve cuando alguien abre un grifo.",
  },
  {
    say: "¡Y por fin, el grifo! Cuando lo abres, el agua que esperaba en la tubería sale… ¡y llena el cubo!",
    ask: "Si cerramos el grifo, ¿el agua sigue corriendo hacia nuestra casa?",
    note: "El agua del grifo en España es potable y se analiza a diario. Al cerrar el grifo, el agua de la tubería de casa se para al instante, aunque siga a presión.",
  },
  {
    say: "¡Ahora te toca a ti! Abre y cierra el grifo, o haz que llueva sobre la montaña.",
    ask: "Y cuando el agua se va por el desagüe… ¿adónde crees que va?",
    note: "El agua sucia de casa no vuelve por estas tuberías: va por otra red, el alcantarillado, a una depuradora de aguas residuales que la limpia antes de devolverla al río. Hemos simplificado: hay muchas más tuberías, depósitos y bombas, y si deja de llover un tiempo el agua no se acaba enseguida, porque los embalses guardan agua para meses.",
  },
].map((step) => ({ ...step, night: null }));

// The model: rain feeds the mountain stream; the town always uses some water, so the plant, the pump
// and the main keep flowing; our branch, riser and tap only flow while the tap is open.
const script = `
const svg = document.querySelector(".lb-lesson svg");
const jet = svg.querySelector('[data-part="jet"]');
const fill = svg.querySelector('[data-part="fill"]');
const pump = [...svg.querySelectorAll('[data-id="pump"]')];
const rain = ${JSON.stringify(rain)}.map((pts) => lesson.route(pts, { token: "#w-drop", gap: 26, speed: 90 }));
const stream = lesson.route(${JSON.stringify(stream)}, { token: "#w-clean", gap: 9, speed: 26 });
const muddy = lesson.route(${JSON.stringify(muddy)}, { token: "#w-mud", gap: 14, speed: 24 });
const clean = lesson.route(${JSON.stringify(clean)}, { token: "#w-clean", gap: 14, speed: 30 });
const down = lesson.route(${JSON.stringify(down)}, { token: "#w-clean", gap: 12, speed: 30 });
const main = lesson.route(${JSON.stringify(main)}, { token: "#w-clean", gap: 14, speed: 34 });
const home = [${JSON.stringify(branch)}, ${JSON.stringify(riser)}].map((pts) => lesson.route(pts, { token: "#w-drop", gap: 7, speed: 30 }));
const pour = lesson.route(${JSON.stringify(jet)}, { token: "#w-drop", gap: 5, speed: 60 });
const state = { rain: true, open: false, rainy: 0, flow: 0, town: 0, bucket: 0 };

const toggleRain = () => { if (lesson.step >= 1) state.rain = !state.rain; };
const toggleTap = () => { if (lesson.step >= 5) state.open = !state.open; };
lesson.onStep((step) => {
  if (step === 1) state.rain = true;
  if (step === 5) { state.open = true; state.bucket = 0; }
  if (step < 5) state.open = false;
});
const rainButton = lesson.button("rain", toggleRain, () => (state.rain ? "☀️ Que pare de llover" : "🌧️ Que llueva"));
const tapButton = lesson.button("tap", toggleTap, () => (state.open ? "✋ Cerrar el grifo" : "🚰 Abrir el grifo"));
lesson.click('[data-id="cloud"]', toggleRain);
lesson.click('[data-id="tap"]', toggleTap);
lesson.click('[data-id="bucket"]', () => { if (!state.open) state.bucket = 0; });
lesson.key("l", toggleRain);
lesson.key("g", toggleTap);

lesson.every((dt) => {
  const s = lesson.step;
  state.rainy = lesson.ease(state.rainy, s >= 1 && state.rain ? 1 : 0, dt, 0.5);
  state.town = lesson.ease(state.town, s >= 2 ? 1 : 0, dt, 0.5);
  state.flow = lesson.ease(state.flow, s >= 5 && state.open ? 1 : 0, dt, 0.25);
  if (state.flow > 0.5) state.bucket = Math.min(1, state.bucket + dt * 0.12);
  rain.forEach((route) => (route.level = state.rainy));
  stream.level = Math.max(state.rainy, s >= 1 ? 0.35 : 0);
  muddy.level = state.town;
  clean.level = s >= 3 ? state.town : 0;
  down.level = s >= 3 ? state.town : 0;
  main.level = s >= 4 ? state.town : 0;
  home.forEach((route) => (route.level = state.flow));
  pour.level = state.flow;
  jet.style.opacity = (state.flow * 0.7).toFixed(3);
  fill.style.opacity = (state.bucket * 0.95).toFixed(3);
  pump.forEach((node) => node.toggleAttribute("data-on", s >= 3));
  rainButton.disabled = s < 1;
  tapButton.disabled = s < 5;
  return state.town > 0 || state.rainy > 0.001 || Math.abs(state.flow - (state.open ? 1 : 0)) > 0.001;
});

lesson.readout(() => {
  const s = lesson.step;
  return [
    s >= 1 ? (state.rain ? "🌧️ llueve" : "☀️ no llueve") : "",
    s >= 5 ? (state.open ? "🚰 grifo abierto" : "🚰 grifo cerrado") : "",
    s >= 5 ? (state.bucket >= 1 ? "🪣 ¡cubo lleno!" : state.bucket > 0.05 ? "🪣 llenando el cubo" : "🪣 cubo vacío") : "",
  ].filter(Boolean).join("  ·  ");
});
`;

const CSS = `
.lb-main{fill:none;stroke:#1f5fbf;stroke-width:4.2;stroke-linecap:round;stroke-linejoin:round}
.lb-tee{fill:#123d7a;stroke:#1f5fbf;stroke-width:1.2}
.lb-mouth{fill:#7a3e00}
.lb-fill{fill:#4fb4ef;opacity:0}
.lb-jet{fill:none;stroke:#7fd4ff;stroke-width:2.4;stroke-linecap:round;opacity:0;pointer-events:none}
[data-id="cloud"],[data-id="tap"],[data-id="bucket"]{cursor:pointer}
@keyframes lb-hum{50%{transform:translateY(-.6px)}}
[data-id="pump"][data-on]{animation:lb-hum .25s linear infinite}
@media (prefers-reduced-motion:reduce){[data-id="pump"][data-on]{animation:none}}
`;

const html = l.lessonHtml({
  title: "¿De dónde sale el agua del grifo?",
  svg,
  steps: STEPS,
  projection: P,
  buttons: [
    { action: "rain", label: "☀️ Que pare de llover" },
    { action: "tap", label: "🚰 Abrir el grifo" },
  ],
  keys: "L lluvia · G grifo · también puedes pulsar la nube, el grifo o el cubo (para vaciarlo)",
  script,
  css: CSS,
});
mkdirSync(HERE, { recursive: true });
writeFileSync(join(HERE, "agua.html"), html);
console.log("wrote agua.html", `${(html.length / 1024).toFixed(0)} KB`, `${pieces.length} pieces`);
