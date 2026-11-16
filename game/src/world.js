// CAUSEWAY — the world: dark water, the stone causeway, the five
// braziers and the Heartflame. The keeper walks only on stone; wraiths
// drift over the water. Every brazier burns down over time and must be
// tended, or the dark takes it.

import { CFG } from './config.js';

export const CAUSEWAY = Object.freeze({
  // Horizontal stone band across the whole canvas.
  band: { x0: 30, x1: 1250, y0: 328, y1: 412 },
  // Central plaza around the Heartflame.
  plaza: { x: 640, y: 370, r: 122 },
  // Northern spur: a jetty up to the lone North Brazier.
  spur: { x0: 608, x1: 672, y0: 168, y1: 370 },
});

export const BRAZIER_SPOTS = Object.freeze([
  { id: 'west', name: 'WEST BRAZIER', x: 150, y: 370 },
  { id: 'reed', name: 'REED BRAZIER', x: 380, y: 370 },
  { id: 'north', name: 'NORTH BRAZIER', x: 640, y: 180 },
  { id: 'gull', name: 'GULL BRAZIER', x: 900, y: 370 },
  { id: 'east', name: 'EAST BRAZIER', x: 1130, y: 370 },
]);

export const HEARTFLAME = Object.freeze({ x: 640, y: 370, name: 'HEARTFLAME' });

export function makeWorld() {
  return {
    braziers: BRAZIER_SPOTS.map((s, i) => ({
      ...s,
      seed: 11 + i * 7,
      fuel: 100,
      latched: 0, // wraiths currently snuffing this brazier
      lit: true,
    })),
    // Water sparkles: fixed positions that drift slowly, for the render.
    sparkles: Array.from({ length: 90 }, (_, i) => ({
      x: ((i * 137.5) % 1280) + 10,
      y: ((i * 89.3) % 720) + 8,
      phase: i * 0.7,
      size: 1 + (i % 3) * 0.6,
    })),
  };
}

export function onStone(x, y) {
  const b = CAUSEWAY.band;
  const s = CAUSEWAY.spur;
  const p = CAUSEWAY.plaza;
  if (x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1) return true;
  if (x >= s.x0 && x <= s.x1 && y >= s.y0 && y <= s.y1) return true;
  const dx = x - p.x;
  const dy = y - p.y;
  return dx * dx + dy * dy <= p.r * p.r;
}

// Clamp a walking position onto the stone: try the axis moves separately
// so the keeper slides along edges instead of sticking on corners.
export function clampToStone(x, y, nx, ny, radius) {
  const tryX = onStone(nx, y) || onStone(nx, y - radius) || onStone(nx, y + radius);
  const tryY = onStone(x, ny) || onStone(x - radius, ny) || onStone(x + radius, ny);
  return {
    x: tryX ? nx : x,
    y: tryY ? ny : y,
  };
}

export function nearestBrazier(world, x, y) {
  let best = null;
  let bestD = Infinity;
  for (const b of world.braziers) {
    const dx = b.x - x;
    const dy = b.y - y;
    const d = dx * dx + dy * dy;
    if (d < bestD) {
      bestD = d;
      best = b;
    }
  }
  return { brazier: best, dist: Math.sqrt(bestD) };
}

export function litCount(world) {
  return world.braziers.filter((b) => b.lit).length;
}

// Burn step: every lit brazier loses fuel; latched wraiths snuff faster.
// Returns the list of braziers that just went dark this step.
export function burnBraziers(world, dt, night) {
  const wentDark = [];
  const rate = CFG.BRAZIER_BURN_PER_S + CFG.BRAZIER_BURN_PER_NIGHT * (night - 1);
  for (const b of world.braziers) {
    if (!b.lit) continue;
    b.fuel -= (rate + b.latched * CFG.BRAZIER_SNUFF_PER_S) * dt;
    if (b.fuel <= 0) {
      b.fuel = 0;
      b.lit = false;
      wentDark.push(b);
    }
  }
  return wentDark;
}

export function rekindleAtDawn(world) {
  for (const b of world.braziers) {
    if (b.lit) b.fuel = Math.min(100, b.fuel + CFG.BRAZIER_REKINDLE_AT_DAWN);
  }
}
