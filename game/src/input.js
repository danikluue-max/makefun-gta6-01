// Keyboard and mouse input. Held keys give movement and driving; one-shot presses
// (enter a car, shoot, pause, radio, mute) are queued as bit flags and taken once
// by the loop, so a press between two frames is never lost or counted twice.
// Mouse drag orbits the camera; a click on the canvas shoots while on foot.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_ENTER_CAR = 4;
export const ACTION_SHOOT = 8;
export const ACTION_RADIO = 16;
export const ACTION_MUTE = 32;
export const ACTION_HORN = 64;

const MOVE = {
  KeyW: 'up', ArrowUp: 'up',
  KeyS: 'down', ArrowDown: 'down',
  KeyA: 'left', ArrowLeft: 'left',
  KeyD: 'right', ArrowRight: 'right',
};

export function createInput(canvas, cameraRig) {
  const held = { up: false, down: false, left: false, right: false, shift: false, space: false };
  let actions = 0;
  let dragging = false;
  let lastX = 0;
  let lastY = 0;

  window.addEventListener('keydown', (event) => {
    if (event.repeat) {
      if (MOVE[event.code]) event.preventDefault();
      return;
    }
    if (MOVE[event.code]) {
      held[MOVE[event.code]] = true;
      event.preventDefault();
    } else if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') {
      held.shift = true;
    } else if (event.code === 'Space') {
      held.space = true;
      actions |= ACTION_CONFIRM;
      event.preventDefault();
    } else if (event.code === 'Enter') {
      actions |= ACTION_CONFIRM;
    } else if (event.code === 'KeyE') {
      actions |= ACTION_ENTER_CAR;
    } else if (event.code === 'KeyP' || event.code === 'Escape') {
      actions |= ACTION_PAUSE;
    } else if (event.code === 'KeyR') {
      actions |= ACTION_RADIO;
    } else if (event.code === 'KeyM') {
      actions |= ACTION_MUTE;
    } else if (event.code === 'KeyH') {
      actions |= ACTION_HORN;
    } else {
      return;
    }
  });
  window.addEventListener('keyup', (event) => {
    if (MOVE[event.code]) held[MOVE[event.code]] = false;
    else if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') held.shift = false;
    else if (event.code === 'Space') held.space = false;
  });
  window.addEventListener('blur', () => {
    held.up = held.down = held.left = held.right = held.shift = held.space = false;
    dragging = false;
  });

  // A shot fires on a quick click, not on the start of a camera drag: note
  // where the pointer went down and only shoot if it comes back up fast and
  // barely moved, so orbiting the camera never fires the pistol.
  let downAt = 0;
  let downX = 0;
  let downY = 0;
  canvas.addEventListener('pointerdown', (event) => {
    if (event.target !== canvas) return;
    dragging = true;
    lastX = event.clientX;
    lastY = event.clientY;
    downAt = performance.now();
    downX = event.clientX;
    downY = event.clientY;
  });
  window.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    const dx = event.clientX - lastX;
    const dy = event.clientY - lastY;
    lastX = event.clientX;
    lastY = event.clientY;
    cameraRig.orbit(dx, dy);
  });
  window.addEventListener('pointerup', (event) => {
    if (dragging && downAt > 0 && performance.now() - downAt < 250
      && Math.hypot(event.clientX - downX, event.clientY - downY) < 6) {
      actions |= ACTION_SHOOT;
    }
    downAt = 0;
    dragging = false;
  });
  canvas.addEventListener('wheel', (event) => {
    cameraRig.zoom(event.deltaY);
    event.preventDefault();
  }, { passive: false });
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());

  return {
    held,
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    // -1/0/1 for forward and strafe, relative to the camera.
    moveVector() {
      return {
        forward: (held.up ? 1 : 0) - (held.down ? 1 : 0),
        strafe: (held.right ? 1 : 0) - (held.left ? 1 : 0),
      };
    },
  };
}
