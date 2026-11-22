import {
  WebGLRenderer, Scene, PerspectiveCamera, Group, Mesh, TorusKnotGeometry, CapsuleGeometry, IcosahedronGeometry,
  MeshStandardMaterial, MeshPhysicalMaterial, TorusGeometry, SphereGeometry, ShaderMaterial,
  PointLight, DirectionalLight, AmbientLight, PMREMGenerator, BufferGeometry, Float32BufferAttribute,
  Points, Color, ACESFilmicToneMapping, SRGBColorSpace, AdditiveBlending, MathUtils,
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

  scene.add(new AmbientLight(0xffffff, 0.25));
  const key = new DirectionalLight(0xfff1e0, 2.2);
  key.position.set(-6, 8, 10);
  scene.add(key);
  const warm = new PointLight(0xff6a2b, 260, 40, 1.4);
  warm.position.set(6, -3, 6);
  scene.add(warm);
  const cool = new PointLight(0x8a7dff, 180, 40, 1.4);
  cool.position.set(-7, 4, 2);
  scene.add(cool);

  // ---------- Sculpture: a glossy, iridescent knot with floating shapes ----------
  const rig = new Group();
  scene.add(rig);

  const knotMat = new MeshPhysicalMaterial({
    color: 0xffb08a, metalness: 0.35, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.05,
    iridescence: 1, iridescenceIOR: 1.35, iridescenceThicknessMinimum: 180, iridescenceThicknessMaximum: 650, sheen: 0.6, sheenColor: new Color(0xffd2b8), envMapIntensity: 1.4,
  });
  const knot = new Mesh(new TorusKnotGeometry(2.2, 0.72, isSmall ? 220 : 360, isSmall ? 32 : 56, 2, 3), knotMat);
  rig.add(knot);

  const chrome = new MeshPhysicalMaterial({ color: 0xffffff, metalness: 1, roughness: 0.08, envMapIntensity: 1.6 });
  const orange = new MeshPhysicalMaterial({ color: 0xff5a1f, metalness: 0.1, roughness: 0.25, clearcoat: 1 });
  const cream = new MeshPhysicalMaterial({ color: 0xf3e9dc, metalness: 0, roughness: 0.35, clearcoat: 0.6, sheen: 1, sheenColor: new Color(0xffffff) });
  const glass = new MeshPhysicalMaterial({ color: 0xffffff, metalness: 0, roughness: 0.02, iridescence: 1, transparent: true, opacity: 0.35, clearcoat: 1, envMapIntensity: 2 });
  const seg = isSmall ? 32 : 48;
  const floaters = [
    { m: new Mesh(new SphereGeometry(0.55, seg, seg), orange), r: 4.4, a: 0.3, y: 1.6, s: 0.5 },
    { m: new Mesh(new SphereGeometry(0.32, seg, seg), chrome), r: 3.8, a: 2.2, y: -2.1, s: 0.7 },
    { m: new Mesh(new TorusGeometry(0.5, 0.18, 24, 64), cream), r: 4.8, a: 3.6, y: 0.4, s: 0.4 },
    { m: new Mesh(new CapsuleGeometry(0.25, 0.7, 8, 24), glass), r: 4.2, a: 5.0, y: 2.3, s: 0.6 },
    { m: new Mesh(new IcosahedronGeometry(0.42, 0), chrome), r: 5.0, a: 1.3, y: -1.2, s: 0.45 },
    { m: new Mesh(new SphereGeometry(0.2, seg, seg), cream), r: 3.4, a: 4.4, y: -0.6, s: 0.8 },
  ];
  floaters.forEach((f) => rig.add(f.m));

  // thin orbit ring for the brand accent
  const ring = new Mesh(new TorusGeometry(5.6, 0.014, 8, 240), new MeshStandardMaterial({ color: HOT, emissive: HOT, emissiveIntensity: 1.6 }));
  ring.rotation.x = 1.2;
  rig.add(ring);

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
    rig.scale.setScalar(portrait ? 0.55 : 0.8);
    rig.position.set(portrait ? 0 : 3.3, portrait ? 2.0 : 0.5, 0);
  }
  layout();

  let t0 = performance.now();
  function frame(now) {
    const t = (now - t0) / 1000;
    state.mx += (state.tx - state.mx) * 0.05;
    state.my += (state.ty - state.my) * 0.05;

    const p = state.progress;
    const e = state.end;
    const spin = reducedMotion ? 0 : t;
    knot.rotation.x = spin * 0.12 + p * 1.4;
    knot.rotation.y = spin * 0.18 + p * 2.0;
    knot.scale.setScalar(1 + p * 0.25 - e * 0.15 + (reducedMotion ? 0 : Math.sin(t * 0.9) * 0.015));
    floaters.forEach((f, i) => {
      const ang = f.a + spin * f.s * 0.35 + p * (1 + i * 0.2);
      const rad = f.r * (1 + p * 0.35);
      f.m.position.set(Math.cos(ang) * rad, f.y + Math.sin(spin * f.s + i) * 0.35, Math.sin(ang) * rad * 0.6);
      f.m.rotation.x = spin * f.s; f.m.rotation.y = spin * f.s * 0.7;
    });
    ring.rotation.z = spin * 0.06;
    ring.rotation.x = 1.2 + Math.sin(spin * 0.3) * 0.1;
    rig.rotation.y = state.mx * 0.3 + p * -0.3 + e * 0.25;
    rig.rotation.x = -state.my * 0.2 + p * 0.2;
    camera.position.z = 18 - p * 5 + e * 3;
    dust.rotation.y = t * 0.015;
    starMat.uniforms.uTime.value = t;
    warm.intensity = 240 + Math.sin(t * 1.1) * 40;

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
