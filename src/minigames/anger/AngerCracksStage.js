// ISLA DEL ENOJO · Las grietas (segundo mini-juego)
// Verbo: SEGUIR HASTA EL ORIGEN · se juega arrastrando el dedo / el raton
//
// Con el volcan apagado, la cornisa queda llena de grietas al rojo. Cada una
// nace de algo concreto que encendio el enojo. Hay que recorrerla con el dedo
// desde el borde hasta su origen: al llegar, la grieta se sella y aparece lo
// que la encendio. Soltar el dedo no pierde nada; salirse del camino solo
// avisa. En los niveles altos algunas grietas tienen ramas que no llevan a
// ningun sitio.
//
// Herramienta que entrena: Chispa de Comprension (reconocer la ira y entender
// que la encendio). Vive en su propio archivo y usa la escena, el audio y la
// HUD del juego que lo aloja.

import * as THREE from 'three';
import { GEO } from '../../engine/worldkit.js';

// Cada grieta: donde empieza (borde de la cornisa), donde acaba (su origen) y
// que la encendio. Coordenadas x/z sobre la cornisa (y = 0).
const CRACKS = [
  { source: 'Que se burlaran de ti', start: [-4.1, 1.7], end: [-3.4, -3.5], seed: 1.3 },
  { source: 'Que no te escucharan', start: [-1.5, 1.9], end: [-0.4, -3.7], seed: 2.1 },
  { source: 'Que te quitaran algo tuyo', start: [1.2, 1.8], end: [2.3, -3.4], seed: 3.7 },
  { source: 'Que te dijeran que no', start: [3.9, 1.6], end: [4.3, -3.3], seed: 5.2 }
];
const POINTS = 9;                 // puntos de cada grieta
const REACH = 0.72;               // distancia minima (m) para dar por alcanzado un punto
const STRAY = 1.35;               // distancia minima (m) al tramo a partir de la cual "te sales"
// En pantalla, la tolerancia nunca baja de estos pixeles (mas con dedo que con raton)
const REACH_PX = { mouse: 22, touch: 34 };
const STRAY_PX = { mouse: 48, touch: 70 };
const OPEN_SECONDS = 1.6;         // lo que tardan las grietas en abrirse

const _p = new THREE.Vector3();
const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _c = new THREE.Vector3();
const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);

export class AngerCracksStage {
  constructor(game, { decoys = 0 } = {}) {
    this.game = game;
    this.decoys = decoys;        // cuantas grietas llevan una rama falsa
    this.plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this.cracks = [];
    this.active = null;
    this.sealed = 0;
    this.time = 0;
    this.opening = 0;
    this.done = false;
    this.strayAt = -9;
    this.group = new THREE.Group();
    this.hotMat = new THREE.MeshStandardMaterial({ color: '#ff3a12', emissive: '#ff2a08', emissiveIntensity: 1.5, flatShading: true });
    this.coolMat = new THREE.MeshStandardMaterial({ color: '#8fd7ff', emissive: '#3f8fd0', emissiveIntensity: 1.3, flatShading: true });
    this.decoyMat = new THREE.MeshStandardMaterial({ color: '#c96a3a', emissive: '#a03a18', emissiveIntensity: 0.9, flatShading: true });
    this.rockMat = new THREE.MeshStandardMaterial({ color: '#3a2825', roughness: 1, flatShading: true });
    this.ringGeo = new THREE.RingGeometry(0.42, 0.6, 24);
    this.ringGeo.rotateX(-Math.PI / 2);
    this.segGeo = new THREE.BoxGeometry(0.26, 0.06, 1);
    this.build();
    this.bind();
  }

  /* ============================================================ construir */

  build() {
    // todos los tramos en tres mallas instanciadas: al rojo, sellados y ramas falsas
    const nSeg = CRACKS.length * (POINTS - 1);
    const nDecoy = Math.max(1, this.decoys * 2);
    this.hot = new THREE.InstancedMesh(this.segGeo, this.hotMat, nSeg);
    this.cool = new THREE.InstancedMesh(this.segGeo, this.coolMat, nSeg);
    this.decoyMesh = new THREE.InstancedMesh(this.segGeo, this.decoyMat, nDecoy);
    [this.hot, this.cool, this.decoyMesh].forEach((m) => { m.frustumCulled = false; this.group.add(m); });
    let seg = 0;
    let dec = 0;
    CRACKS.forEach((def, i) => {
      const pts = this.makePath(def);
      const crack = { def, pts, idx: 0, sealed: false, segments: [], decoy: [] };
      for (let k = 0; k < pts.length - 1; k += 1) {
        const sd = this.segmentData(pts[k], pts[k + 1], seg++);
        crack.segments.push(sd);
        this.place(this.hot, sd, 0.001);
        this.place(this.cool, sd, 0.001);
      }
      // rama falsa: sale a mitad de camino y no lleva a ningun sitio
      if (i < this.decoys) {
        const from = pts[4];
        const dir = i % 2 ? 1 : -1;
        const d1 = [from[0] + dir * 0.9, from[1] - 0.2];
        const d2 = [d1[0] + dir * 0.8, d1[1] + 0.5];
        [[from, d1], [d1, d2]].forEach(([a, b]) => {
          const sd = this.segmentData(a, b, dec++);
          crack.decoy.push(sd);
          this.place(this.decoyMesh, sd, 0.001);
        });
      }
      // anillo en el arranque
      const ring = new THREE.Mesh(this.ringGeo, new THREE.MeshBasicMaterial({ color: '#ffd166', transparent: true, opacity: 0.85, depthWrite: false }));
      ring.position.set(def.start[0], 0.04, def.start[1]);
      this.group.add(ring);
      crack.ring = ring;
      // el origen, tapado por una roca
      const rock = new THREE.Mesh(GEO.rock(), this.rockMat);
      rock.scale.setScalar(1.1);
      rock.position.set(def.end[0], 0.45, def.end[1]);
      this.group.add(rock);
      crack.rock = rock;
      // lo que habia debajo: un cristal que aparece al sellar
      const crystal = new THREE.Mesh(GEO.crystal(), new THREE.MeshStandardMaterial({ color: '#ffd27a', emissive: '#ff9a3a', emissiveIntensity: 1.8, flatShading: true }));
      crystal.scale.setScalar(0.001);
      crystal.position.set(def.end[0], 0.8, def.end[1]);
      this.group.add(crystal);
      crack.crystal = crystal;
      this.cracks.push(crack);
    });
    this.group.visible = false;
    this.game.scene.add(this.group);
  }

  /** Trazado quebrado de start a end: deterministico por semilla */
  makePath(def) {
    const [sx, sz] = def.start;
    const [ex, ez] = def.end;
    const dx = ex - sx;
    const dz = ez - sz;
    const len = Math.hypot(dx, dz);
    const nx = -dz / len;
    const nz = dx / len;
    const pts = [];
    for (let i = 0; i < POINTS; i += 1) {
      const t = i / (POINTS - 1);
      const wobble = (i === 0 || i === POINTS - 1) ? 0 : Math.sin(i * 1.7 + def.seed) * 0.55 + Math.sin(i * 3.1 + def.seed * 2) * 0.2;
      pts.push([sx + dx * t + nx * wobble, sz + dz * t + nz * wobble]);
    }
    return pts;
  }

  segmentData(a, b, i) {
    const dx = b[0] - a[0];
    const dz = b[1] - a[1];
    return { i, x: (a[0] + b[0]) / 2, z: (a[1] + b[1]) / 2, ry: Math.atan2(dx, dz), len: Math.hypot(dx, dz) };
  }

  /** Coloca (o encoge) un tramo en su malla instanciada */
  place(mesh, sd, len) {
    _q.setFromAxisAngle(_up, sd.ry);
    _s.set(1, 1, Math.max(0.001, len));
    _m.compose(_a.set(sd.x, 0.04, sd.z), _q, _s);
    mesh.setMatrixAt(sd.i, _m);
    mesh.instanceMatrix.needsUpdate = true;
  }

  /* ============================================================== entrada */

  bind() {
    const dom = this.game.renderer.domElement;
    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const toPlane = (e) => {
      const r = dom.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      raycaster.setFromCamera(ndc, this.game.camera);
      return raycaster.ray.intersectPlane(this.plane, _p) ? _p : null;
    };
    let pointerId = null;
    const down = (e) => {
      if (this.game.paused || this.game.finished || this.done || this.opening < OPEN_SECONDS) return;
      if (e.button !== undefined && e.button > 0) return;
      const p = toPlane(e);
      if (!p) return;
      this.updateTolerance(e.pointerType, r());
      const crack = this.pick(p);
      if (!crack) return;
      pointerId = e.pointerId;
      this.active = crack;
      this.game.audio.play('tick', { volume: 0.3 });
      this.follow(crack, p);        // tocar el arranque ya cuenta como alcanzarlo
    };
    const move = (e) => {
      if (this.active === null || e.pointerId !== pointerId) return;
      const p = toPlane(e);
      if (p) this.follow(this.active, p);
    };
    const r = () => dom.getBoundingClientRect();
    const up = (e) => {
      if (e && e.pointerId !== undefined && e.pointerId !== pointerId) return;
      pointerId = null;
      this.active = null;
    };
    dom.addEventListener('pointerdown', down);
    dom.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    window.addEventListener('blur', up);
    this.unbind = () => {
      dom.removeEventListener('pointerdown', down);
      dom.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      window.removeEventListener('blur', up);
    };
    this.game.listeners.push(this.unbind);
  }

  /**
   * Tolerancias en metros a partir de lo que mide un pixel sobre la cornisa:
   * en un celular la misma grieta ocupa menos pantalla y el dedo tapa mas.
   */
  updateTolerance(pointerType, rect) {
    const cam = this.game.camera;
    const dist = cam.position.distanceTo(_a.set(0, 0, -1.5));
    const worldPerPx = (2 * dist * Math.tan((cam.fov * Math.PI) / 360)) / Math.max(1, rect.height);
    const kind = pointerType === 'mouse' ? 'mouse' : 'touch';
    this.reach = Math.max(REACH, REACH_PX[kind] * worldPerPx);
    this.stray = Math.max(STRAY, STRAY_PX[kind] * worldPerPx);
  }

  /** La grieta cuyo siguiente punto (o su arranque) esta bajo el dedo */
  pick(p) {
    let best = null;
    let bestD = Infinity;
    const radius = Math.max(1.2, (this.reach ?? REACH) * 1.6);
    for (const c of this.cracks) {
      if (c.sealed) continue;
      const q = c.pts[c.idx];
      const d = Math.hypot(p.x - q[0], p.z - q[1]);
      if (d < radius && d < bestD) { best = c; bestD = d; }
    }
    return best;
  }

  /** Sella el tramo que lleva al punto `idx` (ya alcanzado) */
  sealSegment(c, idx) {
    if (idx < 1) return;
    const sd = c.segments[idx - 1];
    this.place(this.hot, sd, 0.001);
    this.place(this.cool, sd, sd.len);
    this.game.feedback.burst(_a.set(sd.x, 0.1, sd.z), { count: 5, color: '#9fe3ff', speed: 1.4, life: 0.5, gravity: -1 });
    if (idx % 2 === 0) this.game.audio.play('tick', { volume: 0.22, rate: 1 + idx * 0.04 });
  }

  /** Avanza por los puntos de la grieta mientras el dedo los va alcanzando */
  follow(c, p) {
    const reach = this.reach ?? REACH;
    const stray = this.stray ?? STRAY;
    // el punto mas avanzado al alcance (hasta dos por delante, si el dedo iba rapido)
    for (let skip = 2; skip >= 0; skip -= 1) {
      const target = c.pts[c.idx + skip];
      if (!target) continue;
      if (Math.hypot(p.x - target[0], p.z - target[1]) < reach) {
        for (let k = 0; k <= skip; k += 1) { c.idx += 1; this.sealSegment(c, c.idx - 1); }
        if (c.idx >= c.pts.length) this.seal(c);
        return;
      }
    }
    // ¿se ha salido del tramo actual? solo avisa: no se pierde nada
    if (c.idx > 0) {
      const next = c.pts[c.idx];
      const a = c.pts[c.idx - 1];
      const d = this.distToSegment(p, a, next);
      if (d > stray && this.time - this.strayAt > 1.5) {
        this.strayAt = this.time;
        this.game.say('SIGUE LA GRIETA', 1200);
        this.game.audio.play('soften', { volume: 0.25 });
      }
    }
  }

  distToSegment(p, a, b) {
    _a.set(a[0], 0, a[1]);
    _b.set(b[0], 0, b[1]);
    _c.set(p.x, 0, p.z);
    const ab = _b.clone().sub(_a);
    const t = Math.max(0, Math.min(1, _c.clone().sub(_a).dot(ab) / Math.max(1e-6, ab.lengthSq())));
    return _c.distanceTo(_a.addScaledVector(ab, t));
  }

  /* ============================================================== sellar */

  seal(c) {
    c.sealed = true;
    c.segments.forEach((sd) => { this.place(this.hot, sd, 0.001); this.place(this.cool, sd, sd.len); });
    c.decoy.forEach((sd) => this.place(this.decoyMesh, sd, 0.001));
    c.ring.visible = false;
    this.active = null;
    this.sealed += 1;
    // la roca salta y deja ver lo que habia debajo
    const g = this.game;
    g.feedback.burst(c.rock.position, { count: 22, color: '#ffb347', speed: 4, life: 1, gravity: -3 });
    g.feedback.flash(c.crystal.position, { color: '#ffd27a', intensity: 4, duration: 1, distance: 12 });
    g.audio.play('stone', { volume: 0.5, rate: 0.9 });
    g.audio.play('chime', { volume: 0.35, rate: 1 + this.sealed * 0.08 });
    g.feedback.tween({ from: 0, to: 1, duration: 0.7, onUpdate: (v) => {
      c.rock.position.y = 0.45 + Math.sin(v * Math.PI) * 1.6;
      c.rock.position.x = c.def.end[0] + v * 0.9;
      c.rock.scale.setScalar(1.1 * (1 - v * 0.8));
      c.crystal.scale.setScalar(0.001 + v * 0.9);
    } });
    g.advanceObjective();
    g.showNote({ title: 'Lo que lo encendió', text: c.def.source, seconds: 5 });
    g.onCrackSealed?.(this.sealed, this.cracks.length);
    if (this.sealed >= this.cracks.length) {
      this.done = true;
      g.say('TODAS LAS GRIETAS SELLADAS', 2000);
      g.later(() => g.onCracksDone?.(), 1400);
    }
  }

  /* ============================================================== bucle */

  start() {
    this.group.visible = true;
    this.opening = 0;
    this.game.setObjective(this.cracks.length, '✦');
    this.game.audio.play('erupt', { volume: 0.35, rate: 1.4 });
    this.game.say('LA CORNISA SE AGRIETA', 1600);
  }

  update(dt) {
    this.time += dt;
    // las grietas se abren desde el borde hacia su origen
    if (this.opening < OPEN_SECONDS) {
      this.opening += dt;
      const k = Math.min(1, this.opening / OPEN_SECONDS);
      this.cracks.forEach((c) => {
        c.segments.forEach((sd, i) => {
          const local = Math.max(0, Math.min(1, (k * c.segments.length - i)));
          this.place(this.hot, sd, sd.len * local);
        });
        c.decoy.forEach((sd) => this.place(this.decoyMesh, sd, sd.len * k));
      });
      if (this.opening >= OPEN_SECONDS) this.game.say('SIGUE CADA GRIETA HASTA SU ORIGEN', 2600);
      this.game.shakeBy?.(0.05);
    }
    // el rojo late; el anillo de la grieta activa late mas
    this.hotMat.emissiveIntensity = 1.4 + Math.sin(this.time * 3) * 0.35;
    this.cracks.forEach((c) => {
      if (c.sealed) return;
      const pulse = c === this.active ? 1.25 : 1 + Math.sin(this.time * 4 + c.def.seed) * 0.08;
      c.ring.scale.setScalar(pulse);
      // el anillo acompana al siguiente punto: marca por donde va la traza
      const q = c.pts[c.idx];
      c.ring.position.set(q[0], 0.04, q[1]);
      c.crystal.rotation.y += dt * 0.8;
    });
    this.cracks.forEach((c) => { if (c.sealed) c.crystal.rotation.y += dt * 0.8; });
  }

  dispose() {
    this.unbind?.();
    this.game.scene.remove(this.group);
    const shared = new Set([this.hotMat, this.coolMat, this.decoyMat, this.rockMat]);
    this.group.traverse((o) => {
      if (o.isInstancedMesh) { o.dispose(); return; }
      if (!o.isMesh) return;
      if (o.geometry !== this.segGeo && o.geometry !== this.ringGeo) o.geometry.dispose();
      if (!shared.has(o.material)) o.material.dispose();
    });
    this.ringGeo.dispose();
    this.segGeo.dispose();
    shared.forEach((m) => m.dispose());
    this.cracks.length = 0;
  }
}
