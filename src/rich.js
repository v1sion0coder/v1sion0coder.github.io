// Chat message formatting shared by the order page and the admin.
//   [any words](https://link)  -> those words become a link
//   https://site.com or www.site.com -> clickable link
//   **bold**
// Only http(s) links are allowed; everything else is shown as plain text.
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export function safeUrl(raw) {
  let u = String(raw || "").trim();
  if (/^www\./i.test(u)) u = "https://" + u;
  try {
    const url = new URL(u);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
  } catch { return null; }
}

const RX = /\[([^\]\n]{1,200})\]\(\s*((?:https?:\/\/|www\.)[^\s)]+)\s*\)|((?:https?:\/\/|www\.)[^\s<]*[^\s<.,;:!?)\]'"])|\*\*([^*\n]{1,300})\*\*/gi;

export function parse(text) {
  const parts = [];
  const links = [];
  let last = 0, m;
  RX.lastIndex = 0;
  while ((m = RX.exec(text))) {
    if (m.index > last) parts.push({ t: "text", v: text.slice(last, m.index) });
    if (m[1] !== undefined) {
      const href = safeUrl(m[2]);
      if (href) { parts.push({ t: "link", v: m[1], href }); links.push({ label: m[1], href }); } else parts.push({ t: "text", v: m[0] });
    } else if (m[3] !== undefined) {
      const href = safeUrl(m[3]);
      if (href) { parts.push({ t: "link", v: m[3].replace(/^https?:\/\//i, ""), href }); links.push({ label: null, href }); } else parts.push({ t: "text", v: m[0] });
    } else if (m[4] !== undefined) {
      parts.push({ t: "bold", v: m[4] });
    }
    last = RX.lastIndex;
  }
  if (last < text.length) parts.push({ t: "text", v: text.slice(last) });
  return { parts, links };
}

export function richHtml(text, { cards = true } = {}) {
  const { parts, links } = parse(String(text || ""));
  let html = parts.map((p) => {
    if (p.t === "link") return `<a class="rl" href="${esc(p.href)}" target="_blank" rel="noopener noreferrer nofollow">${esc(p.v)}</a>`;
    if (p.t === "bold") return `<strong>${esc(p.v)}</strong>`;
    return esc(p.v);
  }).join("");
  if (cards && links.length) {
    const seen = new Set();
    html += links.filter((l) => !seen.has(l.href) && seen.add(l.href)).slice(0, 3).map((l) => {
      const u = new URL(l.href);
      const host = u.hostname.replace(/^www\./, "");
      const path = (u.pathname + u.search).replace(/\/$/, "");
      return `<a class="lcard" href="${esc(l.href)}" target="_blank" rel="noopener noreferrer nofollow">
        <span class="lcard__ic" aria-hidden="true">${esc(host.slice(0, 1).toUpperCase())}</span>
        <span class="lcard__tx"><b>${esc(l.label || host)}</b><small>${esc(host + (path && path.length < 40 ? path : path ? path.slice(0, 38) + "…" : ""))}</small></span>
        <span class="lcard__go" aria-hidden="true">↗</span></a>`;
    }).join("");
  }
  return html;
}
