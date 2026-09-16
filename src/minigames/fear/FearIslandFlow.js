// ISLA DEL MIEDO · Flujo de los dos niveles
// Nivel 1: Bosque de la Noche (FearNightGame) -> Nivel 2: La Casa (FearHouseGame)
//
// Cumple el mismo contrato que un minijuego (mount / dispose / onComplete /
// onExit / onOpenToolbox), asi que EmotionIslandApp no distingue entre una
// isla de un nivel y esta. El Nivel 1 no sabe que existe el Nivel 2: aqui una
// subclase privada cambia solo su salida (una casa en vez del portal). Nunca
// hay dos niveles vivos: el bosque se libera antes de construir la casa.
//
// La transicion no es una pantalla: la niebla baja, aparece una casa a lo
// lejos en la direccion del ultimo farol, un sendero de luces la marca y el
// jugador camina hasta la puerta. [E] -> fundido corto -> interior.

import * as THREE from 'three';
import { FearNightGame } from './FearNightGame.js';
import { FearHouseGame } from './FearHouseGame.js';
import {
  addReward, completeActivity, recordReevaluation, getFearLevels, setFearLevel
} from '../../data/gameState.js';

const _zero = new THREE.Matrix4().makeScale(0, 0, 0);

/** Bosque de la Noche cuya salida es la casa. Solo cambia el final. */
class FearNightToHouse extends FearNightGame {
  constructor(opts) {
    super(opts);
    this.onEnterHouse = opts.onEnterHouse;
    this.settled = false;
  }

  /** La tension baja (2 s) pero sigue siendo de noche: el amanecer llega al salir de la casa */
  dawn() {
    this.settled = true;
    this.feedback.tweenColor(this.scene.fog.color, '#22364d', 2);
    this.feedback.tweenValue(this.scene.fog, 'density', 0.02, 2);
    this.feedback.tweenValue(this.lights.userData.hemi, 'intensity', 1.2, 2);
    this.ambientWind?.setVolume(0.12, 2);
    this.music?.setIntensity(0);
    this.music?.setVolume(0.3, 2);
    this.audio.play('soften', { volume: 0.3 });
    this.later(() => this.openExit(), 2000);
  }

  onUpdate(dt) {
    super.onUpdate(dt);
    // linterna estabilizada: sin gasto ni parpadeo desde que se apaga la tension
    if (this.settled) {
      this.battery = 1;
      this.batteryBar.set(1);
      this.flashlight.intensity = 9.5;
      if (this.dark) this.setDark(false);
    }
    if (this.pathLights) {
      for (let i = 0; i < this.pathLights.length; i += 1) {
        const m = this.pathLights[i];
        m.material.opacity = m.userData.on ? 0.55 + Math.sin(this.time * 3 + i * 0.8) * 0.25 : 0;
      }
    }
  }

  /** En vez del portal: una casa a lo lejos, una ventana con luz y un sendero */
  openExit() {
    const p = this.controller.position;
    const l = this.lastLantern?.position ?? new THREE.Vector3(0, 0, 8);
    const dir = new THREE.Vector3(l.x - p.x, 0, l.z - p.z);
    if (dir.lengthSq() < 1) dir.set(0, 0, -1);
    dir.normalize();
    let hx = l.x + dir.x * 12;
    let hz = l.z + dir.z * 12;
    // dentro del bosque jugable y a una distancia que haya que caminar
    hx = Math.max(-28, Math.min(28, hx));
    hz = Math.max(-28, Math.min(28, hz));
    if (Math.hypot(hx - p.x, hz - p.z) < 12) {
      hx = Math.max(-28, Math.min(28, p.x + dir.x * 16));
      hz = Math.max(-28, Math.min(28, p.z + dir.z * 16));
    }
    const hy = this.ground.userData.heightAt(hx, hz);
    const facing = Math.atan2(p.x - hx, p.z - hz);   // la puerta mira al jugador

    this.clearTreesAround(hx, hz, 6.5, p);

    const house = new THREE.Group();
    const wallMat = new THREE.MeshStandardMaterial({ color: '#7d7a8c', roughness: 1, flatShading: true });
    const body = new THREE.Mesh(new THREE.BoxGeometry(6.4, 3.6, 5.4), wallMat);
    body.position.y = 1.8;
    house.add(body);
    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(5.2, 2.4, 4),
      new THREE.MeshStandardMaterial({ color: '#4a3d4d', roughness: 1, flatShading: true })
    );
    roof.position.y = 4.8;
    roof.rotation.y = Math.PI / 4;
    house.add(roof);
    const door = new THREE.Mesh(
      new THREE.BoxGeometry(1.3, 2.3, 0.16),
      new THREE.MeshStandardMaterial({ color: '#5a4636', roughness: 0.9, flatShading: true, emissive: '#000000', emissiveIntensity: 0 })
    );
    door.position.set(0, 1.15, 2.78);
    house.add(door);
    // una ventana con luz tenue: la unica invitacion
    const win = new THREE.Mesh(
      new THREE.PlaneGeometry(1.1, 1.0),
      new THREE.MeshStandardMaterial({ color: '#ffd9a8', emissive: '#ffb86b', emissiveIntensity: 0 })
    );
    win.position.set(1.9, 2.1, 2.72);
    house.add(win);
    const glow = new THREE.PointLight('#ffb86b', 0, 14, 2);
    glow.position.set(1.9, 2.1, 3.3);
    house.add(glow);

    house.position.set(hx, hy, hz);
    house.rotation.y = facing;
    house.updateMatrixWorld(true);
    this.scene.add(house);
    this.house = house;

    // solida (caja alineada, algo mas grande que el cuerpo girado)
    const box = new THREE.Box3().setFromObject(body);
    box.expandByScalar(0.2);
    this.houseCollider = this.controller.addCollider({ type: 'box', box });

    const doorWorld = door.getWorldPosition(new THREE.Vector3());
    this.doorItem = this.interactable({
      object: door,
      radius: 3.2,
      icon: '🚪',
      label: 'Entrar',
      onInteract: () => this.onEnterHouse?.()
    });

    // la casa "aparece": la ventana se enciende y el sendero se ilumina paso a paso
    this.feedback.tweenValue(win.material, 'emissiveIntensity', 1.8, 2.2);
    this.feedback.tweenValue(glow, 'intensity', 2.2, 2.2);
    this.audio.play('light', { volume: 0.4 });
    this.buildPath(p, doorWorld);
    this.say('LA CASA', 2400);
  }

  /** Sendero de luces bajas desde el jugador hasta la puerta */
  buildPath(from, to) {
    const n = 14;
    const geo = new THREE.CircleGeometry(0.22, 10);
    this.pathLights = [];
    for (let i = 1; i <= n; i += 1) {
      const t = i / (n + 1);
      const x = from.x + (to.x - from.x) * t;
      const z = from.z + (to.z - from.z) * t;
      const mat = new THREE.MeshBasicMaterial({ color: '#ffd9a8', transparent: true, opacity: 0, depthWrite: false });
      const disc = new THREE.Mesh(geo, mat);
      disc.rotation.x = -Math.PI / 2;
      disc.position.set(x, this.ground.userData.heightAt(x, z) + 0.06, z);
      disc.userData.on = false;
      this.scene.add(disc);
      this.pathLights.push(disc);
      this.later(() => {
        disc.userData.on = true;
        if (i % 3 === 0) this.audio.play('tick', { volume: 0.12, rate: 0.8 + t * 0.4 });
      }, 400 + i * 160);
    }
  }

  /** Aparta los arboles que taparian la casa o el sendero (instancias a escala 0) */
  clearTreesAround(hx, hz, radius, from) {
    if (!this.trees || !this.treeSpots) return;
    const { trunks, crowns } = this.trees;
    const dx = hx - from.x;
    const dz = hz - from.z;
    const len2 = dx * dx + dz * dz || 1;
    const removed = [];
    this.treeSpots.forEach((s, i) => {
      const nearHouse = Math.hypot(s.x - hx, s.z - hz) < radius;
      // distancia al segmento jugador -> casa
      const t = Math.max(0, Math.min(1, ((s.x - from.x) * dx + (s.z - from.z) * dz) / len2));
      const px = from.x + dx * t;
      const pz = from.z + dz * t;
      const nearPath = Math.hypot(s.x - px, s.z - pz) < 1.8;
      if (!nearHouse && !nearPath) return;
      trunks.setMatrixAt(i, _zero);
      crowns.setMatrixAt(i, _zero);
      removed.push(s);
    });
    if (!removed.length) return;
    trunks.instanceMatrix.needsUpdate = true;
    crowns.instanceMatrix.needsUpdate = true;
    this.controller.colliders = this.controller.colliders.filter((c) => {
      if (c.type !== 'sphere') return true;
      return !removed.some((s) => Math.abs(s.x - c.center.x) < 0.01 && Math.abs(s.z - c.center.z) < 0.01);
    });
  }

  onReset() {
    super.onReset();
    this.settled = false;
    if (this.house) {
      if (this.doorItem) this.interactables.remove(this.doorItem);
      this.scene.remove(this.house);
      this.house = null;
      this.doorItem = null;
      const i = this.controller.colliders.indexOf(this.houseCollider);
      if (i >= 0) this.controller.colliders.splice(i, 1);
    }
    if (this.pathLights) {
      this.pathLights.forEach((d) => this.scene.remove(d));
      this.pathLights = null;
    }
    // los arboles apartados no vuelven: reiniciar el bosque no los necesita
  }
}

export class FearIslandFlow {
  constructor({ host, island, player, onComplete, onExit, onOpenToolbox }) {
    this.host = host;
    this.island = island;
    this.player = player;
    this.onComplete = onComplete;
    this.onExit = onExit;
    this.onOpenToolbox = onOpenToolbox;
    this.current = null;
    this.timers = new Set();
    this.reflections = [];
    this.disposed = false;
  }

  /* ============================================================== montaje */

  mount() {
    if (getFearLevels().level1) this.askWhereToStart();
    else this.startForest();
  }

  later(fn, ms) {
    const t = setTimeout(() => { this.timers.delete(t); if (!this.disposed) fn(); }, ms);
    this.timers.add(t);
  }

  gameOpts(extra = {}) {
    return {
      host: this.host,
      island: this.island,
      player: this.player,
      onComplete: (result) => this.onComplete?.(result),
      onExit: () => this.onExit?.(),
      onOpenToolbox: () => this.onOpenToolbox?.(),
      ...extra
    };
  }

  /** Con el bosque ya superado: empezar en la casa o repetirlo todo */
  askWhereToStart() {
    const panel = document.createElement('div');
    panel.className = 'i3d fh-choice';
    panel.innerHTML = `
      <div class="i3d__overlay">
        <div class="i3d-intro">
          <div class="i3d-intro__card" role="dialog" aria-modal="true" aria-label="Isla del Miedo">
            <p class="i3d-intro__eyebrow">Isla del Miedo</p>
            <h3>El bosque ya está atravesado</h3>
            <p class="fh-choice__hint">Puedes seguir por la casa o volver a empezar desde los faroles.</p>
            <div class="i3d-panel__actions">
              <button class="i3d-btn i3d-btn--primary" type="button" data-house>Ir a la casa</button>
              <button class="i3d-btn" type="button" data-forest>Empezar por el bosque</button>
              <button class="i3d-btn" type="button" data-leave>Salir al mapa</button>
            </div>
          </div>
        </div>
      </div>`;
    this.host.appendChild(panel);
    this.panel = panel;
    const pick = (fn) => { panel.remove(); this.panel = null; fn(); };
    panel.querySelector('[data-house]').addEventListener('click', () => pick(() => this.startHouse()));
    panel.querySelector('[data-forest]').addEventListener('click', () => pick(() => this.startForest()));
    panel.querySelector('[data-leave]').addEventListener('click', () => this.onExit?.());
    panel.querySelector('[data-house]').focus({ preventScroll: true });
  }

  /* =============================================================== niveles */

  startForest() {
    this.current = new FearNightToHouse(this.gameOpts({ onEnterHouse: () => this.enterHouse() }));
    this.current.mount();
  }

  /** [E] en la puerta: fundido, se libera el bosque y se construye la casa */
  enterHouse() {
    if (this.transitioning) return;
    this.transitioning = true;
    const forest = this.current;
    forest.controller.frozen = true;
    forest.controller.exitPointerLock();
    forest.audio.play('creak', { volume: 0.4, rate: 0.7 });

    const fade = document.createElement('div');
    fade.className = 'fh-fade';
    fade.innerHTML = '<span>La casa</span>';
    this.host.appendChild(fade);
    this.fade = fade;
    void fade.offsetHeight;   // fija el estado inicial: sin esto la transicion no arranca
    fade.classList.add('is-on');

    this.later(() => {
      // lo que el bosque dejo: reflexiones para la tarjeta final y su progreso
      this.reflections = [...(forest.seenReflections ?? [])];
      forest.dispose();
      this.current = null;
      addReward('gota-aire');
      completeActivity('fear-bosque-3d', 20);
      setFearLevel(1, true);

      fade.classList.add('is-titled');
      this.startHouse();
      this.later(() => {
        fade.classList.remove('is-on');
        this.later(() => { fade.classList.remove('is-titled'); }, 600);
        this.later(() => { fade.remove(); if (this.fade === fade) this.fade = null; }, 1000);
        this.transitioning = false;
      }, 1500);
    }, 850);
  }

  startHouse() {
    this.current = new FearHouseGame(this.gameOpts({ forestReflections: this.reflections }));
    this.current.onLevelDone = () => this.closeIsland();
    this.current.mount();
    // el fundido lo dibuja el flujo por encima del nuevo nivel
    if (this.fade) this.host.appendChild(this.fade);
  }

  /** Cierre de isla: el mismo que antes disparaba el bosque, ahora tras la casa */
  closeIsland() {
    addReward('lupa-realidad');
    addReward('gota-aire');
    completeActivity('fear-casa-3d', 20);
    setFearLevel(2, true);
    recordReevaluation('fear', 'media', 'Avanzar a ritmo propio + comprobar la realidad', 'baja');
  }

  /* ============================================================== limpieza */

  dispose() {
    this.disposed = true;
    this.timers.forEach((t) => clearTimeout(t));
    this.timers.clear();
    this.current?.dispose();
    this.current = null;
    this.panel?.remove();
    this.fade?.remove();
    this.panel = null;
    this.fade = null;
  }

  /** Diagnostico: memoria del nivel activo */
  memoryReport() {
    return this.current?.memoryReport?.() ?? null;
  }
}
