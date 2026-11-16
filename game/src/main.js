// CAUSEWAY — the game loop and state machine. States: title, play,
// paused, interlude (dawn between nights), win (the seventh dawn) and
// over (the dark wins). Everything the other modules compute is wired
// together here, and only here.

import { CFG } from './config.js';
import { mulberry32, range } from './random.js';
import { installInput, isDown, wasPressed, endFrame } from './input.js';
import { ensureAudio, toggleMute, sfx } from './audio.js';
import { makeWorld, burnBraziers, rekindleAtDawn, litCount } from './world.js';
import { makeKeeper, updateKeeper } from './keeper.js';
import { makeWraith, updateWraiths } from './wraiths.js';
import { draw } from './render.js';
import { applyShot } from './shots.js';

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const seed = shotName ? 1337 : (Date.now() % 2147483647);

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

function freshState() {
  const rng = mulberry32(seed);
  return {
    rng,
    t: 0,
    phase: 'title',
    night: 1,
    nightT: 0,
    score: 0,
    banished: 0,
    best: 0,
    world: makeWorld(),
    keeper: makeKeeper(),
    wraiths: [],
    particles: [],
    spawnTimer: 2.2,
    emberTimer: 0,
    interludeT: 0,
    lastNightBonus: 0,
    loseReason: '',
    flareFlash: 0,
    hintAlpha: 1,
    muted: false,
  };
}

let state = freshState();

function emit(kind, x, y) {
  const push = (n, color, speed, size, life, up) => {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = speed * (0.4 + Math.random() * 0.8);
      state.particles.push({
        x, y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v - (up || 0),
        life: life * (0.6 + Math.random() * 0.7),
        maxLife: life,
        size: size * (0.7 + Math.random() * 0.6),
        color,
      });
    }
  };
  if (kind === 'tend-spark') push(2, '#ffd76a', 26, 2.5, 0.7, 34);
  else if (kind === 'ember') push(1, '#ffb45a', 12, 2, 1.4, 26);
  else if (kind === 'banish-burst') push(14, '#c9b8ff', 130, 3.5, 0.8, 0);
  else if (kind === 'hiss-puff') push(5, '#8a8a9a', 22, 3, 1.1, 18);
  else if (kind === 'hurt-burst') push(8, '#e5484d', 110, 3, 0.6, 0);
}

function updateParticles(dt) {
  for (const p of state.particles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= Math.max(0, 1 - dt * 2.4);
    p.vy *= Math.max(0, 1 - dt * 2.4);
    p.life -= dt;
  }
  state.particles = state.particles.filter((p) => p.life > 0);
}

function spawnInterval() {
  const f = (state.night - 1) / (CFG.NIGHTS - 1);
  return CFG.WRAITH_SPAWN_START_S + (CFG.WRAITH_SPAWN_END_S - CFG.WRAITH_SPAWN_START_S) * f;
}

function startGame() {
  state = freshState();
  state.phase = 'play';
  state.best = window.__causewayBest || 0;
  // The debug hook must follow the reassignment, or anything reading
  // window.__causeway (playtest bot, screenshots) sees a dead object.
  window.__causeway = state;
  ensureAudio();
  sfx.confirm();
}

function endNight() {
  const lit = litCount(state.world);
  const bonus = CFG.SCORE_NIGHT_BASE + CFG.SCORE_NIGHT_PER_NIGHT * state.night + lit * CFG.SCORE_BRAZIER_AT_DAWN;
  state.score += bonus;
  state.lastNightBonus = bonus;
  state.wraiths = [];
  rekindleAtDawn(state.world);
  state.keeper.hearts = Math.min(CFG.KEEPER_HEARTS, state.keeper.hearts + 1);
  state.keeper.flame = Math.min(CFG.FLAME_MAX, state.keeper.flame + 25);
  if (state.night >= CFG.NIGHTS) {
    state.phase = 'win';
    state.best = Math.max(state.best, state.score);
    window.__causewayBest = state.best;
    sfx.victory();
  } else {
    state.phase = 'interlude';
    state.interludeT = 0;
    sfx.dawn();
  }
}

function gameOver(reason) {
  state.phase = 'over';
  state.loseReason = reason;
  state.best = Math.max(state.best, state.score);
  window.__causewayBest = state.best;
  sfx.defeat();
}

function update(dt) {
  state.t += dt;
  if (state.flareFlash > 0) state.flareFlash = Math.max(0, state.flareFlash - dt * 0.45);

  if (wasPressed('mute')) {
    state.muted = toggleMute();
  }

  if (state.phase === 'title') {
    // The world idles behind the title: braziers burn, nothing hunts.
    burnBraziers(state.world, dt * 0.2, 1);
    if (wasPressed('confirm')) startGame();
    return;
  }

  if (state.phase === 'paused') {
    if (wasPressed('pause') || wasPressed('confirm')) state.phase = 'play';
    return;
  }

  if (state.phase === 'interlude') {
    state.interludeT += dt;
    updateParticles(dt);
    if (state.interludeT >= CFG.DAWN_SECONDS || wasPressed('confirm')) {
      state.night += 1;
      state.nightT = 0;
      state.spawnTimer = 2.0;
      state.phase = 'play';
    }
    return;
  }

  if (state.phase === 'win' || state.phase === 'over') {
    updateParticles(dt);
    if (wasPressed('restart') || wasPressed('confirm')) startGame();
    return;
  }

  // --- play ---
  if (wasPressed('pause')) {
    state.phase = 'paused';
    return;
  }
  state.hintAlpha = Math.max(0, state.hintAlpha - dt * 0.09);
  state.nightT += dt;

  // Ambient embers: every lit brazier breathes a little light upward.
  state.emberTimer -= dt;
  if (state.emberTimer <= 0) {
    state.emberTimer = 0.14;
    const lit = state.world.braziers.filter((b) => b.lit);
    if (lit.length) {
      const b = lit[Math.floor(Math.random() * lit.length)];
      emit('ember', b.x + (Math.random() * 16 - 8), b.y - 16);
    }
  }

  // Spawn wraiths out of the dark water.
  state.spawnTimer -= dt;
  if (state.spawnTimer <= 0) {
    state.wraiths.push(makeWraith(state.rng, state.night, state.t));
    state.spawnTimer = spawnInterval() * range(state.rng, 0.8, 1.25);
  }

  const input = { tend: isDown('tend'), flare: wasPressed('flare') };
  const events = updateKeeper(state.keeper, dt, input, state.world, state.wraiths, emit);
  if (events.flared) state.flareFlash = 1;

  updateWraiths(state.wraiths, dt, state.t, state.world, state.keeper, emit);

  // Count newly banished wraiths and pay for them.
  for (const w of state.wraiths) {
    if (w.banished && !w.counted) {
      w.counted = true;
      state.banished += 1;
      state.score += CFG.SCORE_BANISH;
      sfx.banish();
    }
  }
  state.wraiths = state.wraiths.filter((w) => !w.dead);

  const wentDark = burnBraziers(state.world, dt, state.night);
  for (const b of wentDark) {
    sfx.snuffed();
    emit('hiss-puff', b.x, b.y - 12);
  }

  updateParticles(dt);

  // Lose: the keeper falls, or every brazier goes dark at once.
  if (state.keeper.hearts <= 0) {
    gameOver('The keeper fell in the dark on night ' + state.night + '.');
    return;
  }
  if (litCount(state.world) === 0) {
    gameOver('The last brazier went dark on night ' + state.night + '.');
    return;
  }

  // Win the night: the full span survived.
  if (state.nightT >= CFG.NIGHT_SECONDS) endNight();
}

let last = performance.now();

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  update(dt);
  draw(ctx, state);
  endFrame();
  requestAnimationFrame(frame);
}

installInput();
window.addEventListener('pointerdown', ensureAudio, { once: true });
window.addEventListener('keydown', ensureAudio, { once: true });

if (shotName) {
  // Staged scene for screenshots: fixed seed, preset positions.
  applyShot(state, shotName);
  state.t = 2.4; // let flames and water settle into their flicker
}

// Debug hook for play-testing: window.__causeway exposes live state.
window.__causeway = state;
requestAnimationFrame(frame);
