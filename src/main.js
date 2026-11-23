import "@fontsource/syne/400.css";
import "@fontsource/syne/700.css";
import "@fontsource/syne/800.css";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/instrument-serif/400-italic.css";
import Lenis from "lenis";
import { REVIEWS } from "./reviews.js";
import "./style.css";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
document.documentElement.classList.add("js");

// ---- Static SVG fallback blades (used when WebGL is missing) ----
const g = document.querySelector(".aperture-svg__blades");
if (g) {
  const N = 9;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * 360;
    const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
    p.setAttribute("d", "M0,-80 Q-10,-50 18,-26 Q8,-52 22,-78 Z");
    p.setAttribute("transform", `rotate(${a}) translate(0,0) scale(1.25)`);
    g.appendChild(p);
  }
}

// ---- Split manifesto into words ----
document.querySelectorAll(".reveal-words").forEach((el) => {
  el.innerHTML = el.textContent.trim().split(/\s+/).map((w) => `<span class="w">${w}</span>`).join(" ");
});

// ---- Work reel: pinned horizontal scroll (desktop) + device tilt ----
function workReel() {
  const track = document.querySelector(".reel__track");
  if (!track) return;
  const slides = gsap.utils.toArray(".slide");
  if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    slides.forEach((s) => {
      const stage = s.querySelector(".shot, .yours"), info = s.querySelector(".slide__info");
      const tl = gsap.timeline({ scrollTrigger: { trigger: s, start: "top 80%" } });
      if (stage) tl.from(stage, { opacity: 0, y: 70, scale: 0.96, duration: 1.2, ease: "expo.out" });
      if (info) tl.from(info.children, { opacity: 0, y: 30, duration: 0.9, ease: "expo.out", stagger: 0.07 }, "-=0.9");
    });
  }
  // mouse tilt on devices
  if (window.matchMedia("(hover: hover)").matches) {
    document.querySelectorAll(".shot").forEach((st) => {
      st.addEventListener("pointermove", (e) => {
        const r = st.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        st.style.setProperty("--ry", `${(px - 0.5) * 12}deg`);
        st.style.setProperty("--rx", `${(0.5 - py) * 10}deg`);
        st.style.setProperty("--mx", `${px * 100}%`);
        st.style.setProperty("--my", `${py * 100}%`);
      });
      st.addEventListener("pointerleave", () => { st.style.setProperty("--ry", "0deg"); st.style.setProperty("--rx", "0deg"); });
    });
  }
}

// ---- Light / dark mode ----
const THEME_KEY = "v1-theme";
function applyTheme(t) {
  document.documentElement.dataset.theme = t;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", t === "light" ? "#f4efe8" : "#0a0a0b");
  if (scene && scene.setTheme) scene.setTheme(t === "light");
}
const savedTheme = (() => { try { return localStorage.getItem(THEME_KEY); } catch { return null; } })() || "dark";
document.documentElement.dataset.theme = savedTheme;
document.querySelectorAll(".theme-btn").forEach((b) => b.addEventListener("click", () => {
  const t = document.documentElement.dataset.theme === "light" ? "dark" : "light";
  try { localStorage.setItem(THEME_KEY, t); } catch {}
  applyTheme(t);
}));

// ---- Reviews: only real ones, section stays hidden when empty ----
if (REVIEWS.length) {
  const esc = (x) => String(x).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  document.getElementById("reviews-list").innerHTML = REVIEWS.map((r) => `<figure class="rv"><blockquote>“${esc(r.quote)}”</blockquote><figcaption><b>${esc(r.name)}</b>${r.place ? " · " + esc(r.place) : ""}</figcaption></figure>`).join("");
  document.getElementById("reviews").hidden = false;
}

// ---- Extra motion (all off for reduced motion) ----
function moreMotion() {
  if (reduced) return;
  // cursor ring
  if (window.matchMedia("(hover: hover)").matches) {
    const c = document.createElement("div"); c.className = "cursor"; c.setAttribute("aria-hidden", "true"); document.body.appendChild(c);
    let x = 0, y = 0, cx = 0, cy = 0;
    window.addEventListener("pointermove", (e) => { x = e.clientX; y = e.clientY; c.classList.add("on"); }, { passive: true });
    document.addEventListener("pointerleave", () => c.classList.remove("on"));
    gsap.ticker.add(() => { cx += (x - cx) * 0.2; cy += (y - cy) * 0.2; c.style.transform = `translate(${cx}px, ${cy}px)`; });
    document.querySelectorAll("a, button, summary, .grab").forEach((el) => {
      el.addEventListener("pointerenter", () => c.classList.add("big"));
      el.addEventListener("pointerleave", () => c.classList.remove("big"));
    });
    // magnetic buttons
    document.querySelectorAll(".btn, .float-cta, .nav__cta, .pk__btn, .avail").forEach((el) => {
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        gsap.to(el, { x: (e.clientX - r.left - r.width / 2) * 0.25, y: (e.clientY - r.top - r.height / 2) * 0.35, duration: 0.4, ease: "power3.out" });
      });
      el.addEventListener("pointerleave", () => gsap.to(el, { x: 0, y: 0, duration: 0.7, ease: "elastic.out(1, 0.4)" }));
    });
  }
  // section titles rise in
  gsap.utils.toArray(".section-head h2").forEach((h) => {
    gsap.from(h, { yPercent: 60, rotate: 2, opacity: 0, duration: 1.2, ease: "expo.out", scrollTrigger: { trigger: h, start: "top 90%" } });
  });
  // marquee leans with scroll speed
  const track = document.querySelector(".marquee__track");
  if (track) {
    const skew = gsap.quickTo(track, "skewX", { duration: 0.5, ease: "power3" });
    ScrollTrigger.create({ onUpdate: (st) => skew(gsap.utils.clamp(-12, 12, st.getVelocity() / -250)) });
  }
  // gentle parallax on cards and mockups
  gsap.utils.toArray(".shot, .pk__card, .how__steps li").forEach((el, i) => {
    gsap.fromTo(el, { y: 40 + (i % 3) * 15 }, { y: -20, ease: "none", scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: true } });
  });
  gsap.from(".pk__card", { opacity: 0, y: 60, stagger: 0.12, duration: 1.1, ease: "expo.out", scrollTrigger: { trigger: ".pk", start: "top 85%" } });
}

// ---- Smooth scroll (off for reduced motion) ----
let lenis = null;
if (!reduced) {
  lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  document.querySelectorAll('a[href^="#"]').forEach((a) => a.addEventListener("click", (e) => {
    const id = a.getAttribute("href"); if (id.length < 2) return;
    const el = document.querySelector(id); if (!el) return;
    e.preventDefault(); lenis.scrollTo(el, { offset: -10 });
  }));
}

// ---- Facts: count up when visible ----
function factsFx() {
  document.querySelectorAll(".facts [data-count]").forEach((b) => {
    const to = Number(b.dataset.count), suf = b.dataset.suffix || "";
    if (reduced || to === 0) return;
    const obj = { v: 0 };
    const sfx = suf.trim() && /[a-z]/i.test(suf) ? `<small>${suf}</small>` : suf;
    b.innerHTML = "0" + sfx;
    gsap.to(obj, { v: to, duration: 1.4, ease: "power2.out", scrollTrigger: { trigger: b, start: "top 85%" }, onUpdate: () => { b.innerHTML = Math.round(obj.v) + sfx; } });
  });
  if (!reduced) gsap.from(".facts__list li", { opacity: 0, y: 30, stagger: 0.08, duration: 1, ease: "expo.out", scrollTrigger: { trigger: ".facts", start: "top 85%" } });
}

// ---- Floating order button: after the hero, hidden at the contact section ----
function floatCta() {
  const b = document.getElementById("float-cta"); if (!b) return;
  const upd = () => {
    const y = window.scrollY, h = window.innerHeight;
    const contact = document.getElementById("contact");
    const nearEnd = contact && contact.getBoundingClientRect().top < h * 0.8;
    b.classList.toggle("on", y > h * 0.8 && !nearEnd);
  };
  window.addEventListener("scroll", upd, { passive: true }); upd();
}

// ---- Drag to spin the sculpture ----
function dragSpin() {
  const g = document.getElementById("grab"); if (!g) return;
  let down = false, lx = 0, ly = 0;
  g.addEventListener("pointerdown", (e) => { down = true; lx = e.clientX; ly = e.clientY; g.setPointerCapture(e.pointerId); g.classList.add("used"); });
  g.addEventListener("pointermove", (e) => {
    if (!down || !scene) return;
    const dx = e.clientX - lx, dy = e.pointerType === "touch" ? 0 : e.clientY - ly;
    lx = e.clientX; ly = e.clientY;
    scene.spin(dx, dy);
  });
  const up = () => { down = false; };
  g.addEventListener("pointerup", up); g.addEventListener("pointercancel", up);
}

// ---- 3D ----
let scene = null;
async function boot3D() {
  const { createScene, hasWebGL } = await import("./scene.js");
  if (!hasWebGL()) { document.body.classList.add("no-webgl"); return; }
  try {
    scene = createScene(document.getElementById("gl"), { reducedMotion: reduced, front: document.getElementById("gl-front"), target: document.querySelector(".o-letter") });
  } catch (err) {
    document.body.classList.add("no-webgl");
  }
}

function intro() {
  document.body.classList.remove("is-loading");
  if (reduced) return;
  gsap.from(".hero__title .line > span", { yPercent: 105, duration: 1.4, ease: "expo.out", delay: 0.15 });
  gsap.from([".hero__kicker", ".hero__foot", ".nav"], { opacity: 0, y: 16, duration: 1, ease: "expo.out", stagger: 0.08, delay: 0.5 });
}

function scrollFx() {
  // hero progress drives the aperture
  ScrollTrigger.create({
    trigger: ".hero", start: "top top", endTrigger: ".manifesto", end: "bottom top", scrub: true,
    onUpdate: (st) => scene && scene.setProgress(st.progress),
  });
  ScrollTrigger.create({
    trigger: ".contact", start: "top bottom", end: "bottom bottom", scrub: true,
    onUpdate: (st) => scene && scene.setEnd(st.progress),
  });
  // pause rendering when the 3D is fully covered by opaque sections
  ScrollTrigger.create({
    trigger: ".marquee", start: "top top", endTrigger: ".now", end: "bottom bottom",
    onToggle: (st) => scene && scene.setVisible(!st.isActive),
  });

  if (reduced) return;

  gsap.to(".hero__title", {
    yPercent: -30, opacity: 0.0, ease: "none",
    scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true },
  });

  gsap.to(".manifesto .w", {
    opacity: 1, stagger: 0.08, ease: "none",
    scrollTrigger: { trigger: ".manifesto", start: "top 75%", end: "bottom 60%", scrub: true },
  });

  const reveal = (sel, opts = {}) => gsap.utils.toArray(sel).forEach((el) => {
    el.classList.add("reveal");
    gsap.to(el, { opacity: 1, y: 0, duration: 1.1, ease: "expo.out", scrollTrigger: { trigger: el, start: "top 88%" }, ...opts });
  });
  reveal(".section-head");
  reveal(".svc__item", { stagger: 0.06 });
  reveal(".now__card");
  reveal(".contact__title");

}

// never leave the loader up, even if 3D is slow to start
const safety = setTimeout(() => document.body.classList.remove("is-loading"), 2500);
boot3D().finally(() => {
  clearTimeout(safety);
  applyTheme(document.documentElement.dataset.theme);
  moreMotion();
  factsFx();
  floatCta();
  dragSpin();
  workReel();
  scrollFx();
  intro();
});
