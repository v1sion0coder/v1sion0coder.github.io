import {
  Vector3, WebGLRenderer, Scene, PerspectiveCamera, Group, Mesh, TorusKnotGeometry, CapsuleGeometry, IcosahedronGeometry,
  MeshStandardMaterial, MeshPhysicalMaterial, TorusGeometry, SphereGeometry, ShaderMaterial,
  PointLight, DirectionalLight, AmbientLight, PMREMGenerator, BufferGeometry, Float32BufferAttribute,
  Points, Color, NormalBlending, ACESFilmicToneMapping, SRGBColorSpace, AdditiveBlending, MathUtils,
} from "three";
import { createCity } from "./city.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

const HOT = new Color("#ff4d1a");

export function createScene(canvas, { reducedMotion = false, front = null, target = null } = {}) {
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
    color: 0xff6a2e, metalness: 0.45, roughness: 0.14, clearcoat: 1, clearcoatRoughness: 0.05,
    iridescence: 1, iridescenceIOR: 1.35, iridescenceThicknessMinimum: 180, iridescenceThicknessMaximum: 650, sheen: 0.8, sheenColor: new Color(0x9b7bff), envMapIntensity: 1.4,
  });
  const knot = new Mesh(new TorusKnotGeometry(2.2, 0.72, isSmall ? 220 : 360, isSmall ? 32 : 56, 2, 3), knotMat);
  rig.add(knot);

  const chrome = new MeshPhysicalMaterial({ color: 0xffffff, metalness: 1, roughness: 0.08, envMapIntensity: 1.6 });
  const orange = new MeshPhysicalMaterial({ color: 0xff5a1f, metalness: 0.1, roughness: 0.25, clearcoat: 1 });
  const cream = new MeshPhysicalMaterial({ color: 0x8f7dff, metalness: 0, roughness: 0.35, clearcoat: 0.6, sheen: 1, sheenColor: new Color(0xffffff) });
  const glass = new MeshPhysicalMaterial({ color: 0xffffff, metalness: 0, roughness: 0.02, iridescence: 1, transparent: true, opacity: 0.35, clearcoat: 1, envMapIntensity: 2 });
  const seg = isSmall ? 32 : 48;
  const floaters = [
    { m: new Mesh(new SphereGeometry(0.55, seg, seg), orange), r: 4.4, a: 0.3, y: 1.6, s: 0.5 },
    { m: new Mesh(new TorusGeometry(0.5, 0.18, 24, 64), cream), r: 4.8, a: 3.6, y: 0.4, s: 0.4 },
    { m: new Mesh(new CapsuleGeometry(0.25, 0.7, 8, 24), glass), r: 4.2, a: 5.0, y: 2.3, s: 0.6 },
    { m: new Mesh(new SphereGeometry(0.2, seg, seg), cream), r: 3.4, a: 4.4, y: -0.6, s: 0.8 },
  ];
  floaters.forEach((f) => rig.add(f.m));

  // ---------- Flyers: pass through the hole of the "O" in the title ----------
  // Far away they are drawn behind the text (seen through the O); once past it they are drawn on a canvas above the text.
  const flyScene = new Scene();
  flyScene.environment = scene.environment;
  flyScene.add(new AmbientLight(0xffffff, 0.3));
  const fk = new DirectionalLight(0xfff1e0, 2.2); fk.position.set(-6, 8, 10); flyScene.add(fk);
  const fw = new PointLight(0xff6a2b, 200, 40, 1.4); fw.position.set(6, -3, 8); flyScene.add(fw);
  const flyers = [
    { m: new Mesh(new IcosahedronGeometry(0.34, 0), chrome), delay: 0, spin: 1.3, side: 1 },
    { m: new Mesh(new SphereGeometry(0.26, seg, seg), orange), delay: 3.2, spin: 0.8, side: -1 },
  ];
  flyers.forEach((f) => flyScene.add(f.m));
  let frontR = null;
  if (front) {
    frontR = new WebGLRenderer({ canvas: front, antialias: !isSmall, alpha: true });
    frontR.setPixelRatio(renderer.getPixelRatio());
    frontR.setClearColor(0x000000, 0);
    frontR.toneMapping = ACESFilmicToneMapping;
    frontR.outputColorSpace = SRGBColorSpace;
    const pm2 = new PMREMGenerator(frontR);
    var frontEnv = pm2.fromScene(new RoomEnvironment(), 0.04).texture;
    pm2.dispose();
  }
  renderer.autoClear = false;
  const ray = new Vector3(), tmp = new Vector3();
  const PERIOD = 6.4;
  function updateFlyers(t, heroP) {
    let rect = target && target.getBoundingClientRect();
    const usable = rect && rect.width > 0 && heroP < 0.12 && !reducedMotion;
    flyers.forEach((f) => { f.m.visible = false; f.front = false; });
    if (!usable) return;
    // the O's centre (its inner hole) as a ray from the camera
    const nx = ((rect.left + rect.width / 2) / window.innerWidth) * 2 - 1;
    const ny = -(((rect.top + rect.height * 0.56) / window.innerHeight) * 2 - 1);
    ray.set(nx, ny, 0.5).unproject(camera).sub(camera.position).normalize();
    const planeDist = (camera.position.z - 0) / -ray.z;           // distance to the text plane (z = 0)
    flyers.forEach((f) => {
      const k = ((t + f.delay) % PERIOD) / PERIOD;               // 0..1 loop
      if (k > 0.82) return;                                      // pause between passes
      const u = k / 0.82;
      const e = u * u * (3 - 2 * u);
      const dist = MathUtils.lerp(planeDist * 2.6, planeDist * 0.18, e);   // far behind -> close to the camera
      tmp.copy(camera.position).addScaledVector(ray, dist);
      const past = Math.max(0, 1 - dist / planeDist);            // 0 until it crosses the text
      tmp.x += f.side * past * past * 6;                         // after the O, swing off to one side
      tmp.y += past * past * 1.5;
      f.m.position.copy(tmp);
      f.m.rotation.set(t * f.spin, t * f.spin * 0.7, 0);
      f.m.visible = true;
      f.front = dist < planeDist;
    });
  }

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
    uniforms: { uTime: { value: 0 }, uPx: { value: renderer.getPixelRatio() }, uLight: { value: 0 } },
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
      varying vec3 vTint; varying float vTw; varying float vBig; uniform float uLight;
      void main(){
        vec2 p = gl_PointCoord - 0.5;
        float d = length(p);
        float core = smoothstep(0.5, 0.0, d);
        float glow = exp(-d * 9.0);
        float cross = vBig * (exp(-abs(p.x) * 60.0) + exp(-abs(p.y) * 60.0)) * smoothstep(0.5, 0.0, d);
        float a = (pow(core, 3.0) * 0.9 + glow * 0.5 + cross * 0.8) * vTw;
        if (a < 0.01) discard;
        vec3 c = mix(vTint, vec3(0.85, 0.45, 0.25) * 0.8, uLight);
        gl_FragColor = uLight > 0.5 ? vec4(c, a * 0.55) : vec4(vTint * a, a);
      }`,
  });
  const dust = new Points(dustGeo, starMat);
  scene.add(dust);

  // ---------- Floating city of websites ----------
  const city = createCity(scene, { isSmall });

  // ---------- State ----------
  const drag = { x: 0, y: 0, vx: 0, vy: 0 };
  const state = { open: 0.15, progress: 0, end: 0, mx: 0, my: 0, tx: 0, ty: 0, running: true, visible: true };

  function layout() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    if (frontR) frontR.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    // keep the aperture comfortably inside the frame on portrait phones
    const portrait = w / h < 0.8;
    rig.scale.setScalar(portrait ? 0.7 : 1.08);
    rig.position.set(portrait ? 0 : 3.6, portrait ? 2.0 : 0.4, 0);
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
    drag.vx *= 0.94; drag.vy *= 0.94; drag.x += drag.vx; drag.y += drag.vy;
    knot.rotation.x = spin * 0.12 + p * 1.4 + drag.y;
    knot.rotation.y = spin * 0.18 + p * 2.0 + drag.x;
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
    // dive into the city while scrolling, fly back out at the contact section
    const dive = p * (1 - e);
    camera.position.z = 18 - dive * Math.min(city.depth, 48) + e * 3;
    camera.position.x = -Math.sin(Math.min(dive * 4, 1) * Math.PI / 2) * 3.2 * (1 - dive) - Math.sin(dive * Math.PI) * 1.2 + state.mx * 0.6;
    camera.position.y = -dive * 0.8 - state.my * 0.4;
    camera.rotation.y = -Math.sin(dive * Math.PI * 2) * 0.08;
    city.update(t, reducedMotion);
    dust.rotation.y = t * 0.015;
    starMat.uniforms.uTime.value = t;
    warm.intensity = 240 + Math.sin(t * 1.1) * 40;

    updateFlyers(t, p);
    renderer.clear();
    renderer.render(scene, camera);
    flyers.forEach((f) => { f.m.visible = f.m.visible && !f.front; f._v = f.front; });
    flyScene.environment = scene.environment;
    renderer.render(flyScene, camera);
    if (frontR) {
      flyers.forEach((f) => { f.m.visible = !!f._v; });
      flyScene.environment = frontEnv;
      frontR.render(flyScene, camera);
    }
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
    setTheme(light) {
      renderer.setClearColor(light ? 0xf4efe8 : 0x0a0a0b, 1);
      starMat.blending = light ? NormalBlending : AdditiveBlending; starMat.needsUpdate = true;
      starMat.uniforms.uLight.value = light ? 1 : 0;
      city.setTheme(light);
    },
    spin(dx, dy) { drag.vx += dx * 0.004; drag.vy += dy * 0.004; },
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
