// ISLA DE LA FRUSTRACIÓN · La torre
// Genero: PRECISION BAJO REVESES · camara fija, se juega tocando
//
// La frustracion aparece cuando algo se interpone entre tu y lo que quieres.
// Aqui lo que quieres es la cima: una torre de 12 bloques. Cada bloque va y
// viene por encima de la torre y hay que soltarlo a tiempo; lo que sobresale
// se cae. Y de vez en cuando una rafaga de viento -que no depende de ti-
// tumba los bloques de arriba.
//
// La frustracion es un medidor: sube con cada bloque perdido, con cada corte
// y con cada rafaga; cuando sube, la mano tiembla (el bloque va mas rapido y
// baila) y todo sale peor. Las estrategias son el juego:
//   PARAR      mantener pulsado: el bloque se detiene y la frustracion baja
//   PASO CORTO bloques mas pequenos, mas faciles de acertar, que suman medio
//   AYUDA      dos veces por partida, alguien te sostiene el bloque en su sitio
// Si el medidor llega arriba, la mano se bloquea: solo se sale parando. No hay
// game over: los bloques que caen se reponen y la torre sigue ahi.

import * as THREE from 'three';
import { MinigameBase, prefersReducedMotion } from '../../engine/MinigameBase.js';
import {
  createGround, createSky, createLights, GEO, scatterInstanced,
  makeSun, makeClouds, makeMountains, colorGroundByHeight, makeOutline
} from '../../engine/worldkit.js';
import { addReward, completeActivity, recordReevaluation, setInitialIntensity } from '../../data/gameState.js';

const GOAL = 12;                  // niveles hasta la cima
const BASE_W = 3.0;               // ancho de un bloque entero
const SMALL_W = 1.7;              // ancho de un paso corto
const BLOCK_H = 0.62;
const BLOCK_D = 2.4;
const AMP = 2.7;                  // recorrido del bloque a cada lado
const MIN_OVERLAP = 0.28;         // menos solape que esto = el bloque se cae
const HELP_USES = 2;
const PAUSE_TO_UNBLOCK = 1.5;     // segundos parado para soltar la mano bloqueada

// Cada reves trae su letrero de animo: la frustracion sube justo ahi, y ese
// es el momento de una voz que recuerde que se puede seguir. Las frases se
// van turnando para que no se repita siempre la misma.
const CARTELES = {
  caida: {
    icono: '🧱',
    titulo: 'SE CAYÓ',
    frases: [
      'Vuelve a intentarlo: la torre sigue ahí.',
      'Nadie acierta todos. Ahí viene otro bloque.',
      'Respira y suelta el siguiente con calma.',
      'Cada intento te dice dónde poner el próximo.',
      'Tú puedes: un bloque a la vez.',
      'Esto molesta, y molestarse es normal. Sigue.',
      'Si se te va la mano, para un momento y vuelve.',
      'No empezaste de cero: lo de abajo sigue en pie.'
    ]
  },
  rafaga: {
    icono: '🌬️',
    titulo: 'LA RÁFAGA TUMBÓ LA TORRE',
    frases: [
      'No fue culpa tuya. Vuelve a subir.',
      'A veces se cae por algo que no depende de ti.',
      'Lo que aprendiste construyendo no se lo lleva el viento.',
      'Enfádate si quieres, y pon el siguiente bloque.'
    ]
  },
  bloqueo: {
    icono: '✋',
    titulo: 'SE TE VA LA MANO',
    frases: [
      'Mantén «Parar»: la frustración baja y la mano vuelve.',
      'Parar no es rendirse. Respira y sigues tú.'
    ]
  },
  vuelta: {
    icono: '🌿',
    titulo: 'LA MANO VUELVE',
    frases: [
      'Pararte funcionó. Sigue a tu ritmo.',
      'Así se regula: parar, respirar, volver.'
    ]
  }
};

// Con cuanta frustracion llega el jugador: fija el ritmo, las rafagas y lo que
// sube el medidor con cada reves.
const LEVELS = [
  {
    n: 1, id: 'baja', name: 'BAJO', label: 'Nivel 1 · Bajo', color: '#7fd1a8',
    text: 'Algo no salió como quería, pero puedo seguir intentándolo.',
    speed: 1.25, gusts: [6], gain: 1,
    hint: 'Nivel bajo: una ráfaga y ritmo tranquilo.',
    closing: 'Llegaste con la frustración baja: hubo un revés y seguiste.'
  },
  {
    n: 2, id: 'media', name: 'MEDIO', label: 'Nivel 2 · Medio', color: '#ffd166',
    text: 'Me molesta bastante que no salga. Tengo ganas de dejarlo.',
    speed: 1.55, gusts: [4, 8], gain: 1.15,
    hint: 'Nivel medio: dos ráfagas y el bloque va más rápido.',
    closing: 'Llegaste con ganas de dejarlo: dos ráfagas tumbaron la torre y aun así la terminaste.'
  },
  {
    n: 3, id: 'alta', name: 'ALTO', label: 'Nivel 3 · Alto', color: '#ff7a5c',
    text: 'Estoy muy frustrado. Siento que nada sale y quiero tirarlo todo.',
    speed: 1.85, gusts: [3, 6, 9], gain: 1.3,
    hint: 'Nivel alto: tres ráfagas, el bloque va rápido y la frustración sube más con cada revés.',
    closing: 'Llegaste queriendo tirarlo todo: tres ráfagas, la mano temblando, y la torre llegó a la cima.'
  }
];

// Cada reflexion se apoya en algo que acaba de pasar
const NOTES = {
  gust: { title: 'No dependía de ti', text: 'La ráfaga no fue culpa tuya. La frustración aparece justo ahí: cuando algo se cruza entre tú y lo que querías, aunque lo estuvieras haciendo bien.' },
  high: { title: 'Cuando sube, la mano tiembla', text: 'Con la frustración alta el bloque va más rápido y baila: los intentos salen peor. No es que seas malo en esto; es la emoción moviendo la mano.' },
  pause: { title: 'Parar no es rendirse', text: 'Un momento quieto baja la frustración y devuelve el pulso. La torre sigue ahí cuando vuelves.' },
  small: { title: 'Un paso más pequeño también cuenta', text: 'Dividir la meta en pasos hace que cada intento sea más fácil de acertar. Se tarda un poco más y se llega igual.' },
  help: { title: 'Pedir ayuda también es avanzar', text: 'No tienes que hacerlo todo tú. Que alguien te sostenga un bloque no le quita nada a tu torre.' },
  top: { title: 'Volver a empezar no borra lo aprendido', text: 'Cada bloque que se cayó te enseñó dónde poner el siguiente. La cima está hecha también de los que no llegaron.' }
};

const SKY = {
  calm: [new THREE.Color('#5a8fc7'), new THREE.Color('#d6e6f5')],
  tense: [new THREE.Color('#4a4a5c'), new THREE.Color('#9a8f86')]
};
const FOG = { calm: new THREE.Color('#c9dced'), tense: new THREE.Color('#8f8a88') };
const _c = new THREE.Color();

export class FrustrationTowerGame extends MinigameBase {
  constructor(opts) {
    super({ ...opts, mode: 'third' });
    this.level = LEVELS[0];
    this.frus = 0;              // 0..100
    this.frusShown = 0;
    this.blocks = [];           // bloques puestos, de abajo arriba: { mesh, x, w, half }
    this.debris = [];           // trozos que caen
    this.levels = 0;            // altura en niveles (los pasos cortos suman 0.5)
    this.phase = 'idle';        // idle | play | blocked | done
    this.phaseTimer = 0;
    this.slider = { phase: 0, x: 0, w: BASE_W, mesh: null, ready: false };
    this.pausing = false;
    this.pauseTime = 0;
    this.small = false;
    this.help = HELP_USES;
    this.helpArmed = false;
    this.gustsDone = 0;
    this.gustWarn = null;
    this.seen = [];
    this.notesShown = new Set();
    this.stats = { placed: 0, lost: 0, cuts: 0, pauses: 0, smalls: 0, helps: 0 };
    this.time = 0;
    this.shake = 0;
    this.reduceMotion = prefersReducedMotion();
  }

  /* ============================================================ escenario */

  build() {
    const scene = this.scene;
    this.controller.enabled = false;
    this.el.touch.remove();

    scene.fog = new THREE.FogExp2('#c9dced', 0.014);
    // el cielo mas cerca que el plano lejano de la camara (220): si no, desde
    // z=12,5 se abre un agujero negro en el centro de la vista
    this.sky = createSky({ top: '#5a8fc7', bottom: '#d6e6f5', size: 160 });
    scene.add(this.sky);
    // sol, nubes que derivan y una cordillera al fondo, fundida con la niebla
    this.sunSprite = makeSun({ size: 34, position: [-78, 44, -110] });
    scene.add(this.sunSprite);
    this.clouds = makeClouds({ count: 8, radius: 80, height: 22, scale: 1.3, opacity: 0.9 });
    scene.add(this.clouds);
    scene.add(makeMountains({ count: 14, radius: 66, spread: 12, color: '#7b8798', height: 15, base: -3 }));

    this.lights = createLights({ sunColor: '#fff0d6', sunIntensity: 1.5, hemiSky: '#bcd6ee', hemiGround: '#6b5a48', hemiIntensity: 0.9, area: 26 });
    this.lights.userData.sun.position.set(-12, 24, 16);
    scene.add(this.lights);
    this.sun = this.lights.userData.sun;

    // meseta de piedra y valle alrededor
    this.ground = createGround({ size: 120, segments: 48, color: '#8a7a5e', amplitude: 1.6, scale: 0.05, flatRadius: 9 });
    // valle verde abajo, roca clara en las lomas
    colorGroundByHeight(this.ground, { low: '#6f8f52', high: '#a08a66', speckle: '#9db86a', amount: 0.3 });
    this.ground.position.y = -1.2;
    scene.add(this.ground);
    const plateMat = new THREE.MeshStandardMaterial({ color: '#7a6853', roughness: 1, flatShading: true });
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 5.2, 1.2, 8), plateMat);
    plate.position.y = -0.6;
    plate.receiveShadow = true;
    scene.add(plate);
    // losa clara encima y un borde de piedras alrededor de la meseta
    const slab = new THREE.Mesh(new THREE.CylinderGeometry(4.0, 4.2, 0.12, 8), new THREE.MeshStandardMaterial({ color: '#a89478', roughness: 1, flatShading: true }));
    slab.position.y = 0.02;
    slab.receiveShadow = true;
    scene.add(slab);
    scene.add(scatterInstanced(GEO.rock(), new THREE.MeshStandardMaterial({ color: '#8f8072', roughness: 1, flatShading: true }), 14, (i) => {
      const a = (i / 14) * Math.PI * 2 + 0.2;
      return { x: Math.cos(a) * 4.6, y: -0.05, z: Math.sin(a) * 4.6, ry: a * 3, scale: 0.35 + (i % 3) * 0.15 };
    }));
    // hierba en los prados
    scene.add(scatterInstanced(GEO.grass(), new THREE.MeshStandardMaterial({ color: '#86b35a', roughness: 1, flatShading: true }), 220, (i) => {
      const a = i * 2.399 + 1;
      const r = 6 + (i % 40) * 0.62;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      return { x, y: this.ground.userData.heightAt(x, z) - 1.2 + 0.22, z, ry: i, scale: 0.8 + (i % 3) * 0.3 };
    }));

    // pinos con tronco (dos verdes) y rocas alrededor
    const treeAt = (i) => {
      const a = i * 2.399;
      const r = 8 + (i % 6) * 2.2;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      return { x, z, y: this.ground.userData.heightAt(x, z) - 1.2, s: 0.6 + (i % 4) * 0.25, a };
    };
    this.bushMat = new THREE.MeshStandardMaterial({ color: '#6f9a50', roughness: 1, flatShading: true });
    const bushMat2 = new THREE.MeshStandardMaterial({ color: '#8bb266', roughness: 1, flatShading: true });
    this.bushes = scatterInstanced(GEO.coneTree(), this.bushMat, 20, (i) => { const t = treeAt(i * 2); return { x: t.x, y: t.y + 0.95 * t.s + 0.35, z: t.z, ry: t.a, scale: t.s }; });
    scene.add(this.bushes);
    scene.add(scatterInstanced(GEO.coneTree(), bushMat2, 20, (i) => { const t = treeAt(i * 2 + 1); return { x: t.x, y: t.y + 0.95 * t.s + 0.35, z: t.z, ry: t.a, scale: t.s }; }));
    scene.add(scatterInstanced(GEO.trunk(), new THREE.MeshStandardMaterial({ color: '#6b4a2f', roughness: 1, flatShading: true }), 40, (i) => { const t = treeAt(i); return { x: t.x, y: t.y + 0.4 * t.s, z: t.z, ry: t.a, scale: t.s }; }));
    const rockMat = new THREE.MeshStandardMaterial({ color: '#7a6a58', roughness: 1, flatShading: true });
    scene.add(scatterInstanced(GEO.rock(), rockMat, 30, (i) => {
      const a = i * 1.7 + 0.4;
      const r = 6.5 + (i % 5) * 3;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      return { x, y: this.ground.userData.heightAt(x, z) - 1.2 + 0.2, z, ry: a, scale: 0.5 + (i % 3) * 0.35 };
    }));

    // la cima: un mastil con bandera a la altura de la meta
    this.blockMat = new THREE.MeshStandardMaterial({ color: '#e2a86c', roughness: 0.75, flatShading: true });
    this.blockMat2 = new THREE.MeshStandardMaterial({ color: '#c98d55', roughness: 0.75, flatShading: true });
    this.smallMat = new THREE.MeshStandardMaterial({ color: '#e8c48a', roughness: 0.8, flatShading: true });
    this.helpMat = new THREE.MeshStandardMaterial({ color: '#9fd8c0', roughness: 0.8, flatShading: true });
    this.blockGeo = new THREE.BoxGeometry(1, BLOCK_H, BLOCK_D);
    const poleY = GOAL * BLOCK_H;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.4, 6), new THREE.MeshStandardMaterial({ color: '#4a3a2a', roughness: 1 }));
    pole.position.set(AMP + 1.6, poleY + 1.2, 0);
    scene.add(pole);
    this.flag = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.7), new THREE.MeshBasicMaterial({ color: '#ffd166', side: THREE.DoubleSide }));
    this.flag.position.set(AMP + 1.6 + 0.58, poleY + 2.0, 0);
    scene.add(this.flag);
    // linea de meta
    const goalLine = new THREE.Mesh(new THREE.BoxGeometry(AMP * 2 + 5, 0.04, 0.04), new THREE.MeshBasicMaterial({ color: '#ffd166', transparent: true, opacity: 0.55 }));
    goalLine.position.set(0, poleY, BLOCK_D / 2 + 0.05);
    scene.add(goalLine);
    this.goalLine = goalLine;

    // bloque que se desliza (con contorno, como todos: aspecto de dibujo)
    this.slider.mesh = new THREE.Mesh(this.blockGeo, this.blockMat);
    this.slider.mesh.castShadow = true;
    this.slider.mesh.visible = false;
    this.slider.mesh.add(makeOutline(this.blockGeo, { color: '#3a2412', opacity: 0.4 }));
    scene.add(this.slider.mesh);

    // la mano que ayuda: una manita de luz que aparece sobre el bloque
    this.hand = new THREE.Mesh(GEO.orb(), new THREE.MeshStandardMaterial({ color: '#9fd8c0', emissive: '#5fc9a0', emissiveIntensity: 1.4, flatShading: true }));
    this.hand.visible = false;
    scene.add(this.hand);

    this.placeCamera();
    this.buildInput();
    this.buildHud();
    this.setObjective(GOAL, '▮');
  }

  placeCamera() {
    this.camBase = new THREE.Vector3(0, 4.2, 12.5);
    this.camTarget = new THREE.Vector3(0, 1.8, 0);
    this.camera.fov = 58;
    this.camera.updateProjectionMatrix();
    this.camera.position.copy(this.camBase);
    this.camera.lookAt(this.camTarget);
  }

  /* ================================================================ HUD */

  buildHud() {
    this.frusBar = this.addBar('frus', { icon: '😤', color: '#ff8a5c', value: 0 });
    this.pauseBar = this.addBar('pausa', { icon: '⏸', color: '#7fd1ff', value: 0 });
    this.pauseBar.show(false);

    this.tools = document.createElement('div');
    this.tools.className = 'i3d-tools';
    this.tools.innerHTML = `
      <button class="i3d-tool" type="button" data-tool="pause"><b>⏸</b><span>Parar<small>mantener</small></span></button>
      <button class="i3d-tool" type="button" data-tool="small" aria-pressed="false"><b>🪜</b><span>Paso corto<small>bloque pequeño</small></span></button>
      <button class="i3d-tool" type="button" data-tool="help"><b>🤝</b><span>Ayuda<small data-help>${HELP_USES} usos</small></span></button>
    `;
    this.el.hud.appendChild(this.tools);
    this.waveEl = document.createElement('div');
    this.waveEl.className = 'i3d-wave';
    this.el.hud.appendChild(this.waveEl);
    this.renderLabel();

    // parar: mantener pulsado el boton (dedo o raton)
    const pauseBtn = this.tools.querySelector('[data-tool="pause"]');
    let pid = null;
    const down = (e) => { if (pid !== null) return; pid = e.pointerId; e.preventDefault(); try { pauseBtn.setPointerCapture(e.pointerId); } catch { /* */ } this.setPausing(true); };
    const up = (e) => { if (pid === null) return; if (e && e.pointerId !== undefined && e.pointerId !== pid) return; pid = null; this.setPausing(false); };
    pauseBtn.addEventListener('pointerdown', down);
    pauseBtn.addEventListener('pointerup', up);
    pauseBtn.addEventListener('pointercancel', up);
    pauseBtn.addEventListener('lostpointercapture', up);
    window.addEventListener('pointerup', up);
    window.addEventListener('blur', up);
    this.listeners.push(() => window.removeEventListener('pointerup', up));
    this.listeners.push(() => window.removeEventListener('blur', up));

    this.tools.querySelector('[data-tool="small"]').addEventListener('click', () => this.toggleSmall());
    this.tools.querySelector('[data-tool="help"]').addEventListener('click', () => this.askHelp());
  }

  renderLabel() {
    this.waveEl.innerHTML = `Altura <b>${Math.floor(this.levels)}</b> de ${GOAL} <small>· ${this.level.label}</small>`;
    this.objective.done = Math.min(GOAL, Math.floor(this.levels));
    this.renderObjective();
    this.tools.querySelector('[data-help]').textContent = this.help === 1 ? '1 uso' : `${this.help} usos`;
    this.tools.querySelector('[data-tool="help"]').disabled = this.help <= 0;
    this.tools.querySelector('[data-tool="small"]').setAttribute('aria-pressed', String(this.small));
    this.tools.querySelector('[data-tool="small"]').classList.toggle('is-on', this.small);
    this.tools.querySelector('[data-tool="help"]').classList.toggle('is-on', this.helpArmed);
  }

  /* ============================================================== input */

  buildInput() {
    const dom = this.renderer.domElement;
    const tap = (e) => {
      if (this.paused || this.finished) return;
      if (e.button !== undefined && e.button > 0) return;
      if (this.phase === 'done') { this.tryExit(e); return; }
      this.drop();
    };
    dom.addEventListener('pointerdown', tap);
    this.listeners.push(() => dom.removeEventListener('pointerdown', tap));

    const keyDown = (e) => {
      if (this.paused || this.finished || e.repeat) return;
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); if (this.phase === 'done') this.finish(); else this.drop(); }
      if (e.key === 'p' || e.key === 'P') this.setPausing(true);
      if (e.key === 's' || e.key === 'S') this.toggleSmall();
      if (e.key === 'a' || e.key === 'A') this.askHelp();
    };
    const keyUp = (e) => { if (e.key === 'p' || e.key === 'P') this.setPausing(false); };
    window.addEventListener('keydown', keyDown);
    window.addEventListener('keyup', keyUp);
    this.listeners.push(() => window.removeEventListener('keydown', keyDown));
    this.listeners.push(() => window.removeEventListener('keyup', keyUp));
  }

  /* ============================================================ arranque */

  async onStart() {
    const n = await this.showChoice({
      eyebrow: 'La torre',
      title: '¿Cómo está tu frustración ahora mismo?',
      options: LEVELS.map((l) => ({ label: l.label, text: l.text, value: l.n, color: l.color }))
    });
    this.level = LEVELS.find((l) => l.n === n) ?? LEVELS[0];
    setInitialIntensity(this.level.id);
    completeActivity(`frustration-nivel-${this.level.n}`, 2);
    this.renderLabel();

    await this.showIntro({
      eyebrow: `La torre · ${this.level.label}`,
      goal: `Levanta la torre hasta la cima: ${GOAL} bloques`,
      hint: `El bloque va y viene: tócalo (o pulsa espacio) para soltarlo. Lo que sobresale se cae. De vez en cuando una ráfaga tumba los bloques de arriba: no depende de ti. La frustración sube con cada revés y, cuando sube, la mano tiembla. Tienes tres ayudas: parar un momento, pasos cortos y pedir ayuda. ${this.level.hint}`,
      keys: [['Clic / Espacio', 'soltar el bloque'], ['P (mantener)', 'parar'], ['S', 'paso corto'], ['A', 'pedir ayuda']],
      touch: [['Toca', 'soltar el bloque'], ['⏸ mantener', 'parar'], ['🪜', 'paso corto'], ['🤝', 'pedir ayuda']]
    });
    this.ambientWind = this.audio.ambient('wind', { volume: 0.12 });
    this.phase = 'play';
    this.newSlider();
    this.say('SUELTA EL BLOQUE A TIEMPO', 2200);
  }

  /* ============================================================== torre */

  get topBlock() { return this.blocks[this.blocks.length - 1] ?? null; }
  get topY() { return this.blocks.length * BLOCK_H; }        // cara superior de la torre
  get topX() { return this.topBlock?.x ?? 0; }
  get topW() { return this.topBlock?.w ?? BASE_W; }

  /** Prepara el siguiente bloque que se desliza */
  newSlider() {
    const s = this.slider;
    // el ancho se recupera poco a poco tras un corte; el paso corto es mas estrecho
    s.w = this.small ? Math.min(SMALL_W, this.topW + 0.5) : Math.min(BASE_W, this.topW + 0.5);
    s.w = Math.max(0.7, s.w);
    s.phase = Math.random() * Math.PI * 2;
    s.mesh.visible = true;
    s.mesh.material = this.helpArmed ? this.helpMat : this.small ? this.smallMat : this.blockMat;
    s.mesh.scale.set(s.w, 1, 1);
    s.ready = true;
  }

  /** Suelta el bloque: lo que solapa se queda, lo que sobresale se cae */
  drop() {
    if (this.phase !== 'play' || !this.slider.ready || this.pausing) return;
    const s = this.slider;
    s.ready = false;
    let x = s.x;
    let w = s.w;
    if (this.helpArmed) {
      // alguien te sostiene el bloque: cae en su sitio
      x = this.topX;
      this.helpArmed = false;
      this.hand.visible = false;
      this.note('help');
    }
    const top = this.topBlock;
    const baseX = top ? top.x : 0;
    const baseW = top ? top.w : BASE_W + 1.2;
    const left = Math.max(x - w / 2, baseX - baseW / 2);
    const right = Math.min(x + w / 2, baseX + baseW / 2);
    const overlap = right - left;

    if (overlap < MIN_OVERLAP) {
      // se cae entero: sube la frustracion, se repone otro bloque
      this.spawnDebris(x, this.topY + BLOCK_H / 2, w, 0, (x < baseX ? -1 : 1) * 1.5);
      this.stats.lost += 1;
      this.addFrus(18);
      this.cartel('caida');
      this.audio.play('thud', { volume: 0.5, rate: 0.8 });
      this.shakeBy(0.25);
      this.later(() => { if (this.phase === 'play') this.newSlider(); }, 500);
      return;
    }

    // el trozo que sobresale se desprende
    const cutL = left - (x - w / 2);
    const cutR = (x + w / 2) - right;
    if (cutL > 0.05) this.spawnDebris(left - cutL / 2, this.topY + BLOCK_H / 2, cutL, -1, -1);
    if (cutR > 0.05) this.spawnDebris(right + cutR / 2, this.topY + BLOCK_H / 2, cutR, 1, 1);
    const cutRatio = 1 - overlap / w;
    if (cutRatio > 0.45) { this.stats.cuts += 1; this.addFrus(10); this.say('CASI · SIGUE', 1000); }
    else if (cutRatio < 0.08) { this.say('¡JUSTO!', 900); this.addFrus(-4); }

    const mat = s.mesh.material === this.blockMat && this.blocks.length % 2 ? this.blockMat2 : s.mesh.material;
    const mesh = new THREE.Mesh(this.blockGeo, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.add(makeOutline(this.blockGeo, { color: '#3a2412', opacity: 0.4 }));
    mesh.scale.set(overlap, 1, 1);
    mesh.position.set((left + right) / 2, this.topY + BLOCK_H / 2, 0);
    this.scene.add(mesh);
    this.blocks.push({ mesh, x: (left + right) / 2, w: overlap, half: this.small });
    this.levels += this.small ? 0.5 : 1;
    this.stats.placed += 1;
    if (this.small) this.stats.smalls += 1;
    this.renderer.shadowMap.needsUpdate = true;
    this.audio.play('stone', { volume: 0.45, rate: 0.9 + Math.random() * 0.2 });
    this.feedback.burst(mesh.position, { count: 8, color: '#f5d9a8', speed: 1.6, life: 0.5 });
    this.renderLabel();

    if (this.levels >= GOAL) { this.reachTop(); return; }
    // ¿toca rafaga? (a esta altura, si aun no ha soplado)
    const gustAt = this.level.gusts[this.gustsDone];
    if (gustAt !== undefined && Math.floor(this.levels) >= gustAt) this.warnGust();
    else this.later(() => { if (this.phase === 'play') this.newSlider(); }, 260);
  }

  spawnDebris(x, y, w, dir, vx) {
    const mesh = new THREE.Mesh(this.blockGeo, this.slider.mesh.material);
    mesh.add(makeOutline(this.blockGeo, { color: '#3a2412', opacity: 0.4 }));
    mesh.scale.set(Math.max(0.1, w), 1, 1);
    mesh.position.set(x, y, 0);
    this.scene.add(mesh);
    this.debris.push({ mesh, vy: 1.5, vx: vx * 1.2, spin: dir * 3 + (Math.random() - 0.5), t: 0 });
    void dir;
  }

  /* ============================================================ rafagas */

  warnGust() {
    this.phase = 'gust';
    this.gustWarn = 1.1;
    this.slider.mesh.visible = false;
    this.say('VIENTO', 1100);
    this.audio.play('wind', { volume: 0.7, rate: 1.4 });
    this.ambientWind?.setVolume(0.6, 0.3);
  }

  gust() {
    this.gustsDone += 1;
    // los dos bloques de arriba salen volando (nunca la torre entera)
    const n = Math.min(2, this.blocks.length - 1);
    for (let i = 0; i < n; i += 1) {
      const b = this.blocks.pop();
      this.scene.remove(b.mesh);
      this.spawnDebris(b.x + 0.4, b.mesh.position.y, b.w, 1, 3 + i);
      this.levels -= b.half ? 0.5 : 1;
    }
    this.levels = Math.max(0, this.levels);
    this.addFrus(25);
    this.shakeBy(0.5);
    this.cartel('rafaga');
    this.audio.play('thud', { volume: 0.6, rate: 0.7 });
    this.feedback.burst(new THREE.Vector3(this.topX, this.topY + 1, 0), { count: 30, color: '#c9d6a0', speed: 6, life: 1.2, gravity: -1 });
    this.renderer.shadowMap.needsUpdate = true;
    this.renderLabel();
    this.note('gust');
    this.ambientWind?.setVolume(0.12, 1.2);
    this.later(() => { if (this.phase === 'gust') { this.phase = 'play'; this.newSlider(); } }, 900);
  }

  /* ======================================================== frustracion */

  addFrus(d) {
    if (d > 0) d *= this.level.gain;
    this.frus = Math.max(0, Math.min(100, this.frus + d));
    this.frusBar.set(this.frus / 100);
    if (this.frus > 70) this.note('high');
    if (this.frus >= 100 && this.phase === 'play') this.block();
  }

  /** La mano se bloquea: el bloque tiembla y no se puede soltar hasta parar */
  block() {
    this.phase = 'blocked';
    this.cartel('bloqueo', 0);
    this.audio.play('soften', { volume: 0.4 });
    this.pauseBar.show(true);
    this.pauseBar.set(0);
  }

  setPausing(on) {
    if (on === this.pausing) return;
    if (on && (this.phase !== 'play' && this.phase !== 'blocked')) return;
    this.pausing = on;
    this.pauseTime = 0;
    this.tools.querySelector('[data-tool="pause"]').classList.toggle('is-on', on);
    if (on) {
      this.stats.pauses += 1;
      this.audio.duck(0.4);
      this.audio.play('breathIn', { volume: 0.3 });
      if (this.phase === 'play') this.say('PARADO · LA FRUSTRACIÓN BAJA', 0);
      this.note('pause');
    } else {
      this.audio.unduck(0.6);
      if (this.phase === 'play') this.clearSay();
      if (this.phase === 'blocked') this.cartel('bloqueo', 0);
    }
  }

  toggleSmall() {
    if (this.phase === 'done') return;
    this.small = !this.small;
    if (this.small) { this.stats.smalls += 0; this.note('small'); this.say('PASO CORTO', 1200); }
    else this.say('BLOQUE ENTERO', 1200);
    this.audio.play('interact', { volume: 0.3 });
    // si hay un bloque esperando, cambia de tamano al vuelo
    if (this.slider.ready) {
      const s = this.slider;
      s.w = Math.max(0.7, this.small ? Math.min(SMALL_W, this.topW + 0.5) : Math.min(BASE_W, this.topW + 0.5));
      s.mesh.scale.set(s.w, 1, 1);
      s.mesh.material = this.helpArmed ? this.helpMat : this.small ? this.smallMat : this.blockMat;
    }
    this.renderLabel();
  }

  askHelp() {
    if (this.phase === 'done' || this.help <= 0 || this.helpArmed) return;
    this.help -= 1;
    this.helpArmed = true;
    this.stats.helps += 1;
    this.hand.visible = true;
    if (this.slider.ready) this.slider.mesh.material = this.helpMat;
    this.say('ALGUIEN TE SOSTIENE EL BLOQUE', 1600);
    this.audio.play('chime', { volume: 0.35, rate: 1.1 });
    this.renderLabel();
  }

  /**
   * Letrero de animo en mitad de la pantalla. `ms = 0` lo deja fijo hasta que
   * otro lo sustituya (mano bloqueada). Mientras se lee, los avisos cortos no
   * lo tapan.
   */
  cartel(tipo, ms = 4200) {
    const c = CARTELES[tipo];
    if (!c) return;
    this.cartelTurno = this.cartelTurno ?? {};
    const i = ((this.cartelTurno[tipo] ?? -1) + 1) % c.frases.length;
    this.cartelTurno[tipo] = i;
    clearTimeout(this._cartelT);
    this.el.center.innerHTML = `
      <div class="fr-cartel" data-tipo="${tipo}">
        <b><span aria-hidden="true">${c.icono}</span> ${c.titulo}</b>
        <span>${c.frases[i]}</span>
      </div>
    `;
    this.cartelHasta = ms ? performance.now() + ms : Infinity;
    if (ms) {
      this._cartelT = this.later(() => {
        if (this.el.center.querySelector('.fr-cartel')) this.el.center.innerHTML = '';
        this.cartelHasta = 0;
      }, ms);
    }
  }

  /** Los avisos cortos esperan a que termine el letrero de animo */
  say(text, ms = 1600) {
    if (this.cartelHasta && performance.now() < this.cartelHasta) return;
    super.say(text, ms);
  }

  clearSay() {
    this.cartelHasta = 0;
    clearTimeout(this._cartelT);
    super.clearSay();
  }

  note(key) {
    if (this.notesShown.has(key)) return;
    this.notesShown.add(key);
    this.seen.push(NOTES[key]);
    this.later(() => this.showNote({ ...NOTES[key], seconds: 8 }), 500);
  }

  shakeBy(v) { this.shake = Math.max(this.shake, this.reduceMotion ? v * 0.3 : v); }

  /* ============================================================== cima */

  reachTop() {
    this.phase = 'done';
    this.slider.mesh.visible = false;
    this.hand.visible = false;
    this.pausing = false;
    this.clearSay();
    this.say('LLEGASTE A LA CIMA', 2400);
    this.audio.play('success', { volume: 0.55 });
    this.frus = Math.min(this.frus, 30);
    this.frusBar.set(this.frus / 100);
    this.feedback.burst(new THREE.Vector3(this.topX, this.topY + 0.5, 0), { count: 40, color: '#ffd166', speed: 5, life: 1.6, gravity: -2 });
    this.feedback.flash(new THREE.Vector3(this.topX, this.topY + 1, 1), { color: '#ffe9a8', intensity: 5, duration: 1.4, distance: 16 });
    completeActivity('frustration-cima', 12);
    this.note('top');
    this.tools.hidden = true;
    this.later(() => this.openExit(), 1800);
  }

  openExit() {
    const p = new THREE.Vector3(-AMP - 1.4, 0, 1.2);
    // el portal reutiliza el de la base, pero se cruza tocandolo (no se camina)
    const color = '#9fd8c0';
    const group = new THREE.Group();
    group.position.copy(p);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.12, 10, 40), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.4, roughness: 0.35, flatShading: true }));
    ring.position.y = 1.3;
    group.add(ring);
    const veil = new THREE.Mesh(new THREE.CircleGeometry(1, 28), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.5, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
    veil.position.y = 1.3;
    group.add(veil);
    const light = new THREE.PointLight(color, 2, 10, 2);
    light.position.y = 1.4;
    group.add(light);
    group.lookAt(this.camBase.x, 1.3, this.camBase.z);
    this.scene.add(group);
    this.portal = group;
    this.portalRing = ring;
    this.feedback.burst(p, { count: 24, color, speed: 3.5, life: 1.2 });
    this.audio.play('chime', { volume: 0.5 });
    this.say('TOCA EL PORTAL PARA SALIR', 2400);
  }

  tryExit(e) {
    if (!this.portal) return;
    const dom = this.renderer.domElement;
    const r = dom.getBoundingClientRect();
    const ndc = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    const ray = new THREE.Raycaster();
    ray.setFromCamera(ndc, this.camera);
    const c = this.portal.position.clone();
    c.y += 1.3;
    if (ray.ray.distanceSqToPoint(c) < 2.2 * 2.2) this.finish();
  }

  /* ============================================================== bucle */

  onUpdate(dt) {
    this.time += dt;
    const s = this.slider;
    const f = this.frus / 100;

    if (this.pausing) {
      // parado: el bloque se detiene, la frustracion baja rapido
      this.pauseTime += dt;
      this.addFrus(-26 * dt);
      if (this.phase === 'blocked') {
        this.pauseBar.set(Math.min(1, this.pauseTime / PAUSE_TO_UNBLOCK));
        if (this.pauseTime >= PAUSE_TO_UNBLOCK) {
          this.phase = 'play';
          this.frus = Math.min(this.frus, 40);
          this.frusBar.set(this.frus / 100);
          this.pauseBar.show(false);
          this.clearSay();
          this.cartel('vuelta', 3000);
          this.audio.play('breathOut', { volume: 0.4 });
        }
      }
    } else if (this.phase === 'play' || this.phase === 'blocked') {
      this.frus = Math.max(0, this.frus - 1.4 * dt);
      this.frusBar.set(this.frus / 100);
    }

    // el bloque va y viene; con frustracion alta va mas rapido y baila
    if (s.ready && !this.pausing && this.phase === 'play') {
      s.phase += this.level.speed * (1 + f * 0.85) * dt;
    }
    if (s.mesh.visible) {
      const jitter = this.reduceMotion ? 0 : f * f;
      s.x = Math.sin(s.phase) * AMP + (this.phase === 'blocked' ? Math.sin(this.time * 40) * 0.12 : 0);
      s.mesh.position.set(
        s.x + (Math.random() - 0.5) * 0.12 * jitter,
        this.topY + BLOCK_H / 2 + 1.5 + Math.sin(this.time * 9) * 0.06 * jitter,
        0
      );
      if (this.helpArmed) { this.hand.position.set(this.topX, this.topY + BLOCK_H + 1.9, 0.4); this.hand.rotation.y += dt * 2; }
    }

    // rafaga: aviso y golpe
    if (this.phase === 'gust' && this.gustWarn !== null) {
      this.gustWarn -= dt;
      if (Math.random() < 0.6) this.feedback.drizzle({ x: -6 + Math.random() * 12, y: 1 + Math.random() * 4, z: -2 }, 3, { color: '#c9d6a0', life: 0.9, speed: 9, gravity: -0.5, size: 0.8 });
      if (this.gustWarn <= 0) { this.gustWarn = null; this.gust(); }
    }

    // trozos que caen
    for (let i = this.debris.length - 1; i >= 0; i -= 1) {
      const d = this.debris[i];
      d.t += dt;
      d.vy -= 18 * dt;
      d.mesh.position.y += d.vy * dt;
      d.mesh.position.x += d.vx * dt;
      d.mesh.rotation.z += d.spin * dt;
      if (d.mesh.position.y < -8) { this.scene.remove(d.mesh); this.debris.splice(i, 1); }
    }

    // el cielo se carga con la frustracion; la camara sube con la torre
    this.frusShown += (f - this.frusShown) * Math.min(1, dt * 2);
    const k = this.frusShown;
    const sky = this.sky.userData.uniforms;
    sky.topColor.value.lerpColors(SKY.calm[0], SKY.tense[0], k);
    sky.bottomColor.value.lerpColors(SKY.calm[1], SKY.tense[1], k);
    this.scene.fog.color.lerpColors(FOG.calm, FOG.tense, k);
    this.sun.intensity = 1.5 - k * 0.5;
    this.clouds.userData.update(dt);
    this.clouds.userData.material.color.setRGB(1 - k * 0.45, 1 - k * 0.47, 1 - k * 0.5);
    this.sunSprite.material.opacity = 1 - k * 0.7;
    const wantY = Math.max(1.8, this.topY * 0.75 + 1.2);
    this.camTarget.y += (wantY - this.camTarget.y) * Math.min(1, dt * 2);
    this.camBase.y += ((wantY + 2.4) - this.camBase.y) * Math.min(1, dt * 2);
    this.shake = Math.max(0, this.shake - this.shake * dt * 3.2);
    const amount = this.shake * (this.reduceMotion ? 0.3 : 1);
    this.camera.position.set(this.camBase.x + (Math.random() - 0.5) * amount, this.camBase.y + (Math.random() - 0.5) * amount, this.camBase.z);
    this.camera.lookAt(this.camTarget);
    this.flag.rotation.y = Math.sin(this.time * 3) * 0.3 + (this.phase === 'gust' ? Math.sin(this.time * 14) * 0.5 : 0);
    if (this.portalRing) this.portalRing.rotation.z += dt * 0.6;
  }

  /* ============================================================== cierre */

  get completionPayload() {
    return {
      islandId: 'frustration',
      success: true,
      emoAventura: true,
      badge: 'frustration',
      title: 'La torre',
      message: `Llegaste a la cima con ${this.stats.placed} bloques puestos, ${this.stats.lost} caídos y ${this.gustsDone} ráfagas.`
    };
  }

  finish() {
    if (this.finished || this.closing) return;
    this.closing = true;
    addReward('llave-paciencia');
    if (this.stats.smalls > 0) addReward('escalera-pasos');
    if (this.stats.helps > 0) addReward('mano-amiga');
    completeActivity('frustration-torre-3d', 20);
    recordReevaluation('frustration', this.level.id, 'Parar, pasos cortos y pedir ayuda', 'baja');
    const usadas = [this.stats.pauses ? 'parar' : null, this.stats.smalls ? 'pasos cortos' : null, this.stats.helps ? 'pedir ayuda' : null].filter(Boolean);
    this.showClosingCard({
      title: 'Algo se interpuso, y llegaste',
      lines: [
        `${this.level.closing} Pusiste ${this.stats.placed} bloques, se cayeron ${this.stats.lost}${usadas.length ? ` y usaste ${usadas.join(', ')}` : ''}. Esto es lo que fuiste encontrando:`,
        ...this.seen.map((r) => `<strong>${r.title}.</strong> ${r.text}`)
      ],
      onDone: () => super.finish()
    });
  }

  onReset() {
    this.blocks.forEach((b) => this.scene.remove(b.mesh));
    this.debris.forEach((d) => this.scene.remove(d.mesh));
    this.blocks.length = 0;
    this.debris.length = 0;
    this.levels = 0;
    this.frus = 0;
    this.frusShown = 0;
    this.pausing = false;
    this.small = false;
    this.help = HELP_USES;
    this.helpArmed = false;
    this.hand.visible = false;
    this.gustsDone = 0;
    this.gustWarn = null;
    this.stats = { placed: 0, lost: 0, cuts: 0, pauses: 0, smalls: 0, helps: 0 };
    this.frusBar.set(0);
    this.pauseBar.show(false);
    this.tools.hidden = false;
    this.camTarget.y = 1.8;
    this.camBase.y = 4.2;
    if (this.portal) { this.scene.remove(this.portal); this.portal = null; this.portalRing = null; }
    this.phase = 'play';
    this.newSlider();
    this.renderLabel();
  }

  onDispose() {
    this.ambientWind?.stop();
    this.tools?.remove();
    this.waveEl?.remove();
    this.blocks.length = 0;
    this.debris.length = 0;
  }
}
