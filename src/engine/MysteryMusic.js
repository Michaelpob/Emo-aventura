// Nucleo 3D · Musica generativa "misterio con intriga"
// Sin archivos: osciladores y filtros sobre el AudioContext del AudioBus.
// Capas: drone grave (dos sierras desafinadas + seno), acordes menores lentos,
// motivo de notas sueltas con eco y, con tension, un pulso grave.
// setIntensity(0..1) sube tempo, brillo y disonancia (linterna baja, sustos).

const MIDI = (n) => 440 * Math.pow(2, (n - 69) / 12);

// La menor: progresion lenta, sin resolver nunca del todo
const CHORDS = [
  [57, 60, 64],   // Am
  [53, 57, 60],   // F
  [50, 53, 57],   // Dm
  [52, 55, 59],   // Em (sin sensible: mas oscuro)
  [57, 60, 64],   // Am
  [58, 62, 65]    // Bb (napolitano: intriga)
];
const MOTIF = [69, 72, 74, 76, 79, 81, 84];       // pentatonica menor de La, aguda
const TENSE = [75, 78, 82];                        // tritono y semitonos: intriga

export class MysteryMusic {
  constructor(audio) {
    this.audio = audio;
    this.running = false;
    this.intensity = 0;
    this.timers = new Set();
    this.oscs = [];
    this.chordIndex = 0;
  }

  get ctx() { return this.audio?.ctx; }

  start() {
    const a = this.audio;
    if (!a?.ready || this.running) return;
    const ctx = a.ctx;
    this.running = true;

    this.out = ctx.createGain();
    this.out.gain.value = 0;
    this.out.connect(a.ambientGain);
    this.out.gain.setTargetAtTime(1, ctx.currentTime, 2.5);

    // eco largo: lo que da "espacio" al bosque
    this.delay = ctx.createDelay(2);
    this.delay.delayTime.value = 0.46;
    this.feedback = ctx.createGain();
    this.feedback.gain.value = 0.42;
    this.delay.connect(this.feedback);
    this.feedback.connect(this.delay);
    this.delay.connect(this.out);
    this.wet = ctx.createGain();
    this.wet.gain.value = 0.55;
    this.wet.connect(this.delay);

    this.startDrone();
    this.scheduleChord();
    this.scheduleMotif();
    this.schedulePulse();
  }

  later(fn, ms) {
    const t = setTimeout(() => { this.timers.delete(t); if (this.running) fn(); }, ms);
    this.timers.add(t);
  }

  /* ---------------------------------------------------------------- drone */

  startDrone() {
    const ctx = this.ctx;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 240;
    filter.Q.value = 3;
    this.droneFilter = filter;
    const gain = ctx.createGain();
    gain.gain.value = 0.14;
    filter.connect(gain);
    gain.connect(this.out);

    [['sawtooth', 55, 0], ['sawtooth', 55, 9], ['sine', 110, 0]].forEach(([type, freq, detune]) => {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = freq;
      o.detune.value = detune;
      o.connect(filter);
      o.start();
      this.oscs.push(o);
    });

    // respiracion lenta del filtro: el drone nunca esta quieto
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.05;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 110;
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    lfo.start();
    this.oscs.push(lfo);
  }

  /* -------------------------------------------------------------- acordes */

  scheduleChord() {
    const ctx = this.ctx;
    const chord = CHORDS[this.chordIndex % CHORDS.length];
    this.chordIndex += 1;
    const now = ctx.currentTime;
    const hold = 7 + Math.random() * 3;
    chord.forEach((midi, i) => {
      const o = ctx.createOscillator();
      o.type = i === 1 ? 'triangle' : 'sine';
      o.frequency.value = MIDI(midi);
      o.detune.value = (Math.random() - 0.5) * 8;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(0.045, now + 3.2);
      g.gain.setValueAtTime(0.045, now + hold);
      g.gain.linearRampToValueAtTime(0, now + hold + 3.5);
      o.connect(g);
      g.connect(this.out);
      g.connect(this.wet);
      o.start(now);
      o.stop(now + hold + 4);
    });
    this.later(() => this.scheduleChord(), hold * 1000);
  }

  /* --------------------------------------------------------------- motivo */

  scheduleMotif() {
    const ctx = this.ctx;
    const tense = Math.random() < 0.18 + this.intensity * 0.4;
    const pool = tense ? TENSE : MOTIF;
    const midi = pool[Math.floor(Math.random() * pool.length)];
    const now = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = MIDI(midi);
    const o2 = ctx.createOscillator();               // armonico suave: timbre de campana lejana
    o2.type = 'sine';
    o2.frequency.value = MIDI(midi) * 2.01;
    const g = ctx.createGain();
    const peak = 0.05 + this.intensity * 0.03;
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(peak, now + 0.04);
    g.gain.exponentialRampToValueAtTime(0.0008, now + 2.2);
    const g2 = ctx.createGain();
    g2.gain.value = 0.25;
    o.connect(g);
    o2.connect(g2);
    g2.connect(g);
    g.connect(this.out);
    g.connect(this.wet);
    o.start(now);
    o2.start(now);
    o.stop(now + 2.4);
    o2.stop(now + 2.4);
    // a veces una segunda nota enseguida: pregunta sin respuesta
    const gap = (Math.random() < 0.3 ? 0.5 : 2.5 + Math.random() * 4.5) * (1 - this.intensity * 0.45);
    this.later(() => this.scheduleMotif(), gap * 1000);
  }

  /* ---------------------------------------------------------------- pulso */

  schedulePulse() {
    if (this.intensity > 0.45) {
      const ctx = this.ctx;
      const now = ctx.currentTime;
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(58, now);
      o.frequency.exponentialRampToValueAtTime(40, now + 0.35);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(0.16 * this.intensity, now + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
      o.connect(g);
      g.connect(this.out);
      o.start(now);
      o.stop(now + 0.5);
    }
    this.later(() => this.schedulePulse(), (this.intensity > 0.7 ? 1.1 : 1.9) * 1000);
  }

  /* -------------------------------------------------------------- control */

  /** 0 = calma inquietante · 1 = tension (linterna agotada, sombra cerca) */
  setIntensity(v) {
    this.intensity = Math.max(0, Math.min(1, v));
    if (this.droneFilter && this.ctx) {
      this.droneFilter.frequency.setTargetAtTime(240 + this.intensity * 380, this.ctx.currentTime, 0.8);
    }
  }

  setVolume(v, time = 1) {
    if (this.out && this.ctx) this.out.gain.setTargetAtTime(v, this.ctx.currentTime, time);
  }

  stop() {
    if (!this.running) return;
    this.running = false;
    this.timers.forEach((t) => clearTimeout(t));
    this.timers.clear();
    const ctx = this.ctx;
    try {
      this.out.gain.setTargetAtTime(0, ctx.currentTime, 0.6);
      const oscs = this.oscs;
      this.oscs = [];
      setTimeout(() => {
        oscs.forEach((o) => { try { o.stop(); o.disconnect(); } catch { /* ya parado */ } });
        try { this.out.disconnect(); this.delay.disconnect(); this.feedback.disconnect(); this.wet.disconnect(); } catch { /* ya desconectado */ }
      }, 2500);
    } catch { /* contexto cerrado */ }
  }
}
