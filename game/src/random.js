// CAUSEWAY — seeded randomness. The game plays on a seed so a staged
// screenshot (?shot=...) reproduces the exact same scene every time, and
// real play seeds from the clock.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function range(rng, min, max) {
  return min + rng() * (max - min);
}

export function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

// Smooth 1-D flicker noise from a seed: value in [-1, 1], cheap enough to
// call every frame for every flame.
export function flicker(seed, t) {
  const s = Math.sin(seed * 12.9898 + t * 7.3) * 43758.5453;
  const a = s - Math.floor(s);
  const s2 = Math.sin(seed * 78.233 + t * 13.1) * 12543.1234;
  const b = s2 - Math.floor(s2);
  return (a + b) * 0.5 * 2 - 1;
}
