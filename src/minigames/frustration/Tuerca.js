// ISLA DE LA FRUSTRACION · Tuerca, la NPC mecanica
// Figura low-poly (cuerpo oxidado, un ojo-lampara, antena y tuerca en la
// cabeza) y su burbuja de dialogo en el HUD. Compartida por el taller y el
// volcan. Tuerca nunca regana: describe lo que ve, y cada frase importante se
// dice una sola vez por partida (clave `once`).
// Los textos de sus frases viven en textos.js.

import * as THREE from 'three';

/** Materiales propios para no depender de los de cada nivel */
export function makeTuercaMesh({ scale = 1 } = {}) {
  const rust = new THREE.MeshStandardMaterial({ color: '#9a5a3a', roughness: 0.9, flatShading: true });
  const dark = new THREE.MeshStandardMaterial({ color: '#2a2f33', roughness: 0.8, flatShading: true });
  const brass = new THREE.MeshStandardMaterial({ color: '#c9a24a', roughness: 0.5, metalness: 0.5, flatShading: true });
  const eye = new THREE.MeshStandardMaterial({ color: '#ffe9a8', emissive: '#ffd166', emissiveIntensity: 1.2 });

  const t = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.42, 0.9, 8), rust);
  body.position.y = 0.75;
  t.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.34, 10, 8), rust);
  head.position.y = 1.5;
  t.add(head);
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), eye);
  lamp.position.set(-0.08, 1.55, 0.28);
  t.add(lamp);
  const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.4, 5), dark);
  antenna.position.set(0.1, 2.0, 0);
  t.add(antenna);
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 5), brass);
  tip.position.set(0.1, 2.22, 0);
  t.add(tip);
  [-1, 1].forEach((sd) => {
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.6, 5), dark);
    arm.position.set(sd * 0.44, 0.9, 0);
    arm.rotation.z = sd * 0.4;
    t.add(arm);
  });
  const nut = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.1, 6), brass);
  nut.position.set(0, 1.86, 0);
  t.add(nut);
  // paraguas plegado a la espalda (se abre cuando sale volando en el volcan)
  const umbrella = new THREE.Group();
  const cane = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.1, 5), dark);
  cane.position.y = 0.55;
  const canopy = new THREE.Mesh(new THREE.ConeGeometry(0.75, 0.35, 8, 1, true), new THREE.MeshStandardMaterial({ color: '#ff6b5c', roughness: 0.8, flatShading: true, side: THREE.DoubleSide }));
  canopy.position.y = 1.15;
  umbrella.add(cane, canopy);
  umbrella.position.set(0.3, 1.2, -0.2);
  umbrella.visible = false;
  t.add(umbrella);
  t.userData.umbrella = umbrella;
  t.userData.eye = eye;
  t.scale.setScalar(scale);
  return t;
}

/** La burbuja de dialogo de Tuerca en el HUD */
export class TuercaVoice {
  /**
   * @param {import('../../engine/MinigameBase.js').MinigameBase} game
   * @param {THREE.Object3D} mesh   la figura, que se mece al hablar
   * @param {string} name
   */
  constructor(game, mesh, name = 'Tuerca') {
    this.game = game;
    this.mesh = mesh;
    this.talk = 0;
    this.once = new Set();
    this.el = document.createElement('div');
    this.el.className = 'tq-bubble';
    this.el.hidden = true;
    this.el.setAttribute('role', 'status');
    this.el.innerHTML = `<span class="tq-bubble__ico" aria-hidden="true">🔩</span><div><b>${name}</b><p data-text></p></div>`;
    game.el.hud.appendChild(this.el);
    this.textEl = this.el.querySelector('[data-text]');
  }

  /** Dice una frase; con `key`, solo la primera vez. Dura segun las palabras. */
  say(text, key = null) {
    if (key) {
      if (this.once.has(key)) return false;
      this.once.add(key);
    }
    this.textEl.textContent = text;
    this.el.hidden = false;
    this.el.classList.remove('is-out');
    const words = text.split(/\s+/).length;
    const ms = 3200 + words * 380;
    clearTimeout(this._t);
    this._t = setTimeout(() => {
      this.el.classList.add('is-out');
      setTimeout(() => { if (this.el.classList.contains('is-out')) this.el.hidden = true; }, 400);
    }, ms);
    this.talk = Math.min(4, ms / 1000);
    this.game.audio?.play('tick', { volume: 0.2, rate: 1.4 });
    return true;
  }

  hide() {
    clearTimeout(this._t);
    this.el.hidden = true;
  }

  /** Mecerse al hablar (llamar cada frame) */
  update(dt, time) {
    const m = this.mesh;
    if (!m) return;
    if (this.talk > 0) {
      this.talk -= dt;
      m.position.y = m.userData.baseY + Math.abs(Math.sin(time * 9)) * 0.05;
      m.rotation.z = Math.sin(time * 5) * 0.04;
    } else {
      m.position.y += (m.userData.baseY - m.position.y) * 0.2;
      m.rotation.z *= 0.9;
    }
  }

  reset() {
    this.once.clear();
    this.hide();
    this.talk = 0;
  }

  dispose() {
    clearTimeout(this._t);
    this.el.remove();
  }
}
