import { StringLine } from './types';

// C major pentatonic across C3-C6
// Notes: C, D, E, G, A in each octave
const PENTATONIC_FREQUENCIES: number[] = [];

function buildScale() {
  const baseNotes = [
    261.63, 293.66, 329.63, 392.00, 440.00, // C4, D4, E4, G4, A4
  ];
  // Build C3 to C6 range
  for (const octaveMultiplier of [0.5, 1, 2, 4]) {
    for (const note of baseNotes) {
      const freq = note * octaveMultiplier;
      if (freq >= 130 && freq <= 1050) {
        PENTATONIC_FREQUENCIES.push(freq);
      }
    }
  }
  PENTATONIC_FREQUENCIES.sort((a, b) => a - b);
}
buildScale();

function quantizeToPentatonic(freq: number): number {
  let closest = PENTATONIC_FREQUENCIES[0];
  let minDiff = Math.abs(freq - closest);
  for (const f of PENTATONIC_FREQUENCIES) {
    const diff = Math.abs(freq - f);
    if (diff < minDiff) {
      minDiff = diff;
      closest = f;
    }
  }
  return closest;
}

const MIN_STRING_LEN = 50;
const MAX_STRING_LEN = 1500;
const FREQ_LOW = 130.81;  // C3
const FREQ_HIGH = 1046.5; // C6

export function stringLengthToFrequency(length: number): number {
  const t = Math.max(0, Math.min(1, (length - MIN_STRING_LEN) / (MAX_STRING_LEN - MIN_STRING_LEN)));
  // Logarithmic mapping: short = high, long = low
  const freq = FREQ_LOW * Math.pow(FREQ_HIGH / FREQ_LOW, 1 - t);
  return quantizeToPentatonic(freq);
}

// Pitch to color: low frequencies = warm (amber), high = cool (blue)
export function frequencyToColor(freq: number): string {
  const t = (freq - FREQ_LOW) / (FREQ_HIGH - FREQ_LOW);
  // Warm amber (30, 180, 80%) -> Cool blue (210, 180, 80%)
  const hue = 30 + t * 180;
  return `hsl(${hue}, 80%, 65%)`;
}

let audioCtx: AudioContext | null = null;

export function initAudio(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function getAudioContext(): AudioContext | null {
  return audioCtx;
}

export function playStringSound(string: StringLine): void {
  if (!audioCtx) return;

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.type = 'triangle';
  osc.frequency.setValueAtTime(string.frequency, audioCtx.currentTime);
  // Slight detuning for warmth
  osc.detune.setValueAtTime((Math.random() - 0.5) * 4, audioCtx.currentTime);

  // Envelope: fast attack, smooth decay (avoids clicks)
  const now = audioCtx.currentTime;
  gain.gain.setValueAtTime(0.001, now);
  gain.gain.linearRampToValueAtTime(0.3, now + 0.01);  // 10ms attack
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35); // 350ms decay

  osc.connect(gain);
  gain.connect(audioCtx.destination);

  osc.start(now);
  osc.stop(now + 0.4);

  // Cleanup on end to prevent memory leaks
  osc.onended = () => {
    osc.disconnect();
    gain.disconnect();
  };
}

export { PENTATONIC_FREQUENCIES };
