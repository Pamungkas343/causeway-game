// CAUSEWAY — wraiths. Smoke shapes that rise out of the dark water and
// drift toward the nearest lit brazier to snuff it. Lantern light pushes
// them back; a flare banishes them; touching the keeper wounds him.

import { CFG } from './config.js';
import { range, pick } from './random.js';
import { sfx } from './audio.js';
import { lightRadius, hurtKeeper } from './keeper.js';

export function makeWraith(rng, night, t) {
  // Spawn on a water edge, away from the causeway band.
  const edge = pick(rng, ['top', 'bottom', 'left', 'right']);
  let x;
  let y;
  if (edge === 'top') {
    x = range(rng, 60, CFG.W - 60);
    y = range(rng, 30, 90);
  } else if (edge === 'bottom') {
    x = range(rng, 60, CFG.W - 60);
    y = range(rng, CFG.H - 90, CFG.H - 30);
  } else if (edge === 'left') {
    x = range(rng, 20, 60);
    y = range(rng, 60, CFG.H - 60);
  } else {
    x = range(rng, CFG.W - 60, CFG.W - 20);
    y = range(rng, 60, CFG.H - 60);
  }
  return {
    x,
    y,
    seed: range(rng, 0, 100),
    speed: CFG.WRAITH_SPEED_BASE + CFG.WRAITH_SPEED_PER_NIGHT * (night - 1) + range(rng, -8, 12),
    wobble: range(rng, 0.6, 1.4),
    target: null, // brazier object, resolved each step
    latched: false,
    recoil: 0,
    dead: false,
    banished: false,
    bornAt: t,
  };
}

function nearestLitBrazier(world, x, y) {
  let best = null;
  let bestD = Infinity;
  for (const b of world.braziers) {
    if (!b.lit) continue;
    const dx = b.x - x;
    const dy = b.y - y;
    const d = dx * dx + dy * dy;
    if (d < bestD) {
      bestD = d;
      best = b;
    }
  }
  return best;
}

// One update step for all wraiths. Returns wraiths that just latched onto
// a brazier (for the hiss) and whether the keeper was hurt.
export function updateWraiths(wraiths, dt, t, world, keeper, emit) {
  let keeperHurt = false;
  const radius = lightRadius(keeper);

  for (const w of wraiths) {
    if (w.dead) continue;
    if (w.recoil > 0) w.recoil -= dt;

    const target = nearestLitBrazier(world, w.x, w.y);
    w.target = target;
    const prevLatched = w.latched;
    w.latched = false;

    if (target) {
      const dx = target.x - w.x;
      const dy = target.y - w.y;
      const d = Math.hypot(dx, dy) || 1;
      // Latch: close enough to snuff the flame.
      if (d < 30) {
        w.latched = true;
        if (!prevLatched) {
          sfx.hiss();
          emit('hiss-puff', target.x, target.y - 18);
        }
      } else if (w.recoil <= 0) {
        // Drift toward the brazier, with a slow wobble.
        const wob = Math.sin(t * 1.7 * w.wobble + w.seed) * 0.45;
        const px = -dy / d;
        const py = dx / d;
        w.x += ((dx / d) * w.speed + px * wob * 30) * dt;
        w.y += ((dy / d) * w.speed + py * wob * 30) * dt;
      }
    } else {
      // No lit brazier left to hunt: drift toward the keeper instead.
      const dx = keeper.x - w.x;
      const dy = keeper.y - w.y;
      const d = Math.hypot(dx, dy) || 1;
      if (w.recoil <= 0) {
        w.x += (dx / d) * w.speed * 0.6 * dt;
        w.y += (dy / d) * w.speed * 0.6 * dt;
      }
    }

    // Lantern light repels: inside the glow, a wraith is pushed back.
    const kdx = w.x - keeper.x;
    const kdy = w.y - keeper.y;
    const kd = Math.hypot(kdx, kdy) || 1;
    if (kd < radius && !w.latched) {
      const push = (1 - kd / radius) * 120;
      w.x += (kdx / kd) * push * dt;
      w.y += (kdy / kd) * push * dt;
    }

    // Touch the keeper: wound him, and the wraith recoils away.
    if (kd < CFG.WRAITH_RADIUS + CFG.KEEPER_RADIUS - 4) {
      if (hurtKeeper(keeper, w.x, w.y)) {
        keeperHurt = true;
        w.recoil = 1.0;
        w.x -= (kdx / kd) * 70;
        w.y -= (kdy / kd) * 70;
        emit('hurt-burst', keeper.x, keeper.y);
      }
    }
  }

  // Count latched wraiths per brazier (the burn step reads this).
  for (const b of world.braziers) b.latched = 0;
  for (const w of wraiths) {
    if (!w.dead && w.latched && w.target) w.target.latched += 1;
  }

  return { keeperHurt };
}
