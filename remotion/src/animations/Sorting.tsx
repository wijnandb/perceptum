import React, { useRef, useEffect } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { ReelTemplate } from "../ReelTemplate";

const CANVAS_W = 1080;
const CANVAS_H = Math.round(1920 * 0.6);

const BAR_COLOR = "rgba(59, 130, 246, 0.7)";
const HIGHLIGHT_COLOR = "rgba(251, 191, 36, 0.9)";
const SORTED_COLOR = "rgba(34, 197, 94, 0.7)";
const BAR_COUNT = 80;

// Deterministic seeded PRNG
function createRng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

interface SortSnapshot {
  arr: number[];
  highlighted: Set<number>;
  label: string;
  sorted: boolean;
}

function precomputeSorting(): SortSnapshot[] {
  const rng = createRng(12345);
  const snapshots: SortSnapshot[] = [];

  // Create and shuffle array
  const arr: number[] = [];
  for (let i = 0; i < BAR_COUNT; i++) {
    arr.push((i + 1) / BAR_COUNT);
  }
  // Fisher-Yates with seeded rng
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }

  function snap(highlighted: Set<number>, label: string, sorted = false) {
    snapshots.push({
      arr: [...arr],
      highlighted: new Set(highlighted),
      label,
      sorted,
    });
  }

  // Bubble sort
  const n = arr.length;
  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < n - i - 1; j++) {
      const hl = new Set([j, j + 1]);
      if (arr[j] > arr[j + 1]) {
        [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
      }
      snap(hl, "Bubble Sort");
    }
  }

  // Add "sorted" frames
  for (let i = 0; i < 30; i++) {
    snap(new Set(), "Bubble Sort", true);
  }

  // Reshuffle for quicksort
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }

  // Quick sort
  function quickSort(lo: number, hi: number) {
    if (lo >= hi) return;
    const pivot = arr[hi];
    let idx = lo;
    for (let j = lo; j < hi; j++) {
      const hl = new Set([j, hi]);
      if (arr[j] < pivot) {
        [arr[idx], arr[j]] = [arr[j], arr[idx]];
        idx++;
      }
      snap(hl, "Quick Sort");
    }
    [arr[idx], arr[hi]] = [arr[hi], arr[idx]];
    snap(new Set([idx]), "Quick Sort");

    quickSort(lo, idx - 1);
    quickSort(idx + 1, hi);
  }

  quickSort(0, arr.length - 1);

  // Add "sorted" frames
  for (let i = 0; i < 30; i++) {
    snap(new Set(), "Quick Sort", true);
  }

  return snapshots;
}

const SortingCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const snapshotsRef = useRef<SortSnapshot[] | null>(null);
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  if (!snapshotsRef.current) {
    snapshotsRef.current = precomputeSorting();
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const snapshots = snapshotsRef.current;
    if (!snapshots) return;

    // Map frame to snapshot
    const ratio = snapshots.length / durationInFrames;
    const idx = Math.min(
      Math.floor(frame * ratio),
      snapshots.length - 1
    );
    const snap = snapshots[idx];

    const W = CANVAS_W;
    const H = CANVAS_H;
    const padding = 60;
    const barAreaW = W - padding * 2;
    const barAreaH = H - padding * 2 - 60;
    const barW = barAreaW / BAR_COUNT;
    const gap = Math.max(1, barW * 0.1);

    ctx.clearRect(0, 0, W, H);

    // Algorithm label
    ctx.font = "300 28px system-ui, -apple-system, sans-serif";
    ctx.fillStyle = "rgba(148, 163, 184, 0.7)";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(snap.label, padding, padding + 10);

    // Draw bars
    for (let i = 0; i < snap.arr.length; i++) {
      const barH = snap.arr[i] * barAreaH;
      const x = padding + i * barW + gap / 2;
      const y = H - padding - barH;

      if (snap.sorted) {
        ctx.fillStyle = SORTED_COLOR;
      } else if (snap.highlighted.has(i)) {
        ctx.fillStyle = HIGHLIGHT_COLOR;
      } else {
        ctx.fillStyle = BAR_COLOR;
      }

      ctx.fillRect(x, y, barW - gap, barH);
    }
  }, [frame, durationInFrames]);

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_W}
      height={CANVAS_H}
      style={{ width: "100%", height: "100%" }}
    />
  );
};

const CODE_SNIPPET = `// Bubble Sort - O(n²)
for (let i = 0; i < n; i++)
  for (let j = 0; j < n-i-1; j++)
    if (arr[j] > arr[j+1])
      swap(arr, j, j+1);

// Quick Sort - O(n·log n)
function partition(lo, hi) {
  const pivot = arr[hi];
  let i = lo;
  for (let j = lo; j < hi; j++)
    if (arr[j] < pivot) swap(i++, j);
}`;

export const SortingReel: React.FC = () => {
  return (
    <ReelTemplate
      title="Sorting Visualizer"
      subtitle="O(n²) vs O(n·log n)"
      codeString={CODE_SNIPPET}
    >
      <SortingCanvas />
    </ReelTemplate>
  );
};
