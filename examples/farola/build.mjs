import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../kit/iso-kit.mjs";
import * as b from "../../kit/brick.mjs";
import { kitScript } from "../../scripts/inline-kit.mjs";

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
const INSULATOR_TOP = 34 * PLATE;
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
    for (let level = 0; level < 3; level++) add(2, b.round({ x: cx - 0.5, y: y - 0.5, z: 27 + level * 2.33, w: 1, h: 2.33, color: "white", studs: false, steps: 16 }));
  });
};
PYLONS.forEach(pylon);

// Step 3: the substation. A yard with the transformer and its two insulators, and a small brick house
// whose front wall sits on the front edge of the street.
add(3, b.plate({ ...YARD, z: 1, color: "light-gray" }));
add(3, b.brick({ ...TRANSFORMER, z: 2, h: 6, color: "dark-gray", studs: false }));
for (let rib = 0; rib < 5; rib++) {
  const y = (TRANSFORMER.y + 0.7 + rib * 1.1) * STUD;
  add(3, b.custom({ faces: b.boxFaces((TRANSFORMER.x + TRANSFORMER.w) * STUD, y, 2.6 * PLATE, (TRANSFORMER.x + TRANSFORMER.w + 0.5) * STUD, y + 2.4, 7.4 * PLATE), color: "dark-gray" }));
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

// Glows: a halo around each bulb and a pool of light on the pavement under it.
const glows = LAMPS.map((cx) => {
  const [bx, by] = at([cx * STUD, BULB_Y, BULB_Z]);
  const [gx, gy] = at([cx * STUD, BULB_Y, SIDEWALK_H * PLATE]);
  const { k: scale, sinE } = k.cameraOf(P);
  const r = 34 * scale;
  return `<ellipse cx="${gx.toFixed(1)}" cy="${gy.toFixed(1)}" rx="${r.toFixed(1)}" ry="${(r * sinE).toFixed(1)}" fill="url(#pool)"/><circle cx="${bx.toFixed(1)}" cy="${by.toFixed(1)}" r="${(16 * scale).toFixed(1)}" fill="url(#halo)"/>`;
}).join("");

// Energy pieces: glowing yellow round plates, big on the high-voltage line and small after the
// transformer. Each is drawn once at the world origin and moved with a translate.
const origin = at([0, 0, 0]);
const energy = (id, r) => `<g id="${id}">${b.studSvg(0, 0, -1, "#ffd83a", P, { r, h: 1.8 })}</g>`;

const sky = `
<g class="lb-sky" data-sky role="button" aria-label="Día o noche">
  <g class="lb-sun" transform="translate(${WIDTH - 80} 74)">
    ${Array.from({ length: 10 }, (_, i) => {
      const a = (i / 10) * Math.PI * 2;
      return `<path d="M${(Math.cos(a) * 26).toFixed(1)} ${(Math.sin(a) * 26).toFixed(1)}L${(Math.cos(a) * 36).toFixed(1)} ${(Math.sin(a) * 36).toFixed(1)}"/>`;
    }).join("")}
    <circle r="19"/>
  </g>
  <g class="lb-moon" transform="translate(${WIDTH - 80} 74)"><path d="M6 -20a20 20 0 1 0 14 30a16 16 0 1 1 -14 -30z"/></g>
  <circle r="40" cx="${WIDTH - 80}" cy="74" fill="transparent"/>
</g>
<g class="lb-stars">${[[90, 60], [180, 30], [300, 80], [420, 40], [560, 70], [680, 30], [780, 110], [860, 170], [500, 140], [240, 150]]
  .map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="${i % 3 ? 1.4 : 2}"/>`)
  .join("")}</g>`;

const body = [
  `<defs>
    <radialGradient id="halo"><stop offset="0" stop-color="#fff6c2"/><stop offset=".35" stop-color="#ffd84a" stop-opacity=".75"/><stop offset="1" stop-color="#ffb800" stop-opacity="0"/></radialGradient>
    <radialGradient id="pool"><stop offset="0" stop-color="#ffe27a" stop-opacity=".9"/><stop offset=".6" stop-color="#ffc93a" stop-opacity=".35"/><stop offset="1" stop-color="#ffb800" stop-opacity="0"/></radialGradient>
    ${energy("e-big", 3.2)}${energy("e-small", 1.9)}
  </defs>`,
  `<g class="lb-scene">${b.sceneSvg(pieces, P)}</g>`,
  `<g class="lb-piece" data-step="2" style="--i:8">${wires.map(wireSvg).join("")}</g>`,
  `<g class="lb-piece" data-step="4" style="--i:0">${cableSvg(cable)}${risers.map((r) => cableSvg(r)).join("")}${[...risers.map((r) => r[1]), cable[0]].map((p) => {
    const [x, y] = at(p);
    return `<circle class="lb-plug" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2"/>`;
  }).join("")}</g>`,
  `<g class="lb-piece" data-step="1" data-id="turbine" style="--i:14"><g data-part="blades"><path/><path/><path/></g>${hub}${nose}</g>`,
  `<rect class="lb-night" x="-600" y="-600" width="${WIDTH + 1200}" height="${HEIGHT + 1200}"/>`,
  sky,
  `<g class="lb-glow">${glows}</g>`,
  `<g data-part="energy"></g>`,
];

const svg = k.figureSvg({
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

const live = `
const P = ${JSON.stringify(P)};
const STEPS = ${JSON.stringify(STEPS)};
const HUB = ${JSON.stringify([TURBINE[0] * STUD, ROTOR_Y, HUB_Z])}, BLADE = ${BLADE};
const ORIGIN = ${JSON.stringify(origin)};
const WIRES = ${JSON.stringify(wires)};
const TOWER = ${JSON.stringify(tower)};
const CABLE = ${JSON.stringify(cable)};
const RISERS = ${JSON.stringify(risers)};
const figure = document.querySelector(".lb-lesson");
const svg = figure.querySelector("svg");
const pieces = [...svg.querySelectorAll(".lb-piece")];
const blades = [...svg.querySelectorAll('[data-part="blades"] path')];
const energyLayer = svg.querySelector('[data-part="energy"]');
const night = svg.querySelector(".lb-night");
const glow = svg.querySelector(".lb-glow");
const stars = svg.querySelector(".lb-stars");
const sun = svg.querySelector(".lb-sun");
const moon = svg.querySelector(".lb-moon");
const eyes = [...svg.querySelectorAll('[data-id="eye"]')];
const still = matchMedia("(prefers-reduced-motion: reduce)");
const ui = {
  step: document.querySelector("[data-step-label]"),
  say: document.querySelector("[data-say]"),
  ask: document.querySelector("[data-ask]"),
  note: document.querySelector("[data-note]"),
  prev: document.querySelector('[data-action="prev"]'),
  next: document.querySelector('[data-action="next"]'),
  night: document.querySelector('[data-action="night"]'),
  wind: document.querySelector('[data-action="wind"]'),
  readout: document.querySelector("[data-readout]"),
  corner: document.querySelector('[data-corner="fig"]'),
};

// A route is a polyline through the world; pieces ride it at even spacing.
const lengthOf = (pts) => pts.slice(1).reduce((sum, p, i) => sum + Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1], p[2] - pts[i][2]), 0);
const pointAt = (pts, s) => {
  for (let i = 1; i < pts.length; i++) {
    const [a, b] = [pts[i - 1], pts[i]];
    const l = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    if (s <= l || i === pts.length - 1) { const t = Math.min(1, s / (l || 1)); return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
    s -= l;
  }
  return pts[pts.length - 1];
};
const NS = "http://www.w3.org/2000/svg";
const routes = [
  { pts: TOWER, kind: "big", gap: 22, speed: 50, feed: "tower" },
  ...WIRES.map((pts) => ({ pts, kind: "big", gap: 34, speed: 70, feed: "line" })),
  { pts: CABLE, kind: "small", gap: 18, speed: 46, feed: "street" },
  ...RISERS.map((pts) => ({ pts, kind: "small", gap: 12, speed: 30, feed: "street" })),
].map((route) => {
  const length = lengthOf(route.pts);
  const count = Math.ceil(length / route.gap);
  const nodes = Array.from({ length: count }, () => {
    const use = document.createElementNS(NS, "use");
    use.setAttribute("href", route.kind === "big" ? "#e-big" : "#e-small");
    energyLayer.appendChild(use);
    return use;
  });
  return { ...route, length, nodes, offset: 0, level: 0 };
});

const state = { step: 0, wind: true, night: false, dark: 0, spin: 0, angle: 0.3, power: 0, lit: 0, line: 0, street: 0 };

function setStep(next) {
  state.step = Math.max(0, Math.min(STEPS.length - 1, next));
  const step = STEPS[state.step];
  if (step.night !== null) state.night = step.night;
  if (state.step <= 1) state.wind = true;
  pieces.forEach((piece) => piece.toggleAttribute("data-hidden", Number(piece.dataset.step) > state.step));
  ui.step.textContent = "Paso " + (state.step + 1) + " de " + STEPS.length;
  ui.corner.textContent = ui.step.textContent;
  ui.say.textContent = step.say;
  ui.ask.textContent = step.ask;
  ui.note.textContent = step.note;
  ui.prev.disabled = state.step === 0;
  ui.next.disabled = state.step === STEPS.length - 1;
  figure.dataset.step = String(state.step);
  run();
}
const toggleNight = () => { state.night = !state.night; run(); };
const toggleWind = () => { state.wind = !state.wind; run(); };

function bladesAt(angle) {
  return [0, 1, 2].map((i) => {
    const a = angle + (i * Math.PI * 2) / 3;
    const u = [Math.cos(a), 0, Math.sin(a)];
    const v = [-Math.sin(a), 0, Math.cos(a)];
    const pt = (along, across) => [HUB[0] + u[0] * along + v[0] * across, HUB[1], HUB[2] + u[2] * along + v[2] * across];
    return pathOf([pt(3, -2.6), pt(14, -4.4), pt(BLADE, -1.2), pt(BLADE + 1.5, 0.4), pt(14, 2.2), pt(3, 2.6)].map((p) => iso(p, P)), true);
  });
}

let frame = 0, last = 0;
const ease = (from, to, dt, tau) => (still.matches ? to : from + (to - from) * (1 - Math.exp(-dt / tau)));
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 20) : 1 / 60;
  last = now;
  const s = state.step;
  state.dark = ease(state.dark, state.night ? 1 : 0, dt, 0.7);
  state.spin = ease(state.spin, s >= 1 && state.wind ? 1 : 0, dt, 0.9);
  state.angle += state.spin * dt * 2.2;
  state.power = state.spin;
  const lampsOn = s >= 4 && state.dark > 0.55 && state.power > 0.35;
  state.lit = ease(state.lit, lampsOn ? 1 : 0, dt, 0.35);
  state.line = ease(state.line, s >= 2 ? state.power : 0, dt, 0.4);
  state.street = ease(state.street, lampsOn ? 1 : 0, dt, 0.4);

  blades.forEach((path, i) => path.setAttribute("d", bladesAt(state.angle)[i]));
  night.style.opacity = (state.dark * 0.72).toFixed(3);
  stars.style.opacity = state.dark.toFixed(3);
  sun.style.opacity = (1 - state.dark).toFixed(3);
  moon.style.opacity = state.dark.toFixed(3);
  glow.style.opacity = state.lit.toFixed(3);
  eyes.forEach((eye) => eye.toggleAttribute("data-on", state.dark > 0.55));
  figure.toggleAttribute("data-night", state.dark > 0.5);

  for (const route of routes) {
    const level = route.feed === "tower" ? state.power : route.feed === "line" ? state.line : state.street;
    route.offset = (route.offset + route.speed * level * dt) % route.gap;
    route.nodes.forEach((node, i) => {
      const s = route.offset + i * route.gap;
      const edge = Math.min(s, route.length - s) / 8;
      const alpha = Math.max(0, Math.min(1, edge)) * level;
      if (alpha < 0.02 || s > route.length) { node.setAttribute("opacity", "0"); return; }
      const [x, y] = iso(pointAt(route.pts, s), P);
      node.setAttribute("transform", "translate(" + (x - ORIGIN[0]).toFixed(2) + " " + (y - ORIGIN[1]).toFixed(2) + ")");
      node.setAttribute("opacity", alpha.toFixed(2));
    });
  }

  const text = [
    s >= 1 ? (state.wind ? "💨 hay viento" : "🍃 sin viento") : "",
    s >= 2 ? (state.line > 0.3 ? "⚡ electricidad viajando" : "⚡ sin electricidad") : "",
    s >= 4 ? (state.lit > 0.5 ? "💡 farolas encendidas" : "💡 farolas apagadas") : "",
  ].filter(Boolean).join("  ·  ");
  if (ui.readout.textContent !== text) ui.readout.textContent = text;
  ui.night.textContent = state.night ? "☀️ Que sea de día" : "🌙 Que sea de noche";
  ui.wind.textContent = state.wind ? "✋ Parar el viento" : "💨 Soplar viento";
  ui.wind.disabled = s < 1;

  const moving = state.spin > 0.001 || Math.abs(state.dark - (state.night ? 1 : 0)) > 0.001 || Math.abs(state.lit - (lampsOn ? 1 : 0)) > 0.001 || state.line > 0.001 || state.street > 0.001;
  frame = moving && !document.hidden ? requestAnimationFrame(tick) : 0;
}
function run() { if (!frame) { last = 0; frame = requestAnimationFrame(tick); } }

ui.prev.addEventListener("click", () => setStep(state.step - 1));
ui.next.addEventListener("click", () => setStep(state.step + 1));
ui.night.addEventListener("click", toggleNight);
ui.wind.addEventListener("click", toggleWind);
svg.addEventListener("click", (event) => {
  if (event.target.closest("[data-sky]")) toggleNight();
  else if (event.target.closest('[data-id="turbine"]') && state.step >= 1) toggleWind();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "ArrowRight" || event.key === " ") { event.preventDefault(); setStep(state.step + 1); }
  else if (event.key === "ArrowLeft") setStep(state.step - 1);
  else if (event.key === "n" || event.key === "N") toggleNight();
  else if (event.key === "v" || event.key === "V") toggleWind();
});
document.addEventListener("visibilitychange", run);
const first = new URLSearchParams(location.search).get("paso");
setStep(first ? Number(first) - 1 : 0);
`;

const CSS = `
${b.BRICK_CSS}
body{background:#eef3f7;font-family:ui-rounded,"SF Pro Rounded","Nunito",system-ui,sans-serif}
.lb-lesson .iso-plate{overflow:hidden;background:#fbfdff;padding:44px 20px 40px;border-radius:18px;box-shadow:0 0 0 1px #d6dde4,0 12px 30px -12px #2b3a5a33}
.lb-lesson .iso-plate-corners{z-index:2}
.lb-lesson .iso-plate-corner{font-family:inherit;font-size:13px;letter-spacing:.02em;text-transform:none;transition:color .6s}
.lb-lesson[data-night] .iso-plate-corner{color:#d9e1ff}
.lb-piece{transition:transform .6s cubic-bezier(.34,1.56,.64,1) min(calc(var(--i) * 30ms), 1200ms),opacity .3s min(calc(var(--i) * 30ms), 1200ms)}
.lb-piece[data-hidden]{opacity:0;transform:translateY(-34px);transition:none;pointer-events:none}
.lb-wire{fill:none;stroke:#2a2f36;stroke-width:1.1}
.lb-cable{fill:none;stroke:#141414;stroke-width:3.2;stroke-linecap:round;stroke-linejoin:round}
.lb-plug{fill:#141414}
.lb-night{fill:#14204f;mix-blend-mode:multiply;opacity:0;pointer-events:none}
.lb-glow{mix-blend-mode:screen;opacity:0;pointer-events:none}
.lb-stars circle{fill:#fff8d0}
.lb-stars{opacity:0;pointer-events:none}
.lb-sky{cursor:pointer}
.lb-sun circle{fill:#ffd23a;stroke:#e8a400;stroke-width:1.5}
.lb-sun path{stroke:#ffc21a;stroke-width:4;stroke-linecap:round}
.lb-moon{opacity:0}
.lb-moon path{fill:#f4f1d0;stroke:#c9c39a;stroke-width:1}
[data-id="turbine"]{cursor:pointer}
[data-part="blades"] path{fill:#f2f2ee;stroke:#77786f;stroke-width:.9;stroke-linejoin:round}
[data-part="energy"]{pointer-events:none;filter:drop-shadow(0 0 3px #ffd84a)}
[data-id="eye"][data-on] .lb path:not(.lb-edge):not(.lb-crease){fill:#7ff0ff}
.lb-controls{display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin:18px 0 0}
.lb-controls button{font:inherit;font-size:17px;padding:10px 18px;border-radius:12px;border:0;background:#fff;color:#1d2a3a;box-shadow:0 0 0 1px #cfd8e2,0 2px 0 #cfd8e2;cursor:pointer}
.lb-controls button:hover:not(:disabled){background:#fff7d6}
.lb-controls button:disabled{opacity:.4;cursor:default}
.lb-controls [data-action="next"]{background:#ffd23a;box-shadow:0 0 0 1px #e1b100,0 2px 0 #e1b100;font-weight:700}
.lb-controls .lb-spacer{flex:1}
.lb-step{font-size:15px;color:#5b6878;min-width:96px;text-align:center}
.lb-script{display:grid;gap:12px;margin-top:18px}
.lb-say,.lb-ask{margin:0;padding:16px 20px;border-radius:14px;font-size:22px;line-height:1.4;color:#1d2a3a}
.lb-say{background:#fff;box-shadow:0 0 0 1px #d6dde4}
.lb-ask{background:#fff4c6;font-size:19px}
.lb-say::before,.lb-ask::before{display:block;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#7a8696;margin-bottom:4px}
.lb-say::before{content:"Dile"}
.lb-ask::before{content:"Pregúntale"}
.lb-parents{margin-top:6px;font-size:15px;line-height:1.55;color:#4f5c6b}
.lb-parents summary{cursor:pointer;color:#2f5fa8}
.lb-keys{margin-top:14px;font-size:13px;color:#7a8696}
@media (prefers-reduced-motion:reduce){.lb-piece{transition:none}}
`;

const plate = k.plateHtml({
  fig: "Paso 1 de 7",
  title: "¿Cómo llega la luz a la farola?",
  hint: "",
  readout: "",
  body: svg,
});
const page = `<div class="lb-lesson">${plate}
<div class="lb-controls">
  <button data-action="prev">◀ Atrás</button>
  <span class="lb-step" data-step-label>Paso 1 de 7</span>
  <button data-action="next">Siguiente ▶</button>
  <span class="lb-spacer"></span>
  <button data-action="night">🌙 Que sea de noche</button>
  <button data-action="wind">✋ Parar el viento</button>
</div>
<div class="lb-script">
  <p class="lb-say" data-say></p>
  <p class="lb-ask" data-ask></p>
  <details class="lb-parents" open><summary>Para mamá o papá</summary><p data-note></p></details>
</div>
<p class="lb-keys">Teclado: ← → para cambiar de paso · N noche · V viento. También puedes pulsar el sol o el molino.</p>
</div>`;

const html = k.pageHtml({ title: "La farola", theme: "light", body: `<style>${CSS}</style>${page}`, script: kitScript() + live, width: 1040 }).replace('<html lang="en">', '<html lang="es">');
mkdirSync(HERE, { recursive: true });
writeFileSync(join(HERE, "farola.html"), html);
console.log("wrote farola.html", `${(html.length / 1024).toFixed(0)} KB`, `${pieces.length} pieces`);
