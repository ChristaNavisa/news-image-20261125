// The World in One Day — Gambar Berita 25 Nov 2026 (news-image-20261125) r3.
// A one-page newspaper front page for Wednesday, 25 November 2026.
// 52 dated stories: Shenzhou-24 lead hero, 8 panels, world map with 9 pins,
// full story list, stat strip. STDLIB ONLY: own PNG encoder + 5x7 bitmap font.
// Deterministic: no Date, no randomness — byte-identical on every run.
import { mkdirSync, writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";

const W = 1024;
const H = 1024;
const OUT_DIR = process.env.MAKEFUN_OUTPUT_DIR || "/output";

// ---------------------------------------------------------------- palette ---
const PAPER: [number, number, number] = [247, 243, 232];
const INK: [number, number, number] = [17, 17, 17];
const RED: [number, number, number] = [176, 30, 30];
const SEA: [number, number, number] = [29, 78, 137];
const NAVY: [number, number, number] = [20, 36, 62];
const TAN: [number, number, number] = [216, 201, 163];
const WHITE: [number, number, number] = [255, 255, 255];
const EARTH: [number, number, number] = [46, 107, 170];
const FLAME1: [number, number, number] = [232, 120, 40];
const FLAME2: [number, number, number] = [240, 200, 60];

// ------------------------------------------------------- 5x7 bitmap font ---
// Each glyph: 7 rows, 5 bits per row, MSB = leftmost pixel. Caps-only rendering:
// lowercase input is uppercased first, so one table covers both cases.
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
  ":": [0, 0x0c, 0x0c, 0, 0x0c, 0x0c, 0],
  ";": [0, 0x0c, 0x0c, 0, 0x0c, 0x04, 0x08],
  "!": [0x04, 0x04, 0x04, 0x04, 0x04, 0, 0x04],
  "?": [0x0e, 0x11, 0x01, 0x02, 0x04, 0, 0x04],
  "'": [0x04, 0x04, 0x08, 0, 0, 0, 0],
  '"': [0x0a, 0x0a, 0x0a, 0, 0, 0, 0],
  "-": [0, 0, 0, 0x1f, 0, 0, 0],
  "(": [0x02, 0x04, 0x08, 0x08, 0x08, 0x04, 0x02],
  ")": [0x08, 0x04, 0x02, 0x02, 0x02, 0x04, 0x08],
  "/": [0x01, 0x01, 0x02, 0x04, 0x08, 0x10, 0x10],
  "%": [0x19, 0x19, 0x02, 0x04, 0x08, 0x13, 0x13],
  "+": [0, 0x04, 0x04, 0x1f, 0x04, 0x04, 0],
  "&": [0x0c, 0x12, 0x14, 0x08, 0x15, 0x12, 0x0d],
  $: [0x04, 0x0f, 0x14, 0x0e, 0x05, 0x1e, 0x04],
  "#": [0x0a, 0x0a, 0x1f, 0x0a, 0x1f, 0x0a, 0x0a],
  "*": [0, 0x04, 0x15, 0x0e, 0x15, 0x04, 0],
  "=": [0, 0, 0x1f, 0, 0x1f, 0, 0],
  _: [0, 0, 0, 0, 0, 0, 0x1f],
  "[": [0x0e, 0x08, 0x08, 0x08, 0x08, 0x08, 0x0e],
  "]": [0x0e, 0x02, 0x02, 0x02, 0x02, 0x02, 0x0e],
  "<": [0x02, 0x04, 0x08, 0x10, 0x08, 0x04, 0x02],
  ">": [0x08, 0x04, 0x02, 0x01, 0x02, 0x04, 0x08],
  "|": [0x04, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04],
  "@": [0x0e, 0x11, 0x17, 0x15, 0x16, 0x10, 0x0e],
};

// ------------------------------------------------------------ framebuffer ---
const fb = new Uint8Array(W * H * 3);
function fill(c: [number, number, number]): void {
  for (let i = 0; i < W * H; i++) {
    fb[i * 3] = c[0];
    fb[i * 3 + 1] = c[1];
    fb[i * 3 + 2] = c[2];
  }
}
function setPx(x: number, y: number, c: [number, number, number]): void {
  if (x < 0 || x >= W || y < 0 || y >= H) return;
  const i = (y * W + x) * 3;
  fb[i] = c[0];
  fb[i + 1] = c[1];
  fb[i + 2] = c[2];
}
function rect(x: number, y: number, w: number, h: number, c: [number, number, number]): void {
  for (let yy = y; yy < y + h; yy++) {
    for (let xx = x; xx < x + w; xx++) setPx(xx, yy, c);
  }
}
function circle(cx: number, cy: number, r: number, c: [number, number, number]): void {
  for (let yy = cy - r; yy <= cy + r; yy++) {
    for (let xx = cx - r; xx <= cx + r; xx++) {
      const dx = xx - cx;
      const dy = yy - cy;
      if (dx * dx + dy * dy <= r * r) setPx(xx, yy, c);
    }
  }
}
function tri(x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, c: [number, number, number]): void {
  const minX = Math.max(0, Math.min(x0, x1, x2));
  const maxX = Math.min(W - 1, Math.max(x0, x1, x2));
  const minY = Math.max(0, Math.min(y0, y1, y2));
  const maxY = Math.min(H - 1, Math.max(y0, y1, y2));
  const d = (x1 - x0) * (y2 - y0) - (y1 - y0) * (x2 - x0);
  if (d === 0) return;
  for (let yy = minY; yy <= maxY; yy++) {
    for (let xx = minX; xx <= maxX; xx++) {
      const a = ((x1 - xx) * (y2 - yy) - (y1 - yy) * (x2 - xx)) / d;
      const b = ((x2 - xx) * (y0 - yy) - (y2 - yy) * (x0 - xx)) / d;
      const cc = 1 - a - b;
      if (a >= 0 && b >= 0 && cc >= 0) setPx(xx, yy, c);
    }
  }
}
function border(x: number, y: number, w: number, h: number, c: [number, number, number]): void {
  rect(x, y, w, 1, c);
  rect(x, y + h - 1, w, 1, c);
  rect(x, y, 1, h, c);
  rect(x + w - 1, y, 1, h, c);
}

// ------------------------------------------------------------------- text ---
function norm(s: string): string {
  return s
    .replace(/[—–]/g, "-")
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .toUpperCase();
}
function drawChar(ch: string, x: number, y: number, s: number, c: [number, number, number]): void {
  const g = FONT[ch] || FONT[" "];
  for (let r = 0; r < 7; r++) {
    const bits = g[r];
    for (let col = 0; col < 5; col++) {
      if ((bits >> (4 - col)) & 1) rect(x + col * s, y + r * s, s, s, c);
    }
  }
}
function drawText(raw: string, x: number, y: number, s: number, c: [number, number, number]): void {
  const t = norm(raw);
  for (let i = 0; i < t.length; i++) drawChar(t[i], x + i * 6 * s, y, s, c);
}
function textW(raw: string, s: number): number {
  return norm(raw).length * 6 * s;
}
function drawCentered(raw: string, y: number, s: number, c: [number, number, number]): void {
  drawText(raw, Math.floor((W - textW(raw, s)) / 2), y, s, c);
}

// ------------------------------------------------------------- story data ---
// All 52 stories reported on Wednesday, 25 November 2026.
const STORIES: string[] = [
  "SHENZHOU-24 LAUNCHES 08:18 BEIJING",
  "FIRST PAKISTANI ASTRONAUT IN SPACE",
  "TWO TANKERS HIT BY MINES IN HORMUZ",
  "US JURY CONVICTS HUAWEI OF FRAUD",
  "HOUTHI STRIKE ON RIYADH TOWER: 11 HURT",
  "POPE LEO XIV: COP31 COLLAPSE TROUBLING",
  "CARTAGENA HOSTAGES FREED IN SIEGE",
  "NIKKEI -2.8% AS ASIAN TECH TUMBLES",
  "BANGLADESH RAISES GARMENT WAGE 36%",
  "SENEGAL AFCON TITLE RESTORED BY CAS",
  "HOUTHIS ATTACK RAS TANURA REFINERY",
  "ISRAEL KILLS HAMAS COL. IN GAZA",
  "RUSSIAN STRIKE KILLS 2 IN ODESA",
  "PUTIN: UKRAINE STILL HITS REFINERIES",
  "490,334 RUSSIAN SOLDIERS DEAD: BBC",
  "RSF DRONES KILL 19 IN BLUE NILE",
  "SOLOMONS-AUSTRALIA BASE TREATY SIGNED",
  "ZELENSKY: UKRAINE NEEDS EUR115BN",
  "US PAUSED PATRIOT SUPPLIES TO KYIV",
  "TWO LIBYAN OFFICERS DIE IN BENGHAZI",
  "EUROZONE INFLATION RISES TO 4.0%",
  "UKRAINE DRONES SINK WARSHIP IN LIBYA",
  "UN: FUNDING CUTS THREATEN AIDS FIGHT",
  "ABREGO GARCIA LEAVES US FOR SPAIN",
  "ROCHE BREAST CANCER DRUG GETS 2ND OK",
  "AUSTRALIAN INFLATION HITS 4.9%",
  "EASYJET PROFIT FALLS 89% ON FUEL",
  "AMAZON BUYS DECART TO RIVAL NVIDIA",
  "HACKERS' AI AGENTS BREACH UNIVERSITY",
  "ANTHROPIC SHARES FALL BELOW IPO PRICE",
  "TRUMP TO IMPOSE TARIFFS ON 16 STATES",
  "US WEIGHS TARGETING IRANIAN LEADERS",
  "OIL PRICES DOWN OVER 20% IN NOVEMBER",
  "NVIDIA SLIDES ON HUANG PROBE FEARS",
  "MINERS TRAPPED IN WEST JAVA GOLD MINE",
  "N. KOREA EXPELS SWISS DIPLOMAT",
  "UK WARNS FIRMS OF RUSSIAN SABOTAGE",
  "SAUDI-LED STRIKES HIT HODEIDAH PORT",
  "SIX DEAD IN MISSISSIPPI PLANE CRASH",
  "CHINA PROBES SHANGHAI PARTY CHIEF",
  "NASDAQ FUTURES SLIDE ON AI FEARS",
  "WORLD TRADE SURGES ON AI BOOST",
  "EU PLANS USD55BN QUANTUM TECH FUND",
  "BRENT CRUDE NEAR USD90 A BARREL",
  "COPPER SLUMPS AMID AI ROLLER COASTER",
  "US PCE DATA DUE; FED HIKE 96.4% PRICED",
  "GERMAN IFO SENTIMENT HITS 89.4",
  "ECB MAY RAISE RESERVE RULE TO 2%",
  "THANKSGIVING TOMORROW; US DATA RUSH",
  "DIMON IN JPMORGAN UK TAX ROW",
  "GILTS OUTPERFORM AS RISK-OFF GROWS",
  "SHENZHOU-24 DOCKS 11:56; CREW WELCOMED",
];
const PANELS: string[][] = [
  ["HORMUZ MINES HIT", "TWO TANKERS"],
  ["US JURY CONVICTS", "HUAWEI OF FRAUD"],
  ["HOUTHI STRIKE ON", "RIYADH TOWER"],
  ["POPE: COP31", "COLLAPSE TROUBLING"],
  ["CARTAGENA HOSTAGES", "FREED IN SIEGE"],
  ["NIKKEI -2.8% AS", "TECH TUMBLES"],
  ["GARMENT WAGE UP", "36% IN BANGLADESH"],
  ["SENEGAL AFCON", "TITLE RESTORED"],
];
// World map pins: [label-number, x, y]
const PINS: [number, number, number][] = [
  [1, 800, 442],
  [2, 655, 472],
  [3, 620, 486],
  [4, 585, 462],
  [5, 530, 436],
  [6, 520, 498],
  [7, 232, 496],
  [8, 845, 512],
  [9, 512, 448],
];

// ------------------------------------------------------------------ draw ---
fill(PAPER);
rect(0, 0, W, 4, INK);

// Masthead
drawCentered("THE WORLD IN ONE DAY", 10, 5, INK);
drawCentered("WEDNESDAY, 25 NOVEMBER 2026 - 52 STORIES", 50, 2, RED);
rect(12, 68, 1000, 3, RED);

// Lead hero: dark field, Shenzhou-24
rect(12, 76, 1000, 170, NAVY);
// stars
const STARS: [number, number][] = [
  [700, 92], [760, 110], [900, 96], [960, 130], [720, 150], [980, 180],
  [840, 88], [690, 200], [930, 210], [780, 220], [860, 140], [990, 100],
];
for (const [sx, sy] of STARS) rect(sx, sy, 3, 3, WHITE);
// Earth arc bottom-right
circle(985, 300, 120, EARTH);
circle(985, 300, 96, SEA);
// rocket: body, nose, fins, flame, window
rect(790, 120, 36, 96, WHITE);
tri(790, 120, 826, 120, 808, 92, RED);
tri(790, 216, 772, 238, 790, 206, RED);
tri(826, 216, 844, 238, 826, 206, RED);
tri(794, 216, 822, 216, 808, 246, FLAME1);
tri(800, 216, 816, 216, 808, 238, FLAME2);
circle(808, 150, 8, SEA);
rect(800, 176, 16, 3, INK);
drawText("SHENZHOU-24", 36, 90, 5, WHITE);
drawText("LIFTS OFF", 36, 136, 5, WHITE);
drawText("FIRST PAKISTANI ASTRONAUT", 36, 188, 2, WHITE);
drawText("REACHES TIANGONG", 36, 210, 2, WHITE);
drawText("DOCKS 11:56 BEIJING TIME", 36, 232, 2, [200, 210, 225]);

// Stat strip
const STATS = ["52 STORIES", "6 REGIONS", "9 MAP PINS", "25 NOV 2026"];
for (let i = 0; i < 4; i++) {
  const bx = 12 + i * 252;
  rect(bx, 252, 244, 3, RED);
  rect(bx, 255, 244, 27, WHITE);
  border(bx, 255, 244, 27, INK);
  drawText(STATS[i], bx + Math.floor((244 - textW(STATS[i], 2)) / 2), 262, 2, INK);
}

// 8 panels (stories 03-10)
for (let i = 0; i < 8; i++) {
  const col = i % 4;
  const row = Math.floor(i / 4);
  const px = 12 + col * 252;
  const py = 288 + row * 61;
  border(px, py, 244, 55, INK);
  drawText("0" + (i + 3), px + 8, py + 6, 2, RED);
  drawText(PANELS[i][0], px + 8, py + 24, 2, INK);
  drawText(PANELS[i][1], px + 8, py + 40, 2, INK);
}

// World map
rect(12, 410, 1000, 138, SEA);
drawText("THE WORLD - 9 PINS", 24, 418, 2, WHITE);
// blocky continents
rect(70, 422, 120, 40, TAN);
rect(60, 452, 90, 26, TAN);
rect(150, 432, 80, 30, TAN);
rect(215, 486, 52, 52, TAN);
rect(225, 470, 40, 20, TAN);
rect(478, 424, 58, 22, TAN);
rect(500, 440, 40, 16, TAN);
rect(480, 462, 66, 58, TAN);
rect(500, 516, 40, 18, TAN);
rect(560, 420, 300, 44, TAN);
rect(600, 460, 240, 40, TAN);
rect(700, 496, 120, 20, TAN);
rect(830, 512, 84, 26, TAN);
for (const [n, px, py] of PINS) {
  circle(px, py, 9, RED);
  drawText(String(n), px - 3, py - 3, 1, WHITE);
}
// key-pin labels on the land blocks, so the map reads without the legend
drawText("JIUQUAN", 814, 439, 1, INK);
drawText("HORMUZ", 668, 469, 1, INK);
drawText("RIYADH", 633, 483, 1, INK);
drawText("1 JIUQUAN  2 HORMUZ  3 RIYADH  4 GAZA  5 KYIV  6 BLUE NILE  7 CARTAGENA  8 W. JAVA  9 VATICAN", 260, 554, 1, INK);

// Full story list
drawText("ALL 52 STORIES - 25 NOVEMBER 2026", 12, 576, 2, INK);
rect(12, 596, 1000, 2, RED);
for (let i = 0; i < 52; i++) {
  const col = i < 26 ? 0 : 1;
  const row = i % 26;
  const lx = 12 + col * 512;
  const ly = 604 + row * 16;
  const num = i + 1 < 10 ? "0" + (i + 1) : String(i + 1);
  drawText(num, lx, ly, 2, RED);
  drawText(STORIES[i], lx + 30, ly, 2, INK);
}

// ------------------------------------------------------------ PNG encode ---
const CRC_TABLE: number[] = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  CRC_TABLE[n] = c >>> 0;
}
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
const raw = Buffer.alloc(H * (1 + W * 3));
for (let y = 0; y < H; y++) {
  raw[y * (1 + W * 3)] = 0;
  raw.set(fb.subarray(y * W * 3, (y + 1) * W * 3), y * (1 + W * 3) + 1);
}
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0);
ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 2; // color type RGB
ihdr[10] = 0;
ihdr[11] = 0;
ihdr[12] = 0;
const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk("IHDR", ihdr),
  chunk("IDAT", deflateSync(raw, { level: 9 })),
  chunk("IEND", Buffer.alloc(0)),
]);
if (png.length > 1048576) {
  throw new Error("entry.png too large: " + png.length + " bytes (max 1048576)");
}
mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(OUT_DIR + "/entry.png", png);
