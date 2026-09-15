// ISLA DEL MIEDO · Bosque de la Noche
// Verbo: EXPLORAR EN LA OSCURIDAD · Primera persona
//
// Linterna con bateria: correr la agota rapido, caminar la conserva y
// detenerse a respirar (mantener pulsado, quieto) la recarga.
// Hay 5 faroles que encender. Sustos suaves: una sombra que cruza, un sonido.
// Quedarse sin luz no es perder: el bosque se oscurece y hay que parar,
// respirar y seguir. El miedo se atraviesa a ritmo propio, no huyendo.

import * as THREE from 'three';
import { MinigameBase } from '../../engine/MinigameBase.js';
import { MysteryMusic } from '../../engine/MysteryMusic.js';
import { createGround, createSky, createLights, GEO, scatterInstanced, makeTree } from '../../engine/worldkit.js';
import { addReward, completeActivity, recordReevaluation, setInitialIntensity } from '../../data/gameState.js';

const LANTERNS = [
  { x: -8, z: -12 },
  { x: 14, z: -6 },
  { x: 6, z: 16 },
  { x: -18, z: 6 },
  { x: 20, z: 18 }
];

// Una reflexion por farol, en el orden en que se encienden. Cada una se apoya
// en lo que el jugador acaba de hacer, no es un texto suelto.
const REFLECTIONS = [
  {
    title: 'La alarma se dispara antes',
    text: 'El miedo no espera a comprobar si hay peligro: el cuerpo se acelera primero y la cabeza mira después. Por eso una rama moviéndose puede darte un susto de verdad.'
  },
  {
    title: 'Huir alivia rápido',
    text: 'Correr gasta la linterna. Con el miedo pasa igual: escapar calma al momento, y la próxima vez la misma situación da un poco más de miedo.'
  },
  {
    title: 'Respirar no lo apaga',
    text: 'Cuando te detienes a respirar el miedo no desaparece: le baja el volumen lo justo para que puedas decidir y seguir. Eso ya es suficiente.'
  },
  {
    title: 'No hace falta verlo todo',
    text: 'Nunca has visto el bosque entero, solo lo que alcanza tu luz. Para avanzar basta con ver el siguiente paso.'
  },
  {
    title: 'Con miedo, no sin miedo',
    text: 'Has cruzado el bosque con el miedo puesto. Esa es la diferencia: valiente no es el que no siente miedo, es el que avanza llevándolo encima.'
  }
];

const DRAIN_WALK = 0.026;
const DRAIN_RUN = 0.085;
const DRAIN_IDLE = 0.012;
const RECHARGE = 0.16;

export class FearNightGame extends MinigameBase {
  constructor(opts) {
    super({ ...opts, mode: 'first' });
    this.battery = 1;
    this.breathing = false;
    this.holding = false;
    this.lanterns = [];
    this.time = 0;
    this.nextScare = 12 + Math.random() * 8;
    this.dark = false;
    this.seenReflections = [];
  }

  /* ============================================================ escenario */

  build() {
    this.root.classList.add('i3d--fp');
    const scene = this.scene;
    this.renderer.toneMappingExposure = 1.32;

    scene.fog = new THREE.FogExp2('#1b2e44', 0.033);
    this.sky = createSky({ top: '#0a1424', bottom: '#24405e' });
    scene.add(this.sky);

    this.ground = createGround({
      size: 100,
      segments: 60,
      color: '#36493f',
      amplitude: 0.9,
      scale: 0.06
    });
    scene.add(this.ground);
    this.controller.groundHeightAt = (x, z) => this.ground.userData.heightAt(x, z);
    this.controller.bounds = { minX: -34, maxX: 34, minZ: -34, maxZ: 34 };
    this.controller.setPosition(0, 3, 24);
    this.controller.yaw = 0;
    // el miedo se avanza despacio: se camina, correr cuesta bateria
    this.controller.cfg.walkSpeed = 3.9;
    this.controller.cfg.runSpeed = 6.6;

    this.lights = createLights({
      sunColor: '#a8c4ef',
      sunIntensity: 1.05,
      hemiSky: '#2c4a6b',
      hemiGround: '#283a34',
      hemiIntensity: 0.95,
      shadows: false
    });
    scene.add(this.lights);
    this.moon = this.lights.userData.sun;
    this.buildMoon();

    this.buildForest();
    this.buildLanterns();
    this.buildFlashlight();
    this.buildShadow();

    this.setObjective(LANTERNS.length, '✦');
    this.batteryBar = this.addBar('battery', { icon: '🔦', color: '#ffe08a', value: 1 });
    this.breathBar = this.addBar('breath', { icon: '🫁', color: '#7fd1ff', value: 0 });
    this.breathBar.show(false);

    this.bindHold();
    setInitialIntensity('media');
  }

  buildForest() {
    // arboles: dos InstancedMesh (tronco + copa), una llamada de dibujo cada uno
    const count = 150;
    const spots = [];
    for (let i = 0; i < count; i += 1) {
      const a = i * 2.399;
      const r = 5 + (i % 40) * 0.82;
      const x = Math.cos(a) * r + Math.sin(i) * 2.4;
      const z = Math.sin(a) * r + Math.cos(i * 1.7) * 2.4;
      // claros: centro del bosque, punto de partida y salida
      if (Math.hypot(x, z) < 4) continue;
      if (Math.hypot(x, z - 24) < 5.5) continue;
      if (Math.hypot(x, z - 8) < 4.5) continue;
      // no plantar encima de un farol
      if (LANTERNS.some((l) => Math.hypot(l.x - x, l.z - z) < 3.4)) continue;
      spots.push({ x, z, scale: 0.85 + (i % 5) * 0.28 });
    }
    this.treeSpots = spots;

    const trunkMat = new THREE.MeshStandardMaterial({ color: '#3a2d25', roughness: 1, flatShading: true });
    const crownMat = new THREE.MeshStandardMaterial({ color: '#33604d', roughness: 1, flatShading: true });

    const trunks = scatterInstanced(GEO.trunk(), trunkMat, spots.length, (i) => {
      const s = spots[i];
      return { x: s.x, y: this.ground.userData.heightAt(s.x, s.z) + 0.45 * s.scale, z: s.z, scale: s.scale, scaleY: s.scale * 1.6 };
    });
    const crowns = scatterInstanced(GEO.coneTree(), crownMat, spots.length, (i) => {
      const s = spots[i];
      return { x: s.x, y: this.ground.userData.heightAt(s.x, s.z) + 1.75 * s.scale, z: s.z, scale: s.scale * 1.25, scaleY: s.scale * 1.7 };
    });
    this.scene.add(trunks, crowns);

    // colisiones: cilindros finos en los troncos cercanos al area jugable
    spots.forEach((s) => {
      if (Math.hypot(s.x, s.z) > 32) return;
      this.controller.addCollider({
        type: 'sphere',
        center: new THREE.Vector3(s.x, this.ground.userData.heightAt(s.x, s.z), s.z),
        radius: 0.42 * s.scale
      });
    });

    // maleza baja, instanciada
    const grassMat = new THREE.MeshStandardMaterial({ color: '#2c563f', roughness: 1, flatShading: true });
    const grass = scatterInstanced(GEO.grass(), grassMat, 260, (i) => {
      const a = i * 1.618;
      const r = 3 + (i % 60) * 0.52;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      return { x, y: this.ground.userData.heightAt(x, z) + 0.25, z, ry: a, scale: 0.7 + (i % 4) * 0.3 };
    });
    this.scene.add(grass);
  }

  buildLanterns() {
    LANTERNS.forEach((p, i) => {
      const group = new THREE.Group();
      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.11, 2.1, 6),
        new THREE.MeshStandardMaterial({ color: '#2a2622', roughness: 1, flatShading: true })
      );
      post.position.y = 1.05;
      group.add(post);

      const glass = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.34, 0),
        new THREE.MeshStandardMaterial({
          color: '#6d747a', emissive: '#101418', emissiveIntensity: 0.2, roughness: 0.4, flatShading: true
        })
      );
      glass.position.y = 2.25;
      group.add(glass);

      const light = new THREE.PointLight('#ffcf7a', 0, 16, 2);
      light.position.y = 2.3;
      group.add(light);

      const y = this.ground.userData.heightAt(p.x, p.z);
      group.position.set(p.x, y, p.z);
      this.scene.add(group);
      this.controller.addCollider({ type: 'sphere', center: new THREE.Vector3(p.x, y, p.z), radius: 0.4 });

      const lantern = { group, glass, light, lit: false, index: i, position: new THREE.Vector3(p.x, y, p.z) };
      this.lanterns.push(lantern);

      lantern.interactable = this.interactable({
        object: glass,
        radius: 2.8,
        icon: '🔥',
        label: 'Encender',
        onInteract: () => this.lightLantern(lantern)
      });
    });
  }

  /** Luna visible: es de donde viene la luz de la noche */
  buildMoon() {
    const pos = new THREE.Vector3(-26, 30, -58);

    const disc = new THREE.Mesh(
      new THREE.SphereGeometry(3.4, 20, 14),
      // fog:false para que la niebla no se la coma a esa distancia
      new THREE.MeshBasicMaterial({ color: '#eef4ff', fog: false, transparent: true, opacity: 1 })
    );
    disc.position.copy(pos);
    this.scene.add(disc);
    this.moonMesh = disc;

    // halo suave alrededor
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 128;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(64, 64, 6, 64, 64, 64);
    grad.addColorStop(0, 'rgba(220, 236, 255, 0.85)');
    grad.addColorStop(0.35, 'rgba(180, 210, 255, 0.28)');
    grad.addColorStop(1, 'rgba(150, 190, 255, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({
      map: new THREE.CanvasTexture(canvas),
      transparent: true,
      depthWrite: false,
      fog: false,
      blending: THREE.AdditiveBlending
    }));
    halo.scale.set(26, 26, 1);
    halo.position.copy(pos);
    this.scene.add(halo);
    this.moonHalo = halo;

    // la luz direccional viene de la luna, no de un sitio cualquiera
    this.moon.position.copy(pos);

    // reflejo azulado en el suelo justo debajo
    this.moonGlow = new THREE.PointLight('#9fc0ff', 0.7, 46, 1.4);
    this.moonGlow.position.set(-8, 12, -18);
    this.scene.add(this.moonGlow);
  }

  buildFlashlight() {
    this.flashlight = new THREE.SpotLight('#ffe6b8', 9, 30, Math.PI / 6.2, 0.5, 1.1);
    this.flashlight.position.set(0, 0, 0);
    this.camera.add(this.flashlight);
    // apuntada un poco hacia abajo: se ve el suelo por delante
    this.flashlight.target.position.set(0, -0.32, -1);
    this.camera.add(this.flashlight.target);
    this.scene.add(this.camera);

    // halo tenue alrededor del jugador para no perder el suelo del todo
    this.halo = new THREE.PointLight('#9dc0ff', 0.9, 15, 1.5);
    this.camera.add(this.halo);
  }

  buildShadow() {
    // "algo" que cruza a lo lejos: silueta oscura, nunca encima del jugador
    const geo = new THREE.CapsuleGeometry(0.42, 1.2, 3, 6);
    const mat = new THREE.MeshBasicMaterial({ color: '#05070a', transparent: true, opacity: 0 });
    this.shadowFigure = new THREE.Mesh(geo, mat);
    this.shadowFigure.visible = false;
    this.scene.add(this.shadowFigure);
    this.scare = null;
  }

  /* ================================================================ input */

  bindHold() {
    const down = () => { this.holding = true; };
    const up = () => { this.holding = false; };
    const canvas = this.renderer.domElement;

    // Solo raton: en tactil manda el boton E, que captura su propio dedo.
    // Antes se escuchaba 'mousedown' y el navegador lo emitia tambien al tocar
    // la pantalla, asi que girar la camara con el dedo activaba la respiracion.
    const pointerDown = (e) => { if (e.pointerType === 'mouse' && e.button === 0) down(); };
    const pointerUp = (e) => { if (e.pointerType === 'mouse') up(); };
    canvas.addEventListener('pointerdown', pointerDown);
    window.addEventListener('pointerup', pointerUp);
    window.addEventListener('pointercancel', pointerUp);

    const isHoldKey = (e) => e.key === 'e' || e.key === 'E' || e.key === ' ';
    const keyDown = (e) => { if (isHoldKey(e)) down(); };
    const keyUp = (e) => { if (isHoldKey(e)) up(); };
    window.addEventListener('keydown', keyDown);
    window.addEventListener('keyup', keyUp);
    // cambiar de app no puede dejar al jugador respirando para siempre
    window.addEventListener('blur', up);

    this.listeners.push(() => canvas.removeEventListener('pointerdown', pointerDown));
    this.listeners.push(() => window.removeEventListener('pointerup', pointerUp));
    this.listeners.push(() => window.removeEventListener('pointercancel', pointerUp));
    this.listeners.push(() => window.removeEventListener('keydown', keyDown));
    this.listeners.push(() => window.removeEventListener('keyup', keyUp));
    this.listeners.push(() => window.removeEventListener('blur', up));

    this.onHoldStart = down;
    this.onHoldEnd = up;
  }

  async onStart() {
    await this.showIntro({
      eyebrow: 'Isla del Miedo',
      goal: 'Enciende los 5 faroles del bosque',
      hint: 'Correr gasta la linterna. Párate y mantén pulsado para respirar: la luz vuelve. Quedarte a oscuras no te hace perder nada.',
      keys: [['W A S D', 'moverte'], ['Ratón', 'mirar'], ['Shift', 'correr'], ['E', 'encender'], ['Mantener', 'respirar']],
      touch: [['Joystick', 'moverte'], ['A fondo', 'correr'], ['Arrastra', 'mirar'], ['E', 'encender'], ['Mantener E', 'respirar']]
    });
    this.ambientWind = this.audio.ambient('wind', { volume: 0.26, rate: 0.8 });
    // musica generativa: misterio con intriga; sube de tension con la linterna baja y los sustos
    this.music = new MysteryMusic(this.audio);
    this.music.start();
    this.nextForestSound = 4 + Math.random() * 4;
    this.breathPhaseUp = true;
    this.nextHeartbeat = 0;
    // clic de la linterna al encenderla
    this.later(() => this.audio.play('click', { volume: 0.7 }), 300);
    this.say('ENCIENDE LOS FAROLES', 2600);
  }

  /** Buhos y grillos a lo lejos, de vez en cuando y desde un punto del bosque */
  updateForestSounds(dt) {
    this.nextForestSound -= dt;
    if (this.nextForestSound > 0) return;
    this.nextForestSound = 7 + Math.random() * 9;
    const p = this.controller.position;
    const a = Math.random() * Math.PI * 2;
    const d = 10 + Math.random() * 12;
    if (!this.forestSpot) {
      this.forestSpot = new THREE.Object3D();
      this.scene.add(this.forestSpot);
    }
    this.forestSpot.position.set(p.x + Math.cos(a) * d, p.y + 2, p.z + Math.sin(a) * d);
    const name = Math.random() < 0.45 ? 'owl' : 'crickets';
    this.audio.playAt(name, this.forestSpot, { volume: name === 'owl' ? 0.5 : 0.35, refDistance: 6 });
  }

  /* ============================================================== faroles */

  lightLantern(lantern) {
    if (lantern.lit) return;
    lantern.lit = true;
    lantern.interactable.done = true;
    lantern.glass.material.color.set('#ffd98a');
    lantern.glass.material.emissive.set('#ffb347');
    this.feedback.tweenValue(lantern.glass.material, 'emissiveIntensity', 2.6, 1.2);
    this.feedback.tweenValue(lantern.light, 'intensity', 4.5, 1.4);
    this.feedback.burst(lantern.position.clone().add(new THREE.Vector3(0, 2.3, 0)), {
      count: 22, color: '#ffcf7a', speed: 2.6, life: 1.2, gravity: -1.4
    });
    this.audio.playAt('ignite', lantern.group, { volume: 0.7, refDistance: 5 });
    this.audio.playAt('light', lantern.group, { volume: 0.8, refDistance: 5 });

    // cada farol aclara un poco la noche y devuelve algo de bateria
    this.battery = Math.min(1, this.battery + 0.25);
    const done = this.advanceObjective();
    const progress = this.objective.done / this.objective.total;

    // cada farol trae una reflexion; no corta la partida, se puede seguir andando
    const reflection = REFLECTIONS[this.objective.done - 1];
    if (reflection) {
      this.seenReflections.push(reflection);
      this.later(() => this.showNote({ ...reflection, seconds: 9 }), 700);
    }
    this.feedback.tweenValue(this.scene.fog, 'density', 0.033 - progress * 0.019, 2);
    this.feedback.tweenValue(this.lights.userData.hemi, 'intensity', 0.95 + progress * 0.35, 2);
    completeActivity(`fear-farol-${lantern.index + 1}`, 6);

    if (done) this.dawn();
  }

  dawn() {
    this.say('AMANECE', 2600);
    this.feedback.tweenColor(this.scene.fog.color, '#8fb0c9', 4);
    this.feedback.tweenValue(this.scene.fog, 'density', 0.012, 4);
    this.sky.userData.setColors('#2c4d70', '#c9a97a');
    this.feedback.tweenValue(this.moon, 'intensity', 1.45, 4);
    this.feedback.tweenColor(this.moon.color, '#ffd9a8', 4);
    this.feedback.tweenValue(this.lights.userData.hemi, 'intensity', 1.15, 4);
    this.feedback.tweenValue(this.moonMesh.material, 'opacity', 0, 3.5);
    this.feedback.tweenValue(this.moonHalo.material, 'opacity', 0, 3);
    this.feedback.tweenValue(this.moonGlow, 'intensity', 0, 3);
    this.ambientWind?.setVolume(0.12, 2);
    this.music?.setIntensity(0);
    this.music?.setVolume(0.35, 4);
    this.audio.play('success', { volume: 0.5 });

    this.later(() => {
      const p = new THREE.Vector3(0, this.ground.userData.heightAt(0, 8), 8);
      this.openPortal(p, { color: '#ffd9a8', label: 'Salir del bosque' });
      this.say('CRUZA EL PORTAL', 2000);
    }, 2000);
  }

  /* ============================================================== sustos */

  triggerScare() {
    const p = this.controller.position;
    const yaw = this.controller.yaw;
    // aparece a un lado del campo de vision, a media distancia
    const side = Math.random() < 0.5 ? -1 : 1;
    const dist = 9 + Math.random() * 5;
    const angle = yaw + side * 0.9;
    const x = p.x - Math.sin(angle) * dist;
    const z = p.z - Math.cos(angle) * dist;
    this.shadowFigure.position.set(x, this.ground.userData.heightAt(x, z) + 1, z);
    this.shadowFigure.visible = true;
    this.shadowFigure.material.opacity = 0;
    this.scare = { t: 0, dir: -side, speed: 5.5 + Math.random() * 2 };

    this.audio.play('whoosh', { volume: 0.45 });
    this.audio.play('rustle', { volume: 0.35 });
    this.later(() => this.audio.play('heartbeat', { volume: 0.5 }), 350);
    this.feedback.shakeCamera(0.08);
    this.scareTension = 1;
  }

  updateScare(dt) {
    if (!this.scare) return;
    const s = this.scare;
    s.t += dt;
    const yaw = this.controller.yaw;
    // cruza lateralmente respecto a la mirada
    this.shadowFigure.position.x += Math.cos(yaw) * s.dir * s.speed * dt;
    this.shadowFigure.position.z -= Math.sin(yaw) * s.dir * s.speed * dt;
    this.shadowFigure.position.y = this.ground.userData.heightAt(
      this.shadowFigure.position.x, this.shadowFigure.position.z
    ) + 1;
    // aparece y se desvanece: nunca se queda
    this.shadowFigure.material.opacity = Math.sin(Math.min(1, s.t / 1.4) * Math.PI) * 0.85;
    if (s.t > 1.4) {
      this.scare = null;
      this.shadowFigure.visible = false;
    }
  }

  /* =============================================================== update */

  onUpdate(dt) {
    this.time += dt;

    const moving = Math.hypot(this.controller.velocity.x, this.controller.velocity.z) > 0.6;
    const running = this.controller.isRunning && moving;

    // Respirar: quieto + mantener pulsado -> recarga la linterna
    const canBreathe = !moving && this.holding;
    if (canBreathe !== this.breathing) {
      this.breathing = canBreathe;
      this.breathBar.show(canBreathe);
      if (canBreathe) {
        this.audio.duck(0.3);
        this.breathPhaseUp = Math.cos(this.time * 1.2) > 0;
        this.audio.play(this.breathPhaseUp ? 'inhale' : 'exhale', { volume: 0.55 });
        this.say(this.breathPhaseUp ? 'INHALA' : 'EXHALA', 0);
      } else {
        this.audio.unduck();
        this.clearSay();
      }
    }

    if (this.breathing) {
      this.battery = Math.min(1, this.battery + RECHARGE * dt);
      this.breathBar.set((Math.sin(this.time * 1.2) * 0.5 + 0.5));
      // la barra sube al inhalar y baja al exhalar: el sonido acompana cada fase
      const up = Math.cos(this.time * 1.2) > 0;
      if (up !== this.breathPhaseUp) {
        this.breathPhaseUp = up;
        this.audio.play(up ? 'inhale' : 'exhale', { volume: 0.55 });
        this.say(up ? 'INHALA' : 'EXHALA', 0);
      }
      this.controller.cfg.headBob = 0;
      if (this.dark && this.battery > 0.18) this.setDark(false);
    } else {
      const drain = running ? DRAIN_RUN : moving ? DRAIN_WALK : DRAIN_IDLE;
      this.battery = Math.max(0, this.battery - drain * dt);
      this.controller.cfg.headBob = 0.055;
      if (!this.dark && this.battery <= 0.001) this.setDark(true);
    }
    this.batteryBar.set(this.battery);

    // la linterna parpadea cuando queda poca bateria
    const low = this.battery < 0.25 && this.battery > 0;
    const flicker = low ? 0.55 + Math.random() * 0.45 : 1;
    this.flashlight.intensity = this.dark ? 0 : (2.5 + this.battery * 7) * flicker;
    this.flashlight.angle = Math.PI / 7 * (0.75 + this.battery * 0.35);
    this.halo.intensity = this.dark ? 0.22 : 0.6 + this.battery * 0.5;

    // musica: mas tension cuanto menos linterna, y un pico con cada sombra
    this.scareTension = Math.max(0, (this.scareTension ?? 0) - dt * 0.25);
    const tension = Math.max(this.dark ? 0.85 : (1 - this.battery) * 0.7, this.scareTension * 0.9);
    this.music?.setIntensity(this.breathing ? tension * 0.4 : tension);
    if (low && !this.breathing) {
      this.nextHeartbeat -= dt;
      if (this.nextHeartbeat <= 0) {
        this.nextHeartbeat = 1.15 - (0.25 - this.battery);
        this.audio.play('heartbeat', { volume: 0.35 + (0.25 - this.battery) });
      }
    }
    if (this.objective.done < this.objective.total) this.updateForestSounds(dt);

    // sustos suaves espaciados
    this.nextScare -= dt;
    if (this.nextScare <= 0 && !this.scare && this.objective.done < this.objective.total) {
      this.triggerScare();
      this.nextScare = 16 + Math.random() * 14;
    }
    this.updateScare(dt);

    // faroles encendidos: leve latido de luz
    for (let i = 0; i < this.lanterns.length; i += 1) {
      const l = this.lanterns[i];
      if (l.lit) l.light.intensity = 4.2 + Math.sin(this.time * 3 + i) * 0.5;
    }

    if (this.portalRing) this.portalRing.rotation.z += dt * 0.6;
  }

  /** Sin bateria: no se pierde, se para y se respira */
  setDark(dark) {
    this.dark = dark;
    if (dark) {
      this.say('PÁRATE Y RESPIRA', 2600);
      this.audio.play('clickOff', { volume: 0.7 });
      this.later(() => this.audio.play('soften', { volume: 0.35 }), 200);
      this.feedback.shakeCamera(0.12);
      this.controller.speedScale = 0.6;
    } else {
      this.clearSay();
      this.audio.play('click', { volume: 0.7 });
      this.later(() => this.audio.play('light', { volume: 0.4 }), 120);
      this.controller.speedScale = 1;
    }
  }

  onReset() {
    this.battery = 1;
    this.dark = false;
    this.scare = null;
    this.seenReflections = [];
    this.shadowFigure.visible = false;
    this.controller.speedScale = 1;
    this.lanterns.forEach((l) => {
      l.lit = false;
      l.interactable.done = false;
      l.glass.material.color.set('#6d747a');
      l.glass.material.emissive.set('#101418');
      l.glass.material.emissiveIntensity = 0.2;
      l.light.intensity = 0;
    });
    this.scene.fog.density = 0.033;
    this.scene.fog.color.set('#1b2e44');
    this.sky.userData.setColors('#0a1424', '#24405e');
    this.lights.userData.hemi.intensity = 0.95;
    this.moon.intensity = 1.05;
    this.moonMesh.material.opacity = 1;
    this.moonHalo.material.opacity = 1;
    this.moonGlow.intensity = 0.7;
    this.controller.setPosition(0, 3, 24);
    this.controller.yaw = 0;
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
      islandId: 'fear',
      success: true,
      emoAventura: true,
      badge: 'fear',
      title: 'Isla del Miedo',
      message: 'Cruzaste el bosque a tu ritmo y encendiste los cinco faroles.'
    };
  }

  finish() {
    if (this.finished || this.closing) return;
    this.closing = true;
    this.controller.frozen = true;
    this.controller.exitPointerLock();
    addReward('lupa-realidad');
    addReward('gota-aire');
    completeActivity('fear-bosque-3d', 20);
    recordReevaluation('fear', 'media', 'Avanzar a ritmo propio + respiracion', 'baja');
    this.showClosingCard({
      title: 'Atravesar, no huir',
      lines: [
        'Los faroles siguen encendidos detrás de ti. Esto es lo que fuiste encontrando:',
        ...this.seenReflections.map((r) => `<strong>${r.title}.</strong> ${r.text}`)
      ],
      onDone: () => super.finish()
    });
  }

  onDispose() {
    this.ambientWind?.stop();
    this.music?.stop();
    this.lanterns.length = 0;
  }
}
