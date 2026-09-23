// Nucleo 3D · Musica generativa «La casa en marcha» (Isla de la Tristeza)
// Sin archivos: osciladores sobre el AudioContext del AudioBus, igual que
// CalmMusic. La idea musical acompana al juego: se empieza en La menor, lento
// y solo con el colchon; con cada tarea hecha la musica se abre (mas luz en el
// filtro, piano con mas notas, una cuerda calida y al final Do mayor). Nunca
// hay percusion ni acordes tensos: es compania, no recompensa.
//
//   setProgreso(0..1)  cuanto lleva hecho el jugador (abre la musica)
//   acento()           un adorno corto al terminar una tarea
//   setVolume / duck / stop

const MIDI = (n) => 440 * Math.pow(2, (n - 69) / 12);

// Progresion en La menor que va virando a Do mayor: sin cadencias fuertes,
// cada acorde dura mucho y comparte notas con el siguiente (se funden).
const ACORDES = [
  [45, 52, 57, 60],   // Am        (recogido)
  [41, 48, 53, 57],   // Fmaj7
  [43, 50, 55, 59],   // G
  [48, 52, 55, 59],   // Cmaj7     (se abre)
  [45, 52, 57, 64],   // Am(add9)
  [41, 48, 55, 60]    // Fmaj9     (calido)
];
// Pentatonica de La menor: cualquier nota suelta suena bien sobre todo lo anterior
const PIANO = [57, 60, 62, 64, 67, 69, 72, 74, 76, 79];

export class SadnessMusic {
  constructor(audio) {
    this.audio = audio;
    this.running = false;
    this.progreso = 0;          // 0..1
    this.timers = new Set();
    this.oscs = [];
    this.indice = 0;
    this.volume = 0.9;
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
    this.out.gain.setTargetAtTime(this.volume, ctx.currentTime, 4);

    // eco largo y suave: da sensacion de casa vacia que se va llenando
    this.delay = ctx.createDelay(1.5);
    this.delay.delayTime.value = 0.42;
    this.feedback = ctx.createGain();
    this.feedback.gain.value = 0.26;
    this.delay.connect(this.feedback);
    this.feedback.connect(this.delay);
    this.delay.connect(this.out);
    this.wet = ctx.createGain();
    this.wet.gain.value = 0.4;
    this.wet.connect(this.delay);

    // el filtro es el que "abre" la musica conforme la casa se pone en marcha
    this.filtro = ctx.createBiquadFilter();
    this.filtro.type = 'lowpass';
    this.filtro.frequency.value = 420;
    this.filtro.Q.value = 0.5;
    this.filtro.connect(this.out);

    this.programarAcorde();
    this.programarPiano();
    this.programarCuerda();
  }

  later(fn, ms) {
    const t = setTimeout(() => { this.timers.delete(t); if (this.running) fn(); }, ms);
    this.timers.add(t);
  }

  /* ------------------------------------------------------------- colchon */

  programarAcorde() {
    const ctx = this.ctx;
    // al principio se queda en los dos primeros acordes (recogidos); con el
    // progreso entran los que abren a Do mayor
    const hasta = 2 + Math.round(this.progreso * (ACORDES.length - 2));
    const acorde = ACORDES[this.indice % hasta];
    this.indice += 1;
    const now = ctx.currentTime;
    const hold = 11 - this.progreso * 3 + Math.random() * 2;
    acorde.forEach((midi, i) => {
      [-5, 5].forEach((det) => {
        const o = ctx.createOscillator();
        o.type = i === 0 ? 'sine' : 'triangle';
        o.frequency.value = MIDI(midi);
        o.detune.value = det + (Math.random() - 0.5) * 3;
        const g = ctx.createGain();
        const pico = 0.024 + this.progreso * 0.008;
        g.gain.setValueAtTime(0, now);
        g.gain.linearRampToValueAtTime(pico, now + 5);
        g.gain.setValueAtTime(pico, now + hold);
        g.gain.linearRampToValueAtTime(0, now + hold + 5);
        o.connect(g);
        g.connect(this.filtro);
        o.start(now);
        o.stop(now + hold + 5.2);
      });
    });
    this.later(() => this.programarAcorde(), hold * 1000);
  }

  /* --------------------------------------------------------------- piano */

  /** Nota de piano suave: fundamental + dos armonicos que se apagan antes */
  nota(midi, vel = 1, cuando = 0) {
    const ctx = this.ctx;
    if (!ctx || !this.out) return;
    const now = ctx.currentTime + cuando;
    const f = MIDI(midi);
    const g = ctx.createGain();
    const pico = 0.085 * vel;
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(pico, now + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0005, now + 2.4);
    g.connect(this.out);
    g.connect(this.wet);
    [[1, 1], [2, 0.18], [3, 0.07]].forEach(([mult, amp]) => {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = f * mult;
      const og = ctx.createGain();
      og.gain.setValueAtTime(amp, now);
      og.gain.exponentialRampToValueAtTime(0.0005, now + (mult === 1 ? 2.4 : 0.7));
      o.connect(og);
      og.connect(g);
      o.start(now);
      o.stop(now + 2.5);
    });
  }

  programarPiano() {
    // al principio, notas sueltas muy espaciadas; al final, frases de tres
    const notas = 1 + Math.round(this.progreso * 2);
    const base = Math.floor(Math.random() * (PIANO.length - 3));
    for (let i = 0; i < notas; i += 1) {
      const idx = Math.max(0, Math.min(PIANO.length - 1, base + Math.round((Math.random() - 0.3) * 3)));
      this.nota(PIANO[idx], 0.45 + Math.random() * 0.25 + this.progreso * 0.2, i * (0.45 + Math.random() * 0.25));
    }
    const hueco = (5.5 - this.progreso * 2.5) + Math.random() * 3;
    this.later(() => this.programarPiano(), hueco * 1000);
  }

  /* -------------------------------------------------------------- cuerda */

  /** Cuerda calida que entra a media isla: una nota larga del acorde */
  programarCuerda() {
    if (this.progreso > 0.35) {
      const ctx = this.ctx;
      const now = ctx.currentTime;
      const midi = [57, 60, 64, 67][Math.floor(Math.random() * 4)];
      const o = ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.value = MIDI(midi);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(0.02 * (0.5 + this.progreso), now + 2.5);
      g.gain.linearRampToValueAtTime(0, now + 7);
      o.connect(g);
      g.connect(this.filtro);
      g.connect(this.wet);
      o.start(now);
      o.stop(now + 7.2);
      this.oscs.push(o);
    }
    this.later(() => this.programarCuerda(), (9 + Math.random() * 7) * 1000);
  }

  /* -------------------------------------------------------------- control */

  /** 0 = casa apagada · 1 = casa en marcha: abre el filtro y la armonia */
  setProgreso(v) {
    this.progreso = Math.max(0, Math.min(1, v));
    if (!this.ctx || !this.running) return;
    this.filtro?.frequency.setTargetAtTime(420 + this.progreso * 1500, this.ctx.currentTime, 3);
  }

  /** Adorno corto al terminar una tarea: tres notas que suben (no un pitido) */
  acento() {
    if (!this.running) return;
    const escala = [60, 64, 67, 72];
    const desde = Math.floor(Math.random() * 2);
    for (let i = 0; i < 3; i += 1) this.nota(escala[desde + i], 0.55, i * 0.16);
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
        try { this.out.disconnect(); this.delay.disconnect(); this.feedback.disconnect(); this.wet.disconnect(); this.filtro.disconnect(); } catch { /* ya desconectado */ }
      }, 3000);
    } catch { /* el contexto ya no existe */ }
  }
}
