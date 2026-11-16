// CAUSEWAY — keyboard input. Tracks held keys and edge-triggered presses
// (a press fires once, the frame the key goes down). Synthetic events
// dispatched on window work the same as real ones, which is how the game
// is play-tested.

const held = new Set();
const pressed = new Set();

const ALIASES = Object.freeze({
  ArrowUp: 'up',
  KeyW: 'up',
  ArrowDown: 'down',
  KeyS: 'down',
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
  Space: 'flare',
  KeyE: 'tend',
  Enter: 'confirm',
  KeyR: 'restart',
  KeyP: 'pause',
  KeyM: 'mute',
  Escape: 'pause',
});

export function installInput() {
  window.addEventListener('keydown', (ev) => {
    const name = ALIASES[ev.code];
    if (!name) return;
    if (ev.code === 'Space' || ev.code.startsWith('Arrow')) ev.preventDefault();
    if (!held.has(name)) pressed.add(name);
    held.add(name);
  });
  window.addEventListener('keyup', (ev) => {
    const name = ALIASES[ev.code];
    if (name) held.delete(name);
  });
  window.addEventListener('blur', () => {
    held.clear();
  });
}

export function isDown(name) {
  return held.has(name);
}

// True once per physical press; call once per frame per action.
export function wasPressed(name) {
  if (pressed.has(name)) {
    pressed.delete(name);
    return true;
  }
  return false;
}

export function endFrame() {
  pressed.clear();
}

export function moveVector() {
  let x = 0;
  let y = 0;
  if (held.has('left')) x -= 1;
  if (held.has('right')) x += 1;
  if (held.has('up')) y -= 1;
  if (held.has('down')) y += 1;
  if (x !== 0 && y !== 0) {
    const inv = 1 / Math.SQRT2;
    x *= inv;
    y *= inv;
  }
  return { x, y };
}
