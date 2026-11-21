// Procedural WebAudio sound: ocean ambience, dread drone and all effects. No assets needed.

type OscType = OscillatorType;

export class Sfx {
  ctx: AudioContext | null = null;
  master: GainNode | null = null;
  noiseBuf: AudioBuffer | null = null;
  muted = false;
  droneGain: GainNode | null = null;
  drone2: OscillatorNode | null = null;
  drone3: OscillatorNode | null = null;
  droneFilter: BiquadFilterNode | null = null;
  oceanFilter: BiquadFilterNode | null = null;
  oceanGain: GainNode | null = null;
  heartAcc = 0;
  dread = 0;
  boss = false;

  init() {
    if (this.ctx) {
      if (this.ctx.state === "suspended") void this.ctx.resume();
      return;
    }
    const AC: typeof AudioContext | undefined =
      window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    try {
      this.ctx = new AC();
    } catch {
      return;
    }
    const ctx = this.ctx;
    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.8;
    this.master.connect(ctx.destination);

    // noise buffer
    const len = ctx.sampleRate * 2;
    this.noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;

    // ocean ambience
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    this.oceanFilter = ctx.createBiquadFilter();
    this.oceanFilter.type = "lowpass";
    this.oceanFilter.frequency.value = 420;
    this.oceanGain = ctx.createGain();
    this.oceanGain.gain.value = 0.16;
    src.connect(this.oceanFilter).connect(this.oceanGain).connect(this.master);
    src.start();
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.11;
    const lfoG = ctx.createGain();
    lfoG.gain.value = 200;
    lfo.connect(lfoG).connect(this.oceanFilter.frequency);
    lfo.start();

    // dread drone
    this.droneGain = ctx.createGain();
    this.droneGain.gain.value = 0.02;
    this.droneFilter = ctx.createBiquadFilter();
    this.droneFilter.type = "lowpass";
    this.droneFilter.frequency.value = 220;
    const o1 = ctx.createOscillator();
    o1.type = "sine";
    o1.frequency.value = 49;
    this.drone2 = ctx.createOscillator();
    this.drone2.type = "sawtooth";
    this.drone2.frequency.value = 73.4;
    this.drone3 = ctx.createOscillator();
    this.drone3.type = "triangle";
    this.drone3.frequency.value = 98.9;
    o1.connect(this.droneFilter);
    this.drone2.connect(this.droneFilter);
    this.drone3.connect(this.droneFilter);
    this.droneFilter.connect(this.droneGain).connect(this.master);
    o1.start();
    this.drone2.start();
    this.drone3.start();
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(m ? 0 : 0.8, this.ctx.currentTime, 0.05);
  }

  setDread(d: number, boss: boolean) {
    this.dread = d;
    this.boss = boss;
    if (!this.ctx || !this.droneGain || !this.droneFilter || !this.drone2 || !this.drone3) return;
    const t = this.ctx.currentTime;
    const n = d / 100;
    this.droneGain.gain.setTargetAtTime(0.02 + n * 0.1 + (boss ? 0.06 : 0), t, 0.5);
    this.droneFilter.frequency.setTargetAtTime(180 + n * 500 + (boss ? 300 : 0), t, 0.5);
    this.drone2.frequency.setTargetAtTime(73.4 + n * 6 + (boss ? 4 : 0), t, 0.5);
    this.drone3.frequency.setTargetAtTime(98.9 - n * 9, t, 0.5);
    this.oceanGain?.gain.setTargetAtTime(0.16 - n * 0.06, t, 0.8);
  }

  heartbeat(dt: number) {
    if (this.dread < 45 && !this.boss) return;
    const bpm = 58 + this.dread * 0.7 + (this.boss ? 15 : 0);
    this.heartAcc += dt;
    if (this.heartAcc > 60 / bpm) {
      this.heartAcc = 0;
      const v = 0.25 + (this.dread / 100) * 0.3;
      this.tone(58, 0.14, "sine", v, 40);
      this.tone(52, 0.16, "sine", v * 0.8, 36, 0.17);
    }
  }

  tone(freq: number, dur: number, type: OscType = "square", vol = 0.1, slideTo?: number, delay = 0) {
    const ctx = this.ctx;
    if (!ctx || !this.master || this.muted) return;
    const t = ctx.currentTime + delay;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo !== undefined) o.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  noise(
    dur: number,
    vol = 0.1,
    type: BiquadFilterType = "lowpass",
    f1 = 1000,
    f2 = 300,
    delay = 0,
    q = 1
  ) {
    const ctx = this.ctx;
    if (!ctx || !this.master || !this.noiseBuf || this.muted) return;
    const t = ctx.currentTime + delay;
    const s = ctx.createBufferSource();
    s.buffer = this.noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.Q.value = q;
    f.frequency.setValueAtTime(f1, t);
    f.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.03, dur / 3));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(this.master);
    s.start(t, Math.random());
    s.stop(t + dur + 0.05);
  }

  click() {
    this.tone(720, 0.05, "square", 0.07);
  }
  splash() {
    this.noise(0.4, 0.3, "lowpass", 2200, 260);
    this.tone(260, 0.12, "sine", 0.12, 90);
  }
  reelTick() {
    this.noise(0.03, 0.06, "highpass", 3000, 2500);
    this.tone(95, 0.03, "square", 0.025);
  }
  bite() {
    this.tone(520, 0.08, "square", 0.12);
    this.tone(780, 0.12, "square", 0.12, undefined, 0.09);
    this.noise(0.2, 0.15, "lowpass", 900, 200);
  }
  warn() {
    this.tone(180, 0.18, "sawtooth", 0.09, 130);
  }
  catchFish() {
    [392, 494, 587, 784].forEach((f, i) => this.tone(f, 0.12, "square", 0.09, undefined, i * 0.09));
  }
  rare() {
    [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.14, "triangle", 0.12, undefined, i * 0.08));
  }
  snap() {
    this.noise(0.25, 0.3, "highpass", 4000, 800);
    this.tone(220, 0.3, "sawtooth", 0.14, 50);
  }
  lost() {
    this.tone(300, 0.35, "triangle", 0.12, 90);
  }
  hit() {
    this.tone(150, 0.4, "sawtooth", 0.25, 38);
    this.noise(0.4, 0.4, "lowpass", 1200, 100);
  }
  flash() {
    this.tone(400, 0.35, "sine", 0.16, 2200);
    this.noise(0.3, 0.12, "highpass", 3000, 6000);
  }
  screech() {
    this.tone(1100, 0.55, "sawtooth", 0.1, 320);
    this.tone(1180, 0.5, "square", 0.05, 360, 0.02);
    this.noise(0.5, 0.12, "bandpass", 2400, 800, 0, 4);
  }
  whisper() {
    this.noise(1.1, 0.07, "bandpass", 1600, 900, 0, 6);
    this.noise(0.9, 0.05, "bandpass", 2400, 1300, 0.25, 8);
  }
  rumble(d = 1.8) {
    this.noise(d, 0.5, "lowpass", 160, 40);
    this.tone(48, d, "sine", 0.3, 30);
  }
  roar() {
    this.tone(95, 1.7, "sawtooth", 0.3, 38);
    this.tone(70, 1.7, "square", 0.14, 30, 0.05);
    this.noise(1.7, 0.45, "lowpass", 900, 90);
    this.noise(1.2, 0.2, "bandpass", 700, 300, 0.1, 3);
  }
  slam() {
    this.noise(0.5, 0.5, "lowpass", 900, 80);
    this.tone(80, 0.45, "sine", 0.4, 28);
  }
  spit() {
    this.tone(180, 0.18, "sawtooth", 0.12, 520);
    this.noise(0.2, 0.15, "bandpass", 1200, 500, 0, 2);
  }
  buy() {
    this.tone(880, 0.07, "square", 0.09);
    this.tone(1320, 0.12, "square", 0.09, undefined, 0.07);
  }
  error() {
    this.tone(120, 0.15, "square", 0.1);
  }
  win() {
    [262, 330, 392, 523, 392, 523, 659, 784].forEach((f, i) =>
      this.tone(f, 0.22, "triangle", 0.14, undefined, i * 0.14)
    );
  }
  lose() {
    [392, 349, 311, 262, 196, 147].forEach((f, i) =>
      this.tone(f, 0.4, "sawtooth", 0.1, f * 0.97, i * 0.28)
    );
  }
}
