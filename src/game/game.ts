import { Sfx } from "./audio";
import {
  SPECIES,
  UPGRADES,
  LINE_DEPTH,
  REEL_MULT,
  WIRE_MULT,
  LAMP_DREAD,
  BAIT_BONUS,
  HULL_HEARTS,
  FLOOR_Y,
  WHISPERS,
  START_LV,
  makeBounty,
  rand,
  clamp,
  lerp,
} from "./data";
import type { Species, Lv, UpgradeId, Bounty } from "./data";
import { fishSprite, BOSS, bossPt } from "./sprites";

export type Mode =
  | "title"
  | "idle"
  | "sink"
  | "fight"
  | "catch"
  | "bossIntro"
  | "boss"
  | "bossDeath"
  | "victory"
  | "defeat";

export interface Fish {
  id: number;
  sp: Species;
  x: number;
  y: number;
  dir: 1 | -1;
  speed: number;
  phase: number;
  chase: boolean;
  hooked: boolean;
  fleeing: boolean;
  cool: number;
  kg: number;
  value: number;
}

export interface Lurker {
  x: number;
  y: number;
  dir: 1 | -1;
  state: "stalk" | "flee";
  t: number;
  blink: number;
  alpha: number;
  seed: number;
  revealed: number;
}

export interface GhostEye {
  x: number;
  y: number;
  life: number;
  max: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  col: string;
  size: number;
  grav: number;
}

export interface Ripple {
  x: number;
  y: number;
  r: number;
  maxR: number;
  col: string;
}

export interface Btn {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  label?: string;
  icon?: string;
  hold?: boolean;
  enabled?: boolean;
  kind?: "primary" | "danger" | "normal" | "ghost";
}

export interface Fight {
  fish: Fish;
  D: number;
  r: number;
  tension: number;
  st: "calm" | "warn" | "pull";
  stT: number;
  hookT: number;
  pullDir: 1 | -1;
  hooksetDone: boolean;
  powerReel: boolean;
  countering: boolean;
}

export interface Tentacle {
  x: number;
  w: number;
  t: number;
  warn: number;
  up: number;
  hold: number;
  down: number;
  hit: boolean;
}

export interface Spit {
  x: number;
  y: number;
  vx: number;
  vy: number;
  t: number;
}

export interface Boss {
  hp: number;
  x: number;
  y: number;
  st: "calm" | "warn" | "thrash";
  stT: number;
  atkT: number;
  stun: number;
  tension: number;
  jam: number;
  hurt: number;
  open: number;
  mouthT: number;
  phase: number;
  yv: number;
  dir: 1 | -1;
  flipT: number;
  suckWarn: number;
  suck: number;
  roar: number;
  lunge: number;
  powerReel: boolean;
  tents: Tentacle[];
  spits: Spit[];
  spitQ: number[];
  dying: number;
}

export interface CatchInfo {
  sp: Species;
  kg: number;
  value: number;
  bountyBonus: number;
  isNew: boolean;
  t: number;
}

const SAVE_KEY = "deephook.save.v1";

export class Game {
  W = 320;
  H = 180;
  scale = 3;
  SURF = 56;

  t = 0;
  mode: Mode = "title";
  modeT = 0;
  sfx = new Sfx();

  money = 0;
  lv: Lv = { ...START_LV };
  stats = {
    caught: 0,
    species: [] as string[],
    best: 0,
    deaths: 0,
    snaps: 0,
    bounties: 0,
    counts: {} as Record<string, number>,
    maxKg: {} as Record<string, number>,
  };
  bounty: Bounty = makeBounty(LINE_DEPTH[0], 0);
  bossBeaten = false;
  dread = 30;
  dawn = 0;
  hasSave = false;

  boatX = 100;
  boatSink = 0;
  hook = { x: 128, y: 0 };
  camY = 0;

  fish: Fish[] = [];
  lurkers: Lurker[] = [];
  ghosts: GhostEye[] = [];
  parts: Particle[] = [];
  ripples: Ripple[] = [];
  fight: Fight | null = null;
  catchInfo: CatchInfo | null = null;
  boss: Boss | null = null;
  shadow: { x: number; dir: number; speed: number; big: boolean } | null = null;
  introEyes = 0;

  toastMsg: { text: string; color: string; t: number; dur: number } | null = null;
  whisperMsg: { text: string; t: number; dur: number; x: number; y: number } | null = null;
  bannerT = 0;
  bannerText = "THE LEVIATHAN";

  shake = 0;
  flashFx = 0;
  hurtFx = 0;
  flashT = 0;
  flashCd = 0;
  invuln = 0;
  glitch = 0;
  hull = 4;
  hullMax = 4;
  shopOpen = false;
  lockerTab: "shop" | "log" = "shop";
  logPage = 0;
  sinkTime = 0;

  keys = new Set<string>();
  held = new Map<number, string>();
  drag: { id: number; x: number } | null = null;
  inp = { left: false, right: false, reel: false };
  reelLock = false;
  btns: Btn[] = [];
  isTouch = false;

  private nextId = 1;
  private whisperT = 12;
  private dreadSync = 0;
  private reelSfx = 0;
  private flags = { s1: false, s2: false, a: false, b: false, c: false, d: false };
  private bubbleT = 0;
  private ghostT = 0;

  constructor() {
    try {
      this.isTouch = window.matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 0;
    } catch {
      /* ignore */
    }
    this.loadSave();
    this.resetFish(true);
  }

  // ------------------------------------------------------------ setup
  resize(cw: number, ch: number) {
    const sc = Math.max(1, Math.floor(Math.min(cw / 170, ch / 180) + 0.15));
    this.scale = sc;
    this.W = Math.ceil(cw / sc);
    this.H = Math.ceil(ch / sc);
    this.SURF = clamp(Math.round(this.H * 0.3), 56, 112);
    this.boatX = clamp(Math.round(this.W * 0.42), 32, this.W - 32);
    if (this.mode === "idle" || this.mode === "title" || this.mode === "catch") {
      this.hook.x = this.rodTip().x;
    }
    this.hook.x = clamp(this.hook.x, 6, this.W - 6);
    return { W: this.W, H: this.H, scale: sc };
  }

  get maxDepth() {
    return LINE_DEPTH[this.lv.line];
  }

  get bob() {
    return Math.round(Math.sin(this.t * 1.7) * 1.4 + Math.sin(this.t * 0.8) * 0.6);
  }

  rodTip() {
    return { x: this.boatX + 30, y: -28 + this.bob + this.boatSink };
  }

  loadSave() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        if (typeof s.money === "number") this.hasSave = true;
      }
    } catch {
      /* ignore */
    }
  }

  save() {
    try {
      localStorage.setItem(
        SAVE_KEY,
        JSON.stringify({
          money: this.money,
          lv: this.lv,
          stats: this.stats,
          bounty: this.bounty,
          beaten: this.bossBeaten,
        })
      );
      this.hasSave = true;
    } catch {
      /* ignore */
    }
  }

  newGame() {
    this.money = 0;
    this.lv = { ...START_LV };
    this.stats = {
      caught: 0,
      species: [],
      best: 0,
      deaths: 0,
      snaps: 0,
      bounties: 0,
      counts: {},
      maxKg: {},
    };
    this.bounty = makeBounty(this.maxDepth, 0);
    this.bossBeaten = false;
    this.dawn = 0;
    this.save();
    this.beginPlay(0);
  }

  continueGame() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        this.money = s.money ?? 0;
        this.lv = { ...START_LV, ...(s.lv || {}) };
        this.stats = {
          ...this.stats,
          ...(s.stats || {}),
          counts: { ...(s.stats?.counts || {}) },
          maxKg: { ...(s.stats?.maxKg || {}) },
        };
        this.bounty = s.bounty || makeBounty(this.maxDepth, this.stats.bounties || 0);
        this.bossBeaten = !!s.beaten;
      }
    } catch {
      /* ignore */
    }
    this.dawn = this.bossBeaten ? 1 : 0;
    this.beginPlay(this.bossBeaten ? 0 : 6);
  }

  beginPlay(dread: number) {
    this.dread = dread;
    this.mode = "idle";
    this.modeT = 0;
    this.fight = null;
    this.boss = null;
    this.catchInfo = null;
    this.lurkers = [];
    this.ripples = [];
    this.shadow = null;
    this.flags = { s1: false, s2: false, a: false, b: false, c: false, d: false };
    this.hullMax = HULL_HEARTS[this.lv.hull];
    this.hull = this.hullMax;
    this.boatSink = 0;
    this.camY = 0;
    this.hook.y = 0;
    this.hook.x = this.rodTip().x;
    this.resetFish(true);
    this.toast(
      this.bossBeaten ? "THE SEA IS CALM... FISH IN PEACE" : "CAST YOUR LINE INTO THE DARK",
      "#cfe8f0",
      3
    );
    this.sfx.click();
  }

  resetFish(initial: boolean) {
    this.fish = [];
    const n = this.targetFish();
    for (let i = 0; i < n; i++) this.spawnFish(initial);
  }

  targetFish() {
    return Math.round(8 + this.maxDepth / 28);
  }

  // ------------------------------------------------------------ messages / fx
  toast(text: string, color = "#ffffff", dur = 2.2) {
    this.toastMsg = { text, color, t: 0, dur };
  }

  whisper(text: string) {
    this.whisperMsg = {
      text,
      t: 0,
      dur: 3.2,
      x: rand(0.3, 0.7) * this.W,
      y: this.SURF + rand(34, Math.max(40, this.H * 0.5 - this.SURF)),
    };
    this.sfx.whisper();
  }

  emit(
    n: number,
    x: number,
    y: number,
    o: Partial<Particle> & { spread?: number; speed?: number } = {}
  ) {
    for (let i = 0; i < n; i++) {
      const a =
        o.spread !== undefined ? -Math.PI / 2 + rand(-o.spread, o.spread) : rand(0, Math.PI * 2);
      const s = rand(0.3, 1) * (o.speed ?? 40);
      this.parts.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: 0,
        max: o.max ?? rand(0.4, 0.9),
        col: o.col ?? "#cfe8f0",
        size: o.size ?? 1,
        grav: o.grav ?? 90,
      });
    }
  }

  // ------------------------------------------------------------ input
  hitBtn(x: number, y: number): Btn | null {
    for (let i = this.btns.length - 1; i >= 0; i--) {
      const b = this.btns[i];
      if (b.enabled === false && !b.hold) continue;
      if (x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h) return b;
    }
    return null;
  }

  pointerDown(id: number, x: number, y: number, touch: boolean) {
    this.sfx.init();
    if (touch) this.isTouch = true;
    const b = this.hitBtn(x, y);
    if (b) {
      if (b.hold) {
        if (b.id === "reel" && (this.mode === "idle" || this.mode === "catch")) {
          this.onButton(this.mode === "idle" ? "cast" : "dismiss");
        } else {
          this.held.set(id, b.id);
          if (b.id === "reel" && this.mode === "fight") this.tryHookset();
        }
      } else if (b.enabled !== false) this.onButton(b.id);
      return;
    }
    if (this.mode === "catch") {
      this.onButton("dismiss");
      return;
    }
    if (this.mode === "victory" || this.mode === "defeat") return;
    if (
      this.mode === "sink" ||
      this.mode === "fight" ||
      this.mode === "boss" ||
      this.mode === "idle"
    ) {
      this.drag = { id, x };
    }
  }

  pointerMove(id: number, x: number) {
    if (this.drag && this.drag.id === id) this.drag.x = x;
  }

  pointerUp(id: number) {
    this.held.delete(id);
    if (this.drag && this.drag.id === id) this.drag = null;
  }

  keyDown(code: string, repeat: boolean) {
    this.sfx.init();
    this.keys.add(code);
    if (repeat) return;
    if (code === "KeyM") this.onButton("mute");
    if (code === "Space" || code === "Enter" || code === "ArrowUp" || code === "KeyW") {
      if (this.mode === "fight") this.tryHookset();
    }
    if (code === "Space" || code === "Enter") {
      switch (this.mode) {
        case "title":
          this.onButton(this.hasSave ? "continue" : "start");
          break;
        case "idle":
          if (this.shopOpen) this.onButton("closeshop");
          else this.onButton("cast");
          break;
        case "catch":
          this.onButton("dismiss");
          break;
        case "defeat":
          if (this.modeT > 2.2) this.onButton("retry");
          break;
        case "victory":
          if (this.modeT > 1) this.onButton("keep");
          break;
      }
    }
    if (code === "KeyS" && this.mode === "idle")
      this.onButton(this.shopOpen ? "closeshop" : "shop");
    if (code === "KeyJ" && this.mode === "idle") {
      if (this.shopOpen && this.lockerTab === "log") this.onButton("closeshop");
      else this.onButton("log");
    }
    if (code === "Escape" && this.shopOpen) this.onButton("closeshop");
    if (code === "KeyF" || code === "ShiftLeft" || code === "ShiftRight") this.onButton("flash");
    if (code === "KeyC" && this.mode === "idle" && this.dread >= 45 && !this.bossBeaten)
      this.onButton("call");
    if (this.shopOpen && this.lockerTab === "shop" && code.startsWith("Digit")) {
      const n = parseInt(code.slice(5), 10) - 1;
      if (n >= 0 && n < UPGRADES.length) this.buy(UPGRADES[n].id);
    }
  }

  keyUp(code: string) {
    this.keys.delete(code);
  }

  onButton(id: string) {
    this.sfx.init();
    switch (id) {
      case "start":
      case "newgame":
        this.newGame();
        break;
      case "continue":
        this.continueGame();
        break;
      case "cast":
        this.cast();
        break;
      case "shop":
        if (this.mode === "idle") {
          this.shopOpen = true;
          this.lockerTab = "shop";
          this.sfx.click();
        }
        break;
      case "log":
        if (this.mode === "idle") {
          this.shopOpen = true;
          this.lockerTab = "log";
          this.sfx.click();
        }
        break;
      case "tab:shop":
        this.lockerTab = "shop";
        this.sfx.click();
        break;
      case "tab:log":
        this.lockerTab = "log";
        this.sfx.click();
        break;
      case "log:prev":
        this.logPage = Math.max(0, this.logPage - 1);
        this.sfx.click();
        break;
      case "log:next":
        this.logPage = this.logPage + 1;
        this.sfx.click();
        break;
      case "closeshop":
        this.shopOpen = false;
        this.sfx.click();
        break;
      case "call":
        this.startBossIntro();
        break;
      case "flash":
        this.doFlash();
        break;
      case "mute":
        this.sfx.setMuted(!this.sfx.muted);
        break;
      case "dismiss":
        if (this.mode === "catch" && this.catchInfo && this.catchInfo.t > 0.45) this.endCatch();
        break;
      case "retry":
        this.retry();
        break;
      case "keep":
        this.keepFishing();
        break;
      case "title":
        this.mode = "title";
        this.modeT = 0;
        this.dread = 30;
        this.dawn = 0;
        break;
      default:
        if (id.startsWith("buy:")) this.buy(id.slice(4) as UpgradeId);
    }
  }

  buy(id: UpgradeId) {
    const up = UPGRADES.find((u) => u.id === id);
    if (!up || this.mode !== "idle") return;
    const lvl = this.lv[id];
    if (lvl >= up.costs.length) {
      this.sfx.error();
      return;
    }
    const cost = up.costs[lvl];
    if (this.money < cost) {
      this.sfx.error();
      this.toast("NOT ENOUGH MONEY", "#ff8a7a", 1.4);
      return;
    }
    this.money -= cost;
    this.lv[id] = lvl + 1;
    this.sfx.buy();
    if (id === "hull") {
      this.hullMax = HULL_HEARTS[this.lv.hull];
      this.hull = this.hullMax;
    }
    if (id === "line" || id === "bait") this.resetFish(true);
    this.save();
  }

  private computeInput() {
    const k = this.keys;
    const hold = (name: string) => {
      for (const v of this.held.values()) if (v === name) return true;
      return false;
    };
    this.inp.left = k.has("ArrowLeft") || k.has("KeyA") || hold("left");
    this.inp.right = k.has("ArrowRight") || k.has("KeyD") || hold("right");
    const raw = k.has("Space") || k.has("ArrowUp") || k.has("KeyW") || k.has("KeyR") || hold("reel");
    if (this.reelLock && !raw) this.reelLock = false;
    this.inp.reel = raw && !this.reelLock;
  }

  axis(cur: number): number {
    let a = 0;
    if (this.inp.left) a -= 1;
    if (this.inp.right) a += 1;
    if (a === 0 && this.drag) {
      const dx = this.drag.x - cur;
      if (Math.abs(dx) > 2) a = clamp(dx / 8, -1, 1);
    }
    return a;
  }

  // ------------------------------------------------------------ actions
  cast() {
    if (this.mode !== "idle" || this.shopOpen) return;
    const tip = this.rodTip();
    this.hook.x = tip.x;
    this.hook.y = 2;
    this.mode = "sink";
    this.modeT = 0;
    this.sinkTime = 0;
    if (this.inp.reel) this.reelLock = true;
    this.sfx.splash();
    this.emit(10, tip.x, 0, { spread: 0.8, speed: 55, col: "#bfe3f0" });
  }

  private tryHookset() {
    if (!this.fight || this.fight.hooksetDone) return;
    if (this.fight.hookT <= 0.65) {
      this.fight.hooksetDone = true;
      this.fight.r = Math.min(0.85, this.fight.r + 0.18);
      this.ripples.push({ x: this.hook.x, y: this.hook.y, r: 2, maxR: 28, col: "#ffd23f" });
      this.emit(8, this.hook.x, this.hook.y, { speed: 45, col: "#ffd23f", grav: -10, max: 0.5 });
      this.toast("PERFECT HOOKSET!", "#ffd23f", 1.1);
    }
  }

  doFlash() {
    if (this.flashCd > 0) return;
    if (this.mode !== "sink" && this.mode !== "fight" && this.mode !== "boss") return;
    this.flashT = 0.6;
    this.flashFx = 0.7;
    this.flashCd = this.mode === "boss" ? 6.5 : 5;
    this.sfx.flash();
    for (const l of this.lurkers) {
      const d = Math.hypot(l.x - this.hook.x, l.y - this.hook.y);
      if (l.state === "stalk" && d < 160) {
        l.state = "flee";
        l.t = 2.2;
        l.revealed = 1;
        this.sfx.screech();
      }
    }
    if (this.boss && this.mode === "boss" && this.boss.dying <= 0) {
      const b = this.boss;
      // Critical Gullet Flash: flashing when its maw is wide open (inhale or thrash warn) scorches its throat!
      const crit = b.suckWarn > 0 || b.suck > 0 || b.st === "warn";
      if (crit) {
        b.hp = Math.max(0.5, b.hp - 8);
        b.suckWarn = 0;
        b.suck = 0;
        b.stun = 3.1;
        b.hurt = 0.7;
        this.shake = 10;
        this.toast("CRITICAL FLASH! MAW SCORCHED!", "#ffd23f", 2.0);
      } else {
        b.stun = 2.3;
        this.toast("THE BEAST IS BLINDED!", "#fff2a0", 1.8);
      }
      b.st = "calm";
      b.stT = rand(3.2, 4.6);
      b.open = 2;
      b.mouthT = b.stun;
      b.spitQ = [];
      this.sfx.screech();
    }
  }

  endCatch() {
    this.catchInfo = null;
    this.mode = "idle";
    this.modeT = 0;
    this.hook.y = 0;
    this.hook.x = this.rodTip().x;
  }

  startBossIntro() {
    if (this.mode !== "idle" && this.mode !== "sink") return;
    this.mode = "bossIntro";
    this.modeT = 0;
    this.shopOpen = false;
    this.dread = 100;
    this.fight = null;
    this.fish = [];
    for (const l of this.lurkers) {
      l.state = "flee";
      l.t = 1.5;
    }
    this.hullMax = HULL_HEARTS[this.lv.hull];
    this.hull = this.hullMax;
    this.flags.a = this.flags.b = this.flags.c = this.flags.d = false;
    this.sfx.rumble(2.8);
    this.shake = Math.max(this.shake, 3);
  }

  retry() {
    this.stats.deaths++;
    this.save();
    this.boss = null;
    this.boatSink = 0;
    this.hurtFx = 0;
    this.beginPlay(70);
    this.toast("YOU WAKE ADRIFT. IT IS STILL OUT THERE.", "#ff9a8a", 3.5);
  }

  keepFishing() {
    this.bossBeaten = true;
    this.save();
    this.boss = null;
    this.beginPlay(0);
    this.dawn = 1;
  }

  // ------------------------------------------------------------ fish
  spawnFish(initial: boolean) {
    const maxY = Math.min(FLOOR_Y - 30, this.maxDepth + 90);
    const y = rand(28, maxY);
    const ws = SPECIES.map((sp) => {
      const [a, b] = sp.zone;
      if (y < a - 30 || y > b + 30) return 0;
      const mid = (a + b) / 2;
      const span = (b - a) / 2 + 30;
      let w = sp.weight * (1 - Math.pow(Math.abs(y - mid) / span, 2) * 0.8);
      const rarity = 1 - sp.weight / 10;
      w *= 1 + BAIT_BONUS[this.lv.bait] * rarity * 2.2;
      // Slightly boost active bounty species so players can hunt it reliably
      if (this.bounty && sp.id === this.bounty.spId) w *= 1.35;
      return Math.max(0, w);
    });
    const total = ws.reduce((a, b) => a + b, 0);
    let sp = SPECIES[0];
    if (total > 0) {
      let r = Math.random() * total;
      for (let i = 0; i < SPECIES.length; i++) {
        r -= ws[i];
        if (r <= 0) {
          sp = SPECIES[i];
          break;
        }
      }
    } else {
      sp = SPECIES[SPECIES.length - 1];
    }
    const dir: 1 | -1 = Math.random() < 0.5 ? 1 : -1;
    const kgT = Math.random();
    this.fish.push({
      id: this.nextId++,
      sp,
      x: initial ? rand(-10, this.W + 10) : dir === 1 ? -40 : this.W + 40,
      y,
      dir,
      speed: rand(sp.speed[0], sp.speed[1]),
      phase: rand(0, 6.28),
      chase: false,
      hooked: false,
      fleeing: false,
      cool: 0,
      kg: Math.round((sp.kg[0] + (sp.kg[1] - sp.kg[0]) * kgT) * 10) / 10,
      value: Math.round(sp.value * (0.75 + 0.5 * kgT)),
    });
  }

  fishMouth(f: Fish) {
    const s = fishSprite(f.sp.id, f.sp.look);
    return { x: f.x + f.dir * (s.mouth.x + 1 - s.w / 2), y: f.y + (s.mouth.y - s.h / 2) };
  }

  private updateFish(dt: number) {
    const inSink = this.mode === "sink";
    const sense = 1 + this.lv.bait * 0.12;
    for (let i = this.fish.length - 1; i >= 0; i--) {
      const f = this.fish[i];
      if (f.hooked) continue;
      f.cool = Math.max(0, f.cool - dt);
      const spd = f.fleeing ? f.speed * 2.6 : f.speed;
      f.y += Math.sin(this.t * 1.3 + f.phase) * 5 * dt;
      let moveDir: number = f.dir;
      if (inSink && f.cool <= 0 && !f.fleeing) {
        const m = this.fishMouth(f);
        const dx = this.hook.x - m.x;
        const dy = this.hook.y - m.y;
        const d = Math.hypot(dx, dy);
        const range = f.sp.sense * sense;
        if (d < range && this.hook.y > 10) f.chase = true;
        else if (d > range * 1.5) f.chase = false;
        if (f.chase) {
          const chaseBoost = 1.65;
          if (Math.abs(dx) > 3) {
            f.dir = dx > 0 ? 1 : -1;
            moveDir = f.dir;
          } else moveDir = 0;
          f.x += moveDir * spd * chaseBoost * dt;
          f.y += clamp(dy, -1, 1) * spd * 1.2 * dt;
          if (d < 6.5) {
            this.startFight(f);
            continue;
          }
        } else f.x += moveDir * spd * dt;
      } else {
        f.chase = false;
        f.x += moveDir * spd * dt;
      }
      if (f.x < -60 || f.x > this.W + 60) {
        this.fish.splice(i, 1);
        this.spawnFish(false);
      }
    }
    const tgt = this.targetFish();
    while (this.fish.length < tgt) this.spawnFish(false);
  }

  startFight(f: Fish) {
    f.hooked = true;
    f.chase = false;
    this.mode = "fight";
    this.modeT = 0;
    this.fight = {
      fish: f,
      D: Math.max(30, this.hook.y),
      r: 0,
      tension: 18,
      st: "calm",
      stT: rand(1.4, 2.2),
      hookT: 0,
      pullDir: f.dir,
      hooksetDone: false,
      powerReel: false,
      countering: false,
    };
    this.sfx.bite();
    this.shake = Math.max(this.shake, 3);
    this.toast("IT BITES! REEL IN THE GOLD ZONE!", "#fff2a0", 1.3);
    this.emit(6, this.hook.x, this.hook.y, { speed: 30, col: "#cfe8f0", size: 1, grav: -10 });
  }

  private updateFight(dt: number) {
    const f = this.fight!;
    const fish = f.fish;
    const sp = fish.sp;
    f.hookT += dt;
    const reeling = this.inp.reel && f.hookT > 0.25;
    if (this.inp.reel && !f.hooksetDone && f.hookT <= 0.65) this.tryHookset();

    const wire = WIRE_MULT[this.lv.wire];
    const baseRate = (0.22 / (0.6 + sp.str * 0.5)) * REEL_MULT[this.lv.reel];
    const steer = this.axis(this.hook.x);

    f.stT -= dt;
    if (f.st === "calm" && f.stT <= 0 && f.hookT > 1) {
      f.st = "warn";
      f.stT = clamp(0.62 - sp.str * 0.05, 0.36, 0.6);
      f.pullDir = Math.random() < 0.5 ? 1 : -1;
      fish.dir = f.pullDir;
      this.sfx.warn();
    } else if (f.st === "warn" && f.stT <= 0) {
      f.st = "pull";
      f.stT = 0.85 + sp.str * 0.18;
      fish.dir = f.pullDir;
      this.shake = Math.max(this.shake, 2.5);
    } else if (f.st === "pull" && f.stT <= 0) {
      f.st = "calm";
      f.stT = rand(1.6, 3.0) / (0.7 + sp.str * 0.25);
    }

    // Power Zone: keeping strain between 50% and 82% gives 1.55x reel speed!
    f.powerReel = reeling && f.st !== "pull" && f.tension >= 50 && f.tension <= 82;
    const rate = baseRate * (f.powerReel ? 1.55 : 1);

    // Counter-steering against the fish's pull direction reduces strain and loss!
    f.countering = f.st === "pull" && steer * f.pullDir < -0.2;

    if (f.st === "pull") {
      const counterMult = f.countering ? 0.65 : 1;
      if (reeling) {
        f.tension += (40 + 25 * sp.str) * wire * counterMult * dt;
        f.r += rate * 0.32 * dt;
      } else {
        f.tension -= (f.countering ? 34 : 25) * dt;
        f.r -= (0.11 + 0.05 * sp.str) * counterMult * dt;
      }
      this.hook.x += f.pullDir * (f.countering ? 7 : 16) * dt;
    } else {
      if (reeling) {
        f.tension += 22 * wire * dt;
        f.r += rate * dt;
      } else {
        f.tension -= 38 * dt;
        f.r -= 0.03 * sp.str * dt;
      }
    }
    f.tension = clamp(f.tension, 0, 110);
    this.hook.x = clamp(this.hook.x + steer * 42 * dt, 6, this.W - 6);
    this.hook.y = clamp(f.D * (1 - f.r), 0, FLOOR_Y);
    this.keepClearOfBoat(dt);

    if (reeling) this.tickReel(dt);

    if (f.tension >= 100) {
      this.snapLine("LINE SNAPPED!");
      return;
    }
    if (f.r >= 1) {
      this.landFish();
      return;
    }
    if (f.r <= -0.3) {
      fish.hooked = false;
      fish.fleeing = true;
      fish.cool = 8;
      this.fight = null;
      this.mode = "sink";
      this.modeT = 0;
      this.sfx.lost();
      this.toast("IT GOT AWAY...", "#ffb08a", 1.8);
    }
  }

  /** Keeps the hook / hooked fish / line from ever passing through the boat. */
  private keepClearOfBoat(dt: number) {
    const hy = this.hook.y;
    if (hy >= 36) return;
    const tip = this.rodTip();
    let minX = tip.x + 3;
    if (this.fight && this.mode === "fight") {
      const f = this.fight.fish;
      const s = fishSprite(f.sp.id, f.sp.look);
      minX = tip.x + (f.dir === 1 ? s.w - 2 : 4);
    }
    minX = Math.min(minX, this.W - 6);
    if (this.hook.x >= minX) return;
    if (hy < 14) this.hook.x = minX;
    else this.hook.x += (minX - this.hook.x) * Math.min(1, dt * 22 * (1 - (hy - 14) / 22));
  }

  private tickReel(dt: number) {
    this.reelSfx -= dt;
    if (this.reelSfx <= 0) {
      this.reelSfx = 0.075;
      this.sfx.reelTick();
    }
  }

  snapLine(msg: string) {
    const f = this.fight;
    if (f) {
      const i = this.fish.indexOf(f.fish);
      if (i >= 0) this.fish.splice(i, 1);
      this.spawnFish(false);
    }
    this.fight = null;
    this.stats.snaps++;
    this.mode = "idle";
    this.modeT = 0;
    this.hook.y = 0;
    this.hook.x = this.rodTip().x;
    this.dread = Math.min(100, this.dread + 2);
    this.shake = 6;
    this.sfx.snap();
    this.toast(msg, "#ff8a7a", 2);
  }

  private landFish() {
    const f = this.fight!;
    const fish = f.fish;
    const i = this.fish.indexOf(fish);
    if (i >= 0) this.fish.splice(i, 1);
    this.spawnFish(false);
    const id = fish.sp.id;
    const isNew = !this.stats.species.includes(id);
    if (isNew) this.stats.species.push(id);
    this.stats.caught++;
    this.stats.counts[id] = (this.stats.counts[id] || 0) + 1;
    this.stats.maxKg[id] = Math.max(this.stats.maxKg[id] || 0, fish.kg);
    this.stats.best = Math.max(this.stats.best, fish.value);

    // Check Deep Bounty completion
    let bountyBonus = 0;
    if (this.bounty && this.bounty.spId === id) {
      bountyBonus = this.bounty.reward;
      this.stats.bounties = (this.stats.bounties || 0) + 1;
      this.bounty = makeBounty(this.maxDepth, this.stats.bounties);
    }

    this.money += fish.value + bountyBonus;
    if (!this.bossBeaten) this.dread = Math.min(100, this.dread + fish.sp.dread);
    this.catchInfo = {
      sp: fish.sp,
      kg: fish.kg,
      value: fish.value,
      bountyBonus,
      isNew,
      t: 0,
    };
    this.fight = null;
    this.mode = "catch";
    this.modeT = 0;
    this.hook.y = 0;
    this.hook.x = this.rodTip().x;
    if (isNew || bountyBonus > 0 || fish.sp.value >= 70) this.sfx.rare();
    else this.sfx.catchFish();
    this.emit(14, this.rodTip().x, 0, { spread: 1, speed: 70, col: "#e8f6ff" });
    this.save();
  }

  private cutLine() {
    if (this.mode === "fight" && this.fight) {
      this.snapLine("A STALKER FISH DEVOURED YOUR CATCH!");
    } else {
      this.fight = null;
      this.mode = "idle";
      this.modeT = 0;
      this.hook.y = 0;
      this.hook.x = this.rodTip().x;
      this.dread = Math.min(100, this.dread + 3);
      this.shake = 6;
      this.sfx.snap();
      this.toast("A STALKER FISH BIT THROUGH YOUR LINE!", "#ff8a7a", 2.2);
    }
    this.sfx.screech();
    this.hurtFx = 0.35;
    this.glitch = 0.35;
  }

  // ------------------------------------------------------------ lurkers & eyes
  private updateLurkers(dt: number) {
    const inWater = this.mode === "sink" || this.mode === "fight";
    if (inWater && !this.bossBeaten && this.dread >= 20 && this.hook.y > 70) {
      const maxL = 1 + Math.floor(this.dread / 38);
      const active = this.lurkers.filter((l) => l.state === "stalk").length;
      if (active < maxL && Math.random() < dt * (0.05 + this.dread * 0.0012)) {
        const side = Math.random() < 0.5 ? -1 : 1;
        const d = rand(110, 145);
        this.lurkers.push({
          x: clamp(this.hook.x + side * d, -20, this.W + 20),
          y: Math.max(50, this.hook.y + rand(-55, 55)),
          dir: side < 0 ? 1 : -1,
          state: "stalk",
          t: 0,
          blink: rand(1, 3),
          alpha: 0,
          seed: Math.random() * 10,
          revealed: 0,
        });
      }
    }
    for (let i = this.lurkers.length - 1; i >= 0; i--) {
      const l = this.lurkers[i];
      l.blink -= dt;
      l.revealed = Math.max(0, l.revealed - dt * 0.6);
      if (l.state === "stalk") {
        l.alpha = Math.min(1, l.alpha + dt * 0.8);
        if (!inWater) {
          l.state = "flee";
          l.t = 1.5;
          continue;
        }
        const dx = this.hook.x - l.x;
        const dy = this.hook.y - l.y;
        if (Math.abs(dx) > 3) l.dir = dx >= 0 ? 1 : -1;
        const d = Math.hypot(dx, dy) || 1;
        const spd = 15 + this.dread * 0.2;
        l.x += (dx / d) * spd * dt;
        l.y += (dy / d) * spd * dt + Math.sin(this.t * 2.5 + l.seed) * 5 * dt;
        if (d < 15) {
          l.state = "flee";
          l.t = 2;
          l.revealed = 1;
          this.cutLine();
        }
      } else {
        l.t -= dt;
        const dx = l.x - this.hook.x;
        const dy = l.y - this.hook.y;
        if (Math.abs(dx) > 2) l.dir = dx >= 0 ? 1 : -1;
        const d = Math.hypot(dx, dy) || 1;
        l.x += (dx / d) * 90 * dt;
        l.y += (dy / d) * 90 * dt;
        l.alpha = Math.max(0, l.alpha - dt * 0.7);
        if (l.t <= 0 || l.alpha <= 0) this.lurkers.splice(i, 1);
      }
    }
  }

  private updateGhosts(dt: number) {
    for (let i = this.ghosts.length - 1; i >= 0; i--) {
      this.ghosts[i].life += dt;
      if (this.ghosts[i].life > this.ghosts[i].max) this.ghosts.splice(i, 1);
    }
    if (
      this.bossBeaten ||
      this.mode === "title" ||
      this.mode === "boss" ||
      this.mode === "bossDeath"
    )
      return;
    this.ghostT -= dt;
    if (this.ghostT <= 0 && this.dread > 18 && this.ghosts.length < 5) {
      this.ghostT = rand(1.2, 3.2) * (1.4 - this.dread / 140);
      const x = rand(10, this.W - 10);
      const y = this.camY + rand(this.SURF + 10, this.H - 30) - this.SURF;
      if (Math.hypot(x - this.hook.x, y - this.hook.y) > 50 && y > 40)
        this.ghosts.push({ x, y, life: 0, max: rand(1.6, 3.4) });
    }
  }

  // ------------------------------------------------------------ dread
  private updateDread(dt: number) {
    if (this.bossBeaten) {
      this.dread = 0;
      return;
    }
    const m = LAMP_DREAD[this.lv.lamp];
    let rate = 0;
    if (this.mode === "idle") rate = 0.12;
    else if (this.mode === "sink" || this.mode === "fight")
      rate = 0.38 * (1 + this.hook.y / 450);
    this.dread = Math.min(100, this.dread + rate * m * dt);

    const tier = Math.min(3, Math.floor((this.dread - 14) / 21));
    this.whisperT -= dt;
    if (
      this.whisperT <= 0 &&
      this.dread > 18 &&
      (this.mode === "idle" || this.mode === "sink" || this.mode === "fight")
    ) {
      this.whisperT = rand(10, 18);
      const list = WHISPERS[Math.max(0, tier)];
      this.whisper(list[Math.floor(Math.random() * list.length)]);
    }
    if (!this.flags.s1 && this.dread >= 42) {
      this.flags.s1 = true;
      this.startShadow(false);
    }
    if (!this.flags.s2 && this.dread >= 72) {
      this.flags.s2 = true;
      this.startShadow(true);
    }
    if (this.dread >= 100 && (this.mode === "idle" || this.mode === "sink"))
      this.startBossIntro();
    if (this.dread > 70 && Math.random() < dt * 0.12) this.glitch = 0.15;
  }

  private startShadow(big: boolean) {
    const dir = Math.random() < 0.5 ? 1 : -1;
    const len = this.W * (big ? 1.5 : 1.1);
    this.shadow = {
      x: dir === 1 ? -len : this.W + len,
      dir,
      speed: big ? 70 : 52,
      big,
    };
    this.sfx.rumble(3.5);
    this.toast("A MASSIVE FISH SHADOW PASSES BELOW...", "#ffb0a0", 3);
  }

  // ------------------------------------------------------------ boss
  private makeBoss() {
    this.boss = {
      hp: 100,
      x: this.W / 2,
      y: this.H - this.SURF + 150,
      st: "calm",
      stT: rand(4.5, 6),
      atkT: 3.2,
      stun: 0,
      tension: 0,
      jam: 0,
      hurt: 0,
      open: 1,
      mouthT: 0,
      phase: 1,
      yv: this.H - this.SURF + 150,
      dir: -1,
      flipT: 0,
      suckWarn: 0,
      suck: 0,
      roar: 0,
      lunge: 0,
      powerReel: false,
      tents: [],
      spits: [],
      spitQ: [],
      dying: 0,
    };
    this.bannerText = "THE LEVIATHAN";
  }

  bossMouthX() {
    const b = this.boss!;
    return b.x - BOSS.cx + bossPt(BOSS.mouth, b.dir).x;
  }

  bossHookPos() {
    const b = this.boss!;
    const p = bossPt(BOSS.hook, b.dir);
    return { x: b.x - BOSS.cx + p.x, y: b.yv - BOSS.cy + p.y };
  }

  private updateBossBody(dt: number) {
    const b = this.boss!;
    const sway = [0.16, 0.22, 0.28][b.phase - 1];
    const spd = [0.45, 0.6, 0.8][b.phase - 1];
    let tx = this.W / 2 + Math.sin(this.t * spd) * this.W * sway;
    // Keep the entire monster fish framed inside the screen width!
    const margin = Math.min(BOSS.cx - 8, Math.floor(this.W * 0.44));
    tx = clamp(tx, margin, this.W - margin);
    b.x = lerp(b.x, tx, 1 - Math.exp(-5 * dt));

    const near = 66;
    const deep = Math.max(near + 36, this.H - this.SURF - 92);
    const target = lerp(deep, near, 1 - b.hp / 100);
    b.y = lerp(b.y, target, 1 - Math.exp(-1.6 * dt));
    b.hurt = Math.max(0, b.hurt - dt);
    b.mouthT = Math.max(0, b.mouthT - dt);
    if (b.mouthT <= 0) b.open = b.st === "thrash" || b.st === "warn" ? 2 : 1;

    // Face the boat with hysteresis
    b.flipT -= dt;
    const toBoat = this.boatX - b.x;
    const want: 1 | -1 = toBoat < 0 ? -1 : 1;
    if (b.flipT <= 0 && Math.abs(toBoat) > 36 && want !== b.dir) {
      b.dir = want;
      b.flipT = 1.8;
    }
    b.lunge = Math.max(0, b.lunge - dt);
    const lungeOff = b.lunge > 0 ? -Math.sin((1 - b.lunge / 0.7) * Math.PI) * 48 : 0;
    b.yv = b.y + lungeOff;
    const hp = this.bossHookPos();
    const k = 1 - Math.exp(-14 * dt);
    this.hook.x = lerp(this.hook.x, hp.x, k);
    this.hook.y = lerp(this.hook.y, hp.y, k);
  }

  private safeSpotExists(xs: number[]) {
    const lo = 32;
    const hi = this.W - 32;
    const iv = xs.map((x) => [x - 22, x + 22]).sort((a, b) => a[0] - b[0]);
    let cur = lo;
    let best = 0;
    for (const [a, b] of iv) {
      if (a > cur) best = Math.max(best, Math.min(a, hi) - cur);
      cur = Math.max(cur, b);
    }
    if (cur < hi) best = Math.max(best, hi - cur);
    return best >= 10;
  }

  private spawnTentacles(n: number) {
    const b = this.boss!;
    const range = this.W - 64;
    n = Math.min(n, Math.max(1, Math.floor((range - 14) / 44)));
    const xs: number[] = [clamp(this.boatX + rand(-6, 6), 32, this.W - 32)];
    let tries = 0;
    while (xs.length < n && tries < 30) {
      tries++;
      const x = rand(26, this.W - 26);
      if (xs.some((o) => Math.abs(o - x) < 44)) continue;
      const test = [...xs, x];
      if (!this.safeSpotExists(test)) continue;
      xs.push(x);
    }
    const warn = 1.15 - b.phase * 0.1;
    for (const x of xs) {
      b.tents.push({ x, w: 14, t: 0, warn, up: 0.22, hold: 0.55, down: 0.4, hit: false });
    }
    this.sfx.warn();
  }

  private queueSpits(n: number) {
    const b = this.boss!;
    for (let i = 0; i < n; i++) b.spitQ.push(0.35 + i * 0.5);
    b.open = 2;
    b.mouthT = 0.5 + n * 0.5;
  }

  private startInhale() {
    const b = this.boss!;
    b.suckWarn = 0.95;
    b.open = 2;
    b.mouthT = 1;
    this.sfx.roar();
    this.toast("IT INHALES! STEER AWAY OR FLASH ITS MAW!", "#ffd23f", 2.4);
  }

  private bossAttack() {
    const b = this.boss!;
    const r = Math.random();
    if (b.phase === 1) {
      if (r < 0.55) this.spawnTentacles(1);
      else this.queueSpits(1);
    } else if (b.phase === 2) {
      if (r < 0.28) this.spawnTentacles(2);
      else if (r < 0.52) this.queueSpits(2);
      else if (r < 0.78) this.startInhale();
      else {
        this.spawnTentacles(1);
        this.queueSpits(1);
      }
    } else {
      if (r < 0.24) this.spawnTentacles(3);
      else if (r < 0.46) this.queueSpits(3);
      else if (r < 0.7) this.startInhale();
      else {
        this.spawnTentacles(2);
        this.queueSpits(2);
      }
    }
  }

  hurtBoat() {
    if (this.invuln > 0 || this.hull <= 0) return;
    this.hull--;
    this.invuln = 1.7;
    this.shake = 11;
    this.hurtFx = 0.6;
    this.sfx.hit();
    this.emit(14, this.boatX, -6, { spread: 1.4, speed: 80, col: "#c98a4a", size: 2 });
    if (this.hull <= 0) {
      this.mode = "defeat";
      this.modeT = 0;
      this.sfx.lose();
      if (this.boss) {
        this.boss.tents = [];
        this.boss.spits = [];
      }
    }
  }

  private updateBoss(dt: number) {
    const b = this.boss!;
    const np = b.hp > 66 ? 1 : b.hp > 33 ? 2 : 3;
    if (np > b.phase) {
      b.phase = np;
      b.roar = 1.5;
      b.atkT = 2.8;
      b.open = 2;
      b.mouthT = 1.5;
      b.suck = 0;
      b.suckWarn = 0;
      this.bannerText = np === 2 ? "IT GROWS ANGRY" : "FRENZY!";
      this.bannerT = 2.4;
      this.sfx.roar();
      this.shake = 12;
      this.flashFx = 0.5;
    }
    this.updateBossBody(dt);
    this.boatX = clamp(this.boatX + this.axis(this.boatX) * 95 * dt, 32, this.W - 32);
    b.roar = Math.max(0, b.roar - dt);

    // Inhale vortex: drags the boat toward the mouth, then lunges
    if (b.suckWarn > 0) {
      b.suckWarn -= dt;
      b.open = 2;
      b.mouthT = 0.3;
      if (b.suckWarn <= 0) {
        b.suck = b.phase === 3 ? 2.7 : 2.3;
        this.sfx.rumble(2.2);
      }
    } else if (b.suck > 0) {
      b.suck -= dt;
      b.open = 2;
      b.mouthT = 0.3;
      const mx = this.bossMouthX();
      const pull = b.phase === 3 ? 84 : 68;
      this.boatX = clamp(this.boatX + Math.sign(mx - this.boatX) * pull * dt, 32, this.W - 32);
      const my = b.yv - BOSS.cy + bossPt(BOSS.mouth, b.dir).y;
      for (let i = 0; i < 2; i++) {
        const a = rand(0, Math.PI * 2);
        const r = rand(46, 96);
        const px = mx + Math.cos(a) * r;
        const py = my + Math.sin(a) * r * 0.8;
        const d = Math.hypot(mx - px, my - py) || 1;
        this.parts.push({
          x: px,
          y: py,
          vx: ((mx - px) / d) * 90,
          vy: ((my - py) / d) * 90,
          life: 0,
          max: r / 90,
          col: "#9fd4e6",
          size: 1,
          grav: 0,
        });
      }
      if (b.suck <= 0) {
        b.lunge = 0.7;
        b.tents.push({
          x: clamp(mx, 26, this.W - 26),
          w: 28,
          t: 0,
          warn: 0.5,
          up: 0.2,
          hold: 0.55,
          down: 0.4,
          hit: false,
        });
        this.sfx.warn();
      }
    }

    b.stun -= dt;
    // Thrash cycle
    if (b.stun <= 0) {
      b.stT -= dt;
      if (b.st === "calm" && b.stT <= 0) {
        b.st = "warn";
        b.stT = 0.85;
        this.sfx.roar();
        this.toast("RELEASE REEL OR FLASH ITS MAW!", "#ff7a6a", 1.1);
        this.shake = Math.max(this.shake, 4);
      } else if (b.st === "warn" && b.stT <= 0) {
        b.st = "thrash";
        b.stT = 1.4 + b.phase * 0.2;
        this.sfx.slam();
        this.shake = Math.max(this.shake, 6);
        this.emit(16, b.x, 0, { spread: 1.2, speed: 70, col: "#bfe3f0" });
      } else if (b.st === "thrash" && b.stT <= 0) {
        b.st = "calm";
        b.stT = Math.max(2.4, rand(4, 6.2) - b.phase * 0.5);
      }
    } else b.st = "calm";

    // Reel / damage + Power Zone bonus
    const wire = WIRE_MULT[this.lv.wire];
    const reelMult = REEL_MULT[this.lv.reel];
    const reeling = this.inp.reel && b.jam <= 0;
    b.jam = Math.max(0, b.jam - dt);
    b.powerReel = reeling && b.st !== "thrash" && b.tension >= 50 && b.tension <= 82;
    if (reeling) {
      const thrash = b.st === "thrash";
      b.tension += (thrash ? 95 : 21) * wire * dt;
      const base =
        2.4 *
        reelMult *
        (b.stun > 0 ? 1.65 : 1) *
        (b.powerReel ? 1.45 : 1) *
        (thrash ? 0.25 : 1);
      b.hp -= base * dt;
      this.tickReel(dt);
    } else {
      b.tension -= 36 * dt;
      if (b.stun <= 0) b.hp = Math.min(100, b.hp + 0.45 * dt);
    }
    b.tension = clamp(b.tension, 0, 110);
    if (b.tension >= 100) {
      b.tension = 35;
      b.jam = 2;
      b.hp = Math.min(100, b.hp + 5);
      this.sfx.snap();
      this.shake = 6;
      this.flashFx = 0.3;
      this.toast("LINE SNAPPED! REEL JAMMED!", "#ff8a7a", 1.8);
    }
    if (b.hp <= 0) {
      b.hp = 0;
      this.mode = "bossDeath";
      this.modeT = 0;
      b.dying = 1;
      b.tents = [];
      b.spits = [];
      this.sfx.roar();
      this.flashFx = 1;
      return;
    }

    // Attacks
    if (b.stun <= 0 && b.roar <= 0 && b.suck <= 0 && b.suckWarn <= 0) {
      b.atkT -= dt;
      if (b.atkT <= 0) {
        this.bossAttack();
        b.atkT = [2.9, 2.3, 1.8][b.phase - 1] + rand(0, 1);
      }
    }
    // Spit queue
    for (let i = b.spitQ.length - 1; i >= 0; i--) {
      b.spitQ[i] -= dt;
      if (b.spitQ[i] <= 0) {
        b.spitQ.splice(i, 1);
        const mp = bossPt(BOSS.mouth, b.dir);
        const mx = b.x - BOSS.cx + mp.x;
        const my = b.yv - BOSS.cy + mp.y;
        const tx = this.boatX + rand(-6, 6);
        const ty = -10;
        const d = Math.hypot(tx - mx, ty - my) || 1;
        const sp = 108 + b.phase * 10;
        b.spits.push({
          x: mx,
          y: my,
          vx: ((tx - mx) / d) * sp,
          vy: ((ty - my) / d) * sp,
          t: 0,
        });
        this.sfx.spit();
      }
    }
    // Spits
    for (let i = b.spits.length - 1; i >= 0; i--) {
      const s = b.spits[i];
      s.t += dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      if (Math.hypot(s.x - this.boatX, s.y - -8) < 15) {
        b.spits.splice(i, 1);
        this.hurtBoat();
        continue;
      }
      if (s.y < -50 || s.x < -30 || s.x > this.W + 30) b.spits.splice(i, 1);
    }
    // Bone spears
    for (let i = b.tents.length - 1; i >= 0; i--) {
      const tn = b.tents[i];
      const prev = tn.t;
      tn.t += dt;
      if (prev < tn.warn && tn.t >= tn.warn) {
        this.sfx.slam();
        this.shake = Math.max(this.shake, 4);
        this.emit(10, tn.x, 0, { spread: 0.9, speed: 80, col: "#bfe3f0" });
      }
      const k = tn.t - tn.warn;
      if (
        k > tn.up * 0.6 &&
        k < tn.up + tn.hold &&
        Math.abs(this.boatX - tn.x) < tn.w / 2 + 15
      ) {
        this.hurtBoat();
      }
      if (tn.t > tn.warn + tn.up + tn.hold + tn.down) b.tents.splice(i, 1);
    }
    if (this.mode === "boss" && this.invuln > 0) this.invuln -= dt;
  }

  private updateBossIntro(dt: number) {
    const t = this.modeT;
    this.hook.y = Math.max(0, this.hook.y - 420 * dt);
    this.hook.x = lerp(this.hook.x, this.rodTip().x, 1 - Math.exp(-6 * dt));
    if (!this.flags.a && t > 0.1) {
      this.flags.a = true;
      this.toast("THE WATER GOES STILL...", "#cfe8f0", 2.2);
    }
    if (!this.flags.b && t > 1.8) {
      this.flags.b = true;
      this.shadow = { x: -this.W * 1.5, dir: 1, speed: 140, big: true };
      this.sfx.rumble(3.5);
    }
    if (!this.flags.c && t > 3.6) {
      this.flags.c = true;
      this.whisper("IT HAS NOTICED YOU.");
    }
    if (t > 3.6) this.introEyes = clamp((t - 3.6) / 1.2, 0, 1);
    if (t > 2) this.shake = Math.max(this.shake, 2 + (t - 2) * 0.8);
    if (!this.flags.d && t > 5.2) {
      this.flags.d = true;
      this.shadow = null;
      this.makeBoss();
      this.sfx.roar();
      this.flashFx = 1;
      this.shake = 14;
    }
    if (this.boss) this.updateBossBody(dt);
    if (t > 7.6) {
      this.mode = "boss";
      this.modeT = 0;
      this.bannerT = 2.6;
      this.introEyes = 0;
      this.flashCd = 0;
      this.invuln = 0;
    }
  }

  private updateBossDeath(dt: number) {
    const b = this.boss!;
    const t = this.modeT;
    b.y += dt * 14;
    b.yv = b.y;
    this.dawn = clamp((t - 1.2) / 4, 0, 1);
    this.shake = Math.max(this.shake, 3);
    if (Math.random() < dt * 14) {
      this.emit(6, b.x + rand(-60, 60), b.y + rand(-40, 30), {
        speed: 50,
        col: "#8a1a2a",
        size: 2,
        grav: -20,
        max: 1.2,
      });
    }
    if (Math.random() < dt * 2.5) this.flashFx = 0.5;
    if (t > 5.5) {
      this.mode = "victory";
      this.modeT = 0;
      this.sfx.win();
      this.save();
    }
  }

  // ------------------------------------------------------------ main update
  update(dtRaw: number) {
    const dt = Math.min(dtRaw, 0.05);
    this.t += dt;
    this.modeT += dt;
    this.computeInput();

    this.shake = Math.max(0, this.shake - dt * 14);
    this.flashFx = Math.max(0, this.flashFx - dt * 1.6);
    this.hurtFx = Math.max(0, this.hurtFx - dt * 1.4);
    this.flashT = Math.max(0, this.flashT - dt);
    this.flashCd = Math.max(0, this.flashCd - dt);
    this.glitch = Math.max(0, this.glitch - dt);
    if (this.mode !== "boss") this.invuln = Math.max(0, this.invuln - dt);
    this.bannerT = Math.max(0, this.bannerT - dt);

    const playing =
      this.mode === "idle" || this.mode === "sink" || this.mode === "fight" || this.mode === "catch";

    switch (this.mode) {
      case "title":
        this.updateFish(dt);
        break;
      case "idle":
        this.hook.x = this.rodTip().x;
        this.hook.y = 0;
        this.updateFish(dt);
        break;
      case "sink": {
        this.sinkTime += dt;
        const reeling = this.inp.reel;
        const rise = 62 + this.lv.reel * 14;
        const sinkSpd = 38;
        if (reeling) {
          this.hook.y -= rise * dt;
          this.tickReel(dt);
        } else this.hook.y += sinkSpd * dt;
        this.hook.y = clamp(this.hook.y, 0, this.maxDepth);
        this.hook.x = clamp(this.hook.x + this.axis(this.hook.x) * 70 * dt, 6, this.W - 6);
        this.keepClearOfBoat(dt);
        this.updateFish(dt);
        if (this.mode === "sink" && this.hook.y <= 0 && reeling) {
          this.mode = "idle";
          this.modeT = 0;
          this.hook.x = this.rodTip().x;
          this.sfx.splash();
          this.emit(8, this.hook.x, 0, { spread: 0.8, speed: 45 });
        }
        break;
      }
      case "fight":
        this.updateFight(dt);
        this.updateFish(dt);
        break;
      case "catch":
        this.hook.x = this.rodTip().x;
        this.hook.y = 0;
        if (this.catchInfo) {
          this.catchInfo.t += dt;
          if (this.catchInfo.t > 4) this.endCatch();
        }
        this.updateFish(dt);
        break;
      case "bossIntro":
        this.updateBossIntro(dt);
        break;
      case "boss":
        this.updateBoss(dt);
        break;
      case "bossDeath":
        this.updateBossDeath(dt);
        break;
      case "defeat":
        this.boatSink = Math.min(60, this.boatSink + dt * 22);
        if (this.boss) this.updateBossBody(dt);
        break;
      case "victory":
        break;
    }

    if (playing) {
      this.updateLurkers(dt);
      this.updateDread(dt);
      this.bubbleT -= dt;
      if (this.mode === "sink" || this.mode === "fight") {
        if (this.bubbleT <= 0) {
          this.bubbleT = 0.18;
          this.emit(1, this.hook.x + rand(-1, 1), this.hook.y - 2, {
            speed: 6,
            col: "#9fd4e6",
            grav: -22,
            max: 1.4,
          });
        }
      }
    } else if (this.mode === "bossIntro") {
      this.updateLurkers(dt);
    }
    if (this.mode === "title") this.dread = 34;
    this.updateGhosts(dt);

    // Camera
    let target = 0;
    if (this.mode === "sink" || this.mode === "fight")
      target = Math.max(0, this.hook.y + this.SURF - this.H * 0.5);
    this.camY = lerp(this.camY, target, 1 - Math.exp(-5 * dt));
    if (Math.abs(this.camY - target) < 0.2) this.camY = target;

    // Shadow
    if (this.shadow) {
      this.shadow.x += this.shadow.dir * this.shadow.speed * dt;
      const len = this.W * (this.shadow.big ? 1.5 : 1.1);
      if (Math.abs(this.shadow.x - this.W / 2) < this.W * 0.55)
        this.shake = Math.max(this.shake, this.shadow.big ? 2.5 : 1.2);
      if (
        (this.shadow.dir === 1 && this.shadow.x > this.W + len + 40) ||
        (this.shadow.dir === -1 && this.shadow.x < -len - 40)
      )
        this.shadow = null;
    }

    // Ripples
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const rp = this.ripples[i];
      rp.r += 58 * dt;
      if (rp.r >= rp.maxR) this.ripples.splice(i, 1);
    }

    // Particles
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i];
      p.life += dt;
      p.vy += p.grav * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.life >= p.max) this.parts.splice(i, 1);
    }

    // Timers
    if (this.toastMsg) {
      this.toastMsg.t += dt;
      if (this.toastMsg.t > this.toastMsg.dur) this.toastMsg = null;
    }
    if (this.whisperMsg) {
      this.whisperMsg.t += dt;
      if (this.whisperMsg.t > this.whisperMsg.dur) this.whisperMsg = null;
    }

    // Audio
    this.dreadSync -= dt;
    if (this.dreadSync <= 0) {
      this.dreadSync = 0.25;
      const bossy = this.mode === "boss" || this.mode === "bossIntro";
      this.sfx.setDread(this.mode === "title" ? 25 : bossy ? 100 : this.dread, bossy);
    }
    if (playing || this.mode === "boss" || this.mode === "bossIntro") this.sfx.heartbeat(dt);
  }
}
