import "@fontsource/syne/400.css";
import "@fontsource/syne/700.css";
import "@fontsource/syne/800.css";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/instrument-serif/400-italic.css";
import "./style.css";
import "./order.css";
import { richHtml } from "./rich.js";
import { gsap } from "gsap";
gsap.config({ nullTargetWarn: false });
const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const API = (import.meta.env.VITE_API_URL || "http://localhost:3300").replace(/\/$/, "") + "/api";
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const time = (iso) => new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

async function call(path, body) {
  const r = await fetch(API + path, body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {});
  const data = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error(data.error || "Something went wrong."); e.status = r.status; throw e; }
  return data;
}

function bubble(log, who, text, cls = "") {
  const d = document.createElement("div");
  d.className = `bub bub--${who} ${cls}`;
  d.textContent = text;
  log.appendChild(d);
  log.scrollTop = log.scrollHeight;
  return d;
}

// ---------- New order: Brief helper chat ----------
function newOrder() {
  $("#new").hidden = false;
  const log = $("#log"), input = $("#chat-input"), form = $("#chat-form");
  const DRAFT = "v1-order-draft";
  let convo = [];
  let brief = null, busy = false, lastSent = 0;
  const GREET = "Hi! I'm the Brief helper. Tell me about your business or project (any kind is welcome), or ask anything about what v1sion makes.";
  bubble(log, "bot", GREET);
  const FIELDS = ["package", "placeName", "placeType", "city", "languages", "needs", "timing", "summary", "name", "email", "phone"];
  function saveDraft() {
    try {
      const f = $("#order-form"); const fields = {};
      FIELDS.forEach((k) => { if (f[k] && f[k].value) fields[k] = f[k].value; });
      localStorage.setItem(DRAFT, JSON.stringify({ at: Date.now(), convo, fields, briefShown: !f.hidden }));
    } catch {}
  }
  function clearDraft() { try { localStorage.removeItem(DRAFT); } catch {} }
  function restoreDraft() {
    let d = null; try { d = JSON.parse(localStorage.getItem(DRAFT) || "null"); } catch {}
    if (!d || Date.now() - d.at > 14 * 86400000 || (!d.convo?.length && !Object.keys(d.fields || {}).length)) return false;
    convo = d.convo || [];
    convo.forEach((m) => bubble(log, m.role === "assistant" ? "bot" : "me", m.content));
    const f = $("#order-form");
    Object.entries(d.fields || {}).forEach(([k, v]) => { if (f[k]) { f[k].value = v; f[k].dataset.touched = "1"; } });
    if (convo.length) $("#chips").hidden = true;
    if (d.briefShown) { f.hidden = false; setStep(2); }
    $("#resume").hidden = false;
    return true;
  }

  async function send(text) {
    if (busy || !text.trim() || form.dataset.closed) return;
    if (Date.now() - lastSent < 2500) return;
    lastSent = Date.now();
    busy = true;
    $("#chips").hidden = true;
    convo.push({ role: "user", content: text.trim() });
    bubble(log, "me", text.trim());
    input.value = "";
    input.style.height = "";
    const typing = bubble(log, "bot", "", "bub--typing");
    typing.innerHTML = "<span></span><span></span><span></span>";
    typing.setAttribute("aria-label", "Brief helper is typing");
    try {
      const out = await call("/helper", { messages: convo });
      typing.remove();
      if (out.junk) convo.pop(); else convo.push({ role: "assistant", content: out.reply });
      if (out.junk) convo.push({ role: "user", content: text.trim() }, { role: "assistant", content: out.reply });
      bubble(log, "bot", out.reply);
      if (out.brief) showBrief(out.brief);
      saveDraft();
      if (out.done) { form.dataset.closed = "1"; input.disabled = true; input.placeholder = "Chat finished: please use the brief below"; showBrief(brief || {}); }
    } catch (err) {
      typing.remove();
      convo.pop();
      bubble(log, "bot", err.status === 429 ? "Lots of people are chatting right now. Try again in a few minutes, or fill in the brief yourself below." : "The helper is resting right now. You can still fill in the brief yourself below.");
      showBrief(brief || {});
    } finally { busy = false; input.focus(); }
  }

  function showBrief(b) {
    brief = b;
    setStep(2);
    const f = $("#order-form");
    for (const k of ["placeName", "placeType", "city", "languages", "timing", "summary"]) if (b[k] && !f[k].dataset.touched) f[k].value = b[k];
    if (b.needs && !f.needs.dataset.touched) f.needs.value = [].concat(b.needs).join(", ");
    const first = f.hidden;
    f.hidden = false;
    if (first && !REDUCED) {
      gsap.fromTo(f, { clipPath: "inset(0 0 100% 0 round 24px)", y: 30 }, { clipPath: "inset(0 0 0% 0 round 24px)", y: 0, duration: 1, ease: "expo.out" });
      gsap.from(f.querySelectorAll(".fld, .brief__head, .go"), { y: 24, opacity: 0, stagger: 0.04, duration: 0.7, ease: "expo.out", delay: 0.2 });
    }
    if (first) setTimeout(() => f.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" }), 300);
  }

  form.addEventListener("submit", (e) => { e.preventDefault(); send(input.value); });
  grow(input);
  $("#order-form").addEventListener("focusin", (e) => { if (["name", "email", "phone"].includes(e.target.name)) setStep(3); });
  input.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input.value); } });
  $("#chips").querySelectorAll("button").forEach((b) => b.addEventListener("click", () => send(b.textContent)));
  document.querySelectorAll("[data-need]").forEach((b) => b.addEventListener("click", () => {
    document.querySelectorAll("[data-need]").forEach((x) => x.classList.toggle("on", x === b));
    send(b.dataset.need);
    if (window.innerWidth < 960) $(".chat").scrollIntoView({ behavior: "smooth", block: "start" });
  }));
  $("#order-form").querySelectorAll("input, textarea, select").forEach((el) => el.addEventListener("input", () => { el.dataset.touched = "1"; saveDraft(); }));
  $("#start-over").addEventListener("click", () => {
    if (!confirm("Start over? Your chat and brief on this device will be cleared.")) return;
    clearDraft(); location.href = location.pathname;
  });
  const restored = restoreDraft();
  // package from the main site's package cards (?package=Business)
  const pkg = new URLSearchParams(location.search).get("package");
  if (pkg && ["Starter", "Business", "Signature"].includes(pkg)) {
    const f = $("#order-form"); f.package.value = pkg; f.package.dataset.touched = "1";
    if (!restored) setTimeout(() => send(`I'm interested in the ${pkg} package.`), 400);
  }

  $("#order-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = e.currentTarget, err = $("#order-err");
    err.textContent = "";
    const btn = f.querySelector("button[type=submit]");
    btn.disabled = true;
    try {
      const out = await call("/orders", {
        name: f.name.value, email: f.email.value, phone: f.phone.value, website: f.website.value,
        brief: { package: f.package.value, placeName: f.placeName.value, placeType: f.placeType.value, city: f.city.value, languages: f.languages.value, timing: f.timing.value, summary: f.summary.value, needs: f.needs.value.split(/,\s*/) },
        transcript: convo,
      });
      clearDraft();
      await celebrate(btn);
      location.hash = "t=" + out.token;
      location.reload();
    } catch (ex) { err.textContent = ex.message; btn.disabled = false; }
  });
  // Let people fill in the brief by hand if they prefer.
  const manual = document.createElement("button");
  manual.type = "button"; manual.className = "manual"; manual.textContent = "Skip the chat and fill in the brief myself →";
  manual.addEventListener("click", () => showBrief({}));
  $(".chat").after(manual);
}

// ---------- Existing order: status + chat ----------
const STATUS = {
  new: ["Received.", "Thank you! I'll read your brief and reply here, usually within two working days."],
  accepted: ["Accepted.", "Great news: I'd love to make this. Check the chat for next steps."],
  in_progress: ["In progress.", "Your website is being made right now. Updates and previews come here in the chat."],
  done: ["Done.", "Your website is finished. Thank you for working with me!"],
  declined: ["Not this time.", "Thank you for thinking of me. See my message in the chat."],
};
async function myOrder(token) {
  $("#mine").hidden = false;
  const render = (o) => {
    $("#ref").textContent = o.ref;
    const [t, l] = STATUS[o.status] || STATUS.new;
    $("#status-title").textContent = t;
    $("#status-lead").textContent = l;
    $("#mine-status").textContent = (STATUS[o.status] || STATUS.new)[0].replace(".", "") + " · usually replies within 2 working days";
    renderTimeline(o.status);
    renderMineThread(o);
    const b = o.brief;
    $("#mine-brief").innerHTML = [["Package", b.package || "Not chosen"], ["Business", `${b.placeName} ${b.placeType ? "(" + b.placeType + ")" : ""}`], ["City", b.city], ["Needs", (b.needs || []).join(", ")], ["Languages", b.languages], ["When", b.timing], ["Summary", b.summary]]
      .map(([k, v]) => `<dt class="mono">${k}</dt><dd>${esc(v)}</dd>`).join("");
  };
  const load = async () => { try { render(await call("/orders/" + encodeURIComponent(token) + (document.hidden ? "" : "?seen=1"))); } catch (e) { $("#status-title").textContent = "Not found."; $("#status-lead").textContent = "This order link doesn't work. Check that you copied the whole link."; } };
  await load();
  setInterval(load, 8000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) { document.title = baseTitle; load(); } });
  $("#mine-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = $("#mine-input").value.trim(); if (!text) return;
    try { render(await call(`/orders/${encodeURIComponent(token)}/messages`, { text })); $("#mine-input").value = ""; } catch (ex) { alert(ex.message); }
  });
  grow($("#mine-input"));
  $("#mine-input").addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); $("#mine-form").requestSubmit(); } });
  $("#copy-link").addEventListener("click", () => { navigator.clipboard?.writeText(location.href); $("#copy-link span").textContent = "Copied"; });
}

function setStep(n) {
  document.querySelectorAll(".step").forEach((s) => {
    const k = Number(s.dataset.step);
    const was = s.classList.contains("on");
    s.classList.toggle("on", k === n); s.classList.toggle("done", k < n);
    if (!REDUCED && k === n && !was) {
      gsap.fromTo(s.querySelector(".step__n"), { scale: 0.4, rotate: -120 }, { scale: 1, rotate: 0, duration: 0.8, ease: "back.out(2.4)" });
      gsap.fromTo(s, { x: -8 }, { x: 0, duration: 0.6, ease: "elastic.out(1, 0.4)" });
    }
  });
}
function grow(el) {
  const fit = () => { el.style.height = "auto"; el.style.height = Math.min(el.scrollHeight, 140) + "px"; };
  el.addEventListener("input", fit);
}
const FLOW = [["new", "Received", "Your brief is with me"], ["accepted", "Accepted", "I'd love to make it"], ["in_progress", "In progress", "Your site is being made"], ["done", "Done", "Your website is live"]];
function renderTimeline(status) {
  const tl = $("#timeline"); if (!tl) return;
  if (status === "declined") {
    tl.innerHTML = `<li class="tl tl--done"><span class="tl__dot">✓</span><span><b>Received</b><small>Your brief reached me</small></span></li><li class="tl tl--no"><span class="tl__dot">×</span><span><b>Not this time</b><small>See my message in the chat</small></span></li>`;
    return;
  }
  const idx = Math.max(0, FLOW.findIndex(([s]) => s === status));
  tl.innerHTML = FLOW.map(([, t, d], i) => `<li class="tl ${i < idx || (i === idx && status === "done") ? "tl--done" : i === idx ? "tl--now" : ""}"><span class="tl__dot">${i < idx || (i === idx && status === "done") ? "✓" : i + 1}</span><span><b>${t}</b><small>${d}</small></span></li>`).join("");
}

// ---------- Client thread (links, days, seen) ----------
const baseTitle = document.title;
let lastSig = "", lastStudioCount = -1;
function dayLabel(iso) {
  const d = new Date(iso), t = new Date(); const y = new Date(); y.setDate(t.getDate() - 1);
  if (d.toDateString() === t.toDateString()) return "Today";
  if (d.toDateString() === y.toDateString()) return "Yesterday";
  return d.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });
}
function renderMineThread(o) {
  const sig = o.messages.map((m) => m.id).join() + "|" + o.adminSeenAt;
  const studioCount = o.messages.filter((m) => m.from === "studio").length;
  if (lastStudioCount >= 0 && studioCount > lastStudioCount && document.hidden) document.title = "(1) New message from v1sion";
  lastStudioCount = studioCount;
  if (sig === lastSig) return;
  lastSig = sig;
  const log = $("#mine-log");
  const atBottom = log.scrollHeight - log.scrollTop - log.clientHeight < 80;
  if (!o.messages.length) { log.innerHTML = '<p class="muted empty-chat">No messages yet. You can ask me anything here, for example about prices, timing or ideas. I usually reply within two working days.</p>'; return; }
  const lastMine = [...o.messages].reverse().find((m) => m.from === "client");
  let html = "", lastDay = "";
  o.messages.forEach((m) => {
    const day = dayLabel(m.at);
    if (day !== lastDay) { html += `<div class="day"><span>${esc(day)}</span></div>`; lastDay = day; }
    const tm = new Date(m.at).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
    const seen = m === lastMine && o.adminSeenAt && o.adminSeenAt >= m.at;
    html += `<div class="bub bub--${m.from === "studio" ? "bot" : "me"}"><div>${richHtml(m.text)}</div><time>${m.from === "studio" ? "v1sion" : "You"} · ${esc(tm)}${m.from === "client" ? (seen ? " · Seen ✓✓" : " · Sent ✓") : ""}</time></div>`;
  });
  log.innerHTML = html;
  if (atBottom || !renderMineThread.done) log.scrollTop = log.scrollHeight;
  renderMineThread.done = true;
}

// ---------- Animations ----------
function celebrate(btn) {
  if (REDUCED) return Promise.resolve();
  btn.querySelector("span").textContent = "Sent! ✓";
  const r = btn.getBoundingClientRect();
  const colors = ["#ff6a2b", "#ff9fd0", "#a58bff", "#ffd36b", "#47c27a"];
  for (let i = 0; i < 70; i++) {
    const d = document.createElement("i");
    d.className = "confetti";
    d.style.background = colors[i % colors.length];
    d.style.left = r.left + r.width / 2 + "px"; d.style.top = r.top + r.height / 2 + "px";
    document.body.appendChild(d);
    const a = Math.random() * Math.PI * 2, v = 120 + Math.random() * 260;
    gsap.to(d, { x: Math.cos(a) * v, y: Math.sin(a) * v - 120, rotate: Math.random() * 720, opacity: 0, duration: 1.2 + Math.random() * 0.6, ease: "power3.out", onComplete: () => d.remove() });
  }
  gsap.fromTo(btn, { scale: 0.92 }, { scale: 1, duration: 0.6, ease: "elastic.out(1, 0.4)" });
  return new Promise((res) => setTimeout(res, 1300));
}

function pageIntro() {
  if (REDUCED) return;
  const sec = document.querySelector("#new:not([hidden]), #mine:not([hidden])");
  if (!sec) return;
  // curtain
  const cur = document.createElement("div"); cur.className = "curtain"; document.body.appendChild(cur);
  gsap.to(cur, { yPercent: -100, duration: 1, ease: "expo.inOut", delay: 0.1, onComplete: () => cur.remove() });
  // title words rise
  const title = sec.querySelector(".ord__title");
  if (title && !title.dataset.split) {
    title.dataset.split = "1";
    const nodes = [...title.childNodes];
    title.innerHTML = "";
    nodes.forEach((n) => {
      if (n.nodeType === 3) n.textContent.split(/(\s+)/).forEach((w) => { if (!w) return; if (/^\s+$/.test(w)) { title.append(w); return; } const m = document.createElement("span"); m.className = "wmask"; const i = document.createElement("span"); i.className = "w"; i.textContent = w; m.append(i); title.append(m); });
      else { const m = document.createElement("span"); m.className = "wmask"; n.classList.add("w"); m.append(n); title.append(m); }
    });
  }
  const tl = gsap.timeline({ delay: 0.5 });
  tl.from(sec.querySelectorAll(".ord__title .w"), { yPercent: 110, rotate: 4, duration: 1.1, ease: "expo.out", stagger: 0.08 })
    .from(sec.querySelector(".eyebrow"), { y: -20, opacity: 0, duration: 0.7, ease: "expo.out" }, 0)
    .from(sec.querySelectorAll(".ord__lead, .trust li, .needs__q"), { y: 20, opacity: 0, stagger: 0.05, duration: 0.8, ease: "expo.out" }, "-=0.7")
    .from(sec.querySelectorAll(".needs__grid button"), { scale: 0.7, opacity: 0, stagger: { each: 0.05, grid: "auto", from: "start" }, duration: 0.7, ease: "back.out(1.8)" }, "-=0.5")
    .from(sec.querySelectorAll(".step, .help, .ofaq details, .perks li, .tl, .saveme"), { x: -30, opacity: 0, stagger: 0.05, duration: 0.7, ease: "expo.out" }, "-=0.5")
    .from(sec.querySelectorAll(".ord__panel > *:not([hidden])"), { x: 80, rotateY: -12, opacity: 0, transformPerspective: 1200, stagger: 0.1, duration: 1.2, ease: "expo.out" }, 0.2);
  // orbs follow the mouse a little
  const orbs = document.querySelectorAll(".orb");
  window.addEventListener("pointermove", (e) => {
    const x = e.clientX / innerWidth - 0.5, y = e.clientY / innerHeight - 0.5;
    orbs.forEach((o, i) => gsap.to(o, { x: x * (40 + i * 30), y: y * (40 + i * 30), duration: 1.6, ease: "power3.out", overwrite: "auto" }));
  }, { passive: true });
  if (window.matchMedia("(hover: hover)").matches) {
    // cursor ring
    const c = document.createElement("div"); c.className = "cursor"; c.setAttribute("aria-hidden", "true"); document.body.appendChild(c);
    let x = 0, y = 0, cx = 0, cy = 0;
    window.addEventListener("pointermove", (e) => { x = e.clientX; y = e.clientY; c.classList.add("on"); }, { passive: true });
    gsap.ticker.add(() => { cx += (x - cx) * 0.2; cy += (y - cy) * 0.2; c.style.transform = `translate(${cx}px, ${cy}px)`; });
    document.querySelectorAll("a, button, summary, textarea, input, select").forEach((el) => {
      el.addEventListener("pointerenter", () => c.classList.add("big"));
      el.addEventListener("pointerleave", () => c.classList.remove("big"));
    });
    // magnetic buttons
    document.querySelectorAll(".send, .go, .avail, .theme-btn, .ghost").forEach((el) => {
      el.addEventListener("pointermove", (e) => { const r = el.getBoundingClientRect(); gsap.to(el, { x: (e.clientX - r.left - r.width / 2) * 0.3, y: (e.clientY - r.top - r.height / 2) * 0.3, duration: 0.4, ease: "power3.out" }); });
      el.addEventListener("pointerleave", () => gsap.to(el, { x: 0, y: 0, duration: 0.7, ease: "elastic.out(1, 0.4)" }));
    });
    // tiles tilt
    document.querySelectorAll(".needs__grid button, .trust li").forEach((el) => {
      el.addEventListener("pointermove", (e) => { const r = el.getBoundingClientRect(); const px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5; gsap.to(el, { rotateY: px * 14, rotateX: -py * 14, transformPerspective: 700, duration: 0.4, ease: "power3.out" }); });
      el.addEventListener("pointerleave", () => gsap.to(el, { rotateY: 0, rotateX: 0, duration: 0.8, ease: "elastic.out(1, 0.5)" }));
    });
  }
  // tile tap bounce
  document.querySelectorAll("[data-need]").forEach((b) => b.addEventListener("click", () => gsap.fromTo(b, { scale: 0.9 }, { scale: 1, duration: 0.6, ease: "elastic.out(1, 0.4)" })));
}

// ---------- Light / dark mode (shared with the main site) ----------
(() => {
  const KEY = "v1-theme";
  let t = "dark"; try { t = localStorage.getItem(KEY) || "dark"; } catch {}
  document.documentElement.dataset.theme = t;
  document.querySelectorAll(".theme-btn").forEach((b) => b.addEventListener("click", () => {
    t = document.documentElement.dataset.theme === "light" ? "dark" : "light";
    document.documentElement.dataset.theme = t;
    try { localStorage.setItem(KEY, t); } catch {}
  }));
})();

// Wake the server early (free hosting sleeps when idle).
fetch(API + "/health").catch(() => {});

const token = new URLSearchParams(location.hash.slice(1)).get("t");
if (token) myOrder(token); else newOrder();
pageIntro();
