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
const { STUD, PLATE } = b;

const WIDTH = 1000;
const HEIGHT = 620;

// The airport on the LEGO grid: a runway along x, grass behind and in front, earth below.
const LONG = 48;
const TOWER_X = 40;
const SOCK_X = 45.5;
const DEEP = 22;
const EARTH = 6;
const RUNWAY = { x: 0, y: 6, w: LONG, d: 12 };
const RUNWAY_TOP = 2 * PLATE;
const GRASS_TOP = PLATE;

// The plane, in millimetres, parked with its tail near the start of the runway, flying towards +x.
const FY = 12 * STUD;
const FZ = 30;
const TAIL = 24;
const NOSE = 132;
const PROP_X = 141;
const WING = { te: 62, le: 90.5, y0: 4.5 * STUD, y1: 19.5 * STUD };
const MAIN_X = 76;
const MAIN_Y = [7.5 * STUD, 16.5 * STUD];
const MAIN_R = 5.6;
const NOSE_GEAR_X = 118;
const NOSE_R = 4.5;
const WINDOWS = [44, 54, 64, 74, 84, 94];

// The model's numbers. A plane of mass m (1 when empty, +0.12 per passenger) accelerates at
// THRUST / m; lift grows with speed squared and wins over weight at v = V0·√m. So the runway it
// needs grows with m²: empty 80 mm, three passengers 148 mm, six 237 mm, more than the 190 mm the
// runway gives before it has to brake (it stops by 220 mm, with the nose still on the runway).
const THRUST = 15.6;
const V0 = 50;
const PER_PASSENGER = 0.12;
const DECIDE = 190;
const BRAKE = 60;

const pieces = [];
const plane = [];
const add = (step, piece) => pieces.push({ step, ...piece });
const addPlane = (step, piece) => plane.push({ step, ...piece });

// Step 0: the airport. Earth, grass, the runway with its markings and lights, the control tower,
// a windsock, a few flowers.
for (let row = 0; row < 2; row++) {
  const shift = row ? 2 : 0;
  for (let x = -shift; x < LONG; x += 4) {
    const from = Math.max(0, x);
    const to = Math.min(LONG, x + 4);
    add(0, b.brick({ x: from, y: 0, z: -EARTH + row * 3, w: to - from, d: DEEP, h: 3, color: row ? "brown" : "dark-tan", studs: false }));
  }
}
for (let x = 0; x < LONG; x += 16) {
  add(0, b.plate({ x, y: 0, w: 16, d: RUNWAY.y, color: "bright-green" }));
  add(0, b.plate({ x, y: RUNWAY.y + RUNWAY.d, w: 16, d: DEEP - RUNWAY.y - RUNWAY.d, color: "bright-green" }));
}
for (let x = 0; x < LONG; x += 16) add(0, b.tile({ x, y: RUNWAY.y, w: 16, d: RUNWAY.d, h: 2, color: "dark-gray" }));
const paint = (x0, x1, y0, y1) => b.custom({ faces: b.boxFaces(x0, y0, RUNWAY_TOP, x1, y1, RUNWAY_TOP + 0.3), color: "white" });
for (let x = 22; x < LONG - 2; x += 5) add(0, paint(x * STUD, (x + 2.5) * STUD, 11.8 * STUD, 12.2 * STUD));
for (let y = 7; y < 17; y += 1.6) add(0, paint(0.6 * STUD, 2.2 * STUD, y * STUD, (y + 0.8) * STUD));
for (let x = 4; x < LONG; x += 8) {
  add(0, b.round({ x, y: 5, z: 1, w: 1, h: 1, color: "trans-yellow", trans: true }));
  add(0, b.round({ x, y: 18, z: 1, w: 1, h: 1, color: "trans-yellow", trans: true }));
}
{
  // Control tower: a column, a glass cab, a roof with a dome, and an antenna with a red light.
  for (let level = 0; level < 6; level++) add(0, b.round({ x: TOWER_X, y: 1, z: 1 + level * 3, w: 2, h: 3, color: "light-gray", studs: false }));
  add(0, b.round({ x: TOWER_X - 1, y: 0, z: 19, w: 4, h: 3, color: "#7fc8e8", trans: true, studs: false }));
  add(0, b.round({ x: TOWER_X - 1, y: 0, z: 22, w: 4, h: 1, color: "dark-gray", studs: false }));
  add(0, r.dome({ x: TOWER_X, y: 1, z: 23, w: 2, color: "white" }));
  const top = 23 * PLATE + PLATE + 2 * STUD / 2 - b.GAP;
  add(0, b.pipe({ axis: "z", from: top - 0.5, to: top + 14, at: [(TOWER_X + 1) * STUD, 2 * STUD], r: 0.6, color: "dark-gray" }));
  add(0, r.ball({ at: [(TOWER_X + 1) * STUD, 2 * STUD, top + 16], r: 2, color: "red" }));
}
{
  // Windsock: a pole with an orange and white cone streaming along +x.
  const [wx, wy] = [(SOCK_X + 0.5) * STUD, 3.5 * STUD];
  add(0, b.round({ x: SOCK_X, y: 3, z: 1, w: 1, h: 1, color: "dark-gray" }));
  add(0, b.pipe({ axis: "z", from: 2 * PLATE, to: 52, at: [wx, wy], r: 0.8, color: "light-gray" }));
  add(0, r.turned({ profile: [[0, 0], [0, 4.4], [8, 3.6], [8, 0]], at: [wx + 0.8, wy, 48], axis: "x", color: "orange", steps: 20, kind: "sock" }));
  add(0, r.turned({ profile: [[0, 0], [0, 3.6], [7, 2.9], [7, 0]], at: [wx + 8.8, wy, 48], axis: "x", color: "white", steps: 20, kind: "sock", overlaps: true }));
  add(0, r.turned({ profile: [[0, 0], [0, 2.9], [7, 2.2], [7, 0]], at: [wx + 15.8, wy, 48], axis: "x", color: "orange", steps: 20, kind: "sock", overlaps: true }));
}
[[3, 2, "red"], [9, 4, "yellow"], [26, 1, "red"], [33, 3, "yellow"], [36, 4, "red"], [12, 20, "yellow"], [29, 19, "red"], [44, 20, "yellow"], [21, 21, "red"]].forEach(([x, y, color]) => add(0, b.round({ x, y, z: 1, w: 1, h: 1, color })));

// Step 1: the plane. A white fuselage turned along x, red wings with a real wing section, a tail,
// a windscreen, and three wheels on struts.
addPlane(1, r.turned({ profile: [[0, 0], [0, 2.5], [20, 5.5], [34, 8], [96, 8], [102, 7.6], [106, 7], [108, 0]], at: [TAIL, FY, FZ], axis: "x", color: "white", steps: 28, kind: "fuselage" }));
addPlane(1, r.turned({ profile: [[0, 0], [0, 6.4], [5, 4.6], [8, 2], [9, 0]], at: [NOSE, FY, FZ], axis: "x", color: "red", steps: 24, kind: "spinner" }));
const section = [[WING.te, 27.6], [72, 27.8], [82, 28.2], [88, 28.6], [WING.le, 29.3], [88, 30.8], [82, 31.8], [72, 31.2], [WING.te, 28.2]];
addPlane(1, b.custom({ faces: b.extrudeFaces(section, "y", WING.y0, FY - 8), color: "red", kind: "wing" }));
addPlane(1, b.custom({ faces: b.extrudeFaces(section, "y", FY + 8, WING.y1), color: "red", kind: "wing" }));
addPlane(1, b.custom({ faces: b.boxFaces(TAIL + 2, FY - 30, 31, TAIL + 18, FY + 30, 32.6), color: "red", kind: "stabiliser", overlaps: true }));
addPlane(1, b.custom({ faces: b.extrudeFaces([[TAIL + 2, 33], [TAIL + 22, 33], [TAIL + 10, 52], [TAIL + 2, 52]], "y", FY - 1, FY + 1), color: "red", kind: "fin", overlaps: true }));
addPlane(1, b.custom({ faces: b.extrudeFaces([[104, 36], [116, 36], [108, 41.5], [104, 41.5]], "y", FY - 5.5, FY + 5.5), color: "#7fc8e8", trans: true, kind: "windscreen", overlaps: true }));
MAIN_Y.forEach((y) => {
  addPlane(1, r.wheel({ at: [MAIN_X, y, RUNWAY_TOP + MAIN_R], axis: "y", r: MAIN_R, width: 4 }));
  addPlane(1, b.pipe({ axis: "z", from: RUNWAY_TOP + MAIN_R, to: 28.2, at: [MAIN_X, y + (y < FY ? 2.6 : -2.6)], r: 1.1, color: "light-gray" }));
});
addPlane(1, r.wheel({ at: [NOSE_GEAR_X, FY, RUNWAY_TOP + NOSE_R], axis: "y", r: NOSE_R, width: 3.4 }));
addPlane(1, b.pipe({ axis: "z", from: RUNWAY_TOP + NOSE_R, to: FZ - 6, at: [NOSE_GEAR_X, FY - 2.4], r: 1, color: "light-gray" }));

// Step 2: the fuel truck behind the wing, and its hose to the filler on top of the wing.
{
  const wheelR = 4.8;
  add(2, b.plate({ x: 5, y: 1, z: 3, w: 8, d: 2, color: "dark-gray" }));
  [7, 11.5].forEach((x) => {
    add(2, b.pipe({ axis: "y", from: 0.3 * STUD, to: 3.7 * STUD, at: [x * STUD, GRASS_TOP + wheelR], r: 1.6, color: "dark-gray" }));
    [0.6, 3.4].forEach((y) => add(2, r.wheel({ at: [x * STUD, y * STUD, GRASS_TOP + wheelR], axis: "y", r: wheelR, width: 3.6 })));
  });
  add(2, b.brick({ x: 11, y: 1, z: 4, w: 2, d: 2, h: 6, color: "yellow", studs: false }));
  add(2, b.custom({ faces: b.boxFaces(12.6 * STUD, 1.3 * STUD, 7 * PLATE, 13 * STUD - b.GAP + 0.6, 2.7 * STUD, 9.2 * PLATE), color: "#7fc8e8", trans: true, overlaps: true }));
  add(2, r.turned({ profile: [[0, 0], [0, 5], [2, 7], [36, 7], [38, 5], [38, 0]], at: [5.4 * STUD, 2 * STUD, 4 * PLATE + 7], axis: "x", color: "light-gray", kind: "tank" }));
}
const hosePath = t.curve([[5.8 * STUD, 2 * STUD, 4 * PLATE + 13.6], [6.4 * STUD, 3 * STUD, 44], [8.4 * STUD, 4.6 * STUD, 46], [76, 6 * STUD, 37.6]]);
t.hose({ points: hosePath, r: 1.8, color: "black", ribbed: true, pitch: 2.6, step: 2, until: 2 }).forEach((piece) => plane.push(piece));
addPlane(2, b.custom({ faces: b.cylinderFaces(76, 6 * STUD, 2.4, 31.4, 35.6, 12), color: "dark-gray", kind: "filler", overlaps: true }));

auditOrExit([...pieces, ...plane]);

// The plane rolls along x over the runway: what stands in front of its wingtips is drawn after it.
const lane = b.splitByLane(pieces, WING.y0, WING.y1);

const P = k.fitProjection(
  [...k.boxCorners({ x: 0, y: 0, w: LONG * STUD, d: DEEP * STUD, r: 0 }, -EARTH * PLATE, 0), [LONG * STUD - 40, FY, 130], [0, 0, 100]],
  WIDTH,
  HEIGHT,
  { pad: 24, azimuth: 55 },
);
const at = (point) => k.iso(point, P);

// The air, in the plane's own frame (it moves with the plane). Over and under the front wing it
// bends down behind the trailing edge; behind the propeller it streams back along the fuselage.
const wingAir = [136].flatMap((y) => [
  [[118, y, 35.5], [96, y, 34.5], [84, y, 35.6], [72, y, 35], [62, y, 32], [46, y, 26.5], [30, y, 22]],
  [[118, y, 24.8], [94, y, 25.4], [80, y, 25], [64, y, 23.6], [48, y, 19.5], [32, y, 15.5]],
]);
const propAir = [FY - 12].map((y) => [[PROP_X - 1, y, FZ + 2], [100, y, FZ + 3], [40, y, FZ + 2], [0, y, FZ]]);

// Passengers: a row of windows on the near side of the fuselage, each with a head that can show.
const { k: scale } = k.cameraOf(P);
const windowsSvg = WINDOWS.map((x, i) => {
  const [wx, wy] = at([x, FY + Math.sqrt(64 - 9), FZ + 3]);
  return `<g data-seat="${i}"><circle class="lb-window" cx="${wx.toFixed(1)}" cy="${wy.toFixed(1)}" r="${(2.1 * scale).toFixed(1)}"/><circle class="lb-head" cx="${wx.toFixed(1)}" cy="${(wy + 0.25 * scale).toFixed(1)}" r="${(1.45 * scale).toFixed(1)}"/></g>`;
}).join("");

const body = [
  `<defs>${l.tokenDef("air", P, { color: "#ffffff", r: 1.7, h: 1.2 })}${l.tokenDef("fuel", P, { color: "#ff9a1f", r: 1.2, h: 1 })}</defs>`,
  `<g class="lb-scene">${b.sceneSvg(lane.behind, P)}</g>`,
  `<g data-part="plane" data-id="plane">
    ${b.sceneSvg(plane, P)}
    <g class="lb-piece" data-step="1" style="--i:12">${windowsSvg}<g data-part="prop"><path/><path/></g></g>
    <g data-part="plane-tokens" class="lb-air"></g>
  </g>`,
  `<g class="lb-scene">${b.sceneSvg(lane.ahead, P)}</g>`,
  `<g data-part="tokens"></g>`,
];

const svg = l.lessonSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    "Un aeropuerto de LEGO con una pista, una torre de control y una manga de viento. En la pista hay una avioneta blanca y roja con hélice; un camión le echa combustible con una manguera. Cuando corre por la pista, el aire pasa por sus alas y el avión despega.",
  body,
});

const STEPS = [
  {
    say: "¡Vamos a construir un aeropuerto de LEGO y a descubrir por qué un avión puede volar!",
    ask: "¿Has visto alguna vez un avión despegar? ¿Hacía mucho ruido?",
    note: "La idea es que vea lo invisible: el aire. Lo dibujamos como piezas blancas para que pueda seguirlo con el dedo.",
  },
  {
    say: "Este es nuestro avión. Pesa muchísimo… entonces, ¿cómo puede subir hasta el cielo?",
    ask: "¿Dónde están las alas? ¿Y cuántas ruedas tiene?",
    note: "Sobre un avión actúan cuatro fuerzas: el peso tira hacia abajo, la sustentación de las alas empuja hacia arriba, el motor empuja hacia delante y el aire frena hacia atrás.",
  },
  {
    say: "Antes de volar, un camión le da combustible por una manguera. Es la comida del motor.",
    ask: "¿Por dónde entra el combustible? ¡Sigue las piezas naranjas!",
    note: "En las avionetas el depósito suele ir dentro de las alas, como aquí. Las de hélice gastan gasolina de aviación; los aviones grandes de reacción, queroseno.",
  },
  {
    say: "¡Arrancamos el motor! La hélice gira muy rápido y empuja el aire hacia atrás… y el aire empuja al avión hacia delante.",
    ask: "¿Hacia dónde van las piezas blancas que salen de la hélice?",
    note: "Es la tercera ley de Newton: la hélice lanza aire hacia atrás y el aire empuja la hélice hacia delante. Ahora tiene los frenos puestos, por eso no se mueve.",
  },
  {
    say: "Cuando el avión corre muy rápido, el aire pasa por encima y por debajo del ala. El ala empuja el aire hacia abajo… ¡y el aire empuja el ala hacia arriba!",
    ask: "¿Ves cómo las piezas blancas bajan detrás del ala? ¡Mira cómo despega!",
    note: "El ala va un poco inclinada y curvada, y desvía mucho aire hacia abajo; por eso arriba la presión baja y abajo sube. Ojo con una explicación muy repetida pero falsa: que el aire de arriba «tiene que llegar a la vez» que el de abajo. No es así. Cuanto más rápido corre el avión, más empuja el ala: la sustentación crece con el cuadrado de la velocidad.",
  },
  {
    say: "Ahora subimos seis pasajeros. Con tanto peso, el avión tiene que correr mucho más para despegar… ¡y la pista se acaba!",
    ask: "¿Ha podido despegar? ¿Por qué crees que no?",
    note: "Cuanto más pesa un avión, más rápido tiene que ir para que las alas lo levanten, y más pista necesita. Los aviones de verdad tienen un peso máximo y los pilotos calculan la pista que les hace falta antes de cada despegue. Nuestra pista es cortita a propósito.",
  },
  {
    say: "¡Ahora te toca a ti! Elige cuántos pasajeros suben y dale a volar.",
    ask: "¿Con cuántos pasajeros consigue despegar?",
    note: "Hemos simplificado: un avión real también gira el morro hacia arriba al despegar (rotación), usa flaps para tener más sustentación a poca velocidad y recoge las ruedas.",
  },
].map((step) => ({ ...step, night: null }));

const script = `
const P = ${JSON.stringify(P)};
const PROP = ${JSON.stringify([PROP_X, FY, FZ])};
const THRUST = ${THRUST}, V0 = ${V0}, PER = ${PER_PASSENGER}, DECIDE = ${DECIDE}, BRAKE = ${BRAKE};
const svg = document.querySelector(".lb-lesson svg");
const planeNode = svg.querySelector('[data-part="plane"]');
const prop = [...svg.querySelectorAll('[data-part="prop"] path')];
const seats = [...svg.querySelectorAll("[data-seat]")];
const airLayer = svg.querySelector('[data-part="plane-tokens"]');
const wing = ${JSON.stringify(wingAir)}.map((pts) => lesson.route(pts, { token: "#air", gap: 7, speed: 0, layer: airLayer }));
const wash = ${JSON.stringify(propAir)}.map((pts) => lesson.route(pts, { token: "#air", gap: 10, speed: 0, layer: airLayer }));
const fuel = lesson.route(${JSON.stringify(t.resample(hosePath, 2))}, { token: "#fuel", gap: 6, speed: 22, layer: airLayer });
const state = { phase: "parked", passengers: 0, x: 0, z: 0, v: 0, vz: 0, spin: 0, angle: 0, timer: 0, fade: 1, engine: false };
const mass = () => 1 + PER * state.passengers;
const takeoffSpeed = () => V0 * Math.sqrt(mass());

function park() {
  Object.assign(state, { phase: "parked", x: 0, z: 0, v: 0, vz: 0, timer: 0 });
}
function go() {
  if (lesson.step < 4 || state.phase !== "parked") return;
  state.engine = true;
  state.phase = "rolling";
}
function board() {
  if (state.phase !== "parked" || lesson.step < 5) return;
  state.passengers = (state.passengers + 3) % 9;
}
lesson.onStep((step) => {
  park();
  state.engine = step >= 3;
  state.passengers = step === 5 ? 6 : step === 6 ? 3 : 0;
  if (step === 4 || step === 5) state.phase = "rolling";
});
const goButton = lesson.button("go", go, () => (state.phase === "parked" ? "🛫 ¡A volar!" : "✈️ …"));
const boardButton = lesson.button("board", board, () => "👥 Pasajeros: " + state.passengers);
lesson.click('[data-id="plane"]', go);
lesson.key("a", go);
lesson.key("p", board);

function propPaths(angle) {
  return [0, 1].map((i) => {
    const a = angle + i * Math.PI;
    const pt = (along, across) => [PROP[0], PROP[1] + Math.cos(a) * along - Math.sin(a) * across, PROP[2] + Math.sin(a) * along + Math.cos(a) * across];
    return pathOf([pt(1.5, -1.6), pt(15, -1.4), pt(16.5, 0), pt(15, 1.2), pt(1.5, 1.6)].map((p) => iso(p, P)), true);
  });
}

lesson.every((dt) => {
  const s = lesson.step;
  state.spin = lesson.ease(state.spin, state.engine ? 1 : 0, dt, 0.6);
  if (state.spin < 0.002) state.spin = 0;
  state.angle += state.spin * dt * 30;
  const m = mass();
  if (state.phase === "rolling") {
    state.v += (THRUST / m) * dt;
    state.x += state.v * dt;
    if (state.v >= takeoffSpeed()) state.phase = "climbing";
    else if (state.x >= DECIDE) state.phase = "braking";
  } else if (state.phase === "climbing") {
    state.v = Math.min(state.v + (THRUST / m) * dt, 130);
    const surplus = (state.v * state.v) / (takeoffSpeed() * takeoffSpeed()) - 1;
    state.vz = Math.min(45, state.vz + surplus * 160 * dt);
    state.x += state.v * dt;
    state.z += state.vz * dt;
    if (state.x > 420) { state.phase = "gone"; state.timer = 0; }
  } else if (state.phase === "braking") {
    state.v = Math.max(0, state.v - BRAKE * dt);
    state.x += state.v * dt;
    if (state.v === 0) { state.phase = "stopped"; state.timer = 0; }
  } else if (state.phase === "stopped" || state.phase === "gone") {
    state.timer += dt;
    if (state.timer > 2.4) { park(); state.fade = 0; }
  }
  state.fade = Math.min(1, state.fade + dt * 1.5);
  planeNode.setAttribute("transform", translateAlong(P, [state.x, 0, state.z]));
  planeNode.style.opacity = state.phase === "gone" ? "0" : state.fade.toFixed(2);
  const paths = propPaths(state.angle);
  prop.forEach((path, i) => path.setAttribute("d", paths[i]));
  seats.forEach((seat, i) => seat.toggleAttribute("data-on", i < state.passengers));
  const air = Math.min(1, state.v / V0);
  wing.forEach((route) => { route.level = s >= 4 ? air : 0; route.speed = 40 + state.v * 1.2; });
  wash.forEach((route) => { route.level = state.spin * (s === 3 ? 1 : 0.45); route.speed = 90 + state.v; });
  fuel.level = s === 2 ? 1 : 0;
  goButton.disabled = s < 4 || state.phase !== "parked";
  boardButton.disabled = s < 5 || state.phase !== "parked";
  return state.spin > 0 || state.phase !== "parked" || state.fade < 1 || s === 2;
});

lesson.readout(() => {
  const s = lesson.step;
  if (s < 1) return "";
  const where = { parked: "🛬 en la pista", rolling: "💨 corriendo por la pista", climbing: "✈️ ¡volando!", braking: "🛑 ¡no le da la pista! frenando", stopped: "😅 pesa demasiado", gone: "✈️ ¡se ha ido volando!" }[state.phase];
  return [where, s >= 5 ? "👥 " + state.passengers + " pasajeros" : "", s >= 3 && state.engine ? "🌀 motor en marcha" : ""].filter(Boolean).join("  ·  ");
});
`;

const CSS = `
.lb-window{fill:#2b4a6b;stroke:#1b2d40;stroke-width:.5}
.lb-head{fill:#f6d01e;opacity:0;transition:opacity .3s}
[data-seat][data-on] .lb-head{opacity:1}
[data-part="prop"] path{fill:#3a3d42;stroke:#1b1d20;stroke-width:.6}
[data-id="plane"]{cursor:pointer}
.lb-air{pointer-events:none;filter:drop-shadow(0 0 1.5px #9fb6c8)}
`;

const html = l.lessonHtml({
  title: "¿Por qué vuela un avión?",
  svg,
  steps: STEPS,
  projection: P,
  buttons: [
    { action: "board", label: "👥 Pasajeros: 0" },
    { action: "go", label: "🛫 ¡A volar!" },
  ],
  keys: "A volar · P pasajeros · también puedes pulsar el avión",
  script,
  css: CSS,
});
mkdirSync(HERE, { recursive: true });
writeFileSync(join(HERE, "avion.html"), html);
console.log("wrote avion.html", `${(html.length / 1024).toFixed(0)} KB`, `${pieces.length + plane.length} pieces`);
