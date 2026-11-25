// The World in One Day — 25 November 2026 in one image (r2, dense broadsheet).
// Node stdlib only: draws the whole page with a built-in 5x7 bitmap font and a
// hand-written PNG encoder, then writes entry.png (1024x1024) to
// $MAKEFUN_OUTPUT_DIR (default /output). No image libraries, no network,
// no assets: the same input always produces the same bytes.
import { mkdirSync, writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";
import { join } from "node:path";

const W = 1024;
const H = 1024;

// ---------- palette (flat newsprint colours; few colours keeps the PNG small) ----------
const PAPER = [245, 239, 224];
const INK = [26, 26, 26];
const NAVY = [20, 38, 76];
const RED = [176, 30, 36];
const BLUE = [46, 90, 136];
const SKY = [168, 200, 224];
const GREEN = [62, 122, 62];
const LAND = [126, 168, 104];
const YELLOW = [242, 194, 48];
const ORANGE = [224, 122, 40];
const GREY = [120, 120, 116];
const LIGHT = [226, 226, 218];
const WHITE = [255, 255, 255];
const DARK = [16, 20, 32];

// ---------- pixel buffer ----------
const px = new Uint8Array(W * H * 3);
function setPx(x: number, y: number, c: number[]): void {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 3;
  px[i] = c[0];
  px[i + 1] = c[1];
  px[i + 2] = c[2];
}
function fillRect(x: number, y: number, w: number, h: number, c: number[]): void {
  const x0 = Math.max(0, x);
  const y0 = Math.max(0, y);
  const x1 = Math.min(W, x + w);
  const y1 = Math.min(H, y + h);
  for (let yy = y0; yy < y1; yy++) {
    for (let xx = x0; xx < x1; xx++) {
      const i = (yy * W + xx) * 3;
      px[i] = c[0];
      px[i + 1] = c[1];
      px[i + 2] = c[2];
    }
  }
}
function hline(x: number, y: number, w: number, c: number[]): void {
  fillRect(x, y, w, 1, c);
}
function vline(x: number, y: number, h: number, c: number[]): void {
  fillRect(x, y, 1, h, c);
}
function rectBorder(x: number, y: number, w: number, h: number, c: number[]): void {
  hline(x, y, w, c);
  hline(x, y + h - 1, w, c);
  vline(x, y, h, c);
  vline(x + w - 1, y, h, c);
}
function line(x0: number, y0: number, x1: number, y1: number, c: number[]): void {
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  let x = x0;
  let y = y0;
  for (;;) {
    setPx(x, y, c);
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x += sx;
    }
    if (e2 < dx) {
      err += dx;
      y += sy;
    }
  }
}
function circle(cx: number, cy: number, r: number, c: number[]): void {
  for (let y = -r; y <= r; y++) {
    for (let x = -r; x <= r; x++) {
      if (x * x + y * y <= r * r) setPx(cx + x, cy + y, c);
    }
  }
}
function ellipse(cx: number, cy: number, rx: number, ry: number, c: number[]): void {
  for (let y = -ry; y <= ry; y++) {
    for (let x = -rx; x <= rx; x++) {
      if ((x * x) / (rx * rx) + (y * y) / (ry * ry) <= 1) setPx(cx + x, cy + y, c);
    }
  }
}
function tri(x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, c: number[]): void {
  const minY = Math.min(y1, y2, y3);
  const maxY = Math.max(y1, y2, y3);
  for (let y = minY; y <= maxY; y++) {
    const xs: number[] = [];
    const edges: Array<[number, number, number, number]> = [
      [x1, y1, x2, y2],
      [x2, y2, x3, y3],
      [x3, y3, x1, y1],
    ];
    for (const [ax, ay, bx, by] of edges) {
      if ((ay <= y && by > y) || (by <= y && ay > y)) {
        xs.push(ax + ((y - ay) * (bx - ax)) / (by - ay));
      }
    }
    if (xs.length >= 2) {
      const a = Math.min(...xs);
      const b = Math.max(...xs);
      for (let x = Math.ceil(a); x <= Math.floor(b); x++) setPx(x, y, c);
    }
  }
}
function poly(points: Array<[number, number]>, c: number[]): void {
  const minY = Math.min(...points.map((p) => p[1]));
  const maxY = Math.max(...points.map((p) => p[1]));
  for (let y = minY; y <= maxY; y++) {
    const xs: number[] = [];
    for (let i = 0; i < points.length; i++) {
      const [ax, ay] = points[i];
      const [bx, by] = points[(i + 1) % points.length];
      if ((ay <= y && by > y) || (by <= y && ay > y)) {
        xs.push(ax + ((y - ay) * (bx - ax)) / (by - ay));
      }
    }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      for (let x = Math.ceil(xs[k]); x <= Math.floor(xs[k + 1]); x++) setPx(x, y, c);
    }
  }
}

// ---------- 5x7 bitmap font (rows as 5-bit values, bit 4 = leftmost pixel) ----------
const FONT: Record<string, number[]> = {
  A: [0x0e, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11],
  B: [0x1e, 0x11, 0x11, 0x1e, 0x11, 0x11, 0x1e],
  C: [0x0e, 0x11, 0x10, 0x10, 0x10, 0x11, 0x0e],
  D: [0x1e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x1e],
  E: [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x1f],
  F: [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x10],
  G: [0x0e, 0x11, 0x10, 0x17, 0x11, 0x11, 0x0f],
  H: [0x11, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11],
  I: [0x0e, 0x04, 0x04, 0x04, 0x04, 0x04, 0x0e],
  J: [0x07, 0x02, 0x02, 0x02, 0x02, 0x12, 0x0c],
  K: [0x11, 0x12, 0x14, 0x18, 0x14, 0x12, 0x11],
  L: [0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x1f],
  M: [0x11, 0x1b, 0x15, 0x15, 0x11, 0x11, 0x11],
  N: [0x11, 0x19, 0x15, 0x13, 0x11, 0x11, 0x11],
  O: [0x0e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e],
  P: [0x1e, 0x11, 0x11, 0x1e, 0x10, 0x10, 0x10],
  Q: [0x0e, 0x11, 0x11, 0x11, 0x15, 0x12, 0x0d],
  R: [0x1e, 0x11, 0x11, 0x1e, 0x14, 0x12, 0x11],
  S: [0x0f, 0x10, 0x10, 0x0e, 0x01, 0x01, 0x1e],
  T: [0x1f, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04],
  U: [0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e],
  V: [0x11, 0x11, 0x11, 0x11, 0x11, 0x0a, 0x04],
  W: [0x11, 0x11, 0x11, 0x15, 0x15, 0x1b, 0x11],
  X: [0x11, 0x11, 0x0a, 0x04, 0x0a, 0x11, 0x11],
  Y: [0x11, 0x11, 0x0a, 0x04, 0x04, 0x04, 0x04],
  Z: [0x1f, 0x01, 0x02, 0x04, 0x08, 0x10, 0x1f],
  "0": [0x0e, 0x11, 0x13, 0x15, 0x19, 0x11, 0x0e],
  "1": [0x04, 0x0c, 0x04, 0x04, 0x04, 0x04, 0x0e],
  "2": [0x0e, 0x11, 0x01, 0x06, 0x08, 0x10, 0x1f],
  "3": [0x1f, 0x02, 0x04, 0x02, 0x01, 0x11, 0x0e],
  "4": [0x02, 0x06, 0x0a, 0x12, 0x1f, 0x02, 0x02],
  "5": [0x1f, 0x10, 0x1e, 0x01, 0x01, 0x11, 0x0e],
  "6": [0x06, 0x08, 0x10, 0x1e, 0x11, 0x11, 0x0e],
  "7": [0x1f, 0x01, 0x02, 0x04, 0x08, 0x08, 0x08],
  "8": [0x0e, 0x11, 0x11, 0x0e, 0x11, 0x11, 0x0e],
  "9": [0x0e, 0x11, 0x11, 0x0f, 0x01, 0x02, 0x0c],
  " ": [0, 0, 0, 0, 0, 0, 0],
  ".": [0, 0, 0, 0, 0, 0x0c, 0x0c],
  ",": [0, 0, 0, 0, 0x0c, 0x04, 0x08],
  "-": [0, 0, 0, 0x0e, 0, 0, 0],
  "'": [0x04, 0x04, 0x08, 0, 0, 0, 0],
  '"': [0x0a, 0x0a, 0, 0, 0, 0, 0],
  "/": [0x01, 0x02, 0x02, 0x04, 0x08, 0x08, 0x10],
  "(": [0x02, 0x04, 0x08, 0x08, 0x08, 0x04, 0x02],
  ")": [0x08, 0x04, 0x02, 0x02, 0x02, 0x04, 0x08],
  "%": [0x19, 0x1a, 0x02, 0x04, 0x08, 0x0b, 0x13],
  $: [0x04, 0x0f, 0x14, 0x0e, 0x05, 0x1e, 0x04],
  "&": [0x0c, 0x12, 0x14, 0x08, 0x15, 0x12, 0x0d],
  "!": [0x04, 0x04, 0x04, 0x04, 0x04, 0, 0x04],
  "?": [0x0e, 0x11, 0x01, 0x02, 0x04, 0, 0x04],
  "+": [0, 0x04, 0x04, 0x1f, 0x04, 0x04, 0],
  "=": [0, 0, 0x1f, 0, 0x1f, 0, 0],
  ";": [0, 0x0c, 0, 0x0c, 0x04, 0, 0x08],
  ":": [0, 0x0c, 0x0c, 0, 0x0c, 0x0c, 0],
  "·": [0, 0, 0, 0x0c, 0x0c, 0, 0],
  "×": [0, 0x11, 0x0a, 0x04, 0x0a, 0x11, 0],
  "•": [0, 0, 0x0e, 0x11, 0x11, 0x0e, 0],
  ">": [0x08, 0x04, 0x02, 0x01, 0x02, 0x04, 0x08],
  "<": [0x02, 0x04, 0x08, 0x10, 0x08, 0x04, 0x02],
};
function charWidth(scale: number): number {
  return 6 * scale;
}
function textWidth(text: string, scale: number): number {
  return text.length * charWidth(scale) - scale;
}
function drawChar(ch: string, x: number, y: number, scale: number, c: number[]): void {
  const g = FONT[ch] || FONT[" "];
  for (let row = 0; row < 7; row++) {
    const bits = g[row];
    for (let col = 0; col < 5; col++) {
      if (bits & (1 << (4 - col))) {
        fillRect(x + col * scale, y + row * scale, scale, scale, c);
      }
    }
  }
}
function drawText(text: string, x: number, y: number, scale: number, c: number[]): void {
  const up = text.toUpperCase();
  for (let i = 0; i < up.length; i++) {
    drawChar(up[i], x + i * charWidth(scale), y, scale, c);
  }
}
function drawTextCentered(text: string, cx: number, y: number, scale: number, c: number[]): void {
  drawText(text, Math.round(cx - textWidth(text, scale) / 2), y, scale, c);
}
function drawTextRight(text: string, right: number, y: number, scale: number, c: number[]): void {
  drawText(text, right - textWidth(text, scale), y, scale, c);
}
// Greedy word wrap: returns lines that fit maxWidth at the given scale.
function wrapText(text: string, scale: number, maxWidth: number): string[] {
  const words = text.toUpperCase().split(/\s+/).filter((w) => w.length > 0);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const trial = cur ? cur + " " + w : w;
    if (textWidth(trial, scale) <= maxWidth || !cur) {
      cur = trial;
    } else {
      lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

// ---------- PNG encoder (stdlib zlib deflate; RGB8, filter 0 per scanline) ----------
const CRC_TABLE: number[] = (() => {
  const t: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t.push(c >>> 0);
  }
  return t;
})();
function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function pngChunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}
function encodePNG(): Buffer {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const raw = Buffer.alloc(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0;
    raw.set(px.subarray(y * W * 3, (y + 1) * W * 3), y * (1 + W * 3) + 1);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    sig,
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", idat),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---------- drawn scenes (flat vector shapes; each fits any x,y,w,h box) ----------
function sceneRocket(x: number, y: number, w: number, h: number): void {
  fillRect(x, y, w, h, DARK);
  // stars (fixed positions, deterministic)
  const stars: Array<[number, number]> = [
    [0.08, 0.12], [0.2, 0.06], [0.35, 0.18], [0.55, 0.08], [0.72, 0.16],
    [0.85, 0.07], [0.92, 0.3], [0.12, 0.4], [0.66, 0.34], [0.45, 0.05],
  ];
  for (const [fx, fy] of stars) {
    fillRect(Math.round(x + fx * w), Math.round(y + fy * h), 2, 2, WHITE);
  }
  // ground
  fillRect(x, y + Math.round(h * 0.82), w, Math.round(h * 0.18), [52, 58, 64]);
  const cx = x + Math.round(w * 0.5);
  const top = y + Math.round(h * 0.1);
  const base = y + Math.round(h * 0.8);
  // flame
  tri(cx - 7, base - 6, cx + 7, base - 6, cx, base + 14, ORANGE);
  tri(cx - 4, base - 6, cx + 4, base - 6, cx, base + 8, YELLOW);
  // body
  fillRect(cx - 9, top + 14, 18, base - top - 20, WHITE);
  tri(cx - 9, top + 14, cx + 9, top + 14, cx, top, RED);
  fillRect(cx - 9, top + 34, 18, 4, RED);
  // fins
  tri(cx - 9, base - 22, cx - 18, base - 6, cx - 9, base - 6, RED);
  tri(cx + 9, base - 22, cx + 18, base - 6, cx + 9, base - 6, RED);
  // window
  circle(cx, top + 26, 3, SKY);
  // smoke
  circle(x + Math.round(w * 0.2), base + 4, 6, GREY);
  circle(x + Math.round(w * 0.78), base + 6, 8, GREY);
}
function sceneCapitol(x: number, y: number, w: number, h: number): void {
  fillRect(x, y, w, h, SKY);
  fillRect(x, y + Math.round(h * 0.78), w, Math.round(h * 0.22), GREEN);
  const cx = x + Math.round(w * 0.5);
  const base = y + Math.round(h * 0.78);
  // dome
  ellipse(cx, base - Math.round(h * 0.42), Math.round(w * 0.16), Math.round(h * 0.2), WHITE);
  fillRect(cx - Math.round(w * 0.16), base - Math.round(h * 0.42), Math.round(w * 0.32), Math.round(h * 0.42), WHITE);
  fillRect(cx - 2, base - Math.round(h * 0.68), 4, Math.round(h * 0.08), INK);
  // building
  fillRect(x + Math.round(w * 0.12), base - Math.round(h * 0.34), Math.round(w * 0.76), Math.round(h * 0.34), [232, 228, 214]);
  // columns
  for (let i = 0; i < 5; i++) {
    const colX = x + Math.round(w * (0.18 + i * 0.14));
    fillRect(colX, base - Math.round(h * 0.3), 4, Math.round(h * 0.3), INK);
  }
  // flag
  vline(cx + Math.round(w * 0.3), y + Math.round(h * 0.06), Math.round(h * 0.2), INK);
  fillRect(cx + Math.round(w * 0.3), y + Math.round(h * 0.06), 12, 7, RED);
}
function sceneCourt(x: number, y: number, w: number, h: number): void {
  fillRect(x, y, w, h, [214, 206, 188]);
  const base = y + Math.round(h * 0.8);
  fillRect(x, base, w, h - Math.round(h * 0.8), GREEN);
  const cx = x + Math.round(w * 0.5);
  // pediment
  tri(cx - Math.round(w * 0.34), base - Math.round(h * 0.42), cx + Math.round(w * 0.34), base - Math.round(h * 0.42), cx, base - Math.round(h * 0.62), WHITE);
  // columns
  for (let i = 0; i < 4; i++) {
    const colX = x + Math.round(w * (0.2 + i * 0.17));
    fillRect(colX, base - Math.round(h * 0.42), 5, Math.round(h * 0.42), WHITE);
    fillRect(colX - 2, base - Math.round(h * 0.42), 9, 3, WHITE);
  }
  // steps
  fillRect(x + Math.round(w * 0.1), base - 4, Math.round(w * 0.8), 4, GREY);
  // scales of justice (small, right)
  const sx = x + Math.round(w * 0.82);
  vline(sx, y + Math.round(h * 0.3), Math.round(h * 0.3), INK);
  hline(sx - 8, y + Math.round(h * 0.32), 16, INK);
  tri(sx - 8, y + Math.round(h * 0.32), sx - 4, y + Math.round(h * 0.32), sx - 6, y + Math.round(h * 0.44), YELLOW);
  tri(sx + 4, y + Math.round(h * 0.32), sx + 8, y + Math.round(h * 0.32), sx + 6, y + Math.round(h * 0.44), YELLOW);
}
function sceneTurkey(x: number, y: number, w: number, h: number): void {
  fillRect(x, y, w, h, SKY);
  fillRect(x, y + Math.round(h * 0.72), w, Math.round(h * 0.28), GREEN);
  // white house
  const bx = x + Math.round(w * 0.08);
  const bw = Math.round(w * 0.5);
  const base = y + Math.round(h * 0.72);
  fillRect(bx, base - Math.round(h * 0.34), bw, Math.round(h * 0.34), WHITE);
  tri(bx - 4, base - Math.round(h * 0.34), bx + bw + 4, base - Math.round(h * 0.34), bx + Math.round(bw / 2), base - Math.round(h * 0.48), [120, 60, 60]);
  for (let i = 0; i < 4; i++) {
    fillRect(bx + 4 + i * Math.round(bw / 4.5), base - Math.round(h * 0.3), 3, Math.round(h * 0.3), INK);
  }
  vline(bx + Math.round(bw / 2), base - Math.round(h * 0.62), Math.round(h * 0.14), INK);
  fillRect(bx + Math.round(bw / 2), base - Math.round(h * 0.62), 10, 6, RED);
  // turkey (right side): fanned tail, round body, head with wattle
  const tx = x + Math.round(w * 0.74);
  const ty = base - Math.round(h * 0.14);
  for (let i = -2; i <= 2; i++) {
    tri(tx, ty - 2, tx + i * 8 - 4, ty - Math.round(h * 0.34), tx + i * 8 + 4, ty - Math.round(h * 0.34), [150, 90, 40]);
  }
  ellipse(tx, ty, 11, 9, [110, 70, 30]);
  circle(tx + 9, ty - 10, 5, [110, 70, 30]);
  tri(tx + 12, ty - 8, tx + 15, ty - 8, tx + 13, ty - 3, RED);
  fillRect(tx - 2, ty + 2, 4, 4, ORANGE);
}
function sceneChart(x: number, y: number, w: number, h: number): void {
  fillRect(x, y, w, h, WHITE);
  // grid
  for (let i = 1; i < 4; i++) hline(x + 4, y + Math.round((h * i) / 4), w - 8, LIGHT);
  // bars
  const bars = [0.55, 0.7, 0.62, 0.78, 0.5, 0.34, 0.22];
  const bw = Math.floor((w - 12) / bars.length);
  for (let i = 0; i < bars.length; i++) {
    const bh = Math.round(h * 0.6 * bars[i]);
    fillRect(x + 6 + i * bw, y + h - 8 - bh, bw - 2, bh, i >= 4 ? RED : GREEN);
  }
  // downtrend line
  line(x + 6, y + Math.round(h * 0.18), x + Math.round(w * 0.45), y + Math.round(h * 0.3), RED);
  line(x + Math.round(w * 0.45), y + Math.round(h * 0.3), x + Math.round(w * 0.7), y + Math.round(h * 0.55), RED);
  line(x + Math.round(w * 0.7), y + Math.round(h * 0.55), x + w - 6, y + Math.round(h * 0.72), RED);
  // "-6%" tag
  fillRect(x + w - 34, y + 4, 30, 12, RED);
  drawText("-6%", x + w - 31, y + 6, 1, WHITE);
}
function sceneTower(x: number, y: number, w: number, h: number): void {
  // dusk bands
  fillRect(x, y, w, Math.round(h * 0.5), [238, 170, 110]);
  fillRect(x, y + Math.round(h * 0.5), w, h - Math.round(h * 0.5), [214, 140, 90]);
  fillRect(x, y + Math.round(h * 0.8), w, Math.round(h * 0.2), [60, 60, 66]);
  const tx = x + Math.round(w * 0.42);
  const tw = Math.round(w * 0.24);
  const base = y + Math.round(h * 0.8);
  // tower
  fillRect(tx, y + Math.round(h * 0.12), tw, base - y - Math.round(h * 0.12), [44, 52, 66]);
  // lit windows
  for (let r = 0; r < 6; r++) {
    for (let c = 0; c < 3; c++) {
      if ((r + c) % 2 === 0) {
        fillRect(tx + 3 + c * Math.round(tw / 3), y + Math.round(h * 0.16) + r * 7, 3, 4, YELLOW);
      }
    }
  }
  // drone
  const dx = x + Math.round(w * 0.78);
  const dy = y + Math.round(h * 0.22);
  fillRect(dx - 6, dy - 2, 12, 4, INK);
  fillRect(dx - 2, dy - 6, 4, 12, INK);
  circle(dx - 8, dy - 6, 2, INK);
  circle(dx + 8, dy - 6, 2, INK);
  // smoke
  circle(tx + Math.round(tw / 2), y + Math.round(h * 0.1), 5, GREY);
  circle(tx + Math.round(tw / 2) + 8, y + Math.round(h * 0.06), 4, GREY);
}
function sceneShip(x: number, y: number, w: number, h: number): void {
  fillRect(x, y, w, Math.round(h * 0.62), SKY);
  fillRect(x, y + Math.round(h * 0.62), w, h - Math.round(h * 0.62), BLUE);
  // wave lines
  for (let i = 0; i < 3; i++) {
    const wy = y + Math.round(h * (0.68 + i * 0.1));
    for (let wx = x + 4 + (i % 2) * 10; wx < x + w - 10; wx += 22) {
      hline(wx, wy, 12, WHITE);
    }
  }
  const hx = x + Math.round(w * 0.18);
  const hw = Math.round(w * 0.56);
  const wy = y + Math.round(h * 0.6);
  // hull
  poly(
    [
      [hx, wy],
      [hx + hw, wy],
      [hx + hw - 8, wy + Math.round(h * 0.16)],
      [hx + 12, wy + Math.round(h * 0.16)],
    ],
    DARK,
  );
  fillRect(hx + 4, wy - 2, hw - 8, 3, YELLOW);
  // superstructure + mast + flag
  fillRect(hx + Math.round(hw * 0.55), wy - Math.round(h * 0.22), Math.round(hw * 0.22), Math.round(h * 0.22), WHITE);
  vline(hx + Math.round(hw * 0.66), wy - Math.round(h * 0.42), Math.round(h * 0.22), INK);
  fillRect(hx + Math.round(hw * 0.66), wy - Math.round(h * 0.42), 10, 6, RED);
  // explosion star (right)
  const ex = x + Math.round(w * 0.85);
  const ey = y + Math.round(h * 0.3);
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    line(ex, ey, Math.round(ex + Math.cos(a) * 12), Math.round(ey + Math.sin(a) * 12), YELLOW);
    line(ex, ey, Math.round(ex + Math.cos(a) * 12), Math.round(ey + Math.sin(a) * 12), ORANGE);
  }
  circle(ex, ey, 3, ORANGE);
}
function sceneFootball(x: number, y: number, w: number, h: number): void {
  fillRect(x, y, w, h, GREEN);
  // pitch stripes
  for (let i = 0; i < 4; i++) {
    if (i % 2 === 0) fillRect(x, y + Math.round((h * i) / 4), w, Math.round(h / 4), [74, 138, 74]);
  }
  // centre line + circle
  vline(x + Math.round(w / 2), y, h, WHITE);
  circle(x + Math.round(w / 2), y + Math.round(h / 2), 12, WHITE);
  circle(x + Math.round(w / 2), y + Math.round(h / 2), 10, GREEN);
  // goal (right)
  rectBorder(x + w - 26, y + Math.round(h * 0.3), 22, Math.round(h * 0.4), WHITE);
  for (let i = 0; i < 3; i++) vline(x + w - 20 + i * 6, y + Math.round(h * 0.3), Math.round(h * 0.4), WHITE);
  // ball
  circle(x + Math.round(w * 0.62), y + Math.round(h * 0.62), 6, WHITE);
  fillRect(x + Math.round(w * 0.62) - 1, y + Math.round(h * 0.62) - 1, 3, 3, INK);
  // score tag
  fillRect(x + 4, y + 4, 34, 12, WHITE);
  drawText("5-1", x + 8, y + 6, 1, INK);
}
function sceneServers(x: number, y: number, w: number, h: number): void {
  fillRect(x, y, w, h, DARK);
  // racks
  for (let r = 0; r < 3; r++) {
    const rx = x + 6 + r * Math.round((w - 12) / 3);
    const rw = Math.round((w - 12) / 3) - 4;
    fillRect(rx, y + 6, rw, h - 12, [40, 46, 60]);
    rectBorder(rx, y + 6, rw, h - 12, GREY);
    for (let row = 0; row < 4; row++) {
      const ly = y + 10 + row * Math.round((h - 20) / 4);
      for (let c = 0; c < 3; c++) {
        const col = (r + row + c) % 3 === 0 ? RED : (r + row + c) % 3 === 1 ? GREEN : YELLOW;
        fillRect(rx + 4 + c * 5, ly, 3, 3, col);
      }
      hline(rx + 3, ly + 6, rw - 6, GREY);
    }
  }
  // padlock (centre, on top)
  const cx = x + Math.round(w / 2);
  const cy = y + Math.round(h * 0.55);
  circle(cx, cy - 10, 9, YELLOW);
  circle(cx, cy - 10, 6, DARK);
  fillRect(cx - 11, cy - 8, 22, 18, YELLOW);
  fillRect(cx - 2, cy - 2, 4, 8, INK);
}

// ---------- story data: 40 stories, all dated Wednesday 25 November 2026 ----------
type Region = "EUROPE" | "MIDDLE EAST" | "ASIA" | "AFRICA" | "AMERICAS";
type SceneKind =
  | "rocket"
  | "capitol"
  | "court"
  | "turkey"
  | "chart"
  | "tower"
  | "ship"
  | "football"
  | "servers";
interface Hero {
  n: number;
  region: Region;
  city: string;
  headline: string;
  deck: string;
  source: string;
  scene: SceneKind;
  lon: number;
  lat: number;
}
const LEAD: Hero = {
  n: 1,
  region: "ASIA",
  city: "JIUQUAN, CHINA",
  headline: "SHENZHOU-24 LIFTS OFF WITH PAKISTAN'S FIRST ASTRONAUT",
  deck: "Long March 2F launches at 00:18 UTC; Zeeshan Ali is the first foreign visitor to Tiangong.",
  source: "REUTERS",
  scene: "rocket",
  lon: 100,
  lat: 40,
};
const GRID: Hero[] = [
  {
    n: 2,
    region: "ASIA",
    city: "BEIJING, CHINA",
    headline: "CHINA PROBES POLITBURO MEMBER",
    deck: "Shanghai party chief Chen Jinging under investigation; the fourth top leader probed since 2025.",
    source: "XINHUA",
    scene: "capitol",
    lon: 116,
    lat: 40,
  },
  {
    n: 3,
    region: "AMERICAS",
    city: "NEW YORK, US",
    headline: "HUAWEI GUILTY OF TRADE THEFT",
    deck: "Convicted in a US trial over its Iran business; acquitted of racketeering.",
    source: "REUTERS",
    scene: "court",
    lon: -74,
    lat: 41,
  },
  {
    n: 4,
    region: "AMERICAS",
    city: "WASHINGTON, US",
    headline: "TRUMP PARDONS TURKEYS",
    deck: "Freedom and Feathers spared at the White House ceremony.",
    source: "REUTERS / AP",
    scene: "turkey",
    lon: -77,
    lat: 39,
  },
  {
    n: 5,
    region: "AMERICAS",
    city: "SANTA CLARA, US",
    headline: "NVIDIA SLIDE: SHARES DOWN 6%",
    deck: "Relief rally over Huang's return fizzles; Nasdaq falls 1.5%.",
    source: "REUTERS",
    scene: "chart",
    lon: -122,
    lat: 37,
  },
  {
    n: 6,
    region: "MIDDLE EAST",
    city: "RIYADH, SAUDI ARABIA",
    headline: "HOUTHI DRONE HITS RIYADH TOWER",
    deck: "Financial centre tower struck; 11 hurt, two Indians among the injured.",
    source: "AL JAZEERA",
    scene: "tower",
    lon: 47,
    lat: 25,
  },
  {
    n: 7,
    region: "EUROPE",
    city: "KYIV, UKRAINE",
    headline: "KYIV OWNS THE GULF STRIKE",
    deck: "Zelenskiy: Sparta II carried arms. Norway urges caution.",
    source: "REUTERS",
    scene: "ship",
    lon: 30,
    lat: 50,
  },
  {
    n: 8,
    region: "EUROPE",
    city: "MADRID, SPAIN",
    headline: "REAL MADRID ROUT PSV 5-1",
    deck: "Comeback win keeps a perfect Champions League start.",
    source: "REUTERS",
    scene: "football",
    lon: -4,
    lat: 40,
  },
  {
    n: 9,
    region: "AMERICAS",
    city: "LANGLEY, US",
    headline: "CIA HIT BY CYBER BREACH",
    deck: "Some unclassified information exposed, a source says.",
    source: "REUTERS",
    scene: "servers",
    lon: -77,
    lat: 37,
  },
];
interface Also {
  n: number;
  region: Region;
  text: string;
  source: string;
}
const ALSO: Also[] = [
  { n: 10, region: "MIDDLE EAST", text: "GAZA: 9 KILLED IN ISRAELI STRIKES", source: "AP" },
  { n: 11, region: "EUROPE", text: "KYIV: UKRAINE DOWNS 73 OF 96 RUSSIAN DRONES", source: "REUTERS" },
  { n: 12, region: "AMERICAS", text: "WASHINGTON: HEGSETH HOLDS UP $8BN PATRIOT MISSILES", source: "REUTERS" },
  { n: 13, region: "EUROPE", text: "BRUSSELS: EU PAYS UKRAINE $8.78BN, ITS BIGGEST YET", source: "AL JAZEERA" },
  { n: 14, region: "EUROPE", text: "LONDON: BRITAIN SANCTIONS HOUTHIS, 4 OFFICIALS", source: "REUTERS" },
  { n: 15, region: "MIDDLE EAST", text: "TEHRAN: IRAN MEDICINE SHORTAGE BITES PATIENTS", source: "DW" },
  { n: 16, region: "AFRICA", text: "KINSHASA: REBELS PULL BACK IN DR CONGO AFTER CLASH", source: "REUTERS" },
  { n: 17, region: "AMERICAS", text: "WASHINGTON: FBI CRIME DATABASE HIT BY BREACH", source: "REUTERS" },
  { n: 18, region: "AMERICAS", text: "CHICAGO: RADAR FAULT DELAYS FLIGHTS AT O'HARE", source: "REUTERS" },
  { n: 19, region: "AMERICAS", text: "NEW YORK: TSA TO SCREEN 17.6M THANKSGIVING FLYERS", source: "REUTERS" },
  { n: 20, region: "AMERICAS", text: "FORT HOOD: SHOOTER SEEKS STAY OF EXECUTION", source: "REUTERS" },
  { n: 21, region: "EUROPE", text: "COPENHAGEN: DENMARK COURT UPHOLDS GHETTO EVICTIONS", source: "REUTERS" },
  { n: 22, region: "ASIA", text: "GUANGZHOU: BANGLADESH OPENS OFFICE IN GUANGZHOU", source: "REUTERS" },
  { n: 23, region: "EUROPE", text: "LONDON: ENGLAND BEAT AUSTRALIA BY 8 WICKETS", source: "REUTERS" },
  { n: 24, region: "ASIA", text: "MUMBAI: SOORYAVANSHI, 15, HITS 204 OFF 53 BALLS", source: "AP" },
  { n: 25, region: "EUROPE", text: "ANKARA: M4.7 QUAKE STRIKES WESTERN TURKIYE", source: "USGS" },
  { n: 26, region: "AMERICAS", text: "NEW YORK: S&P 500 -0.5%, NASDAQ -1.5%; GOLD $3,548", source: "COINDESK" },
  { n: 27, region: "EUROPE", text: "BERLIN: GERMAN BUSINESS MORALE RISES, IFO 90.5", source: "REUTERS" },
  { n: 28, region: "AMERICAS", text: "MEXICO CITY: MEXICO INFLATION HITS SIX-MONTH HIGH AT 3.9%", source: "AP" },
  { n: 29, region: "ASIA", text: "TOKYO: NIKKEI SEEN AT 65,000 BY JUNE 2027", source: "REUTERS POLL" },
  { n: 30, region: "AMERICAS", text: "NEW YORK: S&P 500 SEEN GAINING OVER 12% BY END OF 2027", source: "REUTERS POLL" },
  { n: 31, region: "AMERICAS", text: "CARACAS: CITI WEIGHS RETURN TO VENEZUELA AFTER EXIT", source: "REUTERS" },
  { n: 32, region: "AMERICAS", text: "CARACAS: VENEZUELA REPORTS $237.5BN PUBLIC DEBT", source: "REUTERS" },
  { n: 33, region: "EUROPE", text: "BRUSSELS: EU PROPOSES 22ND RUSSIA SANCTIONS PACKAGE", source: "REUTERS" },
  { n: 34, region: "MIDDLE EAST", text: "DAMASCUS: LANDMINE CASUALTIES SOAR IN SYRIA TWO YEARS AFTER WAR", source: "REUTERS" },
  { n: 35, region: "EUROPE", text: "LONDON: OXFAM SAYS GAZA ATTACKS LEFT A TOXIC WASTELAND", source: "AP" },
  { n: 36, region: "MIDDLE EAST", text: "BEIRUT: LEBANON AND QATAR CONDEMN HOUTHI ATTACK ON RIYADH", source: "REUTERS" },
  { n: 37, region: "EUROPE", text: "LONDON: BANK OF ENGLAND CHIEF BAILEY FACES MPS OVER RATES", source: "REUTERS" },
  { n: 38, region: "AMERICAS", text: "NEW YORK: GOLD EASES TO $3,344 AHEAD OF US INFLATION DATA", source: "REUTERS" },
  { n: 39, region: "AMERICAS", text: "WASHINGTON: US INFLATION AND Q3 GDP DATA DUE; FED HIKE SEEN IN DEC", source: "REUTERS" },
  { n: 40, region: "AMERICAS", text: "NEW YORK: DELL LIFTS FORECASTS AFTER RECORD QUARTER ON AI SERVERS", source: "REUTERS" },
];
const STATS: Array<[string, string]> = [
  ["1ST", "PAKISTANI IN ORBIT ON SHENZHOU-24"],
  ["4TH", "POLITBURO MEMBER PROBED SINCE 2025"],
  ["-6%", "NVIDIA SHARES AS BOUNCE FADES"],
  ["11", "HURT IN HOUTHI STRIKE ON RIYADH"],
  ["5-1", "REAL MADRID ROUT PSV"],
  ["116", "WOMEN VIE FOR MISS UNIVERSE CROWN"],
];
function drawScene(kind: SceneKind, x: number, y: number, w: number, h: number): void {
  if (kind === "rocket") sceneRocket(x, y, w, h);
  else if (kind === "capitol") sceneCapitol(x, y, w, h);
  else if (kind === "court") sceneCourt(x, y, w, h);
  else if (kind === "turkey") sceneTurkey(x, y, w, h);
  else if (kind === "chart") sceneChart(x, y, w, h);
  else if (kind === "tower") sceneTower(x, y, w, h);
  else if (kind === "ship") sceneShip(x, y, w, h);
  else if (kind === "football") sceneFootball(x, y, w, h);
  else sceneServers(x, y, w, h);
}
function numBadge(n: number, cx: number, cy: number): void {
  circle(cx, cy, 9, RED);
  const s = String(n);
  drawText(s, Math.round(cx - textWidth(s, 1) / 2), cy - 3, 1, WHITE);
}

// ---------- world map (stylised continents, lon/lat polygons) ----------
const MAP_X = 16;
const MAP_Y = 612;
const MAP_W = 282;
const MAP_H = 200;
function lonLatToMap(lon: number, lat: number): [number, number] {
  return [
    Math.round(MAP_X + ((lon + 170) / 360) * MAP_W),
    Math.round(MAP_Y + ((75 - lat) / 130) * MAP_H),
  ];
}
const CONTINENTS: Array<Array<[number, number]>> = [
  [
    [-168, 66], [-140, 70], [-120, 72], [-95, 80], [-80, 73], [-60, 60], [-55, 47],
    [-65, 45], [-75, 35], [-80, 26], [-90, 21], [-97, 16], [-105, 20], [-115, 28],
    [-125, 40], [-125, 49], [-140, 60], [-155, 58], [-165, 60],
  ],
  [
    [-58, 64], [-45, 60], [-40, 70], [-55, 76], [-68, 76],
  ],
  [
    [-80, 10], [-70, 12], [-60, 8], [-50, 0], [-40, -5], [-35, -10], [-40, -20],
    [-50, -30], [-60, -38], [-70, -52], [-73, -40], [-75, -20], [-80, -5],
  ],
  [
    [-10, 36], [-2, 37], [10, 38], [20, 40], [28, 38], [30, 42], [24, 45], [19, 46],
    [12, 44], [7, 44], [0, 46], [-4, 48], [-2, 51], [5, 53], [8, 57], [18, 56],
    [24, 59], [28, 62], [22, 65], [18, 70], [12, 68], [8, 62], [5, 58], [0, 57],
    [-5, 54], [-9, 50], [-11, 43],
  ],
  [
    [-6, 35], [-10, 31], [-15, 27], [-17, 20], [-17, 15], [-15, 11], [-10, 7], [-8, 4],
    [-4, 5], [2, 6], [6, 4], [9, 4], [12, -2], [13, -10], [12, -18], [14, -22],
    [16, -28], [20, -35], [26, -34], [32, -28], [35, -22], [40, -15], [41, -10],
    [46, -2], [51, 2], [51, 10], [48, 11], [44, 12], [40, 15], [38, 18], [37, 22],
    [35, 28], [32, 31], [25, 32], [20, 32], [15, 34], [10, 35], [5, 37],
  ],
  [
    [30, 36], [35, 36], [36, 33], [40, 31], [44, 30], [48, 30], [50, 26], [52, 25],
    [55, 26], [57, 25], [60, 25], [62, 24], [66, 25], [70, 22], [75, 20], [80, 15],
    [85, 18], [88, 22], [92, 21], [95, 16], [98, 14], [100, 10], [103, 5], [105, 9],
    [108, 12], [110, 20], [115, 22], [120, 25], [122, 30], [127, 32], [130, 35],
    [132, 38], [135, 42], [138, 45], [141, 50], [142, 55], [140, 60], [135, 65],
    [130, 70], [125, 72], [120, 73], [115, 72], [110, 73], [105, 75], [100, 76],
    [95, 75], [90, 75], [85, 73], [80, 73], [75, 72], [70, 72], [65, 70], [60, 68],
    [55, 68], [50, 65], [45, 60], [42, 58], [40, 55], [38, 50], [35, 45], [32, 42],
    [30, 38],
  ],
  [
    [114, -22], [114, -30], [116, -35], [120, -34], [124, -33], [129, -32], [132, -32],
    [135, -35], [138, -35], [140, -38], [145, -38], [150, -37], [153, -32], [153, -27],
    [150, -22], [146, -19], [142, -15], [142, -11], [137, -12], [135, -15], [132, -12],
    [130, -13], [126, -14], [122, -17], [118, -20],
  ],
];
function drawMap(): void {
  fillRect(MAP_X - 4, MAP_Y - 4, MAP_W + 8, MAP_H + 8, SKY);
  for (const cont of CONTINENTS) {
    poly(cont.map(([lo, la]) => lonLatToMap(lo, la)), LAND);
  }
  const heroes = [LEAD, ...GRID];
  // Nudge pins that would otherwise collide on the small map (Beijing vs
  // Jiuquan, Langley vs Washington) so every number stays readable.
  const pinNudge: Record<number, [number, number]> = {
    2: [11, -9],
    4: [-9, 3],
    9: [11, 9],
  };
  for (const s of heroes) {
    const [pxx, pyy] = lonLatToMap(s.lon, s.lat);
    const [nx, ny] = pinNudge[s.n] || [0, 0];
    circle(pxx + nx, pyy + ny, 8, RED);
    const num = String(s.n);
    drawText(num, Math.round(pxx + nx - textWidth(num, 1) / 2), pyy + ny - 3, 1, WHITE);
  }
}

// ---------- layout ----------
function drawPage(): void {
  fillRect(0, 0, W, H, PAPER);
  // top banner
  fillRect(0, 0, W, 22, NAVY);
  drawText("THE WORLD IN ONE DAY", 10, 7, 1, WHITE);
  drawTextRight("WEDNESDAY 25 NOVEMBER 2026", W - 10, 7, 1, YELLOW);
  // masthead
  drawTextCentered("WEDNESDAY 25 NOVEMBER 2026", W / 2, 26, 5, INK);
  // ticker
  drawTextCentered(
    "SHENZHOU-24 CARRIES PAKISTAN'S FIRST ASTRONAUT · CHINA PROBES POLITBURO MEMBER · HUAWEI GUILTY IN US TRIAL",
    W / 2,
    70,
    1,
    RED,
  );
  hline(8, 82, W - 16, INK);
  // stats line (region counts computed from the data, never hand-counted)
  const allRegions: Region[] = [LEAD.region, ...GRID.map((g) => g.region), ...ALSO.map((a) => a.region)];
  const counts: Record<string, number> = {};
  for (const r of allRegions) counts[r] = (counts[r] || 0) + 1;
  const statsLine =
    `${allRegions.length} STORIES · ALL FROM WEDNESDAY 25 NOV · ` +
    `EUROPE ${counts["EUROPE"]} · MIDDLE EAST ${counts["MIDDLE EAST"]} · ASIA ${counts["ASIA"]} · ` +
    `AFRICA ${counts["AFRICA"]} · AMERICAS ${counts["AMERICAS"]}`;
  drawTextCentered(statsLine, W / 2, 88, 1, INK);
  hline(8, 100, W - 16, INK);
  // stat strip: 6 boxes
  const boxW = Math.floor((W - 16 - 5 * 6) / 6);
  for (let i = 0; i < STATS.length; i++) {
    const bx = 8 + i * (boxW + 6);
    rectBorder(bx, 104, boxW, 42, INK);
    drawTextCentered(STATS[i][0], bx + boxW / 2, 108, 2, RED);
    const capLines = wrapText(STATS[i][1], 1, boxW - 8);
    drawTextCentered(capLines[0], bx + boxW / 2, 126, 1, INK);
    if (capLines[1]) drawTextCentered(capLines[1], bx + boxW / 2, 135, 1, INK);
  }
  // lead story
  const leadY = 150;
  drawScene(LEAD.scene, 8, leadY, 322, 136);
  rectBorder(8, leadY, 322, 136, INK);
  fillRect(8, leadY, 78, 13, RED);
  drawText("TOP STORY", 12, leadY + 3, 1, WHITE);
  fillRect(330 - 62, leadY, 62, 13, NAVY);
  drawText("00:18 UTC", 334, leadY + 3, 1, WHITE);
  numBadge(1, 8 + 322 - 14, leadY + 136 - 14);
  const tx = 342;
  drawText(`${LEAD.n} ${LEAD.city} · ${LEAD.region}`, tx, leadY + 2, 1, RED);
  const headLines = wrapText(LEAD.headline, 3, W - 8 - tx);
  let hy = leadY + 14;
  for (const ln of headLines) {
    drawText(ln, tx, hy, 3, INK);
    hy += 21;
  }
  const deckLines = wrapText(LEAD.deck, 1, W - 8 - tx);
  let dy = hy + 6;
  for (const ln of deckLines) {
    drawText(ln, tx, dy, 1, INK);
    dy += 9;
  }
  drawText(`(${LEAD.source})`, tx, dy + 2, 1, GREY);
  // grid: 4 columns x 2 rows, stories 2-9
  const cellW = 248;
  const cellH = 146;
  const gap = 5;
  for (let i = 0; i < GRID.length; i++) {
    const s = GRID[i];
    const col = i % 4;
    const row = Math.floor(i / 4);
    const cx = 8 + col * (cellW + gap);
    const cy = 290 + row * (cellH + gap);
    rectBorder(cx, cy, cellW, cellH, INK);
    drawScene(s.scene, cx + 1, cy + 1, cellW - 2, 56);
    numBadge(s.n, cx + 14, cy + 14);
    drawText(`${s.city} · ${s.region}`, cx + 6, cy + 62, 1, RED);
    const hLines = wrapText(s.headline, 2, cellW - 12);
    let yy = cy + 73;
    for (const ln of hLines.slice(0, 2)) {
      drawText(ln, cx + 6, yy, 2, INK);
      yy += 14;
    }
    const dLines = wrapText(s.deck, 1, cellW - 12);
    for (const ln of dLines.slice(0, 3)) {
      drawText(ln, cx + 6, yy + 2, 1, INK);
      yy += 9;
    }
    drawTextRight(`(${s.source})`, cx + cellW - 6, cy + cellH - 10, 1, GREY);
  }
  // bottom section
  const botY = 590;
  drawText("WHERE IT HAPPENED", 8, botY, 1, INK);
  drawText("PINS MATCH STORY NUMBERS", 8, botY + 10, 1, GREY);
  drawMap();
  const legendRows = ["1 JIUQUAN  2 BEIJING  3 NEW YORK", "4 WASHINGTON  5 SANTA CLARA  6 RIYADH", "7 KYIV  8 MADRID  9 LANGLEY"];
  let ly = MAP_Y + MAP_H + 12;
  for (const row of legendRows) {
    drawText(row, 8, ly, 1, INK);
    ly += 10;
  }
  // also list
  const listX = 314;
  const listW = W - 8 - listX;
  drawText("ALSO ON WEDNESDAY 25 NOVEMBER — 31 MORE STORIES", listX, botY, 1, INK);
  hline(listX, botY + 10, listW, INK);
  const colW = Math.floor((listW - 16) / 2);
  const leftItems = ALSO.slice(0, 16);
  const rightItems = ALSO.slice(16);
  const rowH = 20;
  const drawAlsoCol = (items: Also[], x0: number): void => {
    let y = botY + 18;
    for (const it of items) {
      const num = String(it.n);
      drawText(num, x0, y, 1, RED);
      const textX = x0 + (num.length >= 2 ? 14 : 9);
      const avail = colW - (textX - x0) - textWidth(it.source, 1) - 8;
      const lines = wrapText(it.text, 1, avail);
      drawText(lines[0], textX, y, 1, INK);
      if (lines[1]) drawText(lines[1], textX, y + 9, 1, INK);
      drawTextRight(it.source, x0 + colW, y, 1, GREY);
      y += rowH;
    }
  };
  drawAlsoCol(leftItems, listX);
  drawAlsoCol(rightItems, listX + colW + 16);
  // date check
  const dcY = 946;
  rectBorder(8, dcY, W - 16, 44, RED);
  drawText("DATE CHECK", 14, dcY + 4, 1, RED);
  const dcLines = wrapText(
    "LEFT OUT BECAUSE THEY WERE NOT THIS DAY'S NEWS: MON 23 NOV — NVIDIA REINSTATES HUANG; COP31 ENDS WITH NO DEAL; UKRAINE SINKS RUSSIAN WARSHIP OFF LIBYA. TUE 24 NOV — HORMUZ TANKERS HIT MINES; SANOFI BUYS INSMED FOR $41BN; GAZA STRIKE KILLS HAMAS SECURITY CHIEF.",
    1,
    W - 32,
  );
  let dcy = dcY + 15;
  for (const ln of dcLines.slice(0, 3)) {
    drawText(ln, 14, dcy, 1, INK);
    dcy += 9;
  }
  // sources footer
  drawTextCentered("SOURCES: REUTERS, AP, BBC, AL JAZEERA, XINHUA, DW, COINDESK, USGS.", W / 2, 996, 1, GREY);
  drawTextCentered(
    "EVERY STORY HERE HAPPENED OR WAS FIRST REPORTED ON WEDNESDAY 25 NOVEMBER 2026.",
    W / 2,
    1008,
    1,
    GREY,
  );
}

// ---------- main ----------
drawPage();
const outDir = process.env.MAKEFUN_OUTPUT_DIR || "/output";
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "entry.png"), encodePNG());
