import "@fontsource/syne/400.css";
import "@fontsource/syne/700.css";
import "@fontsource/syne/800.css";
import "@fontsource/jetbrains-mono/400.css";
import "./style.css";
import "./order.css";

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
  const convo = [];
  let brief = null, busy = false, lastSent = 0;
  bubble(log, "bot", "Hi! I'm the Brief helper. Tell me about your business or project (any kind is welcome), or ask anything about what v1sion makes.");

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
    if (first) setTimeout(() => f.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" }), 300);
  }

  form.addEventListener("submit", (e) => { e.preventDefault(); send(input.value); });
  grow(input);
  $("#order-form").addEventListener("focusin", (e) => { if (["name", "email", "phone"].includes(e.target.name)) setStep(3); });
  input.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input.value); } });
  $("#chips").querySelectorAll("button").forEach((b) => b.addEventListener("click", () => send(b.textContent)));
  $("#order-form").querySelectorAll("input, textarea").forEach((el) => el.addEventListener("input", () => { el.dataset.touched = "1"; }));

  $("#order-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = e.currentTarget, err = $("#order-err");
    err.textContent = "";
    const btn = f.querySelector("button[type=submit]");
    btn.disabled = true;
    try {
      const out = await call("/orders", {
        name: f.name.value, email: f.email.value, phone: f.phone.value, website: f.website.value,
        brief: { placeName: f.placeName.value, placeType: f.placeType.value, city: f.city.value, languages: f.languages.value, timing: f.timing.value, summary: f.summary.value, needs: f.needs.value.split(/,\s*/) },
        transcript: convo,
      });
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
    const log = $("#mine-log");
    log.innerHTML = o.messages.length ? "" : '<p class="mono muted">No messages yet. Ask anything here.</p>';
    o.messages.forEach((m) => { const b = bubble(log, m.from === "studio" ? "bot" : "me", m.text); const s = document.createElement("time"); s.textContent = (m.from === "studio" ? "v1sion · " : "You · ") + time(m.at); b.appendChild(s); });
    const b = o.brief;
    $("#mine-brief").innerHTML = [["Business", `${b.placeName} ${b.placeType ? "(" + b.placeType + ")" : ""}`], ["City", b.city], ["Needs", (b.needs || []).join(", ")], ["Languages", b.languages], ["When", b.timing], ["Summary", b.summary]]
      .map(([k, v]) => `<dt class="mono">${k}</dt><dd>${esc(v)}</dd>`).join("");
  };
  const load = async () => { try { render(await call("/orders/" + encodeURIComponent(token))); } catch (e) { $("#status-title").textContent = "Not found."; $("#status-lead").textContent = "This order link doesn't work. Check that you copied the whole link."; } };
  await load();
  setInterval(load, 20000);
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
    s.classList.toggle("on", k === n); s.classList.toggle("done", k < n);
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

// Wake the server early (free hosting sleeps when idle).
fetch(API + "/health").catch(() => {});

const token = new URLSearchParams(location.hash.slice(1)).get("t");
if (token) myOrder(token); else newOrder();
