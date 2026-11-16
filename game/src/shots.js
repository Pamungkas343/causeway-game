// CAUSEWAY — staged shots. The screenshots are real renders of the game,
// but a live game never sits still long enough to frame: ?shot= puts the
// world into a fixed, deterministic scene (seeded RNG, preset positions)
// so each screenshot shows the game at its best. Real play never reads
// these presets — they only run when the URL carries ?shot=.

import { CFG } from './config.js';
import { makeWraith } from './wraiths.js';

export function applyShot(state, name) {
  const { world, keeper, rng } = state;
  if (name === 'title') {
    state.phase = 'title';
    state.night = 1;
    state.nightT = 0;
    // Keeper stands at the east end, visible beside the title text.
    keeper.x = 1010;
    keeper.y = 370;
    keeper.faceX = -1;
    keeper.faceY = 0;
    return;
  }
  if (name === 'dawn') {
    state.phase = 'win';
    state.night = 7;
    state.score = 7420;
    state.banished = 53;
    world.braziers.forEach((b) => {
      b.fuel = 82;
      b.lit = true;
    });
    keeper.x = 640;
    keeper.y = 440;
    keeper.flame = 64;
    keeper.hearts = 2;
    return;
  }
  if (name === 'over') {
    state.phase = 'over';
    state.night = 5;
    state.score = 3180;
    state.banished = 31;
    state.loseReason = 'The last brazier went dark on night five.';
    world.braziers.forEach((b) => {
      b.fuel = 0;
      b.lit = false;
    });
    keeper.x = 380;
    keeper.y = 370;
    keeper.flame = 8;
    keeper.hearts = 1;
    state.wraiths = [];
    for (let i = 0; i < 5; i++) {
      const w = makeWraith(rng, 5, state.t);
      w.x = 300 + i * 130;
      w.y = 300 + (i % 2) * 140;
      state.wraiths.push(w);
    }
    return;
  }
  if (name === 'night6') {
    state.phase = 'play';
    state.night = 6;
    state.nightT = 30;
    state.score = 5210;
    state.banished = 41;
    state.hintAlpha = 0;
    keeper.x = 900;
    keeper.y = 370;
    keeper.flame = 52;
    keeper.hearts = 2;
    world.braziers[0].fuel = 88;
    world.braziers[1].fuel = 61;
    world.braziers[2].fuel = 0;
    world.braziers[2].lit = false;
    world.braziers[3].fuel = 44;
    world.braziers[4].fuel = 73;
    state.wraiths = [];
    const spots = [
      [830, 300], [960, 440], [1080, 320], [700, 260], [1020, 500],
      [560, 480], [1150, 250], [430, 300], [780, 470],
    ];
    for (const [x, y] of spots) {
      const w = makeWraith(rng, 6, state.t);
      w.x = x;
      w.y = y;
      state.wraiths.push(w);
    }
    // One wraith latched onto the Gull brazier, snuffing it.
    state.wraiths[1].x = 900;
    state.wraiths[1].y = 396;
    return;
  }
  // Default 'play': night three, mid-action — the cover. The keeper has
  // just flared: wraiths recoil, braziers burn at different levels, the
  // HUD is full and the causeway reads at a glance.
  state.phase = 'play';
  state.night = 3;
  state.nightT = 22;
  state.score = 1250;
  state.banished = 9;
  state.hintAlpha = 0;
  keeper.x = 640;
  keeper.y = 370;
  keeper.faceX = 1;
  keeper.faceY = 0;
  keeper.flame = 61;
  keeper.hearts = 3;
  state.flareFlash = 0.85;
  world.braziers[0].fuel = 92;
  world.braziers[1].fuel = 58;
  world.braziers[2].fuel = 76;
  world.braziers[3].fuel = 34;
  world.braziers[4].fuel = 81;
  state.wraiths = [];
  const spots = [
    [820, 300], [470, 440], [1010, 320], [560, 250], [760, 470], [1090, 440],
    [860, 470], [700, 300], [980, 460],
  ];
  for (const [x, y] of spots) {
    const w = makeWraith(rng, 3, state.t);
    w.x = x;
    w.y = y;
    state.wraiths.push(w);
  }
}
