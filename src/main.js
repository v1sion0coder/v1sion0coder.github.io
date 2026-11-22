import "@fontsource/syne/400.css";
import "@fontsource/syne/700.css";
import "@fontsource/syne/800.css";
import "@fontsource/jetbrains-mono/400.css";
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

// ---- Work index: accordion + cursor preview ----
document.querySelectorAll("button.idx__head").forEach((btn) => {
  const panel = document.getElementById(btn.getAttribute("aria-controls"));
  btn.addEventListener("click", () => {
    const open = btn.getAttribute("aria-expanded") === "true";
    btn.setAttribute("aria-expanded", String(!open));
    if (open) {
      if (reduced) { panel.hidden = true; ScrollTrigger.refresh(); return; }
      gsap.to(panel, { height: 0, duration: 0.6, ease: "expo.inOut", onComplete: () => { panel.hidden = true; panel.style.height = ""; ScrollTrigger.refresh(); } });
    } else {
      panel.hidden = false;
      if (reduced) { ScrollTrigger.refresh(); return; }
      gsap.fromTo(panel, { height: 0 }, { height: "auto", duration: 0.8, ease: "expo.out", onComplete: () => ScrollTrigger.refresh() });
    }
  });
});
const peek = document.querySelector(".peek");
if (peek && window.matchMedia("(hover: hover)").matches) {
  let x = 0, y = 0, px = 0, py = 0, raf = 0;
  const tick = () => { px += (x - px) * 0.15; py += (y - py) * 0.15; peek.style.left = px + "px"; peek.style.top = py + "px"; raf = requestAnimationFrame(tick); };
  document.querySelectorAll("button.idx__head").forEach((btn) => {
    btn.addEventListener("mouseenter", (e) => {
      if (btn.getAttribute("aria-expanded") === "true") return;
      const cs = getComputedStyle(btn.parentElement);
      ["--c1", "--c2", "--bg"].forEach((v) => peek.style.setProperty(v, cs.getPropertyValue(v)));
      peek.querySelectorAll(".peek__m").forEach((m) => m.classList.toggle("on", m.dataset.m === btn.dataset.preview));
      x = px = e.clientX + 220; y = py = e.clientY;
      peek.classList.add("on");
      cancelAnimationFrame(raf); raf = requestAnimationFrame(tick);
    });
    btn.addEventListener("mousemove", (e) => { x = e.clientX + 220; y = e.clientY; });
    btn.addEventListener("mouseleave", () => { peek.classList.remove("on"); cancelAnimationFrame(raf); });
    btn.addEventListener("click", () => peek.classList.remove("on"));
  });
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
  reveal(".idx__row", { stagger: 0.08 });
  reveal(".now__card");
  reveal(".contact__title");

}

// never leave the loader up, even if 3D is slow to start
const safety = setTimeout(() => document.body.classList.remove("is-loading"), 2500);
boot3D().finally(() => {
  clearTimeout(safety);
  scrollFx();
  intro();
});
