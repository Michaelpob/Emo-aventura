// Nucleo 3D · Musica generativa para el pantano del desagrado
// Sin archivos: osciladores y filtros sobre el AudioContext del AudioBus.
// Caracter: viscoso y traviesо, no aterrador (es una isla para ninos).
//   · bajo "gelatinoso": triangulo por un filtro resonante que se mueve
//   · plucks tipo marimba en escala dorica (curiosidad con un punto raro)
//   · bloops: burbujas que suben y estallan, como percusion
//   · pad de cristal para el espejo y pulso tenso para la arena
// setMood('plaza'|'swamp'|'mirror'|'arena'|'clear') y setIntensity(0..1).

const MIDI = (n) => 440 * Math.pow(2, (n - 69) / 12);

const MOODS = {
  plaza: { scale: [62, 64, 65, 67, 69, 71, 72, 74], bass: [38, 38, 41, 43], bpm: 76, bloop: 0.35, cutoff: 700, pluck: 0.9, pad: 0.3, tense: 0 },
  swamp: { scale: [62, 64, 65, 67, 69, 71, 72, 74], bass: [38, 38, 41, 36], bpm: 84, bloop: 0.85, cutoff: 900, pluck: 0.8, pad: 0.2, tense: 0.1 },
  mirror: { scale: [62, 65, 67, 69, 72, 74, 77, 79], bass: [38, 45, 43, 41], bpm: 64, bloop: 0.15, cutoff: 500, pluck: 0.5, pad: 0.8, tense: 0 },
  arena: { scale: [62, 63, 65, 67, 68, 70, 72, 74], bass: [38, 38, 37, 38], bpm: 104, bloop: 0.4, cutoff: 1200, pluck: 1, pad: 0.4, tense: 0.7 },
  clear: { scale: [62, 64, 66, 69, 71, 73, 74, 78], bass: [38, 45, 43, 50], bpm: 88, bloop: 0.3, cutoff: 1600, pluck: 0.9, pad: 0.7, tense: 0 }
};

export class SwampMusic {
  constructor(audio) {
    this.audio = audio;
    this.running = false;
    this.mood = MOODS.plaza;
    this.intensity = 0.2;
    this.timers = new Set();
    this.oscs = [];
    this.beat = 0;
    this.volume = 0.8;
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
    this.out.gain.setTargetAtTime(this.volume, ctx.currentTime, 2);

    // eco corto y humedo
    this.delay = ctx.createDelay(1);
    this.delay.delayTime.value = 0.31;
    this.feedback = ctx.createGain();
    this.feedback.gain.value = 0.3;
    this.delay.connect(this.feedback);
    this.feedback.connect(this.delay);
    this.delay.connect(this.out);
    this.wet = ctx.createGain();
    this.wet.gain.value = 0.4;
    this.wet.connect(this.delay);

    this.startBass();
    this.tick();
    this.scheduleBloop();
    this.schedulePad();
  }

  later(fn, ms) {
    const t = setTimeout(() => { this.timers.delete(t); if (this.running) fn(); }, ms);
    this.timers.add(t);
  }

  /* ------------------------------------------------------------ bajo viscoso */

  startBass() {
    const ctx = this.ctx;
    this.bassFilter = ctx.createBiquadFilter();
    this.bassFilter.type = 'lowpass';
    this.bassFilter.frequency.value = 160;
    this.bassFilter.Q.value = 7;
    this.bassGain = ctx.createGain();
    this.bassGain.gain.value = 0;
    this.bassFilter.connect(this.bassGain);
    this.bassGain.connect(this.out);

    this.bassOsc = ctx.createOscillator();
    this.bassOsc.type = 'triangle';
    this.bassOsc.frequency.value = MIDI(38);
    this.bassOsc.connect(this.bassFilter);
    this.bassOsc.start();
    this.oscs.push(this.bassOsc);

    // el filtro se "bambolea": eso es lo gelatinoso
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.9;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 90;
    lfo.connect(lfoGain);
    lfoGain.connect(this.bassFilter.frequency);
    lfo.start();
    this.oscs.push(lfo);
  }

  /* ----------------------------------------------------------- pulso/plucks */

  tick() {
    const ctx = this.ctx;
    const m = this.mood;
    const now = ctx.currentTime;
    const step = 60 / m.bpm / 2;               // corcheas
    const b = this.beat;

    // bajo: una nota por negra, con silencio en la cuarta (cojea a proposito)
    if (b % 2 === 0 && (b / 2) % 4 !== 3) {
      const note = m.bass[Math.floor(b / 2) % m.bass.length];
      this.bassOsc.frequency.setTargetAtTime(MIDI(note), now, 0.02);
      this.bassGain.gain.cancelScheduledValues(now);
      this.bassGain.gain.setValueAtTime(0.0001, now);
      this.bassGain.gain.exponentialRampToValueAtTime(0.22, now + 0.03);
      this.bassGain.gain.exponentialRampToValueAtTime(0.0001, now + step * 1.6);
    }

    // pluck de marimba: en corcheas, con huecos; con tension, mas frecuente y con semitonos
    const chance = 0.42 * m.pluck + this.intensity * 0.25;
    if (Math.random() < chance) {
      const idx = Math.floor(Math.random() * m.scale.length);
      let midi = m.scale[idx] + (Math.random() < 0.3 ? 12 : 0);
      if (Math.random() < m.tense * 0.5 + this.intensity * 0.3) midi += 1;   // nota "torcida"
      this.pluck(midi, 0.07 + this.intensity * 0.03);
    }

    this.beat += 1;
    this.later(() => this.tick(), step * 1000);
  }

  pluck(midi, peak) {
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = MIDI(midi);
    const o2 = ctx.createOscillator();
    o2.type = 'triangle';
    o2.frequency.value = MIDI(midi) * 3.99;      // armonico de madera
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(peak, now + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);
    const g2 = ctx.createGain();
    g2.gain.value = 0.18;
    o.connect(g);
    o2.connect(g2);
    g2.connect(g);
    g.connect(this.out);
    g.connect(this.wet);
    o.start(now);
    o2.start(now);
    o.stop(now + 0.6);
    o2.stop(now + 0.6);
  }

  /* -------------------------------------------------------------- burbujas */

  scheduleBloop() {
    const ctx = this.ctx;
    const m = this.mood;
    if (Math.random() < m.bloop) {
      const now = ctx.currentTime;
      const o = ctx.createOscillator();
      o.type = 'sine';
      const f0 = 180 + Math.random() * 220;
      o.frequency.setValueAtTime(f0, now);
      o.frequency.exponentialRampToValueAtTime(f0 * (2 + Math.random()), now + 0.16);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(0.09, now + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
      o.connect(g);
      g.connect(this.out);
      g.connect(this.wet);
      o.start(now);
      o.stop(now + 0.25);
    }
    this.later(() => this.scheduleBloop(), (0.5 + Math.random() * 1.6) * 1000);
  }

  /* ------------------------------------------------------------------- pad */

  schedulePad() {
    const ctx = this.ctx;
    const m = this.mood;
    const now = ctx.currentTime;
    const hold = 6 + Math.random() * 4;
    if (m.pad > 0.05) {
      const root = m.scale[0] + 12;
      const chord = m.tense > 0.5 ? [root, root + 3, root + 6] : [root, root + 4 - (m.scale.includes(root - 12 + 3) ? 1 : 0), root + 7];
      chord.forEach((midi) => {
        const o = ctx.createOscillator();
        o.type = m === MOODS.mirror ? 'sine' : 'triangle';
        o.frequency.value = MIDI(midi);
        o.detune.value = (Math.random() - 0.5) * 10;
        const g = ctx.createGain();
        const peak = 0.035 * m.pad;
        g.gain.setValueAtTime(0, now);
        g.gain.linearRampToValueAtTime(peak, now + 2.5);
        g.gain.setValueAtTime(peak, now + hold);
        g.gain.linearRampToValueAtTime(0, now + hold + 3);
        o.connect(g);
        g.connect(this.out);
        g.connect(this.wet);
        o.start(now);
        o.stop(now + hold + 3.5);
      });
    }
    this.later(() => this.schedulePad(), hold * 1000);
  }

  /* --------------------------------------------------------------- control */

  setMood(name) {
    const m = MOODS[name] ?? MOODS.plaza;
    if (m === this.mood) return;
    this.mood = m;
    if (this.bassFilter && this.ctx) this.bassFilter.frequency.setTargetAtTime(m.cutoff * 0.25, this.ctx.currentTime, 1);
  }

  /** 0 = curiosidad · 1 = desagrado intenso (mas plucks, notas torcidas, bajo mas abierto) */
  setIntensity(v) {
    this.intensity = Math.max(0, Math.min(1, v));
    if (this.bassFilter && this.ctx) {
      this.bassFilter.frequency.setTargetAtTime(this.mood.cutoff * 0.25 + this.intensity * 220, this.ctx.currentTime, 1);
    }
  }

  setVolume(v, time = 1) {
    this.volume = v;
    if (this.out && this.ctx) this.out.gain.setTargetAtTime(v, this.ctx.currentTime, time);
  }

  /** Baja mientras habla la guia y vuelve al terminar */
  duck(on) {
    if (this.out && this.ctx) this.out.gain.setTargetAtTime(on ? this.volume * 0.35 : this.volume, this.ctx.currentTime, 0.4);
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
