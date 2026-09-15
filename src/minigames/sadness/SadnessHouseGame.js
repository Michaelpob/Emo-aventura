// ISLA DE LA TRISTEZA · La casa en marcha
// Genero: TAREAS CON IMPULSO · tercera persona, control directo
//
// Activacion conductual hecha cuerpo. Empiezas pesado: andas despacio y todo
// esta gris. Cada cosa pequena que haces con tus propias manos te devuelve
// impulso, y con impulso moverse cuesta menos. Si te paras, el impulso baja
// poco a poco hasta el suelo que ya has ganado, nunca por debajo.
//
// Seis tareas y cada una se juega distinto: pulsar (ventanas), recoger
// (cartas), cargar y traer (lena), mantener (regar), soltar a tiempo (radio)
// y elegir que decir (mensaje). Con la casa en marcha la puerta se abre y se
// sale por ella.
//
// Lo que se ensena (y se dice en voz alta, no solo con la mecanica):
// 1. Reconocer: al entrar se pregunta cuanto pesa hoy la tristeza, y el
//    personaje empieza mas o menos lento segun la respuesta.
// 2. Para que sirve: la tristeza frena para asimilar una perdida y pedir
//    compania; el problema es pararse del todo.
// 3. Pensamientos de la tristeza: si te quedas quieto aparecen frases
//    («para que», «manana»). No castigan: se van solas al moverte. Eso es
//    distancia de los pensamientos.
// 4. Cada tarea es una estrategia real con una version de un minuto para
//    hoy (cambiar el entorno, lo pendiente en trozos, mover el cuerpo,
//    cuidar algo, volver a lo que gustaba, decirselo a alguien).
// 5. Reevaluar al final y elegir UNA cosa pequena para manana, que se guarda
//    en el perfil.

import * as THREE from 'three';
import { MinigameBase } from '../../engine/MinigameBase.js';
import { createGround, createSky, createLights, GEO, scatterInstanced, makeAvatar, animateAvatar } from '../../engine/worldkit.js';
import { addReward, completeActivity, recordReevaluation, setInitialIntensity, setPlan } from '../../data/gameState.js';

const TASKS = [
  { id: 'ventanas', icon: '🪟', label: 'Abrir las ventanas', total: 3 },
  { id: 'cartas', icon: '✉️', label: 'Recoger las cartas', total: 6 },
  { id: 'lena', icon: '🪵', label: 'Leña para la chimenea', total: 4 },
  { id: 'planta', icon: '🌱', label: 'Regar la planta', total: 3 },
  { id: 'radio', icon: '📻', label: 'Sintonizar la radio', total: 1 },
  { id: 'mensaje', icon: '💌', label: 'Escribir a alguien', total: 1 }
];
const ITEMS_TOTAL = TASKS.reduce((n, t) => n + t.total, 0) + 1; // +1: leer la respuesta

/** Cuanto pesa hoy: decide el arranque del personaje y la reevaluacion */
const LEVELS = [
  { n: 1, id: 'baja', label: 'Pesa poco', color: '#7fd1a8', weight: 0.62,
    text: 'Estoy algo apagado, pero hay cosas que me apetecen.',
    intro: 'Has dicho que hoy pesa poco. Bien: aprovecha el impulso que ya traes.' },
  { n: 2, id: 'media', label: 'Pesa bastante', color: '#ffd166', weight: 0.5,
    text: 'Me cuesta arrancar. Hago menos de lo que quiero.',
    intro: 'Has dicho que te cuesta arrancar. Empieza por lo más pequeño que veas.' },
  { n: 3, id: 'alta', label: 'Pesa mucho', color: '#ff9d8a', weight: 0.4,
    text: 'No tengo ganas de nada. Todo pesa.',
    intro: 'Has dicho que hoy todo pesa. Vale, no vamos a fingir que no: por eso el personaje va lento. Una sola cosa, y ya.' }
];

/** Cada tarea es una estrategia real, con una version de un minuto para hoy */
const STRATEGIES = {
  ventanas: { name: 'Cambiar el entorno', icon: '🪟',
    text: 'Luz, aire, otra habitación. No arregla nada, pero cambia lo que ves y lo que sientes en el cuerpo.',
    today: 'Abre la ventana de tu cuarto cinco minutos.' },
  cartas: { name: 'Lo pendiente, en trozos', icon: '✉️',
    text: 'Lo que dejas para luego pesa más que hacerlo. La tristeza acumula cosas sin abrir.',
    today: 'Una sola cosa pendiente, la más pequeña, y ya.' },
  lena: { name: 'Mover el cuerpo', icon: '🪵',
    text: 'La tristeza baja el ritmo del cuerpo, y el cuerpo quieto la mantiene. No hace falta deporte: hacen falta viajes cortos.',
    today: 'Diez minutos andando, sin destino.' },
  planta: { name: 'Cuidar algo', icon: '🌱',
    text: 'Regar, dar de comer, ducharte. Cuidar algo te recuerda que sigues aquí y que lo que haces importa.',
    today: 'Una rutina de cuidado, aunque no apetezca.' },
  radio: { name: 'Volver a lo que te gustaba', icon: '📻',
    text: 'Cuando estás triste dejas lo que disfrutabas, y sin eso hay menos motivos. La señal sigue ahí.',
    today: 'Cinco minutos de algo que te gustaba antes.' },
  mensaje: { name: 'Decírselo a alguien', icon: '💌',
    text: 'La tristeza pide compañía; por eso pesa tanto a solas. Decir «no estoy bien» es de lo más valiente que hay.',
    today: 'Un mensaje a una persona. No hace falta saber qué decir.' },
  respuesta: { name: 'Dejarte ayudar', icon: '❤️‍🩹',
    text: 'Recibir es la otra mitad de pedir. De la tristeza no se sale solo, y no hace falta.',
    today: 'Cuando alguien te conteste, no lo dejes en visto.' }
};

/** Frases que suelta la tristeza cuando te paras. No son ordenes. */
const THOUGHTS = ['¿Para qué?', 'Mañana', 'No va a servir de nada', 'Ya lo haré', 'Nadie se daría cuenta', 'Qué más da'];
const THOUGHT_IDLE = 5;        // segundos quieto antes de que aparezca una
const THOUGHT_GAP = 14;        // segundos minimos entre dos

const MESSAGES = [
  { label: 'Hoy no estoy muy bien', text: '¿Hablamos un rato?', reply: 'Claro que sí. Estoy aquí. Cuéntame cuando quieras, sin prisa.' },
  { label: 'Te echo de menos', text: '¿Vienes un día de estos?', reply: 'Yo también. El sábado me paso, y llevo algo de comer.' },
  { label: 'No sé qué decir', text: 'Pero quería escribirte.', reply: 'No hace falta saber qué decir. Me alegra mucho que lo hayas hecho.' }
];

const LETTER_SPOTS = [[-4.5, 4.2], [2.6, 7.4], [7.6, 0.4], [-8.4, -0.6], [0.4, 10.6], [-3.2, -8.2]];
const LOG_SPOTS = [[-9.2, -5.8], [8.6, -7.4], [-7.4, 7.8], [9.6, 5.2]];
const PILE_SLOTS = [[-0.34, 0.17, 0], [0.34, 0.17, 0], [0, 0.48, 0], [0, 0.79, 0]];

const WATER_RATE = 0.42;     // barra de riego por segundo mantenido
const DIAL_SPEED = 4.2;      // rad/s de la aguja de la radio
const BAND_WIDTH = 0.17;     // ancho de la senal buena (0..1)

export class SadnessHouseGame extends MinigameBase {
  constructor(opts) {
    super({ ...opts, mode: 'third' });
    this.progress = Object.fromEntries(TASKS.map((t) => [t.id, 0]));
    this.groupsDone = 0;
    this.floor = 0;          // impulso ganado: no baja nunca
    this.bonus = 0;          // impulso reciente: se apaga si te paras
    this.idleTime = 0;
    this.time = 0;
    this.holding = false;
    this.carrying = null;
    this.water = 0;
    this.plantStage = 0;
    this.dial = { active: false, t: 0, x: 0, band: 0.5, inBand: false };
    this.letters = [];
    this.logs = [];
    this.pile = [];
    this.shutters = [];
    this.message = null;
    this.replyWaiting = false;
    this.replyArrived = false;
    this.replyRead = false;
    this.fireLit = false;
    this.doorOpen = false;
    this.layers = new Map();
    this.level = LEVELS[1];
    this.weight0 = this.level.weight;
    this.thought = null;
    this.thoughtsCrossed = 0;
    this.thoughtCooldown = 0;
    this.thoughtExplained = false;
  }

  get momentum() {
    return Math.min(1, this.floor + this.bonus);
  }

  /* ============================================================ escenario */

  build() {
    const scene = this.scene;

    scene.fog = new THREE.FogExp2('#8a9296', 0.03);
    this.sky = createSky({ top: '#59636a', bottom: '#9aa4a8' });
    scene.add(this.sky);

    this.ground = createGround({
      size: 110,
      segments: 52,
      color: '#77807a',
      amplitude: 0.5,
      scale: 0.07,
      flatRadius: 15
    });
    scene.add(this.ground);

    this.lights = createLights({
      sunColor: '#c6ced2',
      sunIntensity: 1.2,
      hemiSky: '#8a969c',
      hemiGround: '#3f4744',
      hemiIntensity: 0.95,
      area: 26
    });
    scene.add(this.lights);
    this.sun = this.lights.userData.sun;

    this.buildHouse();
    this.buildGarden();
    this.buildAvatar();
    this.buildItems();
    this.buildHud();
    this.bindHold();

    this.controller.groundHeightAt = (x, z) => this.ground.userData.heightAt(x, z);
    this.controller.bounds = { minX: -13, maxX: 13, minZ: -13, maxZ: 13 };
    this.controller.setPosition(1.4, 1, 5);
    this.controller.cfg.walkSpeed = 4.4;
    this.controller.cfg.runSpeed = 6.8;
    this.controller.orbit.distance = 7.2;
    this.controller.orbit.targetDistance = 7.2;
    this.controller.orbit.height = 2.7;
    this.controller.speedScale = 0.5;

    this.setObjective(TASKS.length, '☀');
  }

  buildHouse() {
    const house = new THREE.Group();

    const wallMat = new THREE.MeshStandardMaterial({ color: '#9aa0a2', roughness: 0.95, flatShading: true });
    const body = new THREE.Mesh(new THREE.BoxGeometry(6, 3.4, 5), wallMat);
    body.position.y = 1.7;
    body.castShadow = true;
    body.receiveShadow = true;
    house.add(body);

    const roofMat = new THREE.MeshStandardMaterial({ color: '#7c6a63', roughness: 1, flatShading: true });
    const roof = new THREE.Mesh(new THREE.ConeGeometry(4.9, 2.2, 4), roofMat);
    roof.position.y = 4.5;
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    house.add(roof);

    // tres ventanas cerradas: frente, izquierda y derecha. Una sola luz para
    // las tres (cada luz puntual se paga en todos los pixeles de la escena)
    const shutterDefs = [
      { pos: [-1.5, 2.1, 2.55], rot: 0 },
      { pos: [-3.05, 2.0, -0.4], rot: Math.PI / 2 },
      { pos: [3.05, 2.0, -0.4], rot: Math.PI / 2 }
    ];
    const shutterGeo = new THREE.BoxGeometry(1.5, 1.4, 0.16);
    shutterDefs.forEach((def) => {
      const mat = new THREE.MeshStandardMaterial({
        color: '#3f4a52', emissive: '#000000', emissiveIntensity: 0, roughness: 0.4, flatShading: true
      });
      const mesh = new THREE.Mesh(shutterGeo, mat);
      mesh.position.set(...def.pos);
      mesh.rotation.y = def.rot;
      house.add(mesh);
      this.shutters.push({ mesh, mat, open: false });
    });
    this.houseGlow = new THREE.PointLight('#ffcf87', 0, 14, 2);
    this.houseGlow.position.set(0, 2.4, 3.2);
    house.add(this.houseGlow);

    // puerta: se abre cuando la casa esta en marcha
    this.doorMat = new THREE.MeshStandardMaterial({ color: '#6d5c52', roughness: 0.9, flatShading: true });
    this.door = new THREE.Mesh(new THREE.BoxGeometry(1.3, 2.3, 0.18), this.doorMat);
    this.door.position.set(1.4, 1.15, 2.55);
    house.add(this.door);

    // chimenea: humea cuando hay lena
    const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.4, 0.7), roofMat);
    chimney.position.set(1.8, 5, -0.6);
    house.add(chimney);

    this.fireLight = new THREE.PointLight('#ff9a4a', 0, 10, 2);
    this.fireLight.position.set(3.9, 1.2, 0.6);
    house.add(this.fireLight);

    house.position.set(0, 0, -3);
    this.scene.add(house);
    this.house = house;

    // la casa es solida
    this.controller.addCollider({
      type: 'box',
      box: new THREE.Box3(new THREE.Vector3(-3.1, 0, -5.6), new THREE.Vector3(3.1, 4, -0.4))
    });

    // pila de lena junto a la pared derecha
    const pileBase = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 0.12, 0.8),
      new THREE.MeshStandardMaterial({ color: '#6b5a4c', roughness: 1, flatShading: true })
    );
    pileBase.position.set(4.6, 0.06, -2.4);
    pileBase.receiveShadow = true;
    this.scene.add(pileBase);
    this.pileBase = pileBase;
  }

  buildGarden() {
    const H = (x, z) => this.ground.userData.heightAt(x, z);

    // camino de piedras hasta la puerta
    const pathMat = new THREE.MeshStandardMaterial({ color: '#8b8f86', roughness: 1, flatShading: true });
    for (let i = 0; i < 6; i += 1) {
      const stone = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.6, 0.12, 6), pathMat);
      stone.position.set(1.4, H(1.4, 0.6 + i * 1.5) + 0.06, 0.6 + i * 1.5);
      stone.receiveShadow = true;
      this.scene.add(stone);
    }
    this.pathMat = pathMat;

    // maceta con planta de tres etapas
    const pot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.5, 0.42, 0.6, 8),
      new THREE.MeshStandardMaterial({ color: '#9c6b52', roughness: 0.95, flatShading: true, emissive: '#000000' })
    );
    pot.position.set(-4.2, 0.3, 1.8);
    pot.castShadow = true;
    this.scene.add(pot);
    this.pot = pot;
    this.controller.addCollider({ type: 'sphere', center: pot.position.clone(), radius: 0.6 });

    this.plantMat = new THREE.MeshStandardMaterial({ color: '#6f8a63', roughness: 0.9, flatShading: true });
    this.plantParts = [];
    for (let i = 0; i < 3; i += 1) {
      const leaf = new THREE.Mesh(GEO.coneTree(), this.plantMat);
      leaf.scale.setScalar(0.001);
      leaf.position.set(-4.2, 0.75 + i * 0.42, 1.8);
      this.scene.add(leaf);
      this.plantParts.push(leaf);
    }

    // banco: adorno solido
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
    bench.position.set(6.2, H(6.2, 3.2), 3.2);
    bench.rotation.y = -0.5;
    this.scene.add(bench);
    this.controller.addCollider({ type: 'sphere', center: bench.position.clone().add(new THREE.Vector3(0, 0.3, 0)), radius: 1.1 });

    // radio sobre un tocon, apartada en el jardin (lejos de otros objetos
    // para que el chip [E] no dude entre dos)
    const stump = new THREE.Mesh(
      new THREE.CylinderGeometry(0.34, 0.4, 0.5, 7),
      new THREE.MeshStandardMaterial({ color: '#6b5a4c', roughness: 1, flatShading: true })
    );
    stump.position.set(-7.6, H(-7.6, 2.6) + 0.25, 2.6);
    this.scene.add(stump);
    this.radioMat = new THREE.MeshStandardMaterial({ color: '#8d8577', roughness: 0.8, flatShading: true, emissive: '#000000' });
    const radio = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 0.4), this.radioMat);
    radio.position.set(-7.6, H(-7.6, 2.6) + 0.75, 2.6);
    radio.castShadow = true;
    this.scene.add(radio);
    this.radio = radio;
    this.controller.addCollider({ type: 'sphere', center: stump.position.clone(), radius: 0.5 });

    // buzon: por ahi se manda el mensaje y por ahi vuelve la respuesta
    const mailbox = new THREE.Group();
    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.09, 1.3, 6),
      new THREE.MeshStandardMaterial({ color: '#6d6259', roughness: 1, flatShading: true })
    );
    post.position.y = 0.65;
    mailbox.add(post);
    this.mailboxMat = new THREE.MeshStandardMaterial({ color: '#7d8a92', roughness: 0.85, flatShading: true, emissive: '#000000' });
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.45, 0.45), this.mailboxMat);
    box.position.y = 1.45;
    mailbox.add(box);
    mailbox.position.set(4.2, H(4.2, 8), 8);
    this.scene.add(mailbox);
    this.mailbox = mailbox;
    this.controller.addCollider({ type: 'sphere', center: mailbox.position.clone().add(new THREE.Vector3(0, 0.6, 0)), radius: 0.4 });

    // arboles apagados alrededor del jardin
    const treeMat = new THREE.MeshStandardMaterial({ color: '#5f6f66', roughness: 1, flatShading: true });
    this.trees = scatterInstanced(GEO.coneTree(), treeMat, 34, (i) => {
      const a = (i / 34) * Math.PI * 2 + (i % 5) * 0.13;
      const r = 16 + (i % 4) * 2.6;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      const s = 2.2 + (i % 3) * 0.7;
      return { x, y: H(x, z), z, ry: a, scale: s, scaleY: s * 1.6 };
    });
    this.scene.add(this.trees);
    this.treeMat = treeMat;

    // colinas lejanas: cierran el horizonte
    const hillMat = new THREE.MeshStandardMaterial({ color: '#6b7570', roughness: 1, flatShading: true });
    const hills = scatterInstanced(new THREE.ConeGeometry(1, 1, 5), hillMat, 26, (i) => {
      const a = (i / 26) * Math.PI * 2 + (i % 3) * 0.1;
      const r = 34 + (i % 4) * 3.5;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      const s = 8 + (i % 5) * 3.2;
      return { x, y: H(x, z) - 1, z, ry: a, scale: s, scaleY: s * (0.45 + (i % 3) * 0.12) };
    });
    this.scene.add(hills);
    this.hillMat = hillMat;

    // hierba apagada que revive con el impulso
    const grassMat = new THREE.MeshStandardMaterial({ color: '#6f7a6a', roughness: 1, flatShading: true });
    this.grass = scatterInstanced(GEO.grass(), grassMat, 260, (i) => {
      const a = i * 2.399;
      const r = 3 + (i % 34) * 0.4;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r + 2;
      return { x, y: H(x, z) + 0.22, z, ry: a, scale: 0.55 + (i % 4) * 0.2 };
    });
    this.grassMat = grassMat;
    this.scene.add(this.grass);
  }

  buildAvatar() {
    this.avatar = makeAvatar({ color: '#8d949a', accent: '#e9eef0', emoji: this.player?.avatar ?? '🧒' });
    this.scene.add(this.avatar);
    this.controller.avatar = this.avatar;
  }

  /* ============================================================== objetos */

  buildItems() {
    const H = (x, z) => this.ground.userData.heightAt(x, z);
    // geometrias compartidas: reiniciar no vuelve a crearlas
    this.geo ??= {
      sheet: new THREE.BoxGeometry(0.62, 0.05, 0.42),
      stripe: new THREE.BoxGeometry(0.62, 0.052, 0.08),
      log: new THREE.CylinderGeometry(0.17, 0.17, 0.95, 7)
    };

    // ventanas: pulsar
    this.shutters.forEach((s, i) => {
      s.item = this.interactable({
        object: s.mesh,
        radius: 2.8,
        icon: '🪟',
        label: 'Abrir la ventana',
        onInteract: () => this.openShutter(i)
      });
    });

    // cartas: recoger caminando por encima
    const paperMat = new THREE.MeshStandardMaterial({ color: '#f1efe6', roughness: 0.8, emissive: '#f1efe6', emissiveIntensity: 0.18, flatShading: true });
    const stripeMat = new THREE.MeshStandardMaterial({ color: '#d96c5c', roughness: 0.8, flatShading: true });
    LETTER_SPOTS.forEach(([x, z], i) => {
      const g = new THREE.Group();
      const sheet = new THREE.Mesh(this.geo.sheet, paperMat);
      g.add(sheet);
      const stripe = new THREE.Mesh(this.geo.stripe, stripeMat);
      stripe.position.z = 0.1;
      g.add(stripe);
      g.position.set(x, H(x, z) + 0.05, z);
      g.rotation.y = i * 1.3;
      this.scene.add(g);
      this.letters.push({ mesh: g, taken: false, bob: i * 0.9 });
    });

    // lena: coger, llevar y dejar
    const logMat = new THREE.MeshStandardMaterial({ color: '#7a5a3c', roughness: 1, flatShading: true, emissive: '#000000' });
    LOG_SPOTS.forEach(([x, z], i) => {
      const mesh = new THREE.Mesh(this.geo.log, logMat.clone());
      mesh.position.set(x, H(x, z) + 0.17, z);
      mesh.rotation.z = Math.PI / 2;
      mesh.rotation.y = i * 0.8;
      mesh.castShadow = true;
      this.scene.add(mesh);
      const log = { mesh, taken: false };
      log.item = this.interactable({
        object: mesh,
        radius: 2.2,
        icon: '🪵',
        label: 'Coger la leña',
        onInteract: () => this.takeLog(log)
      });
      this.logs.push(log);
    });
    this.pileItem = this.interactable({
      object: this.pileBase,
      radius: 2.4,
      icon: '🔥',
      label: 'Dejar la leña',
      onInteract: () => this.dropLog()
    });
    this.pileItem.enabled = false;

    // planta: mantener pulsado
    this.plantItem = this.interactable({
      object: this.pot,
      radius: 2.4,
      icon: '💧',
      label: 'Mantén E para regar',
      onEnter: () => { if (this.plantStage < 3) this.waterBar.show(true); },
      onExit: () => this.waterBar.show(false)
    });
    this.plantItem.kind = 'planta';

    // radio: mantener y soltar en la senal
    this.radioItem = this.interactable({
      object: this.radio,
      radius: 2.4,
      icon: '📻',
      label: 'Mantén E y suelta en la señal',
      onExit: () => this.cancelDial()
    });
    this.radioItem.kind = 'radio';

    // buzon: escribir, y mas tarde leer
    this.mailItem = this.interactable({
      object: this.mailbox,
      radius: 2.4,
      icon: '💌',
      label: 'Escribir a alguien',
      onInteract: () => this.useMailbox()
    });

    // puerta: solo cuando la casa esta en marcha
    this.doorItem = this.interactable({
      object: this.door,
      radius: 2.4,
      icon: '🚪',
      label: 'Salir',
      onInteract: () => this.finish()
    });
    this.doorItem.enabled = false;
  }

  /* =============================================================== input */

  bindHold() {
    const down = () => {
      if (this.holding) return;
      this.holding = true;
    };
    const up = () => {
      if (!this.holding) return;
      this.holding = false;
      this.onRelease();
    };
    const canvas = this.renderer.domElement;
    const pointerDown = (e) => { if (e.pointerType === 'mouse' && e.button === 0) down(); };
    const pointerUp = (e) => { if (e.pointerType === 'mouse') up(); };
    const keyDown = (e) => { if ((e.key === 'e' || e.key === 'E') && !e.repeat) down(); };
    const keyUp = (e) => { if (e.key === 'e' || e.key === 'E') up(); };
    canvas.addEventListener('pointerdown', pointerDown);
    window.addEventListener('pointerup', pointerUp);
    window.addEventListener('pointercancel', pointerUp);
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

  onRelease() {
    if (this.dial.active) this.tuneRelease();
  }

  /* ================================================================= HUD */

  buildHud() {
    this.momentumBar = this.addBar('impulso', { icon: '♥', color: '#ffb36b', value: 0 });
    this.waterBar = this.addBar('agua', { icon: '💧', color: '#7fd1ff', value: 0 });
    this.waterBar.show(false);

    this.tasksBox = document.createElement('div');
    this.tasksBox.className = 'i3d-tasks';
    this.tasksBox.innerHTML = `
      <p class="i3d-tasks__title">La casa</p>
      <ul>${TASKS.map((t) => `
        <li data-task="${t.id}"><i>${t.icon}</i><span>${t.label}</span><b></b></li>`).join('')}
      </ul>
    `;
    this.el.hud.appendChild(this.tasksBox);

    this.thoughtBox = document.createElement('div');
    this.thoughtBox.className = 'i3d-thought';
    this.thoughtBox.hidden = true;
    this.el.hud.appendChild(this.thoughtBox);

    this.dialBox = document.createElement('div');
    this.dialBox.className = 'i3d-dial';
    this.dialBox.hidden = true;
    this.dialBox.innerHTML = '<span class="i3d-dial__band"></span><i class="i3d-dial__needle"></i>';
    this.el.hud.appendChild(this.dialBox);

    this.renderTasks();
  }

  renderTasks() {
    TASKS.forEach((t) => {
      const li = this.tasksBox.querySelector(`[data-task="${t.id}"]`);
      const n = this.progress[t.id];
      li.querySelector('b').textContent = t.total > 1 ? `${n}/${t.total}` : n ? '✓' : '';
      li.classList.toggle('is-done', n >= t.total);
    });
  }

  async onStart() {
    // 1. Reconocer y nombrar: cuanto pesa hoy
    const n = await this.showChoice({
      eyebrow: 'La casa en marcha',
      title: '¿Cuánto pesa hoy tu tristeza?',
      options: LEVELS.map((l) => ({ label: l.label, text: l.text, value: l.n, color: l.color }))
    });
    this.level = LEVELS.find((l) => l.n === n) ?? LEVELS[1];
    this.weight0 = this.level.weight;
    this.controller.speedScale = this.weight0;
    setInitialIntensity(this.level.id);
    completeActivity(`sadness-nivel-${this.level.n}`, 2);

    // 2. Para que sirve la tristeza, y de que va esto
    await this.showIntro({
      eyebrow: 'La casa en marcha',
      goal: 'Pon la casa en marcha con tus propias manos',
      hint: `La tristeza no es un fallo: aparece cuando pierdes algo que importaba y te frena para que lo asimiles y busques compañía. El problema es que, si te paras del todo, crece. Aquí no se trata de dejar de estar triste, sino de moverte un poco <em>aunque</em> lo estés. ${this.level.intro}`,
      keys: [['W A S D', 'moverte'], ['Arrastra', 'mirar'], ['E', 'usar'], ['Mantener E', 'regar / sintonizar']],
      touch: [['Joystick', 'moverte'], ['Arrastra', 'mirar'], ['E', 'usar'], ['Mantener E', 'regar / sintonizar']]
    });
    this.ambientWind = this.audio.ambient('wind', { volume: 0.12, rate: 0.7 });
    this.say('TODO PESA · EMPIEZA POR ALGO', 2600);
  }

  /* ============================================================== impulso */

  /** Cada cosa hecha sube el suelo del impulso y da un empujon extra */
  gain(taskId) {
    this.floor = Math.min(1, this.floor + 1 / ITEMS_TOTAL);
    this.bonus = Math.min(0.3, this.bonus + 0.1);
    this.idleTime = 0;
    if (this.thought) this.dismissThought();
    this.applyWarmth();
    if (taskId) {
      this.progress[taskId] += 1;
      this.renderTasks();
      const def = TASKS.find((t) => t.id === taskId);
      if (this.progress[taskId] === def.total) this.completeGroup(taskId);
    }
  }

  completeGroup(taskId) {
    this.groupsDone += 1;
    this.advanceObjective();
    this.audio.play('success', { volume: 0.4 });
    this.later(() => this.showStrategy(taskId), 700);
    completeActivity(`sadness-casa-${taskId}`, 4);
    if (this.replyWaiting) this.deliverReply();
    this.checkDoor();
  }

  checkDoor() {
    if (this.doorOpen) return;
    if (this.groupsDone < TASKS.length || !this.replyRead) return;
    this.openDoor();
  }

  /** El impulso acumulado tine todo el escenario */
  applyWarmth() {
    const w = this.floor;
    this.sky.userData.setColors(
      w > 0.66 ? '#3f6f96' : w > 0.33 ? '#4c6a80' : '#59636a',
      w > 0.66 ? '#ffd9a8' : w > 0.33 ? '#c3c3ae' : '#9aa4a8'
    );
    this.feedback.tweenColor(this.scene.fog.color, w > 0.5 ? '#c8c3ac' : '#8a9296', 2);
    this.feedback.tweenValue(this.scene.fog, 'density', 0.03 - w * 0.02, 2);
    this.feedback.tweenValue(this.sun, 'intensity', 1.2 + w * 0.9, 2);
    this.feedback.tweenColor(this.sun.color, '#ffe6c0', 2.5);
    const mix = (a, b) => new THREE.Color(a).lerp(new THREE.Color(b), w);
    this.feedback.tweenColor(this.grassMat.color, mix('#6f7a6a', '#79b06d'), 2.5);
    this.feedback.tweenColor(this.treeMat.color, mix('#5f6f66', '#4f9a5a'), 2.5);
    this.feedback.tweenColor(this.hillMat.color, mix('#6b7570', '#7e9c78'), 2.5);
    this.feedback.tweenColor(this.pathMat.color, mix('#8b8f86', '#c8b98f'), 2.5);
    this.feedback.tweenColor(this.avatar.userData.body.material.color, mix('#8d949a', '#efb45f'), 2.5);
  }

  /* ============================================================== tareas */

  openShutter(i) {
    const s = this.shutters[i];
    if (s.open) return;
    s.open = true;
    s.item.done = true;
    s.mat.color.set('#cfe4ef');
    s.mat.emissive.set('#ffcf87');
    this.feedback.tweenValue(s.mat, 'emissiveIntensity', 1.2, 1.2);
    const open = this.shutters.filter((x) => x.open).length;
    this.feedback.tweenValue(this.houseGlow, 'intensity', 1.1 * open, 1.2);
    this.feedback.burst(s.mesh.getWorldPosition(new THREE.Vector3()), { count: 10, color: '#ffe9a8', speed: 1.6, life: 0.9, gravity: -0.5 });
    this.audio.play('creak', { volume: 0.45, rate: 0.9 + i * 0.1 });
    this.later(() => this.audio.play('light', { volume: 0.35 }), 220);
    this.say('ENTRA LUZ', 1400);
    this.gain('ventanas');
  }

  pickLetter(letter) {
    letter.taken = true;
    this.scene.remove(letter.mesh);
    this.feedback.burst(letter.mesh.position.clone().add(new THREE.Vector3(0, 0.4, 0)), { count: 8, color: '#ffffff', speed: 1.8, life: 0.8 });
    this.audio.play('paper', { volume: 0.5 });
    this.later(() => this.audio.play('collect', { volume: 0.3, rate: 1 + this.progress.cartas * 0.06 }), 90);
    const left = TASKS[1].total - this.progress.cartas - 1;
    this.say(left > 0 ? `UNA CARTA · FALTAN ${left}` : 'LEÍSTE TODAS LAS CARTAS', 1300);
    this.gain('cartas');
  }

  takeLog(log) {
    if (this.carrying) {
      const now = performance.now();
      if (!this._lastLogHint || now - this._lastLogHint > 900) {
        this._lastLogHint = now;
        this.say('YA LLEVAS UNO · DÉJALO EN LA PILA', 1400);
        this.audio.play('soften', { volume: 0.25 });
      }
      return;
    }
    log.taken = true;
    log.item.done = true;
    this.carrying = log;
    this.avatar.add(log.mesh);
    log.mesh.position.set(0, 1.95, 0.05);
    log.mesh.rotation.set(0, 0, Math.PI / 2);
    this.pileItem.enabled = true;
    this.audio.play('interact', { volume: 0.35 });
    this.say('LLÉVALO A LA CHIMENEA', 1500);
  }

  dropLog() {
    if (!this.carrying) return;
    const log = this.carrying;
    this.carrying = null;
    this.avatar.remove(log.mesh);
    const slot = PILE_SLOTS[this.pile.length];
    log.mesh.position.set(this.pileBase.position.x + slot[0], slot[1], this.pileBase.position.z + slot[2]);
    log.mesh.rotation.set(0, 0, Math.PI / 2);
    this.scene.add(log.mesh);
    this.pile.push(log);
    this.pileItem.enabled = false;
    this.audio.play('thud', { volume: 0.35 });
    this.feedback.burst(log.mesh.position.clone(), { count: 6, color: '#c9a37a', speed: 1.2, life: 0.6 });
    const left = TASKS[2].total - this.pile.length;
    this.say(left > 0 ? `FALTAN ${left}` : 'LA CASA ESTÁ CALIENTE', 1400);
    this.gain('lena');
    if (this.pile.length >= TASKS[2].total) this.lightFire();
  }

  lightFire() {
    this.fireLit = true;
    this.feedback.tweenValue(this.fireLight, 'intensity', 3.2, 1.5);
    this.addLayer('crackle', 0.26);
    this.audio.play('sizzle', { volume: 0.3 });
  }

  growPlant() {
    const leaf = this.plantParts[this.plantStage];
    if (!leaf) return;
    const target = 0.5 - this.plantStage * 0.09;
    this.feedback.tween({ from: 0.001, to: target, duration: 1.1, onUpdate: (v) => leaf.scale.setScalar(v) });
    this.plantStage += 1;
    this.audio.play('light', { volume: 0.35, rate: 1.1 + this.plantStage * 0.1 });
    this.say(this.plantStage >= 3 ? 'YA TIENE FLOR' : 'CRECE UN POCO', 1400);
    if (this.plantStage >= 3) {
      this.plantItem.done = true;
      this.waterBar.show(false);
      this.plantMat.color.set('#79b06d');
    }
    this.gain('planta');
  }

  startDial() {
    this.dial.active = true;
    this.dial.t = 0;
    this.dial.inBand = false;
    this.dialBox.hidden = false;
    this.dialBox.style.setProperty('--band', `${this.dial.band * 100}%`);
    this.dialBox.style.setProperty('--band-w', `${BAND_WIDTH * 100}%`);
    this.dialBox.classList.remove('is-hit', 'is-miss');
    this.dialNoise = this.audio.ambient('swamp', { volume: 0 });
    this.dialNoise.setVolume(0.12, 0.3);
  }

  cancelDial() {
    if (!this.dial.active) return;
    this.dial.active = false;
    this.dialBox.hidden = true;
    this.dialNoise?.stop();
    this.dialNoise = null;
  }

  tuneRelease() {
    const hit = this.dial.inBand;
    this.dial.active = false;
    this.dialNoise?.stop();
    this.dialNoise = null;
    this.dialBox.classList.add(hit ? 'is-hit' : 'is-miss');
    this.later(() => { this.dialBox.hidden = true; }, 700);
    if (hit) {
      this.radioItem.done = true;
      this.radioMat.emissive.set('#ffd166');
      this.radioMat.emissiveIntensity = 0.7;
      this.addLayer('pad', 0.22);
      this.feedback.burst(this.radio.position.clone().add(new THREE.Vector3(0, 0.5, 0)), { count: 14, color: '#ffd166', speed: 1.8, life: 1.3, gravity: -0.6 });
      this.audio.play('chime', { volume: 0.45 });
      this.say('SUENA MÚSICA', 1600);
      this.gain('radio');
    } else {
      // la senal se mueve: el siguiente intento es distinto
      this.dial.band = 0.2 + Math.random() * 0.6;
      this.audio.play('soften', { volume: 0.3 });
      this.say('ESTÁTICA · OTRA VEZ', 1300);
    }
  }

  async useMailbox() {
    if (this.replyArrived && !this.replyRead) { this.readReply(); return; }
    if (this.message) return;
    const value = await this.showChoice({
      eyebrow: 'Escribir a alguien',
      title: '¿Qué le dices?',
      options: MESSAGES.map((m, i) => ({ label: m.label, text: m.text, value: i, color: '#7fd1ff' }))
    });
    this.message = MESSAGES[value];
    this.mailItem.done = true;
    this.feedback.burst(this.mailbox.position.clone().add(new THREE.Vector3(0, 1.6, 0)), { count: 12, color: '#ffffff', speed: 2, life: 1.2 });
    this.audio.play('interact', { volume: 0.4 });
    this.say('MENSAJE ENVIADO', 1600);
    this.gain('mensaje');
    // la respuesta llega cuando termines la siguiente cosa; si ya no queda
    // nada, llega sola en unos segundos
    if (this.groupsDone >= TASKS.length) {
      await this.wait(3);
      this.deliverReply();
    } else {
      this.replyWaiting = true;
    }
  }

  deliverReply() {
    if (this.replyArrived) return;
    this.replyWaiting = false;
    this.replyArrived = true;
    const flag = new THREE.Mesh(
      new THREE.BoxGeometry(0.34, 0.5, 0.06),
      new THREE.MeshStandardMaterial({ color: '#e8746a', emissive: '#e8746a', emissiveIntensity: 0.6, flatShading: true })
    );
    flag.position.set(0.35, 1.7, 0);
    this.mailbox.add(flag);
    this.replyFlag = flag;
    this.mailboxMat.emissive.set('#ffd166');
    this.mailboxMat.emissiveIntensity = 0.4;
    this.mailItem.done = false;
    this.mailItem.label = 'Leer la respuesta';
    this.mailItem.icon = '✉️';
    // si el jugador esta al lado, el chip se refresca con la etiqueta nueva
    if (this.interactables.active === this.mailItem) this.interactables.setActive(null);
    this.feedback.burst(this.mailbox.position.clone().add(new THREE.Vector3(0, 1.8, 0)), { count: 16, color: '#ffd166', speed: 2.2, life: 1.2 });
    this.audio.play('collect', { volume: 0.5 });
    this.say('HAY ALGO EN EL BUZÓN', 2400);
  }

  readReply() {
    this.replyRead = true;
    this.mailItem.done = true;
    this.mailboxMat.emissiveIntensity = 0;
    if (this.replyFlag) { this.mailbox.remove(this.replyFlag); this.replyFlag = null; }
    this.audio.play('success', { volume: 0.45 });
    this.showNote({ title: 'Te contestaron', text: `«${this.message.reply}»`, seconds: 9 });
    this.later(() => this.showStrategy('respuesta'), 9500);
    this.say('ALGUIEN TE CONTESTÓ', 2200);
    this.floor = Math.min(1, this.floor + 0.08);
    this.gain(null);
    completeActivity('sadness-casa-respuesta', 4);
    this.checkDoor();
  }

  openDoor() {
    this.doorOpen = true;
    this.door.position.x = 1.9;
    this.feedback.tween({ from: 0, to: -1.15, duration: 1.2, onUpdate: (v) => { this.door.rotation.y = v; } });
    this.doorMat.emissive.set('#ffd166');
    this.doorMat.emissiveIntensity = 0.6;
    this.doorItem.enabled = true;
    this.feedback.flash(new THREE.Vector3(1.4, 1.5, -0.5), { color: '#ffe9a8', intensity: 4, duration: 1.6 });
    this.audio.play('creak', { volume: 0.5, rate: 0.7 });
    this.later(() => this.audio.play('success', { volume: 0.55 }), 350);
    this.say('LA PUERTA ESTÁ ABIERTA', 2600);
  }

  /** La estrategia que acabas de practicar, con su version de hoy */
  showStrategy(id) {
    const st = STRATEGIES[id];
    this.showNote({
      title: `${st.icon} ${st.name}`,
      text: `${st.text}<br><b>Hoy:</b> ${st.today}`,
      seconds: 11
    });
  }

  /* ========================================================= pensamientos */

  showThought() {
    const text = THOUGHTS[(this.thoughtsCrossed + Math.floor(this.time) % 3) % THOUGHTS.length];
    this.thought = { text, at: this.controller.position.clone() };
    this.thoughtBox.textContent = text;
    this.thoughtBox.hidden = false;
    this.thoughtBox.classList.remove('is-out');
    this.audio.play('soften', { volume: 0.18, rate: 0.7 });
    if (!this.thoughtExplained) {
      this.thoughtExplained = true;
      this.showNote({
        title: '🌫️ Pensamientos de la tristeza',
        text: 'Cuando estás triste, la cabeza suelta frases así. No son hechos ni órdenes: puedes moverte con ellas puestas. Fíjate: se van solas cuando haces algo.',
        seconds: 11
      });
    }
  }

  dismissThought() {
    if (!this.thought) return;
    this.thought = null;
    this.thoughtsCrossed += 1;
    this.thoughtCooldown = THOUGHT_GAP;
    this.thoughtBox.classList.add('is-out');
    this.later(() => { if (!this.thought) this.thoughtBox.hidden = true; }, 500);
    if (this.thoughtsCrossed === 1) this.say('SE FUE AL MOVERTE', 1600);
  }

  addLayer(name, volume) {
    if (this.layers.has(name)) return;
    const node = this.audio.ambient(name, { volume: 0 });
    node.setVolume(volume, 1.4);
    this.layers.set(name, node);
  }

  /** Espera medida en frames: exacta aunque el navegador frene los timers */
  wait(seconds) {
    return new Promise((resolve) => {
      this.feedback.tween({ from: 0, to: 1, duration: seconds, onUpdate: () => {}, onDone: resolve });
    });
  }

  /* =============================================================== update */

  onUpdate(dt) {
    this.time += dt;
    animateAvatar(this.avatar, this.time);
    const p = this.controller.position;
    const speed = Math.hypot(this.controller.velocity.x, this.controller.velocity.z);

    // el impulso reciente se apaga si te quedas parado; el suelo no baja
    if (speed < 0.3) {
      this.idleTime += dt;
      if (this.idleTime > 1.2) this.bonus = Math.max(0, this.bonus - dt * 0.05);
    } else {
      this.idleTime = 0;
    }
    const m = this.momentum;
    this.controller.speedScale = (this.weight0 + (1.2 - this.weight0) * m) * (this.carrying ? 0.85 : 1);
    this.momentumBar.set(m);

    // pensamientos de la tristeza: aparecen si te paras, se van al moverte
    if (this.thoughtCooldown > 0) this.thoughtCooldown -= dt;
    if (this.thought) {
      if (this.thought.at.distanceTo(p) > 1.6) this.dismissThought();
    } else if (this.idleTime > THOUGHT_IDLE && this.thoughtCooldown <= 0 && !this.holding && !this.doorOpen) {
      this.showThought();
    }

    // cartas: se recogen al pasar por encima
    for (const letter of this.letters) {
      if (letter.taken) continue;
      letter.mesh.position.y = this.ground.userData.heightAt(letter.mesh.position.x, letter.mesh.position.z) + 0.05 + Math.sin(this.time * 2 + letter.bob) * 0.03;
      if (Math.hypot(letter.mesh.position.x - p.x, letter.mesh.position.z - p.z) < 1.05) this.pickLetter(letter);
    }

    const active = this.interactables.active;

    // regar: mantener; el progreso no se pierde al soltar
    const pouring = this.holding && active?.kind === 'planta' && this.plantStage < 3;
    if (pouring !== this.pouring) {
      this.pouring = pouring;
      this.pourNode ??= this.audio.ambient('water', { volume: 0, rate: 1.35 });
      this.pourNode.setVolume(pouring ? 0.28 : 0, pouring ? 0.15 : 0.25);
    }
    if (pouring) {
      this.water = Math.min(1, this.water + dt * WATER_RATE);
      this.waterBar.set(this.water);
      if (Math.random() < 0.5) {
        this.feedback.drizzle({ x: this.pot.position.x, y: 1.6, z: this.pot.position.z }, 0.25, { color: '#a8d8ff', life: 0.6, speed: 0.4, gravity: -6, size: 0.5 });
      }
      if (this.water >= 1) {
        this.water = 0;
        this.waterBar.set(0);
        this.growPlant();
      }
    }

    // sintonizar: la aguja barre mientras mantienes; suelta en la senal
    if (this.holding && active?.kind === 'radio' && !this.radioItem.done) {
      if (!this.dial.active) this.startDial();
      this.dial.t += dt;
      this.dial.x = 0.5 + 0.5 * Math.sin(this.dial.t * DIAL_SPEED);
      const inBand = Math.abs(this.dial.x - this.dial.band) < BAND_WIDTH / 2;
      if (inBand && !this.dial.inBand) this.audio.play('tick', { volume: 0.3 });
      this.dial.inBand = inBand;
      this.dialBox.style.setProperty('--x', `${this.dial.x * 100}%`);
      this.dialBox.classList.toggle('is-on', inBand);
      this.dialNoise?.setVolume(inBand ? 0.03 : 0.12, 0.08);
    } else if (this.dial.active) {
      this.cancelDial();
    }

    // el jardin despierta: pajaros sueltos cuando el impulso ganado pasa de la mitad
    if (this.floor > 0.45) {
      this.birdTimer = (this.birdTimer ?? 4) - dt;
      if (this.birdTimer <= 0) {
        this.birdTimer = 3.5 + Math.random() * 6;
        this.audio.play('bird', { volume: 0.12 + Math.random() * 0.1, rate: 0.9 + Math.random() * 0.35 });
      }
    }

    if (this.fireLit && Math.random() < 0.3) {
      this.feedback.drizzle({ x: 1.8, y: 6, z: -3.6 }, 0.3, { color: '#e8e0d0', life: 2.2, speed: 0.5, gravity: 0.4, size: 0.7 });
    }
    if (this.replyFlag) this.replyFlag.rotation.y = Math.sin(this.time * 2) * 0.3;
    if (this.layers.has('pad') && Math.random() < 0.06) {
      this.feedback.drizzle({ x: this.radio.position.x, y: 1.2, z: this.radio.position.z }, 0.4, { color: '#ffd166', life: 1.6, speed: 0.6, gravity: -0.4, size: 0.5 });
    }
  }

  onReset() {
    this.cancelDial();
    this.holding = false;
    this.thought = null;
    this.thoughtsCrossed = 0;
    this.thoughtCooldown = 0;
    this.thoughtBox.hidden = true;
    this.idleTime = 0;
    this.progress = Object.fromEntries(TASKS.map((t) => [t.id, 0]));
    this.groupsDone = 0;
    this.floor = 0;
    this.bonus = 0;
    this.water = 0;
    this.plantStage = 0;
    this.message = null;
    this.replyWaiting = false;
    this.replyArrived = false;
    this.replyRead = false;
    this.fireLit = false;
    this.doorOpen = false;
    if (this.carrying) { this.avatar.remove(this.carrying.mesh); this.carrying = null; }

    this.interactables.clear();
    this.letters.forEach((l) => this.scene.remove(l.mesh));
    this.logs.forEach((l) => { this.scene.remove(l.mesh); this.avatar.remove(l.mesh); });
    this.letters.length = 0;
    this.logs.length = 0;
    this.pile.length = 0;
    if (this.replyFlag) { this.mailbox.remove(this.replyFlag); this.replyFlag = null; }
    this.shutters.forEach((s) => {
      s.open = false;
      s.mat.color.set('#3f4a52');
      s.mat.emissiveIntensity = 0;
    });
    this.houseGlow.intensity = 0;
    this.pourNode?.setVolume(0, 0.1);
    this.birdTimer = 4;
    this.plantParts.forEach((leaf) => leaf.scale.setScalar(0.001));
    this.plantMat.color.set('#6f8a63');
    this.radioMat.emissiveIntensity = 0;
    this.mailboxMat.emissiveIntensity = 0;
    this.fireLight.intensity = 0;
    this.door.rotation.y = 0;
    this.door.position.x = 1.4;
    this.doorMat.emissiveIntensity = 0;
    this.layers.forEach((l) => l.stop());
    this.layers.clear();
    this.buildItems();

    this.sky.userData.setColors('#59636a', '#9aa4a8');
    this.scene.fog.color.set('#8a9296');
    this.scene.fog.density = 0.03;
    this.sun.intensity = 1.2;
    this.grassMat.color.set('#6f7a6a');
    this.treeMat.color.set('#5f6f66');
    this.hillMat.color.set('#6b7570');
    this.pathMat.color.set('#8b8f86');
    this.avatar.userData.body.material.color.set('#8d949a');
    this.controller.setPosition(1.4, 1, 5);
    this.controller.speedScale = this.weight0;
    this.momentumBar.set(0);
    this.waterBar.set(0);
    this.waterBar.show(false);
    this.renderTasks();
  }

  /* =============================================================== cierre */

  get completionPayload() {
    return {
      islandId: 'sadness',
      success: true,
      emoAventura: true,
      badge: 'sadness',
      title: 'La casa en marcha',
      message: 'Empezaste sin fuerzas y pusiste la casa en marcha a base de cosas pequeñas.'
    };
  }

  async finish() {
    if (this.finished || this.closing) return;
    this.closing = true;
    this.cancelDial();
    if (this.thought) this.dismissThought();
    this.controller.frozen = true;

    // 1. Reevaluar: cuanto pesa ahora
    const n = await this.showChoice({
      eyebrow: 'La casa en marcha',
      title: '¿Y ahora? ¿Cuánto pesa tu tristeza?',
      options: LEVELS.map((l) => ({ label: l.label, text: l.text, value: l.n, color: l.color }))
    });
    const after = LEVELS.find((l) => l.n === n) ?? this.level;
    recordReevaluation('sadness', this.level.id, 'Activacion conductual', after.id);

    // 2. Una sola cosa pequena para manana: se guarda en el perfil
    const planId = await this.showChoice({
      eyebrow: 'Para mañana',
      title: 'Elige UNA cosa pequeña para mañana',
      options: Object.entries(STRATEGIES).filter(([id]) => id !== 'respuesta').map(([id, st]) => ({
        label: `${st.icon} ${st.name}`, text: st.today, value: id, color: '#ffb36b'
      }))
    });
    const plan = STRATEGIES[planId];
    setPlan('sadness', { strategy: plan.name, action: plan.today });
    completeActivity(`sadness-plan-${planId}`, 3);

    addReward('brujula-pasos');
    addReward('nube-pensamientos');
    completeActivity('sadness-casa-3d', 20);

    const delta = after.n - this.level.n;
    const cambio = delta < 0
      ? `Entraste con «${this.level.label.toLowerCase()}» y sales con «${after.label.toLowerCase()}». No porque la tristeza se fuera: porque te moviste con ella.`
      : delta === 0
        ? 'Pesa igual que al entrar, y aun así hiciste seis cosas. Esa es exactamente la idea: no esperar a que baje para actuar.'
        : 'Pesa más que al entrar. Puede pasar: a veces hacer cosas remueve. Cuenta igual, y si sigue así unos días, díselo a alguien.';
    const pensamientos = this.thoughtsCrossed
      ? `Atravesaste ${this.thoughtsCrossed} ${this.thoughtsCrossed === 1 ? 'pensamiento' : 'pensamientos'} de la tristeza («para qué», «mañana»). Se fueron solos en cuanto hiciste algo. Fuera funcionan igual.`
      : 'Nunca te quedaste quieto lo bastante para que la tristeza soltara sus frases («para qué», «mañana»). Cuando aparezcan, ya sabes: se van solas al moverte.';

    this.showClosingCard({
      title: 'La casa en marcha',
      lines: [
        cambio,
        'Cada tarea era una estrategia real: cambiar el entorno, lo pendiente en trozos, mover el cuerpo, cuidar algo, volver a lo que te gustaba, decírselo a alguien. Y con cada una, moverte costaba menos. Eso es la activación conductual: las ganas no vienen antes de actuar, vienen después.',
        pensamientos,
        `<b>Tu plan para mañana:</b> ${plan.icon} ${plan.today} Lo tienes guardado en tu perfil.`,
        '<small>Si la tristeza dura más de dos semanas casi todos los días, o te cuesta dormir, comer o ir a clase, no es para llevarla solo: díselo a un adulto de confianza, a orientación o a un médico.</small>'
      ],
      onDone: () => super.finish()
    });
  }

  onDispose() {
    this.cancelDial();
    this.pourNode?.stop();
    Object.values(this.geo ?? {}).forEach((geo) => geo.dispose());
    this.layers.forEach((l) => l.stop());
    this.layers.clear();
    this.ambientWind?.stop();
    this.tasksBox?.remove();
    this.dialBox?.remove();
  }
}
