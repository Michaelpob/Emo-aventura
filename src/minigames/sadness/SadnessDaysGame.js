// ISLA DE LA TRISTEZA · Un dia a la vez
// Genero: ECONOMIA POR TURNOS · camara fija, no se camina
//
// Activacion conductual: no esperar a tener ganas, hacer algo pequeno y que
// las ganas vengan despues.
//
// Tienes fichas de energia por dia. Cada accion cuesta una o dos y cambia algo
// visible de la casa. Al dormir, la energia del dia siguiente depende de lo que
// hiciste hoy: quedarse quieto no castiga (te quedas igual), pero la energia
// solo sube cuando actuas.

import * as THREE from 'three';
import { MinigameBase } from '../../engine/MinigameBase.js';
import { createGround, createSky, createLights, GEO, scatterInstanced, makeAvatar, animateAvatar } from '../../engine/worldkit.js';
import { addReward, completeActivity, recordReevaluation } from '../../data/gameState.js';

const DAYS = 4;
const START_ENERGY = 3;
const MIN_ENERGY = 3;
const MAX_ENERGY = 5;

export class SadnessDaysGame extends MinigameBase {
  constructor(opts) {
    super({ ...opts, mode: 'third' });
    this.day = 1;
    this.energy = START_ENERGY;
    this.spentToday = 0;
    this.doneActions = new Set();
    this.actions = [];
    this.time = 0;
    this.busy = false;
    this.layers = new Map();
    this.warmth = 0;          // 0..1 · cuanto ha vuelto la casa
  }

  /* ============================================================ escenario */

  build() {
    const scene = this.scene;

    // La camara no la mueve el jugador: es una escena de sobremesa
    this.controller.enabled = false;
    this.el.touch.remove();

    scene.fog = new THREE.FogExp2('#8a9296', 0.026);
    this.sky = createSky({ top: '#59636a', bottom: '#9aa4a8', size: 180 });   // dentro del plano lejano de la camara
    scene.add(this.sky);

    this.ground = createGround({
      size: 96,
      segments: 46,
      color: '#77807a',
      amplitude: 0.35,
      scale: 0.07,
      flatRadius: 12
    });
    scene.add(this.ground);

    this.lights = createLights({
      sunColor: '#c6ced2',
      sunIntensity: 1.25,
      hemiSky: '#8a969c',
      hemiGround: '#3f4744',
      hemiIntensity: 0.95,
      area: 24
    });
    scene.add(this.lights);
    this.sun = this.lights.userData.sun;

    this.buildHouse();
    this.buildGarden();
    this.buildAvatar();
    this.buildActions();
    this.placeCamera();
    this.buildPicking();
    this.buildDayHud();

    this.setObjective(DAYS, '☀');
  }

  buildHouse() {
    const house = new THREE.Group();

    const wallMat = new THREE.MeshStandardMaterial({ color: '#9aa0a2', roughness: 0.95, flatShading: true });
    const body = new THREE.Mesh(new THREE.BoxGeometry(6, 3.4, 5), wallMat);
    body.position.y = 1.7;
    body.castShadow = true;
    body.receiveShadow = true;
    house.add(body);

    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(4.9, 2.2, 4),
      new THREE.MeshStandardMaterial({ color: '#7c6a63', roughness: 1, flatShading: true })
    );
    roof.position.y = 4.5;
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    house.add(roof);

    // ventana (se abre y entra luz)
    this.windowMat = new THREE.MeshStandardMaterial({
      color: '#3f4a52', emissive: '#000000', emissiveIntensity: 0, roughness: 0.4, flatShading: true
    });
    this.windowMesh = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.4, 0.16), this.windowMat);
    this.windowMesh.position.set(-1.5, 2.1, 2.55);
    house.add(this.windowMesh);

    this.windowLight = new THREE.PointLight('#ffcf87', 0, 9, 2);
    this.windowLight.position.set(-1.5, 2.1, 3.4);
    house.add(this.windowLight);

    // puerta (se abre al final del ultimo dia)
    this.doorMat = new THREE.MeshStandardMaterial({ color: '#6d5c52', roughness: 0.9, flatShading: true });
    this.door = new THREE.Mesh(new THREE.BoxGeometry(1.3, 2.3, 0.18), this.doorMat);
    this.door.position.set(1.4, 1.15, 2.55);
    house.add(this.door);

    // chimenea (humea al cocinar)
    const chimney = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 1.4, 0.7),
      new THREE.MeshStandardMaterial({ color: '#7c6a63', roughness: 1, flatShading: true })
    );
    chimney.position.set(1.8, 5, -0.6);
    house.add(chimney);
    this.chimney = chimney;

    house.position.set(0, 0, -3);
    this.scene.add(house);
    this.house = house;
  }

  buildGarden() {
    // camino a la puerta
    const pathMat = new THREE.MeshStandardMaterial({ color: '#8b8f86', roughness: 1, flatShading: true });
    this.pathStones = [];
    for (let i = 0; i < 6; i += 1) {
      const stone = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.6, 0.12, 6), pathMat.clone());
      stone.position.set(1.4, this.ground.userData.heightAt(1.4, 1 + i * 1.5) + 0.06, 1 + i * 1.5);
      stone.receiveShadow = true;
      this.scene.add(stone);
      this.pathStones.push(stone);
    }

    // maceta con planta de tres etapas
    const pot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.5, 0.42, 0.6, 8),
      new THREE.MeshStandardMaterial({ color: '#9c6b52', roughness: 0.95, flatShading: true })
    );
    pot.position.set(-3.6, 0.3, 1.6);
    pot.castShadow = true;
    this.scene.add(pot);
    this.pot = pot;

    this.plantMat = new THREE.MeshStandardMaterial({ color: '#6f8a63', roughness: 0.9, flatShading: true });
    this.plantParts = [];
    for (let i = 0; i < 3; i += 1) {
      const leaf = new THREE.Mesh(GEO.coneTree(), this.plantMat);
      leaf.scale.setScalar(0.001);
      leaf.position.set(-3.6, 0.75 + i * 0.42, 1.6);
      this.scene.add(leaf);
      this.plantParts.push(leaf);
    }
    this.plantStage = 0;

    // banco
    const benchMat = new THREE.MeshStandardMaterial({ color: '#8a7d6d', roughness: 0.95, flatShading: true });
    const bench = new THREE.Group();
    const seat = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.18, 0.7), benchMat);
    seat.position.y = 0.55;
    bench.add(seat);
    [-0.9, 0.9].forEach((x) => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.55, 0.6), benchMat);
      leg.position.set(x, 0.28, 0);
      bench.add(leg);
    });
    bench.position.set(4.2, this.ground.userData.heightAt(4.2, 1.5), 1.5);
    bench.rotation.y = -0.4;
    this.scene.add(bench);
    this.bench = bench;

    // radio en el porche
    const radio = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 0.5, 0.4),
      new THREE.MeshStandardMaterial({ color: '#8d8577', roughness: 0.8, flatShading: true })
    );
    radio.position.set(-2.2, 0.85, 1.9);
    radio.castShadow = true;
    this.scene.add(radio);
    this.radio = radio;

    // buzon: por ahi llega la respuesta al mensaje
    const mailbox = new THREE.Group();
    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.09, 1.3, 6),
      new THREE.MeshStandardMaterial({ color: '#6d6259', roughness: 1, flatShading: true })
    );
    post.position.y = 0.65;
    mailbox.add(post);
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.45, 0.45),
      new THREE.MeshStandardMaterial({ color: '#7d8a92', roughness: 0.85, flatShading: true })
    );
    box.position.y = 1.45;
    mailbox.add(box);
    mailbox.position.set(3.4, this.ground.userData.heightAt(3.4, 6.5), 6.5);
    this.scene.add(mailbox);
    this.mailbox = mailbox;
    this.mailboxBox = box;

    // colinas lejanas: cierran el horizonte para que no se vea el borde del suelo
    const hillMat = new THREE.MeshStandardMaterial({ color: '#6b7570', roughness: 1, flatShading: true });
    const hills = scatterInstanced(new THREE.ConeGeometry(1, 1, 5), hillMat, 26, (i) => {
      const a = (i / 26) * Math.PI * 2 + (i % 3) * 0.1;
      const r = 30 + (i % 4) * 3.5;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      const s = 7 + (i % 5) * 3.2;
      return { x, y: this.ground.userData.heightAt(x, z) - 1, z, ry: a, scale: s, scaleY: s * (0.45 + (i % 3) * 0.12) };
    });
    this.scene.add(hills);
    this.hillMat = hillMat;

    // hierba apagada que revive con la calidez
    const grassMat = new THREE.MeshStandardMaterial({ color: '#6f7a6a', roughness: 1, flatShading: true });
    this.grass = scatterInstanced(GEO.grass(), grassMat, 220, (i) => {
      const a = i * 2.399;
      const r = 5 + (i % 30) * 0.55;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r + 1;
      return { x, y: this.ground.userData.heightAt(x, z) + 0.22, z, ry: a, scale: 0.55 + (i % 4) * 0.2 };
    });
    this.grassMat = grassMat;
    this.scene.add(this.grass);
  }

  buildAvatar() {
    this.avatar = makeAvatar({ color: '#8d949a', accent: '#e9eef0', emoji: this.player?.avatar ?? '🧒' });
    this.avatar.scale.setScalar(0.72);
    this.avatarPos = new THREE.Vector3(1.4, this.ground.userData.heightAt(1.4, 3), 3);
    this.avatar.position.copy(this.avatarPos);
    this.scene.add(this.avatar);
  }

  placeCamera() {
    this.camView = { yaw: 0.3, dist: 12.5, height: 7.4 };
    this.camTarget = new THREE.Vector3(0.4, 1.4, 1.2);
    this.updateCamera();

    // arrastre para girar un poco la vista, nada mas
    const dom = this.renderer.domElement;
    let drag = null;
    const down = (e) => { drag = { id: e.pointerId, x: e.clientX, moved: 0 }; };
    const move = (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      const dx = e.clientX - drag.x;
      drag.x = e.clientX;
      drag.moved += Math.abs(dx);
      this.camView.yaw = Math.max(-0.7, Math.min(0.9, this.camView.yaw + dx * 0.004));
      this.updateCamera();
    };
    const up = (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      this.dragMoved = drag.moved;
      drag = null;
    };
    dom.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    this.listeners.push(() => dom.removeEventListener('pointerdown', down));
    this.listeners.push(() => window.removeEventListener('pointermove', move));
    this.listeners.push(() => window.removeEventListener('pointerup', up));
  }

  updateCamera() {
    const { yaw, dist, height } = this.camView;
    this.camera.position.set(
      this.camTarget.x + Math.sin(yaw) * dist,
      this.camTarget.y + height,
      this.camTarget.z + Math.cos(yaw) * dist
    );
    this.camera.lookAt(this.camTarget);
  }

  async onStart() {
    await this.showIntro({
      eyebrow: 'Un día a la vez',
      goal: 'Haz que la casa vuelva a estar viva',
      hint: 'Cada día tienes fichas de energía. Toca las cosas y el personaje irá solo. Al dormir, la energía de mañana depende de lo que hayas hecho hoy: quedarte quieto no te quita nada, pero solo sube si haces algo.',
      keys: [['Clic', 'hacer algo'], ['Arrastra', 'girar la vista'], ['Dormir', 'pasar de día']],
      touch: [['Toca', 'hacer algo'], ['Arrastra', 'girar la vista'], ['Dormir', 'pasar de día']]
    });
    this.say('CUATRO DÍAS POR DELANTE', 2400);
  }

  /* ============================================================== acciones */

  buildActions() {
    const A = (id, object, label, cost, spot, run) => ({ id, object, label, cost, spot, run, done: false, repeat: 0 });

    this.actions = [
      A('ventana', this.windowMesh, 'Abrir la ventana', 1, new THREE.Vector3(-1.5, 0, 0.6), () => this.openWindow()),
      A('planta', this.pot, 'Regar la planta', 1, new THREE.Vector3(-3.6, 0, 2.8), () => this.waterPlant()),
      A('radio', this.radio, 'Poner música', 1, new THREE.Vector3(-2.2, 0, 3), () => this.playRadio()),
      A('banco', this.bench, 'Sentarse al sol', 1, new THREE.Vector3(4.2, 0, 2.8), () => this.sitOnBench()),
      A('mensaje', this.mailboxBox, 'Escribir a alguien', 2, new THREE.Vector3(3.4, 0, 5.4), () => this.writeMessage()),
      A('cocina', this.chimney, 'Cocinar algo', 2, new THREE.Vector3(1.4, 0, 1.6), () => this.cook()),
      A('paseo', this.pathStones[5], 'Salir a caminar', 2, new THREE.Vector3(1.4, 0, 8.5), () => this.walkOutside())
    ];

    this.actions.forEach((a) => {
      a.object.userData.action = a;
      a.baseEmissive = a.object.material?.emissive?.clone?.() ?? null;
    });
  }

  /** Cada accion cambia algo que se ve; ninguna da puntos por si sola */
  openWindow() {
    this.windowMat.color.set('#cfe4ef');
    this.feedback.tweenValue(this.windowMat, 'emissiveIntensity', 1.2, 1.4);
    this.windowMat.emissive.set('#ffcf87');
    this.feedback.tweenValue(this.windowLight, 'intensity', 2.6, 1.4);
    this.audio.play('light', { volume: 0.4 });
    return 'ENTRA LUZ';
  }

  waterPlant() {
    const leaf = this.plantParts[this.plantStage];
    if (leaf) {
      const target = 0.5 - this.plantStage * 0.09;
      this.feedback.tween({
        from: 0.001, to: target, duration: 1.1,
        onUpdate: (v) => leaf.scale.setScalar(v)
      });
      this.plantStage += 1;
    }
    this.feedback.burst(this.pot.position.clone().add(new THREE.Vector3(0, 0.8, 0)), {
      count: 10, color: '#a8d8ff', speed: 1.6, life: 0.9
    });
    this.audio.play('water', { volume: 0.35 });
    return this.plantStage >= 3 ? 'YA TIENE FLOR' : 'CRECE UN POCO';
  }

  playRadio() {
    this.addLayer('pad');
    this.feedback.burst(this.radio.position.clone().add(new THREE.Vector3(0, 0.5, 0)), {
      count: 14, color: '#ffd166', speed: 1.8, life: 1.3, gravity: -0.6
    });
    this.audio.play('chime', { volume: 0.45 });
    return 'SUENA MÚSICA';
  }

  sitOnBench() {
    this.avatar.userData.sitting = 3;
    this.feedback.flash(this.bench.position, { color: '#ffe9a8', intensity: 2.4, duration: 1.4, distance: 9 });
    this.audio.play('interact', { volume: 0.35 });
    return 'DA EL SOL';
  }

  writeMessage() {
    this.pendingReply = true;
    this.feedback.burst(this.mailbox.position.clone().add(new THREE.Vector3(0, 1.6, 0)), {
      count: 12, color: '#ffffff', speed: 2, life: 1.2
    });
    this.audio.play('interact', { volume: 0.4 });
    return 'MENSAJE ENVIADO';
  }

  cook() {
    this.cooking = true;
    this.addLayer('water');
    this.audio.play('light', { volume: 0.3, rate: 0.8 });
    return 'HUELE BIEN';
  }

  walkOutside() {
    this.pathStones.forEach((stone, i) => {
      this.later(() => {
        this.feedback.tweenColor(stone.material.color, '#c8b98f', 0.8);
        this.feedback.burst(stone.position.clone().add(new THREE.Vector3(0, 0.3, 0)), {
          count: 4, color: '#ffe9a8', speed: 1, life: 0.6
        });
      }, i * 130);
    });
    this.addLayer('wind');
    return 'AIRE FRESCO';
  }

  addLayer(name) {
    if (this.layers.has(name)) return;
    const node = this.audio.ambient(name, { volume: 0 });
    node.setVolume(0.24, 1.4);
    this.layers.set(name, node);
  }

  /* =============================================================== picking */

  buildPicking() {
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.hovered = null;

    this.tooltip = document.createElement('div');
    this.tooltip.className = 'i3d-pick';
    this.tooltip.hidden = true;
    this.el.hud.appendChild(this.tooltip);

    const dom = this.renderer.domElement;
    const toNdc = (e) => {
      const r = dom.getBoundingClientRect();
      this.pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    };

    const hover = (e) => {
      toNdc(e);
      const hit = this.pickAction();
      if (hit !== this.hovered) {
        if (this.hovered) this.setHighlight(this.hovered, false);
        this.hovered = hit;
        if (hit) this.setHighlight(hit, true);
      }
      if (hit) {
        const affordable = this.energy >= hit.cost && !this.busy;
        this.tooltip.hidden = false;
        this.tooltip.dataset.off = affordable ? 'false' : 'true';
        this.tooltip.innerHTML = `${hit.label} <b>${'●'.repeat(hit.cost)}</b>`;
        this.tooltip.style.left = `${e.clientX}px`;
        this.tooltip.style.top = `${e.clientY - 42}px`;
        dom.style.cursor = affordable ? 'pointer' : 'not-allowed';
      } else {
        this.tooltip.hidden = true;
        dom.style.cursor = 'default';
      }
    };

    const click = (e) => {
      if (this.dragMoved > 6) { this.dragMoved = 0; return; }
      toNdc(e);
      const hit = this.pickAction();
      if (hit) this.doAction(hit);
    };

    dom.addEventListener('pointermove', hover);
    dom.addEventListener('click', click);
    this.listeners.push(() => dom.removeEventListener('pointermove', hover));
    this.listeners.push(() => dom.removeEventListener('click', click));
  }

  pickAction() {
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const objects = this.actions.filter((a) => this.isAvailable(a)).map((a) => a.object);
    if (this.doorOpen) objects.push(this.door);
    const hits = this.raycaster.intersectObjects(objects, true);
    if (!hits.length) return null;
    let obj = hits[0].object;
    while (obj && !obj.userData.action && obj !== this.door) obj = obj.parent;
    if (obj === this.door) return { id: '__salir', object: this.door, label: 'Salir', cost: 0, run: () => this.finish() };
    return obj?.userData.action ?? null;
  }

  isAvailable(a) {
    if (a.id === 'planta') return this.plantStage < 3;
    return !a.done;
  }

  setHighlight(action, on) {
    const mat = action.object.material;
    if (!mat || !mat.emissive) return;
    if (on) {
      mat.emissive.set('#ffd166');
      mat.emissiveIntensity = 0.5;
    } else if (action.baseEmissive) {
      mat.emissive.copy(action.baseEmissive);
      mat.emissiveIntensity = action.id === 'ventana' && this.actions[0].done ? 1.2 : 0;
    }
  }

  /* ================================================================= turno */

  async doAction(action) {
    if (this.busy) return;
    if (action.id === '__salir') { action.run(); return; }
    if (this.energy < action.cost) {
      this.say('NO QUEDA ENERGÍA HOY', 1600);
      this.audio.play('soften', { volume: 0.3 });
      return;
    }
    this.busy = true;
    this.tooltip.hidden = true;
    if (this.hovered) { this.setHighlight(this.hovered, false); this.hovered = null; }

    // el personaje va hasta el sitio: la accion se ve, no se pulsa y ya
    await this.moveAvatar(action.spot);
    this.avatar.userData.state = 'interact';

    this.energy -= action.cost;
    this.spentToday += action.cost;
    action.done = true;
    action.repeat += 1;
    this.doneActions.add(action.id + (action.id === 'planta' ? this.plantStage : ''));

    const titular = action.run();
    this.warmth = Math.min(1, this.warmth + action.cost * 0.09);
    this.applyWarmth();
    this.renderEnergy();
    if (titular) this.say(titular, 1800);
    completeActivity(`sadness-dia-${this.day}-${action.id}`, 3);

    await this.wait(0.7);
    this.avatar.userData.state = 'idle';
    this.busy = false;

    if (this.energy <= 0) this.say('SE ACABÓ EL DÍA · DUERME', 2200);
  }

  moveAvatar(spot) {
    return new Promise((resolve) => {
      const from = this.avatar.position.clone();
      const to = new THREE.Vector3(spot.x, this.ground.userData.heightAt(spot.x, spot.z), spot.z);
      const dist = from.distanceTo(to);
      if (dist < 0.2) { resolve(); return; }
      const dur = Math.min(1.6, 0.35 + dist * 0.13);
      this.avatar.userData.state = 'walk';
      const angle = Math.atan2(to.x - from.x, to.z - from.z);
      this.avatar.rotation.y = angle;
      this.feedback.tween({
        from: 0, to: 1, duration: dur,
        onUpdate: (t) => {
          this.avatar.position.lerpVectors(from, to, t);
          this.avatar.position.y = this.ground.userData.heightAt(this.avatar.position.x, this.avatar.position.z);
        },
        onDone: () => { this.avatar.userData.state = 'idle'; resolve(); }
      });
    });
  }

  /** Espera medida en frames, no en setTimeout: sigue siendo exacta aunque el
   *  navegador frene los temporizadores (y permite probar el juego paso a paso). */
  wait(seconds) {
    return new Promise((resolve) => {
      this.feedback.tween({ from: 0, to: 1, duration: seconds, onUpdate: () => {}, onDone: resolve });
    });
  }

  /** La calidez acumulada tine todo el escenario */
  applyWarmth() {
    const w = this.warmth;
    this.sky.userData.setColors(
      w > 0.66 ? '#3f6f96' : w > 0.33 ? '#4c6a80' : '#59636a',
      w > 0.66 ? '#ffd9a8' : w > 0.33 ? '#c3c3ae' : '#9aa4a8'
    );
    this.feedback.tweenColor(this.scene.fog.color, w > 0.5 ? '#c8c3ac' : '#8a9296', 2);
    this.feedback.tweenValue(this.scene.fog, 'density', 0.026 - w * 0.016, 2);
    this.feedback.tweenValue(this.sun, 'intensity', 1.25 + w * 0.9, 2);
    this.feedback.tweenColor(this.sun.color, '#ffe6c0', 2.5);
    const grey = new THREE.Color('#6f7a6a');
    const green = new THREE.Color('#79b06d');
    this.feedback.tweenColor(this.grassMat.color, grey.clone().lerp(green, w), 2.5);
    const hillGrey = new THREE.Color('#6b7570');
    const hillGreen = new THREE.Color('#7e9c78');
    this.feedback.tweenColor(this.hillMat.color, hillGrey.clone().lerp(hillGreen, w), 2.5);
    const bodyGrey = new THREE.Color('#8d949a');
    const bodyWarm = new THREE.Color('#efb45f');
    this.feedback.tweenColor(this.avatar.userData.body.material.color, bodyGrey.clone().lerp(bodyWarm, w), 2.5);
  }

  /* ============================================================ HUD del dia */

  buildDayHud() {
    this.dayBox = document.createElement('div');
    this.dayBox.className = 'i3d-day';
    this.dayBox.innerHTML = `
      <p class="i3d-day__label">Día <b data-day>1</b> de ${DAYS}</p>
      <p class="i3d-day__energy" data-energy></p>
      <button class="i3d-btn i3d-btn--primary i3d-day__sleep" type="button" data-sleep>Dormir</button>
    `;
    this.el.hud.appendChild(this.dayBox);
    this.dayBox.querySelector('[data-sleep]').addEventListener('click', () => this.sleep());
    this.renderEnergy();
  }

  renderEnergy() {
    this.dayBox.querySelector('[data-day]').textContent = String(this.day);
    const pips = '●'.repeat(this.energy) + '○'.repeat(Math.max(0, this.maxToday - this.energy));
    this.dayBox.querySelector('[data-energy]').innerHTML = `Energía <b>${pips}</b>`;
  }

  get maxToday() {
    return this._maxToday ?? START_ENERGY;
  }

  /* ================================================================ dormir */

  async sleep() {
    if (this.busy) return;
    this.busy = true;
    this.tooltip.hidden = true;

    // el dia se cierra: atardecer, noche y amanecer
    await this.nightFall();

    // lo que hiciste hoy decide la energia de manana; no hacer nada no castiga
    const next = Math.max(MIN_ENERGY, Math.min(MAX_ENERGY, 2 + this.spentToday));
    const subio = next > this.maxToday;
    this.day += 1;
    this.energy = next;
    this._maxToday = next;
    this.spentToday = 0;
    this.advanceObjective();

    if (this.pendingReply) {
      this.pendingReply = false;
      this.deliverReply();
    }

    this.renderEnergy();
    this.busy = false;

    if (this.day > DAYS) {
      this.endOfWeek();
      return;
    }
    this.say(subio ? `DÍA ${this.day} · MÁS ENERGÍA` : `DÍA ${this.day}`, 2200);
  }

  async nightFall() {
    const veil = document.createElement('div');
    veil.className = 'i3d-night';
    this.el.overlay.appendChild(veil);
    this.audio.play('breathOut', { volume: 0.3 });
    await this.wait(0.9);
    // el personaje vuelve a la puerta mientras duerme
    this.avatar.position.set(1.4, this.ground.userData.heightAt(1.4, 3), 3);
    this.avatar.rotation.y = 0;
    veil.classList.add('is-out');
    await this.wait(0.7);
    veil.remove();
  }

  /** La respuesta al mensaje llega al dia siguiente: las acciones tienen eco */
  deliverReply() {
    const flag = new THREE.Mesh(
      new THREE.BoxGeometry(0.34, 0.5, 0.06),
      new THREE.MeshStandardMaterial({ color: '#e8746a', emissive: '#e8746a', emissiveIntensity: 0.5, flatShading: true })
    );
    flag.position.set(3.75, 1.7, 6.5);
    this.scene.add(flag);
    this.replyFlag = flag;
    this.feedback.burst(flag.position.clone(), { count: 16, color: '#ffd166', speed: 2.2, life: 1.2 });
    this.audio.play('collect', { volume: 0.5 });
    this.say('ALGUIEN TE CONTESTÓ', 2400);
    this.warmth = Math.min(1, this.warmth + 0.12);
    this.applyWarmth();
  }

  endOfWeek() {
    this.doorOpen = true;
    this.feedback.tween({
      from: 0, to: -1.15, duration: 1.2,
      onUpdate: (v) => { this.door.rotation.y = v; }
    });
    this.door.position.x = 1.9;
    this.doorMat.emissive.set('#ffd166');
    this.doorMat.emissiveIntensity = 0.6;
    this.feedback.flash(new THREE.Vector3(1.4, 1.5, -0.5), { color: '#ffe9a8', intensity: 4, duration: 1.6 });
    this.audio.play('success', { volume: 0.55 });
    this.say('LA PUERTA ESTÁ ABIERTA', 2600);
    this.dayBox.querySelector('[data-sleep]').hidden = true;
  }

  /* =============================================================== update */

  onUpdate(dt) {
    this.time += dt;
    animateAvatar(this.avatar, this.time);

    if (this.avatar.userData.sitting > 0) {
      this.avatar.userData.sitting -= dt;
      this.avatar.position.y = this.ground.userData.heightAt(this.avatar.position.x, this.avatar.position.z) - 0.25;
    }

    if (this.cooking && Math.random() < 0.25) {
      this.feedback.drizzle(
        { x: 1.8, y: 6, z: -3.6 }, 0.3,
        { color: '#e8e0d0', life: 2.2, speed: 0.5, gravity: 0.4, size: 0.7 }
      );
    }

    if (this.replyFlag) this.replyFlag.rotation.y = Math.sin(this.time * 2) * 0.3;
    if (this.layers.has('pad') && Math.random() < 0.06) {
      this.feedback.drizzle({ x: -2.2, y: 1.2, z: 1.9 }, 0.4, { color: '#ffd166', life: 1.6, speed: 0.6, gravity: -0.4, size: 0.5 });
    }
  }

  onReset() {
    this.day = 1;
    this.energy = START_ENERGY;
    this._maxToday = START_ENERGY;
    this.spentToday = 0;
    this.warmth = 0;
    this.plantStage = 0;
    this.cooking = false;
    this.pendingReply = false;
    this.doorOpen = false;
    this.busy = false;
    this.actions.forEach((a) => { a.done = false; a.repeat = 0; });
    this.plantParts.forEach((p) => p.scale.setScalar(0.001));
    this.pathStones.forEach((s) => s.material.color.set('#8b8f86'));
    this.windowMat.color.set('#3f4a52');
    this.windowMat.emissiveIntensity = 0;
    this.windowLight.intensity = 0;
    this.door.rotation.y = 0;
    this.door.position.x = 1.4;
    this.doorMat.emissiveIntensity = 0;
    if (this.replyFlag) { this.scene.remove(this.replyFlag); this.replyFlag = null; }
    this.avatar.position.set(1.4, this.ground.userData.heightAt(1.4, 3), 3);
    this.sky.userData.setColors('#59636a', '#9aa4a8');
    this.scene.fog.color.set('#8a9296');
    this.scene.fog.density = 0.026;
    this.sun.intensity = 1.25;
    this.grassMat.color.set('#6f7a6a');
    this.hillMat.color.set('#6b7570');
    this.dayBox.querySelector('[data-sleep]').hidden = false;
    this.renderEnergy();
  }

  /* =============================================================== cierre */

  get completionPayload() {
    return {
      islandId: 'sadness',
      success: true,
      emoAventura: true,
      badge: 'sadness',
      title: 'Un día a la vez',
      message: `Pasaste ${DAYS} días haciendo cosas pequeñas, y la casa volvió a estar viva.`
    };
  }

  finish() {
    if (this.finished || this.closing) return;
    this.closing = true;
    addReward('cristal-recuerdo');
    completeActivity('sadness-dias-3d', 20);
    recordReevaluation('sadness', 'alta', 'Activacion conductual', 'media');
    const hechas = this.actions.filter((a) => a.done).length;
    this.showClosingCard({
      title: `${hechas} cosas pequeñas`,
      lines: [
        'Ninguna de esas acciones era gran cosa por separado: abrir una ventana, regar una planta, escribir a alguien.',
        'La energía del día siguiente no dependía de cómo te sentías, sino de lo que habías hecho. Eso es lo que se llama activación conductual: no esperar a tener ganas, hacer algo pequeño y dejar que las ganas lleguen después.',
        'Quedarte quieto un día tampoco te quitó nada. Solo te dejó donde estabas.'
      ],
      onDone: () => super.finish()
    });
  }

  onDispose() {
    this.layers.forEach((l) => l.stop());
    this.layers.clear();
    this.actions.length = 0;
    this.tooltip?.remove();
    this.dayBox?.remove();
  }
}
