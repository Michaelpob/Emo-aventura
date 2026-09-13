// ISLA DEL ENOJO · Al rojo vivo
// Genero: REFLEJOS + INHIBICION (go / no-go) · camara fija, se juega tocando
//
// El volcan escupe rocas que caen en la cornisa, al rojo vivo. Tocarlas asi
// quema y el volcan sube. Si esperas a que se enfrien, las atrapas y pasan a
// formar el puente de salida. Las chispas nunca se enfrian: se ponen delante
// (y encima de las rocas) para que las toques, y hay que dejarlas pasar.
//
// Fallar no resta nada de lo construido. Cuando la lava llega a la cornisa hay
// una erupcion: el juego se para tres segundos y la unica forma de que baje es
// no tocar nada. Despues sigue la misma oleada.

import * as THREE from 'three';
import { MinigameBase, prefersReducedMotion } from '../../engine/MinigameBase.js';
import { createSky, createLights, GEO, scatterInstanced } from '../../engine/worldkit.js';
import { addReward, completeActivity, recordReevaluation, setInitialIntensity } from '../../data/gameState.js';

// Cada oleada: rocas que hay que atrapar, ritmo, cuanto tarda en enfriarse una
// roca, cuanto aguanta fria antes de rodar, cada cuanto sale una chispa y con
// que probabilidad la chispa se pone encima de una roca.
const WAVES = [
  { rocks: 4, rockEvery: 3.4, cool: 1.3, stay: 3.0, sparkEvery: 6.5, cover: 0, flight: 1.9 },
  { rocks: 4, rockEvery: 2.7, cool: 1.7, stay: 2.4, sparkEvery: 3.8, cover: 0.55, flight: 1.7 },
  { rocks: 4, rockEvery: 2.2, cool: 2.1, stay: 2.0, sparkEvery: 2.5, cover: 0.85, flight: 1.5 }
];
const TOTAL_ROCKS = WAVES.reduce((s, w) => s + w.rocks, 0);
const MAX_ROCKS = 3;
const MAX_SPARKS = 3;
const HEAT = { burn: 0.22, spark: 0.18, lost: 0.07, caught: -0.04, perSecond: -0.015 };
const VENT_SECONDS = 3;
const BETWEEN_SECONDS = 3.2;
const GRAVITY = -18;

const CRATER = new THREE.Vector3(0, 10.9, -40);
const LEDGE = { minX: -4.6, maxX: 4.6, minZ: -4.2, maxZ: 0.4, edgeZ: 2.6 };
const ROCK_Y = 0.85;
const ROCK_SCALE = 1.6;
const BRIDGE_FROM = new THREE.Vector3(7.4, -0.25, -0.6);
const BRIDGE_TO = new THREE.Vector3(15.4, -0.25, -7.4);
const EXIT = new THREE.Vector3(17.3, 0, -9);

const HOT = new THREE.Color('#7a2a1c');
const COLD = new THREE.Color('#4d3d38');
const LAVA_A = new THREE.Color('#ff4a1e');
const LAVA_B = new THREE.Color('#ff9a3a');
const LAVA_COOL = new THREE.Color('#3a2622');
const CRACK_HOT = new THREE.Color('#ff7a3d');
const CRACK_COOL = new THREE.Color('#4a3632');
const SKY = {
  hot: [new THREE.Color('#2a0c0a'), new THREE.Color('#7a2a17')],
  max: [new THREE.Color('#2a0505'), new THREE.Color('#b8351a')],
  calm: [new THREE.Color('#1d3550'), new THREE.Color('#8fbfe0')]
};
const FOG = { hot: new THREE.Color('#4a1a12'), max: new THREE.Color('#6e1a0a'), calm: new THREE.Color('#6b8ea6') };
const SUN = { hot: new THREE.Color('#ffb27a'), calm: new THREE.Color('#cfe6ff') };

// Una reflexion al cerrar cada oleada, apoyada en lo que se acaba de jugar.
const REFLECTIONS = [
  {
    title: 'Al rojo vivo',
    text: 'Cada roca llegó ardiendo, y las que tocaste así te quemaron. Con el enojo pasa igual: lo primero que sale, sale al rojo. No es el momento de agarrarlo.'
  },
  {
    title: 'Las chispas no se enfrían',
    text: 'Hay cosas que solo buscan que reacciones: un comentario, una mirada, una provocación. Nunca se enfrían y no hace falta responderles. Se apagan solas si las dejas pasar.'
  },
  {
    title: 'Fría, la misma roca sirve',
    text: 'La roca que quemaba es la que ahora sostiene el puente. El enojo no desapareció: esperaste a que bajara la temperatura y lo usaste para construir algo.'
  }
];
const ERUPTION_NOTE = {
  title: 'Erupción',
  text: 'Subió demasiado y el volcán estalló. No has perdido nada de lo construido: parar y no tocar nada durante unos segundos también es una decisión, y es la que baja la lava.'
};

const _v = new THREE.Vector3();

export class AngerLavaGame extends MinigameBase {
  constructor(opts) {
    super({ ...opts, mode: 'third' });
    this.heat = 0;            // 0 = lava abajo, 1 = erupcion
    this.heatShown = 0;       // lo que se ve, siguiendo a heat con suavidad
    this.calmness = 0;        // 0..1 al terminar: el volcan se enfria del todo
    this.wave = -1;
    this.caught = 0;          // rocas atrapadas (en vuelo hacia el puente o ya puestas)
    this.placed = 0;          // bloques ya puestos en el puente
    this.caughtInWave = 0;
    this.placedInWave = 0;
    this.phase = 'idle';      // idle | play | between | venting | done
    this.phaseTimer = 0;
    this.ventTimer = 0;
    this.rockTimer = 0;
    this.sparkTimer = 0;
    this.rocks = [];
    this.sparks = [];
    this.blocks = [];
    this.seen = [];
    this.time = 0;
    this.shake = 0;
    this.erupted = false;
    this.reduceMotion = prefersReducedMotion();
  }

  /* ============================================================ escenario */

  build() {
    const scene = this.scene;

    // La camara no la mueve el jugador: se juega tocando lo que llega
    this.controller.enabled = false;
    this.el.touch.remove();

    scene.fog = new THREE.FogExp2('#4a1a12', 0.012);
    this.sky = createSky({ top: '#2a0c0a', bottom: '#7a2a17' });
    scene.add(this.sky);

    this.lights = createLights({
      sunColor: '#ffb27a',
      sunIntensity: 1.55,
      hemiSky: '#ff8a5c',
      hemiGround: '#2a1512',
      hemiIntensity: 1.15,
      area: 30
    });
    this.lights.userData.sun.position.set(-14, 22, 18);   // luz desde detras del jugador
    scene.add(this.lights);
    this.sun = this.lights.userData.sun;

    this.buildLava();
    this.buildLedge();
    this.buildVolcano();
    this.buildBridge();
    this.buildPools();
    this.placeCamera();
    this.buildPicking();
    this.buildHud();

    this.setObjective(TOTAL_ROCKS, '●');
    setInitialIntensity('alta');
  }

  buildLava() {
    const geo = new THREE.PlaneGeometry(240, 240, 1, 1);
    geo.rotateX(-Math.PI / 2);
    this.lavaMat = new THREE.MeshBasicMaterial({ color: '#ff4a1e' });
    this.lava = new THREE.Mesh(geo, this.lavaMat);
    this.lava.position.y = -4.2;
    this.scene.add(this.lava);

    // costras oscuras que flotan: suben y bajan con la lava
    const crustMat = new THREE.MeshStandardMaterial({ color: '#2b1512', roughness: 1, flatShading: true });
    const crust = scatterInstanced(new THREE.CylinderGeometry(1, 1.3, 0.3, 6), crustMat, 44, (i) => {
      const a = i * 2.399;
      const r = 13 + (i % 9) * 3.6;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r - 4;
      const nearExit = Math.hypot(x - EXIT.x, z - EXIT.z) < 6;
      return { x: nearExit ? x + 12 : x, y: 0.1, z, ry: a, scale: 0.8 + (i % 4) * 0.5 };
    });
    this.lava.add(crust);

    this.lavaLight = new THREE.PointLight('#ff5a2b', 2.5, 24, 2);
    this.lavaLight.position.set(0, -3.4, 4);
    this.scene.add(this.lavaLight);
  }

  buildLedge() {
    const mat = new THREE.MeshStandardMaterial({ color: '#3a2825', roughness: 1, flatShading: true });
    const ledge = new THREE.Mesh(new THREE.BoxGeometry(14.5, 7.5, 8.4), mat);
    ledge.position.set(0, -3.75, -1.6);        // cara superior en y=0, borde delantero en z=2.6
    ledge.receiveShadow = true;
    this.scene.add(ledge);

    // grietas que brillan con el calor
    this.crackMat = new THREE.MeshStandardMaterial({
      color: '#ff7a3d', emissive: '#ff5a20', emissiveIntensity: 0.4, flatShading: true
    });
    const cracks = scatterInstanced(new THREE.BoxGeometry(0.26, 0.05, 1.8), this.crackMat, 24, (i) => ({
      x: -6.4 + ((i * 2.9) % 12.8),
      y: 0.03,
      z: -5.2 + ((i * 1.7) % 7.4),
      ry: i * 0.9,
      scale: 0.7 + (i % 3) * 0.3
    }));
    this.scene.add(cracks);

    // isla de salida, al otro lado del puente
    const far = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 4.4, 7.5, 7), mat);
    far.position.set(EXIT.x, -3.75, EXIT.z);
    far.receiveShadow = true;
    this.scene.add(far);

    // pilares de basalto que enmarcan la escena
    const spots = [
      [-10, -6], [-12, 2], [-9, 7], [9.5, 6], [12, 1], [-15, -12], [16, -16], [-7, -13],
      [8, -13], [22, -2], [-20, -4], [24, -12], [-11, 12], [13, 10]
    ];
    const pillars = scatterInstanced(new THREE.CylinderGeometry(0.55, 0.85, 1, 6), mat, spots.length, (i) => {
      const [x, z] = spots[i];
      const h = 3 + (i % 4) * 2.2;
      return { x, y: -4 + h / 2, z, ry: i, scale: 1 + (i % 3) * 0.4, scaleY: h };
    });
    this.scene.add(pillars);
  }

  buildVolcano() {
    const group = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(4.6, 19, 15, 10, 3, true),
      new THREE.MeshStandardMaterial({ color: '#3a2320', roughness: 1, flatShading: true, side: THREE.DoubleSide })
    );
    body.position.y = 7.5;
    group.add(body);

    this.craterMat = new THREE.MeshStandardMaterial({
      color: '#ff5a2b', emissive: '#ff4a1e', emissiveIntensity: 1.6, flatShading: true
    });
    const crater = new THREE.Mesh(new THREE.CircleGeometry(4.5, 12), this.craterMat);
    crater.rotation.x = -Math.PI / 2;
    crater.position.y = 14.9;
    group.add(crater);

    // borde incandescente y regueros de lava por la ladera: el crater se lee
    // desde abajo aunque el disco quede casi de canto
    const rim = new THREE.Mesh(new THREE.TorusGeometry(4.7, 0.34, 8, 24), this.craterMat);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 15;
    group.add(rim);
    const streaks = new THREE.InstancedMesh(new THREE.BoxGeometry(0.55, 0.12, 1), this.craterMat, 9);
    const slope = Math.atan2(15, 19 - 4.6);   // inclinacion de la ladera
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const pos = new THREE.Vector3();
    const sc = new THREE.Vector3();
    for (let i = 0; i < 9; i += 1) {
      const a = -0.95 + (i / 8) * 1.9;        // solo la cara que mira al jugador
      const len = 3.5 + (i % 3) * 2.2;
      const d = len / 2;                        // centro del reguero, ladera abajo
      pos.set(
        Math.sin(a) * (4.6 + Math.cos(slope) * d + 0.12),
        15 - Math.sin(slope) * d + 0.1,
        Math.cos(a) * (4.6 + Math.cos(slope) * d + 0.12)
      );
      e.set(slope, a, 0, 'YXZ');               // tumbado sobre la pendiente, apuntando abajo
      q.setFromEuler(e);
      sc.set(1 + (i % 2) * 0.4, 1, len);
      m.compose(pos, q, sc);
      streaks.setMatrixAt(i, m);
    }
    streaks.instanceMatrix.needsUpdate = true;
    group.add(streaks);

    this.craterLight = new THREE.PointLight('#ff6a33', 4, 60, 2);
    this.craterLight.position.set(0, 16.5, 0);
    group.add(this.craterLight);

    group.position.set(0, -4.2, -40);
    this.scene.add(group);
  }

  buildBridge() {
    this.blockMat = new THREE.MeshStandardMaterial({ color: '#4a3a35', roughness: 1, flatShading: true });
    const geo = new THREE.BoxGeometry(2.1, 0.5, 0.95);
    const dir = BRIDGE_TO.clone().sub(BRIDGE_FROM);
    const ry = Math.atan2(dir.x, dir.z);
    for (let i = 0; i < TOTAL_ROCKS; i += 1) {
      const t = i / (TOTAL_ROCKS - 1);
      const pos = BRIDGE_FROM.clone().lerp(BRIDGE_TO, t);
      pos.y += (i % 2) * 0.07;
      const mesh = new THREE.Mesh(geo, this.blockMat);
      mesh.position.copy(pos);
      mesh.rotation.y = ry;
      mesh.scale.setScalar(0.001);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.scene.add(mesh);
      this.blocks.push({ mesh, pos });
    }
  }

  buildPools() {
    // Rocas: se reutilizan, nada se crea durante la partida
    const rockGeo = GEO.rock();
    const ringGeo = new THREE.RingGeometry(1.0, 1.26, 24);
    ringGeo.rotateX(-Math.PI / 2);
    for (let i = 0; i < MAX_ROCKS + 1; i += 1) {
      const mat = new THREE.MeshStandardMaterial({
        color: '#7a2a1c', emissive: '#ff4a1e', emissiveIntensity: 2.4, roughness: 0.9, flatShading: true
      });
      const mesh = new THREE.Mesh(rockGeo, mat);
      mesh.scale.setScalar(ROCK_SCALE);
      mesh.visible = false;
      this.scene.add(mesh);
      const light = new THREE.PointLight('#ff6a33', 0, 7, 2);
      light.visible = false;
      this.scene.add(light);
      const ring = new THREE.Mesh(
        ringGeo,
        new THREE.MeshBasicMaterial({ color: '#9fe3ff', transparent: true, opacity: 0.85, depthWrite: false })
      );
      ring.visible = false;
      this.scene.add(ring);
      this.rocks.push({
        mesh, mat, light, ring,
        state: 'free',
        pos: mesh.position,
        vel: new THREE.Vector3(),
        spin: new THREE.Vector3(),
        target: new THREE.Vector3(),
        start: new THREE.Vector3(),
        timer: 0, cool: 1, stay: 1, slot: -1
      });
    }

    // Chispas
    const sparkGeo = new THREE.TetrahedronGeometry(0.42, 0);
    this.sparkMat = new THREE.MeshStandardMaterial({
      color: '#ffd27a', emissive: '#ff7a1e', emissiveIntensity: 3.2, flatShading: true
    });
    for (let i = 0; i < MAX_SPARKS + 1; i += 1) {
      const mesh = new THREE.Mesh(sparkGeo, this.sparkMat);
      mesh.visible = false;
      this.scene.add(mesh);
      this.sparks.push({
        mesh,
        state: 'free',
        pos: mesh.position,
        p0: new THREE.Vector3(),
        p1: new THREE.Vector3(),
        p2: new THREE.Vector3(),
        timer: 0, life: 3, rise: 1, wobble: i * 1.3, side: 1,
        follow: null
      });
    }
  }

  placeCamera() {
    this.camBase = new THREE.Vector3(0.8, 5.6, 10.8);
    this.camTarget = new THREE.Vector3(1.6, 1.6, -5);
    this.camera.fov = 64;
    this.camera.updateProjectionMatrix();
    this.camera.position.copy(this.camBase);
    this.camera.lookAt(this.camTarget);
  }

  /* ================================================================ input */

  buildPicking() {
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    const dom = this.renderer.domElement;

    this.tooltip = document.createElement('div');
    this.tooltip.className = 'i3d-pick';
    this.tooltip.hidden = true;
    this.el.hud.appendChild(this.tooltip);

    const toNdc = (e) => {
      const r = dom.getBoundingClientRect();
      this.pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    };

    // pointerdown, no click: es un juego de reflejos
    const down = (e) => {
      if (this.paused || this.finished) return;
      if (e.button !== undefined && e.button > 0) return;
      toNdc(e);
      this.tap();
    };
    const move = (e) => {
      if (this.phase !== 'done') return;
      toNdc(e);
      const over = this.overExit();
      dom.style.cursor = over ? 'pointer' : 'default';
      this.tooltip.hidden = !over;
      if (over) {
        this.tooltip.textContent = 'Salir';
        this.tooltip.style.left = `${e.clientX}px`;
        this.tooltip.style.top = `${e.clientY - 42}px`;
      }
    };
    dom.addEventListener('pointerdown', down);
    dom.addEventListener('pointermove', move);
    this.listeners.push(() => dom.removeEventListener('pointerdown', down));
    this.listeners.push(() => dom.removeEventListener('pointermove', move));
  }

  /** Lo que hay bajo el dedo: la roca o chispa mas cercana a la camara */
  pick() {
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const ray = this.raycaster.ray;
    let best = null;
    let bestDist = Infinity;
    const test = (kind, obj, radius) => {
      if (ray.distanceSqToPoint(obj.pos) > radius * radius) return;
      const d = ray.origin.distanceTo(obj.pos);
      if (d < bestDist) { bestDist = d; best = { kind, obj }; }
    };
    for (let i = 0; i < this.sparks.length; i += 1) {
      const s = this.sparks[i];
      if (s.state === 'rise' || s.state === 'hover') test('spark', s, 1.0);
    }
    for (let i = 0; i < this.rocks.length; i += 1) {
      const r = this.rocks[i];
      if (r.state === 'fly' || r.state === 'hot' || r.state === 'cool') test('rock', r, 1.4);
      // rodando hacia el borde aun se puede atrapar; cayendo ya no
      if (r.state === 'fall' && r.pos.z <= LEDGE.edgeZ) test('rock', r, 1.4);
    }
    return best;
  }

  overExit() {
    if (!this.portal) return false;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    _v.copy(EXIT).y += 1.5;
    return this.raycaster.ray.distanceSqToPoint(_v) < 2.4 * 2.4;
  }

  tap() {
    if (this.phase === 'venting') {
      // tocar durante la erupcion reinicia la cuenta: la calma pide no hacer nada
      this.ventTimer = 0;
      this.audio.play('soften', { volume: 0.3 });
      this.shakeBy(0.14);
      this.say('QUIETO · RESPIRA', 0);
      return;
    }
    if (this.phase === 'done') {
      if (this.overExit()) this.finish();
      return;
    }
    if (this.phase !== 'play' && this.phase !== 'between') return;

    const hit = this.pick();
    if (!hit) return;
    if (hit.kind === 'spark') { this.touchSpark(hit.obj); return; }
    const r = hit.obj;
    if (r.state === 'cool' || r.state === 'fall') this.catchRock(r);
    else this.burn(r);
  }

  /* ======================================================== consecuencias */

  burn(r) {
    this.addHeat(HEAT.burn);
    this.say('AL ROJO · ESPERA', 1500);
    this.audio.play('sizzle', { volume: 0.55 });
    this.feedback.burst(r.pos, { count: 22, color: '#ff5a2b', speed: 4, life: 0.8 });
    this.shakeBy(0.42);
    this.flashScreen('i3d-burn');
    r.mesh.scale.setScalar(ROCK_SCALE * 1.16);     // la roca "salta" al tocarla
  }

  touchSpark(s) {
    this.addHeat(HEAT.spark);
    this.say('ERA UNA CHISPA', 1400);
    this.audio.play('buzz', { volume: 0.5, rate: 0.7 });
    this.feedback.burst(s.pos, { count: 16, color: '#ffb347', speed: 3.5, life: 0.7, gravity: -1 });
    this.shakeBy(0.26);
    this.flashScreen('i3d-burn');
    this.freeSpark(s);
  }

  catchRock(r) {
    r.state = 'caught';
    r.timer = 0;
    r.slot = this.caught;
    r.start.copy(r.pos);
    r.ring.visible = false;
    r.light.visible = false;
    this.caught += 1;
    this.caughtInWave += 1;
    this.addHeat(HEAT.caught);
    this.audio.play('collect', { volume: 0.45, rate: 0.8 + this.caught * 0.025 });
    this.feedback.burst(r.pos, { count: 10, color: '#9fe3ff', speed: 2.2, life: 0.7, gravity: -1.5 });
    this.advanceObjective();
  }

  placeBlock(slotIndex) {
    const block = this.blocks[slotIndex];
    if (!block) return;
    this.feedback.tween({
      from: 0.001, to: 1, duration: 0.32,
      onUpdate: (v) => block.mesh.scale.setScalar(v)
    });
    this.feedback.burst(block.pos, { count: 8, color: '#8a7a70', speed: 1.6, life: 0.6 });
    this.audio.play('stone', { volume: 0.5, rate: 0.9 + (slotIndex % 3) * 0.08 });
    this.renderer.shadowMap.needsUpdate = true;
    this.placed += 1;
    this.placedInWave += 1;
    if (this.phase === 'play') this.checkWave();
  }

  lostRock(r) {
    this.addHeat(HEAT.lost);
    this.feedback.burst(r.pos, { count: 18, color: '#ff5a2b', speed: 3.6, life: 0.9 });
    this.audio.play('sizzle', { volume: 0.3, rate: 0.6 });
    this.say('SE FUE', 1100);
    this.freeRock(r);
  }

  addHeat(d) {
    this.heat = Math.max(0, Math.min(1, this.heat + d));
    this.heatBar.set(this.heat);
    if (this.heat >= 1 && this.phase === 'play') this.erupt();
  }

  shakeBy(v) {
    this.shake = Math.max(this.shake, this.reduceMotion ? v * 0.3 : v);
  }

  /** Destello de pantalla breve (quemadura). No intercepta el dedo. */
  flashScreen(cls) {
    const el = document.createElement('div');
    el.className = cls;
    this.root.appendChild(el);
    this.later(() => el.remove(), 480);
  }

  /* ============================================================= oleadas */

  async onStart() {
    await this.showIntro({
      eyebrow: 'Al rojo vivo',
      goal: `Construye el puente con ${TOTAL_ROCKS} rocas frías`,
      hint: 'Las rocas llegan al rojo vivo: si las tocas así te quemas y el volcán sube. Espera a que se pongan grises y entonces atrápalas. Las chispas nunca se enfrían: déjalas pasar.',
      keys: [['Clic', 'atrapar una roca fría'], ['Esperar', 'si está al rojo'], ['Nada', 'con las chispas']],
      touch: [['Toca', 'atrapar una roca fría'], ['Espera', 'si está al rojo'], ['Nada', 'con las chispas']]
    });
    this.ambientRumble = this.audio.ambient('rumble', { volume: 0.3, rate: 0.85 });
    this.phase = 'between';
    this.phaseTimer = BETWEEN_SECONDS - 1.4;
  }

  startWave(n) {
    this.wave = n;
    this.caughtInWave = 0;
    this.placedInWave = 0;
    this.phase = 'play';
    this.rockTimer = 1.3;
    this.sparkTimer = WAVES[n].sparkEvery * 0.7;
    this.waveEl.querySelector('b').textContent = String(n + 1);
    this.say(`OLEADA ${n + 1} DE ${WAVES.length}`, 2000);
    this.audio.play('interact', { volume: 0.35, rate: 0.9 });
  }

  checkWave() {
    const wave = WAVES[this.wave];
    if (this.placedInWave < wave.rocks) return;
    if (this.placed >= TOTAL_ROCKS) this.calm();
    else this.endWave();
  }

  endWave() {
    this.phase = 'between';
    this.phaseTimer = 0;
    this.clearField(false);
    this.addHeat(-0.2);
    completeActivity(`anger-oleada-${this.wave + 1}`, 6);
    this.audio.play('chime', { volume: 0.4 });
    this.say('OLEADA SUPERADA', 1800);
    this.noteFor(this.wave);
  }

  noteFor(index) {
    const note = REFLECTIONS[index];
    if (!note || this.seen.includes(note)) return;
    this.seen.push(note);
    this.later(() => this.showNote({ ...note, seconds: 9 }), 700);
  }

  /** Vacia la cornisa: las rocas se hunden y las chispas se apagan */
  clearField(violent) {
    this.rocks.forEach((r) => {
      if (r.state === 'free' || r.state === 'caught') return;
      this.feedback.burst(r.pos, {
        count: violent ? 16 : 8, color: violent ? '#ff5a2b' : '#6a4a40', speed: violent ? 4 : 1.8, life: 0.8
      });
      this.freeRock(r);
    });
    this.sparks.forEach((s) => {
      if (s.state === 'free') return;
      this.feedback.burst(s.pos, { count: 6, color: '#ffb347', speed: 2, life: 0.5, gravity: -1 });
      this.freeSpark(s);
    });
  }

  /* ============================================================ erupcion */

  erupt() {
    this.phase = 'venting';
    this.ventTimer = 0;
    this.ventPrompted = false;
    this.clearField(true);
    this.audio.play('erupt', { volume: 0.8 });
    this.shakeBy(1.3);
    this.feedback.flash(CRATER, { color: '#ff5a2b', intensity: 9, duration: 1.4, distance: 70 });
    this.feedback.burst(CRATER, { count: 60, color: '#ff8a3d', speed: 9, life: 2.2, gravity: -6 });
    this.say('ERUPCIÓN', 0);
    this.calmBar.set(0);
    this.calmBar.show(true);

    this.veil = document.createElement('div');
    this.veil.className = 'i3d-erupt';
    this.root.appendChild(this.veil);

    if (!this.erupted) {
      this.erupted = true;
      this.seen.push(ERUPTION_NOTE);
      this.later(() => this.showNote({ ...ERUPTION_NOTE, seconds: 9 }), 1600);
    }
  }

  endVent() {
    this.heat = 0;
    this.heatBar.set(0);
    this.phase = 'play';
    this.calmBar.show(false);
    const veil = this.veil;
    this.veil = null;
    if (veil) {
      veil.classList.add('is-out');
      this.later(() => veil.remove(), 650);
    }
    this.clearSay();
    this.say('EL VOLCÁN BAJA', 1800);
    this.audio.play('breathOut', { volume: 0.45 });
    this.rockTimer = 1.6;
    this.sparkTimer = 4;
    this.checkWave();
  }

  /* ============================================================== rocas */

  liveRocks() {
    let n = 0;
    for (let i = 0; i < this.rocks.length; i += 1) {
      const s = this.rocks[i].state;
      if (s !== 'free' && s !== 'caught') n += 1;
    }
    return n;
  }

  liveSparks() {
    let n = 0;
    for (let i = 0; i < this.sparks.length; i += 1) if (this.sparks[i].state !== 'free') n += 1;
    return n;
  }

  spawnRock(wave) {
    const r = this.rocks.find((k) => k.state === 'free');
    if (!r) return;

    // sitio libre en la cornisa
    let x = 0;
    let z = 0;
    for (let attempt = 0; attempt < 8; attempt += 1) {
      x = LEDGE.minX + Math.random() * (LEDGE.maxX - LEDGE.minX);
      z = LEDGE.minZ + Math.random() * (LEDGE.maxZ - LEDGE.minZ);
      const clash = this.rocks.some((o) => o !== r && o.state !== 'free' && o.state !== 'caught' &&
        Math.hypot(o.target.x - x, o.target.z - z) < 2.3);
      if (!clash) break;
    }

    const T = wave.flight;
    r.target.set(x, ROCK_Y, z);
    r.pos.copy(CRATER);
    r.vel.set(
      (x - CRATER.x) / T,
      (ROCK_Y - CRATER.y - 0.5 * GRAVITY * T * T) / T,
      (z - CRATER.z) / T
    );
    r.spin.set(2 + Math.random() * 3, 1 + Math.random() * 2, 1 + Math.random() * 3);
    r.state = 'fly';
    r.timer = 0;
    r.cool = wave.cool;
    r.stay = wave.stay;
    r.mat.color.copy(HOT);
    r.mat.emissiveIntensity = 2.4;
    r.light.intensity = 2.8;
    r.light.visible = true;
    r.mesh.visible = true;
    r.mesh.scale.setScalar(ROCK_SCALE);
    r.ring.visible = false;

    this.feedback.burst(CRATER, { count: 14, color: '#ff8a3d', speed: 5, life: 1.2, gravity: -4 });
    this.feedback.flash(CRATER, { color: '#ff6a33', intensity: 5, duration: 0.5, distance: 40 });
    this.audio.play('spit', { volume: 0.45 });
    this.shakeBy(0.08);
  }

  freeRock(r) {
    r.state = 'free';
    r.mesh.visible = false;
    r.light.visible = false;
    r.ring.visible = false;
  }

  updateRocks(dt) {
    for (let i = 0; i < this.rocks.length; i += 1) {
      const r = this.rocks[i];
      if (r.state === 'free') continue;

      if (r.state === 'fly') {
        r.vel.y += GRAVITY * dt;
        r.pos.addScaledVector(r.vel, dt);
        r.mesh.rotation.x += r.spin.x * dt;
        r.mesh.rotation.y += r.spin.y * dt;
        r.light.position.copy(r.pos);
        if (r.vel.y < 0 && r.pos.y <= ROCK_Y) {
          r.pos.copy(r.target);
          r.light.position.copy(r.pos);
          r.state = 'hot';
          r.timer = 0;
          this.audio.play('thud', { volume: 0.6 });
          this.feedback.burst(r.pos, { count: 12, color: '#6a4a40', speed: 2.4, life: 0.7 });
          this.shakeBy(0.2);
        }
        continue;
      }

      if (r.state === 'hot') {
        r.timer += dt;
        const k = Math.min(1, r.timer / r.cool);
        const glow = Math.pow(1 - k, 1.5);
        const flicker = this.reduceMotion ? 1 : 0.85 + 0.15 * Math.sin(this.time * 31 + i);
        r.mat.emissiveIntensity = 2.4 * glow * flicker;
        r.mat.color.lerpColors(HOT, COLD, k);
        r.light.intensity = 2.8 * glow;
        // rebote al caer y vuelta al tamano normal tras un toque
        const bounce = r.timer < 0.4 ? Math.sin((r.timer / 0.4) * Math.PI) * 0.28 : 0;
        r.pos.y = ROCK_Y + bounce;
        r.mesh.scale.lerp(_v.setScalar(ROCK_SCALE), dt * 8);
        if (k >= 1) {
          r.state = 'cool';
          r.timer = 0;
          r.light.visible = false;
          r.ring.visible = true;
          r.ring.position.set(r.pos.x, 0.03, r.pos.z);
          this.audio.play('tick', { volume: 0.4 });
        }
        continue;
      }

      if (r.state === 'cool') {
        r.timer += dt;
        r.mesh.scale.lerp(_v.setScalar(ROCK_SCALE), dt * 8);
        // el anillo se encoge: es el tiempo que queda antes de que ruede
        const left = 1 - r.timer / r.stay;
        r.ring.scale.setScalar(0.75 + left * 0.55 + Math.sin(this.time * 7) * 0.03);
        r.ring.material.opacity = 0.5 + left * 0.4;
        if (r.timer >= r.stay) {
          r.state = 'fall';
          r.timer = 0;
          r.vel.set(0, 0, 3.4);
          r.ring.visible = false;
        }
        continue;
      }

      if (r.state === 'fall') {
        r.pos.z += r.vel.z * dt;
        r.mesh.rotation.x += 4 * dt;
        if (r.pos.z > LEDGE.edgeZ) {
          r.vel.y += GRAVITY * dt;
          r.pos.y += r.vel.y * dt;
          if (r.pos.y < this.lava.position.y + 0.4) this.lostRock(r);
        }
        continue;
      }

      if (r.state === 'caught') {
        r.timer += dt;
        const k = Math.min(1, r.timer / 0.7);
        const e = k * k * (3 - 2 * k);
        const slot = this.blocks[r.slot]?.pos ?? r.start;
        r.pos.lerpVectors(r.start, slot, e);
        r.pos.y += Math.sin(k * Math.PI) * 2.4;
        r.mesh.rotation.y += 5 * dt;
        r.mesh.scale.setScalar(ROCK_SCALE - k * 0.7);
        if (k >= 1) {
          this.freeRock(r);
          this.placeBlock(r.slot);
        }
      }
    }
  }

  /* ============================================================ chispas */

  spawnSpark(wave) {
    const s = this.sparks.find((k) => k.state === 'free');
    if (!s) return;
    s.p0.copy(CRATER);
    s.follow = null;
    s.side = Math.random() < 0.5 ? -1 : 1;
    // en las oleadas altas la chispa se pone encima de una roca: es la trampa
    if (Math.random() < wave.cover) {
      const rock = this.rocks.find((r) => r.state === 'fly' || r.state === 'hot' || r.state === 'cool');
      if (rock) s.follow = rock;
    }
    if (s.follow) s.p2.copy(s.follow.target).add(_v.set(s.side * 1.1, 1.6, 0.9));
    else s.p2.set(-5 + Math.random() * 10, 1.4 + Math.random() * 2.2, -3.5 + Math.random() * 5);
    s.p1.lerpVectors(s.p0, s.p2, 0.5);
    s.p1.y += 9;
    s.state = 'rise';
    s.timer = 0;
    s.rise = 1.0 + Math.random() * 0.3;
    s.life = 2.4 + Math.random() * 1.1;
    s.mesh.visible = true;
    s.mesh.scale.setScalar(1);
    s.pos.copy(CRATER);
    this.audio.play('buzz', { volume: 0.28, rate: 1.1 + Math.random() * 0.2 });
  }

  freeSpark(s) {
    s.state = 'free';
    s.follow = null;
    s.mesh.visible = false;
  }

  updateSparks(dt) {
    for (let i = 0; i < this.sparks.length; i += 1) {
      const s = this.sparks[i];
      if (s.state === 'free') continue;
      s.mesh.rotation.x += 6 * dt;
      s.mesh.rotation.y += 9 * dt;

      if (s.state === 'rise') {
        s.timer += dt;
        const k = Math.min(1, s.timer / s.rise);
        const a = (1 - k) * (1 - k);
        const b = 2 * (1 - k) * k;
        const c = k * k;
        s.pos.set(
          a * s.p0.x + b * s.p1.x + c * s.p2.x,
          a * s.p0.y + b * s.p1.y + c * s.p2.y,
          a * s.p0.z + b * s.p1.z + c * s.p2.z
        );
        if (k >= 1) { s.state = 'hover'; s.timer = 0; }
        continue;
      }

      if (s.state === 'hover') {
        s.timer += dt;
        // si sigue a una roca, orbita a su alrededor: se pone en medio y se quita
        const f = s.follow;
        if (f && (f.state === 'hot' || f.state === 'cool' || f.state === 'fly')) {
          const orbit = this.time * 1.6 + s.wobble;
          s.p2.set(f.target.x + Math.cos(orbit) * 1.3, 1.7 + Math.sin(orbit * 1.7) * 0.3, f.target.z + Math.sin(orbit) * 1.0);
        }
        const w = s.wobble;
        s.pos.set(
          s.p2.x + Math.sin(this.time * 5.1 + w) * 0.5,
          s.p2.y + Math.sin(this.time * 7.3 + w) * 0.3,
          s.p2.z + Math.cos(this.time * 4.2 + w) * 0.4 + s.timer * 0.2
        );
        if (Math.random() < 0.5) {
          this.feedback.drizzle(s.pos, 0.2, { color: '#ffb347', life: 0.6, speed: 0.4, gravity: -0.5, size: 0.5 });
        }
        if (s.timer >= s.life) { s.state = 'fizzle'; s.timer = 0; }
        continue;
      }

      if (s.state === 'fizzle') {
        s.timer += dt;
        const k = Math.min(1, s.timer / 0.35);
        s.mesh.scale.setScalar(1 - k);
        s.pos.y -= dt * 1.5;
        if (k >= 1) {
          this.feedback.burst(s.pos, { count: 5, color: '#8a6a50', speed: 1, life: 0.6, gravity: -0.5 });
          this.freeSpark(s);
        }
      }
    }
  }

  /* ============================================================== mundo */

  /** El volcan entero es el indicador: lava, cielo, niebla, crater, temblor */
  updateWorld(dt) {
    const target = this.phase === 'venting' ? 1 : this.heat;
    this.heatShown += (target - this.heatShown) * Math.min(1, dt * 2.6);
    const h = this.heatShown;
    const c = this.calmness;

    this.lava.position.y = -4.2 + h * 4.0 - c * 0.6;
    this.lavaMat.color.lerpColors(LAVA_A, LAVA_B, 0.5 + 0.5 * Math.sin(this.time * 2.2));
    if (c > 0) this.lavaMat.color.lerp(LAVA_COOL, c);
    this.lavaLight.position.y = this.lava.position.y + 0.8;
    this.lavaLight.intensity = (1.8 + h * 4.2) * (1 - c);

    this.craterMat.emissiveIntensity = (1.2 + h * 2.4) * (1 - c * 0.95);
    this.craterLight.intensity = (3 + h * 7) * (1 - c * 0.9);
    this.crackMat.emissiveIntensity = (0.3 + h * 2.2) * (1 - c);
    this.crackMat.color.lerpColors(CRACK_HOT, CRACK_COOL, c);
    this.scene.fog.density = 0.011 + h * 0.008 - c * 0.004;

    const sky = this.sky.userData.uniforms;
    sky.topColor.value.lerpColors(SKY.hot[0], SKY.max[0], h).lerp(SKY.calm[0], c);
    sky.bottomColor.value.lerpColors(SKY.hot[1], SKY.max[1], h).lerp(SKY.calm[1], c);
    this.scene.fog.color.lerpColors(FOG.hot, FOG.max, h).lerp(FOG.calm, c);
    this.sun.color.lerpColors(SUN.hot, SUN.calm, c);

    // el retumbo sube con la lava (sin machacar el nodo de audio cada frame)
    const vol = (0.12 + h * 0.55) * (1 - c * 0.9);
    if (this.ambientRumble && Math.abs(vol - (this.rumbleVol ?? -1)) > 0.02) {
      this.rumbleVol = vol;
      this.ambientRumble.setVolume(vol);
    }

    // humo del crater
    if (Math.random() < 0.25 + h * 0.5 - c * 0.6) {
      this.feedback.drizzle(CRATER, 2.5, { color: '#3a2a2a', life: 2.6, speed: 0.7, gravity: -1, size: 1.6 });
    }

    // camara: base fija + balanceo minimo + temblor (impulsos + calor)
    this.shake = Math.max(0, this.shake - this.shake * dt * 3.2);
    const amount = (this.shake + h * 0.05 * (1 - c)) * (this.reduceMotion ? 0.3 : 1);
    this.camera.position.set(
      this.camBase.x + Math.sin(this.time * 0.4) * 0.08 + (Math.random() - 0.5) * amount,
      this.camBase.y + Math.sin(this.time * 0.6) * 0.05 + (Math.random() - 0.5) * amount,
      this.camBase.z + (Math.random() - 0.5) * amount * 0.4
    );
    this.camera.lookAt(this.camTarget);
  }

  onUpdate(dt) {
    this.time += dt;
    const wave = WAVES[Math.max(0, this.wave)];

    if (this.phase === 'play') {
      if (this.heat > 0) {
        this.heat = Math.max(0, this.heat + HEAT.perSecond * dt);
        this.heatBar.set(this.heat);
      }
      this.rockTimer -= dt;
      if (this.rockTimer <= 0 && this.caughtInWave < wave.rocks && this.liveRocks() < MAX_ROCKS) {
        this.spawnRock(wave);
        this.rockTimer = wave.rockEvery * (0.8 + Math.random() * 0.4);
      }
      this.sparkTimer -= dt;
      if (this.sparkTimer <= 0 && this.liveSparks() < MAX_SPARKS) {
        this.spawnSpark(wave);
        this.sparkTimer = wave.sparkEvery * (0.7 + Math.random() * 0.6);
      }
    } else if (this.phase === 'between') {
      this.phaseTimer += dt;
      if (this.phaseTimer >= BETWEEN_SECONDS) this.startWave(this.wave + 1);
    } else if (this.phase === 'venting') {
      this.ventTimer += dt;
      this.calmBar.set(Math.min(1, this.ventTimer / VENT_SECONDS));
      if (this.ventTimer > 1.1 && !this.ventPrompted) {
        this.ventPrompted = true;
        this.say('QUIETO · RESPIRA', 0);
      }
      if (this.ventTimer >= VENT_SECONDS) this.endVent();
    } else if (this.phase === 'done') {
      this.calmness = Math.min(1, this.calmness + dt / 3);
      this.phaseTimer += dt;
      if (!this.portal && this.phaseTimer > 1.6) this.openExit();
      if (this.portalRing) this.portalRing.rotation.z += dt * 0.6;
    }

    this.updateRocks(dt);
    this.updateSparks(dt);
    this.updateWorld(dt);
  }

  /* ================================================================ HUD */

  buildHud() {
    this.heatBar = this.addBar('heat', { icon: '🌋', color: '#ff5a3a', value: 0 });
    this.calmBar = this.addBar('calm', { icon: '🫁', color: '#7fd1ff', value: 0 });
    this.calmBar.show(false);

    this.waveEl = document.createElement('div');
    this.waveEl.className = 'i3d-wave';
    this.waveEl.innerHTML = `Oleada <b>1</b> de ${WAVES.length}`;
    this.el.hud.appendChild(this.waveEl);
  }

  /* ============================================================== cierre */

  calm() {
    this.phase = 'done';
    this.phaseTimer = 0;
    this.heat = 0;
    this.heatBar.set(0);
    this.clearField(false);
    completeActivity(`anger-oleada-${this.wave + 1}`, 6);
    this.say('EL VOLCÁN SE ENFRÍA', 2400);
    this.audio.play('success', { volume: 0.5 });
    this.audio.ambient('wind', { volume: 0.22 });
    this.noteFor(this.wave);
  }

  openExit() {
    const color = '#9fe3ff';
    const group = new THREE.Group();
    group.position.copy(EXIT);
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.25, 0.14, 10, 40),
      new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.4, roughness: 0.35, flatShading: true })
    );
    ring.position.y = 1.5;
    group.add(ring);
    const veil = new THREE.Mesh(
      new THREE.CircleGeometry(1.15, 28),
      new THREE.MeshBasicMaterial({
        color, transparent: true, opacity: 0.55, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false
      })
    );
    veil.position.y = 1.5;
    group.add(veil);
    const light = new THREE.PointLight(color, 2.4, 12, 2);
    light.position.y = 1.6;
    group.add(light);
    // el portal mira hacia la camara
    group.lookAt(this.camBase.x, 1.5, this.camBase.z);
    this.scene.add(group);
    this.portal = group;
    this.portalRing = ring;

    this.feedback.flash(EXIT, { color, intensity: 5, duration: 1.2 });
    this.feedback.burst(EXIT, { count: 30, color, speed: 4, life: 1.4 });
    this.audio.play('chime', { volume: 0.5 });
    this.say('CRUZA EL PUENTE', 2200);
  }

  get completionPayload() {
    return {
      islandId: 'anger',
      success: true,
      emoAventura: true,
      badge: 'anger',
      title: 'Al rojo vivo',
      message: `Dejaste enfriar ${TOTAL_ROCKS} rocas y construiste el puente con ellas.`
    };
  }

  finish() {
    if (this.finished || this.closing) return;
    this.closing = true;
    this.tooltip.hidden = true;
    addReward('gota-calma');
    addReward('escudo-autocontrol');
    completeActivity('anger-rojo-vivo', 20);
    recordReevaluation('anger', 'alta', 'Pausa antes de actuar', 'baja');
    this.showClosingCard({
      title: 'Esperar a que se enfríe',
      lines: [
        'El puente está hecho de las mismas rocas que te quemaban. Esto es lo que fuiste encontrando:',
        ...this.seen.map((r) => `<strong>${r.title}.</strong> ${r.text}`)
      ],
      onDone: () => super.finish()
    });
  }

  onReset() {
    this.clearField(false);
    this.rocks.forEach((r) => this.freeRock(r));
    this.sparks.forEach((s) => this.freeSpark(s));
    this.blocks.forEach((b) => b.mesh.scale.setScalar(0.001));
    this.heat = 0;
    this.heatShown = 0;
    this.calmness = 0;
    this.wave = -1;
    this.caught = 0;
    this.placed = 0;
    this.caughtInWave = 0;
    this.placedInWave = 0;
    this.shake = 0;
    this.erupted = false;
    this.seen.length = 0;
    this.heatBar.set(0);
    this.calmBar.show(false);
    this.veil?.remove();
    this.veil = null;
    this.tooltip.hidden = true;
    this.waveEl.querySelector('b').textContent = '1';
    if (this.portal) {
      this.scene.remove(this.portal);
      this.portal = null;
      this.portalRing = null;
    }
    this.phase = 'between';
    this.phaseTimer = BETWEEN_SECONDS - 1.4;
  }

  onDispose() {
    this.ambientRumble?.stop();
    this.rocks.length = 0;
    this.sparks.length = 0;
    this.blocks.length = 0;
    this.tooltip?.remove();
    this.waveEl?.remove();
    this.veil?.remove();
  }
}
