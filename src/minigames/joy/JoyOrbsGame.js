// VALLE DE LA LUZ · Isla de la Alegria
// Verbo: SALTAR Y RECOGER · Tercera persona
//
// Zona abierta y colorida con plataformas flotantes. Los orbes de luz se
// recogen corriendo y saltando (no hay boton: se tocan). Cada orbe anade
// color, particulas, una capa de musica y vegetacion nueva al valle.
// Combo: encadenar recogidas sin tocar el suelo.
// La alegria no hay que "bajarla": aqui se expande.

import * as THREE from 'three';
import { MinigameBase } from '../../engine/MinigameBase.js';
import {
  createGround, createSky, createLights, GEO, scatterInstanced, makeAvatar, animateAvatar,
  makeSun, makeClouds, makeMountains, colorGroundByHeight, makeOutline
} from '../../engine/worldkit.js';
import { addReward, completeActivity, recordReevaluation } from '../../data/gameState.js';

// Plataformas: [x, y, z, ancho, fondo]
const PLATFORMS = [
  [0, 1.6, -6, 5, 5],
  [-7, 3.1, -11, 4, 4],
  [6, 3.6, -12, 4, 4],
  [0, 5.2, -17, 5, 5],
  [-10, 4.4, -19, 3.6, 3.6],
  [10, 5.0, -20, 3.6, 3.6],
  [0, 7.0, -24, 6, 6],
  [-6, 2.4, 4, 4, 4],
  [7, 2.8, 6, 4, 4],
  [0, 4.2, 10, 5, 5]
];

// Orbes: sobre plataformas y en el aire, para premiar el salto encadenado
const ORBS = [
  [0, 3.0, -6], [-7, 4.6, -11], [6, 5.1, -12], [0, 6.8, -17],
  [-10, 5.9, -19], [10, 6.5, -20], [0, 8.6, -24], [-6, 3.9, 4],
  [7, 4.3, 6], [0, 5.8, 10], [3, 4.4, -9], [-3.5, 4.9, -14]
];

const LAYERS = ['pad', 'chime', 'water', 'wind'];

export class JoyOrbsGame extends MinigameBase {
  constructor(opts) {
    super({ ...opts, mode: 'third' });
    this.orbs = [];
    this.platforms = [];
    this.collected = 0;
    this.combo = 0;
    this.bestCombo = 0;
    this.time = 0;
    this.layers = new Map();
  }

  /* ============================================================ escenario */

  build() {
    const scene = this.scene;
    scene.fog = new THREE.FogExp2('#bfe3f5', 0.014);
    // la esfera del cielo cabe dentro del plano lejano de la camara (220) aunque
    // el jugador se aleje del centro: si no, se abre un agujero negro al fondo
    this.sky = createSky({ top: '#4aa3d8', bottom: '#cfeaf5', size: 150 });
    scene.add(this.sky);
    // sol, nubes y colinas azuladas al fondo
    scene.add(makeSun({ size: 40, position: [62, 50, -128] }));
    this.clouds = makeClouds({ count: 8, radius: 90, height: 24, scale: 1.4 });
    scene.add(this.clouds);
    scene.add(makeMountains({ count: 18, radius: 62, spread: 12, color: '#6fa3a8', height: 14, base: -3 }));

    this.ground = createGround({
      size: 110,
      segments: 56,
      color: '#7fc06a',
      amplitude: 0.8,
      scale: 0.05
    });
    // prado con dos verdes: mas oscuro en las hondonadas, mas claro en las lomas
    colorGroundByHeight(this.ground, { low: '#6cae5c', high: '#93d374', speckle: '#b5e08a', amount: 0.35 });
    // el prado empieza algo apagado y se ilumina con cada orbe (multiplica los colores por vertice)
    this.ground.material.color.set('#d8e0d2');
    scene.add(this.ground);
    // hierba baja, siempre presente
    scene.add(scatterInstanced(GEO.grass(), new THREE.MeshStandardMaterial({ color: '#7cc466', roughness: 1, flatShading: true }), 320, (i) => {
      const a = i * 2.399 + 0.7;
      const r = 3 + (i % 60) * 0.5;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r - 4;
      return { x, y: this.ground.userData.heightAt(x, z) + 0.22, z, ry: i, scale: 0.7 + (i % 3) * 0.3 };
    }));

    this.controller.bounds = { minX: -30, maxX: 30, minZ: -34, maxZ: 30 };
    this.controller.setPosition(0, 2, 14);
    this.controller.cfg.walkSpeed = 5.2;
    this.controller.cfg.runSpeed = 8.6;
    this.controller.cfg.jumpSpeed = 7.6;
    this.controller.cfg.gravity = -17;

    this.lights = createLights({
      sunColor: '#fff2d0',
      sunIntensity: 1.9,
      hemiSky: '#a8dcff',
      hemiGround: '#5f8a4a',
      hemiIntensity: 1.05,
      area: 42
    });
    scene.add(this.lights);
    this.sun = this.lights.userData.sun;

    this.avatar = makeAvatar({ color: '#f5b942', accent: '#fffaf0', emoji: this.player?.avatar ?? '🧒' });
    scene.add(this.avatar);
    this.controller.avatar = this.avatar;

    this.buildPlatforms();
    this.buildOrbs();
    this.buildScenery();

    // el suelo tiene en cuenta las plataformas (plataformas de un solo sentido)
    this.controller.groundHeightAt = (x, z) => this.groundWithPlatforms(x, z);

    this.setObjective(ORBS.length, '●');
    this.comboBar = this.addBar('combo', { icon: '✨', color: '#ffd166', value: 0 });
    this.comboBar.show(false);
  }

  buildPlatforms() {
    const mat = new THREE.MeshStandardMaterial({ color: '#ffd9a0', roughness: 0.8, flatShading: true });
    const grassMat = new THREE.MeshStandardMaterial({ color: '#8fd473', roughness: 0.9, flatShading: true });
    const edgeMat = new THREE.MeshStandardMaterial({ color: '#c98a56', roughness: 0.9, flatShading: true });
    const tuftGeo = GEO.grass();

    PLATFORMS.forEach(([x, y, z, w, d], pi) => {
      const group = new THREE.Group();
      const top = new THREE.Mesh(new THREE.BoxGeometry(w, 0.4, d), mat);
      top.receiveShadow = true;
      top.castShadow = true;
      top.add(makeOutline(top.geometry, { color: '#7a4a22', opacity: 0.35 }));
      group.add(top);
      // tapa de hierba y unos penachos en las esquinas
      const lawn = new THREE.Mesh(new THREE.BoxGeometry(w * 0.92, 0.1, d * 0.92), grassMat);
      lawn.position.y = 0.24;
      group.add(lawn);
      for (let k = 0; k < 4; k += 1) {
        const tuft = new THREE.Mesh(tuftGeo, grassMat);
        tuft.position.set((k % 2 ? 1 : -1) * (w / 2 - 0.5), 0.5, (k < 2 ? 1 : -1) * (d / 2 - 0.5));
        tuft.rotation.y = k + pi;
        group.add(tuft);
      }
      const skirt = new THREE.Mesh(new THREE.BoxGeometry(w * 0.82, 0.7, d * 0.82), edgeMat);
      skirt.position.y = -0.5;
      skirt.add(makeOutline(skirt.geometry, { color: '#7a4a22', opacity: 0.3 }));
      group.add(skirt);
      group.position.set(x, y, z);
      this.scene.add(group);

      this.platforms.push({
        minX: x - w / 2, maxX: x + w / 2,
        minZ: z - d / 2, maxZ: z + d / 2,
        top: y + 0.2,
        group,
        baseY: y,
        phase: x * 0.3 + z * 0.2
      });
    });
  }

  buildOrbs() {
    const geo = GEO.orb();
    ORBS.forEach((p, i) => {
      const mat = new THREE.MeshStandardMaterial({
        color: '#fff3c4', emissive: '#ffd166', emissiveIntensity: 2, roughness: 0.25, flatShading: true
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(p[0], p[1], p[2]);
      // halo que gira y haz vertical: se ven desde lejos
      const halo = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.72, 24), new THREE.MeshBasicMaterial({ color: '#ffe9a8', transparent: true, opacity: 0.55, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
      halo.rotation.x = Math.PI / 2;
      mesh.add(halo);
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.3, 3.2, 8, 1, true), new THREE.MeshBasicMaterial({ color: '#ffe9a8', transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
      beam.position.y = 1.6;
      mesh.add(beam);
      this.scene.add(mesh);
      const light = new THREE.PointLight('#ffd166', 1.1, 7, 2);
      light.position.copy(mesh.position);
      this.scene.add(light);
      this.orbs.push({
        mesh, light, halo, index: i, taken: false,
        base: new THREE.Vector3(p[0], p[1], p[2])
      });
    });
  }

  /** Vegetacion que aparece a medida que se recogen orbes */
  buildScenery() {
    const spots = [];
    for (let i = 0; i < 260; i += 1) {
      const a = i * 2.399;
      const r = 6 + (i % 50) * 0.52;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r - 4;
      spots.push({ x, z, y: this.ground.userData.heightAt(x, z) });
    }
    this.sceneSpots = spots;

    const flowerMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.85, flatShading: true });
    const treeMat = new THREE.MeshStandardMaterial({ color: '#5fbb6a', roughness: 0.9, flatShading: true });
    const trunkMat = new THREE.MeshStandardMaterial({ color: '#6b4a2f', roughness: 1, flatShading: true });
    this.flowers = scatterInstanced(GEO.crystal(), flowerMat, 140, (i) => ({
      x: spots[i].x, y: spots[i].y + 0.3, z: spots[i].z, ry: i, scale: 0
    }));
    // cuatro colores de flor
    const petals = [new THREE.Color('#ff7eb6'), new THREE.Color('#ffd166'), new THREE.Color('#c9a8ff'), new THREE.Color('#ffffff')];
    for (let i = 0; i < 140; i += 1) this.flowers.setColorAt(i, petals[i % 4]);
    if (this.flowers.instanceColor) this.flowers.instanceColor.needsUpdate = true;
    const treeSpot = (i) => spots[(i * 3 + 11) % spots.length];
    this.trees = scatterInstanced(GEO.coneTree(), treeMat, 70, (i) => {
      const s = treeSpot(i);
      return { x: s.x, y: s.y + 1.1, z: s.z, ry: i * 1.3, scale: 0 };
    });
    this.trunks = scatterInstanced(GEO.trunk(), trunkMat, 70, (i) => {
      const s = treeSpot(i);
      return { x: s.x, y: s.y + 0.4, z: s.z, ry: i * 1.3, scale: 0 };
    });
    this.scene.add(this.flowers, this.trees, this.trunks);
    this.sceneryRefs = [
      { mesh: this.flowers, get: (i) => spots[i], yOff: 0.3, max: 0.6 },
      { mesh: this.trees, get: (i) => treeSpot(i), yOff: 1.1, max: 1.4, key: 'gt' },
      { mesh: this.trunks, get: (i) => treeSpot(i), yOff: 0.4, max: 1.4, key: 'gk' }
    ];
    this.growing = [];
    this.grown = 0;
  }

  groundWithPlatforms(x, z) {
    let h = this.ground.userData.heightAt(x, z);
    const py = this.controller.position.y;
    for (let i = 0; i < this.platforms.length; i += 1) {
      const p = this.platforms[i];
      if (x < p.minX || x > p.maxX || z < p.minZ || z > p.maxZ) continue;
      // plataforma de un solo sentido: solo sostiene si vienes desde arriba
      if (py >= p.top - 0.45 && p.top > h) h = p.top;
    }
    return h;
  }

  async onStart() {
    await this.showIntro({
      eyebrow: 'Valle de la Luz',
      goal: 'Recoge los 12 orbes de luz',
      hint: 'No hay que pulsar nada: se recogen al tocarlos. Si encadenas varios sin tocar el suelo, suman combo.',
      keys: [['W A S D', 'moverte'], ['Espacio', 'saltar'], ['Shift', 'correr'], ['Ratón', 'girar la cámara']],
      touch: [['Joystick', 'moverte'], ['⤒', 'saltar'], ['Arrastra', 'girar la cámara']]
    });
    this.ambient = this.audio.ambient('wind', { volume: 0.18, rate: 1.2 });
    this.say('RECOGE LOS ORBES', 2400);
  }

  /* =============================================================== recoger */

  collectOrb(orb) {
    orb.taken = true;
    orb.mesh.visible = false;
    orb.light.visible = false;
    this.collected += 1;

    // combo: solo cuenta si el jugador esta en el aire
    if (!this.controller.onGround) {
      this.combo += 1;
      this.bestCombo = Math.max(this.bestCombo, this.combo);
      this.comboBar.show(true);
      this.comboBar.set(Math.min(1, this.combo / 5));
      if (this.combo > 1) this.say(`COMBO x${this.combo}`, 1200);
    }

    const pitch = 1 + Math.min(this.combo, 6) * 0.09;
    this.audio.play('collect', { volume: 0.55, rate: pitch });
    this.feedback.burst(orb.mesh.position, {
      count: 18 + this.combo * 3, color: '#ffe9a8', speed: 3.4, life: 1.1, gravity: -1.5
    });
    this.feedback.flash(orb.mesh.position, { color: '#ffe9a8', intensity: 3, duration: 0.6, distance: 10 });

    // el valle crece con cada orbe
    this.growScenery();
    this.brighten();

    // capa de musica cada 3 orbes
    if (this.collected % 3 === 0) this.addLayer(LAYERS[(this.collected / 3 - 1) % LAYERS.length]);

    completeActivity(`joy-orbe-${orb.index + 1}`, 4);
    const all = this.advanceObjective();
    if (all) this.later(() => this.celebrate(), 900);
  }

  growScenery() {
    // cada orbe hace brotar un tramo del valle
    const perOrb = Math.ceil((this.flowers.count + this.trees.count) / ORBS.length);
    let added = 0;
    for (const ref of this.sceneryRefs) {
      for (let i = 0; i < ref.mesh.count && added < perOrb; i += 1) {
        const key = ref.key ?? `g${ref.yOff}`;
        const s = ref.get(i);
        if (!s || s[key]) continue;
        s[key] = true;
        const d = Math.hypot(s.x - this.controller.position.x, s.z - this.controller.position.z);
        this.growing.push({
          ref, index: i, t: -Math.min(0.8, d * 0.02), to: ref.max * (0.7 + Math.random() * 0.5),
          x: s.x, y: s.y + ref.yOff, z: s.z, ry: i * 1.3
        });
        added += 1;
      }
    }
  }

  brighten() {
    const p = this.collected / ORBS.length;
    this.feedback.tweenValue(this.sun, 'intensity', 1.9 + p * 0.8, 1.5);
    this.feedback.tweenValue(this.scene.fog, 'density', 0.014 - p * 0.007, 1.5);
    this.sky.userData.setColors(
      p > 0.66 ? '#37b6e8' : p > 0.33 ? '#41ace0' : '#4aa3d8',
      p > 0.66 ? '#fff2c4' : p > 0.33 ? '#e2efdc' : '#cfeaf5'
    );
    this.feedback.tweenColor(this.ground.material.color, p > 0.5 ? '#ffffff' : '#ecf2e6', 2);
  }

  addLayer(name) {
    if (!name || this.layers.has(name)) return;
    const node = this.audio.ambient(name, { volume: 0 });
    node.setVolume(0.26, 1.2);
    this.layers.set(name, node);
  }

  celebrate() {
    this.say('EL VALLE BRILLA', 2600);
    this.audio.play('success', { volume: 0.6 });
    this.feedback.burst(this.controller.position.clone().add(new THREE.Vector3(0, 2, 0)), {
      count: 46, color: '#ffe9a8', speed: 5.5, life: 2.2, gravity: -1
    });
    this.later(() => {
      const p = new THREE.Vector3(0, this.ground.userData.heightAt(0, 18), 18);
      this.openPortal(p, { color: '#ffd166', label: 'Seguir camino' });
      this.say('CRUZA EL PORTAL', 2000);
    }, 1800);
  }

  /* =============================================================== update */

  onUpdate(dt) {
    this.time += dt;
    animateAvatar(this.avatar, this.time);

    // el combo se rompe al tocar el suelo (sin castigo: solo deja de sumar)
    if (this.controller.onGround && this.combo > 0) {
      this.combo = 0;
      this.comboBar.set(0);
      this.comboBar.show(false);
    }

    this.clouds.userData.update(dt);
    // polen que flota cerca del jugador
    if (Math.random() < 0.25) this.feedback.drizzle({ x: this.controller.position.x, y: this.controller.position.y + 1.5, z: this.controller.position.z }, 4, { color: '#fff3c4', life: 2.4, speed: 0.3, gravity: 0.15, size: 0.5 });

    // orbes: flotan, giran y se recogen por contacto
    const p = this.controller.position;
    for (let i = 0; i < this.orbs.length; i += 1) {
      const orb = this.orbs[i];
      if (orb.taken) continue;
      orb.mesh.rotation.y += dt * 1.6;
      orb.halo.rotation.z += dt * 0.9;
      orb.halo.material.opacity = 0.4 + Math.sin(this.time * 3 + i) * 0.15;
      orb.mesh.position.y = orb.base.y + Math.sin(this.time * 2 + i) * 0.22;
      orb.light.position.y = orb.mesh.position.y;
      const dx = orb.mesh.position.x - p.x;
      const dy = orb.mesh.position.y - (p.y + 1.1);
      const dz = orb.mesh.position.z - p.z;
      if (dx * dx + dy * dy + dz * dz < 1.9) this.collectOrb(orb);
    }

    // plataformas con un balanceo muy leve
    for (let i = 0; i < this.platforms.length; i += 1) {
      const pl = this.platforms[i];
      pl.group.position.y = pl.baseY + Math.sin(this.time * 0.8 + pl.phase) * 0.12;
    }

    // brote de la vegetacion
    if (this.growing.length) {
      const m = new THREE.Matrix4();
      const q = new THREE.Quaternion();
      const pos = new THREE.Vector3();
      const scl = new THREE.Vector3();
      const axis = new THREE.Vector3(0, 1, 0);
      const touched = new Set();
      for (let i = this.growing.length - 1; i >= 0; i -= 1) {
        const g = this.growing[i];
        g.t += dt * 1.2;
        if (g.t < 0) continue;
        const k = Math.min(1, g.t);
        const s = g.to * (1 - Math.pow(1 - k, 3)) * (1 + Math.sin(k * Math.PI) * 0.3);
        pos.set(g.x, g.y, g.z);
        q.setFromAxisAngle(axis, g.ry);
        scl.set(s, s, s);
        m.compose(pos, q, scl);
        g.ref.mesh.setMatrixAt(g.index, m);
        touched.add(g.ref.mesh);
        if (k >= 1) this.growing.splice(i, 1);
      }
      touched.forEach((mesh) => { mesh.instanceMatrix.needsUpdate = true; });
    }

    if (this.portalRing) this.portalRing.rotation.z += dt * 0.6;
  }

  onReset() {
    this.collected = 0;
    this.combo = 0;
    this.growing.length = 0;
    this.orbs.forEach((o) => {
      o.taken = false;
      o.mesh.visible = true;
      o.light.visible = true;
    });
    const m = new THREE.Matrix4();
    this.sceneryRefs.forEach((ref) => {
      for (let i = 0; i < ref.mesh.count; i += 1) {
        const s = ref.get(i);
        if (s) delete s[ref.key ?? `g${ref.yOff}`];
        m.makeScale(0, 0, 0);
        ref.mesh.setMatrixAt(i, m);
      }
      ref.mesh.instanceMatrix.needsUpdate = true;
    });
    this.sky.userData.setColors('#4aa3d8', '#cfeaf5');
    this.scene.fog.density = 0.014;
    this.ground.material.color.set('#d8e0d2');
    this.sun.intensity = 1.9;
    this.comboBar.show(false);
    this.controller.setPosition(0, 2, 14);
    if (this.portal) {
      const item = this.interactables.items.find((i) => i.object === this.portal);
      if (item) this.interactables.remove(item);
      this.scene.remove(this.portal);
      this.portal = null;
      this.portalRing = null;
    }
  }

  /* =============================================================== cierre */

  get completionPayload() {
    return {
      islandId: 'joy',
      success: true,
      emoAventura: true,
      badge: 'joy',
      title: 'Valle de la Luz',
      message: `Recogiste los ${ORBS.length} orbes y el valle se llenó de color.`
    };
  }

  finish() {
    if (this.finished || this.closing) return;
    this.closing = true;
    this.controller.frozen = true;
    addReward('rayo-alegria');
    addReward('rayo-energia');
    completeActivity('joy-orbes-3d', 20);
    recordReevaluation('joy', 'media', 'Expandir y canalizar la alegria', 'alta');
    this.showClosingCard({
      title: `Combo máximo: ${this.bestCombo}`,
      lines: [
        'La alegría no tuvo que bajar en ningún momento: aquí se usó para moverse, saltar y llegar más lejos.',
        'Encadenar orbes sin tocar el suelo es lo que hace la alegría cuando tiene dirección: la energía se convierte en impulso.',
        'Regular no siempre es reducir. A veces es dejar que la emoción te empuje hacia algo que quieres hacer.'
      ],
      onDone: () => super.finish()
    });
  }

  onDispose() {
    this.ambient?.stop();
    this.layers.forEach((l) => l.stop());
    this.layers.clear();
    this.orbs.length = 0;
    this.platforms.length = 0;
    this.growing.length = 0;
  }
}
