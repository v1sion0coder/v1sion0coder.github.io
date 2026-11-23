// "Floating city of websites": pastel islands carrying little website screens, with soft clouds.
// The camera dives through it while the visitor scrolls (driven from scene.js).
import {
  Group, Mesh, PlaneGeometry, IcosahedronGeometry, CylinderGeometry, MeshStandardMaterial, MeshBasicMaterial,
  CanvasTexture, SRGBColorSpace, Sprite, SpriteMaterial, DoubleSide, Color, FogExp2, Vector3,
} from "three";

const PALETTES = [
  { bg: "#fff4ea", ink: "#1b1a1f", acc: "#ff5a1f", soft: "#ffd2b8" },
  { bg: "#14131a", ink: "#f2ece4", acc: "#a58bff", soft: "#3a3350" },
  { bg: "#f6e9ff", ink: "#2a1f3d", acc: "#ff7ab8", soft: "#e2cff7" },
  { bg: "#0f1a1c", ink: "#e6fff8", acc: "#47c2a0", soft: "#1f3a3a" },
  { bg: "#fff8d9", ink: "#2b2414", acc: "#ff9f1a", soft: "#ffe7a3" },
  { bg: "#ffe6e6", ink: "#3a1414", acc: "#e0364f", soft: "#ffc2c2" },
  { bg: "#e9f1ff", ink: "#14213d", acc: "#3d7bff", soft: "#c9dbff" },
  { bg: "#1a1410", ink: "#fbeee0", acc: "#ff6a2b", soft: "#4a3426" },
];

function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

// Draw a tiny abstract website (no real brands, just shapes)
function siteTexture(pal, seed) {
  const W = 512, H = 340;
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const x = c.getContext("2d");
  let s = seed * 9301 + 49297; const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  rr(x, 0, 0, W, H, 26); x.fillStyle = pal.bg; x.fill(); x.save(); x.clip();
  x.fillStyle = pal.soft; x.fillRect(0, 0, W, 34);
  ["#ff5f57", "#febc2e", "#28c840"].forEach((col, i) => { x.fillStyle = col; x.beginPath(); x.arc(22 + i * 18, 17, 6, 0, 7); x.fill(); });
  x.fillStyle = pal.ink; x.globalAlpha = .85; rr(x, 30, 52, 70, 12, 6); x.fill();
  for (let i = 0; i < 3; i++) { x.globalAlpha = .35; rr(x, W - 210 + i * 58, 54, 44, 8, 4); x.fill(); }
  x.globalAlpha = 1;
  const layout = Math.floor(rnd() * 3);
  if (layout === 0) {
    x.fillStyle = pal.ink; rr(x, 30, 96, 250, 30, 8); x.fill(); rr(x, 30, 134, 190, 30, 8); x.fill();
    x.globalAlpha = .4; rr(x, 30, 180, 220, 9, 4); x.fill(); rr(x, 30, 196, 180, 9, 4); x.fill(); x.globalAlpha = 1;
    x.fillStyle = pal.acc; rr(x, 30, 228, 120, 34, 17); x.fill();
    const g = x.createRadialGradient(400, 180, 10, 400, 180, 110); g.addColorStop(0, pal.acc); g.addColorStop(1, pal.soft);
    x.fillStyle = g; x.beginPath(); x.arc(400, 185, 95, 0, 7); x.fill();
  } else if (layout === 1) {
    x.fillStyle = pal.acc; rr(x, 30, 90, W - 60, 120, 16); x.fill();
    x.fillStyle = pal.bg; x.globalAlpha = .9; rr(x, 56, 120, 220, 26, 8); x.fill(); rr(x, 56, 154, 150, 26, 8); x.fill(); x.globalAlpha = 1;
    for (let i = 0; i < 3; i++) { x.fillStyle = pal.soft; rr(x, 30 + i * 154, 226, 142, 90, 12); x.fill(); }
  } else {
    for (let r = 0; r < 2; r++) for (let i = 0; i < 3; i++) { x.fillStyle = (r + i) % 2 ? pal.soft : pal.acc; x.globalAlpha = (r + i) % 2 ? 1 : .85; rr(x, 30 + i * 154, 92 + r * 118, 142, 104, 14); x.fill(); }
    x.globalAlpha = 1;
  }
  x.restore();
  const t = new CanvasTexture(c); t.colorSpace = SRGBColorSpace; t.anisotropy = 4;
  return t;
}

function cloudTexture() {
  const c = document.createElement("canvas"); c.width = c.height = 128;
  const x = c.getContext("2d");
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, "rgba(255,214,236,0.85)"); g.addColorStop(0.5, "rgba(200,170,255,0.28)"); g.addColorStop(1, "rgba(255,255,255,0)");
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  const t = new CanvasTexture(c); t.colorSpace = SRGBColorSpace; return t;
}

export function createCity(scene, { isSmall = false } = {}) {
  const city = new Group();
  scene.add(city);
  scene.fog = new FogExp2(0x0a0a0b, 0.016);

  const textures = PALETTES.map((p, i) => siteTexture(p, i + 1));
  const panelGeo = new PlaneGeometry(2.6, 1.73);
  const rockMats = ["#c9b6ff", "#ffc4a8", "#ffd9ec", "#b9e6ff"].map((c) => new MeshStandardMaterial({ color: c, roughness: 0.75, metalness: 0.05, flatShading: true }));
  const grassMat = new MeshStandardMaterial({ color: "#fff3ea", roughness: 0.9, flatShading: true });
  const pillarMat = new MeshStandardMaterial({ color: "#ffffff", roughness: 0.4, metalness: 0.3 });

  const islands = [];
  const N = isSmall ? 7 : 13;
  let rs = 7; const rnd = () => ((rs = (rs * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < N; i++) {
    const side = i % 2 ? 1 : -1;
    const z = -4 - i * (isSmall ? 7.5 : 4.6) - rnd() * 2;
    const xPos = side * (4.5 + rnd() * 7);
    const yPos = -3.5 + rnd() * 6.5;
    const g = new Group();
    g.position.set(xPos, yPos, z);
    const size = 1.6 + rnd() * 1.6;
    const rock = new Mesh(new IcosahedronGeometry(size, 1), rockMats[i % rockMats.length]);
    rock.scale.set(1, 0.55, 1); rock.position.y = -size * 0.35;
    const top = new Mesh(new CylinderGeometry(size * 0.92, size * 0.98, 0.18, 9), grassMat);
    top.position.y = 0;
    g.add(rock, top);
    const count = 1 + Math.floor(rnd() * (isSmall ? 2 : 3));
    const panels = [];
    for (let k = 0; k < count; k++) {
      const mat = new MeshBasicMaterial({ map: textures[(i * 3 + k) % textures.length], side: DoubleSide, transparent: true, fog: true });
      const panel = new Mesh(panelGeo, mat);
      const sc = 0.7 + rnd() * 0.6;
      panel.scale.setScalar(sc);
      const ox = (k - (count - 1) / 2) * 1.5 * sc, h = 1.3 + rnd() * 1.6;
      panel.position.set(ox, h, (rnd() - 0.5) * 0.8);
      panel.rotation.y = -side * (0.35 + rnd() * 0.35);
      const pillar = new Mesh(new CylinderGeometry(0.04, 0.04, h - 0.86 * sc, 6), pillarMat);
      pillar.position.set(ox, (h - 0.86 * sc) / 2, panel.position.z);
      g.add(panel, pillar);
      panels.push({ m: panel, base: h, ph: rnd() * 6.28 });
    }
    city.add(g);
    islands.push({ g, base: yPos, ph: rnd() * 6.28, panels, spin: (rnd() - 0.5) * 0.002 });
  }

  // soft clouds
  const cloudMat = new SpriteMaterial({ map: cloudTexture(), transparent: true, depthWrite: false, opacity: 0.32, fog: true });
  const clouds = [];
  const CN = isSmall ? 12 : 26;
  for (let i = 0; i < CN; i++) {
    const sp = new Sprite(cloudMat);
    const sc = 4 + rnd() * 7;
    sp.scale.set(sc * 1.8, sc, 1);
    sp.position.set((rnd() - 0.5) * 40, -6 + rnd() * 5, -6 - rnd() * 60);
    city.add(sp); clouds.push({ s: sp, v: 0.2 + rnd() * 0.4 });
  }

  const tmp = new Vector3();
  return {
    depth: 4 + N * (isSmall ? 7.5 : 4.6),
    update(t, reduced) {
      const k = reduced ? 0 : 1;
      islands.forEach((it) => {
        it.g.position.y = it.base + Math.sin(t * 0.5 + it.ph) * 0.35 * k;
        it.g.rotation.y += it.spin * k;
        it.panels.forEach((pn) => { pn.m.position.y = pn.base + Math.sin(t * 0.9 + pn.ph) * 0.12 * k; });
      });
      clouds.forEach((c) => { c.s.position.x += 0.003 * c.v * k; if (c.s.position.x > 22) c.s.position.x = -22; });
    },
    setTheme(light) {
      scene.fog.color = new Color(light ? 0xf4efe8 : 0x0a0a0b);
      cloudMat.opacity = light ? 0.7 : 0.32;
    },
    tmp,
  };
}
