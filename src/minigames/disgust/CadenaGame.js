// LA CADENA · Isla del Desagrado («La Cienaga Turbia») · minijuego 1
// Tiempo real, tenso. El jugador es el nodo central de una red suspendida
// sobre la cienaga. Por los hilos llegan «paquetes» (mensajes). Con cada uno:
//   · cortar: arrastrar el puntero/dedo cruzando el hilo antes de que llegue
//   · dejar pasar: no hacer nada → se replica a 2-3 nodos y el agua se enturbia
//   · poner limite: mantener pulsado el nodo propio → «eco» con tres frases
//   · pedir ayuda: arrastrar el paquete hasta la baliza (2 usos por ronda)
// Trampa deliberada: un tercio de los paquetes solo son raros o distintos,
// no daninos. Cortarlos o responderles penaliza: la senal de desagrado no
// siempre senala un dano.
//
// Cinco rondas de 45-60 s. La ultima trae un paquete que habla del propio
// jugador. Cierra con dos preguntas de reevaluacion y un feedback que lista
// las decisiones concretas, no una nota global.
//
// Camara fija en perspectiva (ligero orbit al arrastrar sobre el agua), sin
// desplazamiento del jugador ni teclado obligatorio: raton o dedo.

import * as THREE from 'three';
import { MinigameBase } from '../../engine/MinigameBase.js';
import {
  gameState, addReward, completeActivity, recordReevaluation, setIslandLevel, getIslandData, setIslandData
} from '../../data/gameState.js';
import { CADENA as T } from './CadenaTextos.js';
import { CONDUCTAS, INTENSIDADES } from './IslaTextos.js';
import { construirCienaga, materialViscoso, materialTranslucido, crearGuia, crearPistas, ndcDe, escapar, barajar } from './cienaga.js';

const ISLAND = 'disgust';
const NET_Y = 1.1;                 // altura del plano de la red sobre el agua
const RADIO_1 = 6.4;
const RADIO_2 = 10.4;
const HOLD_LIMITE = 0.45;          // s manteniendo el nodo propio para abrir el eco
const AYUDAS_POR_RONDA = 2;
const PROPORCION_TRAMPA = 1 / 3;
const RONDAS = [
  { duracion: 45, intervalo: 6.2, viaje: 13.0, nodos: 6, anillo2: false },
  { duracion: 48, intervalo: 5.4, viaje: 12.0, nodos: 8, anillo2: false },
  { duracion: 52, intervalo: 4.7, viaje: 10.5, nodos: 8, anillo2: false },
  { duracion: 56, intervalo: 4.1, viaje: 9.5, nodos: 8, anillo2: true },
  { duracion: 60, intervalo: 3.7, viaje: 8.5, nodos: 8, anillo2: true }
];

const _v = new THREE.Vector3();
const _w = new THREE.Vector3();
const _ndc = new THREE.Vector2();
const _plano = new THREE.Plane(new THREE.Vector3(0, 1, 0), -NET_Y);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/** Interseccion de segmentos 2D (en el plano de la red). Devuelve u en [0,1] sobre el segmento ab o null. */
function cruce(a, b, c, d) {
  const r = { x: b.x - a.x, z: b.z - a.z };
  const s = { x: d.x - c.x, z: d.z - c.z };
  const den = r.x * s.z - r.z * s.x;
  if (Math.abs(den) < 1e-6) return null;
  const qp = { x: c.x - a.x, z: c.z - a.z };
  const u = (qp.x * s.z - qp.z * s.x) / den;
  const t = (qp.x * r.z - qp.z * r.x) / den;
  if (u < 0 || u > 1 || t < 0 || t > 1) return null;
  return u;
}

export class CadenaGame extends MinigameBase {
  constructor(opts) {
    super({ ...opts, mode: 'third' });
    this.onMenu = opts.onMenu ?? null;
    this.nombre = opts.player?.name || 'ti';
    this.hilos = [];
    this.paquetes = [];
    this.ecos = [];                // replicas visuales al dejar pasar
    this.ronda = 0;
    this.fase = 'intro';           // intro | ronda | pausaRonda | fin
    this.tiempoRonda = 0;
    this.spawnTimer = 0;
    this.mazoDano = [];
    this.mazoTrampa = [];
    this.sobreTiLanzado = false;
    this.ayudas = AYUDAS_POR_RONDA;
    this.claridad = 62;            // 0..100 (HUD); el agua 3D sigue a este valor
    this.coherencia = 60;
    this.termo = 0;
    this.termoAvisado = false;
    this.alcanzados = 0;
    this.timeScale = 1;
    this.hold = null;              // { inicio, x, z }
    this.corte = null;             // { puntos: [] }
    this.arrastre = null;          // { paquete, pid, x0, y0, movido }
    this.menu = null;              // { paquete, el } botones al tocar un mensaje
    this.practica = null;          // { paso, usados } durante la practica guiada
    this.orbit = null;
    this.yaw = 0;
    this.decisiones = [];          // registro concreto para el feedback
    this.stats = { cortes: 0, asertiva: 0, agresiva: 0, evasiva: 0, ayudas: 0, pasaron: 0, grima: 0, diferenciaBien: 0, sobreTi: null };
    this.valores = new Set(getIslandData(ISLAND).valores ?? CONDUCTAS.map((c) => c.id));
    this.intensidadInicial = getIslandData(ISLAND).intensidad ?? gameState.initialIntensity ?? 'media';
    this.raycaster = new THREE.Raycaster();
    this.time = 0;
  }

  /* ============================================================ escenario */

  build() {
    this.controller.enabled = false;
    this.el.touch.remove();
    this.cienaga = construirCienaga(this, { claridad: this.claridad / 100 });
    this.camera.fov = 52;
    this.camera.updateProjectionMatrix();
    this.placeCamera();
    this.buildNet();
    this.buildHud();
    this.buildInput();
    this.guia = crearGuia(this);
    this.pistas = crearPistas(this, this.cardsEl);
    this.setObjective(RONDAS.length, '◉');
  }

  placeCamera() {
    const r = 15.5;
    this.camera.position.set(Math.sin(this.yaw) * r * 0.6, 12.8, Math.cos(this.yaw) * r * 0.6 + 6);
    this.camera.lookAt(0, NET_Y, -0.6);
  }

  buildNet() {
    const scene = this.scene;
    this.netGroup = new THREE.Group();
    scene.add(this.netGroup);

    // nodo propio: una esfera clara con halo; es el que se mantiene pulsado
    this.nodoMat = new THREE.MeshStandardMaterial({ color: '#e8f1ee', emissive: '#9fd8c0', emissiveIntensity: 0.6, roughness: 0.4, flatShading: true });
    this.nodo = new THREE.Mesh(new THREE.IcosahedronGeometry(0.62, 1), this.nodoMat);
    this.nodo.position.set(0, NET_Y, 0);
    this.netGroup.add(this.nodo);
    this.halo = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.05, 8, 40), new THREE.MeshBasicMaterial({ color: '#c8f0dc', transparent: true, opacity: 0.55 }));
    this.halo.rotation.x = -Math.PI / 2;
    this.halo.position.set(0, NET_Y + 0.02, 0);
    this.netGroup.add(this.halo);

    // baliza: la figura de referencia a la que se le llevan los paquetes graves
    this.baliza = new THREE.Group();
    const cuerpo = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 0.7, 4, 8), new THREE.MeshStandardMaterial({ color: '#d8c9a0', roughness: 0.7, flatShading: true }));
    cuerpo.position.y = 0.7;
    const cabeza = new THREE.Mesh(new THREE.IcosahedronGeometry(0.26, 1), new THREE.MeshStandardMaterial({ color: '#f0e6d0', roughness: 0.6, flatShading: true }));
    cabeza.position.y = 1.35;
    const farol = new THREE.Mesh(new THREE.OctahedronGeometry(0.22, 0), new THREE.MeshStandardMaterial({ color: '#ffe9a8', emissive: '#ffd166', emissiveIntensity: 1.6 }));
    farol.position.set(0.5, 1.1, 0);
    this.balizaLuz = new THREE.PointLight('#ffd166', 1.6, 7, 2);
    this.balizaLuz.position.set(0.5, 1.4, 0);
    this.baliza.add(cuerpo, cabeza, farol, this.balizaLuz);
    this.baliza.position.set(0, NET_Y - 0.55, 3.6);
    this.netGroup.add(this.baliza);
    this.balizaPos = new THREE.Vector3(0, NET_Y, 3.6);

    // nodos exteriores: primera fila (usada siempre) y segunda (rondas 4-5)
    this.nodosMat = new THREE.MeshStandardMaterial({ color: '#b9c9c4', emissive: '#6f8f8a', emissiveIntensity: 0.35, roughness: 0.5, flatShading: true });
    this.hiloMat = new THREE.MeshStandardMaterial({ color: '#cfe0d8', emissive: '#7fa39a', emissiveIntensity: 0.25, roughness: 0.6, transparent: true, opacity: 0.9 });
    this.hiloGeo = new THREE.CylinderGeometry(0.045, 0.045, 1, 6, 1, true);
    const crear = (n, radio, offset, fila) => {
      for (let i = 0; i < n; i += 1) {
        const a = offset + (i / n) * Math.PI * 2;
        const x = Math.cos(a) * radio;
        const z = Math.sin(a) * radio;
        const nodo = new THREE.Mesh(new THREE.IcosahedronGeometry(0.34, 1), this.nodosMat);
        nodo.position.set(x, NET_Y, z);
        nodo.visible = false;
        this.netGroup.add(nodo);
        const hilo = new THREE.Mesh(this.hiloGeo, this.hiloMat.clone());
        this.orientarHilo(hilo, nodo.position, this.nodo.position);
        hilo.visible = false;
        this.netGroup.add(hilo);
        this.hilos.push({ a: nodo.position.clone(), b: this.nodo.position.clone(), nodo, mesh: hilo, fila, activo: false, paquete: null, cerrado: 0, brillo: 0 });
      }
    };
    crear(8, RADIO_1, Math.PI / 8, 1);
    crear(8, RADIO_2, 0, 2);

    this.matDano = materialViscoso();
    this.matTrampa = materialTranslucido();
    this.matEco = new THREE.MeshStandardMaterial({ color: '#4a3a5a', emissive: '#2a1a3a', emissiveIntensity: 0.4, roughness: 0.5, transparent: true, opacity: 0.8, flatShading: true });
    this.paqueteGeo = new THREE.IcosahedronGeometry(0.3, 1);
    this.gooGeo = new THREE.IcosahedronGeometry(0.42, 0);
  }

  orientarHilo(mesh, a, b) {
    const len = a.distanceTo(b);
    mesh.scale.set(1, len, 1);
    mesh.position.copy(a).lerp(b, 0.5);
    _v.copy(b).sub(a).normalize();
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), _v);
  }

  /* ================================================================ HUD */

  buildHud() {
    this.tools = document.createElement('div');
    this.tools.className = 'i3d-tools dg-tools';
    this.tools.innerHTML = `
      <div class="i3d-tool dg-tool--info"><b>💧</b><span>${T.hud.claridad}<small data-claridad>${this.claridad}</small></span></div>
      <div class="i3d-tool dg-tool--info"><b>🧭</b><span>${T.hud.coherencia}<small data-coherencia>${this.coherencia}</small></span></div>
      <div class="i3d-tool dg-tool--info"><b>🌡️</b><span>${T.hud.termometro}<small data-termo>${T.avisos.termometro.split(':')[0]}</small></span></div>
      <div class="i3d-tool dg-tool--info"><b>🕯️</b><span>${T.hud.ayuda}<small data-ayudas>${this.ayudas} usos</small></span></div>
    `;
    this.el.hud.appendChild(this.tools);
    this.waveEl = document.createElement('div');
    this.waveEl.className = 'i3d-wave';
    this.el.hud.appendChild(this.waveEl);
    this.cardsEl = document.createElement('div');
    this.cardsEl.className = 'dg-cards';
    this.el.hud.appendChild(this.cardsEl);
    this.renderLabel();
  }

  renderLabel() {
    const r = Math.min(RONDAS.length, this.ronda + 1);
    this.waveEl.innerHTML = `${T.hud.ronda} <b>${r}</b> de ${RONDAS.length} <small>· ${this.alcanzados} ${T.hud.alcanzados}</small>`;
    this.tools.querySelector('[data-claridad]').textContent = `${Math.round(this.claridad)} / 100`;
    this.tools.querySelector('[data-coherencia]').textContent = `${Math.round(this.coherencia)} / 100`;
    this.tools.querySelector('[data-ayudas]').textContent = this.ayudas === 1 ? '1 uso' : `${this.ayudas} usos`;
    this.tools.querySelector('[data-termo]').textContent = this.termo > 60 ? 'te avisó' : this.termo > 25 ? 'sube' : 'en calma';
  }

  /* ============================================================== input */

  buildInput() {
    const dom = this.renderer.domElement;
    const enJuego = () => !this.paused && !this.finished && (this.fase === 'ronda' || this.fase === 'practica') && !this.eco;
    const down = (e) => {
      if (!enJuego()) return;
      if (e.button !== undefined && e.button > 0) return;
      e.preventDefault();
      try { dom.setPointerCapture(e.pointerId); } catch { /* opcional */ }
      if (this.menu) { this.cerrarMenu(); return; }   // tocar fuera cierra los botones
      const p = this.puntoRed(e);
      if (!p) return;
      const paquete = this.paqueteCerca(p, 1.0);
      if (paquete) {
        // un toque abre los botones; si se mueve, es un arrastre (a la baliza)
        this.arrastre = { paquete, pid: e.pointerId, x0: e.clientX, y0: e.clientY, movido: false };
        this.audio.play('interact', { volume: 0.25 });
        return;
      }
      if (Math.hypot(p.x, p.z) < 1.15) {
        this.hold = { inicio: this.time, pid: e.pointerId };
        this.nodoMat.emissiveIntensity = 1.4;
        return;
      }
      this.corte = { puntos: [{ x: p.x, z: p.z }], pid: e.pointerId, movido: 0 };
      this.orbit = { x0: e.clientX, yaw0: this.yaw };
    };
    const move = (e) => {
      if (this.paused || this.finished) return;
      if (this.arrastre && e.pointerId === this.arrastre.pid) {
        const a = this.arrastre;
        if (!a.movido && Math.hypot(e.clientX - a.x0, e.clientY - a.y0) > 10) { a.movido = true; a.paquete.estado = 'arrastre'; }
        if (!a.movido) return;
        const p = this.puntoRed(e);
        if (p) a.paquete.mesh.position.set(clamp(p.x, -12, 12), NET_Y, clamp(p.z, -12, 12));
        return;
      }
      if (this.hold && e.pointerId === this.hold.pid) {
        const p = this.puntoRed(e);
        if (p && Math.hypot(p.x, p.z) > 1.3) this.cancelarHold();
        return;
      }
      if (this.corte && e.pointerId === this.corte.pid) {
        const p = this.puntoRed(e);
        if (!p) return;
        const ult = this.corte.puntos[this.corte.puntos.length - 1];
        const seg = { x: p.x, z: p.z };
        const d = Math.hypot(seg.x - ult.x, seg.z - ult.z);
        if (d < 0.05) return;
        this.corte.movido += d;
        this.probarCorte(ult, seg);
        if (!this.corte) return;               // el tramo corto un hilo: el gesto termina ahi
        this.corte.puntos.push(seg);
        if (this.corte.puntos.length > 40) this.corte.puntos.shift();
        // orbit ligero: arrastrar sobre el agua sin cruzar hilos gira un poco la vista
        if (this.orbit && this.corte.movido > 1.5) {
          this.yaw = clamp(this.orbit.yaw0 + (e.clientX - this.orbit.x0) * 0.0018, -0.42, 0.42);
          this.placeCamera();
        }
      }
    };
    const up = (e) => {
      if (this.arrastre && (!e || e.pointerId === undefined || e.pointerId === this.arrastre.pid)) {
        if (this.arrastre.movido) this.soltarPaquete(e);
        else { const pq = this.arrastre.paquete; this.arrastre = null; this.abrirMenu(pq); }
      }
      if (this.hold && (!e || e.pointerId === undefined || e.pointerId === this.hold.pid)) this.cancelarHold();
      if (this.corte && (!e || e.pointerId === undefined || e.pointerId === this.corte.pid)) { this.corte = null; this.orbit = null; }
    };
    dom.addEventListener('pointerdown', down);
    dom.addEventListener('pointermove', move);
    dom.addEventListener('pointerup', up);
    dom.addEventListener('pointercancel', up);
    const blur = () => up();
    window.addEventListener('pointerup', up);
    window.addEventListener('blur', blur);
    this.listeners.push(() => dom.removeEventListener('pointerdown', down));
    this.listeners.push(() => dom.removeEventListener('pointermove', move));
    this.listeners.push(() => dom.removeEventListener('pointerup', up));
    this.listeners.push(() => dom.removeEventListener('pointercancel', up));
    this.listeners.push(() => window.removeEventListener('pointerup', up));
    this.listeners.push(() => window.removeEventListener('blur', blur));
  }

  puntoRed(e) {
    ndcDe(e, this.renderer.domElement, _ndc);
    this.raycaster.setFromCamera(_ndc, this.camera);
    return this.raycaster.ray.intersectPlane(_plano, _w) ? _w : null;
  }

  paqueteCerca(p, radio) {
    let mejor = null;
    let dm = radio;
    for (const pq of this.paquetes) {
      if (pq.estado !== 'viaje' || pq.t < 0.05) continue;
      const d = Math.hypot(pq.mesh.position.x - p.x, pq.mesh.position.z - p.z);
      if (d < dm) { dm = d; mejor = pq; }
    }
    return mejor;
  }

  cancelarHold() {
    this.hold = null;
    this.nodoMat.emissiveIntensity = 0.6;
  }

  /** Un tramo del arrastre cruza un hilo con paquete en camino: se corta */
  probarCorte(p0, p1) {
    for (const hilo of this.hilos) {
      if (!hilo.activo || !hilo.paquete || hilo.paquete.estado !== 'viaje') continue;
      const u = cruce(hilo.a, hilo.b, p0, p1);
      if (u === null) continue;
      // el corte tiene que quedar por delante del paquete (entre el y el centro)
      if (u < hilo.paquete.t + 0.03) continue;
      // y ser un gesto que cruza, no que sigue el hilo
      const hx = hilo.b.x - hilo.a.x; const hz = hilo.b.z - hilo.a.z;
      const sx = p1.x - p0.x; const sz = p1.z - p0.z;
      const cos = Math.abs((hx * sx + hz * sz) / ((Math.hypot(hx, hz) * Math.hypot(sx, sz)) || 1));
      if (cos > 0.82) continue;
      this.resolver(hilo.paquete, 'cortar');
      hilo.cerrado = 1;
      this.corte = null;
      this.orbit = null;
      return;
    }
  }

  /* ============================================================= rondas */

  async onStart() {
    await this.showIntro({ ...T.intro, cta: 'Empezar' });
    this.preloadSounds?.();
    this.ambient = this.audio.ambient('swamp', { volume: 0.22, rate: 0.9 });
    this.mazoDano = barajar(T.daninos);
    this.mazoTrampa = barajar(T.trampas);
    if (getIslandData(ISLAND).cadenaPractica) this.empezarRonda(0);
    else this.empezarPractica();
  }

  /* ============================================================ practica */

  /** Practica guiada: un mensaje cada vez, quieto, con una sola instruccion */
  empezarPractica() {
    this.fase = 'practica';
    this.practica = { paso: -1, usados: new Set() };
    this.hilos.forEach((h, k) => {
      const dentro = h.fila === 1 && (k % 8) < 6;
      h.activo = dentro; h.nodo.visible = dentro; h.mesh.visible = dentro;
    });
    this.renderLabel();
    this.guia.guiar(T.practica.inicio, '🎓');
    this.guia.boton(T.practica.saltar, () => this.terminarPractica(true));
    this.later(() => this.practicaPaso(0), 2600);
  }

  practicaPaso(n) {
    if (this.fase !== 'practica') return;
    const P = T.practica.pasos[n];
    this.pistas.limpiar();
    if (!P) { this.terminarPractica(false); return; }
    this.practica.paso = n;
    this.practica.usados.add(P.id);
    const hilo = this.elegirHilo(P.hilo);
    const datos = P.tipo === 'trampa' ? T.trampas.find((t) => t.id === P.id) ?? T.trampas[0] : T.daninos.find((d) => d.id === P.id) ?? T.daninos[0];
    const pq = this.lanzarPaquete({ tipo: P.tipo, datos }, { hilo, t0: 0.42 });
    if (!pq) { this.terminarPractica(false); return; }
    pq.practica = true;
    pq.vel = P.tipo === 'trampa' ? 1 / 9 : 0;          // los daninos esperan quietos
    this.guia.guiar(P.texto, P.icono);
    if (P.pista === 'corte') this.pistas.poner('corte', 'corte', _v.lerpVectors(hilo.a, hilo.b, 0.7));
    else if (P.pista === 'hold') this.pistas.poner('hold', 'hold', _v.set(0, NET_Y, 0));
    else if (P.pista === 'baliza') this.pistas.poner('baliza', 'baliza', this.balizaPos);
  }

  terminarPractica(saltada) {
    if (this.fase !== 'practica') return;
    this.fase = 'pausaRonda';
    this.pistas.limpiar();
    this.cerrarMenu();
    this.guia.sinBoton();
    this.paquetes.forEach((p) => this.retirar(p));
    setIslandData(ISLAND, { cadenaPractica: true });
    // los mensajes de la practica no vuelven a salir en la ronda 1
    this.mazoDano = this.mazoDano.filter((d) => !this.practica.usados.has(d.id));
    this.mazoTrampa = this.mazoTrampa.filter((t) => !this.practica.usados.has(t.id));
    this.practica = null;
    this.reiniciarMarcadores();
    if (saltada) { this.empezarRonda(0); return; }
    this.guia.avisar(T.practica.fin, 'ok', 2600);
    this.later(() => this.empezarRonda(0), 2800);
  }

  /** Hilo activo libre por posicion en pantalla: izquierda | derecha | frente */
  elegirHilo(donde) {
    const libres = this.hilos.filter((h) => h.activo && !h.paquete);
    const orden = [...libres].sort((h1, h2) => donde === 'izquierda' ? h1.a.x - h2.a.x : donde === 'derecha' ? h2.a.x - h1.a.x : h2.a.z - h1.a.z);
    return orden[0] ?? null;
  }

  /** Marcadores a cero (tras la practica o al reiniciar) */
  reiniciarMarcadores() {
    this.stats = { cortes: 0, asertiva: 0, agresiva: 0, evasiva: 0, ayudas: 0, pasaron: 0, grima: 0, diferenciaBien: 0, sobreTi: null };
    this.decisiones = [];
    this.claridad = 62; this.coherencia = 60; this.termo = 0; this.alcanzados = 0;
    this.termoAvisado = false;
    this.ecos.forEach((e) => this.netGroup.remove(e.mesh));
    this.ecos = [];
    this.cienaga.setClaridad(0.62);
    this.renderLabel();
  }

  /* ============================================================= rondas */

  empezarRonda(i) {
    this.ronda = i;
    const cfg = RONDAS[i];
    this.fase = 'ronda';
    this.tiempoRonda = 0;
    this.spawnTimer = 2.2;
    this.ayudas = AYUDAS_POR_RONDA;
    this.trampasRonda = 0;
    this.paquetesRonda = 0;
    this.sobreTiLanzado = false;
    // hilos activos de la ronda: primera fila siempre; segunda fila al final
    this.hilos.forEach((h, k) => {
      const dentro = h.fila === 1 ? (k % 8) < cfg.nodos : cfg.anillo2;
      h.activo = dentro;
      h.nodo.visible = dentro;
      h.mesh.visible = dentro;
    });
    this.renderLabel();
    this.guia.guiar(T.guia.ronda, '👉');
    this.guia.avisar(T.rondas[i].titulo, 'info', 3200);
    this.audio.play('bubble', { volume: 0.3 });
  }

  terminarRonda() {
    this.fase = 'pausaRonda';
    this.advanceObjective(1);
    this.cerrarMenu();
    this.guia.avisar(T.avisos.finRonda(this.ronda + 1), 'info', 2400);
    this.audio.play('chime', { volume: 0.3 });
    const siguiente = this.ronda + 1;
    this.later(() => {
      if (siguiente >= RONDAS.length) this.cerrar();
      else this.empezarRonda(siguiente);
    }, 2800);
  }

  /** Elige el contenido del siguiente paquete: un tercio son trampas */
  siguienteContenido() {
    const cfg = RONDAS[this.ronda];
    const restante = Math.max(1, Math.floor(cfg.duracion / cfg.intervalo) - this.paquetesRonda);
    const faltanTrampas = this.trampasRonda === 0 && restante <= 2;
    const trampa = faltanTrampas || Math.random() < PROPORCION_TRAMPA;
    if (trampa) {
      if (!this.mazoTrampa.length) this.mazoTrampa = barajar(T.trampas);
      this.trampasRonda += 1;
      return { tipo: 'trampa', datos: this.mazoTrampa.pop() };
    }
    if (!this.mazoDano.length) this.mazoDano = barajar(T.daninos);
    return { tipo: 'dano', datos: this.mazoDano.pop() };
  }

  lanzarPaquete(contenido, { hilo = null, t0 = 0 } = {}) {
    const libres = this.hilos.filter((h) => h.activo && !h.paquete);
    const h = hilo ?? libres[Math.floor(Math.random() * libres.length)];
    if (!h) return null;
    const esDano = contenido.tipo !== 'trampa';
    const mesh = new THREE.Mesh(this.paqueteGeo, esDano ? this.matDano : this.matTrampa);
    if (esDano) {
      const goo = new THREE.Mesh(this.gooGeo, new THREE.MeshStandardMaterial({ color: '#1f1a2c', transparent: true, opacity: 0.45, roughness: 0.2, flatShading: true }));
      goo.name = 'goo';
      mesh.add(goo);
    }
    this.netGroup.add(mesh);
    const texto = contenido.tipo === 'sobreTi' ? contenido.datos.texto(this.nombre) : contenido.datos.texto;
    const card = document.createElement('div');
    card.className = `dg-card ${esDano ? 'dg-card--dano' : 'dg-card--trampa'}${contenido.tipo === 'sobreTi' ? ' dg-card--ti' : ''}`;
    card.innerHTML = `<span>${escapar(texto)}</span>`;
    card.hidden = true;
    this.cardsEl.appendChild(card);
    const pq = { ...contenido, texto, hilo: h, t: t0, vel: 1 / RONDAS[this.ronda].viaje, mesh, card, estado: 'viaje', mostrado: false, fase: Math.random() * 6 };
    h.paquete = pq;
    this.paquetes.push(pq);
    this.paquetesRonda += 1;
    return pq;
  }

  /** Replica visual al dejar pasar: sale del centro hacia otros nodos */
  replicar(n) {
    const destinos = barajar(this.hilos.filter((h) => h.activo)).slice(0, n);
    destinos.forEach((h) => {
      const mesh = new THREE.Mesh(this.paqueteGeo, this.matEco);
      mesh.scale.setScalar(0.7);
      this.netGroup.add(mesh);
      this.ecos.push({ mesh, hilo: h, t: 0 });
      h.brillo = -1;                     // el hilo se ensucia
    });
    this.alcanzados += n;
    this.renderLabel();
  }

  /* ========================================================== decisiones */

  /**
   * Cierra un paquete con una accion: cortar | pasar | asertiva | agresiva |
   * evasiva | ayuda. Aqui vive la regla de coherencia y la trampa.
   */
  resolver(pq, accion) {
    if (!pq || pq.estado === 'resuelto') return;
    const esTrampa = pq.tipo === 'trampa';
    const grave = pq.datos.severidad ?? 1;
    const enValores = !esTrampa && this.valores.has(pq.datos.conducta);
    const registro = { texto: pq.texto, tipo: pq.tipo, accion, conducta: pq.datos.conducta ?? null };
    let fin = true;

    if (esTrampa) {
      // Corazon del aprendizaje: reaccionar a una diferencia penaliza
      if (accion === 'pasar') {
        this.stats.diferenciaBien += 1;
        this.coherencia += 4; this.claridad += 1;
        this.guia.avisar(T.avisos.diferenciaPaso, 'ok');
        this.audio.play('soften', { volume: 0.3 });
      } else {
        this.stats.grima += 1;
        this.coherencia -= 6; this.claridad -= 3;
        if (accion === 'ayuda') this.ayudas -= 1;
        this.guia.avisar(T.avisos.grima, 'grima', 4200);
        this.audio.play('lowNote', { volume: 0.35 });
        this.feedback.burst(pq.mesh.position, { count: 10, color: '#d9e6e2', speed: 1.6, life: 0.7 });
      }
    } else if (accion === 'cortar') {
      this.stats.cortes += 1;
      this.coherencia += enValores ? 6 : 2; this.claridad += 2;
      this.guia.avisar(T.avisos.cortado, 'ok');
      this.audio.play('glassTap', { volume: 0.45 });
      this.feedback.burst(pq.mesh.position, { count: 14, color: '#c8f0dc', speed: 2.4, life: 0.7 });
    } else if (accion === 'pasar') {
      const n = grave >= 3 ? 3 : 2;
      this.stats.pasaron += 1;
      this.coherencia -= enValores ? 8 : 3; this.claridad -= 6 + grave * 2;
      this.replicar(n);
      registro.alcanzados = n;
      this.guia.avisar(T.avisos.dejoPasar(n), 'mal', 3200);
      this.audio.play('squelch', { volume: 0.5 });
      this.feedback.shakeCamera(gameState.settings.reduceMotion ? 0 : 0.08, 2);
    } else if (accion === 'asertiva') {
      this.stats.asertiva += 1;
      this.coherencia += enValores ? 8 : 4; this.claridad += 6;
      this.hilos.forEach((h) => { if (h.activo && Math.hypot(h.a.x - pq.hilo.a.x, h.a.z - pq.hilo.a.z) < 6) h.brillo = 1; });
      this.guia.avisar(T.avisos.asertivo, 'ok');
      this.audio.play('warm', { volume: 0.4 });
    } else if (accion === 'agresiva') {
      this.stats.agresiva += 1;
      this.claridad -= 4;
      this.guia.avisar(T.avisos.agresivo, 'mal', 3600);
      this.audio.play('growl', { volume: 0.4 });
      // la burla ensucia otro hilo: aparece un paquete danino a medio camino
      this.later(() => { if (this.fase === 'ronda') this.lanzarPaquete(this.siguienteDano(), { t0: 0.35 }); }, 400);
    } else if (accion === 'evasiva') {
      this.stats.evasiva += 1;
      this.coherencia -= 2;
      this.guia.avisar(T.avisos.evasivo, 'info');
      this.audio.play('lowNote', { volume: 0.25 });
      fin = false;                              // el paquete sigue su camino
    } else if (accion === 'ayuda') {
      this.stats.ayudas += 1;
      this.ayudas -= 1;
      this.coherencia += 6; this.claridad += 7;
      this.guia.avisar(T.avisos.ayuda, 'ok');
      this.audio.play('chime', { volume: 0.4 });
      this.feedback.flash(this.balizaPos, { color: '#ffd166', intensity: 4, duration: 0.8 });
    }
    if (pq.tipo === 'sobreTi') this.stats.sobreTi = accion;
    this.decisiones.push(registro);
    this.coherencia = clamp(this.coherencia, 0, 100);
    this.claridad = clamp(this.claridad, 0, 100);
    this.cienaga.setClaridad(this.claridad / 100);
    this.renderLabel();
    if (fin || this.fase === 'practica') this.retirar(pq);
    else pq.estado = 'viaje';
    // en la practica, cada mensaje resuelto da paso al siguiente
    if (this.fase === 'practica' && pq.practica) {
      this.pistas.limpiar();
      this.later(() => { if (this.practica) this.practicaPaso(this.practica.paso + 1); }, 2600);
    }
  }

  siguienteDano() {
    if (!this.mazoDano.length) this.mazoDano = barajar(T.daninos);
    return { tipo: 'dano', datos: this.mazoDano.pop() };
  }

  retirar(pq) {
    pq.estado = 'resuelto';
    if (pq.hilo && pq.hilo.paquete === pq) pq.hilo.paquete = null;
    pq.card.remove();
    this.netGroup.remove(pq.mesh);
    pq.mesh.children.forEach((c) => c.material?.dispose?.());
    this.paquetes = this.paquetes.filter((x) => x !== pq);
  }

  soltarPaquete(e) {
    const { paquete } = this.arrastre;
    this.arrastre = null;
    const p = e ? this.puntoRed(e) : null;
    const pos = p ? { x: p.x, z: p.z } : { x: paquete.mesh.position.x, z: paquete.mesh.position.z };
    if (Math.hypot(pos.x - this.balizaPos.x, pos.z - this.balizaPos.z) < 1.6) {
      if (this.ayudas > 0) { this.resolver(paquete, 'ayuda'); return; }
      this.guia.avisar(T.avisos.sinAyuda, 'mal');
    }
    // vuelve a su hilo por el punto mas cercano
    const h = paquete.hilo;
    const ax = h.b.x - h.a.x; const az = h.b.z - h.a.z;
    const L2 = ax * ax + az * az || 1;
    paquete.t = clamp(((pos.x - h.a.x) * ax + (pos.z - h.a.z) * az) / L2, paquete.t, 0.97);
    paquete.estado = 'viaje';
  }

  /* =============================================================== menu */

  /** Tocar un mensaje: botones con las cuatro decisiones (sin gestos) */
  abrirMenu(pq) {
    this.cerrarMenu();
    if (!pq || pq.estado === 'resuelto') return;
    pq.estado = 'viaje';
    this.timeScale = 0.12;
    pq.card.classList.add('is-sel');
    const el = document.createElement('div');
    el.className = 'dg-menu';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', T.guia.menu);
    el.innerHTML = `
      <p class="dg-menu__titulo">${T.guia.menu}</p>
      <p class="dg-menu__texto ${pq.tipo === 'trampa' ? 'dg-menu__texto--trampa' : ''}">${escapar(pq.texto)}</p>
      <div class="dg-menu__botones">
        <button type="button" data-a="cortar">✂️ ${T.menu.cortar}</button>
        <button type="button" data-a="responder">🗣️ ${T.menu.responder}</button>
        <button type="button" data-a="ayuda" ${this.ayudas > 0 ? '' : 'disabled'}>🕯️ ${T.menu.ayuda}</button>
        <button type="button" data-a="pasar">➡️ ${T.menu.pasar}</button>
      </div>`;
    this.el.hud.appendChild(el);
    this.menu = { paquete: pq, el };
    this.guia.ocultar();
    el.querySelectorAll('[data-a]').forEach((b) => b.addEventListener('click', () => this.elegirDelMenu(b.dataset.a)));
    el.querySelector('[data-a="cortar"]').focus({ preventScroll: true });
  }

  elegirDelMenu(accion) {
    const pq = this.menu?.paquete;
    this.cerrarMenu();
    if (!pq || pq.estado === 'resuelto') return;
    if (accion === 'cortar') { pq.hilo.cerrado = 1; this.resolver(pq, 'cortar'); }
    else if (accion === 'responder') this.abrirEco(pq);
    else if (accion === 'ayuda') { if (this.ayudas > 0) this.resolver(pq, 'ayuda'); else this.guia.avisar(T.avisos.sinAyuda, 'mal'); }
    else if (accion === 'pasar') {
      // decision explicita: el mensaje sigue (mas rapido) y se resuelve al llegar
      pq.vel = Math.max(pq.vel, 1 / RONDAS[this.ronda].viaje) * 2.5;
      this.guia.avisar(T.avisos.dejasPasar, 'info', 2000);
    }
  }

  cerrarMenu() {
    if (!this.menu) return;
    this.menu.el.remove();
    this.menu.paquete.card.classList.remove('is-sel');
    this.menu = null;
    if (!this.eco) this.timeScale = 1;
    this.guia.mostrar();
  }

  /* ================================================================ eco */

  abrirEco(objetivo = null) {
    objetivo = objetivo ?? this.paquetes.filter((p) => p.estado === 'viaje').sort((a, b) => b.t - a.t)[0];
    this.cancelarHold();
    if (!objetivo) { this.guia.avisar(T.avisos.nadieLlega, 'info', 1800); return; }
    this.cerrarMenu();
    this.guia.ocultar();
    this.eco = { paquete: objetivo };
    this.timeScale = 0.12;
    this.audio.duck(0.4);
    const frases = objetivo.tipo === 'trampa'
      ? [
        { k: 'asertiva', t: `Oye, ${objetivo.datos.diferencia} no es problema de nadie. Déjalo.` },
        { k: 'agresiva', t: 'Qué asco, en serio. Que lo deje ya.' },
        { k: 'evasiva', t: 'Bueno… no sé, a mí también me da cosa.' }
      ]
      : Object.entries(objetivo.datos.eco).map(([k, t]) => ({ k, t }));
    const panel = document.createElement('div');
    panel.className = 'i3d-panel dg-eco';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', T.eco.titulo);
    panel.innerHTML = `
      <p class="i3d-intro__eyebrow">${T.eco.titulo}</p>
      <p class="dg-eco__msg">${escapar(objetivo.texto)}</p>
      <h3>${T.eco.subtitulo}</h3>
      <div class="dg-eco__opciones">
        ${barajar(frases).map((f) => `<button class="dg-eco__btn" type="button" data-k="${f.k}">${escapar(f.t)}</button>`).join('')}
      </div>
    `;
    this.el.overlay.appendChild(panel);
    panel.querySelector('button').focus({ preventScroll: true });
    panel.querySelectorAll('[data-k]').forEach((b) => b.addEventListener('click', () => {
      panel.remove();
      this.eco = null;
      this.timeScale = 1;
      this.audio.unduck();
      this.guia.mostrar();
      this.resolver(objetivo, b.dataset.k);
    }));
  }

  /* ============================================================== bucle */

  onUpdate(dt) {
    this.time += dt;
    this.cienaga.update(dt);
    const ts = dt * this.timeScale;
    this.halo.rotation.z += dt * 0.6;
    this.halo.material.opacity = 0.4 + Math.sin(this.time * 2) * 0.15;
    this.balizaLuz.intensity = 1.4 + Math.sin(this.time * 3) * 0.3;
    this.termo = Math.max(0, this.termo - dt * 4);

    // limite: mantener el nodo propio
    if (this.hold && this.time - this.hold.inicio >= HOLD_LIMITE) this.abrirEco();

    // hilos: cierre tras un corte y brillo tras un limite
    for (const h of this.hilos) {
      if (!h.activo) continue;
      if (h.cerrado > 0) {
        h.cerrado = Math.max(0, h.cerrado - dt * 0.4);
        h.mesh.material.opacity = 0.15 + (1 - h.cerrado) * 0.75;
      }
      if (h.brillo !== 0) {
        h.brillo *= Math.exp(-dt * 0.8);
        if (Math.abs(h.brillo) < 0.02) h.brillo = 0;
        h.mesh.material.emissive.set(h.brillo > 0 ? '#c8f0dc' : '#3a2a4a');
        h.mesh.material.emissiveIntensity = 0.25 + Math.abs(h.brillo) * 1.2;
      }
    }

    if (this.fase === 'ronda') this.updateRonda(ts);
    this.updatePaquetes(ts, dt);
    this.updateEcos(ts);
    this.updateCards();
    this.pistas.update();
  }

  updateRonda(ts) {
    const cfg = RONDAS[this.ronda];
    this.tiempoRonda += ts;
    this.spawnTimer -= ts;
    const enVuelo = this.paquetes.filter((p) => p.estado !== 'resuelto').length;
    if (this.tiempoRonda < cfg.duracion && this.spawnTimer <= 0 && enVuelo < 4) {
      this.spawnTimer = cfg.intervalo;
      this.lanzarPaquete(this.siguienteContenido());
    }
    // ultima ronda: el paquete que habla del jugador
    if (this.ronda === RONDAS.length - 1 && !this.sobreTiLanzado && this.tiempoRonda > cfg.duracion * 0.6) {
      const pq = this.lanzarPaquete({ tipo: 'sobreTi', datos: T.sobreTi });
      if (pq) { this.sobreTiLanzado = true; pq.vel *= 0.85; this.guia.avisar(T.avisos.sobreTi, 'info', 3000); }
    }
    // la ronda acaba cuando se agota el tiempo y no queda nada en vuelo (contando lo recien lanzado)
    if (this.tiempoRonda >= cfg.duracion && !this.paquetes.some((p) => p.estado !== 'resuelto')) this.terminarRonda();
  }

  updatePaquetes(ts, dt) {
    for (const pq of [...this.paquetes]) {
      if (pq.estado === 'resuelto') continue;
      if (pq.estado === 'viaje') {
        pq.t += pq.vel * ts;
        pq.mesh.position.lerpVectors(pq.hilo.a, pq.hilo.b, Math.min(1, pq.t));
        pq.mesh.position.y = NET_Y + Math.sin(this.time * 2 + pq.fase) * 0.06;
      }
      pq.mesh.rotation.y += dt * 0.8;
      const goo = pq.mesh.getObjectByName('goo');
      if (goo) { const s = 1 + Math.sin(this.time * 5 + pq.fase) * 0.12; goo.scale.set(s, 1 / s, s); }
      if (!pq.mostrado && pq.t > 0.1) {
        pq.mostrado = true;
        pq.card.hidden = false;
        if (pq.tipo !== 'trampa') {
          this.termo = Math.min(100, this.termo + 16 + (pq.datos.severidad ?? 1) * 9);
          this.audio.play('gurgle', { volume: 0.22 });
          if (this.termo > 60 && !this.termoAvisado && this.fase === 'ronda') { this.termoAvisado = true; this.guia.avisar('🌡️ ' + T.avisos.termometro, 'info', 3200); }
        } else {
          this.audio.play('bubble', { volume: 0.18 });
        }
      }
      if (pq.estado === 'viaje' && pq.t >= 1) this.resolver(pq, 'pasar');
    }
  }

  updateEcos(ts) {
    for (const e of [...this.ecos]) {
      e.t += ts * 0.55;
      e.mesh.position.lerpVectors(e.hilo.b, e.hilo.a, Math.min(1, e.t));
      e.mesh.position.y = NET_Y;
      e.mesh.material.opacity = 0.8 * (1 - e.t * 0.6);
      if (e.t >= 1) { this.netGroup.remove(e.mesh); this.ecos = this.ecos.filter((x) => x !== e); }
    }
  }

  /** Las tarjetas DOM siguen a su paquete en pantalla */
  updateCards() {
    const rect = this.renderer.domElement.getBoundingClientRect();
    for (const pq of this.paquetes) {
      if (pq.card.hidden) continue;
      _v.copy(pq.mesh.position).project(this.camera);
      const x = (_v.x * 0.5 + 0.5) * rect.width;
      const y = (-_v.y * 0.5 + 0.5) * rect.height;
      pq.card.style.transform = `translate(${x}px, ${y - 30}px) translate(-50%, -100%)`;
    }
  }

  /* ============================================================= cierre */

  async cerrar() {
    this.fase = 'fin';
    this.cerrarMenu();
    this.pistas.limpiar();
    this.guia.ocultar();
    this.paquetes.forEach((p) => this.retirar(p));
    this.cienaga.setClaridad(Math.max(0.45, this.claridad / 100));
    const respuestas = [];
    for (const q of T.reevaluacion) {
      respuestas.push(await this.showChoice({ eyebrow: T.intro.eyebrow, title: q.pregunta, options: q.opciones.map((o) => ({ label: o, text: '', value: o })) }));
    }
    const ahora = await this.showChoice({
      eyebrow: T.intro.eyebrow, title: T.intensidadAhora,
      options: INTENSIDADES.map((i) => ({ label: i.label, text: i.text, value: i.id, color: i.color }))
    });
    recordReevaluation(ISLAND, this.intensidadInicial, 'La Cadena: límites en la red', ahora);
    completeActivity('disgust-cadena', 20);
    addReward(T.recompensa);
    setIslandLevel(ISLAND, 1, true);
    setIslandData(ISLAND, {
      cadena: { claridad: Math.round(this.claridad), coherencia: Math.round(this.coherencia), alcanzados: this.alcanzados, stats: this.stats, respuestas, intensidadFinal: ahora, at: Date.now() }
    });
    this.mostrarFeedback(respuestas);
  }

  mostrarFeedback(respuestas) {
    const s = this.stats;
    const L = T.feedback.lineas;
    const lineas = [];
    if (s.cortes) lineas.push(L.cortes(s.cortes));
    if (s.asertiva) lineas.push(L.limites(s.asertiva));
    if (s.agresiva) lineas.push(L.burlas(s.agresiva));
    if (s.evasiva) lineas.push(L.evasivas(s.evasiva));
    if (s.ayudas) lineas.push(L.ayudas(s.ayudas));
    if (s.pasaron) lineas.push(L.pasaron(s.pasaron, this.alcanzados));
    if (s.grima) lineas.push(L.grima(s.grima));
    if (s.diferenciaBien) lineas.push(L.diferenciaBien(s.diferenciaBien));
    if (s.sobreTi) lineas.push(L.sobreTi(T.feedback.acciones[s.sobreTi] ?? s.sobreTi));
    if (!lineas.length) lineas.push(T.feedback.sinDecisiones);
    const detalle = this.decisiones.filter((d) => d.tipo === 'dano' || d.tipo === 'sobreTi').slice(0, 6)
      .map((d) => `<li>${escapar(T.feedback.acciones[d.accion] ?? d.accion)} · <em>${escapar(d.texto.slice(0, 70))}${d.texto.length > 70 ? '…' : ''}</em></li>`).join('');
    this.el.overlay.innerHTML = `
      <div class="i3d-panel i3d-panel--card" role="dialog" aria-modal="true" aria-label="${T.feedback.titulo}">
        <h3>${T.feedback.titulo}</h3>
        <ul class="dg-lista">${lineas.map((l) => `<li>${l}</li>`).join('')}</ul>
        ${detalle ? `<p class="dg-sub">Decisiones concretas</p><ul class="dg-lista dg-lista--fina">${detalle}</ul>` : ''}
        <p class="dg-sub">Tú dijiste: <em>${escapar(respuestas[0])}</em> · <em>${escapar(respuestas[1])}</em></p>
        <p>${T.feedback.cierre}</p>
        <div class="i3d-panel__actions"><button class="i3d-btn i3d-btn--primary" type="button" data-ok>Continuar</button></div>
      </div>`;
    this.el.overlay.querySelector('[data-ok]').focus({ preventScroll: true });
    this.el.overlay.querySelector('[data-ok]').addEventListener('click', () => { this.el.overlay.innerHTML = ''; this.finish(); });
  }

  get completionPayload() {
    return { islandId: ISLAND, success: true, emoAventura: true, badge: ISLAND, title: 'La Cadena', message: T.feedback.cierre, juego: 'cadena' };
  }

  /** Menu de pausa con salida al menu de la isla (sin perder la sesion) */
  _showPauseMenu() {
    this.cerrarMenu();
    super._showPauseMenu();
    if (!this.onMenu) return;
    const acciones = this.el.overlay.querySelector('.i3d-panel__actions');
    const b = document.createElement('button');
    b.className = 'i3d-btn'; b.type = 'button'; b.textContent = 'Menú de la isla';
    b.addEventListener('click', () => this.onMenu());
    acciones.insertBefore(b, acciones.querySelector('[data-leave]'));
  }

  onReset() {
    this.cerrarMenu();
    this.pistas.limpiar();
    this.guia.sinBoton();
    this.practica = null;
    this.paquetes.forEach((p) => this.retirar(p));
    this.reiniciarMarcadores();
    this.el.overlay.innerHTML = '';
    this.eco = null; this.timeScale = 1;
    this.mazoDano = barajar(T.daninos); this.mazoTrampa = barajar(T.trampas);
    this.setObjective(RONDAS.length, '◉');
    this.empezarRonda(0);
  }

  onDispose() {
    this.cerrarMenu();
    this.pistas?.dispose();
    this.guia?.dispose();
    this.cardsEl?.remove();
    this.tools?.remove();
    this.waveEl?.remove();
  }
}
