// ISLA DE LA TRISTEZA · El mundo que vuelve
// Verbo: ENCONTRAR Y RESTAURAR · Tercera persona
//
// El mundo empieza gris, vacio, con niebla densa y sin ambiente sonoro.
// Hay 6 fragmentos de recuerdo esparcidos. Cada fragmento recogido transforma
// fisicamente el escenario a su alrededor: brota vegetacion, se levanta una
// estructura caida, el cielo cambia y entra una capa de audio.
// No hay barra de progreso: el progreso ES el paisaje.

import * as THREE from 'three';
import { MinigameBase } from '../../engine/MinigameBase.js';
import {
  createGround, createSky, createLights, GEO, scatterInstanced, makeAvatar, animateAvatar
} from '../../engine/worldkit.js';
import { addReward, completeActivity, recordReevaluation } from '../../data/gameState.js';

const FRAGMENTS = [
  { x: -14, z: -10, color: '#ffd6a5', layer: 'pad', memory: 'Una tarde de lluvia' },
  { x: 12, z: -14, color: '#a5d8ff', layer: 'water', memory: 'Una voz lejana' },
  { x: 18, z: 6, color: '#c8f0c0', layer: 'wind', memory: 'Un lugar perdido' },
  { x: -18, z: 8, color: '#ffc6e0', layer: 'chime', memory: 'Una despedida' },
  { x: 4, z: 18, color: '#ffe9a8', layer: 'pad', memory: 'Algo que no salió' },
  { x: -6, z: -20, color: '#d0c4ff', layer: 'chime', memory: 'Alguien que acompañó' }
];

const GREY_SKY_TOP = '#4d565c';
const GREY_SKY_BOTTOM = '#8b9498';

export class SadnessRestoreGame extends MinigameBase {
  constructor(opts) {
    super({ ...opts, mode: 'third' });
    this.fragments = [];
    this.plants = [];          // { x, z, y, scale, target, index }
    this.ruins = [];
    this.time = 0;
    this.restored = 0;
    this.layers = new Map();
  }

  /* ============================================================ escenario */

  build() {
    const scene = this.scene;
    scene.fog = new THREE.FogExp2('#7d868a', 0.04);
    this.sky = createSky({ top: GREY_SKY_TOP, bottom: GREY_SKY_BOTTOM });
    scene.add(this.sky);

    this.ground = createGround({
      size: 100,
      segments: 58,
      color: '#767d7a',
      amplitude: 1.05,
      scale: 0.055
    });
    scene.add(this.ground);
    this.controller.groundHeightAt = (x, z) => this.ground.userData.heightAt(x, z);
    this.controller.bounds = { minX: -32, maxX: 32, minZ: -32, maxZ: 32 };
    this.controller.setPosition(0, 3, 12);
    this.controller.cfg.walkSpeed = 4.1;

    this.lights = createLights({
      sunColor: '#c8ced2',
      sunIntensity: 1.35,
      hemiSky: '#7d868c',
      hemiGround: '#3a4040',
      hemiIntensity: 0.95,
      area: 38
    });
    scene.add(this.lights);
    this.sun = this.lights.userData.sun;

    // avatar en tercera persona
    this.avatar = makeAvatar({ color: '#8a9298', accent: '#e6ecef', emoji: this.player?.avatar ?? '🧒' });
    scene.add(this.avatar);
    this.controller.avatar = this.avatar;

    this.buildPlants();
    this.buildRuins();
    this.buildFragments();

    this.setObjective(FRAGMENTS.length, '❖');
  }

  /** Vegetacion latente: existe desde el principio con escala 0 y va brotando */
  buildPlants() {
    const spots = [];
    for (let i = 0; i < 420; i += 1) {
      const a = i * 2.399;
      const r = 2 + (i % 70) * 0.44;
      const x = Math.cos(a) * r + Math.sin(i * 0.7) * 2;
      const z = Math.sin(a) * r + Math.cos(i * 1.3) * 2;
      spots.push({ x, z, y: this.ground.userData.heightAt(x, z), scale: 0, target: 0.55 + (i % 5) * 0.22, kind: i % 7 });
    }
    this.plants = spots;

    const grassMat = new THREE.MeshStandardMaterial({ color: '#63a869', roughness: 0.95, flatShading: true });
    const flowerMat = new THREE.MeshStandardMaterial({ color: '#e58fb5', roughness: 0.9, flatShading: true });
    const treeMat = new THREE.MeshStandardMaterial({ color: '#6bb073', roughness: 0.9, flatShading: true });

    this.grassMesh = scatterInstanced(GEO.grass(), grassMat, spots.length, (i) => ({
      x: spots[i].x, y: spots[i].y + 0.2, z: spots[i].z, ry: i * 1.7, scale: 0
    }));
    this.flowerMesh = scatterInstanced(GEO.crystal(), flowerMat, 90, (i) => {
      const s = spots[i * 4 % spots.length];
      return { x: s.x, y: s.y + 0.28, z: s.z, ry: i, scale: 0 };
    });
    this.treeMesh = scatterInstanced(GEO.coneTree(), treeMat, 60, (i) => {
      const s = spots[(i * 7 + 3) % spots.length];
      return { x: s.x, y: s.y + 1.1, z: s.z, ry: i * 0.9, scale: 0 };
    });
    this.scene.add(this.grassMesh, this.flowerMesh, this.treeMesh);

    // indices de cada malla, para animar el brote por zonas
    this.meshRefs = [
      { mesh: this.grassMesh, get: (i) => spots[i], yOff: 0.2, max: 1 },
      { mesh: this.flowerMesh, get: (i) => spots[i * 4 % spots.length], yOff: 0.28, max: 0.8 },
      { mesh: this.treeMesh, get: (i) => spots[(i * 7 + 3) % spots.length], yOff: 1.1, max: 1.5 }
    ];
    this.growing = [];   // { ref, index, t, from, to, x, y, z }
  }

  /** Estructuras caidas que se reconstruyen al restaurar su zona */
  buildRuins() {
    const mat = new THREE.MeshStandardMaterial({ color: '#8d9498', roughness: 0.95, flatShading: true });
    FRAGMENTS.forEach((f, i) => {
      const group = new THREE.Group();
      const pieces = [];
      const count = 4;
      for (let p = 0; p < count; p += 1) {
        const piece = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.55, 1.5), mat);
        const targetY = 0.35 + p * 0.55;
        // caido: desperdigado alrededor y girado
        piece.position.set(
          Math.cos(p * 2.1 + i) * (1.6 + p * 0.5),
          0.25,
          Math.sin(p * 2.1 + i) * (1.6 + p * 0.5)
        );
        piece.rotation.set(Math.PI / 2 * (p % 2 ? 1 : -1) * 0.6, p * 0.8, 0.4);
        piece.castShadow = true;
        piece.receiveShadow = true;
        piece.userData.target = { y: targetY, ry: p * 0.25 };
        group.add(piece);
        pieces.push(piece);
      }
      const y = this.ground.userData.heightAt(f.x, f.z);
      group.position.set(f.x, y, f.z);
      this.scene.add(group);
      this.ruins.push({ group, pieces, built: false });
    });
  }

  buildFragments() {
    FRAGMENTS.forEach((f, i) => {
      const mat = new THREE.MeshStandardMaterial({
        color: f.color, emissive: f.color, emissiveIntensity: 1.5, roughness: 0.3, flatShading: true
      });
      const shard = new THREE.Mesh(GEO.crystal(), mat);
      shard.scale.setScalar(0.7);
      const y = this.ground.userData.heightAt(f.x, f.z) + 1.6;
      shard.position.set(f.x, y, f.z);
      this.scene.add(shard);

      const light = new THREE.PointLight(f.color, 1.6, 9, 2);
      light.position.copy(shard.position);
      this.scene.add(light);

      const fragment = { ...f, index: i, mesh: shard, light, taken: false, baseY: y };
      this.fragments.push(fragment);

      fragment.interactable = this.interactable({
        object: shard,
        radius: 3,
        icon: '❖',
        label: 'Recoger',
        onInteract: () => this.takeFragment(fragment)
      });
    });
  }

  onStart() {
    // el mundo empieza en silencio: las capas entran con cada fragmento
    this.say('BUSCA LOS FRAGMENTOS', 2600);
  }

  /* =========================================================== restaurar */

  takeFragment(fragment) {
    if (fragment.taken) return;
    fragment.taken = true;
    fragment.interactable.done = true;
    this.restored += 1;

    const center = fragment.mesh.position.clone();
    this.feedback.burst(center, { count: 30, color: fragment.color, speed: 3.4, life: 1.6, gravity: -1 });
    this.feedback.flash(center, { color: fragment.color, intensity: 5, duration: 1.4, distance: 20 });
    this.audio.playAt('collect', this.avatar, { volume: 0.7, refDistance: 6 });

    // el fragmento sube y se apaga
    this.feedback.tween({
      from: 0, to: 1, duration: 1.2,
      onUpdate: (p) => {
        fragment.mesh.position.y = fragment.baseY + p * 2.4;
        fragment.mesh.scale.setScalar(0.7 * (1 - p));
        fragment.light.intensity = 1.6 * (1 - p);
      },
      onDone: () => {
        fragment.mesh.visible = false;
        fragment.light.visible = false;
      }
    });

    // 1. brota vegetacion alrededor
    this.growAround(center, 10);
    // 2. se levanta la estructura caida
    this.rebuildRuin(this.ruins[fragment.index]);
    // 3. entra una capa de audio
    this.addLayer(fragment.layer);
    // 4. el cielo y la niebla recuperan color
    this.warmWorld();

    completeActivity(`sadness-fragmento-${fragment.index + 1}`, 6);
    const all = this.advanceObjective();

    // un recuerdo, en pocas palabras (no es una leccion)
    this.say(fragment.memory.toUpperCase(), 2600);

    if (all) this.later(() => this.bloom(), 2200);
  }

  /** Hace brotar la vegetacion latente dentro de un radio */
  growAround(center, radius) {
    this.meshRefs.forEach((ref) => {
      const count = ref.mesh.count;
      for (let i = 0; i < count; i += 1) {
        const s = ref.get(i);
        if (!s || s[`grown_${ref.yOff}`]) continue;
        const d = Math.hypot(s.x - center.x, s.z - center.z);
        if (d > radius) continue;
        s[`grown_${ref.yOff}`] = true;
        this.growing.push({
          ref,
          index: i,
          t: -d * 0.045,                     // la onda se expande desde el centro
          from: 0,
          to: Math.min(ref.max, s.target),
          x: s.x,
          y: s.y + ref.yOff,
          z: s.z,
          ry: i * 1.7
        });
      }
    });
  }

  rebuildRuin(ruin) {
    if (!ruin || ruin.built) return;
    ruin.built = true;
    ruin.pieces.forEach((piece, p) => {
      const from = piece.position.clone();
      const fromRot = piece.rotation.clone();
      const target = piece.userData.target;
      this.feedback.tween({
        from: 0, to: 1, duration: 1.4 + p * 0.25,
        onUpdate: (t) => {
          piece.position.set(from.x * (1 - t), from.y + (target.y - from.y) * t, from.z * (1 - t));
          piece.rotation.set(fromRot.x * (1 - t), fromRot.y + (target.ry - fromRot.y) * t, fromRot.z * (1 - t));
        }
      });
    });
    this.later(() => {
      this.audio.playAt('interact', ruin.group, { volume: 0.5, refDistance: 8 });
      this.feedback.burst(ruin.group.position.clone().add(new THREE.Vector3(0, 1, 0)), {
        count: 12, color: '#dfe6ea', speed: 2, life: 1
      });
    }, 1400);
  }

  addLayer(name) {
    if (this.layers.has(name)) {
      this.layers.get(name).setVolume(0.34);
      return;
    }
    const volumes = { pad: 0.3, water: 0.26, wind: 0.22, chime: 0.18 };
    const node = this.audio.ambient(name, { volume: 0 });
    node.setVolume(volumes[name] ?? 0.25, 1.5);
    this.layers.set(name, node);
  }

  warmWorld() {
    const p = this.restored / FRAGMENTS.length;
    const skyTop = ['#4d565c', '#4a5b68', '#476075', '#446684', '#416c93', '#3e73a2', '#3b7ab1'][this.restored];
    const skyBottom = ['#8b9498', '#95a0a1', '#a0acaa', '#abb8b3', '#b7c4bc', '#c3d0c5', '#d2ecca'][this.restored];
    this.sky.userData.setColors(skyTop, skyBottom);
    this.feedback.tweenColor(this.scene.fog.color, skyBottom, 2.5);
    this.feedback.tweenValue(this.scene.fog, 'density', 0.04 - p * 0.03, 2.5);
    this.feedback.tweenValue(this.sun, 'intensity', 1.35 + p * 0.55, 2.5);
    this.feedback.tweenColor(this.sun.color, '#ffe9c4', 2.5);
    this.feedback.tweenValue(this.lights.userData.hemi, 'intensity', 0.95 + p * 0.35, 2.5);
    // el color vuelve de forma proporcional: nunca de golpe
    const grey = new THREE.Color('#767d7a');
    const green = new THREE.Color('#5f8f5c');
    this.feedback.tweenColor(this.ground.material.color, grey.clone().lerp(green, p), 3.5);
    const greyBody = new THREE.Color('#8a9298');
    const warmBody = new THREE.Color('#f0b25a');
    this.feedback.tweenColor(this.avatar.userData.body.material.color, greyBody.clone().lerp(warmBody, p), 3);
  }

  bloom() {
    this.say('EL MUNDO VOLVIÓ', 2800);
    this.feedback.burst(this.controller.position.clone().add(new THREE.Vector3(0, 1.5, 0)), {
      count: 40, color: '#ffe9a8', speed: 4.5, life: 2, gravity: -0.8
    });
    this.audio.play('logro', { volume: 0.6 });
    this.later(() => {
      const p = new THREE.Vector3(0, this.ground.userData.heightAt(0, -4), -4);
      this.openPortal(p, { color: '#ffe9a8', label: 'Seguir camino' });
      this.say('CRUZA EL PORTAL', 2000);
    }, 2200);
  }

  /* =============================================================== update */

  onUpdate(dt) {
    this.time += dt;
    animateAvatar(this.avatar, this.time);

    // fragmentos flotando
    for (let i = 0; i < this.fragments.length; i += 1) {
      const f = this.fragments[i];
      if (f.taken) continue;
      f.mesh.rotation.y += dt * 0.9;
      f.mesh.position.y = f.baseY + Math.sin(this.time * 1.5 + i) * 0.22;
      f.light.position.y = f.mesh.position.y;
      if (Math.random() < 0.02) {
        this.feedback.drizzle(f.mesh.position, 0.6, { color: f.color, life: 1.6, speed: 0.5, gravity: -0.3, size: 0.5 });
      }
    }

    // brote progresivo de la vegetacion
    if (this.growing.length) {
      const dummy = new THREE.Matrix4();
      const q = new THREE.Quaternion();
      const pos = new THREE.Vector3();
      const scl = new THREE.Vector3();
      const touched = new Set();
      for (let i = this.growing.length - 1; i >= 0; i -= 1) {
        const g = this.growing[i];
        g.t += dt * 0.9;
        if (g.t < 0) continue;
        const k = Math.min(1, g.t);
        const eased = k < 1 ? 1 - Math.pow(1 - k, 3) : 1;
        const s = g.to * eased * (1 + Math.sin(eased * Math.PI) * 0.25);
        pos.set(g.x, g.y, g.z);
        q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), g.ry);
        scl.set(s, s, s);
        dummy.compose(pos, q, scl);
        g.ref.mesh.setMatrixAt(g.index, dummy);
        touched.add(g.ref.mesh);
        if (k >= 1) this.growing.splice(i, 1);
      }
      touched.forEach((m) => { m.instanceMatrix.needsUpdate = true; });
    }

    if (this.portalRing) this.portalRing.rotation.z += dt * 0.6;
  }

  onReset() {
    this.restored = 0;
    this.growing.length = 0;
    this.fragments.forEach((f) => {
      f.taken = false;
      f.interactable.done = false;
      f.mesh.visible = true;
      f.mesh.scale.setScalar(0.7);
      f.mesh.position.y = f.baseY;
      f.light.visible = true;
      f.light.intensity = 1.6;
    });
    // vegetacion de vuelta a escala 0
    const m = new THREE.Matrix4();
    this.meshRefs.forEach((ref) => {
      for (let i = 0; i < ref.mesh.count; i += 1) {
        const s = ref.get(i);
        if (s) delete s[`grown_${ref.yOff}`];
        m.makeScale(0, 0, 0);
        ref.mesh.setMatrixAt(i, m);
      }
      ref.mesh.instanceMatrix.needsUpdate = true;
    });
    this.ruins.forEach((r) => {
      r.built = false;
      r.pieces.forEach((piece, p) => {
        piece.position.set(Math.cos(p * 2.1) * (1.6 + p * 0.5), 0.25, Math.sin(p * 2.1) * (1.6 + p * 0.5));
        piece.rotation.set(Math.PI / 2 * (p % 2 ? 1 : -1) * 0.6, p * 0.8, 0.4);
      });
    });
    this.sky.userData.setColors(GREY_SKY_TOP, GREY_SKY_BOTTOM);
    this.scene.fog.color.set('#7d868a');
    this.scene.fog.density = 0.04;
    this.ground.material.color.set('#767d7a');
    this.controller.setPosition(0, 3, 12);
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
      islandId: 'sadness',
      success: true,
      emoAventura: true,
      badge: 'sadness',
      title: 'Isla de la Tristeza',
      message: 'Recogiste los seis fragmentos y el mundo volvió a tener color.'
    };
  }

  finish() {
    if (this.finished || this.closing) return;
    this.closing = true;
    this.controller.frozen = true;
    addReward('cristal-recuerdo');
    completeActivity('sadness-restaurar-3d', 20);
    recordReevaluation('sadness', 'alta', 'Encontrar y restaurar', 'media');
    this.showClosingCard({
      title: 'Lo que vuelve',
      lines: [
        'La tristeza no se fue de golpe: el color volvió poco a poco, un fragmento cada vez.',
        'Cada recuerdo que recogiste hizo brotar algo. Los recuerdos que duelen también sostienen: no hay que borrarlos para estar mejor.',
        'El mundo no quedó igual que antes, y aun así volvió a estar vivo.'
      ],
      onDone: () => super.finish()
    });
  }

  onDispose() {
    this.layers.forEach((l) => l.stop());
    this.layers.clear();
    this.fragments.length = 0;
    this.plants.length = 0;
    this.ruins.length = 0;
    this.growing.length = 0;
  }
}
