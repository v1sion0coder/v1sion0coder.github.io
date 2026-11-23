// Screenshots + checks with headless Chrome over the DevTools protocol (no extra packages).
//   node scripts/shoot.mjs <outDir> <url> <width> <height> [scrollFraction|#selector ...]
// Prints console errors and horizontal overflow for each run.
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const [dir, url, W, H, ...stops] = process.argv.slice(2);
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 9700 + Math.floor(Math.random() * 200);
const profile = join(tmpdir(), 'v1sion-shot-' + Date.now());
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`,
  '--hide-scrollbars', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--no-first-run', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let ws, id = 0;
const pending = new Map();
const logs = [];
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const i = ++id; pending.set(i, { resolve, reject }); ws.send(JSON.stringify({ id: i, method, params }));
});
for (let k = 0; k < 40 && !ws; k++) {
  try {
    const t = await (await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: 'PUT' })).json();
    const s = new WebSocket(t.webSocketDebuggerUrl);
    await new Promise((r, j) => { s.onopen = r; s.onerror = j; });
    s.onmessage = (m) => {
      const d = JSON.parse(m.data);
      if (d.id && pending.has(d.id)) { const p = pending.get(d.id); pending.delete(d.id); d.error ? p.reject(new Error(d.error.message)) : p.resolve(d.result); }
      if (d.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(d.params.type)) logs.push(`[console.${d.params.type}] ${d.params.args.map((a) => a.value ?? a.description).join(' ')}`);
      if (d.method === 'Runtime.exceptionThrown') logs.push(`[exception] ${d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text}`);
      if (d.method === 'Log.entryAdded' && d.params.entry.level === 'error') logs.push(`[log] ${d.params.entry.text} ${d.params.entry.url || ''}`);
    };
    ws = s;
  } catch { await sleep(250); }
}
const evalJs = async (expr) => (await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })).result?.value;
await send('Page.enable'); await send('Runtime.enable'); await send('Log.enable');
const mobile = Number(W) < 768;
await send('Emulation.setDeviceMetricsOverride', { width: Number(W), height: Number(H), deviceScaleFactor: mobile ? 2 : 1, mobile });
mkdirSync(dir, { recursive: true });
await send('Page.navigate', { url }); await sleep(5000);
for (const s of stops.length ? stops : ['0']) {
  if (s.startsWith('click:')) { await evalJs(`document.querySelector(${JSON.stringify(s.slice(6))}).click()`); await sleep(1500); await evalJs(`(async()=>{const el=document.querySelector(${JSON.stringify(s.slice(6))});scrollTo(0,el.getBoundingClientRect().top+scrollY-90);})()`); }
  else if (s.startsWith('#') || s.startsWith('.')) {
    await evalJs(`(async()=>{const el=document.querySelector(${JSON.stringify(s)});const y=el.getBoundingClientRect().top+scrollY;for(let k=scrollY;k<y;k+=innerHeight*.5){scrollTo(0,k);await new Promise(r=>setTimeout(r,80));}scrollTo(0,y);})()`);
  } else {
    await evalJs(`(async()=>{const T=${Number(s)}*(document.documentElement.scrollHeight-innerHeight);for(let k=scrollY;k<T;k+=innerHeight*.5){scrollTo(0,k);await new Promise(r=>setTimeout(r,80));}scrollTo(0,T);})()`);
  }
  await sleep(2200);
  const { data } = await send('Page.captureScreenshot', { format: 'png' });
  const name = `${W}-${s.replace(/\W+/g, '') || 'top'}.png`;
  writeFileSync(join(dir, name), Buffer.from(data, 'base64'));
  console.log('saved', name);
}
if (process.env.EVAL) console.log('eval:', await evalJs(process.env.EVAL));
const of = await evalJs(`(()=>{const W=document.documentElement.clientWidth;const bad=[...document.querySelectorAll('body *')].filter(n=>{const b=n.getBoundingClientRect();return b.width>0&&(b.right>W+1||b.left<-1)&&!n.closest('.marquee,.stage,svg')}).slice(0,6).map(n=>n.tagName+'.'+String(n.className).slice(0,30)+' r='+Math.round(n.getBoundingClientRect().right));return JSON.stringify({scrollW:document.documentElement.scrollWidth,W,bad})})()`);
console.log('overflow:', of);
console.log(logs.length ? 'console:\n' + [...new Set(logs)].join('\n') : 'console: clean');
ws.close(); chrome.kill();
