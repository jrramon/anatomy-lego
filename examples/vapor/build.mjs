import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../kit/iso-kit.mjs";
import * as b from "../../kit/brick.mjs";
import * as r from "../../kit/lego-round.mjs";
import * as t from "../../kit/lego-tube.mjs";
import * as s from "../../kit/lego-spin.mjs";
import * as fx from "../../kit/lego-fx.mjs";
import * as fig from "../../kit/lego-figure.mjs";
import * as l from "../../kit/lesson.mjs";
import { auditOrExit } from "../../kit/lego-audit.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const { STUD, PLATE } = b;

const WIDTH = 1000;
const HEIGHT = 600;

// A steam power station on the LEGO grid, 56 studs by 20. Left to right: the fire under the boiler,
// the turbine, the generator on the same shaft, a cable to a house. Behind, the cooling tower turns
// the spent steam back to water, which a pump at the front returns to the boiler.
const LONG = 56;
const DEEP = 20;
const SLAB = 2 * PLATE;
const AXIS_Y = 12 * STUD;
const AXIS_Z = 50.8;
const BOILER = { x0: 30, x1: 98, r: 22, z: 14 * PLATE + 22 };
const FIRE = [64, AXIS_Y];
const TURBINE = { x: 176, x0: 168, x1: 184, r: 22, rotor: 17 };
const GEN = { x: 240, x0: 216, x1: 264, r: 22 };
const TOWER = [40 * STUD, 5 * STUD];
const PIPE_R = 2.6;
const STEAM_Z = 100;
const HOUSE = { x: 44, y: 9, w: 8, d: 6 };
const POLE = [37.5 * STUD, 14 * STUD];
const POLE_TOP = 25 * PLATE;
const LOW = 12;

const pieces = [];
const add = (step, piece) => pieces.push({ step, ...piece });
const pipe = (step, axis, from, to, at, color = "light-gray", r = PIPE_R) => add(step, b.pipe({ axis, from, to, at, r, color }));

// Step 0: the ground, a concrete yard and a worker in a hard hat.
for (let x = 0; x < LONG; x += 14) for (let y = 0; y < DEEP; y += 10) add(0, b.plate({ x, y, w: 14, d: 10, color: "bright-green" }));
add(0, b.tile({ x: 2, y: 8, z: 1, w: 34, d: 11, color: "light-gray" }));
add(0, b.tile({ x: 36, y: 1, z: 1, w: 8, d: 8, color: "light-gray" }));
[[1, 2, "red"], [6, 3, "yellow"], [12, 1, "red"], [24, 3, "yellow"], [30, 2, "red"], [48, 3, "yellow"], [54, 6, "red"], [40, 18, "yellow"], [52, 18, "red"]].forEach(([x, y, color]) =>
  add(0, b.round({ x, y, z: 1, w: 1, h: 1, color })),
);
add(0, fig.minifig({ x: 27, y: 18.8, z: 2, torso: "orange", legs: "dark-gray", hat: "yellow" }));

// Step 1: the fire. A grate with logs, a back wall to shelter it; the flame is drawn live.
add(1, b.plate({ x: 5, y: 10, z: 2, w: 6, d: 4, color: "dark-gray", studs: false }));
add(1, b.brick({ x: 5, y: 9, z: 2, w: 6, d: 1, h: 6, color: "dark-gray", studs: false }));
[AXIS_Y - 4, AXIS_Y + 4].forEach((y) => add(1, r.turned({ profile: [[0, 0], [0, 2.4], [36, 2.4], [36, 0]], at: [46, y, 3 * PLATE + 2.2], axis: "x", color: "brown", steps: 14, kind: "log", overlaps: true })));

// Step 2: the boiler on two cradles over the fire, with a whistle valve on top.
[4, 11].forEach((x) => add(2, b.brick({ x, y: 10, z: 2, w: 1, d: 4, h: 12, color: "dark-gray", studs: false })));
add(2, r.turned({ profile: [[0, 0], [0, 18], [3, BOILER.r], [BOILER.x1 - BOILER.x0 - 3, BOILER.r], [BOILER.x1 - BOILER.x0, 18], [BOILER.x1 - BOILER.x0, 0]], at: [BOILER.x0, AXIS_Y, BOILER.z], axis: "x", color: "red", steps: 28, kind: "boiler" }));
pipe(2, "z", BOILER.z + BOILER.r - 1, BOILER.z + BOILER.r + 7, [44, AXIS_Y], "dark-gray", 1.6);
add(2, b.custom({ faces: b.cylinderFaces(44, AXIS_Y, 2.6, BOILER.z + BOILER.r + 7, BOILER.z + BOILER.r + 9.4, 14), color: "yellow", kind: "whistle", overlaps: true }));

// Step 3: the steam main from the top of the boiler to the turbine, and the turbine's stand.
pipe(3, "z", BOILER.z + BOILER.r - 2, STEAM_Z, [88, AXIS_Y]);
pipe(3, "x", 88, TURBINE.x, [AXIS_Y, STEAM_Z]);
pipe(3, "z", AXIS_Z + TURBINE.r - 2, STEAM_Z, [TURBINE.x, AXIS_Y]);
add(3, b.brick({ x: 21, y: 11, z: 2, w: 2, d: 2, h: 7, color: "dark-gray", studs: false }));

// Step 4: the shaft on a bearing, and the generator's plinth.
pipe(4, "x", TURBINE.x1, GEN.x0, [AXIS_Y, AXIS_Z], "dark-gray", 2.9);
add(4, b.brick({ x: 24, y: 11, z: 2, w: 2, d: 2, h: 13, color: "dark-gray", studs: false }));
add(4, b.brick({ x: 27, y: 11, z: 2, w: 6, d: 2, h: 7, color: "dark-gray", studs: false }));

// Step 5: a pole and a house with windows that light up.
for (let level = 0; level < 8; level++) add(5, b.round({ x: POLE[0] / STUD - 0.5, y: POLE[1] / STUD - 0.5, z: 1 + level * 3, w: 1, h: 3, color: "brown", studs: false, steps: 14 }));
for (let course = 0; course < 3; course++) add(5, b.brick({ ...HOUSE, z: 1 + course * 3, h: 3, color: "white", studs: false }));
const roofZ = 10 * PLATE;
add(5, b.custom({ faces: b.extrudeFaces([[(HOUSE.y - 0.5) * STUD, roofZ], [(HOUSE.y + HOUSE.d + 0.5) * STUD, roofZ], [(HOUSE.y + HOUSE.d / 2) * STUD, roofZ + 24]], "x", (HOUSE.x - 0.4) * STUD, (HOUSE.x + HOUSE.w + 0.4) * STUD), color: "red", kind: "roof" }));
const WALL = (HOUSE.y + HOUSE.d) * STUD;
const WINDOWS = [[45.2, 47.2], [48.8, 50.8]].map(([x0, x1]) => [x0 * STUD, x1 * STUD, 4 * PLATE, 8 * PLATE]);
WINDOWS.forEach(([x0, x1, z0, z1]) => add(5, b.custom({ faces: b.boxFaces(x0, WALL - 0.1, z0, x1, WALL + 0.6, z1), color: "#2b4a6b", kind: "window" })));
add(5, b.custom({ faces: b.boxFaces(47.4 * STUD, WALL - 0.1, PLATE, 48.6 * STUD, WALL + 0.6, 7 * PLATE), color: "blue", kind: "door" }));

// Step 6: the way back. Spent steam to the cooling tower, water down to the pump and back to the boiler.
pipe(6, "y", TOWER[1] + 4, AXIS_Y - TURBINE.r + 2, [TURBINE.x, AXIS_Z]);
pipe(6, "x", TURBINE.x, TOWER[0] - 20, [TOWER[1] + 4, AXIS_Z]);
add(6, b.round({ x: 36, y: 1, z: 2, w: 8, h: 1, color: "dark-gray", studs: false, steps: 32 }));
add(6, r.turned({
  profile: [[0, 0], [0, 30], [12, 27], [24, 24.4], [36, 22.4], [48, 21.4], [60, 22], [72, 24], [72, 21.4], [64, 0]],
  at: [TOWER[0], TOWER[1], 3 * PLATE],
  axis: "z",
  color: "#cfd2cc",
  steps: 32,
  kind: "tower",
  overlaps: true,
}));
pipe(6, "y", TOWER[1] + 28, 17 * STUD, [TOWER[0], LOW], "blue");
pipe(6, "x", 16 * STUD, TOWER[0], [17 * STUD, LOW], "blue");
add(6, b.brick({ x: 14, y: 16, z: 2, w: 2, d: 2, h: 6, color: "blue", studs: false, id: "pump" }));
add(6, b.round({ x: 14, y: 16, z: 8, w: 2, h: 3, color: "dark-gray", id: "pump" }));
pipe(6, "x", 20, 14 * STUD, [17 * STUD, LOW], "blue");
pipe(6, "y", AXIS_Y, 17 * STUD, [20, LOW], "blue");
pipe(6, "z", LOW, BOILER.z, [20, AXIS_Y], "blue");
pipe(6, "x", 20, BOILER.x0 + 2, [AXIS_Y, BOILER.z], "blue");

auditOrExit(pieces);

const P = k.fitProjection(
  [...k.boxCorners({ x: 0, y: 0, w: LONG * STUD, d: DEEP * STUD, r: 0 }, 0, PLATE), [TOWER[0], TOWER[1], 140], [88, AXIS_Y, STEAM_Z + 6]],
  WIDTH,
  HEIGHT,
  { pad: 28, azimuth: 55 },
);
const at = (point) => k.iso(point, P);

// The turbine rotor: a hub with eight blades, one of them red so the turning shows.
const rotorBlade = (i) => {
  const a = (i / 8) * Math.PI * 2;
  const [cy, cz] = [Math.cos(a), Math.sin(a)];
  const [ty, tz] = [-Math.sin(a), Math.cos(a)];
  const corner = (x, rad, tan) => [x, AXIS_Y + cy * rad + ty * tan, AXIS_Z + cz * rad + tz * tan];
  const q = (x) => [corner(x, 5, -1.3), corner(x, TURBINE.rotor, -1.3), corner(x, TURBINE.rotor, 1.3), corner(x, 5, 1.3)];
  const [p, n] = [q(TURBINE.x0 + 3), q(TURBINE.x1 - 3)];
  return { color: i === 0 ? "red" : "light-gray", faces: s.withNormals([p, [...n].reverse(), ...p.map((_, j) => [p[j], p[(j + 1) % 4], n[(j + 1) % 4], n[j]])]) };
};
const rotor = [{ color: "dark-gray", faces: r.revolveFaces([[0, 0], [0, 5.4], [TURBINE.x1 - TURBINE.x0 - 4, 5.4], [TURBINE.x1 - TURBINE.x0 - 4, 0]], { at: [TURBINE.x0 + 2, AXIS_Y, AXIS_Z], axis: "x", steps: 16 }) }, ...Array.from({ length: 8 }, (_, i) => rotorBlade(i))];

// The generator's rotor: a bar magnet, red north half and blue south half, between two copper coils.
const magnetHalf = (sign, color) => ({ color, faces: s.withNormals(b.boxFaces(GEN.x - 12, AXIS_Y - 6, sign > 0 ? AXIS_Z : AXIS_Z - 13, GEN.x + 12, AXIS_Y + 6, sign > 0 ? AXIS_Z + 13 : AXIS_Z)) });
const magnet = [magnetHalf(1, "red"), magnetHalf(-1, "blue")];
const coil = (x0) => r.meshSvg(r.revolveFaces([[0, 9], [0, 18], [5, 18], [5, 9], [0, 9]], { at: [x0, AXIS_Y, AXIS_Z], axis: "x", steps: 28 }), "orange", P);
const glass = (x0, x1, radius) => `<g data-id="glass">${r.meshSvg(r.revolveFaces([[0, 0], [0, radius], [x1 - x0, radius], [x1 - x0, 0]], { at: [x0, AXIS_Y, AXIS_Z], axis: "x", steps: 32 }), "#cfeefa", P, { trans: true })}</g>`;

// The cable from the top of the generator to the pole and on to the house.
const cablePath = [...t.curve([[GEN.x, AXIS_Y, AXIS_Z + GEN.r], [GEN.x + 4, AXIS_Y, POLE_TOP + 4], [POLE[0], POLE[1], POLE_TOP]], { samples: 6 }), ...t.sag([POLE[0], POLE[1], POLE_TOP], [HOUSE.x * STUD, AXIS_Y + 6, 7 * PLATE], 10).slice(1)];

// The windows' glow: their faces in warm yellow, faded in with the power.
const windowGlow = WINDOWS.map(([x0, x1, z0, z1]) => `<path d="${k.pathOf([[x0, WALL + 0.7, z0], [x1, WALL + 0.7, z0], [x1, WALL + 0.7, z1], [x0, WALL + 0.7, z1]].map(at), true)}"/>`).join("");

const routes = {
  steam: [[88, AXIS_Y, BOILER.z + BOILER.r - 2], [88, AXIS_Y, STEAM_Z], [TURBINE.x, AXIS_Y, STEAM_Z], [TURBINE.x, AXIS_Y, AXIS_Z + TURBINE.r - 2]],
  spent: [[TURBINE.x, AXIS_Y - TURBINE.r + 2, AXIS_Z], [TURBINE.x, TOWER[1] + 4, AXIS_Z], [TOWER[0] - 20, TOWER[1] + 4, AXIS_Z]],
  water: [[TOWER[0], TOWER[1] + 28, LOW], [TOWER[0], 17 * STUD, LOW], [20, 17 * STUD, LOW], [20, AXIS_Y, LOW], [20, AXIS_Y, BOILER.z], [BOILER.x0 + 2, AXIS_Y, BOILER.z]],
  power: t.resample(cablePath, 2),
};

const body = [
  `<defs>${l.tokenDef("steam", P, { color: "#ffffff", r: 1.8, h: 1 })}${l.tokenDef("water", P, { color: "#4fc3ff", r: 1.8, h: 1 })}${l.tokenDef("power", P, { color: "#ffd83a", r: 1.4, h: 1 })}
    <radialGradient id="fire-glow"><stop offset="0" stop-color="#fff0a0" stop-opacity=".95"/><stop offset=".5" stop-color="#ff8a1f" stop-opacity=".7"/><stop offset="1" stop-color="#ff4a00" stop-opacity="0"/></radialGradient></defs>`,
  `<g class="lb-scene">${b.sceneSvg(pieces, P)}</g>`,
  (() => {
    const [fxp, fyp] = at([FIRE[0], FIRE[1], 18]);
    const { k: scale } = k.cameraOf(P);
    return `<g class="lb-piece" data-step="1" style="--i:3"><ellipse data-part="fire-glow" cx="${fxp.toFixed(1)}" cy="${fyp.toFixed(1)}" rx="${(20 * scale).toFixed(1)}" ry="${(14 * scale).toFixed(1)}" fill="url(#fire-glow)"/></g>`;
  })(),
  `<g class="lb-piece" data-step="3" style="--i:4">${s.spinSvg("rotor")}${glass(TURBINE.x0, TURBINE.x1, TURBINE.r)}</g>`,
  `<g class="lb-piece" data-step="4" style="--i:4">${coil(GEN.x - 18)}${s.spinSvg("magnet")}${coil(GEN.x + 13)}${glass(GEN.x0, GEN.x1, GEN.r)}</g>`,
  `<g class="lb-piece" data-step="5" style="--i:6">${t.tubeSvg(cablePath, P, { r: 0.9, color: "black" })}<g class="lb-windows" data-part="windows">${windowGlow}</g></g>`,
  `<g data-part="tokens"></g>`,
];

const svg = l.lessonSvg({
  width: WIDTH,
  height: HEIGHT,
  label: "Una central de vapor de LEGO: un fuego calienta una caldera roja; el vapor va por un tubo a una turbina de cristal que gira; en el mismo eje, un imán rojo y azul gira entre bobinas de cobre en el generador, y un cable lleva la electricidad a una casa. Detrás, una torre de refrigeración echa vapor y una bomba devuelve el agua a la caldera.",
  body,
});

const STEPS = [
  {
    say: "¡Vamos a construir con LEGO una fábrica de electricidad que funciona con vapor!",
    ask: "¿Has visto alguna vez salir vapor de una olla?",
    note: "Muchas centrales eléctricas funcionan así: con calor hacen vapor y con el vapor mueven un generador. Las de carbón, gas o biomasa y también las nucleares son centrales de vapor; solo cambia de dónde sale el calor.",
  },
  {
    say: "Primero, el fuego. Quemamos leña y hace mucho, mucho calor.",
    ask: "¿De qué colores es el fuego?",
    note: "En una central de verdad se quema gas, carbón o biomasa, o el calor sale de la fisión del uranio en una nuclear. Aquí usamos leña para que se entienda.",
  },
  {
    say: "Encima ponemos una caldera llena de agua. El fuego la calienta hasta que hierve… ¡y sale vapor, como en una olla!",
    ask: "¿Ves salir el vapor por arriba?",
    note: "La caldera calienta el agua dentro de muchos tubos hasta convertirla en vapor a muy alta presión y temperatura: en las centrales grandes, más de 500 °C y unas 160 veces la presión del aire.",
  },
  {
    say: "El vapor sale con mucha fuerza por un tubo y empuja la rueda de la turbina, como cuando soplas un molinillo.",
    ask: "¿Ves girar la rueda? ¿Dónde está el aspa roja?",
    note: "Una turbina de verdad tiene muchas filas de álabes; el vapor pasa por ellas y las hace girar muy deprisa. En España giran a 3.000 vueltas por minuto, para dar corriente de 50 hercios.",
  },
  {
    say: "La turbina hace girar un imán dentro del generador. Al girar el imán junto a las bobinas de cobre… ¡se fabrica electricidad!",
    ask: "¿Ves el imán rojo y azul dando vueltas?",
    note: "Al mover un imán junto a una bobina de cobre se crea corriente eléctrica: es la inducción. En las centrales gira un electroimán dentro de bobinas fijas, y el generador es tan grande como un autobús.",
  },
  {
    say: "La electricidad viaja por el cable hasta las casas y enciende las luces.",
    ask: "¿Se han encendido las ventanas? ¿Sigues las piezas amarillas con el dedo?",
    note: "En realidad la electricidad sale de la central por un transformador y líneas de alta tensión, como en la lección de la farola.",
  },
  {
    say: "El vapor usado se enfría en la torre y vuelve a ser agua. Una bomba la lleva otra vez a la caldera, ¡y vuelta a empezar!",
    ask: "¿Puedes seguir con el dedo el camino del agua azul?",
    note: "El vapor que sale de la turbina se enfría en un condensador y vuelve a ser agua; el agua del circuito es siempre la misma. Lo que sale de las torres de refrigeración es vapor de agua, no humo.",
  },
  {
    say: "¡Ahora te toca a ti! Echa más leña o apaga el fuego, y mira qué pasa con las luces de la casa.",
    ask: "Si apagamos el fuego… ¿qué le pasa a la casa?",
    note: "Una simplificación: en una central real la turbina gira siempre a la misma velocidad. Con más fuego no gira más deprisa, sino que entrega más energía a la red.",
  },
].map((step) => ({ ...step, night: null }));

const script = `
const svg = document.querySelector(".lb-lesson svg");
const rotor = lesson.spin("rotor");
const magnet = lesson.spin("magnet");
const glow = svg.querySelector('[data-part="fire-glow"]');
const windows = svg.querySelector('[data-part="windows"]');
const pump = [...svg.querySelectorAll('[data-id="pump"]')];
const ROUTES = ${JSON.stringify(routes)};
const steam = lesson.route(ROUTES.steam, { token: "#steam", gap: 10, speed: 60 });
const spent = lesson.route(ROUTES.spent, { token: "#steam", gap: 12, speed: 40 });
const water = lesson.route(ROUTES.water, { token: "#water", gap: 12, speed: 30 });
const power = lesson.route(ROUTES.power, { token: "#power", gap: 9, speed: 60 });
const state = { fire: 2, heat: 0, steam: 0, angle: 0 };
const more = () => { if (lesson.step >= 7) state.fire = Math.min(3, state.fire + 1); };
const less = () => { if (lesson.step >= 7) state.fire = Math.max(0, state.fire - 1); };
lesson.onStep(() => { state.fire = 2; });
const moreButton = lesson.button("more", more, () => "🪵 Más leña");
const lessButton = lesson.button("less", less, () => (state.fire > 0 ? "🧯 Menos fuego" : "🧯 Fuego apagado"));
lesson.click('[data-id="pump"]', more);
lesson.key("m", more);
lesson.key("n", less);

lesson.every((dt) => {
  const s = lesson.step;
  const fire = s >= 1 ? state.fire / 3 : 0;
  state.heat = lesson.ease(state.heat, fire, dt, 0.6);
  state.steam = lesson.ease(state.steam, s >= 2 ? state.heat : 0, dt, 1.4);
  const turning = s >= 3 ? state.steam : 0;
  state.angle += turning * 5 * dt;
  rotor.set(state.angle);
  magnet.set(state.angle);
  const electric = s >= 4 ? turning : 0;

  // The fire burns as a flame with WebGL, or as a glow without it.
  lesson.fx.level("fire", state.heat);
  glow.style.opacity = (lesson.fx.ready ? 0 : state.heat).toFixed(2);
  lesson.fx.level("whistle", s === 2 ? state.steam : 0);
  lesson.fx.level("cloud", s >= 6 ? state.steam : 0);
  steam.level = s >= 3 ? state.steam : 0;
  spent.level = s >= 6 ? state.steam : 0;
  water.level = s >= 6 ? state.steam : 0;
  power.level = s >= 5 ? electric : 0;
  [steam, spent].forEach((route) => (route.speed = 30 + 60 * state.steam));
  windows.style.opacity = (s >= 5 ? Math.min(1, electric * 1.4) : 0).toFixed(2);
  pump.forEach((node) => node.toggleAttribute("data-on", s >= 6 && state.steam > 0.1));
  moreButton.disabled = s < 7 || state.fire >= 3;
  lessButton.disabled = s < 7 || state.fire <= 0;
  return s >= 1;
});

lesson.readout(() => {
  const s = lesson.step;
  if (s < 1) return "";
  const fire = ["🧯 fuego apagado", "🔥 fuego flojo", "🔥 fuego", "🔥 fuego fuerte"][state.fire];
  return [
    fire,
    s >= 2 ? (state.steam > 0.1 ? "💨 hay vapor" : "💧 sin vapor") : "",
    s >= 4 ? (state.steam > 0.1 ? "⚡ electricidad" : "⚡ sin electricidad") : "",
    s >= 5 ? (state.steam > 0.15 ? "💡 luces encendidas" : "💡 luces apagadas") : "",
  ].filter(Boolean).join("  ·  ");
});
`;

const CSS = `
[data-id="glass"] .lb path:not(.lb-edge):not(.lb-crease){fill-opacity:.12}
[data-id="glass"] .lb .lb-edge{stroke-opacity:.7}
[data-part="fire-glow"]{mix-blend-mode:multiply;opacity:0}
.lb-windows path{fill:#ffd84a;stroke:#e0a800;stroke-width:.6}
.lb-windows{opacity:0}
[data-id="pump"]{cursor:pointer}
@keyframes lb-hum{50%{transform:translateY(-.6px)}}
[data-id="pump"][data-on]{animation:lb-hum .25s linear infinite}
@media (prefers-reduced-motion:reduce){[data-id="pump"][data-on]{animation:none}}
`;

const html = l.lessonHtml({
  title: "¿Cómo funciona una central de vapor?",
  svg,
  steps: STEPS,
  projection: P,
  buttons: [
    { action: "less", label: "🧯 Menos fuego" },
    { action: "more", label: "🪵 Más leña" },
  ],
  keys: "M más leña · N menos fuego",
  script,
  css: CSS,
  spins: {
    rotor: s.spinData(rotor, { pivot: [TURBINE.x, AXIS_Y, AXIS_Z], axis: "x" }),
    magnet: s.spinData(magnet, { pivot: [GEN.x, AXIS_Y, AXIS_Z], axis: "x" }),
  },
  fx: [
    fx.flame({
      id: "fire",
      at: FIRE,
      r: 15,
      z0: 3 * PLATE + 1,
      z1: BOILER.z - BOILER.r,
      occluders: [
        [11 * STUD, 10 * STUD, SLAB, 12 * STUD, 14 * STUD, 14 * PLATE],
        [BOILER.x0, AXIS_Y - BOILER.r, BOILER.z - BOILER.r, BOILER.x1, AXIS_Y + BOILER.r, BOILER.z + BOILER.r],
      ],
    }),
    fx.smoke({ id: "whistle", at: [44, AXIS_Y, BOILER.z + BOILER.r + 10], drift: [6, -2, 34], size: 0.8, color: [0.66, 0.7, 0.76] }),
    fx.smoke({ id: "cloud", at: [TOWER[0], TOWER[1], 3 * PLATE + 74], drift: [16, -6, 60], size: 2.6, color: [0.66, 0.7, 0.76] }),
  ],
});
mkdirSync(HERE, { recursive: true });
writeFileSync(join(HERE, "vapor.html"), html);
console.log("wrote vapor.html", `${(html.length / 1024).toFixed(0)} KB`, `${pieces.length} pieces`);
