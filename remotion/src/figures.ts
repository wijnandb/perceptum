// Shared figure drawing functions for geometric spirograph compositions
// Each function builds a path at origin (0,0) — caller handles translate/rotate

export type DrawFn = (ctx: CanvasRenderingContext2D, radius: number) => void;

export const polygon = (sides: number): DrawFn => (ctx, radius) => {
  ctx.beginPath();
  for (let i = 0; i <= sides; i++) {
    const a = (Math.PI * 2 * i) / sides - Math.PI / 2;
    const x = radius * Math.cos(a);
    const y = radius * Math.sin(a);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
};

export const circle: DrawFn = (ctx, radius) => {
  ctx.beginPath();
  ctx.arc(radius * 0.5, 0, radius * 0.5, 0, Math.PI * 2);
  ctx.closePath();
};

export const ellipse: DrawFn = (ctx, radius) => {
  ctx.beginPath();
  ctx.ellipse(0, 0, radius, radius * 0.4, 0, 0, Math.PI * 2);
  ctx.closePath();
};

export const star: DrawFn = (ctx, radius) => {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = (Math.PI * 2 * i) / 10 - Math.PI / 2;
    const r = i % 2 === 0 ? radius : radius * 0.4;
    if (i === 0) ctx.moveTo(r * Math.cos(a), r * Math.sin(a));
    else ctx.lineTo(r * Math.cos(a), r * Math.sin(a));
  }
  ctx.closePath();
};

export const cross: DrawFn = (ctx, radius) => {
  const w = radius * 0.2;
  ctx.beginPath();
  ctx.moveTo(-w, -radius); ctx.lineTo(w, -radius);
  ctx.lineTo(w, -w); ctx.lineTo(radius, -w);
  ctx.lineTo(radius, w); ctx.lineTo(w, w);
  ctx.lineTo(w, radius); ctx.lineTo(-w, radius);
  ctx.lineTo(-w, w); ctx.lineTo(-radius, w);
  ctx.lineTo(-radius, -w); ctx.lineTo(-w, -w);
  ctx.closePath();
};

export const arc: DrawFn = (ctx, radius) => {
  ctx.beginPath();
  ctx.arc(radius * 0.4, 0, radius * 0.6, -Math.PI * 0.5, Math.PI * 0.5);
};

export const crescent: DrawFn = (ctx, radius) => {
  ctx.beginPath();
  ctx.arc(0, 0, radius, -Math.PI * 0.4, Math.PI * 0.4);
  ctx.arc(radius * 0.3, 0, radius * 0.75, Math.PI * 0.35, -Math.PI * 0.35, true);
  ctx.closePath();
};

export const line: DrawFn = (ctx, radius) => {
  ctx.beginPath();
  ctx.moveTo(-radius, 0);
  ctx.lineTo(radius, 0);
};

export const lemniscate: DrawFn = (ctx, radius) => {
  ctx.beginPath();
  for (let i = 0; i <= 80; i++) {
    const t = (Math.PI * 2 * i) / 80;
    const d = 1 + Math.sin(t) * Math.sin(t);
    const x = (radius * Math.cos(t)) / d;
    const y = (radius * Math.sin(t) * Math.cos(t)) / d;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
};

export const spiral: DrawFn = (ctx, radius) => {
  ctx.beginPath();
  for (let i = 0; i <= 60; i++) {
    const t = (2 * Math.PI * 2 * i) / 60;
    const r = (radius * i) / 60;
    if (i === 0) ctx.moveTo(r * Math.cos(t), r * Math.sin(t));
    else ctx.lineTo(r * Math.cos(t), r * Math.sin(t));
  }
};
