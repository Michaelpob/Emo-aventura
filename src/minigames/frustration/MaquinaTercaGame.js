// ISLA DE LA FRUSTRACION · Nivel 1 «El Taller de la Maquina Terca»
// Genero: PUZZLE DE ENSAMBLAJE con fallo guionizado · camara fija, se juega
// arrastrando con el raton o el dedo.
//
// El molino que da agua y luz a la Cordillera de los Nudos esta averiado. Se
// repara colocando piezas en sus huecos (arrastrar + girar con dos botones).
// Tres rondas, y el fallo esta escrito en el guion:
//   1. LA FACIL        dos piezas que entran de una: se aprende el control y
//                      se mide como juega el nino sin frustracion.
//   2. LA QUE NO ENTRA la pieza obvia esta doblada y NUNCA entra. Tras dos
//                      rebotes aparecen [Probar otra pieza] [Pedir una idea a
//                      Tuerca]. La solucion es otra pieza mas pequena, girada
//                      90°. Insistir igual no sirve; cambiar de estrategia si.
//   3. EL ENGRANAJE    solo gira si se lleva despacio y seguido. Rapido o
//                      forzado, se traba y sube la tension.
// El MEDIDOR DE TENSION (TensionMeter) es el corazon: sube con cada rebote,
// clic rapido, pieza forzada o rato sin avanzar; baja al encajar, al usar una
// herramienta de calma o al pedir ayuda. El taller devuelve la tension en el
// cuerpo (vibracion, vapor, latido, tinte naranja) para aprender a leer las
// senales antes del BLOQUEO (100): las piezas se congelan 3 s y se abre la
// CAJA DE HERRAMIENTAS DE CALMA (CalmToolbox). Nada se pierde nunca: no hay
// derrota, ni reinicio, ni castigo por fallar.
//
// Tuerca, la NPC mecanica, nunca regana: describe lo que ve.
// Todos los textos viven en textos.js.

import * as THREE from 'three';
import { MinigameBase, prefersReducedMotion } from '../../engine/MinigameBase.js';
import { createLights } from '../../engine/worldkit.js';
import { TensionMeter } from './TensionMeter.js';
import { CalmToolbox } from './CalmToolbox.js';
import { makeTuercaMesh, TuercaVoice } from './Tuerca.js';
import { MAQUINA as T, CAJA, veces, rellenar } from './textos.js';
import { addReward, completeActivity, recordReevaluation, setInitialIntensity, recordSession } from '../../data/gameState.js';

const PLANE_Z = 0.06;            // plano donde viven piezas y huecos (frente del panel)
const SNAP = 0.55;               // distancia al hueco para intentar encajar
const GEAR_GOAL = Math.PI * 4;   // dos vueltas
const GEAR_MAX_W = 2.4;          // rad/s: mas rapido que esto, se traba
const LOCK_SECONDS = 3;          // bloqueo: piezas congeladas
const IDLE_EVERY = 5;            // +2 de tension cada 5 s sin avanzar

// Sube / baja la tension (del documento)
const TENSION = { rebote: 12, clic: 3, forzar: 15, idle: 2, encaja: -20, herramienta: -40, ayuda: -15 };

// Piezas: forma, tamano (ancho x alto en el plano), simetria de giro y color
const SHAPES = {
  gear:  { w: 0.72, h: 0.72, sym: 45 },
  bar:   { w: 0.78, h: 0.28, sym: 180 },
  bent:  { w: 0.34, h: 0.7, sym: 180 },     // la doblada: parece la obvia, nunca entra
  small: { w: 0.6, h: 0.28, sym: 180 }      // la pequena: entra girada 90°
};

// Rondas: huecos en la maquina (izquierda) y piezas en la mesa giratoria (derecha)
const ROUNDS = [
  {
    id: 'facil',
    slots: [
      { shape: 'gear', x: -1.85, y: 2.2, rot: 0, accepts: ['gear'], color: '#d9a24a' },
      { shape: 'bar', x: -0.6, y: 2.2, rot: 0, accepts: ['bar'], color: '#7fb2c9' }
    ],
    pieces: [
      { shape: 'gear', color: '#d9a24a', x: 1.35, y: 2.15, rot: 0 },
      { shape: 'bar', color: '#7fb2c9', x: 2.45, y: 1.55, rot: 0 }
    ]
  },
  {
    id: 'noentra',
    slots: [
      { shape: 'tall', x: -2.0, y: 1.05, rot: 90, accepts: ['small'], color: '#c9584a' }
    ],
    pieces: [
      { shape: 'bent', color: '#c9584a', x: 1.4, y: 2.15, rot: 0, deformed: true },
      { shape: 'small', color: '#9fd8c0', x: 2.5, y: 0.95, rot: 0 }
    ]
  },
  { id: 'engranaje', gear: true }
];

const _plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -PLANE_Z);
const _ray = new THREE.Raycaster();
const _ndc = new THREE.Vector2();
const _hit = new THREE.Vector3();

export class MaquinaTercaGame extends MinigameBase {
  constructor(opts) {
    super({ ...opts, mode: 'third' });
    this.round = -1;
    this.roundDef = null;
    this.pieces = [];            // { def, group, x, y, rot, home, placed, shape }
    this.slots = [];             // { def, group, rim, filled }
    this.drag = null;            // { piece, dx, dy } | { gear: true, lastAngle, lastT }
    this.selected = null;
    this.anims = [];             // animaciones cortas (rebote, giro, mesa)
    this.gear = null;            // ronda 3
    this.gearProgress = 0;
    this.gearJam = 0;
    this.locked = false;         // bloqueo (piezas congeladas)
    this.lockTimer = 0;
    this.phase = 'intro';        // intro | play | locked | done
    this.time = 0;
    this.idle = 0;
    this.idleSaid = false;
    this.clicks = [];            // marcas de tiempo de toques recientes
    this.noted = new Set();
    this.optionsShown = false;
    this.planBUsed = 0;
    this.handle = false;         // manivela (plan B de la ronda 3)
    this.attempts = [0, 0, 0];
    this.attemptTimes = [];
    this.lastAttemptAt = null;
    this.lastBounceAt = -99;
    this.stats = { fallidos: 0, forzadas: 0, clics: 0, bloqueos: 0, ayudas: 0, herramientas: [], desdeInicio: 0 };
    this.reduceMotion = prefersReducedMotion();
    this.heartbeat = 0;
    this.shake = 0;
    this.entryIntensity = null;
    this.startedAt = null;
  }

  /* ============================================================ escenario */

  build() {
    const scene = this.scene;
    this.controller.enabled = false;
    this.el.touch.remove();
    this.root.classList.add('mt');
    this.renderer.toneMappingExposure = 1.0;

    scene.background = new THREE.Color('#2b2420');
    scene.fog = new THREE.Fog('#2b2420', 9, 18);
    this.lights = createLights({ sunColor: '#ffd9a8', sunIntensity: 1.2, hemiSky: '#8a7a6a', hemiGround: '#3a2a20', hemiIntensity: 0.7, area: 12 });
    this.lights.userData.sun.position.set(3, 7, 6);
    scene.add(this.lights);
    this.warmLight = new THREE.PointLight('#ffb870', 1.6, 14, 1.6);
    this.warmLight.position.set(0.5, 3.4, 2.2);
    scene.add(this.warmLight);

    this.mats = {
      wood: new THREE.MeshStandardMaterial({ color: '#8a6a48', roughness: 0.95, flatShading: true }),
      wall: new THREE.MeshStandardMaterial({ color: '#c4a274', roughness: 1, flatShading: true }),
      board: new THREE.MeshStandardMaterial({ color: '#a67c52', roughness: 0.95, flatShading: true }),
      metal: new THREE.MeshStandardMaterial({ color: '#4f6b6b', roughness: 0.6, metalness: 0.35, flatShading: true }),
      dark: new THREE.MeshStandardMaterial({ color: '#2a2f33', roughness: 0.8, flatShading: true }),
      rust: new THREE.MeshStandardMaterial({ color: '#9a5a3a', roughness: 0.9, flatShading: true }),
      brass: new THREE.MeshStandardMaterial({ color: '#c9a24a', roughness: 0.5, metalness: 0.5, flatShading: true }),
      slot: new THREE.MeshStandardMaterial({ color: '#15191c', roughness: 1 })
    };

    this.buildRoom();
    this.buildMachine();
    this.buildBoard();
    this.buildTuerca();
    this.buildLanterns();

    this.camera.fov = 50;
    this.camera.position.set(0.3, 2.5, 6.6);
    this.camBase = this.camera.position.clone();
    this.camTarget = new THREE.Vector3(0.3, 1.55, 0);
    this.camera.lookAt(this.camTarget);
    this.camera.updateProjectionMatrix();

    this.buildHud();
    this.buildInput();
    this.toolbox = new CalmToolbox(this, {
      hint: () => T.pistas[Math.max(0, this.round)],
      onPlanB: () => this.planB(),
      onLantern: (n) => this.dimLantern(n),
      onUsed: (id) => this.toolUsed(id),
      onClose: () => { this.directHelp = false; },
      reduceMotion: this.reduceMotion
    });
  }

  buildRoom() {
    const s = this.scene;
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(18, 12), this.mats.wood);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0, 2);
    floor.receiveShadow = true;
    s.add(floor);
    const back = new THREE.Mesh(new THREE.BoxGeometry(18, 5.2, 0.3), this.mats.wall);
    back.position.set(0, 2.6, -0.9);
    s.add(back);
    // vigas
    for (let i = -2; i <= 2; i += 1) {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 4.4), this.mats.dark);
      beam.position.set(i * 3.4, 4.2, 1.2);
      s.add(beam);
    }
    // estantes con tarros al fondo
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.08, 0.5), this.mats.board);
    shelf.position.set(4.6, 3.1, -0.6);
    s.add(shelf);
    const jarMat = new THREE.MeshStandardMaterial({ color: '#7a9aa6', roughness: 0.3, transparent: true, opacity: 0.8 });
    for (let i = 0; i < 4; i += 1) {
      const jar = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.36, 7), jarMat);
      jar.position.set(3.7 + i * 0.6, 3.32, -0.6);
      s.add(jar);
    }
    // la rueda del molino: entra por la pared izquierda; gira al final
    const wheel = new THREE.Group();
    const rim = new THREE.Mesh(new THREE.TorusGeometry(1.25, 0.1, 8, 24), this.mats.board);
    wheel.add(rim);
    for (let i = 0; i < 6; i += 1) {
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.08, 0.08), this.mats.board);
      spoke.rotation.z = (i / 6) * Math.PI;
      wheel.add(spoke);
      const paddle = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.18, 0.5), this.mats.wood);
      const a = (i / 6) * Math.PI * 2;
      paddle.position.set(Math.cos(a) * 1.3, Math.sin(a) * 1.3, 0);
      paddle.rotation.z = a;
      wheel.add(paddle);
    }
    wheel.position.set(-4.3, 2.3, -0.4);
    s.add(wheel);
    this.wheel = wheel;
    this.wheelSpin = 0;
    const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 2.4, 6), this.mats.dark);
    axle.rotation.z = Math.PI / 2;
    axle.position.set(-3.2, 2.3, -0.4);
    s.add(axle);
    // canal de agua bajo la rueda (se llena al final)
    const troughMat = new THREE.MeshStandardMaterial({ color: '#4f8fb8', roughness: 0.3, transparent: true, opacity: 0 });
    this.water = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.2, 1), troughMat);
    this.water.position.set(-4.3, 0.15, -0.2);
    s.add(this.water);
  }

  buildMachine() {
    const s = this.scene;
    const m = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.7, 2.5, 1.2), this.mats.metal);
    body.position.set(0, 1.55, -0.6);
    m.add(body);
    // remaches y tuberias
    for (let i = 0; i < 3; i += 1) {
      const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.9, 7), this.mats.brass);
      pipe.position.set(-0.8 + i * 0.8, 3.15, -0.6);
      m.add(pipe);
    }
    // manometro de la propia maquina: su aguja sigue la tension
    const gaugeBase = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.08, 16), this.mats.brass);
    gaugeBase.rotation.x = Math.PI / 2;
    gaugeBase.position.set(0.95, 2.55, 0.02);
    m.add(gaugeBase);
    this.gaugeNeedle = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.2, 0.02), this.mats.dark);
    this.gaugeNeedle.position.set(0.95, 2.62, 0.07);
    m.add(this.gaugeNeedle);
    // bombilla del molino, apagada
    this.bulb = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), new THREE.MeshStandardMaterial({ color: '#6a6a60', emissive: '#000000', roughness: 0.4 }));
    this.bulb.position.set(-0.9, 3.35, -0.4);
    m.add(this.bulb);
    this.bulbLight = new THREE.PointLight('#ffe9a8', 0, 9, 2);
    this.bulbLight.position.set(-0.9, 3.4, 0.2);
    m.add(this.bulbLight);
    m.position.set(-1.15, 0, 0);
    s.add(m);
    this.machine = m;
    this.machineHome = m.position.clone();

    // el engranaje grande de la ronda 3, escondido hasta entonces
    const g = new THREE.Group();
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.12, 24), this.mats.brass);
    disc.rotation.x = Math.PI / 2;
    g.add(disc);
    for (let i = 0; i < 12; i += 1) {
      const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.12), this.mats.brass);
      const a = (i / 12) * Math.PI * 2;
      tooth.position.set(Math.cos(a) * 0.68, Math.sin(a) * 0.68, 0);
      tooth.rotation.z = a;
      g.add(tooth);
    }
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.18, 8), this.mats.dark);
    hub.rotation.x = Math.PI / 2;
    g.add(hub);
    const mark = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.4, 0.14), this.mats.rust);
    mark.position.set(0, 0.32, 0);
    g.add(mark);
    g.position.set(-0.7, 1.08, PLANE_Z);
    g.visible = false;
    s.add(g);
    this.gear = g;
    this.handleMesh = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.7, 0.1), this.mats.wood);
    this.handleMesh.position.set(0.5, 0.35, 0.12);
    this.handleMesh.visible = false;
    g.add(this.handleMesh);
  }

  buildBoard() {
    // la mesa giratoria: un tablero vertical con las piezas colgadas
    const b = new THREE.Group();
    const panel = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.3, 0.1), this.mats.board);
    panel.position.set(0, 1.55, -0.05);
    b.add(panel);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.5, 6), this.mats.dark);
    post.position.set(0, 0.25, -0.05);
    b.add(post);
    b.position.set(1.95, 0, 0);
    this.scene.add(b);
    this.board = b;
  }

  buildTuerca() {
    const t = makeTuercaMesh({ scale: 0.85 });
    t.position.set(3.8, 0, -0.3);
    t.rotation.y = -0.5;
    t.userData.baseY = 0;
    this.scene.add(t);
    this.tuerca = t;
  }

  buildLanterns() {
    this.lanterns = [];
    for (let i = 0; i < 5; i += 1) {
      const g = new THREE.Group();
      const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.5, 4), this.mats.dark);
      cord.position.y = 0.55;
      g.add(cord);
      const mat = new THREE.MeshStandardMaterial({ color: '#ffb870', emissive: '#ff9a3c', emissiveIntensity: 1.3, roughness: 0.6 });
      const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.36, 8), mat);
      lamp.position.y = 0.15;
      g.add(lamp);
      g.position.set(-3.4 + i * 1.7, 3.55, 1.2);
      this.scene.add(g);
      this.lanterns.push({ group: g, mat });
    }
  }

  /* ================================================================= HUD */

  buildHud() {
    this.meter = new TensionMeter({
      host: this.el.hud,
      label: T.hud.tension,
      icon: '🔧',
      onBand: (band) => this.onBand(band),
      onMax: () => this.lock()
    });

    this.vignette = document.createElement('div');
    this.vignette.className = 'mt-vignette';
    this.root.appendChild(this.vignette);

    this.roundEl = document.createElement('div');
    this.roundEl.className = 'i3d-wave mt-round';
    this.el.hud.appendChild(this.roundEl);

    this.voice = new TuercaVoice(this, this.tuerca, T.tuerca.nombre);

    this.tools = document.createElement('div');
    this.tools.className = 'i3d-tools mt-tools';
    this.tools.innerHTML = `
      <button class="i3d-tool" type="button" data-rot="-1" aria-label="${T.hud.girarIzq}"><b>↺</b><span>Girar<small>Q</small></span></button>
      <button class="i3d-tool" type="button" data-rot="1" aria-label="${T.hud.girarDer}"><b>↻</b><span>Girar<small>E</small></span></button>
      <button class="i3d-tool" type="button" data-calm aria-label="${T.hud.calma}"><b>🧰</b><span>Calma<small>caja</small></span></button>
      <button class="i3d-tool" type="button" data-help aria-label="${T.hud.ayuda}"><b>🤝</b><span>Ayuda<small>Tuerca</small></span></button>
    `;
    this.el.hud.appendChild(this.tools);
    this.tools.querySelectorAll('[data-rot]').forEach((b) => b.addEventListener('click', () => this.rotateSelected(Number(b.dataset.rot))));
    this.tools.querySelector('[data-calm]').addEventListener('click', () => this.openToolbox(false));
    this.tools.querySelector('[data-help]').addEventListener('click', () => this.askHelp());

    this.optionsEl = document.createElement('div');
    this.optionsEl.className = 'mt-options';
    this.optionsEl.hidden = true;
    this.optionsEl.innerHTML = `
      <button class="i3d-btn" type="button" data-other>🧩 ${T.hud.otraPieza}</button>
      <button class="i3d-btn i3d-btn--primary" type="button" data-idea>🔩 ${T.hud.ideaTuerca}</button>`;
    this.el.hud.appendChild(this.optionsEl);
    this.optionsEl.querySelector('[data-other]').addEventListener('click', () => this.suggestOther());
    this.optionsEl.querySelector('[data-idea]').addEventListener('click', () => this.askHelp());
  }

  tuercaSays(text, key = null) { this.voice.say(text, key); }

  note(key) {
    if (this.noted.has(key)) return;
    this.noted.add(key);
    this.later(() => this.showNote({ ...T.notas[key] }), 600);
  }

  renderRound() {
    this.roundEl.innerHTML = `<b>${this.round + 1}</b>/3 <small>· ${T.hud.ronda[this.round] ?? ''}</small>`;
  }

  /* =============================================================== input */

  buildInput() {
    const dom = this.renderer.domElement;
    const toPlane = (e) => {
      const r = dom.getBoundingClientRect();
      _ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      _ray.setFromCamera(_ndc, this.camera);
      return _ray.ray.intersectPlane(_plane, _hit) ? _hit : null;
    };
    const down = (e) => {
      if (this.paused || this.finished || this.phase !== 'play') return;
      if (e.button !== undefined && e.button > 0) return;
      this.countClick();
      if (this.locked || this.toolbox.isOpen) return;
      const p = toPlane(e);
      if (!p) return;
      e.preventDefault();
      try { dom.setPointerCapture(e.pointerId); } catch { /* opcional */ }
      if (this.roundDef?.gear) {
        const g = this.gear.position;
        if (Math.hypot(p.x - g.x, p.y - g.y) < 0.95) {
          this.drag = { gear: true, id: e.pointerId, lastAngle: Math.atan2(p.y - g.y, p.x - g.x), lastT: performance.now(), moved: 0 };
        }
        return;
      }
      const piece = this.pieceAt(p.x, p.y);
      if (!piece) return;
      this.select(piece);
      this.drag = { piece, id: e.pointerId, dx: piece.x - p.x, dy: piece.y - p.y, from: { x: piece.x, y: piece.y } };
      piece.group.position.z = PLANE_Z + 0.25;
      this.audio.play('interact', { volume: 0.2, rate: 1.2 });
    };
    const move = (e) => {
      if (!this.drag || this.drag.id !== e.pointerId) return;
      const p = toPlane(e);
      if (!p) return;
      if (this.drag.gear) { this.turnGear(p); return; }
      const piece = this.drag.piece;
      piece.x = Math.max(-3.2, Math.min(3.6, p.x + this.drag.dx));
      piece.y = Math.max(0.35, Math.min(3.1, p.y + this.drag.dy));
      piece.group.position.set(piece.x, piece.y, PLANE_Z + 0.25);
    };
    const up = (e) => {
      if (!this.drag || (e && e.pointerId !== undefined && e.pointerId !== this.drag.id)) return;
      const d = this.drag;
      this.drag = null;
      if (d.gear) return;
      this.dropPiece(d.piece);
    };
    dom.addEventListener('pointerdown', down);
    dom.addEventListener('pointermove', move);
    dom.addEventListener('pointerup', up);
    dom.addEventListener('pointercancel', up);
    window.addEventListener('pointerup', up);
    window.addEventListener('blur', () => up(null));
    this.listeners.push(() => { dom.removeEventListener('pointerdown', down); dom.removeEventListener('pointermove', move); dom.removeEventListener('pointerup', up); dom.removeEventListener('pointercancel', up); window.removeEventListener('pointerup', up); });

    const keyDown = (e) => {
      if (this.paused || this.finished || e.repeat || this.toolbox.isOpen) return;
      if (e.key === 'q' || e.key === 'Q') this.rotateSelected(-1);
      if (e.key === 'e' || e.key === 'E') this.rotateSelected(1);
      if (e.key === 'a' || e.key === 'A') this.askHelp();
      if (e.key === 'c' || e.key === 'C') this.openToolbox(false);
    };
    window.addEventListener('keydown', keyDown);
    this.listeners.push(() => window.removeEventListener('keydown', keyDown));
  }

  /** Toques muy seguidos (mas de 3 por segundo): la mano se acelera */
  countClick() {
    const now = this.time;
    this.clicks = this.clicks.filter((t) => now - t < 1);
    this.clicks.push(now);
    if (this.clicks.length > 3) {
      this.stats.clics += 1;
      this.meter.add(TENSION.clic, 'clics');
      this.say(T.avisos.clics, 900);
      this.tuercaSays(T.tuerca.clicsRapidos, 'clics');
    }
  }

  pieceAt(x, y) {
    let best = null;
    let bestD = 1e9;
    for (const p of this.pieces) {
      if (p.placed || p.hidden) continue;
      const s = SHAPES[p.shape];
      const r = Math.max(s.w, s.h) * 0.62;
      const d = Math.hypot(p.x - x, p.y - y);
      if (d < r && d < bestD) { best = p; bestD = d; }
    }
    return best;
  }

  select(piece) {
    if (this.selected && this.selected !== piece) this.selected.group.scale.setScalar(1);
    this.selected = piece;
  }

  /* ============================================================== piezas */

  makePiece(def) {
    const g = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: def.color, roughness: 0.55, metalness: 0.25, flatShading: true });
    const s = SHAPES[def.shape];
    if (def.shape === 'gear') {
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.14, 16), mat);
      disc.rotation.x = Math.PI / 2;
      g.add(disc);
      for (let i = 0; i < 8; i += 1) {
        const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.14), mat);
        const a = (i / 8) * Math.PI * 2;
        tooth.position.set(Math.cos(a) * 0.31, Math.sin(a) * 0.31, 0);
        tooth.rotation.z = a;
        g.add(tooth);
      }
    } else if (def.shape === 'bent') {
      // doblada: dos mitades con un angulo entre ellas
      const a = new THREE.Mesh(new THREE.BoxGeometry(s.w, s.h / 2 + 0.04, 0.14), mat);
      a.position.set(-0.05, s.h / 4, 0);
      a.rotation.z = 0.22;
      const b = new THREE.Mesh(new THREE.BoxGeometry(s.w, s.h / 2 + 0.04, 0.14), mat);
      b.position.set(0.05, -s.h / 4, 0);
      b.rotation.z = -0.22;
      g.add(a, b);
    } else {
      g.add(new THREE.Mesh(new THREE.BoxGeometry(s.w, s.h, 0.14), mat));
      if (def.shape === 'bar') {
        [-0.25, 0.25].forEach((x) => {
          const hole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.16, 8), this.mats.dark);
          hole.rotation.x = Math.PI / 2;
          hole.position.set(x, 0, 0);
          g.add(hole);
        });
      }
    }
    g.rotation.z = THREE.MathUtils.degToRad(def.rot ?? 0);
    return { def, group: g, shape: def.shape, x: 0, y: 0, rot: def.rot ?? 0, placed: false, deformed: !!def.deformed, hidden: false, glow: mat };
  }

  makeSlot(def) {
    const g = new THREE.Group();
    const s = def.shape === 'tall' ? { w: 0.34, h: 0.66 } : SHAPES[def.shape];
    const hole = new THREE.Mesh(new THREE.BoxGeometry(s.w + 0.12, s.h + 0.12, 0.06), this.mats.slot);
    g.add(hole);
    const rimMat = new THREE.MeshStandardMaterial({ color: def.color, emissive: def.color, emissiveIntensity: 0.35, roughness: 0.6 });
    const rim = new THREE.Mesh(new THREE.BoxGeometry(s.w + 0.22, s.h + 0.22, 0.03), rimMat);
    rim.position.z = -0.02;
    g.add(rim);
    g.position.set(def.x, def.y, PLANE_Z - 0.02);
    return { def, group: g, rim: rimMat, filled: false };
  }

  /** Coloca las piezas de la ronda en la mesa y los huecos en la maquina */
  setRound(i) {
    this.round = i;
    this.roundDef = ROUNDS[i];
    this.optionsEl.hidden = true;
    this.optionsShown = false;
    this.idle = 0;
    this.idleSaid = false;
    this.pieces.forEach((p) => { if (!p.placed) this.scene.remove(p.group); });
    this.pieces = this.pieces.filter((p) => p.placed);
    this.slots.forEach((sl) => { if (!sl.filled) this.scene.remove(sl.group); });
    this.slots = this.slots.filter((sl) => sl.filled);
    this.selected = null;
    this.renderRound();

    if (this.roundDef.gear) {
      this.gear.visible = true;
      this.gear.rotation.z = 0;
      this.gearProgress = 0;
      this.setObjective(8, '⚙');
      this.tools.querySelectorAll('[data-rot]').forEach((b) => { b.disabled = true; });
      this.tuercaSays(T.tuerca.ronda3);
      return;
    }
    this.tools.querySelectorAll('[data-rot]').forEach((b) => { b.disabled = false; });
    this.setObjective(this.roundDef.slots.length, '🧩');
    this.roundDef.slots.forEach((sd) => {
      const sl = this.makeSlot(sd);
      this.scene.add(sl.group);
      this.slots.push(sl);
    });
    this.roundDef.pieces.forEach((pd, k) => {
      const p = this.makePiece(pd);
      p.x = pd.x;
      p.y = pd.y;
      p.home = { x: pd.x, y: pd.y };
      p.group.position.set(pd.x, pd.y, PLANE_Z);
      this.scene.add(p.group);
      this.pieces.push(p);
      if (k === 0) this.select(p);
    });
    this.tuercaSays(i === 0 ? T.tuerca.ronda1 : T.tuerca.ronda2);
  }

  rotateSelected(dir) {
    const p = this.selected;
    if (!p || p.placed || this.phase !== 'play' || this.locked) return;
    p.rot = (p.rot + dir * 90 + 360) % 360;
    const target = THREE.MathUtils.degToRad(p.rot);
    // giro corto y animado
    const from = p.group.rotation.z;
    let to = target;
    while (to - from > Math.PI) to -= Math.PI * 2;
    while (to - from < -Math.PI) to += Math.PI * 2;
    this.anims.push({ t: 0, dur: 0.22, step: (u) => { p.group.rotation.z = from + (to - from) * u; }, done: () => { p.group.rotation.z = target; } });
    this.audio.play('ratchet', { volume: 0.4 });
    this.idle = 0;
  }

  /** Suelta una pieza: encaja, rebota o vuelve a la mesa */
  dropPiece(piece) {
    piece.group.position.z = PLANE_Z;
    const slot = this.slots.find((sl) => !sl.filled && Math.hypot(sl.def.x - piece.x, sl.def.y - piece.y) < SNAP + (this.adaptive ? 0.2 : 0));
    if (!slot) { this.returnHome(piece, false); return; }
    this.attempts[this.round] += 1;
    const now = this.time;
    if (this.lastAttemptAt !== null) this.attemptTimes.push(+(now - this.lastAttemptAt).toFixed(1));
    this.lastAttemptAt = now;
    this.idle = 0;

    const fits = !piece.deformed && slot.def.accepts.includes(piece.shape) && this.rotFits(piece, slot);
    if (fits) { this.placePiece(piece, slot); return; }

    // NO entra: rebote seco y vibracion. Repetir enseguida la doblada es forzar.
    const forcing = piece.deformed && this.attempts[this.round] >= 3;
    this.stats.fallidos += 1;
    if (forcing) {
      this.stats.forzadas += 1;
      this.meter.add(TENSION.forzar, 'forzar');
      this.say(T.avisos.forzar, 1300);
      this.tuercaSays(T.tuerca.forzar, 'forzar');
    } else {
      this.meter.add(TENSION.rebote, 'rebote');
      this.say(T.avisos.rebota, 1200);
      if (piece.deformed) {
        const n = this.attempts[this.round];
        if (n === 1) this.tuercaSays(T.tuerca.rebote1);
        else this.tuercaSays(T.tuerca.rebote2);
      }
    }
    this.audio.play('thud', { volume: 0.55, rate: 1.1 });
    this.audio.play('buzz', { volume: 0.35, rate: 0.8 });
    this.shakeBy(0.18);
    this.note('senales');
    this.lastBounceAt = now;
    this.returnHome(piece, true);
    if (piece.deformed && this.attempts[this.round] >= 2 && !this.optionsShown) this.showOptions();
  }

  rotFits(piece, slot) {
    const sym = SHAPES[piece.shape].sym;
    const diff = ((piece.rot - (slot.def.rot ?? 0)) % 360 + 360) % 360;
    return diff % sym === 0;
  }

  /** Vuelve a la mesa: rebotando (con vibracion) o suave */
  returnHome(piece, bounce) {
    const from = { x: piece.x, y: piece.y };
    const to = piece.home;
    const dur = bounce ? 0.55 : 0.35;
    this.anims.push({
      t: 0, dur,
      step: (u) => {
        const k = bounce ? u : u * u * (3 - 2 * u);
        piece.x = from.x + (to.x - from.x) * k;
        piece.y = from.y + (to.y - from.y) * k + (bounce ? Math.sin(u * Math.PI) * 0.7 : 0);
        const jit = bounce && !this.reduceMotion ? (1 - u) * 0.06 : 0;
        piece.group.position.set(piece.x + (Math.random() - 0.5) * jit, piece.y + (Math.random() - 0.5) * jit, PLANE_Z + (bounce ? Math.sin(u * Math.PI) * 0.3 : 0));
        if (bounce) piece.group.rotation.z = THREE.MathUtils.degToRad(piece.rot) + Math.sin(u * 30) * 0.12 * (1 - u);
      },
      done: () => { piece.x = to.x; piece.y = to.y; piece.group.position.set(to.x, to.y, PLANE_Z); piece.group.rotation.z = THREE.MathUtils.degToRad(piece.rot); }
    });
  }

  placePiece(piece, slot) {
    piece.placed = true;
    slot.filled = true;
    piece.x = slot.def.x;
    piece.y = slot.def.y;
    piece.group.position.set(slot.def.x, slot.def.y, PLANE_Z);
    piece.group.rotation.z = THREE.MathUtils.degToRad(piece.rot);
    slot.rim.emissive.set('#7fd1a8');
    slot.rim.emissiveIntensity = 1.2;
    this.audio.play('clank', { volume: 0.6 });
    this.say(T.avisos.encaja, 1100);
    this.meter.add(TENSION.encaja, 'encaja');
    this.feedback.burst(new THREE.Vector3(slot.def.x, slot.def.y, PLANE_Z + 0.2), { count: 14, color: '#ffe9a8', speed: 2, life: 0.7, gravity: -2 });
    if (this.selected === piece) this.selected = this.pieces.find((p) => !p.placed && !p.hidden) ?? null;
    if (this.advanceObjective()) this.roundDone();
  }

  /* ---------------------------------------------- ronda 2: las opciones */

  showOptions() {
    this.optionsShown = true;
    this.optionsEl.hidden = false;
  }

  suggestOther() {
    this.optionsEl.hidden = true;
    this.tuercaSays(T.tuerca.opcionOtra);
    const small = this.pieces.find((p) => p.shape === 'small' && !p.placed);
    if (small) {
      small.glow.emissive.set(small.def.color);
      this.anims.push({ t: 0, dur: 2.4, step: (u) => { small.glow.emissiveIntensity = 0.9 * Math.abs(Math.sin(u * Math.PI * 4)); }, done: () => { small.glow.emissiveIntensity = 0; } });
      this.select(small);
    }
    this.note('planB');
    this.stats.otraPieza = true;
  }

  /** Pedir ayuda: siempre disponible, siempre premiado, nunca cuesta */
  askHelp() {
    if (this.phase !== 'play' || this.toolbox.isOpen) return;
    this.optionsEl.hidden = true;
    this.directHelp = true;
    this.stats.ayudas += 1;
    this.meter.add(TENSION.ayuda, 'ayuda');
    this.say(T.avisos.calma, 1400);
    this.toolbox.open({ forced: false, tools: ['ayuda'], title: T.hud.ayuda, sub: '' });
    this.toolbox.pick('ayuda');
    this.note('ayuda');
  }

  /* ---------------------------------------------- ronda 3: el engranaje */

  turnGear(p) {
    const d = this.drag;
    const g = this.gear.position;
    const now = performance.now();
    const dt = Math.max(0.004, (now - d.lastT) / 1000);
    d.lastT = now;
    const ang = Math.atan2(p.y - g.y, p.x - g.x);
    let delta = ang - d.lastAngle;
    while (delta > Math.PI) delta -= Math.PI * 2;
    while (delta < -Math.PI) delta += Math.PI * 2;
    d.lastAngle = ang;
    if (this.gearJam > 0) return;
    const w = Math.abs(delta) / dt;
    const maxW = GEAR_MAX_W * (this.handle ? 1.6 : 1) * (this.adaptive ? 1.3 : 1);
    if (w > maxW && Math.abs(delta) > 0.03) {
      // forzado: se traba, sube la tension
      this.gearJam = 0.9;
      this.stats.forzadas += 1;
      this.attempts[2] += 1;
      this.meter.add(TENSION.forzar, 'forzar');
      this.say(T.avisos.traba, 1300);
      this.tuercaSays(T.tuerca.traba, 'traba');
      this.audio.play('metal', { volume: 0.55 });
      this.shakeBy(0.22);
      this.note('despacio');
      return;
    }
    this.gear.rotation.z += delta;
    this.gearProgress += Math.abs(delta);
    this.idle = 0;
    if (Math.abs(delta) > 0.002) {
      d.moved += Math.abs(delta);
      if (d.moved > 0.5) { d.moved = 0; this.audio.play('ratchet', { volume: 0.22, rate: 0.9 }); }
    }
    const done = Math.min(8, Math.floor((this.gearProgress / GEAR_GOAL) * 8));
    if (done !== this.objective.done) {
      this.objective.done = done;
      this.renderObjective();
      if (done === 2) this.say(T.avisos.gira, 1200);
    }
    if (this.gearProgress >= GEAR_GOAL) { this.gearProgress = GEAR_GOAL; this.drag = null; this.roundDone(); }
  }

  /* ============================================================ tension */

  onBand(band) {
    if (band === 'sube') { this.say(T.avisos.sube, 1200); this.note('senales'); }
    if (band === 'alta') this.audio.play('sizzle', { volume: 0.4 });
  }

  /** BLOQUEO (no es castigo, es la leccion): 3 s congelado y la caja de calma */
  lock() {
    if (this.phase !== 'play' || this.locked) return;
    this.locked = true;
    this.lockTimer = LOCK_SECONDS;
    this.stats.bloqueos += 1;
    if (this.drag?.piece) this.returnHome(this.drag.piece, false);
    this.drag = null;
    this.optionsEl.hidden = true;
    this.audio.duck(0.3);
    this.audio.play('hiss', { volume: 0.5 });
    this.say(T.avisos.bloqueo, 0);
    this.tuercaSays(T.tuerca.bloqueo);
    if (this.stats.bloqueos >= 2 && !this.adaptive) {
      // escalado adaptativo: solo mas facil, nunca mas dificil
      this.adaptive = true;
      this.stats.adaptativo = true;
    }
  }

  openToolbox(forced) {
    if (this.toolbox.isOpen || this.phase !== 'play') return;
    if (!forced) this.stats.cajaVoluntaria = (this.stats.cajaVoluntaria ?? 0) + 1;
    this.toolbox.open({ forced });
  }

  /**
   * Tras cualquier herramienta: tension -40 (pedir ayuda desde la caja, -15,
   * salvo en bloqueo), la maquina se destraba y se sigue donde se estaba.
   */
  toolUsed(id) {
    this.stats.herramientas.push(id);
    const direct = this.directHelp;
    this.directHelp = false;
    if (id === 'ayuda' && !direct) this.stats.ayudas += 1;
    if (!direct) {
      const delta = id === 'ayuda' && !this.locked ? TENSION.ayuda : TENSION.herramienta;
      this.meter.add(delta, id === 'ayuda' ? 'ayuda' : 'herramienta');
      this.say(delta === TENSION.herramienta ? CAJA.usada : T.avisos.calma, 2200);
    }
    if (this.locked) {
      this.locked = false;
      this.lockTimer = 0;
      this.audio.unduck();
      this.tuercaSays(T.tuerca.bloqueoFin);
    }
    this.audio.play('warm', { volume: 0.45 });
  }

  /** Cambiar de plan: la mesa gira y trae otras piezas / otra idea */
  planB() {
    this.planBUsed += 1;
    this.anims.push({ t: 0, dur: 1.1, step: (u) => { this.board.rotation.y = u * Math.PI * 2; }, done: () => { this.board.rotation.y = 0; } });
    this.audio.play('creak', { volume: 0.4 });
    if (this.roundDef?.gear) {
      this.handle = true;
      this.handleMesh.visible = true;
      return T.planB[2];
    }
    // la pieza pequena pasa a primer plano; la doblada, al fondo de la mesa
    const small = this.pieces.find((p) => p.shape === 'small' && !p.placed);
    const bent = this.pieces.find((p) => p.deformed && !p.placed);
    if (small && bent) {
      const a = small.home;
      small.home = bent.home;
      bent.home = a;
      this.returnHome(small, false);
      this.returnHome(bent, false);
      this.select(small);
      return T.planB[1];
    }
    // ronda 1: se reordena la mesa
    this.pieces.filter((p) => !p.placed).forEach((p) => { p.home = { x: p.home.x, y: p.home.y === 2.15 ? 1.55 : 2.15 }; this.returnHome(p, false); });
    return T.planB[0];
  }

  dimLantern(n) {
    const l = this.lanterns[n - 1];
    if (!l) return;
    l.mat.emissiveIntensity = 0.05;
    l.mat.color.set('#6a5a4a');
    this.warmLight.intensity = Math.max(0.6, this.warmLight.intensity - 0.2);
  }

  relightLanterns() {
    this.lanterns.forEach((l) => { l.mat.emissiveIntensity = 1.3; l.mat.color.set('#ffb870'); });
    this.warmLight.intensity = 1.6;
  }

  shakeBy(v) { this.shake = Math.max(this.shake, v); }

  /* ============================================================== rondas */

  async onStart() {
    const n = await this.showChoice({
      eyebrow: T.intro.eyebrow,
      title: '¿Cuánta frustración traes hoy?',
      options: T.cierre.caras.map((c) => ({ label: `${c.icon} ${c.n}`, text: c.label, value: c.n, color: ['#7fd1a8', '#b8d97a', '#ffd166', '#ff9a5c', '#ff6b5c'][c.n - 1] }))
    });
    this.entryIntensity = n;
    setInitialIntensity(n <= 2 ? 'baja' : n === 3 ? 'media' : 'alta');
    await this.showIntro(T.intro);
    this.startedAt = performance.now();
    this.hum = this.audio.ambient('hum', { volume: 0.22, rate: 0.9 });
    this.steam = this.audio.ambient('sizzle', { volume: 0 });
    this.phase = 'play';
    this.tuercaSays(T.tuerca.bienvenida);
    this.later(() => this.setRound(0), 2600);
  }

  roundDone() {
    if (this.phase !== 'play') return;
    const i = this.round;
    this.optionsEl.hidden = true;
    this.audio.play('success', { volume: 0.4 });
    if (i === 0) this.tuercaSays(T.tuerca.ronda1Ok);
    if (i === 1) { this.tuercaSays(T.tuerca.ronda2Ok); this.note('planB'); completeActivity('frustration-planb', 6); }
    if (i === 2) { this.tuercaSays(T.tuerca.ronda3Ok); completeActivity('frustration-engranaje', 6); }
    this.relightLanterns();
    if (i >= ROUNDS.length - 1) { this.later(() => this.repairMill(), 2200); return; }
    this.later(() => { if (this.phase === 'play') this.setRound(i + 1); }, 2600);
  }

  /* ============================================================== cierre */

  repairMill() {
    this.phase = 'done';
    this.locked = false;
    this.drag = null;
    this.tools.hidden = true;
    this.meter.set(Math.min(this.meter.value, 25), 'molino');
    this.say(T.avisos.molino, 2600);
    this.tuercaSays(T.tuerca.final);
    this.audio.play('success', { volume: 0.5 });
    this.audio.play('warm', { volume: 0.5 });
    // luz, rueda y agua
    this.bulb.material.emissive.set('#ffe9a8');
    this.bulb.material.emissiveIntensity = 1.6;
    this.feedback.tweenValue(this.bulbLight, 'intensity', 2.4, 1.2);
    this.feedback.tweenValue(this.water.material, 'opacity', 0.85, 2.5);
    this.wheelSpin = 1;
    this.waterOn = true;
    this.waterSfx = this.audio.ambient('water', { volume: 0.25 });
    this.feedback.flash(new THREE.Vector3(-1.5, 3, 1), { color: '#ffe9a8', intensity: 4, duration: 1.6, distance: 14 });
    completeActivity('frustration-molino', 12);
    this.later(() => this.askReevaluation(), 4200);
  }

  /** Pasos 6-8: reevaluacion, feedback con los datos reales y reto */
  async askReevaluation() {
    const c = T.cierre;
    const intensidad = await this.showChoice({
      eyebrow: T.intro.eyebrow,
      title: c.reevalTitulo,
      options: c.caras.map((f) => ({ label: `${f.icon} ${f.n}`, text: f.label, value: f.n, color: ['#7fd1a8', '#b8d97a', '#ffd166', '#ff9a5c', '#ff6b5c'][f.n - 1] }))
    });
    // que ayudo mas: solo lo que de verdad uso
    const usadas = [...new Set(this.stats.herramientas)];
    const ids = [...usadas];
    if (this.stats.otraPieza) ids.push('otraPieza');
    ids.push('despacio');
    const util = await this.showChoice({
      eyebrow: T.intro.eyebrow,
      title: c.utilTitulo,
      options: ids.map((id) => ({ label: `${c.utiles[id].icon} ${c.utiles[id].label}`, text: '', value: id, color: '#ffd166' }))
    });
    this.reevaluation = { intensidad, util };
    const lines = this.feedbackLines(usadas);
    this.showClosingCard({
      title: c.feedbackTitulo,
      lines: [...lines, `<strong>Reto para hoy:</strong> ${c.reto}`, `<strong>Recompensa:</strong> ⚙️ ${c.recompensa}`],
      onDone: () => this.finish()
    });
  }

  feedbackLines(usadas) {
    const f = T.cierre.feedback;
    const st = this.meter.stats();
    const names = { respiracion: 'respirar', contar: 'contar hasta uno', ayuda: 'pedir ayuda', planB: 'cambiar de plan' };
    const lines = [];
    const herramientas = usadas.map((u) => names[u]).join(', ');
    if (st.maximo > 60 && usadas.length) lines.push(rellenar(f.reguloAlta, { max: st.maximo, herramientas }));
    else if (st.maximo <= 45) lines.push(rellenar(f.calmaBaja, { max: st.maximo }));
    if (this.stats.ayudas > 0) lines.push(rellenar(f.pidioAyuda, { ayudas: this.stats.ayudas, vez: veces(this.stats.ayudas) }));
    if (this.stats.forzadas >= 2) lines.push(rellenar(f.forzo, { forzadas: this.stats.forzadas }));
    if (this.stats.clics >= 3) lines.push(rellenar(f.clics, { clics: this.stats.clics }));
    if (this.stats.bloqueos > 0) lines.push(rellenar(f.bloqueo, { bloqueos: this.stats.bloqueos, vez: veces(this.stats.bloqueos), salidas: this.stats.bloqueos === 1 ? 'esa vez' : 'todas las veces' }));
    if (!usadas.length && st.maximo <= 60) lines.push(f.sinTension);
    return lines;
  }

  /** JSON de sesion (feedback e investigacion) */
  sessionData() {
    const st = this.meter.stats();
    return {
      nivel: 'frustracion_1',
      intentosPorRonda: [...this.attempts],
      intentosFallidos: this.stats.fallidos,
      tensionMaxima: st.maximo,
      tensionPromedio: st.promedio,
      vecesBloqueo: this.stats.bloqueos,
      herramientasUsadas: [...new Set(this.stats.herramientas)],
      pidioAyuda: this.stats.ayudas > 0,
      clicsImpulsivos: this.stats.clics,
      piezasForzadas: this.stats.forzadas,
      escaladoAdaptativo: !!this.stats.adaptativo,
      tiempoTotalSeg: this.startedAt ? Math.round((performance.now() - this.startedAt) / 1000) : 0,
      tiempoEntreIntentos: [...this.attemptTimes],
      intensidadInicial: this.entryIntensity,
      intensidadAutoreportada: this.reevaluation?.intensidad ?? null,
      estrategiaElegidaComoUtil: this.reevaluation?.util ?? null
    };
  }

  get completionPayload() {
    return {
      islandId: 'frustration',
      success: true,
      emoAventura: true,
      badge: 'frustration',
      title: 'La Máquina Terca',
      message: `Reparaste el molino: ${this.stats.fallidos} rebotes, tensión máxima ${this.meter.stats().maximo} y ${this.stats.herramientas.length} herramientas de calma.`
    };
  }

  finish() {
    if (this.finished || this.closing) return;
    this.closing = true;
    const session = this.sessionData();
    addReward('llave-engranaje');
    completeActivity('frustration-maquina-3d', 20);
    const ini = this.entryIntensity ?? 3;
    const fin = session.intensidadAutoreportada ?? ini;
    const lvl = (n) => (n <= 2 ? 'baja' : n === 3 ? 'media' : 'alta');
    recordReevaluation('frustration', lvl(ini), session.estrategiaElegidaComoUtil ?? 'ninguna', lvl(fin));
    recordSession(session);
    super.finish({ session });
  }

  /* =============================================================== bucle */

  onUpdate(dt) {
    this.time += dt;
    this.meter.update(dt);
    // el ajuste de reducir movimiento se puede cambiar en el menu de pausa
    this._rmT = (this._rmT ?? 0) + dt;
    if (this._rmT > 1) { this._rmT = 0; this.reduceMotion = prefersReducedMotion(); this.toolbox.reduceMotion = this.reduceMotion; }

    // animaciones cortas
    for (let i = this.anims.length - 1; i >= 0; i -= 1) {
      const a = this.anims[i];
      a.t += dt;
      const u = Math.min(1, a.t / a.dur);
      a.step(u);
      if (u >= 1) { a.done?.(); this.anims.splice(i, 1); }
    }

    if (this.phase === 'play') {
      // bloqueo: 3 s congelado y luego la caja
      if (this.locked && this.lockTimer > 0) {
        this.lockTimer -= dt;
        if (this.lockTimer <= 0) this.toolbox.open({ forced: true });
      }
      // sin avanzar: la tension sube despacio (salvo con la caja abierta o en adaptativo)
      if (!this.locked && !this.toolbox.isOpen && !this.drag) {
        this.idle += dt;
        if (this.idle >= IDLE_EVERY) {
          this.idle = 0;
          if (!this.adaptive) this.meter.add(TENSION.idle, 'idle');
        }
        if (this.idle > 3.5 && !this.idleSaid && this.time > 12) { this.idleSaid = true; this.tuercaSays(T.tuerca.idle, `idle${this.round}`); }
      }
      if (this.gearJam > 0) {
        this.gearJam -= dt;
        if (!this.reduceMotion) this.gear.rotation.z += Math.sin(this.time * 60) * 0.004;
      }
    }

    // el taller devuelve la tension: vibracion, vapor, tinte, latido
    const v = this.meter.value;
    const k = Math.max(0, (v - 30) / 70);
    const vib = this.reduceMotion || v <= 30 ? 0 : v <= 60 ? 0.008 : v <= 90 ? 0.02 : 0.035;
    this.machine.position.set(this.machineHome.x + (Math.random() - 0.5) * vib * 2, this.machineHome.y + (Math.random() - 0.5) * vib, 0);
    this.gaugeNeedle.rotation.z = -1.2 + (v / 100) * 2.4;
    this.vignette.style.setProperty('--k', k.toFixed(2));
    this.steam?.setVolume(v <= 30 ? 0 : v <= 60 ? 0.12 : v <= 90 ? 0.24 : 0.34, 0.6);
    this.hum?.setRate?.(0.9 + k * 0.5, 0.8);
    if (v > 30 && Math.random() < 0.08 + k * 0.3) {
      this.feedback.drizzle({ x: -1.95 + Math.random() * 1.6, y: 3.7, z: -0.6 }, 0.2, { color: '#e8e4dc', life: 1.1, speed: 0.8, gravity: -1.6, size: 0.7 + k });
    }
    if (v > 60) {
      this.heartbeat -= dt;
      if (this.heartbeat <= 0) {
        this.heartbeat = 60 / (70 + v * 0.5);
        this.audio.play('heartbeat', { volume: 0.25 + k * 0.25 });
      }
    }
    // camara: temblor suave con tension alta (respetando reducir movimiento)
    const camShake = this.reduceMotion ? 0 : (v > 60 ? 0.012 + k * 0.02 : 0) + this.shake;
    this.shake = Math.max(0, this.shake - this.shake * dt * 4);
    this.camera.position.set(this.camBase.x + (Math.random() - 0.5) * camShake, this.camBase.y + (Math.random() - 0.5) * camShake, this.camBase.z);
    this.camera.lookAt(this.camTarget);

    // Tuerca se mece al hablar; la pieza elegida se marca
    this.voice.update(dt, this.time);
    if (this.selected && !this.selected.placed) {
      const s = 1 + Math.sin(this.time * 4) * 0.03;
      this.selected.group.scale.setScalar(s);
    }
    this.pieces.forEach((p) => { if (p !== this.selected && !p.placed) p.group.scale.setScalar(1); });
    // huecos que laten cuando se arrastra cerca
    this.slots.forEach((sl) => { if (!sl.filled) sl.rim.emissiveIntensity = 0.35 + (this.drag?.piece ? Math.abs(Math.sin(this.time * 5)) * 0.5 : 0); });

    // el molino en marcha
    if (this.wheelSpin > 0) {
      this.wheel.rotation.z -= dt * 1.2 * this.wheelSpin;
      if (this.waterOn && Math.random() < 0.7) this.feedback.drizzle({ x: -4.3, y: 3.5, z: -0.2 }, 0.9, { color: '#8fd0ff', life: 0.9, speed: 0.6, gravity: -6, size: 0.6 });
    }
  }

  /* ============================================================ reinicio */

  onReset() {
    this.toolbox.dispose();
    this.toolbox = new CalmToolbox(this, {
      hint: () => T.pistas[Math.max(0, this.round)],
      onPlanB: () => this.planB(),
      onLantern: (n) => this.dimLantern(n),
      onUsed: (id) => this.toolUsed(id),
      onClose: () => { this.directHelp = false; },
      reduceMotion: this.reduceMotion
    });
    this.pieces.forEach((p) => this.scene.remove(p.group));
    this.slots.forEach((sl) => this.scene.remove(sl.group));
    this.pieces = [];
    this.slots = [];
    this.anims.length = 0;
    this.drag = null;
    this.selected = null;
    this.gear.visible = false;
    this.gear.rotation.z = 0;
    this.gearProgress = 0;
    this.gearJam = 0;
    this.handle = false;
    this.handleMesh.visible = false;
    this.locked = false;
    this.lockTimer = 0;
    this.idle = 0;
    this.clicks.length = 0;
    this.voice.reset();
    this.noted.clear();
    this.optionsShown = false;
    this.optionsEl.hidden = true;
    this.attempts = [0, 0, 0];
    this.attemptTimes.length = 0;
    this.lastAttemptAt = null;
    this.stats = { fallidos: 0, forzadas: 0, clics: 0, bloqueos: 0, ayudas: 0, herramientas: [], desdeInicio: 0 };
    this.adaptive = false;
    this.meter.reset();
    this.relightLanterns();
    this.bulb.material.emissiveIntensity = 0;
    this.bulbLight.intensity = 0;
    this.water.material.opacity = 0;
    this.wheelSpin = 0;
    this.waterOn = false;
    this.waterSfx?.stop();
    this.tools.hidden = false;
    this.phase = 'play';
    this.audio.unduck();
    this.setRound(0);
  }

  onDispose() {
    this.toolbox?.dispose();
    this.hum?.stop();
    this.steam?.stop();
    this.waterSfx?.stop();
    this.meter?.dispose();
    this.vignette?.remove();
    this.tools?.remove();
    this.voice?.dispose();
    this.optionsEl?.remove();
    this.roundEl?.remove();
  }
}
