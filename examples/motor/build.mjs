import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../kit/iso-kit.mjs";
import * as b from "../../kit/brick.mjs";
import * as r from "../../kit/lego-round.mjs";
import * as t from "../../kit/lego-tube.mjs";
import * as l from "../../kit/lesson.mjs";
import { auditOrExit } from "../../kit/lego-audit.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const { STUD, PLATE, GAP } = b;

const WIDTH = 1000;
const HEIGHT = 620;

// A garage on the LEGO grid, 36 studs along x and 18 deep, with a go-kart up on four stands. Its
// engine sits on the rear axle: the crank is on the axle itself, so every turn of the crank is a
// turn of the rear wheels. The cylinder is glass so the piston shows.
const LONG = 36;
const DEEP = 18;
const EARTH = 6;
const FLOOR = PLATE;
const STAND = 4;
const CHASSIS = (1 + STAND) * PLATE;
const AXLE_Z = CHASSIS + 2;
const WHEEL_R = 12;
const WHEEL_W = 8;
const REAR_X = 12 * STUD;
const FRONT_X = 20 * STUD;
const NEAR_Y = 14.5 * STUD;
const FAR_Y = 5.5 * STUD;
const LIFT = AXLE_Z - WHEEL_R - FLOOR;

// The engine, in millimetres. Crank radius 7 (a 14 mm stroke) and a 24 mm rod; the piston pin is
// 5 mm above the piston's skirt, its crown 7 mm above the pin. At the top the crown leaves 4 mm of
// chamber under the head.
const E = [REAR_X, 9 * STUD];
const CRANK_R = 7;
const ROD = 24;
const DISC_R = 10;
const DISC_Y = [E[1] - 8, E[1] - 3];
const PISTON_R = 11.6;
const BORE = 12.4;
const CYL_Z0 = AXLE_Z + DISC_R;
const HEAD_Z = AXLE_Z + CRANK_R + ROD + 7 + 4;
const HEAD_TOP = HEAD_Z + PLATE;
const INTAKE = [E[0] + 6, E[1]];
const EXHAUST = [E[0] - 6, E[1]];
const PLUG = [E[0], E[1] + 5.6];

const pieces = [];
const back = [];
const front = [];
const engine = [];
const add = (list, step, piece) => list.push({ step, ...piece });

// Step 0: the garage. Earth, a light grey floor, a back wall with a window and a tool board, a stack
// of tyres, a jerrycan and a mechanic.
for (let row = 0; row < 2; row++) {
  const shift = row ? 2 : 0;
  for (let x = -shift; x < LONG; x += 4) {
    const from = Math.max(0, x);
    const to = Math.min(LONG, x + 4);
    add(pieces, 0, b.brick({ x: from, y: 0, z: -EARTH + row * 3, w: to - from, d: DEEP, h: 3, color: row ? "brown" : "dark-tan", studs: false }));
  }
}
for (let x = 0; x < LONG; x += 12) for (let y = 0; y < DEEP; y += 9) add(pieces, 0, b.tile({ x, y, w: 12, d: 9, color: "light-gray" }));
for (let course = 0; course < 4; course++) {
  for (let x = 0; x < LONG; x += 6) {
    const window = course >= 1 && course <= 2 && x === 24;
    if (!window) add(pieces, 0, b.brick({ x, y: 0, z: 1 + course * 3, w: 6, d: 1, color: course % 2 ? "white" : "tan", studs: course === 3 }));
  }
}
add(pieces, 0, b.custom({ faces: b.boxFaces(24 * STUD, 0.2 * STUD, 4 * PLATE, 30 * STUD, 0.6 * STUD, 10 * PLATE), color: "#9fd8f0", trans: true }));
add(pieces, 0, b.custom({ faces: b.boxFaces(6 * STUD, STUD - GAP, 4 * PLATE, 14 * STUD, STUD + 0.6, 11 * PLATE), color: "brown", overlaps: true }));
[[7.4, 7.6, "dark-gray"], [9.2, 9.6, "red"], [11, 10.6, "dark-gray"], [12.6, 8, "blue"]].forEach(([x, top, color]) =>
  add(pieces, 0, b.custom({ faces: b.boxFaces(x * STUD, STUD + 0.6, 6 * PLATE, x * STUD + 2.4, STUD + 2.2, top * PLATE), color, overlaps: true })),
);
for (let i = 0; i < 3; i++) add(pieces, 0, r.wheel({ at: [2.5 * STUD, 2.5 * STUD + 0.1, FLOOR + 4 + i * 8], axis: "z", r: 12, width: 8 }));
add(pieces, 0, b.brick({ x: 31, y: 2, z: 1, w: 2, d: 1, h: 6, color: "red" }));
add(pieces, 0, b.minifig({ x: 27, y: 16.6, z: 1, torso: "blue", legs: "dark-gray", hat: "red" }));

// Step 1: the kart on its four stands. A red chassis with a hole for the engine, four wheels on two
// axles, a seat and a seated driver facing forward, a steering wheel and a nose.
[[10, 6], [10, 12], [20, 6], [20, 12]].forEach(([x, y]) => add(pieces, 1, b.brick({ x, y, z: 1, w: 2, d: 2, h: STAND, color: "dark-gray", studs: false, until: 5 })));
add(front, 1, b.plate({ x: 14, y: 6, z: 1 + STAND, w: 8, d: 8, color: "red" }));
add(back, 1, b.plate({ x: 10, y: 6, z: 1 + STAND, w: 4, d: 1, color: "red" }));
add(front, 1, b.plate({ x: 10, y: 11, z: 1 + STAND, w: 4, d: 3, color: "red" }));
add(back, 1, b.pipe({ axis: "y", from: FAR_Y + WHEEL_W / 2, to: DISC_Y[0], at: [REAR_X, AXLE_Z], r: 1.6, color: "dark-gray" }));
add(front, 1, b.pipe({ axis: "y", from: DISC_Y[1], to: NEAR_Y - WHEEL_W / 2, at: [REAR_X, AXLE_Z], r: 1.6, color: "dark-gray" }));
add(front, 1, b.pipe({ axis: "y", from: FAR_Y + WHEEL_W / 2, to: NEAR_Y - WHEEL_W / 2, at: [FRONT_X, AXLE_Z], r: 1.6, color: "dark-gray" }));
add(back, 1, r.wheel({ at: [REAR_X, FAR_Y, AXLE_Z], axis: "y", r: WHEEL_R, width: WHEEL_W }));
add(front, 1, r.wheel({ at: [REAR_X, NEAR_Y, AXLE_Z], axis: "y", r: WHEEL_R, width: WHEEL_W, id: "rear-wheel" }));
add(front, 1, r.wheel({ at: [FRONT_X, FAR_Y, AXLE_Z], axis: "y", r: WHEEL_R, width: WHEEL_W }));
add(front, 1, r.wheel({ at: [FRONT_X, NEAR_Y, AXLE_Z], axis: "y", r: WHEEL_R, width: WHEEL_W }));
add(front, 1, b.brick({ x: 17, y: 8, z: 2 + STAND, w: 2, d: 4, h: 2, color: "dark-gray", studs: false }));
add(front, 1, b.brick({ x: 16, y: 8, z: 2 + STAND, w: 1, d: 4, h: 6, color: "dark-gray", studs: false }));
add(front, 1, b.minifig({ x: 17.8, y: 10, z: 4 + STAND, torso: "yellow", hat: "white", legs: null, facing: "x" }));
add(front, 1, b.pipe({ axis: "z", from: CHASSIS + PLATE, to: CHASSIS + 26, at: [20.6 * STUD, 10 * STUD], r: 1, color: "dark-gray" }));
add(front, 1, r.turned({ profile: [[0, 0], [0, 6], [2, 6], [2, 0]], at: [20.6 * STUD - 2, 10 * STUD, CHASSIS + 26], axis: "x", color: "black", steps: 20, kind: "steering", overlaps: true }));
add(front, 1, r.turned({ profile: [[0, 0], [0, 8], [6, 7], [12, 4], [14, 0]], at: [22 * STUD - GAP, 10 * STUD, CHASSIS + 1.6], axis: "x", color: "red", steps: 24, kind: "nose", overlaps: true }));

// Step 2: the engine's moving heart. The crank disc on the axle, the glass cylinder standing on it
// and the head that closes it. The piston and rod are drawn live.
add(engine, 2, r.turned({ profile: [[0, 0], [0, DISC_R], [DISC_Y[1] - DISC_Y[0], DISC_R], [DISC_Y[1] - DISC_Y[0], 0]], at: [E[0], DISC_Y[0], AXLE_Z], axis: "y", color: "light-gray", steps: 28, kind: "crank", overlaps: true }));
add(engine, 2, r.turned({ profile: [[0, 0], [0, BORE + 1.2], [HEAD_Z - CYL_Z0, BORE + 1.2], [HEAD_Z - CYL_Z0, 0]], at: [E[0], E[1], CYL_Z0], axis: "z", color: "#cfeefa", trans: true, steps: 36, kind: "cylinder", id: "glass" }));
add(engine, 2, b.custom({ faces: b.boxFaces(E[0] - 13, E[1] - 13, HEAD_Z, E[0] + 13, E[1] + 13, HEAD_TOP), color: "dark-gray", kind: "head" }));

// Step 3: breathing in. An air filter and its pipe into the head, a fuel tank and the fuel hose.
add(front, 3, b.pipe({ axis: "x", from: E[0] + 10, to: E[0] + 26, at: [E[1], HEAD_Z + 1.6], r: 2, color: "light-gray" }));
add(front, 3, r.turned({ profile: [[0, 0], [0, 6.5], [14, 6.5], [14, 0]], at: [E[0] + 26, E[1], HEAD_Z + 1.6], axis: "x", color: "white", steps: 24, kind: "air-filter" }));
add(front, 3, b.custom({ faces: b.boxFaces(E[0] + 26, E[1] - 1.6, CHASSIS + PLATE, E[0] + 28, E[1] + 1.6, HEAD_Z + 1.6 - 6.5), color: "dark-gray", kind: "bracket", overlaps: true }));
add(front, 3, b.round({ x: 14, y: 7, z: 2 + STAND, w: 2, h: 6, color: "red" }));
const fuelPath = t.curve([[15 * STUD, 8 * STUD, (8 + STAND) * PLATE + 1], [15 * STUD, 8.4 * STUD, HEAD_Z - 4], [E[0] + 18, E[1] - 2, HEAD_Z + 2.6], [E[0] + 16, E[1], HEAD_Z + 3.6]]);
t.hose({ points: fuelPath, r: 1.3, color: "black", step: 3 }).forEach((piece) => front.push(piece));

// Step 4: the spark plug on the head and the battery that feeds it.
add(engine, 4, b.round({ x: PLUG[0] / STUD - 0.5, y: PLUG[1] / STUD - 0.5, z: HEAD_TOP / PLATE, w: 1, h: 2, color: "white", studs: false, steps: 16, offGrid: true, kind: "plug" }));
add(engine, 4, b.pipe({ axis: "z", from: HEAD_TOP + 2 * PLATE, to: HEAD_TOP + 2 * PLATE + 3, at: PLUG, r: 1.2, color: "light-gray" }));
add(front, 4, b.brick({ x: 20, y: 6, z: 2 + STAND, w: 2, d: 2, h: 3, color: "black", studs: false }));
add(front, 4, b.round({ x: 20.2, y: 6.2, z: 5 + STAND, w: 0.6, h: 1, color: "red", studs: false, offGrid: true, steps: 12 }));
add(front, 4, b.round({ x: 21.2, y: 6.2, z: 5 + STAND, w: 0.6, h: 1, color: "dark-gray", studs: false, offGrid: true, steps: 12 }));
const wirePath = t.curve([[20.5 * STUD, 6.5 * STUD, (6 + STAND) * PLATE], [19 * STUD, 6.4 * STUD, HEAD_TOP + 14], [15 * STUD, 6.6 * STUD, HEAD_TOP + 18], [PLUG[0] + 6, PLUG[1] - 3, HEAD_TOP + 14], [PLUG[0], PLUG[1], HEAD_TOP + 2 * PLATE + 3]]);
t.hose({ points: wirePath, r: 0.9, color: "red", step: 4, caps: false }).forEach((piece) => front.push(piece));

// Step 5: breathing out. The exhaust pipe from the head, down and back to a tailpipe behind the kart.
const exhaustPath = t.curve([[E[0] - 20, E[1], HEAD_Z + 1.6], [E[0] - 30, E[1], HEAD_Z - 4], [E[0] - 34, E[1], CHASSIS + 16], [E[0] - 42, E[1], CHASSIS + 13]]);
t.hose({ points: exhaustPath, r: 2.4, color: "light-gray", step: 5 }).forEach((piece) => back.push(piece));
add(back, 5, b.pipe({ axis: "x", from: E[0] - 20.4, to: E[0] - 10, at: [E[1], HEAD_Z + 1.6], r: 2.4, color: "light-gray" }));

auditOrExit([...pieces, ...back, ...front, ...engine]);

// The kart drives along x in the band its wheels cover. What stands in front of that band is drawn
// after the kart; nothing that stays in the last step may stand inside it.
const lane = b.splitByLane(pieces, FAR_Y - WHEEL_W / 2, NEAR_Y + WHEEL_W / 2);
const blocking = lane.inLane.filter((piece) => piece.box.z1 > FLOOR + 0.05 && piece.until === undefined);
if (blocking.length) throw new Error(`en el camino del kart: ${blocking.map((piece) => piece.kind).join(", ")}`);

const P = k.fitProjection(
  [...k.boxCorners({ x: 0, y: 0, w: LONG * STUD, d: DEEP * STUD, r: 0 }, -EARTH * PLATE, 0), [0, 0, 13 * PLATE], [E[0], E[1], HEAD_TOP + 24]],
  WIDTH,
  HEIGHT,
  { pad: 24, azimuth: 55 },
);
const at = (point) => k.iso(point, P);

// The live parts are drawn once at a rest pose and moved by the page: the piston by a vertical
// translate, the valves by a small drop. The rod and the crank pin are redrawn every frame.
const pistonSvg = r.meshSvg(r.revolveFaces([[0, 0], [0, PISTON_R], [12, PISTON_R], [12, 0]], { at: [E[0], E[1], 0], axis: "z", steps: 32 }), "red", P);
const valveSvg = ([x, y]) => b.solidSvg(b.cylinderFaces(x, y, 3.2, HEAD_Z - 1.2, HEAD_Z - 0.2, 16), "light-gray", P) + b.solidSvg(b.cylinderFaces(x, y, 0.9, HEAD_Z - 0.2, HEAD_TOP + 5, 10), "light-gray", P);
const { k: scale, sinE } = k.cameraOf(P);
const chamberGlow = (() => {
  const [gx, gy] = at([E[0], E[1], HEAD_Z - 3]);
  return `<ellipse data-part="boom" cx="${gx.toFixed(1)}" cy="${gy.toFixed(1)}" rx="${(BORE * scale).toFixed(1)}" ry="${(BORE * scale * 0.8).toFixed(1)}" fill="url(#lb-boom)"/>`;
})();
const sparkGlow = (() => {
  const [sx, sy] = at([PLUG[0], PLUG[1], HEAD_Z - 0.5]);
  return `<circle data-part="spark" cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="${(4 * scale).toFixed(1)}" fill="url(#lb-halo)"/>`;
})();

const kartPieces = (list) => b.sceneSvg(list, P);
const [cylinderPiece, headPiece] = [engine.find((p) => p.kind === "cylinder"), engine.find((p) => p.kind === "head")];
const crankPiece = engine.find((p) => p.kind === "crank");
const topPieces = engine.filter((p) => p !== cylinderPiece && p !== crankPiece);

const body = [
  `<defs>${l.GLOW_DEFS}<radialGradient id="lb-boom"><stop offset="0" stop-color="#fff3a0" stop-opacity=".95"/><stop offset=".5" stop-color="#ff9a1f" stop-opacity=".75"/><stop offset="1" stop-color="#ff5a00" stop-opacity="0"/></radialGradient>
    ${l.tokenDef("air", P, { color: "#ffffff", r: 1.5, h: 1 })}${l.tokenDef("fuel", P, { color: "#ff9a1f", r: 1.1, h: 0.8 })}${l.tokenDef("burnt", P, { color: "#7d838b", r: 1.6, h: 1 })}${l.tokenDef("smoke", P, { color: "#c3c8ce", r: 3, h: 1.4 })}</defs>`,
  `<g class="lb-scene">${b.sceneSvg(lane.behind, P)}</g>`,
  `<g data-part="kart">
    ${kartPieces(back)}
    ${kartPieces([crankPiece])}
    <g class="lb-piece" data-step="2" style="--i:2">
      <path data-part="rod" class="lb-rod"/>
      <circle data-part="pin" class="lb-pin" r="${(1.6 * scale).toFixed(1)}"/>
      <g data-part="piston">${pistonSvg}</g>
      <g data-part="charge"></g>
      <g data-part="valve-in">${valveSvg(INTAKE)}</g>
      <g data-part="valve-out">${valveSvg(EXHAUST)}</g>
      ${chamberGlow}${sparkGlow}
    </g>
    ${kartPieces([cylinderPiece])}
    ${kartPieces(topPieces)}
    ${kartPieces(front)}
    <g class="lb-piece" data-step="1" style="--i:20"><path data-part="spoke" class="lb-spoke"/></g>
    <g data-part="kart-tokens"></g>
  </g>`,
  `<g class="lb-scene">${b.sceneSvg(lane.ahead, P)}</g>`,
];

const svg = l.lessonSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    "Un taller de LEGO con un kart rojo subido en cuatro soportes. Su motor tiene un cilindro de cristal donde se ve un pistón rojo que sube y baja, unido por una biela a una rueda que gira con las ruedas de atrás. Entran aire y gasolina, una chispa los hace explotar y el humo sale por el tubo de escape.",
  body,
});

const STEPS = [
  {
    say: "¡Vamos a construir un kart de LEGO y a mirar dentro de su motor!",
    ask: "¿Has oído alguna vez el ruido de un motor? ¿Cómo suena?",
    note: "Vamos a ver un motor de gasolina de cuatro tiempos, el de casi todos los coches que no son eléctricos. El cilindro es de cristal para ver qué pasa dentro.",
  },
  {
    say: "Este es nuestro kart. Está subido en unos soportes para que las ruedas giren sin moverse del sitio.",
    ask: "¿Cuántas ruedas tiene? ¿Quién lo conduce?",
    note: "Los mecánicos levantan los coches así para trabajar en ellos. Aquí nos sirve para ver girar las ruedas sin que el kart se escape.",
  },
  {
    say: "Dentro del motor hay un pistón rojo que sube y baja. Al bajar empuja una barra que hace girar las ruedas, ¡como tus piernas en los pedales de la bici!",
    ask: "¿Ves cómo sube y baja el pistón? ¿Y cómo giran las ruedas?",
    note: "La barra es la biela y la rueda que gira es el cigüeñal: convierten el sube y baja del pistón en giro. En un kart de verdad el giro llega a las ruedas por una cadena; aquí el cigüeñal va en el mismo eje para que se vea mejor.",
  },
  {
    say: "El motor respira: cuando el pistón baja, entra aire y un poquito de gasolina. Luego el pistón sube y lo aprieta muy fuerte.",
    ask: "¿De qué color es el aire? ¿Y la gasolina?",
    note: "Son los dos primeros tiempos: admisión (se abre la válvula de entrada y el pistón baja) y compresión (se cierran las válvulas y el pistón sube). Ahora lo mueve un motor eléctrico de arranque, todavía no hay chispa.",
  },
  {
    say: "Arriba hay una bujía que hace una chispa. La chispa enciende la mezcla y… ¡pum! La explosión empuja el pistón hacia abajo con mucha fuerza.",
    ask: "¿Ves el destello? ¡Di «pum» cada vez que salte la chispa!",
    note: "Es el tercer tiempo, el único que da fuerza: la mezcla arde muy deprisa, los gases calientes se expanden y empujan el pistón. La chispa la da la bujía con corriente de la batería, que una bobina sube a miles de voltios. Los motores diésel no tienen bujía: el aire se aprieta tanto que se calienta y el gasóleo arde solo.",
  },
  {
    say: "Después el pistón sube y echa el humo por el tubo de escape. ¡Y otra vez: aire, apretar, pum, humo!",
    ask: "¿Lo decimos juntos? ¡Aire, apretar, pum, humo!",
    note: "Es el cuarto tiempo, el escape. Cada ciclo son dos vueltas del cigüeñal; un coche al ralentí da unas 800 vueltas por minuto, así que cada cilindro hace «pum» unas 400 veces por minuto. Casi todos los coches tienen 3 o 4 cilindros, cada uno en un tiempo distinto.",
  },
  {
    say: "¡Quitamos los soportes y a correr! Pisa el acelerador para que el motor gire más deprisa.",
    ask: "¿Qué pasa con el kart cuando aceleras? ¿Y si apagamos el motor?",
    note: "Acelerar abre el paso de aire y la inyección echa más gasolina: más «pums» por segundo, el motor gira más rápido y el kart corre más. Los coches eléctricos no hacen nada de esto: un motor eléctrico gira con imanes, sin explosiones ni humo.",
  },
].map((step) => ({ ...step, night: null }));

const script = `
const P = ${JSON.stringify(P)};
const E = ${JSON.stringify(E)}, AXLE_Z = ${AXLE_Z}, CRANK_R = ${CRANK_R}, ROD = ${ROD}, HEAD_Z = ${HEAD_Z}, BORE = ${BORE};
const DISC_Y = ${JSON.stringify(DISC_Y)}, REAR_X = ${REAR_X}, NEAR_Y = ${NEAR_Y}, WHEEL_R = ${WHEEL_R}, WHEEL_W = ${WHEEL_W}, LIFT = ${LIFT};
const INTAKE = ${JSON.stringify(INTAKE)}, EXHAUST = ${JSON.stringify(EXHAUST)};
const ORIGIN = ${JSON.stringify(at([0, 0, 0]))};
const svg = document.querySelector(".lb-lesson svg");
const kart = svg.querySelector('[data-part="kart"]');
const rod = svg.querySelector('[data-part="rod"]');
const pin = svg.querySelector('[data-part="pin"]');
const piston = svg.querySelector('[data-part="piston"]');
const valveIn = svg.querySelector('[data-part="valve-in"]');
const valveOut = svg.querySelector('[data-part="valve-out"]');
const boom = svg.querySelector('[data-part="boom"]');
const spark = svg.querySelector('[data-part="spark"]');
const spoke = svg.querySelector('[data-part="spoke"]');
const charge = svg.querySelector('[data-part="charge"]');
const layer = svg.querySelector('[data-part="kart-tokens"]');
const air = lesson.route(${JSON.stringify([[E[0] + 40, E[1], HEAD_Z + 1.6], [E[0] + 10, E[1], HEAD_Z + 1.6], [INTAKE[0], INTAKE[1], HEAD_Z - 1]])}, { token: "#air", gap: 4, speed: 40, layer });
const fuel = lesson.route(${JSON.stringify(t.resample(fuelPath, 2))}, { token: "#fuel", gap: 5, speed: 30, layer });
const exhaust = lesson.route(${JSON.stringify(t.resample([[EXHAUST[0], EXHAUST[1], HEAD_Z - 1], [EXHAUST[0], EXHAUST[1], HEAD_Z + 1.6], ...exhaustPath], 2))}, { token: "#burnt", gap: 5, speed: 50, layer });
const smoke = lesson.route(${JSON.stringify([exhaustPath[exhaustPath.length - 1], [E[0] - 50, E[1] + 2, CHASSIS + 24], [E[0] - 56, E[1] + 6, CHASSIS + 46]])}, { token: "#smoke", gap: 9, speed: 18, layer });
const NS = "http://www.w3.org/2000/svg";
// The charge: twelve pieces at fixed places in the chamber, squeezed between crown and head.
const SPOTS = Array.from({ length: 12 }, (_, i) => { const a = i * 2.4, rr = (i % 3 + 0.6) / 3.2 * (BORE - 3); return [Math.cos(a) * rr, Math.sin(a) * rr, ((i * 7) % 12) / 12 * 0.8 + 0.1]; });
const spots = SPOTS.map((_, i) => { const use = document.createElementNS(NS, "use"); use.setAttribute("href", i % 4 === 3 ? "#fuel" : "#air"); charge.appendChild(use); return use; });

const state = { theta: 0, omega: 0, running: true, fast: false, x: 0, dz: 0, fade: 1, flash: 0 };
const pinZ = (theta) => AXLE_Z + CRANK_R * Math.cos(theta) + Math.sqrt(ROD * ROD - (CRANK_R * Math.sin(theta)) ** 2);
const crownZ = (theta) => pinZ(theta) + 7;
const tr = ([x, y, z]) => { const [sx, sy] = iso([x, y, z], P); return "translate(" + (sx - ORIGIN[0]).toFixed(2) + " " + (sy - ORIGIN[1]).toFixed(2) + ")"; };
const toggleRun = () => { if (lesson.step >= 6) state.running = !state.running; };
const toggleFast = () => { if (lesson.step >= 6 && state.running) state.fast = !state.fast; };
lesson.onStep((step) => { state.running = true; state.fast = false; if (step < 6) { state.x = 0; state.fade = 1; } });
const runButton = lesson.button("run", toggleRun, () => (state.running ? "🔑 Apagar el motor" : "🔑 Arrancar"));
const fastButton = lesson.button("fast", toggleFast, () => (state.fast ? "🐢 Más despacio" : "🦶 ¡Acelerar!"));
lesson.click('[data-part="kart"]', toggleFast);
lesson.key("a", toggleFast);
lesson.key("m", toggleRun);

const PHASES = ["💨 aire", "🤏 apretar", "💥 ¡pum!", "🌫️ humo"];
lesson.every((dt) => {
  const s = lesson.step;
  const want = s < 2 ? 0 : s < 6 ? (s === 2 ? 1.4 : 1.6) : state.running ? (state.fast ? 7.5 : 2.6) : 0;
  state.omega = lesson.ease(state.omega, want, dt, s >= 6 ? 0.8 : 0.4);
  if (state.omega < 0.01 && want === 0) state.omega = 0;
  state.theta += state.omega * dt;
  const cycle = ((state.theta % (4 * Math.PI)) + 4 * Math.PI) % (4 * Math.PI);
  const phase = Math.floor(cycle / Math.PI);
  const within = cycle / Math.PI - phase;

  // Piston, rod and pin.
  const pz = pinZ(state.theta);
  piston.setAttribute("transform", translateAlong(P, [0, 0, pz - 5]));
  const crank = [REAR_X + CRANK_R * Math.sin(state.theta), DISC_Y[1] + 0.5, AXLE_Z + CRANK_R * Math.cos(state.theta)];
  const [cx, cy] = iso(crank, P);
  pin.setAttribute("cx", cx.toFixed(1));
  pin.setAttribute("cy", cy.toFixed(1));
  rod.setAttribute("d", pathOf([iso(crank, P), iso([E[0], DISC_Y[1] + 0.5, pz], P)]));
  // Valves open in their stroke.
  const lift = (open) => (open ? Math.sin(Math.PI * within) * 2.4 : 0);
  valveIn.setAttribute("transform", translateAlong(P, [0, 0, -lift(phase === 0)]));
  valveOut.setAttribute("transform", translateAlong(P, [0, 0, -lift(phase === 3)]));
  // The wheel's spoke shows the axle turning with the crank.
  const hub = [REAR_X, NEAR_Y + WHEEL_W / 2 + 0.2, AXLE_Z];
  spoke.setAttribute("d", pathOf([iso(hub, P), iso([REAR_X + Math.sin(state.theta) * (WHEEL_R - 1), hub[1], AXLE_Z + Math.cos(state.theta) * (WHEEL_R - 1)], P)]));

  // The charge in the chamber: fills in stroke 1, squeezed in 2, burns in 3, leaves in 4.
  const crown = crownZ(state.theta);
  const firing = s >= 4;
  const shown = s < 3 ? 0 : phase === 0 ? within : phase === 3 ? 1 - within : 1;
  spots.forEach((use, i) => {
    const [u, v, w] = SPOTS[i];
    const visible = (i + 0.5) / spots.length <= shown;
    use.setAttribute("opacity", visible ? "1" : "0");
    if (!visible) return;
    use.setAttribute("href", firing && phase >= 2 ? "#burnt" : i % 4 === 3 ? "#fuel" : "#air");
    use.setAttribute("transform", tr([E[0] + u, E[1] + v, crown + 0.6 + w * (HEAD_Z - crown - 1.2)]));
  });
  state.flash = firing && phase === 2 && within < 0.12 ? 1 : Math.max(0, state.flash - dt * 4);
  spark.style.opacity = state.flash.toFixed(2);
  boom.style.opacity = (firing && phase === 2 ? Math.max(0, 1 - within * 1.6) * 0.9 : 0).toFixed(2);

  // Flows outside the engine follow the strokes.
  const pulse = (on) => (on ? Math.sin(Math.PI * within) : 0);
  air.level = s >= 3 ? pulse(phase === 0) : 0;
  fuel.level = s >= 3 ? pulse(phase === 0) : 0;
  exhaust.level = s >= 5 ? pulse(phase === 3) : 0;
  smoke.level = s >= 5 && state.omega > 0.2 ? Math.min(1, state.omega / 2) : 0;
  [air, fuel, exhaust, smoke].forEach((route) => { route.speed = route === smoke ? 18 : 30 + state.omega * 14; });

  // Off the stands, the kart drives: the wheels roll on the floor.
  state.dz = lesson.ease(state.dz, s >= 6 ? -LIFT : 0, dt, 0.25);
  if (s >= 6) {
    state.x += state.omega * WHEEL_R * dt;
    if (state.x > 120) { state.fade -= dt * 2.5; if (state.fade <= 0) { state.x = -70; state.fade = 0; } }
    else state.fade = Math.min(1, state.fade + dt * 2);
  }
  kart.setAttribute("transform", translateAlong(P, [state.x, 0, state.dz]));
  kart.style.opacity = state.fade.toFixed(2);
  runButton.disabled = s < 6;
  fastButton.disabled = s < 6 || !state.running;
  return s >= 2 || state.omega > 0;
});

lesson.readout(() => {
  const s = lesson.step;
  if (s < 2) return "";
  const cycle = ((state.theta % (4 * Math.PI)) + 4 * Math.PI) % (4 * Math.PI);
  const phase = Math.floor(cycle / Math.PI);
  const parts = [s >= 3 ? PHASES.map((name, i) => (i === phase ? "▶ " + name : name)).slice(0, s >= 5 ? 4 : s >= 4 ? 3 : 2).join("  ") : "⚙️ el pistón sube y baja"];
  if (s >= 6) parts.push(state.running ? (state.fast ? "🏎️ ¡a toda velocidad!" : "🚗 despacito") : "🔇 motor apagado");
  return parts.join("  ·  ");
});
`;

const CSS = `
.lb-rod{fill:none;stroke:#4a5058;stroke-width:4.6;stroke-linecap:round}
.lb-pin{fill:#5b6168}
.lb-spoke{fill:none;stroke:#e9edf1;stroke-width:2.2;stroke-linecap:round}
[data-part="boom"],[data-part="spark"]{opacity:0;mix-blend-mode:screen;pointer-events:none}
[data-part="charge"]{pointer-events:none}
[data-part="kart"]{cursor:pointer}
[data-id="glass"] .lb path:not(.lb-edge):not(.lb-crease){fill-opacity:.12}
[data-id="glass"] .lb .lb-edge{stroke-opacity:.7}
`;

const html = l.lessonHtml({
  title: "¿Cómo funciona el motor de un coche?",
  svg,
  steps: STEPS,
  projection: P,
  buttons: [
    { action: "run", label: "🔑 Apagar el motor" },
    { action: "fast", label: "🦶 ¡Acelerar!" },
  ],
  keys: "A acelerar · M motor · también puedes pulsar el kart",
  script,
  css: CSS,
});
mkdirSync(HERE, { recursive: true });
writeFileSync(join(HERE, "motor.html"), html);
console.log("wrote motor.html", `${(html.length / 1024).toFixed(0)} KB`, `${pieces.length + back.length + front.length + engine.length} pieces`);
