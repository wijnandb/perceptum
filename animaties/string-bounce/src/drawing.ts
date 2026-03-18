import { GameState, StringLine } from './types';
import { stringLengthToFrequency, frequencyToColor } from './audio';

const MIN_STRING_LENGTH = 50;
const MAX_STRINGS = 30;
const ENDPOINT_GRAB_THRESHOLD = 18; // pixels (before DPR scaling)

let longPressTimer: ReturnType<typeof setTimeout> | null = null;
let longPressStartPos: { x: number; y: number } | null = null;
const LONG_PRESS_DURATION = 600;
const LONG_PRESS_MOVE_THRESHOLD = 10;

// Endpoint editing state
let editingString: StringLine | null = null;
let editingEndpoint: 1 | 2 | null = null;

function getCanvasPos(canvas: HTMLCanvasElement, clientX: number, clientY: number) {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  return {
    x: (clientX - rect.left) * dpr,
    y: (clientY - rect.top) * dpr,
  };
}

function updateStringProperties(s: StringLine) {
  const dx = s.x2 - s.x1;
  const dy = s.y2 - s.y1;
  s.length = Math.hypot(dx, dy);
  if (s.length > 0) {
    s.nx = -dy / s.length;
    s.ny = dx / s.length;
  }
  s.frequency = stringLengthToFrequency(s.length);
  s.color = frequencyToColor(s.frequency);
}

function createStringLine(
  state: GameState,
  x1: number, y1: number,
  x2: number, y2: number
): StringLine | null {
  const length = Math.hypot(x2 - x1, y2 - y1);
  if (length < MIN_STRING_LENGTH) return null;
  if (state.strings.length >= MAX_STRINGS) return null;

  const dx = x2 - x1;
  const dy = y2 - y1;
  const nx = -dy / length;
  const ny = dx / length;

  const frequency = stringLengthToFrequency(length);
  const color = frequencyToColor(frequency);

  const s: StringLine = {
    id: state.nextStringId++,
    x1, y1, x2, y2,
    length, nx, ny,
    frequency,
    vibration: 0,
    color,
  };
  state.strings.push(s);
  return s;
}

function findEndpointNear(
  state: GameState, x: number, y: number
): { string: StringLine; endpoint: 1 | 2 } | null {
  const dpr = window.devicePixelRatio || 1;
  const threshold = ENDPOINT_GRAB_THRESHOLD * dpr;
  let bestDist = threshold;
  let bestResult: { string: StringLine; endpoint: 1 | 2 } | null = null;

  for (const s of state.strings) {
    const d1 = Math.hypot(x - s.x1, y - s.y1);
    if (d1 < bestDist) {
      bestDist = d1;
      bestResult = { string: s, endpoint: 1 };
    }
    const d2 = Math.hypot(x - s.x2, y - s.y2);
    if (d2 < bestDist) {
      bestDist = d2;
      bestResult = { string: s, endpoint: 2 };
    }
  }
  return bestResult;
}

function findStringNear(state: GameState, x: number, y: number, threshold: number = 15): number {
  for (let i = 0; i < state.strings.length; i++) {
    const s = state.strings[i];
    const dx = s.x2 - s.x1;
    const dy = s.y2 - s.y1;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) continue;
    let t = ((x - s.x1) * dx + (y - s.y1) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    const cx = s.x1 + t * dx;
    const cy = s.y1 + t * dy;
    const dist = Math.hypot(x - cx, y - cy);
    if (dist < threshold * (window.devicePixelRatio || 1)) return i;
  }
  return -1;
}

function cancelLongPress() {
  if (longPressTimer !== null) {
    clearTimeout(longPressTimer);
    longPressTimer = null;
  }
  longPressStartPos = null;
}

function handlePointerDown(state: GameState, pos: { x: number; y: number }) {
  // Priority 1: Check if near an endpoint → edit mode
  const ep = findEndpointNear(state, pos.x, pos.y);
  if (ep) {
    editingString = ep.string;
    editingEndpoint = ep.endpoint;
    state.isDrawing = false;
    return true; // handled as edit
  }
  // Priority 2: Start drawing new string
  editingString = null;
  editingEndpoint = null;
  state.isDrawing = true;
  state.drawStart = pos;
  state.drawCurrent = pos;
  return false; // handled as draw
}

function handlePointerMove(pos: { x: number; y: number }) {
  if (editingString && editingEndpoint) {
    if (editingEndpoint === 1) {
      editingString.x1 = pos.x;
      editingString.y1 = pos.y;
    } else {
      editingString.x2 = pos.x;
      editingString.y2 = pos.y;
    }
    updateStringProperties(editingString);
    return true;
  }
  return false;
}

function handlePointerUp(state: GameState) {
  if (editingString) {
    // If string got too short during edit, remove it
    if (editingString.length < MIN_STRING_LENGTH) {
      const idx = state.strings.indexOf(editingString);
      if (idx >= 0) state.strings.splice(idx, 1);
    }
    editingString = null;
    editingEndpoint = null;
    return true;
  }
  return false;
}

export function setupDrawing(canvas: HTMLCanvasElement, state: GameState, controlsHeight: number) {
  const dpr = window.devicePixelRatio || 1;

  // --- Mouse events ---
  canvas.addEventListener('mousedown', (e) => {
    if (e.button === 2) return;
    const pos = getCanvasPos(canvas, e.clientX, e.clientY);
    if (pos.y > state.canvasHeight - controlsHeight * dpr) return;
    handlePointerDown(state, pos);
  });

  canvas.addEventListener('mousemove', (e) => {
    const pos = getCanvasPos(canvas, e.clientX, e.clientY);
    if (handlePointerMove(pos)) return;
    if (!state.isDrawing) return;
    state.drawCurrent = pos;
  });

  canvas.addEventListener('mouseup', (e) => {
    if (handlePointerUp(state)) return;
    if (!state.isDrawing || !state.drawStart || !state.drawCurrent) {
      state.isDrawing = false;
      return;
    }
    if (e.button === 2) {
      state.isDrawing = false;
      return;
    }
    createStringLine(state, state.drawStart.x, state.drawStart.y, state.drawCurrent.x, state.drawCurrent.y);
    state.isDrawing = false;
    state.drawStart = null;
    state.drawCurrent = null;
  });

  // Right-click to delete
  canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    const pos = getCanvasPos(canvas, e.clientX, e.clientY);
    const idx = findStringNear(state, pos.x, pos.y);
    if (idx >= 0) {
      state.strings.splice(idx, 1);
    }
  });

  // --- Touch events ---
  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    const pos = getCanvasPos(canvas, touch.clientX, touch.clientY);
    if (pos.y > state.canvasHeight - controlsHeight * dpr) return;

    longPressStartPos = pos;

    // Check endpoint first
    const isEditing = handlePointerDown(state, pos);

    // Only set up long-press delete if NOT editing an endpoint
    if (!isEditing) {
      const nearIdx = findStringNear(state, pos.x, pos.y);
      if (nearIdx >= 0) {
        longPressTimer = setTimeout(() => {
          if (longPressStartPos) {
            const currentIdx = findStringNear(state, longPressStartPos.x, longPressStartPos.y);
            if (currentIdx >= 0) {
              state.strings.splice(currentIdx, 1);
            }
          }
          cancelLongPress();
          state.isDrawing = false;
          state.drawStart = null;
        }, LONG_PRESS_DURATION);
      }
    }
  }, { passive: false });

  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    const pos = getCanvasPos(canvas, touch.clientX, touch.clientY);

    if (handlePointerMove(pos)) {
      cancelLongPress();
      return;
    }

    if (!state.isDrawing) return;
    state.drawCurrent = pos;

    if (longPressStartPos) {
      const dist = Math.hypot(pos.x - longPressStartPos.x, pos.y - longPressStartPos.y);
      if (dist > LONG_PRESS_MOVE_THRESHOLD * dpr) {
        cancelLongPress();
      }
    }
  }, { passive: false });

  canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    cancelLongPress();
    if (handlePointerUp(state)) return;
    if (!state.isDrawing || !state.drawStart || !state.drawCurrent) {
      state.isDrawing = false;
      return;
    }
    createStringLine(state, state.drawStart.x, state.drawStart.y, state.drawCurrent.x, state.drawCurrent.y);
    state.isDrawing = false;
    state.drawStart = null;
    state.drawCurrent = null;
  }, { passive: false });

  canvas.addEventListener('touchcancel', (e) => {
    e.preventDefault();
    cancelLongPress();
    editingString = null;
    editingEndpoint = null;
    state.isDrawing = false;
    state.drawStart = null;
    state.drawCurrent = null;
  }, { passive: false });
}
