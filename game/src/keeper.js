// CAUSEWAY — the keeper. A hooded figure with a lantern who walks the
// stone, carries flame, tends braziers and flares the dark back. The
// keeper is the game's only verb set: move, tend, flare.

import { CFG } from './config.js';
import { clampToStone, nearestBrazier, HEARTFLAME } from './world.js';
import { moveVector } from './input.js';
import { sfx } from './audio.js';

export function makeKeeper() {
  return {
    x: HEARTFLAME.x,
    y: HEARTFLAME.y + 58,
    faceX: 0,
    faceY: -1,
    flame: CFG.FLAME_START,
    hearts: CFG.KEEPER_HEARTS,
    flareCooldown: 0,
    invuln: 0,
    walkPhase: 0,
    moving: false,
    tending: null, // brazier id being tended right now, or null
    knockX: 0,
    knockY: 0,
  };
}

export function lightRadius(keeper) {
  return CFG.LIGHT_BASE + keeper.flame * CFG.LIGHT_PER_FLAME;
}

// One update step. Returns events the main loop turns into score, sound
// and particles: { flared, banished: [wraith...], relit: brazier|null }.
export function updateKeeper(keeper, dt, input, world, wraiths, emit) {
  const events = { flared: false, relit: null };

  if (keeper.flareCooldown > 0) keeper.flareCooldown -= dt;
  if (keeper.invuln > 0) keeper.invuln -= dt;

  // Movement, clamped to stone, with knockback decay.
  const mv = moveVector();
  keeper.moving = mv.x !== 0 || mv.y !== 0;
  if (keeper.moving) {
    keeper.faceX = mv.x;
    keeper.faceY = mv.y;
    keeper.walkPhase += dt * 11;
  }
  const nx = keeper.x + mv.x * CFG.KEEPER_SPEED * dt + keeper.knockX * dt;
  const ny = keeper.y + mv.y * CFG.KEEPER_SPEED * dt + keeper.knockY * dt;
  const clamped = clampToStone(keeper.x, keeper.y, nx, ny, CFG.KEEPER_RADIUS);
  keeper.x = clamped.x;
  keeper.y = clamped.y;
  keeper.knockX *= Math.max(0, 1 - dt * 6);
  keeper.knockY *= Math.max(0, 1 - dt * 6);

  // Refill at the Heartflame: stand close and the lantern drinks.
  const dhx = keeper.x - HEARTFLAME.x;
  const dhy = keeper.y - HEARTFLAME.y;
  if (dhx * dhx + dhy * dhy < CFG.REFILL_RANGE * CFG.REFILL_RANGE) {
    keeper.flame = Math.min(CFG.FLAME_MAX, keeper.flame + CFG.HEARTFLAME_REFILL_PER_S * dt);
  }

  // Tend: hold E near a brazier to pour carried flame into it.
  keeper.tending = null;
  if (input.tend) {
    const { brazier, dist } = nearestBrazier(world, keeper.x, keeper.y);
    if (brazier && dist < CFG.TRANSFER_RANGE && keeper.flame > 0) {
      const amount = Math.min(
        CFG.TRANSFER_PER_S * dt,
        keeper.flame,
        100 - brazier.fuel,
      );
      if (amount > 0) {
        keeper.flame -= amount;
        brazier.fuel += amount;
        if (!brazier.lit && brazier.fuel > 0) {
          brazier.lit = true;
          events.relit = brazier;
          sfx.relight();
        }
        keeper.tending = brazier.id;
        if (Math.random() < dt * 2) emit('tend-spark', brazier.x, brazier.y - 14);
      }
    }
  }

  // Flare: spend flame to banish every wraith inside the burst.
  if (input.flare && keeper.flareCooldown <= 0 && keeper.flame >= CFG.FLARE_COST) {
    keeper.flame -= CFG.FLARE_COST;
    keeper.flareCooldown = CFG.FLARE_COOLDOWN_S;
    events.flared = true;
    const r = CFG.FLARE_RADIUS;
    for (const w of wraiths) {
      if (w.dead) continue;
      const dx = w.x - keeper.x;
      const dy = w.y - keeper.y;
      if (dx * dx + dy * dy < r * r) {
        w.dead = true;
        w.banished = true;
        emit('banish-burst', w.x, w.y);
      }
    }
    sfx.flare();
  }

  return events;
}

export function hurtKeeper(keeper, fromX, fromY) {
  if (keeper.invuln > 0) return false;
  keeper.hearts -= CFG.WRAITH_TOUCH_DAMAGE;
  keeper.invuln = CFG.INVULN_S;
  const dx = keeper.x - fromX;
  const dy = keeper.y - fromY;
  const d = Math.hypot(dx, dy) || 1;
  keeper.knockX = (dx / d) * 420;
  keeper.knockY = (dy / d) * 420;
  sfx.hurt();
  return true;
}
