// Procedural pixel-art sprite generators with true fish anatomy:
// pointed snout, arched back, narrow caudal peduncle (tail wrist), swept dorsal/pectoral/pelvic/anal fins,
// operculum gill cover, lateral line, and hinged angled predator jaws.

export function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hexRgb(c: string): [number, number, number] {
  if (c.startsWith("rgb")) {
    const m = c.match(/\d+/g);
    return m ? [Number(m[0]), Number(m[1]), Number(m[2])] : [128, 128, 128];
  }
  const n = parseInt(c.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function adj(c: string, a: number): string {
  const [r, g, b] = hexRgb(c);
  const f = (v: number) =>
    Math.max(0, Math.min(255, Math.round(a >= 0 ? v + (255 - v) * a : v * (1 + a))));
  return `rgb(${f(r)},${f(g)},${f(b)})`;
}

export class Grid {
  w: number;
  h: number;
  d: (string | null)[];
  constructor(w: number, h: number) {
    this.w = w;
    this.h = h;
    this.d = new Array(w * h).fill(null);
  }
  set(x: number, y: number, c: string | null) {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    this.d[y * this.w + x] = c;
  }
  setIf(x: number, y: number, c: string) {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    if (this.d[y * this.w + x]) this.d[y * this.w + x] = c;
  }
  get(x: number, y: number): string | null {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return null;
    return this.d[y * this.w + x];
  }
  rect(x: number, y: number, w: number, h: number, c: string) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c);
  }
  ellipse(
    cx: number,
    cy: number,
    rx: number,
    ry: number,
    col: string | ((x: number, y: number) => string | null)
  ) {
    const y0 = Math.max(0, Math.floor(cy - ry - 1));
    const y1 = Math.min(this.h - 1, Math.ceil(cy + ry + 1));
    const x0 = Math.max(0, Math.floor(cx - rx - 1));
    const x1 = Math.min(this.w - 1, Math.ceil(cx + rx + 1));
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const nx = (x + 0.5 - cx) / rx;
        const ny = (y + 0.5 - cy) / ry;
        if (nx * nx + ny * ny <= 1) {
          const c = typeof col === "string" ? col : col(x, y);
          if (c) this.set(x, y, c);
        }
      }
    }
  }
  line(x0: number, y0: number, x1: number, y1: number, c: string) {
    x0 = Math.round(x0);
    y0 = Math.round(y0);
    x1 = Math.round(x1);
    y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (let i = 0; i < 500; i++) {
      this.set(x0, y0, c);
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
  outline(c: string) {
    const add: number[] = [];
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (this.d[y * this.w + x]) continue;
        if (
          this.get(x - 1, y) ||
          this.get(x + 1, y) ||
          this.get(x, y - 1) ||
          this.get(x, y + 1)
        )
          add.push(y * this.w + x);
      }
    }
    for (const i of add) this.d[i] = c;
  }
  canvas(): HTMLCanvasElement {
    const c = document.createElement("canvas");
    c.width = this.w;
    c.height = this.h;
    const x = c.getContext("2d")!;
    for (let j = 0; j < this.h; j++) {
      for (let i = 0; i < this.w; i++) {
        const col = this.d[j * this.w + i];
        if (col) {
          x.fillStyle = col;
          x.fillRect(i, j, 1, 1);
        }
      }
    }
    return c;
  }
}

function fromRows(rows: string[], pal: Record<string, string>): HTMLCanvasElement {
  const g = new Grid(rows[0].length, rows.length);
  rows.forEach((r, y) => {
    for (let x = 0; x < r.length; x++) {
      const ch = r[x];
      if (pal[ch]) g.set(x, y, pal[ch]);
    }
  });
  return g.canvas();
}

// ---------------------------------------------------------------- FISH (true fish silhouette)

export type FishShape = "stream" | "deep" | "eel" | "angler" | "shark";

export interface FishLook {
  len: number;
  hgt: number;
  body: string;
  belly: string;
  dark: string;
  fin: string;
  eye: "dot" | "white" | "big" | "none" | "many" | "red";
  mouth: "small" | "teeth" | "huge" | "grin";
  tail: "fork" | "fan" | "long";
  shape?: FishShape;
  dorsal?: boolean;
  lure?: boolean;
  skeleton?: boolean;
  stripes?: string;
  spots?: string;
  glow?: string;
  fangs?: boolean;
  whiskers?: boolean;
  stitched?: boolean;
  spiny?: boolean;
  seed?: number;
}

export interface FishSprite {
  c: HTMLCanvasElement;
  w: number;
  h: number;
  eye: { x: number; y: number };
  eyeColor: string | null;
  mouth: { x: number; y: number };
  lure?: { x: number; y: number };
  glow?: string;
}

const OUT = "#06080e";

/**
 * Generates a fish sprite facing RIGHT (`x=0` tail tip -> `x=w-1` snout tip).
 * Uses a streamlined profile with a distinct caudal peduncle (narrow tail wrist),
 * swept-back fins, gill operculum, lateral line, and angled hinged jaws.
 */
export function makeFish(look: FishLook): FishSprite {
  const rnd = mulberry32(look.seed ?? 7);
  const shape: FishShape =
    look.shape ??
    (look.tail === "long"
      ? "eel"
      : look.lure && look.hgt >= 18
      ? "angler"
      : look.fangs
      ? "shark"
      : look.hgt >= 13
      ? "deep"
      : "stream");

  const tailW = shape === "eel" ? 6 : Math.max(6, Math.round(look.len * 0.28));
  const dorsalH =
    look.dorsal === false ? 0 : Math.max(3, Math.round(look.hgt * (look.spiny ? 0.5 : 0.36)));
  const ventralH = Math.max(2, Math.round(look.hgt * 0.28));
  const lureH = look.lure ? 9 : 0;
  const topPad = dorsalH + lureH + 2;
  const botPad = ventralH + 3;
  const w = look.len + tailW + 4;
  const h = topPad + look.hgt + botPad;
  const g = new Grid(w, h);

  const xPed = tailW; // where tail fin meets caudal peduncle
  const xSnout = tailW + look.len - 1;
  const cy = topPad + look.hgt * 0.48;
  const ry = look.hgt / 2;
  const bone = "#e6e2cf";
  const finHi = adj(look.fin, 0.2);
  const finDark = adj(look.fin, -0.22);

  // Compute top and bottom body contour for u in [0..1] (0 = peduncle, 1 = snout tip)
  const profile = (u: number): [number, number, number] => {
    u = Math.max(0, Math.min(1, u));
    let topHalf: number;
    let botHalf: number;
    let centerOff = 0;
    if (shape === "eel") {
      // sinuous ribbon body with wave
      const env =
        u < 0.12
          ? 0.35 + (u / 0.12) * 0.65
          : u > 0.85
          ? Math.pow((1 - u) / 0.15, 0.65)
          : 1;
      centerOff = Math.sin(u * Math.PI * 2.2) * (ry * 0.28);
      topHalf = ry * 0.85 * env;
      botHalf = ry * 0.85 * env;
    } else if (shape === "angler") {
      // narrow tail stock -> bulbous arched head/body -> sloping snout
      const ped = 0.24;
      let env: number;
      if (u < 0.2) env = ped + (1 - ped) * Math.pow(u / 0.2, 1.4);
      else if (u < 0.72) env = 1.0 + 0.08 * Math.sin(((u - 0.2) / 0.52) * Math.PI);
      else env = Math.pow(Math.max(0, (1 - u) / 0.28), 0.58);
      topHalf = ry * 1.02 * env;
      botHalf = ry * 1.06 * (u > 0.55 ? Math.pow(Math.max(0, (1 - u) / 0.45), 0.5) : env);
    } else if (shape === "shark") {
      // torpedo predator: very narrow wrist, sleek arched back, sharp pointed snout
      const ped = 0.22;
      let topEnv: number;
      let botEnv: number;
      if (u < 0.22) {
        const t = u / 0.22;
        topEnv = ped + (0.95 - ped) * Math.pow(t, 1.3);
        botEnv = ped + (0.85 - ped) * Math.pow(t, 1.3);
      } else if (u < 0.66) {
        const t = (u - 0.22) / 0.44;
        topEnv = 0.95 + 0.12 * Math.sin(t * Math.PI);
        botEnv = 0.85 + 0.1 * Math.sin(t * Math.PI);
      } else {
        const t = (1 - u) / 0.34;
        topEnv = Math.pow(Math.max(0, t), 0.72);
        botEnv = Math.pow(Math.max(0, t), 0.65);
      }
      topHalf = ry * topEnv;
      botHalf = ry * botEnv;
    } else {
      // "stream" or "deep": classic fish with narrow caudal peduncle, arched back, rounded belly, pointed snout
      const ped = shape === "deep" ? 0.27 : 0.24;
      let env: number;
      if (u < 0.22) {
        const t = u / 0.22;
        env = ped + (0.92 - ped) * (t * t * (3 - 2 * t));
      } else if (u < 0.64) {
        const t = (u - 0.22) / 0.42;
        env = 0.92 + 0.14 * Math.sin(t * Math.PI);
      } else {
        const t = (1 - u) / 0.36;
        env = Math.pow(Math.max(0, t), 0.68);
      }
      topHalf = ry * 1.02 * env;
      botHalf = ry * 0.96 * env;
    }
    const yMid = cy + centerOff;
    return [yMid - topHalf, yMid + botHalf, yMid];
  };

  // 1) CAUDAL FIN (Swept forked or fan tail on the left, meeting the narrow peduncle at xPed)
  const [pedTop, pedBot, pedMid] = profile(0.02);
  const pedHalf = Math.max(1.2, (pedBot - pedTop) * 0.5);
  for (let x = 1; x <= xPed; x++) {
    // t = 0 at peduncle, t = 1 at outer tail tips
    const t = (xPed - x) / Math.max(1, xPed - 1);
    const flare =
      shape === "eel"
        ? pedHalf * (1 - t * 0.5)
        : pedHalf + Math.pow(t, 0.85) * (ry * (look.tail === "fork" ? 1.08 : 0.92));
    // fork notch carved out of the middle near outer edge
    const notch =
      look.tail === "fork" && t > 0.32
        ? ((t - 0.32) / 0.68) * flare * 0.72
        : look.tail === "fan" && t > 0.78
        ? ((t - 0.78) / 0.22) * 1.2
        : 0;
    const y0 = Math.round(pedMid - flare);
    const y1 = Math.round(pedMid + flare);
    for (let y = y0; y <= y1; y++) {
      const d = Math.abs(y - pedMid);
      if (d < notch) continue;
      if (look.skeleton && (x + y) % 2 === 1 && d > 1) continue;
      // swept fin ray shading
      const ray = Math.round(d - t * 2) % 3 === 0;
      const finCol = ray ? adj(look.fin, -0.28) : t > 0.8 ? finDark : look.fin;
      g.set(x, y, look.skeleton ? bone : finCol);
    }
  }

  // 2) SWEPT DORSAL, PELVIC & ANAL FINS (drawn before body so body overlaps their base cleanly)
  if (dorsalH > 0) {
    if (shape === "eel") {
      // continuous ribbon fin along back and belly
      for (let x = xPed + 2; x < xSnout - 5; x++) {
        const u = (x - xPed) / Math.max(1, look.len - 1);
        const [yt, yb] = profile(u);
        const rh = u > 0.8 ? 1 : 2;
        for (let k = 1; k <= rh; k++) {
          g.set(x, Math.round(yt) - k, k === rh ? finHi : look.fin);
          if (u < 0.72) g.set(x, Math.round(yb) + k, look.fin);
        }
      }
    } else {
      // Primary swept dorsal fin (from u=0.30 to u=0.66, slanting backward toward tail)
      const uStart = 0.26;
      const uEnd = look.spiny ? 0.7 : 0.62;
      for (let x = xPed; x <= xSnout; x++) {
        const u = (x - xPed) / Math.max(1, look.len - 1);
        if (u < uStart || u > uEnd) continue;
        const f = (u - uStart) / (uEnd - uStart); // 0=rear of fin, 1=front of fin
        const [yt] = profile(u);
        // Fin profile peaks near front-middle and sweeps back
        let hh = Math.round(dorsalH * Math.sin(Math.pow(f, 0.75) * Math.PI));
        if (look.spiny && x % 2 === 1) hh = Math.max(1, hh - 1);
        for (let k = 1; k <= hh; k++) {
          // slant each fin ray backward as it rises
          const rx = x - Math.floor(k * 0.45);
          if (look.skeleton && k % 2 === 0) continue;
          const isSpine = (x + k) % 3 === 0 || k === hh;
          const mem = (x + k) % 2 === 0 ? look.fin : adj(look.fin, 0.09);
          g.set(
            rx,
            Math.round(yt) - k,
            look.skeleton ? bone : isSpine ? finHi : mem
          );
        }
      }
      // Small second (adipose/soft) dorsal fin near peduncle for stream/shark fish
      if (look.len >= 18) {
        for (let x = xPed + 2; x <= xPed + Math.round(look.len * 0.2); x++) {
          const u = (x - xPed) / Math.max(1, look.len - 1);
          const [yt] = profile(u);
          const hh = Math.max(1, Math.round(dorsalH * 0.38));
          for (let k = 1; k <= hh; k++) {
            g.set(x - Math.floor(k * 0.4), Math.round(yt) - k, look.skeleton ? bone : look.fin);
          }
        }
      }
    }
  }

  // Anal fin (swept back under rear belly, u=0.18..0.38) & Pelvic fin (under chest, u=0.52..0.66)
  if (shape !== "eel") {
    for (let x = xPed; x <= xSnout; x++) {
      const u = (x - xPed) / Math.max(1, look.len - 1);
      const [, yb] = profile(u);
      // Anal fin
      if (u >= 0.16 && u <= 0.36) {
        const f = (u - 0.16) / 0.2;
        const hh = Math.max(1, Math.round(ventralH * Math.sin(f * Math.PI)));
        for (let k = 1; k <= hh; k++) {
          g.set(
            x - Math.floor(k * 0.5),
            Math.round(yb) + k,
            look.skeleton ? bone : k === hh ? finHi : look.fin
          );
        }
      }
      // Pelvic fin
      if (u >= 0.5 && u <= 0.64 && look.len >= 16) {
        const f = (u - 0.5) / 0.14;
        const hh = Math.max(1, Math.round(ventralH * 0.95 * Math.sin(f * Math.PI)));
        for (let k = 1; k <= hh; k++) {
          g.set(
            x - Math.floor(k * 0.6),
            Math.round(yb) + k,
            look.skeleton ? bone : k === hh ? finHi : finDark
          );
        }
      }
    }
  }

  // 3) MAIN STREAMLINED BODY + HINGED JAW CAVITY
  const bigJaw = look.mouth === "huge" || look.mouth === "teeth" || look.mouth === "grin";
  const jawStartU = look.mouth === "huge" ? 0.58 : look.mouth === "grin" ? 0.48 : 0.72;

  for (let x = xPed; x <= xSnout; x++) {
    const u = (x - xPed) / Math.max(1, look.len - 1);
    const [ytF, ybF, yMid] = profile(u);
    const yt = Math.round(ytF);
    const yb = Math.round(ybF);
    const span = Math.max(1, yb - yt);

    for (let y = yt; y <= yb; y++) {
      const dy = (y - yMid) / Math.max(1, span * 0.5); // -1 at dorsal, +1 at ventral
      if (look.skeleton) {
        const onSpine = Math.abs(y - yMid) <= 0.7;
        const rib = (x - xPed) % 3 === 1 && Math.abs(dy) < 0.82 && u < 0.68;
        const skull = u >= 0.68 && dy < 0.55;
        const tailBone = u < 0.18 && Math.abs(y - yMid) <= 1.1;
        if (onSpine || rib || skull || tailBone) {
          g.set(x, y, rib && !onSpine ? adj(bone, -0.14) : bone);
        }
        continue;
      }

      // Rich counter-shading: dark back -> mid flank -> pale belly in soft bands
      let col: string;
      if (dy < -0.62) col = adj(look.dark, -0.08);
      else if (dy < -0.38) col = look.dark;
      else if (dy < -0.05) col = look.body;
      else if (dy < 0.32) col = adj(look.body, 0.06);
      else if (dy < 0.62) col = look.belly;
      else col = adj(look.belly, -0.06);
      if (look.stripes && (x - xPed) % 5 === 2 && dy < 0.45 && u < 0.72) col = look.stripes;
      if (look.spots && rnd() < 0.11 && dy < 0.25) col = look.spots;

      // Diamond scale texture with shimmer + edge shadow
      let amt = 0;
      const sx = x - xPed;
      if (look.len >= 14 && u > 0.1 && u < 0.74 && dy > -0.6 && dy < 0.5) {
        const row = (y & 1) === 0;
        const cell = (sx + ((y >> 1) & 1) * 2) % 4;
        if (row && cell === 0) amt += 0.14;
        else if (row && cell === 3) amt -= 0.1;
      }
      // Lateral line: pale dotted dashes along the flank
      const latY = yMid - span * 0.08 + Math.sin(u * Math.PI) * 0.6;
      if (look.len >= 16 && u > 0.08 && u < 0.68 && Math.abs(y - latY) < 0.55 && x % 3 === 0) {
        amt += 0.22;
      }
      // Organic speckle for texture
      if (rnd() < 0.05) amt += rnd() < 0.5 ? 0.08 : -0.08;
      if (dy > 0.78) amt -= 0.2;
      if (dy < -0.78) amt += 0.1;
      g.set(x, y, amt ? adj(col, amt) : col);
    }
  }

  // 4) HINGED PREDATOR JAW & MOUTH (angled V-cleft + distinct lower jawbone, never floating bars!)
  const my = Math.round(cy + ry * 0.18);
  const tooth = "#f2efe0";
  if (look.mouth === "small") {
    // Clean diagonal mouth slit at snout tip
    g.setIf(xSnout, my, "#140b14");
    g.setIf(xSnout - 1, my, "#140b14");
    g.setIf(xSnout - 2, my + 1, "#241420");
  } else if (bigJaw) {
    const xHinge = xPed + Math.round(look.len * jawStartU);
    const jawLen = Math.max(4, xSnout - xHinge);
    const maxOpen =
      look.mouth === "huge"
        ? Math.max(3, Math.round(ry * 0.65))
        : look.mouth === "grin"
        ? 2
        : Math.max(2, Math.round(ry * 0.38));

    for (let x = xHinge; x <= xSnout; x++) {
      const t = (x - xHinge) / jawLen; // 0 at hinge, 1 at snout tip
      const cleftY = Math.round(my + (1 - t) * 1.5);
      const openTop = cleftY - Math.round(t * maxOpen * 0.55);
      const openBot = cleftY + Math.round(t * maxOpen * 0.75);

      // Carve interior gullet cavity (dark throat -> deep red gullet)
      for (let y = openTop; y <= openBot; y++) {
        const depth = (y - openTop) / Math.max(1, openBot - openTop);
        g.set(x, y, depth < 0.35 ? "#18040a" : depth < 0.7 ? "#3a0914" : "#4e0e1e");
      }
      // Tongue hint inside huge grins
      if (look.mouth === "huge" && t > 0.3 && t < 0.85) {
        g.set(x, openBot - 1, "#8a1e32");
      }
      // Draw hinged lower jawbone under the cavity so teeth sit ON a real jaw
      const jawThick = Math.max(1, Math.round(2.2 - t * 0.8));
      for (let k = 1; k <= jawThick; k++) {
        g.set(x, openBot + k, look.skeleton ? bone : k === jawThick ? look.dark : look.belly);
      }

      // Angled inward-pointing teeth inside the V-jaws
      if (t > 0.15 && (x - xHinge) % 2 === 0) {
        const fangH =
          look.fangs && (x >= xSnout - 3 || x === xSnout - 5)
            ? Math.min(openBot - openTop, 3)
            : 1;
        for (let k = 0; k < fangH; k++) {
          g.set(x, openTop + k, tooth);
          if (fangH >= 3 && k === 0) g.set(x - 1, openTop + k, adj(tooth, -0.18));
        }
      }
      if (t > 0.2 && (x - xHinge) % 2 === 1) {
        const fangH = look.fangs && x >= xSnout - 2 ? Math.min(openBot - openTop, 2) : 1;
        for (let k = 0; k < fangH; k++) {
          g.set(x, openBot - k, tooth);
          if (fangH >= 2 && k === 0) g.set(x - 1, openBot - k, adj(tooth, -0.18));
        }
      }
    }
  }

  if (look.stitched) {
    for (let i = 1; i <= 8; i += 2) {
      g.setIf(xSnout - i, my - 1, "#d8d0b0");
      g.setIf(xSnout - i, my, "#240a12");
      g.setIf(xSnout - i, my + 1, "#d8d0b0");
      g.setIf(xSnout - i - 1, my - 1, "#a89e7e");
      g.setIf(xSnout - i - 1, my + 1, "#a89e7e");
    }
  }

  // 5) OPERCULUM (GILL COVER) + SWEPT PECTORAL FIN
  if (!look.skeleton && look.len >= 15) {
    const gx = xPed + Math.round(look.len * 0.67);
    const [yt, yb, ym] = profile(0.67);
    for (let y = Math.round(yt) + 2; y <= Math.round(yb) - 2; y++) {
      const curve = Math.round(Math.pow((y - ym) / Math.max(1, ry), 2) * 1.8);
      g.setIf(gx - curve, y, look.mouth === "huge" || look.fangs ? "#6e1426" : adj(look.dark, -0.28));
      g.setIf(gx - curve - 2, y, adj(look.dark, -0.14));
    }
    // Swept pectoral fin behind gill cover
    if (shape !== "eel") {
      const px = gx - 2;
      const py = Math.round(ym + ry * 0.22);
      const plen = Math.max(3, Math.round(look.len * 0.18));
      for (let i = 0; i < plen; i++) {
        const pyRow = py + Math.floor(i * 0.35);
        g.setIf(px - i, pyRow, i === 0 ? finHi : i % 2 === 0 ? look.fin : adj(look.fin, 0.1));
        g.setIf(px - i, pyRow + 1, finDark);
      }
    }
  }

  // Bioluminescent belly photophores (lantern eel & deep fish)
  if (look.glow && !look.lure) {
    for (let x = xPed + 3; x < xSnout - 4; x += 4) {
      const u = (x - xPed) / Math.max(1, look.len - 1);
      const [, yb, ym] = profile(u);
      g.setIf(x, Math.round((ym + yb) * 0.5), look.glow);
      g.setIf(x + 2, Math.round((ym + yb) * 0.5) + 1, adj(look.glow, -0.2));
    }
  }

  // Barbels / whiskers on chin
  if (look.whiskers) {
    const [, yb] = profile(0.86);
    const wy = Math.round(yb);
    for (const [dx, dy] of [
      [-1, 1],
      [-2, 2],
      [-3, 3],
      [-4, 3],
      [-4, 1],
      [-5, 2],
      [-6, 3],
      [-7, 3],
      [-8, 2],
    ]) {
      g.set(xSnout + dx, wy + dy, look.fin);
    }
    for (const [dx, dy] of [
      [-2, 1],
      [-3, 2],
      [-4, 2],
      [-5, 1],
    ]) {
      g.set(xSnout + dx, wy + dy, adj(look.fin, -0.2));
    }
  }

  // 6) EYES (positioned naturally on upper-front head above the jaw)
  const ex = xPed + Math.round(look.len * 0.79);
  const [eyTop, , eyMid] = profile(0.79);
  const ey = Math.max(Math.round(eyTop) + 2, Math.round(eyMid - ry * 0.25));
  let eyeColor: string | null = null;
  let eyeX = ex;
  switch (look.eye) {
    case "dot":
      g.rect(ex, ey, 2, 2, "#f4f4f0");
      g.set(ex + 1, ey, "#0a0a12");
      g.set(ex, ey, "#ffffff");
      eyeColor = "#9fe8ff";
      break;
    case "white":
      if (look.len >= 24) {
        g.rect(ex - 1, ey - 1, 3, 3, "#dffcff");
        g.set(ex, ey, "#06161c");
        g.set(ex - 1, ey - 1, "#ffffff");
        eyeX = ex - 1;
      } else g.rect(ex, ey, 2, 2, "#e6ffff");
      eyeColor = "#e6ffff";
      break;
    case "big":
      g.rect(ex - 1, ey - 1, 3, 3, "#f4f4f0");
      g.set(ex, ey, "#0a0a12");
      g.set(ex + 1, ey - 1, "#c8c8c0");
      g.set(ex - 1, ey - 1, "#ffffff");
      eyeColor = "#ffffff";
      eyeX = ex - 1;
      break;
    case "none":
      g.rect(ex - 1, ey - 1, 3, 3, "#040508");
      g.setIf(ex - 2, ey, "#5a5046");
      g.setIf(ex + 2, ey, "#5a5046");
      eyeX = ex - 1;
      break;
    case "red":
      g.rect(ex - 1, ey - 1, 3, 3, "#8a0f1c");
      g.set(ex, ey, "#ff6a5a");
      g.set(ex - 1, ey - 1, "#ffb0a0");
      eyeColor = "#ff3b3b";
      eyeX = ex - 1;
      break;
    case "many":
      for (const [dx, dy] of [
        [0, 0],
        [-3, -1],
        [1, 2],
        [-5, 1],
        [-2, 2],
      ])
        g.set(ex + dx, ey + dy, "#ffe27a");
      eyeColor = "#ffe27a";
      break;
  }

  // 7) ANGLER ILLICIUM (curved lure stalk arching from forehead in front of snout)
  let lure: { x: number; y: number } | undefined;
  if (look.lure) {
    const sx = xPed + Math.round(look.len * 0.68);
    let sy = 0;
    while (sy < h && !g.get(sx, sy)) sy++;
    const bx = Math.min(w - 3, xSnout + 1);
    const by = Math.max(2, sy - 4);
    const cpx = Math.round((sx + bx) * 0.5);
    const cpy = Math.max(1, sy - 8);
    for (let i = 0; i <= 16; i++) {
      const t = i / 16;
      const lx = (1 - t) * (1 - t) * sx + 2 * (1 - t) * t * cpx + t * t * bx;
      const ly = (1 - t) * (1 - t) * sy + 2 * (1 - t) * t * cpy + t * t * by;
      g.set(lx, ly, "#395266");
    }
    g.rect(bx - 1, by - 1, 3, 3, look.glow || "#9dfcff");
    g.set(bx, by, "#ffffff");
    // soft halo around the bulb
    const halo = look.glow || "#9dfcff";
    g.set(bx - 2, by, halo);
    g.set(bx + 2, by, halo);
    g.set(bx, by - 2, halo);
    g.set(bx, by + 2, halo);
    lure = { x: bx, y: by };
  }

  g.outline(OUT);
  return {
    c: g.canvas(),
    w,
    h,
    eye: { x: eyeX, y: ey },
    eyeColor,
    mouth: { x: xSnout, y: my },
    lure,
    glow: look.glow,
  };
}

const fishCache = new Map<string, FishSprite>();
export function fishSprite(id: string, look: FishLook): FishSprite {
  let s = fishCache.get(id);
  if (!s) {
    s = makeFish(look);
    fishCache.set(id, s);
  }
  return s;
}

// ---------------------------------------------------------------- BOAT

export const BOAT = {
  w: 58,
  h: 36,
  waterY: 25,
  hand: { x: 33, y: 13 },
  lamp: { x: 5, y: 6 },
};

let boatC: HTMLCanvasElement | null = null;
export function boatSprite(): HTMLCanvasElement {
  if (boatC) return boatC;
  const g = new Grid(BOAT.w, BOAT.h);
  const half = 28;
  const chx = 28.5;
  for (let x = 1; x < 57; x++) {
    const raise = x < 6 ? Math.round((6 - x) * 0.55) : x > 51 ? Math.round((x - 51) * 0.55) : 0;
    const top = 19 - raise;
    const nx = (x + 0.5 - chx) / half;
    const bottom = 19 + Math.round(9 * Math.sqrt(Math.max(0, 1 - nx * nx)));
    for (let y = top; y <= bottom; y++) {
      let c = "#6a4326";
      const r = y - 19;
      if (r >= 0 && r % 3 === 2) c = "#4b2e19";
      if (y === top) c = "#c48a4a";
      else if (y === top + 1) c = "#86593a";
      if (x % 9 === 4 && y > top + 1) c = "#4b2e19";
      if (y === bottom) c = "#3a2412";
      g.set(x, y, c);
    }
    // nail dots along the plank seams
    if (x % 9 === 4) g.set(x, top + 2, "#2b1a0c");
  }
  // deck planks
  g.rect(20, 17, 12, 2, "#8a5e36");
  g.rect(20, 18, 12, 1, "#6e482a");
  // crate with shading
  g.rect(38, 13, 8, 5, "#7a5430");
  g.rect(38, 13, 8, 1, "#9a6c3c");
  g.rect(41, 13, 1, 5, "#4b2e19");
  g.rect(38, 15, 8, 1, "#4b2e19");
  g.rect(38, 17, 8, 1, "#5e4022");
  // bucket
  g.rect(48, 15, 4, 4, "#5a6a72");
  g.rect(48, 15, 4, 1, "#8aa0ac");
  g.set(49, 17, "#3a464c");
  // rope coil
  g.rect(13, 16, 5, 3, "#a89060");
  g.set(14, 17, "#6e5a38");
  g.set(16, 17, "#6e5a38");
  // fisherman's seat + body
  g.rect(28, 14, 6, 3, "#2b3a52");
  g.rect(33, 15, 2, 3, "#1a1a20");
  g.rect(22, 10, 8, 8, "#e3a92b");
  g.rect(28, 10, 2, 8, "#b8821a");
  g.rect(22, 15, 8, 1, "#b8821a");
  g.rect(22, 11, 8, 1, "#f0c040");
  // head + hat
  g.rect(23, 6, 5, 4, "#e2bd9d");
  g.set(26, 7, "#1a1a22");
  g.set(27, 9, "#b88f74");
  g.set(24, 7, "#c89a7a");
  g.rect(21, 5, 9, 1, "#c4891a");
  g.rect(23, 2, 5, 3, "#d9a02a");
  g.rect(23, 4, 5, 1, "#8c5e12");
  g.set(25, 3, "#f0d060");
  // arm + rod hand
  g.line(28, 12, 33, 13, "#e3a92b");
  g.line(28, 13, 32, 14, "#b8821a");
  g.set(33, 13, "#e2bd9d");
  // lantern post + lamp + halo
  g.rect(5, 9, 1, 10, "#2b2118");
  g.rect(3, 3, 5, 1, "#2b2118");
  g.rect(3, 4, 1, 5, "#2b2118");
  g.rect(7, 4, 1, 5, "#2b2118");
  g.rect(3, 9, 5, 1, "#2b2118");
  g.rect(4, 4, 3, 5, "#ffcf5a");
  g.rect(5, 5, 1, 3, "#fff6c8");
  g.set(4, 3, "#ffcf5a");
  g.set(6, 3, "#ffcf5a");
  g.set(3, 6, "#ffcf5a");
  g.set(7, 6, "#ffcf5a");
  // little pennant flag on the stern
  g.rect(52, 10, 1, 9, "#2b2118");
  g.rect(53, 10, 4, 2, "#c03040");
  g.rect(53, 12, 3, 1, "#8a1a28");
  g.outline("#0a0710");
  boatC = g.canvas();
  return boatC;
}

// ---------------------------------------------------------------- LURKER (Abyssal Goblin-Viper Stalker Fish)

const lurkerCache: HTMLCanvasElement[] = [];
export const LURKER = {
  w: 44,
  h: 24,
  eyeL: { x: 31, y: 8 },
  eyeR: { x: 35, y: 9 },
};

/**
 * Draws a terrifying deep-sea Goblin-Shark / Viper-Eel predator fish facing RIGHT (`x=43` snout).
 * Rendered with a sinuous tail, swept dorsal spines, glowing crimson eyes, and snapping needle jaws.
 */
export function lurkerSprite(frame: number): HTMLCanvasElement {
  frame = frame & 1;
  if (lurkerCache[frame]) return lurkerCache[frame];
  const g = new Grid(LURKER.w, LURKER.h);
  const cy = 12;

  // Forked tattered caudal fin (x = 1..8)
  for (let x = 1; x <= 8; x++) {
    const t = (8 - x) / 7;
    const half = 1.5 + t * 6.5;
    const notch = t > 0.35 ? (t - 0.35) * 6 : 0;
    for (let y = Math.round(cy - half); y <= Math.round(cy + half); y++) {
      const d = Math.abs(y - cy);
      if (d < notch) continue;
      const ray = Math.round(d) % 2 === 0;
      g.set(x, y, ray ? "#4a2238" : "#2b1424");
      if (t > 0.85 && d > half - 1.5) g.set(x, y, "#c890a8");
    }
  }

  // Sinuous predator body + goblin-shark blade rostrum (snout)
  for (let x = 8; x <= 42; x++) {
    const u = (x - 8) / 34; // 0 at peduncle, 1 at snout tip
    const wave = Math.sin(u * Math.PI * 2 + frame * 1.4) * (1 - u) * 1.6;
    const ym = cy + wave;
    const topH =
      u < 0.2
        ? 1.6 + (u / 0.2) * 3.8
        : u < 0.72
        ? 5.4 - (u - 0.2) * 1.2
        : Math.max(0.8, (1 - u) / 0.28 * 4.6);
    const botH =
      u < 0.2
        ? 1.5 + (u / 0.2) * 3.2
        : u < 0.62
        ? 4.7
        : Math.max(0.5, (1 - (u - 0.62) / 0.38) * 4.5);

    const yt = Math.round(ym - topH);
    const yb = Math.round(ym + botH);

    // Swept dorsal spines
    if (u > 0.22 && u < 0.68 && x % 2 === 0) {
      const sh = u < 0.5 ? 3 : 4;
      for (let k = 1; k <= sh; k++) {
        g.set(x - Math.floor(k * 0.5), yt - k, k === sh ? "#c890a8" : "#4a2238");
      }
    }

    for (let y = yt; y <= yb; y++) {
      const dy = (y - ym) / Math.max(1, topH);
      // Translucent corpse-pale deep-sea flesh with dark spine & crimson ribs
      let col =
        dy < -0.55 ? "#2a3a48" : dy < -0.35 ? "#354654" : dy > 0.55 ? "#5e707c" : dy > 0.4 ? "#70828c" : "#9cb0b8";
      if (u < 0.68 && x % 3 === 0 && Math.abs(dy) < 0.55) col = "#542232";
      // scale shimmer
      if (u > 0.15 && u < 0.7 && ((x + ((y >> 1) & 1) * 2) % 4 === 0) && (y & 1) === 0) col = adj(col, 0.1);
      g.set(x, y, col);
    }
  }

  // Gaping protrusible goblin-shark jaws (x = 28..40)
  const jawOpen = frame === 0 ? 3 : 5;
  for (let x = 28; x <= 39; x++) {
    const t = (x - 28) / 11;
    const topY = 11;
    const botY = 12 + Math.round(t * jawOpen);
    for (let y = topY; y <= botY; y++) {
      const depth = (y - topY) / Math.max(1, botY - topY);
      g.set(x, y, depth < 0.4 ? "#1c040a" : "#3a0914");
    }
    g.set(x, botY + 1, "#6b7c85");
    if (x % 2 === 0) {
      g.set(x, topY, "#f2efe0");
      g.set(x, topY + 1, "#f2efe0");
      g.set(x, botY, "#f2efe0");
      g.set(x - 1, topY, adj("#f2efe0", -0.18));
    }
  }

  // Twin glowing crimson predator eyes + gill slits
  g.rect(30, 7, 3, 3, "#140206");
  g.set(31, 8, "#ff3b3b");
  g.set(30, 7, "#ffb0a0");
  g.rect(34, 8, 2, 2, "#140206");
  g.set(35, 9, "#ff3b3b");
  g.set(34, 8, "#ffb0a0");
  for (let k = 0; k < 3; k++) g.line(25 - k * 2, 9, 24 - k * 2, 14, "#5e1020");

  g.outline("#04060a");
  lurkerCache[frame] = g.canvas();
  return lurkerCache[frame];
}

// ---------------------------------------------------------------- BOSS (THE LEVIATHAN - Full-Body Monster Fish)

export const BOSS = {
  w: 168,
  h: 106,
  cx: 84,
  cy: 56,
  hook: { x: 22, y: 66 },
  mouth: { x: 16, y: 58 },
  eye: { x: 36, y: 42 },
  lure: { x: 6, y: 24 },
};

/** Boss sprite faces LEFT (`x=6` snout, `x=166` tail fin). `dir=+1` mirrors it to face RIGHT. */
export function bossPt(p: { x: number; y: number }, dir: number) {
  return { x: dir < 0 ? p.x : BOSS.w - p.x, y: p.y };
}

const bossCache = new Map<string, HTMLCanvasElement>();

/**
 * Renders the Leviathan as a complete, unmistakable giant deep-sea monster fish:
 * - Pointed armored snout & hinged lower jaw that rotates open (`open = 0, 1, 2`)
 * - Swept-back spiny dorsal sail & secondary dorsal fin (never vertical pillars)
 * - Muscular scaled fish trunk with lateral line of glowing pores, gill slits & pectoral/pelvic/anal fins
 * - Narrow caudal peduncle (tail wrist) flaring into a huge crescent forked tail fin.
 */
export function bossSprite(open: number, enraged: boolean): HTMLCanvasElement {
  open = Math.max(0, Math.min(2, Math.round(open)));
  const key = open + (enraged ? "r" : "n");
  const hit = bossCache.get(key);
  if (hit) return hit;

  const rnd = mulberry32(77);
  const g = new Grid(BOSS.w, BOSS.h);

  const tones = enraged
    ? ["#1b0b16", "#311528", "#4e223a"]
    : ["#0b1722", "#162b3e", "#284764"];
  const bellyCol = enraged ? "#6e3848" : "#4b6878";
  const finCol = enraged ? "#461834" : "#272244";
  const finRay = enraged ? "#b44a68" : "#6c62a8";
  const bone = "#ece6cf";
  const boneS = "#aba388";

  // Anatomy coordinates along X (facing LEFT: x=6 is snout tip, x=126 is caudal peduncle, x=165 is tail tip)
  const xSnout = 7;
  const xHinge = 54;
  const xPed = 128;
  const xTail = 165;
  const cy = 54;

  // Trunk contour for x in [xSnout .. xPed]
  const bodyContour = (x: number): [number, number] => {
    const u = (x - xSnout) / (xPed - xSnout); // 0 = snout tip, 1 = caudal peduncle
    let topH: number;
    let botH: number;
    if (u < 0.42) {
      // Snout to shoulder: sleek predatory wedge rising to a high muscular shoulder
      const t = u / 0.42;
      topH = 4 + Math.pow(t, 0.72) * 25;
      botH = 4 + Math.pow(t, 0.78) * 23;
    } else if (u < 0.78) {
      // Mid-body arch
      const t = (u - 0.42) / 0.36;
      topH = 29 - t * t * 9;
      botH = 27 - t * t * 9;
    } else {
      // Tapering down to the narrow caudal peduncle (tail wrist = 7px half-height)
      const t = (u - 0.78) / 0.22;
      topH = 20 - (20 - 7) * (t * (2 - t));
      botH = 18 - (18 - 7) * (t * (2 - t));
    }
    return [cy - topH, cy + botH];
  };

  // 1) MASSIVE FORKED CAUDAL (TAIL) FIN (x = xPed .. xTail)
  for (let x = xPed - 2; x <= xTail; x++) {
    const t = Math.max(0, (x - xPed) / (xTail - xPed)); // 0 at wrist, 1 at tail tips
    // Swept crescent lobes flaring from 7px at the wrist to 35px at the tips
    const sweep = Math.pow(t, 0.88) * 29;
    const outerHalf = 7 + sweep;
    // Deep V-fork carved out after t > 0.28
    const forkHalf = t > 0.28 ? Math.pow((t - 0.28) / 0.72, 1.05) * 24 : 0;
    const y0 = Math.round(cy - outerHalf);
    const y1 = Math.round(cy + outerHalf);
    for (let y = y0; y <= y1; y++) {
      const d = Math.abs(y - cy);
      if (d < forkHalf) continue;
      // Tattered notches on trailing edge
      if (t > 0.85 && Math.floor(d) % 6 === 3) continue;
      const isRay = Math.round(d - t * 6) % 4 === 0;
      const isEdge = d >= outerHalf - 1.5;
      g.set(x, y, isEdge ? boneS : isRay ? finRay : finCol);
    }
  }

  // 2) SWEPT-BACK DORSAL FINS, PELVIC FIN & ANAL FIN (drawn with diagonal backward rays!)
  // Primary spiny dorsal sail (x = 52 .. 102)
  for (let x = 52; x <= 104; x++) {
    const f = (x - 52) / 52; // 0 = front of dorsal, 1 = rear of dorsal
    const [yt] = bodyContour(x);
    const maxH = Math.round(22 * Math.sin(Math.pow(f, 0.65) * Math.PI));
    // Scalloped membrane between spines
    const spineDist = (x - 52) % 8;
    const memH = Math.max(0, maxH - (spineDist === 0 || spineDist === 7 ? 0 : 3));
    for (let k = 1; k <= memH; k++) {
      const rx = x + Math.floor(k * 0.48); // slants backward toward tail (right)
      g.set(rx, Math.round(yt) - k, finCol);
    }
    if (spineDist === 0 && maxH >= 5) {
      for (let k = 1; k <= maxH + 3; k++) {
        const rx = x + Math.floor(k * 0.48);
        const col = k > maxH ? bone : finRay;
        g.set(rx, Math.round(yt) - k, col);
        g.set(rx + 1, Math.round(yt) - k, k > maxH ? boneS : finCol);
      }
    }
  }

  // Secondary soft dorsal fin (x = 108 .. 123)
  for (let x = 108; x <= 123; x++) {
    const f = (x - 108) / 15;
    const [yt] = bodyContour(x);
    const hh = Math.round(10 * Math.sin(f * Math.PI));
    for (let k = 1; k <= hh; k++) {
      const rx = x + Math.floor(k * 0.5);
      g.set(rx, Math.round(yt) - k, (x + k) % 3 === 0 ? finRay : finCol);
    }
  }

  // Ventral Anal fin (x = 102 .. 120) & Pelvic fin (x = 76 .. 94)
  for (let x = 76; x <= 120; x++) {
    const [, yb] = bodyContour(x);
    if (x >= 76 && x <= 94) {
      const f = (x - 76) / 18;
      const hh = Math.round(13 * Math.sin(f * Math.PI));
      for (let k = 1; k <= hh; k++) {
        const rx = x + Math.floor(k * 0.55);
        g.set(rx, Math.round(yb) + k, k >= hh - 1 ? boneS : (x + k) % 3 === 0 ? finRay : finCol);
      }
    }
    if (x >= 102 && x <= 120) {
      const f = (x - 102) / 18;
      const hh = Math.round(11 * Math.sin(f * Math.PI));
      for (let k = 1; k <= hh; k++) {
        const rx = x + Math.floor(k * 0.5);
        g.set(rx, Math.round(yb) + k, (x + k) % 3 === 0 ? finRay : finCol);
      }
    }
  }

  // 3) MAIN SCALED FISH TRUNK & HINGED PREDATOR JAWS
  // Jaw opening angle (`open = 0, 1, 2`): upper jaw runs from snout (7,50) to hinge (54,58).
  // Lower jaw rotates down around hinge (54,60) by `jawDrop` pixels at the chin!
  const jawDrop = [3, 13, 25][open];
  const upperJawY = (x: number) => 49 + ((x - xSnout) / (xHinge - xSnout)) * 9;
  const lowerJawTopY = (x: number) =>
    53 + jawDrop * (1 - (x - xSnout) / (xHinge - xSnout)) + ((x - xSnout) / (xHinge - xSnout)) * 7;

  const scaleBody = (x: number, y: number, yt: number, yb: number) => {
    const dy = (y - cy) / Math.max(1, (yb - yt) * 0.5);
    let c = dy < -0.36 ? tones[2] : dy > 0.45 ? bellyCol : dy > 0.18 ? tones[0] : tones[1];
    // Diamond fish scale pattern across the trunk
    let amt = 0;
    if (x > 46 && x < 124 && dy > -0.55 && dy < 0.45) {
      const cell = (x + ((y >> 2) & 1) * 3) % 6;
      if (cell === 0 && y % 4 === 1) amt = 0.18;
      else if (cell === 5 && y % 4 === 1) amt = -0.12;
    }
    if (dy > 0.72) amt -= 0.22;
    if (rnd() < 0.015) amt -= 0.28;
    if (rnd() < 0.02) amt += 0.1;
    return amt ? adj(c, amt) : c;
  };

  for (let x = xSnout; x <= xPed; x++) {
    const [ytF, ybF] = bodyContour(x);
    const yt = Math.round(ytF);
    const yb = Math.round(ybF);

    if (x >= xHinge) {
      for (let y = yt; y <= yb; y++) {
        g.set(x, y, scaleBody(x, y, yt, yb));
      }
    } else {
      // Head region (`xSnout .. xHinge`): split into upper skull/snout, mouth cavity, and hinged lower jawbone
      const yUp = Math.round(upperJawY(x));
      const yLow = Math.round(lowerJawTopY(x));
      const t = (x - xSnout) / (xHinge - xSnout); // 0 at snout tip, 1 at hinge
      // Upper head / armored snout
      for (let y = yt; y <= yUp; y++) {
        const isBrowPlate = y < yt + 4 && x > 14 && x < 50;
        g.set(x, y, isBrowPlate ? adj(tones[2], 0.15) : scaleBody(x, y, yt, yb));
      }
      // Interior mouth gullet cavity (V-shaped between jaws)
      if (x >= xSnout + 2) {
        for (let y = yUp + 1; y < yLow; y++) {
          const gullet = x > 38 ? "#090208" : y > (yUp + yLow) * 0.55 ? "#4e0e1e" : "#1c040c";
          g.set(x, y, gullet);
        }
      }
      // Hinged lower jawbone (tapers toward chin tip, blends seamlessly into throat at xHinge)
      if (x >= xSnout + 2) {
        const hingeTargetBot = Math.max(yLow + 5, yb);
        const jawBot = Math.round(
          (yLow + 3 + t * 5) * (1 - t * t) + hingeTargetBot * (t * t)
        );
        for (let y = yLow; y <= jawBot; y++) {
          const isEdge = y === yLow || y === jawBot;
          g.set(x, y, isEdge ? tones[0] : y > jawBot - 3 ? bellyCol : tones[1]);
        }
      }
    }
  }

  // Muscular tongue inside open maw
  if (open >= 1) {
    for (let x = 22; x <= 46; x++) {
      const yLow = Math.round(lowerJawTopY(x));
      g.set(x, yLow - 1, "#8a1e32");
      g.set(x, yLow - 2, "#a82a40");
    }
  }

  // 4) ANGLED TRIANGULAR PREDATOR FANGS (slanted backward into the gullet!)
  for (let i = 0; i < 9; i++) {
    const x = xSnout + 3 + i * 5;
    if (x >= xHinge - 2) break;
    const yUp = Math.round(upperJawY(x));
    const yLow = Math.round(lowerJawTopY(x));
    const room = Math.max(2, yLow - yUp);
    const upLen = Math.min(room - 1, i === 1 || i === 3 ? 9 : 4 + (i % 2) * 2);
    for (let k = 0; k < upLen; k++) {
      const rx = x + Math.floor(k * 0.25); // curves inward toward throat
      g.set(rx, yUp + k, bone);
      if (k < upLen * 0.55) g.set(rx + 1, yUp + k, boneS);
    }
    const lowX = x + 2;
    if (lowX < xHinge - 2) {
      const yLow2 = Math.round(lowerJawTopY(lowX));
      const lowLen = Math.min(room - 1, i === 0 || i === 2 ? 8 : 4 + ((i + 1) % 2) * 2);
      for (let k = 0; k < lowLen; k++) {
        const rx = lowX + Math.floor(k * 0.25);
        g.set(rx, yLow2 - k, bone);
        if (k < lowLen * 0.55) g.set(rx + 1, yLow2 - k, boneS);
      }
    }
  }

  // 5) ARMORED OPERCULUM, BLEEDING GILL SLITS, LATERAL LINE & SWEPT PECTORAL FIN
  // Curved gill slits (x = 58 .. 68)
  for (let k = 0; k < 4; k++) {
    for (let y = 38; y <= 68; y++) {
      const curve = Math.round(Math.pow((y - 53) / 15, 2) * 3);
      const gx = 58 + k * 3 + curve;
      g.setIf(gx, y, k === 0 ? "#06040a" : "#7e162c");
      g.setIf(gx + 1, y, "#06040a");
      if (k === 3) g.setIf(gx + 2, y, "#a82a40");
    }
  }

  // Bioluminescent lateral line pores from gill cover to caudal peduncle
  const poreCol = enraged ? "#ff5a4a" : "#7de8ff";
  for (let x = 68; x <= 126; x += 5) {
    const py = Math.round(cy - 3 + Math.sin(((x - 68) / 58) * Math.PI) * 2);
    g.setIf(x, py, poreCol);
    g.setIf(x + 1, py, "#ffffff");
  }

  // Swept-back Pectoral Fin behind gills (x = 62 .. 86, y = 60 .. 76)
  for (let dx = 0; dx <= 22; dx++) {
    const px = 62 + dx;
    const topY = 60 + Math.floor(dx * 0.22);
    const botY = 64 + Math.floor(dx * 0.52) - Math.max(0, (dx - 16) * 2);
    for (let y = topY; y <= botY; y++) {
      const isRay = (dx + y) % 3 === 0;
      g.set(px, y, dx >= 20 ? boneS : isRay ? finRay : finCol);
    }
  }

  // Battle scars & broken harpoon/hooks in snout
  g.line(82, 40, 94, 62, "#6a1624");
  g.line(87, 38, 99, 58, "#6a1624");
  for (const [hx, hy] of [
    [16, 46],
    [28, 42],
  ]) {
    for (let k = 1; k <= 4; k++) g.set(hx, hy - k, "#c8d0d4");
    g.set(hx + 1, hy + 1, "#a0a6aa");
    g.set(hx + 2, hy, "#a0a6aa");
  }

  // 6) PREDATOR EYE CLUSTER (Primary slit eye + 2 smaller abyssal eyes behind it)
  const ex = BOSS.eye.x;
  const ey = BOSS.eye.y;
  const sclera = enraged ? "#ff6a4a" : "#e9d36b";
  const ring = enraged ? "#a8201a" : "#b88a1a";
  g.ellipse(ex, ey, 7.5, 6, (x, y) => {
    const nx = (x + 0.5 - ex) / 7.5;
    const ny = (y + 0.5 - ey) / 6;
    return nx * nx + ny * ny > 0.58 ? ring : sclera;
  });
  for (let y = ey - 5; y <= ey + 4; y++) {
    g.set(ex, y, "#0b0204");
    if (Math.abs(y - ey) <= 2) g.set(ex - 1, y, "#0b0204");
  }
  g.set(ex - 3, ey - 2, "#ffffff");
  g.set(ex + 2, ey + 2, "#ffffff");
  // Armored brow ridge slanting menacingly forward
  for (let dx = -8; dx <= 8; dx++) {
    const yb = ey - 6 + Math.round(((8 - dx) / 16) * 3);
    g.set(ex + dx, yb, "#080c14");
    g.set(ex + dx, yb - 1, tones[2]);
  }
  // Secondary smaller eyes
  for (const [sx, sy, r] of [
    [48, 37, 2.6],
    [51, 45, 2.2],
  ] as [number, number, number][]) {
    g.ellipse(sx, sy, r, r, sclera);
    g.set(sx, sy, "#0b0204");
  }

  // 7) ANGLERFISH ILLICIUM (Lure stalk arching from forehead to in front of snout)
  const P0 = [32, 33];
  const P1 = [14, 6];
  const P2 = [BOSS.lure.x, BOSS.lure.y];
  for (let i = 0; i <= 45; i++) {
    const t = i / 45;
    const x = (1 - t) * (1 - t) * P0[0] + 2 * (1 - t) * t * P1[0] + t * t * P2[0];
    const y = (1 - t) * (1 - t) * P0[1] + 2 * (1 - t) * t * P1[1] + t * t * P2[1];
    g.set(x, y, "#2a3a52");
    g.set(x + 1, y, "#1a2538");
  }
  g.ellipse(P2[0], P2[1], 4.5, 4.5, enraged ? "#ff5a4a" : "#9dfcff");
  g.ellipse(P2[0], P2[1], 2, 2, "#ffffff");
  g.set(P2[0] - 5, P2[1], enraged ? "#ff5a4a" : "#9dfcff");
  g.set(P2[0] + 5, P2[1], enraged ? "#ff5a4a" : "#9dfcff");
  g.set(P2[0], P2[1] - 5, enraged ? "#ff5a4a" : "#9dfcff");
  g.set(P2[0], P2[1] + 5, enraged ? "#ff5a4a" : "#9dfcff");

  g.outline("#04060a");
  const c = g.canvas();
  bossCache.set(key, c);
  return c;
}

// ---------------------------------------------------------------- MISC

let dartC: HTMLCanvasElement | null = null;
export function boneDartSprite(): HTMLCanvasElement {
  if (dartC) return dartC;
  dartC = fromRows(
    [".....#.....W...", "...#####..WWW..", "#WWWWWWWRWWWWW#", "...#####..WWW..", ".....#.....W..."],
    { "#": "#9a86a8", W: "#ece6cf", R: "#ff3a3a" }
  );
  return dartC;
}

const moonCache: Record<string, HTMLCanvasElement> = {};
export function moonSprite(blood: boolean): HTMLCanvasElement {
  const key = blood ? "b" : "p";
  if (moonCache[key]) return moonCache[key];
  const g = new Grid(26, 26);
  const base = blood ? "#d9503e" : "#eef1da";
  const shade = blood ? "#a82c2a" : "#cfd6bb";
  const crater = blood ? "#7a1a1c" : "#b8c0a2";
  const hi = blood ? "#f08060" : "#ffffff";
  g.ellipse(13, 13, 12.5, 12.5, (x, y) => {
    const t = (x + y - 4) / 44;
    return t > 0.72 ? shade : t > 0.5 ? base : hi;
  });
  g.ellipse(8, 8, 2.6, 2.2, crater);
  g.ellipse(17, 14, 3.2, 2.6, crater);
  g.ellipse(10, 18, 2, 1.6, crater);
  g.ellipse(18, 7, 1.4, 1.2, crater);
  g.ellipse(6, 15, 1.6, 1.3, crater);
  g.ellipse(20, 19, 1.8, 1.4, crater);
  g.ellipse(14, 5, 1.2, 1, crater);
  g.ellipse(5, 11, 1.1, 0.9, crater);
  moonCache[key] = g.canvas();
  return moonCache[key];
}

export interface Icons {
  heart: HTMLCanvasElement;
  heartEmpty: HTMLCanvasElement;
  coin: HTMLCanvasElement;
  eye: HTMLCanvasElement;
  skull: HTMLCanvasElement;
}
let icons: Icons | null = null;
export function getIcons(): Icons {
  if (icons) return icons;
  icons = {
    heart: fromRows([".##.##.", "#RWRRR#", "#RRRRR#", ".#RRR#.", "..#r#..", "...#..."], {
      "#": "#4a0a12",
      R: "#ee3b4a",
      W: "#ffb0b8",
      r: "#a82030",
    }),
    heartEmpty: fromRows([".##.##.", "#.....#", "#.....#", ".#...#.", "..#.#..", "...#..."], {
      "#": "#5a3a44",
    }),
    coin: fromRows(["..##..", ".#YY#.", "#YWYY#", "#YYYy#", ".#YYy#", "..##.."], {
      "#": "#8a5a10",
      Y: "#ffd23f",
      W: "#fff4b0",
      y: "#c89a20",
    }),
    eye: fromRows(["..###..", ".#WWW#.", "#WWRKW#", ".#WwW#.", "..###.."], {
      "#": "#3a0a12",
      W: "#f1e6df",
      R: "#d02a30",
      K: "#12050a",
      w: "#c8b8b0",
    }),
    skull: fromRows([".#####.", "#WWWWW#", "#KWWKW#", "#WWWWW#", ".#WKW#.", "..#w#.."], {
      "#": "#2a2a30",
      W: "#e6e2cf",
      K: "#0a0a10",
      w: "#b8b4a4",
    }),
  };
  return icons;
}
