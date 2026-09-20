// ISLA DE LA FRUSTRACION · Nivel 2 «El Volcan de la Presion»
// Genero: ACCION EN TIEMPO REAL, reactiva, con recurso que se acumula · camara
// fija sobre la boca del volcan · se juega tocando y manteniendo (nada de
// arrastrar: a proposito lo opuesto al taller).
//
// El volcan es la presion que se junta por dentro cuando algo no sale. No se
// apaga: se suelta. La PRESION (TensionMeter) sube sola y con obstaculos; el
// jugador tiene tres valvulas, cada una con su boton grande:
//   A) VALVULA DE RESPIRACION  mantener pulsado mientras el anillo crece y
//                              soltar cuando decrece. Acierto: vapor, -18.
//                              Fallo: no baja; nunca sube.
//   B) TRANSFORMAR PENSAMIENTOS burbujas de humo negro con pensamientos
//                              trampa suben del crater; tocarlas las convierte
//                              en luz con un pensamiento que ayuda (-10). Si
//                              una llega arriba sin tocarla: +8.
//   C) CUERDA DE AYUDA         Tuerca despeja el crater, -25, cooldown 20 s.
//                              Nunca cuesta nada.
// Y LA TRAMPA PEDAGOGICA: un boton rojo, grande y tentador, ¡GOLPEAR!. Baja
// 15 durante un segundo... y luego sube 30 y rompe una tuberia que filtra
// presion 10 s. Se puede pulsar todas las veces que se quiera (se cuenta).
// Tres oleadas guionizadas: burbujas lentas; la GRIETA (solo se sella con dos
// respiraciones seguidas bien); y LA META SE MUEVE (la lava casi fria se
// vuelve a derretir: hay que aguantar 20 s mas). DESBORDE (100): erupcion
// breve y algo comica, la presion vuelve al 50 % y se sigue desde el mismo
// punto; al segundo desborde, escalado adaptativo (solo mas facil). Sin
// pantalla de derrota. La caja de calma (CalmToolbox) se ofrece tras el
// primer desborde, sin imponerla.
// Todos los textos viven en textos.js.

import * as THREE from 'three';
import { MinigameBase, prefersReducedMotion } from '../../engine/MinigameBase.js';
import { createSky, createLights, createGround, GEO, scatterInstanced } from '../../engine/worldkit.js';
import { TensionMeter } from './TensionMeter.js';
import { CalmToolbox } from './CalmToolbox.js';
import { makeTuercaMesh, TuercaVoice } from './Tuerca.js';
import { VOLCAN as T, MAQUINA, veces, rellenar } from './textos.js';
import { completeActivity, recordReevaluation, setInitialIntensity, recordSession, lastSession, setPlan } from '../../data/gameState.js';

const THRESHOLD = 60;             // bajo esto la lava se enfria
const BASE_RISE = 2.1;            // presion por segundo, sola
const RING_IN = 3;                // anillo: crece 3 s, decrece 3 s
const RING_OUT = 3;
const ROPE_COOLDOWN = 20;
const PIPE_SECONDS = 10;
const PIPE_RISE = 2.4;
const CRACK_RISE = 1.6;

// oleadas: duracion (segundos con la presion bajo el umbral), ritmo de burbujas
const WAVES = [
  { id: 'burbujas', seconds: 60, spawnEvery: 3.4, rise: 9.5 },
  { id: 'grieta', seconds: 66, spawnEvery: 2.6, rise: 8 },
  { id: 'meta', seconds: 72, spawnEvery: 2.1, rise: 6.8 }
];
const PRESSURE = { respiro: -18, pensamiento: -10, perdido: 8, cuerda: -25, golpe: -15, tuberia: 30, herramienta: -20 };

const LAVA_HOT = new THREE.Color('#ff5a1f');
const LAVA_COOL = new THREE.Color('#3a2a26');
const _c = new THREE.Color();

export class VolcanPresionGame extends MinigameBase {
  constructor(opts) {
    super({ ...opts, mode: 'third' });
    this.phase = 'intro';         // intro | play | victory | done
    this.time = 0;
    this.wave = -1;
    this.waveDef = null;
    this.cool = 0;                // 0..1 lava fria en la oleada
    this.bubbles = [];            // { el, x, y, t, life, dead, def }
    this.spawnT = 0;
    this.ring = { t: 0, holding: false, heldIn: 0, heldOut: 0, touched: false };
    this.rope = 0;
    this.pipe = 0;
    this.crack = false;
    this.breathStreak = 0;
    this.tremorDone = false;
    this.adaptive = false;
    this.overflowing = 0;
    this.stones = [];
    this.flight = null;
    this.stats = { oleadas: 0, desbordes: 0, golpes: 0, respOk: 0, respNo: 0, pensOk: 0, pensNo: 0, ayudas: 0, herramientas: [], primeraEstrategia: null, temblorSuperado: false };
    this.reduceMotion = prefersReducedMotion();
    this.shake = 0;
    this.entryIntensity = null;
    this.startedAt = null;
  }

  /* ============================================================ escenario */

  build() {
    const scene = this.scene;
    this.controller.enabled = false;
    this.el.touch.remove();
    this.root.classList.add('vp');
    this.renderer.toneMappingExposure = 1.05;

    scene.fog = new THREE.FogExp2('#c9a48a', 0.02);
    this.sky = createSky({ top: '#3f5f8f', bottom: '#f0b48a', size: 150 });
    scene.add(this.sky);
    this.lights = createLights({ sunColor: '#ffd8b0', sunIntensity: 1.4, hemiSky: '#c9a48a', hemiGround: '#4a3a30', hemiIntensity: 0.7, area: 24 });
    this.lights.userData.sun.position.set(-10, 20, 8);
    scene.add(this.lights);

    // la cordillera: suelo y picos al fondo
    this.ground = createGround({ size: 140, segments: 40, color: '#6f5a4a', amplitude: 2.2, scale: 0.05, flatRadius: 12 });
    this.ground.position.y = -3;
    scene.add(this.ground);
    const peakMat = new THREE.MeshStandardMaterial({ color: '#7a6658', roughness: 1, flatShading: true });
    scene.add(scatterInstanced(new THREE.ConeGeometry(4, 9, 6), peakMat, 14, (i) => {
      const a = Math.PI * 0.55 + (i / 14) * Math.PI * 1.9;
      const r = 26 + (i % 4) * 7;
      return { x: Math.cos(a) * r, y: -1 + (i % 3), z: Math.sin(a) * r, ry: i, scale: 0.8 + (i % 3) * 0.35 };
    }));
    const rockMat = new THREE.MeshStandardMaterial({ color: '#5f4f44', roughness: 1, flatShading: true });
    scene.add(scatterInstanced(GEO.rock(), rockMat, 30, (i) => {
      const a = i * 1.9;
      const r = 8.5 + (i % 5) * 1.6;
      return { x: Math.cos(a) * r, y: -2.4 + this.ground.userData.heightAt(Math.cos(a) * r, Math.sin(a) * r), z: Math.sin(a) * r, ry: a, scale: 0.6 + (i % 3) * 0.4 };
    }));

    // el volcan: cono con crater y lava dentro
    const rimMat = new THREE.MeshStandardMaterial({ color: '#5a4a42', roughness: 1, flatShading: true });
    this.cone = new THREE.Mesh(new THREE.CylinderGeometry(3.6, 7.5, 4.2, 12, 1, true), rimMat);
    this.cone.position.y = -0.9;
    scene.add(this.cone);
    const inner = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 2.2, 1.8, 12, 1, true), new THREE.MeshStandardMaterial({ color: '#3a2c28', roughness: 1, flatShading: true, side: THREE.BackSide }));
    inner.position.y = 0.3;
    scene.add(inner);
    this.lavaMat = new THREE.MeshStandardMaterial({ color: '#ff5a1f', emissive: '#ff3c00', emissiveIntensity: 1.2, roughness: 0.7, flatShading: true });
    this.lava = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.3, 0.2, 14), this.lavaMat);
    this.lava.position.y = -0.4;
    scene.add(this.lava);
    this.lavaLight = new THREE.PointLight('#ff6a2a', 2.2, 12, 1.8);
    this.lavaLight.position.set(0, 0.6, 0);
    scene.add(this.lavaLight);
    // la grieta (oleada 2) y la tuberia rota (golpe)
    this.crackMesh = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.06, 2.6), new THREE.MeshStandardMaterial({ color: '#ff8a3c', emissive: '#ff5a1f', emissiveIntensity: 1.5 }));
    this.crackMesh.position.set(2.2, 1.24, 1.4);
    this.crackMesh.rotation.y = 0.6;
    this.crackMesh.visible = false;
    scene.add(this.crackMesh);
    const pipeMat = new THREE.MeshStandardMaterial({ color: '#8a7a6a', roughness: 0.6, metalness: 0.4, flatShading: true });
    this.pipeMesh = new THREE.Group();
    const p1 = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 3.2, 8), pipeMat);
    p1.rotation.z = 0.5;
    p1.position.set(-4.2, 0.2, 2.4);
    const valve = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.06, 6, 12), pipeMat);
    valve.position.set(-3.6, 1.3, 2.6);
    this.pipeMesh.add(p1, valve);
    scene.add(this.pipeMesh);
    this.pipeLeak = new THREE.Object3D();
    this.pipeLeak.position.set(-4.6, 0.9, 2.5);
    scene.add(this.pipeLeak);

    // las dos mitades de la cima que se abren y el puente de piedra (victoria)
    const capMat = new THREE.MeshStandardMaterial({ color: '#6f5f55', roughness: 1, flatShading: true });
    this.caps = [-1, 1].map((sd) => {
      const cap = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.5, 1.2), capMat);
      cap.position.set(sd * 1.75, 1.35, -2.2);
      cap.visible = false;
      scene.add(cap);
      return cap;
    });
    this.bridge = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.4, 14), capMat);
    this.bridge.position.set(0, 1.2, -9.4);
    this.bridge.scale.z = 0.001;
    this.bridge.visible = false;
    scene.add(this.bridge);

    // Tuerca, en el borde del crater
    this.tuerca = makeTuercaMesh({ scale: 0.9 });
    this.tuerca.position.set(4.6, 1.1, 1.6);
    this.tuerca.userData.baseY = 1.1;
    this.tuerca.rotation.y = -0.7;
    scene.add(this.tuerca);

    // piedras de goma para la erupcion
    this.stoneGeo = new THREE.DodecahedronGeometry(0.28, 0);
    this.stoneMat = new THREE.MeshStandardMaterial({ color: '#ff8a5c', roughness: 0.9, flatShading: true });
    this.stonePool = [];
    for (let i = 0; i < 10; i += 1) {
      const m = new THREE.Mesh(this.stoneGeo, this.stoneMat);
      m.visible = false;
      scene.add(m);
      this.stonePool.push(m);
    }

    this.camera.fov = 52;
    this.camBase = new THREE.Vector3(0, 6.8, 10.5);
    this.camTarget = new THREE.Vector3(0, 0.9, 0);
    this.camera.position.copy(this.camBase);
    this.camera.lookAt(this.camTarget);
    this.camera.updateProjectionMatrix();

    this.buildHud();
    this.buildInput();
    this.toolbox = new CalmToolbox(this, {
      hint: () => T.tuerca.oleada2,
      onPlanB: () => T.tuerca.cuerda,
      onUsed: (id) => this.toolUsed(id),
      reduceMotion: this.reduceMotion
    });
  }

  /* ================================================================= HUD */

  buildHud() {
    this.meter = new TensionMeter({
      host: this.el.hud,
      label: T.hud.presion,
      icon: '🌋',
      onMax: () => this.overflow()
    });
    this.voice = new TuercaVoice(this, this.tuerca, MAQUINA.tuerca.nombre);

    this.waveEl = document.createElement('div');
    this.waveEl.className = 'i3d-wave mt-round';
    this.el.hud.appendChild(this.waveEl);

    // lava fria: la meta de cada oleada
    this.lavaEl = document.createElement('div');
    this.lavaEl.className = 'vp-lava';
    this.lavaEl.innerHTML = `<span aria-hidden="true">🧊</span><i><b data-fill></b></i><small>${T.hud.lava}</small>`;
    this.el.hud.appendChild(this.lavaEl);
    this.lavaFill = this.lavaEl.querySelector('[data-fill]');

    // campo de burbujas (pensamientos trampa)
    this.field = document.createElement('div');
    this.field.className = 'vp-field';
    this.root.appendChild(this.field);

    this.vignette = document.createElement('div');
    this.vignette.className = 'mt-vignette';
    this.root.appendChild(this.vignette);

    // valvula A: el anillo de respirar (mantener)
    this.ringEl = document.createElement('button');
    this.ringEl.type = 'button';
    this.ringEl.className = 'vp-ring';
    this.ringEl.setAttribute('aria-label', `${T.hud.respirar}: ${T.hud.respirarSub}`);
    this.ringEl.innerHTML = `<i data-ring></i><span><b>${T.hud.respirar}</b><small data-ring-hint>${T.hud.respirarSub}</small></span>`;
    this.el.hud.appendChild(this.ringEl);
    this.ringInner = this.ringEl.querySelector('[data-ring]');
    this.ringHint = this.ringEl.querySelector('[data-ring-hint]');

    // valvula C y la trampa
    this.tools = document.createElement('div');
    this.tools.className = 'i3d-tools vp-tools';
    this.tools.innerHTML = `
      <button class="i3d-tool" type="button" data-rope><b>🙋</b><span>${T.hud.cuerda}<small data-rope-sub>${T.hud.cuerdaSub}</small></span></button>
      <button class="i3d-tool vp-hit" type="button" data-hit><b>🔴</b><span>${T.hud.golpear}<small>descarga</small></span></button>
      <button class="i3d-tool" type="button" data-calm><b>🧰</b><span>Calma<small>caja</small></span></button>
    `;
    this.el.hud.appendChild(this.tools);
    this.ropeBtn = this.tools.querySelector('[data-rope]');
    this.ropeSub = this.tools.querySelector('[data-rope-sub]');
    this.ropeBtn.addEventListener('click', () => this.pullRope());
    this.tools.querySelector('[data-hit]').addEventListener('click', () => this.hit());
    this.tools.querySelector('[data-calm]').addEventListener('click', () => this.openToolbox());
  }

  renderWave() {
    this.waveEl.innerHTML = `<b>${this.wave + 1}</b>/3 <small>· ${T.hud.oleada[this.wave] ?? ''}</small>`;
  }

  /* =============================================================== input */

  buildInput() {
    // el anillo: mantener con el dedo/raton o con la barra espaciadora
    const ring = this.ringEl;
    let pid = null;
    const down = (e) => { if (pid !== null) return; e.preventDefault(); pid = e.pointerId; try { ring.setPointerCapture(e.pointerId); } catch { /* opcional */ } this.setHolding(true); };
    const up = (e) => { if (pid === null) return; if (e && e.pointerId !== undefined && e.pointerId !== pid) return; pid = null; this.setHolding(false); };
    ring.addEventListener('pointerdown', down);
    ring.addEventListener('pointerup', up);
    ring.addEventListener('pointercancel', up);
    ring.addEventListener('lostpointercapture', up);
    window.addEventListener('pointerup', up);
    window.addEventListener('blur', () => up(null));
    this.listeners.push(() => window.removeEventListener('pointerup', up));

    const keyDown = (e) => {
      if (this.paused || this.finished || this.toolbox.isOpen) return;
      if (e.key === ' ') { e.preventDefault(); if (!e.repeat) this.setHolding(true); }
      if (e.repeat) return;
      const k = e.key.toLowerCase();
      if (k === 't') { const b = this.bubbles.find((x) => !x.dead); if (b) this.transform(b); }
      if (k === 'a') this.pullRope();
      if (k === 'g') this.hit();
      if (k === 'c') this.openToolbox();
    };
    const keyUp = (e) => { if (e.key === ' ') this.setHolding(false); };
    window.addEventListener('keydown', keyDown);
    window.addEventListener('keyup', keyUp);
    this.listeners.push(() => { window.removeEventListener('keydown', keyDown); window.removeEventListener('keyup', keyUp); });
  }

  setHolding(on) {
    if (this.ring.holding === on) return;
    this.ring.holding = on;
    this.ring.touched = true;
    this.ringEl.classList.toggle('is-held', on);
    if (this.phase === 'play' && !this.stats.primeraEstrategia && on) this.firstStrategy('respiracion');
  }

  firstStrategy(id) {
    if (this.stats.primeraEstrategia) return;
    this.stats.primeraEstrategia = { id, seg: Math.round((performance.now() - this.startedAt) / 1000) };
  }

  /* ============================================================ arranque */

  async onStart() {
    const n = await this.showChoice({
      eyebrow: T.intro.eyebrow,
      title: '¿Cuánta presión traes a la cima?',
      options: MAQUINA.cierre.caras.map((c) => ({ label: `${c.icon} ${c.n}`, text: c.label, value: c.n, color: ['#7fd1a8', '#b8d97a', '#ffd166', '#ff9a5c', '#ff6b5c'][c.n - 1] }))
    });
    this.entryIntensity = n;
    setInitialIntensity(n <= 2 ? 'baja' : n === 3 ? 'media' : 'alta');
    await this.showIntro(T.intro);
    this.startedAt = performance.now();
    this.rumble = this.audio.ambient('rumble', { volume: 0.12 });
    this.phase = 'play';
    this.voice.say(T.tuerca.bienvenida);
    this.later(() => this.startWave(0), 2800);
  }

  startWave(i) {
    this.wave = i;
    this.waveDef = WAVES[i];
    this.cool = 0;
    this.spawnT = 1.5;
    this.tremorDone = false;
    this.renderWave();
    this.lavaFill.style.width = '0%';
    this.voice.say(i === 0 ? T.tuerca.oleada1 : i === 1 ? T.tuerca.oleada2 : T.tuerca.oleada3);
    if (i === 1) this.openCrack();
    this.audio.play('chime', { volume: 0.35, rate: 0.9 + i * 0.1 });
  }

  /* ====================================================== A · respirar */

  /** El anillo respira solo; se mira si la mano acompaño en el ultimo ciclo */
  updateRing(dt) {
    const r = this.ring;
    const total = RING_IN + RING_OUT;
    r.t += dt;
    const u = r.t % total;
    const growing = u < RING_IN;
    if (r.holding) { if (growing) r.heldIn += dt; else r.heldOut += dt; }
    const scale = growing ? 0.55 + 0.45 * (u / RING_IN) : 1 - 0.45 * ((u - RING_IN) / RING_OUT);
    this.ringInner.style.setProperty('--s', scale.toFixed(3));
    this.ringEl.dataset.phase = growing ? 'in' : 'out';
    this.ringHint.textContent = growing ? 'mantén…' : 'suelta…';
    if (r.t >= total) {
      r.t -= total;
      if (r.touched) {
        const ok = r.heldIn >= RING_IN * 0.6 && r.heldOut <= RING_OUT * 0.4;
        if (ok) this.breathOk();
        else this.breathNo();
      }
      r.heldIn = 0;
      r.heldOut = 0;
      r.touched = r.holding;   // si sigue pulsando, el siguiente ciclo cuenta
    }
  }

  breathOk() {
    this.stats.respOk += 1;
    this.breathStreak += 1;
    this.meter.add(PRESSURE.respiro, 'respiro');
    this.say(T.avisos.respiroOk, 1300);
    this.audio.play('hiss', { volume: 0.45 });
    this.audio.play('exhale', { volume: 0.3 });
    this.feedback.burst(new THREE.Vector3(0, 0.6, 0), { count: 26, color: '#f4f4f0', speed: 3.2, life: 1.4, size: 1.2, gravity: -2.4 });
    this.ringEl.classList.add('is-ok');
    this.later(() => this.ringEl.classList.remove('is-ok'), 500);
    if (this.crack && this.breathStreak >= 2) this.sealCrack();
  }

  breathNo() {
    this.stats.respNo += 1;
    this.breathStreak = 0;
    this.say(T.avisos.respiroNo, 1300);
    this.audio.play('soften', { volume: 0.3 });
  }

  /* ================================================== B · pensamientos */

  spawnBubble() {
    const def = T.pensamientos[Math.floor(Math.random() * T.pensamientos.length)];
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'vp-bubble';
    el.textContent = def.trampa;
    el.setAttribute('aria-label', `Pensamiento trampa: ${def.trampa}. Tocar para transformarlo.`);
    const b = { el, def, x: 32 + Math.random() * 36, y: 0, t: 0, life: this.waveDef.rise * (this.adaptive ? 1.25 : 1), dead: false, sway: Math.random() * Math.PI * 2 };
    el.addEventListener('pointerdown', (e) => { e.preventDefault(); this.transform(b); });
    this.field.appendChild(el);
    this.bubbles.push(b);
  }

  transform(b) {
    if (b.dead || this.phase !== 'play') return;
    b.dead = true;
    b.el.textContent = b.def.ayuda;
    b.el.classList.add('is-light');
    b.el.disabled = true;
    this.stats.pensOk += 1;
    this.firstStrategy('pensamientos');
    this.meter.add(PRESSURE.pensamiento, 'pensamiento');
    this.say(T.avisos.transformado, 1000);
    this.audio.play('collect', { volume: 0.4, rate: 1.1 });
    this.later(() => { b.el.remove(); }, 1700);
  }

  loseBubble(b) {
    b.dead = true;
    b.el.classList.add('is-lost');
    b.el.disabled = true;
    this.stats.pensNo += 1;
    this.meter.add(PRESSURE.perdido, 'perdido');
    this.say(T.avisos.perdido, 1100);
    this.audio.play('soften', { volume: 0.35, rate: 0.8 });
    this.later(() => { b.el.remove(); }, 500);
  }

  updateBubbles(dt) {
    if (this.phase === 'play' && this.waveDef && this.overflowing <= 0) {
      this.spawnT -= dt;
      if (this.spawnT <= 0) {
        this.spawnT = this.waveDef.spawnEvery * (this.adaptive ? 1.25 : 1);
        this.spawnBubble();
      }
    }
    for (let i = this.bubbles.length - 1; i >= 0; i -= 1) {
      const b = this.bubbles[i];
      if (b.dead) {
        if (!b.el.isConnected) this.bubbles.splice(i, 1);
        continue;
      }
      b.t += dt;
      const u = b.t / b.life;
      b.y = u;
      const sway = this.reduceMotion ? 0 : Math.sin(this.time * 1.6 + b.sway) * 3;
      b.el.style.left = `${(b.x + sway).toFixed(2)}%`;
      b.el.style.top = `${(64 - u * 58).toFixed(2)}%`;
      if (u >= 1) this.loseBubble(b);
    }
  }

  clearBubbles(transformed) {
    this.bubbles.forEach((b) => {
      if (b.dead) return;
      b.dead = true;
      b.el.disabled = true;
      if (transformed) { b.el.textContent = b.def.ayuda; b.el.classList.add('is-light'); }
      this.later(() => b.el.remove(), transformed ? 1700 : 300);
    });
  }

  /* ======================================================== C · cuerda */

  pullRope() {
    if (this.phase !== 'play' || this.rope > 0 || this.toolbox.isOpen) return;
    this.rope = ROPE_COOLDOWN;
    this.stats.ayudas += 1;
    this.firstStrategy('ayuda');
    this.clearBubbles(true);
    this.meter.add(PRESSURE.cuerda, 'cuerda');
    this.say(T.avisos.cuerda, 1600);
    this.voice.say(T.tuerca.cuerda, 'cuerda');
    this.audio.play('chime', { volume: 0.45, rate: 1.1 });
    this.audio.play('hiss', { volume: 0.3 });
    // Tuerca da un salto y despeja
    this.tuercaJump = 0.8;
    this.feedback.burst(new THREE.Vector3(0, 0.8, 0), { count: 30, color: '#9fd8c0', speed: 3.5, life: 1.2, size: 1.1, gravity: -2 });
    this.renderRope();
  }

  renderRope() {
    const wait = this.rope > 0;
    this.ropeBtn.disabled = wait;
    this.ropeSub.textContent = wait ? rellenar(T.avisos.cuerdaEspera, { s: Math.ceil(this.rope) }).toLowerCase() : T.hud.cuerdaSub;
  }

  /* ================================================== la trampa: golpear */

  hit() {
    if (this.phase !== 'play' || this.toolbox.isOpen) return;
    this.stats.golpes += 1;
    this.firstStrategy('golpe');
    this.shakeBy(0.5);
    this.audio.play('thud', { volume: 0.7, rate: 0.7 });
    this.audio.play('rumble', { volume: 0.4 });
    this.meter.add(PRESSURE.golpe, 'golpe');
    this.say(T.avisos.golpe, 1000);
    this.feedback.burst(new THREE.Vector3(0, 0.8, 0), { count: 20, color: '#ff8a5c', speed: 4, life: 0.8, size: 1.2, gravity: -5 });
    this.later(() => {
      if (this.phase !== 'play') return;
      this.meter.add(PRESSURE.tuberia, 'tuberia');
      this.pipe = PIPE_SECONDS;
      this.say(T.avisos.tuberia, 1600);
      this.audio.play('crack', { volume: 0.6 });
      this.audio.play('metal', { volume: 0.4 });
      // se lo comenta una sola vez por partida, sin sermon
      this.voice.say(T.tuerca.golpe, 'golpe');
    }, 1000);
  }

  /* ============================================================ grieta */

  openCrack() {
    this.crack = true;
    this.breathStreak = 0;
    this.crackMesh.visible = true;
    this.say(T.avisos.grieta, 2200);
    this.audio.play('crack', { volume: 0.5, rate: 0.7 });
    this.shakeBy(0.3);
  }

  sealCrack() {
    this.crack = false;
    this.crackMesh.visible = false;
    this.say(T.avisos.sellada, 1600);
    this.voice.say(T.tuerca.grietaSellada, 'sellada');
    this.audio.play('success', { volume: 0.4 });
    completeActivity('frustration-grieta', 6);
  }

  /* ========================================================= desborde */

  /** Erupcion breve y algo comica: nunca es derrota, la presion vuelve al 50 % */
  overflow() {
    if (this.phase !== 'play') return;
    this.stats.desbordes += 1;
    this.overflowing = 2.4;
    this.audio.play('erupt', { volume: 0.7 });
    this.shakeBy(0.9);
    this.say(T.avisos.desborde, 2400);
    this.voice.say(T.tuerca.desborde, `desborde${this.stats.desbordes}`);
    this.clearBubbles(false);
    this.feedback.burst(new THREE.Vector3(0, 1, 0), { count: 60, color: '#ff8a5c', speed: 7, life: 1.8, size: 1.6, gravity: -4 });
    // piedras de goma que rebotan
    this.stonePool.forEach((m, i) => {
      m.visible = true;
      m.position.set((Math.random() - 0.5) * 1.5, 1, (Math.random() - 0.5) * 1.5);
      this.stones.push({ mesh: m, vx: (Math.random() - 0.5) * 6, vy: 7 + Math.random() * 5, vz: 1 + Math.random() * 4, t: 0, bounces: 0 });
      void i;
    });
    // Tuerca sale volando con el paraguas y vuelve
    this.flight = { t: 0, dur: 2.6 };
    this.tuerca.userData.umbrella.visible = true;
    this.meter.set(50, 'desborde');
    if (this.stats.desbordes >= 2 && !this.adaptive) {
      this.adaptive = true;
      this.later(() => this.voice.say(T.tuerca.adaptativo, 'adaptativo'), 2800);
    }
    // la caja de calma, ofrecida (no impuesta) tras el primer desborde
    if (this.stats.desbordes === 1) this.later(() => { if (this.phase === 'play') this.openToolbox(); }, 3000);
  }

  openToolbox() {
    if (this.toolbox.isOpen || this.phase !== 'play') return;
    this.setHolding(false);
    this.toolbox.open({ forced: false, tools: ['respiracion', 'contar', 'ayuda'] });
  }

  toolUsed(id) {
    this.stats.herramientas.push(id);
    this.meter.add(PRESSURE.herramienta, 'herramienta');
    this.say(T.avisos.herramienta, 1600);
    this.audio.play('warm', { volume: 0.4 });
  }

  shakeBy(v) { this.shake = Math.max(this.shake, v); }

  /* =========================================================== oleadas */

  updateWave(dt) {
    if (!this.waveDef) { this.meter.update(dt); return; }   // antes de la primera oleada
    const v = this.meter.value;
    // la presion sube sola; mas con la grieta y la tuberia rota
    let rise = BASE_RISE * (this.adaptive ? 0.75 : 1);
    if (this.crack) rise += CRACK_RISE;
    if (this.pipe > 0) { this.pipe -= dt; rise += PIPE_RISE; }
    if (this.overflowing > 0) { this.overflowing -= dt; rise = 0; }
    this.meter.add(rise * dt);
    this.meter.update(dt);

    // la lava solo se enfria con la presion bajo el umbral
    if (v < THRESHOLD && this.overflowing <= 0) {
      this.cool = Math.min(1, this.cool + dt / this.waveDef.seconds);
      this.lavaFill.style.width = `${(this.cool * 100).toFixed(1)}%`;
      // oleada 3: la meta se mueve
      if (this.wave === 2 && !this.tremorDone && this.cool >= 0.85) this.tremor();
      if (this.cool >= 1) this.waveDone();
    }
    if (this.rope > 0) { this.rope -= dt; if (this.rope <= 0 || Math.ceil(this.rope) !== this._ropeShown) { this._ropeShown = Math.ceil(this.rope); this.renderRope(); } }
  }

  tremor() {
    this.tremorDone = true;
    this.cool = 0.6;
    this.lavaFill.style.width = '60%';
    this.shakeBy(0.7);
    this.audio.play('rumble', { volume: 0.6 });
    this.audio.play('erupt', { volume: 0.25, rate: 0.6 });
    this.say(T.avisos.temblor, 2400);
    this.voice.say(T.tuerca.temblor, 'temblor');
    this.feedback.burst(new THREE.Vector3(0, 0.6, 0), { count: 24, color: '#ff5a1f', speed: 3, life: 1.2, size: 1.2, gravity: -3 });
  }

  waveDone() {
    this.stats.oleadas += 1;
    if (this.wave === 2 && this.tremorDone) this.stats.temblorSuperado = true;
    this.audio.play('success', { volume: 0.4 });
    completeActivity(`frustration-oleada-${this.wave + 1}`, 5);
    if (this.wave >= WAVES.length - 1) { this.victory(); return; }
    this.startWave(this.wave + 1);
  }

  /* ============================================================ victoria */

  victory() {
    this.phase = 'victory';
    this.setHolding(false);
    this.clearBubbles(true);
    this.crack = false;
    this.crackMesh.visible = false;
    this.pipe = 0;
    this.tools.hidden = true;
    this.ringEl.hidden = true;
    this.meter.set(Math.min(this.meter.value, 20), 'victoria');
    this.solid = true;
    this.say(T.avisos.victoria, 2800);
    this.voice.say(T.tuerca.victoria);
    this.audio.play('success', { volume: 0.55 });
    this.audio.play('warm', { volume: 0.5 });
    this.rumble?.setVolume(0, 2);
    // la cima se abre y sale el puente; la camara sube para ver la cordillera
    this.caps.forEach((c) => { c.visible = true; });
    this.feedback.tweenValue(this.caps[0].position, 'x', -4.2, 2.4);
    this.feedback.tweenValue(this.caps[1].position, 'x', 4.2, 2.4);
    this.bridge.visible = true;
    this.later(() => this.feedback.tweenValue(this.bridge.scale, 'z', 1, 2.6), 1400);
    this.feedback.tweenValue(this.camBase, 'y', 13, 5);
    this.feedback.tweenValue(this.camBase, 'z', 15, 5);
    this.feedback.tweenValue(this.camTarget, 'z', -6, 5);
    this.feedback.flash(new THREE.Vector3(0, 2, -3), { color: '#ffe9a8', intensity: 4, duration: 1.8, distance: 20 });
    completeActivity('frustration-volcan-lava', 12);
    this.later(() => this.askReevaluation(), 6000);
  }

  /** Pasos 6-8: reevaluacion, feedback con los datos reales y el reto de la semana */
  async askReevaluation() {
    const c = T.cierre;
    const intensidad = await this.showChoice({
      eyebrow: T.intro.eyebrow,
      title: c.reevalTitulo,
      options: MAQUINA.cierre.caras.map((f) => ({ label: `${f.icon} ${f.n}`, text: f.label, value: f.n, color: ['#7fd1a8', '#b8d97a', '#ffd166', '#ff9a5c', '#ff6b5c'][f.n - 1] }))
    });
    const valvula = await this.showChoice({
      eyebrow: T.intro.eyebrow,
      title: c.valvulaTitulo,
      options: Object.entries(c.valvulas).map(([id, v]) => ({ label: `${v.icon} ${v.label}`, text: '', value: id, color: '#ffd166' }))
    });
    this.reevaluation = { intensidad, valvula };
    const lines = this.feedbackLines(valvula);
    await new Promise((resolve) => this.showClosingCard({ title: c.feedbackTitulo, lines, onDone: resolve }));
    // desafio final de la isla: la valvula de la semana
    const plan = await this.showChoice({
      eyebrow: T.intro.eyebrow,
      title: c.retoTitulo,
      options: Object.entries(c.valvulas).map(([id, v]) => ({ label: `${v.icon} ${v.label}`, text: c.retoTexto, value: id, color: '#7fd1a8' }))
    });
    this.plan = plan;
    setPlan('frustration', { strategy: c.valvulas[plan].label, action: c.retoTexto });
    this.finish();
  }

  feedbackLines(valvula) {
    const f = T.cierre.feedback;
    const s = this.stats;
    const lines = [rellenar(f.resumen, {
      resp: `${s.respOk} ${veces(s.respOk)}`,
      pens: s.pensOk === 1 ? '1 pensamiento' : `${s.pensOk} pensamientos`,
      ayudas: `${s.ayudas} ${veces(s.ayudas)}`
    })];
    if (s.golpes > 0) lines.push(rellenar(f.golpes, { golpes: s.golpes, vez: veces(s.golpes) }));
    else lines.push(f.sinGolpes);
    if (s.desbordes > 0) lines.push(rellenar(f.desbordes, { desbordes: s.desbordes, desborde: s.desbordes === 1 ? 'desborde' : 'desbordes' }));
    if (s.temblorSuperado) lines.push(f.temblor);
    // comparacion con el taller, si hay datos
    const taller = lastSession('frustracion_1');
    if (taller) {
      if (taller.pidioAyuda && s.ayudas === 0) lines.push(f.comparaAyuda);
      else if (!taller.pidioAyuda && s.ayudas > 0) lines.push(f.comparaSolo);
    }
    lines.push(rellenar(f.aprendizaje, { valvula: T.cierre.valvulas[valvula].label.toLowerCase() }));
    lines.push(`<strong>Insignia:</strong> 🌋 ${T.cierre.insignia}`);
    return lines;
  }

  sessionData() {
    const st = this.meter.stats();
    const s = this.stats;
    return {
      nivel: 'frustracion_2',
      oleadasCompletadas: s.oleadas,
      presionMaxima: st.maximo,
      presionPromedio: st.promedio,
      desbordes: s.desbordes,
      golpesImpulsivos: s.golpes,
      respiracionesAcertadas: s.respOk,
      respiracionesFalladas: s.respNo,
      pensamientosTransformados: s.pensOk,
      pensamientosPerdidos: s.pensNo,
      ayudasPedidas: s.ayudas,
      herramientasCalma: [...new Set(s.herramientas)],
      tiempoHastaPrimeraEstrategia: s.primeraEstrategia?.seg ?? null,
      primeraEstrategia: s.primeraEstrategia?.id ?? null,
      activoEscaladoAdaptativo: this.adaptive,
      temblorSuperado: s.temblorSuperado,
      tiempoTotalSeg: this.startedAt ? Math.round((performance.now() - this.startedAt) / 1000) : 0,
      intensidadInicial: this.entryIntensity,
      intensidadAutoreportada: this.reevaluation?.intensidad ?? null,
      valvulaElegida: this.reevaluation?.valvula ?? null,
      valvulaSemana: this.plan ?? null
    };
  }

  get completionPayload() {
    const s = this.stats;
    return {
      islandId: 'frustration',
      success: true,
      emoAventura: true,
      badge: 'frustration',
      title: T.cierre.insignia,
      message: `Enfriaste la lava del volcán: ${s.respOk} respiraciones, ${s.pensOk} pensamientos transformados, ${s.ayudas} ${veces(s.ayudas)} la cuerda y ${s.golpes} ${s.golpes === 1 ? 'golpe' : 'golpes'}. La presión no se apaga: se suelta.`
    };
  }

  finish() {
    if (this.finished || this.closing) return;
    this.closing = true;
    const session = this.sessionData();
    completeActivity('frustration-volcan-3d', 20);
    const ini = this.entryIntensity ?? 3;
    const fin = session.intensidadAutoreportada ?? ini;
    const lvl = (n) => (n <= 2 ? 'baja' : n === 3 ? 'media' : 'alta');
    recordReevaluation('frustration', lvl(ini), T.cierre.valvulas[session.valvulaElegida]?.label ?? 'ninguna', lvl(fin));
    recordSession(session);
    super.finish({ session });
  }

  /* =============================================================== bucle */

  onUpdate(dt) {
    this.time += dt;
    this._rmT = (this._rmT ?? 0) + dt;
    if (this._rmT > 1) { this._rmT = 0; this.reduceMotion = prefersReducedMotion(); this.toolbox.reduceMotion = this.reduceMotion; }

    if (this.phase === 'play' && !this.toolbox.isOpen) {
      this.updateRing(dt);
      this.updateWave(dt);
    } else {
      this.meter.update(dt);
    }
    this.updateBubbles(dt);

    // el volcan devuelve la presion: lava mas viva, vineta, rumor, humo
    const v = this.meter.value;
    const k = Math.max(0, (v - 30) / 70);
    const heat = this.solid ? 0 : 0.25 + 0.75 * (v / 100) * (1 - this.cool * 0.6);
    _c.lerpColors(LAVA_COOL, LAVA_HOT, heat);
    this.lavaMat.color.copy(_c);
    this.lavaMat.emissive.copy(_c);
    this.lavaMat.emissiveIntensity = this.solid ? 0.05 : 0.5 + (v / 100) * 1.4 * (1 - this.cool * 0.7);
    this.lavaLight.intensity = this.solid ? 0.2 : 1 + (v / 100) * 2.6;
    this.lava.position.y = -0.4 + (v / 100) * 0.5 + Math.sin(this.time * 2) * 0.03;
    this.vignette.style.setProperty('--k', k.toFixed(2));
    this.rumble?.setVolume(0.08 + k * 0.3, 0.6);
    if (Math.random() < 0.15 + k * 0.5) this.feedback.drizzle({ x: 0, y: 0.6, z: 0 }, 1.6, { color: v > 60 ? '#3a2a26' : '#8a7a70', life: 1.6, speed: 1.4, gravity: -1.4, size: 1 + k });
    if (this.pipe > 0 && Math.random() < 0.8) this.feedback.drizzle({ x: this.pipeLeak.position.x, y: this.pipeLeak.position.y, z: this.pipeLeak.position.z }, 0.3, { color: '#f0eee8', life: 0.9, speed: 2.4, gravity: -3, size: 0.8 });
    if (this.crack && Math.random() < 0.4) this.feedback.drizzle({ x: 2.2, y: 1.3, z: 1.4 }, 0.8, { color: '#ff8a3c', life: 0.8, speed: 1.2, gravity: -2, size: 0.7 });

    // piedras de goma
    for (let i = this.stones.length - 1; i >= 0; i -= 1) {
      const st = this.stones[i];
      st.t += dt;
      st.vy -= 16 * dt;
      st.mesh.position.x += st.vx * dt;
      st.mesh.position.y += st.vy * dt;
      st.mesh.position.z += st.vz * dt;
      st.mesh.rotation.x += dt * 5;
      const floor = Math.hypot(st.mesh.position.x, st.mesh.position.z) < 3.6 ? 1.2 : -2.2;
      if (st.mesh.position.y < floor && st.vy < 0) {
        st.mesh.position.y = floor;
        st.vy = -st.vy * 0.55;
        st.bounces += 1;
        if (st.bounces <= 2) this.audio.play('boing', { volume: 0.25, rate: 0.9 + Math.random() * 0.3 });
      }
      if (st.t > 3.2) { st.mesh.visible = false; this.stones.splice(i, 1); }
    }
    // el vuelo de Tuerca con paraguas
    if (this.flight) {
      const f = this.flight;
      f.t += dt;
      const u = Math.min(1, f.t / f.dur);
      this.tuerca.position.y = this.tuerca.userData.baseY + Math.sin(u * Math.PI) * 4;
      this.tuerca.position.x = 4.6 + Math.sin(u * Math.PI) * 1.5;
      this.tuerca.rotation.z = Math.sin(u * Math.PI * 2) * 0.3;
      if (u >= 1) { this.flight = null; this.tuerca.userData.umbrella.visible = false; this.tuerca.position.x = 4.6; this.tuerca.rotation.z = 0; }
    } else if (this.tuercaJump > 0) {
      this.tuercaJump -= dt;
      this.tuerca.position.y = this.tuerca.userData.baseY + Math.abs(Math.sin(this.time * 12)) * 0.5;
    } else {
      this.voice.update(dt, this.time);
    }

    // camara
    const camShake = this.reduceMotion ? 0 : (v > 60 ? 0.01 + k * 0.03 : 0) + this.shake;
    this.shake = Math.max(0, this.shake - this.shake * dt * 3.2);
    this.camera.position.set(this.camBase.x + (Math.random() - 0.5) * camShake, this.camBase.y + (Math.random() - 0.5) * camShake, this.camBase.z);
    this.camera.lookAt(this.camTarget);
    this.crackMesh.material.emissiveIntensity = 1 + Math.abs(Math.sin(this.time * 6));
  }

  /* ============================================================ reinicio */

  onReset() {
    this.toolbox.dispose();
    this.toolbox = new CalmToolbox(this, {
      hint: () => T.tuerca.oleada2,
      onPlanB: () => T.tuerca.cuerda,
      onUsed: (id) => this.toolUsed(id),
      reduceMotion: this.reduceMotion
    });
    this.bubbles.forEach((b) => b.el.remove());
    this.bubbles.length = 0;
    this.stones.forEach((s) => { s.mesh.visible = false; });
    this.stones.length = 0;
    this.flight = null;
    this.tuerca.userData.umbrella.visible = false;
    this.tuerca.position.set(4.6, 1.1, 1.6);
    this.ring = { t: 0, holding: false, heldIn: 0, heldOut: 0, touched: false };
    this.rope = 0;
    this.pipe = 0;
    this.crack = false;
    this.crackMesh.visible = false;
    this.breathStreak = 0;
    this.adaptive = false;
    this.overflowing = 0;
    this.solid = false;
    this.stats = { oleadas: 0, desbordes: 0, golpes: 0, respOk: 0, respNo: 0, pensOk: 0, pensNo: 0, ayudas: 0, herramientas: [], primeraEstrategia: null, temblorSuperado: false };
    this.meter.reset();
    this.voice.reset();
    this.caps.forEach((c, i) => { c.visible = false; c.position.x = (i ? 1 : -1) * 1.75; });
    this.bridge.visible = false;
    this.bridge.scale.z = 0.001;
    this.camBase.set(0, 6.8, 10.5);
    this.camTarget.set(0, 0.9, 0);
    this.tools.hidden = false;
    this.ringEl.hidden = false;
    this.renderRope();
    this.rumble?.setVolume(0.12, 0.5);
    this.phase = 'play';
    this.audio.unduck();
    this.startWave(0);
  }

  onDispose() {
    this.toolbox?.dispose();
    this.rumble?.stop();
    this.meter?.dispose();
    this.voice?.dispose();
    this.field?.remove();
    this.vignette?.remove();
    this.ringEl?.remove();
    this.tools?.remove();
    this.waveEl?.remove();
    this.lavaEl?.remove();
  }
}
