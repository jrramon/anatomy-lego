import { cameraOf, figureSvg, iso, pageHtml, plateHtml } from "./iso-kit.mjs";
import { BRICK_CSS, studSvg } from "./brick.mjs";
import { kitScript } from "../scripts/inline-kit.mjs";

// A LEGO lesson: one scene that builds up step by step while a grown-up tells the story.
// Each step is { say, ask, note, night }: what to say out loud, what to ask the child, a true
// note for the grown-up, and whether the step is at night (true), by day (false) or either (null).

const escape = (text) => String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// A travelling token: a glowing round plate drawn once at the world origin, moved by translate.
export function tokenDef(id, projection, { color = "#ffd83a", r = 3, h = 1.8 } = {}) {
  return `<g id="${id}">${studSvg(0, 0, -h / 2, color, projection, { r, h })}</g>`;
}

// The sky: a sun that becomes a moon, stars that come out, and a dark wash over the scene.
// Put skyBack() before the scene's overlays you want darkened, and skyFront() after.
export function nightSvg(width, height) {
  return `<rect class="lb-night" x="-600" y="-600" width="${width + 1200}" height="${height + 1200}"/>`;
}
export function skySvg(width, { at = [width - 80, 74], stars } = {}) {
  const [x, y] = at;
  const rays = Array.from({ length: 10 }, (_, i) => {
    const a = (i / 10) * Math.PI * 2;
    return `<path d="M${(Math.cos(a) * 26).toFixed(1)} ${(Math.sin(a) * 26).toFixed(1)}L${(Math.cos(a) * 36).toFixed(1)} ${(Math.sin(a) * 36).toFixed(1)}"/>`;
  }).join("");
  const points = stars ?? [[90, 60], [180, 30], [300, 80], [420, 40], [560, 70], [680, 30], [780, 110], [860, 170], [500, 140], [240, 150]];
  return `<g class="lb-sky" data-sky role="button" aria-label="Día o noche">
  <g class="lb-sun" transform="translate(${x} ${y})">${rays}<circle r="19"/></g>
  <g class="lb-moon" transform="translate(${x} ${y})"><path d="M6 -20a20 20 0 1 0 14 30a16 16 0 1 1 -14 -30z"/></g>
  <circle r="40" cx="${x}" cy="${y}" fill="transparent"/>
</g><g class="lb-stars">${points.map(([sx, sy], i) => `<circle cx="${sx}" cy="${sy}" r="${i % 3 ? 1.4 : 2}"/>`).join("")}</g>`;
}

// A soft glow: a halo at a point and a pool of light on the floor below it. Goes in a
// <g class="lb-glow" data-glow="name"> whose opacity the lesson drives.
export function glowSvg(projection, [x, y, z], floorZ, { halo = 16, pool = 34 } = {}) {
  const { k, sinE } = cameraOf(projection);
  const [bx, by] = iso([x, y, z], projection);
  const [gx, gy] = iso([x, y, floorZ], projection);
  return `<ellipse cx="${gx.toFixed(1)}" cy="${gy.toFixed(1)}" rx="${(pool * k).toFixed(1)}" ry="${(pool * k * sinE).toFixed(1)}" fill="url(#lb-pool)"/><circle cx="${bx.toFixed(1)}" cy="${by.toFixed(1)}" r="${(halo * k).toFixed(1)}" fill="url(#lb-halo)"/>`;
}
export const GLOW_DEFS = `<radialGradient id="lb-halo"><stop offset="0" stop-color="#fff6c2"/><stop offset=".35" stop-color="#ffd84a" stop-opacity=".75"/><stop offset="1" stop-color="#ffb800" stop-opacity="0"/></radialGradient><radialGradient id="lb-pool"><stop offset="0" stop-color="#ffe27a" stop-opacity=".9"/><stop offset=".6" stop-color="#ffc93a" stop-opacity=".35"/><stop offset="1" stop-color="#ffb800" stop-opacity="0"/></radialGradient>`;

export function lessonSvg({ width, height, label, body }) {
  return figureSvg({ width, height, label, body });
}

// The page: the card, the step buttons, the lesson's own buttons, and the three texts.
export function lessonHtml({ title, svg, steps, buttons = [], keys = "", projection, script = "", css = "" }) {
  const total = steps.length;
  const plate = plateHtml({ fig: `Paso 1 de ${total}`, title, hint: "", readout: "", body: svg });
  const extra = buttons.map((button) => `<button data-action="${escape(button.action)}">${escape(button.label)}</button>`).join("");
  const page = `<div class="lb-lesson">${plate}
<div class="lb-controls">
  <button data-action="prev">◀ Atrás</button>
  <span class="lb-step" data-step-label>Paso 1 de ${total}</span>
  <button data-action="next">Siguiente ▶</button>
  <span class="lb-spacer"></span>${extra}
</div>
<div class="lb-script">
  <p class="lb-say" data-say></p>
  <p class="lb-ask" data-ask></p>
  <details class="lb-parents" open><summary>Para mamá o papá</summary><p data-note></p></details>
</div>
<p class="lb-keys">Teclado: ← → para cambiar de paso${keys ? ` · ${escape(keys)}` : ""}.</p>
</div>`;
  const runtime = `${kitScript()}\nconst lesson = (${lessonRuntime.toString()})(${JSON.stringify({ steps, projection })});\n${script}\nlesson.start();`;
  return pageHtml({ title, theme: "light", body: `<style>${BRICK_CSS}${LESSON_CSS}${css}</style>${page}`, script: runtime, width: 1040 }).replace('<html lang="en">', '<html lang="es">');
}

// Runs in the page. It owns the steps, the sky and the frame loop, and moves tokens along routes.
// A lesson script uses it like this:
//   lesson.onStep((step) => …)               called whenever the step changes
//   lesson.button("wind", () => …, () => "label")  wires a button from `buttons`, label refreshed per frame
//   lesson.key("v", () => …)                 a keyboard shortcut
//   lesson.click('[data-id="turbine"]', () => …)  a click on part of the drawing
//   lesson.route(points, { token: "#e-big", gap, speed })  tokens riding a polyline; set route.level 0..1
//   lesson.every((dt) => stillMoving)        per-frame work; return true while it needs more frames
//   lesson.readout(() => "text")             the live line at the bottom right of the card
//   lesson.night, lesson.dark                the wanted sky (boolean) and the eased darkness (0..1)
//   lesson.ease(from, to, dt, tau)           exponential follow that respects reduced motion
function lessonRuntime({ steps, projection }) {
  const root = document.querySelector(".lb-lesson");
  const svg = root.querySelector("svg");
  const still = matchMedia("(prefers-reduced-motion: reduce)");
  const pieces = [...svg.querySelectorAll(".lb-piece")];
  const sky = {
    night: svg.querySelector(".lb-night"),
    stars: svg.querySelector(".lb-stars"),
    sun: svg.querySelector(".lb-sun"),
    moon: svg.querySelector(".lb-moon"),
  };
  const ui = {
    step: root.querySelector("[data-step-label]"),
    corner: root.querySelector('[data-corner="fig"]'),
    say: root.querySelector("[data-say]"),
    ask: root.querySelector("[data-ask]"),
    note: root.querySelector("[data-note]"),
    prev: root.querySelector('.lb-controls [data-action="prev"]'),
    next: root.querySelector('.lb-controls [data-action="next"]'),
    readout: root.querySelector("[data-readout]"),
  };
  const NS = "http://www.w3.org/2000/svg";
  const origin = iso([0, 0, 0], projection);
  const stepFns = [];
  const frameFns = [];
  const labels = [];
  const routes = [];
  let readoutFn = null;
  let frame = 0;
  let last = 0;

  const lesson = {
    step: 0,
    night: false,
    dark: 0,
    ease: (from, to, dt, tau) => (still.matches ? to : from + (to - from) * (1 - Math.exp(-dt / tau))),
    onStep(fn) { stepFns.push(fn); },
    every(fn) { frameFns.push(fn); },
    readout(fn) { readoutFn = fn; },
    button(action, fn, label) {
      const node = root.querySelector(`.lb-controls [data-action="${action}"]`);
      node.addEventListener("click", () => { fn(); lesson.kick(); });
      if (label) labels.push([node, label]);
      return node;
    },
    key(key, fn) {
      document.addEventListener("keydown", (event) => {
        if (event.key.toLowerCase() === key.toLowerCase()) { fn(); lesson.kick(); }
      });
    },
    click(selector, fn) {
      svg.addEventListener("click", (event) => {
        if (event.target.closest(selector)) { fn(); lesson.kick(); }
      });
    },
    toggleNight() { lesson.night = !lesson.night; lesson.kick(); },
    route(points, { token, gap = 24, speed = 40, layer } = {}) {
      const lengths = [0];
      for (let i = 1; i < points.length; i++) lengths.push(lengths[i - 1] + Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1], points[i][2] - points[i - 1][2]));
      const length = lengths[lengths.length - 1];
      const host = layer ?? svg.querySelector('[data-part="tokens"]');
      const nodes = Array.from({ length: Math.ceil(length / gap) }, () => {
        const use = document.createElementNS(NS, "use");
        use.setAttribute("href", token);
        use.setAttribute("opacity", "0");
        host.appendChild(use);
        return use;
      });
      const at = (s) => {
        let i = 1;
        while (i < points.length - 1 && lengths[i] < s) i++;
        const t = Math.max(0, Math.min(1, (s - lengths[i - 1]) / (lengths[i] - lengths[i - 1] || 1)));
        const [a, b] = [points[i - 1], points[i]];
        return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
      };
      const route = { level: 0, offset: 0, gap, speed, length, nodes, at };
      routes.push(route);
      return route;
    },
    setStep(next) {
      lesson.step = Math.max(0, Math.min(steps.length - 1, next));
      const step = steps[lesson.step];
      if (step.night === true || step.night === false) lesson.night = step.night;
      pieces.forEach((piece) => piece.toggleAttribute("data-hidden", Number(piece.dataset.step) > lesson.step));
      ui.step.textContent = `Paso ${lesson.step + 1} de ${steps.length}`;
      ui.corner.textContent = ui.step.textContent;
      ui.say.textContent = step.say;
      ui.ask.textContent = step.ask;
      ui.note.textContent = step.note;
      ui.prev.disabled = lesson.step === 0;
      ui.next.disabled = lesson.step === steps.length - 1;
      root.dataset.step = String(lesson.step);
      stepFns.forEach((fn) => fn(lesson.step));
      lesson.kick();
    },
    kick() {
      if (!frame) { last = 0; frame = requestAnimationFrame(tick); }
    },
    start() {
      ui.prev.addEventListener("click", () => lesson.setStep(lesson.step - 1));
      ui.next.addEventListener("click", () => lesson.setStep(lesson.step + 1));
      document.addEventListener("keydown", (event) => {
        if (event.target.closest && event.target.closest("button, input, summary")) return;
        if (event.key === "ArrowRight" || event.key === " ") { event.preventDefault(); lesson.setStep(lesson.step + 1); }
        else if (event.key === "ArrowLeft") lesson.setStep(lesson.step - 1);
      });
      if (sky.sun) {
        lesson.click("[data-sky]", () => lesson.toggleNight());
        lesson.key("n", () => lesson.toggleNight());
      }
      document.addEventListener("visibilitychange", () => lesson.kick());
      const first = Number(new URLSearchParams(location.search).get("paso"));
      lesson.setStep(first ? first - 1 : 0);
    },
  };

  function tick(now) {
    const dt = last ? Math.min((now - last) / 1000, 1 / 20) : 1 / 60;
    last = now;
    const want = lesson.night ? 1 : 0;
    lesson.dark = lesson.ease(lesson.dark, want, dt, 0.7);
    if (Math.abs(lesson.dark - want) < 0.001) lesson.dark = want;
    let moving = lesson.dark !== want;
    if (sky.night) {
      sky.night.style.opacity = (lesson.dark * 0.72).toFixed(3);
      sky.stars.style.opacity = lesson.dark.toFixed(3);
      sky.sun.style.opacity = (1 - lesson.dark).toFixed(3);
      sky.moon.style.opacity = lesson.dark.toFixed(3);
      root.toggleAttribute("data-night", lesson.dark > 0.5);
    }
    for (const fn of frameFns) if (fn(dt, now)) moving = true;
    for (const route of routes) {
      if (route.level > 0.001) moving = true;
      route.offset = (route.offset + route.speed * route.level * dt) % route.gap;
      route.nodes.forEach((node, i) => {
        const s = route.offset + i * route.gap;
        const alpha = Math.max(0, Math.min(1, Math.min(s, route.length - s) / 8)) * route.level;
        if (alpha < 0.02 || s > route.length) {
          if (node.getAttribute("opacity") !== "0") node.setAttribute("opacity", "0");
          return;
        }
        const [x, y] = iso(route.at(s), projection);
        node.setAttribute("transform", `translate(${(x - origin[0]).toFixed(2)} ${(y - origin[1]).toFixed(2)})`);
        node.setAttribute("opacity", alpha.toFixed(2));
      });
    }
    if (readoutFn) {
      const text = readoutFn();
      if (ui.readout.textContent !== text) ui.readout.textContent = text;
    }
    labels.forEach(([node, label]) => {
      const text = label();
      if (node.textContent !== text) node.textContent = text;
    });
    frame = moving && !document.hidden ? requestAnimationFrame(tick) : 0;
  }
  return lesson;
}

export const LESSON_CSS = `
body{background:#eef3f7;font-family:ui-rounded,"SF Pro Rounded","Nunito",system-ui,sans-serif}
.lb-lesson .iso-plate{overflow:hidden;background:#fbfdff;padding:44px 20px 40px;border-radius:18px;box-shadow:0 0 0 1px #d6dde4,0 12px 30px -12px #2b3a5a33}
.lb-lesson .iso-plate-corners{z-index:2}
.lb-lesson .iso-plate-corner{font-family:inherit;font-size:13px;letter-spacing:.02em;text-transform:none;transition:color .6s}
.lb-lesson[data-night] .iso-plate-corner{color:#d9e1ff}
.lb-piece{transition:transform .6s cubic-bezier(.34,1.56,.64,1) min(calc(var(--i) * 30ms), 1200ms),opacity .3s min(calc(var(--i) * 30ms), 1200ms)}
.lb-piece[data-hidden]{opacity:0;transform:translateY(-34px);transition:none;pointer-events:none}
.lb-night{fill:#14204f;mix-blend-mode:multiply;opacity:0;pointer-events:none}
.lb-glow{mix-blend-mode:screen;opacity:0;pointer-events:none}
.lb-stars circle{fill:#fff8d0}
.lb-stars{opacity:0;pointer-events:none}
.lb-sky{cursor:pointer}
.lb-sun circle{fill:#ffd23a;stroke:#e8a400;stroke-width:1.5}
.lb-sun path{stroke:#ffc21a;stroke-width:4;stroke-linecap:round}
.lb-moon{opacity:0}
.lb-moon path{fill:#f4f1d0;stroke:#c9c39a;stroke-width:1}
[data-part="tokens"]{pointer-events:none;filter:drop-shadow(0 0 3px #ffd84a)}
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
