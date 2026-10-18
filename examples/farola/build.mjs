import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../kit/iso-kit.mjs";
import * as b from "../../kit/brick.mjs";
import * as l from "../../kit/lesson.mjs";
import { auditOrExit } from "../../kit/lego-audit.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const { STUD, PLATE, GAP } = b;

const WIDTH = 1000;
const HEIGHT = 600;

// The scene on the LEGO grid: 56 studs along x, 20 deep along y. Earth below z = 0, the street on top.
const LONG = 56;
const DEEP = 20;
const EARTH = 6;
const STREET = 30;
const SIDEWALK = 14;
const SIDEWALK_H = 2;

const TURBINE = [5, 12];
const HUB_Z = 34 * PLATE;
const ROTOR_Y = 15 * STUD;
const BLADE = 52;
const PYLONS = [10, 16];
const ARM_Y = [9.5, 14.5];
const INSULATOR_TOP = 33 * PLATE;
const YARD = { x: 22, y: 9, w: 7, d: 6 };
const TRANSFORMER = { x: 23, y: 9, w: 3, d: 6 };
const TAPS = ARM_Y.map((y) => [23.5 * STUD, y * STUD, 14 * PLATE]);
const HOUSE = { x: 22, y: 15, w: 7, d: 5 };
const CABLE_Z = -3 * PLATE;
const FACE_Y = DEEP * STUD + 0.4;
const CABLE_OUT = 28.5 * STUD;
const LAMPS = [34, 42, 50];
const BULB_Y = 16.5 * STUD;
const BULB_Z = 24.5 * PLATE;

const pieces = [];
const add = (step, piece) => pieces.push({ step, ...piece });

// Step 0: the ground. Two courses of earth bricks, staggered like a wall, under a green baseplate,
// a road and a raised sidewalk.
for (let row = 0; row < 2; row++) {
  const shift = row ? 2 : 0;
  for (let x = -shift; x < LONG; x += 4) {
    const from = Math.max(0, x);
    const to = Math.min(LONG, x + 4);
    add(0, b.brick({ x: from, y: 0, z: -EARTH + row * 3, w: to - from, d: DEEP, h: 3, color: row ? "brown" : "dark-tan", studs: false }));
  }
}
for (let x = 0; x < STREET; x += 10) for (let y = 0; y < DEEP; y += 10) add(0, b.plate({ x, y, w: 10, d: 10, color: "bright-green" }));
add(0, b.plate({ x: STREET, y: 0, w: LONG - STREET, d: 4, color: "bright-green" }));
add(0, b.tile({ x: STREET, y: 4, w: LONG - STREET, d: SIDEWALK - 4, color: "dark-gray" }));
for (let x = STREET + 1; x < LONG - 1; x += 4)
  add(0, b.custom({ faces: b.boxFaces(x * STUD, 8.75 * STUD, PLATE, (x + 2) * STUD, 9.25 * STUD, PLATE + 0.3), color: "white" }));
for (let x = STREET; x < LONG; x += 2) for (let y = SIDEWALK; y < DEEP; y += 2) add(0, b.tile({ x, y, w: 2, d: 2, h: SIDEWALK_H, color: "light-gray" }));

// Scenery: pine trees and flowers on the grass.
const tree = (x, y, size = 1) => {
  add(0, b.round({ x, y, z: 1, w: 1, h: 3, color: "brown", studs: false }));
  const cx = (x + 0.5) * STUD;
  const cy = (y + 0.5) * STUD;
  add(0, b.custom({ faces: b.frustumFaces(cx, cy, 13 * size, 4 * PLATE, 1.5, 4 * PLATE + 34 * size, 20), color: "green" }));
};
tree(16, 2, 1);
tree(19, 4, 0.8);
tree(38, 1, 0.9);
tree(52, 1, 1.1);
tree(1, 17, 0.75);
[[13, 17, "red"], [14, 18, "yellow"], [18, 17, "red"], [3, 3, "yellow"], [9, 2, "red"], [33, 2, "yellow"], [46, 2, "red"], [20, 18, "yellow"]].forEach(([x, y, color]) =>
  add(0, b.round({ x, y, z: 1, w: 1, h: 1, color })),
);

// Step 1: the wind turbine. A tapering white tower, the nacelle on top and a hub facing +y.
{
  const [tx, ty] = TURBINE;
  add(1, b.plate({ x: tx - 2, y: ty - 2, w: 4, d: 4, z: 1, color: "light-gray", id: "turbine" }));
  for (let level = 0; level < 6; level++) add(1, b.round({ x: tx - 1, y: ty - 1, z: 2 + level * 3, w: 2, h: 3, color: "white", studs: level === 5, id: "turbine" }));
  for (let level = 0; level < 4; level++) add(1, b.round({ x: tx - 0.5, y: ty - 0.5, z: 20 + level * 3, w: 1, h: 3, color: "white", studs: false, id: "turbine" }));
  add(1, b.brick({ x: 7, y: 9, z: 1, w: 2, d: 6, h: 6, color: "dark-gray", studs: false, id: "turbine" }));
  ARM_Y.forEach((y) => {
    for (let level = 0; level < 3; level++) add(1, b.round({ x: 7.5, y: y - 0.5, z: 7 + level * 2, w: 1, h: 2, color: "white", studs: false, steps: 16, id: "turbine" }));
  });
  add(1, b.custom({ faces: b.boxFaces((tx - 0.75) * STUD, (ty - 1.4) * STUD, 32 * PLATE, (tx + 0.75) * STUD, (ty + 2.4) * STUD, 36 * PLATE), color: "white", id: "turbine" }));
}

// Step 2: two pylons and the high-voltage line.
const pylon = (cx) => {
  add(2, b.plate({ x: cx - 1, y: 11, z: 1, w: 2, d: 2, color: "dark-gray" }));
  for (let level = 0; level < 8; level++) add(2, b.round({ x: cx - 1, y: 11, z: 2 + level * 3, w: 2, h: 3, color: "light-gray", studs: false }));
  add(2, b.plate({ x: cx - 0.5, y: 9, z: 26, w: 1, d: 6, color: "dark-gray", studs: false }));
  ARM_Y.forEach((y) => {
    for (let level = 0; level < 3; level++) add(2, b.round({ x: cx - 0.5, y: y - 0.5, z: 27 + level * 2, w: 1, h: 2, color: "white", studs: false, steps: 16 }));
  });
};
PYLONS.forEach(pylon);

// Step 3: the substation. A yard with the transformer and its two insulators, and a small brick house
// whose front wall sits on the front edge of the street.
add(3, b.plate({ ...YARD, z: 1, color: "light-gray" }));
add(3, b.brick({ ...TRANSFORMER, z: 2, h: 6, color: "dark-gray", studs: false }));
for (let rib = 0; rib < 5; rib++) {
  const y = (TRANSFORMER.y + 0.7 + rib * 1.1) * STUD;
  add(3, b.custom({ faces: b.boxFaces((TRANSFORMER.x + TRANSFORMER.w) * STUD - GAP, y, 2.6 * PLATE, (TRANSFORMER.x + TRANSFORMER.w + 0.5) * STUD, y + 2.4, 7.4 * PLATE), color: "dark-gray" }));
}
ARM_Y.forEach((y) => {
  for (let level = 0; level < 3; level++) add(3, b.round({ x: 23, y: y - 0.5, z: 8 + level * 2, w: 1, h: 2, color: "white", studs: false, steps: 16 }));
});
for (let course = 0; course < 3; course++) add(3, b.brick({ ...HOUSE, z: 1 + course * 3, h: 3, color: course === 1 ? "white" : "light-gray", studs: false }));
add(3, b.plate({ ...HOUSE, z: 10, color: "dark-gray" }));
const front = (x0, x1, z0, z1, color, extra) =>
  b.custom({ faces: b.boxFaces(x0, DEEP * STUD - GAP, z0, x1, DEEP * STUD + 0.5, z1), color, extra, box: b.boxOf(x0, DEEP * STUD - GAP, z0, x1, DEEP * STUD + 0.5, z1) });
add(3, front(23.4 * STUD, 25 * STUD, PLATE, 7.5 * PLATE, "blue"));
add(
  3,
  front(26 * STUD, 28 * STUD, 4.5 * PLATE, 9 * PLATE, "yellow", (P) => {
    const bolt = [[27.2, 8.4], [26.6, 6.8], [27.15, 6.8], [26.75, 5.1], [27.5, 7.1], [26.95, 7.1], [27.4, 8.4]].map(([x, z]) => k.iso([x * STUD, DEEP * STUD + 0.6, z * PLATE], P));
    return `<path d="${k.pathOf(bolt, true)}" fill="#1b1b1b"/>`;
  }),
);

// Step 4: the streetlamps, and someone out for a walk. The cable under the sidewalk is drawn below.
const lamp = (cx) => {
  const x = cx - 0.5;
  add(4, b.round({ x: cx - 1, y: 18, z: SIDEWALK_H, w: 2, h: 1, color: "black" }));
  for (let level = 0; level < 7; level++) add(4, b.round({ x, y: 18.5, z: 3 + level * 3, w: 1, h: 3, color: "black", studs: false, steps: 16 }));
  add(4, b.round({ x, y: 16, z: 24, w: 1, h: 1, color: "trans-yellow", trans: true, studs: false, steps: 16 }));
  add(4, b.plate({ x, y: 16, z: 25, w: 1, d: 3, color: "black", studs: false }));
  add(4, b.custom({ faces: b.frustumFaces(cx * STUD, BULB_Y, 6.2, 26 * PLATE, 2.6, 28 * PLATE, 20), color: "black" }));
  add(4, b.round({ x, y: 18, z: 26, w: 1, h: 1, color: "azure", studs: false, steps: 16, id: "eye" }));
};
LAMPS.forEach(lamp);
add(4, b.minifig({ x: 46, y: 16.6, z: SIDEWALK_H, torso: "red", legs: "blue", hair: "brown" }));

auditOrExit(pieces);

const P = k.fitProjection(
  [
    ...k.boxCorners({ x: 0, y: 0, w: LONG * STUD, d: DEEP * STUD, r: 0 }, -EARTH * PLATE, 0),
    [TURBINE[0] * STUD - BLADE, ROTOR_Y, HUB_Z],
    [TURBINE[0] * STUD, ROTOR_Y, HUB_Z + BLADE + 4],
    [TURBINE[0] * STUD, ROTOR_Y, HUB_Z - BLADE],
  ],
  WIDTH,
  HEIGHT,
  { pad: 26, azimuth: 55 },
);
const at = (point) => k.iso(point, P);

// Overhead wires sag between their supports.
const sagged = (from, to) => {
  const span = Math.hypot(to[0] - from[0], to[1] - from[1]);
  const sag = 6 + span * 0.06;
  return Array.from({ length: 13 }, (_, step) => {
    const t = step / 12;
    return [from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t, from[2] + (to[2] - from[2]) * t - sag * 4 * t * (1 - t)];
  });
};
const wires = ARM_Y.map((y, index) => {
  const tops = PYLONS.map((cx) => [cx * STUD, y * STUD, INSULATOR_TOP]);
  const start = [8 * STUD, y * STUD, 13 * PLATE];
  return [...sagged(start, tops[0]), ...sagged(tops[0], tops[1]).slice(1), ...sagged(tops[1], TAPS[index]).slice(1)];
});
const tower = [
  [TURBINE[0] * STUD, TURBINE[1] * STUD + 6, HUB_Z - 4],
  [TURBINE[0] * STUD, TURBINE[1] * STUD + 6, 4 * PLATE],
  [8 * STUD, TURBINE[1] * STUD + 6, 4 * PLATE],
];
const cable = [
  [CABLE_OUT, FACE_Y, 3 * PLATE],
  [CABLE_OUT, FACE_Y, CABLE_Z],
  [LAMPS[LAMPS.length - 1] * STUD, FACE_Y, CABLE_Z],
];
const risers = LAMPS.map((cx) => [
  [cx * STUD, FACE_Y, CABLE_Z],
  [cx * STUD, FACE_Y, SIDEWALK_H * PLATE],
]);

const wireSvg = (points) => `<path class="lb-wire" d="${k.pathOf(points.map(at))}"/>`;
const cableSvg = (points, extra = "") => `<path class="lb-cable" d="${k.pathOf(points.map(at))}"${extra}/>`;

// The hub is a short white cylinder on the rotor axis, drawn over the blades.
const hub = b.solidSvg(b.extrudeFaces(b.circleOf(TURBINE[0] * STUD, HUB_Z, 4.6, 18), "y", 14.4 * STUD, ROTOR_Y + 1.6), "white", P);
const nose = b.solidSvg(b.extrudeFaces(b.circleOf(TURBINE[0] * STUD, HUB_Z, 2.6, 14), "y", ROTOR_Y + 1.6, ROTOR_Y + 3.4), "light-gray", P);

// A halo around each bulb and a pool of light on the pavement under it.
const glows = LAMPS.map((cx) => l.glowSvg(P, [cx * STUD, BULB_Y, BULB_Z], SIDEWALK_H * PLATE)).join("");

const body = [
  `<defs>${l.GLOW_DEFS}${l.tokenDef("e-big", P, { r: 3.2 })}${l.tokenDef("e-small", P, { r: 1.9 })}</defs>`,
  `<g class="lb-scene">${b.sceneSvg(pieces, P)}</g>`,
  `<g class="lb-piece" data-step="2" style="--i:8">${wires.map(wireSvg).join("")}</g>`,
  `<g class="lb-piece" data-step="4" style="--i:0">${cableSvg(cable)}${risers.map((r) => cableSvg(r)).join("")}${[...risers.map((r) => r[1]), cable[0]].map((p) => {
    const [x, y] = at(p);
    return `<circle class="lb-plug" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2"/>`;
  }).join("")}</g>`,
  `<g class="lb-piece" data-step="1" data-id="turbine" style="--i:14"><g data-part="blades"><path/><path/><path/></g>${hub}${nose}</g>`,
  l.nightSvg(WIDTH, HEIGHT),
  l.skySvg(WIDTH),
  `<g class="lb-glow">${glows}</g>`,
  `<g data-part="tokens"></g>`,
];

const svg = l.lessonSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    "Una calle de LEGO City. A la izquierda, un molino de viento; dos torres llevan los cables hasta un transformador; desde allí un cable va bajo la acera hasta tres farolas, que se encienden de noche.",
  body,
});

const STEPS = [
  {
    say: "¡Vamos a construir con LEGO cómo llega la luz a una farola!",
    ask: "¿Tú sabes de dónde sale la luz de las farolas?",
    note: "La idea es seguir el camino de la electricidad desde donde se fabrica hasta la farola. No hace falta que lo entienda todo: basta con que siga las piezas amarillas.",
    night: false,
  },
  {
    say: "Esto es un molino de viento. Cuando sopla el viento, las aspas giran… ¡y dentro del molino se fabrica electricidad!",
    ask: "¿Soplamos fuerte para que gire? (Haz clic en el molino para parar o soltar el viento.)",
    note: "Las aspas hacen girar un generador que está en la caja de arriba (la góndola). Al girar, unos imanes se mueven junto a bobinas de cobre y producen corriente eléctrica.",
    night: false,
  },
  {
    say: "La electricidad es como muchas piececitas amarillas que viajan muy, muy rápido por los cables. Los cables van colgados de unas torres muy altas.",
    ask: "¿Cuántas torres ves? ¿Y cuántos cables?",
    note: "Las líneas de alta tensión llevan la electricidad lejos a cientos de miles de voltios, porque así se pierde menos energía por el camino. Las piezas grandes representan esa tensión tan alta, que es muy peligrosa: por eso los cables van tan arriba.",
    night: false,
  },
  {
    say: "Esto es el transformador. Por los cables altos, la electricidad viene con muchísima fuerza. El transformador la vuelve más suave para poder usarla en la calle.",
    ask: "¿Ves la señal amarilla del rayo? Significa «¡cuidado, no tocar!».",
    note: "Una subestación baja la tensión. Entre la central y tu calle suele haber varios transformadores; aquí los juntamos en uno. A una farola llegan unos 230 voltios, como a los enchufes de casa.",
    night: false,
  },
  {
    say: "Desde el transformador, un cable va escondido debajo de la acera hasta cada farola. Ahora es de día, así que las farolas están apagadas y descansan.",
    ask: "¿Encuentras el cable negro debajo del suelo?",
    note: "En las ciudades el cableado del alumbrado va enterrado bajo la acera, dentro de tubos. De día no pasa corriente hacia la farola porque está apagada: la electricidad solo viaja cuando algo la usa.",
    night: false,
  },
  {
    say: "Cada farola tiene un ojito azul que mira al cielo. Cuando se hace de noche… ¡la electricidad sube por el poste y la farola se enciende!",
    ask: "¿Qué pasaría por la noche si no hubiera farolas?",
    note: "Muchas farolas se encienden con una fotocélula (un sensor de luz, el «ojito») o con un reloj astronómico que sabe a qué hora anochece cada día del año.",
    night: true,
  },
  {
    say: "¡Ahora te toca a ti! Haz que sea de día o de noche, o para el viento del molino.",
    ask: "Si se para el molino… ¿qué le pasa a la farola?",
    note: "Una simplificación: en la red de verdad hay muchas centrales conectadas a la vez, así que si un molino se para, las farolas siguen encendidas gracias a las demás.",
    night: null,
  },
];

// The story's model: wind turns the rotor, the rotor's speed is the power on the line, and the
// street cable only carries current while the lamps are on, which needs both night and power.
const script = `
const HUB = ${JSON.stringify([TURBINE[0] * STUD, ROTOR_Y, HUB_Z])}, BLADE = ${BLADE};
const svg = document.querySelector(".lb-lesson svg");
const blades = [...svg.querySelectorAll('[data-part="blades"] path')];
const glow = svg.querySelector(".lb-glow");
const eyes = [...svg.querySelectorAll('[data-id="eye"]')];
const tower = lesson.route(${JSON.stringify(tower)}, { token: "#e-big", gap: 22, speed: 50 });
const line = ${JSON.stringify(wires)}.map((pts) => lesson.route(pts, { token: "#e-big", gap: 34, speed: 70 }));
const street = [${JSON.stringify(cable)}, ...${JSON.stringify(risers)}].map((pts, i) => lesson.route(pts, { token: "#e-small", gap: i ? 12 : 18, speed: i ? 30 : 46 }));
const state = { wind: true, spin: 0, angle: 0.3, lit: 0, line: 0, street: 0 };

function bladesAt(angle) {
  return [0, 1, 2].map((i) => {
    const a = angle + (i * Math.PI * 2) / 3;
    const pt = (along, across) => [HUB[0] + Math.cos(a) * along - Math.sin(a) * across, HUB[1], HUB[2] + Math.sin(a) * along + Math.cos(a) * across];
    return pathOf([pt(3, -2.6), pt(14, -4.4), pt(BLADE, -1.2), pt(BLADE + 1.5, 0.4), pt(14, 2.2), pt(3, 2.6)].map((p) => iso(p, ${JSON.stringify(P)})), true);
  });
}
const toggleWind = () => { if (lesson.step >= 1) state.wind = !state.wind; };
lesson.onStep((step) => { if (step <= 1) state.wind = true; });
lesson.button("night", () => lesson.toggleNight(), () => (lesson.night ? "☀️ Que sea de día" : "🌙 Que sea de noche"));
const windButton = lesson.button("wind", toggleWind, () => (state.wind ? "✋ Parar el viento" : "💨 Soplar viento"));
lesson.key("v", toggleWind);
lesson.click('[data-id="turbine"]', toggleWind);

lesson.every((dt) => {
  const s = lesson.step;
  state.spin = lesson.ease(state.spin, s >= 1 && state.wind ? 1 : 0, dt, 0.9);
  if (state.spin < 0.001) state.spin = 0;
  state.angle += state.spin * dt * 2.2;
  const lampsOn = s >= 4 && lesson.dark > 0.55 && state.spin > 0.35;
  state.lit = lesson.ease(state.lit, lampsOn ? 1 : 0, dt, 0.35);
  state.line = lesson.ease(state.line, s >= 2 ? state.spin : 0, dt, 0.4);
  state.street = lesson.ease(state.street, lampsOn ? 1 : 0, dt, 0.4);
  const paths = bladesAt(state.angle);
  blades.forEach((path, i) => path.setAttribute("d", paths[i]));
  glow.style.opacity = state.lit.toFixed(3);
  eyes.forEach((eye) => eye.toggleAttribute("data-on", lesson.dark > 0.55));
  tower.level = state.spin;
  line.forEach((route) => (route.level = state.line));
  street.forEach((route) => (route.level = state.street));
  windButton.disabled = s < 1;
  return state.spin > 0 || Math.abs(state.lit - (lampsOn ? 1 : 0)) > 0.001;
});

lesson.readout(() => {
  const s = lesson.step;
  return [
    s >= 1 ? (state.wind ? "💨 hay viento" : "🍃 sin viento") : "",
    s >= 2 ? (state.line > 0.3 ? "⚡ electricidad viajando" : "⚡ sin electricidad") : "",
    s >= 4 ? (state.lit > 0.5 ? "💡 farolas encendidas" : "💡 farolas apagadas") : "",
  ].filter(Boolean).join("  ·  ");
});
`;

const CSS = `
.lb-wire{fill:none;stroke:#2a2f36;stroke-width:1.1}
.lb-cable{fill:none;stroke:#141414;stroke-width:3.2;stroke-linecap:round;stroke-linejoin:round}
.lb-plug{fill:#141414}
[data-id="turbine"]{cursor:pointer}
[data-part="blades"] path{fill:#f2f2ee;stroke:#77786f;stroke-width:.9;stroke-linejoin:round}
[data-id="eye"][data-on] .lb path:not(.lb-edge):not(.lb-crease){fill:#7ff0ff}
`;

const html = l.lessonHtml({
  title: "¿Cómo llega la luz a la farola?",
  svg,
  steps: STEPS,
  projection: P,
  buttons: [
    { action: "night", label: "🌙 Que sea de noche" },
    { action: "wind", label: "✋ Parar el viento" },
  ],
  keys: "N noche · V viento · también puedes pulsar el sol o el molino",
  script,
  css: CSS,
});
mkdirSync(HERE, { recursive: true });
writeFileSync(join(HERE, "farola.html"), html);
console.log("wrote farola.html", `${(html.length / 1024).toFixed(0)} KB`, `${pieces.length} pieces`);
