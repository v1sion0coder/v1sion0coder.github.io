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
  workReel();
  scrollFx();
  intro();
});
