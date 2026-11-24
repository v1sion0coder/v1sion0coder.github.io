import "@fontsource/syne/400.css";
import "@fontsource/syne/700.css";
import "@fontsource/syne/800.css";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/instrument-serif/400-italic.css";
import "./style.css";
import "./lab.css";

const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// ---- light / dark (shared with the rest of the site) ----
(() => {
  const KEY = "v1-theme";
  let t = (() => { try { return localStorage.getItem(KEY); } catch { return null; } })() || "dark";
  const apply = () => {
    document.documentElement.dataset.theme = t;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", t === "light" ? "#f4efe8" : "#0a0a0b");
  };
  apply();
  document.querySelectorAll(".theme-btn").forEach((b) => b.addEventListener("click", () => {
    t = t === "light" ? "dark" : "light";
    try { localStorage.setItem(KEY, t); } catch {}
    apply();
  }));
})();

// Run a loop only while its element is on screen
function whileVisible(el, tick) {
  let on = false, raf = 0;
  const loop = (now) => { tick(now); if (on) raf = requestAnimationFrame(loop); };
  new IntersectionObserver(([e]) => {
    if (e.isIntersecting && !on) { on = true; raf = requestAnimationFrame(loop); }
    else if (!e.isIntersecting) { on = false; cancelAnimationFrame(raf); }
  }).observe(el);
  if (REDUCED) requestAnimationFrame(tick);
}

function fit(cv) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const r = cv.getBoundingClientRect();
  cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr);
  return dpr;
}

// ---- 01 Liquid light (raw WebGL fragment shader) ----
function liquid(cv) {
  const gl = cv.getContext("webgl", { antialias: false, premultipliedAlpha: false });
  if (!gl) { cv.parentElement.style.background = "radial-gradient(circle at 30% 40%, #ff4d1a, #8a7dff 60%, #111014)"; return; }
  const vs = "attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }";
  const fs = `precision mediump float;
    uniform vec2 r; uniform float t; uniform vec2 m;
    float blob(vec2 uv, vec2 c, float s){ return s / (0.02 + dot(uv - c, uv - c)); }
    void main(){
      vec2 uv = gl_FragCoord.xy / r.y;
      float ar = r.x / r.y;
      vec2 mm = vec2(m.x * ar, m.y);
      float f = 0.0;
      f += blob(uv, vec2(ar * (0.5 + 0.32 * sin(t * 0.37)), 0.5 + 0.28 * cos(t * 0.29)), 0.055);
      f += blob(uv, vec2(ar * (0.5 + 0.30 * cos(t * 0.23 + 1.0)), 0.5 + 0.30 * sin(t * 0.41)), 0.05);
      f += blob(uv, vec2(ar * (0.5 + 0.25 * sin(t * 0.19 + 2.0)), 0.5 + 0.25 * sin(t * 0.33 + 1.5)), 0.045);
      f += blob(uv, mm, 0.06);
      vec3 hot = vec3(1.0, 0.30, 0.10), vio = vec3(0.54, 0.49, 1.0), pink = vec3(1.0, 0.55, 0.78), ink = vec3(0.05, 0.05, 0.07);
      float k = smoothstep(0.5, 6.0, f);
      vec3 col = mix(ink, vio, smoothstep(0.0, 0.5, k));
      col = mix(col, pink, smoothstep(0.35, 0.75, k));
      col = mix(col, hot, smoothstep(0.7, 1.0, k));
      col += 0.04 * sin(uv.y * 400.0 + t) * k;   // faint scan lines
      gl_FragColor = vec4(col, 1.0);
    }`;
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
  const pr = gl.createProgram();
  gl.attachShader(pr, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(pr); gl.useProgram(pr);
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(pr, "p"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const uR = gl.getUniformLocation(pr, "r"), uT = gl.getUniformLocation(pr, "t"), uM = gl.getUniformLocation(pr, "m");
  const m = { x: 0.7, y: 0.6, tx: 0.7, ty: 0.6 };
  cv.addEventListener("pointermove", (e) => { const b = cv.getBoundingClientRect(); m.tx = (e.clientX - b.left) / b.width; m.ty = 1 - (e.clientY - b.top) / b.height; });
  const size = () => { fit(cv); gl.viewport(0, 0, cv.width, cv.height); };
  size(); window.addEventListener("resize", size);
  const t0 = performance.now();
  whileVisible(cv, (now) => {
    m.x += (m.tx - m.x) * 0.06; m.y += (m.ty - m.y) * 0.06;
    gl.uniform2f(uR, cv.width, cv.height); gl.uniform1f(uT, REDUCED ? 3 : (now - t0) / 1000); gl.uniform2f(uM, m.x, m.y);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  });
}

// ---- 02 A menu that falls (tiny 2D physics) ----
function menu(cv) {
  const x = cv.getContext("2d");
  const ITEMS = [["Cinnamon bun", "#ff4d1a"], ["Flat white", "#8a7dff"], ["Rye loaf", "#e7b45a"], ["Croissant", "#ff8fb8"], ["Honey cake", "#f2d27a"], ["Cardamom knot", "#47c2a0"], ["Espresso", "#ede8df"], ["Lemon tart", "#ffd23f"], ["Sourdough", "#c98a3a"], ["Hot chocolate", "#ff6a2b"]];
  let W = 0, H = 0, dpr = 1, items = [];
  const size = () => { dpr = fit(cv); W = cv.width / dpr; H = cv.height / dpr; };
  function drop() {
    x.font = "700 18px Syne, system-ui, sans-serif";
    items = ITEMS.map(([label, col], i) => {
      const w = x.measureText(label).width + 36;
      return { label, col, w, h: 44, x: 40 + Math.random() * Math.max(1, W - w - 80), y: -60 - i * 70, vx: (Math.random() - 0.5) * 2, vy: 0, a: (Math.random() - 0.5) * 0.3, va: 0 };
    });
  }
  size(); drop();
  window.addEventListener("resize", size);
  let grab = null, last = null;
  const pos = (e) => { const b = cv.getBoundingClientRect(); return { x: e.clientX - b.left, y: e.clientY - b.top, t: performance.now() }; };
  cv.addEventListener("pointerdown", (e) => {
    const p = pos(e);
    grab = [...items].reverse().find((it) => Math.abs(p.x - it.x - it.w / 2) < it.w / 2 && Math.abs(p.y - it.y - it.h / 2) < it.h / 2 + 4) || null;
    if (grab) { grab.dx = p.x - grab.x; grab.dy = p.y - grab.y; cv.setPointerCapture(e.pointerId); } else drop();
    last = p;
  });
  cv.addEventListener("pointermove", (e) => {
    if (!grab) return; const p = pos(e);
    const dt = Math.max(16, p.t - last.t);
    grab.vx = (p.x - last.x) / dt * 16; grab.vy = (p.y - last.y) / dt * 16;
    grab.x = p.x - grab.dx; grab.y = p.y - grab.dy; last = p;
  });
  const up = () => { grab = null; };
  cv.addEventListener("pointerup", up); cv.addEventListener("pointercancel", up);

  function step() {
    items.forEach((it) => {
      if (it !== grab) { it.vy += 0.5; it.x += it.vx; it.y += it.vy; it.a += it.va; it.va *= 0.96; }
      it.a = Math.max(-0.22, Math.min(0.22, it.a)) * 0.995;
      if (it.y + it.h > H) { it.y = H - it.h; it.vy *= -0.35; it.vx *= 0.9; it.va += it.vx * 0.002; it.a *= 0.9; }
      if (it.x < 0) { it.x = 0; it.vx *= -0.6; }
      if (it.x + it.w > W) { it.x = W - it.w; it.vx *= -0.6; }
    });
    // simple stacking: push overlapping pills apart (box vs box)
    for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) {
      const a = items[i], b = items[j];
      const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
      const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
      if (ox > 0 && oy > 0) {
        if (oy < ox) {
          const top = a.y < b.y ? a : b, bot = top === a ? b : a;
          if (top !== grab) { top.y -= oy; top.vy = Math.min(top.vy, 0) * 0.3; top.vx *= 0.92; }
          else bot.y += oy;
        } else {
          const l = a.x < b.x ? a : b, r = l === a ? b : a;
          if (l !== grab) l.x -= ox / 2; if (r !== grab) r.x += ox / 2;
          l.vx *= 0.5; r.vx *= 0.5;
        }
      }
    }
  }
  function draw() {
    x.setTransform(dpr, 0, 0, dpr, 0, 0);
    x.fillStyle = "#16130f"; x.fillRect(0, 0, W, H);
    x.font = "700 18px Syne, system-ui, sans-serif"; x.textBaseline = "middle";
    items.forEach((it) => {
      x.save(); x.translate(it.x + it.w / 2, it.y + it.h / 2); x.rotate(it.a);
      x.fillStyle = it.col; x.beginPath(); x.roundRect(-it.w / 2, -it.h / 2, it.w, it.h, it.h / 2); x.fill();
      x.fillStyle = it.col === "#ede8df" || it.col === "#ffd23f" || it.col === "#f2d27a" ? "#16130f" : "#fff";
      x.fillText(it.label, -it.w / 2 + 18, 1);
      x.restore();
    });
  }
  if (REDUCED) { for (let k = 0; k < 400; k++) step(); }
  whileVisible(cv, () => { if (!REDUCED) step(); draw(); });
}

// ---- 03 Type with weight ----
function type(el) {
  const text = el.textContent; el.textContent = "";
  const spans = [...text].map((ch) => { const s = document.createElement("span"); s.textContent = ch === " " ? " " : ch; s.setAttribute("aria-hidden", "true"); el.appendChild(s); return s; });
  if (REDUCED) return;
  const stage = el.parentElement;
  let px = -9999, cur = spans.map(() => 0);
  stage.addEventListener("pointermove", (e) => { px = e.clientX; });
  stage.addEventListener("pointerleave", () => { px = -9999; });
  whileVisible(stage, () => {
    spans.forEach((s, i) => {
      const b = s.getBoundingClientRect();
      const d = Math.abs(px - (b.left + b.width / 2));
      const target = Math.max(0, 1 - d / 220);
      cur[i] += (target - cur[i]) * 0.15;
      const k = cur[i];
      s.style.transform = `scale(${1 + k * 0.18}, ${1 + k * 0.55})`;
      s.style.fontWeight = k > 0.6 ? 800 : k > 0.25 ? 700 : 400;
    });
  });
}

document.querySelectorAll("[data-exp]").forEach((el) => {
  const kind = el.dataset.exp;
  if (kind === "liquid") liquid(el);
  else if (kind === "menu") (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => menu(el));
  else if (kind === "type") type(el);
});
