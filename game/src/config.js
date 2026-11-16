// CAUSEWAY — tuning constants. One place for every number the game
// balances on, so a difficulty change is a one-line edit, never a hunt
// through the logic.

export const CFG = Object.freeze({
  // Canvas (logical pixels; the page scales it to the window).
  W: 1280,
  H: 720,

  // Nights: seven of them, then dawn breaks and the keeper wins.
  NIGHTS: 7,
  NIGHT_SECONDS: 45,
  DAWN_SECONDS: 3.5,

  // The keeper.
  KEEPER_SPEED: 265,
  KEEPER_RADIUS: 16,
  KEEPER_HEARTS: 3,
  FLAME_MAX: 100,
  FLAME_START: 80,
  HEARTFLAME_REFILL_PER_S: 42,
  TRANSFER_PER_S: 32,
  TRANSFER_RANGE: 84,
  REFILL_RANGE: 86,
  FLARE_COST: 25,
  FLARE_RADIUS: 175,
  FLARE_COOLDOWN_S: 1.1,
  INVULN_S: 1.6,

  // Lantern light: the glow radius grows with the flame the keeper carries.
  LIGHT_BASE: 125,
  LIGHT_PER_FLAME: 0.6,

  // Braziers burn down over time; later nights burn faster.
  BRAZIER_BURN_PER_S: 0.9,
  BRAZIER_BURN_PER_NIGHT: 0.13,
  BRAZIER_SNUFF_PER_S: 7,
  BRAZIER_REKINDLE_AT_DAWN: 15,

  // Wraiths: more of them, faster, as the nights wear on.
  WRAITH_SPAWN_START_S: 3.6,
  WRAITH_SPAWN_END_S: 1.05,
  WRAITH_SPEED_BASE: 52,
  WRAITH_SPEED_PER_NIGHT: 9,
  WRAITH_RADIUS: 20,
  WRAITH_TOUCH_DAMAGE: 1,
  WRAITH_REPEL_RADIUS: 130,

  // Scoring.
  SCORE_BANISH: 100,
  SCORE_NIGHT_BASE: 500,
  SCORE_NIGHT_PER_NIGHT: 100,
  SCORE_BRAZIER_AT_DAWN: 150,
});
