// CAUSEWAY — screenshot + playtest driver (Node 22, standard library only).
// Talks to headless Chrome over CDP with the built-in WebSocket client.
// Usage:
//   node tools/shots.mjs shot <name> <out.jpg> [waitMs]
//   node tools/shots.mjs state <url>            (dump window.__causeway)
//   node tools/shots.mjs eval <url> <js>        (run JS in the page)
// Chrome must already run headless with --remote-debugging-port=9222 and
// the page open at the URL given. The caller starts both.

const PORT = 9222;

async function listTargets() {
  const res = await fetch(`http://127.0.0.1:${PORT}/json/list`);
  return res.json();
}

async function connect(url) {
  const targets = await listTargets();
  const page = targets.find((t) => t.type === 'page' && t.url.includes(url));
  if (!page) throw new Error('no page target for ' + url + ' (open it in Chrome first)');
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
    } else if (msg.method) {
      events.push(msg);
    }
  };
  const send = (method, params = {}) =>
    new Promise((resolve) => {
      const mid = ++id;
      pending.set(mid, resolve);
      ws.send(JSON.stringify({ id: mid, method, params }));
    });
  return { ws, send, events };
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

const [cmd, ...args] = process.argv.slice(2);

if (cmd === 'shot') {
  const [name, out, waitMs = '2500'] = args;
  const url = `http://127.0.0.1:8902/index.html?shot=${name}`;
  const targets = await listTargets();
  const page = targets.find((t) => t.type === 'page');
  if (!page) throw new Error('no page target open in Chrome');
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
    } else if (msg.method) {
      events.push(msg);
    }
  };
  const send = (method, params = {}) =>
    new Promise((resolve) => {
      const mid = ++id;
      pending.set(mid, resolve);
      ws.send(JSON.stringify({ id: mid, method, params }));
    });
  await send('Runtime.enable');
  await send('Page.enable');
  // Force an exact 1280x720 viewport: headless Chrome's --window-size
  // alone leaves a shorter viewport (1280x577), letterboxing the game.
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url });
  await sleep(Number(waitMs));
  const shot = await send('Page.captureScreenshot', { format: 'jpeg', quality: 88 });
  const { writeFileSync } = await import('node:fs');
  writeFileSync(out, Buffer.from(shot.result.data, 'base64'));
  const errors = events.filter(
    (e) =>
      (e.method === 'Runtime.exceptionThrown' ||
        (e.method === 'Runtime.consoleAPICalled' && e.params.type === 'error')),
  );
  const st = await send('Runtime.evaluate', {
    expression: `JSON.stringify({phase: window.__causeway?.phase, night: window.__causeway?.night, score: window.__causeway?.score, wraiths: window.__causeway?.wraiths?.length})`,
    returnByValue: true,
  });
  console.log(out, 'state=', st.result?.result?.value, 'consoleErrors=', errors.length);
  if (errors.length) console.log(JSON.stringify(errors).slice(0, 2000));
  ws.close();
  process.exit(0);
}

if (cmd === 'state' || cmd === 'eval') {
  const [url, expr] = args;
  const { ws, send, events } = await connect(url);
  await send('Runtime.enable');
  await sleep(1200);
  const js = cmd === 'state'
    ? `JSON.stringify({phase: window.__causeway?.phase, night: window.__causeway?.night, nightT: window.__causeway?.nightT?.toFixed(1), score: window.__causeway?.score, hearts: window.__causeway?.keeper?.hearts, flame: Math.round(window.__causeway?.keeper?.flame || 0), wraiths: window.__causeway?.wraiths?.length, lit: window.__causeway?.world?.braziers?.filter(b=>b.lit).length})`
    : expr;
  const r = await send('Runtime.evaluate', { expression: js, returnByValue: true });
  console.log(r.result?.result?.value ?? JSON.stringify(r.result));
  const errors = events.filter((e) => e.method === 'Runtime.exceptionThrown');
  if (errors.length) console.log('EXCEPTIONS:', JSON.stringify(errors).slice(0, 2000));
  ws.close();
  process.exit(0);
}

console.error('usage: shots.mjs shot <name> <out.jpg> [waitMs] | state <url> | eval <url> <js>');
process.exit(1);
