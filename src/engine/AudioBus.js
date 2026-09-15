// Nucleo 3D · Audio
// No hay archivos de audio en el proyecto: todos los sonidos se generan por
// codigo (osciladores + ruido filtrado) y se cachean como AudioBuffer, de modo
// que tambien pueden reproducirse con THREE.PositionalAudio en el mundo 3D.
//
// Capas: ambiente (loop) + eventos (pasos, interaccion, recoger, exito, error
// suave, respiracion). Ducking: al concentrarse/respirar el ambiente baja.

import * as THREE from 'three';
import { gameState } from '../data/gameState.js';

const CACHE = new Map();

function noiseBuffer(ctx, seconds, filterHz, gainCurve) {
  const rate = ctx.sampleRate;
  const len = Math.floor(rate * seconds);
  const buffer = ctx.createBuffer(1, len, rate);
  const data = buffer.getChannelData(0);
  let last = 0;
  const k = Math.exp(-2 * Math.PI * filterHz / rate);
  for (let i = 0; i < len; i += 1) {
    const white = Math.random() * 2 - 1;
    last = white * (1 - k) + last * k;      // paso bajo de un polo
    data[i] = last * (gainCurve ? gainCurve(i / len) : 1);
  }
  return buffer;
}

function toneBuffer(ctx, seconds, freqFrom, freqTo, gainCurve, harmonics = 1) {
  const rate = ctx.sampleRate;
  const len = Math.floor(rate * seconds);
  const buffer = ctx.createBuffer(1, len, rate);
  const data = buffer.getChannelData(0);
  let phase = 0;
  for (let i = 0; i < len; i += 1) {
    const t = i / len;
    const freq = freqFrom + (freqTo - freqFrom) * t;
    phase += (2 * Math.PI * freq) / rate;
    let sample = Math.sin(phase);
    for (let h = 2; h <= harmonics; h += 1) sample += Math.sin(phase * h) / (h * 2);
    data[i] = sample * (gainCurve ? gainCurve(t) : 1) * 0.5;
  }
  return buffer;
}

const decay = (p) => Math.pow(1 - p, 2.4);
const bell = (p) => Math.sin(Math.PI * p);
const soft = (p) => Math.min(1, p * 8) * Math.pow(1 - p, 1.6);

const RECIPES = {
  step:      (ctx) => noiseBuffer(ctx, 0.12, 900, (p) => decay(p) * 0.5),
  stepRun:   (ctx) => noiseBuffer(ctx, 0.1, 1400, (p) => decay(p) * 0.7),
  interact:  (ctx) => toneBuffer(ctx, 0.18, 520, 720, soft, 2),
  collect:   (ctx) => toneBuffer(ctx, 0.32, 660, 1180, bell, 3),
  success:   (ctx) => toneBuffer(ctx, 0.9, 392, 784, (p) => bell(p) * 0.9, 4),
  soften:    (ctx) => toneBuffer(ctx, 0.28, 300, 220, soft, 2),   // "error" amable
  light:     (ctx) => toneBuffer(ctx, 0.7, 300, 900, bell, 3),
  breathIn:  (ctx) => noiseBuffer(ctx, 1.4, 500, (p) => Math.sin(Math.PI * p) * 0.55),
  breathOut: (ctx) => noiseBuffer(ctx, 1.8, 320, (p) => Math.pow(1 - p, 1.2) * 0.5),
  rumble:    (ctx) => noiseBuffer(ctx, 2.2, 90, () => 0.6),
  wind:      (ctx) => noiseBuffer(ctx, 3.5, 420, (p) => 0.35 + Math.sin(p * Math.PI * 2) * 0.15),
  water:     (ctx) => noiseBuffer(ctx, 3.0, 1200, (p) => 0.22 + Math.sin(p * Math.PI * 3) * 0.08),
  swamp:     (ctx) => noiseBuffer(ctx, 3.0, 260, (p) => 0.3 + Math.sin(p * Math.PI * 2) * 0.12),
  chime:     (ctx) => toneBuffer(ctx, 1.6, 523, 523, (p) => Math.pow(1 - p, 2) * 0.7, 5),
  pad:       (ctx) => toneBuffer(ctx, 4.0, 174, 176, () => 0.28, 3),
  // Isla del Enojo: rocas al rojo, chispas y erupcion
  thud:      (ctx) => noiseBuffer(ctx, 0.26, 140, (p) => decay(p) * 0.9),
  sizzle:    (ctx) => noiseBuffer(ctx, 0.55, 2600, (p) => Math.min(1, p * 10) * Math.pow(1 - p, 1.4) * 0.7),
  buzz:      (ctx) => toneBuffer(ctx, 0.42, 190, 300, (p) => bell(p) * (0.6 + 0.4 * Math.sin(p * 60)), 5),
  tick:      (ctx) => toneBuffer(ctx, 0.1, 1040, 1040, decay, 2),
  stone:     (ctx) => toneBuffer(ctx, 0.3, 150, 110, soft, 3),
  spit:      (ctx) => noiseBuffer(ctx, 0.5, 220, (p) => Math.min(1, p * 6) * Math.pow(1 - p, 1.8) * 0.8),
  erupt:     (ctx) => noiseBuffer(ctx, 1.8, 80, (p) => Math.min(1, p * 5) * Math.pow(1 - p, 0.9)),
  // Isla del Miedo: linterna, bosque de noche, sustos y respiracion larga
  click:     (ctx) => noiseBuffer(ctx, 0.05, 5200, (p) => Math.pow(1 - p, 8)),            // interruptor: encender
  clickOff:  (ctx) => noiseBuffer(ctx, 0.07, 2400, (p) => Math.pow(1 - p, 5) * 0.8),      // interruptor: apagar
  ignite:    (ctx) => noiseBuffer(ctx, 0.6, 1500, (p) => Math.min(1, p * 6) * Math.pow(1 - p, 1.2) * 0.7),
  whoosh:    (ctx) => noiseBuffer(ctx, 1.0, 900, (p) => Math.pow(Math.sin(Math.PI * p), 1.6) * 0.8),
  rustle:    (ctx) => noiseBuffer(ctx, 0.7, 2600, (p) => bell(p) * (0.5 + 0.5 * Math.abs(Math.sin(p * 40))) * 0.5),
  heartbeat: (ctx) => toneBuffer(ctx, 0.55, 72, 48, (p) => (p < 0.45 ? decay(p / 0.45) : decay((p - 0.45) / 0.55) * 0.7), 1),
  owl:       (ctx) => toneBuffer(ctx, 1.3, 430, 370, (p) => (p < 0.35 ? bell(p / 0.35) : p > 0.45 ? bell((p - 0.45) / 0.55) : 0) * 0.7, 2),
  crickets:  (ctx) => toneBuffer(ctx, 1.4, 4300, 4300, (p) => (Math.sin(p * Math.PI * 2 * 16) > 0.35 ? 1 : 0) * bell(p) * 0.3, 1),
  inhale:    (ctx) => noiseBuffer(ctx, 2.2, 620, (p) => Math.pow(Math.sin(Math.PI * p), 1.3) * 0.6),
  exhale:    (ctx) => noiseBuffer(ctx, 2.6, 380, (p) => Math.min(1, p * 4) * Math.pow(1 - p, 1.4) * 0.6)
};

export class AudioBus {
  constructor(camera) {
    this.enabled = !!gameState.settings.sound;
    this.listener = null;
    this.camera = camera;
    this.ambientNodes = [];
    this.duckAmount = 1;
    this.ready = false;
    this.buffers = CACHE;
  }

  init() {
    if (this.ready) return;
    try {
      this.listener = new THREE.AudioListener();
      this.camera.add(this.listener);
      this.ctx = this.listener.context;
      this.master = this.ctx.createGain();
      this.master.gain.value = this.enabled ? 0.9 : 0;
      this.master.connect(this.ctx.destination);
      this.ambientGain = this.ctx.createGain();
      this.ambientGain.gain.value = 0.5;
      this.ambientGain.connect(this.master);
      this.ready = true;
    } catch (err) {
      console.warn('[audio] no disponible', err);
      this.ready = false;
    }
  }

  setEnabled(on) {
    this.enabled = on;
    if (this.ready) this.master.gain.setTargetAtTime(on ? 0.9 : 0, this.ctx.currentTime, 0.08);
    if (on) this.ctx?.resume?.();
  }

  buffer(name) {
    if (!this.ready) return null;
    const key = `${name}@${this.ctx.sampleRate}`;
    if (!CACHE.has(key)) {
      const recipe = RECIPES[name];
      if (!recipe) return null;
      CACHE.set(key, recipe(this.ctx));
    }
    return CACHE.get(key);
  }

  /** Sonido no posicional (UI, pasos del propio jugador) */
  play(name, { volume = 0.6, rate = 1, detune = 0 } = {}) {
    if (!this.ready || !this.enabled) return null;
    const buf = this.buffer(name);
    if (!buf) return null;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = rate + (Math.random() - 0.5) * 0.06;
    if (detune && src.detune) src.detune.value = detune;
    const g = this.ctx.createGain();
    g.gain.value = volume;
    src.connect(g).connect(this.master);
    src.start();
    src.onended = () => { try { g.disconnect(); } catch {} };
    return src;
  }

  /** Sonido situado en el mundo (three.PositionalAudio) */
  playAt(name, object3d, { volume = 0.8, refDistance = 4, loop = false } = {}) {
    if (!this.ready || !this.enabled || !object3d) return null;
    const buf = this.buffer(name);
    if (!buf) return null;
    const sound = new THREE.PositionalAudio(this.listener);
    sound.setBuffer(buf);
    sound.setRefDistance(refDistance);
    sound.setLoop(loop);
    sound.setVolume(volume);
    object3d.add(sound);
    sound.play();
    if (!loop) {
      sound.source.onended = () => {
        object3d.remove(sound);
        try { sound.disconnect(); } catch {}
      };
    }
    return sound;
  }

  /** Capa ambiental en bucle; devuelve un control con .setVolume()/.stop() */
  ambient(name, { volume = 0.4, rate = 1 } = {}) {
    if (!this.ready) return { setVolume() {}, stop() {} };
    const buf = this.buffer(name);
    if (!buf) return { setVolume() {}, stop() {} };
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    src.playbackRate.value = rate;
    const g = this.ctx.createGain();
    g.gain.value = volume;
    src.connect(g).connect(this.ambientGain);
    src.start();
    const node = {
      setVolume: (v, time = 0.4) => g.gain.setTargetAtTime(v, this.ctx.currentTime, time),
      stop: () => { try { src.stop(); src.disconnect(); g.disconnect(); } catch {} }
    };
    this.ambientNodes.push(node);
    return node;
  }

  /** Baja el ambiente mientras el jugador se concentra (respiracion) */
  duck(amount = 0.25, time = 0.5) {
    if (!this.ready) return;
    this.duckAmount = amount;
    this.ambientGain.gain.setTargetAtTime(0.5 * amount, this.ctx.currentTime, time);
  }

  unduck(time = 0.8) {
    if (!this.ready) return;
    this.duckAmount = 1;
    this.ambientGain.gain.setTargetAtTime(0.5, this.ctx.currentTime, time);
  }

  dispose() {
    this.ambientNodes.forEach((n) => n.stop());
    this.ambientNodes.length = 0;
    if (this.listener && this.camera) this.camera.remove(this.listener);
    try { this.master?.disconnect(); this.ambientGain?.disconnect(); } catch {}
    this.ready = false;
  }
}
