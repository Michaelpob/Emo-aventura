// GUARDIANES DEL DESAGRADO · Territorio de las sensaciones incomodas
// Isla 3D en primera persona que sigue, etapa por etapa, el documento de
// requerimientos de la isla:
//
//   1. EXPLORA LA ISLA           4 zonas · "¿Esto me genera desagrado?"  → Insignia de Explorador
//   2. ESPEJO DE LAS REACCIONES  identificar las señales del desagrado
//   3. TERMÓMETRO                leve / moderado / intenso (el mundo responde)
//   4. ELIGE TU HERRAMIENTA      caminos según el nivel, cada uno con su mecánica
//   5. REEVALUACIÓN              disminuye / se mantiene / aumenta
//   6. PROTEGE LA ISLA           La Reacción Impulsiva                  → Escudo de Autocontrol
//   7. CIERRE PSICOEDUCATIVO
//
// Mecánicas propias de esta isla (no se repiten en las demás):
//   · responder con el cuerpo: alejarse = "sí me genera desagrado", dejar que se acerque = "no"
//   · baldosas de presión frente al espejo
//   · termómetro que se sube por terrazas y cambia el mundo en vivo
//   · respirar quedándose quieto dentro de la burbuja (E al mantener el aire)
//   · seguir mariposas de color con la mirada
//   · cargar una sensación sin correr ni saltar a través de tres arcos
//   · 5-4-3-2-1 con un modo de encontrar distinto por sentido
//   · atravesar caminando la puerta del pensamiento equilibrado
//   · llamar al Guardián de Confianza con E hasta que responde
//   · la criatura crece si corres, saltas o chocas; se encoge con los altares

import * as THREE from 'three';
import { MinigameBase } from '../../engine/MinigameBase.js';
import {
  createGround, createSky, createLights, GEO, scatterInstanced,
  makeTree, makeRock, makeAvatar, terrainHeight
} from '../../engine/worldkit.js';
import { TOOLS } from '../../data/tools.js';
import {
  addReward, completeActivity, recordReevaluation, setInitialIntensity, setStrategy
} from '../../data/gameState.js';

/* ================================================================== datos */

const CENTER = { x: 0, z: -4 };     // plaza del termómetro
const ARENA = { x: 0, z: 10 };      // donde aparece La Reacción Impulsiva
const MIRROR = { x: 0, z: -28 };
const SPAWN = { x: 0, z: 9 };
const BOUND = 36;

const FOG = { base: '#5d7a4a', mid: '#4d7a3e', high: '#3b7a33', clear: '#a8cfe0' };
const LEVEL_COLORS = ['#9fd18a', '#7fd17f', '#f2c14e', '#e0453a'];
const INTENSITY = { 1: 'baja', 2: 'media', 3: 'alta' };
const LEVELS = {
  1: {
    title: 'NIVEL 1 — DESAGRADO LEVE',
    quote: 'Me incomoda, pero puedo manejarlo.',
    signs: 'pequeña molestia, incomodidad, ganas de alejarse, expresión de disgusto'
  },
  2: {
    title: 'NIVEL 2 — DESAGRADO MODERADO',
    quote: 'Mi desagrado está aumentando.',
    signs: 'mayor tensión, más incomodidad, pensamientos repetitivos, muchas ganas de evitar, deseo de responder impulsivamente'
  },
  3: {
    title: 'NIVEL 3 — DESAGRADO INTENSO',
    quote: 'Mi emoción está muy fuerte y necesito detenerme.',
    signs: 'mucha tensión, rechazo intenso, deseo de escapar, dificultad para pensar tranquilamente'
  }
};

const ZONES = [
  {
    id: 'olores', name: 'Pantano de los olores', icon: '🤢', x: -11, z: -12, kind: 'pantano',
    stimuli: [
      {
        label: 'C. Percibir un olor muy desagradable.', icon: '👃',
        yes: 'Alejarte de un olor fuerte es una respuesta muy común: el cuerpo avisa de lo que podría hacerte daño.',
        no: 'A ti este olor no te alejó. Cada persona reacciona a su manera, y eso también está bien.'
      },
      {
        label: 'Oler pan recién hecho.', icon: '🍞',
        yes: 'A ti este olor te generó desagrado. No todas las personas reaccionan igual ante lo mismo.',
        no: 'Dejaste que se acercara: hay estímulos que no despiertan desagrado.'
      }
    ]
  },
  {
    id: 'sabores', name: 'Cueva de los sabores', icon: '🧁', x: 11, z: -12, kind: 'cueva',
    stimuli: [
      {
        label: 'A. Encontrar comida en mal estado.', icon: '🥫',
        yes: 'Rechazar comida en mal estado protege: el desagrado ayudó a nuestros antepasados a no comer lo que podía dañarlos.',
        no: 'Te acercaste sin problema. Aun así, conviene revisar: el desagrado a veces avisa de un riesgo real.'
      },
      {
        label: 'Probar una fruta fresca.', icon: '🍎',
        yes: 'A ti esta fruta te dio rechazo. Puede ser por su textura, su sabor o un recuerdo: cada persona es distinta.',
        no: 'Una fruta fresca no suele generar desagrado. Dejaste que se acercara.'
      }
    ]
  },
  {
    id: 'imagenes', name: 'Bosque de las imágenes', icon: '🌳', x: 13, z: 16, kind: 'bosque',
    stimuli: [
      {
        label: 'B. Escuchar una canción que me gusta.', icon: '🎵',
        yes: 'Te alejaste de una canción que te gusta. Puede pasar si la asocias con un mal recuerdo: el desagrado también aparece con pensamientos y recuerdos.',
        no: 'Una canción que te gusta no genera desagrado. Dejaste que se acercara.'
      },
      {
        label: 'Ver una imagen que me incomoda.', icon: '🖼️',
        yes: 'Apartar la vista de lo que incomoda es una respuesta frecuente del desagrado.',
        no: 'A ti esta imagen no te alejó. No todas las personas reaccionan de la misma manera.'
      }
    ]
  },
  {
    id: 'rechazo', name: 'Zona de rechazo', icon: '🙅', x: -13, z: 16, kind: 'rechazo',
    stimuli: [
      {
        label: 'D. Ver una situación que me produce rechazo.', icon: '🙅',
        yes: 'El desagrado también aparece frente a conductas y situaciones, no solo frente a cosas. Es información sobre lo que te importa.',
        no: 'A ti esta situación no te alejó. Cada persona tiene su propio umbral.'
      },
      {
        label: 'Recibir un saludo amable.', icon: '👋',
        yes: 'A ti este saludo te generó rechazo. Puede depender del contexto o de quién lo hace.',
        no: 'Un saludo amable no suele generar desagrado. Dejaste que se acercara.'
      }
    ]
  }
];

const SIGNALS = [
  { id: 'nariz', label: 'Arrugar la nariz', icon: '👃', disgust: true },
  { id: 'rechazo', label: 'Hacer una expresión de rechazo', icon: '😖', disgust: true },
  { id: 'nauseas', label: 'Sentir náuseas', icon: '🤢', disgust: true },
  { id: 'tension', label: 'Sentir tensión', icon: '😬', disgust: true },
  { id: 'alejarse', label: 'Alejarse', icon: '🚶', disgust: true },
  { id: 'evitar', label: 'Evitar una situación', icon: '🙈', disgust: true },
  { id: 'decir', label: 'Decir "no me gusta"', icon: '🗣️', disgust: true },
  { id: 'sonreir', label: 'Sonreír', icon: '😊', disgust: false },
  { id: 'bostezar', label: 'Bostezar', icon: '🥱', disgust: false },
  { id: 'aplaudir', label: 'Aplaudir', icon: '👏', disgust: false }
];

const PATHS = {
  respira: { name: 'Toma el control', technique: 'Respiración consciente', tool: 'cristal-calma', icon: '💎', x: 21, z: -17, levels: [1] },
  atencion: { name: 'Cambio mi atención', technique: 'Despliegue atencional', tool: 'estrella-atencion', icon: '⭐', x: 26, z: 6, levels: [2] },
  acepta: { name: 'Me detengo y reconozco', technique: 'Aceptación emocional', tool: 'semilla-aceptacion', icon: '🌱', x: 12, z: 24, levels: [2] },
  presente: { name: 'Regreso al presente', technique: 'Técnica 5-4-3-2-1', tool: 'estrella-presente', icon: '⭐', x: -12, z: 24, levels: [3] },
  reevalua: { name: 'Cambio mi respuesta', technique: 'Reevaluación cognitiva', tool: 'cristal-perspectiva', icon: '🔮', x: -26, z: 6, levels: [3] },
  apoyo: { name: 'No tengo que hacerlo solo', technique: 'Búsqueda de apoyo', tool: 'corazon-apoyo', icon: '❤️', x: -21, z: -17, levels: [3] }
};
const PATH_ORDER = ['respira', 'atencion', 'acepta', 'presente', 'reevalua', 'apoyo'];

// Orden en que se abren los caminos segun el nivel del termometro: primero
// los que el documento asigna a ese nivel, despues el resto.
const PATH_SEQUENCE = {
  1: ['respira', 'atencion', 'acepta', 'presente', 'reevalua', 'apoyo'],
  2: ['atencion', 'acepta', 'respira', 'presente', 'reevalua', 'apoyo'],
  3: ['presente', 'reevalua', 'apoyo', 'respira', 'atencion', 'acepta']
};

// Recorrido lineal de la isla: cada etapa se abre al terminar la anterior.
const STAGES = [
  { id: 'thermo', icon: '🌡️', label: 'Termómetro' },
  { id: 'explore', icon: '🗺️', label: 'Explora' },
  { id: 'mirror', icon: '🪞', label: 'Espejo' },
  { id: 'paths', icon: '🧰', label: 'Herramientas' },
  { id: 'reeval', icon: '🔁', label: 'Reevalúa' },
  { id: 'boss', icon: '🛡️', label: 'Protege la isla' }
];

// Cada entorno tiene su propio aire: color de niebla y cielo al entrar.
const ENV_TINTS = {
  plaza: { fog: '#5d7a4a', sky: ['#3f6b58', '#b6d88c'] },
  olores: { fog: '#5f7a3e', sky: ['#3d5f3a', '#9fb86a'] },
  sabores: { fog: '#55684a', sky: ['#3a4a3a', '#a0a878'] },
  imagenes: { fog: '#4f7a52', sky: ['#2f5a44', '#8fc48a'] },
  rechazo: { fog: '#6f7a4a', sky: ['#4a5a3a', '#b8b078'] },
  mirror: { fog: '#4a6f7a', sky: ['#2b4a58', '#9ac8c8'] },
  respira: { fog: '#5f8a8a', sky: ['#2f5a6a', '#a8d8e0'] },
  atencion: { fog: '#7a8a3a', sky: ['#4a6a2a', '#e0d878'] },
  acepta: { fog: '#7a6a6a', sky: ['#4a3a4a', '#e0b0c8'] },
  presente: { fog: '#3b6a3a', sky: ['#1f3a2a', '#6f9a5a'] },
  reevalua: { fog: '#6a5a7a', sky: ['#3a2a4a', '#c0a8e0'] },
  apoyo: { fog: '#6a4a6a', sky: ['#3a2a3a', '#e0a8c8'] },
  arena: { fog: '#4a3a3a', sky: ['#2a1a1a', '#7a5a4a'] }
};

const ZONE_INTROS = {
  olores: 'En el pantano el aire trae olores fuertes. Acércate y responde con el cuerpo a lo que aparezca.',
  sabores: 'En la cueva hay comidas y sabores. Algunos pueden estar en mal estado: tu cuerpo lo notará.',
  imagenes: 'Entre los árboles aparecen imágenes y sonidos. No todo lo que ves o escuchas genera desagrado.',
  rechazo: 'Aquí el desagrado aparece frente a situaciones y conductas, no frente a cosas.'
};

const ACCEPT_STEPS = [
  { key: 'RECONOCER', phrase: 'Estoy sintiendo desagrado.' },
  { key: 'COMPRENDER', phrase: 'Algo de esta situación está generando rechazo o incomodidad en mí.' },
  { key: 'ACEPTAR', phrase: 'Puedo sentir desagrado sin reaccionar impulsivamente.' }
];

const THOUGHTS = [
  {
    text: '¡Esto es insoportable!',
    options: [
      { label: 'Esto me resulta desagradable, pero puedo manejar la situación.', balanced: true, feedback: 'El pensamiento se transforma: sigue siendo desagradable y ahora es manejable.' },
      { label: 'No lo voy a soportar ni un segundo más.', feedback: 'Esa idea aumenta la urgencia. Fíjate si de verdad no puedes sostenerlo un momento más.' },
      { label: 'Nadie debería pasar por esto.', feedback: 'Puede ser cierto y aun así no te ayuda a decidir qué hacer ahora.' }
    ]
  },
  {
    text: '¡Tengo que salir corriendo!',
    options: [
      { label: 'Puedo tomar distancia y pensar qué necesito hacer.', balanced: true, feedback: 'Tomar distancia sigue siendo una opción, pero ahora la eliges tú, no el impulso.' },
      { label: 'Si no me voy ya, va a ser peor.', feedback: 'La urgencia suele exagerar el riesgo. ¿Qué pasaría si esperas unos segundos?' },
      { label: 'Tengo que aguantar sin moverme.', feedback: 'Tampoco hace falta forzarte. Alejarse cuando algo daña de verdad es cuidarse.' }
    ]
  }
];

const SENSES = [
  { id: 'ver', icon: '👀', count: 5, prompt: 'cosas que puedes VER', kind: 'gaze', items: ['🌳 un árbol torcido', '🪨 una piedra musgosa', '🫧 burbujas en el agua', '🍂 hojas caídas', '🌫️ niebla entre las ramas'] },
  { id: 'tocar', icon: '✋', count: 4, prompt: 'cosas que puedes TOCAR', kind: 'touch', items: ['🪵 corteza áspera', '🌿 una hoja húmeda', '🪨 una piedra fría', '💧 gotas en la mano'] },
  { id: 'oir', icon: '👂', count: 3, prompt: 'sonidos que puedes ESCUCHAR', kind: 'sound', items: ['🐸 una rana lejana', '💨 el viento entre juncos', '💦 agua moviéndose'] },
  { id: 'oler', icon: '👃', count: 2, prompt: 'olores que puedes IDENTIFICAR', kind: 'scent', items: ['🌱 tierra mojada', '🌸 una flor cercana'] },
  { id: 'gusto', icon: '👅', count: 1, prompt: 'sabor que puedes RECONOCER', kind: 'taste', items: ['🍓 un fruto fresco'] }
];

const SUPPORT_LINES = [
  { label: 'Algo me está generando mucho desagrado y necesito alejarme un momento.', reply: 'Gracias por contármelo. Alejarte un momento no es huir: es cuidarte mientras decides qué hacer.' },
  { label: 'Hay algo aquí que me da mucho rechazo y no sé qué hacer con eso.', reply: 'No hace falta saberlo ya. Decirlo en voz alta ya es un primer paso, y no lo tienes que dar solo.' },
  { label: 'Prefiero contarlo con mis palabras.', reply: 'Tómate el tiempo que necesites. Decir "no estoy bien con esto" ya es suficiente para empezar.' }
];

const PROVOCATIONS = ['¡GRÍTALE!', '¡INSÚLTALO!', '¡VETE DANDO UN PORTAZO!', '¡REACCIONA YA!', '¡NO PIENSES, ACTÚA!'];

const STIM_SPEED = 1.1;          // el estimulo viene despacio: hay tiempo para decidir
const STIM_INTRO = 4;            // segundos quieto presentandose antes de moverse
const STIM_ESCAPE = 4;           // metros que hay que alejarse para responder "si"

/* ============================================================== utilidad */

const _dir = new THREE.Vector3();
const _v = new THREE.Vector3();
const _c = new THREE.Color();

function smoothstep(a, b, x) {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}
function lerp(a, b, t) { return a + (b - a) * t; }
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function wrapLines(text, maxChars) {
  return String(text).split('\n').flatMap((line) => {
    const words = line.split(' ');
    const out = [];
    let cur = '';
    for (const w of words) {
      const next = cur ? `${cur} ${w}` : w;
      if (next.length > maxChars && cur) { out.push(cur); cur = w; } else cur = next;
    }
    if (cur) out.push(cur);
    return out;
  });
}

function paintText(text, { px = 44, color = '#ffffff', bg = 'rgba(8,16,22,0.72)', weight = 700, maxChars = 26, pad = 18 } = {}) {
  const lines = wrapLines(text, maxChars);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const font = `${weight} ${px}px system-ui, "Segoe UI", "Segoe UI Emoji", "Apple Color Emoji", sans-serif`;
  ctx.font = font;
  const w = Math.max(...lines.map((l) => ctx.measureText(l).width)) + pad * 2;
  const lh = px * 1.25;
  const h = lines.length * lh + pad * 2;
  canvas.width = Math.ceil(w);
  canvas.height = Math.ceil(h);
  ctx.font = font;
  if (bg && bg !== 'transparent') {
    ctx.fillStyle = bg;
    const r = Math.min(28, h / 2);
    ctx.beginPath();
    ctx.moveTo(r, 0); ctx.lineTo(w - r, 0); ctx.quadraticCurveTo(w, 0, w, r);
    ctx.lineTo(w, h - r); ctx.quadraticCurveTo(w, h, w - r, h);
    ctx.lineTo(r, h); ctx.quadraticCurveTo(0, h, 0, h - r);
    ctx.lineTo(0, r); ctx.quadraticCurveTo(0, 0, r, 0);
    ctx.closePath(); ctx.fill();
  }
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  lines.forEach((l, i) => ctx.fillText(l, w / 2, pad + lh * (i + 0.5)));
  return canvas;
}

/** Letrero flotante que siempre mira a la cámara. `size` = alto en metros. */
function makeText(text, opts = {}) {
  const { size = 1, ...paint } = opts;
  const canvas = paintText(text, paint);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  sprite.scale.set(size * canvas.width / canvas.height, size, 1);
  sprite.userData.setText = (t, o = {}) => {
    const c = paintText(t, { ...paint, ...o });
    const nt = new THREE.CanvasTexture(c);
    nt.colorSpace = THREE.SRGBColorSpace;
    sprite.material.map?.dispose();
    sprite.material.map = nt;
    sprite.material.needsUpdate = true;
    const s = o.size ?? size;
    sprite.scale.set(s * c.width / c.height, s, 1);
  };
  return sprite;
}

/** Textura redonda y suave para particulas (Points): sin ella se ven cuadrados. */
let _dotTexture = null;
function dotTexture() {
  if (_dotTexture) return _dotTexture;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d');
  const grad = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.45, 'rgba(255,255,255,0.55)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  _dotTexture = new THREE.CanvasTexture(c);
  return _dotTexture;
}

function makeEmoji(emoji, size = 1) {
  return makeText(emoji, { size, px: 96, bg: 'transparent', pad: 8, maxChars: 4 });
}

/* ------------------------------------------------ voz, memoria y diario */

const VOICE_KEY = 'emo-desagrado-voz';        // 'on' | 'off'
const VOICE_NAME_KEY = 'emo-desagrado-voz-nombre'; // voz elegida por el jugador

const CHEERS = ['¡Muy bien!', '¡Genial!', '¡Así se hace!', '¡Excelente!', '¡Qué bien lo haces!'];

/**
 * Puntua una voz del navegador: cuanto mas natural y cercana, mejor.
 * Las "Natural"/"Neural" (Edge, Windows 11) suenan a persona; las de Google
 * tambien son buenas; el acento latino resulta mas cercano para el publico.
 */
function scoreVoice(v) {
  if (!/^es([-_]|$)/i.test(v.lang)) return -1;
  let score = 1;
  const name = v.name || '';
  if (/natural|neural|premium|enhanced|mejorad/i.test(name)) score += 60;
  if (/google/i.test(name)) score += 35;
  if (/es[-_](MX|CO|419|US|AR|CL|PE|VE)/i.test(v.lang)) score += 20;
  if (/Dalia|Sabina|Paulina|Camila|Andrea|Lucia|Lucía|Elvira|Laura|Helena|Mónica|Monica|Salome|Salomé|Ximena|female|femenina/i.test(name)) score += 10;
  if (/Pablo|Jorge|Raul|Raúl|Alvaro|Álvaro|male|masculin/i.test(name)) score += 2;
  if (!v.localService) score += 3;     // las voces en linea suelen ser mas naturales
  return score;
}

const CUSTOM_KEY = 'emo-desagrado-estimulos'; // textos que el nino escribio
const DIARY_KEY = 'emo-desagrado-diario';     // resumen de cada partida

/** Texto plano apto para el sintetizador: sin HTML, emojis ni comillas. */
function cleanForSpeech(html) {
  const div = document.createElement('div');
  div.innerHTML = String(html ?? '');
  return (div.textContent || '')
    .replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}\u{20E3}]/gu, ' ')
    .replace(/[«»"]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/([.!?;:])\s*\.+/g, '$1')      // "hola.. adios" -> "hola. adios"
    .trim();
}
function readStore(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}
function writeStore(key, value) {
  try { window.localStorage.setItem(key, JSON.stringify(value)); } catch { /* sin almacenamiento */ }
}
/** Frases cortas para el sintetizador: Chrome corta las locuciones largas. */
function splitSentences(text, max = 170) {
  const parts = String(text).split(/(?<=[.!?:;])\s+/);
  const out = [];
  let cur = '';
  for (const part of parts) {
    const next = cur ? `${cur} ${part}` : part;
    if (next.length > max && cur) { out.push(cur); cur = part; } else cur = next;
  }
  if (cur) out.push(cur);
  return out.flatMap((p) => (p.length <= max * 1.6 ? [p] : p.match(new RegExp(`.{1,${max}}(\\s|$)`, 'g')) ?? [p]));
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/* ================================================================== isla */

export class DisgustTerritoryGame extends MinigameBase {
  constructor(opts) {
    super({ ...opts, mode: 'first' });
    this.time = 0;
    this.customTexts = null;   // estimulos escritos por el nino (sobreviven al reinicio)
    this.voice = null;
    this.speechQueue = [];
    this.speechBusy = false;
  }

  /* ------------------------------------------------------------ estado */

  initState() {
    this.phase = 'thermo';
    this.stage = null;             // etapa activa del recorrido lineal
    this.stageDone = new Set();
    this.time = 0;
    this.answers = [];
    this.explored = 0;
    this.zoneIndex = -1;
    this.learned = new Set();
    this.rewards = [];
    this.level = 0;
    this.initialLevel = 0;
    this.finalLevel = 0;
    this.standLevel = 0;
    this.pathQueue = [];
    this.beacons = [];
    this.gazeTargets = [];
    this.doorSets = [];
    this.breath = null;
    this.carry = null;
    this.boss = null;
    this.paths = {};
    this.notesShown = new Set();
    this.provocations = [];
    this.soundLoops = [];
    this.diary = { grows: 0, altars: [] };
    this.noteQueue = [];
    this.noteStack = [];
    this.bannerUntil = 0;
    this.envs = {};
    this.currentEnv = null;
  }

  /* ============================================================ escenario */

  build() {
    this.root.classList.add('i3d--fp', 'dg');
    this.initState();
    const scene = this.scene;

    scene.fog = new THREE.FogExp2(FOG.base, 0.016);
    // radio < far de la camara (220) - distancia maxima del jugador: sin agujeros negros en el cielo
    this.sky = createSky({ top: '#3f6b58', bottom: '#b6d88c', size: 150 });
    scene.add(this.sky);

    this.buildGround();

    this.lights = createLights({
      sunColor: '#dff0b8', sunIntensity: 1.5, hemiSky: '#9fc48a', hemiGround: '#3a4a30', hemiIntensity: 0.95, area: 46
    });
    scene.add(this.lights);
    this.sun = this.lights.userData.sun;

    this.buildVegetation();
    this.buildAmbience();
    this.plazaGroup = new THREE.Group();
    this.plazaGroup.userData.revealed = true;
    this.scene.add(this.plazaGroup);
    this.buildZones();
    this.buildMirror();
    this.buildThermometer();
    this.buildPaths();
    this.buildArena();
    this.buildHud();
    this.initVoice();
    this.applyCustomStimuli();
    this.hookInput();
    this.registerEnvs();
    this.renderStages();
  }

  buildGround() {
    const terrace = (d) => 0.7 * (1 - smoothstep(6.6, 7.3, d)) + 0.7 * (1 - smoothstep(4.2, 4.9, d)) + 0.7 * (1 - smoothstep(2.0, 2.7, d));
    this.heightAt = (x, z) => {
      const d = Math.hypot(x - CENTER.x, z - CENTER.z);
      const flat = smoothstep(7.5, 10.5, d);
      return terrainHeight(x, z, { amplitude: 0.5, scale: 0.07 }) * flat + terrace(d);
    };
    const ground = createGround({ size: 112, segments: 112, color: '#4f6b45', amplitude: 0.5, scale: 0.07 });
    const pos = ground.geometry.attributes.position;
    for (let i = 0; i < pos.count; i += 1) pos.setY(i, this.heightAt(pos.getX(i), pos.getZ(i)));
    pos.needsUpdate = true;
    ground.geometry.computeVertexNormals();
    // color por altura: hondonadas oscuras, lomas claras. Da relieve sin coste.
    const colors = new Float32Array(pos.count * 3);
    const lo = new THREE.Color('#3f5c3a');
    const hi = new THREE.Color('#86b862');
    for (let i = 0; i < pos.count; i += 1) {
      const t = Math.max(0, Math.min(1, (pos.getY(i) + 0.5) / 2.6));
      _c.copy(lo).lerp(hi, t);
      const n = 0.94 + ((i * 7919) % 13) / 100;   // grano sutil
      colors[i * 3] = _c.r * n;
      colors[i * 3 + 1] = _c.g * n;
      colors[i * 3 + 2] = _c.b * n;
    }
    ground.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    ground.material.vertexColors = true;
    ground.material.color.set('#ffffff');
    ground.userData.heightAt = this.heightAt;
    this.ground = ground;
    this.scene.add(ground);

    this.controller.groundHeightAt = this.heightAt;
    this.controller.bounds = { minX: -BOUND, maxX: BOUND, minZ: -BOUND, maxZ: BOUND };
    this.controller.cfg.walkSpeed = 4.4;
    this.controller.setPosition(SPAWN.x, this.heightAt(SPAWN.x, SPAWN.z) + 0.2, SPAWN.z);
    this.controller.yaw = 0;
    this.controller.pitch = 0;
    this.controller.speedScale = 1;
  }

  buildVegetation() {
    const reedMat = new THREE.MeshStandardMaterial({ color: '#3f6b3a', roughness: 1, flatShading: true });
    const reeds = scatterInstanced(GEO.grass(), reedMat, 420, (i) => {
      const a = i * 2.399;
      const r = 10 + (i % 70) * 0.55;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      return { x, y: this.heightAt(x, z) + 0.28, z, ry: a, scale: 1 + (i % 4) * 0.35 };
    });
    this.scene.add(reeds);

    // arboles en el borde del mapa
    for (let i = 0; i < 26; i += 1) {
      const a = (i / 26) * Math.PI * 2 + (i % 2) * 0.1;
      const r = 40 + (i % 3) * 2.5;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      const tree = makeTree({ color: i % 2 ? '#3f7a45' : '#4a8a52', trunkColor: '#5a3f2a', scale: 1.4 + (i % 3) * 0.3 });
      tree.position.set(x, this.heightAt(x, z), z);
      this.scene.add(tree);
    }
  }

  /** Esporas flotando y flores de color: la isla respira aunque nadie se mueva. */
  buildAmbience() {
    const n = 360;
    const positions = new Float32Array(n * 3);
    const seeds = new Float32Array(n);
    for (let i = 0; i < n; i += 1) {
      positions[i * 3] = (Math.random() - 0.5) * 84;
      positions[i * 3 + 1] = 0.4 + Math.random() * 5;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 84;
      seeds[i] = Math.random() * 6.28;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.spores = new THREE.Points(geo, new THREE.PointsMaterial({
      color: '#eaffc0', size: 0.14, map: dotTexture(), alphaTest: 0.02, transparent: true, opacity: 0.65, depthWrite: false, sizeAttenuation: true
    }));
    this.spores.userData.seeds = seeds;
    this.scene.add(this.spores);

    // luciernagas: puntos calidos y aditivos que brillan sin ser luces
    const fn = 90;
    const fpos = new Float32Array(fn * 3);
    const fseeds = new Float32Array(fn);
    for (let i = 0; i < fn; i += 1) {
      const a = Math.random() * Math.PI * 2;
      const r = 6 + Math.random() * 30;
      fpos[i * 3] = Math.cos(a) * r;
      fpos[i * 3 + 1] = 0.8 + Math.random() * 2.2;
      fpos[i * 3 + 2] = Math.sin(a) * r;
      fseeds[i] = Math.random() * 6.28;
    }
    const fgeo = new THREE.BufferGeometry();
    fgeo.setAttribute('position', new THREE.BufferAttribute(fpos, 3));
    this.fireflies = new THREE.Points(fgeo, new THREE.PointsMaterial({
      color: '#ffe08a', size: 0.24, map: dotTexture(), alphaTest: 0.02, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true
    }));
    this.fireflies.userData.seeds = fseeds;
    this.scene.add(this.fireflies);

    // farolillos alrededor de la plaza: postes con una esfera que "brilla" (material plano, sin luz)
    const postMat = new THREE.MeshStandardMaterial({ color: '#4a3a2a', roughness: 1, flatShading: true });
    const lampMat = new THREE.MeshBasicMaterial({ color: '#ffd166' });
    this.lamps = [];
    for (let i = 0; i < 10; i += 1) {
      const a = (i / 10) * Math.PI * 2;      // ninguno en el eje sur: no tapa el termometro al llegar
      const x = CENTER.x + Math.cos(a) * 9.6;
      const z = CENTER.z + Math.sin(a) * 9.6;
      const y = this.heightAt(x, z);
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 2.4, 6), postMat);
      post.position.set(x, y + 1.2, z);
      const lamp = new THREE.Mesh(new THREE.IcosahedronGeometry(0.28, 1), lampMat);
      lamp.position.set(x, y + 2.55, z);
      const glow = makeEmoji('✨', 0.7);
      glow.position.set(x, y + 2.55, z);
      this.lampParts = this.lampParts || [];
      this.lampParts.push(post, lamp, glow);
      this.lamps.push({ lamp, glow, seed: i });
    }

    const flowerColors = ['#ff9ac9', '#ffd166', '#f4f1de'];
    flowerColors.forEach((color, ci) => {
      const mat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.25, roughness: 0.9, flatShading: true });
      const flowers = scatterInstanced(new THREE.IcosahedronGeometry(0.16, 0), mat, 70, (i) => {
        const a = i * 2.399 + ci * 1.3;
        const r = 12 + ((i * 37 + ci * 11) % 260) / 10;
        const x = Math.cos(a) * r;
        const z = Math.sin(a) * r;
        return { x, y: this.heightAt(x, z) + 0.22, z, ry: a, scale: 0.8 + (i % 3) * 0.3 };
      });
      this.scene.add(flowers);
    });
  }

  makeBeacon(x, z, color = '#a8e06a') {
    const g = new THREE.Group();
    const m = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.55, 28, 8, 1, true),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.26, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })
    );
    m.position.y = 14;
    g.add(m);
    const halo = new THREE.Mesh(
      new THREE.TorusGeometry(1.1, 0.12, 6, 28),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    halo.rotation.x = Math.PI / 2;
    halo.position.y = 0.2;
    g.add(halo);
    g.position.set(x, this.heightAt(x, z), z);
    g.visible = false;
    g.userData.beam = m;
    g.userData.halo = halo;
    this.scene.add(g);
    this.beacons.push(g);
    return g;
  }

  setBeacons(list) {
    this.beacons.forEach((b) => { b.visible = false; });
    list.forEach((b) => { if (b) b.visible = true; });
  }

  makeDome(x, z, r = 9, opacity = 0.5, color = '#7aa35a') {
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(r, 18, 12),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity, side: THREE.DoubleSide, depthWrite: false })
    );
    dome.position.set(x, this.heightAt(x, z) - 1, z);
    this.scene.add(dome);
    return dome;
  }

  /**
   * Una actividad "emerge" del suelo cuando le toca: el grupo sube, se
   * activan sus colisiones y hay un estallido de particulas. Asi en el campo
   * solo esta lo que ya se puede jugar.
   */
  reveal(group, { x, z, y, colliders = [], color = '#a8e06a' }) {
    if (!group || group.userData.revealed) return;
    group.userData.revealed = true;
    group.visible = true;
    const from = group.position.y;
    this.feedback.tween({
      from, to: 0, duration: 1.6,
      onUpdate: (v) => { group.position.y = v; },
      onDone: () => {
        group.position.y = 0;
        colliders.forEach((c) => this.controller.addCollider(c));
      }
    });
    this.feedback.burst(_v.set(x, y + 1.5, z), { count: 36, color, speed: 3.4, life: 1.6, gravity: -0.5 });
    this.feedback.shakeCamera(0.12, 3);
    this.audio.play('rumble', { volume: 0.25, rate: 1.3 });
    this.later(() => this.audio.play('light', { volume: 0.45 }), 900);
  }

  /* ---------------------------------------------------------- zonas (1) */

  buildZones() {
    this.zones = ZONES.map((def) => {
      const y = this.heightAt(def.x, def.z);
      const group = new THREE.Group();
      group.visible = false;
      group.position.y = -9;               // emerge del suelo cuando le toca
      this.scene.add(group);
      const zone = { ...def, y, group, colliders: [], answered: 0, done: false, unlocked: false, current: null, cooldown: 0, entered: false };
      this.decorateZone(zone);
      zone.label = makeText(`${def.icon} ${def.name}`, { size: 0.9, maxChars: 30 });
      zone.label.position.set(def.x, y + 3.6, def.z);
      group.add(zone.label);
      zone.beacon = this.makeBeacon(def.x, def.z);
      zone.stimuli = def.stimuli.map((st) => this.makeStimulus(st));
      return zone;
    });
  }

  decorateZone(zone) {
    const { x, z, y, kind, group } = zone;
    if (kind === 'pantano') {
      const geo = new THREE.CircleGeometry(6, 20);
      geo.rotateX(-Math.PI / 2);
      const pool = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: '#5f7a2e', roughness: 0.35, transparent: true, opacity: 0.9, flatShading: true }));
      pool.position.set(x, y + 0.05, z);
      group.add(pool);
      this.pool = pool;
      this.bubbles = [];
      const mat = new THREE.MeshStandardMaterial({ color: '#b9e08a', transparent: true, opacity: 0.5, roughness: 0.2, flatShading: true });
      for (let i = 0; i < 10; i += 1) {
        const b = new THREE.Mesh(new THREE.IcosahedronGeometry(0.22, 0), mat);
        b.position.set(x + (Math.random() - 0.5) * 9, y + 0.2, z + (Math.random() - 0.5) * 9);
        b.userData = { baseY: b.position.y, speed: 0.4 + Math.random() * 0.6, phase: Math.random() * 6 };
        group.add(b);
        this.bubbles.push(b);
      }
    } else if (kind === 'cueva') {
      for (let i = 0; i < 9; i += 1) {
        const a = Math.PI * 1.25 + (i / 8) * Math.PI;   // semicirculo abierto hacia la plaza
        const rx = x + Math.cos(a) * 5.5;
        const rz = z + Math.sin(a) * 5.5 - 1;
        const rock = makeRock({ color: '#5f6b62', scale: 1.6 + (i % 3) * 0.8 });
        rock.position.set(rx, this.heightAt(rx, rz), rz);
        group.add(rock);
        zone.colliders.push({ type: 'sphere', center: new THREE.Vector3(rx, this.heightAt(rx, rz), rz), radius: 0.9 });
      }
      const back = makeRock({ color: '#2f3a33', scale: 4.2 });
      back.position.set(x + 2.5, this.heightAt(x + 2.5, z - 2.5) - 0.6, z - 2.5);
      group.add(back);
      zone.colliders.push({ type: 'sphere', center: new THREE.Vector3(x + 2.5, y, z - 2.5), radius: 2.2 });
    } else if (kind === 'bosque') {
      for (let i = 0; i < 9; i += 1) {
        const a = (i / 9) * Math.PI * 2;
        const r = 5 + (i % 2) * 1.6;
        const tx = x + Math.cos(a) * r;
        const tz = z + Math.sin(a) * r;
        const tree = makeTree({ color: i % 2 ? '#3f7a45' : '#5a9a4a', trunkColor: '#5a3f2a', scale: 1.3 + (i % 3) * 0.25 });
        tree.position.set(tx, this.heightAt(tx, tz), tz);
        group.add(tree);
        zone.colliders.push({ type: 'sphere', center: new THREE.Vector3(tx, this.heightAt(tx, tz), tz), radius: 0.55 });
      }
    } else if (kind === 'rechazo') {
      const mat = new THREE.MeshStandardMaterial({ color: '#8a6a3a', roughness: 1, flatShading: true });
      for (let i = 0; i < 12; i += 1) {
        if (i % 4 === 0) continue;                  // huecos para entrar
        const a = (i / 12) * Math.PI * 2;
        const px = x + Math.cos(a) * 6;
        const pz = z + Math.sin(a) * 6;
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.4, 0.3), mat);
        post.position.set(px, this.heightAt(px, pz) + 0.7, pz);
        group.add(post);
      }
      const sign = makeEmoji('🚧', 1.2);
      sign.position.set(x, y + 1.6, z);
      group.add(sign);
    }
  }

  makeStimulus(def) {
    const g = new THREE.Group();
    const orb = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.55, 1),
      new THREE.MeshStandardMaterial({ color: '#d9ecc4', emissive: '#7fb35a', emissiveIntensity: 0.5, transparent: true, opacity: 0.85, roughness: 0.4, flatShading: true })
    );
    g.add(orb);
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.95, 0.05, 6, 30),
      new THREE.MeshBasicMaterial({ color: '#cfffa0', transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    ring.rotation.x = Math.PI / 2;
    g.add(ring);
    const icon = makeEmoji(def.icon, 0.9);
    icon.position.y = 1.05;
    g.add(icon);
    g.visible = false;
    this.scene.add(g);
    return { ...def, group: g, orb, ring, phase: Math.random() * 6 };
  }

  /* ---------------------------------------------------------- espejo (2) */

  buildMirror() {
    // todo el espejo (marco, reflejo, baldosas) vive en un grupo oculto que emerge en su etapa
    this.mirrorRoot = new THREE.Group();
    this.mirrorRoot.visible = false;
    this.mirrorRoot.position.y = -9;
    this.scene.add(this.mirrorRoot);
    const g = new THREE.Group();
    const y = this.heightAt(MIRROR.x, MIRROR.z);
    g.position.set(MIRROR.x, y, MIRROR.z);

    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(6.6, 5, 0.5),
      new THREE.MeshStandardMaterial({ color: '#3b2f22', roughness: 0.8, flatShading: true })
    );
    frame.position.y = 2.6;
    g.add(frame);
    this.mirrorGlass = new THREE.Mesh(
      new THREE.PlaneGeometry(5.8, 4.2),
      new THREE.MeshStandardMaterial({ color: '#12222b', metalness: 0.75, roughness: 0.25, emissive: '#0a161c', emissiveIntensity: 0.4 })
    );
    this.mirrorGlass.position.set(0, 2.6, 0.27);
    g.add(this.mirrorGlass);
    const title = makeText('El Espejo de las Reacciones', { size: 0.8, maxChars: 30 });
    title.position.set(0, 5.8, 0.4);
    g.add(title);

    // el reflejo es el propio jugador: su emoji y su color favorito del perfil
    this.mirrorAvatar = makeAvatar({
      color: this.player?.favoriteColor ?? '#cfe6b8',
      accent: '#f2f2e8',
      emoji: this.player?.avatar ?? null
    });
    this.mirrorAvatar.position.set(0, 0.05, 1.1);
    this.mirrorAvatar.visible = false;
    g.add(this.mirrorAvatar);
    this.mirrorGesture = makeEmoji('🙂', 1.2);
    this.mirrorGesture.position.set(0, 2.55, 1.2);
    this.mirrorGesture.visible = false;
    g.add(this.mirrorGesture);
    this.mirrorSpeech = makeText('¡No me gusta!', { size: 0.55, bg: 'rgba(255,255,255,0.9)', color: '#10202c', maxChars: 16 });
    this.mirrorSpeech.position.set(1.1, 2.35, 1.3);
    this.mirrorSpeech.visible = false;
    g.add(this.mirrorSpeech);

    this.mirrorRoot.add(g);
    this.mirrorCollider = { type: 'box', box: new THREE.Box3(
      new THREE.Vector3(MIRROR.x - 3.4, y - 1, MIRROR.z - 0.5), new THREE.Vector3(MIRROR.x + 3.4, y + 6, MIRROR.z + 0.6)
    ) };

    // baldosas en abanico frente al espejo
    const items = shuffle(SIGNALS);
    this.plates = items.map((item, i) => {
      const a = -1.35 + (2.7 * i) / (items.length - 1);
      const r = 8;
      const px = MIRROR.x + Math.sin(a) * r;
      const pz = MIRROR.z + 2.2 + Math.cos(a) * r;
      const py = this.heightAt(px, pz);
      const mesh = new THREE.Mesh(
        new THREE.CylinderGeometry(1, 1, 0.16, 10),
        new THREE.MeshStandardMaterial({ color: '#4c5a4c', emissive: '#88aa66', emissiveIntensity: 0.15, roughness: 0.9, flatShading: true })
      );
      mesh.position.set(px, py + 0.08, pz);
      this.mirrorRoot.add(mesh);
      const label = makeText(`${item.icon} ${item.label}`, { size: 0.42, maxChars: 18 });
      label.position.set(px, py + (i % 2 ? 1.75 : 1.15), pz);
      this.mirrorRoot.add(label);
      return { item, mesh, label, x: px, z: pz, solved: false };
    });

    this.mirror = { active: false, order: [], current: null, solved: 0, dwell: 0, onPlate: null, judged: false };
    this.mirrorBeacon = this.makeBeacon(MIRROR.x, MIRROR.z + 6);
  }

  /* ------------------------------------------------------ termómetro (3) */

  buildThermometer() {
    const y0 = this.heightAt(CENTER.x, CENTER.z);
    const g = new THREE.Group();
    g.position.set(CENTER.x, y0, CENTER.z);

    const tube = new THREE.Mesh(
      new THREE.CylinderGeometry(0.55, 0.55, 7.2, 14),
      new THREE.MeshStandardMaterial({ color: '#e8f4f6', transparent: true, opacity: 0.32, roughness: 0.1, metalness: 0.1 })
    );
    tube.position.y = 4.4;
    g.add(tube);
    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(1.05, 16, 12),
      new THREE.MeshStandardMaterial({ color: '#c0392b', emissive: '#7a1f18', emissiveIntensity: 0.5, roughness: 0.4 })
    );
    bulb.position.y = 0.95;
    g.add(bulb);
    const mgeo = new THREE.CylinderGeometry(0.3, 0.3, 1, 10);
    mgeo.translate(0, 0.5, 0);
    this.mercury = new THREE.Mesh(mgeo, new THREE.MeshStandardMaterial({ color: '#9fd18a', emissive: '#4f8a3a', emissiveIntensity: 0.6, roughness: 0.3 }));
    this.mercury.position.y = 1.4;
    this.mercury.scale.y = 0.6;
    g.add(this.mercury);

    [['1 · LEVE', 2.6, '#7fd17f'], ['2 · MODERADO', 4.6, '#f2c14e'], ['3 · INTENSO', 6.6, '#e0453a']].forEach(([txt, h, c]) => {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.06, 6, 20), new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.6 }));
      ring.rotation.x = Math.PI / 2;
      ring.position.y = h;
      g.add(ring);
      const lb = makeText(txt, { size: 0.45, maxChars: 14 });
      lb.position.set(1.6, h, 0);
      g.add(lb);
    });
    const title = makeText('¿QUÉ TAN INTENSO ES TU DESAGRADO?', { size: 0.7, maxChars: 22 });
    title.position.y = 8.9;
    g.add(title);
    this.plazaGroup.add(g);
    this.thermoGroup = g;
    this.controller.addCollider({ type: 'sphere', center: new THREE.Vector3(CENTER.x, y0, CENTER.z), radius: 0.9 });
    (this.lampParts || []).forEach((part) => this.plazaGroup.add(part));

    // bordes de las terrazas (el color ya dice el nivel; sin carteles que se crucen)
    [[7, '#7fd17f'], [4.6, '#f2c14e'], [2.4, '#e0453a']].forEach(([r, c]) => {
      const rim = new THREE.Mesh(new THREE.TorusGeometry(r, 0.09, 6, 48), new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.5 }));
      rim.rotation.x = Math.PI / 2;
      const h = this.heightAt(CENTER.x + r - 0.3, CENTER.z);
      rim.position.set(CENTER.x, h + 0.05, CENTER.z);
      this.plazaGroup.add(rim);
    });

    this.thermo = { enabled: false };
    this.thermoInteract = this.interactable({
      object: tube, radius: 8.5, icon: '🌡️', label: 'Confirmar nivel',
      onInteract: () => this.confirmLevel()
    });
    this.thermoInteract.enabled = false;
    this.thermoBeacon = this.makeBeacon(CENTER.x, CENTER.z + 7.8);
  }

  /* -------------------------------------------------------- caminos (4) */

  buildPaths() {
    PATH_ORDER.forEach((id) => {
      const def = PATHS[id];
      const y = this.heightAt(def.x, def.z);
      const group = new THREE.Group();
      group.visible = false;
      this.scene.add(group);
      group.position.y = -9;               // emerge del suelo cuando se abre
      const path = {
        id, ...def, y, group, open: false, done: false,
        beacon: this.makeBeacon(def.x, def.z, '#ffd166'),
        sign: makeText(`${def.icon} ${def.name}\n${def.technique}`, { size: 0.7, maxChars: 26 })
      };
      path.sign.position.set(def.x, y + 4.2, def.z);
      group.add(path.sign);
      this.paths[id] = path;
      this[`build_${id}`](path);
    });
  }

  /* ······ respira: la burbuja de calma */

  build_respira(path) {
    const { x, z, y, group } = path;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2, 0.14, 6, 32), new THREE.MeshStandardMaterial({ color: '#9fb8a0', emissive: '#7fd1ff', emissiveIntensity: 0.3, flatShading: true }));
    ring.rotation.x = Math.PI / 2;
    ring.position.set(x, y + 0.08, z);
    group.add(ring);
    const bubble = new THREE.Mesh(
      new THREE.SphereGeometry(1.6, 20, 14),
      new THREE.MeshStandardMaterial({ color: '#bfe8ff', emissive: '#7fd1ff', emissiveIntensity: 0.35, transparent: true, opacity: 0.32, roughness: 0.1, side: THREE.DoubleSide, depthWrite: false })
    );
    bubble.position.set(x, y + 1.6, z);
    group.add(bubble);
    for (let i = 0; i < 5; i += 1) {
      const a = (i / 5) * Math.PI * 2;
      const tx = x + Math.cos(a) * 6.5;
      const tz = z + Math.sin(a) * 6.5;
      const tree = makeTree({ color: '#6fb08a', trunkColor: '#5a3f2a', scale: 1.2 });
      tree.position.set(tx, this.heightAt(tx, tz), tz);
      group.add(tree);
    }
    const board = makeText(
      'RESPIRACIÓN CONSCIENTE\n1. Detenerse\n2. Tomar aire lentamente por la nariz\n3. Mantenerlo unos segundos\n4. Soltarlo lentamente por la boca\n5. Repetir de 3 a 5 veces',
      { size: 2.2, maxChars: 34, px: 40, bg: 'rgba(20,40,30,0.85)' }
    );
    board.position.set(x + 4.2, y + 2.4, z - 2.5);
    group.add(board);
    path.bubble = bubble;
    path.ring = ring;
  }

  /* ······ atencion: el claro de las mariposas */

  build_atencion(path) {
    const { x, z, y, group } = path;
    const colors = ['#ff4d4d', '#3a7bff', '#ffe23a', '#b04dff', '#ff9a2e'];
    path.butterflies = [];
    const mkButterfly = (color, colored) => {
      const g = new THREE.Group();
      const mat = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide });
      // alas: dos elipses horizontales con bisagra en el cuerpo (eje z)
      const wing = (side) => {
        const geo = new THREE.CircleGeometry(0.17, 12);
        geo.scale(1.5, 1, 1);
        geo.translate(0.28 * side, 0, 0);
        geo.rotateX(-Math.PI / 2);
        return new THREE.Mesh(geo, mat);
      };
      const wl = wing(-1);
      const wr = wing(1);
      g.add(wl, wr);
      const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 0.24, 2, 5), new THREE.MeshBasicMaterial({ color: '#2a2a2a' }));
      body.rotation.x = Math.PI / 2;
      g.add(body);
      g.userData = { wl, wr, colored, color };
      group.add(g);
      const cx = x + (Math.random() - 0.5) * 8;
      const cz = z + (Math.random() - 0.5) * 8;
      return {
        group: g, colored, color, found: false, focus: 0,
        cx, cz, r: 1.5 + Math.random() * 2, w: 0.5 + Math.random() * 0.6, h: 1.3 + Math.random() * 1.4,
        phase: Math.random() * 6
      };
    };
    colors.forEach((c) => path.butterflies.push(mkButterfly(c, true)));
    for (let i = 0; i < 12; i += 1) path.butterflies.push(mkButterfly(i % 2 ? '#6fa35a' : '#8bbf6a', false));

    const fmat = new THREE.MeshStandardMaterial({ color: '#cfe6b8', roughness: 0.9, flatShading: true });
    for (let i = 0; i < 14; i += 1) {
      const a = (i / 14) * Math.PI * 2;
      const fx = x + Math.cos(a) * 7.5;
      const fz = z + Math.sin(a) * 7.5;
      const flower = new THREE.Mesh(new THREE.IcosahedronGeometry(0.22, 0), fmat);
      flower.position.set(fx, this.heightAt(fx, fz) + 0.35, fz);
      group.add(flower);
    }
    path.count = 0;
  }

  /* ······ acepta: el Jardín de las Sensaciones */

  build_acepta(path) {
    const { x, z, group } = path;
    const len = Math.hypot(x, z);
    const u = { x: x / len, z: z / len };          // hacia fuera de la isla
    const start = { x: x - u.x * 6, z: z - u.z * 6 };
    path.u = u;

    const pedY = this.heightAt(start.x, start.z);
    const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.7, 0.8, 8), new THREE.MeshStandardMaterial({ color: '#6b6f66', roughness: 1, flatShading: true }));
    pedestal.position.set(start.x, pedY + 0.4, start.z);
    group.add(pedestal);
    path.orb = this.makeSensationOrb();
    path.orb.position.set(start.x, pedY + 1.3, start.z);
    path.orbHome = path.orb.position.clone();
    group.add(path.orb);
    path.orbInteract = this.interactable({
      object: path.orb, radius: 2.4, icon: '🫳', label: 'Sostener la sensación',
      onInteract: () => this.pickSensation(path)
    });
    path.orbInteract.enabled = false;

    path.arches = ACCEPT_STEPS.map((st, i) => {
      const ax = start.x + u.x * 4.5 * (i + 1);
      const az = start.z + u.z * 4.5 * (i + 1);
      const ay = this.heightAt(ax, az);
      const arch = new THREE.Group();
      arch.position.set(ax, ay, az);
      const pmat = new THREE.MeshStandardMaterial({ color: '#8a9a7a', emissive: '#6fb08a', emissiveIntensity: 0.15, roughness: 0.9, flatShading: true });
      const right = { x: -u.z, z: u.x };
      [-1, 1].forEach((s) => {
        const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, 2.8, 6), pmat);
        pillar.position.set(right.x * 1.5 * s, 1.4, right.z * 1.5 * s);
        arch.add(pillar);
      });
      const lintel = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.35, 0.5), pmat);
      lintel.position.y = 2.95;
      lintel.rotation.y = Math.atan2(u.x, u.z);
      arch.add(lintel);
      const label = makeText(st.key, { size: 0.6, maxChars: 14, color: '#ffd166' });
      label.position.y = 3.9;
      arch.add(label);
      group.add(arch);
      return { group: arch, x: ax, z: az, label, mat: pmat, step: st, done: false };
    });

    const plotX = start.x + u.x * 4.5 * 4 + u.x * 1.5;
    const plotZ = start.z + u.z * 4.5 * 4 + u.z * 1.5;
    path.plot = { x: plotX, z: plotZ, y: this.heightAt(plotX, plotZ) };
    const soil = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.2, 0.3, 10), new THREE.MeshStandardMaterial({ color: '#4a3826', roughness: 1, flatShading: true }));
    soil.position.set(plotX, path.plot.y + 0.15, plotZ);
    group.add(soil);
    path.plant = this.makePlant();
    path.plant.position.set(plotX, path.plot.y + 0.3, plotZ);
    path.plant.scale.setScalar(0.001);
    group.add(path.plant);
    path.step = 0;
    path.carrying = false;
  }

  makeSensationOrb() {
    const g = new THREE.Group();
    const core = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.42, 1),
      new THREE.MeshStandardMaterial({ color: '#6b7a4a', emissive: '#3f5a2a', emissiveIntensity: 0.5, roughness: 0.7, flatShading: true })
    );
    g.add(core);
    for (let i = 0; i < 4; i += 1) {
      const puff = new THREE.Mesh(new THREE.IcosahedronGeometry(0.2, 0), new THREE.MeshStandardMaterial({ color: '#8a9a6a', transparent: true, opacity: 0.6, roughness: 1, flatShading: true }));
      const a = (i / 4) * Math.PI * 2;
      puff.position.set(Math.cos(a) * 0.45, Math.sin(a * 2) * 0.2, Math.sin(a) * 0.45);
      g.add(puff);
    }
    g.userData.core = core;
    return g;
  }

  makePlant() {
    const g = new THREE.Group();
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 2.2, 6), new THREE.MeshStandardMaterial({ color: '#4a8a3a', roughness: 1, flatShading: true }));
    stem.position.y = 1.1;
    g.add(stem);
    const leafMat = new THREE.MeshStandardMaterial({ color: '#6fc26a', roughness: 1, flatShading: true, side: THREE.DoubleSide });
    for (let i = 0; i < 6; i += 1) {
      const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.35, 1, 4), leafMat);
      const a = (i / 6) * Math.PI * 2;
      leaf.position.set(Math.cos(a) * 0.5, 0.5 + i * 0.28, Math.sin(a) * 0.5);
      leaf.rotation.set(0.9, a, 0);
      g.add(leaf);
    }
    const flowerMat = new THREE.MeshStandardMaterial({ color: '#ff8fb8', emissive: '#ff5c9a', emissiveIntensity: 0.4, roughness: 0.8, flatShading: true });
    for (let i = 0; i < 5; i += 1) {
      const fl = new THREE.Mesh(new THREE.IcosahedronGeometry(0.22, 0), flowerMat);
      const a = (i / 5) * Math.PI * 2;
      fl.position.set(Math.cos(a) * 0.35, 2.25, Math.sin(a) * 0.35);
      g.add(fl);
    }
    return g;
  }

  /* ······ presente: el sendero 5-4-3-2-1 */

  build_presente(path) {
    const { x, z, group } = path;
    path.senses = SENSES.map((sense, si) => {
      const items = sense.items.map((text, ii) => {
        const [icon, ...rest] = text.split(' ');
        const label = rest.join(' ');
        const a = (si * 1.3 + ii * (Math.PI * 2 / sense.items.length)) + 0.4;
        const r = 2.5 + ((si + ii) % 4) * 1.4;
        const ix = x + Math.cos(a) * r;
        const iz = z + Math.sin(a) * r;
        const iy = this.heightAt(ix, iz);
        const item = { icon, label, x: ix, z: iz, y: iy, found: false, dwell: 0 };
        const holder = new THREE.Group();
        holder.position.set(ix, iy, iz);
        group.add(holder);
        item.holder = holder;

        if (sense.kind === 'gaze') {
          const glint = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), new THREE.MeshStandardMaterial({ color: '#fff4c0', emissive: '#ffd166', emissiveIntensity: 1.4 }));
          glint.position.y = 1.2 + (ii % 3) * 0.6;
          glint.visible = false;
          holder.add(glint);
          item.mesh = glint;
          const deco = makeTree({ color: '#3f7a45', trunkColor: '#5a3f2a', scale: 1.1 });
          deco.position.set(0.8, 0, 0.4);
          holder.add(deco);
        } else if (sense.kind === 'touch') {
          const geo = ii % 2 ? new THREE.IcosahedronGeometry(0.5, 0) : new THREE.BoxGeometry(0.8, 0.8, 0.8);
          const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: ['#6b4a2f', '#5a9a4a', '#7a7f86', '#7fc7e8'][ii], emissive: '#333', emissiveIntensity: 0.15, roughness: 0.9, flatShading: true }));
          mesh.position.y = 0.45;
          holder.add(mesh);
          item.mesh = mesh;
        } else if (sense.kind === 'sound') {
          const rings = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.05, 6, 24), new THREE.MeshBasicMaterial({ color: '#cfe6ff', transparent: true, opacity: 0.6 }));
          rings.rotation.x = Math.PI / 2;
          rings.position.y = 0.6;
          rings.visible = false;
          holder.add(rings);
          item.mesh = rings;
          item.sound = ['wind', 'wind', 'water'][ii];
          item.rate = [0.55, 1.1, 1.0][ii];
        } else if (sense.kind === 'scent') {
          const flower = new THREE.Mesh(new THREE.IcosahedronGeometry(0.3, 0), new THREE.MeshStandardMaterial({ color: ii ? '#ff9ac9' : '#8a6a3a', emissive: ii ? '#ff5c9a' : '#4a3826', emissiveIntensity: 0.3, roughness: 0.9, flatShading: true }));
          flower.position.y = 0.4;
          holder.add(flower);
          item.mesh = flower;
        } else if (sense.kind === 'taste') {
          const bush = new THREE.Mesh(new THREE.IcosahedronGeometry(0.9, 1), new THREE.MeshStandardMaterial({ color: '#3f7a45', roughness: 1, flatShading: true }));
          bush.position.y = 0.7;
          holder.add(bush);
          const fruit = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), new THREE.MeshStandardMaterial({ color: '#ff4d6d', emissive: '#ff2a55', emissiveIntensity: 0.4 }));
          fruit.position.set(0.5, 1.2, 0.6);
          holder.add(fruit);
          item.mesh = fruit;
          item.interact = this.interactable({
            object: fruit, radius: 2.2, icon: '🍓', label: 'Probar',
            onInteract: () => this.presenteFound(path, item)
          });
          item.interact.enabled = false;
        }
        const tag = makeText(`${icon} ${label}`, { size: 0.45, maxChars: 20 });
        tag.position.y = 2.1;
        tag.visible = false;
        holder.add(tag);
        item.tag = tag;
        return item;
      });
      return { ...sense, items, found: 0 };
    });
    path.senseIndex = 0;
  }

  /* ······ reevalua: las puertas del pensamiento */

  build_reevalua(path) {
    const { x, z, group } = path;
    const len = Math.hypot(x, z);
    const u = { x: x / len, z: z / len };
    const right = { x: -u.z, z: u.x };
    path.stations = THOUGHTS.map((th, i) => {
      const base = { x: x + u.x * (i ? 1.5 : -7), z: z + u.z * (i ? 1.5 : -7) };
      const station = new THREE.Group();
      group.add(station);
      const by = this.heightAt(base.x, base.z);
      const thought = makeText(`💭 ${th.text}`, { size: 1.1, maxChars: 22, bg: 'rgba(60,20,30,0.85)' });
      thought.position.set(base.x, by + 3.4, base.z);
      station.add(thought);
      const doorsBase = { x: base.x + u.x * 4.5, z: base.z + u.z * 4.5 };
      const order = shuffle(th.options);
      const doors = order.map((opt, j) => {
        const off = (j - 1) * 3.4;
        const dx = doorsBase.x + right.x * off;
        const dz = doorsBase.z + right.z * off;
        const dy = this.heightAt(dx, dz);
        const door = new THREE.Group();
        door.position.set(dx, dy, dz);
        door.rotation.y = Math.atan2(u.x, u.z);
        const pmat = new THREE.MeshStandardMaterial({ color: '#6b5a4a', roughness: 0.9, flatShading: true });
        [-1, 1].forEach((s) => {
          const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.3, 3, 0.3), pmat);
          pillar.position.set(1.2 * s, 1.5, 0);
          door.add(pillar);
        });
        const lintel = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.3, 0.35), pmat);
        lintel.position.y = 3.05;
        door.add(lintel);
        const panel = new THREE.Mesh(
          new THREE.PlaneGeometry(2.2, 2.9),
          new THREE.MeshStandardMaterial({ color: '#8fb28a', emissive: '#4f8a5b', emissiveIntensity: 0.25, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false })
        );
        panel.position.y = 1.45;
        door.add(panel);
        const label = makeText(opt.label, { size: 1.05, maxChars: 22, px: 34 });
        label.position.y = 4.4;
        door.add(label);
        station.add(door);
        return { group: door, panel, label, opt, x: dx, z: dz, prevAlong: null, bumpAt: -9, collider: null };
      });
      station.visible = i === 0;
      return { group: station, thought, doors, base, doorsBase, done: false, active: false };
    });
    path.u = u;
    path.right = right;
    path.stationIndex = 0;
  }

  /* ······ apoyo: el refugio del Guardián de Confianza */

  build_apoyo(path) {
    const { x, z, group } = path;
    this.guardian = makeAvatar({ color: '#7a5aa8', accent: '#f7e9d0', emoji: '🧙' });
    this.guardian.scale.setScalar(1.25);
    const gx = x + (Math.random() - 0.5) * 9;
    const gz = z + (Math.random() - 0.5) * 9;
    this.guardian.position.set(gx, this.heightAt(gx, gz), gz);
    this.guardian.visible = false;
    this.scene.add(this.guardian);
    this.guardianLabel = makeText('Guardián de Confianza', { size: 0.55, maxChars: 24 });
    this.guardianLabel.position.set(0, 2.2, 0);
    this.guardian.add(this.guardianLabel);
    this.guardianLight = new THREE.PointLight('#ffd6ff', 0, 12, 2);
    this.guardianLight.position.y = 1.8;
    this.guardian.add(this.guardianLight);

    for (let i = 0; i < 6; i += 1) {
      const a = (i / 6) * Math.PI * 2;
      const rx = x + Math.cos(a) * 7.5;
      const rz = z + Math.sin(a) * 7.5;
      const rock = makeRock({ color: '#5f6b62', scale: 1.2 });
      rock.position.set(rx, this.heightAt(rx, rz), rz);
      group.add(rock);
    }
    path.calls = 0;
    path.met = false;
    path.fog = this.makeDome(x, z, 11, 0);
    path.fog.visible = false;
  }

  /* ----------------------------------------------------------- arena (6) */

  buildArena() {
    const ay = this.heightAt(ARENA.x, ARENA.z);
    const creature = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.6, 1),
      new THREE.MeshStandardMaterial({ color: '#3a2a4a', emissive: '#7a1f3a', emissiveIntensity: 0.6, roughness: 0.6, flatShading: true })
    );
    body.position.y = 1.8;
    creature.add(body);
    const eyeMat = new THREE.MeshStandardMaterial({ color: '#fff', emissive: '#fff', emissiveIntensity: 0.8 });
    const pupilMat = new THREE.MeshBasicMaterial({ color: '#1a0a12' });
    creature.userData.eyes = [-0.55, 0.55].map((sx) => {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), eyeMat);
      eye.position.set(sx, 2.2, 1.35);
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), pupilMat);
      pupil.position.z = 0.22;
      eye.add(pupil);
      creature.add(eye);
      return eye;
    });
    const spikeMat = new THREE.MeshStandardMaterial({ color: '#5a2a5a', emissive: '#a02a4a', emissiveIntensity: 0.4, flatShading: true });
    for (let i = 0; i < 8; i += 1) {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.28, 1.1, 5), spikeMat);
      const a = (i / 8) * Math.PI * 2;
      spike.position.set(Math.cos(a) * 1.6, 1.8 + Math.sin(a * 3) * 0.5, Math.sin(a) * 1.6);
      spike.lookAt(Math.cos(a) * 4, 1.8, Math.sin(a) * 4);
      spike.rotateX(Math.PI / 2);
      creature.add(spike);
    }
    const label = makeText('La Reacción Impulsiva', { size: 0.8, maxChars: 24, bg: 'rgba(60,10,30,0.85)' });
    label.position.y = 4.4;
    creature.add(label);
    creature.position.set(ARENA.x, ay - 6, ARENA.z);
    creature.visible = false;
    this.arenaGroup = new THREE.Group();
    this.arenaGroup.visible = false;
    this.scene.add(this.arenaGroup);
    this.arenaGroup.add(creature);

    const wave = new THREE.Mesh(new THREE.TorusGeometry(1, 0.14, 6, 40), new THREE.MeshBasicMaterial({ color: '#ff5c5c', transparent: true, opacity: 0.7 }));
    wave.rotation.x = Math.PI / 2;
    wave.position.set(ARENA.x, ay + 0.4, ARENA.z);
    wave.visible = false;
    this.arenaGroup.add(wave);

    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(1.2, 2.2, 40, 12, 1, true),
      new THREE.MeshBasicMaterial({ color: '#fff3c4', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })
    );
    beam.position.set(ARENA.x, ay + 20, ARENA.z);
    this.arenaGroup.add(beam);

    this.altars = PATH_ORDER.filter((id) => id !== 'atencion').map((id, i, arr) => {
      const def = PATHS[id];
      const a = (i / arr.length) * Math.PI * 2 + Math.PI / 5;
      const x = ARENA.x + Math.cos(a) * 7.5;
      const z = ARENA.z + Math.sin(a) * 7.5;
      const y = this.heightAt(x, z);
      const stone = new THREE.Mesh(
        new THREE.CylinderGeometry(0.8, 0.95, 1.1, 8),
        new THREE.MeshStandardMaterial({ color: '#4f5a4c', emissive: '#a8e06a', emissiveIntensity: 0, roughness: 0.9, flatShading: true })
      );
      stone.position.set(x, y + 0.55, z);
      stone.visible = false;                       // los altares emergen con el desafio
      this.arenaGroup.add(stone);
      const icon = makeEmoji(def.icon, 1);
      icon.position.set(x, y + 1.9, z);
      icon.visible = false;
      this.arenaGroup.add(icon);
      const lb = makeText(`${def.technique}\n(aprende esta herramienta en su camino)`, { size: 0.62, maxChars: 24, color: '#cfd8c4' });
      lb.position.set(x, y + 3.1, z);
      lb.visible = false;
      this.arenaGroup.add(lb);
      const altar = { id, def, x, z, y, stone, icon, label: lb, busy: false, cooldown: 0, task: null };
      altar.interact = this.interactable({
        object: stone, radius: 2.6, icon: def.icon, label: `Usar: ${def.technique}`,
        onInteract: () => this.useAltar(altar)
      });
      altar.interact.enabled = false;
      return altar;
    });

    this.boss = { creature, body, wave, beam, size: 3, targetScale: 1, impulseTimer: 5, waveR: 0, waveOn: false, growCooldown: 0, runTime: 0, active: false, notes: new Set() };
    this.arenaBeacon = this.makeBeacon(ARENA.x, ARENA.z + 6, '#ff9d8a');
  }

  /* ---------------------------------------------------------------- HUD */

  buildHud() {
    if (this.dg?.hud?.isConnected) {
      // reinicio: se conserva la estructura y se limpia el contenido
      this.dg.task.hidden = true;
      this.dg.ask.hidden = true;
      this.dg.banner.innerHTML = '';
      this.dg.toasts.innerHTML = '';
      this.dg.stages.innerHTML = '';
      this.dg.fade.classList.remove('is-on');
      this.el.notes.innerHTML = '';
      this.root.classList.remove('has-banner');
      this.breathBar = this.addBar('breath', { icon: '🫁', color: '#7fd1ff', value: 0 });
      this.breathBar.show(false);
      return;
    }
    const hud = document.createElement('div');
    hud.className = 'dg-hud';
    hud.innerHTML = `
      <div class="dg-stages" data-dg-stages aria-label="Etapas de la isla"></div>
      <div class="dg-column" data-dg-column>
        <div class="dg-task" data-dg-task hidden></div>
      </div>
      <div class="dg-banner" data-dg-banner aria-live="polite"></div>
      <div class="dg-focus" data-dg-focus hidden><i></i></div>
      <div class="dg-bottom" data-dg-bottom>
        <div class="dg-toasts" data-dg-toasts></div>
        <div class="dg-ask" data-dg-ask hidden>
          <span class="dg-ask__icon" data-dg-ask-icon aria-hidden="true"></span>
          <div class="dg-ask__body">
            <p class="dg-ask__q" data-dg-ask-q>¿Esto me genera desagrado?</p>
            <p class="dg-ask__label" data-dg-ask-label></p>
            <p class="dg-ask__hint" data-dg-ask-hint>Si te genera desagrado, <b>aléjate</b>. Si no, deja que se acerque.</p>
          </div>
          <span class="dg-ask__meter" aria-hidden="true"><i data-dg-ask-meter></i></span>
        </div>
      </div>
      <div class="dg-fade" data-dg-fade aria-hidden="true"></div>
    `;
    this.root.appendChild(hud);
    // los avisos y el texto breve del nucleo pasan a la columna: asi nunca se pisan
    const column = hud.querySelector('[data-dg-column]');
    column.appendChild(this.el.notes);
    column.appendChild(this.el.center);
    this.dg = {
      hud,
      stages: hud.querySelector('[data-dg-stages]'),
      column,
      task: hud.querySelector('[data-dg-task]'),
      banner: hud.querySelector('[data-dg-banner]'),
      ask: hud.querySelector('[data-dg-ask]'),
      askIcon: hud.querySelector('[data-dg-ask-icon]'),
      askQ: hud.querySelector('[data-dg-ask-q]'),
      askLabel: hud.querySelector('[data-dg-ask-label]'),
      askHint: hud.querySelector('[data-dg-ask-hint]'),
      askMeter: hud.querySelector('[data-dg-ask-meter]'),
      focus: hud.querySelector('[data-dg-focus]'),
      toasts: hud.querySelector('[data-dg-toasts]'),
      fade: hud.querySelector('[data-dg-fade]')
    };
    this.breathBar = this.addBar('breath', { icon: '🫁', color: '#7fd1ff', value: 0 });
    this.breathBar.show(false);
  }

  setTask(text) {
    this.dg.task.hidden = !text;
    this.dg.task.textContent = text || '';
  }

  toast(text) {
    const el = document.createElement('div');
    el.className = 'dg-toast';
    el.textContent = text;
    this.dg.toasts.appendChild(el);
    this.later(() => el.remove(), 6000);
    this.speak(text);
  }

  /* ============================================== etapas, avisos y banner */

  setStage(id) {
    this.stage = id;
    this.phase = id;
    this.renderStages();
  }

  /** Mapa de etapas en la parte superior: hecho / activa / bloqueada. */
  renderStages() {
    if (!this.dg?.stages) return;
    this.dg.stages.innerHTML = STAGES.map((st) => {
      const state = this.stageDone.has(st.id) ? 'done' : st.id === this.stage ? 'active' : 'locked';
      const extra = st.id === 'paths' && (state !== 'locked') ? ` ${this.learned.size}/6` : '';
      return `<span class="dg-chip" data-state="${state}" title="${st.label}"><i>${state === 'done' ? '✓' : state === 'locked' ? '🔒' : st.icon}</i><b>${st.label}${extra}</b></span>`;
    }).join('<span class="dg-chip-sep" aria-hidden="true"></span>');
  }

  /** Tarjeta grande y animada al abrirse una etapa. Tambien se lee en voz alta. */
  showStageBanner({ icon, title, text, eyebrow = 'Nueva etapa', seconds = 8 }) {
    this.dg.banner.innerHTML = '';
    const el = document.createElement('div');
    el.className = 'dg-stage';
    el.innerHTML = `
      <span class="dg-stage__icon" aria-hidden="true">${icon}</span>
      <div class="dg-stage__body">
        <p class="dg-stage__eyebrow">${eyebrow}</p>
        <h3>${title}</h3>
        <p>${text}</p>
      </div>
    `;
    this.dg.banner.appendChild(el);
    this.bannerUntil = Date.now() + seconds * 1000;
    this.clearNotes();
    this.closeAllNotes();
    this.root.classList.add('has-banner');
    this.audio.play('chime', { volume: 0.45 });
    const cheer = this.stageDone.size ? `${CHEERS[this.stageDone.size % CHEERS.length]} ` : '';
    const name = this.player?.name && this.stageDone.size ? `${this.player.name}, ` : '';
    this.speak(`${cheer}${name}${eyebrow.toLowerCase()}: ${title}. ${text}`, { priority: true });
    this.later(() => {
      el.classList.add('is-out');
      this.root.classList.remove('has-banner');
      this.later(() => el.remove(), 450);
    }, seconds * 1000);
  }

  /**
   * Avisos en cola: uno a la vez, nunca encimados, y con una duracion que
   * depende del largo del texto para que se puedan leer con calma.
   */
  /**
   * Avisos. Por defecto un aviso nuevo reemplaza al anterior y su lectura
   * interrumpe la que hubiera (cada accion del jugador manda). Con
   * `queue: true` espera su turno: para los que siguen a un banner.
   */
  /**
   * Avisos. Se apilan en la columna (maximo dos a la vez: el nuevo resalta y
   * el anterior se atenua pero sigue legible). La voz lee el nuevo
   * interrumpiendo, salvo `queue: true` (los que siguen a un banner esperan).
   */
  showNote(opts = {}) {
    const words = cleanForSpeech(`${opts.title ?? ''} ${opts.text ?? ''}`).split(' ').length;
    const seconds = Math.min(45, Math.max(opts.seconds ?? 0, 8 + words * 0.65));
    const n = { ...opts, seconds };
    if (opts.replace) this.closeAllNotes();
    if (Date.now() < this.bannerUntil) {
      this.noteQueue.push(n);
      if (this.noteQueue.length > 3) this.noteQueue.shift();
      this.later(() => this.pumpNotes(), Math.max(60, this.bannerUntil - Date.now() + 80));
      return null;
    }
    this.renderNote(n);
    return null;
  }

  pumpNotes() {
    if (this.disposedFlag) return;
    if (Date.now() < this.bannerUntil) { this.later(() => this.pumpNotes(), 400); return; }
    while (this.noteQueue.length) this.renderNote(this.noteQueue.shift());
  }

  renderNote(n) {
    while (this.noteStack.length >= 2) this.noteStack[0].close();
    this.noteStack.forEach((e) => e.note.classList.add('is-old'));
    const note = document.createElement('div');
    note.className = 'i3d-note dg-note';
    note.style.setProperty('--dur', `${n.seconds}s`);
    note.innerHTML = `
      ${n.icon ? `<span class="dg-note__icon" aria-hidden="true">${n.icon}</span>` : ''}
      <div class="dg-note__body">
        ${n.title ? `<p class="i3d-note__title">${n.title}</p>` : ''}
        <p class="i3d-note__text">${n.text}</p>
      </div>
      <button class="i3d-note__x" type="button" aria-label="Cerrar">&times;</button>
      <span class="i3d-note__bar" aria-hidden="true"></span>
    `;
    this.el.notes.appendChild(note);
    let closed = false;
    const entry = { note };
    entry.close = () => {
      if (closed) return;
      closed = true;
      const i = this.noteStack.indexOf(entry);
      if (i >= 0) this.noteStack.splice(i, 1);
      note.classList.add('is-out');
      this.later(() => note.remove(), 300);
    };
    this.noteStack.push(entry);
    note.querySelector('.i3d-note__x').addEventListener('click', entry.close);
    this.later(entry.close, n.seconds * 1000);
    this.speak(`${n.title ? `${n.title}. ` : ''}${n.text}`, { priority: !n.queue });
  }

  closeAllNotes() {
    this.noteStack.slice().forEach((e) => e.close());
  }

  /* ===================================================== viaje al entorno */

  /** Punto de entrada a una actividad: a `dist` metros, del lado de la plaza. */
  entranceOf(x, z, dist) {
    const dx = CENTER.x - x;
    const dz = CENTER.z - z;
    const len = Math.hypot(dx, dz) || 1;
    return { x: x + (dx / len) * dist, z: z + (dz / len) * dist };
  }

  /**
   * Fundido y traslado del jugador a la entrada de la actividad, mirando
   * hacia ella. Asi cada etapa empieza en su propio entorno.
   */
  travelTo(x, z, look, label = '') {
    if (this.finished) return;
    const fade = this.dg.fade;
    this.controller.frozen = true;
    fade.classList.add('is-on');
    this.audio.play('wind', { volume: 0.35, rate: 1.5 });
    this.later(() => {
      this.controller.setPosition(x, this.heightAt(x, z) + 0.1, z);
      this.controller.yaw = Math.atan2(-(look.x - x), -(look.z - z));
      this.controller.pitch = 0.02;
      this.controller.velocity.set(0, 0, 0);
      this.later(() => {
        fade.classList.remove('is-on');
        this.controller.frozen = false;
        if (label) this.say(label, 3200, { speak: false });
      }, 260);
    }, 520);
  }

  /* ============================================== entornos por actividad */

  /**
   * Cada actividad es un entorno propio: solo se ve lo suyo, el jugador no
   * puede salir de su area (limites invisibles) y el aire cambia de color.
   */
  registerEnvs() {
    const env = (id, group, x, z, rx, rz) => { this.envs[id] = { id, group, x, z, rx, rz }; };
    env('plaza', this.plazaGroup, CENTER.x, CENTER.z, 13, 13);
    this.zones.forEach((zone) => env(zone.id, zone.group, zone.x, zone.z, 13, 13));
    env('mirror', this.mirrorRoot, MIRROR.x, MIRROR.z + 6, 13, 14);
    PATH_ORDER.forEach((id) => { const p = this.paths[id]; env(id, p.group, p.x, p.z, 15, 15); });
    env('arena', this.arenaGroup, ARENA.x, ARENA.z, 15, 16);
  }

  enterEnvironment(id, entrance, look, label) {
    const env = this.envs[id];
    if (!env) return;
    this.currentEnv = id;
    Object.values(this.envs).forEach((e) => { if (e.group) e.group.visible = e === env; });
    if (this.guardian && id !== 'apoyo' && id !== 'arena') this.guardian.visible = false;
    this.controller.bounds = { minX: env.x - env.rx, maxX: env.x + env.rx, minZ: env.z - env.rz, maxZ: env.z + env.rz };
    const tint = ENV_TINTS[id] ?? ENV_TINTS.plaza;
    this.feedback.tweenColor(this.scene.fog.color, tint.fog, 2);
    this.sky.userData.setColors(tint.sky[0], tint.sky[1]);
    // la niebla cierra el horizonte: no se ve el resto de la isla
    if (this.scene.fog.density < 0.024) this.feedback.tweenValue(this.scene.fog, 'density', 0.024, 2);
    if (entrance) this.travelTo(entrance.x, entrance.z, look, label);
  }

  clearNotes() {
    this.noteQueue.length = 0;
  }

  /** El texto breve del centro no se muestra encima del banner de etapa. */
  /** El texto breve del centro no se muestra encima del banner de etapa; tambien se lee. */
  /**
   * Texto breve del centro. Dura mas para que se lea con calma. Se lee en voz
   * alta interrumpiendo (es la respuesta a una accion), salvo `speak: false`
   * para las transiciones automaticas que ya tienen su banner o aviso.
   */
  say(text, ms = 2600, { speak = true } = {}) {
    if (Date.now() < this.bannerUntil) return;
    super.say(text, Math.max(ms, 2600));
    if (speak && text !== this.lastSaid) {
      this.lastSaid = text;
      this.speak(text, { priority: true });
    }
  }

  /* ================================================== recorrido lineal */

  startThermoStage() {
    this.setStage('thermo');
    this.enterEnvironment('plaza');
    this.thermo.enabled = true;
    this.thermoInteract.enabled = true;
    this.standLevel = 0;
    this.setBeacons([this.thermoBeacon]);
    this.showStageBanner({
      icon: '🌡️', title: 'El Termómetro del Desagrado',
      text: '¿Qué tan intenso es tu desagrado ahora? Ve a la plaza, sube por las terrazas hasta tu nivel y confirma con E.'
    });
    this.later(() => this.stage === 'thermo' && this.showNote({
      queue: true,
      icon: '🌡️',
      title: 'Solo tú puedes identificar qué tan intenso estás sintiendo el desagrado',
      text: 'Nivel 1, leve: «me incomoda, pero puedo manejarlo». Nivel 2, moderado: «mi desagrado está aumentando». Nivel 3, intenso: «mi emoción está muy fuerte y necesito detenerme». La isla cambiará según lo que elijas.'
    }), 6200);
  }

  startExploreStage() {
    this.setStage('explore');
    this.showStageBanner({
      icon: '🗺️', title: 'Primera parte: explora la isla',
      text: 'Las cuatro zonas se abren una a una. Los estímulos vendrán hacia ti: aléjate si te generan desagrado, o deja que se acerquen si no.'
    });
    this.later(() => this.unlockZone(0), 5200);
  }

  unlockZone(i) {
    const zone = this.zones[i];
    if (!zone) return;
    this.zoneIndex = i;
    zone.unlocked = true;
    this.reveal(zone.group, { x: zone.x, z: zone.z, y: zone.y, colliders: zone.colliders });
    this.setBeacons([zone.beacon]);
    this.say(`ZONA ${i + 1}/4 · ${zone.name.toUpperCase()}`, 3200, { speak: false });
    const e = this.entranceOf(zone.x, zone.z, 10.5);
    this.later(() => this.enterEnvironment(zone.id, e, zone, `LLEGAS A: ${zone.name.toUpperCase()}`), 1900);
    let text = ZONE_INTROS[zone.id];
    if (zone.id === 'rechazo' && this.customTexts?.length) text += ' También te esperan las cosas que tú escribiste.';
    this.showNote({ queue: true, icon: zone.icon, title: `Aparece: ${zone.name}`, text: `${text} Sigue la columna de luz.` });
  }

  startMirrorStage() {
    this.setStage('mirror');
    this.activateMirror();
    this.showStageBanner({
      icon: '🪞', title: 'Segunda etapa: el Espejo de las Reacciones',
      text: 'Al norte, tu reflejo mostrará expresiones y comportamientos del desagrado. Párate sobre la baldosa que diga lo que ves.'
    });
  }

  startPathsStage() {
    this.setStage('paths');
    this.pathQueue = [...(PATH_SEQUENCE[this.level] ?? PATH_ORDER)];
    const name = (LEVELS[this.level]?.title.split('— ')[1] ?? '').toLowerCase();
    this.showStageBanner({
      icon: '🧰', title: 'Cuarta etapa: elige tu herramienta',
      text: `Tu desagrado está en ${name}. Los seis caminos se abren uno a uno, empezando por el que más te sirve ahora. Cada uno te da una recompensa.`
    });
    this.later(() => this.unlockNextPath(), 6200);
  }

  unlockNextPath() {
    const id = this.pathQueue.shift();
    if (!id) {
      this.stageDone.add('paths');
      this.startReevalStage();
      return;
    }
    const path = this.paths[id];
    this.openPath(id);
    this.setBeacons([path.beacon]);
    const n = 6 - this.pathQueue.length;
    this.say(`CAMINO ${n}/6 · ${path.name.toUpperCase()}`, 3200, { speak: false });
    const e = this.entranceOf(path.x, path.z, 12.5);
    this.later(() => this.enterEnvironment(id, e, path, `LLEGAS A: ${path.name.toUpperCase()}`), 1900);
    const forLevel = path.levels.includes(this.level) ? ' Es el camino que el documento sugiere para tu nivel.' : '';
    this.showNote({ queue: true, icon: path.icon, title: `Aparece el camino «${path.name}»`, text: `Técnica: ${path.technique}.${forLevel} Sigue la columna de luz dorada.` });
  }

  startReevalStage() {
    this.setStage('reeval');
    this.thermo.enabled = true;
    this.thermoInteract.enabled = true;
    this.standLevel = 0;
    this.setBeacons([this.thermoBeacon]);
    this.later(() => this.enterEnvironment('plaza', { x: CENTER.x, z: CENTER.z + 11 }, CENTER, 'VUELVES AL TERMÓMETRO'), 900);
    this.showStageBanner({
      icon: '🔁', title: 'Reevaluación',
      text: 'Ya practicaste las seis herramientas. Vuelve al termómetro: ¿cómo está ahora tu desagrado? Sube a tu nivel y confirma con E.'
    });
  }

  /* =========================================================== voz (🔊) */

  /**
   * Lectura en voz alta con la Web Speech API del navegador: sin servidor ni
   * descargas. Se lee lo que el nino tendria que leer: avisos, instrucciones,
   * la pregunta de cada estimulo, las elecciones y el cierre.
   */
  initVoice() {
    if (this.voice) { this.buildVoiceButton(); return; }
    const available = typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
    this.voice = { available, on: false, chosen: null, all: [] };
    if (!available) return;
    this.voice.on = readStore(VOICE_KEY, 'on') !== 'off';
    const pick = () => {
      const voices = window.speechSynthesis.getVoices();
      const es = voices.filter((v) => scoreVoice(v) > 0).sort((a, b) => scoreVoice(b) - scoreVoice(a));
      this.voice.all = es;
      const wanted = readStore(VOICE_NAME_KEY, null);
      this.voice.chosen = es.find((v) => v.name === wanted) || es[0] || null;
    };
    pick();
    window.speechSynthesis.addEventListener?.('voiceschanged', pick);
    this.listeners.push(() => window.speechSynthesis.removeEventListener?.('voiceschanged', pick));
    this.buildVoiceButton();
  }

  buildVoiceButton() {
    if (!this.voice?.available) return;
    this.el.hud.querySelector('[data-dg-voice]')?.remove();
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'i3d__btn dg-voice';
    btn.dataset.dgVoice = '';
    btn.addEventListener('click', () => this.setVoice(!this.voice.on));
    this.el.hud.appendChild(btn);
    this.voiceBtn = btn;
    this.renderVoiceButton();
  }

  renderVoiceButton() {
    if (!this.voiceBtn) return;
    const on = this.voice.on;
    this.voiceBtn.textContent = on ? '🔊' : '🔇';
    this.voiceBtn.setAttribute('aria-label', on ? 'Lectura en voz alta activada' : 'Lectura en voz alta desactivada');
    this.voiceBtn.title = on ? 'Voz: activada (toca para silenciar)' : 'Voz: silenciada (toca para activar)';
    this.voiceBtn.dataset.on = on ? 'true' : 'false';
  }

  setVoice(on) {
    if (!this.voice?.available) return;
    this.voice.on = on;
    writeStore(VOICE_KEY, on ? 'on' : 'off');
    this.renderVoiceButton();
    if (!on) this.stopSpeaking();
    else this.speak('Lectura en voz alta activada.');
  }

  /** Cambia la voz elegida (desde el menu de pausa) y la prueba. */
  chooseVoice(name) {
    const v = this.voice;
    if (!v?.available) return;
    const found = v.all.find((x) => x.name === name);
    if (!found) return;
    v.chosen = found;
    writeStore(VOICE_NAME_KEY, name);
    this.speak(`Hola, ${this.player?.name ?? 'explorador'}. Así suena esta voz. ¿Te gusta?`, { priority: true });
  }

  /** Nombre corto y legible de una voz del sistema. */
  voiceLabel(v) {
    const lang = (v.lang || '').replace('_', '-');
    const region = { 'es-MX': 'México', 'es-CO': 'Colombia', 'es-ES': 'España', 'es-US': 'Estados Unidos', 'es-AR': 'Argentina', 'es-419': 'Latinoamérica', 'es-CL': 'Chile', 'es-PE': 'Perú' }[lang] || lang;
    const natural = /natural|neural|premium|enhanced/i.test(v.name) ? ' · natural' : /google/i.test(v.name) ? ' · Google' : '';
    const name = v.name.replace(/Microsoft |Google |Online|\(Natural\)|- Spanish.*$|español.*$/gi, '').trim() || v.name;
    return `${name} (${region})${natural}`;
  }

  /** El menu de pausa lleva ademas el selector de voz. */
  _showPauseMenu() {
    super._showPauseMenu();
    const v = this.voice;
    if (!v?.available || !v.all.length) return;
    const panel = this.el.overlay.querySelector('.i3d-panel');
    if (!panel) return;
    const box = document.createElement('div');
    box.className = 'dg-voicepick';
    box.innerHTML = `
      <label for="dg-voice-select">🔊 Voz de la guía</label>
      <div class="dg-voicepick__row">
        <select id="dg-voice-select">
          ${v.all.map((x) => `<option value="${escapeHtml(x.name)}" ${x === v.chosen ? 'selected' : ''}>${escapeHtml(this.voiceLabel(x))}</option>`).join('')}
        </select>
        <button class="i3d-btn" type="button" data-voice-test>Probar</button>
      </div>
      <p class="dg-voicepick__hint">${v.all.some((x) => /natural|neural/i.test(x.name)) ? 'Las voces marcadas «natural» suenan a persona.' : 'Consejo: en Microsoft Edge hay voces «naturales» en español que suenan a persona.'}</p>
    `;
    panel.querySelector('.i3d-panel__hint')?.before(box);
    const select = box.querySelector('select');
    const test = () => {
      // el menu pausa la voz: para probar se reanuda un momento
      this.speechPaused = false;
      try { window.speechSynthesis?.resume(); } catch { /* sin voz */ }
      this.chooseVoice(select.value);
      this.later(() => { if (this.paused) this.speechPaused = true; }, 100);
    };
    select.addEventListener('change', test);
    box.querySelector('[data-voice-test]').addEventListener('click', test);
  }

  /**
   * Lee un texto. Por defecto se pone en cola detras de lo que ya se esta
   * leyendo: ningun mensaje se corta. `priority` solo para lo urgente (la
   * pregunta de un estimulo que ya viene hacia ti).
   */
  speak(text, { priority = false } = {}) {
    const v = this.voice;
    if (!v?.available || !v.on || this.finished) return;
    const plain = cleanForSpeech(text);
    if (!plain) return;
    if (priority) this.stopSpeaking();
    const chunks = splitSentences(plain);
    chunks.forEach((c) => this.speechQueue.push(c));
    if (this.speechQueue.length > 24) this.speechQueue.splice(0, this.speechQueue.length - 24);
    this.pumpSpeech();
  }

  pumpSpeech() {
    // `paused` tambien es true en la bienvenida y el formulario: ahi si hay que leer.
    if (this.speechBusy || !this.speechQueue.length || this.speechPaused) return;
    const v = this.voice;
    const text = this.speechQueue.shift();
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = v.chosen?.lang ?? 'es-ES';
      if (v.chosen) u.voice = v.chosen;
      u.rate = 0.92;                   // un poco mas pausado: se entiende mejor
      u.pitch = 1.08;                  // ligeramente mas alto: suena mas amable
      u.volume = 1;
      this.speechBusy = true;
      this._utter = u;                 // si se recoge como basura, Chrome nunca avisa del final
      const done = () => {
        if (this._utter !== u) return;
        this.speechBusy = false;
        this._utter = null;
        clearTimeout(this._speechGuard);
        this.pumpSpeech();
      };
      u.onend = done;
      u.onerror = done;
      clearTimeout(this._speechGuard);
      this._speechGuard = setTimeout(done, 1500 + text.length * 95);   // red de seguridad
      window.speechSynthesis.speak(u);
    } catch {
      this.speechBusy = false;
    }
  }

  stopSpeaking() {
    this.speechQueue.length = 0;
    this.speechBusy = false;
    this._utter = null;
    clearTimeout(this._speechGuard);
    try { window.speechSynthesis?.cancel(); } catch { /* nada que parar */ }
  }

  /** La tarjeta de instrucciones tambien se lee (el clic en Jugar ya autorizo la voz). */
  interactionIntro() {
    const promise = super.interactionIntro();
    const { goal, hint } = this._intro ?? {};
    // "Como se juega" desde el menu de pausa llega con la voz en pausa: se reanuda
    this.speechPaused = false;
    try { window.speechSynthesis?.resume(); } catch { /* sin voz */ }
    const name = this.player?.name;
    this.speak(`${name ? `¡Hola, ${name}! ` : '¡Hola! '}${goal ?? ''} ${hint ?? ''} Cuando quieras, pulsa Empezar.`);
    return promise;
  }

  togglePause(on) {
    super.togglePause(on);
    this.speechPaused = this.paused;
    this.root.classList.toggle('is-paused', this.paused);   // el HUD se esconde tras el menu
    try {
      if (this.paused) window.speechSynthesis?.pause();
      else { window.speechSynthesis?.resume(); this.pumpSpeech(); }
    } catch { /* sin voz */ }
  }

  /* ============================================ estimulos escritos por el nino */

  /**
   * Antes de explorar, el nino puede escribir una o dos cosas que a el le den
   * desagrado. Aparecen despues como estimulos en la Zona de rechazo: el
   * documento insiste en que no todas las personas reaccionan igual.
   */
  askCustomStimuli() {
    const saved = readStore(CUSTOM_KEY, []);
    this.paused = true;
    this.controller.enabled = false;
    return new Promise((resolve) => {
      const box = document.createElement('div');
      box.className = 'i3d-intro';
      box.innerHTML = `
        <div class="i3d-intro__card dg-custom" role="dialog" aria-modal="true" aria-label="Tus propios estímulos">
          <p class="i3d-intro__eyebrow">Antes de empezar · opcional</p>
          <h3>¿Hay algo que a ti te dé desagrado?</h3>
          <p class="i3d-intro__hint">Escríbelo y aparecerá en la isla como un estímulo más. No todas las personas reaccionan igual: lo tuyo también cuenta.</p>
          <label class="dg-custom__field"><span>1.</span><input type="text" maxlength="60" placeholder="Por ejemplo: el olor a pescado" value="${escapeHtml(saved[0] ?? '')}" data-custom="0" autocomplete="off"></label>
          <label class="dg-custom__field"><span>2.</span><input type="text" maxlength="60" placeholder="Por ejemplo: que alguien mastique con la boca abierta" value="${escapeHtml(saved[1] ?? '')}" data-custom="1" autocomplete="off"></label>
          <div class="i3d-panel__actions">
            <button class="i3d-btn i3d-btn--primary" type="button" data-ok>Añadir a la isla</button>
            <button class="i3d-btn" type="button" data-skip>Saltar</button>
          </div>
        </div>
      `;
      this.el.overlay.appendChild(box);
      const inputs = [...box.querySelectorAll('[data-custom]')];
      const close = (texts) => {
        box.remove();
        this.paused = false;
        this.controller.enabled = true;
        this.controller.keys = Object.create(null);
        this.clock.getDelta();
        this.customTexts = texts;
        writeStore(CUSTOM_KEY, texts);
        this.applyCustomStimuli();
        resolve(texts);
      };
      box.querySelector('[data-ok]').addEventListener('click', () => {
        close(inputs.map((i) => i.value.trim()).filter(Boolean).slice(0, 2));
      });
      box.querySelector('[data-skip]').addEventListener('click', () => close([]));
      inputs.forEach((i) => i.addEventListener('keydown', (e) => { if (e.key === 'Enter') box.querySelector('[data-ok]').click(); }));
      this.speak('¿Hay algo que a ti te dé desagrado? Puedes escribirlo, o saltar este paso.');
      inputs[0]?.focus({ preventScroll: true });
    });
  }

  /** Anade los textos del nino como estimulos de la Zona de rechazo. */
  applyCustomStimuli() {
    const zone = this.zones?.find((z) => z.id === 'rechazo');
    if (!zone || !this.customTexts?.length || zone.customApplied) return;
    zone.customApplied = true;
    this.customTexts.forEach((text) => {
      const label = text.length > 1 ? text[0].toUpperCase() + text.slice(1) : text;
      zone.stimuli.push(this.makeStimulus({
        label: `✍️ ${label}`,
        icon: '✍️',
        custom: true,
        yes: `Tú mismo lo escribiste: «${label}» te genera desagrado. Reconocerlo con claridad es el primer paso para decidir qué hacer.`,
        no: `Dejaste que «${label}» se acercara. Lo que nos da desagrado puede cambiar según el día, el lugar o con quién estemos.`
      }));
    });
  }

  /* ================================================== diario del Guardián */

  /**
   * Resumen personal de la partida: sirve para que el nino lo repase con un
   * adulto (psicologo, profe, familia). Se guarda en el navegador y se puede
   * copiar como texto.
   */
  buildDiary() {
    const name = this.player?.name ? `${this.player.name}` : 'Explorador/a';
    const yes = this.answers.filter((a) => a.yes).map((a) => a.label);
    const no = this.answers.filter((a) => !a.yes).map((a) => a.label);
    const lvl = (n) => (LEVELS[n]?.title.split('— ')[1] ?? '').toLowerCase();
    const ini = this.initialLevel;
    const fin = this.finalLevel;
    const trend = !ini || !fin ? '' : fin < ini ? 'disminuyó' : fin === ini ? 'se mantuvo' : 'aumentó';
    const learned = [...this.learned].map((id) => `${PATHS[id].name} (${PATHS[id].technique})`);
    const altars = [...new Set(this.diary.altars)];
    const rewards = this.rewards.map((id) => TOOLS[id]?.name ?? id);
    const entry = {
      fecha: new Date().toISOString(),
      nombre: name,
      desagrado_si: yes,
      desagrado_no: no,
      nivel_inicial: lvl(ini),
      nivel_final: lvl(fin),
      tendencia: trend,
      herramientas: learned,
      criatura_crecio: this.diary.grows,
      altares: altars,
      recompensas: rewards
    };
    const history = readStore(DIARY_KEY, []);
    history.push(entry);
    writeStore(DIARY_KEY, history.slice(-20));

    const items = [
      `<strong>Me generó desagrado:</strong> ${yes.length ? yes.map(escapeHtml).join(' · ') : 'nada de lo que apareció'} <em>(${yes.length} de ${this.answers.length})</em>`,
      no.length ? `<strong>Dejé que se acercara:</strong> ${no.map(escapeHtml).join(' · ')}` : '',
      ini ? `<strong>Termómetro:</strong> empecé en <em>${lvl(ini)}</em> y terminé en <em>${lvl(fin)}</em> (${trend})` : '',
      learned.length ? `<strong>Herramientas que practiqué:</strong> ${learned.map(escapeHtml).join(' · ')}` : '',
      `<strong>La Reacción Impulsiva</strong> creció ${this.diary.grows} ${this.diary.grows === 1 ? 'vez' : 'veces'}${altars.length ? ` y la encogí con: ${altars.map(escapeHtml).join(' · ')}` : ''}`
    ].filter(Boolean);

    const plain = [
      `DIARIO DEL GUARDIÁN · ${name} · ${new Date().toLocaleDateString('es')}`,
      `Me generó desagrado (${yes.length}/${this.answers.length}): ${yes.join(' · ') || 'nada'}`,
      no.length ? `Dejé que se acercara: ${no.join(' · ')}` : '',
      ini ? `Termómetro: ${lvl(ini)} → ${lvl(fin)} (${trend})` : '',
      learned.length ? `Herramientas: ${learned.join(' · ')}` : '',
      `La Reacción Impulsiva creció ${this.diary.grows} veces${altars.length ? `; la encogí con: ${altars.join(' · ')}` : ''}`,
      rewards.length ? `Recompensas: ${rewards.join(' · ')}` : ''
    ].filter(Boolean).join('\n');

    return { name, items, plain };
  }

  /** Tarjeta de cierre con el diario debajo (y boton para copiarlo). */
  showClosingCard({ title, lines = [], diary = null, onDone }) {
    this.controller.frozen = true;
    this.el.overlay.innerHTML = `
      <div class="i3d-panel i3d-panel--card" role="dialog" aria-modal="true" aria-label="${title}">
        <h3>${title}</h3>
        ${lines.map((l) => `<p>${l}</p>`).join('')}
        ${diary ? `
          <section class="dg-diary" aria-label="Diario del Guardián">
            <h4>📔 Diario del Guardián · ${escapeHtml(diary.name)}</h4>
            <ul>${diary.items.map((i) => `<li>${i}</li>`).join('')}</ul>
            <p class="dg-diary__hint">Guárdalo o cuéntaselo a alguien de confianza: repasar lo que sentiste también es cuidarte.</p>
            <button class="i3d-btn dg-diary__copy" type="button" data-copy>📋 Copiar diario</button>
          </section>` : ''}
        <div class="i3d-panel__actions">
          <button class="i3d-btn i3d-btn--primary" type="button" data-ok>Continuar</button>
        </div>
      </div>
    `;
    const ok = this.el.overlay.querySelector('[data-ok]');
    ok.focus({ preventScroll: true });
    ok.addEventListener('click', () => {
      this.stopSpeaking();
      this.el.overlay.innerHTML = '';
      onDone?.();
    });
    const copy = this.el.overlay.querySelector('[data-copy]');
    copy?.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(diary.plain);
        copy.textContent = '✓ Copiado';
      } catch {
        copy.textContent = 'No se pudo copiar';
      }
      this.later(() => { copy.textContent = '📋 Copiar diario'; }, 2200);
    });
    this.speak(lines.join('. '));
  }

  noteOnce(key, opts) {
    if (this.notesShown.has(key)) return;
    this.notesShown.add(key);
    this.showNote(opts);
  }

  setFocus(p) {
    const on = p > 0.02;
    this.dg.focus.hidden = !on;
    if (on) this.dg.focus.style.setProperty('--p', String(Math.min(1, p)));
  }

  /* ------------------------------------------------------------ entrada */

  hookInput() {
    if (this._hooked) return;
    this._hooked = true;
    this.controller.on('interact', () => this.onAction());
    this.onHoldStart = () => this.onAction();
    this.controller.on('jump', () => this.onJump());
  }

  onAction() {
    if (this.paused || this.finished) return;
    if (this.breath?.active && this.breath.phase === 'hold' && !this.breath.okHold) {
      this.breath.okHold = true;
      this.audio.play('tick', { volume: 0.4 });
      this.feedback.burst(this.breath.bubble.position, { count: 10, color: '#bfe8ff', speed: 1.4, life: 0.8, gravity: -0.5 });
      return;
    }
    const ap = this.paths.apoyo;
    if (ap?.open && !ap.done) {
      const p = this.controller.position;
      if (Math.hypot(p.x - ap.x, p.z - ap.z) < 13) this.callGuardian(ap);
    }
  }

  onJump() {
    if (this.carry?.active) this.dropSensation('saltar');
    if (this.boss?.active) {
      const p = this.controller.position;
      if (Math.hypot(p.x - ARENA.x, p.z - ARENA.z) < 15) this.bossImpulse('saltar');
    }
  }

  /* =============================================================== inicio */

  async onStart() {
    await this.showIntro({
      eyebrow: 'Guardianes del Desagrado · Territorio de las sensaciones incómodas',
      goal: 'Bienvenido a Guardianes del Desagrado.',
      hint: 'En esta isla encontrarás situaciones que pueden producir rechazo, incomodidad o ganas de alejarte. El desagrado no significa que estés haciendo algo mal: es una emoción que puede avisarte que algo no te resulta agradable o que quieres mantener cierta distancia. Tu misión no es eliminar el desagrado, sino aprender a reconocerlo y a vivir con él.',
      keys: [['W A S D', 'moverte'], ['Ratón', 'mirar'], ['SHIFT', 'correr'], ['E', 'interactuar']],
      touch: [['Joystick', 'moverte'], ['Arrastra', 'mirar'], ['E', 'interactuar']]
    });
    this.ambient = this.audio.ambient('swamp', { volume: 0.35, rate: 0.9 });
    if (!this.customTexts) await this.askCustomStimuli();
    this.startThermoStage();
  }

  /* ============================================================ (1) zonas */

  updateExplore(dt) {
    const zone = this.zones[this.zoneIndex];
    if (!zone || !zone.unlocked || zone.done) return;
    const p = this.controller.position;
    const dz = Math.hypot(p.x - zone.x, p.z - zone.z);
    if (!zone.current) {
      zone.cooldown = Math.max(0, zone.cooldown - dt);
      if (dz < 8.5 && zone.cooldown <= 0) this.activateStimulus(zone);
      return;
    }
    const st = zone.current;
    const m = st.group;
    st.t += dt;
    st.orb.rotation.y += dt;
    st.ring.rotation.z += dt * 1.5;
    const dx = p.x - m.position.x;
    const dzz = p.z - m.position.z;
    const d = Math.hypot(dx, dzz);

    if (st.state === 'intro') {
      // quieto en el centro, presentandose: hay tiempo para leer la pregunta
      m.position.y = zone.y + 1.25 + Math.sin(this.time * 2.2 + st.phase) * 0.15;
      st.ring.scale.setScalar(1 + Math.sin(this.time * 6) * 0.2);
      const left = Math.max(1, Math.ceil(STIM_INTRO - st.t));
      this.dg.askHint.innerHTML = `Se acerca en <b>${left}</b>… Si te genera desagrado, <b>aléjate</b>. Si no, quédate y deja que llegue hasta ti.`;
      this.dg.askMeter.style.width = `${(st.t / STIM_INTRO) * 100}%`;
      if (st.t >= STIM_INTRO) {
        st.state = 'approach';
        st.t = 0;
        st.startDist = d;
        this.audio.play('buzz', { volume: 0.22, rate: 1.1 });
        this.dg.askHint.innerHTML = 'Viene hacia ti. <b>Aléjate</b> si te genera desagrado, o <b>quédate</b> si no.';
      }
      return;
    }

    // se acerca despacio al jugador
    if (d > 0.01) {
      m.position.x += (dx / d) * STIM_SPEED * dt;
      m.position.z += (dzz / d) * STIM_SPEED * dt;
    }
    m.position.y = this.heightAt(m.position.x, m.position.z) + 1.25 + Math.sin(this.time * 2.2 + st.phase) * 0.15;
    st.ring.scale.setScalar(1 + Math.sin(this.time * 4) * 0.12);
    this.feedback.drizzle(m.position, 0.5, { color: '#cfffa0', life: 1.2, speed: 0.3, gravity: -0.4 });

    // la decision se mide desde donde estabas: alejarse de verdad, no un paso
    const away = d - st.startDist;
    this.dg.askMeter.style.width = `${Math.max(0, Math.min(1, away / STIM_ESCAPE)) * 100}%`;
    if (st.t < 1.2) return;                       // nada se decide en el primer segundo
    if (d < 1.9) this.resolveStimulus(zone, st, false);
    else if (away >= STIM_ESCAPE && d > 5) this.resolveStimulus(zone, st, true);
  }

  activateStimulus(zone) {
    const st = zone.stimuli[zone.answered];
    if (!st) return;
    if (!zone.entered) {
      zone.entered = true;
      this.say(zone.name.toUpperCase(), 2600, { speak: false });
    }
    st.group.visible = true;
    st.group.position.set(zone.x, zone.y + 1.25, zone.z);
    st.state = 'intro';
    st.t = 0;
    st.startDist = 0;
    zone.current = st;
    this.dg.askIcon.textContent = st.icon;
    this.dg.askQ.textContent = '¿Esto me genera desagrado?';
    this.dg.askLabel.textContent = st.label;
    this.dg.askHint.innerHTML = `Se acerca en <b>${STIM_INTRO}</b>… Si te genera desagrado, <b>aléjate</b>. Si no, quédate y deja que llegue hasta ti.`;
    this.dg.askMeter.style.width = '0%';
    this.dg.ask.hidden = false;
    this.dg.ask.dataset.result = '';
    this.feedback.burst(st.group.position, { count: 16, color: '#cfffa0', speed: 2, life: 1, gravity: -0.4 });
    this.audio.play('interact', { volume: 0.3 });
    this.speak(`¿Esto me genera desagrado? ${st.label}. Si te genera desagrado, aléjate. Si no, quédate y deja que llegue hasta ti.`, { priority: true });
  }

  resolveStimulus(zone, st, yes) {
    zone.current = null;
    zone.cooldown = 7;                            // pausa para leer el resultado antes del siguiente
    zone.answered += 1;
    st.group.visible = false;
    this.answers.push({ label: st.label, yes, custom: !!st.custom });
    this.feedback.burst(st.group.position, { count: 22, color: yes ? '#ff9d8a' : '#a8e06a', speed: 2.6, life: 1, gravity: -0.3 });
    this.audio.play(yes ? 'soften' : 'collect', { volume: 0.5 });

    // resultado grande y claro: que hiciste y que significa
    const did = yes ? 'TE ALEJASTE' : 'DEJASTE QUE LLEGARA';
    const meaning = yes ? 'Respuesta: sí me genera desagrado.' : 'Respuesta: no me genera desagrado.';
    this.dg.askQ.textContent = did;
    this.dg.askHint.innerHTML = `<b>${meaning}</b> ${yes ? 'Poner distancia fue tu forma de responder.' : 'Quedarte fue tu forma de responder.'}`;
    this.dg.ask.dataset.result = yes ? 'yes' : 'no';
    this.dg.askMeter.style.width = yes ? '100%' : '0%';
    this.later(() => { if (!zone.current) this.dg.ask.hidden = true; }, 6000);
    this.say(`${did} · ${yes ? 'SÍ ME GENERA DESAGRADO' : 'NO ME GENERA DESAGRADO'}`, 4200, { speak: false });
    this.showNote({ icon: st.icon, title: `${did}: ${st.label}`, text: `${meaning} ${yes ? st.yes : st.no}` });

    if (zone.answered >= zone.stimuli.length) {
      zone.done = true;
      zone.beacon.visible = false;
      zone.label.userData.setText(`✓ ${zone.icon} ${zone.name}`, { color: '#a8e06a' });
      this.explored += 1;
      this.audio.play('light', { volume: 0.4 });
      this.feedback.burst(_v.set(zone.x, zone.y + 2.5, zone.z), { count: 24, color: '#a8e06a', speed: 3, life: 1.3, gravity: -0.5 });
      if (this.explored >= this.zones.length) this.later(() => this.finishExplore(), 7000);
      else this.later(() => { this.say(`ZONA LISTA · ${this.explored}/4`, 3000, { speak: false }); this.unlockZone(this.zoneIndex + 1); }, 7000);
    }
  }

  finishExplore() {
    if (this.stage !== 'explore') return;
    this.stageDone.add('explore');
    this.renderStages();
    completeActivity('disgust-explorador', 10);
    const yes = this.answers.filter((a) => a.yes).length;
    this.showNote({
      icon: '🧭',
      title: '¿Esto me genera desagrado?',
      text: `Marcaste ${yes} de ${this.answers.length} situaciones como desagradables. El desagrado puede aparecer frente a diferentes estímulos y no todas las personas reaccionan de la misma manera.`
    });
    this.later(() => {
      this.toast('🏆 Insignia de Explorador del Desagrado');
      this.audio.play('success', { volume: 0.5 });
    }, 1200);
    this.later(() => this.startMirrorStage(), 9000);
  }

  /* =========================================================== (2) espejo */

  activateMirror() {
    const mr = this.mirror;
    mr.active = true;
    mr.order = shuffle(SIGNALS.filter((s) => s.disgust));
    this.reveal(this.mirrorRoot, { x: MIRROR.x, z: MIRROR.z + 2, y: this.heightAt(MIRROR.x, MIRROR.z), colliders: [this.mirrorCollider], color: '#7fd1ff' });
    this.later(() => this.enterEnvironment('mirror', { x: MIRROR.x, z: MIRROR.z + 15 }, MIRROR, 'LLEGAS AL ESPEJO DE LAS REACCIONES'), 1900);
    this.mirrorAvatar.visible = true;
    this.mirrorGlass.material.emissive.set('#3b6b7a');
    this.mirrorGlass.material.emissiveIntensity = 0.5;
    this.setBeacons([this.mirrorBeacon]);
    this.nextReaction();
  }

  nextReaction() {
    const mr = this.mirror;
    mr.current = mr.order.shift() ?? null;
    mr.dwell = 0;
    mr.judged = false;
    if (!mr.current) return;
    this.mirrorGesture.userData.setText(mr.current.icon);
    this.mirrorGesture.visible = true;
    this.audio.play('interact', { volume: 0.3 });
    this.setTask(`🪞 Espejo: ${mr.solved}/7 señales · pisa la baldosa correcta`);
  }

  updateMirror(dt) {
    const mr = this.mirror;
    if (!mr.active) return;
    this.animateReflection();
    if (!mr.current) return;
    const p = this.controller.position;
    let on = null;
    for (const pl of this.plates) {
      if (Math.hypot(p.x - pl.x, p.z - pl.z) < 1.05) { on = pl; break; }
    }
    if (on !== mr.onPlate) {
      if (mr.onPlate && !mr.onPlate.solved) mr.onPlate.mesh.material.emissiveIntensity = 0.15;
      mr.onPlate = on;
      mr.dwell = 0;
      mr.judged = false;
    }
    if (!on || mr.judged || on.solved) return;
    mr.dwell += dt;
    on.mesh.material.emissiveIntensity = 0.15 + mr.dwell * 1.2;
    if (mr.dwell < 0.7) return;
    mr.judged = true;
    if (on.item.id === mr.current.id) this.mirrorCorrect(on);
    else this.mirrorWrong(on);
  }

  mirrorCorrect(plate) {
    const mr = this.mirror;
    plate.solved = true;
    plate.mesh.material.emissive.set('#6fe07a');
    plate.mesh.material.emissiveIntensity = 0.9;
    plate.label.userData.setText(`✓ ${plate.item.icon} ${plate.item.label}`, { color: '#a8e06a' });
    this.audio.play('collect', { volume: 0.5 });
    this.feedback.burst(_v.set(plate.x, this.heightAt(plate.x, plate.z) + 0.6, plate.z), { count: 16, color: '#a8e06a', speed: 2.4, life: 0.9 });
    mr.solved += 1;
    this.say(`✓ ${plate.item.label.toUpperCase()}`, 1600);
    mr.current = null;
    this.mirrorGesture.visible = false;
    if (mr.solved >= 7) this.later(() => this.finishMirror(), 900);
    else this.later(() => this.nextReaction(), 900);
  }

  mirrorWrong(plate) {
    this.audio.play('soften', { volume: 0.35 });
    plate.mesh.material.emissive.set('#e0a43a');
    plate.mesh.material.emissiveIntensity = 0.8;
    this.later(() => { if (!plate.solved) { plate.mesh.material.emissive.set('#88aa66'); plate.mesh.material.emissiveIntensity = 0.15; } }, 700);
    const text = plate.item.disgust
      ? 'El espejo muestra otra cosa. Fíjate bien en el gesto del reflejo y busca su baldosa.'
      : `«${plate.item.label}» no es una señal del desagrado. Mira otra vez el espejo.`;
    this.showNote({ title: 'Casi', text, seconds: 5 });
  }

  animateReflection() {
    const av = this.mirrorAvatar;
    const t = this.time;
    const id = this.mirror.current?.id;
    const [armL, armR] = av.userData.arms;
    const head = av.userData.head;
    const body = av.userData.body;
    av.position.set(0, 0.05, 1.1);
    av.rotation.set(0, 0, 0);
    body.rotation.set(0, 0, 0);
    head.rotation.set(0, 0, 0);
    head.position.set(0, 1.45, 0);
    armL.rotation.set(0, 0, 0);
    armR.rotation.set(0, 0, 0);
    armL.position.set(-0.4, 0.9, 0);
    armR.position.set(0.4, 0.9, 0);
    this.mirrorSpeech.visible = false;
    switch (id) {
      case 'nariz': head.rotation.x = -0.32 + Math.sin(t * 6) * 0.05; head.position.y = 1.4; break;
      case 'rechazo': av.rotation.y = 0.9; armL.rotation.z = 1.2; armR.rotation.z = -1.2; armL.position.set(-0.15, 1.0, 0.25); armR.position.set(0.15, 1.0, 0.25); break;
      case 'nauseas': body.rotation.z = Math.sin(t * 3) * 0.14; head.rotation.x = 0.5; head.position.y = 1.32; break;
      case 'tension': av.position.x = Math.sin(t * 38) * 0.035; armL.rotation.x = 0.4; armR.rotation.x = 0.4; head.position.y = 1.4; break;
      case 'alejarse': av.position.z = 1.1 - (Math.sin(t * 1.2) * 0.5 + 0.5) * 1.4; armL.rotation.x = Math.sin(t * 7) * 0.5; armR.rotation.x = -Math.sin(t * 7) * 0.5; break;
      case 'evitar': av.rotation.y = Math.PI; armL.rotation.x = -2.4; armR.rotation.x = -2.4; armL.position.set(-0.2, 1.2, -0.2); armR.position.set(0.2, 1.2, -0.2); break;
      case 'decir': this.mirrorSpeech.visible = true; this.mirrorSpeech.position.y = 2.35 + Math.sin(t * 4) * 0.08; armR.rotation.x = -1.3 + Math.sin(t * 5) * 0.2; head.rotation.y = Math.sin(t * 3) * 0.35; break;
      default: armL.rotation.x = Math.sin(t * 2) * 0.1; armR.rotation.x = -Math.sin(t * 2) * 0.1;
    }
    if (this.mirror.solved >= 7) { armL.rotation.x = -2.6; armR.rotation.x = -2.6; }
    this.mirrorGesture.position.y = 2.55 + Math.sin(t * 2) * 0.06;
  }

  finishMirror() {
    const mr = this.mirror;
    mr.current = null;
    this.mirrorGesture.visible = false;
    this.setTask('');
    this.stageDone.add('mirror');
    this.renderStages();
    completeActivity('disgust-espejo', 10);
    this.audio.play('success', { volume: 0.5 });
    this.showNote({
      icon: '🪞',
      title: '¡Bien hecho!',
      text: 'Ahora sabes que las emociones también pueden aparecer en nuestro cuerpo, pensamientos y comportamientos.'
    });
    this.later(() => this.startPathsStage(), 7000);
  }

  /* ====================================================== (3) termómetro */

  updateThermo(dt) {
    const p = this.controller.position;
    const d = Math.hypot(p.x - CENTER.x, p.z - CENTER.z);
    const lvl = d < 2.3 ? 3 : d < 4.5 ? 2 : d < 6.9 ? 1 : 0;
    if (lvl !== this.standLevel) {
      this.standLevel = lvl;
      this.onStandLevel(lvl);
    }
    const target = lvl ? 0.6 + lvl * 2 : 0.6;
    this.mercury.scale.y += (target - this.mercury.scale.y) * Math.min(1, dt * 3);
    _c.set(LEVEL_COLORS[lvl]);
    this.mercury.material.color.lerp(_c, Math.min(1, dt * 3));
    this.mercury.material.emissive.copy(this.mercury.material.color).multiplyScalar(0.5);
    // el mundo responde en vivo: mas nivel, mas niebla verde
    const fogT = lvl / 3;
    this.scene.fog.density += (lerp(0.016, 0.04, fogT) - this.scene.fog.density) * Math.min(1, dt * 1.5);
    _c.set(lvl === 3 ? FOG.high : lvl === 2 ? FOG.mid : FOG.base);
    this.scene.fog.color.lerp(_c, Math.min(1, dt * 1.5));
  }

  onStandLevel(lvl) {
    if (!lvl) return;
    const L = LEVELS[lvl];
    this.audio.play('tick', { volume: 0.35, rate: 0.8 + lvl * 0.15 });
    this.showNote({
      icon: ['', '🙂', '😐', '😖'][lvl],
      title: L.title,
      text: `«${L.quote}» Puede aparecer: ${L.signs}. Pulsa E para confirmar este nivel.`,
      replace: true
    });
  }

  confirmLevel() {
    if (!this.thermo.enabled) return;
    if (!this.standLevel) { this.say('SUBE HASTA TU NIVEL', 1800); return; }
    const lvl = this.standLevel;
    this.thermo.enabled = false;
    this.thermoInteract.enabled = false;
    this.audio.play('chime', { volume: 0.45 });
    this.feedback.burst(_v.set(CENTER.x, this.heightAt(CENTER.x, CENTER.z) + 1.4 + lvl * 2, CENTER.z), { count: 24, color: LEVEL_COLORS[lvl], speed: 2.6, life: 1.1 });

    if (this.stage === 'thermo') {
      this.initialLevel = lvl;
      this.level = lvl;
      setInitialIntensity(INTENSITY[lvl]);
      this.applyLevelWorld(lvl);
      this.stageDone.add('thermo');
      this.renderStages();
      this.setBeacons([]);
      this.say(`NIVEL ${lvl} CONFIRMADO`, 2200);
      this.later(() => this.startExploreStage(), lvl === 3 ? 7000 : 2800);
      return;
    }
    if (this.stage === 'reeval') this.finishReevaluation(lvl);
  }

  applyLevelWorld(lvl) {
    const fog = this.scene.fog;
    const target = lvl === 3 ? { c: FOG.high, d: 0.04, sky: ['#2f4a2a', '#6f9a5a'], sun: 1.05, speed: 0.75 }
      : lvl === 2 ? { c: FOG.mid, d: 0.026, sky: ['#3a5f48', '#95bd74'], sun: 1.3, speed: 1 }
        : { c: FOG.base, d: 0.016, sky: ['#3f6b58', '#b6d88c'], sun: 1.5, speed: 1 };
    this.feedback.tweenColor(fog.color, target.c, 2.5);
    this.feedback.tweenValue(fog, 'density', target.d, 2.5);
    this.sky.userData.setColors(target.sky[0], target.sky[1]);
    this.feedback.tweenValue(this.sun, 'intensity', target.sun, 2.5);
    this.controller.speedScale = target.speed;
    if (lvl === 3) {
      this.showNote({
        icon: '🌫️',
        title: 'Tu desagrado está muy intenso. Haz una pausa antes de actuar.',
        text: 'La isla se cubre de niebla verde y tu personaje se mueve más lento. Cuando practiques tu primera herramienta, recuperarás el ritmo.'
      });
    }
  }

  /* ========================================================= (4) caminos */

  openPaths() {
    // Sustituido por el recorrido lineal: ver startPathsStage / unlockNextPath.
  }

  openPath(id) {
    const path = this.paths[id];
    if (path.open) return;
    path.open = true;
    this.reveal(path.group, { x: path.x, z: path.z, y: path.y, color: '#ffd166' });
  }

  completePath(id) {
    const path = this.paths[id];
    if (path.done) return;
    path.done = true;
    path.beacon.visible = false;
    this.learned.add(id);
    this.setTask('');
    setStrategy(path.name);
    completeActivity(`disgust-${id}`, 10);
    const tool = addReward(path.tool);
    if (tool && !this.rewards.includes(path.tool)) this.rewards.push(path.tool);
    this.audio.play('success', { volume: 0.5 });
    this.feedback.burst(_v.set(path.x, path.y + 3, path.z), { count: 34, color: '#ffd166', speed: 3.4, life: 1.5, gravity: -0.6 });
    this.later(() => this.toast(`${path.icon} ¡Genial! Recompensa: ${tool?.name ?? path.tool}`), 700);
    path.sign.userData.setText(`✓ ${path.icon} ${path.name}\n${path.technique}`, { color: '#a8e06a' });
    this.renderStages();

    // los altares del desafio final se encienden con lo aprendido
    this.altars.forEach((al) => { if (al.id === id) this.lightAltar(al); });

    // la primera herramienta devuelve el ritmo si el nivel era intenso
    if (this.learned.size === 1 && this.controller.speedScale < 1) {
      this.controller.speedScale = 1;
      this.feedback.tweenValue(this.scene.fog, 'density', 0.03, 3);
      this.showNote({ queue: true, icon: '🌬️', title: 'Recuperas el ritmo', text: 'Practicar una herramienta no borra el desagrado, pero te devuelve el control: ya te mueves con normalidad.' });
    }

    if (this.stage === 'paths') this.later(() => this.unlockNextPath(), 4200);
  }

  /** Un camino abierto se pone en marcha cuando el jugador llega a su area. */
  updatePaths(dt) {
    const p = this.controller.position;
    for (const id of PATH_ORDER) {
      const path = this.paths[id];
      if (!path.open || path.done) continue;
      const d = Math.hypot(p.x - path.x, p.z - path.z);
      if (!path.engaged) {
        if (d > 10.5) continue;
        path.engaged = true;
        path.inside = true;
        this[`activate_${id}`]?.(path);
      } else if (path.inside && d > 13.5) {
        path.inside = false;
        this.setTask('');
      } else if (!path.inside && d < 10.5) {
        path.inside = true;
        const t = this.pathTask(path);
        if (t) this.setTask(t);
      }
      this[`update_${id}`]?.(dt, path);
    }
  }

  /** Texto de tarea de cada camino, para restaurarlo al volver a su area. */
  pathTask(path) {
    switch (path.id) {
      case 'atencion': return `🦋 Encuentra 5 objetos de color diferente · ${path.count}/5`;
      case 'acepta': return path.carrying
        ? `🫳 Camina con calma hasta el arco: ${ACCEPT_STEPS[path.step].key}`
        : '🫳 Sostén la sensación (E) y llévala con calma por los tres arcos';
      case 'presente': {
        const sense = path.senses[path.senseIndex];
        return sense ? `${sense.icon} ${sense.count} ${sense.prompt} · ${sense.found}/${sense.count}` : '';
      }
      case 'reevalua': return `💭 Pensamiento ${path.stationIndex + 1}/2: atraviesa la puerta equilibrada`;
      case 'apoyo': return '📣 Pulsa E para llamar al Guardián de Confianza · sigue su luz';
      default: return '';
    }
  }

  /* ······ (a) respira */

  activate_respira(path) {
    this.startBreath({ center: path, radius: 2.0, target: 4, bubble: path.bubble, onDone: () => this.finishRespira(path) });
  }

  update_respira(dt, path) {
    path.ring.rotation.z += dt * 0.3;
  }

  finishRespira(path) {
    this.feedback.burst(path.bubble.position, { count: 30, color: '#bfe8ff', speed: 2.6, life: 1.2, gravity: -1 });
    this.showNote({ title: 'Toma el control', text: 'Puedo sentir desagrado y mantener la calma.', seconds: 8 });
    this.completePath('respira');
  }

  /** Respiracion generica: usada en el camino y en el altar del desafio. */
  startBreath({ center, radius, target, bubble, onDone }) {
    this.breath = { active: true, center, radius, target, bubble, onDone, phase: 'idle', t: 0, cycles: 0, okHold: false, wasMoving: false };
  }

  updateBreath(dt) {
    const br = this.breath;
    if (!br?.active) return;
    const p = this.controller.position;
    const d = Math.hypot(p.x - br.center.x, p.z - br.center.z);
    const speed = Math.hypot(this.controller.velocity.x, this.controller.velocity.z);
    const inside = d < br.radius;
    const bubble = br.bubble;

    if (!inside) {
      if (br.phase !== 'idle') {
        br.phase = 'idle';
        br.t = 0;
        this.breathBar.show(false);
        this.setTask('');
        this.audio.unduck();
      }
      bubble.scale.setScalar(1 + Math.sin(this.time * 1.5) * 0.06);
      return;
    }
    if (br.phase === 'idle') {
      br.phase = 'in';
      br.t = 0;
      this.audio.duck(0.3);
      this.audio.play('breathIn', { volume: 0.35 });
      this.breathBar.show(true);
      this.noteOnce('breath-how', {
        title: 'Respiración consciente',
        text: 'Quédate quieto dentro de la burbuja: se hincha cuando tomas aire por la nariz, se sostiene y se vacía cuando sueltas por la boca. Pulsa E mientras mantienes el aire. Repite de 3 a 5 veces.',
        seconds: 9
      });
    }
    if (speed > 0.7) {
      this.setTask('🛑 DETENTE · quédate quieto dentro de la burbuja');
      br.wasMoving = true;
      return;
    }
    if (br.wasMoving) { br.wasMoving = false; }
    br.t += dt;
    const IN = 4, HOLD = 2.4, OUT = 5;
    if (br.phase === 'in') {
      bubble.scale.setScalar(1 + 0.6 * (br.t / IN));
      this.setTask(`🌬️ TOMA AIRE LENTAMENTE POR LA NARIZ · ciclo ${br.cycles + 1}/${br.target}`);
      this.breathBar.set(br.t / IN);
      if (br.t >= IN) { br.phase = 'hold'; br.t = 0; br.okHold = false; this.audio.play('tick', { volume: 0.25 }); }
    } else if (br.phase === 'hold') {
      bubble.scale.setScalar(1.6 + Math.sin(this.time * 8) * 0.02);
      this.setTask(br.okHold ? '✓ MANTÉN EL AIRE UNOS SEGUNDOS' : '⏸️ MANTÉN EL AIRE · pulsa E');
      this.breathBar.set(1);
      if (br.t >= HOLD) { br.phase = 'out'; br.t = 0; this.audio.play('breathOut', { volume: 0.35 }); }
    } else if (br.phase === 'out') {
      bubble.scale.setScalar(1.6 - 0.6 * (br.t / OUT));
      this.setTask('💨 SUÉLTALO LENTAMENTE POR LA BOCA');
      this.breathBar.set(1 - br.t / OUT);
      if (br.t >= OUT) {
        br.t = 0;
        if (br.okHold) {
          br.cycles += 1;
          this.feedback.burst(bubble.position, { count: 12, color: '#bfe8ff', speed: 1.6, life: 0.9, gravity: -0.6 });
          this.audio.play('collect', { volume: 0.35 });
          this.say(`RESPIRACIÓN ${br.cycles}/${br.target}`, 1400);
        } else {
          this.say('PULSA E AL MANTENER EL AIRE', 2000);
        }
        if (br.cycles >= br.target) {
          br.active = false;
          this.breathBar.show(false);
          this.setTask('');
          this.audio.unduck();
          bubble.scale.setScalar(1);
          br.onDone?.();
        } else {
          br.phase = 'in';
          this.audio.play('breathIn', { volume: 0.35 });
        }
      }
    }
  }

  /* ······ (b) atencion */

  activate_atencion() {
    this.setTask('🦋 Encuentra 5 objetos de color diferente · 0/5');
    this.noteOnce('att-how', {
      title: 'Cambio mi atención',
      text: 'Encuentra 5 objetos de color diferente. Entre las polillas verdes vuelan cinco mariposas de color: sigue una con la mirada hasta que se pose.',
      seconds: 9
    });
  }

  update_atencion(dt, path) {
    this.camera.getWorldDirection(_dir);
    let best = 0;
    for (const bf of path.butterflies) {
      const g = bf.group;
      if (!bf.found) {
        const t = this.time * bf.w + bf.phase;
        g.position.set(bf.cx + Math.cos(t) * bf.r, this.heightAt(bf.cx, bf.cz) + bf.h + Math.sin(t * 2.3) * 0.5, bf.cz + Math.sin(t * 1.3) * bf.r);
        g.rotation.y = -t + Math.PI / 2;
      }
      const flap = Math.sin(this.time * 16 + bf.phase) * 0.85;
      g.userData.wl.rotation.z = flap;
      g.userData.wr.rotation.z = -flap;
      if (!bf.colored || bf.found) continue;
      _v.copy(g.position).sub(this.camera.position);
      const dist = _v.length();
      _v.normalize();
      const angle = Math.acos(Math.max(-1, Math.min(1, _v.dot(_dir))));
      if (dist < 14 && angle < 0.09) bf.focus = Math.min(1, bf.focus + dt);
      else bf.focus = Math.max(0, bf.focus - dt * 1.6);
      best = Math.max(best, bf.focus);
      if (bf.focus >= 1) this.butterflyFound(path, bf);
    }
    this.setFocus(best);
  }

  butterflyFound(path, bf) {
    bf.found = true;
    bf.focus = 0;
    path.count += 1;
    const g = bf.group;
    const from = g.position.clone();
    const to = new THREE.Vector3(from.x, this.heightAt(from.x, from.z) + 0.6, from.z);
    this.feedback.tween({ from: 0, to: 1, duration: 0.9, onUpdate: (t) => g.position.lerpVectors(from, to, t) });
    const glow = makeEmoji('✨', 0.6);
    glow.position.y = 0.5;
    g.add(glow);
    this.audio.play('collect', { volume: 0.45 });
    this.feedback.burst(from, { count: 14, color: bf.color, speed: 2, life: 0.9 });
    this.setTask(`🦋 Encuentra 5 objetos de color diferente · ${path.count}/5`);
    if (path.count >= 5) {
      this.setFocus(0);
      this.showNote({
        title: 'Despliegue atencional',
        text: 'Cuando una emoción ocupa demasiado espacio, dirigir temporalmente nuestra atención hacia otra actividad puede ayudarnos a recuperar el control.',
        seconds: 9
      });
      this.completePath('atencion');
    }
  }

  /* ······ (c) acepta */

  activate_acepta(path) {
    path.orbInteract.enabled = true;
    this.setTask(this.pathTask(path));
    this.noteOnce('acc-how', {
      title: 'Jardín de las Sensaciones',
      text: 'Sostén la sensación incómoda y llévala caminando con calma a través de los tres arcos: RECONOCER, COMPRENDER y ACEPTAR. Si corres o saltas, se te escapa (y la puedes volver a recoger).',
      seconds: 10
    });
  }

  pickSensation(path) {
    if (path.carrying) return;
    path.carrying = true;
    path.orbInteract.enabled = false;
    this.carry = { active: true, orb: path.orb, mode: 'path', path, still: 0 };
    this.audio.play('interact', { volume: 0.35 });
    this.setTask(`🫳 Camina con calma hasta el arco: ${ACCEPT_STEPS[path.step].key}`);
  }

  dropSensation(reason) {
    const c = this.carry;
    if (!c?.active) return;
    c.active = false;
    const p = this.controller.position;
    this.camera.getWorldDirection(_dir);
    const x = p.x + _dir.x * 1.4;
    const z = p.z + _dir.z * 1.4;
    c.orb.position.set(x, this.heightAt(x, z) + 0.5, z);
    this.audio.play('thud', { volume: 0.4 });
    this.feedback.burst(c.orb.position, { count: 8, color: '#8a9a6a', speed: 1.5, life: 0.7 });
    this.say(reason === 'saltar' ? 'SE TE ESCAPÓ AL SALTAR' : 'SE TE ESCAPÓ AL CORRER', 2000);
    this.noteOnce('acc-drop', {
      title: 'Con calma',
      text: 'Si corres o saltas, la sensación se te escapa. Sostenerla sin reaccionar de golpe es parte de aceptarla. Recógela otra vez.',
      seconds: 7
    });
    if (c.mode === 'path') {
      c.path.carrying = false;
      c.path.orbInteract.enabled = true;
    } else if (c.mode === 'altar') {
      c.altar.orbInteract.enabled = true;
    }
  }

  updateCarry(dt) {
    const c = this.carry;
    if (!c?.active) return;
    this.camera.getWorldDirection(_dir);
    c.orb.position.copy(this.camera.position).addScaledVector(_dir, 1.4);
    c.orb.position.y -= 0.35;
    c.orb.rotation.y += dt * 0.8;
    const speed = Math.hypot(this.controller.velocity.x, this.controller.velocity.z);
    if (this.controller.isRunning && speed > 5) { this.dropSensation('correr'); return; }

    if (c.mode === 'path') {
      const path = c.path;
      const arch = path.arches[path.step];
      if (!arch) return;
      const p = this.controller.position;
      if (Math.hypot(p.x - arch.x, p.z - arch.z) < 1.5) this.passArch(path, arch);
    } else if (c.mode === 'altar') {
      if (speed < 0.5) c.still += dt; else c.still = Math.max(0, c.still - dt);
      this.setTask(`🫳 Sostenla quieto y reconoce lo que sientes · ${Math.min(3, c.still).toFixed(1)}/3 s`);
      if (c.still >= 3) {
        c.active = false;
        this.say('«ESTOY SINTIENDO DESAGRADO.»', 2600);
        this.feedback.burst(c.orb.position, { count: 18, color: '#a8e06a', speed: 2, life: 1 });
        c.orb.visible = false;
        this.altarDone(c.altar);
      }
    }
  }

  passArch(path, arch) {
    arch.done = true;
    path.step += 1;
    arch.mat.emissive.set('#a8e06a');
    arch.mat.emissiveIntensity = 0.9;
    arch.label.userData.setText(`${arch.step.key}\n«${arch.step.phrase}»`, { color: '#ffffff', size: 1.4, maxChars: 26 });
    this.audio.play('light', { volume: 0.45 });
    this.feedback.burst(_v.set(arch.x, this.heightAt(arch.x, arch.z) + 2.5, arch.z), { count: 18, color: '#a8e06a', speed: 2.4, life: 1 });
    this.say(arch.step.key, 1800);
    this.showNote({ title: arch.step.key, text: `«${arch.step.phrase}»`, seconds: 6 });
    if (path.step >= path.arches.length) this.plantSeed(path);
    else this.setTask(`🫳 Camina con calma hasta el arco: ${ACCEPT_STEPS[path.step].key}`);
  }

  plantSeed(path) {
    this.carry.active = false;
    path.carrying = false;
    const orb = path.orb;
    const from = orb.position.clone();
    const to = new THREE.Vector3(path.plot.x, path.plot.y + 0.5, path.plot.z);
    this.setTask('🌱 La sensación se vuelve semilla…');
    this.feedback.tween({
      from: 0, to: 1, duration: 1.4,
      onUpdate: (t) => {
        orb.position.lerpVectors(from, to, t);
        orb.position.y += Math.sin(t * Math.PI) * 1.5;
        orb.scale.setScalar(1 - t * 0.75);
      },
      onDone: () => {
        orb.visible = false;
        this.audio.play('success', { volume: 0.5 });
        this.feedback.tween({
          from: 0, to: 1, duration: 2.2,
          onUpdate: (t) => path.plant.scale.setScalar(0.001 + t),
          onDone: () => {
            this.feedback.burst(_v.set(path.plot.x, path.plot.y + 2.4, path.plot.z), { count: 26, color: '#ff8fb8', speed: 2.6, life: 1.3, gravity: -1 });
            this.showNote({
              title: 'Aceptación emocional',
              text: 'Aceptar una emoción no significa que te guste lo que está ocurriendo. Significa reconocer lo que sientes antes de decidir cómo actuar.',
              seconds: 10
            });
            this.completePath('acepta');
          }
        });
      }
    });
  }

  /* ······ (d) presente */

  activate_presente(path) {
    path.fogDome = this.makeDome(path.x, path.z, 11, 0.42);
    this.startSense(path);
    this.noteOnce('pre-how', {
      title: 'Regreso al presente · 5-4-3-2-1',
      text: 'La niebla verde espesa el aire. Anclate en lo que hay aquí y ahora: mira 5 cosas, toca 4, acércate a 3 sonidos, sigue 2 olores y prueba 1 sabor. Cada sentido se encuentra de una forma distinta.',
      seconds: 10
    });
  }

  startSense(path) {
    const sense = path.senses[path.senseIndex];
    if (!sense) return;
    this.setTask(`${sense.icon} ${sense.count} ${sense.prompt} · 0/${sense.count}`);
    this.say(`${sense.count} ${sense.prompt}`.toUpperCase(), 2400);
    sense.items.forEach((item) => {
      if (sense.kind === 'gaze' || sense.kind === 'sound') item.mesh.visible = true;
      if (sense.kind === 'sound') {
        item.loop = this.audio.playAt(item.sound, item.holder, { volume: 0.9, refDistance: 3, loop: true });
        if (item.loop) { item.loop.setPlaybackRate?.(item.rate); this.soundLoops.push(item.loop); }
      }
      if (sense.kind === 'touch' || sense.kind === 'scent') { item.mesh.material.emissiveIntensity = 0.6; }
      if (sense.kind === 'taste') item.interact.enabled = true;
    });
  }

  update_presente(dt, path) {
    const sense = path.senses[path.senseIndex];
    if (!sense) return;
    const p = this.controller.position;
    let best = 0;
    if (sense.kind === 'gaze') this.camera.getWorldDirection(_dir);
    for (const item of sense.items) {
      if (item.found) continue;
      if (sense.kind === 'gaze') {
        item.mesh.getWorldPosition(_v);
        _v.sub(this.camera.position);
        const dist = _v.length();
        _v.normalize();
        const angle = Math.acos(Math.max(-1, Math.min(1, _v.dot(_dir))));
        if (dist < 16 && angle < 0.1) item.dwell = Math.min(1, item.dwell + dt * 2.8);
        else item.dwell = Math.max(0, item.dwell - dt * 2);
        best = Math.max(best, item.dwell);
        item.mesh.material.emissiveIntensity = 1.2 + Math.sin(this.time * 6) * 0.5;
        if (item.dwell >= 1) this.presenteFound(path, item);
      } else if (sense.kind === 'touch') {
        if (Math.hypot(p.x - item.x, p.z - item.z) < 1.35) this.presenteFound(path, item);
      } else if (sense.kind === 'sound') {
        item.mesh.scale.setScalar(1 + ((this.time * 1.4 + item.x) % 1) * 2.5);
        item.mesh.material.opacity = 0.6 * (1 - ((this.time * 1.4 + item.x) % 1));
        if (Math.hypot(p.x - item.x, p.z - item.z) < 2.4) this.presenteFound(path, item);
      } else if (sense.kind === 'scent') {
        this.feedback.drizzle(_v.set(item.x, item.y + 0.6, item.z), 1.2, { color: item.icon === '🌸' ? '#ff9ac9' : '#b9a06a', life: 2.6, speed: 0.5, gravity: -0.9 });
        if (Math.hypot(p.x - item.x, p.z - item.z) < 1.6) this.presenteFound(path, item);
      }
    }
    if (sense.kind === 'gaze') this.setFocus(best);
  }

  presenteFound(path, item) {
    if (item.found) return;
    item.found = true;
    item.dwell = 0;
    const sense = path.senses[path.senseIndex];
    sense.found += 1;
    item.tag.visible = true;
    if (item.loop) { try { item.loop.stop(); item.holder.remove(item.loop); } catch { /* ya parado */ } item.loop = null; }
    if (item.interact) item.interact.enabled = false;
    if (item.mesh?.material && 'emissiveIntensity' in item.mesh.material) item.mesh.material.emissiveIntensity = 0.4;
    this.audio.play(sense.kind === 'touch' ? 'stone' : 'collect', { volume: 0.45 });
    this.feedback.burst(_v.set(item.x, item.y + 1.2, item.z), { count: 12, color: '#ffd166', speed: 1.8, life: 0.9 });
    this.setTask(`${sense.icon} ${sense.count} ${sense.prompt} · ${sense.found}/${sense.count}`);
    if (sense.found >= sense.count) {
      this.setFocus(0);
      path.senseIndex += 1;
      const done = path.senseIndex / path.senses.length;
      this.feedback.tweenValue(path.fogDome.material, 'opacity', 0.42 * (1 - done), 1.5);
      this.audio.play('light', { volume: 0.4 });
      if (path.senseIndex >= path.senses.length) {
        this.later(() => { path.fogDome.visible = false; }, 1600);
        this.showNote({ title: 'De vuelta en el presente', text: 'Estoy aquí. Puedo detenerme y decidir qué hacer.', seconds: 8 });
        this.completePath('presente');
      } else {
        this.later(() => this.startSense(path), 900);
      }
    }
  }

  /* ······ (e) reevalua */

  activate_reevalua(path) {
    this.activateStation(path, 0);
    this.noteOnce('ree-how', {
      title: 'Cambio mi respuesta',
      text: 'Cuando el desagrado es muy intenso, los pensamientos se vuelven extremos. Lee el pensamiento y atraviesa caminando la puerta con la versión equilibrada. Las otras puertas rebotan suave: nada se pierde.',
      seconds: 10
    });
  }

  activateStation(path, index) {
    const st = path.stations[index];
    if (!st) return;
    path.stationIndex = index;
    st.group.visible = true;
    st.active = true;
    this.scene.updateMatrixWorld(true);
    st.doors.forEach((door) => {
      door.prevAlong = null;
      if (!door.opt.balanced) {
        const box = new THREE.Box3().setFromObject(door.panel);
        box.min.y -= 0.5;
        box.max.y += 0.5;
        door.collider = this.controller.addCollider({ type: 'box', box });
      }
    });
    this.doorSets.push({ station: st, u: path.u, right: path.right, onDone: (opt) => this.stationDone(path, st, opt) });
    this.setTask(`💭 Pensamiento ${index + 1}/2: atraviesa la puerta equilibrada`);
  }

  updateDoors(dt) {
    if (!this.doorSets.length) return;
    const p = this.controller.position;
    for (let s = this.doorSets.length - 1; s >= 0; s -= 1) {
      const set = this.doorSets[s];
      if (set.station.done) { this.doorSets.splice(s, 1); continue; }
      for (const door of set.station.doors) {
        const rx = p.x - door.x;
        const rz = p.z - door.z;
        const along = rx * set.u.x + rz * set.u.z;
        const lateral = rx * set.right.x + rz * set.right.z;
        const inWidth = Math.abs(lateral) < 1.15;
        if (door.opt.balanced) {
          if (inWidth && door.prevAlong !== null && door.prevAlong < 0 && along >= 0) {
            set.station.done = true;
            set.onDone(door.opt, door);
            return;
          }
          door.prevAlong = inWidth ? along : null;
        } else if (inWidth && along < 0 && along > -1.1 && this.time - door.bumpAt > 2.5) {
          door.bumpAt = this.time;
          this.audio.play('soften', { volume: 0.4 });
          door.panel.material.emissiveIntensity = 1;
          this.later(() => { door.panel.material.emissiveIntensity = 0.25; }, 500);
          this.showNote({ title: 'La puerta no se abre', text: door.opt.feedback, seconds: 6 });
        }
      }
    }
    void dt;
  }

  stationDone(path, st, opt) {
    st.doors.forEach((door) => {
      if (door.collider) {
        const i = this.controller.colliders.indexOf(door.collider);
        if (i >= 0) this.controller.colliders.splice(i, 1);
        door.collider = null;
      }
    });
    const balanced = st.doors.find((d) => d.opt.balanced);
    this.feedback.tweenValue(balanced.panel.material, 'opacity', 0, 0.8);
    st.thought.userData.setText(`✨ ${opt.label}`, { bg: 'rgba(20,60,30,0.85)' });
    this.audio.play('light', { volume: 0.45 });
    this.feedback.burst(st.thought.position, { count: 20, color: '#c9a3ff', speed: 2.4, life: 1 });
    this.say('PENSAMIENTO EQUILIBRADO', 2000);
    this.showNote({ title: 'Respuesta equilibrada', text: opt.feedback, seconds: 7 });
    const next = path.stationIndex + 1;
    if (next < path.stations.length) {
      this.later(() => this.activateStation(path, next), 1500);
    } else {
      this.showNote({ title: 'Reevaluación cognitiva', text: 'Cambiar el pensamiento no cambia la situación: cambia lo que puedes hacer con ella.', seconds: 9 });
      this.completePath('reevalua');
    }
  }

  /* ······ (f) apoyo */

  activate_apoyo(path) {
    this.guardian.visible = true;
    path.fog.visible = true;
    path.fog.material.opacity = 0.45;
    this.setTask('📣 Pulsa E para llamar al Guardián de Confianza · sigue su luz');
    this.noteOnce('apo-how', {
      title: 'No tengo que hacerlo solo',
      text: 'En algún lugar de esta niebla está el Guardián de Confianza. Pulsa E para llamarlo: responderá con una luz y vendrá hacia ti. Pedir apoyo también es una estrategia.',
      seconds: 9
    });
  }

  callGuardian(path) {
    if (path.met || this.time - (path.lastCall ?? -9) < 1.2) return;
    path.lastCall = this.time;
    path.calls += 1;
    this.audio.play('chime', { volume: 0.4, rate: 1.2 });
    const g = this.guardian;
    const p = this.controller.position;
    this.feedback.flash(_v.copy(g.position).setY(g.position.y + 1.8), { color: '#ffd6ff', intensity: 9, duration: 1.4, distance: 26 });
    this.feedback.burst(_v, { count: 14, color: '#ff8fb8', speed: 1.8, life: 1.4, gravity: -0.8 });
    this.audio.playAt('pad', g, { volume: 0.8, refDistance: 6 });
    this.guardianLight.intensity = 6;
    // el Guardian tambien viene hacia ti
    const dx = p.x - g.position.x;
    const dz = p.z - g.position.z;
    const d = Math.hypot(dx, dz) || 1;
    const step = Math.min(3, Math.max(0, d - 2.2));
    const to = new THREE.Vector3(g.position.x + (dx / d) * step, 0, g.position.z + (dz / d) * step);
    to.y = this.heightAt(to.x, to.z);
    const from = g.position.clone();
    this.feedback.tween({ from: 0, to: 1, duration: 1.1, onUpdate: (t) => g.position.lerpVectors(from, to, t) });
    g.userData.state = 'walk';
    this.later(() => { g.userData.state = 'idle'; }, 1100);
    this.say(path.calls === 1 ? '¡ALGUIEN RESPONDE!' : 'SE ACERCA', 1400);
  }

  update_apoyo(dt, path) {
    this.guardianLight.intensity = Math.max(0.6, this.guardianLight.intensity - dt * 3);
    const g = this.guardian;
    g.lookAt(this.controller.position.x, g.position.y, this.controller.position.z);
    const p = this.controller.position;
    if (!path.met && Math.hypot(p.x - g.position.x, p.z - g.position.z) < 2.6) this.meetGuardian(path);
  }

  meetGuardian(path) {
    path.met = true;
    this.setTask('');
    this.feedback.tweenValue(path.fog.material, 'opacity', 0, 2);
    this.later(() => { path.fog.visible = false; }, 2100);
    this.audio.play('success', { volume: 0.4 });
    this.showChoices({
      title: 'Guardián de Confianza',
      text: '¿Quieres contarme qué está pasando?',
      options: SUPPORT_LINES.map((l) => l.label),
      onPick: (i) => {
        const line = SUPPORT_LINES[i];
        this.showNote({ title: 'Guardián de Confianza', text: line.reply, seconds: 8 });
        this.feedback.burst(_v.copy(this.guardian.position).setY(this.guardian.position.y + 2), { count: 24, color: '#ff8fb8', speed: 2.4, life: 1.4, gravity: -0.8 });
        this.later(() => {
          this.showNote({ title: 'Búsqueda de apoyo', text: 'Pedir apoyo también es una forma de cuidar tus emociones.', seconds: 8 });
          this.completePath('apoyo');
        }, 4200);
      }
    });
  }

  /** Eleccion breve dentro del mundo: congela al jugador mientras esta abierta. */
  showChoices({ title, text, options, onPick }) {
    this.controller.frozen = true;
    this.controller.exitPointerLock();
    this._resetStick?.();
    const layer = document.createElement('div');
    layer.className = 'dg-overlay';
    layer.innerHTML = `
      <div class="i3d-panel i3d-panel--card dg-panel" role="dialog" aria-modal="true" aria-label="${title}">
        <h3>${title}</h3>
        <p>${text}</p>
        <div class="dg-choices">
          ${options.map((o, i) => `<button class="i3d-btn dg-choice" type="button" data-pick="${i}">${o}</button>`).join('')}
        </div>
      </div>
    `;
    this.root.appendChild(layer);
    this.speak(`${title}. ${text}. ${options.map((o, i) => `Opción ${i + 1}: ${o}`).join('. ')}`, { priority: true });
    const first = layer.querySelector('[data-pick]');
    first?.focus({ preventScroll: true });
    layer.querySelectorAll('[data-pick]').forEach((btn) => {
      btn.addEventListener('click', () => {
        layer.remove();
        this.controller.frozen = false;
        onPick(Number(btn.dataset.pick));
      });
    });
  }

  /* ==================================================== (5) reevaluación */

  finishReevaluation(lvl) {
    this.finalLevel = lvl;
    const ini = this.initialLevel;
    const strategies = [...this.learned].map((id) => PATHS[id].name).join(' + ');
    recordReevaluation('disgust', INTENSITY[ini], strategies || 'Sin estrategia', INTENSITY[lvl]);
    completeActivity('disgust-reevaluacion', 10);
    this.stageDone.add('reeval');
    this.renderStages();
    this.setBeacons([]);
    const name = (n) => LEVELS[n].title.split('— ')[1].toLowerCase();
    let title, text;
    if (lvl < ini) {
      title = 'Tu desagrado DISMINUYÓ';
      text = `Pasó de ${name(ini)} a ${name(lvl)}. La herramienta funcionó: no eliminó la emoción, te ayudó a sostenerla y a decidir.`;
    } else if (lvl === ini) {
      title = 'Tu desagrado SE MANTIENE';
      text = `Sigue en ${name(lvl)}. Está bien: regular no es dejar de sentir. Puedes usar otra herramienta cuando lo necesites.`;
    } else {
      title = 'Tu desagrado AUMENTÓ';
      text = `Subió de ${name(ini)} a ${name(lvl)}. A veces pasa: mirar de cerca lo que sentimos lo hace más visible. Respira, y recuerda que los caminos siguen abiertos.`;
    }
    this.applyLevelWorld(Math.max(lvl, 2));
    this.controller.speedScale = 1;
    this.showNote({ icon: '🔁', title, text });
    this.later(() => this.startBoss(), 7500);
  }

  /* ======================================================= (6) el desafío */

  lightAltar(altar) {
    altar.interact.enabled = this.boss?.active ?? false;
    altar.stone.material.emissiveIntensity = 0.6;
    altar.label.userData.setText(`${altar.def.technique}\n✓ pulsa E aquí`, { color: '#a8e06a', size: 0.62 });
  }

  startBoss() {
    const b = this.boss;
    b.active = true;
    b.growCooldown = 6;                 // gracia: la criatura emerge sin castigar a nadie
    this.setStage('boss');
    this.controller.speedScale = 1;
    const c = b.creature;
    c.visible = true;
    this.arenaGroup.visible = true;
    const ay = this.heightAt(ARENA.x, ARENA.z);
    this.audio.play('rumble', { volume: 0.6 });
    this.feedback.shakeCamera(0.35, 1.6);
    this.feedback.tween({ from: ay - 6, to: ay, duration: 2.2, onUpdate: (v) => { c.position.y = v; } });
    this.feedback.tweenColor(this.scene.fog.color, FOG.high, 2.5);
    this.feedback.tweenValue(this.scene.fog, 'density', 0.045, 2.5);
    this.sky.userData.setColors('#2a3a26', '#5a7a4a');
    this.altars.forEach((al, i) => {
      al.stone.visible = true;
      al.icon.visible = true;
      al.label.visible = true;
      this.controller.addCollider({ type: 'sphere', center: new THREE.Vector3(al.x, al.y, al.z), radius: 0.9 });
      const from = al.y - 2;
      al.stone.position.y = from;
      this.later(() => this.feedback.tween({ from, to: al.y + 0.55, duration: 0.9, onUpdate: (v) => { al.stone.position.y = v; } }), 300 + i * 220);
      if (this.learned.has(al.id)) { al.interact.enabled = true; al.stone.material.emissiveIntensity = 0.6; }
    });
    // balizas sobre todos los altares con herramienta aprendida: se ve a donde ir
    this.altars.forEach((al) => { if (!al.beacon) al.beacon = this.makeBeacon(al.x, al.z, '#ffd166'); });
    this.setBeacons(this.altars.filter((al) => this.learned.has(al.id)).map((al) => al.beacon));
    this.later(() => this.enterEnvironment('arena', { x: ARENA.x, z: ARENA.z + 11 }, ARENA, 'LLEGAS A LA ARENA'), 2400);
    this.showStageBanner({
      icon: '🛡️', title: 'Desafío final: protege la isla',
      text: 'En el centro aparece La Reacción Impulsiva. No se vence con fuerza: se vence con tus herramientas.',
      seconds: 7
    });
    this.showNote({
      queue: true, icon: '🧭', title: '¿Cómo se derrota? Paso a paso',
      text: '1) Camina (sin correr) hasta uno de los altares con columna de luz dorada. 2) Al llegar, pulsa E y completa la herramienta que te pide. 3) Cada herramienta que uses la encoge un tamaño. Tiene tamaño 3: necesitas usar tres altares.'
    });
    this.showNote({
      queue: true, icon: '⚠️', title: 'Lo que la hace crecer',
      text: 'Correr, saltar o chocar contra ella son reacciones impulsivas: cada una la agranda. Si lanza una provocación, quédate en calma: no te hace nada.'
    });
    this.setTask(this.bossTask());
  }

  bossTask() {
    const b = this.boss;
    const used = this.diary.altars.length;
    const step = used === 0
      ? 'Paso 1: camina hasta un altar dorado y pulsa E'
      : b.size > 0 ? `¡Así se hace! Ve a otro altar y pulsa E (faltan ${b.size})` : '¡Lo lograste!';
    return `🛡️ ${step} · criatura tamaño ${Math.max(0, b.size)}`;
  }

  updateBoss(dt) {
    const b = this.boss;
    if (!b.active) return;
    const c = b.creature;
    const p = this.controller.position;
    const d = Math.hypot(p.x - c.position.x, p.z - c.position.z);
    b.targetScale = 0.55 + b.size * 0.3;
    const s = c.scale.x + (b.targetScale - c.scale.x) * Math.min(1, dt * 2.5);
    c.scale.setScalar(s);
    c.rotation.y = Math.atan2(p.x - c.position.x, p.z - c.position.z);
    b.body.rotation.y += dt * 0.4;
    b.body.position.y = 1.8 + Math.sin(this.time * 2) * 0.15;
    b.body.material.emissiveIntensity = 0.5 + Math.sin(this.time * 3) * 0.25;
    b.growCooldown = Math.max(0, b.growCooldown - dt);

    // impulsos: ondas rojas + provocaciones
    b.impulseTimer -= dt;
    if (b.impulseTimer <= 0) {
      b.impulseTimer = 4.5 + Math.random() * 2;
      b.waveOn = true;
      b.waveR = 0.5;
      b.wave.visible = true;
      this.audio.playAt('buzz', c, { volume: 0.7, refDistance: 8 });
      this.spawnProvocation();
    }
    if (b.waveOn) {
      b.waveR += dt * 5;
      b.wave.scale.setScalar(b.waveR);
      b.wave.material.opacity = Math.max(0, 0.7 * (1 - b.waveR / 16));
      if (Math.abs(d - b.waveR) < 0.8) {
        const speed = Math.hypot(this.controller.velocity.x, this.controller.velocity.z);
        if ((this.controller.isRunning && speed > 5) || this.controller.velocity.y > 1.5) this.bossImpulse('onda');
      }
      if (b.waveR > 16) { b.waveOn = false; b.wave.visible = false; }
    }
    for (let i = this.provocations.length - 1; i >= 0; i -= 1) {
      const pr = this.provocations[i];
      pr.t += dt;
      pr.sprite.position.lerp(_v.set(p.x, p.y + 1.6, p.z), dt * 0.6);
      pr.sprite.material.opacity = Math.max(0, 1 - pr.t / 3.2);
      if (pr.t > 3.2) {
        this.scene.remove(pr.sprite);
        pr.sprite.material.map?.dispose();
        pr.sprite.material.dispose();
        this.provocations.splice(i, 1);
      }
    }

    // en la arena: correr y chocar son reacciones impulsivas
    if (d < 15) {
      const speed = Math.hypot(this.controller.velocity.x, this.controller.velocity.z);
      if (this.controller.isRunning && speed > 5) b.runTime += dt; else b.runTime = Math.max(0, b.runTime - dt * 2);
      if (b.runTime > 0.9) { b.runTime = 0; this.bossImpulse('correr'); }
      if (d < 2.6 * s + 0.6) {
        this.bossImpulse('chocar');
        const dx = (p.x - c.position.x) / (d || 1);
        const dz = (p.z - c.position.z) / (d || 1);
        this.controller.velocity.x = dx * 7;
        this.controller.velocity.z = dz * 7;
      }
    }

    // altares en enfriamiento
    this.altars.forEach((al) => {
      if (al.cooldown > 0) {
        al.cooldown -= dt;
        if (al.cooldown <= 0 && this.learned.has(al.id) && !al.busy) { al.interact.enabled = true; al.stone.material.emissiveIntensity = 0.6; if (al.beacon && this.boss.active) al.beacon.visible = true; }
      }
    });
    if (b.task?.update) b.task.update(dt);
  }

  spawnProvocation() {
    const text = PROVOCATIONS[Math.floor(Math.random() * PROVOCATIONS.length)];
    const sprite = makeText(text, { size: 0.9, maxChars: 24, bg: 'rgba(120,20,40,0.85)', color: '#ffd6d6' });
    const c = this.boss.creature.position;
    sprite.position.set(c.x + (Math.random() - 0.5) * 3, c.y + 3.5, c.z + (Math.random() - 0.5) * 3);
    this.scene.add(sprite);
    this.provocations.push({ sprite, t: 0 });
  }

  bossImpulse(reason) {
    const b = this.boss;
    if (!b.active || b.growCooldown > 0) return;
    b.growCooldown = 4;
    b.size = Math.min(5, b.size + 1);
    this.diary.grows += 1;
    this.audio.play('rumble', { volume: 0.5 });
    this.feedback.shakeCamera(0.3, 2);
    this.feedback.burst(_v.copy(b.creature.position).setY(b.creature.position.y + 2), { count: 20, color: '#ff5c5c', speed: 3, life: 1 });
    this.say('LA CRIATURA CRECE', 1800);
    this.setTask(this.bossTask());
    const texts = {
      correr: 'Correr por la arena es reaccionar sin pensar: la criatura crece. Camina.',
      saltar: 'Saltar de golpe la alimenta. Muévete con calma.',
      chocar: 'Chocar contra ella es actuar impulsivamente: crece. Usa un altar en vez de enfrentarla de frente.',
      onda: 'Su onda te alcanzó mientras corrías o saltabas. Cuando llegue la provocación, quédate en calma: no le hace nada.'
    };
    this.noteOnce(`boss-${reason}`, { title: 'La Reacción Impulsiva crece', text: texts[reason], seconds: 7 });
  }

  useAltar(altar) {
    const b = this.boss;
    if (!b.active || altar.busy) return;
    if (!this.learned.has(altar.id)) { this.say('APRENDE ESTA HERRAMIENTA EN SU CAMINO', 2400); return; }
    altar.busy = true;
    altar.interact.enabled = false;
    this.altars.forEach((al) => { if (al !== altar) al.interact.enabled = false; });
    b.task = { altar };
    const y = altar.y;
    const done = () => this.altarDone(altar);

    if (altar.id === 'respira') {
      if (!this.altarBubble) {
        this.altarBubble = new THREE.Mesh(
          new THREE.SphereGeometry(1.6, 20, 14),
          new THREE.MeshStandardMaterial({ color: '#bfe8ff', emissive: '#7fd1ff', emissiveIntensity: 0.35, transparent: true, opacity: 0.32, roughness: 0.1, side: THREE.DoubleSide, depthWrite: false })
        );
        this.scene.add(this.altarBubble);
      }
      const bx = altar.x + (ARENA.x - altar.x) * 0.25;
      const bz = altar.z + (ARENA.z - altar.z) * 0.25;
      this.altarBubble.position.set(bx, this.heightAt(bx, bz) + 1.6, bz);
      this.altarBubble.visible = true;
      this.startBreath({ center: { x: bx, z: bz }, radius: 2.2, target: 2, bubble: this.altarBubble, onDone: () => { this.altarBubble.visible = false; done(); } });
      this.say('COMPLETA 2 RESPIRACIONES EN LA BURBUJA', 3200);
      this.setTask('🫁 Entra en la burbuja, quédate quieto y pulsa E al mantener el aire · 2 ciclos');
    } else if (altar.id === 'presente') {
      const glints = [];
      for (let i = 0; i < 3; i += 1) {
        const a = (i / 3) * Math.PI * 2;
        const gx = altar.x + Math.cos(a) * 3;
        const gz = altar.z + Math.sin(a) * 3;
        const glint = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), new THREE.MeshStandardMaterial({ color: '#fff4c0', emissive: '#ffd166', emissiveIntensity: 1.4 }));
        glint.position.set(gx, this.heightAt(gx, gz) + 1.4 + i * 0.4, gz);
        this.scene.add(glint);
        glints.push({ mesh: glint, dwell: 0, found: false });
      }
      let found = 0;
      this.say('MIRA 3 ELEMENTOS DEL ENTORNO', 3200);
      this.setTask('👀 Mira fijamente los 3 destellos dorados alrededor del altar · 0/3');
      b.task.update = (dt) => {
        this.camera.getWorldDirection(_dir);
        let best = 0;
        for (const gl of glints) {
          if (gl.found) continue;
          _v.copy(gl.mesh.position).sub(this.camera.position);
          const dist = _v.length();
          _v.normalize();
          const angle = Math.acos(Math.max(-1, Math.min(1, _v.dot(_dir))));
          if (dist < 16 && angle < 0.1) gl.dwell = Math.min(1, gl.dwell + dt * 2.8); else gl.dwell = Math.max(0, gl.dwell - dt * 2);
          best = Math.max(best, gl.dwell);
          if (gl.dwell >= 1) {
            gl.found = true;
            found += 1;
            this.scene.remove(gl.mesh);
            this.audio.play('collect', { volume: 0.4 });
            this.setTask(`👀 Elementos del entorno · ${found}/3`);
          }
        }
        this.setFocus(best);
        if (found >= 3) { b.task.update = null; this.setFocus(0); done(); }
      };
    } else if (altar.id === 'acepta') {
      if (!this.altarOrb) {
        this.altarOrb = this.makeSensationOrb();
        this.scene.add(this.altarOrb);
        this.altarOrbInteract = this.interactable({
          object: this.altarOrb, radius: 2.4, icon: '🫳', label: 'Sostener la sensación',
          onInteract: () => {
            this.altarOrbInteract.enabled = false;
            this.carry = { active: true, orb: this.altarOrb, mode: 'altar', altar: this.altarOrb.userData.altar, still: 0 };
            this.audio.play('interact', { volume: 0.35 });
          }
        });
      }
      this.altarOrb.visible = true;
      this.altarOrb.scale.setScalar(1);
      this.altarOrb.position.set(altar.x + 1.6, y + 1.2, altar.z);
      this.altarOrb.userData.altar = altar;
      altar.orbInteract = this.altarOrbInteract;
      this.altarOrbInteract.enabled = true;
      this.say('SOSTÉN LA SENSACIÓN Y RECONÓCELA', 3200);
      this.setTask('🫳 Acércate a la sensación, pulsa E para sostenerla y quédate quieto 3 segundos');
    } else if (altar.id === 'reevalua') {
      const th = THOUGHTS[Math.floor(Math.random() * THOUGHTS.length)];
      const ux = (altar.x - ARENA.x), uz = (altar.z - ARENA.z);
      const ul = Math.hypot(ux, uz);
      const u = { x: ux / ul, z: uz / ul };
      const right = { x: -u.z, z: u.x };
      const station = new THREE.Group();
      this.scene.add(station);
      const thought = makeText(`💭 ${th.text}`, { size: 1.1, maxChars: 22, bg: 'rgba(60,20,30,0.85)' });
      thought.position.set(altar.x, y + 3.6, altar.z);
      station.add(thought);
      const opts = shuffle(th.options).slice(0, 3);
      if (!opts.some((o) => o.balanced)) opts[0] = th.options.find((o) => o.balanced);
      const doors = opts.map((opt, j) => {
        const off = (j - 1) * 3.4;
        const dx = altar.x + u.x * 3.5 + right.x * off;
        const dz = altar.z + u.z * 3.5 + right.z * off;
        const dy = this.heightAt(dx, dz);
        const door = new THREE.Group();
        door.position.set(dx, dy, dz);
        door.rotation.y = Math.atan2(u.x, u.z);
        const pmat = new THREE.MeshStandardMaterial({ color: '#6b5a4a', roughness: 0.9, flatShading: true });
        [-1, 1].forEach((sgn) => {
          const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.3, 3, 0.3), pmat);
          pillar.position.set(1.2 * sgn, 1.5, 0);
          door.add(pillar);
        });
        const panel = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 2.9), new THREE.MeshStandardMaterial({ color: '#8fb28a', emissive: '#4f8a5b', emissiveIntensity: 0.25, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false }));
        panel.position.y = 1.45;
        door.add(panel);
        const label = makeText(opt.label, { size: 1.05, maxChars: 22, px: 34 });
        label.position.y = 4.2;
        door.add(label);
        station.add(door);
        const d = { group: door, panel, label, opt, x: dx, z: dz, prevAlong: null, bumpAt: -9, collider: null };
        if (!opt.balanced) {
          this.scene.updateMatrixWorld(true);
          const box = new THREE.Box3().setFromObject(panel);
          box.min.y -= 0.5; box.max.y += 0.5;
          d.collider = this.controller.addCollider({ type: 'box', box });
        }
        return d;
      });
      const st = { group: station, thought, doors, done: false };
      this.doorSets.push({
        station: st, u, right,
        onDone: (opt) => {
          doors.forEach((door) => {
            if (door.collider) {
              const i = this.controller.colliders.indexOf(door.collider);
              if (i >= 0) this.controller.colliders.splice(i, 1);
            }
          });
          thought.userData.setText(`✨ ${opt.label}`, { bg: 'rgba(20,60,30,0.85)' });
          this.audio.play('light', { volume: 0.45 });
          this.later(() => { this.scene.remove(station); }, 2500);
          done();
        }
      });
      this.say('ATRAVIESA LA PUERTA EQUILIBRADA', 3200);
      this.setTask('💭 Lee el pensamiento y atraviesa caminando la puerta con la versión equilibrada');
    } else if (altar.id === 'apoyo') {
      const g = this.guardian;
      g.visible = true;
      const gx = altar.x + (altar.x - ARENA.x) * 0.6;
      const gz = altar.z + (altar.z - ARENA.z) * 0.6;
      g.position.set(gx, this.heightAt(gx, gz), gz);
      this.guardianLight.intensity = 5;
      this.feedback.flash(_v.set(gx, g.position.y + 1.8, gz), { color: '#ffd6ff', intensity: 8, duration: 1.4, distance: 24 });
      this.audio.playAt('pad', g, { volume: 0.8, refDistance: 6 });
      this.say('ACÉRCATE AL GUARDIÁN DE CONFIANZA', 3200);
      this.setTask('🧙 Camina hasta el Guardián de Confianza (la luz morada)');
      b.task.update = () => {
        g.lookAt(this.controller.position.x, g.position.y, this.controller.position.z);
        this.guardianLight.intensity = Math.max(0.8, this.guardianLight.intensity - 0.02);
        const p = this.controller.position;
        if (Math.hypot(p.x - g.position.x, p.z - g.position.z) < 2.3) {
          b.task.update = null;
          this.showNote({ title: 'Guardián de Confianza', text: 'Estoy aquí. Contarlo ya es una forma de cuidarte: no tienes que hacerlo solo.', seconds: 6 });
          this.feedback.burst(_v.copy(g.position).setY(g.position.y + 2), { count: 20, color: '#ff8fb8', speed: 2.2, life: 1.2, gravity: -0.8 });
          done();
        }
      };
    }
  }

  altarDone(altar) {
    const b = this.boss;
    altar.busy = false;
    altar.cooldown = 6;
    this.diary.altars.push(altar.def.technique);
    altar.stone.material.emissiveIntensity = 0.15;
    b.task = null;
    this.altars.forEach((al) => { if (this.learned.has(al.id) && al.cooldown <= 0 && !al.busy) al.interact.enabled = true; });
    if (altar.beacon) altar.beacon.visible = false;
    b.size -= 1;
    this.audio.play('success', { volume: 0.5 });
    this.feedback.burst(_v.copy(b.creature.position).setY(b.creature.position.y + 2.2), { count: 26, color: '#a8e06a', speed: 3, life: 1.1 });
    this.feedback.flash(_v, { color: '#a8e06a', intensity: 6, duration: 0.9 });
    this.setTask(this.bossTask());
    if (b.size <= 0) this.victory();
    else {
      this.say(`LA CRIATURA SE ENCOGE · FALTAN ${b.size}`, 3000);
      if (this.diary.altars.length === 1) {
        this.showNote({ icon: '🛡️', title: '¡Muy bien! Así se derrota', text: `Cada altar la encoge un tamaño. Sigue con otro altar iluminado: te faltan ${b.size}. Recuerda: camina, no corras.` });
      }
    }
  }

  victory() {
    const b = this.boss;
    b.active = false;
    b.wave.visible = false;
    this.phase = 'victory';
    this.stageDone.add('boss');
    this.renderStages();
    this.altars.forEach((al) => { al.interact.enabled = false; if (al.beacon) al.beacon.visible = false; });
    completeActivity('disgust-protege', 15);
    const tool = addReward('escudo-autocontrol');
    if (tool && !this.rewards.includes('escudo-autocontrol')) this.rewards.push('escudo-autocontrol');
    const c = b.creature;
    const ay = this.heightAt(ARENA.x, ARENA.z);
    this.feedback.tween({
      from: c.scale.x, to: 0.001, duration: 1.8,
      onUpdate: (v) => { c.scale.setScalar(v); c.position.y = ay - (1 - v / (b.targetScale || 1)) * 3; },
      onDone: () => { c.visible = false; }
    });
    // la niebla desaparece, la isla recupera su color, aparece la luz
    this.feedback.tweenColor(this.scene.fog.color, FOG.clear, 4);
    this.feedback.tweenValue(this.scene.fog, 'density', 0.006, 4);
    Object.values(this.envs).forEach((e) => { if (e.group && e.group.userData.revealed) e.group.visible = true; });
    this.plazaGroup.visible = true;
    this.controller.bounds = { minX: -BOUND, maxX: BOUND, minZ: -BOUND, maxZ: BOUND };
    this.sky.userData.setColors('#4a8fbf', '#d8efc8');
    this.feedback.tweenValue(this.sun, 'intensity', 2.4, 4);
    this.feedback.tweenValue(b.beam.material, 'opacity', 0.35, 2.5);
    if (this.pool) this.feedback.tweenColor(this.pool.material.color, '#6fc3d8', 4);
    this.controller.speedScale = 1;
    this.ambient?.setVolume(0.1);
    this.audio.play('success', { volume: 0.6 });
    this.setTask('');
    this.say('LA NIEBLA DESAPARECE', 3400, { speak: false });
    this.later(() => {
      this.toast('🛡️ Recompensa: Escudo de Autocontrol');
      this.showNote({
        title: 'Isla protegida',
        text: 'La niebla desaparece. La isla recupera su color. Aparece la luz. Se desbloquea el camino hacia la siguiente isla.',
        seconds: 9
      });
    }, 2000);
    this.later(() => {
      const py = this.heightAt(0, 24);
      this.openPortal(new THREE.Vector3(0, py, 24), { color: '#a8e0ff', label: 'Camino a la siguiente isla' });
      this.setBeacons([]);
      this.say('CRUZA EL PORTAL', 3200, { speak: false });
    }, 5200);
  }

  /* ================================================================ bucle */

  onUpdate(dt) {
    this.time += dt;

    if (this.bubbles) {
      for (let i = 0; i < this.bubbles.length; i += 1) {
        const bb = this.bubbles[i];
        bb.position.y = bb.userData.baseY + ((this.time * bb.userData.speed + bb.userData.phase) % 2) * 0.9;
        bb.scale.setScalar(0.7 + Math.sin(this.time * 2 + i) * 0.15);
      }
    }
    if (this.spores) {
      const pos = this.spores.geometry.attributes.position;
      const seeds = this.spores.userData.seeds;
      for (let i = 0; i < pos.count; i += 1) {
        let y = pos.getY(i) + Math.sin(this.time * 0.6 + seeds[i]) * dt * 0.35 + dt * 0.08;
        if (y > 6) y = 0.4;
        pos.setY(i, y);
        pos.setX(i, pos.getX(i) + Math.sin(this.time * 0.3 + seeds[i] * 1.7) * dt * 0.25);
      }
      pos.needsUpdate = true;
    }
    if (this.fireflies) {
      const pos = this.fireflies.geometry.attributes.position;
      const seeds = this.fireflies.userData.seeds;
      for (let i = 0; i < pos.count; i += 1) {
        pos.setY(i, pos.getY(i) + Math.sin(this.time * 1.3 + seeds[i]) * dt * 0.5);
        pos.setX(i, pos.getX(i) + Math.cos(this.time * 0.7 + seeds[i] * 2.1) * dt * 0.6);
        pos.setZ(i, pos.getZ(i) + Math.sin(this.time * 0.5 + seeds[i] * 1.3) * dt * 0.6);
      }
      pos.needsUpdate = true;
      this.fireflies.material.opacity = 0.7 + Math.sin(this.time * 3) * 0.2;
    }
    if (this.lamps) {
      for (const l of this.lamps) {
        const k = 0.85 + Math.sin(this.time * 2.2 + l.seed) * 0.15;
        l.glow.scale.setScalar(0.7 * k);
        l.glow.material.opacity = 0.6 + Math.sin(this.time * 3 + l.seed) * 0.3;
      }
    }
    for (const bc of this.beacons) {
      if (!bc.visible) continue;
      bc.userData.beam.material.opacity = 0.2 + Math.sin(this.time * 2.5) * 0.08;
      bc.userData.halo.scale.setScalar(1 + ((this.time * 0.8) % 1) * 1.6);
      bc.userData.halo.material.opacity = 0.6 * (1 - ((this.time * 0.8) % 1));
    }
    for (const zone of this.zones) {
      zone.stimuli.forEach((st) => { if (st.group.visible && zone.current !== st) st.group.position.y = zone.y + 1.25 + Math.sin(this.time * 2 + st.phase) * 0.15; });
    }
    if (this.guardian?.visible) {
      const [armL, armR] = this.guardian.userData.arms;
      const walk = this.guardian.userData.state === 'walk';
      armL.rotation.x = Math.sin(this.time * (walk ? 7 : 2)) * (walk ? 0.55 : 0.12);
      armR.rotation.x = -Math.sin(this.time * (walk ? 7 : 2)) * (walk ? 0.55 : 0.12);
    }

    if (this.phase === 'explore') this.updateExplore(dt);
    if (this.mirror.active) this.updateMirror(dt);
    if (this.thermo.enabled) this.updateThermo(dt);
    this.updatePaths(dt);
    this.updateBreath(dt);
    this.updateCarry(dt);
    this.updateDoors(dt);
    if (this.boss?.active) this.updateBoss(dt);
    if (this.portalRing) this.portalRing.rotation.z += dt * 0.6;
  }

  /* ============================================================ reinicio */

  onReset() {
    // la isla se reconstruye entera: es la forma mas segura de volver al inicio
    this.timers.forEach((t) => clearTimeout(t));
    this.timers.clear();
    this.soundLoops.forEach((s) => { try { s.stop(); } catch { /* ya parado */ } });
    this.ambient?.stop();
    this.interactables.clear();
    this.controller.clearColliders();
    this.controller.speedScale = 1;
    this.controller.frozen = false;
    this.bars.forEach((b) => b.remove());
    this.bars.clear();
    this.el.notes.innerHTML = '';
    this.noteStack.length = 0;
    this.noteQueue.length = 0;
    this.el.overlay.innerHTML = '';
    this.scene.traverse((obj) => {
      if (obj.isMesh || obj.isInstancedMesh || obj.isSprite) {
        obj.geometry?.dispose?.();
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        mats.forEach((m) => {
          if (!m) return;
          Object.values(m).forEach((v) => { if (v && v.isTexture) v.dispose(); });
          m.dispose?.();
        });
      }
    });
    this.scene.clear();
    this.feedback.dispose?.();
    this.feedback = new this.feedback.constructor(this.scene, this.camera, this.audio);
    this.portal = null;
    this.portalRing = null;
    this.altarBubble = null;
    this.altarOrb = null;
    this.altarOrbInteract = null;
    this.stopSpeaking();
    this.build();
    this.renderer.shadowMap.needsUpdate = true;
    this.ambient = this.audio.ambient('swamp', { volume: 0.35, rate: 0.9 });
    this.startThermoStage();
  }

  /* ============================================================== cierre */

  get completionPayload() {
    return {
      islandId: 'disgust',
      success: true,
      emoAventura: true,
      badge: 'disgust',
      title: 'Guardianes del Desagrado',
      message: 'Reconociste el desagrado, mediste su intensidad, elegiste cómo responder y protegiste la isla.'
    };
  }

  finish() {
    if (this.finished || this.closing) return;
    this.closing = true;
    this.controller.frozen = true;
    this.controller.exitPointerLock();
    completeActivity('disgust-territorio-3d', 20);
    const rewards = this.rewards.map((id) => `${TOOLS[id]?.icon ?? '🎁'} ${TOOLS[id]?.name ?? id}`).join(' · ');
    const lines = [
      '«Has aprendido que sentir desagrado es válido. Lo importante es reconocerlo, comprender su intensidad y elegir cómo responder.»',
      '<strong>¡HAS COMPLETADO LA ISLA DE LOS GUARDIANES DEL DESAGRADO!</strong>',
      'El desagrado puede ayudarnos a reconocer aquello que percibimos como desagradable o que queremos evitar. Puede manifestarse en nuestro cuerpo, pensamientos y comportamientos.',
      'Sentir desagrado no significa que debamos reaccionar impulsivamente.',
      '<strong>Primero reconoce. Después respira. Luego decide.</strong>',
      rewards ? `Recompensas: ${rewards}` : ''
    ].filter(Boolean);
    const diary = this.buildDiary();
    this.showClosingCard({ title: 'GUARDIÁN DEL DESAGRADO', lines, diary, onDone: () => super.finish() });
  }

  onDispose() {
    this.disposedFlag = true;
    this.stopSpeaking();
    clearTimeout(this._speechGuard);
    this.scene?.traverse((obj) => {
      if (obj.isSprite) {
        obj.material.map?.dispose();
        obj.material.dispose();
      }
    });
    this.ambient?.stop();
    this.soundLoops.forEach((s) => { try { s.stop(); } catch { /* ya parado */ } });
    this.soundLoops.length = 0;
    this.provocations.length = 0;
  }
}
