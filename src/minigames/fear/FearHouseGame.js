// ISLA DEL MIEDO · Nivel 2 · La Casa
// Verbo: ACERCARSE Y COMPROBAR · Primera persona
//
// Una casa de noche con cinco lugares que dan miedo: debajo de la cama, el
// armario, la cortina, el pasillo y la puerta del sotano. Sobre cada foco
// crece una sombra imaginada. Para comprobar hay que MANTENER la mirada:
// la camara se desvia sola (el impulso de mirar a otro lado) y el jugador la
// corrige. Al completar el arco la sombra se disuelve y aparece lo que habia
// de verdad: una caja de juguetes, un abrigo, una rama, el gato, la lavadora.
// Cada revelacion enciende una luz de la casa. Nada castiga: retroceder o
// soltar solo vacia el arco. Sin texto: se aprende porque se ve pasar.

import * as THREE from 'three';
import { MinigameBase } from '../../engine/MinigameBase.js';
import { MysteryMusic } from '../../engine/MysteryMusic.js';
import { BreathPause } from '../../engine/BreathPause.js';
import { createSky, makeTree } from '../../engine/worldkit.js';
import { gameState, setSetting } from '../../data/gameState.js';

const _dir = new THREE.Vector3();
const _to = new THREE.Vector3();
const _box = new THREE.Box3();

// Escalada: solo desviacion de camara y duracion del arco. El escalon lo da
// el orden en que el jugador comprueba, no el lugar: el primero siempre es
// un tutorial silencioso.
const TIERS = [
  { drift: 0, duration: 2.0, alternate: 0, tremor: 0 },
  { drift: 0.17, duration: 2.5, alternate: 0, tremor: 0 },
  { drift: 0.24, duration: 3.0, alternate: 1.1, tremor: 0 },
  { drift: 0.27, duration: 3.5, alternate: 1.1, tremor: 0.012 },
  { drift: 0.36, duration: 4.0, alternate: -1, tremor: 0.016 }   // -1: cambia al azar
];

const COLD = { fog: '#0b1020', sky: '#28345a', ground: '#0d1018', hemi: 0.34, torch: '#cfd8ff', exposure: 1.08 };
const WARM = { fog: '#3a2a1c', sky: '#7a5a38', ground: '#2a1e12', hemi: 0.9, torch: '#ffe6c0', exposure: 1.22 };

const HOUSE_REFLECTIONS = [
  {
    title: 'El monstruo era la imaginación',
    text: 'Cada vez que miraste, lo que había era un abrigo, una caja, un gato. El miedo anticipa lo peor antes de comprobar; comprobar es lo que lo encoge.'
  },
  {
    title: 'Sostener la mirada',
    text: 'El impulso era apartar la vista. Cada segundo que aguantaste mirando, la sombra se hizo más pequeña. Así funciona exponerse: de a poco y sin huir.'
  },
  {
    title: 'Volver a mirar ya no asusta',
    text: 'Lo que comprobaste una vez no vuelve a crecer. Eso se puede llevar fuera de la casa: cuando el miedo anticipe algo, acercarse y mirar.'
  }
];

export class FearHouseGame extends MinigameBase {
  /**
   * @param {object} opts  ademas de las de MinigameBase:
   * @param {Array<{title:string,text:string}>} [opts.forestReflections]
   *        reflexiones vistas en el bosque (Nivel 1), para la tarjeta final
   */
  constructor(opts) {
    super({ ...opts, mode: 'first' });
    this.forestReflections = opts.forestReflections ?? [];
    this.focos = [];
    this.time = 0;
    this.tension = 0;
    this.holding = false;
    this.checking = null;      // foco que se esta comprobando
    this.revealed = 0;
    this.calmUntil = 0;
    this.nextBeat = 0;
    this.nextDrip = 3;
    this.nextClock = 1;
    this.stepCount = 0;
    this.doorOpen = false;
    this.exitArmed = false;
    this.leaving = false;
    this.gentle = !!gameState.settings.gentleFear;
    this.touchLike = window.matchMedia?.('(pointer: coarse)').matches ?? false;
  }

  /* ============================================================ escenario */

  build() {
    this.root.classList.add('i3d--fp', 'i3d--house');
    const scene = this.scene;
    this.renderer.toneMappingExposure = COLD.exposure;
    scene.fog = new THREE.FogExp2(COLD.fog, 0.06);

    this.sky = createSky({ top: '#0a1424', bottom: '#24405e', size: 120 });
    scene.add(this.sky);

    this.hemi = new THREE.HemisphereLight(COLD.sky, COLD.ground, COLD.hemi);
    scene.add(this.hemi);
    // el sol solo existe para el amanecer final; siempre presente (cambiar
    // el numero de luces recompila los shaders)
    this.sun = new THREE.DirectionalLight('#ffd9a8', 0);
    this.sun.position.set(30, 18, 40);
    scene.add(this.sun);

    this.mats = {
      wall: new THREE.MeshStandardMaterial({ color: '#b9b2a6', roughness: 1, flatShading: true }),
      floor: new THREE.MeshStandardMaterial({ color: '#6e5540', roughness: 0.95, flatShading: true }),
      ceil: new THREE.MeshStandardMaterial({ color: '#57534d', roughness: 1, flatShading: true }),
      wood: new THREE.MeshStandardMaterial({ color: '#7a5a3e', roughness: 0.9, flatShading: true }),
      dark: new THREE.MeshStandardMaterial({ color: '#2f2a33', roughness: 0.9, flatShading: true }),
      fabric: new THREE.MeshStandardMaterial({ color: '#7d6c8a', roughness: 1, flatShading: true }),
      curtain: new THREE.MeshStandardMaterial({ color: '#6b4c5a', roughness: 1, flatShading: true, side: THREE.DoubleSide }),
      metal: new THREE.MeshStandardMaterial({ color: '#c9ccd1', roughness: 0.5, flatShading: true }),
      shadow: new THREE.MeshBasicMaterial({ color: '#04060a', transparent: true, opacity: 0, depthWrite: false })
    };

    this.buildOutside();
    this.buildShell();
    this.buildFurniture();
    this.buildLightsOfHouse();
    this.buildFocos();
    this.buildSpook();
    this.buildFlashlight();
    this.buildHud();
    this.bindHold();

    this.controller.bounds = { minX: -30, maxX: 30, minZ: -30, maxZ: 30 };
    this.controller.cfg.walkSpeed = 3.2;
    this.controller.cfg.runSpeed = 5.2;
    this.controller.cfg.headBob = 0.04;
    this.controller.setPosition(0, 0.2, 7.2);
    this.controller.yaw = 0;
    this.controller.pitch = 0;

    // crujidos de madera al caminar, cada pocos pasos
    this.controller.on('step', () => {
      this.stepCount += 1;
      if (this.stepCount % 4 === 0) this.audio.play('creak', { volume: 0.1, rate: 0.55 + Math.random() * 0.3 });
    });

    this.setObjective(this.focos.length, '●');
    // solo para "Como se juega" desde pausa; al empezar no hay ventana
    this._intro = {
      eyebrow: 'La Casa',
      goal: 'Comprueba los cinco lugares que dan miedo',
      hint: 'Acércate, mantén pulsado y sostén la mirada sobre la sombra. Si se te va la vista, corrígela. Soltar no quita nada.',
      keys: [['W A S D', 'moverte'], ['Ratón', 'mirar'], ['E', 'mantener para comprobar'], ['ESC', 'pausa']],
      touch: [['Joystick', 'moverte'], ['Arrastra', 'mirar'], ['Mantener E', 'comprobar']],
      cta: 'Seguir'
    };
  }

  /** Suelo, unos arboles y el cielo: se ven por la puerta y la ventana */
  buildOutside() {
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(90, 90),
      new THREE.MeshStandardMaterial({ color: '#36493f', roughness: 1 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.02;
    this.scene.add(ground);

    const spots = [[11, 3], [13, -3], [-12, 6], [-11, -4], [4, 14], [-5, 15], [10, 12], [-10, 13], [15, 6], [-14, 1]];
    spots.forEach(([x, z], i) => {
      const tree = makeTree({ color: '#33604d', trunkColor: '#3a2d25', scale: 1.1 + (i % 3) * 0.25 });
      tree.position.set(x, 0, z);
      this.scene.add(tree);
    });
  }

  /** Pared axial con su colision */
  wall(x1, z1, x2, z2, { h = 3, t = 0.24, y = 0, mat = this.mats.wall } = {}) {
    const alongX = Math.abs(x2 - x1) > Math.abs(z2 - z1);
    const len = alongX ? Math.abs(x2 - x1) : Math.abs(z2 - z1);
    const geo = alongX ? new THREE.BoxGeometry(len, h, t) : new THREE.BoxGeometry(t, h, len);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set((x1 + x2) / 2, y + h / 2, (z1 + z2) / 2);
    this.scene.add(mesh);
    this.solid(mesh);
    return mesh;
  }

  /** Colision de caja a partir de una malla; devuelve el collider por si hay que quitarlo */
  solid(mesh, padding = 0) {
    // la caja se mide en mundo: hay que actualizar desde el ancestro mas alto
    let top = mesh;
    while (top.parent && top.parent !== this.scene) top = top.parent;
    top.updateMatrixWorld(true);
    _box.setFromObject(mesh);
    if (padding) _box.expandByScalar(padding);
    return this.controller.addCollider({ type: 'box', box: _box.clone() });
  }

  unsolid(collider) {
    const i = this.controller.colliders.indexOf(collider);
    if (i >= 0) this.controller.colliders.splice(i, 1);
  }

  box(w, h, d, mat, x, y, z, collide = true) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(x, y, z);
    this.scene.add(mesh);
    if (collide) this.solid(mesh);
    return mesh;
  }

  /** Planta: recibidor -> pasillo -> dormitorio (oeste) / salon (este) -> fondo */
  buildShell() {
    const floor = new THREE.Mesh(new THREE.BoxGeometry(17, 0.1, 14.6), this.mats.floor);
    floor.position.set(0, -0.05, 1.7);
    this.scene.add(floor);
    const ceil = new THREE.Mesh(new THREE.BoxGeometry(17, 0.1, 14.6), this.mats.ceil);
    ceil.position.set(0, 3.05, 1.7);
    this.scene.add(ceil);

    // recibidor
    this.wall(-2.6, 8.6, -0.7, 8.6);
    this.wall(0.7, 8.6, 2.6, 8.6);
    this.wall(-2.6, 8.6, -2.6, 3.4);
    this.wall(2.6, 8.6, 2.6, 6.7);
    this.wall(2.6, 5.3, 2.6, 3.4);
    this.wall(-2.6, 3.4, -1.3, 3.4);
    this.wall(1.3, 3.4, 2.6, 3.4);
    // cuarto de la lavadora (tras la puerta del sotano)
    this.wall(2.6, 7.4, 5.2, 7.4);
    this.wall(5.2, 7.4, 5.2, 4.6);
    this.wall(2.6, 4.6, 5.2, 4.6);
    // pasillo
    this.wall(-1.3, 3.4, -1.3, 1.2);
    this.wall(-1.3, -0.2, -1.3, -5.2);
    this.wall(1.3, 3.4, 1.3, 1.2);
    this.wall(1.3, -0.2, 1.3, -5.2);
    this.wall(-1.3, -5.2, 1.3, -5.2);
    // dormitorio
    this.wall(-8.2, -3.6, -1.3, -3.6);
    this.wall(-8.2, -3.6, -8.2, 2.6);
    this.wall(-8.2, 2.6, -1.3, 2.6);
    // salon (la pared este lleva la ventana)
    this.wall(1.3, -3.6, 8.2, -3.6);
    this.wall(1.3, 2.6, 8.2, 2.6);
    this.wall(8.2, -3.6, 8.2, -1.7);
    this.wall(8.2, 0.7, 8.2, 2.6);
    this.wall(8.2, -1.7, 8.2, 0.7, { h: 0.9 });
    this.wall(8.2, -1.7, 8.2, 0.7, { h: 0.6, y: 2.4 });
    // cristal de la ventana: se ve la rama y, al final, el amanecer
    this.glass = new THREE.Mesh(
      new THREE.PlaneGeometry(2.4, 1.5),
      new THREE.MeshStandardMaterial({
        color: '#8fa6d6', transparent: true, opacity: 0.22, roughness: 0.2,
        emissive: '#1a2440', emissiveIntensity: 0.4, side: THREE.DoubleSide, depthWrite: false
      })
    );
    this.glass.position.set(8.2, 1.65, -0.5);
    this.glass.rotation.y = -Math.PI / 2;
    this.scene.add(this.glass);

    // ventanas pequenas (opacas, solo luz) en recibidor y dormitorio
    this.smallWindows = [];
    [[-2.58, 1.9, 6.2, Math.PI / 2], [-8.18, 1.9, 0.2, Math.PI / 2]].forEach(([x, y, z, ry]) => {
      const w = new THREE.Mesh(
        new THREE.PlaneGeometry(1.1, 1.0),
        new THREE.MeshStandardMaterial({ color: '#28304a', emissive: '#1a2440', emissiveIntensity: 0.5 })
      );
      w.position.set(x, y, z);
      w.rotation.y = ry;
      this.scene.add(w);
      this.smallWindows.push(w);
    });

    // puerta principal: bisagra a la izquierda, se abre sola al final
    this.frontDoor = new THREE.Group();
    this.frontDoor.position.set(-0.7, 0, 8.6);
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.4, 0.12), this.mats.wood);
    leaf.position.set(0.7, 1.2, 0);
    this.frontDoor.add(leaf);
    this.scene.add(this.frontDoor);
    this.frontDoorCollider = this.solid(leaf, 0.05);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), this.mats.metal);
    knob.position.set(1.2, 1.15, -0.1);
    this.frontDoor.add(knob);
  }

  buildFurniture() {
    const m = this.mats;
    // dormitorio: cama alta contra la pared oeste (se ve el hueco de debajo), mesilla
    this.box(2.4, 0.5, 1.9, m.fabric, -6.8, 0.7, -1.6);           // colchon
    this.box(2.4, 0.1, 1.9, m.wood, -6.8, 0.42, -1.6, false);     // somier
    [[-7.9, -2.45], [-5.7, -2.45], [-7.9, -0.75], [-5.7, -0.75]].forEach(([x, z]) => this.box(0.1, 0.4, 0.1, m.wood, x, 0.2, z, false));
    this.box(0.2, 1.4, 1.9, m.wood, -7.95, 0.7, -1.6);            // cabecero
    this.box(0.7, 0.55, 0.5, m.wood, -7.75, 0.28, 0.1);           // mesilla
    const lampBase = this.box(0.12, 0.3, 0.12, m.metal, -7.75, 0.7, 0.1, false);
    this.lampShade = new THREE.Mesh(
      new THREE.ConeGeometry(0.22, 0.26, 8, 1, true),
      new THREE.MeshStandardMaterial({ color: '#e9d6b8', emissive: '#ffb56b', emissiveIntensity: 0, side: THREE.DoubleSide })
    );
    this.lampShade.position.set(-7.75, 0.98, 0.1);
    this.scene.add(this.lampShade);
    void lampBase;
    // armario hueco contra la pared norte del dormitorio: fondo, lados, techo y
    // suelo, con dos puertas. Dentro cabe lo que el miedo imagina.
    this.box(1.7, 2.4, 0.06, m.wood, -4.2, 1.2, -3.52, false);    // fondo
    this.box(0.06, 2.4, 0.7, m.wood, -5.02, 1.2, -3.2, false);    // lado
    this.box(0.06, 2.4, 0.7, m.wood, -3.38, 1.2, -3.2, false);    // lado
    this.box(1.7, 0.06, 0.7, m.wood, -4.2, 2.37, -3.2, false);    // techo
    this.box(1.7, 0.06, 0.7, m.wood, -4.2, 0.03, -3.2, false);    // suelo
    this.controller.addCollider({ type: 'box', box: new THREE.Box3(new THREE.Vector3(-5.05, 0, -3.56), new THREE.Vector3(-3.35, 2.4, -2.84)) });
    this.wardrobeDoors = [-1, 1].map((side) => {
      const hinge = new THREE.Group();
      hinge.position.set(-4.2 + side * 0.82, 0, -2.84);
      const panel = new THREE.Mesh(new THREE.BoxGeometry(0.78, 2.2, 0.06), m.dark);
      panel.position.set(-side * 0.39, 1.2, 0);
      hinge.add(panel);
      this.scene.add(hinge);
      return { hinge, side };
    });
    // salon: sofa, mesa baja, estanteria, cortina delante de la ventana
    this.box(2.2, 0.5, 0.9, m.fabric, 4.6, 0.35, 1.6);
    this.box(2.2, 0.5, 0.3, m.fabric, 4.6, 0.85, 2.0, false);
    this.box(1.1, 0.4, 0.6, m.wood, 4.6, 0.22, 0.1);
    this.box(0.4, 2.2, 1.6, m.wood, 1.65, 1.1, -2.4);
    this.curtain = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.5, 2.3), m.curtain);
    this.curtain.position.set(7.9, 1.55, -0.5);
    this.scene.add(this.curtain);
    this.curtainHome = -0.5;
    const rail = this.box(0.06, 0.06, 3.4, m.metal, 7.9, 2.85, -0.4, false);
    void rail;
    // aplique del salon (malla) y lamparas de techo
    this.sconce = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.25, 0.14),
      new THREE.MeshStandardMaterial({ color: '#e9d6b8', emissive: '#ffc98a', emissiveIntensity: 0 })
    );
    this.sconce.position.set(4.7, 2.3, -3.4);
    this.scene.add(this.sconce);
    this.ceilLamps = [[-4.7, -0.5], [0, -1]].map(([x, z]) => {
      const lamp = new THREE.Mesh(
        new THREE.CylinderGeometry(0.3, 0.36, 0.14, 10),
        new THREE.MeshStandardMaterial({ color: '#e9d6b8', emissive: '#ffd39a', emissiveIntensity: 0 })
      );
      lamp.position.set(x, 2.9, z);
      this.scene.add(lamp);
      return lamp;
    });
    // recibidor: perchero y reloj
    this.box(0.12, 1.8, 0.12, m.wood, -2.2, 0.9, 7.8);
    this.box(0.5, 0.5, 0.08, m.wood, -2.5, 2.2, 5.0, false);
    // puerta del sotano: bisagra en z=5.3, abre hacia dentro
    this.cellarDoor = new THREE.Group();
    this.cellarDoor.position.set(2.6, 0, 5.3);
    const cLeaf = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.4, 1.4), m.dark);
    cLeaf.position.set(0, 1.2, 0.7);
    this.cellarDoor.add(cLeaf);
    this.scene.add(this.cellarDoor);
    this.cellarCollider = this.solid(cLeaf, 0.05);
    // dentro: lavadora y una bombilla de escalera
    this.box(0.7, 0.9, 0.7, m.metal, 4.4, 0.45, 6.4);
    const drum = new THREE.Mesh(new THREE.CircleGeometry(0.24, 12), new THREE.MeshStandardMaterial({ color: '#3a4a5a', roughness: 0.3 }));
    drum.position.set(4.04, 0.5, 6.4);
    drum.rotation.y = -Math.PI / 2;
    this.scene.add(drum);
    this.washerLed = new THREE.Mesh(
      new THREE.SphereGeometry(0.04, 6, 6),
      new THREE.MeshBasicMaterial({ color: '#7dff9a' })
    );
    this.washerLed.position.set(4.04, 0.82, 6.15);
    this.scene.add(this.washerLed);
    this.box(0.5, 0.15, 2.0, m.wood, 3.1, 0.08, 6.0, false);   // primer peldano hacia abajo
    this.bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 8, 6),
      new THREE.MeshStandardMaterial({ color: '#fff2d0', emissive: '#ffe0b0', emissiveIntensity: 0 })
    );
    this.bulb.position.set(3.9, 2.7, 5.6);
    this.scene.add(this.bulb);
  }

  /** Las 5 luces existen desde el principio con intensidad 0 y solo se animan */
  /**
   * La figura que da miedo: una silueta alta y negra con ojos encendidos.
   * Aparece un instante tras cada descubrimiento y se disuelve con la
   * respiracion: el miedo que queda despues de mirar se calma respirando.
   */
  /**
   * Las criaturas que dan miedo: una distinta por lugar. Salen al instante
   * al descubrir y se disuelven con la respiracion. En el pasillo no hay
   * ninguna: alli lo que habia era el gato, y con eso basta.
   */
  buildSpook() {
    const mk = (body, eyes, glowColor) => {
      const g = new THREE.Group();
      const mat = new THREE.MeshBasicMaterial({ color: body, transparent: true, opacity: 0 });
      const eyeMat = new THREE.MeshBasicMaterial({ color: eyes, transparent: true, opacity: 0 });
      const glow = new THREE.PointLight(glowColor, 0, 7, 2);
      glow.position.set(0, 1.6, -0.9);
      g.add(glow);
      g.userData = { mat, eyeMat, glow, eyes: [] };
      g.visible = false;
      this.scene.add(g);
      return g;
    };
    const eye = (g, x, y, z, r = 0.05) => {
      const e = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), g.userData.eyeMat);
      e.position.set(x, y, z);
      g.add(e);
      g.userData.eyes.push(e);
    };
    this.spooks = {};

    // CAMA · lo que se arrastra: bajo, ancho, con patas finas y ojos amarillos
    {
      const g = mk('#07070c', '#ffd23b', '#8a6a1a');
      const { mat } = g.userData;
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.5, 10, 8), mat);
      body.scale.set(1.5, 0.55, 1);
      body.position.y = 0.32;
      g.add(body);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), mat);
      head.position.set(0, 0.42, 0.55);
      g.add(head);
      for (let i = 0; i < 6; i += 1) {
        const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 0.7, 3, 5), mat);
        const side = i % 2 ? 1 : -1;
        leg.position.set(side * 0.55, 0.3, -0.35 + Math.floor(i / 2) * 0.38);
        leg.rotation.z = side * 1.1;
        g.add(leg);
      }
      eye(g, -0.09, 0.5, 0.74, 0.045);
      eye(g, 0.09, 0.5, 0.74, 0.045);
      g.userData.kind = 'crawler';
      g.userData.sounds = ['rustle', 'growl'];
      this.spooks.cama = g;
    }

    // ARMARIO · la silueta alta con ojos rojos
    {
      const g = mk('#05060a', '#ff3b3b', '#5b6cff');
      const { mat } = g.userData;
      const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.34, 1.9, 4, 8), mat);
      body.position.y = 1.5;
      body.scale.set(1, 1.15, 0.7);
      g.add(body);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8), mat);
      head.position.y = 2.75;
      head.scale.set(0.9, 1.25, 0.9);
      g.add(head);
      [-0.32, 0.32].forEach((sx) => {
        const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 1.4, 3, 6), mat);
        arm.position.set(sx * 1.35, 1.35, 0.1);
        arm.rotation.z = sx > 0 ? 0.35 : -0.35;
        g.add(arm);
      });
      eye(g, -0.1, 2.8, 0.27, 0.045);
      eye(g, 0.1, 2.8, 0.27, 0.045);
      g.scale.setScalar(0.74);
      g.userData.kind = 'tall';
      g.userData.sounds = ['whoosh', 'growl'];
      this.spooks.armario = g;
    }

    // CORTINA · el de las ramas: oscuro (se recorta contra la ventana), con
    // brazos larguisimos de ramitas que se estiran hacia ti y ojos naranjas
    {
      const g = mk('#120c08', '#ff8a2a', '#ff7a2a');
      const { mat } = g.userData;
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.2, 2.2, 6), mat);
      trunk.position.y = 1.1;
      g.add(trunk);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), mat);
      head.position.set(0.05, 2.35, 0.05);
      head.scale.set(0.9, 1.4, 0.9);
      g.add(head);
      g.userData.arms = [];
      [-1, 1].forEach((side) => {
        const arm = new THREE.Group();
        arm.position.set(side * 0.22, 1.85, 0);
        const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 0.95, 3, 5), mat);
        upper.position.set(side * 0.5, -0.05, 0);
        upper.rotation.z = side * 1.45;
        arm.add(upper);
        // ramitas al final del brazo: los dedos, abiertos como garras
        for (let k = 0; k < 4; k += 1) {
          const twig = new THREE.Mesh(new THREE.CapsuleGeometry(0.018, 0.4, 2, 4), mat);
          twig.position.set(side * 1.12, -0.1 + k * 0.1, -0.12 + k * 0.1);
          twig.rotation.z = side * (0.7 + k * 0.45);
          twig.rotation.x = -0.7 + k * 0.5;
          arm.add(twig);
        }
        g.add(arm);
        g.userData.arms.push({ group: arm, side });
      });
      eye(g, -0.08, 2.42, 0.19, 0.05);
      eye(g, 0.08, 2.42, 0.19, 0.05);
      g.scale.setScalar(0.85);
      g.userData.kind = 'twig';
      g.userData.sounds = ['rustle', 'growl'];
      this.spooks.cortina = g;
    }

    // SOTANO · la bestia: enorme, encorvada, con cuernos y ojos verdes
    {
      const g = mk('#0a0806', '#5cff7a', '#2fbf5a');
      const { mat } = g.userData;
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.75, 12, 10), mat);
      body.scale.set(1.5, 1.05, 1);
      body.position.y = 1.05;
      g.add(body);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.4, 10, 8), mat);
      head.position.set(0, 1.85, 0.45);
      g.add(head);
      [-0.28, 0.28].forEach((sx) => {
        const horn = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.5, 6), mat);
        horn.position.set(sx, 2.25, 0.4);
        horn.rotation.z = sx > 0 ? -0.5 : 0.5;
        g.add(horn);
        const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 1.1, 3, 6), mat);
        arm.position.set(sx * 3.6, 0.9, 0.3);
        arm.rotation.z = sx > 0 ? 0.25 : -0.25;
        g.add(arm);
      });
      eye(g, -0.14, 1.9, 0.8, 0.06);
      eye(g, 0.14, 1.9, 0.8, 0.06);
      g.userData.kind = 'beast';
      g.userData.sounds = ['rumble', 'growl'];
      this.spooks.sotano = g;
    }

    this.breathPause = new BreathPause(this);
  }

  /** Tras descubrir: aparece la figura, y enseguida el espacio de respiracion la disuelve */
  /** Al descubrir: la criatura del lugar sale al instante; respirar la disuelve */
  spookAndBreathe(f, last) {
    if (this.finished) return;
    const g = this.spooks[f.id] ?? null;      // en el pasillo no hay criatura: solo el gato
    this.breathPausing = true;
    this.holding = false;
    this.controller.frozen = true;

    if (g) {
      const { mat, eyeMat, glow } = g.userData;
      const maxOp = g.userData.maxOpacity ?? 0.96;
      // donde estaba la sombra, a unos 2 m del jugador y sin pasar mas alla
      const p = this.controller.position;
      const ax = f.anchor.position.x;
      const az = f.anchor.position.z;
      const dx = p.x - ax;
      const dz = p.z - az;
      const d = Math.hypot(dx, dz) || 1;
      // en la ventana la pared esta justo detras de la cortina: la criatura se
      // queda dentro del salon, delante de ella (si no, nace fuera y no se ve)
      const dist = f.curtain ? Math.max(1.5, d - 0.2) : Math.min(2.2, d + 0.4);
      g.position.set(p.x - (dx / d) * dist, p.y, p.z - (dz / d) * dist);
      g.lookAt(p.x, p.y, p.z);
      g.visible = true;
      mat.opacity = maxOp;               // de una: sin espera ni fundido
      eyeMat.opacity = 1;
      glow.intensity = 2.4;
      this.spook = g;
      this.spookAlive = true;
      this.spookT = 0;
      const [s1, s2] = g.userData.sounds;
      this.audio.play(s1, { volume: 0.55 });
      this.later(() => this.audio.play(s2, { volume: 0.7, rate: g.userData.kind === 'beast' ? 0.7 : 1 }), 120);
      this.later(() => this.audio.play('heartbeat', { volume: 0.6 }), 380);
      this.feedback.shakeCamera(0.24, 2.2);
      this.say('¡ALGO SE ACERCA!', 1400);
    } else {
      this.spook = null;
      this.audio.playAt('purr', this.cat, { volume: 0.5, refDistance: 3 });
      this.say('SOLO ERA EL GATO', 1600);
    }

    const finishPause = () => {
      if (g) {
        this.feedback.burst(g.position.clone().add(new THREE.Vector3(0, 1.4, 0)), { count: 24, color: '#3a3f5a', speed: 1.8, life: 1.1, size: 0.8, gravity: 0.3 });
        g.visible = false;
        this.spookAlive = false;
        this.spook = null;
      }
      this.breathPausing = false;
      this.audio.play('warm', { volume: 0.4 });
      this.say(g ? 'EL MIEDO BAJÓ' : 'TRANQUILO', 2200);
      this.calmUntil = this.time + 4;
      if (last) this.later(() => this.dawnHouse(), 1400);
    };

    this.later(() => {
      if (this.finished) return;
      this.breathPause.run({
        cycles: 1,
        title: g ? 'Respira para calmar el miedo' : 'Respira con el gato',
        subtitle: g ? 'La criatura se desvanece con cada respiración' : 'Solo era el gato: respira y sigue',
        onProgress: (k) => {
          if (g) {
            const { mat, eyeMat, glow } = g.userData;
            mat.opacity = (g.userData.maxOpacity ?? 0.96) * (1 - k);
            eyeMat.opacity = 1 - k;
            glow.intensity = 2.4 * (1 - k);
          }
          this.music?.setIntensity(0.9 * (1 - k));
        }
      }).then(finishPause);
    }, g ? 1400 : 500);
  }

  buildLightsOfHouse() {
    const def = [
      ['#ffb56b', -7.6, 1.1, 0.1, 7],     // lampara de la mesilla
      ['#ffd39a', -4.7, 2.6, -0.5, 9],    // luz del dormitorio
      ['#ffc98a', 4.7, 2.2, -3.0, 9],     // aplique del salon
      ['#ffd6a8', 0, 2.6, -1.0, 9],       // luz del pasillo
      ['#ffe0b0', 3.9, 2.5, 5.6, 6]       // luz de la escalera
    ];
    this.houseLights = def.map(([color, x, y, z, dist]) => {
      const light = new THREE.PointLight(color, 0, dist, 2);
      light.position.set(x, y, z);
      this.scene.add(light);
      return light;
    });
    this.lightMeshes = [this.lampShade, this.ceilLamps[0], this.sconce, this.ceilLamps[1], this.bulb];
  }

  /** Sombra imaginada: forma vaga, nunca un rostro */
  shadowBlob(x, y, z, sx, sy, sz) {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.5, 10, 8), this.mats.shadow.clone());
    mesh.position.set(x, y, z);
    mesh.scale.set(sx, sy, sz);
    mesh.userData.base = new THREE.Vector3(sx, sy, sz);
    mesh.renderOrder = 2;
    mesh.visible = false;
    this.scene.add(mesh);
    return mesh;
  }

  buildFocos() {
    const m = this.mats;

    // 1 · debajo de la cama -> caja de juguetes y una pelota
    const toys = new THREE.Group();
    const toyBox = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.32, 0.5), new THREE.MeshStandardMaterial({ color: '#c25e5e', roughness: 0.8, flatShading: true }));
    toyBox.position.set(-6.2, 0.16, -1.9);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), new THREE.MeshStandardMaterial({ color: '#e9c46a', roughness: 0.6 }));
    ball.position.set(-5.9, 0.16, -1.1);
    toys.add(toyBox, ball);
    this.addFoco({
      id: 'cama',
      anchor: [-5.5, 0.3, -1.6],
      stand: [-4.6, -1.6],
      shadow: this.shadowBlob(-5.6, 0.24, -1.6, 1.0, 0.4, 1.1),
      real: toys,
      light: 0,
      sound: 'scratch',
      crouch: true
    });

    // 2 · dentro del armario -> un abrigo largo y una percha suelta
    const coat = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.55, 1.5, 0.22), new THREE.MeshStandardMaterial({ color: '#4a3a5c', roughness: 1, flatShading: true }));
    body.position.set(-4.2, 1.35, -3.2);
    const hook = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.02, 6, 12), m.metal);
    hook.position.set(-4.2, 2.18, -3.2);
    const loose = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.02, 6, 12), m.metal);
    loose.position.set(-3.7, 0.06, -3.05);
    loose.rotation.x = Math.PI / 2;
    coat.add(body, hook, loose);
    this.addFoco({
      id: 'armario',
      anchor: [-4.2, 1.3, -2.9],
      stand: [-4.2, -1.6],
      shadow: this.shadowBlob(-4.2, 1.25, -2.78, 0.7, 1.7, 0.35),
      real: coat,
      light: 1,
      sound: 'rub',
      doors: true
    });

    // 3 · detras de la cortina -> una rama contra el cristal (gira desde su
    // union con el arbol, fuera de la ventana)
    const branch = new THREE.Group();
    branch.position.set(9.4, 2.6, -0.6);
    const limb = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.09, 2.2, 6), new THREE.MeshStandardMaterial({ color: '#4a3626', roughness: 1, flatShading: true }));
    limb.rotation.z = 0.9;
    limb.rotation.y = 0.3;
    limb.position.set(-0.4, -0.7, 0);
    const leafMat = new THREE.MeshStandardMaterial({ color: '#3f6b3a', roughness: 1, flatShading: true });
    [[-0.85, -1.05, 0.3], [-0.7, -1.25, -0.3], [-0.95, -0.75, -0.2]].forEach(([x, y, z]) => {
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.2, 6, 5), leafMat);
      leaf.position.set(x, y, z);
      branch.add(leaf);
    });
    branch.add(limb);
    this.addFoco({
      id: 'cortina',
      anchor: [7.9, 1.5, -0.5],
      stand: [6.2, -0.5],
      shadow: this.shadowBlob(7.8, 1.45, -0.5, 0.32, 1.5, 0.55),
      real: branch,
      light: 2,
      sound: 'glassTap',
      curtain: true
    });

    // 4 · el pasillo oscuro -> el gato de la casa
    const cat = new THREE.Group();
    const catMat = new THREE.MeshStandardMaterial({ color: '#3b3b44', roughness: 1, flatShading: true });
    const catBody = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), catMat);
    catBody.scale.set(1.5, 1, 1);
    catBody.position.y = 0.25;
    const catHead = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 8), catMat);
    catHead.position.set(0.32, 0.4, 0);
    const earGeo = new THREE.ConeGeometry(0.05, 0.1, 4);
    const ear1 = new THREE.Mesh(earGeo, catMat); ear1.position.set(0.34, 0.54, 0.07);
    const ear2 = new THREE.Mesh(earGeo, catMat); ear2.position.set(0.34, 0.54, -0.07);
    const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.02, 0.5, 5), catMat);
    tail.position.set(-0.36, 0.42, 0);
    tail.rotation.z = 0.7;
    const eyeMat = new THREE.MeshBasicMaterial({ color: '#c9f5a0' });
    const eye1 = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 6), eyeMat); eye1.position.set(0.45, 0.43, 0.06);
    const eye2 = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 6), eyeMat); eye2.position.set(0.45, 0.43, -0.06);
    cat.add(catBody, catHead, ear1, ear2, tail, eye1, eye2);
    cat.position.set(0, 0, -4.6);
    cat.rotation.y = -Math.PI / 2;   // la cabeza (local +x) mira al pasillo
    this.cat = cat;
    this.addFoco({
      id: 'pasillo',
      anchor: [0, 0.5, -4.5],
      stand: [0, -2.2],
      shadow: this.shadowBlob(0, 0.55, -4.7, 0.8, 1.1, 0.8),
      real: cat,
      light: 3,
      sound: 'step',
      approach: true
    });

    // 5 · la puerta del sotano -> la lavadora terminando el ciclo
    const washer = new THREE.Group();   // la lavadora ya esta construida: el grupo marca "revelado"
    this.addFoco({
      id: 'sotano',
      anchor: [2.6, 1.2, 6.0],
      stand: [1.0, 6.0],
      shadow: this.shadowBlob(2.5, 1.2, 6.0, 0.35, 1.6, 0.7),
      real: washer,
      light: 4,
      sound: 'metal',
      cellar: true
    });
  }

  addFoco(def) {
    const anchor = new THREE.Object3D();
    anchor.position.set(...def.anchor);
    this.scene.add(anchor);
    def.real.visible = false;
    this.scene.add(def.real);

    const foco = {
      ...def,
      anchor,
      state: 'idle',       // idle · near · checking · revealed
      progress: 0,
      fails: 0,
      tier: 0,
      closeness: 0,
      nextSound: 1 + Math.random() * 2,
      sinceLost: 9,
      driftDir: 1,
      driftClock: 0
    };
    foco.interactable = this.interactable({
      object: anchor,
      radius: 2.6,
      icon: '👁',
      label: 'Mirar',
      requireLook: true,
      onInteract: () => {
        // ya revelado: volver a mirar y no pasa nada. Eso es la leccion.
        if (foco.state === 'revealed') {
          this.audio.play('interact', { volume: 0.2, rate: 0.9 });
          this.feedback.burst(foco.anchor.position, { count: 5, color: '#ffe9c8', speed: 0.8, life: 0.6, size: 0.5, gravity: -0.5 });
        }
      }
    });
    this.focos.push(foco);
    return foco;
  }

  buildFlashlight() {
    this.torch = new THREE.SpotLight(COLD.torch, 6, 18, Math.PI / 5.5, 0.55, 1.1);
    this.torch.position.set(0, 0, 0);
    this.camera.add(this.torch);
    this.torch.target.position.set(0, -0.22, -1);
    this.camera.add(this.torch.target);
    this.scene.add(this.camera);
    this.halo = new THREE.PointLight('#9dc0ff', 0.5, 6, 1.6);
    this.camera.add(this.halo);
  }

  buildHud() {
    this.vignette = document.createElement('div');
    this.vignette.className = 'fh-vignette';
    this.root.appendChild(this.vignette);

    this.reticle = document.createElement('div');
    this.reticle.className = 'fh-reticle';
    this.reticle.innerHTML = `
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <circle class="fh-ring" cx="32" cy="32" r="24"></circle>
        <circle class="fh-arc" cx="32" cy="32" r="24"></circle>
        <circle class="fh-dot" cx="32" cy="32" r="2.6"></circle>
      </svg>`;
    this.root.appendChild(this.reticle);
    this._hud = { v: -1, open: -1, p: -1 };
  }

  /* ================================================================ input */

  bindHold() {
    const down = () => { this.holding = true; };
    const up = () => { this.holding = false; };
    const canvas = this.renderer.domElement;
    const pointerDown = (e) => { if (e.pointerType === 'mouse' && e.button === 0) down(); };
    const pointerUp = (e) => { if (e.pointerType === 'mouse') up(); };
    canvas.addEventListener('pointerdown', pointerDown);
    window.addEventListener('pointerup', pointerUp);
    window.addEventListener('pointercancel', pointerUp);
    const isHoldKey = (e) => e.key === 'e' || e.key === 'E';
    const keyDown = (e) => { if (isHoldKey(e) && !e.repeat) down(); };
    const keyUp = (e) => { if (isHoldKey(e)) up(); };
    window.addEventListener('keydown', keyDown);
    window.addEventListener('keyup', keyUp);
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

  /* ================================================================ inicio */

  onStart() {
    // no hay ventana de instrucciones: el primer foco es el tutorial
    this.audio.setEnabled(gameState.settings.sound);
    this.audio.ctx?.resume?.();
    this.wind = this.audio.ambient('wind', { volume: 0.16, rate: 0.7 });
    this.music = new MysteryMusic(this.audio);
    this.music.start();
    this.music.setVolume(0.3, 0.1);
    this.music.setIntensity(0.1);
  }

  /* =============================================================== update */

  onUpdate(dt) {
    this.time += dt;
    const p = this.controller.position;
    const gentle = this.gentle ? 0.35 : 1;

    // direccion de la mirada antes de anadir el balanceo de este frame
    this.camera.getWorldDirection(_dir);

    // cercania a cada foco sin revelar: manda la sombra, el latido y la vineta
    let tension = 0;
    for (let i = 0; i < this.focos.length; i += 1) {
      const f = this.focos[i];
      if (f.state === 'revealed') { this.updateReal(f, dt); continue; }
      const d = Math.hypot(f.anchor.position.x - p.x, f.anchor.position.z - p.z);
      f.closeness = Math.max(0, Math.min(1, 1 - (d - 1.4) / 4.6));
      if (f.state !== 'checking') f.state = f.closeness > 0 ? 'near' : 'idle';
      this.updateShadow(f, dt);
      this.updateCue(f, dt);
      if (f.closeness > tension) tension = f.closeness;
    }
    if (this.checking) tension = 1;
    if (this.time < this.calmUntil) tension = 0;
    this.tension += (tension - this.tension) * Math.min(1, dt * 3);

    if (this.spookAlive && this.spook) {
      this.spookT += dt;
      const g = this.spook;
      const kind = g.userData.kind;
      const base = this.controller.position.y;
      if (kind === 'ghost') {
        g.position.y = base + 0.25 + Math.sin(this.time * 2.4) * 0.18;
        g.rotation.z = Math.sin(this.time * 1.7) * 0.12;
      } else if (kind === 'crawler') {
        g.position.y = base + Math.abs(Math.sin(this.time * 14)) * 0.05;
        g.rotation.y += Math.sin(this.time * 6) * 0.02;
      } else if (kind === 'twig') {
        // los brazos se estiran hacia ti, despacio, con un temblor de ramas
        const reach = Math.min(1, this.spookT / 1.4);
        g.userData.arms.forEach(({ group, side }) => {
          group.rotation.y = side * (0.5 - reach * 1.5) + Math.sin(this.time * 7 + side) * 0.03;
          group.rotation.x = -0.15 - reach * 0.3;
        });
        g.position.y = base + Math.sin(this.time * 1.6) * 0.04;
      } else if (kind === 'beast') {
        const b = 1 + Math.sin(this.time * 3) * 0.04;
        g.scale.set(b, 1 / b, b);
        g.position.y = base;
      } else {
        g.rotation.y += Math.sin(this.time * 1.3) * 0.004;
        g.position.y = base + Math.sin(this.time * 2.1) * 0.06;
      }
      const blink = Math.sin(this.time * 9) > 0.92 ? 0.2 : 1;
      g.userData.eyes.forEach((e) => { e.scale.setScalar(blink); });
    }
    if (!this.breathPausing) this.updateChecking(dt);

    // latido: el indicador principal de estado
    if (this.tension > 0.08 && !this.leaving) {
      this.nextBeat -= dt;
      if (this.nextBeat <= 0) {
        this.nextBeat = 1.25 - this.tension * 0.75;
        this.audio.play('heartbeat', { volume: (0.18 + this.tension * 0.42) * gentle });
      }
    }
    this.music?.setIntensity(this.leaving ? 0 : this.tension * 0.55);

    // balanceo y temblor de imagen con la tension (aditivo: el controlador
    // vuelve a fijar la camara cada frame)
    const sway = this.tension * 0.014 * gentle;
    this.camera.rotateZ(Math.sin(this.time * 1.7) * sway);
    this.camera.position.y += Math.sin(this.time * 2.3) * this.tension * 0.02 * gentle;
    if (this.checking) {
      const tier = TIERS[this.effectiveTier(this.checking)];
      if (tier.tremor) {
        this.camera.position.x += (Math.random() - 0.5) * tier.tremor * gentle;
        this.camera.position.y += (Math.random() - 0.5) * tier.tremor * gentle;
      }
    }

    // ambiente: reloj lejano y goteo
    this.nextClock -= dt;
    if (this.nextClock <= 0) { this.nextClock = 1; this.audio.play('clock', { volume: 0.05 }); }
    this.nextDrip -= dt;
    if (this.nextDrip <= 0) {
      this.nextDrip = 4 + Math.random() * 5;
      this.audio.playAt('drip', this.focos[4].anchor, { volume: 0.18, refDistance: 3 });
    }

    // luces encendidas: respiran apenas
    for (let i = 0; i < this.houseLights.length; i += 1) {
      const l = this.houseLights[i];
      if (l.userData.on) l.intensity = l.userData.target + Math.sin(this.time * 2.2 + i) * 0.08;
    }
    this.washerLed.material.color.setHSL(0.36, 1, 0.5 + Math.sin(this.time * 4) * 0.15);

    // la rama se mece siempre; golpea el cristal de vez en cuando
    const branch = this.focos[2].real;
    branch.rotation.z = Math.sin(this.time * 1.3) * 0.06;

    // salida: la puerta esta abierta y el jugador cruza el umbral
    if (this.exitArmed && !this.leaving && p.z > 9.7) this.leaveHouse();

    this.renderHud();
  }

  updateShadow(f, dt) {
    const s = f.shadow;
    const base = s.userData.base;
    const grow = f.closeness * (1 - f.progress * 0.88);
    const breathe = 1 + Math.sin(this.time * 1.4 + f.light) * 0.05;
    const k = (0.35 + 0.65 * grow) * breathe;
    s.scale.set(base.x * k, base.y * k, base.z * k);
    s.material.opacity += ((f.closeness > 0 ? 0.82 * grow : 0) - s.material.opacity) * Math.min(1, dt * 4);
    s.visible = s.material.opacity > 0.01;
    // en el pasillo, "algo" se acerca despacio mientras miras
    if (f.approach) {
      const target = -4.7 + f.closeness * 0.7;
      s.position.z += (target - s.position.z) * Math.min(1, dt * 0.6);
    }
  }

  /** Senales de anticipacion: sonido y un movimiento leve del lugar */
  updateCue(f, dt) {
    if (f.closeness <= 0.05) return;
    f.nextSound -= dt;
    if (f.nextSound <= 0) {
      f.nextSound = 4.5 + Math.random() * 3;
      const vol = f.sound === 'step' ? 0.22 : 0.32;
      this.audio.playAt(f.sound, f.anchor, { volume: vol * (0.4 + f.closeness * 0.6), refDistance: 3 });
      if (f.sound === 'glassTap') this.later(() => this.audio.playAt('glassTap', f.anchor, { volume: 0.25, refDistance: 3 }), 260);
      if (f.sound === 'step') this.later(() => this.audio.playAt('step', f.anchor, { volume: 0.2, refDistance: 3 }), 420);
    }
    const wobble = Math.sin(this.time * 9) * 0.02 * f.closeness;
    if (f.state !== 'checking') {
      if (f.doors) this.wardrobeDoors.forEach(({ hinge, side }) => { hinge.rotation.y = side * Math.max(0, wobble); });
      if (f.cellar) this.cellarDoor.rotation.y = Math.max(0, wobble);
      if (f.curtain) this.curtain.position.z = this.curtainHome + Math.sin(this.time * 2.1) * 0.05 * f.closeness;
    }
  }

  updateReal(f, dt) {
    if (f.id === 'pasillo') {
      // el gato viene a rozarte y se queda cerca
      const p = this.controller.position;
      const dx = p.x - this.cat.position.x;
      const dz = p.z - this.cat.position.z;
      const d = Math.hypot(dx, dz);
      if (d > 0.9) {
        this.cat.position.x += (dx / d) * dt * 1.1;
        this.cat.position.z += (dz / d) * dt * 1.1;
        this.cat.rotation.y = Math.atan2(-dz, dx);
        this.cat.position.y = Math.abs(Math.sin(this.time * 8)) * 0.02;
      }
      f.purrClock = (f.purrClock ?? 0) - dt;
      if (f.purrClock <= 0 && d < 1.6) {
        f.purrClock = 2.2;
        this.audio.playAt('purr', this.cat, { volume: 0.3, refDistance: 2 });
      }
    }
  }

  /* ====================================================== sostener la mirada */

  effectiveTier(f) {
    return Math.max(0, f.tier - Math.floor(f.fails / 3));
  }

  aimedAt(f) {
    _to.copy(f.anchor.position).sub(this.camera.position).normalize();
    return _dir.dot(_to) > 0.965;   // ~15 grados
  }

  updateChecking(dt) {
    const active = this.interactables.active;
    const f = this.checking;

    if (!f) {
      // empieza al mantener con un foco al alcance y a la vista
      if (this.holding && active) {
        const target = this.focos.find((x) => x.interactable === active && x.state !== 'revealed');
        if (target) this.startChecking(target);
      }
      // los arcos a medias se vacian despacio
      for (let i = 0; i < this.focos.length; i += 1) {
        const x = this.focos[i];
        if (x.state !== 'revealed' && x.progress > 0) x.progress = Math.max(0, x.progress - dt * 0.5);
      }
      return;
    }

    if (!this.holding) { this.stopChecking(false); return; }

    const tier = TIERS[this.effectiveTier(f)];
    let drift = tier.drift * (this.touchLike ? 0.7 : 1);
    if (tier.alternate > 0) {
      f.driftClock += dt;
      if (f.driftClock >= tier.alternate) { f.driftClock = 0; f.driftDir *= -1; }
    } else if (tier.alternate < 0) {
      f.driftClock -= dt;
      if (f.driftClock <= 0) { f.driftClock = 0.6 + Math.random() * 0.5; f.driftDir = Math.random() < 0.5 ? -1 : 1; }
    }
    // el impulso de apartar la vista: la camara se va sola, el jugador corrige
    this.controller.yaw += drift * f.driftDir * dt;

    if (this.aimedAt(f)) {
      f.sinceLost += dt;
      f.progress = Math.min(1, f.progress + dt / tier.duration);
      this.reticle.classList.remove('is-lost');
      if (f.progress >= 1) { this.reveal(f); return; }
    } else {
      // la reticula se salio: el arco se vacia suave y la sombra vuelve
      const was = f.progress;
      f.progress = Math.max(0, f.progress - dt * 0.55);
      this.reticle.classList.add('is-lost');
      if (was > 0.15 && f.sinceLost > 1.5) { f.sinceLost = 0; this.softFail(f); }
    }
    this.animateOpening(f, f.progress > 0 ? 1 : 0, dt);
  }

  startChecking(f) {
    this.checking = f;
    f.state = 'checking';
    f.driftClock = 0;
    f.driftDir = Math.random() < 0.5 ? -1 : 1;
    f.tier = this.revealed;   // el orden de comprobacion marca la dificultad
    this.controller.frozen = true;
    this.audio.duck(0.35);
    this.reticle.classList.add('is-checking');
    if (f.crouch) this.feedback.tweenValue(this.controller.cfg, 'eyeHeight', 0.85, 0.5);
    if (f.doors || f.cellar) this.audio.play('creak', { volume: 0.35, rate: 0.7 });
    if (f.curtain) this.audio.play('rub', { volume: 0.3 });
  }

  stopChecking(revealed) {
    const f = this.checking;
    if (!f) return;
    this.checking = null;
    this.controller.frozen = false;
    this.audio.unduck();
    this.reticle.classList.remove('is-checking', 'is-lost');
    if (f.crouch) this.feedback.tweenValue(this.controller.cfg, 'eyeHeight', 1.5, 0.5);
    if (revealed) return;
    f.state = 'near';
    if (f.progress > 0.15) this.softFail(f);
  }

  softFail(f) {
    f.fails += 1;
    this.audio.play('lowNote', { volume: 0.32 });
  }

  /** Abrir armario / correr cortina / abrir la puerta del sotano al comprobar */
  animateOpening(f, open, dt) {
    const k = Math.min(1, dt * 3);
    if (f.doors) this.wardrobeDoors.forEach(({ hinge, side }) => { hinge.rotation.y += (side * 1.55 * open - hinge.rotation.y) * k; });
    if (f.cellar) this.cellarDoor.rotation.y += (1.6 * open - this.cellarDoor.rotation.y) * k;
    if (f.curtain) this.curtain.position.z += ((this.curtainHome + 1.35 * open) - this.curtain.position.z) * k;
  }

  /* ============================================================ revelacion */

  reveal(f) {
    this.stopChecking(true);
    f.state = 'revealed';
    f.progress = 1;
    f.interactable.label = 'Mirar';
    // la sombra se disuelve en particulas y aparece lo que habia de verdad
    this.feedback.burst(f.shadow.position, { count: 26, color: '#3a3f5a', speed: 1.6, life: 1.1, size: 0.8, gravity: 0.4 });
    f.shadow.visible = false;
    f.shadow.material.opacity = 0;
    f.real.visible = true;
    this.animateOpening(f, 1, 10);
    if (f.cellar) this.unsolid(this.cellarCollider);

    this.audio.play('warm', { volume: 0.55 });
    if (f.id === 'pasillo') this.later(() => this.audio.playAt('meow', this.cat, { volume: 0.4, refDistance: 3 }), 500);
    if (f.id === 'sotano') this.later(() => this.audio.playAt('hum', f.anchor, { volume: 0.35, refDistance: 3 }), 300);
    if (f.id === 'cama') this.later(() => this.audio.play('interact', { volume: 0.25, rate: 0.8 }), 400);
    this.calmUntil = this.time + 4;   // el pulso baja de golpe
    this.nextBeat = 2;

    // se enciende una luz de la casa: de azul frio a ambar
    const light = this.houseLights[f.light];
    light.userData.on = true;
    light.userData.target = 2.6;
    this.feedback.tweenValue(light, 'intensity', 2.6, 1.4);
    this.feedback.tweenValue(this.lightMeshes[f.light].material, 'emissiveIntensity', 1.6, 1.2);
    this.feedback.flash(light.position, { color: light.color.getStyle(), intensity: 2, duration: 1.2, distance: 8 });

    this.revealed += 1;
    this.advanceObjective();
    this.applyPalette(this.revealed / this.focos.length);
    const last = this.revealed >= this.focos.length;
    this.spookAndBreathe(f, last);
  }

  /** Mezcla frio -> calido segun cuantas luces hay encendidas */
  applyPalette(k, seconds = 2.5) {
    const mix = (a, b) => new THREE.Color(a).lerp(new THREE.Color(b), k).getStyle();
    this.feedback.tweenColor(this.scene.fog.color, mix(COLD.fog, WARM.fog), seconds);
    this.feedback.tweenColor(this.hemi.color, mix(COLD.sky, WARM.sky), seconds);
    this.feedback.tweenColor(this.hemi.groundColor, mix(COLD.ground, WARM.ground), seconds);
    this.feedback.tweenValue(this.hemi, 'intensity', COLD.hemi + (WARM.hemi - COLD.hemi) * k, seconds);
    this.feedback.tweenColor(this.torch.color, mix(COLD.torch, WARM.torch), seconds);
    this.feedback.tweenValue(this.renderer, 'toneMappingExposure', COLD.exposure + (WARM.exposure - COLD.exposure) * k, seconds);
  }

  /* ================================================================ cierre */

  dawnHouse() {
    this.say('YA NO DA TANTO MIEDO', 3000);
    this.wind?.setVolume(0, 2);
    this.music?.setVolume(0, 3);
    this.later(() => this.music?.stop(), 3200);
    this.audio.play('dawnPad', { volume: 0.5 });
    this.birdClock = 0;
    const birds = () => {
      if (this.finished) return;
      this.audio.play('bird', { volume: 0.25, rate: 0.9 + Math.random() * 0.3 });
      this.later(birds, 1800 + Math.random() * 2600);
    };
    this.later(birds, 1200);

    // entra luz de amanecer: cielo, ventanas y sol
    this.sky.userData.setColors('#5b7fa8', '#f0c08a');
    this.feedback.tweenColor(this.scene.fog.color, '#cfb79b', 5);
    this.feedback.tweenValue(this.scene.fog, 'density', 0.02, 5);
    this.feedback.tweenValue(this.sun, 'intensity', 1.3, 5);
    this.feedback.tweenValue(this.hemi, 'intensity', 1.15, 5);
    this.feedback.tweenColor(this.hemi.color, '#ffd9a8', 5);
    this.feedback.tweenColor(this.glass.material.emissive, '#ffd9a8', 4);
    this.feedback.tweenValue(this.glass.material, 'emissiveIntensity', 1.4, 4);
    this.smallWindows.forEach((w) => {
      this.feedback.tweenColor(w.material.emissive, '#ffe6b0', 4);
      this.feedback.tweenValue(w.material, 'emissiveIntensity', 2.2, 4);
    });
    this.feedback.tweenValue(this.torch, 'intensity', 1.5, 4);

    // la puerta principal se abre sola, despacio
    this.later(() => {
      this.doorOpen = true;
      this.audio.play('creak', { volume: 0.45, rate: 0.6 });
      this.feedback.tweenValue(this.frontDoor.rotation, 'y', -1.9, 2.6);
      this.unsolid(this.frontDoorCollider);
      this.exitArmed = true;
    }, 2200);
  }

  leaveHouse() {
    this.leaving = true;
    this.say('¡LO LOGRASTE!', 2600);
    this.feedback.burst(this.controller.position.clone().add(new THREE.Vector3(0, 1.6, -1)), {
      count: 30, color: '#ffe9c8', speed: 2.4, life: 1.4, gravity: -0.6
    });
    this.audio.play('success', { volume: 0.5 });
    this.later(() => this.finish(), 2400);
  }

  get completionPayload() {
    return {
      islandId: 'fear',
      success: true,
      emoAventura: true,
      badge: 'fear',
      title: 'Isla del Miedo',
      message: 'Cruzaste el bosque a tu ritmo y comprobaste, uno a uno, los lugares que daban miedo en la casa.'
    };
  }

  finish() {
    if (this.finished || this.closing) return;
    this.closing = true;
    this.controller.frozen = true;
    this.controller.exitPointerLock();
    this.onLevelDone?.();
    this.showClosingCard({
      title: 'Mirar dentro de la oscuridad',
      lines: [
        ...(this.forestReflections.length ? ['Del bosque te llevaste esto:'] : []),
        ...this.forestReflections.map((r) => `<strong>${r.title}.</strong> ${r.text}`),
        ...(this.forestReflections.length ? ['Y de la casa:'] : []),
        ...HOUSE_REFLECTIONS.map((r) => `<strong>${r.title}.</strong> ${r.text}`)
      ],
      onDone: () => super.finish()
    });
  }

  /* =================================================================== HUD */

  renderHud() {
    const gentle = this.gentle ? 0.35 : 1;
    const v = Math.round(Math.min(1, this.tension * 0.9) * gentle * 40) / 40;
    if (v !== this._hud.v) { this._hud.v = v; this.vignette.style.setProperty('--v', v); }
    const open = Math.round(this.tension * 20) / 20;
    if (open !== this._hud.open) { this._hud.open = open; this.reticle.style.setProperty('--open', open); }
    let p = 0;
    if (this.checking) p = this.checking.progress;
    else for (let i = 0; i < this.focos.length; i += 1) {
      const f = this.focos[i];
      if (f.state !== 'revealed' && f.progress > p) p = f.progress;
    }
    p = Math.round(p * 100) / 100;
    if (p !== this._hud.p) { this._hud.p = p; this.reticle.style.setProperty('--p', p); }
  }

  /** Pausa con "modo suave": menos temblor, vineta y latido. Se cambia a mitad de partida. */
  _showPauseMenu() {
    super._showPauseMenu();
    const actions = this.el.overlay.querySelector('.i3d-panel__actions');
    if (!actions) return;
    const btn = document.createElement('button');
    btn.className = 'i3d-btn';
    btn.type = 'button';
    const label = () => `Modo suave: ${this.gentle ? 'sí' : 'no'}`;
    btn.textContent = label();
    btn.addEventListener('click', () => {
      this.gentle = !this.gentle;
      setSetting('gentleFear', this.gentle);
      btn.textContent = label();
    });
    actions.insertBefore(btn, actions.querySelector('[data-leave]'));
  }

  /* ================================================================= reset */

  onReset() {
    this.stopChecking(true);
    this.holding = false;
    this.spookAlive = false;
    this.breathPausing = false;
    Object.values(this.spooks ?? {}).forEach((g) => { g.visible = false; });
    this.spook = null;
    this.root.querySelector('.bp-layer')?.remove();
    this.breathPause = new BreathPause(this);
    this.revealed = 0;
    this.tension = 0;
    this.calmUntil = 0;
    this.exitArmed = false;
    this.leaving = false;
    this.doorOpen = false;
    this.closing = false;
    this.focos.forEach((f) => {
      f.state = 'idle';
      f.progress = 0;
      f.fails = 0;
      f.tier = 0;
      f.closeness = 0;
      f.real.visible = false;
      f.shadow.visible = false;
      f.shadow.material.opacity = 0;
    });
    this.houseLights.forEach((l) => { l.userData.on = false; l.intensity = 0; });
    this.lightMeshes.forEach((m) => { m.material.emissiveIntensity = 0; });
    this.wardrobeDoors.forEach(({ hinge }) => { hinge.rotation.y = 0; });
    this.cellarDoor.rotation.y = 0;
    this.curtain.position.z = this.curtainHome;
    this.cat.position.set(0, 0, -4.6);
    this.cat.rotation.y = -Math.PI / 2;
    this.focos[3].shadow.position.z = -4.7;
    if (!this.controller.colliders.includes(this.cellarCollider)) this.controller.addCollider(this.cellarCollider);
    if (!this.controller.colliders.includes(this.frontDoorCollider)) this.controller.addCollider(this.frontDoorCollider);
    this.frontDoor.rotation.y = 0;
    this.controller.cfg.eyeHeight = 1.5;
    this.controller.setPosition(0, 0.2, 7.2);
    this.controller.yaw = 0;
    this.controller.pitch = 0;
    // de vuelta al frio
    this.scene.fog.color.set(COLD.fog);
    this.scene.fog.density = 0.06;
    this.hemi.color.set(COLD.sky);
    this.hemi.groundColor.set(COLD.ground);
    this.hemi.intensity = COLD.hemi;
    this.sun.intensity = 0;
    this.torch.color.set(COLD.torch);
    this.torch.intensity = 6;
    this.renderer.toneMappingExposure = COLD.exposure;
    this.sky.userData.setColors('#0a1424', '#24405e');
    this.glass.material.emissive.set('#1a2440');
    this.glass.material.emissiveIntensity = 0.4;
    this.smallWindows.forEach((w) => { w.material.emissive.set('#1a2440'); w.material.emissiveIntensity = 0.5; });
    this.wind?.setVolume(0.16, 1);
    if (!this.music) { this.music = new MysteryMusic(this.audio); this.music.start(); }
    this.music.setVolume(0.3, 1);
  }

  onDispose() {
    this.wind?.stop();
    this.music?.stop();
    this.music = null;
    this.focos.length = 0;
  }
}
