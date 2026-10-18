import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../kit/iso-kit.mjs";
import * as b from "../../kit/brick.mjs";
import * as l from "../../kit/lesson.mjs";
import * as fig from "../../kit/lego-figure.mjs";
import * as city from "../../kit/lego-city.mjs";
import * as fx from "../../kit/lego-fx.mjs";
import { auditOrExit } from "../../kit/lego-audit.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const { STUD, PLATE, GAP } = b;

const WIDTH = 1000;
const HEIGHT = 640;

// A small harbour on the LEGO grid, 46 studs along x and 20 deep. A basin of water is dug into the
// quays: 28 × 12 studs, open at the front, where the cut shows the water from the side. A crane on
// the back quay lowers a cargo barge into it; a child throws stones from the left quay; a docker
// keeps a pile of crates on the right quay.
const LONG = 46;
const DEEP = 20;
const BASIN = { x0: 8, x1: 36, y0: 8, y1: 20 };
const EARTH = 21;
const FLOOR_Z = -17 * PLATE;
const QUAY_TOP = PLATE;

// The barge, in its rest pose (afloat and empty): bottom at -5 plates, gunwale at +1 plate.
// Stern block with the wheelhouse x 12..16, open hold x 16..28, pointed bow x 28..32, beam y 11..17.
const HULL = { x0: 12, x1: 32, y0: 11, y1: 17 };
const ZB0 = -5 * PLATE;
const H = 6 * PLATE;
const HOLD = { x0: 16, x1: 28 };
const HOOK = 46;
const CRATES = [[20, 12], [22, 14], [17, 13], [25, 13], [20, 14]];

// The model, in mm and mm³ of water (1 mm³ of water weighs 1 mg). The barge sinks until the water
// it pushes aside weighs as much as it does (Archimedes). Its waterplane is A_H, the basin's A_B, so
// pushing aside a volume V raises the harbour by V / A_B. Empty it draws 6.4 mm; each crate adds
// 2.8 mm; with four the gunwale is 1.6 mm clear, and a fifth would need 20.4 mm of a 19.2 mm hull.
const A_H = (16 * 6 + 2 * 6 + (2 * 6) / 2) * STUD * STUD;
const A_B = (BASIN.x1 - BASIN.x0) * (BASIN.y1 - BASIN.y0) * STUD * STUD;
const M0 = 6.4 * A_H;
const MC = 2.8 * A_H;
const L0 = ZB0 + M0 / A_H - M0 / A_B;
const HANG = 4;
// When it sinks it only pushes aside its own steel (7.8 times denser than water) and its crates.
const STEEL = M0 / 7.8;
const CRATE_V = 2 * STUD * 2 * STUD * 6 * PLATE;
const STONE_V = 260;
const ARM_Z = 25 * PLATE;
const TIP = [22 * STUD, 14 * STUD, ARM_Z];

const scene = [];
const ahead = [];
const above = [];
const boat = [];
const add = (list, step, piece) => list.push({ step, ...piece });

// Step 0: the harbour. Quays of stacked bricks (grey stone above, earth below), a sand bottom in
// the basin, light grey paving on top, bollards, a lighthouse and a tree.
const layerColor = (row) => (row >= 5 ? (row % 2 ? "light-gray" : "dark-gray") : row % 2 ? "brown" : "dark-tan");
for (let row = 0; row < EARTH / 3; row++) {
  const z = -EARTH + row * 3;
  const shift = row % 2 ? 2 : 0;
  const quay = (x0, x1, y0, y1, list, width) => {
    for (let x = x0 - shift; x < x1; x += width) {
      const from = Math.max(x0, x);
      const to = Math.min(x1, x + width);
      add(list, 0, b.brick({ x: from, y: y0, z, w: to - from, d: y1 - y0, h: 3, color: layerColor(row), studs: false }));
    }
  };
  quay(0, BASIN.x0, 0, DEEP, scene, 4);
  quay(BASIN.x0, BASIN.x1, 0, BASIN.y0, scene, 7);
  quay(BASIN.x1, LONG, 0, DEEP, ahead, 5);
  if (row === 0) quay(BASIN.x0, BASIN.x1, BASIN.y0, BASIN.y1, scene, 7);
}
for (let x = BASIN.x0; x < BASIN.x1; x += 7) add(scene, 0, b.tile({ x, y: BASIN.y0, z: -EARTH + 3, w: 7, d: BASIN.y1 - BASIN.y0, color: "tan" }));
const paving = (x0, x1, y0, y1, list) => {
  for (let x = x0; x < x1; x += 8) for (let y = y0; y < y1; y += 10) add(list, 0, b.tile({ x, y, z: 0, w: Math.min(8, x1 - x), d: Math.min(10, y1 - y), color: city.PAVEMENT }));
};
paving(0, BASIN.x0, 0, DEEP, scene);
paving(BASIN.x0, BASIN.x1, 0, BASIN.y0, scene);
paving(BASIN.x1, LONG, 0, DEEP, ahead);
[[6.5, 4], [6.5, 11], [30, 6.5], [36.5, 6]].forEach(([x, y]) => {
  const list = x > BASIN.x1 ? ahead : scene;
  add(list, 0, b.round({ x, y, z: 1, w: 1, h: 2, color: "black", studs: false, steps: 14 }));
  add(list, 0, b.round({ x, y, z: 3, w: 1, h: 1, color: "black", steps: 14 }));
});
for (let level = 0; level < 5; level++) add(ahead, 0, b.round({ x: 42, y: 1, z: 1 + level * 3, w: 3, h: 3, color: level % 2 ? "white" : "red", studs: false, steps: 24 }));
add(ahead, 0, b.round({ x: 42.5, y: 1.5, z: 16, w: 2, h: 3, color: "#ffe58a", trans: true, studs: false, steps: 20 }));
add(ahead, 0, b.round({ x: 42, y: 1, z: 19, w: 3, h: 1, color: "red", studs: false, steps: 24 }));
add(ahead, 0, b.round({ x: 43, y: 2, z: 20, w: 1, h: 2, color: "red", steps: 14 }));
city.tree({ x: 2, y: 2, z: 1, size: 1 }).forEach((piece) => scene.push(piece));

// Step 1: a child on the left quay with a little pile of stones to throw.
const stoneFaces = (cx, cy, z0) => b.frustumFaces(cx, cy, 5.6, z0, 3, z0 + 7, 7);
add(scene, 1, fig.minifig({ x: 5, y: 17.5, z: 1, torso: "orange", legs: "blue", hair: "brown", hairStyle: "short", facing: "x", child: true, id: "child" }));
[[1.8, 15.6], [3.4, 17.2], [1.8, 18.8]].forEach(([x, y]) => add(scene, 1, b.custom({ faces: stoneFaces(x * STUD, y * STUD, QUAY_TOP), color: "dark-gray", id: "stones", kind: "stone" })));

// Step 2: the crane on the back quay and the barge it carries.
for (let level = 0; level < 8; level++) add(scene, 2, b.brick({ x: 21, y: 2, z: 1 + level * 3, w: 2, d: 2, h: 3, color: "orange", studs: false, id: "crane" }));
add(above, 2, b.brick({ x: 21, y: 0, z: 25, w: 2, d: 15, h: 2, color: "orange", studs: false, id: "crane" }));
add(above, 2, b.brick({ x: 21, y: 0, z: 27, w: 2, d: 2, h: 3, color: "dark-gray", id: "crane" }));

const hull = (piece) => add(boat, 2, { id: "boat", ...piece });
hull(b.brick({ x: HOLD.x0, y: HULL.y0, z: -5, w: HOLD.x1 - HOLD.x0, d: 6, h: 1, color: "red", studs: false, float: true, name: "fondo del casco (flota en el agua)" }));
hull(b.brick({ x: HULL.x0, y: HULL.y0, z: -5, w: 4, d: 6, h: 5, color: "red", studs: false }));
hull(b.tile({ x: HULL.x0, y: HULL.y0, z: 0, w: 4, d: 6, color: "white" }));
[HULL.y0, HULL.y1 - 1].forEach((y) => {
  hull(b.brick({ x: HOLD.x0, y, z: -4, w: HOLD.x1 - HOLD.x0, d: 1, h: 4, color: "red", studs: false }));
  hull(b.tile({ x: HOLD.x0, y, z: 0, w: HOLD.x1 - HOLD.x0, d: 1, color: "white" }));
});
const bowRing = [[28, 11], [30, 11], [32, 14], [30, 17], [28, 17]].map(([x, y]) => [x * STUD + (x === 28 ? -GAP : 0), y * STUD + (y === 11 ? GAP : y === 17 ? -GAP : 0)]);
hull(b.custom({ faces: b.prismFaces(bowRing, ZB0, 0), color: "red", kind: "bow" }));
hull(b.custom({ faces: b.prismFaces(bowRing, 0, PLATE), color: "white", kind: "bow" }));
hull(b.brick({ x: 12, y: 12, z: 1, w: 3, d: 4, h: 3, color: "white", studs: false }));
hull(b.brick({ x: 12, y: 12, z: 4, w: 3, d: 4, h: 2, color: "#9fd8f0", trans: true, studs: false }));
hull(b.plate({ x: 12, y: 12, z: 6, w: 3, d: 4, color: "red" }));
hull(b.round({ x: 13, y: 13.5, z: 7, w: 1, h: 3, color: "dark-gray", studs: false, steps: 14 }));
hull(b.round({ x: 13, y: 13.5, z: 10, w: 1, h: 1, color: "red", studs: false, steps: 14 }));
const crates = CRATES.map(([x, y], i) => {
  const piece = b.brick({ x, y, z: -4, w: 2, d: 2, h: 6, color: "brown", id: "boat", kind: "crate" });
  const draw = piece.svg;
  return { ...piece, step: 2, svg: (P, covered) => `<g data-crate="${i}">${draw(P, covered)}</g>` };
});
boat.push(...crates);

// Step 3: the tide gauge on the back quay wall, behind the bow: red and white plates to see the
// water rise.
for (let i = 0; i < 8; i++) {
  const z0 = -8 * PLATE + i * PLATE;
  add(scene, 3, b.custom({ faces: b.boxFaces(30 * STUD, BASIN.y0 * STUD, z0, 32 * STUD, BASIN.y0 * STUD + 0.8, z0 + PLATE), color: i % 2 ? "white" : "red", overlaps: true, kind: "gauge" }));
}

// Step 5: the docker and her pile of five crates on the right quay.
add(ahead, 5, fig.minifig({ x: 40, y: 16.6, z: 1, torso: "orange", legs: "dark-gray", hat: "yellow", hatStyle: "helmet", print: "hivis", hair: "black", hairStyle: "ponytail" }));
const PILE = [[39, 9], [41, 9], [39, 11], [41, 11]];
PILE.forEach(([x, y], i) => add(ahead, 5, b.brick({ x, y, z: 1, w: 2, d: 2, h: 6, color: "brown", id: `pile-${i}` })));
add(ahead, 5, b.brick({ x: 40, y: 10, z: 7, w: 2, d: 2, h: 6, color: "brown", id: "pile-4" }));

// The stones that rest on the bottom, for the audit only: the page drops them there.
const STONE_SPOTS = [[9.8, 18.2], [11, 16.8], [9.6, 15.4]];
const restStones = STONE_SPOTS.map(([x, y]) => b.custom({ faces: stoneFaces(x * STUD, y * STUD, FLOOR_Z), color: "dark-gray", kind: "stone", step: 1 }));

auditOrExit([...scene, ...ahead, ...above, ...boat, ...restStones]);

const P = k.fitProjection(
  [...k.boxCorners({ x: 0, y: 0, w: LONG * STUD, d: DEEP * STUD, r: 0 }, -EARTH * PLATE, QUAY_TOP), [22 * STUD, 0, 30 * PLATE], [HULL.x0 * STUD, 12 * STUD, HANG + 56]],
  WIDTH,
  HEIGHT,
  { pad: 22, azimuth: 55 },
);

// The barge is drawn twice: whole under the water, and again over it, clipped to what is dry.
const boatSvg = () => b.sceneSvg(boat, P);
const stoneDef = `<g id="stone">${b.solidSvg(stoneFaces(0, 0, 0), "dark-gray", P)}</g>`;

const body = [
  `<defs>${l.tokenDef("w", P, { color: "#c4f1ff", r: 2.6, h: 1.6 })}${stoneDef}<clipPath id="clip-above"><path data-clip="above"/></clipPath></defs>`,
  `<g class="lb-scene">${b.sceneSvg(scene, P, { shadows: true })}</g>`,
  `<g data-part="stones-under"></g>`,
  `<g data-part="boat">${boatSvg()}</g>`,
  `<g data-part="water" class="lb-water"><path class="lb-water-face"/><path class="lb-water-top"/></g>`,
  `<g clip-path="url(#clip-above)" data-part="dry"><g data-part="boat">${boatSvg()}</g></g>`,
  `<g data-part="stones-over"></g>`,
  `<g class="lb-scene">${b.sceneSvg(ahead, P, { shadows: true })}</g>`,
  `<g class="lb-scene">${b.sceneSvg(above, P)}</g>`,
  `<g class="lb-piece" data-step="2" style="--i:0" data-part="rig"><path class="lb-cable" data-part="cable"/><path class="lb-sling" data-part="slings"/><g data-part="hook"></g></g>`,
  `<g data-part="boat-tokens"></g>`,
  `<g data-part="tokens"></g>`,
];

const svg = l.lessonSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    "Un puerto de LEGO cortado por delante para ver el agua de lado. Un niño tira piedras que se hunden hasta el fondo. Una grúa baja al agua un barco rojo de carga, hueco por dentro, y el agua sube por una regla de rayas. Una trabajadora le carga cajas: con cada caja el barco se hunde un poco más, y con demasiadas el agua entra y se va al fondo.",
  body,
});

const STEPS = [
  {
    say: "¡Vamos a construir un puerto de LEGO! Aquí llegan los barcos, y hoy vamos a descubrir por qué flotan.",
    ask: "¿Juegas con barquitos en la bañera? ¿Qué cosas flotan?",
    note: "Lo invisible de esta lección es el agua que se mueve cuando un barco entra o sale: la dibujamos como piececitas azules claras, y solo se mueven cuando el agua de verdad se desplaza. El puerto está cortado por delante para ver el agua de lado, como una pecera.",
  },
  {
    say: "Este niño tira una piedra al agua… ¡plof! Se va derechita al fondo.",
    ask: "¿Dónde está la piedra ahora? ¿Tiramos otra? (Pulsa al niño.)",
    note: "La piedra se hunde porque pesa más que el agua que cabe en su hueco: el granito es unas 2,7 veces más denso que el agua.",
  },
  {
    say: "La grúa trae un barco de carga. Pesa muchísimo más que la piedra… pero por dentro está vacío, como un cuenco.",
    ask: "¿Tú qué crees: se hundirá como la piedra?",
    note: "Es una gabarra: un casco abierto. Los barcos de verdad son de acero, que pesa casi ocho veces más que el agua, pero el casco está hueco y lleno de aire. Lo que decide si flota es el peso de todo el barco comparado con el agua que puede apartar.",
  },
  {
    say: "¡Lo bajamos al agua! El barco empuja el agua para hacerse un hueco, y el agua sube por la regla de rayas.",
    ask: "¿Ves cómo sube el agua en la regla roja y blanca?",
    note: "Es el principio de Arquímedes: el barco se hunde hasta que el agua que aparta pesa lo mismo que él, y entonces flota. El agua apartada sube el nivel del puerto unos 2 mm porque el puerto es pequeño; en el mar no se nota. La regla es una escala de mareas, como las de los puertos de verdad.",
  },
  {
    say: "El agua quiere volver a su sitio, y por eso empuja el barco hacia arriba. ¡Pulsa el barco para hundirlo un poquito!",
    ask: "¿Qué pasa cuando lo sueltas? ¿Quién lo sube?",
    note: "Al hundirlo, aparta más agua y el empuje crece; al soltarlo, el agua vuelve a su sitio y lo sube hasta donde estaba. Ese empuje está siempre (es la presión del agua contra el fondo del casco), aunque las piezas azules solo se mueven mientras el agua se desplaza. El balanceo va a cámara lenta.",
  },
  {
    say: "La trabajadora carga cajas. Cada caja pesa, y el barco baja un poquito para apartar más agua.",
    ask: "¿Cuántas cajas lleva? ¿Está el barco más hundido que antes?",
    note: "Cada caja hunde el casco 2,8 mm: a escala LEGO pesa unos 20 g, lo que pesan 20 cm³ de agua. Los barcos de verdad llevan pintada la línea de carga (la marca Plimsoll): el agua nunca debe pasar de ella.",
  },
  {
    say: "¡Una caja más! El barco baja tanto que el agua entra por el borde… ¡y se hunde!",
    ask: "¿Qué podríamos hacer para que no se hunda?",
    note: "Con cinco cajas, para flotar tendría que apartar más agua de la que cabe en su casco. El agua entra por arriba, llena el casco, y el barco ya solo aparta su acero y sus cajas. Por eso, curiosamente, al hundirse el nivel del puerto baja un poco.",
  },
  {
    say: "¡Ahora te toca a ti! Pon y quita cajas, empuja el barco o tira piedras.",
    ask: "¿Cuántas cajas puede llevar sin hundirse?",
    note: "También puedes pulsar la grúa para sacar y meter el barco y ver bajar y subir el agua. Hemos simplificado: un barco real se inclina si la carga no va centrada, y las olas y el viento también cuentan. Los barcos de verdad llevan la carga muy por debajo de su límite.",
  },
].map((step) => ({ ...step, night: null }));

const outLeft = [[22 * STUD, 140.8, -40], [10.5 * STUD, 140.8, -40], [10.5 * STUD, 140.8, -14]];
const outRight = [[22 * STUD, 140.8, -40], [34 * STUD, 140.8, -40], [34 * STUD, 140.8, -14]];
const flood = [18, 22, 26].map((x) => [[x * STUD, 150, PLATE + 1.4], [x * STUD, 136, PLATE + 2.6], [x * STUD, 128, ZB0 + PLATE + 1]]);
const footprint = [[HULL.x0, HULL.y0], [30, HULL.y0], [HULL.x1, 14], [30, HULL.y1], [HULL.x0, HULL.y1]].map(([x, y]) => [x * STUD, y * STUD]);

const script = `
const P = ${JSON.stringify(P)};
const A_H = ${A_H}, A_B = ${A_B}, M0 = ${M0}, MC = ${MC}, L0 = ${L0}, ZB0 = ${ZB0}, H = ${H}, HANG = ${HANG}, HOOK = ${HOOK};
const FLOOR_Z = ${FLOOR_Z}, STEEL = ${STEEL}, CRATE_V = ${CRATE_V}, STONE_V = ${STONE_V};
const BASIN = ${JSON.stringify([BASIN.x0 * STUD, BASIN.y0 * STUD, BASIN.x1 * STUD, BASIN.y1 * STUD])};
const FOOT = ${JSON.stringify(footprint)};
const CRATE_AT = ${JSON.stringify(CRATES)};
const TIP = ${JSON.stringify(TIP)};
const SPOTS = ${JSON.stringify(STONE_SPOTS.map(([x, y]) => [x * STUD, y * STUD]))};
const HAND = [5.9 * 8, 17.3 * 8, 24];
const CORNERS = [[16 * 8, 11 * 8], [28 * 8, 11 * 8], [28 * 8, 17 * 8], [16 * 8, 17 * 8]];
const R = A_H / A_B;
const still = matchMedia("(prefers-reduced-motion: reduce)");
const svg = document.querySelector(".lb-lesson svg");
const boats = [...svg.querySelectorAll('[data-part="boat"]')];
const crateNodes = [0, 1, 2, 3, 4].map((i) => [...svg.querySelectorAll('[data-crate="' + i + '"]')]);
const pileNodes = [0, 1, 2, 3, 4].map((i) => svg.querySelector('[data-id="pile-' + i + '"]'));
const clipAbove = svg.querySelector('[data-clip="above"]');
const waterTop = svg.querySelector(".lb-water-top");
const waterFace = svg.querySelector(".lb-water-face");
const cable = svg.querySelector('[data-part="cable"]');
const slings = svg.querySelector('[data-part="slings"]');
const hookNode = svg.querySelector('[data-part="hook"]');
const under = svg.querySelector('[data-part="stones-under"]');
const over = svg.querySelector('[data-part="stones-over"]');
const boatTokens = svg.querySelector('[data-part="boat-tokens"]');
const outs = [${JSON.stringify(outLeft)}, ${JSON.stringify(outRight)}];
const flowOut = outs.map((pts) => lesson.route(pts, { token: "#w", gap: 9, speed: 34 }));
const flowIn = outs.map((pts) => lesson.route(pts.slice().reverse(), { token: "#w", gap: 9, speed: 34 }));
const pour = ${JSON.stringify(flood)}.map((pts) => lesson.route(pts, { token: "#w", gap: 5, speed: 40, layer: boatTokens }));

const state = { mode: "hang", z: HANG, v: 0, n: 0, hz: 0, attached: true, L: L0, Lshow: L0, sub: 0, flow: 0, flowLevel: 0, timer: 0, queue: [], drops: [0, 0, 0, 0, 0], stones: [], fade: 1, pushes: 0 };
const mass = () => M0 + state.n * MC;
const draft = () => mass() / A_H;
const stoneVolume = () => state.stones.filter((s) => s.z < state.L).length * STONE_V;
const sunkish = () => state.mode === "flood" || state.mode === "sink" || state.mode === "sunk";
const boatIn = () => lesson.step >= 2;
// The harbour level for a barge with its bottom at z.
function levelAt(z) {
  const base = L0 + stoneVolume() / A_B;
  if (!boatIn()) return base;
  if (sunkish()) return base + (STEEL + state.n * CRATE_V) / A_B;
  let L = (base - R * z) / (1 - R);
  if (L <= z) return base;
  if (L - z > H) L = base + (A_H * H) / A_B;
  return L;
}
// Where the barge floats still with its present load.
function restZ() {
  const base = L0 + stoneVolume() / A_B;
  return base + mass() / A_B - draft();
}
const freeboard = () => H - draft();

function float(n) {
  state.n = n;
  state.mode = "float";
  state.attached = false;
  state.z = restZ();
  state.v = 0;
  state.hz = ARM_HOOK;
  state.drops = [0, 0, 0, 0, 0];
}
const ARM_HOOK = TIP[2] - 9;

function push() {
  if (lesson.step < 4 || state.mode !== "float") return;
  const w = Math.sqrt(60 / draft());
  state.v -= w * Math.max(1.2, Math.min(6, freeboard() - 1));
  state.pushes++;
}
function load() {
  if (lesson.step < 5 || state.n >= 5 || state.mode !== "float") return;
  state.drops[state.n] = 34;
  state.n++;
}
function unload() {
  if (lesson.step < 5) return;
  if (sunkish()) { if (state.mode === "sunk") { state.fade = 0; float(0); } return; }
  if (state.n <= 0 || state.mode !== "float") return;
  state.n--;
}
function throwStone() {
  if (lesson.step < 1) return;
  if (state.stones.length >= SPOTS.length) state.stones.forEach((s) => (s.gone = true));
  const free = SPOTS.findIndex((_, i) => !state.stones.some((s) => s.spot === i && !s.gone));
  const node = document.createElementNS("http://www.w3.org/2000/svg", "use");
  node.setAttribute("href", "#stone");
  over.appendChild(node);
  state.stones.push({ spot: free < 0 ? 0 : free, t: 0, z: HAND[2], node, gone: false, fade: 1, splash: false });
}
function restStone(spot) {
  const node = document.createElementNS("http://www.w3.org/2000/svg", "use");
  node.setAttribute("href", "#stone");
  under.appendChild(node);
  state.stones.push({ spot, t: 99, z: FLOOR_Z, node, gone: false, fade: 1, splash: true });
}
function crane() {
  if (lesson.step < 7) return;
  if (state.mode === "float") { state.mode = "lift"; state.attached = false; }
  else if (state.mode === "hang") state.mode = "lower";
}

lesson.onStep((step) => {
  state.stones.forEach((s) => s.node.remove());
  state.stones = [];
  state.queue = [];
  state.timer = 0;
  state.fade = 1;
  if (step >= 2) restStone(0);
  if (step === 1) state.queue.push([0.6, throwStone]);
  if (step <= 3) {
    state.n = 0;
    state.mode = "hang";
    if (step === 3) state.queue.push([1.2, () => (state.mode = "lower")]);
    state.attached = true;
    state.z = HANG;
    state.v = 0;
    state.drops = [0, 0, 0, 0, 0];
  } else if (step === 4) { float(0); state.queue.push([0.8, push]); }
  else if (step === 5) { float(0); state.queue.push([0.7, load], [1.9, load], [3.1, load]); }
  else if (step === 6) { float(4); state.queue.push([1.4, load]); }
  else float(1);
  state.L = state.Lshow = levelAt(state.z);
});

const loadButton = lesson.button("load", load, () => "📦 Cargar una caja");
const unloadButton = lesson.button("unload", unload, () => (sunkish() ? "🛟 Sacar el barco" : "📤 Quitar una caja"));
lesson.click('[data-id="boat"]', push);
lesson.click('[data-id^="pile"]', load);
lesson.click('[data-id="child"], [data-id="stones"]', throwStone);
lesson.click('[data-id="crane"]', crane);
lesson.key("c", load);
lesson.key("q", unload);
lesson.key("e", push);
lesson.key("p", throwStone);
lesson.key("g", crane);

const at = (p) => iso(p, P);
const f1 = (v) => v.toFixed(1);
// What of the barge is dry: each upright part (the hull, the wheelhouse, each crate) that reaches
// above the water owns the screen image of its slice between the water and its top. Anything of the
// barge drawn there is above the water; the rest stays under the water drawn over it.
const rect = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]].map(([x, y]) => [x * 8, y * 8]);
const COLUMNS = [{ foot: FOOT, top: ZB0 + H }, { foot: rect(12, 12, 15, 16), top: 35 }, ...CRATE_AT.map(([x, y], i) => ({ foot: rect(x, y, x + 2, y + 2), top: 6.4, crate: i }))];
function hull2d(points) {
  const p = points.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const half = (list) => { const out = []; for (const q of list) { while (out.length >= 2 && cross(out[out.length - 2], out[out.length - 1], q) <= 0) out.pop(); out.push(q); } out.pop(); return out; };
  return [...half(p), ...half(p.slice().reverse())];
}
function slice(foot, z0, z1) {
  const pts = hull2d(foot.flatMap(([x, y]) => [at([x, y, z0]), at([x, y, z1])]));
  return "M" + pts.map((q) => f1(q[0]) + " " + f1(q[1])).join("L") + "Z";
}
function clips(L, dz) {
  const dry = COLUMNS.filter((c) => (c.crate === undefined || c.crate < state.n) && c.top + dz > L);
  clipAbove.setAttribute("d", dry.length ? dry.map((c) => slice(c.foot, L, c.top + dz + 2)).join("") : "M0 0Z");
}
function drawWater(L) {
  const [x0, y0, x1, y1] = BASIN;
  waterTop.setAttribute("d", pathOf([[x0, y0, L], [x1, y0, L], [x1, y1, L], [x0, y1, L]].map(at), true));
  waterFace.setAttribute("d", pathOf([[x0, y1, FLOOR_Z], [x1, y1, FLOOR_Z], [x1, y1, L], [x0, y1, L]].map(at), true));
}
function boxPath(x0, y0, z0, x1, y1, z1) {
  const top = pathOf([[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]].map(at), true);
  const side = pathOf([[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]].map(at), true);
  const front = pathOf([[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]].map(at), true);
  return '<path class="lb-hook-top" d="' + top + '"/><path class="lb-hook-side" d="' + side + '"/><path class="lb-hook-front" d="' + front + '"/>';
}
function drawRig() {
  const [tx, ty] = TIP;
  const hz = state.hz;
  cable.setAttribute("d", pathOf([at([tx, ty, TIP[2]]), at([tx, ty, hz + 3])]));
  hookNode.innerHTML = boxPath(tx - 3, ty - 3, hz, tx + 3, ty + 3, hz + 4);
  const ends = state.attached ? CORNERS.map(([x, y]) => [x, y, state.z - ZB0 + 3.2]) : CORNERS.map(([x, y]) => [tx + (x - tx) * 0.12, ty + (y - ty) * 0.25, hz - 10]);
  slings.setAttribute("d", ends.map((e) => pathOf([at([tx, ty, hz]), at(e)])).join(""));
}

lesson.every((dt) => {
  const s = lesson.step;
  let busy = false;
  state.timer += dt;
  while (state.queue.length && state.queue[0][0] <= state.timer) state.queue.shift()[1]();
  if (state.queue.length) busy = true;
  const prevSub = state.sub;
  const m = mass();
  if (state.mode === "lower") {
    state.attached = true;
    const target = restZ();
    state.z = still.matches ? target : Math.max(target, state.z - (state.z > levelAt(state.z) ? 8 : 2.6) * dt);
    if (state.z <= target + 0.01) { state.mode = "float"; state.attached = false; state.v = 0; }
  } else if (state.mode === "lift") {
    const want = state.z - ZB0 + HOOK;
    if (!state.attached) {
      state.hz = still.matches ? want : Math.max(want, state.hz - 30 * dt);
      if (state.hz <= want + 0.01) state.attached = true;
    } else {
      state.z = still.matches ? HANG : Math.min(HANG, state.z + 14 * dt);
      if (state.z >= HANG - 0.01) state.mode = "hang";
    }
  } else if (state.mode === "float") {
    const L = levelAt(state.z);
    const sub = Math.max(0, Math.min(H, L - state.z));
    if (still.matches) { state.z = restZ(); state.v = 0; }
    else {
      const a = (60 * (A_H * sub - m)) / m - 1.8 * state.v;
      state.v += a * dt;
      state.z += state.v * dt;
    }
    if (draft() > H && L - state.z >= H - 0.15) { state.mode = "flood"; state.timer2 = 0; }
    else if (still.matches && draft() > H) { state.mode = "sunk"; state.z = FLOOR_Z; }
  } else if (state.mode === "flood") {
    state.timer2 += dt;
    state.z -= 5 * dt;
    if (state.timer2 > 1.2) state.mode = "sink";
  } else if (state.mode === "sink") {
    state.z = still.matches ? FLOOR_Z : Math.max(FLOOR_Z, state.z - (6 + (state.z - FLOOR_Z) * 0.9) * dt);
    if (state.z <= FLOOR_Z + 0.02) { state.z = FLOOR_Z; state.mode = "sunk"; }
  }
  if (state.attached) state.hz = state.z - ZB0 + HOOK;
  else if (state.mode !== "lift") state.hz = still.matches ? ARM_HOOK : lesson.ease(state.hz, ARM_HOOK, dt, 0.5);

  state.L = levelAt(state.z);
  state.Lshow = lesson.ease(state.Lshow, state.L, dt, sunkish() ? 0.6 : 0.08);
  state.sub = boatIn() && !sunkish() ? Math.max(0, Math.min(H, state.L - state.z)) : 0;
  const rate = dt > 0 ? (state.sub - prevSub) / dt : 0;
  state.flow = lesson.ease(state.flow, Math.max(-1, Math.min(1, rate / 6)), dt, 0.15);
  if (Math.abs(state.flow) < 0.01 && Math.abs(rate) < 0.01) state.flow = 0;

  // Crates drop into the hold; the pile on the quay shrinks as they go.
  for (let i = 0; i < 5; i++) {
    state.drops[i] = lesson.ease(state.drops[i], 0, dt, 0.18);
    if (state.drops[i] < 0.05) state.drops[i] = 0;
    const on = i < state.n;
    crateNodes[i].forEach((node) => {
      node.toggleAttribute("data-off", !on);
      node.setAttribute("transform", translateAlong(P, [0, 0, state.drops[i]]));
    });
    if (pileNodes[4 - i]) pileNodes[4 - i].toggleAttribute("data-off", on);
  }

  // Stones: an arc from the child's hand, a splash, a slow fall through the water, the bottom.
  for (const st of state.stones) {
    const [sx, sy] = SPOTS[st.spot];
    let p;
    if (st.t < 0.7) {
      st.t += dt;
      const u = Math.min(1, st.t / 0.7);
      p = [HAND[0] + (sx - HAND[0]) * u, HAND[1] + (sy - HAND[1]) * u, HAND[2] + (state.Lshow - HAND[2]) * u + 22 * u * (1 - u)];
      st.z = p[2];
    } else {
      if (!st.splash) { st.splash = true; lesson.fx.ripple("harbour", sx, sy); }
      st.z = still.matches ? FLOOR_Z : Math.max(FLOOR_Z, st.z - 28 * dt);
      p = [sx, sy, st.z];
    }
    if (st.t < 0.7 || st.z > FLOOR_Z) busy = true;
    const layer = st.z + 2 > state.Lshow ? over : under;
    if (st.node.parentNode !== layer) layer.appendChild(st.node);
    const [x, y] = at(p);
    const [ox, oy] = at([0, 0, 0]);
    st.node.setAttribute("transform", "translate(" + f1(x - ox) + " " + f1(y - oy) + ")");
    if (st.gone) { st.fade -= dt * 2; st.node.setAttribute("opacity", Math.max(0, st.fade).toFixed(2)); if (st.fade <= 0) st.node.remove(); busy = true; }
  }
  state.stones = state.stones.filter((st) => st.fade > 0);

  state.fade = Math.min(1, state.fade + dt * 1.5);
  const dz = s >= 2 ? state.z - ZB0 : 0;
  boats.forEach((node) => { node.setAttribute("transform", translateAlong(P, [0, 0, dz])); node.style.opacity = state.fade.toFixed(2); });
  boatTokens.setAttribute("transform", translateAlong(P, [0, 0, dz]));
  clips(state.Lshow, dz);
  drawWater(state.Lshow);
  drawRig();
  lesson.fx.level("harbour", 0.5);
  lesson.fx.set("harbour", "z", state.Lshow);
  lesson.fx.offset("harbour", [0, 0, s >= 2 && !sunkish() ? dz : -400]);

  const out = Math.max(0, state.flow), back = Math.max(0, -state.flow);
  flowOut.forEach((route) => (route.level = s >= 3 ? out : 0));
  flowIn.forEach((route) => (route.level = s >= 3 ? back : 0));
  pour.forEach((route) => (route.level = state.mode === "flood" ? 1 : 0));

  loadButton.disabled = s < 5 || state.n >= 5 || state.mode !== "float";
  unloadButton.disabled = s < 5 || (sunkish() ? state.mode !== "sunk" : state.n <= 0 || state.mode !== "float");
  const moving = Math.abs(state.v) > 0.02 || Math.abs(state.z - restZ()) > 0.02;
  if (state.mode === "float" && !moving) state.v = 0;
  return busy || state.mode === "lower" || state.mode === "lift" || state.mode === "flood" || state.mode === "sink" || (state.mode === "float" && moving) || Math.abs(state.Lshow - state.L) > 0.01 || state.drops.some((d) => d > 0) || state.fade < 1 || Math.abs(state.hz - (state.attached ? state.z - ZB0 + HOOK : ARM_HOOK)) > 0.05 || state.flow !== 0;
});

lesson.readout(() => {
  const s = lesson.step;
  if (s < 1) return "🌊 agua tranquila";
  const rise = state.Lshow - L0;
  const where = { hang: "🏗️ colgado de la grúa", lower: "🏗️ bajando al agua", lift: "🏗️ subiendo", float: "⛵ flota", flood: "💦 ¡le entra agua!", sink: "🫧 se hunde", sunk: "⚓ en el fondo" }[state.mode];
  return [
    s >= 2 ? where : "🪨 la piedra se hunde",
    s >= 5 ? "📦 " + state.n + (state.n === 1 ? " caja" : " cajas") : "",
    state.flow > 0.05 ? "🌊 el agua se aparta" : state.flow < -0.05 ? "🌊 el agua vuelve" : s >= 3 && rise > 0.2 ? "🌊 el agua ha subido " + rise.toFixed(1).replace(".", ",") + " mm" : s >= 3 ? "🌊 agua tranquila" : "",
  ].filter(Boolean).join("  ·  ");
});
`;

const CSS = `
.lb-water{pointer-events:none}
.lb-water-top{fill:#3d8fd6;fill-opacity:.42;stroke:#2a6fb6;stroke-width:.8;stroke-opacity:.6}
.lb-water-face{fill:#2f7fd0;fill-opacity:.5;stroke:#1f5fa6;stroke-width:.8;stroke-opacity:.5}
.lb-cable{fill:none;stroke:#2b2f33;stroke-width:1.1}
.lb-sling{fill:none;stroke:#3a3f45;stroke-width:.8}
.lb-hook-top{fill:#8a8f94}.lb-hook-side{fill:#4c5156}.lb-hook-front{fill:#6c7176}
[data-part="rig"]{pointer-events:none}
[data-crate][data-off],[data-id^="pile"][data-off]{opacity:0;pointer-events:none}
[data-id="boat"],[data-id="crane"],[data-id="child"],[data-id="stones"],[data-id^="pile"]{cursor:pointer}
[data-part="tokens"],[data-part="boat-tokens"]{pointer-events:none;filter:drop-shadow(0 0 2px #e8f8ff)}
`;

const html = l.lessonHtml({
  title: "¿Por qué flotan los barcos?",
  svg,
  steps: STEPS,
  projection: P,
  buttons: [
    { action: "load", label: "📦 Cargar una caja" },
    { action: "unload", label: "📤 Quitar una caja" },
  ],
  keys: "C cargar · Q quitar · E empujar el barco · P tirar una piedra · G grúa · también puedes pulsar el barco, las cajas, el niño o la grúa",
  fx: [
    fx.water({
      id: "harbour",
      rect: [BASIN.x0 * STUD, BASIN.y0 * STUD, BASIN.x1 * STUD, BASIN.y1 * STUD],
      z: L0 + 4,
      occluders: [[BASIN.x1 * STUD, 0, -EARTH * PLATE, LONG * STUD, DEEP * STUD, 46]],
      movers: [[HULL.x0 * STUD, HULL.y0 * STUD, ZB0, HULL.x1 * STUD, HULL.y1 * STUD, ZB0 + H + 32]],
    }),
  ],
  script,
  css: CSS,
});
mkdirSync(HERE, { recursive: true });
writeFileSync(join(HERE, "barco.html"), html);
console.log("wrote barco.html", `${(html.length / 1024).toFixed(0)} KB`, `${scene.length + ahead.length + above.length + boat.length} pieces`);
