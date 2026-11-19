// Keyboard and mouse. Held keys give a steering direction; single presses
// (confirm, pause, get in a car, punch, reload, mute) are queued as bit flags
// and taken once by the loop, so a press between two frames is neither lost
// nor counted twice. The mouse aims the pistol; its position is kept in
// screen pixels and the renderer turns it into world coordinates.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_ENTER = 4;
export const ACTION_PUNCH = 8;
export const ACTION_RELOAD = 16;
export const ACTION_MUTE = 32;
export const ACTION_SHOOT = 64;

const UP_KEYS = new Set(['ArrowUp', 'KeyW']);
const DOWN_KEYS = new Set(['ArrowDown', 'KeyS']);
const LEFT_KEYS = new Set(['ArrowLeft', 'KeyA']);
const RIGHT_KEYS = new Set(['ArrowRight', 'KeyD']);
const RUN_KEYS = new Set(['ShiftLeft', 'ShiftRight']);
const CONFIRM_KEYS = new Set(['Space', 'Enter']);
const PAUSE_KEYS = new Set(['KeyP', 'Escape']);
const ENTER_KEYS = new Set(['KeyE']);
const PUNCH_KEYS = new Set(['KeyF']);
const RELOAD_KEYS = new Set(['KeyR']);
const MUTE_KEYS = new Set(['KeyM']);

export function createInput(canvas) {
  const held = new Set();
  let queued = 0;
  let mouseX = 0;
  let mouseY = 0;
  let mouseDown = false;

  function press(code) {
    if (UP_KEYS.has(code) || DOWN_KEYS.has(code) || LEFT_KEYS.has(code) || RIGHT_KEYS.has(code) || RUN_KEYS.has(code)) {
      held.add(code);
      return true;
    }
    return false;
  }

  function tap(code, flag) {
    if (flag) queued |= flag;
  }

  window.addEventListener('keydown', (event) => {
    if (press(event.code)) {
      // A held steering key.
    } else if (CONFIRM_KEYS.has(event.code)) {
      if (!event.repeat) tap(event.code, ACTION_CONFIRM);
    } else if (PAUSE_KEYS.has(event.code)) {
      if (!event.repeat) tap(event.code, ACTION_PAUSE);
    } else if (ENTER_KEYS.has(event.code)) {
      if (!event.repeat) tap(event.code, ACTION_ENTER);
    } else if (PUNCH_KEYS.has(event.code)) {
      if (!event.repeat) tap(event.code, ACTION_PUNCH);
    } else if (RELOAD_KEYS.has(event.code)) {
      if (!event.repeat) tap(event.code, ACTION_RELOAD);
    } else if (MUTE_KEYS.has(event.code)) {
      if (!event.repeat) tap(event.code, ACTION_MUTE);
    } else {
      return;
    }
    event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    held.delete(event.code);
  });
  // A key released while the tab is hidden never sends keyup: let go of all.
  window.addEventListener('blur', () => {
    held.clear();
    mouseDown = false;
  });

  canvas.addEventListener('pointermove', (event) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = event.clientX - rect.left;
    mouseY = event.clientY - rect.top;
  });
  canvas.addEventListener('pointerdown', (event) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = event.clientX - rect.left;
    mouseY = event.clientY - rect.top;
    mouseDown = true;
    queued |= ACTION_SHOOT;
    queued |= ACTION_CONFIRM;
  });
  window.addEventListener('pointerup', () => {
    mouseDown = false;
  });

  function any(codes) {
    for (const code of codes) if (held.has(code)) return true;
    return false;
  }

  return {
    /** Steering: -1, 0 or 1 on each axis, from WASD or the arrow keys. */
    axis() {
      return {
        x: (any(RIGHT_KEYS) ? 1 : 0) - (any(LEFT_KEYS) ? 1 : 0),
        y: (any(DOWN_KEYS) ? 1 : 0) - (any(UP_KEYS) ? 1 : 0),
      };
    },
    get running() { return any(RUN_KEYS); },
    get mouseDown() { return mouseDown; },
    mouse() { return { x: mouseX, y: mouseY }; },
    /** The single presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = queued;
      queued = 0;
      return taken;
    },
  };
}
