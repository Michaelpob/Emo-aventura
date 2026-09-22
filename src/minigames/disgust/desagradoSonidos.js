// ISLA DEL DESAGRADO · sonidos de la caverna de los sonidos (ASSET PLACEHOLDER)
// Seis sonidos sintetizados con WebAudio, de 3 s como maximo, con entrada
// suave (nada sobresalta) y salida por el master del AudioBus, asi el boton de
// silencio los apaga. PLACEHOLDER_AUDIO_<nombre>: sustituir por grabaciones
// reales cargando un AudioBuffer con el mismo nombre en `generar`.

const DURACION = 3;

function ruidoBlanco(n) {
  const a = new Float32Array(n);
  for (let i = 0; i < n; i += 1) a[i] = Math.random() * 2 - 1;
  return a;
}

/** Filtro paso bajo de un polo (suaviza el ruido) */
function suavizar(datos, k) {
  let y = 0;
  for (let i = 0; i < datos.length; i += 1) { y += (datos[i] - y) * k; datos[i] = y; }
  return datos;
}

function envolvente(datos, sr, { ataque = 0.25, caida = 0.3 } = {}) {
  const n = datos.length;
  for (let i = 0; i < n; i += 1) {
    const t = i / sr; const resta = (n - i) / sr;
    const g = Math.min(1, t / ataque, resta / caida);
    datos[i] *= Math.max(0, g);
  }
  return datos;
}

const GENERADORES = {
  // PLACEHOLDER_AUDIO_unas-tablero: chirrido agudo que sube y baja
  'unas-tablero': (sr, n) => {
    const d = new Float32Array(n);
    let fase = 0;
    for (let i = 0; i < n; i += 1) {
      const t = i / sr;
      const f = 1800 + Math.sin(t * 2.3) * 700 + Math.sin(t * 17) * 120;
      fase += (f / sr) * Math.PI * 2;
      const rasp = (Math.random() * 2 - 1) * 0.25;
      d[i] = (Math.sin(fase) * 0.6 + Math.sin(fase * 2.01) * 0.25 + rasp) * 0.28;
    }
    return envolvente(d, sr, { ataque: 0.35, caida: 0.4 });
  },
  // PLACEHOLDER_AUDIO_masticar: rafagas humedas a ritmo lento
  masticar: (sr, n) => {
    const d = suavizar(ruidoBlanco(n), 0.12);
    for (let i = 0; i < n; i += 1) {
      const t = i / sr;
      const ciclo = (t * 2.6) % 1;
      const boca = ciclo < 0.22 ? Math.sin((ciclo / 0.22) * Math.PI) : 0.05;
      d[i] *= boca * 0.55;
    }
    return envolvente(d, sr, { ataque: 0.2, caida: 0.3 });
  },
  // PLACEHOLDER_AUDIO_sorbo: succion que sube de tono
  sorbo: (sr, n) => {
    const base = suavizar(ruidoBlanco(n), 0.35);
    const d = new Float32Array(n);
    let fase = 0;
    for (let i = 0; i < n; i += 1) {
      const t = i / sr;
      const p = Math.min(1, t / 2.2);
      fase += ((300 + p * 900) / sr) * Math.PI * 2;
      d[i] = (base[i] * 0.5 + Math.sin(fase) * 0.22 * (0.6 + 0.4 * Math.sin(t * 40))) * (0.5 + p * 0.5) * 0.5;
    }
    return envolvente(d, sr, { ataque: 0.4, caida: 0.35 });
  },
  // PLACEHOLDER_AUDIO_moscas: zumbido con vibrato y vaiven de volumen
  moscas: (sr, n) => {
    const d = new Float32Array(n);
    let f1 = 0; let f2 = 0;
    for (let i = 0; i < n; i += 1) {
      const t = i / sr;
      f1 += ((190 + Math.sin(t * 7) * 30) / sr) * Math.PI * 2;
      f2 += ((240 + Math.sin(t * 5.3 + 1) * 40) / sr) * Math.PI * 2;
      const saw1 = ((f1 / Math.PI) % 2) - 1; const saw2 = ((f2 / Math.PI) % 2) - 1;
      const vaiven = 0.55 + 0.45 * Math.sin(t * 3.1) * Math.sin(t * 1.3);
      d[i] = (saw1 * 0.5 + saw2 * 0.3) * vaiven * 0.22;
    }
    return suavizar(envolvente(d, sr, { ataque: 0.3, caida: 0.4 }), 0.5);
  },
  // PLACEHOLDER_AUDIO_gotera: gotas periodicas con eco corto
  gotera: (sr, n) => {
    const d = new Float32Array(n);
    const cada = 0.62;
    for (let i = 0; i < n; i += 1) {
      const t = i / sr;
      const desde = t % cada;
      const f = 1200 - desde * 900;
      const plink = Math.sin(desde * f * Math.PI * 2) * Math.exp(-desde * 18);
      const eco = Math.sin((desde - 0.12) * 700 * Math.PI * 2) * Math.exp(-Math.max(0, desde - 0.12) * 14) * (desde > 0.12 ? 0.35 : 0);
      d[i] = (plink + eco) * 0.35;
    }
    return envolvente(d, sr, { ataque: 0.05, caida: 0.3 });
  },
  // PLACEHOLDER_AUDIO_lluvia: ruido suave y grave con gotas ligeras
  lluvia: (sr, n) => {
    const d = suavizar(ruidoBlanco(n), 0.08);
    for (let i = 0; i < n; i += 1) {
      const t = i / sr;
      const gota = Math.random() < 0.0006 ? 0.6 : 0;
      d[i] = d[i] * 0.5 * (0.85 + 0.15 * Math.sin(t * 0.9)) + gota * (Math.random() * 2 - 1) * 0.3;
    }
    return envolvente(d, sr, { ataque: 0.5, caida: 0.5 });
  }
};

/** Crea los sonidos sobre el AudioBus del minijuego. Devuelve { tocar, parar, dispose } */
export function crearSonidosDesagrado(audio) {
  const buffers = new Map();
  let actual = null;
  const generar = (nombre) => {
    if (!audio?.ctx) return null;
    if (buffers.has(nombre)) return buffers.get(nombre);
    const gen = GENERADORES[nombre];
    if (!gen) return null;
    const sr = audio.ctx.sampleRate;
    const n = Math.floor(sr * DURACION);
    const buf = audio.ctx.createBuffer(1, n, sr);
    buf.getChannelData(0).set(gen(sr, n));
    buffers.set(nombre, buf);
    return buf;
  };
  return {
    duracion: DURACION,
    /** Reproduce un sonido (para el anterior). Devuelve true si sono. */
    tocar(nombre, { volume = 0.7 } = {}) {
      this.parar();
      if (!audio?.ready || !audio.ctx || !audio.master) return false;
      const buf = generar(nombre);
      if (!buf) return false;
      try {
        const src = audio.ctx.createBufferSource();
        src.buffer = buf;
        const g = audio.ctx.createGain();
        g.gain.value = volume;
        src.connect(g).connect(audio.master);
        src.start();
        actual = { src, g };
        src.onended = () => { if (actual?.src === src) actual = null; try { g.disconnect(); } catch { /* ya */ } };
        return true;
      } catch { return false; }
    },
    parar() {
      if (!actual) return;
      try { actual.g.gain.setTargetAtTime(0, audio.ctx.currentTime, 0.04); actual.src.stop(audio.ctx.currentTime + 0.2); } catch { /* ya parado */ }
      actual = null;
    },
    dispose() { this.parar(); buffers.clear(); }
  };
}
