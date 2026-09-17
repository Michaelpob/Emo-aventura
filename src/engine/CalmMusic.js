// Nucleo 3D · Musica generativa "calma"
// Sin archivos: osciladores sobre el AudioContext del AudioBus.
// Capas: colchon de acordes en Do mayor que se cruzan muy despacio, kalimba
// en pentatonica (nunca desafina), y con mas capas una campana lejana y un
// grave sostenido. setLayers(0..3) hace crecer la musica conforme la isla se
// va calmando. playNote() deja que la isla toque la misma kalimba (estanque).

const MIDI = (n) => 440 * Math.pow(2, (n - 69) / 12);

// Do mayor: acordes con septima, ninguno tenso, ciclo lento sin cadencia fuerte
const CHORDS = [
  [48, 52, 55, 59],   // Cmaj7
  [45, 48, 52, 55],   // Am7
  [41, 45, 48, 52],   // Fmaj7
  [43, 47, 50, 55],   // G
  [48, 52, 55, 59],   // Cmaj7
  [50, 53, 57, 60]    // Dm7
];
const KALIMBA = [60, 62, 64, 67, 69, 72, 74, 76, 79];   // pentatonica de Do, dos octavas
const BELL = [84, 86, 88, 91, 93];

export class CalmMusic {
  constructor(audio) {
    this.audio = audio;
    this.running = false;
    this.layers = 1;
    this.timers = new Set();
    this.oscs = [];
    this.chordIndex = 0;
    this.volume = 1;
    this.solo = false;           // true: solo el colchon; la kalimba la toca la isla
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
    this.out.gain.setTargetAtTime(this.volume, ctx.currentTime, 3);
    // las notas que toca el jugador salen aparte: no dependen del volumen de
    // la musica ni del ducking del ambiente, siempre se oyen por encima
    this.noteOut = ctx.createGain();
    this.noteOut.gain.value = 1.5;
    this.noteOut.connect(a.master);

    // eco corto y suave: da aire, no misterio
    this.delay = ctx.createDelay(1.5);
    this.delay.delayTime.value = 0.38;
    this.feedback = ctx.createGain();
    this.feedback.gain.value = 0.3;
    this.delay.connect(this.feedback);
    this.feedback.connect(this.delay);
    this.delay.connect(this.out);
    this.wet = ctx.createGain();
    this.wet.gain.value = 0.45;
    this.wet.connect(this.delay);

    // filtro comun del colchon: abre un poco con cada capa
    this.padFilter = ctx.createBiquadFilter();
    this.padFilter.type = 'lowpass';
    this.padFilter.frequency.value = 520;
    this.padFilter.Q.value = 0.6;
    this.padFilter.connect(this.out);

    this.scheduleChord();
    this.scheduleKalimba();
    this.scheduleBell();
    this.startBass();
  }

  later(fn, ms) {
    const t = setTimeout(() => { this.timers.delete(t); if (this.running) fn(); }, ms);
    this.timers.add(t);
  }

  /* -------------------------------------------------------------- colchon */

  scheduleChord() {
    const ctx = this.ctx;
    const chord = CHORDS[this.chordIndex % CHORDS.length];
    this.chordIndex += 1;
    const now = ctx.currentTime;
    const hold = 9 + Math.random() * 3;
    chord.forEach((midi, i) => {
      // dos triangulos desafinados por nota: el colchon "respira" solo
      [-4, 4].forEach((det) => {
        const o = ctx.createOscillator();
        o.type = i === 0 ? 'sine' : 'triangle';
        o.frequency.value = MIDI(midi);
        o.detune.value = det + (Math.random() - 0.5) * 3;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, now);
        g.gain.linearRampToValueAtTime(0.028, now + 4.5);
        g.gain.setValueAtTime(0.028, now + hold);
        g.gain.linearRampToValueAtTime(0, now + hold + 5);
        o.connect(g);
        g.connect(this.padFilter);
        o.start(now);
        o.stop(now + hold + 5.2);
      });
    });
    this.later(() => this.scheduleChord(), hold * 1000);
  }

  /* -------------------------------------------------------------- kalimba */

  /** Pulsacion de kalimba: seno + armonico que se apaga antes; ataque instantaneo */
  pluck(midi, vel = 1, when = 0, dest = this.out) {
    const ctx = this.ctx;
    if (!ctx || !this.out) return;
    const now = ctx.currentTime + when;
    const f = MIDI(midi);
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = f;
    const o2 = ctx.createOscillator();
    o2.type = 'sine';
    o2.frequency.value = f * 3.97;             // el "clic" metalico de la lengueta
    const g = ctx.createGain();
    const peak = 0.11 * vel;
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(peak, now + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0006, now + 1.6);
    const g2 = ctx.createGain();
    g2.gain.setValueAtTime(0.22, now);
    g2.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    o.connect(g);
    o2.connect(g2);
    g2.connect(g);
    g.connect(dest);
    g.connect(this.wet);
    o.start(now);
    o2.start(now);
    o.stop(now + 1.7);
    o2.stop(now + 0.4);
  }

  /** La isla toca una nota con el mismo timbre que la musica */
  playNote(midi, vel = 1) {
    if (!this.running) return;
    this.pluck(midi, vel, 0, this.noteOut);
  }

  scheduleKalimba() {
    if (this.layers >= 1 && !this.solo) {
      // frases de 1 a 3 notas cercanas, siempre dentro de la pentatonica
      const start = Math.floor(Math.random() * (KALIMBA.length - 3));
      const n = 1 + Math.floor(Math.random() * 3);
      for (let i = 0; i < n; i += 1) {
        const idx = Math.max(0, Math.min(KALIMBA.length - 1, start + Math.round((Math.random() - 0.3) * 3)));
        this.pluck(KALIMBA[idx], 0.5 + Math.random() * 0.3, i * (0.32 + Math.random() * 0.2));
      }
    }
    const gap = this.layers >= 2 ? 1.6 + Math.random() * 2.2 : 2.6 + Math.random() * 3.4;
    this.later(() => this.scheduleKalimba(), gap * 1000);
  }

  /* ------------------------------------------------------------- campana */

  scheduleBell() {
    if (this.layers >= 2 && !this.solo) {
      const ctx = this.ctx;
      const now = ctx.currentTime;
      const midi = BELL[Math.floor(Math.random() * BELL.length)];
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = MIDI(midi);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(0.03, now + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0005, now + 4);
      o.connect(g);
      g.connect(this.out);
      g.connect(this.wet);
      o.start(now);
      o.stop(now + 4.2);
    }
    this.later(() => this.scheduleBell(), (5 + Math.random() * 6) * 1000);
  }

  /* --------------------------------------------------------------- grave */

  startBass() {
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = MIDI(36);            // Do grave
    this.bassGain = ctx.createGain();
    this.bassGain.gain.value = 0;
    o.connect(this.bassGain);
    this.bassGain.connect(this.out);
    o.start();
    this.oscs.push(o);
    // ondulacion lentisima de volumen: como una marea
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.07;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.02;
    lfo.connect(lfoGain);
    lfoGain.connect(this.bassGain.gain);
    lfo.start();
    this.oscs.push(lfo);
  }

  /* -------------------------------------------------------------- control */

  /** 1 = solo colchon y kalimba suelta · 2 = kalimba mas viva y campana · 3 = con grave */
  setLayers(n) {
    this.layers = Math.max(0, Math.min(3, Math.round(n)));
    if (!this.ctx || !this.running) return;
    const now = this.ctx.currentTime;
    this.padFilter?.frequency.setTargetAtTime(520 + this.layers * 260, now, 2);
    this.bassGain?.gain.setTargetAtTime(this.layers >= 3 ? 0.05 : 0, now, 2.5);
  }

  /** Modo acompanamiento: calla la kalimba y la campana propias (la melodia del jugador manda) */
  setSolo(on) {
    this.solo = !!on;
  }

  setVolume(v, time = 1.5) {
    this.volume = v;
    if (this.out && this.ctx) this.out.gain.setTargetAtTime(v, this.ctx.currentTime, time);
  }

  duck(on) {
    if (this.out && this.ctx) this.out.gain.setTargetAtTime(on ? this.volume * 0.35 : this.volume, this.ctx.currentTime, 0.6);
  }

  stop() {
    if (!this.running) return;
    this.running = false;
    this.timers.forEach((t) => clearTimeout(t));
    this.timers.clear();
    const ctx = this.ctx;
    try {
      this.out.gain.setTargetAtTime(0, ctx.currentTime, 0.8);
      const oscs = this.oscs;
      this.oscs = [];
      setTimeout(() => {
        oscs.forEach((o) => { try { o.stop(); o.disconnect(); } catch { /* ya parado */ } });
        try { this.out.disconnect(); this.noteOut.disconnect(); this.delay.disconnect(); this.feedback.disconnect(); this.wet.disconnect(); this.padFilter.disconnect(); } catch { /* ya desconectado */ }
      }, 3000);
    } catch { /* contexto cerrado */ }
  }
}
