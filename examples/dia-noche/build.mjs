import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../kit/iso-kit.mjs";
import * as b from "../../kit/brick.mjs";
import * as r from "../../kit/lego-round.mjs";
import * as s from "../../kit/lego-spin.mjs";
import * as fig from "../../kit/lego-figure.mjs";
import * as l from "../../kit/lesson.mjs";
import { auditOrExit } from "../../kit/lego-audit.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const { STUD, PLATE } = b;

const WIDTH = 1000;
const HEIGHT = 600;

// A classroom model on a dark blue board, 32 studs by 16: the Sun on a stand at the back right, the
// Earth on an axle at the front left. The Sun sits square to the camera's line of sight from the
// Earth, so the Earth shows half its day side and half its night side.
const LONG = 32;
const DEEP = 16;
const BOARD = "#1d3466";
const EARTH = [9 * STUD, 10 * STUD];
const EARTH_R = 26;
const SUN = [25 * STUD, 4 * STUD];
const SUN_R = 30;
const CENTRE_Z = 64;
const HOME = { lat: 40, lon: -4 };

const pieces = [];
const add = (step, piece) => pieces.push({ step, ...piece });

// Step 0: the board, the two stands, and a child looking on.
for (let x = 0; x < LONG; x += 16) for (let y = 0; y < DEEP; y += 8) add(0, b.plate({ x, y, w: 16, d: 8, color: BOARD }));
add(0, b.round({ x: SUN[0] / STUD - 2, y: SUN[1] / STUD - 2, z: 1, w: 4, h: 1, color: "dark-gray" }));
for (let level = 0; level < 3; level++) add(0, b.round({ x: SUN[0] / STUD - 1, y: SUN[1] / STUD - 1, z: 2 + level * 3, w: 2, h: 3, color: "dark-gray", studs: false }));
add(0, b.round({ x: EARTH[0] / STUD - 2, y: EARTH[1] / STUD - 2, z: 1, w: 4, h: 1, color: "dark-gray" }));
const AXLE_TOP = CENTRE_Z - EARTH_R;
add(0, b.pipe({ axis: "z", from: 2 * PLATE, to: AXLE_TOP + 1, at: EARTH, r: 1.2, color: "light-gray" }));
add(0, fig.minifig({ x: 17, y: 13.4, z: 1, torso: "green", legs: "blue", hair: "brown" }));

// Step 1: the Sun, a big yellow ball on its stand.
const SUN_Z = 11 * PLATE + SUN_R;
add(1, r.ball({ at: [SUN[0], SUN[1], SUN_Z], r: SUN_R, color: "#ffc21a", steps: 28 }));

// The Earth stands for the audit as a ball on its axle; the page draws it turning.
const earthPiece = { step: 2, kind: "earth", box: b.boxOf(EARTH[0] - EARTH_R, EARTH[1] - EARTH_R, CENTRE_Z - EARTH_R, EARTH[0] + EARTH_R, EARTH[1] + EARTH_R, CENTRE_Z + EARTH_R), overlaps: true, svg: () => "" };
auditOrExit([...pieces, earthPiece]);

// The Earth: a brick-built ball, its faces painted by what lies there: oceans, land, deserts, ice.
// Longitude 0 points along +x at rest, latitude up along +z.
const LAND = [
  [48, -100, 22, 38], [22, -98, 8, 10], [-15, -60, 28, 17], [52, 15, 12, 22], [40, -4, 5, 7], [5, 20, 30, 22], [25, 15, 10, 25],
  [28, 45, 10, 12], [50, 95, 22, 45], [20, 78, 10, 8], [10, 105, 8, 10], [-25, 134, 11, 18], [62, 100, 12, 60],
];
const lonDiff = (a, b) => ((((a - b) % 360) + 540) % 360) - 180;
function groundAt(lat, lon) {
  if (lat > 76 || lat < -68) return "white";
  if (lat > 62 && lat < 82 && Math.abs(lonDiff(lon, -42)) < 22) return "white";
  const land = LAND.some(([la, lo, a, c]) => ((lat - la) / a) ** 2 + (lonDiff(lon, lo) / c) ** 2 < 1);
  if (!land) return "blue";
  if (lat > 14 && lat < 32 && lon > -16 && lon < 50) return "tan";
  return "bright-green";
}
const SPIN0 = (-HOME.lon * Math.PI) / 180 + Math.atan2(SUN[1] - EARTH[1], SUN[0] - EARTH[0]);
const earthFaces = r.revolveFaces(
  Array.from({ length: 19 }, (_, i) => {
    const a = Math.PI - (i / 18) * Math.PI;
    return [Math.cos(a) * EARTH_R, Math.sin(a) * EARTH_R];
  }),
  { at: [EARTH[0], EARTH[1], CENTRE_Z], axis: "z", steps: 36 },
).map((face) => {
  const c = face.points.reduce((sum, p) => [sum[0] + p[0], sum[1] + p[1], sum[2] + p[2]], [0, 0, 0]).map((v) => v / face.points.length);
  const [dx, dy, dz] = [c[0] - EARTH[0], c[1] - EARTH[1], c[2] - CENTRE_Z];
  const lat = (Math.atan2(dz, Math.hypot(dx, dy)) * 180) / Math.PI;
  const lon = ((Math.atan2(dy, dx) - SPIN0) * 180) / Math.PI;
  return { ...face, color: groundAt(lat, lon) };
});
const pin = s.withNormals(b.cylinderFaces(EARTH[0], EARTH[1], 1.2, CENTRE_Z + EARTH_R - 1, CENTRE_Z + EARTH_R + 5, 10));

// Our house in Spain: white walls, a red roof and two windows that light up at night, built in the
// frame of the ground it stands on (up out of the Earth, east and north along it).
const homeLon = (HOME.lon * Math.PI) / 180 + SPIN0;
const homeLat = (HOME.lat * Math.PI) / 180;
const up = [Math.cos(homeLat) * Math.cos(homeLon), Math.cos(homeLat) * Math.sin(homeLon), Math.sin(homeLat)];
const east = [-Math.sin(homeLon), Math.cos(homeLon), 0];
const north = [up[1] * east[2] - up[2] * east[1], up[2] * east[0] - up[0] * east[2], up[0] * east[1] - up[1] * east[0]];
const ground = [EARTH[0] + up[0] * (EARTH_R - 1.2), EARTH[1] + up[1] * (EARTH_R - 1.2), CENTRE_Z + up[2] * (EARTH_R - 1.2)];
const place = ([e, n, h]) => [0, 1, 2].map((i) => ground[i] + east[i] * e + north[i] * n + up[i] * h);
const localBox = (e0, n0, h0, e1, n1, h1) => b.boxFaces(e0, n0, h0, e1, n1, h1).map((poly) => poly.map(([e, n, h]) => place([e, n, h])));
const walls = s.withNormals(localBox(-4, -3.5, 0, 4, 3.5, 6.5));
const roof = s.withNormals(b.extrudeFaces([[-4.8, 6.5], [4.8, 6.5], [0, 10.5]], "y", -4.2, 4.2).map((poly) => poly.map(([e, n, h]) => place([e, n, h]))));
const windowPane = (e0, e1, n) => ({ points: [[e0, n, 2.4], [e1, n, 2.4], [e1, n, 4.8], [e0, n, 4.8]].map(place), normal: n > 0 ? north : north.map((v) => -v), lamp: true, color: "#2b4a6b" });
const eastWindow = { points: [[4.05, -1.5, 2.4], [4.05, 1.5, 2.4], [4.05, 1.5, 4.8], [4.05, -1.5, 4.8]].map(place), normal: east, lamp: true, color: "#2b4a6b" };
const houseMeshes = [
  { color: "white", faces: walls, name: "home" },
  { color: "red", faces: roof, name: "home" },
  { color: "#2b4a6b", name: "home", faces: [windowPane(-2.6, -0.4, 3.55), windowPane(0.6, 2.8, 3.55), windowPane(-2.6, -0.4, -3.55), eastWindow] },
];

const SUN_AT = [SUN[0], SUN[1], SUN_Z];
const spins = {
  earth: s.spinData([{ color: "blue", faces: earthFaces }, { color: "light-gray", faces: pin }, ...houseMeshes], { pivot: [EARTH[0], EARTH[1], CENTRE_Z], sun: SUN_AT }),
};

const P = k.fitProjection(
  [...k.boxCorners({ x: 0, y: 0, w: LONG * STUD, d: DEEP * STUD, r: 0 }, 0, PLATE), [SUN[0], SUN[1], SUN_Z + SUN_R + 14], [EARTH[0], EARTH[1], CENTRE_Z + EARTH_R + 8]],
  WIDTH,
  HEIGHT,
  { pad: 40, azimuth: 55 },
);
const at = (point) => k.iso(point, P);
const { k: scale } = k.cameraOf(P);

// Sunlight: yellow pieces flying from the Sun to the half of the Earth that faces it.
const toSun = (() => {
  const d = [SUN_AT[0] - EARTH[0], SUN_AT[1] - EARTH[1], SUN_AT[2] - CENTRE_Z];
  const length = Math.hypot(...d);
  return d.map((v) => v / length);
})();
const side = [-toSun[1], toSun[0], 0].map((v) => v / Math.hypot(toSun[0], toSun[1]));
const rays = [[-0.7, 0.2], [-0.35, -0.35], [0, 0.45], [0.35, -0.2], [0.7, 0.3], [0.05, -0.75], [-0.1, 0.05]].map(([u, v]) => {
  const across = [side[0] * u * EARTH_R, side[1] * u * EARTH_R, v * EARTH_R];
  const depth = Math.sqrt(Math.max(0, 1 - u * u - v * v)) * EARTH_R;
  const hit = [0, 1, 2].map((i) => [EARTH[0], EARTH[1], CENTRE_Z][i] + across[i] + toSun[i] * (depth + 1));
  const start = [0, 1, 2].map((i) => SUN_AT[i] + across[i] * 0.6 - toSun[i] * (SUN_R - 2));
  return [start, hit];
});

const [sx, sy] = at(SUN_AT);
const stars = [[60, 50], [150, 120], [250, 40], [380, 90], [470, 30], [560, 110], [690, 60], [820, 140], [930, 50], [880, 260], [70, 300], [110, 470], [940, 420]]
  .map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="${i % 3 ? 1.2 : 1.9}"/>`)
  .join("");

const body = [
  `<defs><radialGradient id="sun-glow"><stop offset=".55" stop-color="#ffd23a" stop-opacity=".55"/><stop offset="1" stop-color="#ffb000" stop-opacity="0"/></radialGradient>${l.tokenDef("light", P, { color: "#ffe066", r: 1.5, h: 1 })}</defs>`,
  `<g class="lb-stars">${stars}</g>`,
  `<g class="lb-piece" data-step="1" style="--i:0"><circle cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="${(SUN_R * 1.9 * scale).toFixed(1)}" fill="url(#sun-glow)"/></g>`,
  `<g class="lb-scene">${b.sceneSvg(pieces, P)}</g>`,
  `<g class="lb-piece" data-step="2" style="--i:1" data-id="earth">${s.spinSvg("earth")}</g>`,
  `<g data-part="tokens"></g>`,
];

const svg = l.lessonSvg({
  width: WIDTH,
  height: HEIGHT,
  label: "Una maqueta de LEGO sobre una placa azul oscuro: a la derecha, el Sol, una gran bola amarilla; a la izquierda, la Tierra de ladrillos, con océanos y continentes, que gira sobre un eje. En España hay una casita cuyas ventanas se encienden cuando allí es de noche.",
  body,
});

const STEPS = [
  {
    say: "¡Vamos a construir el Sol y la Tierra con LEGO!",
    ask: "¿Tú sabes por qué por la noche está oscuro?",
    note: "Es una maqueta, como las de clase. Los tamaños no son reales: el Sol es 109 veces más ancho que la Tierra y está a unos 150 millones de kilómetros.",
  },
  {
    say: "Este es el Sol. Es una bola de fuego gigante que nos da luz y calor.",
    ask: "¿De qué color es el Sol? ¿Se puede mirar directamente? (¡No, que hace daño a los ojos!)",
    note: "El Sol es una estrella, una bola enorme de gas muy caliente. Su luz tarda unos 8 minutos en llegar hasta nosotros.",
  },
  {
    say: "Esta es la Tierra, donde vivimos. La luz del Sol solo llega a la mitad que lo está mirando.",
    ask: "¿Qué mitad está iluminada? ¿Y cuál está a oscuras?",
    note: "La Tierra es casi una esfera, así que el Sol solo puede iluminar la mitad que tiene de frente. En la otra mitad es de noche.",
  },
  {
    say: "Aquí, en España, está nuestra casa. Ahora mira hacia el Sol: ¡es de día!",
    ask: "¿Encuentras nuestra casa? ¿De qué color es el tejado?",
    note: "La maqueta no tiene la inclinación del eje de la Tierra (unos 23 grados), que es la que causa las estaciones. Para entender el día y la noche no hace falta.",
  },
  {
    say: "La Tierra da vueltas como una peonza. Cuando nuestra casa deja de mirar al Sol… ¡se hace de noche y encendemos las luces!",
    ask: "¿Se han encendido las ventanas? ¿Y cuándo vuelve a ser de día?",
    note: "Es la Tierra la que gira, no el Sol el que da vueltas a nuestro alrededor. Por eso el Sol parece salir por el este y ponerse por el oeste.",
  },
  {
    say: "Una vuelta entera tarda un día. Por eso cada día hay mañana, tarde y noche.",
    ask: "¿Qué haces tú por la mañana? ¿Y por la noche?",
    note: "Una vuelta dura unas 24 horas. Cuando en España es mediodía, en Australia, al otro lado, es de noche.",
  },
  {
    say: "¡Ahora te toca a ti! Gira la Tierra con el ratón y haz que en casa sea de día o de noche.",
    ask: "¿Puedes poner nuestra casa justo enfrente del Sol? ¿Qué hora será allí?",
    note: "Además de girar sobre sí misma, la Tierra da una vuelta alrededor del Sol que dura un año. Eso lo dejamos para otra lección.",
  },
].map((step) => ({ ...step, night: null }));

const script = `
const RAYS = ${JSON.stringify(rays)};
const UP = ${JSON.stringify(up)}, HOME = ${JSON.stringify(ground)};
const svg = document.querySelector(".lb-lesson svg");
const earth = lesson.spin("earth");
const light = RAYS.map((pts) => lesson.route(pts, { token: "#light", gap: 22, speed: 70 }));
const state = { angle: 0, rate: 0, running: false, dragging: null, target: null };
const DAY = 12;
const hourOf = () => {
  const t = (((state.angle / (Math.PI * 2)) % 1) + 1) % 1;
  return (12 + t * 24) % 24;
};
const toggle = () => { if (lesson.step >= 4) { state.running = !state.running; state.target = null; } };
const noon = () => { if (lesson.step >= 4) { state.running = false; state.target = Math.round(state.angle / (Math.PI * 2)) * Math.PI * 2; } };
lesson.onStep((step) => {
  earth.show("home", step >= 3);
  state.running = step >= 4 && step <= 5;
  state.target = step < 4 ? 0 : null;
  if (step < 4) state.angle = 0;
});
const runButton = lesson.button("spin", toggle, () => (state.running ? "⏸ Parar la Tierra" : "▶ Hacer girar"));
const noonButton = lesson.button("noon", noon, () => "🏠 Casa al sol");
lesson.key("g", toggle);
svg.addEventListener("pointerdown", (event) => { if (lesson.step < 6 || !event.target.closest('[data-id="earth"]')) return; state.dragging = event.clientX; state.running = false; state.target = null; svg.setPointerCapture(event.pointerId); lesson.kick(); });
svg.addEventListener("pointermove", (event) => { if (state.dragging === null) return; state.angle -= (event.clientX - state.dragging) * 0.012; state.dragging = event.clientX; lesson.kick(); });
svg.addEventListener("pointerup", () => { state.dragging = null; });

lesson.every((dt) => {
  const s = lesson.step;
  state.rate = lesson.ease(state.rate, state.running ? (Math.PI * 2) / DAY : 0, dt, 0.6);
  if (state.rate < 1e-4) state.rate = 0;
  state.angle += state.rate * dt;
  if (state.target !== null) {
    state.angle = lesson.ease(state.angle, state.target, dt, 0.4);
    if (Math.abs(state.angle - state.target) < 1e-3) { state.angle = state.target; state.target = null; }
  }
  earth.set(state.angle);
  light.forEach((route) => (route.level = s >= 2 ? 1 : 0));
  runButton.disabled = s < 4;
  noonButton.disabled = s < 4;
  return s >= 2;
});

lesson.readout(() => {
  if (lesson.step < 3) return "";
  const day = earth.lit(HOME, UP);
  const hour = hourOf();
  const clock = String(Math.floor(hour)).padStart(2, "0") + ":" + String(Math.floor((hour % 1) * 60 / 15) * 15).padStart(2, "0");
  const words = day > 0.85 ? "☀️ en casa es de día" : day > 0.15 ? (hour < 12 ? "🌅 en casa amanece" : "🌇 en casa atardece") : "🌙 en casa es de noche";
  return words + (lesson.step >= 5 ? "  ·  🕒 " + clock : "");
});
`;

const CSS = `
.lb-lesson .iso-plate{background:#0d1633;box-shadow:0 0 0 1px #24305a,0 12px 30px -12px #2b3a5a55}
.lb-lesson .iso-plate-corner{color:#c9d3f2}
.lb-stars circle{fill:#fff8d0;opacity:.85}
.lb-stars{opacity:1}
[data-id="earth"]{cursor:grab}
`;

const html = l.lessonHtml({
  title: "¿Por qué hay día y noche?",
  svg,
  steps: STEPS,
  projection: P,
  buttons: [
    { action: "noon", label: "🏠 Casa al sol" },
    { action: "spin", label: "▶ Hacer girar" },
  ],
  keys: "G girar · en el último paso puedes arrastrar la Tierra con el ratón",
  script,
  css: CSS,
  spins,
});
mkdirSync(HERE, { recursive: true });
writeFileSync(join(HERE, "dia-noche.html"), html);
console.log("wrote dia-noche.html", `${(html.length / 1024).toFixed(0)} KB`, `${pieces.length} pieces + the Earth`);
