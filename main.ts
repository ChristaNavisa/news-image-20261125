// The World Today — 25 November 2026 in one image.
// make.fun bounty: news-image-20261125
// Broadsheet: masthead + date, six dated stories from the 25 Nov 2026
// morning news cycle, each with a drawn scene + short label, footer map
// with a date check. Node 22, standard library only. The program writes
// /output/entry.png (or $MAKEFUN_OUTPUT_DIR/entry.png), 1024x1024,
// and runs twice byte-identical.

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { deflateSync } from "node:zlib";

// ---------------------------------------------------------------- PNG out
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

function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td), 0);
  return Buffer.concat([len, td, crc]);
}

function encodePng(w: number, h: number, rgb: Uint8Array): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const raw = Buffer.alloc(h * (1 + w * 3));
  for (let y = 0; y < h; y++) {
    raw[y * (1 + w * 3)] = 0; // filter none
    raw.set(rgb.subarray(y * w * 3, (y + 1) * w * 3), y * (1 + w * 3) + 1);
  }
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ------------------------------------------------------------- 5x7 font
// Each glyph: 7 rows, 5 bits each (bit 4 = leftmost pixel). Uppercase only;
// lowercase input is folded to uppercase. ASCII text only.
type Glyph = [number, number, number, number, number, number, number];
const FONT: Record<string, Glyph> = {
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
  ":": [0, 0x0c, 0x0c, 0, 0x0c, 0x0c, 0],
  ";": [0, 0x0c, 0x0c, 0, 0x0c, 0x04, 0x08],
  "!": [0x04, 0x04, 0x04, 0x04, 0x04, 0, 0x04],
  "?": [0x0e, 0x11, 0x01, 0x06, 0x04, 0, 0x04],
  "'": [0x04, 0x04, 0x08, 0, 0, 0, 0],
  '"': [0x0a, 0x0a, 0, 0, 0, 0, 0],
  "-": [0, 0, 0, 0x0e, 0, 0, 0],
  "(": [0x02, 0x04, 0x08, 0x08, 0x08, 0x04, 0x02],
  ")": [0x08, 0x04, 0x02, 0x02, 0x02, 0x04, 0x08],
  "/": [0x01, 0x02, 0x02, 0x04, 0x08, 0x08, 0x10],
  "&": [0x0c, 0x12, 0x14, 0x08, 0x15, 0x12, 0x0d],
  "%": [0x19, 0x1a, 0x02, 0x04, 0x08, 0x0b, 0x13],
  "+": [0, 0x04, 0x04, 0x0e, 0x04, 0x04, 0],
  "=": [0, 0, 0x1f, 0, 0x1f, 0, 0],
  $: [0x04, 0x0f, 0x14, 0x0e, 0x05, 0x1e, 0x04],
  "#": [0x0a, 0x0a, 0x1f, 0x0a, 0x1f, 0x0a, 0x0a],
  "*": [0, 0x04, 0x15, 0x0e, 0x15, 0x04, 0],
  "@": [0x0e, 0x11, 0x17, 0x15, 0x16, 0x10, 0x0e],
  _: [0, 0, 0, 0, 0, 0, 0x1f],
  "[": [0x0e, 0x08, 0x08, 0x08, 0x08, 0x08, 0x0e],
  "]": [0x0e, 0x02, 0x02, 0x02, 0x02, 0x02, 0x0e],
};

// ------------------------------------------------------------ canvas
const W = 1024;
const H = 1024;
const PAPER: [number, number, number] = [247, 243, 232];
const INK: [number, number, number] = [20, 20, 20];
const WHITE: [number, number, number] = [255, 255, 255];
const SKY: [number, number, number] = [188, 216, 240];
const SEA: [number, number, number] = [43, 108, 176];
const DUSK: [number, number, number] = [242, 216, 160];
const NAVY: [number, number, number] = [31, 42, 68];
const FIRE: [number, number, number] = [232, 134, 46];
const GOLD: [number, number, number] = [242, 194, 48];
const GREEN: [number, number, number] = [63, 125, 68];
const RED: [number, number, number] = [179, 55, 47];
const GRAY: [number, number, number] = [138, 138, 138];
const TAN: [number, number, number] = [217, 179, 128];
const DARKRED: [number, number, number] = [122, 42, 34];
const LIGHT: [number, number, number] = [230, 230, 225];

type RGB = [number, number, number];

class Canvas {
  buf: Uint8Array;
  constructor() {
    this.buf = new Uint8Array(W * H * 3);
    this.fillRect(0, 0, W, H, PAPER);
  }
  set(x: number, y: number, c: RGB): void {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const i = (y * W + x) * 3;
    this.buf[i] = c[0];
    this.buf[i + 1] = c[1];
    this.buf[i + 2] = c[2];
  }
  fillRect(x: number, y: number, w: number, h: number, c: RGB): void {
    for (let yy = Math.max(0, y); yy < Math.min(H, y + h); yy++) {
      for (let xx = Math.max(0, x); xx < Math.min(W, x + w); xx++) this.set(xx, yy, c);
    }
  }
  rect(x: number, y: number, w: number, h: number, c: RGB, t = 1): void {
    this.fillRect(x, y, w, t, c);
    this.fillRect(x, y + h - t, w, t, c);
    this.fillRect(x, y, t, h, c);
    this.fillRect(x + w - t, y, t, h, c);
  }
  line(x0: number, y0: number, x1: number, y1: number, c: RGB): void {
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    let x = x0;
    let y = y0;
    for (;;) {
      this.set(x, y, c);
      if (x === x1 && y === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y += sy;
      }
    }
  }
  circle(cx: number, cy: number, r: number, c: RGB): void {
    for (let y = -r; y <= r; y++) {
      const span = Math.floor(Math.sqrt(r * r - y * y));
      for (let x = -span; x <= span; x++) this.set(cx + x, cy + y, c);
    }
  }
  ring(cx: number, cy: number, r: number, c: RGB): void {
    for (let a = 0; a < 360; a += 2) {
      const rad = (a * Math.PI) / 180;
      this.set(Math.round(cx + r * Math.cos(rad)), Math.round(cy + r * Math.sin(rad)), c);
    }
  }
  tri(x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, c: RGB): void {
    const minY = Math.min(y0, y1, y2);
    const maxY = Math.max(y0, y1, y2);
    for (let y = minY; y <= maxY; y++) {
      const xs: number[] = [];
      const edges: [number, number, number, number][] = [
        [x0, y0, x1, y1],
        [x1, y1, x2, y2],
        [x2, y2, x0, y0],
      ];
      for (const [ax, ay, bx, by] of edges) {
        if ((ay <= y && by > y) || (by <= y && ay > y)) {
          xs.push(Math.round(ax + ((y - ay) * (bx - ax)) / (by - ay)));
        }
      }
      if (xs.length >= 2) {
        const lo = Math.min(...xs);
        const hi = Math.max(...xs);
        for (let x = lo; x <= hi; x++) this.set(x, y, c);
      }
    }
  }
  ellipse(cx: number, cy: number, rx: number, ry: number, c: RGB): void {
    for (let y = -ry; y <= ry; y++) {
      const span = Math.floor(rx * Math.sqrt(1 - (y * y) / (ry * ry)));
      for (let x = -span; x <= span; x++) this.set(cx + x, cy + y, c);
    }
  }
  text(x: number, y: number, s: string, scale: number, c: RGB): number {
    let cx = x;
    const up = s.toUpperCase();
    for (const ch of up) {
      const g = FONT[ch] ?? FONT["?"];
      for (let row = 0; row < 7; row++) {
        for (let col = 0; col < 5; col++) {
          if ((g[row] >> (4 - col)) & 1) {
            this.fillRect(cx + col * scale, y + row * scale, scale, scale, c);
          }
        }
      }
      cx += 6 * scale;
    }
    return cx - x - scale; // width actually drawn
  }
  textWidth(s: string, scale: number): number {
    return s.length * 6 * scale - scale;
  }
  textCentered(y: number, s: string, scale: number, c: RGB): void {
    const w = this.textWidth(s, scale);
    this.text(Math.round((W - w) / 2), y, s, scale, c);
  }
}

function wrap(text: string, maxChars: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if (cur === "") {
      cur = w;
    } else if (cur.length + 1 + w.length <= maxChars) {
      cur += " " + w;
    } else {
      lines.push(cur);
      cur = w;
    }
  }
  if (cur !== "") lines.push(cur);
  return lines;
}

// ------------------------------------------------------------- scenes
// Each scene draws inside (sx, sy, 476 x 128). All scenes are simple
// flat shapes: a picture editor can tell the story from the shapes.
function sceneShip(cv: Canvas, sx: number, sy: number): void {
  cv.fillRect(sx, sy, 476, 128, SKY);
  cv.fillRect(sx, sy + 74, 476, 54, SEA);
  cv.fillRect(sx, sy + 78, 476, 2, WHITE);
  cv.fillRect(sx, sy + 96, 476, 2, WHITE);
  cv.fillRect(sx, sy + 114, 476, 2, WHITE);
  // cargo ship Sparta II: hull, funnel, mast
  cv.fillRect(sx + 120, sy + 82, 220, 26, NAVY);
  cv.tri(sx + 120, sy + 82, sx + 150, sy + 82, sx + 120, sy + 108, NAVY);
  cv.fillRect(sx + 300, sy + 62, 20, 22, DARKRED);
  cv.fillRect(sx + 300, sy + 58, 20, 4, INK);
  cv.line(sx + 180, sy + 82, sx + 180, sy + 52, INK);
  cv.line(sx + 181, sy + 82, sx + 181, sy + 52, INK);
  cv.tri(sx + 180, sy + 52, sx + 196, sy + 57, sx + 180, sy + 62, RED);
  cv.fillRect(sx + 140, sy + 88, 180, 4, GOLD);
  // drone above the ship
  cv.fillRect(sx + 380, sy + 24, 18, 3, INK);
  cv.fillRect(sx + 387, sy + 18, 3, 15, INK);
  // blast star over the funnel
  const bx = sx + 330;
  const by = sy + 42;
  for (let a = 0; a < 8; a++) {
    const r1 = (a * Math.PI) / 4;
    const r2 = r1 + Math.PI / 8;
    cv.tri(
      bx, by,
      Math.round(bx + 22 * Math.cos(r1)), Math.round(by + 22 * Math.sin(r1)),
      Math.round(bx + 8 * Math.cos(r2)), Math.round(by + 8 * Math.sin(r2)),
      FIRE,
    );
  }
  cv.circle(bx, by, 9, GOLD);
  cv.circle(sx + 352, sy + 30, 8, GRAY);
  cv.circle(sx + 364, sy + 22, 6, GRAY);
}

function sceneTower(cv: Canvas, sx: number, sy: number): void {
  cv.fillRect(sx, sy, 476, 128, DUSK);
  cv.fillRect(sx, sy + 108, 476, 20, NAVY);
  // PIF tower: tall slab with lit windows
  cv.fillRect(sx + 190, sy + 8, 72, 100, NAVY);
  for (let r = 0; r < 8; r++) {
    for (let col = 0; col < 4; col++) {
      cv.fillRect(sx + 198 + col * 16, sy + 16 + r * 11, 8, 5, GOLD);
    }
  }
  cv.fillRect(sx + 290, sy + 44, 52, 64, INK);
  for (let r = 0; r < 5; r++) {
    for (let col = 0; col < 3; col++) {
      cv.fillRect(sx + 296 + col * 15, sy + 50 + r * 11, 8, 5, GOLD);
    }
  }
  // smoke drifting from the tower top
  cv.circle(sx + 250, sy + 10, 10, GRAY);
  cv.circle(sx + 272, sy + 4, 8, GRAY);
  cv.circle(sx + 292, sy + 12, 7, LIGHT);
  // drone
  cv.fillRect(sx + 400, sy + 20, 18, 3, INK);
  cv.fillRect(sx + 407, sy + 14, 3, 15, INK);
  cv.fillRect(sx, sy + 104, 476, 4, INK);
}

function sceneCyber(cv: Canvas, sx: number, sy: number): void {
  cv.fillRect(sx, sy, 476, 128, NAVY);
  // server racks left and right
  for (const rx of [sx + 24, sx + 96, sx + 356, sx + 428]) {
    cv.fillRect(rx, sy + 18, 52, 92, INK);
    for (let r = 0; r < 6; r++) {
      cv.fillRect(rx + 6, sy + 24 + r * 14, 40, 8, [52, 66, 96]);
      cv.fillRect(rx + 8, sy + 26 + r * 14, 6, 4, r % 2 ? GOLD : GREEN);
      cv.fillRect(rx + 38, sy + 26 + r * 14, 6, 4, RED);
    }
  }
  // padlock in the middle, cracked
  cv.ring(sx + 238, sy + 44, 22, GOLD);
  cv.fillRect(sx + 210, sy + 44, 56, 46, GOLD);
  cv.fillRect(sx + 232, sy + 58, 12, 18, NAVY);
  cv.circle(sx + 238, sy + 56, 6, NAVY);
  cv.line(sx + 214, sy + 48, sx + 232, sy + 66, WHITE);
  cv.line(sx + 232, sy + 66, sx + 226, sy + 86, WHITE);
  cv.line(sx + 244, sy + 52, sx + 258, sy + 70, WHITE);
  cv.fillRect(sx + 170, sy + 100, 136, 4, RED);
}

function sceneAwacs(cv: Canvas, sx: number, sy: number): void {
  cv.fillRect(sx, sy, 476, 128, SKY);
  cv.fillRect(sx, sy + 104, 476, 24, GREEN);
  // radar arcs over Poland
  cv.ring(sx + 84, sy + 104, 26, GRAY);
  cv.ring(sx + 84, sy + 104, 46, GRAY);
  cv.ring(sx + 84, sy + 104, 66, GRAY);
  cv.circle(sx + 84, sy + 104, 5, RED);
  // AWACS plane: fuselage, nose, tail, wing, radar disc
  cv.fillRect(sx + 190, sy + 52, 170, 14, WHITE);
  cv.tri(sx + 360, sy + 52, sx + 392, sy + 59, sx + 360, sy + 66, WHITE);
  cv.tri(sx + 190, sy + 52, sx + 190, sy + 34, sx + 214, sy + 52, WHITE);
  cv.tri(sx + 250, sy + 66, sx + 290, sy + 66, sx + 270, sy + 88, WHITE);
  cv.fillRect(sx + 258, sy + 34, 6, 18, INK);
  cv.ellipse(sx + 272, sy + 30, 26, 7, INK);
  for (const wx of [220, 240, 300, 320]) cv.fillRect(sx + wx, sy + 56, 8, 5, NAVY);
  cv.fillRect(sx + 150, sy + 108, 10, 8, INK);
  cv.tri(sx + 140, sy + 108, sx + 170, sy + 108, sx + 155, sy + 92, GREEN);
}

function sceneTanker(cv: Canvas, sx: number, sy: number): void {
  cv.fillRect(sx, sy, 476, 128, SKY);
  cv.circle(sx + 420, sy + 24, 18, GOLD);
  cv.fillRect(sx, sy + 78, 476, 50, SEA);
  cv.fillRect(sx, sy + 84, 476, 2, WHITE);
  cv.fillRect(sx, sy + 102, 476, 2, WHITE);
  // tanker hull and bridge
  cv.fillRect(sx + 70, sy + 86, 300, 24, DARKRED);
  cv.fillRect(sx + 70, sy + 86, 300, 4, WHITE);
  cv.fillRect(sx + 330, sy + 52, 36, 36, INK);
  cv.fillRect(sx + 336, sy + 58, 24, 5, GOLD);
  cv.fillRect(sx + 336, sy + 68, 24, 5, GOLD);
  // fire on the deck
  cv.tri(sx + 130, sy + 86, sx + 150, sy + 44, sx + 170, sy + 86, FIRE);
  cv.tri(sx + 150, sy + 86, sx + 168, sy + 56, sx + 186, sy + 86, GOLD);
  cv.tri(sx + 148, sy + 86, sx + 160, sy + 58, sx + 172, sy + 86, RED);
  cv.circle(sx + 150, sy + 34, 9, GRAY);
  cv.circle(sx + 168, sy + 24, 7, GRAY);
  // naval mine in the water
  cv.circle(sx + 420, sy + 108, 10, INK);
  for (let a = 0; a < 8; a++) {
    const r = (a * Math.PI) / 4;
    cv.line(
      Math.round(sx + 420 + 8 * Math.cos(r)), Math.round(sy + 108 + 8 * Math.sin(r)),
      Math.round(sx + 420 + 15 * Math.cos(r)), Math.round(sy + 108 + 15 * Math.sin(r)),
      INK,
    );
  }
}

function sceneCricket(cv: Canvas, sx: number, sy: number): void {
  cv.fillRect(sx, sy, 476, 128, GREEN);
  cv.fillRect(sx, sy + 104, 476, 24, [43, 92, 48]);
  // pitch strip
  cv.fillRect(sx + 200, sy + 8, 76, 112, TAN);
  cv.fillRect(sx + 200, sy + 8, 76, 3, WHITE);
  cv.fillRect(sx + 200, sy + 117, 76, 3, WHITE);
  // stumps
  for (const dx of [0, 8, 16]) {
    cv.fillRect(sx + 228 + dx, sy + 92, 5, 24, WHITE);
  }
  cv.fillRect(sx + 228, sy + 88, 21, 3, GOLD);
  // bat and ball
  for (let o = -1; o <= 1; o++) {
    cv.line(sx + 300 + o, sy + 44, sx + 330 + o, sy + 84, [122, 82, 40]);
  }
  cv.fillRect(sx + 296, sy + 38, 10, 10, [122, 82, 40]);
  cv.circle(sx + 356, sy + 34, 9, RED);
  cv.line(sx + 366, sy + 30, sx + 386, sy + 26, WHITE);
  cv.line(sx + 368, sy + 40, sx + 388, sy + 40, WHITE);
  // scoreboard strip, bottom left on the green, clear of the date tag
  cv.fillRect(sx + 16, sy + 96, 132, 22, INK);
  cv.text(sx + 24, sy + 101, "ENG 185-2", 1, WHITE);
  cv.fillRect(sx + 16, sy + 92, 132, 4, GOLD);
}

// ------------------------------------------------------------- layout
interface Story {
  scene: (cv: Canvas, sx: number, sy: number) => void;
  head: string;
  cap: string;
}

const STORIES: Story[] = [
  {
    scene: sceneShip,
    head: "KYIV OWNS THE GULF STRIKE",
    cap: "ZELENSKIY: SPARTA II CARRIED ARMS. NORWAY URGES CAUTION",
  },
  {
    scene: sceneTower,
    head: "TOWER HIT AGAIN IN RIYADH",
    cap: "HOUTHI DRONE WOUNDS 11 IN FINANCIAL DISTRICT",
  },
  {
    scene: sceneCyber,
    head: "SPIES HACKED: CIA BREACH",
    cap: "UNCLASSIFIED DATA TAKEN; CLASSIFIED SYSTEMS SAFE",
  },
  {
    scene: sceneAwacs,
    head: "NATO EYES OVER POLAND",
    cap: "AWACS SENT AFTER MISSILES FELL IN POLAND",
  },
  {
    scene: sceneTanker,
    head: "MINES IN THE STRAIT",
    cap: "TANKERS ABLAZE OFF HORMUZ; OIL JUMPS TO $91",
  },
  {
    scene: sceneCricket,
    head: "ENGLAND LEVEL THE SERIES",
    cap: "EIGHT-WICKET WIN CHASES 185 VS AUSTRALIA",
  },
];

function drawPanel(cv: Canvas, px: number, py: number, s: Story): void {
  cv.rect(px, py, 488, 252, INK, 2);
  cv.fillRect(px + 2, py + 2, 484, 248, WHITE);
  s.scene(cv, px + 6, py + 6);
  // date tag over the scene, top left
  cv.fillRect(px + 6, py + 6, 84, 22, INK);
  cv.text(px + 12, py + 10, "25 NOV", 2, WHITE);
  const headLines = wrap(s.head, 26);
  let hy = py + 142;
  for (const ln of headLines.slice(0, 2)) {
    cv.text(px + 10, hy, ln, 3, INK);
    hy += 24;
  }
  const capLines = wrap(s.cap, 39);
  let cy = py + 194;
  for (const ln of capLines.slice(0, 2)) {
    cv.text(px + 10, cy, ln, 2, INK);
    cy += 17;
  }
}

function drawMap(cv: Canvas, x: number, y: number, w: number, h: number): void {
  cv.fillRect(x, y, w, h, SKY);
  cv.rect(x, y, w, h, INK, 2);
  // rough continents as blobs
  cv.ellipse(x + 70, y + 22, 42, 14, NAVY); // North America
  cv.ellipse(x + 105, y + 48, 16, 12, NAVY); // South America
  cv.ellipse(x + 265, y + 18, 14, 9, NAVY); // Europe
  cv.ellipse(x + 278, y + 42, 18, 15, NAVY); // Africa
  cv.ellipse(x + 360, y + 22, 62, 15, NAVY); // Asia
  cv.ellipse(x + 452, y + 52, 16, 8, NAVY); // Australia
  // story dots: Gulf of Finland, Riyadh, Washington, Poland, Hormuz, London
  const dots: [number, number][] = [
    [272, 14], [308, 36], [62, 26], [268, 20], [322, 34], [258, 16],
  ];
  for (const [dx, dy] of dots) cv.circle(x + dx, y + dy, 4, RED);
}

function main(): void {
  const cv = new Canvas();
  // masthead
  cv.textCentered(24, "THE WORLD TODAY", 6, INK);
  cv.fillRect(18, 80, 988, 3, INK);
  cv.textCentered(90, "WEDNESDAY, 25 NOVEMBER 2026", 2, INK);
  cv.textCentered(112, "SIX STORIES FROM AROUND THE WORLD - ALL TIMES UTC", 2, INK);
  cv.fillRect(18, 134, 988, 3, INK);
  // six panels: 2 columns x 3 rows
  const cols = [18, 518];
  const rows = [144, 408, 672];
  for (let i = 0; i < 6; i++) {
    drawPanel(cv, cols[i % 2], rows[Math.floor(i / 2)], STORIES[i]);
  }
  // footer: map + date check
  cv.fillRect(18, 934, 988, 2, INK);
  drawMap(cv, 18, 942, 540, 64);
  cv.text(580, 946, "CHECKED 25 NOV 2026", 2, INK);
  cv.text(580, 966, "DAY 329 OF 2026", 2, INK);
  cv.text(580, 986, "ALL TIMES UTC", 2, INK);
  cv.text(830, 946, "SIX STORIES", 2, INK);
  cv.text(830, 966, "ONE DAY", 2, INK);
  cv.text(830, 986, "25 NOV 2026", 2, INK);

  const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
  mkdirSync(outDir, { recursive: true });
  const png = encodePng(W, H, cv.buf);
  writeFileSync(join(outDir, "entry.png"), png);
}

main();
