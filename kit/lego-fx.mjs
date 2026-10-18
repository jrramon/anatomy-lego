// LEGO effects in WebGL: the counterpart of gl.mjs. A transparent canvas over the lesson's SVG draws
// effects in the same isometric camera: water with moving glints and rain ripples, a flame inside
// a cylinder, puffs of smoke. They are drawn in flat colour bands, like the bricks, not as soft
// photographs. Without WebGL the canvas stays empty and the SVG is still the whole lesson.
//
// Build side: describe the effects with water(), flame() and smoke(), pass them to lessonHtml as
// `fx`. Page side: lesson.fx.level(id, 0..1), lesson.fx.offset(id, [x, y, z]) for an effect that
// rides a moving group, lesson.fx.ripple(id, x, y) for a drop landing on water.

const num = (value) => (Number.isInteger(value) ? `${value}.` : `${value}`);
const vec = (values) => `vec${values.length}(${values.map(num).join(",")})`;
const safe = (id) => id.replace(/[^a-zA-Z0-9]/g, "_");

// Every effect takes `occluders`: boxes [x0, y0, z0, x1, y1, z1] of pieces that stand in front of it
// (a dam beside the water, a pipe in front of a cylinder). The canvas lies over the whole SVG, so
// without them the effect would paint over those pieces. Boxes move with the effect's offset.

// Water lying in a rectangle of the floor plane at height z, in millimetres.
export function water({ id, rect, z, occluders = [] }) {
  return { type: "water", id, rect, z, occluders };
}
// A flame filling a vertical cylinder of radius r around (x, y), between z0 and z1. z0 can be moved
// from the page (the crown of a piston): lesson.fx.set(id, "low", z).
export function flame({ id, at, r, z0, z1, occluders = [] }) {
  return { type: "flame", id, at, r, z0, z1, occluders };
}
// Smoke puffing out of a point and drifting along `drift` (millimetres per puff's life) as it rises.
export function smoke({ id, at, drift = [-14, 2, 30], size = 1, color = [0.8, 0.82, 0.85], occluders = [] }) {
  return { type: "smoke", id, at, drift, size, color, occluders };
}

const PRELUDE = `precision highp float;
uniform vec2 uCanvas;uniform vec2 uView;uniform vec2 uOrigin;uniform float uK;uniform vec4 uCam;uniform float uTime;
vec2 viewOf(vec2 frag){return vec2(frag.x,uCanvas.y-frag.y)*(uView.x/uCanvas.x);}
vec3 towardViewer(){return vec3(uCam.y*uCam.w,uCam.x*uCam.w,uCam.z);}
vec3 rayOf(vec2 vb){vec2 q=(vb-uOrigin)/uK;return vec3(q.x*uCam.x,-q.x*uCam.y,-q.y/uCam.w);}
float pixelOf(){return (uView.x/uCanvas.x)/uK;}
vec3 onFloor(vec2 vb,float h){vec2 q=(vb-uOrigin)/uK;float b=(q.y+h*uCam.w)/uCam.z;return vec3(q.x*uCam.x+b*uCam.y,-q.x*uCam.y+b*uCam.x,h);}
float hash12(vec2 p){vec3 q=fract(vec3(p.xyx)*.1031);q+=dot(q,q.yzx+33.33);return fract((q.x+q.y)*q.z);}
float hash13(vec3 p){p=fract(p*.1031);p+=dot(p,p.zyx+31.32);return fract((p.x+p.y)*p.z);}
float noise2(vec2 p){vec2 i=floor(p);vec2 f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash12(i),hash12(i+vec2(1.,0.)),f.x),mix(hash12(i+vec2(0.,1.)),hash12(i+vec2(1.,1.)),f.x),f.y);}
float noise3(vec3 p){vec3 i=floor(p);vec3 f=fract(p);f=f*f*(3.-2.*f);
  float a=mix(mix(hash13(i),hash13(i+vec3(1.,0.,0.)),f.x),mix(hash13(i+vec3(0.,1.,0.)),hash13(i+vec3(1.,1.,0.)),f.x),f.y);
  float b=mix(mix(hash13(i+vec3(0.,0.,1.)),hash13(i+vec3(1.,0.,1.)),f.x),mix(hash13(i+vec3(0.,1.,1.)),hash13(i+vec3(1.,1.,1.)),f.x),f.y);
  return mix(a,b,f.z);}
float fbm2(vec2 p){float s=0.;float a=.5;for(int i=0;i<4;i++){s+=a*noise2(p);p=p*2.07+vec2(17.1,9.2);a*=.5;}return s/.9375;}
float fbm3(vec3 p){float s=0.;float a=.5;for(int i=0;i<3;i++){s+=a*noise3(p);p=p*2.07+vec3(17.1,9.2,4.7);a*=.5;}return s/.875;}
float window(float x,float a,float b,float soft){return smoothstep(a-soft,a+soft,x)*(1.-smoothstep(b-soft,b+soft,x));}
float bands(float x,float n){return floor(clamp(x,0.,1.)*n+.5)/n;}
vec4 over(vec4 dst,vec4 src){return src+dst*(1.-src.a);}
bool boxHit(vec3 o,vec3 d,vec3 lo,vec3 hi,float t){vec3 a=(lo-o)/d;vec3 b=(hi-o)/d;vec3 n=min(a,b);vec3 f=max(a,b);float tn=max(max(n.x,n.y),n.z);float tf=min(min(f.x,f.y),f.z);return tf>=tn&&tf>t+.05;}
`;

// GLSL that tells whether the point at ray distance t is behind one of the effect's occluders.
function hiddenGlsl(u, occluders, offset) {
  const tests = occluders.map(([x0, y0, z0, x1, y1, z1]) => `if(boxHit(o,d,${vec([x0, y0, z0])}${offset},${vec([x1, y1, z1])}${offset},t))return true;`).join("");
  return `bool hidden_${u}(vec3 o,vec3 d,float t){${tests}return false;}
`;
}

function waterGlsl({ id, rect, z, occluders }) {
  const u = safe(id);
  return `uniform float u_${u}_level;uniform vec4 u_${u}_drops[8];
${hiddenGlsl(u, occluders, "")}vec4 fx_${u}(vec2 vb){
  if(u_${u}_level<=.001)return vec4(0.);
  vec3 p=onFloor(vb,${num(z)});
  {vec3 o=rayOf(vb);vec3 d=towardViewer();if(hidden_${u}(o,d,dot(p-o,d)))return vec4(0.);}
  float soft=pixelOf()*1.5;
  float inside=window(p.x,${num(rect[0])},${num(rect[2])},soft)*window(p.y,${num(rect[1])},${num(rect[3])},soft);
  if(inside<=0.)return vec4(0.);
  vec2 q=p.xy*.075;
  float glint=smoothstep(.6,.66,fbm2(q*vec2(.7,1.9)+vec2(uTime*.2,-uTime*.07)));
  float swell=smoothstep(.55,.6,fbm2(q*.6+vec2(-uTime*.05,uTime*.09)))*.35;
  float ring=0.;
  for(int i=0;i<8;i++){vec4 d=u_${u}_drops[i];if(d.w<=0.)continue;float r=1.+d.z*16.;float dist=length(p.xy-d.xy);ring=max(ring,d.w*exp(-d.z*1.8)*(1.-smoothstep(.5,1.4,abs(dist-r))));}
  float a=max(glint*.7,max(swell,bands(ring,3.)*.85))*inside*u_${u}_level;
  return vec4(vec3(1.)*a,a);
}
`;
}

function flameGlsl({ id, at, r, z0, z1, occluders }) {
  const u = safe(id);
  return `uniform float u_${u}_level;uniform vec3 u_${u}_offset;uniform float u_${u}_low;
${hiddenGlsl(u, occluders, `+u_${u}_offset`)}vec4 fx_${u}(vec2 vb){
  if(u_${u}_level<=.001)return vec4(0.);
  vec3 o=rayOf(vb);vec3 d=towardViewer();
  vec2 c=${vec(at)}+u_${u}_offset.xy;float zlo=u_${u}_low+u_${u}_offset.z;float zhi=${num(z1)}+u_${u}_offset.z;
  vec2 oc=o.xy-c;float A=dot(d.xy,d.xy);float B=2.*dot(oc,d.xy);float C=dot(oc,oc)-${num(r * r)};
  float disc=B*B-4.*A*C;if(disc<0.)return vec4(0.);
  float s=sqrt(disc);float t0=(-B-s)/(2.*A);float t1=(-B+s)/(2.*A);
  float ta=(zlo-o.z)/d.z;float tb=(zhi-o.z)/d.z;
  float lo=max(t0,min(ta,tb));float hi=min(t1,max(ta,tb));
  if(hi<=lo)return vec4(0.);
  float acc=0.;
  for(int i=0;i<6;i++){float t=mix(lo,hi,(float(i)+.5)/6.);vec3 p=o+t*d;float rr=length(p.xy-c)/${num(r)};
    if(hidden_${u}(o,d,t))continue;
    acc+=(1.-rr*rr)*(.55+.9*fbm3(vec3(p.xy*.45,p.z*.3-uTime*4.)));}
  float heat=bands(acc/6.*min(1.,(hi-lo)/${num(r)}*2.5)*1.7*u_${u}_level,4.);
  vec3 col=mix(vec3(1.,.32,.04),vec3(1.,.93,.5),heat);
  return vec4(col*heat,heat*.92);
}
`;
}

function smokeGlsl({ id, at, drift, size, color, occluders }) {
  const u = safe(id);
  return `uniform float u_${u}_level;uniform vec3 u_${u}_offset;
${hiddenGlsl(u, occluders, `+u_${u}_offset`)}vec4 fx_${u}(vec2 vb){
  if(u_${u}_level<=.001)return vec4(0.);
  vec3 o=rayOf(vb);vec3 d=towardViewer();vec3 base=${vec(at)}+u_${u}_offset;
  float a=0.;
  for(int i=0;i<6;i++){float age=fract(uTime*.45+float(i)/6.);vec3 c=base+${vec(drift)}*age;float rad=(2.2+age*7.)*${num(size)};
    vec3 w=c-o;if(hidden_${u}(o,d,dot(w,d)))continue;vec3 perp=w-dot(w,d)*d;float q=length(perp)/rad;
    float puff=exp(-q*q*2.2)*(1.-age)*smoothstep(0.,.12,age)*(.75+.5*fbm3(vec3(perp.xy*.25,uTime*.4+float(i)*3.1)));
    a=max(a,puff);}
  a=bands(a*u_${u}_level*1.3,4.)*.8;
  return vec4(${vec(color)}*a,a);
}
`;
}

const BUILDERS = { water: waterGlsl, flame: flameGlsl, smoke: smokeGlsl };

// The fragment shader for a set of effects, composited in the order given.
export function fxFragment(effects) {
  return PRELUDE + effects.map((effect) => BUILDERS[effect.type](effect)).join("") + `void main(){vec2 vb=viewOf(gl_FragCoord.xy);vec4 c=vec4(0.);${effects.map((effect) => `c=over(c,fx_${safe(effect.id)}(vb));`).join("")}gl_FragColor=c;}`;
}

export function fxCamera(projection) {
  const a = ((projection.azimuth ?? 45) * Math.PI) / 180;
  const e = ((projection.elevation ?? 30) * Math.PI) / 180;
  return { origin: [projection.origin[0], projection.origin[1]], k: projection.scale * Math.sqrt(1.6), cam: [Math.sin(a), Math.cos(a), Math.sin(e), Math.cos(e)] };
}

// Runs in the page: compiles the shader on the canvas over the SVG and draws a frame on request.
// Returns null without WebGL; lesson.mjs then leaves lesson.fx as a harmless stub.
export function fxRuntime({ canvas, fragment, view, camera, effects }) {
  const gl = canvas.getContext("webgl", { premultipliedAlpha: true, alpha: true, antialias: false });
  if (!gl) return null;
  const compile = (type, source) => {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
    console.error(gl.getShaderInfoLog(shader));
    return null;
  };
  const vs = compile(gl.VERTEX_SHADER, "attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}");
  const fs = compile(gl.FRAGMENT_SHADER, fragment);
  if (!vs || !fs) return null;
  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
  gl.useProgram(program);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, "p");
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  const where = (name) => gl.getUniformLocation(program, name);
  const key = (id) => id.replace(/[^a-zA-Z0-9]/g, "_");
  const state = {};
  for (const effect of effects) {
    state[effect.id] = { effect, level: 0, offset: [0, 0, 0], low: effect.z0 ?? 0, drops: Array.from({ length: 8 }, () => [0, 0, 0, 0]), next: 0 };
  }
  let painted = false;
  const controller = {
    ready: true,
    level(id, value) { state[id].level = value; },
    offset(id, value) { state[id].offset = value; },
    set(id, name, value) { state[id][name] = value; },
    ripple(id, x, y) {
      const s = state[id];
      s.drops[s.next] = [x, y, 0, 1];
      s.next = (s.next + 1) % s.drops.length;
    },
    // Draws one frame; returns true while anything is showing, so the lesson keeps animating.
    draw(time, dt) {
      const live = Object.values(state).some((s) => s.level > 0.001);
      if (!live) {
        if (painted) { gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); painted = false; }
        return false;
      }
      const box = canvas.getBoundingClientRect();
      const ratio = Math.min(1.5, window.devicePixelRatio || 1);
      const [w, h] = [Math.max(1, Math.round(box.width * ratio)), Math.max(1, Math.round(box.height * ratio))];
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
      gl.viewport(0, 0, w, h);
      gl.uniform2f(where("uCanvas"), w, h);
      gl.uniform2f(where("uView"), view[0], view[1]);
      gl.uniform2f(where("uOrigin"), camera.origin[0], camera.origin[1]);
      gl.uniform1f(where("uK"), camera.k);
      gl.uniform4f(where("uCam"), ...camera.cam);
      gl.uniform1f(where("uTime"), time % 1000);
      for (const [id, s] of Object.entries(state)) {
        const u = key(id);
        gl.uniform1f(where(`u_${u}_level`), s.level);
        const offset = where(`u_${u}_offset`);
        if (offset) gl.uniform3f(offset, ...s.offset);
        const low = where(`u_${u}_low`);
        if (low) gl.uniform1f(low, s.low);
        const drops = where(`u_${u}_drops`);
        if (drops) {
          s.drops.forEach((drop) => { if (drop[3] > 0) { drop[2] += dt; if (drop[2] > 2.5) drop[3] = 0; } });
          gl.uniform4fv(drops, new Float32Array(s.drops.flat()));
        }
      }
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      painted = true;
      return true;
    },
  };
  return controller;
}

export const FX_CSS = `
.lb-stage{position:relative}
.lb-fx{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
`;
