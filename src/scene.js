import {
  WebGLRenderer, Scene, PerspectiveCamera, Group, Shape, ExtrudeGeometry, Mesh,
  MeshStandardMaterial, MeshPhysicalMaterial, TorusGeometry, SphereGeometry, ShaderMaterial,
  PointLight, DirectionalLight, AmbientLight, PMREMGenerator, BufferGeometry, Float32BufferAttribute,
  Points, PointsMaterial, Color, ACESFilmicToneMapping, SRGBColorSpace, AdditiveBlending, MathUtils,
} from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

const HOT = new Color("#ff4d1a");

export function createScene(canvas, { reducedMotion = false } = {}) {
  const isSmall = Math.min(window.innerWidth, window.innerHeight) < 700;
  const renderer = new WebGLRenderer({ canvas, antialias: !isSmall, alpha: false, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, isSmall ? 1.5 : 1.75));
  renderer.setClearColor(0x0a0a0b, 1);
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = SRGBColorSpace;

  const scene = new Scene();
  const camera = new PerspectiveCamera(32, 1, 0.1, 100);
  camera.position.set(0, 0, 18);

  const pmrem = new PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();

  scene.add(new AmbientLight(0xffffff, 0.15));
  const key = new DirectionalLight(0xfff1e0, 1.6);
  key.position.set(-6, 8, 10);
  scene.add(key);
  const rim = new PointLight(HOT, 120, 30, 1.6);
  rim.position.set(0, 0, -2.5);
  scene.add(rim);

  // ---------- Aperture ----------
  const rig = new Group();
  scene.add(rig);
  const aperture = new Group();
  rig.add(aperture);

  const R = 4;
  const N = 9;
  const blade = new Shape();
  blade.moveTo(0.35, -0.55);
  blade.quadraticCurveTo(-1.5, -1.05, -3.55, 0.25);
  blade.quadraticCurveTo(-1.6, 0.35, 0.35, 1.75);
  blade.lineTo(0.35, -0.55);
  const bladeGeo = new ExtrudeGeometry(blade, {
    depth: 0.06, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 2, curveSegments: isSmall ? 14 : 24,
  });
  const bladeMat = new MeshStandardMaterial({ color: 0x1b1b1f, metalness: 1, roughness: 0.32, envMapIntensity: 1.1 });
  const blades = [];
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    const holder = new Group();
    holder.position.set(Math.cos(a) * R, Math.sin(a) * R, i * 0.012);
    holder.rotation.z = a;
    const m = new Mesh(bladeGeo, bladeMat);
    holder.add(m);
    aperture.add(holder);
    blades.push(m);
  }

  const housingMat = new MeshStandardMaterial({ color: 0x141416, metalness: 1, roughness: 0.22 });
  const housing = new Mesh(new TorusGeometry(R + 0.75, 0.42, isSmall ? 20 : 36, isSmall ? 90 : 160), housingMat);
  housing.position.z = 0.05;
  aperture.add(housing);

  const ringMat = new MeshStandardMaterial({ color: 0x2a2a2e, metalness: 1, roughness: 0.15 });
  const ring2 = new Mesh(new TorusGeometry(R + 1.75, 0.025, 8, 200), ringMat);
  const ring3 = new Mesh(new TorusGeometry(R + 2.35, 0.012, 8, 220), new MeshStandardMaterial({ color: HOT, emissive: HOT, emissiveIntensity: 1.4 }));
  ring3.scale.set(1, 1, 1);
  rig.add(ring2, ring3);

  // glass lens floating in front
  const lens = new Mesh(
    new SphereGeometry(1, isSmall ? 32 : 48, isSmall ? 16 : 24),
    new MeshPhysicalMaterial({ color: 0xffffff, metalness: 0, roughness: 0.05, transmission: 0, transparent: true, opacity: 0.045, clearcoat: 1, envMapIntensity: 2 }),
  );
  lens.scale.set(R - 0.2, R - 0.2, 0.35);
  lens.position.z = 0.6;
  rig.add(lens);

  // ---------- Core (the "eye") ----------
  const NOISE = /* glsl */ `
    float h21(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
    float vnoise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
      return mix(mix(h21(i), h21(i+vec2(1,0)), f.x), mix(h21(i+vec2(0,1)), h21(i+vec2(1,1)), f.x), f.y); }
    float fbm(vec2 p){ float v=0.0, a=0.5; for(int i=0;i<5;i++){ v+=a*vnoise(p); p*=2.03; a*=0.5; } return v; }`;
  const coreMat = new ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uOpen: { value: 0 } },
    vertexShader: /* glsl */ `
      varying vec3 vN; varying vec3 vP; varying vec3 vView;
      void main(){
        vN = normalize(normalMatrix * normal);
        vP = position;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vView = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      varying vec3 vN; varying vec3 vP; varying vec3 vView;
      uniform float uTime; uniform float uOpen;
      ${NOISE}
      void main(){
        vec2 q = vP.xy / 1.6;                 // -1..1 across the iris
        float r = length(q);
        float a = atan(q.y, q.x);
        float pupilR = mix(0.30, 0.17, uOpen) + sin(uTime*0.9)*0.008;
        // radial fibres + crypts
        float fib = fbm(vec2(a*9.0, r*3.0 - uTime*0.05));
        float fib2 = fbm(vec2(a*26.0 + fib*2.0, r*10.0));
        float streak = pow(fib2, 1.6);
        vec3 deep = vec3(0.55, 0.08, 0.02);
        vec3 hot = vec3(1.0, 0.33, 0.08);
        vec3 gold = vec3(1.0, 0.72, 0.38);
        float t = smoothstep(pupilR, 0.95, r);
        vec3 col = mix(gold, hot, smoothstep(0.0, 0.55, t));
        col = mix(col, deep, smoothstep(0.55, 1.0, t));
        col *= 0.55 + 0.9*streak;
        // collarette ring near the pupil, glowing
        float coll = exp(-pow((r - pupilR*1.7)/0.05, 2.0));
        col += gold * coll * (0.6 + 0.4*fib);
        // pulsing rings
        col += hot * 0.12 * (0.5+0.5*sin(r*40.0 - uTime*2.4)) * (1.0 - t);
        // dark limbal ring at the edge
        col *= 1.0 - smoothstep(0.82, 0.98, r) * 0.85;
        // pupil with soft edge and inner depth
        float pup = smoothstep(pupilR + 0.015, pupilR - 0.01, r);
        vec3 pupCol = vec3(0.012, 0.008, 0.01) + hot * 0.06 * smoothstep(0.0, pupilR, r);
        col = mix(col, pupCol, pup);
        // fresnel rim + specular glints
        float fr = pow(1.0 - max(dot(vN, vView), 0.0), 2.5);
        col = mix(col, vec3(0.03), fr * 0.9);
        float spec = smoothstep(0.06, 0.0, length(q - vec2(-0.32, 0.36))) + 0.5*smoothstep(0.025, 0.0, length(q - vec2(0.22, -0.18)));
        col += vec3(1.0, 0.95, 0.9) * spec;
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const core = new Mesh(new SphereGeometry(1.6, isSmall ? 64 : 96, isSmall ? 40 : 64), coreMat);
  core.position.z = -1.6;
  rig.add(core);

  // ---------- Stars ----------
  const count = isSmall ? 1400 : 4200;
  const pos = new Float32Array(count * 3), size = new Float32Array(count), phase = new Float32Array(count), tint = new Float32Array(count * 3);
  const palette = [[1, 0.97, 0.92], [1, 0.82, 0.62], [0.78, 0.86, 1], [1, 0.55, 0.32]];
  for (let i = 0; i < count; i++) {
    const r = 5 + Math.pow(Math.random(), 0.7) * 26;
    const th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
    pos[i * 3] = Math.sin(ph) * Math.cos(th) * r;
    pos[i * 3 + 1] = Math.cos(ph) * r * 0.75;
    pos[i * 3 + 2] = -14 + Math.sin(ph) * Math.sin(th) * r * 0.6;
    const big = Math.random() < 0.025;
    size[i] = big ? 5 + Math.random() * 6 : 0.8 + Math.pow(Math.random(), 3) * 3.2;
    phase[i] = Math.random() * 6.283;
    const c = palette[Math.random() < 0.7 ? 0 : 1 + Math.floor(Math.random() * 3)];
    tint.set(c, i * 3);
  }
  const dustGeo = new BufferGeometry();
  dustGeo.setAttribute("position", new Float32BufferAttribute(pos, 3));
  dustGeo.setAttribute("aSize", new Float32BufferAttribute(size, 1));
  dustGeo.setAttribute("aPhase", new Float32BufferAttribute(phase, 1));
  dustGeo.setAttribute("aTint", new Float32BufferAttribute(tint, 3));
  const starMat = new ShaderMaterial({
    transparent: true, depthWrite: false, blending: AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uPx: { value: renderer.getPixelRatio() } },
    vertexShader: /* glsl */ `
      attribute float aSize; attribute float aPhase; attribute vec3 aTint;
      uniform float uTime; uniform float uPx;
      varying vec3 vTint; varying float vTw; varying float vBig;
      void main(){
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vTw = 0.55 + 0.45 * sin(uTime * (0.6 + fract(aPhase) * 2.2) + aPhase * 3.0);
        vTint = aTint; vBig = step(4.5, aSize);
        gl_PointSize = aSize * uPx * (70.0 / -mv.z) * (0.8 + 0.4 * vTw);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      varying vec3 vTint; varying float vTw; varying float vBig;
      void main(){
        vec2 p = gl_PointCoord - 0.5;
        float d = length(p);
        float core = smoothstep(0.5, 0.0, d);
        float glow = exp(-d * 9.0);
        float cross = vBig * (exp(-abs(p.x) * 60.0) + exp(-abs(p.y) * 60.0)) * smoothstep(0.5, 0.0, d);
        float a = (pow(core, 3.0) * 0.9 + glow * 0.5 + cross * 0.8) * vTw;
        if (a < 0.01) discard;
        gl_FragColor = vec4(vTint * a, a);
      }`,
  });
  const dust = new Points(dustGeo, starMat);
  scene.add(dust);

  // ---------- State ----------
  const state = { open: 0.15, progress: 0, end: 0, mx: 0, my: 0, tx: 0, ty: 0, running: true, visible: true };

  function layout() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    // keep the aperture comfortably inside the frame on portrait phones
    const portrait = w / h < 0.8;
    rig.scale.setScalar(portrait ? 0.5 : 0.74);
    rig.position.set(portrait ? 0 : 3.1, portrait ? 1.7 : 0.7, 0);
  }
  layout();

  function applyOpen(o) {
    // o: 0 = closed, 1 = wide open
    const rot = MathUtils.lerp(-0.02, 0.98, o);
    for (const b of blades) b.rotation.z = rot;
    coreMat.uniforms.uOpen.value = o;
  }

  let t0 = performance.now();
  function frame(now) {
    const t = (now - t0) / 1000;
    state.mx += (state.tx - state.mx) * 0.05;
    state.my += (state.ty - state.my) * 0.05;

    const p = state.progress;
    const e = state.end;
    const breathe = reducedMotion ? 0 : Math.sin(t * 0.8) * 0.04;
    const open = MathUtils.clamp(0.52 + p * 0.48 - e * 0.55 + breathe, 0, 1);
    applyOpen(open);

    aperture.rotation.z = (reducedMotion ? 0 : t * 0.05) + p * 1.2;
    ring2.rotation.z = -t * 0.08;
    ring3.rotation.x = Math.sin(t * 0.3) * 0.2 + 0.25;
    ring3.rotation.y = Math.cos(t * 0.25) * 0.2;
    rig.rotation.y = state.mx * 0.35 + p * -0.35 + e * 0.25;
    rig.rotation.x = -state.my * 0.25 + p * 0.25;
    camera.position.z = 18 - p * 6.5 + e * 3;
    dust.rotation.y = t * 0.015;
    coreMat.uniforms.uTime.value = t;
    starMat.uniforms.uTime.value = t;
    rim.intensity = 110 + Math.sin(t * 1.6) * 20 + open * 60;

    renderer.render(scene, camera);
  }

  function loop(now) {
    if (state.running && state.visible) frame(now);
    if (!reducedMotion) requestAnimationFrame(loop);
  }

  if (reducedMotion) {
    frame(performance.now());
  } else {
    requestAnimationFrame(loop);
  }

  window.addEventListener("resize", () => { layout(); if (reducedMotion) frame(performance.now()); });
  window.addEventListener("pointermove", (ev) => {
    state.tx = (ev.clientX / window.innerWidth) * 2 - 1;
    state.ty = (ev.clientY / window.innerHeight) * 2 - 1;
  }, { passive: true });
  document.addEventListener("visibilitychange", () => { state.running = !document.hidden; });

  return {
    setProgress(p) { state.progress = p; if (reducedMotion) frame(performance.now()); },
    setEnd(e) { state.end = e; if (reducedMotion) frame(performance.now()); },
    setVisible(v) { state.visible = v; },
  };
}

export function hasWebGL() {
  try {
    const c = document.createElement("canvas");
    return !!(window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl")));
  } catch {
    return false;
  }
}
