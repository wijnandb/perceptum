import { GameState } from './types';
import { createBall, createBallAt, updatePhysics } from './physics';
import { initAudio, playStringSound } from './audio';
import { setupDrawing } from './drawing';
import { render, addCollisionFlashes, clearTrails } from './renderer';
import { loadPreset, getPresetNames } from './presets';

const CONTROLS_HEIGHT = 48;

// --- Canvas setup ---
const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  canvas.style.width = window.innerWidth + 'px';
  canvas.style.height = window.innerHeight + 'px';
  state.canvasWidth = canvas.width;
  state.canvasHeight = canvas.height;
  clearTrails(ctx, canvas.width, canvas.height);
}

// --- Game state ---
const state: GameState = {
  balls: [],
  strings: [],
  nextStringId: 0,
  isDrawing: false,
  drawStart: null,
  drawCurrent: null,
  autoSpawnRate: 1,
  spawnAccumulator: 0,
  canvasWidth: 0,
  canvasHeight: 0,
  audioUnlocked: false,
  melodyQueue: [],
  melodyStartTime: 0,
};

// --- UI elements ---
const overlay = document.getElementById('overlay')!;
const btnDrop = document.getElementById('btn-drop')!;
const btnClear = document.getElementById('btn-clear')!;
const rateSlider = document.getElementById('rate-slider') as HTMLInputElement;
const rateValue = document.getElementById('rate-value')!;
const statBalls = document.getElementById('stat-balls')!;
const statStrings = document.getElementById('stat-strings')!;
const presetSelect = document.getElementById('preset-select') as HTMLSelectElement;

// --- Overlay / Audio unlock ---
function unlockAudio() {
  if (state.audioUnlocked) return;
  initAudio();
  state.audioUnlocked = true;
  overlay.classList.add('hidden');
}

overlay.addEventListener('click', unlockAudio);
overlay.addEventListener('touchstart', (e) => {
  e.preventDefault();
  unlockAudio();
}, { passive: false });

// --- Controls ---
btnDrop.addEventListener('click', () => {
  if (!state.audioUnlocked) unlockAudio();
  state.balls.push(createBall(state.canvasWidth));
});

btnClear.addEventListener('click', () => {
  state.balls.length = 0;
  state.strings.length = 0;
  state.melodyQueue = [];
  state.melodyStartTime = 0;
  clearTrails(ctx, state.canvasWidth, state.canvasHeight);
});

rateSlider.addEventListener('input', () => {
  state.autoSpawnRate = parseFloat(rateSlider.value);
  rateValue.textContent = state.autoSpawnRate + '/s';
});

// --- Presets ---
for (const [i, name] of getPresetNames().entries()) {
  const opt = document.createElement('option');
  opt.value = String(i);
  opt.textContent = name;
  presetSelect.appendChild(opt);
}

presetSelect.addEventListener('change', () => {
  const idx = parseInt(presetSelect.value);
  if (isNaN(idx)) return;
  if (!state.audioUnlocked) unlockAudio();
  state.melodyStartTime = 0;
  loadPreset(state, idx);
  clearTrails(ctx, state.canvasWidth, state.canvasHeight);
  presetSelect.value = '';
});

// --- Initialize ---
resizeCanvas();
window.addEventListener('resize', resizeCanvas);
setupDrawing(canvas, state, CONTROLS_HEIGHT);

// --- Game loop ---
let lastTime = 0;

function gameLoop(timestamp: number) {
  const dt = lastTime === 0 ? 16.67 : Math.min(timestamp - lastTime, 50);
  lastTime = timestamp;

  // Auto-spawn (only when no melody is playing)
  if (state.audioUnlocked && state.autoSpawnRate > 0 && state.melodyQueue.length === 0) {
    state.spawnAccumulator += (state.autoSpawnRate * dt) / 1000;
    while (state.spawnAccumulator >= 1) {
      state.balls.push(createBall(state.canvasWidth));
      state.spawnAccumulator -= 1;
    }
  }

  // Melody queue: drop balls at scheduled times
  if (state.melodyQueue.length > 0) {
    if (state.melodyStartTime === 0) state.melodyStartTime = timestamp;
    const elapsed = timestamp - state.melodyStartTime;

    while (state.melodyQueue.length > 0 && state.melodyQueue[0].delay <= elapsed) {
      const scheduled = state.melodyQueue.shift()!;
      state.balls.push(createBallAt(scheduled.x));
    }
  }

  // Physics
  const collisions = updatePhysics(
    state.balls,
    state.strings,
    state.canvasWidth,
    state.canvasHeight,
    dt
  );

  // Audio + visual feedback for collisions
  for (const event of collisions) {
    playStringSound(event.string);
  }
  addCollisionFlashes(collisions);

  // Render
  render(ctx, state);

  // Update stats
  statBalls.textContent = String(state.balls.length);
  statStrings.textContent = String(state.strings.length);

  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
