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

// The three projects from "Selected work", drawn as small but real-looking homepages.
export const PROJECTS = [
  { slide: 0, name: "Layers", kind: "Honey-cake & pastry house", city: "Riga", tld: "lv", bg: "#1a120c", ink: "#f6e7cf", acc: "#e7b45a", deep: "#7a3b1d", art: "cake" },
  { slide: 1, name: "Grid", kind: "Neighbourhood waffle café", city: "Tallinn", tld: "ee", bg: "#fff3dc", ink: "#2b1a0b", acc: "#c4521f", deep: "#f2d27a", art: "waffle" },
  { slide: 2, name: "Rye", kind: "Nordic patisserie", city: "Helsinki", tld: "fi", bg: "#efe6dc", ink: "#2a1a14", acc: "#6d3f2c", deep: "#d9b8a0", art: "bun" },
];

function projectTexture(P) {
  const W = 1024, H = 680;
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const x = c.getContext("2d");
  rr(x, 0, 0, W, H, 40); x.fillStyle = P.bg; x.fill(); x.save(); x.clip();
  x.fillStyle = "rgba(127,127,127,.18)"; x.fillRect(0, 0, W, 54);
  ["#ff5f57", "#febc2e", "#28c840"].forEach((col, i) => { x.fillStyle = col; x.beginPath(); x.arc(34 + i * 26, 27, 8, 0, 7); x.fill(); });
  x.fillStyle = "rgba(127,127,127,.25)"; rr(x, 300, 14, 424, 26, 13); x.fill();
  x.fillStyle = P.ink; x.globalAlpha = .6; x.font = "500 15px ui-monospace, monospace"; x.textAlign = "center";
  x.fillText(P.name.toLowerCase() + "." + P.tld, 512, 32); x.globalAlpha = 1; x.textAlign = "left";
  x.fillStyle = P.ink; x.font = "800 30px Syne, system-ui, sans-serif"; x.fillText(P.name.toUpperCase(), 56, 112);
  x.font = "500 17px ui-monospace, monospace"; x.globalAlpha = .7;
  ["Menu", "Order", "Visit"].forEach((t, i) => x.fillText(t, W - 330 + i * 100, 108)); x.globalAlpha = 1;
  x.font = "italic 400 78px 'Instrument Serif', Georgia, serif"; x.fillStyle = P.ink;
  const lines = P.art === "cake" ? ["Seven layers,", "one slice."] : P.art === "waffle" ? ["Book a table", "in three taps."] : ["Rye, butter", "and patience."];
  lines.forEach((l, i) => x.fillText(l, 56, 240 + i * 82));
  x.font = "400 20px system-ui, sans-serif"; x.globalAlpha = .7; x.fillText(P.kind + " · " + P.city, 58, 400); x.globalAlpha = 1;
  x.fillStyle = P.acc; rr(x, 56, 440, 210, 60, 30); x.fill();
  x.fillStyle = P.art === "cake" ? "#1a120c" : "#fff"; x.font = "700 19px system-ui, sans-serif";
  x.fillText(P.art === "waffle" ? "Book a table →" : "Pre-order →", 84, 477);
  const cx = 770, cy = 380;
  if (P.art === "cake") {
    const cols = ["#f6e7cf", "#e7b45a", "#c98a3a", "#f6e7cf", "#e7b45a", "#a8642c", "#7a3b1d"];
    cols.forEach((col, i) => { x.fillStyle = col; x.beginPath(); x.moveTo(cx - 170, cy - 120 + i * 34); x.lineTo(cx + 170, cy - 150 + i * 34); x.lineTo(cx + 170, cy - 116 + i * 34); x.lineTo(cx - 170, cy - 86 + i * 34); x.closePath(); x.fill(); });
    x.fillStyle = "#f6e7cf"; x.beginPath(); x.arc(cx + 60, cy - 200, 16, 0, 7); x.fill();
  } else if (P.art === "waffle") {
    x.save(); x.translate(cx, cy); x.rotate(-0.12);
    x.fillStyle = P.deep; rr(x, -170, -170, 340, 340, 40); x.fill();
    x.fillStyle = "#e0a441";
    for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) { rr(x, -146 + k * 76, -146 + r * 76, 60, 60, 10); x.fill(); }
    x.fillStyle = P.acc; x.beginPath(); x.arc(70, -70, 34, 0, 7); x.fill();
    x.restore();
  } else {
    for (let i = 0; i < 7; i++) {
      const a = i * 0.9, r = i * 18;
      x.strokeStyle = i % 2 ? P.acc : P.deep; x.lineWidth = 26; x.lineCap = "round";
      x.beginPath(); x.arc(cx, cy - 20, 30 + r, a, a + 4.2); x.stroke();
    }
    x.fillStyle = P.ink; x.globalAlpha = .12; x.beginPath(); x.ellipse(cx, cy + 170, 190, 22, 0, 0, 7); x.fill(); x.globalAlpha = 1;
  }
  x.restore();
  const t = new CanvasTexture(c); t.colorSpace = SRGBColorSpace; t.anisotropy = 8;
  return t;
}

// Big screen at the end of the dive: the way into "Selected work"
function endTexture() {
  const W = 1024, H = 680;
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const x = c.getContext("2d");
  rr(x, 0, 0, W, H, 40); x.fillStyle = "#121116"; x.fill(); x.save(); x.clip();
  const g = x.createRadialGradient(800, 120, 20, 800, 120, 600); g.addColorStop(0, "rgba(255,77,26,.55)"); g.addColorStop(1, "rgba(255,77,26,0)");
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  x.fillStyle = "#f2ece4"; x.globalAlpha = .55; x.font = "500 20px ui-monospace, monospace"; x.fillText("(02)", 64, 96); x.globalAlpha = 1;
  x.font = "800 120px Syne, system-ui, sans-serif"; x.fillText("Selected", 60, 260);
  x.font = "italic 400 150px 'Instrument Serif', Georgia, serif"; x.fillStyle = "#ff4d1a"; x.fillText("work", 64, 390);
  x.fillStyle = "#f2ece4"; x.font = "500 22px ui-monospace, monospace";
  PROJECTS.forEach((P, i) => { x.globalAlpha = .8; x.fillText(`0${i + 1}  ${P.name} — ${P.city}`, 66, 480 + i * 40); });
  x.globalAlpha = 1; x.fillStyle = "#ff4d1a"; rr(x, W - 300, H - 130, 236, 64, 32); x.fill();
  x.fillStyle = "#fff"; x.font = "700 22px system-ui, sans-serif"; x.fillText("See the work ↓", W - 270, H - 89);
  x.restore();
  const t = new CanvasTexture(c); t.colorSpace = SRGBColorSpace; t.anisotropy = 8;
  return t;
}

function skyTexture() {
  const c = document.createElement("canvas"); c.width = 4; c.height = 512;
  const x = c.getContext("2d");
  const g = x.createLinearGradient(0, 0, 0, 512);
  g.addColorStop(0, "#bcd6f5"); g.addColorStop(0.55, "#f3e6ef"); g.addColorStop(1, "#fbe7d6");
  x.fillStyle = g; x.fillRect(0, 0, 4, 512);
  const t = new CanvasTexture(c); t.colorSpace = SRGBColorSpace; return t;
}

function sunTexture() {
  const c = document.createElement("canvas"); c.width = c.height = 256;
  const x = c.getContext("2d");
  const g = x.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, "rgba(255,250,235,1)"); g.addColorStop(0.18, "rgba(255,228,180,.95)"); g.addColorStop(0.45, "rgba(255,190,140,.25)"); g.addColorStop(1, "rgba(255,190,140,0)");
  x.fillStyle = g; x.fillRect(0, 0, 256, 256);
  const t = new CanvasTexture(c); t.colorSpace = SRGBColorSpace; return t;
}

function cloudTexture(day = false) {
  const c = document.createElement("canvas"); c.width = c.height = 128;
  const x = c.getContext("2d");
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  if (day) { g.addColorStop(0, "rgba(255,255,255,0.95)"); g.addColorStop(0.55, "rgba(255,255,255,0.45)"); g.addColorStop(1, "rgba(255,255,255,0)"); }
  else { g.addColorStop(0, "rgba(255,214,236,0.85)"); g.addColorStop(0.5, "rgba(200,170,255,0.28)"); g.addColorStop(1, "rgba(255,255,255,0)"); }
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  const t = new CanvasTexture(c); t.colorSpace = SRGBColorSpace; return t;
}

export function createCity(scene, { isSmall = false } = {}) {
  const city = new Group();
  scene.add(city);
  scene.fog = new FogExp2(0x0a0a0b, 0.016);

  const pickables = [];
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
    rnd(); // keep the random sequence the same for island shapes
    const count = i < 3 ? 1 : 0; // only 3 website screens in the whole city
    const panels = [];
    for (let k = 0; k < count; k++) {
      const P = PROJECTS[i];
      const mat = new MeshBasicMaterial({ map: projectTexture(P), side: DoubleSide, transparent: true, fog: true });
      const panel = new Mesh(panelGeo, mat);
      panel.userData.pick = { slide: P.slide, name: P.name };
      pickables.push(panel);
      const sc = 0.95 + rnd() * 0.3;
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

  // the dive ends face to face with this screen
  const endZ = 18 - Math.min(4 + N * (isSmall ? 7.5 : 4.6), 48) - (isSmall ? 10 : 14);
  const endPanel = new Mesh(panelGeo, new MeshBasicMaterial({ map: endTexture(), side: DoubleSide, transparent: true, fog: true }));
  endPanel.scale.setScalar(isSmall ? 1.25 : 1.5);
  const endX = isSmall ? 0 : 3;   // beside the manifesto text on wide screens
  endPanel.position.set(endX, -0.8, endZ);
  endPanel.rotation.y = isSmall ? 0 : -0.22;
  endPanel.userData.pick = { slide: -1, name: "Selected work" };
  pickables.push(endPanel);
  city.add(endPanel);

  // redraw the screens once the web fonts are ready, so the lettering is right
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => {
      pickables.forEach((m) => {
        const P = PROJECTS[m.userData.pick.slide];
        const old = m.material.map;
        m.material.map = P ? projectTexture(P) : endTexture();
        m.material.needsUpdate = true; old.dispose();
      });
    });
  }

  // daytime sun (light mode only)
  const sun = new Sprite(new SpriteMaterial({ map: sunTexture(), transparent: true, depthWrite: false, fog: false }));
  sun.scale.set(26, 26, 1); sun.position.set(10, 9, -70); sun.visible = false;
  city.add(sun);
  const sky = skyTexture();

  // soft clouds
  const nightCloud = cloudTexture(false), dayCloud = cloudTexture(true);
  const cloudMat = new SpriteMaterial({ map: nightCloud, transparent: true, depthWrite: false, opacity: 0.32, fog: true });
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
    pickables,
    endPanel,
    lowPower() { clouds.forEach((c, i) => { if (i % 2) c.s.visible = false; }); },
    update(t, reduced) {
      const k = reduced ? 0 : 1;
      endPanel.position.y = -0.8 + Math.sin(t * 0.7) * 0.08 * k;
      islands.forEach((it) => {
        it.g.position.y = it.base + Math.sin(t * 0.5 + it.ph) * 0.35 * k;
        it.g.rotation.y += it.spin * k;
        it.panels.forEach((pn) => { pn.m.position.y = pn.base + Math.sin(t * 0.9 + pn.ph) * 0.12 * k; });
      });
      clouds.forEach((c) => { c.s.position.x += 0.003 * c.v * k; if (c.s.position.x > 22) c.s.position.x = -22; });
    },
    setTheme(light) {
      scene.fog.color = new Color(light ? 0xf1e6ee : 0x0a0a0b);
      scene.fog.density = light ? 0.012 : 0.016;
      scene.background = light ? sky : null;
      cloudMat.map = light ? dayCloud : nightCloud; cloudMat.needsUpdate = true;
      cloudMat.opacity = light ? 0.9 : 0.32;
      sun.visible = light;
      const night = ["#c9b6ff", "#ffc4a8", "#ffd9ec", "#b9e6ff"], day = ["#d8ccff", "#ffd3bd", "#ffe4f1", "#cdeeff"];
      rockMats.forEach((m, i) => m.color.set(light ? day[i] : night[i]));
    },
    tmp,
  };
}
