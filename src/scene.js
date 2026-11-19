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
  const coreMat = new ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uOpen: { value: 0 } },
    vertexShader: /* glsl */ `
      varying vec3 vN; varying vec3 vP; uniform float uTime;
      void main(){
        vN = normalize(normalMatrix * normal);
        vec3 p = position;
        float w = sin(p.x*3.0 + uTime*1.3) * sin(p.y*3.4 - uTime) * 0.04;
        p += normal * w;
        vP = p;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p,1.0);
      }`,
    fragmentShader: /* glsl */ `
      varying vec3 vN; varying vec3 vP; uniform float uTime; uniform float uOpen;
      void main(){
        float f = pow(1.0 - abs(vN.z), 2.2);
        float bands = 0.5 + 0.5*sin(length(vP.xy)*14.0 - uTime*2.2);
        vec3 hot = vec3(1.0, 0.30, 0.10);
        vec3 pale = vec3(1.0, 0.78, 0.62);
        vec3 col = mix(pale, hot, smoothstep(0.0, 0.9, length(vP.xy)));
        col += hot * bands * 0.25;
        col = mix(col, vec3(0.06), f*0.85);
        float pupil = smoothstep(0.30, 0.26, length(vP.xy)) * (0.85 - uOpen*0.4);
        col = mix(col, vec3(0.02), pupil);
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const core = new Mesh(new SphereGeometry(1.6, isSmall ? 48 : 72, isSmall ? 32 : 48), coreMat);
  core.position.z = -1.6;
  rig.add(core);

  // ---------- Dust ----------
  const count = isSmall ? 260 : 700;
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const r = 6 + Math.random() * 16;
    const t = Math.random() * Math.PI * 2;
    pos[i * 3] = Math.cos(t) * r;
    pos[i * 3 + 1] = (Math.random() - 0.5) * 22;
    pos[i * 3 + 2] = -12 + Math.random() * 18;
  }
  const dustGeo = new BufferGeometry();
  dustGeo.setAttribute("position", new Float32BufferAttribute(pos, 3));
  const dust = new Points(dustGeo, new PointsMaterial({ color: 0xede8df, size: 0.035, transparent: true, opacity: 0.55, blending: AdditiveBlending, depthWrite: false }));
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
    const open = MathUtils.clamp(0.34 + p * 0.66 - e * 0.55 + breathe, 0, 1);
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
