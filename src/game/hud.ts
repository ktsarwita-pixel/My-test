import type { Game, Btn } from "./game";
import { drawText, textWidth, wrapText } from "./font";
import { getIcons, fishSprite } from "./sprites";
import { UPGRADES, SPECIES, FLOOR_Y, clamp } from "./data";

type Kind = NonNullable<Btn["kind"]>;
const PAL: Record<Kind | "off", [string, string, string, string]> = {
  primary: ["#7a4a12", "#d79a30", "#ffd070", "#fff4d0"],
  danger: ["#6a1420", "#c03040", "#ff7a8a", "#ffe6e6"],
  normal: ["#16304a", "#2f6a96", "#7fc0f0", "#e6f6ff"],
  ghost: ["#0a141f", "#1c3248", "#4a6a86", "#cfe2ee"],
  off: ["#14181d", "#222830", "#3a4048", "#6a727a"],
};

function panel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  alpha = 0.92,
  border = "#4a6a86"
) {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = "#070d16";
  ctx.fillRect(x, y, w, h);
  ctx.globalAlpha = 1;
  ctx.fillStyle = border;
  ctx.fillRect(x + 1, y, w - 2, 1);
  ctx.fillRect(x + 1, y + h - 1, w - 2, 1);
  ctx.fillRect(x, y + 1, 1, h - 2);
  ctx.fillRect(x + w - 1, y + 1, 1, h - 2);
  ctx.fillStyle = "#14233a";
  ctx.fillRect(x + 2, y + 1, w - 4, 1);
}

function centered(
  ctx: CanvasRenderingContext2D,
  s: string,
  cx: number,
  y: number,
  maxW: number,
  color: string,
  lh = 9,
  scale = 1
) {
  const lines = wrapText(s, maxW, scale);
  lines.forEach((l, i) => drawText(ctx, l, cx, y + i * lh, { color, align: "center", scale }));
  return lines.length * lh;
}

function disc(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string) {
  ctx.fillStyle = color;
  for (let dy = -r; dy <= r; dy++) {
    const half = Math.floor(Math.sqrt(r * r - dy * dy + 0.25));
    ctx.fillRect(Math.round(cx) - half, Math.round(cy) + dy, half * 2 + 1, 1);
  }
}

function drawBtn(ctx: CanvasRenderingContext2D, g: Game, b: Btn, pressed = false) {
  g.btns.push(b);
  const off = b.enabled === false;
  const pal = off ? PAL.off : PAL[b.kind || "normal"];
  const [fill, hi, border, txt] = pal;
  const { x, y, w, h } = b;
  ctx.globalAlpha = b.hold ? 0.82 : 1;
  ctx.fillStyle = border;
  ctx.fillRect(x + 1, y, w - 2, h);
  ctx.fillRect(x, y + 1, w, h - 2);
  ctx.fillStyle = pressed ? "#050a10" : fill;
  ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
  if (!pressed) {
    ctx.fillStyle = hi;
    ctx.globalAlpha = (b.hold ? 0.82 : 1) * 0.5;
    ctx.fillRect(x + 2, y + 1, w - 4, 2);
    ctx.globalAlpha = (b.hold ? 0.82 : 1) * 0.35;
    ctx.fillStyle = "#000";
    ctx.fillRect(x + 2, y + h - 3, w - 4, 2);
  }
  ctx.globalAlpha = 1;
  const po = pressed ? 1 : 0;
  const cx = x + w / 2;
  const cy = y + h / 2;
  if (b.icon === "left" || b.icon === "right") {
    ctx.fillStyle = txt;
    for (let j = -3; j <= 3; j++) {
      if (b.icon === "left")
        ctx.fillRect(Math.round(cx) - 3 + Math.abs(j), Math.round(cy) + j + po, 7 - Math.abs(j), 1);
      else ctx.fillRect(Math.round(cx) - 3, Math.round(cy) + j + po, 7 - Math.abs(j), 1);
    }
  } else if (b.icon === "reel") {
    const r = h >= 40 ? 8 : 6;
    const ccy = Math.round(y + h / 2 - (h >= 40 ? 5 : 4)) + po;
    disc(ctx, cx, ccy, r, "#3a2408");
    disc(ctx, cx, ccy, r - 1, txt);
    disc(ctx, cx, ccy, r - 3, pressed ? "#2a1a06" : "#a8701c");
    const a = g.t * (pressed ? 14 : 0);
    ctx.fillStyle = "#3a2408";
    ctx.fillRect(
      Math.round(cx + Math.cos(a) * (r - 3)) - 1,
      Math.round(ccy + Math.sin(a) * (r - 3)) - 1,
      2,
      2
    );
    ctx.fillRect(Math.round(cx) - 1, ccy - 1, 2, 2);
    drawText(ctx, "REEL", cx, y + h - 10 + po, {
      color: txt,
      shadow: "#2a1a06",
      align: "center",
    });
  } else if (b.icon === "flash") {
    const ready = g.flashCd <= 0;
    ctx.fillStyle = ready ? "#fff2a0" : "#5a5a50";
    const c = Math.round(cx);
    const d = Math.round(cy) + po;
    ctx.fillRect(c - 1, d - 1, 3, 3);
    ctx.fillRect(c - 1, d - 6, 3, 3);
    ctx.fillRect(c - 1, d + 4, 3, 3);
    ctx.fillRect(c - 6, d - 1, 3, 3);
    ctx.fillRect(c + 4, d - 1, 3, 3);
    ctx.fillRect(c - 4, d - 4, 2, 2);
    ctx.fillRect(c + 3, d - 4, 2, 2);
    ctx.fillRect(c - 4, d + 3, 2, 2);
    ctx.fillRect(c + 3, d + 3, 2, 2);
    if (!ready) {
      ctx.globalAlpha = 0.6;
      ctx.fillStyle = "#000";
      ctx.fillRect(x + 2, y + 2, w - 4, h - 4);
      ctx.globalAlpha = 1;
      drawText(ctx, String(Math.ceil(g.flashCd)), cx, cy - 3, {
        color: "#ffe9a0",
        align: "center",
      });
    }
  } else if (b.icon === "sound") {
    ctx.fillStyle = txt;
    const c = Math.round(cx);
    const d = Math.round(cy);
    ctx.fillRect(c - 4, d - 1, 2, 3);
    ctx.fillRect(c - 2, d - 2, 1, 5);
    ctx.fillRect(c - 1, d - 3, 1, 7);
    if (!g.sfx.muted) {
      ctx.fillRect(c + 1, d - 1, 1, 3);
      ctx.fillRect(c + 3, d - 3, 1, 7);
    } else {
      ctx.fillStyle = "#ff6a6a";
      for (let i = -3; i <= 3; i++) {
        ctx.fillRect(c + 2 + Math.round(i * 0.7), d + i, 1, 1);
        ctx.fillRect(c + 2 - Math.round(i * 0.7), d + i, 1, 1);
      }
    }
  } else if (b.label) {
    drawText(ctx, b.label, cx, cy - 3 + po, {
      color: txt,
      shadow: off ? null : "#05070d",
      align: "center",
    });
  }
}

function bar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  frac: number,
  color: string,
  bg = "#0a1018",
  border = "#3a5068"
) {
  ctx.fillStyle = border;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = bg;
  ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
  const fw = Math.round((w - 2) * clamp(frac, 0, 1));
  ctx.fillStyle = color;
  ctx.fillRect(x + 1, y + 1, fw, h - 2);
  ctx.fillStyle = "#ffffff";
  ctx.globalAlpha = 0.25;
  ctx.fillRect(x + 1, y + 1, fw, 1);
  ctx.globalAlpha = 1;
}

export function drawHud(ctx: CanvasRenderingContext2D, g: Game) {
  ctx.imageSmoothingEnabled = false;
  ctx.globalAlpha = 1;
  g.btns = [];
  switch (g.mode) {
    case "title":
      drawTitle(ctx, g);
      drawSoundBtn(ctx, g);
      return;
    case "victory":
      drawVictory(ctx, g);
      return;
    default:
  }
  if (!(g.shopOpen && g.mode === "idle")) drawTop(ctx, g);
  if (g.mode === "sink" || g.mode === "fight") drawSonar(ctx, g);
  drawControls(ctx, g);
  drawStateHud(ctx, g);
  if (g.shopOpen && g.mode === "idle") drawLocker(ctx, g);
  if (g.mode === "catch" && g.catchInfo) drawCatch(ctx, g);
  if (g.mode === "defeat") drawDefeat(ctx, g);
  if (!(g.shopOpen && g.mode === "idle")) drawMessages(ctx, g);
}

function drawSoundBtn(ctx: CanvasRenderingContext2D, g: Game) {
  drawBtn(ctx, g, { id: "mute", x: g.W - 20, y: 3, w: 16, h: 14, icon: "sound", kind: "ghost" });
}

function mainCx(g: Game) {
  return g.W < 260 ? g.W / 2 : g.W * 0.64;
}

function barRight(g: Game) {
  return g.W < 260 ? g.W - 4 : 112;
}

// ---------------------------------------------------------------- top bar
function drawTop(ctx: CanvasRenderingContext2D, g: Game) {
  const icons = getIcons();
  const W = g.W;
  ctx.drawImage(icons.coin, 4, 5);
  drawText(ctx, String(g.money), 13, 5, { color: "#ffd23f" });
  const inWater = g.mode === "sink" || g.mode === "fight";
  if (inWater || g.mode === "idle" || g.mode === "catch") {
    const m = Math.round(Math.max(0, g.hook.y) / 4);
    const maxM = Math.round(g.maxDepth / 4);
    drawText(ctx, `${m}/${maxM}M`, W < 260 ? W / 2 + 4 : 152, 5, {
      color: "#8fd4e8",
      align: "center",
    });
  }
  drawSoundBtn(ctx, g);

  const bossMode = g.mode === "boss" || g.mode === "bossDeath" || g.mode === "defeat";
  if (g.mode === "bossIntro") return;
  const right = barRight(g);
  if (bossMode && g.boss) {
    const b = g.boss;
    ctx.drawImage(icons.eye, 4, 15);
    bar(
      ctx,
      14,
      14,
      right - 14,
      8,
      b.hp / 100,
      b.stun > 0 ? "#e8c040" : "#d02a3a",
      "#1a0a10",
      "#6a3a44"
    );
    ctx.fillStyle = "#0a0408";
    ctx.fillRect(14 + Math.round((right - 14) * 0.33), 15, 1, 6);
    ctx.fillRect(14 + Math.round((right - 14) * 0.66), 15, 1, 6);
    for (let i = 0; i < g.hullMax; i++)
      ctx.drawImage(i < g.hull ? icons.heart : icons.heartEmpty, 4 + i * 9, 25);
  } else if (!g.bossBeaten) {
    ctx.drawImage(icons.eye, 4, 14);
    const d = g.dread / 100;
    const col =
      d < 0.4
        ? "#4fd0c0"
        : d < 0.7
        ? "#e0c040"
        : Math.floor(g.t * 5) % 2 && d > 0.85
        ? "#ff8a8a"
        : "#e03040";
    bar(ctx, 14, 14, right - 14, 6, d, col, "#0a1018", "#3a5068");
    ctx.fillStyle = "#06101a";
    for (const f of [0.25, 0.5, 0.75])
      ctx.fillRect(14 + Math.round((right - 14) * f), 15, 1, 4);
  }
}

// ---------------------------------------------------------------- depth sonar strip
function drawSonar(ctx: CanvasRenderingContext2D, g: Game) {
  const W = g.W;
  const H = g.H;
  const small = H < 230;
  const rs = small ? 34 : 44;
  const top = g.W < 260 ? 44 : 24;
  const bot = H - rs - 16;
  const sh = bot - top;
  if (sh < 44) return;
  const sx = W - 7;
  ctx.globalAlpha = 0.75;
  ctx.fillStyle = "#060e18";
  ctx.fillRect(sx, top, 4, sh);
  ctx.fillStyle = "#2c465e";
  ctx.fillRect(sx, top, 4, 1);
  ctx.fillRect(sx, top + sh - 1, 4, 1);

  // Max line depth marker
  const maxFrac = clamp(g.maxDepth / FLOOR_Y, 0, 1);
  const maxY = top + Math.round(maxFrac * (sh - 2));
  ctx.fillStyle = "#4a7a96";
  ctx.fillRect(sx - 1, maxY, 6, 1);

  // Fish blips (gold for active bounty species, cyan for others)
  for (const f of g.fish) {
    if (Math.abs(f.x - g.hook.x) > 85) continue;
    const fy = top + 1 + Math.round(clamp(f.y / FLOOR_Y, 0, 1) * (sh - 3));
    const isBounty = g.bounty && f.sp.id === g.bounty.spId;
    ctx.fillStyle = isBounty ? "#ffd23f" : f.sp.horror ? "#c87090" : "#5ab8d8";
    ctx.fillRect(sx + 1, fy, 2, isBounty ? 2 : 1);
  }

  // Lurker blips (pulsing crimson)
  for (const l of g.lurkers) {
    if (l.state !== "stalk") continue;
    const ly = top + 1 + Math.round(clamp(l.y / FLOOR_Y, 0, 1) * (sh - 3));
    ctx.fillStyle = "#ff3030";
    ctx.fillRect(sx, ly, 4, 2);
  }

  // Current hook position
  const hy = top + 1 + Math.round(clamp(g.hook.y / FLOOR_Y, 0, 1) * (sh - 3));
  ctx.globalAlpha = 1;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(sx - 1, hy, 6, 2);
}

// ---------------------------------------------------------------- controls
function drawControls(ctx: CanvasRenderingContext2D, g: Game) {
  const W = g.W;
  const H = g.H;
  const small = H < 230;
  const bs = small ? 26 : 32;
  const rs = small ? 34 : 44;
  const m = 6;
  const mode = g.mode;
  if (mode === "idle" && !g.shopOpen) {
    const shopW = 42;
    const logW = 38;
    const y = H - m - bs;
    drawBtn(ctx, g, { id: "shop", x: m, y, w: shopW, h: bs, label: "SHOP", kind: "normal" });
    drawBtn(ctx, g, {
      id: "log",
      x: m + shopW + 4,
      y,
      w: logW,
      h: bs,
      label: `LOG`,
      kind: "ghost",
    });
    drawBtn(ctx, g, {
      id: "cast",
      x: m + shopW + logW + 8,
      y: H - m - rs,
      w: W - m * 2 - shopW - logW - 8,
      h: rs,
      label: "CAST LINE",
      kind: "primary",
    });
    if (g.dread >= 45 && !g.bossBeaten) {
      drawBtn(ctx, g, {
        id: "call",
        x: m,
        y: H - m - rs - 4 - 20,
        w: W - m * 2,
        h: 20,
        label: "FACE THE LEVIATHAN",
        kind: "danger",
      });
    }
  } else if (mode === "sink" || mode === "fight" || mode === "boss") {
    drawBtn(
      ctx,
      g,
      { id: "left", x: m, y: H - m - bs, w: bs, h: bs, icon: "left", hold: true, kind: "normal" },
      g.inp.left
    );
    drawBtn(
      ctx,
      g,
      {
        id: "right",
        x: m + bs + 4,
        y: H - m - bs,
        w: bs,
        h: bs,
        icon: "right",
        hold: true,
        kind: "normal",
      },
      g.inp.right
    );
    drawBtn(
      ctx,
      g,
      {
        id: "reel",
        x: W - m - rs,
        y: H - m - rs,
        w: rs,
        h: rs,
        icon: "reel",
        hold: true,
        kind: "primary",
      },
      g.inp.reel
    );
    if (!g.bossBeaten || mode === "boss") {
      drawBtn(ctx, g, {
        id: "flash",
        x: W - m - rs - bs - 5,
        y: H - m - bs,
        w: bs,
        h: bs,
        icon: "flash",
        kind: "ghost",
      });
    }
  }
}

// ---------------------------------------------------------------- state HUD (fight bars, bounty, boss)
function drawStateHud(ctx: CanvasRenderingContext2D, g: Game) {
  const W = g.W;
  const H = g.H;
  const small = H < 230;
  const rs = small ? 34 : 44;
  const right = barRight(g);
  const cx = mainCx(g);
  const hintY = H - 6 - rs - 22;

  if (g.mode === "fight" && g.fight) {
    const f = g.fight;
    drawText(ctx, "STRAIN", 4, 25, { color: f.powerReel ? "#ffd23f" : "#c8d6de" });
    const bx = 44;
    const bw = right - bx;
    ctx.fillStyle = f.powerReel ? "#ffd23f" : "#3a5068";
    ctx.fillRect(bx, 24, bw, 8);
    ctx.fillStyle = "#12261f";
    ctx.fillRect(bx + 1, 25, bw - 2, 6);
    // Gold Power Zone (50% .. 82%)
    const pz0 = Math.round((bw - 2) * 0.5);
    const pzW = Math.round((bw - 2) * 0.32);
    ctx.fillStyle = "#3d3310";
    ctx.fillRect(bx + 1 + pz0, 25, pzW, 6);
    ctx.fillStyle = "#3a1218";
    ctx.fillRect(bx + 1 + Math.round((bw - 2) * 0.82), 25, bw - 2 - Math.round((bw - 2) * 0.82), 6);

    const tv = f.tension / 100;
    ctx.fillStyle = tv < 0.5 ? "#4fd0a0" : tv <= 0.82 ? "#ffd23f" : "#ff4a4a";
    ctx.fillRect(bx + 1, 25, Math.round((bw - 2) * clamp(tv, 0, 1)), 6);
    // Power Zone brackets
    ctx.fillStyle = "#fff2a0";
    ctx.fillRect(bx + 1 + pz0, 24, 1, 8);
    ctx.fillRect(bx + 1 + pz0 + pzW, 24, 1, 8);

    drawText(ctx, "CATCH", 4, 36, { color: "#c8d6de" });
    bar(ctx, bx, 35, bw, 6, clamp((f.r + 0.3) / 1.3, 0, 1), "#5fa8ff", "#0a1018");

    if (f.st !== "calm") {
      const blink = Math.floor(g.t * 8) % 2 === 0;
      const steerDir = f.pullDir > 0 ? "<" : ">";
      const label = f.countering ? "COUNTERING!" : `RELEASE! ${steerDir}`;
      drawText(ctx, label, cx, 48, {
        color: f.countering
          ? "#6fffa8"
          : f.st === "pull"
          ? blink
            ? "#ff4a4a"
            : "#ffb0a0"
          : "#ffd23f",
        scale: textWidth(label, 2) <= W - 16 ? 2 : 1,
        align: "center",
      });
    } else if (f.powerReel) {
      drawText(ctx, "POWER REEL! X1.5", cx, 48, { color: "#ffd23f", align: "center" });
    }
    if (g.catchInfo === null && g.stats.caught < 3) {
      centered(
        ctx,
        "KEEP STRAIN IN THE GOLD ZONE. LET GO + STEER AGAINST PULLS!",
        W / 2,
        hintY,
        W - 14,
        "#9fb6c4"
      );
    }
  }

  if (g.mode === "sink" && (g.sinkTime < 14 || g.stats.caught < 2)) {
    const t = g.isTouch
      ? "STEER WITH ARROWS. REEL RISES."
      : "A/D STEER. SPACE RISES.";
    centered(ctx, t, W / 2, hintY, W - 16, "#9fb6c4");
  }

  // Active Bounty pill on idle screen
  if (g.mode === "idle" && !g.shopOpen && g.bounty) {
    const b = g.bounty;
    const callOffset = g.dread >= 45 && !g.bossBeaten ? 22 : 0;
    const by = H - 6 - rs - 16 - callOffset;
    const txt = `BOUNTY: ${b.name} (${b.depthM[0]}-${b.depthM[1]}M) +${b.reward}$`;
    drawText(ctx, txt, W / 2, by, { color: "#ffd23f", align: "center" });
  }

  if ((g.mode === "boss" || g.mode === "bossDeath") && g.boss) {
    const b = g.boss;
    if (g.mode === "boss") {
      drawText(ctx, "STRAIN", 4, 37, { color: b.powerReel ? "#ffd23f" : "#c8d6de" });
      const bx = 44;
      const bw = right - bx;
      const tv = b.tension / 100;
      const pz0 = Math.round((bw - 2) * 0.5);
      const pzW = Math.round((bw - 2) * 0.32);
      ctx.fillStyle = b.powerReel ? "#ffd23f" : "#3a5068";
      ctx.fillRect(bx, 36, bw, 8);
      ctx.fillStyle = "#12261f";
      ctx.fillRect(bx + 1, 37, bw - 2, 6);
      ctx.fillStyle = "#3d3310";
      ctx.fillRect(bx + 1 + pz0, 37, pzW, 6);
      ctx.fillStyle = "#3a1218";
      ctx.fillRect(
        bx + 1 + Math.round((bw - 2) * 0.82),
        37,
        bw - 2 - Math.round((bw - 2) * 0.82),
        6
      );
      ctx.fillStyle =
        b.jam > 0 ? "#6a6a6a" : tv < 0.5 ? "#4fd0a0" : tv <= 0.82 ? "#ffd23f" : "#ff4a4a";
      ctx.fillRect(bx + 1, 37, Math.round((bw - 2) * clamp(tv, 0, 1)), 6);
      ctx.fillStyle = "#fff2a0";
      ctx.fillRect(bx + 1 + pz0, 36, 1, 8);
      ctx.fillRect(bx + 1 + pz0 + pzW, 36, 1, 8);

      const blink = Math.floor(g.t * 8) % 2 === 0;
      if (b.jam > 0)
        drawText(ctx, "JAMMED!", cx, 52, { color: "#9aa0a6", scale: 2, align: "center" });
      else if (b.st !== "calm")
        drawText(ctx, "RELEASE!", cx, 52, {
          color: b.st === "thrash" ? (blink ? "#ff4a4a" : "#ffb0a0") : "#ffd23f",
          scale: 2,
          align: "center",
        });
      else if (b.stun > 0)
        drawText(ctx, "STUNNED! REEL NOW!", cx, 52, { color: "#fff2a0", align: "center" });
      else if (b.powerReel)
        drawText(ctx, "POWER REEL! X1.45", cx, 52, { color: "#ffd23f", align: "center" });

      if (g.modeT < 14) {
        centered(
          ctx,
          g.isTouch
            ? "DODGE SPEARS + DARTS. FLASH OPEN JAWS FOR CRIT STUN!"
            : "A/D DODGE. SPACE REELS IN GOLD ZONE. F FLASHES OPEN JAWS!",
          W / 2,
          hintY,
          W - 12,
          "#c8a0a0"
        );
      }
    }
  }

  // Boss banner
  if (g.bannerT > 0 && g.mode === "boss") {
    const a = clamp(g.bannerT / 0.6, 0, 1);
    const s = textWidth(g.bannerText, 2) <= W - 10 ? 2 : 1;
    ctx.globalAlpha = a;
    drawText(ctx, g.bannerText, W / 2, H * 0.42, {
      color: "#ff4a4a",
      scale: s,
      align: "center",
      shadow: "#200006",
    });
    ctx.globalAlpha = 1;
  }
}

// ---------------------------------------------------------------- messages
function drawMessages(ctx: CanvasRenderingContext2D, g: Game) {
  const W = g.W;
  const H = g.H;
  const cx = mainCx(g);
  if (g.toastMsg) {
    const t = g.toastMsg;
    const a = clamp(Math.min(t.t / 0.15, (t.dur - t.t) / 0.4), 0, 1);
    ctx.globalAlpha = a;
    const lines = wrapText(t.text, W - 16);
    const y0 = g.mode === "fight" || g.mode === "boss" ? 70 : 28;
    const yy = g.W < 260 ? y0 + 6 : y0 - 6;
    lines.forEach((l, i) =>
      drawText(
        ctx,
        l,
        g.W < 260 ? W / 2 : clamp(cx, textWidth(l) / 2 + 6, W - textWidth(l) / 2 - 6),
        yy + i * 9,
        { color: t.color, align: "center" }
      )
    );
    ctx.globalAlpha = 1;
  }
  if (g.whisperMsg) {
    const w = g.whisperMsg;
    const a = Math.sin(clamp(w.t / w.dur, 0, 1) * Math.PI);
    const lines = wrapText(w.text, W - 20);
    const jx = Math.random() < 0.08 ? Math.round((Math.random() - 0.5) * 4) : 0;
    ctx.globalAlpha = clamp(a * 1.4, 0, 1) * 0.9;
    lines.forEach((l, i) => {
      const lw = textWidth(l);
      const x = clamp(w.x, lw / 2 + 6, W - lw / 2 - 6) + jx;
      drawText(ctx, l, x, Math.min(H - 120, w.y) + i * 9, {
        color: "#d83a3a",
        align: "center",
        shadow: "#1a0004",
      });
    });
    ctx.globalAlpha = 1;
  }
}

// ---------------------------------------------------------------- catch card
function drawCatch(ctx: CanvasRenderingContext2D, g: Game) {
  const c = g.catchInfo!;
  const W = g.W;
  const H = g.H;
  const s = fishSprite(c.sp.id, c.sp.look);
  const sc = s.h * 2 <= 56 && s.w * 2 <= W - 40 ? 2 : 1;
  const cw = Math.min(W - 16, 182);
  const flav = wrapText(c.sp.flavor, cw - 16);
  const bountyH = c.bountyBonus > 0 ? 10 : 0;
  const ch = 16 + s.h * sc + 6 + 10 + 10 + bountyH + flav.length * 9 + 16;
  const x = Math.round((W - cw) / 2);
  const y = Math.round(clamp(g.SURF + 4, 24, H - ch - 64));
  const pop = clamp(c.t / 0.18, 0, 1);
  ctx.globalAlpha = pop;
  panel(ctx, x, y, cw, ch, 0.95, c.isNew || c.bountyBonus > 0 ? "#ffd070" : "#4a6a86");
  const blink = Math.floor(g.t * 4) % 2 === 0;
  drawText(ctx, c.isNew ? "NEW SPECIES!" : "CAUGHT!", W / 2, y + 6, {
    color: c.isNew ? (blink ? "#ffd23f" : "#fff4b0") : "#9fe8c0",
    align: "center",
  });
  const sy = y + 17;
  ctx.drawImage(s.c, Math.round(W / 2 - (s.w * sc) / 2), sy, s.w * sc, s.h * sc);
  let ty = sy + s.h * sc + 5;
  drawText(ctx, c.sp.name, W / 2, ty, { color: "#ffffff", align: "center" });
  ty += 10;
  drawText(ctx, `${c.kg.toFixed(1)} KG   +${c.value}$`, W / 2, ty, {
    color: "#ffd23f",
    align: "center",
  });
  ty += 10;
  if (c.bountyBonus > 0) {
    drawText(ctx, `BOUNTY BONUS +${c.bountyBonus}$!`, W / 2, ty, {
      color: "#6fffa8",
      align: "center",
    });
    ty += 10;
  }
  flav.forEach((l, i) =>
    drawText(ctx, l, W / 2, ty + i * 9, {
      color: c.sp.horror ? "#d89a9a" : "#9fb6c4",
      align: "center",
    })
  );
  if (c.t > 0.45 && blink)
    drawText(ctx, "TAP TO CONTINUE", W / 2, y + ch - 11, {
      color: "#6f8aa0",
      align: "center",
    });
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------- locker (Upgrades + Bestiary tabs)
function drawLocker(ctx: CanvasRenderingContext2D, g: Game) {
  const W = g.W;
  const H = g.H;
  const icons = getIcons();
  ctx.globalAlpha = 0.94;
  ctx.fillStyle = "#050a12";
  ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = 1;
  g.btns = [];

  // Top tabs: UPGRADES | BESTIARY
  const tabW = Math.min(78, Math.floor((W - 76) / 2));
  drawBtn(ctx, g, {
    id: "tab:shop",
    x: 6,
    y: 3,
    w: tabW,
    h: 16,
    label: "UPGRADES",
    kind: g.lockerTab === "shop" ? "primary" : "ghost",
  });
  drawBtn(ctx, g, {
    id: "tab:log",
    x: 6 + tabW + 4,
    y: 3,
    w: tabW + 10,
    h: 16,
    label: `LOG ${g.stats.species.length}/${SPECIES.length}`,
    kind: g.lockerTab === "log" ? "primary" : "ghost",
  });

  ctx.drawImage(icons.coin, W - 58, 6);
  drawText(ctx, String(g.money), W - 49, 6, { color: "#ffd23f" });
  drawBtn(ctx, g, { id: "closeshop", x: W - 24, y: 3, w: 20, h: 16, label: "X", kind: "danger" });

  if (g.lockerTab === "log") {
    drawBestiary(ctx, g);
    return;
  }

  const cols = W >= 280 ? 2 : 1;
  const rows = Math.ceil(UPGRADES.length / cols);
  const top = 23;
  const bottom = 14;
  const area = H - top - bottom;
  const gap = 3;
  const rowH = clamp(Math.floor(area / rows) - gap, 22, 36);
  const colW = Math.floor((W - 12 - (cols - 1) * 4) / cols);
  UPGRADES.forEach((u, i) => {
    const col = i % cols === 0 ? 0 : 1;
    const row = cols === 2 ? Math.floor(i / 2) : i;
    const x = 6 + col * (colW + 4);
    const y = top + row * (rowH + gap);
    const lvl = g.lv[u.id];
    const max = u.costs.length;
    const maxed = lvl >= max;
    const cost = maxed ? 0 : u.costs[lvl];
    const afford = !maxed && g.money >= cost;
    panel(ctx, x, y, colW, rowH, 0.9, afford ? "#5a8aa8" : "#2c4258");
    const ny = rowH >= 28 ? y + 5 : y + 4;
    drawText(ctx, u.name, x + 5, ny, { color: "#ffffff" });
    drawText(ctx, u.desc, x + 5, ny + 10, { color: "#7f9bb0" });
    const bw = 40;
    const bx = x + colW - bw - 4;
    for (let p = 0; p < max; p++) {
      ctx.fillStyle = p < lvl ? "#ffd23f" : "#26384a";
      ctx.fillRect(bx - 4 - (max - p) * 6, ny + 1, 4, 5);
    }
    drawBtn(ctx, g, {
      id: "buy:" + u.id,
      x: bx,
      y: y + 3,
      w: bw,
      h: rowH - 6,
      label: maxed ? "MAX" : `${cost}$`,
      kind: maxed ? "ghost" : afford ? "primary" : "normal",
      enabled: !maxed && afford,
    });
  });
  const lines = g.isTouch ? "TAP A PRICE TO BUY" : "CLICK OR PRESS 1-6 TO BUY. ESC TO CLOSE";
  if (H - (top + rows * (rowH + gap)) > 12)
    drawText(ctx, lines, W / 2, H - 11, { color: "#5f7a90", align: "center" });
}

function drawBestiary(ctx: CanvasRenderingContext2D, g: Game) {
  const W = g.W;
  const H = g.H;
  const cols = W >= 280 ? 2 : 1;
  const top = 23;
  const bot = 24;
  const cardH = 32;
  const gap = 3;
  const perCol = Math.max(2, Math.floor((H - top - bot) / (cardH + gap)));
  const perPage = perCol * cols;
  const totalPages = Math.ceil(SPECIES.length / perPage);
  g.logPage = clamp(g.logPage, 0, Math.max(0, totalPages - 1));
  const start = g.logPage * perPage;
  const slice = SPECIES.slice(start, start + perPage);
  const colW = Math.floor((W - 12 - (cols - 1) * 4) / cols);

  slice.forEach((sp, i) => {
    const col = cols === 2 ? i % 2 : 0;
    const row = cols === 2 ? Math.floor(i / 2) : i;
    const x = 6 + col * (colW + 4);
    const y = top + row * (cardH + gap);
    const known = g.stats.species.includes(sp.id);
    const isBounty = g.bounty && g.bounty.spId === sp.id;
    panel(ctx, x, y, colW, cardH, 0.9, isBounty ? "#ffd23f" : known ? "#4a7a98" : "#223040");

    const s = fishSprite(sp.id, sp.look);
    const sx = x + Math.max(3, Math.round(25 - s.w / 2));
    const sy = y + Math.round(cardH / 2 - s.h / 2);
    if (known) {
      ctx.drawImage(s.c, sx, sy);
    } else {
      ctx.globalAlpha = 0.25;
      ctx.drawImage(s.c, sx, sy);
      ctx.globalAlpha = 1;
      drawText(ctx, "?", x + 25, y + 12, { color: "#6f8aa0", align: "center" });
    }

    const tx = x + 52;
    const d0 = Math.round(sp.zone[0] / 4);
    const d1 = Math.round(sp.zone[1] / 4);
    drawText(ctx, known ? sp.name : "???", tx, y + 5, {
      color: known ? (sp.horror ? "#ff9a9a" : "#ffffff") : "#5a7084",
    });
    const cnt = g.stats.counts[sp.id] || 0;
    const mkg = g.stats.maxKg[sp.id] || 0;
    const sub = known ? `${d0}-${d1}M  MAX ${mkg.toFixed(1)}KG  X${cnt}` : `DEPTH ${d0}-${d1}M`;
    drawText(ctx, sub, tx, y + 16, { color: isBounty ? "#ffd23f" : "#7fa4ba" });
  });

  if (totalPages > 1) {
    const py = H - 20;
    drawBtn(ctx, g, {
      id: "log:prev",
      x: 6,
      y: py,
      w: 42,
      h: 16,
      label: "< PREV",
      kind: "normal",
      enabled: g.logPage > 0,
    });
    drawText(ctx, `PAGE ${g.logPage + 1}/${totalPages}`, W / 2, py + 5, {
      color: "#8fa8ba",
      align: "center",
    });
    drawBtn(ctx, g, {
      id: "log:next",
      x: W - 48,
      y: py,
      w: 42,
      h: 16,
      label: "NEXT >",
      kind: "normal",
      enabled: g.logPage < totalPages - 1,
    });
  }
}

// ---------------------------------------------------------------- title
function drawTitle(ctx: CanvasRenderingContext2D, g: Game) {
  const W = g.W;
  const H = g.H;
  const stacked = W < 260;
  const sc = stacked ? Math.min(6, Math.floor((W - 24) / 23)) : Math.min(5, Math.floor((W - 20) / 53));
  const flick = Math.sin(g.t * 23) * Math.sin(g.t * 7.3) > 0.93 ? 0.35 : 1;
  const ty = g.SURF + (stacked ? 34 : 20);
  ctx.globalAlpha = flick;
  let bottom = ty;
  if (stacked) {
    drawText(ctx, "DEEP", W / 2, ty, {
      color: "#dde8ee",
      scale: sc,
      align: "center",
      shadow: "#7a0f1c",
    });
    drawText(ctx, "HOOK", W / 2, ty + 8 * sc, {
      color: "#ff5a4a",
      scale: sc,
      align: "center",
      shadow: "#3a0610",
    });
    bottom = ty + 16 * sc;
  } else {
    drawText(ctx, "DEEP", W / 2 - 3 * sc - 2, ty, {
      color: "#dde8ee",
      scale: sc,
      align: "right",
      shadow: "#7a0f1c",
    });
    drawText(ctx, "HOOK", W / 2 + 3 * sc + 2, ty, {
      color: "#ff5a4a",
      scale: sc,
      align: "left",
      shadow: "#3a0610",
    });
    bottom = ty + 8 * sc;
  }
  ctx.globalAlpha = 1;
  drawText(ctx, "A FISHING NIGHTMARE", W / 2, bottom + 4, { color: "#9fb6c4", align: "center" });
  let by = bottom + 22;
  const bw = Math.min(W - 40, 130);
  const bh = 24;
  if (g.hasSave) {
    drawBtn(ctx, g, {
      id: "continue",
      x: Math.round((W - bw) / 2),
      y: by,
      w: bw,
      h: bh,
      label: "CONTINUE",
      kind: "primary",
    });
    by += bh + 6;
    drawBtn(ctx, g, {
      id: "newgame",
      x: Math.round((W - bw) / 2),
      y: by,
      w: bw,
      h: 18,
      label: "NEW GAME",
      kind: "normal",
    });
    by += 24;
  } else {
    drawBtn(ctx, g, {
      id: "start",
      x: Math.round((W - bw) / 2),
      y: by,
      w: bw,
      h: bh,
      label: "START",
      kind: "primary",
    });
    by += bh + 8;
  }
  const blink = Math.floor(g.t * 2) % 2 === 0;
  if (blink && by < H - 40)
    drawText(ctx, g.isTouch ? "TAP TO BEGIN" : "PRESS SPACE", W / 2, by, {
      color: "#6f8aa0",
      align: "center",
    });
  const foot = g.isTouch
    ? "HEADPHONES RECOMMENDED. SOUND ON."
    : "A/D STEER  SPACE REEL  F FLASH  S SHOP";
  const fl = wrapText(foot, W - 12).length;
  centered(ctx, foot, W / 2, H - 6 - fl * 9, W - 12, "#4a6076");
}

// ---------------------------------------------------------------- end screens
function drawDefeat(ctx: CanvasRenderingContext2D, g: Game) {
  const W = g.W;
  const H = g.H;
  if (g.modeT < 1.6) return;
  const a = clamp((g.modeT - 1.6) / 0.8, 0, 1);
  ctx.globalAlpha = a;
  const s = textWidth("THE DEEP TAKES YOU", 2) <= W - 10 ? 2 : 1;
  const y = Math.round(H * 0.3);
  if (s === 2)
    drawText(ctx, "THE DEEP TAKES YOU", W / 2, y, {
      color: "#ff4a4a",
      scale: 2,
      align: "center",
      shadow: "#200006",
    });
  else {
    drawText(ctx, "THE DEEP", W / 2, y, {
      color: "#ff4a4a",
      scale: 2,
      align: "center",
      shadow: "#200006",
    });
    drawText(ctx, "TAKES YOU", W / 2, y + 18, {
      color: "#ff4a4a",
      scale: 2,
      align: "center",
      shadow: "#200006",
    });
  }
  centered(ctx, "YOUR BOAT SPLINTERS AND THE DARK SWALLOWS THE LANTERN.", W / 2, y + 40, W - 24, "#c89a9a");
  centered(ctx, "YOUR UPGRADES ARE KEPT. IT WILL BE WAITING.", W / 2, y + 62, W - 24, "#8a7a7a");
  ctx.globalAlpha = 1;
  if (g.modeT > 2.2) {
    drawBtn(ctx, g, {
      id: "retry",
      x: Math.round(W / 2 - 60),
      y: y + 88,
      w: 120,
      h: 26,
      label: "TRY AGAIN",
      kind: "danger",
    });
  }
}

function drawVictory(ctx: CanvasRenderingContext2D, g: Game) {
  const W = g.W;
  const H = g.H;
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = "#07101c";
  ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = 1;
  const pw = Math.min(W - 16, 200);
  const compact = H < 260;
  const big = !compact && textWidth("LEVIATHAN", 2) <= pw - 12;
  const blurb = wrapText("DAWN BREAKS. THE SEA IS QUIET... FOR NOW.", pw - 16);
  const stats: [string, string][] = compact
    ? [
        [`FISH ${g.stats.caught}   SPECIES ${g.stats.species.length}/${SPECIES.length}`, "#9fe8c0"],
        [`BEST ${g.stats.best}$   LOST ${g.stats.deaths}`, "#ffd23f"],
      ]
    : [
        [`FISH CAUGHT  ${g.stats.caught}`, "#9fe8c0"],
        [`SPECIES  ${g.stats.species.length}/${SPECIES.length}`, "#9fe8c0"],
        [`BEST CATCH  ${g.stats.best}$`, "#ffd23f"],
        [`NIGHTS LOST  ${g.stats.deaths}`, "#ff9a8a"],
      ];
  const titleH = big ? 34 : 9;
  const ph = 8 + titleH + 8 + blurb.length * 9 + 8 + stats.length * 10 + 10 + 22 + 4 + 18 + 8;
  const x = Math.round((W - pw) / 2);
  const y = Math.round(Math.max(4, (H - ph) / 2));
  panel(ctx, x, y, pw, ph, 0.95, "#ffd070");
  let ty = y + 8;
  if (big) {
    drawText(ctx, "LEVIATHAN", W / 2, ty, {
      color: "#ffd23f",
      scale: 2,
      align: "center",
      shadow: "#3a2400",
    });
    drawText(ctx, "SLAIN", W / 2, ty + 17, {
      color: "#ffd23f",
      scale: 2,
      align: "center",
      shadow: "#3a2400",
    });
  } else {
    drawText(ctx, "LEVIATHAN SLAIN", W / 2, ty, {
      color: "#ffd23f",
      align: "center",
      shadow: "#3a2400",
    });
  }
  ty += titleH + 8;
  blurb.forEach((l, i) => drawText(ctx, l, W / 2, ty + i * 9, { color: "#c8d6de", align: "center" }));
  ty += blurb.length * 9 + 8;
  stats.forEach(([t, c], i) => drawText(ctx, t, W / 2, ty + i * 10, { color: c, align: "center" }));
  ty += stats.length * 10 + 10;
  if (g.modeT > 0.8) {
    drawBtn(ctx, g, {
      id: "keep",
      x: x + 10,
      y: ty,
      w: pw - 20,
      h: 22,
      label: "KEEP FISHING",
      kind: "primary",
    });
    drawBtn(ctx, g, {
      id: "title",
      x: x + 10,
      y: ty + 26,
      w: pw - 20,
      h: 18,
      label: "MAIN MENU",
      kind: "normal",
    });
  }
}
