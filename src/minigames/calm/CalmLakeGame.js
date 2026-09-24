// ISLA DE LA CALMA · El lago sereno
// Verbo: ESCUCHAR Y BAJAR EL RITMO · Primera persona
//
// Tres actividades, en orden y cada una en su rincon de la isla:
//   1. El lago espejo: el agua esta revuelta; sentado en el muelle, cada
//      exhalacion la aquieta hasta que refleja el cielo.
//   2. ¿Quien canta?: siete voces escondidas en el bosque del oeste (cinco
//      pajaros, un sapo y un grillo) que solo cantan si te quedas quieto.
//      No se buscan: al pararte en el bosque una voz canta para ti y hay que
//      adivinar de quien es
//      (las opciones dicen como suena cada voz: se aprende escuchando, no de
//      memoria); al acertar, el animal aparece y viene a posarse cerca.
//   3. El estanque musical: nenufares que son notas de kalimba (pentatonica,
//      siempre suena bien); pisandolos se compone una melodia propia.
// Todo el sonido es generado: agua, arroyo, hojas, campanas, siete voces
// distintas y una musica que gana capas conforme la isla se calma.

import * as THREE from 'three';
import { MinigameBase } from '../../engine/MinigameBase.js';
import { CalmMusic } from '../../engine/CalmMusic.js';
import { BreathPause } from '../../engine/BreathPause.js';
import { createSky, createLights, terrainHeight } from '../../engine/worldkit.js';
import { addReward, completeActivity, recordReevaluation, setInitialIntensity } from '../../data/gameState.js';

/* ------------------------------------------------------------------ mapa */

const LAKE = { x: 0, z: 0, r: 16, y: -0.35 };
const POND = { x: 25, z: -4, r: 6.5, y: -0.3 };
const FOREST = { x: -25, z: -4, r: 13 };
const DOCK = { x: 0, z0: 9.2, z1: 16.6, w: 2.4, y: -0.05 };   // z0: extremo sobre el agua · z1: orilla
const SEAT = { x: 0, z: 10.4 };
const START = { x: 0, z: 23.5 };
const WADE_R = LAKE.r - 1.2;                                    // hasta aqui se puede entrar en el lago

const STAGES = [
  { id: 'lake', banner: 'ETAPA 1 · EL LAGO ESPEJO', icon: '🌊' },
  { id: 'voices', banner: 'ETAPA 2 · ¿QUIÉN CANTA?', icon: '👂' },
  { id: 'pond', banner: 'ETAPA 3 · EL ESTANQUE MUSICAL', icon: '♪' }
];

// Siete voces escondidas en el bosque del oeste: cinco pajaros en las copas,
// un sapo entre los juncos de la orilla y un grillo en la hierba del claro.
// `desc` es como suena (las opciones de «¿quien canta?»), `clue` la pista al
// fallar y `text` la nota cuando aparece. El colibri no canta: zumban sus alas.
const ANIMALS = [
  { id: 'colibri', kind: 'bird', name: 'Colibrí', emoji: '🐦', sound: 'birdHum', desc: 'un zumbido de alas', clue: 'No es un canto: es un zumbido, como una abeja muy suave.',
    body: '#2ec4a6', belly: '#eafaf3', size: 0.5, every: [2.4, 4.2], tree: { x: -19, z: -10 },
    text: 'El colibrí no canta: lo que oíste son sus alas, que se mueven tan rápido que zumban. Solo se acerca cuando nada se mueve deprisa.' },
  { id: 'mirlo', kind: 'bird', name: 'Mirlo', emoji: '🐦', sound: 'birdDown', desc: 'tres notas que bajan', clue: 'Son tres notas seguidas y cada una es más grave que la anterior.',
    body: '#2a2a33', belly: '#3a3a45', beak: '#f0b429', size: 0.85, every: [4, 7], tree: { x: -28, z: -1 },
    text: 'El mirlo canta al atardecer, cuando el día baja de ritmo. Escucharlo es una forma de bajar tú también.' },
  { id: 'carbonero', kind: 'bird', name: 'Carbonero', emoji: '🐤', sound: 'birdChip', desc: 'chip, chip, chip', clue: 'Es un «chip» corto y agudo, repetido siempre igual.',
    body: '#f5d547', belly: '#fbf3c4', head: '#1f2933', size: 0.65, every: [3, 5.5], tree: { x: -22, z: 4 },
    text: 'El carbonero repite lo mismo muchas veces. Tu respiración también: inhalar, exhalar, una y otra vez.' },
  { id: 'tortola', kind: 'bird', name: 'Tórtola', emoji: '🕊️', sound: 'birdDove', desc: 'un arrullo grave: u-uuu', clue: 'Es suave y grave, como una voz que arrulla.',
    body: '#c9b8a8', belly: '#efe6dc', size: 1, every: [5, 8], tree: { x: -31, z: -9 },
    text: 'El arrullo de la tórtola es grave y lento, como una voz que dice «no hay prisa».' },
  { id: 'petirrojo', kind: 'bird', name: 'Petirrojo', emoji: '🐦', sound: 'birdRise', desc: 'un silbido que sube', clue: 'Es un silbido solo, y va de grave a agudo.',
    body: '#8b6a4e', belly: '#f26b3a', size: 0.65, every: [3.5, 6], tree: { x: -16, z: 1 },
    text: 'El petirrojo se posa cerca de quien está tranquilo. Hoy ese eres tú.' },
  { id: 'sapo', kind: 'toad', name: 'Sapo', emoji: '🐸', sound: 'toad', desc: 'croac, croac', clue: 'Es grave y ronco, como una carraca de madera.',
    body: '#6d8f3a', belly: '#d9d2a0', size: 0.85, every: [3.5, 6.5], spot: { x: -17.2, z: -6.2 },
    text: 'El sapo canta desde la orilla, escondido entre los juncos. Su voz es ronca y lenta: no tiene ninguna prisa.' },
  { id: 'grillo', kind: 'cricket', name: 'Grillo', emoji: '🦗', sound: 'cricket', desc: 'cri-cri-cri', clue: 'Es muy agudo y va a un ritmo, cri-cri-cri, como un relojito.',
    body: '#7aa33a', belly: '#c8d98a', size: 0.8, every: [3, 5], spot: { x: -27, z: 2.5 },
    text: 'El grillo canta frotando sus alas. Se calla en cuanto oye pasos: por eso solo lo escuchas si te quedas quieto.' }
];
const BIRDS = ANIMALS.filter((a) => a.kind === 'bird');
/** Donde se esconde cada voz (la copa del arbol o el sitio en el suelo) */
const hideout = (a) => a.tree ?? a.spot;

// Nenufares del estanque: pentatonica de Do, una espiral desde la orilla sur
const PADS = [
  { midi: 60, color: '#7fd1ff', a: -1.62, r: 5.2 },
  { midi: 62, color: '#8be0c8', a: -1.15, r: 4.4 },
  { midi: 64, color: '#b8e986', a: -0.6, r: 4.6 },
  { midi: 67, color: '#ffe08a', a: -0.05, r: 3.7 },
  { midi: 69, color: '#ffb38a', a: 0.6, r: 4.2 },
  { midi: 72, color: '#f5a3c7', a: 1.25, r: 3.4 },
  { midi: 74, color: '#c9a8ff', a: 2.0, r: 4.0 },
  { midi: 76, color: '#8fb8ff', a: 2.75, r: 3.0 }
];
const MIN_NOTES = 8;
const MAX_NOTES = 24;

// Niveles base del ambiente: bajos a proposito, manda el sonido de cada actividad
const AMBIENT = { rough: 0.34, calm: 0.26, leaves: 0.2, brook: 0.6, chime: 0.24, farBird: 0.16, music: 0.7 };
// Mezcla por actividad: cuanto se deja oir cada capa (1 = nivel base)
const MIX = {
  lake: { lake: 1, leaves: 1, brook: 1, extras: true, music: 1, solo: false },
  voices: { lake: 0.45, leaves: 0.55, brook: 1, extras: true, music: 0.8, solo: false },
  // estanque: sin agua, hojas, arroyo, campanas ni pajaros; solo el colchon muy bajo y la kalimba
  pond: { lake: 0, leaves: 0, brook: 0, extras: false, music: 0.5, solo: true },
  replay: { lake: 0, leaves: 0, brook: 0, extras: false, music: 0.3, solo: true },
  after: { lake: 0.5, leaves: 0.5, brook: 0.35, extras: true, music: 1, solo: false }
};

const QUIET_TO_SING = 0.4;      // quietud minima para que canten
const LISTEN_SECONDS = 3.2;     // lo que dura la escucha antes de preguntar quien canta

const clamp01 = (t) => Math.max(0, Math.min(1, t));
const smooth = (t) => { const u = clamp01(t); return u * u * (3 - 2 * u); };
const _dir = new THREE.Vector3();
const _to = new THREE.Vector3();

/** Disco con malla interior (anillos x radios): agua que se puede ondular */
function discGeometry(radius, rings, spokes) {
  const verts = [];
  const uvs = [];
  const idx = [];
  verts.push(0, 0, 0);
  uvs.push(0.5, 0.5);
  for (let r = 1; r <= rings; r += 1) {
    const rad = (r / rings) * radius;
    for (let s = 0; s < spokes; s += 1) {
      const a = (s / spokes) * Math.PI * 2;
      verts.push(Math.cos(a) * rad, 0, Math.sin(a) * rad);
      uvs.push(0.5 + Math.cos(a) * r / rings * 0.5, 0.5 + Math.sin(a) * r / rings * 0.5);
    }
  }
  const at = (r, s) => (r === 0 ? 0 : 1 + (r - 1) * spokes + (s % spokes));
  for (let s = 0; s < spokes; s += 1) idx.push(0, at(1, s + 1), at(1, s));
  for (let r = 1; r < rings; r += 1) {
    for (let s = 0; s < spokes; s += 1) {
      const a = at(r, s);
      const b = at(r, s + 1);
      const c = at(r + 1, s);
      const d = at(r + 1, s + 1);
      idx.push(a, d, c, a, b, d);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

export class CalmLakeGame extends MinigameBase {
  constructor(opts) {
    super({ ...opts, mode: 'first' });
    this.time = 0;
    this.stage = -1;
    this.agitation = 1;          // 1 = lago revuelto · 0 = espejo
    this.calmTarget = 1;
    this.quiet = 0;              // quietud del jugador (bosque)
    this.stepVolume = 0.07;      // los pasos casi no se oyen: manda el ambiente
    this.stepSounds = { walk: 'stepSoft', run: 'stepSoft' };
    this.turno = null;           // voz que esta sonando ahora para adivinarla
    this.hushUntil = 0;
    this.animals = [];
    this.quiz = null;            // la pregunta «¿quien canta?» abierta
    this.pads = [];
    this.melody = [];
    this.ripples = [];
    this.lastPad = null;
    this.sitting = false;
    this.replaying = false;
    this.nextFarBird = 6;
    this.nextChime = 9;
    this.favorite = null;
    this.noteQueue = [];
    this.noteNow = null;
    this.runId = 0;              // cambia al reiniciar: las promesas viejas no siguen
  }

  /* ============================================================ escenario */

  build() {
    this.root.classList.add('i3d--fp', 'cl');
    const scene = this.scene;
    this.renderer.shadowMap.enabled = false;
    this.renderer.toneMappingExposure = 1.12;

    scene.fog = new THREE.FogExp2('#cfe7ee', 0.0105);
    // la niebla es ligera y se ve lejos: la esfera del cielo debe caber
    // entera dentro del plano lejano desde cualquier punto de la isla
    this.camera.far = 320;
    this.camera.updateProjectionMatrix();
    this.renderer.setClearColor('#cfe7ee');
    this.sky = createSky({ top: '#5db0dd', bottom: '#ffe1bf' });
    scene.add(this.sky);

    this.lights = createLights({
      sunColor: '#ffe3c2',
      sunIntensity: 1.45,
      hemiSky: '#bfe7f6',
      hemiGround: '#6f9a78',
      hemiIntensity: 0.75,
      shadows: false
    });
    this.lights.userData.sun.position.set(-6, 14, -30);
    scene.add(this.lights);

    this.buildTerrain();
    this.buildWater();
    this.buildSun();
    this.buildDock();
    this.buildTrees();
    this.buildAnimals();
    this.buildPond();
    this.buildDecor();
    this.buildHud();

    this.controller.groundHeightAt = (x, z) => this.heightAt(x, z);
    this.controller.bounds = { minX: -48, maxX: 48, minZ: -48, maxZ: 48 };
    this.controller.setPosition(START.x, 1, START.z);
    this.controller.yaw = 0;
    this.controller.cfg.walkSpeed = 3.8;
    this.controller.cfg.runSpeed = 6.4;
    // pasos: casi mudos en tierra (stepVolume) y un chapoteo suave en el agua
    this.controller.events.step.length = 0;
    this.controller.on('step', ({ running }) => {
      const wet = this.inWater();
      const v = this.stepVolume * (running ? 1 : 0.85);
      if (wet) { this.audio.play('splash', { volume: 0.16 }); return; }
      if (v <= 0) return;
      this.audio.play(running ? this.stepSounds.run : this.stepSounds.walk, { volume: v });
    });

    this.breathPause = new BreathPause(this);
    setInitialIntensity('media');
  }

  /* ------------------------------------------------------------- terreno */

  /** Relieve sin muelle ni nenufares: lo que dibuja la malla */
  terrainAt(x, z) {
    const dl = Math.hypot(x - LAKE.x, z - LAKE.z);
    const dp = Math.hypot(x - POND.x, z - POND.z);
    let h = terrainHeight(x, z, { amplitude: 0.55, scale: 0.05 });
    h *= smooth((dl - LAKE.r) / 8) * smooth((dp - POND.r) / 4);     // llano junto al agua
    h -= 2.8 * smooth((LAKE.r + 1.5 - dl) / 8);                      // cuenca del lago
    h -= 0.62 * smooth((POND.r + 1 - dp) / 2.5);                     // estanque: por las rodillas
    return h;
  }

  /** Lo que pisa el jugador: relieve + muelle + nenufares */
  heightAt(x, z) {
    const h = this.terrainAt(x, z);
    if (Math.abs(x - DOCK.x) < DOCK.w / 2 && z > DOCK.z0 && z < DOCK.z1) return Math.max(h, DOCK.y);
    for (let i = 0; i < this.pads.length; i += 1) {
      const p = this.pads[i];
      if (Math.hypot(x - p.x, z - p.z) < 1.0) return Math.max(h, POND.y + 0.08);
    }
    return h;
  }

  inWater() {
    const p = this.controller.position;
    const dl = Math.hypot(p.x - LAKE.x, p.z - LAKE.z);
    const dp = Math.hypot(p.x - POND.x, p.z - POND.z);
    const onDock = Math.abs(p.x - DOCK.x) < DOCK.w / 2 && p.z > DOCK.z0 && p.z < DOCK.z1;
    if (onDock) return false;
    if (dl < LAKE.r && p.y < LAKE.y) return true;
    return dp < POND.r && p.y < POND.y;
  }

  buildTerrain() {
    const size = 130;
    const seg = 96;
    const geo = new THREE.PlaneGeometry(size, size, seg, seg);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const grass = new THREE.Color('#8fcf9c');
    const grass2 = new THREE.Color('#77bd88');
    const sand = new THREE.Color('#e8d9b3');
    const floor = new THREE.Color('#6aa878');
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i += 1) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const h = this.terrainAt(x, z);
      pos.setY(i, h);
      const dl = Math.hypot(x - LAKE.x, z - LAKE.z);
      const dp = Math.hypot(x - POND.x, z - POND.z);
      const df = Math.hypot(x - FOREST.x, z - FOREST.z);
      const sandy = Math.max(smooth((LAKE.r + 3.2 - dl) / 3), smooth((POND.r + 2 - dp) / 2));
      c.copy((i * 7) % 3 === 0 ? grass2 : grass);
      c.lerp(floor, smooth((FOREST.r + 2 - df) / 5) * 0.8);
      c.lerp(sand, sandy);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, flatShading: true });
    this.ground = new THREE.Mesh(geo, mat);
    this.ground.name = 'ground';
    this.scene.add(this.ground);
  }

  /* ---------------------------------------------------------------- agua */

  buildWater() {
    // lago: disco ondulable; el color se aclara y el brillo sube al calmarse
    this.lakeGeo = discGeometry(LAKE.r + 0.6, 22, 56);
    this.lakeBase = this.lakeGeo.attributes.position.array.slice();
    this.lakeMat = new THREE.MeshStandardMaterial({
      color: '#2f95b4', transparent: true, opacity: 0.86, roughness: 0.3, metalness: 0.08
    });
    this.lake = new THREE.Mesh(this.lakeGeo, this.lakeMat);
    this.lake.position.set(LAKE.x, LAKE.y, LAKE.z);
    this.scene.add(this.lake);
    this.roughColor = new THREE.Color('#2f95b4');
    this.mirrorColor = new THREE.Color('#9fdcef');

    // reflejo del sol: una franja de luz sobre el agua que solo aparece en calma
    const pathMat = new THREE.MeshBasicMaterial({
      map: this.softTexture(), color: '#ffd9a4', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false
    });
    this.sunPath = new THREE.Mesh(new THREE.PlaneGeometry(4.5, 24), pathMat);
    this.sunPath.rotation.x = -Math.PI / 2;
    this.sunPath.position.set(LAKE.x - 1.5, LAKE.y + 0.03, LAKE.z - 3);
    this.scene.add(this.sunPath);
    const discMat = new THREE.MeshBasicMaterial({
      map: this.softTexture(), color: '#fff1c8', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false
    });
    this.sunDisc = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 4.2), discMat);
    this.sunDisc.rotation.x = -Math.PI / 2;
    this.sunDisc.position.set(LAKE.x - 1.5, LAKE.y + 0.035, LAKE.z - 12.5);
    this.scene.add(this.sunDisc);

    // estanque: mas pequeno, casi quieto
    this.pondGeo = discGeometry(POND.r + 0.4, 10, 36);
    this.pondBase = this.pondGeo.attributes.position.array.slice();
    this.pondMat = new THREE.MeshStandardMaterial({
      color: '#4fb3c9', transparent: true, opacity: 0.8, roughness: 0.22, metalness: 0.05
    });
    this.pond = new THREE.Mesh(this.pondGeo, this.pondMat);
    this.pond.position.set(POND.x, POND.y, POND.z);
    this.scene.add(this.pond);
  }

  /** Mancha blanca con bordes difuminados: para reflejos y brillos */
  softTexture() {
    if (this._softTex) return this._softTex;
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(32, 32, 2, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.5, 'rgba(255,255,255,0.55)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
    this._softTex = new THREE.CanvasTexture(canvas);
    return this._softTex;
  }

  updateWater(dt) {
    const t = this.time;
    const amp = 0.018 + this.agitation * 0.2;
    const pos = this.lakeGeo.attributes.position;
    const base = this.lakeBase;
    for (let i = 0; i < pos.count; i += 1) {
      const x = base[i * 3];
      const z = base[i * 3 + 2];
      const y = amp * (
        Math.sin(x * 0.9 + t * 1.7) * Math.cos(z * 0.7 + t * 1.3) +
        0.55 * Math.sin((x + z) * 1.5 + t * 2.7) +
        0.35 * Math.sin(x * 2.3 - t * 3.1) * Math.cos(z * 2.8 + t * 2.3)
      ) + 0.012 * Math.sin(x * 0.45 + t * 0.6) * Math.cos(z * 0.5 - t * 0.5);
      pos.setY(i, y);
    }
    pos.needsUpdate = true;
    this.lakeGeo.computeVertexNormals();

    const calm = 1 - this.agitation;
    this.lakeMat.color.copy(this.roughColor).lerp(this.mirrorColor, calm);
    this.lakeMat.roughness = 0.3 - 0.24 * calm;
    this.lakeMat.opacity = 0.86 - 0.1 * calm;

    // el estanque solo tiembla
    const pp = this.pondGeo.attributes.position;
    const pb = this.pondBase;
    for (let i = 0; i < pp.count; i += 1) {
      const x = pb[i * 3];
      const z = pb[i * 3 + 2];
      pp.setY(i, 0.014 * Math.sin(x * 1.3 + t * 1.4) * Math.cos(z * 1.1 - t * 1.1));
    }
    pp.needsUpdate = true;
    this.pondGeo.computeVertexNormals();
    void dt;
  }

  /* ----------------------------------------------------------- sol, nubes */

  buildSun() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    const g = ctx.createRadialGradient(64, 64, 6, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,246,220,1)');
    g.addColorStop(0.35, 'rgba(255,222,160,0.85)');
    g.addColorStop(1, 'rgba(255,200,140,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    const sun = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    sun.position.set(-12, 22, -150);
    sun.scale.setScalar(46);
    this.scene.add(sun);

    // nubes: tres esferas aplastadas, blancas, muy lejos y muy lentas
    const cloudMat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.85, fog: false });
    this.clouds = [];
    for (let i = 0; i < 7; i += 1) {
      const c = new THREE.Group();
      [[0, 0, 0, 1], [1.6, -0.2, 0.4, 0.75], [-1.5, -0.25, -0.3, 0.7]].forEach(([x, y, z, s]) => {
        const m = new THREE.Mesh(new THREE.SphereGeometry(2.2, 8, 6), cloudMat);
        m.position.set(x * 2, y * 2, z * 2);
        m.scale.set(s * 1.6, s * 0.55, s);
        c.add(m);
      });
      const a = (i / 7) * Math.PI * 2 + 0.4;
      c.position.set(Math.cos(a) * 95, 26 + (i % 3) * 5, Math.sin(a) * 95);
      c.userData.a = a;
      c.userData.r = 95;
      c.scale.setScalar(1.4 + (i % 3) * 0.4);
      this.scene.add(c);
      this.clouds.push(c);
    }
  }

  /* -------------------------------------------------------------- muelle */

  buildDock() {
    const wood = new THREE.MeshStandardMaterial({ color: '#b98a5a', roughness: 0.9, flatShading: true });
    const dark = new THREE.MeshStandardMaterial({ color: '#8a6238', roughness: 1, flatShading: true });
    const g = new THREE.Group();
    for (let z = DOCK.z0 + 0.25; z < DOCK.z1; z += 0.52) {
      const plank = new THREE.Mesh(new THREE.BoxGeometry(DOCK.w, 0.1, 0.44), wood);
      plank.position.set(DOCK.x, DOCK.y - 0.05, z);
      g.add(plank);
    }
    [DOCK.z0 + 0.3, DOCK.z0 + 3.4, DOCK.z1 - 1.2].forEach((z) => {
      [-1, 1].forEach((s) => {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 2.6, 6), dark);
        post.position.set(DOCK.x + s * (DOCK.w / 2 - 0.12), DOCK.y - 1.2, z);
        g.add(post);
      });
    });
    // banco al final del muelle, mirando al lago
    const bench = new THREE.Group();
    const seat = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.08, 0.5), wood);
    seat.position.y = 0.42;
    const back = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.42, 0.06), wood);
    back.position.set(0, 0.7, 0.24);
    bench.add(seat, back);
    [-0.6, 0.6].forEach((x) => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.42, 0.42), dark);
      leg.position.set(x, 0.21, 0);
      bench.add(leg);
    });
    bench.position.set(SEAT.x, DOCK.y, SEAT.z);
    g.add(bench);
    this.bench = bench;
    this.scene.add(g);
    this.controller.addCollider({ type: 'box', box: new THREE.Box3(
      new THREE.Vector3(SEAT.x - 0.8, DOCK.y, SEAT.z - 0.3), new THREE.Vector3(SEAT.x + 0.8, DOCK.y + 1, SEAT.z + 0.3)) });

    this.seatInteractable = this.interactable({
      object: bench,
      radius: 2.6,
      icon: '🪑',
      label: 'Sentarse a mirar el lago',
      onInteract: () => this.sit()
    });
    this.seatInteractable.enabled = false;
  }

  /* ------------------------------------------------------------- arboles */

  buildTrees() {
    const spots = [];
    // bosque del oeste: denso, con claros para caminar
    for (let i = 0; i < 150; i += 1) {
      const a = i * 2.399;
      const r = 2.5 + (i % 30) * 0.42;
      const x = FOREST.x + Math.cos(a) * r + Math.sin(i * 1.3) * 1.5;
      const z = FOREST.z + Math.sin(a) * r + Math.cos(i * 1.7) * 1.5;
      if (Math.hypot(x - FOREST.x, z - FOREST.z) > FOREST.r) continue;
      if (ANIMALS.some((a) => Math.hypot(hideout(a).x - x, hideout(a).z - z) < (a.tree ? 3.2 : 2.2))) continue;
      if (Math.hypot(x - LAKE.x, z - LAKE.z) < LAKE.r + 2.5) continue;
      // se camina entre los arboles: separacion minima entre troncos
      if (spots.some((sp) => Math.hypot(sp.x - x, sp.z - z) < 2.6)) continue;
      spots.push({ x, z, s: 0.8 + (i % 4) * 0.22, round: i % 3 !== 0 });
    }
    // arboles sueltos por el resto de la isla
    for (let i = 0; i < 70; i += 1) {
      const a = i * 1.7 + 0.3;
      const r = 24 + (i % 9) * 2.3;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      if (Math.hypot(x - FOREST.x, z - FOREST.z) < FOREST.r + 2) continue;
      if (Math.hypot(x - POND.x, z - POND.z) < POND.r + 4) continue;
      if (Math.hypot(x - START.x, z - START.z) < 6) continue;
      spots.push({ x, z, s: 0.9 + (i % 3) * 0.3, round: i % 2 === 0 });
    }
    const trunkGeo = new THREE.CylinderGeometry(0.14, 0.2, 1.4, 5);
    const roundGeo = new THREE.IcosahedronGeometry(1.15, 1);
    const coneGeo = new THREE.ConeGeometry(0.85, 2.3, 6);
    const trunkMat = new THREE.MeshStandardMaterial({ color: '#7a5a3c', roughness: 1, flatShading: true });
    const crownMat = new THREE.MeshStandardMaterial({ color: '#5fae7a', roughness: 0.9, flatShading: true });
    const crownMat2 = new THREE.MeshStandardMaterial({ color: '#8cc98a', roughness: 0.9, flatShading: true });
    const _m = new THREE.Matrix4();
    const _q = new THREE.Quaternion();
    const _s = new THREE.Vector3();
    const _p = new THREE.Vector3();
    const up = new THREE.Vector3(0, 1, 0);
    this.treeSpots = spots;
    spots.forEach((sp) => {
      this.controller.addCollider({ type: 'sphere', center: new THREE.Vector3(sp.x, 0, sp.z), radius: 0.3 * sp.s });
    });
    const rounds = spots.filter((s) => s.round);
    const cones = spots.filter((s) => !s.round);
    const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, spots.length);
    spots.forEach((sp, i) => {
      const y = this.terrainAt(sp.x, sp.z);
      _p.set(sp.x, y + 0.7 * sp.s, sp.z);
      _q.setFromAxisAngle(up, i * 1.3);
      _s.setScalar(sp.s);
      _m.compose(_p, _q, _s);
      trunks.setMatrixAt(i, _m);
    });
    trunks.instanceMatrix.needsUpdate = true;
    this.scene.add(trunks);
    const crownsA = new THREE.InstancedMesh(roundGeo, crownMat, rounds.length);
    rounds.forEach((sp, i) => {
      const y = this.terrainAt(sp.x, sp.z);
      _p.set(sp.x, y + 2.05 * sp.s, sp.z);
      _q.setFromAxisAngle(up, i * 0.9);
      _s.set(sp.s, sp.s * 0.9, sp.s);
      _m.compose(_p, _q, _s);
      crownsA.setMatrixAt(i, _m);
    });
    crownsA.instanceMatrix.needsUpdate = true;
    this.scene.add(crownsA);
    const crownsB = new THREE.InstancedMesh(coneGeo, crownMat2, cones.length);
    cones.forEach((sp, i) => {
      const y = this.terrainAt(sp.x, sp.z);
      _p.set(sp.x, y + 2.2 * sp.s, sp.z);
      _q.setFromAxisAngle(up, i * 0.7);
      _s.setScalar(sp.s);
      _m.compose(_p, _q, _s);
      crownsB.setMatrixAt(i, _m);
    });
    crownsB.instanceMatrix.needsUpdate = true;
    this.scene.add(crownsB);

    // los cinco arboles de los pajaros: mas grandes, copa redonda, con tronco propio
    this.birdTrees = BIRDS.map((b) => {
      const g = new THREE.Group();
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.3, 2.4, 6), trunkMat);
      trunk.position.y = 1.2;
      const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(1.9, 1), crownMat);
      crown.position.y = 3.3;
      crown.scale.set(1, 0.9, 1);
      g.add(trunk, crown);
      g.position.set(b.tree.x, this.terrainAt(b.tree.x, b.tree.z), b.tree.z);
      this.scene.add(g);
      this.controller.addCollider({ type: 'sphere', center: new THREE.Vector3(b.tree.x, 0, b.tree.z), radius: 0.5 });
      return g;
    });
  }

  /* ------------------------------------------------- las voces del bosque */

  makeBird(def) {
    const g = new THREE.Group();
    const body = new THREE.MeshStandardMaterial({ color: def.body, roughness: 0.8, flatShading: true });
    const belly = new THREE.MeshStandardMaterial({ color: def.belly, roughness: 0.8, flatShading: true });
    const head = new THREE.MeshStandardMaterial({ color: def.head ?? def.body, roughness: 0.8, flatShading: true });
    const beak = new THREE.MeshStandardMaterial({ color: def.beak ?? '#f2b544', roughness: 0.7, flatShading: true });
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), body);
    b.scale.set(1, 0.85, 1.35);
    g.add(b);
    const be = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 8), belly);
    be.position.set(0, -0.07, 0.04);
    be.scale.set(1, 0.8, 1.3);
    g.add(be);
    const h = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), head);
    h.position.set(0, 0.16, 0.24);
    g.add(h);
    const bk = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.16, 5), beak);
    bk.rotation.x = Math.PI / 2;
    bk.position.set(0, 0.14, 0.4);
    g.add(bk);
    const eyeMat = new THREE.MeshBasicMaterial({ color: '#111111' });
    [-0.07, 0.07].forEach((x) => {
      const e = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 5), eyeMat);
      e.position.set(x, 0.2, 0.33);
      g.add(e);
    });
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.03, 0.26), body);
    tail.position.set(0, 0.02, -0.34);
    tail.rotation.x = 0.35;
    g.add(tail);
    const wings = [-1, 1].map((s) => {
      const pivot = new THREE.Group();
      pivot.position.set(s * 0.14, 0.06, 0);
      const w = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.03, 0.24), body);
      w.position.x = s * 0.18;
      pivot.add(w);
      g.add(pivot);
      return { pivot, s };
    });
    g.scale.setScalar(def.size * 0.9);
    g.userData.wings = wings;
    return g;
  }

  /** Sapo: cuerpo achaparrado, ojos saltones y patas cortas; la garganta se hincha al croar */
  makeToad(def) {
    const g = new THREE.Group();
    const body = new THREE.MeshStandardMaterial({ color: def.body, roughness: 0.9, flatShading: true });
    const belly = new THREE.MeshStandardMaterial({ color: def.belly, roughness: 0.9, flatShading: true });
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8), body);
    b.scale.set(1.25, 0.62, 1.1);
    b.position.y = 0.18;
    g.add(b);
    const throat = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), belly);
    throat.position.set(0, 0.1, 0.26);
    g.add(throat);
    const eyeW = new THREE.MeshStandardMaterial({ color: '#f2e6a8', roughness: 0.6, flatShading: true });
    const eyeB = new THREE.MeshBasicMaterial({ color: '#111111' });
    [-0.14, 0.14].forEach((x) => {
      const e = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 6), eyeW);
      e.position.set(x, 0.38, 0.16);
      g.add(e);
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 5), eyeB);
      pupil.position.set(x, 0.39, 0.225);
      g.add(pupil);
    });
    // patas: delante cortas, detras dobladas y anchas
    [[-0.22, 0.2], [0.22, 0.2], [-0.3, -0.16], [0.3, -0.16]].forEach(([x, z], i) => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(i < 2 ? 0.08 : 0.16, 0.08, i < 2 ? 0.14 : 0.26), body);
      leg.position.set(x, 0.05, z);
      g.add(leg);
    });
    // manchas oscuras del lomo
    const spotMat = new THREE.MeshStandardMaterial({ color: '#4f6b28', roughness: 0.9, flatShading: true });
    [[-0.12, 0.34, -0.05], [0.1, 0.35, 0.02], [0.02, 0.33, -0.18]].forEach(([x, y, z]) => {
      const sp = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 5), spotMat);
      sp.position.set(x, y, z);
      sp.scale.y = 0.4;
      g.add(sp);
    });
    g.scale.setScalar(def.size);
    g.userData.throat = throat;
    return g;
  }

  /** Grillo: cuerpo alargado, antenas largas y dos patas traseras grandes (a escala de cuento, para que se vea) */
  makeCricket(def) {
    const g = new THREE.Group();
    const body = new THREE.MeshStandardMaterial({ color: def.body, roughness: 0.85, flatShading: true });
    const light = new THREE.MeshStandardMaterial({ color: def.belly, roughness: 0.85, flatShading: true });
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.16, 9, 7), body);
    b.scale.set(0.7, 0.6, 1.5);
    b.position.y = 0.12;
    g.add(b);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), body);
    head.position.set(0, 0.15, 0.24);
    g.add(head);
    const eyeB = new THREE.MeshBasicMaterial({ color: '#111111' });
    [-0.05, 0.05].forEach((x) => {
      const e = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 5), eyeB);
      e.position.set(x, 0.19, 0.3);
      g.add(e);
    });
    // antenas: dos varillas finas hacia delante y arriba, que se mecen
    const antennae = [-1, 1].map((sd) => {
      const a = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.012, 0.42, 4), light);
      a.position.set(sd * 0.04, 0.32, 0.36);
      a.rotation.x = -0.9;
      a.rotation.z = sd * 0.25;
      g.add(a);
      return a;
    });
    // patas traseras grandes y dobladas; delanteras pequenas
    [-1, 1].forEach((sd) => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.05, 0.3), body);
      leg.position.set(sd * 0.15, 0.2, -0.02);
      leg.rotation.x = 0.5;
      leg.rotation.z = sd * 0.45;
      g.add(leg);
      const shin = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.04, 0.26), light);
      shin.position.set(sd * 0.2, 0.06, 0.06);
      shin.rotation.x = -0.9;
      g.add(shin);
      const front = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.1, 0.03), light);
      front.position.set(sd * 0.1, 0.05, 0.16);
      g.add(front);
    });
    g.scale.setScalar(def.size);
    g.userData.antennae = antennae;
    return g;
  }

  buildAnimals() {
    this.animals = ANIMALS.map((def, i) => {
      const mesh = def.kind === 'bird' ? this.makeBird(def) : def.kind === 'toad' ? this.makeToad(def) : this.makeCricket(def);
      // escondite: dentro de la copa o a ras de suelo
      const at = hideout(def);
      const y = this.terrainAt(at.x, at.z) + (def.tree ? 3.4 : 0.05);
      mesh.position.set(at.x, y, at.z);
      mesh.visible = false;
      this.scene.add(mesh);
      // desde donde canta
      const anchor = new THREE.Object3D();
      anchor.position.set(at.x, y + (def.tree ? 0 : 0.3), at.z);
      this.scene.add(anchor);
      return {
        def, mesh, anchor, index: i,
        state: 'hidden',          // hidden → moving → perched
        lock: 0,
        nextSing: 2 + Math.random() * 3,
        singing: 0,
        flight: null,
        perch: null,
        tries: 0
      };
    });
  }

  /** Donde se posa cada voz junto al jugador: un tocon para los pajaros, una piedra plana para el sapo y el grillo */
  makePerch(x, z, kind) {
    const y = this.terrainAt(x, z);
    const stump = kind === 'bird';
    const mesh = new THREE.Mesh(
      stump ? new THREE.CylinderGeometry(0.16, 0.22, 0.7, 6) : new THREE.CylinderGeometry(0.42, 0.5, 0.2, 7),
      new THREE.MeshStandardMaterial({ color: stump ? '#8a6238' : '#b9c1c4', roughness: 1, flatShading: true })
    );
    mesh.position.set(x, y + (stump ? 0.35 : 0.08), z);
    this.scene.add(mesh);
    return { mesh, top: new THREE.Vector3(x, y + (stump ? 0.72 : 0.18), z) };
  }

  /* ------------------------------------------------------------ estanque */

  buildPond() {
    const padMat = () => new THREE.MeshStandardMaterial({ color: '#4fae6a', roughness: 0.85, flatShading: true, emissive: '#000000' });
    const flowerMats = ['#f7a8c4', '#fff0a8', '#ffffff'].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.7, flatShading: true }));
    this.pads = PADS.map((def, i) => {
      const x = POND.x + Math.cos(def.a) * def.r;
      const z = POND.z + Math.sin(def.a) * def.r;
      const g = new THREE.Group();
      const mat = padMat();
      const leaf = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.9, 0.08, 12), mat);
      g.add(leaf);
      // muesca del nenufar: una cuna oscura
      const notch = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.1, 0.6), this.pondMat);
      notch.position.set(0.55, 0.005, 0.5);
      notch.rotation.y = -0.7;
      g.add(notch);
      if (i % 2 === 0) {
        const flower = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.22, 6), flowerMats[i % 3]);
        flower.position.set(-0.5, 0.15, -0.3);
        g.add(flower);
      }
      g.position.set(x, POND.y + 0.04, z);
      this.scene.add(g);
      return { def, x, z, group: g, mat, glow: 0, flash: 0 };
    });

    // la piedra del eco, en el centro: guarda la melodia y la devuelve
    const stoneMat = new THREE.MeshStandardMaterial({ color: '#8fa9b5', roughness: 0.6, flatShading: true, emissive: '#7fd1ff', emissiveIntensity: 0 });
    this.echoStone = new THREE.Mesh(new THREE.DodecahedronGeometry(0.8, 0), stoneMat);
    this.echoStone.position.set(POND.x, POND.y + 0.35, POND.z);
    this.scene.add(this.echoStone);
    this.controller.addCollider({ type: 'sphere', center: new THREE.Vector3(POND.x, 0, POND.z), radius: 0.9 });
    this.echoInteractable = this.interactable({
      object: this.echoStone,
      radius: 2.6,
      icon: '🎵',
      label: 'Escuchar mi melodía',
      onInteract: () => this.replayMelody()
    });
    this.echoInteractable.enabled = false;

    // arroyo que entra al estanque por el norte: agua fina, brillante
    const brookMat = new THREE.MeshStandardMaterial({ color: '#7fd1ff', transparent: true, opacity: 0.7, roughness: 0.2 });
    const brook = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 14), brookMat);
    brook.rotation.x = -Math.PI / 2;
    brook.position.set(POND.x + 1, POND.y + 0.02, POND.z - POND.r - 6.5);
    this.scene.add(brook);
    this.brookSpot = new THREE.Object3D();
    this.brookSpot.position.set(POND.x + 1, POND.y + 0.5, POND.z - POND.r - 1);
    this.scene.add(this.brookSpot);

    // anillos de luz reutilizables: uno por nota que suena
    const ringGeo = new THREE.RingGeometry(0.6, 0.78, 32);
    this.ripplePool = [];
    for (let i = 0; i < 6; i += 1) {
      const m = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
      m.rotation.x = -Math.PI / 2;
      m.visible = false;
      this.scene.add(m);
      this.ripplePool.push(m);
    }
  }

  /* ------------------------------------------------------------- detalle */

  buildDecor() {
    const up = new THREE.Vector3(0, 1, 0);
    const _m = new THREE.Matrix4();
    const _q = new THREE.Quaternion();
    const _s = new THREE.Vector3();
    const _p = new THREE.Vector3();
    const place = (mesh, i, x, z, s, ry = 0, dy = 0) => {
      _p.set(x, this.terrainAt(x, z) + dy, z);
      _q.setFromAxisAngle(up, ry);
      _s.setScalar(s);
      _m.compose(_p, _q, _s);
      mesh.setMatrixAt(i, _m);
    };
    // las instancias que no se colocan quedarian en el origen: se anulan
    const hideRest = (mesh) => {
      _s.setScalar(0);
      _m.compose(_p.set(0, -50, 0), _q.identity(), _s);
      for (let i = 0; i < mesh.count; i += 1) mesh.setMatrixAt(i, _m);
    };
    // juncos en las orillas
    const reedGeo = new THREE.ConeGeometry(0.06, 1.1, 4);
    const reedMat = new THREE.MeshStandardMaterial({ color: '#6fa864', roughness: 1, flatShading: true });
    const reeds = new THREE.InstancedMesh(reedGeo, reedMat, 160);
    hideRest(reeds);
    for (let i = 0; i < 160; i += 1) {
      const lakeSide = i < 110;
      const c = lakeSide ? LAKE : POND;
      const a = (i * 0.61) % (Math.PI * 2);
      if (lakeSide && Math.abs(Math.sin(a)) > 0.94 && Math.cos(a) < 0) continue;    // el muelle queda libre
      const r = (lakeSide ? LAKE.r : POND.r) + 0.2 + (i % 3) * 0.35;
      place(reeds, i, c.x + Math.cos(a) * r, c.z + Math.sin(a) * r, 0.8 + (i % 4) * 0.2, a, 0.45);
    }
    reeds.instanceMatrix.needsUpdate = true;
    this.scene.add(reeds);
    // rocas claras
    const rockGeo = new THREE.DodecahedronGeometry(0.5, 0);
    const rockMat = new THREE.MeshStandardMaterial({ color: '#b9c1c4', roughness: 1, flatShading: true });
    const rocks = new THREE.InstancedMesh(rockGeo, rockMat, 40);
    hideRest(rocks);
    for (let i = 0; i < 40; i += 1) {
      const a = i * 0.9;
      const r = 19 + (i % 7) * 3.2;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      if (Math.hypot(x - START.x, z - START.z) < 5) continue;
      place(rocks, i, x, z, 0.5 + (i % 3) * 0.35, a * 2, 0.1);
    }
    rocks.instanceMatrix.needsUpdate = true;
    this.scene.add(rocks);
    // flores pastel en los prados
    const flowerGeo = new THREE.SphereGeometry(0.11, 5, 4);
    const flowerMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.8, vertexColors: false, flatShading: true });
    const flowers = new THREE.InstancedMesh(flowerGeo, flowerMat, 220);
    hideRest(flowers);
    const palette = [new THREE.Color('#f7a8c4'), new THREE.Color('#fff0a8'), new THREE.Color('#b8d8ff'), new THREE.Color('#ffffff')];
    for (let i = 0; i < 220; i += 1) {
      const a = i * 2.1;
      const r = 18 + ((i * 7) % 26);
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      if (Math.hypot(x - FOREST.x, z - FOREST.z) < FOREST.r) continue;
      if (Math.hypot(x - POND.x, z - POND.z) < POND.r + 1.5) continue;
      place(flowers, i, x, z, 1, 0, 0.12);
      flowers.setColorAt(i, palette[i % 4]);
    }
    flowers.instanceMatrix.needsUpdate = true;
    if (flowers.instanceColor) flowers.instanceColor.needsUpdate = true;
    this.scene.add(flowers);

    // campanas de viento colgadas de un poste junto al inicio
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 2.6, 6), new THREE.MeshStandardMaterial({ color: '#8a6238', roughness: 1, flatShading: true }));
    post.position.set(START.x + 3, this.terrainAt(START.x + 3, START.z - 2) + 1.3, START.z - 2);
    this.scene.add(post);
    const tubeMat = new THREE.MeshStandardMaterial({ color: '#d9e4ea', roughness: 0.35, metalness: 0.6, flatShading: true });
    this.chimes = [];
    for (let i = 0; i < 4; i += 1) {
      const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.5 + i * 0.12, 6), tubeMat);
      tube.position.set(post.position.x + (i - 1.5) * 0.14, post.position.y + 0.7, post.position.z + 0.2);
      this.scene.add(tube);
      this.chimes.push(tube);
    }
    this.chimeSpot = post;

    // faro de luz que senala el siguiente lugar
    const beaconMat = new THREE.MeshBasicMaterial({ color: '#bfe9ff', transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    this.beacon = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.9, 16, 12, 1, true), beaconMat);
    this.beacon.visible = false;
    this.scene.add(this.beacon);
  }

  /* ----------------------------------------------------------------- HUD */

  buildHud() {
    this.quietBar = this.addBar('quiet', { icon: '🍃', color: '#8be0c8', value: 0 });
    this.quietBar.show(false);

    this.stageEl = document.createElement('div');
    this.stageEl.className = 'cl-stage';
    this.stageEl.hidden = true;
    this.el.hud.appendChild(this.stageEl);

    this.focusEl = document.createElement('div');
    this.focusEl.className = 'cl-focus';
    this.focusEl.innerHTML = '<i></i><span>escuchando…</span>';
    this.focusEl.hidden = true;
    this.el.hud.appendChild(this.focusEl);

    this.melodyEl = document.createElement('div');
    this.melodyEl.className = 'cl-melody';
    this.melodyEl.hidden = true;
    this.el.hud.appendChild(this.melodyEl);
  }

  showBanner(text, ms = 3600) {
    this.stageEl.textContent = text;
    this.stageEl.hidden = false;
    this.stageEl.classList.remove('is-out');
    clearTimeout(this._bannerT);
    this._bannerT = this.later(() => {
      this.stageEl.classList.add('is-out');
      this.later(() => { this.stageEl.hidden = true; }, 500);
    }, ms);
  }

  renderMelody() {
    if (!this.melody.length) { this.melodyEl.hidden = true; return; }
    this.melodyEl.hidden = false;
    this.melodyEl.innerHTML = this.melody.slice(-16).map((n) => `<i style="--c:${n.color}"></i>`).join('') +
      `<b>${this.melody.length}/${MIN_NOTES}${this.melody.length >= MIN_NOTES ? ' ✓' : ''}</b>`;
  }

  /* ================================================================ notas */

  /**
   * Notas en cola, con tiempo de lectura holgado: cada una espera a que la
   * anterior se cierre (sola al acabar su tiempo, o con la aspa). El tiempo
   * solo corre con el juego en marcha. Devuelve una promesa al cerrarse.
   */
  showNote({ title = '', text = '', seconds = 0 } = {}) {
    return new Promise((resolve) => {
      this.noteQueue.push({ title, text, seconds, resolve });
      this.pumpNotes();
    });
  }

  pumpNotes() {
    if (this.noteNow || !this.noteQueue.length || this.finished) return;
    const n = this.noteQueue.shift();
    const words = `${n.title} ${n.text}`.replace(/<[^>]+>/g, ' ').trim().split(/\s+/).filter(Boolean).length;
    // leer con calma: casi un segundo por palabra, mas un margen para empezar
    const seconds = Math.min(60, Math.max(n.seconds, 7 + words * 0.9));
    const el = document.createElement('div');
    el.className = 'i3d-note';
    el.style.setProperty('--dur', `${seconds}s`);
    el.innerHTML = `
      ${n.title ? `<p class="i3d-note__title">${n.title}</p>` : ''}
      <p class="i3d-note__text">${n.text}</p>
      <button class="i3d-note__x" type="button" aria-label="Cerrar">&times;</button>
      <span class="i3d-note__bar" aria-hidden="true"></span>
    `;
    this.el.notes.appendChild(el);
    this.noteNow = { el, left: seconds, resolve: n.resolve };
    el.querySelector('.i3d-note__x').addEventListener('click', () => this.closeNote());
  }

  /** Cierra la nota visible (y avisa a quien la esperaba) */
  closeNote() {
    const n = this.noteNow;
    if (!n) return;
    this.noteNow = null;
    n.el.classList.add('is-out');
    this.later(() => n.el.remove(), 300);
    n.resolve();
    this.later(() => this.pumpNotes(), 500);
  }

  /** Quita la nota actual y las pendientes sin esperar (cambio de situacion) */
  clearNotes() {
    this.noteQueue.length = 0;
    this.closeNote();
  }

  updateNotes(dt) {
    if (!this.noteNow) return;
    this.noteNow.left -= dt;
    if (this.noteNow.left <= 0) this.closeNote();
  }

  togglePause(on) {
    super.togglePause(on);
    // la barra de tiempo de la nota se detiene con el juego
    this.el.notes?.classList.toggle('is-paused', this.paused);
  }

  /* ============================================================== inicio */

  async onStart() {
    await this.showIntro({
      eyebrow: 'Isla de la Calma',
      goal: 'Escucha la isla: el lago, las voces del bosque y el estanque',
      hint: 'Aquí no hay prisa. Cuanto más despacio vayas, más cosas se dejan ver y oír.',
      keys: [['W A S D', 'moverte'], ['Ratón', 'mirar'], ['E', 'sentarte en el banco'], ['Quieto', 'las voces cantan para ti']],
      touch: [['Joystick', 'moverte'], ['Arrastra', 'mirar'], ['E', 'sentarte en el banco'], ['Quieto', 'las voces cantan para ti']]
    });
    this.startSound();
    this.enterStage(0);
  }

  startSound() {
    this.lakeRoughSfx = this.audio.ambient('lakeRough', { volume: AMBIENT.rough });
    this.lakeCalmSfx = this.audio.ambient('lakeCalm', { volume: 0.08 });
    this.leavesSfx = this.audio.ambient('leaves', { volume: AMBIENT.leaves, rate: 0.9 });
    this.brookSfx = this.audio.playAt('brook', this.brookSpot, { volume: AMBIENT.brook, refDistance: 3.5, loop: true });
    this.music = new CalmMusic(this.audio);
    this.music.setVolume(AMBIENT.music);
    this.music.start();
    this.music.setLayers(1);
    this.setMix(MIX.lake);
  }

  /**
   * Mezcla del ambiente segun la actividad: cada una manda sobre el fondo.
   * En el estanque se apaga todo lo que no sea la melodia.
   */
  setMix(opts) {
    this.mix = { ...opts };
    const ctx = this.audio.ctx;
    this.leavesSfx?.setVolume(AMBIENT.leaves * opts.leaves, 1.2);
    if (this.brookSfx?.gain && ctx) this.brookSfx.gain.gain.setTargetAtTime(AMBIENT.brook * opts.brook, ctx.currentTime, 1);
    this.music?.setVolume(AMBIENT.music * opts.music, 1.5);
    this.music?.setSolo(opts.solo);
  }

  /* =============================================================== etapas */

  enterStage(i) {
    this.stage = i;
    const s = STAGES[i];
    this.showBanner(s.banner);
    if (i === 0) {
      this.setObjective(1, '🌊');
      this.seatInteractable.enabled = true;
      this.pointBeacon(SEAT.x, SEAT.z);
      this.later(() => this.showNote({
        title: 'El lago está revuelto',
        text: 'Camina hasta el final del muelle y siéntate en el banco. Desde ahí vamos a calmar el agua.'
      }), 1200);
    } else if (i === 1) {
      this.setObjective(ANIMALS.length, '👂');
      this.setMix(MIX.voices);
      this.quietBar.show(true);
      this.pointBeacon(FOREST.x + 4, FOREST.z);
      this.later(() => this.showNote({
        title: 'Siete voces escondidas',
        text: 'En el bosque del oeste viven cinco pájaros, un sapo y un grillo, y solo cantan si te quedas quieto. No hace falta buscarlos: entra en el bosque, párate y escucha. Cuando una voz cante, te preguntaré de quién era: fíjate en cómo suena.'
      }), 1200);
    } else if (i === 2) {
      this.setObjective(MIN_NOTES, '♪');
      this.setMix(MIX.pond);
      this.quietBar.show(false);
      this.pointBeacon(POND.x - 4, POND.z + 5);
      this.later(() => this.showNote({
        title: 'El estanque musical',
        text: 'En el estanque del este flotan nenúfares: cada uno es una nota. Písalos en el orden que quieras y compón tu melodía. Aquí todo suena bien.'
      }), 1200);
    }
  }

  pointBeacon(x, z) {
    this.beacon.position.set(x, this.terrainAt(x, z) + 8, z);
    this.beacon.visible = true;
    this.beaconTarget = { x, z };
  }

  updateBeacon(dt) {
    if (!this.beacon.visible) return;
    const p = this.controller.position;
    this.beacon.material.opacity = 0.16 + Math.sin(this.time * 2) * 0.06;
    if (this.beaconTarget && Math.hypot(p.x - this.beaconTarget.x, p.z - this.beaconTarget.z) < 7) this.beacon.visible = false;
    void dt;
  }

  /* --------------------------------------------------- 1 · el lago espejo */

  sit() {
    if (this.sitting || this.stage !== 0) return;
    this.sitting = true;
    this.seatInteractable.enabled = false;
    const c = this.controller;
    c.frozen = true;
    c.exitPointerLock();
    c.velocity.set(0, 0, 0);
    c.setPosition(SEAT.x, DOCK.y, SEAT.z - 0.55);
    c.yaw = Math.atan2(-(LAKE.x - 1.5 - c.position.x), -(LAKE.z - 12 - c.position.z));
    c.pitch = -0.1;
    this.feedback.tweenValue(c.cfg, 'eyeHeight', 1.05, 0.9);
    this.audio.play('interact', { volume: 0.25, rate: 0.8 });
    this.clearNotes();
    this.say('MIRA EL AGUA', 2600);
    const run = this.runId;
    this.later(() => {
      // la respiracion empieza cuando la nota se ha leido (o se cierra con la aspa)
      this.showNote({
        title: 'Así se pone la cabeza cuando va rápido',
        text: 'El agua no para. Respira con el círculo: cada vez que sueltes el aire, el lago se calmará un poco más.'
      }).then(() => {
        if (this.finished || run !== this.runId || this.stage !== 0) return;
        this.breathPause.run({
          cycles: 3,
          title: 'El lago espejo',
          subtitle: 'Con cada exhalación el agua se aquieta',
          skippable: false,
          onPhase: (phase, cycle) => {
            if (phase === 'out') this.calmTarget = 1 - (cycle + 1) / 3;
          }
        }).then(() => { if (run === this.runId) this.lakeCalmed(); });
      });
    }, 900);
  }

  lakeCalmed() {
    if (this.finished) return;
    this.calmTarget = 0;
    this.controller.frozen = true;          // sigue sentado mientras mira el espejo
    this.feedback.tweenValue(this.sunPath.material, 'opacity', 0.5, 3.5);
    this.feedback.tweenValue(this.sunDisc.material, 'opacity', 0.75, 3.5);
    this.audio.play('success', { volume: 0.35 });
    this.audio.play('windChime', { volume: 0.28 });
    this.music.setLayers(2);
    this.say('EL AGUA ES UN ESPEJO', 3000);
    const run = this.runId;
    this.later(() => {
      this.showNote({
        title: 'Mira: el agua refleja el cielo',
        text: 'Cuando respiras despacio, tú también te aclaras. Eso es la calma: no es que no pase nada, es que el agua está quieta y se puede ver el fondo.'
      }).then(() => {
        if (this.finished || run !== this.runId) return;
        this.feedback.tweenValue(this.controller.cfg, 'eyeHeight', 1.5, 0.8);
        this.controller.frozen = false;
        this.sitting = false;
        this.advanceObjective();
        completeActivity('calm-lago', 10);
        this.later(() => this.enterStage(1), 1400);
      });
    }, 1400);
  }

  updateLake(dt) {
    // el agua persigue la calma pedida, despacio: nada cambia de golpe
    const k = Math.min(1, dt * 0.45);
    this.agitation += (this.calmTarget - this.agitation) * k;
    const agit = this.agitation;
    const m = this.mix?.lake ?? 1;
    this.lakeRoughSfx?.setVolume(AMBIENT.rough * agit * agit * m, 0.8);
    this.lakeCalmSfx?.setVolume((0.08 + AMBIENT.calm * (1 - agit)) * m, 0.8);
  }

  /* --------------------------------------------------- 2 · ¿quien canta? */

  updateQuiet(dt) {
    const c = this.controller;
    const speed = Math.hypot(c.velocity.x, c.velocity.z);
    const running = c.isRunning && speed > 4;
    if (running) {
      if (this.quiet > 0.5 && this.stage === 1 && this.inForest() && !this.quiz) {
        this.say('CORRIENDO SE CALLAN', 2400);
        this.audio.play('flutter', { volume: 0.5 });
        this.hushUntil = this.time + 4;
      }
      this.quiet = Math.max(0, this.quiet - dt * 1.4);
    } else if (speed > 0.5) {
      this.quiet = Math.max(0, this.quiet - dt * 0.22);
    } else {
      this.quiet = Math.min(1, this.quiet + dt * 0.42);
    }
    this.quietBar.set(this.quiet);
  }

  inForest() {
    const p = this.controller.position;
    return Math.hypot(p.x - FOREST.x, p.z - FOREST.z) < FOREST.r + 4;
  }

  updateAnimals(dt) {
    const p = this.controller.position;
    const canSing = this.quiet >= QUIET_TO_SING && this.time > this.hushUntil && !this.quiz;

    this.animals.forEach((a) => {
      const ud = a.mesh.userData;
      if (a.mesh.visible) {
        // volando aletea; posado lleva las alas plegadas al cuerpo
        ud.wings?.forEach(({ pivot, s }) => {
          pivot.rotation.z = a.state === 'moving'
            ? s * Math.sin(this.time * 26) * 0.9
            : -s * (1.25 + Math.sin(this.time * 3 + a.index) * 0.04);
        });
        // el sapo hincha la garganta al croar; el grillo mece las antenas
        if (ud.throat) ud.throat.scale.setScalar(a.singing > 0 ? 1 + 0.7 * Math.abs(Math.sin(this.time * 14)) : 1);
        ud.antennae?.forEach((an, i) => { an.rotation.x = -0.9 + Math.sin(this.time * 3 + i * 1.7) * 0.18; });
      }
      if (a.singing > 0) {
        a.singing -= dt;
        if (a.def.kind === 'bird') a.mesh.rotation.x = Math.sin(this.time * 18) * 0.06;
      }

      if (a.state === 'hidden' && this.stage === 1) {
        // fuera de turno cantan de fondo, mas bajito, para que el bosque viva
        a.nextSing -= dt;
        if (a.nextSing <= 0) {
          a.nextSing = a.def.every[0] + Math.random() * (a.def.every[1] - a.def.every[0]);
          if (canSing && !this.turno) {
            this.audio.playAt(a.def.sound, a.anchor, { volume: 0.2 + 0.25 * this.quiet, refDistance: 7 });
            a.singing = 0.8;
          }
        }
      } else if (a.state === 'moving' && a.flight) {
        const f = a.flight;
        f.t = Math.min(1, f.t + dt / f.dur);
        a.mesh.position.lerpVectors(f.from, f.to, f.hops ? f.t : smooth(f.t));
        // los pajaros trazan un arco; el sapo y el grillo van a saltos
        a.mesh.position.y += f.hops
          ? Math.abs(Math.sin(f.t * Math.PI * f.hops)) * f.height
          : Math.sin(f.t * Math.PI) * 1.6;
        a.mesh.lookAt(f.to.x, a.mesh.position.y, f.to.z);
        if (f.t >= 1) {
          a.state = 'perched';
          a.flight = null;
          a.mesh.position.copy(f.to);
          a.mesh.lookAt(p.x, f.to.y, p.z);
          a.nextSing = 1 + Math.random();
        }
      } else if (a.state === 'perched') {
        // posado: mira al jugador y canta de vez en cuando (no durante la melodia)
        a.nextSing -= dt;
        if (a.nextSing <= 0) {
          a.nextSing = 9 + Math.random() * 10;
          if (this.mix?.extras) {
            this.audio.playAt(a.def.sound, a.mesh, { volume: 0.3, refDistance: 4 });
            a.singing = 0.8;
          }
        }
        if (a.def.kind === 'bird') a.mesh.position.y = a.perch.top.y + Math.sin(this.time * 2.2 + a.index) * 0.015;
      }
    });

    this.updateTurno(dt, canSing);
  }

  /**
   * «Sientate y escucha»: no hay que buscar al animal ni mirar hacia el. Si te
   * quedas quieto en el bosque, una voz canta para ti (dos veces) y despues se
   * pregunta de quien era. Si te mueves, el turno se cancela y vuelve la calma.
   */
  updateTurno(dt, canSing) {
    if (this.stage !== 1 || this.quiz) { this.focusEl.hidden = true; return; }
    if (!canSing || !this.inForest()) {
      if (this.turno) { this.turno = null; this.focusEl.hidden = true; }
      return;
    }
    if (!this.turno) {
      const pendientes = this.animals.filter((a) => a.state === 'hidden');
      if (!pendientes.length) { this.focusEl.hidden = true; return; }
      const a = pendientes[Math.floor(Math.random() * pendientes.length)];
      this.turno = { animal: a, t: 0, cantos: 0 };
    }
    const t = this.turno;
    t.t += dt;
    // canta al empezar el turno y otra vez a la mitad; luego, la pregunta
    if (t.cantos === 0 || (t.cantos === 1 && t.t > LISTEN_SECONDS * 0.5)) {
      t.cantos += 1;
      this.audio.playAt(t.animal.def.sound, t.animal.anchor, { volume: 0.85, refDistance: 9 });
      t.animal.singing = 0.8;
      t.animal.lastSang = this.time;
    }
    this.focusEl.hidden = false;
    this.focusEl.style.setProperty('--p', Math.min(1, t.t / LISTEN_SECONDS).toFixed(3));
    if (t.t >= LISTEN_SECONDS) {
      const a = t.animal;
      this.turno = null;
      this.focusEl.hidden = true;
      this.askWho(a);
    }
  }

  /* ------------------------------------------------------- ¿quien canta? */

  /** Opciones de la pregunta: la voz correcta, al menos una de otra familia (pajaro / no pajaro) y el resto al azar */
  quizOptions(a) {
    const isBird = a.def.kind === 'bird';
    const others = ANIMALS.filter((d) => d !== a.def);
    const otherKind = others.filter((d) => (d.kind === 'bird') !== isBird);
    const pick = [otherKind[Math.floor(Math.random() * otherKind.length)]];
    const rest = others.filter((d) => !pick.includes(d)).sort(() => Math.random() - 0.5);
    while (pick.length < 3) pick.push(rest.pop());
    return [a.def, ...pick].sort(() => Math.random() - 0.5);
  }

  /** «el sapo», «la tórtola»: el articulo de cada voz */
  named(def) {
    return `${def.id === 'tortola' ? 'la' : 'el'} ${def.name.toLowerCase()}`;
  }

  /**
   * Localizada la voz, hay que decir de quien es. Se elige entre cuatro
   * opciones que describen como suena cada una (no hace falta saberse los
   * nombres: se escucha y se compara). Fallar no quita nada: da una pista y
   * la voz vuelve a sonar. Al acertar, el animal aparece y viene.
   */
  askWho(a) {
    if (this.quiz || a.state !== 'hidden') return;
    a.lock = 0;
    this.focusEl.hidden = true;
    const c = this.controller;
    c.frozen = true;
    c.exitPointerLock();
    c.velocity.set(0, 0, 0);
    this._resetStick?.();
    this.releaseButtons?.();
    this.clearNotes();
    this.audio.duck(0.4);

    const options = this.quizOptions(a);
    const layer = document.createElement('div');
    layer.className = 'cl-who';
    layer.innerHTML = `
      <div class="cl-who__card" role="dialog" aria-label="¿Quién canta?">
        <p class="cl-who__eyebrow">👂 ¿Quién canta?</p>
        <div class="cl-who__options">
          ${options.map((d, i) => `
            <button class="cl-who__opt" type="button" data-id="${d.id}" style="--c:${d.body}">
              <span class="cl-who__ico" aria-hidden="true">${d.emoji}</span>
              <strong><kbd>${i + 1}</kbd> ${d.name}</strong>
              <small>${d.desc}</small>
            </button>`).join('')}
        </div>
        <button class="i3d-btn cl-who__replay" type="button" data-replay>🔊 Oír otra vez</button>
        <p class="cl-who__hint" data-hint>Escucha con atención: ¿es agudo o grave? ¿sube, baja o se repite?</p>
      </div>`;
    this.root.appendChild(layer);
    const hint = layer.querySelector('[data-hint]');
    const buttons = [...layer.querySelectorAll('[data-id]')];

    const sing = () => {
      this.audio.playAt(a.def.sound, a.anchor, { volume: 0.9, refDistance: 7 });
      a.singing = 0.8;
    };
    const onKey = (e) => {
      const n = Number(e.key);
      if (n >= 1 && n <= buttons.length) buttons[n - 1].click();
      else if (e.key.toLowerCase() === 'r') sing();
    };
    const close = () => {
      if (this.quiz !== q) return;
      this.quiz = null;
      window.removeEventListener('keydown', onKey);
      layer.classList.add('is-out');
      setTimeout(() => layer.remove(), 380);
      this.audio.unduck();
      c.frozen = false;
    };
    const q = { animal: a, layer, close };
    this.quiz = q;
    window.addEventListener('keydown', onKey);
    layer.querySelector('[data-replay]').addEventListener('click', sing);
    buttons.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        if (this.quiz !== q || btn.disabled) return;
        if (btn.dataset.id !== a.def.id) {
          // no es: pista concreta de como suena y otra escucha
          a.tries += 1;
          btn.disabled = true;
          btn.classList.add('is-wrong');
          hint.textContent = `Ese no es. ${a.def.clue}`;
          this.audio.play('soften', { volume: 0.35 });
          this.later(sing, 500);
          return;
        }
        btn.classList.add('is-right');
        buttons.forEach((b) => { b.disabled = true; });
        hint.textContent = `${a.tries ? '¡Eso es!' : '¡A la primera!'} Es ${this.named(a.def)}.`;
        this.audio.play('collect', { volume: 0.45 });
        // con raton, el puntero vuelve a quedar capturado sin otro clic
        if (!e.pointerType || e.pointerType === 'mouse') this.later(() => c.requestPointerLock(), 60);
        this.later(() => { close(); this.revealAnimal(a); }, 900);
      });
    });
    sing();
  }

  revealAnimal(a) {
    if (a.state !== 'hidden') return;
    a.state = 'moving';
    a.lock = 0;
    const p = this.controller.position;
    this.camera.getWorldDirection(_dir);
    // aparece en su escondite y viene a posarse delante del jugador
    a.mesh.visible = true;
    a.mesh.position.copy(a.anchor.position);
    if (!a.def.tree) a.mesh.position.y -= 0.25;
    this.feedback.burst(a.anchor.position, { count: 18, color: '#8cc98a', speed: 2.2, life: 1, size: 0.7, gravity: -1.5 });
    this.audio.playAt(a.def.sound, a.anchor, { volume: 0.8, refDistance: 6 });
    if (a.def.kind === 'bird') this.audio.play('flutter', { volume: 0.35 });
    // el sitio: delante del jugador si hay hueco; si no, se prueban otros angulos
    const base = Math.atan2(_dir.x, _dir.z);
    let px = p.x;
    let pz = p.z;
    const free = (x, z) =>
      Math.hypot(x - LAKE.x, z - LAKE.z) > LAKE.r + 1 &&
      !this.treeSpots.some((sp) => Math.hypot(sp.x - x, sp.z - z) < 1.6) &&
      !ANIMALS.some((d) => Math.hypot(hideout(d).x - x, hideout(d).z - z) < 2.2) &&
      !this.animals.some((o) => o.perch && Math.hypot(o.perch.top.x - x, o.perch.top.z - z) < 1.2);
    for (const off of [0, 0.5, -0.5, 1, -1, 1.6, -1.6, Math.PI]) {
      const x = p.x + Math.sin(base + off) * 2.6;
      const z = p.z + Math.cos(base + off) * 2.6;
      if (free(x, z)) { px = x; pz = z; break; }
    }
    a.perch = this.makePerch(px, pz, a.def.kind);
    const from = a.mesh.position.clone();
    const to = a.perch.top.clone();
    const far = from.distanceTo(to);
    a.flight = a.def.kind === 'bird'
      ? { from, to, t: 0, dur: 1.6 }
      : a.def.kind === 'toad'
        ? { from, to, t: 0, dur: 0.9 + far * 0.16, hops: Math.max(3, Math.round(far / 2.2)), height: 0.55 }
        : { from, to, t: 0, dur: 0.7 + far * 0.1, hops: Math.max(4, Math.round(far / 1.4)), height: 0.35 };
    a.mesh.lookAt(a.perch.top);
    this.say(`¡${a.def.name.toUpperCase()}!`, 2400);
    this.later(() => this.showNote({ title: a.def.name, text: a.def.text }), 1500);

    const found = this.advanceObjective();
    completeActivity(`calm-voz-${a.def.id}`, 3);
    if (found) this.later(() => this.voicesDone(), 2600);
  }

  voicesDone() {
    if (this.finished || this.stage !== 1) return;
    // las siete cantan juntas, en cascada
    this.animals.forEach((a, i) => {
      this.later(() => this.audio.playAt(a.def.sound, a.mesh, { volume: 0.5, refDistance: 6 }), i * 550);
    });
    this.audio.play('windChime', { volume: 0.26 });
    this.music.setLayers(3);
    this.later(() => {
      this.showNote({
        title: 'Las siete voces cantaron para ti',
        text: 'No las perseguiste: bajaste el ritmo, escuchaste y supiste quién era cada una. Así funciona la calma. Ahora el estanque del este te espera.'
      });
      completeActivity('calm-voces', 10);
      this.later(() => this.enterStage(2), 3000);
    }, 4200);
  }

  /* ------------------------------------------------ 3 · el estanque musical */

  updatePond(dt) {
    const p = this.controller.position;
    let onPad = null;
    for (let i = 0; i < this.pads.length; i += 1) {
      const pad = this.pads[i];
      const d = Math.hypot(p.x - pad.x, p.z - pad.z);
      if (d < 0.95) onPad = pad;
      // brillo que se apaga
      if (pad.flash > 0) {
        pad.flash = Math.max(0, pad.flash - dt * 1.6);
        pad.mat.emissive.set(pad.def.color);
        pad.mat.emissiveIntensity = pad.flash * 0.9;
        pad.group.position.y = POND.y + 0.04 - Math.sin(pad.flash * Math.PI) * 0.06;
      }
    }
    if (onPad && onPad !== this.lastPad && !this.replaying) {
      this.lastPad = onPad;
      this.playPad(onPad, true);
    } else if (!onPad) {
      this.lastPad = null;
    }
    // anillos de luz
    for (let i = this.ripples.length - 1; i >= 0; i -= 1) {
      const r = this.ripples[i];
      r.t += dt;
      const u = r.t / 1.3;
      if (u >= 1) { r.mesh.visible = false; this.ripples.splice(i, 1); continue; }
      const s = 1 + u * 4.5;
      r.mesh.scale.set(s, s, 1);
      r.mesh.material.opacity = (1 - u) * 0.75;
    }
    // la piedra del eco late cuando ya hay melodia
    if (this.echoInteractable.enabled) {
      this.echoStone.material.emissiveIntensity = 0.5 + Math.sin(this.time * 3) * 0.3;
      this.echoStone.rotation.y += dt * 0.4;
    }
  }

  playPad(pad, record) {
    this.music.playNote(pad.def.midi, 1);
    pad.flash = 1;
    const ring = this.ripplePool.find((m) => !m.visible);
    if (ring) {
      ring.visible = true;
      ring.material.color.set(pad.def.color);
      ring.material.opacity = 0.75;
      ring.scale.set(1, 1, 1);
      ring.position.set(pad.x, POND.y + 0.06, pad.z);
      this.ripples.push({ mesh: ring, t: 0 });
    }
    this.feedback.burst(new THREE.Vector3(pad.x, POND.y + 0.3, pad.z), { count: 10, color: pad.def.color, speed: 1.6, life: 0.9, size: 0.6, gravity: -2 });
    if (!record) return;
    if (this.melody.length < MAX_NOTES) {
      this.melody.push({ midi: pad.def.midi, color: pad.def.color, at: this.time, pad });
      this.renderMelody();
      if (this.objective.done < MIN_NOTES) this.advanceObjective();
      if (this.melody.length === MIN_NOTES) {
        this.echoInteractable.enabled = true;
        this.say('YA TIENES UNA MELODÍA', 2800);
        this.later(() => this.showNote({
          title: 'La piedra del eco',
          text: 'Puedes seguir tocando nenúfares o acercarte a la piedra del centro: te devolverá tu melodía tal como la tocaste.'
        }), 1200);
      }
    } else if (this.melody.length === MAX_NOTES && !this.fullNoted) {
      this.fullNoted = true;
      this.say('LA PIEDRA YA ESTÁ LLENA', 2600);
    }
  }

  replayMelody() {
    if (this.replaying || this.melody.length < MIN_NOTES) return;
    this.replaying = true;
    this.echoInteractable.enabled = false;
    this.controller.frozen = true;
    this.controller.exitPointerLock();
    const prevMix = this.mix;
    this.setMix(MIX.replay);
    this.say('TU MELODÍA', 2600);
    this.feedback.flash(this.echoStone.position, { color: '#7fd1ff', intensity: 3, duration: 1 });
    // el ritmo es el que toco el jugador, con los silencios largos acortados
    let t = 600;
    this.melody.forEach((n, i) => {
      if (i > 0) t += Math.min(1100, Math.max(260, (n.at - this.melody[i - 1].at) * 1000));
      this.later(() => this.playPad(n.pad, false), t);
    });
    this.later(() => {
      this.replaying = false;
      this.echoInteractable.enabled = true;
      if (!this.pondDone) this.pondDone_();
      else { this.setMix(prevMix); this.controller.frozen = false; }
    }, t + 1800);
  }

  pondDone_() {
    this.pondDone = true;
    this.audio.play('success', { volume: 0.35 });
    this.audio.play('windChime', { volume: 0.28 });
    completeActivity('calm-estanque', 10);
    this.showNote({
      title: 'Esa melodía la hiciste tú',
      text: 'Sin prisa y sin equivocarte: aquí no había notas malas. La calma también se puede componer, y puedes volver a la piedra cuantas veces quieras.'
    });
    this.later(() => {
      this.controller.frozen = false;
      this.setMix(MIX.after);
      const x = POND.x - 9.5;
      const z = POND.z + 6;
      this.openPortal(new THREE.Vector3(x, this.terrainAt(x, z), z), { color: '#bfe9ff', label: 'Terminar en la isla' });
      this.say('EL PORTAL SE ABRIÓ', 2800);
    }, 5200);
  }

  /* ============================================================ ambiente */

  updateAmbient(dt) {
    // voces lejanas desde el bosque cuando el lago ya esta en calma
    const extras = this.mix?.extras ?? true;
    this.nextFarBird -= dt;
    if (this.nextFarBird <= 0) {
      this.nextFarBird = 6 + Math.random() * 9;
      if (extras && this.agitation < 0.5 && this.stage !== 1) {
        const a = this.animals[Math.floor(Math.random() * this.animals.length)];
        this.audio.playAt(a.def.sound, a.state === 'perched' ? a.mesh : a.anchor, { volume: AMBIENT.farBird, refDistance: 8 });
      }
    }
    // campanas de viento junto al inicio, con una racha
    this.nextChime -= dt;
    if (this.nextChime <= 0) {
      this.nextChime = 16 + Math.random() * 18;
      if (extras) {
        this.audio.playAt('windChime', this.chimeSpot, { volume: AMBIENT.chime, refDistance: 6 });
        this.chimeGust = 1;
      }
    }
    if (this.chimeGust > 0) {
      this.chimeGust = Math.max(0, this.chimeGust - dt * 0.4);
      this.chimes.forEach((c, i) => { c.rotation.x = Math.sin(this.time * 6 + i) * 0.18 * this.chimeGust; });
    }
    // nubes que derivan
    this.clouds.forEach((c) => {
      c.userData.a += dt * 0.006;
      c.position.x = Math.cos(c.userData.a) * c.userData.r;
      c.position.z = Math.sin(c.userData.a) * c.userData.r;
    });
  }

  /** El jugador puede mojarse los pies, pero no nadar hasta el centro del lago */
  keepAshore() {
    const c = this.controller;
    const p = c.position;
    const onDock = Math.abs(p.x - DOCK.x) < DOCK.w / 2 + 0.2 && p.z > DOCK.z0 - 0.6 && p.z < DOCK.z1;
    if (onDock) return;
    const dx = p.x - LAKE.x;
    const dz = p.z - LAKE.z;
    const d = Math.hypot(dx, dz);
    if (d < WADE_R && d > 0) {
      p.x = LAKE.x + (dx / d) * WADE_R;
      p.z = LAKE.z + (dz / d) * WADE_R;
      c.velocity.x *= 0.2;
      c.velocity.z *= 0.2;
      if (!this._wadeHint || this.time - this._wadeHint > 8) {
        this._wadeHint = this.time;
        this.say('HASTA AQUÍ · EL LAGO ES HONDO', 2200);
      }
    }
  }

  /* ================================================================ bucle */

  onUpdate(dt) {
    this.time += dt;
    this.updateNotes(dt);
    this.updateWater(dt);
    this.updateLake(dt);
    this.updateBeacon(dt);
    this.updateAmbient(dt);
    this.keepAshore();
    this.updateQuiet(dt);
    if (this.stage >= 1) this.updateAnimals(dt);
    if (this.stage >= 2) this.updatePond(dt);
  }

  /* ============================================================= reinicio */

  onReset() {
    this.runId += 1;
    this.clearNotes();
    this.stage = -1;
    this.agitation = 1;
    this.calmTarget = 1;
    this.quiet = 0;
    this.sitting = false;
    this.replaying = false;
    this.pondDone = false;
    this.fullNoted = false;
    this.melody.length = 0;
    this.renderMelody();
    this.sunPath.material.opacity = 0;
    this.sunDisc.material.opacity = 0;
    this.quiz?.close();
    this.animals.forEach((a) => {
      a.state = 'hidden';
      a.lock = 0;
      a.tries = 0;
      a.flight = null;
      a.mesh.visible = false;
      a.mesh.position.copy(a.anchor.position);
      if (a.perch) { this.scene.remove(a.perch.mesh); a.perch = null; }
    });
    this.pads.forEach((p) => { p.flash = 0; p.mat.emissiveIntensity = 0; });
    this.echoInteractable.enabled = false;
    this.seatInteractable.enabled = false;
    this.focusEl.hidden = true;
    this.quietBar.show(false);
    this.root.querySelector('.bp-layer')?.remove();
    this.breathPause = new BreathPause(this);
    this.controller.cfg.eyeHeight = 1.5;
    this.controller.setPosition(START.x, 1, START.z);
    this.controller.yaw = 0;
    this.controller.pitch = 0;
    this.music?.setLayers(1);
    this.setMix(MIX.lake);
    this.enterStage(0);
  }

  /* =============================================================== cierre */

  get completionPayload() {
    const fav = { agua: 'el agua del lago', pajaros: 'las voces del bosque', musica: 'tu propia melodía' }[this.favorite] ?? 'la isla';
    return {
      islandId: 'calm',
      success: true,
      emoAventura: true,
      badge: 'calm',
      title: 'Isla de la Calma',
      message: `Calmaste el lago, supiste quién cantaba en el bosque y compusiste tu melodía. Lo que más te calmó: ${fav}.`
    };
  }

  finish() {
    if (this.finished || this.closing) return;
    this.closing = true;
    this.controller.frozen = true;
    this.controller.exitPointerLock();
    this.showChoice({
      eyebrow: 'Isla de la Calma',
      title: '¿Qué te calmó más?',
      options: [
        { label: '🌊 El agua', text: 'El lago quieto y su sonido', value: 'agua', color: '#7fd1ff' },
        { label: '👂 Las voces', text: 'Quedarme quieto y adivinar quién cantaba', value: 'pajaros', color: '#8be0c8' },
        { label: '♪ La música', text: 'Tocar mi melodía en el estanque', value: 'musica', color: '#f5a3c7' }
      ]
    }).then((value) => {
      this.favorite = value;
      this.controller.frozen = true;
      addReward('pluma-calma');
      completeActivity('calm-isla-3d', 20);
      recordReevaluation('calm', 'media', 'Respiracion + atencion a los sonidos', 'baja');
      const tip = {
        agua: 'Cuando vuelvas a ir rápido, respira tres veces despacio imaginando el lago: cada exhalación aquieta el agua.',
        pajaros: 'Cuando vuelvas a ir rápido, quédate quieto un momento y escucha cuatro sonidos a tu alrededor, de uno en uno.',
        musica: 'Cuando vuelvas a ir rápido, tararea tu melodía o pon una música lenta: el cuerpo sigue al ritmo que oye.'
      }[value];
      this.showClosingCard({
        title: 'La calma se entrena',
        lines: [
          '<strong>El lago.</strong> El agua no se calmó porque la empujaras: se calmó porque tú respiraste despacio. La cabeza funciona igual.',
          '<strong>Las voces.</strong> Aparecieron cuando dejaste de moverte, y supiste quién cantaba fijándote en cómo sonaba cada una. Escuchar con atención es una de las formas más rápidas de bajar el ritmo.',
          '<strong>La melodía.</strong> Sin prisa y sin notas malas: la calma también es dejar que las cosas salgan como salen.',
          `<strong>Para llevarte:</strong> ${tip}`
        ],
        onDone: () => super.finish()
      });
    });
  }

  onDispose() {
    this.quiz?.close();
    this.music?.stop();
    this.lakeRoughSfx?.stop();
    this.lakeCalmSfx?.stop();
    this.leavesSfx?.stop();
    try { this.brookSfx?.stop(); } catch { /* ya parado */ }
    clearTimeout(this._bannerT);
  }
}
