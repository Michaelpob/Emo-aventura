// Nucleo 3D · Feedback ambiental reutilizable
// Particulas con pooling (una sola geometria + InstancedMesh), flash de luz,
// shake de camara, tweens de color de niebla/cielo y disparo de sonidos.
// Nada de `new` por frame: vectores y colores reutilizables.

import * as THREE from 'three';

const _v = new THREE.Vector3();
const _c = new THREE.Color();
const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3(1, 1, 1);

export class Feedback {
  /**
   * @param {THREE.Scene} scene
   * @param {THREE.Camera} camera
   * @param {AudioBus} [audio]
   */
  constructor(scene, camera, audio = null) {
    this.scene = scene;
    this.camera = camera;
    this.audio = audio;
    this.tweens = [];
    this.shake = { amount: 0, decay: 2.6, offset: new THREE.Vector3() };
    this._initParticles(220);
    this._initFlash();
  }

  /* ---------------------------------------------------------- particulas */

  _initParticles(count) {
    this.maxParticles = count;
    const geo = new THREE.TetrahedronGeometry(0.09, 0);
    const mat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.95, vertexColors: true });
    this.particleMesh = new THREE.InstancedMesh(geo, mat, count);
    this.particleMesh.frustumCulled = false;
    this.particleMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.particleMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(count * 3), 3);
    this.particleMesh.renderOrder = 5;
    this.scene.add(this.particleMesh);

    this.pool = new Array(count);
    for (let i = 0; i < count; i += 1) {
      this.pool[i] = {
        alive: false,
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        life: 0,
        maxLife: 1,
        size: 1,
        spin: 0
      };
    }
    this.cursor = 0;
    this._hideAll();
  }

  _hideAll() {
    _m.compose(_v.set(0, -9999, 0), _q, _s);
    for (let i = 0; i < this.maxParticles; i += 1) this.particleMesh.setMatrixAt(i, _m);
    this.particleMesh.instanceMatrix.needsUpdate = true;
  }

  /**
   * Estallido de particulas en un punto del mundo.
   * @param {THREE.Vector3|{x,y,z}} position
   */
  burst(position, { count = 16, color = '#ffd166', speed = 3.2, life = 0.9, size = 1, gravity = -4 } = {}) {
    _c.set(color);
    for (let i = 0; i < count; i += 1) {
      const p = this.pool[this.cursor];
      this.cursor = (this.cursor + 1) % this.maxParticles;
      p.alive = true;
      p.pos.set(position.x, position.y, position.z);
      const a = Math.random() * Math.PI * 2;
      const up = 0.3 + Math.random() * 0.9;
      const r = Math.random() * speed;
      p.vel.set(Math.cos(a) * r, up * speed, Math.sin(a) * r);
      p.life = 0;
      p.maxLife = life * (0.7 + Math.random() * 0.6);
      p.size = size * (0.6 + Math.random() * 0.8);
      p.spin = (Math.random() - 0.5) * 8;
      p.gravity = gravity;
      this.particleMesh.instanceColor.setXYZ(
        (this.cursor + this.maxParticles - 1) % this.maxParticles,
        _c.r, _c.g, _c.b
      );
    }
    this.particleMesh.instanceColor.needsUpdate = true;
  }

  /** Lluvia continua ligera (niebla luminosa, polvo) */
  drizzle(position, radius, opts = {}) {
    if (Math.random() > 0.35) return;
    _v.set(
      position.x + (Math.random() - 0.5) * radius * 2,
      position.y + Math.random() * 2,
      position.z + (Math.random() - 0.5) * radius * 2
    );
    this.burst(_v, { count: 1, speed: 0.4, life: 2.2, gravity: -0.6, ...opts });
  }

  /* ------------------------------------------------------------- destello */

  _initFlash() {
    // Siempre presente con intensidad 0: si entrara y saliera de la escena
    // cambiaria el numero de luces y three recompilaria los shaders de todos
    // los materiales en mitad del juego (un tiron de cientos de ms en movil).
    this.flashLight = new THREE.PointLight(0xffffff, 0, 14, 2);
    this.scene.add(this.flashLight);
  }

  flash(position, { color = '#ffe9a8', intensity = 4, duration = 0.5, distance = 14 } = {}) {
    this.flashLight.color.set(color);
    this.flashLight.position.set(position.x, position.y, position.z);
    this.flashLight.distance = distance;
    this.flashLight.intensity = intensity;
    this.tween({
      from: intensity,
      to: 0,
      duration,
      onUpdate: (v) => { this.flashLight.intensity = v; },
      onDone: () => { this.flashLight.intensity = 0; }
    });
  }

  /* --------------------------------------------------------------- shake */

  shakeCamera(amount = 0.25, decay = 2.6) {
    this.shake.amount = Math.max(this.shake.amount, amount);
    this.shake.decay = decay;
  }

  /* --------------------------------------------------------------- tweens */

  tween({ from, to, duration = 1, onUpdate, onDone, ease = (t) => t * t * (3 - 2 * t) }) {
    const t = { from, to, duration, elapsed: 0, onUpdate, onDone, ease };
    this.tweens.push(t);
    return t;
  }

  /** Tween de color (niebla, cielo, luz) */
  tweenColor(target, toColor, duration = 1.5, onUpdate = null) {
    const fromR = target.r; const fromG = target.g; const fromB = target.b;
    _c.set(toColor);
    const toR = _c.r; const toG = _c.g; const toB = _c.b;
    return this.tween({
      from: 0,
      to: 1,
      duration,
      onUpdate: (p) => {
        target.setRGB(fromR + (toR - fromR) * p, fromG + (toG - fromG) * p, fromB + (toB - fromB) * p);
        onUpdate?.(p);
      }
    });
  }

  tweenValue(object, key, to, duration = 1) {
    return this.tween({
      from: object[key],
      to,
      duration,
      onUpdate: (v) => { object[key] = v; }
    });
  }

  /* --------------------------------------------------------------- sonido */

  sound(name, opts) { this.audio?.play(name, opts); }
  soundAt(name, object, opts) { this.audio?.playAt(name, object, opts); }

  /* --------------------------------------------------------------- update */

  update(dt) {
    // particulas
    let anyAlive = false;
    for (let i = 0; i < this.maxParticles; i += 1) {
      const p = this.pool[i];
      if (!p.alive) continue;
      anyAlive = true;
      p.life += dt;
      if (p.life >= p.maxLife) {
        p.alive = false;
        _m.compose(_v.set(0, -9999, 0), _q, _s);
        this.particleMesh.setMatrixAt(i, _m);
        continue;
      }
      p.vel.y += (p.gravity ?? -4) * dt;
      p.pos.addScaledVector(p.vel, dt);
      const t = p.life / p.maxLife;
      const scale = p.size * (1 - t * 0.75);
      _q.setFromAxisAngle(_v.set(0, 1, 0), p.life * p.spin);
      _m.compose(p.pos, _q, _s.set(scale, scale, scale));
      this.particleMesh.setMatrixAt(i, _m);
    }
    if (anyAlive) this.particleMesh.instanceMatrix.needsUpdate = true;

    // tweens
    for (let i = this.tweens.length - 1; i >= 0; i -= 1) {
      const t = this.tweens[i];
      t.elapsed += dt;
      const p = Math.min(1, t.elapsed / t.duration);
      const e = t.ease(p);
      t.onUpdate?.(t.from + (t.to - t.from) * e);
      if (p >= 1) {
        t.onDone?.();
        this.tweens.splice(i, 1);
      }
    }

    // shake
    if (this.shake.amount > 0.001) {
      this.shake.amount = Math.max(0, this.shake.amount - this.shake.decay * dt * this.shake.amount);
      const a = this.shake.amount;
      this.shake.offset.set(
        (Math.random() - 0.5) * a,
        (Math.random() - 0.5) * a,
        (Math.random() - 0.5) * a * 0.4
      );
      this.camera.position.add(this.shake.offset);
    }
  }

  dispose() {
    this.tweens.length = 0;
    this.scene.remove(this.particleMesh);
    this.particleMesh.geometry.dispose();
    this.particleMesh.material.dispose();
    this.particleMesh.dispose();
    this.scene.remove(this.flashLight);
    this.flashLight.dispose?.();
    this.pool.length = 0;
    this.audio = null;
  }
}
