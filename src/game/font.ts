// Tiny variable-width 5x7 bitmap font, drawn pixel-perfect on a low-res canvas.

const RAW: Record<string, string> = {
  A: ".###.|#...#|#...#|#####|#...#|#...#|#...#",
  B: "####.|#...#|#...#|####.|#...#|#...#|####.",
  C: ".####|#....|#....|#....|#....|#....|.####",
  D: "####.|#...#|#...#|#...#|#...#|#...#|####.",
  E: "#####|#....|#....|####.|#....|#....|#####",
  F: "#####|#....|#....|####.|#....|#....|#....",
  G: ".####|#....|#....|#..##|#...#|#...#|.####",
  H: "#...#|#...#|#...#|#####|#...#|#...#|#...#",
  I: "###|.#.|.#.|.#.|.#.|.#.|###",
  J: "..###|...#.|...#.|...#.|#..#.|#..#.|.##..",
  K: "#...#|#..#.|#.#..|##...|#.#..|#..#.|#...#",
  L: "#....|#....|#....|#....|#....|#....|#####",
  M: "#...#|##.##|#.#.#|#.#.#|#...#|#...#|#...#",
  N: "#...#|##..#|#.#.#|#..##|#...#|#...#|#...#",
  O: ".###.|#...#|#...#|#...#|#...#|#...#|.###.",
  P: "####.|#...#|#...#|####.|#....|#....|#....",
  Q: ".###.|#...#|#...#|#...#|#.#.#|#..#.|.##.#",
  R: "####.|#...#|#...#|####.|#.#..|#..#.|#...#",
  S: ".####|#....|#....|.###.|....#|....#|####.",
  T: "#####|..#..|..#..|..#..|..#..|..#..|..#..",
  U: "#...#|#...#|#...#|#...#|#...#|#...#|.###.",
  V: "#...#|#...#|#...#|#...#|#...#|.#.#.|..#..",
  W: "#...#|#...#|#...#|#.#.#|#.#.#|##.##|#...#",
  X: "#...#|#...#|.#.#.|..#..|.#.#.|#...#|#...#",
  Y: "#...#|#...#|.#.#.|..#..|..#..|..#..|..#..",
  Z: "#####|....#|...#.|..#..|.#...|#....|#####",
  "0": ".###.|#...#|#..##|#.#.#|##..#|#...#|.###.",
  "1": "..#..|.##..|..#..|..#..|..#..|..#..|.###.",
  "2": ".###.|#...#|....#|...#.|..#..|.#...|#####",
  "3": ".###.|#...#|....#|..##.|....#|#...#|.###.",
  "4": "...#.|..##.|.#.#.|#..#.|#####|...#.|...#.",
  "5": "#####|#....|####.|....#|....#|#...#|.###.",
  "6": ".###.|#....|#....|####.|#...#|#...#|.###.",
  "7": "#####|....#|...#.|..#..|.#...|.#...|.#...",
  "8": ".###.|#...#|#...#|.###.|#...#|#...#|.###.",
  "9": ".###.|#...#|#...#|.####|....#|....#|.###.",
  ".": ".|.|.|.|.|.|#",
  ",": "..|..|..|..|.#|.#|#.",
  "!": "#|#|#|#|#|.|#",
  "?": ".###.|#...#|....#|...#.|..#..|.....|..#..",
  ":": ".|.|#|.|.|#|.",
  "-": "...|...|...|###|...|...|...",
  "+": ".....|..#..|..#..|#####|..#..|..#..|.....",
  "/": "....#|....#|...#.|..#..|.#...|#....|#....",
  $: "..#..|.####|#.#..|.###.|..#.#|####.|..#..",
  "'": "#|#|.|.|.|.|.",
  "%": "##..#|##..#|...#.|..#..|.#...|#..##|#..##",
  "(": ".#|#.|#.|#.|#.|#.|.#",
  ")": "#.|.#|.#|.#|.#|.#|#.",
  "<": "...#|..#.|.#..|#...|.#..|..#.|...#",
  ">": "#...|.#..|..#.|...#|..#.|.#..|#...",
  "*": ".....|#.#.#|.###.|#####|.###.|#.#.#|.....",
  "=": ".....|.....|#####|.....|#####|.....|.....",
  _: ".....|.....|.....|.....|.....|.....|#####",
  " ": "...|...|...|...|...|...|...",
};

interface Glyph {
  w: number;
  rows: string[];
}

const glyphs = new Map<string, Glyph>();
for (const k of Object.keys(RAW)) {
  const rows = RAW[k].split("|");
  glyphs.set(k, { w: rows[0].length, rows });
}

const cache = new Map<string, HTMLCanvasElement>();

function glyphCanvas(ch: string, color: string): HTMLCanvasElement {
  const key = ch + color;
  let c = cache.get(key);
  if (c) return c;
  const g = glyphs.get(ch) || glyphs.get("?")!;
  c = document.createElement("canvas");
  c.width = g.w;
  c.height = 7;
  const x = c.getContext("2d")!;
  x.fillStyle = color;
  for (let y = 0; y < 7; y++) {
    for (let i = 0; i < g.w; i++) {
      if (g.rows[y][i] === "#") x.fillRect(i, y, 1, 1);
    }
  }
  cache.set(key, c);
  return c;
}

export function textWidth(s: string, scale = 1): number {
  let w = 0;
  const up = s.toUpperCase();
  for (let i = 0; i < up.length; i++) {
    const g = glyphs.get(up[i]) || glyphs.get("?")!;
    w += g.w + 1;
  }
  return Math.max(0, w - 1) * scale;
}

export interface TextOpts {
  color?: string;
  scale?: number;
  align?: "left" | "center" | "right";
  shadow?: string | null;
  alpha?: number;
}

export function drawText(
  ctx: CanvasRenderingContext2D,
  s: string,
  x: number,
  y: number,
  o: TextOpts = {}
) {
  const scale = o.scale ?? 1;
  const color = o.color ?? "#e8f0f4";
  const shadow = o.shadow === undefined ? "#05070d" : o.shadow;
  const so = Math.max(1, Math.round(scale / 3));
  const w = textWidth(s, scale);
  let px = Math.round(x);
  if (o.align === "center") px = Math.round(x - w / 2);
  else if (o.align === "right") px = Math.round(x - w);
  const py = Math.round(y);
  const prevAlpha = ctx.globalAlpha;
  if (o.alpha !== undefined) ctx.globalAlpha = prevAlpha * o.alpha;
  const up = s.toUpperCase();
  for (let pass = shadow ? 0 : 1; pass < 2; pass++) {
    let cx = px + (pass === 0 ? so : 0);
    const cy = py + (pass === 0 ? so : 0);
    const col = pass === 0 ? shadow! : color;
    for (let i = 0; i < up.length; i++) {
      const ch = up[i];
      const g = glyphs.get(ch) || glyphs.get("?")!;
      if (ch !== " ") {
        const c = glyphCanvas(glyphs.has(ch) ? ch : "?", col);
        ctx.drawImage(c, cx, cy, g.w * scale, 7 * scale);
      }
      cx += (g.w + 1) * scale;
    }
  }
  ctx.globalAlpha = prevAlpha;
}

export function wrapText(s: string, maxW: number, scale = 1): string[] {
  const words = s.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const t = cur ? cur + " " + w : w;
    if (textWidth(t, scale) > maxW && cur) {
      lines.push(cur);
      cur = w;
    } else cur = t;
  }
  if (cur) lines.push(cur);
  return lines;
}

export function drawWrapped(
  ctx: CanvasRenderingContext2D,
  s: string,
  x: number,
  y: number,
  maxW: number,
  o: TextOpts & { lineH?: number } = {}
): number {
  const scale = o.scale ?? 1;
  const lh = o.lineH ?? 9 * scale;
  const lines = wrapText(s, maxW, scale);
  lines.forEach((l, i) => drawText(ctx, l, x, y + i * lh, o));
  return lines.length * lh;
}
