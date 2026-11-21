import type { FishLook } from "./sprites";

export interface Species {
  id: string;
  name: string;
  zone: [number, number]; // preferred depth range (internal units; 4 units = 1M)
  weight: number; // spawn weight
  speed: [number, number];
  value: number;
  str: number; // fight strength
  dread: number; // dread gained on catch
  sense: number; // how far it notices the hook
  kg: [number, number];
  flavor: string;
  look: FishLook;
  horror?: boolean;
}

export const SPECIES: Species[] = [
  {
    id: "minnow",
    name: "Pale Minnow",
    zone: [12, 110],
    weight: 10,
    speed: [22, 34],
    value: 5,
    str: 0.4,
    dread: 0,
    sense: 46,
    kg: [0.1, 0.4],
    flavor: "A tiny thing. Its eyes follow the lantern.",
    look: {
      len: 14,
      hgt: 6,
      shape: "stream",
      body: "#9fb7c4",
      belly: "#d8e4ea",
      dark: "#6f8998",
      fin: "#7f9bab",
      eye: "dot",
      mouth: "small",
      tail: "fork",
      seed: 1,
    },
  },
  {
    id: "perch",
    name: "Silver Perch",
    zone: [25, 160],
    weight: 9,
    speed: [20, 32],
    value: 10,
    str: 0.8,
    dread: 0,
    sense: 50,
    kg: [0.4, 1.4],
    flavor: "Cold and silver, like a coin from a drowned man.",
    look: {
      len: 19,
      hgt: 9,
      shape: "stream",
      body: "#b8c6cf",
      belly: "#eef3f5",
      dark: "#7d8e9a",
      fin: "#8fa3b0",
      eye: "dot",
      mouth: "small",
      tail: "fork",
      stripes: "#7b8d9c",
      spiny: true,
      seed: 2,
    },
  },
  {
    id: "bass",
    name: "Moon Bass",
    zone: [50, 210],
    weight: 8,
    speed: [18, 30],
    value: 18,
    str: 1.2,
    dread: 1,
    sense: 54,
    kg: [1.2, 3.8],
    flavor: "Pale as the moon. Its belly is strangely warm.",
    look: {
      len: 23,
      hgt: 11,
      shape: "stream",
      body: "#6e8aa6",
      belly: "#cfe0ea",
      dark: "#41566e",
      fin: "#566f8a",
      eye: "big",
      mouth: "teeth",
      tail: "fork",
      spiny: true,
      seed: 3,
    },
  },
  {
    id: "carp",
    name: "Gloom Carp",
    zone: [110, 270],
    weight: 7,
    speed: [16, 26],
    value: 32,
    str: 1.7,
    dread: 1.5,
    sense: 56,
    kg: [3, 8],
    flavor: "Striped like old bandages. It smells of salt and rot.",
    look: {
      len: 26,
      hgt: 13,
      shape: "deep",
      body: "#6b5a76",
      belly: "#b9a7c4",
      dark: "#43374d",
      fin: "#54445f",
      eye: "white",
      mouth: "small",
      tail: "fork",
      stripes: "#a894b8",
      whiskers: true,
      seed: 4,
    },
  },
  {
    id: "eel",
    name: "Lantern Eel",
    zone: [160, 340],
    weight: 6,
    speed: [24, 38],
    value: 50,
    str: 2.0,
    dread: 2,
    sense: 62,
    kg: [2, 5],
    flavor: "It hums a song you almost remember.",
    look: {
      len: 35,
      hgt: 8,
      shape: "eel",
      body: "#2f6a7a",
      belly: "#6fb7c4",
      dark: "#1d4552",
      fin: "#255a68",
      eye: "white",
      mouth: "teeth",
      tail: "long",
      glow: "#8dfcff",
      fangs: true,
      seed: 5,
    },
  },
  {
    id: "bonefish",
    name: "Bonefish",
    zone: [200, 380],
    weight: 5,
    speed: [18, 28],
    value: 70,
    str: 2.2,
    dread: 3,
    sense: 60,
    kg: [0.8, 1.6],
    flavor: "No flesh left. Still it swims. Still it hungers.",
    horror: true,
    look: {
      len: 29,
      hgt: 13,
      shape: "shark",
      body: "#e6e2cf",
      belly: "#e6e2cf",
      dark: "#e6e2cf",
      fin: "#e6e2cf",
      eye: "red",
      mouth: "teeth",
      tail: "fork",
      skeleton: true,
      fangs: true,
      spiny: true,
      seed: 6,
    },
  },
  {
    id: "cod",
    name: "Eyeless Cod",
    zone: [260, 450],
    weight: 5,
    speed: [14, 24],
    value: 95,
    str: 2.5,
    dread: 4,
    sense: 66,
    kg: [6, 14],
    flavor: "Where are its eyes? Who sewed its mouth?",
    horror: true,
    look: {
      len: 31,
      hgt: 15,
      shape: "deep",
      body: "#7a6f62",
      belly: "#b6aa98",
      dark: "#4d453c",
      fin: "#5e554a",
      eye: "none",
      mouth: "teeth",
      tail: "fan",
      spots: "#3a332b",
      stitched: true,
      whiskers: true,
      seed: 8,
    },
  },
  {
    id: "angler",
    name: "Many-Eyed Angler",
    zone: [340, 540],
    weight: 4,
    speed: [12, 20],
    value: 140,
    str: 2.9,
    dread: 5,
    sense: 70,
    kg: [14, 30],
    flavor: "Every eye blinks at a different time.",
    horror: true,
    look: {
      len: 33,
      hgt: 18,
      shape: "angler",
      body: "#3b2f52",
      belly: "#6a5a8a",
      dark: "#241c36",
      fin: "#4c386e",
      eye: "many",
      mouth: "huge",
      tail: "fan",
      lure: true,
      glow: "#9dfcff",
      fangs: true,
      spiny: true,
      seed: 9,
    },
  },
  {
    id: "fangtooth",
    name: "Fangtooth",
    zone: [380, 620],
    weight: 3,
    speed: [20, 30],
    value: 175,
    str: 3.0,
    dread: 5.5,
    sense: 74,
    kg: [8, 18],
    flavor: "Its teeth are too long for its own skull.",
    horror: true,
    look: {
      len: 33,
      hgt: 14,
      shape: "shark",
      body: "#182836",
      belly: "#325268",
      dark: "#0c141c",
      fin: "#254056",
      eye: "white",
      mouth: "huge",
      tail: "fork",
      lure: true,
      glow: "#7dffd0",
      fangs: true,
      spiny: true,
      seed: 12,
    },
  },
  {
    id: "gulper",
    name: "Drowned Gulper",
    zone: [440, 700],
    weight: 3,
    speed: [10, 18],
    value: 210,
    str: 3.2,
    dread: 6,
    sense: 74,
    kg: [30, 70],
    flavor: "Something inside it is still moving.",
    horror: true,
    look: {
      len: 39,
      hgt: 19,
      shape: "angler",
      body: "#2a3a30",
      belly: "#52695a",
      dark: "#18241c",
      fin: "#2c4236",
      eye: "red",
      mouth: "huge",
      tail: "fork",
      spots: "#6a8a72",
      lure: true,
      glow: "#ff6a4a",
      fangs: true,
      seed: 10,
    },
  },
  {
    id: "grinner",
    name: "The Grinner",
    zone: [520, 740],
    weight: 2,
    speed: [12, 20],
    value: 320,
    str: 3.5,
    dread: 9,
    sense: 78,
    kg: [20, 45],
    flavor: "It smiles with too many teeth. It knows your name.",
    horror: true,
    look: {
      len: 38,
      hgt: 18,
      shape: "shark",
      body: "#b9b0a8",
      belly: "#e8dfd6",
      dark: "#8a817a",
      fin: "#9a918a",
      eye: "big",
      mouth: "grin",
      tail: "fork",
      fangs: true,
      spiny: true,
      seed: 11,
    },
  },
];

export type UpgradeId = "line" | "reel" | "wire" | "lamp" | "bait" | "hull";

export interface UpgradeDef {
  id: UpgradeId;
  name: string;
  desc: string;
  costs: number[];
}

export const UPGRADES: UpgradeDef[] = [
  { id: "line", name: "DEEP LINE", desc: "SINK DEEPER", costs: [30, 80, 170, 320] },
  { id: "reel", name: "FAST REEL", desc: "REEL POWER", costs: [35, 90, 180, 340] },
  { id: "wire", name: "STEEL WIRE", desc: "LESS STRAIN", costs: [30, 75, 150, 300] },
  { id: "lamp", name: "LANTERN", desc: "LIGHT + NERVES", costs: [25, 70, 140, 260] },
  { id: "bait", name: "GLOW BAIT", desc: "RARER FISH", costs: [40, 100, 200, 380] },
  { id: "hull", name: "HULL PLATES", desc: "+1 BOAT HEART", costs: [45, 110, 230, 400] },
];

export const LINE_DEPTH = [160, 250, 360, 500, 680];
export const REEL_MULT = [1, 1.25, 1.5, 1.8, 2.2];
export const WIRE_MULT = [1, 0.88, 0.76, 0.65, 0.55];
export const LAMP_RADIUS = [34, 44, 54, 64, 76];
export const LAMP_DREAD = [1, 0.92, 0.84, 0.76, 0.68];
export const BAIT_BONUS = [0, 0.25, 0.5, 0.75, 1.0];
export const HULL_HEARTS = [4, 5, 6, 7, 8];

export const FLOOR_Y = 760;

export const WHISPERS: string[][] = [
  ["Something tugged your line...", "The water is too quiet.", "Did the moon just blink?"],
  ["It is watching from below.", "Don't look down.", "The fish are leaving."],
  ["Who is holding the line?", "It knows your name.", "Even the lantern is afraid."],
  ["It is coming up.", "Too late. Too late.", "Row. Row. Row."],
];

export type Lv = Record<UpgradeId, number>;
export const START_LV: Lv = { line: 0, reel: 0, wire: 0, lamp: 0, bait: 0, hull: 0 };

export interface Bounty {
  spId: string;
  name: string;
  depthM: [number, number];
  reward: number;
}

export function makeBounty(maxDepth: number, step: number): Bounty {
  const reachable = SPECIES.filter((s) => s.zone[0] <= maxDepth - 15);
  const pool = reachable.length > 0 ? reachable : [SPECIES[0], SPECIES[1]];
  // Prefer deeper reachable fish as step increases
  const idx = Math.min(pool.length - 1, Math.floor(((step * 3 + 1) % (pool.length + 1)) * 0.85));
  const sp = pool[idx] || pool[pool.length - 1];
  return {
    spId: sp.id,
    name: sp.name.toUpperCase(),
    depthM: [Math.round(sp.zone[0] / 4), Math.round(sp.zone[1] / 4)],
    reward: Math.round(sp.value * 1.4 + 15),
  };
}

export function rand(a: number, b: number) {
  return a + Math.random() * (b - a);
}
export function clamp(v: number, a: number, b: number) {
  return v < a ? a : v > b ? b : v;
}
export function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}
