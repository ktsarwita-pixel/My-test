import type { Game, Fish } from "./game";
import { drawText } from "./font";
import { fishSprite, boatSprite, BOAT, lurkerSprite, LURKER, bossSprite, BOSS, boneDartSprite, bossPt, moonSprite } from "./sprites";
import { LAMP_RADIUS, FLOOR_Y, clamp, lerp } from "./data";
import { drawHud } from "./hud";

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);

function hash(n: number) {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

type RGB = [number, number, number];
const mix = (a: RGB, b: RGB, t: number): RGB => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const css = (c: RGB) => `rgb(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])})`;

const WATER_STOPS: [number, RGB][] = [
  [0, [26, 84, 104]],
  [60, [19, 64, 88]],
  [150, [14, 46, 72]],
  [280, [10, 32, 56]],
  [420, [7, 22, 42]],
  [600, [5, 14, 30]],
  [780, [3, 8, 18]],
];

function waterColor(depth: number): RGB {
  if (depth <= 0) return WATER_STOPS[0][1];
  for (let i = 1; i < WATER_STOPS.length; i++) {
    if (depth <= WATER_STOPS[i][0]) {
      const [d0, c0] = WATER_STOPS[i - 1];
      const [d1, c1] = WATER_STOPS[i];
      return mix(c0, c1, (depth - d0) / (d1 - d0));
    }
  }
  return WATER_STOPS[WATER_STOPS.length - 1][1];
}

function disc(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string, alpha = 1) {
  cx = Math.round(cx);
  cy = Math.round(cy);
  const pa = ctx.globalAlpha;
  ctx.globalAlpha = pa * alpha;
  ctx.fillStyle = color;
  for (let dy = -r; dy <= r; dy++) {
    const half = Math.floor(Math.sqrt(r * r - dy * dy + 0.25));
    ctx.fillRect(cx - half, cy + dy, half * 2 + 1, 1);
  }
  ctx.globalAlpha = pa;
}

function ell(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, color: string, alpha = 1) {
  cx = Math.round(cx);
  cy = Math.round(cy);
  const pa = ctx.globalAlpha;
  ctx.globalAlpha = pa * alpha;
  ctx.fillStyle = color;
  const r = Math.ceil(ry);
  for (let dy = -r; dy <= r; dy++) {
    const t = 1 - (dy * dy) / (ry * ry);
    if (t < 0) continue;
    const half = Math.floor(rx * Math.sqrt(t));
    ctx.fillRect(cx - half, cy + dy, half * 2 + 1, 1);
  }
  ctx.globalAlpha = pa;
}

function plotLine(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number) {
  x0 = Math.round(x0);
  y0 = Math.round(y0);
  x1 = Math.round(x1);
  y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  for (let i = 0; i < 1200; i++) {
    ctx.fillRect(x0, y0, 1, 1);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x0 += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y0 += sy;
    }
  }
}

export class Renderer {
  ctx: CanvasRenderingContext2D;
  W = 0;
  H = 0;
  dark: HTMLCanvasElement;
  darkCtx: CanvasRenderingContext2D;
  img: ImageData | null = null;
  buf32: Uint32Array | null = null;
  A: Float32Array = new Float32Array(0);
  private shadowEyes: { x: number; y: number }[] = [];

  constructor(public canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext("2d")!;
    this.dark = document.createElement("canvas");
    this.darkCtx = this.dark.getContext("2d")!;
  }

  resize(W: number, H: number) {
    this.W = W;
    this.H = H;
    this.canvas.width = W;
    this.canvas.height = H;
    this.dark.width = W;
    this.dark.height = H;
    this.img = this.darkCtx.createImageData(W, H);
    this.buf32 = new Uint32Array(this.img.data.buffer);
    this.A = new Float32Array(W * H);
  }

  draw(g: Game) {
    const ctx = this.ctx;
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#04060c";
    ctx.fillRect(0, 0, this.W, this.H);
    ctx.save();
    if (g.shake > 0.2) {
      ctx.translate(
        Math.round((Math.random() - 0.5) * g.shake * 1.1),
        Math.round((Math.random() - 0.5) * g.shake * 1.1)
      );
    }
    this.shadowEyes = [];
    this.drawSky(g);
    this.drawWater(g);
    this.drawBackdrop(g);
    this.drawShadow(g);
    this.drawSnow(g);
    this.drawEntities(g);
    this.drawBoatAndLine(g);
    this.drawSurfaceFront(g);
    this.drawDarkness(g);
    this.drawGlow(g);
    ctx.restore();
    this.drawFx(g);
    drawHud(ctx, g);
  }

  // ------------------------------------------------------------ sky
  private drawSky(g: Game) {
    const ctx = this.ctx;
    const W = this.W;
    const surfY = Math.round(g.SURF - g.camY);
    if (surfY <= 0) return;
    const d = clamp(g.dread / 100, 0, 1);
    const dd = Math.pow(d, 1.3) * 0.85;
    let top: RGB = mix([6, 8, 22], [26, 4, 10], dd);
    let hor: RGB = mix([28, 34, 68], [86, 18, 32], dd);
    top = mix(top, [70, 96, 156], g.dawn);
    hor = mix(hor, [255, 176, 120], g.dawn);
    const band = 3;
    const n = Math.ceil(surfY / band);
    for (let i = 0; i < n; i++) {
      ctx.fillStyle = css(mix(top, hor, Math.pow(i / Math.max(1, n - 1), 1.2)));
      ctx.fillRect(0, i * band, W, band);
    }
    // stars
    const starA = (1 - d * 0.95) * (1 - g.dawn);
    if (starA > 0.03) {
      for (let i = 0; i < 46; i++) {
        const x = Math.floor(hash(i * 1.7) * W);
        const y = Math.floor(hash(i * 3.3) * surfY * 0.8);
        const tw = 0.5 + 0.5 * Math.sin(g.t * (1 + hash(i) * 2) + i * 5);
        ctx.globalAlpha = starA * (0.35 + 0.65 * tw);
        ctx.fillStyle = i % 5 === 0 ? "#ffe9b0" : "#dfe9ff";
        ctx.fillRect(x, y, 1, 1);
        if (i % 9 === 0) {
          ctx.fillRect(x - 1, y, 3, 1);
          ctx.fillRect(x, y - 1, 1, 3);
        }
      }
      ctx.globalAlpha = 1;
    }
    // moon
    const mx = Math.round(W * 0.8);
    const my = Math.round(surfY * 0.42);
    const blood = clamp((g.dread - 40) / 40, 0, 1);
    const moonHalf = g.dawn > 0.6 ? 0 : 1;
    if (moonHalf) {
      ctx.globalAlpha = 1 - g.dawn;
      disc(ctx, mx, my, 21, blood > 0.5 ? "#c0402e" : "#d8e0ff", 0.06);
      disc(ctx, mx, my, 17, blood > 0.5 ? "#c0402e" : "#d8e0ff", 0.08);
      ctx.drawImage(moonSprite(false), mx - 13, my - 13);
      if (blood > 0) {
        ctx.globalAlpha = (1 - g.dawn) * blood;
        ctx.drawImage(moonSprite(true), mx - 13, my - 13);
      }
      ctx.globalAlpha = 1;
    }
    // far dead ship at high dread
    if (g.dread > 38 && g.dawn < 0.5) {
      const a = clamp((g.dread - 38) / 30, 0, 0.9);
      ctx.globalAlpha = a;
      const sx = Math.round(W * 0.14);
      const sy = surfY - 1;
      ctx.fillStyle = "#06070d";
      ctx.fillRect(sx, sy - 4, 18, 4);
      ctx.fillRect(sx - 2, sy - 6, 3, 2);
      ctx.fillRect(sx + 6, sy - 14, 1, 10);
      ctx.fillRect(sx + 11, sy - 11, 1, 7);
      ctx.fillRect(sx + 3, sy - 12, 7, 5);
      ctx.fillStyle = "#ff3a2a";
      if (Math.sin(g.t * 3) > -0.5) ctx.fillRect(sx + 6, sy - 15, 1, 1);
      ctx.globalAlpha = 1;
    }
    // fog bands
    const fogA = 0.07 + d * 0.13;
    ctx.fillStyle = g.dawn > 0.5 ? "#ffe0c8" : "#8ea3bc";
    for (let layer = 0; layer < 2; layer++) {
      ctx.globalAlpha = fogA * (layer ? 0.7 : 1);
      for (let x = 0; x < W; x += 4) {
        const h =
          (Math.sin(x * 0.045 + g.t * (0.25 + layer * 0.15) + layer * 3) + Math.sin(x * 0.11 - g.t * 0.13) + 2) * 0.25;
        const hh = Math.round(h * (10 + d * 10) * (layer ? 0.8 : 1));
        ctx.fillRect(x, surfY - hh - layer * 3, 4, hh + layer * 3);
      }
    }
    ctx.globalAlpha = 1;
  }

  // ------------------------------------------------------------ water
  private drawWater(g: Game) {
    const ctx = this.ctx;
    const W = this.W;
    const H = this.H;
    const surfY = Math.round(g.SURF - g.camY);
    const y0 = Math.max(0, surfY);
    const dTop = y0 - surfY;
    const step = 6;
    const start = Math.floor(dTop / step) * step;
    const d = clamp(g.dread / 100, 0, 1);
    for (let dep = start; dep < H - surfY + step; dep += step) {
      const y = surfY + dep;
      let c = waterColor(dep + step / 2);
      c = [c[0] + d * 14, c[1] - d * 6, c[2] - d * 8];
      c = mix(c, [70, 130, 140], g.dawn * clamp(1 - dep / 500, 0, 1) * 0.6);
      ctx.fillStyle = css(c);
      ctx.fillRect(0, y, W, step + 1);
    }
    // wave crest
    const crest = g.dawn > 0.5 ? "#ffd9b8" : "#7fbfd0";
    for (let x = 0; x < W; x++) {
      const wy = surfY + Math.round(Math.sin(x * 0.13 + g.t * 1.8) * 0.9 + Math.sin(x * 0.047 - g.t * 1.1) * 0.9);
      ctx.fillStyle = crest;
      ctx.globalAlpha = 0.85;
      ctx.fillRect(x, wy, 1, 1);
      ctx.globalAlpha = 0.35;
      ctx.fillRect(x, wy + 1, 1, 1);
    }
    ctx.globalAlpha = 1;
    // moon reflection + light shafts
    if (surfY > -150 && surfY < H) {
      const mx = Math.round(W * 0.8);
      const moonA = (1 - g.dawn) * (1 - clamp((g.dread - 40) / 80, 0, 0.6));
      for (let i = 0; i < 9; i++) {
        const y = surfY + 3 + i * 4;
        const w = 12 - i;
        ctx.globalAlpha = 0.3 * (1 - i / 9) * moonA;
        ctx.fillStyle = g.dread > 60 ? "#e08a7a" : "#dfe8c8";
        ctx.fillRect(Math.round(mx - w / 2 + Math.sin(g.t * 2 + i) * 2), y, w, 1);
      }
      ctx.fillStyle = "#cfe8ff";
      for (let k = 0; k < 3; k++) {
        const x0 = mx - 46 + k * 30;
        for (let dep = 2; dep < 150; dep += 2) {
          ctx.globalAlpha = 0.045 * (1 - dep / 150) * (1 - g.dawn * 0.4);
          const x = Math.round(x0 + dep * 0.3 + Math.sin(g.t * 0.4 + k) * 3);
          ctx.fillRect(x, surfY + dep, 7 + Math.round(dep * 0.05), 2);
        }
      }
      ctx.globalAlpha = 1;
    }
  }

  // ------------------------------------------------------------ backdrop (floor)
  private drawBackdrop(g: Game) {
    const ctx = this.ctx;
    const W = this.W;
    const H = this.H;
    const floorY = Math.round(FLOOR_Y - g.camY + g.SURF);
    if (floorY > H + 30) return;
    ctx.fillStyle = "#06080d";
    ctx.fillRect(0, floorY, W, H - floorY + 40);
    for (let x = 0; x < W; x += 3) {
      const h = 5 + Math.round(hash(x * 0.37) * 8 + Math.sin(x * 0.08) * 4);
      ctx.fillStyle = x % 6 ? "#0a0e15" : "#0d121a";
      ctx.fillRect(x, floorY - h, 3, h + 2);
    }
    // bones
    ctx.fillStyle = "#2a2c30";
    for (let i = 0; i < 7; i++) {
      const x = Math.round(hash(i * 9.1) * W);
      ctx.fillRect(x, floorY - 8 - (i % 3), 1, 6);
      ctx.fillRect(x + 3, floorY - 7 - (i % 2), 1, 5);
      ctx.fillRect(x - 1, floorY - 3, 6, 1);
    }
  }

  // ------------------------------------------------------------ shadow event
  private drawShadow(g: Game) {
    const sh = g.shadow;
    if (!sh) return;
    const ctx = this.ctx;
    const len = this.W * (sh.big ? 1.5 : 1.1);
    const cy = Math.round(
      lerp(g.SURF + 62, this.H * 0.5, clamp(g.camY / 90, 0, 1)) + Math.sin(g.t * 0.7) * 2
    );
    const hgt = sh.big ? 34 : 22;
    ctx.globalAlpha = 0.82;
    ell(ctx, sh.x, cy, len / 2, hgt, "#010207");
    // tail
    const tailX = sh.x - sh.dir * (len / 2 + len * 0.18);
    for (let i = 0; i < len * 0.3; i += 2) {
      const half = hgt * 0.15 + (i / (len * 0.3)) * hgt * 1.1;
      ctx.fillStyle = "#010207";
      ctx.fillRect(Math.round(tailX + sh.dir * (len * 0.3 - i)) - (sh.dir < 0 ? 2 : 0), Math.round(cy - half), 2, Math.round(half * 2));
    }
    // dorsal
    for (let i = -20; i < 20; i += 2) {
      ctx.fillRect(Math.round(sh.x + i * 2), Math.round(cy - hgt - Math.max(0, 14 - Math.abs(i) * 0.7)), 2, 14);
    }
    ctx.globalAlpha = 1;
    const ex = sh.x + sh.dir * (len / 2 - 22);
    this.shadowEyes.push({ x: ex, y: cy - 6 }, { x: ex + sh.dir * 14, y: cy - 4 });
  }

  // ------------------------------------------------------------ marine snow
  private drawSnow(g: Game) {
    const ctx = this.ctx;
    const W = this.W;
    const H = this.H;
    const surfY = g.SURF - g.camY;
    ctx.fillStyle = "#b8d8e4";
    for (let i = 0; i < 44; i++) {
      const par = 0.55 + hash(i * 2.2) * 0.45;
      const x = (((hash(i * 7.7) * W + Math.sin(g.t * 0.5 + i) * 5) % W) + W) % W;
      const y = ((((hash(i * 5.3) * H * 2 + g.t * (3 + hash(i) * 7) - g.camY * par) % H) + H) % H);
      if (y < surfY + 3) continue;
      ctx.globalAlpha = 0.18 + hash(i * 1.3) * 0.25;
      ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
    }
    ctx.globalAlpha = 1;
  }

  // ------------------------------------------------------------ entities
  private fishPos(g: Game, f: Fish) {
    if (f.hooked && g.fight && g.fight.fish === f) {
      const s = fishSprite(f.sp.id, f.sp.look);
      let jx = 0;
      let jy = 0;
      if (g.fight.st === "pull") {
        jx = Math.round((Math.random() - 0.5) * 3);
        jy = Math.round((Math.random() - 0.5) * 3);
      } else {
        jy = Math.round(Math.sin(g.t * 9) * 1);
      }
      return {
        x: g.hook.x - f.dir * (s.mouth.x + 1 - s.w / 2) + jx,
        y: g.hook.y - (s.mouth.y - s.h / 2) + jy,
      };
    }
    return { x: f.x, y: f.y };
  }

  private drawEntities(g: Game) {
    const ctx = this.ctx;
    const H = this.H;
    const Y = (y: number) => Math.round(y - g.camY + g.SURF);
    const bossScene = g.mode === "bossIntro" || g.mode === "boss" || g.mode === "bossDeath" || g.mode === "defeat";

    // fish
    if (!bossScene && g.mode !== "victory") {
      for (const f of g.fish) {
        const p = this.fishPos(g, f);
        const sy = Y(p.y);
        if (sy < -30 || sy > H + 30) continue;
        const s = fishSprite(f.sp.id, f.sp.look);
        ctx.save();
        ctx.translate(Math.round(p.x), sy);
        if (f.dir < 0) ctx.scale(-1, 1);
        ctx.drawImage(s.c, -Math.round(s.w / 2), -Math.round(s.h / 2));
        ctx.restore();
      }
    }

    // lurkers (Abyssal Stalker Fish)
    for (const l of g.lurkers) {
      const sy = Y(l.y);
      if (sy < -30 || sy > H + 30) continue;
      ctx.globalAlpha = clamp(l.alpha, 0, 1);
      const spr = lurkerSprite(Math.floor(g.t * 4));
      const ly = Math.round(sy + Math.sin(g.t * 2 + l.seed) * 2);
      ctx.save();
      ctx.translate(Math.round(l.x), ly);
      if (l.dir < 0) ctx.scale(-1, 1);
      ctx.drawImage(spr, -Math.round(LURKER.w / 2), -Math.round(LURKER.h / 2));
      ctx.restore();
      ctx.globalAlpha = 1;
    }

    // boss
    if (g.boss && (bossScene || g.mode === "victory")) this.drawBoss(g);

    // sonic lure ripples
    for (const rp of g.ripples) {
      const sy = Y(rp.y);
      const a = clamp(1 - rp.r / rp.maxR, 0, 1);
      ctx.globalAlpha = a * 0.85;
      ctx.fillStyle = rp.col;
      const r = Math.round(rp.r);
      for (let i = 0; i < 24; i++) {
        const ang = (i / 24) * Math.PI * 2;
        ctx.fillRect(Math.round(rp.x + Math.cos(ang) * r), Math.round(sy + Math.sin(ang) * r), 1, 1);
      }
    }
    ctx.globalAlpha = 1;

    // particles
    for (const p of g.parts) {
      ctx.globalAlpha = clamp(1 - p.life / p.max, 0, 1);
      ctx.fillStyle = p.col;
      ctx.fillRect(Math.round(p.x), Y(p.y), p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }

  private drawBoss(g: Game) {
    const ctx = this.ctx;
    const b = g.boss!;
    const Y = (y: number) => Math.round(y - g.camY + g.SURF);
    const H = this.H;
    const enraged = b.phase === 3 || b.st !== "calm" || b.suck > 0 || b.suckWarn > 0 || b.roar > 0;
    let jx = 0;
    let jy = 0;
    if (b.st === "thrash" || b.dying || b.roar > 0 || b.suckWarn > 0) {
      jx = Math.round((Math.random() - 0.5) * 5);
      jy = Math.round((Math.random() - 0.5) * 4);
    }
    const spr = bossSprite(b.open, enraged);
    if (b.dying) ctx.globalAlpha = 1 - clamp((g.modeT - 3) / 2.2, 0, 1);
    const sx = Math.round(b.x - BOSS.cx) + jx;
    const sy = Y(b.yv) - BOSS.cy + jy;
    if (b.dir > 0) {
      ctx.save();
      ctx.translate(sx + BOSS.w, sy);
      ctx.scale(-1, 1);
      ctx.drawImage(spr, 0, 0);
      ctx.restore();
    } else ctx.drawImage(spr, sx, sy);
    ctx.globalAlpha = 1;
    if (b.stun > 0) {
      const ep = bossPt(BOSS.eye, b.dir);
      for (let i = 0; i < 4; i++) {
        const a = g.t * 4 + i * 1.57;
        ctx.fillStyle = "#fff2a0";
        ctx.fillRect(Math.round(b.x - BOSS.cx + ep.x + Math.cos(a) * 18), sy + ep.y - 16 + Math.round(Math.sin(a) * 5), 2, 2);
      }
    }

    // bone spears (and the wide maw lunge)
    for (const tn of b.tents) {
      const surfY = Y(0);
      const bottom = H + 8;
      if (tn.t < tn.warn) {
        const p = tn.t / tn.warn;
        ctx.fillStyle = "#c01c28";
        ctx.globalAlpha = 0.25 + 0.35 * (Math.sin(tn.t * 22) * 0.5 + 0.5);
        for (let y = surfY + 2; y < bottom; y += 2) {
          for (let x = Math.round(tn.x - tn.w / 2 - 3); x < tn.x + tn.w / 2 + 3; x += 2) {
            if (((x + y) >> 1) % 2 === 0) ctx.fillRect(x, y, 2, 2);
          }
        }
        ctx.globalAlpha = 1;
        drawText(ctx, "!", tn.x, surfY - 24 - Math.round(Math.sin(tn.t * 14) * 1.5), {
          color: p > 0.7 ? "#ffffff" : "#ff4a4a",
          scale: tn.w > 20 ? 3 : 2,
          align: "center",
        });
        continue;
      }
      const k = tn.t - tn.warn;
      let p = 1;
      if (k < tn.up) p = k / tn.up;
      else if (k > tn.up + tn.hold) p = 1 - (k - tn.up - tn.hold) / tn.down;
      p = clamp(p, 0, 1);
      p = 1 - (1 - p) * (1 - p);
      const top = Math.round(lerp(bottom, surfY - 34, p));
      for (let y = top; y < bottom; y += 1) {
        const dy = y - top;
        const w = Math.round(Math.min(tn.w, 2 + dy * 0.5));
        const cx = Math.round(tn.x + Math.sin(y * 0.05 + g.t * 3) * 1.2);
        const left = cx - Math.floor(w / 2);
        const tip = dy < 24;
        ctx.fillStyle = "#0a0610";
        ctx.fillRect(left - 1, y, w + 2, 1);
        ctx.fillStyle = tip ? (dy % 6 < 3 ? "#ece6cf" : "#cfc8ae") : dy % 10 < 5 ? "#2c1c40" : "#241638";
        ctx.fillRect(left, y, w, 1);
        ctx.fillStyle = tip ? "#ffffff" : "#4a3468";
        ctx.fillRect(left, y, 1, 1);
        if (dy % 18 === 9 && dy > 6) {
          ctx.fillStyle = "#ece6cf";
          for (let r = 0; r < 4; r++) {
            ctx.fillRect(left - 4 + r, y + r, 4 - r, 1);
            ctx.fillRect(left + w, y + r, 4 - r, 1);
          }
        }
      }
    }

    // bone darts
    for (const s of b.spits) {
      const sy2 = Y(s.y);
      ctx.fillStyle = "#c1272d";
      for (let i = 1; i < 5; i++) {
        ctx.globalAlpha = 0.5 - i * 0.1;
        ctx.fillRect(Math.round(s.x - s.vx * 0.02 * i), Math.round(sy2 - s.vy * 0.02 * i), 2, 2);
      }
      ctx.globalAlpha = 1;
      ctx.save();
      ctx.translate(Math.round(s.x), sy2);
      const ang = Math.round(Math.atan2(s.vy, s.vx) / (Math.PI / 8)) * (Math.PI / 8);
      ctx.rotate(ang);
      ctx.drawImage(boneDartSprite(), -6, -2);
      ctx.restore();
    }
  }

  // ------------------------------------------------------------ boat + line
  private drawBoatAndLine(g: Game) {
    const ctx = this.ctx;
    const surfY = Math.round(g.SURF - g.camY);
    const Y = (y: number) => Math.round(y - g.camY + g.SURF);
    if (g.mode === "victory" && false) return;
    const bx = Math.round(g.boatX - BOAT.w / 2);
    const by = surfY - BOAT.waterY + g.bob + Math.round(g.boatSink);
    if (g.invuln > 0 && Math.floor(g.t * 14) % 2 === 0 && g.mode === "boss") {
      // blink when hurt
    } else {
      ctx.drawImage(boatSprite(), bx, by);
    }
    if (g.mode === "defeat" && g.modeT > 0.3) return;

    // rod
    const hx = bx + BOAT.hand.x;
    const hy = by + BOAT.hand.y;
    const tens = g.fight ? g.fight.tension : g.boss && g.mode === "boss" ? g.boss.tension : 0;
    const bend = (tens / 100) * 9;
    const tipX = bx + BOAT.hand.x + 26;
    const tipY = hy - 16 + bend;
    ctx.fillStyle = "#2c2016";
    const cpx = hx + 14;
    const cpy = hy - 12 + bend * 0.15;
    let px = hx;
    let py = hy;
    for (let i = 1; i <= 14; i++) {
      const t = i / 14;
      const x = (1 - t) * (1 - t) * hx + 2 * (1 - t) * t * cpx + t * t * tipX;
      const y = (1 - t) * (1 - t) * hy + 2 * (1 - t) * t * cpy + t * t * tipY;
      plotLine(ctx, px, py, x, y);
      px = x;
      py = y;
    }
    ctx.fillStyle = "#6a4a2a";
    ctx.fillRect(Math.round(tipX), Math.round(tipY), 1, 1);

    // line + hook
    if (g.mode === "title" || g.mode === "victory") return;
    let hkx = g.hook.x;
    let hky = Y(g.hook.y);
    if (g.mode === "idle" || g.mode === "catch") {
      hkx = tipX;
      hky = Math.round(tipY) + 8 + Math.round(Math.sin(g.t * 3) * 1);
    }
    ctx.fillStyle = "#c9d6dc";
    ctx.globalAlpha = 0.8;
    const lx0 = Math.round(tipX);
    let dropY = Y(15);
    if (hky <= dropY + 2 && hkx >= tipX) {
      plotLine(ctx, tipX, tipY, hkx, hky);
    } else {
      // straight down past the bow (never crosses the hull), then curve out to the hook
      dropY = Math.min(dropY, hky);
      plotLine(ctx, lx0, tipY, lx0, dropY);
      const cxp = lx0 + (hkx - lx0) * 0.2;
      const cyp = dropY + (hky - dropY) * 0.55;
      const dist = Math.hypot(hkx - lx0, hky - dropY);
      const N = Math.max(2, Math.ceil(dist / 5));
      let lx = lx0;
      let ly = dropY;
      for (let i = 1; i <= N; i++) {
        const t = i / N;
        const x = (1 - t) * (1 - t) * lx0 + 2 * (1 - t) * t * cxp + t * t * hkx;
        const y = (1 - t) * (1 - t) * dropY + 2 * (1 - t) * t * cyp + t * t * hky;
        plotLine(ctx, lx, ly, x, y);
        lx = x;
        ly = y;
      }
    }
    ctx.globalAlpha = 1;
    // hook
    const hx0 = Math.round(hkx);
    const hy0 = Math.round(hky);
    if (!(g.fight && g.mode === "fight")) {
      ctx.fillStyle = "#d3dde2";
      ctx.fillRect(hx0, hy0, 1, 5);
      ctx.fillRect(hx0 + 1, hy0 + 5, 2, 1);
      ctx.fillRect(hx0 + 3, hy0 + 3, 1, 2);
      ctx.fillStyle = "#8aa0ac";
      ctx.fillRect(hx0 + 4, hy0 + 2, 1, 1);
      // bait
      ctx.fillStyle = "#a8fbff";
      ctx.fillRect(hx0 - 1, hy0 + 2, 2, 2);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(hx0 - 1, hy0 + 2, 1, 1);
    } else {
      ctx.fillStyle = "#d3dde2";
      ctx.fillRect(hx0, hy0 - 1, 1, 2);
    }
  }

  private drawSurfaceFront(g: Game) {
    const ctx = this.ctx;
    const surfY = Math.round(g.SURF - g.camY);
    if (surfY < -20 || surfY > this.H) return;
    const bx = Math.round(g.boatX - BOAT.w / 2);
    const by = surfY - BOAT.waterY + g.bob + Math.round(g.boatSink);
    const c = waterColor(2);
    ctx.fillStyle = css([c[0], c[1], c[2]]);
    ctx.globalAlpha = 0.72;
    const x0 = Math.max(0, bx - 2);
    const x1 = Math.min(this.W, bx + BOAT.w + 2);
    for (let sx = 1; sx < 57; sx++) {
      const nx = (sx + 0.5 - 28.5) / 28;
      const bottom = 19 + Math.round(9 * Math.sqrt(Math.max(0, 1 - nx * nx)));
      const topY = surfY + 1;
      const botY = by + bottom + 2;
      if (botY > topY) ctx.fillRect(bx + sx, topY, 1, botY - topY);
    }
    ctx.globalAlpha = 1;
    for (let x = x0; x < x1; x++) {
      const wy = surfY + Math.round(Math.sin(x * 0.13 + g.t * 1.8) * 0.9 + Math.sin(x * 0.047 - g.t * 1.1) * 0.9);
      ctx.fillStyle = g.dawn > 0.5 ? "#ffd9b8" : "#8fcfe0";
      ctx.globalAlpha = 0.9;
      ctx.fillRect(x, wy, 1, 1);
      ctx.fillStyle = "#0c2a3a";
      ctx.globalAlpha = 0.3;
      ctx.fillRect(x, wy + 1, 1, 1);
    }
    ctx.globalAlpha = 1;
  }

  // ------------------------------------------------------------ darkness + lights
  private lightList(g: Game) {
    const lights: { x: number; y: number; r: number; i: number }[] = [];
    const surfY = g.SURF - g.camY;
    const by = surfY - BOAT.waterY + g.bob + g.boatSink;
    const bx = g.boatX - BOAT.w / 2;
    let flick = 1 + Math.sin(g.t * 17) * 0.025;
    if (g.dread > 55 && Math.sin(g.t * 3.1) * Math.sin(g.t * 7.7) > 0.72 - g.dread * 0.002) flick *= 0.45;
    if (g.mode === "defeat") flick *= Math.max(0, 1 - g.modeT / 2);
    lights.push({ x: bx + BOAT.lamp.x + 0.5, y: by + BOAT.lamp.y + 1, r: (42 + g.lv.lamp * 5) * flick, i: 0.97 });
    if (g.mode === "sink" || g.mode === "fight") {
      let r = LAMP_RADIUS[g.lv.lamp];
      if (g.flashT > 0) r += 100 * (g.flashT / 0.6);
      const hy = g.hook.y - g.camY + g.SURF;
      lights.push({ x: g.hook.x, y: hy, r: r * (1 + Math.sin(g.t * 9) * 0.03), i: 1 });
    }
    if (g.mode === "boss" && g.flashT > 0) {
      lights.push({ x: g.boatX, y: surfY + 10, r: 160 * (g.flashT / 0.6), i: 1 });
    }
    for (const f of g.fish) {
      if (!f.sp.look.glow) continue;
      const p = this.fishPos(g, f);
      const sy = p.y - g.camY + g.SURF;
      if (sy < -30 || sy > this.H + 30) continue;
      lights.push({ x: p.x, y: sy, r: f.sp.look.lure ? 26 : 20, i: 0.85 });
    }
    if (g.boss && (g.mode === "boss" || g.mode === "bossIntro" || g.mode === "bossDeath" || g.mode === "defeat")) {
      const b = g.boss;
      const sy = b.yv - g.camY + g.SURF;
      const fade = b.dying ? 1 - clamp((g.modeT - 3) / 2.2, 0, 1) : 1;
      const lp = bossPt(BOSS.lure, b.dir);
      lights.push({ x: b.x - BOSS.cx + lp.x, y: sy - BOSS.cy + lp.y, r: 105 * fade, i: 0.95 });
      lights.push({ x: b.x, y: sy, r: 85 * fade, i: 0.6 });
      if (g.flashT > 0) lights.push({ x: b.x, y: sy, r: 130, i: 0.8 });
    }
    return lights;
  }

  private drawDarkness(g: Game) {
    const W = this.W;
    const H = this.H;
    if (!this.img || !this.buf32) return;
    const A = this.A;
    const surfY = g.SURF - g.camY;
    const bossScene = g.mode === "bossIntro" || g.mode === "boss" || g.mode === "bossDeath" || g.mode === "defeat";
    const dn = g.dread / 100;
    for (let y = 0; y < H; y++) {
      const depth = y - surfY;
      let base: number;
      if (depth < 0) base = 0.1 + dn * 0.1;
      else base = 0.16 + Math.pow(depth / 640, 0.85) * 0.74;
      if (bossScene) base = Math.min(base, 0.56);
      base *= 1 - g.dawn * 0.85;
      A.fill(Math.min(0.95, base), y * W, y * W + W);
    }
    const lights = this.lightList(g);
    for (const L of lights) {
      const x0 = Math.max(0, Math.floor(L.x - L.r));
      const x1 = Math.min(W - 1, Math.ceil(L.x + L.r));
      const y0 = Math.max(0, Math.floor(L.y - L.r));
      const y1 = Math.min(H - 1, Math.ceil(L.y + L.r));
      const r2 = L.r * L.r;
      for (let y = y0; y <= y1; y++) {
        const dy = y - L.y;
        for (let x = x0; x <= x1; x++) {
          const dx = x - L.x;
          const d2 = dx * dx + dy * dy;
          if (d2 >= r2) continue;
          let I = 1 - Math.sqrt(d2) / L.r;
          I = I * I * (3 - 2 * I) * L.i;
          A[y * W + x] *= 1 - I;
        }
      }
    }
    const vig = 0.14 + dn * 0.45 + (g.mode === "defeat" ? Math.min(1, g.modeT / 2) : 0);
    const buf = this.buf32;
    const LV = 7;
    const rgb = 0x0e0a05; // little-endian: B=0x0e,G=0x0a,R=0x05
    for (let y = 0; y < H; y++) {
      const ny = (y / H - 0.5) * 2;
      for (let x = 0; x < W; x++) {
        const nx = (x / W - 0.5) * 2;
        const v = (nx * nx + ny * ny) * 0.5;
        let a = A[y * W + x] + vig * v * v;
        if (a > 1) a = 1;
        const s = a * LV;
        const lo = Math.floor(s);
        const lvl = lo + (s - lo > BAYER[(x & 3) + ((y & 3) << 2)] ? 1 : 0);
        const alpha = Math.round((lvl / LV) * 0.95 * 255);
        buf[y * W + x] = (alpha << 24) | rgb;
      }
    }
    this.darkCtx.putImageData(this.img, 0, 0);
    this.ctx.drawImage(this.dark, 0, 0);
  }

  // ------------------------------------------------------------ glow pass
  private drawGlow(g: Game) {
    const ctx = this.ctx;
    const Y = (y: number) => Math.round(y - g.camY + g.SURF);
    const H = this.H;
    const surfY = Math.round(g.SURF - g.camY);
    const by = surfY - BOAT.waterY + g.bob + Math.round(g.boatSink);
    const bx = Math.round(g.boatX - BOAT.w / 2);

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    // lantern halo
    const lx = bx + BOAT.lamp.x + 1;
    const ly = by + BOAT.lamp.y + 2;
    if (g.mode !== "defeat" || g.modeT < 1.5) {
      disc(ctx, lx, ly, 14, "#ff9a30", 0.05);
      disc(ctx, lx, ly, 9, "#ffb050", 0.07);
      disc(ctx, lx, ly, 5, "#ffd080", 0.1);
    }
    // hook halo
    if (g.mode === "sink" || g.mode === "fight") {
      const hy = Y(g.hook.y);
      disc(ctx, g.hook.x, hy + 2, 12, "#5fd8ff", 0.05);
      disc(ctx, g.hook.x, hy + 2, 7, "#8fe8ff", 0.07);
      if (g.flashT > 0) {
        const a = g.flashT / 0.6;
        disc(ctx, g.hook.x, hy, 40, "#fff2b0", 0.1 * a);
      }
    }
    ctx.restore();

    // fish eyes + lures
    for (const f of g.fish) {
      if (g.mode === "bossIntro" || g.mode === "boss" || g.mode === "bossDeath") break;
      const p = this.fishPos(g, f);
      const sy = Y(p.y);
      if (sy < -20 || sy > H + 20) continue;
      const s = fishSprite(f.sp.id, f.sp.look);
      if (s.eyeColor) {
        const ex = Math.round(p.x + f.dir * (s.eye.x - s.w / 2) - (f.dir < 0 ? 2 : 0));
        const ey = sy + Math.round(s.eye.y - s.h / 2);
        ctx.fillStyle = s.eyeColor;
        ctx.globalAlpha = f.sp.horror ? 1 : 0.75;
        ctx.fillRect(ex, ey, f.sp.horror ? 2 : 1, f.sp.horror ? 2 : 1);
        if (f.sp.horror) {
          ctx.globalCompositeOperation = "lighter";
          ctx.globalAlpha = 0.14;
          disc(ctx, ex, ey, 4, s.eyeColor, 1);
          ctx.globalCompositeOperation = "source-over";
        }
        ctx.globalAlpha = 1;
      }
      if (s.lure) {
        const lxx = Math.round(p.x + f.dir * (s.lure.x - s.w / 2) - (f.dir < 0 ? 1 : 0));
        const lyy = sy + Math.round(s.lure.y - s.h / 2);
        ctx.fillStyle = s.glow || "#9dfcff";
        ctx.fillRect(lxx - 1, lyy - 1, 3, 3);
        ctx.fillStyle = "#fff";
        ctx.fillRect(lxx, lyy, 1, 1);
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        disc(ctx, lxx, lyy, 9, s.glow || "#9dfcff", 0.07);
        disc(ctx, lxx, lyy, 5, s.glow || "#9dfcff", 0.1);
        ctx.restore();
      } else if (s.glow) {
        ctx.fillStyle = s.glow;
        ctx.globalAlpha = 0.5;
        ctx.fillRect(Math.round(p.x) - 1, sy + 1, 3, 1);
        ctx.globalAlpha = 1;
      }
    }

    // lurker eyes (Abyssal Stalker Fish)
    for (const l of g.lurkers) {
      const sy = Y(l.y);
      if (sy < -30 || sy > H + 30) continue;
      const open = (g.t + l.seed * 3) % 3.2 > 0.18 || l.state === "flee";
      if (!open) continue;
      const a = clamp(l.alpha, 0, 1);
      const ly = Math.round(sy + Math.sin(g.t * 2 + l.seed) * 2) - Math.round(LURKER.h / 2);
      const e1x = Math.round(l.x + l.dir * (LURKER.eyeL.x - LURKER.w / 2));
      const e2x = Math.round(l.x + l.dir * (LURKER.eyeR.x - LURKER.w / 2));
      const e1y = ly + LURKER.eyeL.y;
      const e2y = ly + LURKER.eyeR.y;
      ctx.globalAlpha = a;
      ctx.fillStyle = "#ff3a2a";
      ctx.fillRect(e1x, e1y, 2, 2);
      ctx.fillRect(e2x, e2y, 1, 1);
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = a * 0.18;
      disc(ctx, e1x, e1y, 6, "#ff3a2a", 1);
      disc(ctx, e2x, e2y, 4, "#ff3a2a", 1);
      ctx.restore();
      ctx.globalAlpha = 1;
    }

    // ghost eyes
    for (const e of g.ghosts) {
      const a = Math.sin((e.life / e.max) * Math.PI);
      const sy = Y(e.y);
      if (sy < surfY + 5 || sy > H) continue;
      ctx.globalAlpha = clamp(a, 0, 1) * 0.85;
      ctx.fillStyle = "#e8e0d0";
      ctx.fillRect(Math.round(e.x), sy, 2, 2);
      ctx.fillRect(Math.round(e.x) + 6, sy, 2, 2);
      ctx.globalAlpha = 1;
    }

    // shadow eyes
    for (const e of this.shadowEyes) {
      const sy = Math.round(e.y);
      ctx.fillStyle = "#c01828";
      ctx.globalAlpha = 0.9;
      ctx.fillRect(Math.round(e.x) - 2, sy - 1, 5, 3);
      ctx.fillStyle = "#ff6a5a";
      ctx.fillRect(Math.round(e.x), sy, 1, 1);
      ctx.globalAlpha = 1;
    }

    // intro eyes at the bottom
    if (g.introEyes > 0 && !g.boss) {
      const a = g.introEyes;
      const cy = H - 46;
      for (const sx of [-36, 36]) {
        const cx = Math.round(g.W / 2 + sx);
        const ry = Math.max(1, Math.round(11 * a));
        ctx.globalAlpha = a;
        ell(ctx, cx, cy, 15, ry, "#1a0508");
        ell(ctx, cx, cy, 13, Math.max(1, ry - 2), "#e9d36b");
        ctx.fillStyle = "#0b0204";
        ctx.fillRect(cx - 1, cy - ry + 2, 3, Math.max(1, ry * 2 - 3));
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        disc(ctx, cx, cy, 24, "#ffb030", 0.06 * a);
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    }

    // deep eye at the bottom of the sea
    const floorY = Y(FLOOR_Y);
    const open = clamp((g.hook.y - 540) / 110, 0, 1);
    if (open > 0 && floorY < H + 60 && (g.mode === "sink" || g.mode === "fight")) {
      const cx = Math.round(g.W / 2 + Math.sin(g.t * 0.3) * 6);
      const cy = floorY - 58;
      const ry = Math.max(1, Math.round(22 * open));
      ell(ctx, cx, cy, 44, ry + 2, "#12060a", 0.9);
      ell(ctx, cx, cy, 40, ry, "#c8a02a", 0.9);
      ell(ctx, cx, cy, 24, Math.max(1, Math.round(ry * 0.8)), "#d8541e", 0.9);
      ctx.fillStyle = "#050102";
      ctx.fillRect(cx - 3, cy - ry + 1, 7, Math.max(1, ry * 2 - 2));
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      disc(ctx, cx, cy, 52, "#ff6a30", 0.05 * open);
      ctx.restore();
    }

    // boss eyes + lure glow
    if (g.boss && (g.mode === "boss" || g.mode === "bossIntro" || g.mode === "bossDeath" || g.mode === "defeat")) {
      const b = g.boss;
      const sy = Y(b.yv) - BOSS.cy;
      const fade = b.dying ? 1 - clamp((g.modeT - 3) / 2.2, 0, 1) : 1;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const enr = b.phase === 3 || b.st !== "calm";
      const col = enr ? "#ff3a2a" : "#ffd24a";
      const ep = bossPt(BOSS.eye, b.dir);
      const lp = bossPt(BOSS.lure, b.dir);
      disc(ctx, b.x - BOSS.cx + ep.x, sy + ep.y, 18, col, 0.08 * fade);
      disc(ctx, b.x - BOSS.cx + ep.x, sy + ep.y, 10, col, 0.1 * fade);
      disc(ctx, b.x - BOSS.cx + lp.x, sy + lp.y, 16, enr ? "#ff5a4a" : "#9dfcff", 0.09 * fade);
      disc(ctx, b.x - BOSS.cx + lp.x, sy + lp.y, 8, enr ? "#ff8a7a" : "#cffcff", 0.12 * fade);
      ctx.restore();
    }
  }

  // ------------------------------------------------------------ screen fx
  private drawFx(g: Game) {
    const ctx = this.ctx;
    const W = this.W;
    const H = this.H;
    // dread red tint
    if (g.dread > 55 && !g.bossBeaten) {
      ctx.fillStyle = "#7a0010";
      ctx.globalAlpha = ((g.dread - 55) / 45) * 0.1 + (g.mode === "bossIntro" ? clamp(g.modeT / 6, 0, 1) * 0.1 : 0);
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    }
    if (g.mode === "boss" || g.mode === "bossDeath") {
      ctx.fillStyle = "#4a0010";
      ctx.globalAlpha = g.boss && g.boss.phase === 3 ? 0.1 : 0.05;
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    }
    if (g.dawn > 0) {
      ctx.fillStyle = "#ffcf9a";
      ctx.globalAlpha = g.dawn * 0.07;
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    }
    if (g.flashFx > 0) {
      ctx.fillStyle = g.mode === "sink" || g.mode === "fight" || g.mode === "boss" ? "#fff6c8" : "#ffffff";
      ctx.globalAlpha = clamp(g.flashFx * 0.55, 0, 0.8);
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    }
    if (g.hurtFx > 0) {
      ctx.fillStyle = "#ff1a2a";
      ctx.globalAlpha = clamp(g.hurtFx * 0.6, 0, 0.5);
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    }
    if (g.mode === "defeat") {
      ctx.fillStyle = "#1a0006";
      ctx.globalAlpha = clamp(g.modeT / 2.6, 0, 0.88);
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    }
    // glitch
    if (g.glitch > 0) {
      const n = 3 + Math.floor(Math.random() * 3);
      for (let i = 0; i < n; i++) {
        const y = Math.floor(Math.random() * H);
        const h = 2 + Math.floor(Math.random() * 10);
        const dx = Math.round((Math.random() - 0.5) * 18);
        ctx.drawImage(this.canvas, 0, y, W, h, dx, y, W, h);
      }
      ctx.fillStyle = "#ff2a3a";
      ctx.globalAlpha = 0.07;
      ctx.fillRect(0, Math.floor(Math.random() * H), W, 2);
      ctx.globalAlpha = 1;
    }
  }
}
