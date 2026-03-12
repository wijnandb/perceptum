import React, { useRef, useEffect } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { ReelTemplate } from "../ReelTemplate";

const CANVAS_W = 1080;
const CANVAS_H = Math.round(1920 * 0.6);

const CELL_SIZE = 28;
const WALL_COLOR = "rgba(59, 130, 246, 0.6)";
const VISITED_FILL = "rgba(59, 130, 246, 0.08)";
const CURRENT_FILL = "rgba(251, 191, 36, 0.7)";
const SOLVE_COLOR = "rgba(251, 191, 36, 0.8)";

interface Cell {
  row: number;
  col: number;
  walls: [boolean, boolean, boolean, boolean]; // top, right, bottom, left
  visited: boolean;
}

// Deterministic seeded PRNG
function createRng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

interface MazeSnapshot {
  grid: Cell[][];
  currentIdx: [number, number] | null;
  phase: "generating" | "solving" | "done";
  solvePath: [number, number][];
  solveIndex: number;
}

function precomputeMaze(cols: number, rows: number): MazeSnapshot[] {
  const rng = createRng(12345);
  const snapshots: MazeSnapshot[] = [];

  // Init grid
  const grid: Cell[][] = [];
  for (let r = 0; r < rows; r++) {
    grid[r] = [];
    for (let c = 0; c < cols; c++) {
      grid[r][c] = {
        row: r,
        col: c,
        walls: [true, true, true, true],
        visited: false,
      };
    }
  }

  grid[0][0].visited = true;
  const stack: Cell[] = [grid[0][0]];
  let current: Cell | null = grid[0][0];

  function getUnvisited(cell: Cell): Cell[] {
    const { row, col } = cell;
    const neighbors: Cell[] = [];
    if (row > 0 && !grid[row - 1][col].visited) neighbors.push(grid[row - 1][col]);
    if (col < cols - 1 && !grid[row][col + 1].visited) neighbors.push(grid[row][col + 1]);
    if (row < rows - 1 && !grid[row + 1][col].visited) neighbors.push(grid[row + 1][col]);
    if (col > 0 && !grid[row][col - 1].visited) neighbors.push(grid[row][col - 1]);
    return neighbors;
  }

  function removeWalls(a: Cell, b: Cell) {
    const dr = b.row - a.row;
    const dc = b.col - a.col;
    if (dr === -1) { a.walls[0] = false; b.walls[2] = false; }
    if (dr === 1) { a.walls[2] = false; b.walls[0] = false; }
    if (dc === 1) { a.walls[1] = false; b.walls[3] = false; }
    if (dc === -1) { a.walls[3] = false; b.walls[1] = false; }
  }

  function cloneGrid(): Cell[][] {
    return grid.map((row) =>
      row.map((c) => ({
        ...c,
        walls: [...c.walls] as [boolean, boolean, boolean, boolean],
      }))
    );
  }

  // Generate maze - 2 steps per snapshot for speed
  while (stack.length > 0) {
    const neighbors = getUnvisited(current!);
    if (neighbors.length > 0) {
      const next = neighbors[Math.floor(rng() * neighbors.length)];
      removeWalls(current!, next);
      next.visited = true;
      stack.push(next);
      current = next;
    } else {
      stack.pop();
      current = stack.length > 0 ? stack[stack.length - 1] : null;
    }

    snapshots.push({
      grid: cloneGrid(),
      currentIdx: current ? [current.row, current.col] : null,
      phase: "generating",
      solvePath: [],
      solveIndex: 0,
    });
  }

  // BFS solve
  const start = grid[0][0];
  const end = grid[rows - 1][cols - 1];
  const visited = new Set<string>();
  const parent = new Map<string, Cell | null>();
  const queue: Cell[] = [start];
  const key = (c: Cell) => `${c.row},${c.col}`;
  visited.add(key(start));
  parent.set(key(start), null);

  while (queue.length > 0) {
    const cell = queue.shift()!;
    if (cell === end) break;
    const { row, col } = cell;
    const dirs: [number, number, number][] = [
      [-1, 0, 0], [0, 1, 1], [1, 0, 2], [0, -1, 3],
    ];
    for (const [dr, dc, wallIdx] of dirs) {
      if (cell.walls[wallIdx]) continue;
      const nr = row + dr;
      const nc = col + dc;
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
      const neighbor = grid[nr][nc];
      const nk = key(neighbor);
      if (visited.has(nk)) continue;
      visited.add(nk);
      parent.set(nk, cell);
      queue.push(neighbor);
    }
  }

  const solvePath: [number, number][] = [];
  let c: Cell | null = end;
  while (c) {
    solvePath.unshift([c.row, c.col]);
    c = parent.get(key(c)) || null;
  }

  // Add solve snapshots (reveal 2 cells per snapshot)
  const finalGrid = cloneGrid();
  for (let i = 0; i <= solvePath.length; i += 2) {
    snapshots.push({
      grid: finalGrid,
      currentIdx: i < solvePath.length ? solvePath[i] : null,
      phase: "solving",
      solvePath,
      solveIndex: Math.min(i, solvePath.length),
    });
  }

  // Done snapshots
  for (let i = 0; i < 30; i++) {
    snapshots.push({
      grid: finalGrid,
      currentIdx: null,
      phase: "done",
      solvePath,
      solveIndex: solvePath.length,
    });
  }

  return snapshots;
}

const MazeCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const snapshotsRef = useRef<MazeSnapshot[] | null>(null);
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const cols = Math.floor((CANVAS_W - 80) / CELL_SIZE);
  const rows = Math.floor((CANVAS_H - 80) / CELL_SIZE);
  const offsetX = Math.floor((CANVAS_W - cols * CELL_SIZE) / 2);
  const offsetY = Math.floor((CANVAS_H - rows * CELL_SIZE) / 2);

  if (!snapshotsRef.current) {
    snapshotsRef.current = precomputeMaze(cols, rows);
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const snapshots = snapshotsRef.current;
    if (!snapshots) return;

    // Map frame to snapshot index - spread across duration
    const ratio = snapshots.length / durationInFrames;
    const idx = Math.min(
      Math.floor(frame * ratio),
      snapshots.length - 1
    );
    const snap = snapshots[idx];

    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    // Draw cells
    for (let r = 0; r < snap.grid.length; r++) {
      for (let c = 0; c < snap.grid[r].length; c++) {
        const cell = snap.grid[r][c];
        const x = offsetX + c * CELL_SIZE;
        const y = offsetY + r * CELL_SIZE;
        const s = CELL_SIZE;

        if (cell.visited) {
          ctx.fillStyle = VISITED_FILL;
          ctx.fillRect(x, y, s, s);
        }

        ctx.strokeStyle = WALL_COLOR;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        if (cell.walls[0]) { ctx.moveTo(x, y); ctx.lineTo(x + s, y); }
        if (cell.walls[1]) { ctx.moveTo(x + s, y); ctx.lineTo(x + s, y + s); }
        if (cell.walls[2]) { ctx.moveTo(x, y + s); ctx.lineTo(x + s, y + s); }
        if (cell.walls[3]) { ctx.moveTo(x, y); ctx.lineTo(x, y + s); }
        ctx.stroke();
      }
    }

    // Current cell highlight
    if (snap.currentIdx && snap.phase === "generating") {
      const [cr, cc] = snap.currentIdx;
      const x = offsetX + cc * CELL_SIZE;
      const y = offsetY + cr * CELL_SIZE;
      ctx.fillStyle = CURRENT_FILL;
      ctx.fillRect(x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4);
    }

    // Solve path
    if (
      (snap.phase === "solving" || snap.phase === "done") &&
      snap.solvePath.length > 0
    ) {
      ctx.strokeStyle = SOLVE_COLOR;
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      const limit = Math.min(snap.solveIndex, snap.solvePath.length);
      for (let i = 0; i < limit; i++) {
        const [pr, pc] = snap.solvePath[i];
        const cx = offsetX + pc * CELL_SIZE + CELL_SIZE / 2;
        const cy = offsetY + pr * CELL_SIZE + CELL_SIZE / 2;
        if (i === 0) ctx.moveTo(cx, cy);
        else ctx.lineTo(cx, cy);
      }
      ctx.stroke();

      // Solve head
      if (snap.phase === "solving" && limit > 0) {
        const [hr, hc] = snap.solvePath[limit - 1];
        const hx = offsetX + hc * CELL_SIZE;
        const hy = offsetY + hr * CELL_SIZE;
        ctx.fillStyle = CURRENT_FILL;
        ctx.fillRect(hx + 2, hy + 2, CELL_SIZE - 4, CELL_SIZE - 4);
      }
    }
  }, [frame, durationInFrames, cols, rows, offsetX, offsetY]);

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_W}
      height={CANVAS_H}
      style={{ width: "100%", height: "100%" }}
    />
  );
};

const CODE_SNIPPET = `function generate(cell) {
  cell.visited = true;
  const neighbors = unvisited(cell);
  if (neighbors.length > 0) {
    const next = random(neighbors);
    removeWall(cell, next);
    stack.push(next);
    generate(next);
  } else {
    stack.pop(); // backtrack
  }
}`;

export const MazeReel: React.FC = () => {
  return (
    <ReelTemplate
      title="Maze Generator"
      subtitle="Recursive backtracking"
      codeString={CODE_SNIPPET}
    >
      <MazeCanvas />
    </ReelTemplate>
  );
};
