// CAUSEWAY — in-page playtest bot. Drives the real game with synthetic
// keyboard events (the same events a human player produces) and reports
// whether the loop is winnable and where it breaks. Run:
//   node tools/bot.mjs [seconds]
// Chrome must run headless with --remote-debugging-port=9222.

const SECONDS = Number(process.argv[2] || 120);
const URL = 'http://127.0.0.1:8902/index.html';

const BOT_JS = `
(function () {
  if (window.__bot) return 'already running';
  const held = {};
  const CODE = { up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD', tend: 'KeyE', flare: 'Space', confirm: 'Enter' };
  function setKey(name, down) {
    if (!!held[name] === !!down) return;
    held[name] = !!down;
    window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { code: CODE[name], bubbles: true }));
  }
  function tap(name) {
    setKey(name, true);
    setTimeout(() => setKey(name, false), 60);
  }
  window.__botLog = [];
  window.__bot = setInterval(() => {
    const s = window.__causeway;
    if (!s) return;
    if (s.phase === 'title') { tap('confirm'); return; }
    if (s.phase === 'interlude') { return; }
    if (s.phase === 'win' || s.phase === 'over') {
      window.__botLog.push(s.phase + ' score=' + s.score + ' night=' + s.night);
      clearInterval(window.__bot);
      window.__bot = null;
      return;
    }
    if (s.phase !== 'play') return;
    const k = s.keeper;
    // Pick a target: latched brazier first, then a dark one to relight,
    // then lowest-fuel lit brazier, else the Heartflame when low.
    let tx = 640, ty = 370, mode = 'heart';
    let worst = null, worstFuel = 101;
    for (const b of s.world.braziers) {
      if (b.lit && b.latched > 0) { worst = b; break; }
    }
    if (!worst) for (const b of s.world.braziers) { if (!b.lit) { worst = b; break; } }
    if (!worst) for (const b of s.world.braziers) {
      if (b.lit && b.fuel < worstFuel) { worstFuel = b.fuel; worst = b; }
    }
    if (k.flame < 30) { tx = 640; ty = 370; mode = 'heart'; }
    else if (worst) { tx = worst.x; ty = worst.y; mode = 'tend'; }
    const dx = tx - k.x, dy = ty - k.y;
    const d = Math.hypot(dx, dy);
    setKey('left', dx < -12);
    setKey('right', dx > 12);
    setKey('up', dy < -12);
    setKey('down', dy > 12);
    // Tend when close to a brazier that needs flame.
    setKey('tend', mode === 'tend' && d < 80 && k.flame > 5);
    // Flare when a wraith is close.
    let near = false;
    for (const w of s.wraiths) {
      if (!w.dead && Math.hypot(w.x - k.x, w.y - k.y) < 150) { near = true; break; }
    }
    if (near && k.flame >= 26) tap('flare');
  }, 150);
  return 'bot started';
})()
`;

async function listTargets() {
  const res = await fetch('http://127.0.0.1:9222/json/list');
  return res.json();
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const targets = await listTargets();
const page = targets.find((t) => t.type === 'page');
if (!page) throw new Error('no page target');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  ws.onopen = resolve;
  ws.onerror = reject;
});
let id = 0;
const pending = new Map();
const events = [];
ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg);
    pending.delete(msg.id);
  } else if (msg.method) events.push(msg);
};
const send = (method, params = {}) =>
  new Promise((resolve) => {
    const mid = ++id;
    pending.set(mid, resolve);
    ws.send(JSON.stringify({ id: mid, method, params }));
  });

await send('Runtime.enable');
await send('Page.enable');
await send('Page.navigate', { url: URL });
await sleep(1500);
const start = await send('Runtime.evaluate', { expression: BOT_JS, returnByValue: true });
console.log('bot:', start.result?.result?.value);

const t0 = Date.now();
while (Date.now() - t0 < SECONDS * 1000) {
  await sleep(10000);
  const r = await send('Runtime.evaluate', {
    expression: `JSON.stringify({phase: window.__causeway?.phase, night: window.__causeway?.night, nightT: Math.round(window.__causeway?.nightT||0), score: window.__causeway?.score, hearts: window.__causeway?.keeper?.hearts, flame: Math.round(window.__causeway?.keeper?.flame||0), wraiths: window.__causeway?.wraiths?.length, lit: window.__causeway?.world?.braziers?.filter(b=>b.lit).length, log: window.__botLog})`,
    returnByValue: true,
  });
  console.log(Math.round((Date.now() - t0) / 1000) + 's', r.result?.result?.value);
  const v = JSON.parse(r.result?.result?.value || '{}');
  if (v.phase === 'win' || v.phase === 'over') break;
}
const errors = events.filter((e) => e.method === 'Runtime.exceptionThrown');
console.log('exceptions:', errors.length);
if (errors.length) console.log(JSON.stringify(errors).slice(0, 1500));
ws.close();
process.exit(0);
