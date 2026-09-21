// EL SEPARADOR · Isla del Desagrado («La Cienaga Turbia») · minijuego 2
// Pausado, manipulativo, sin cronometro. Un taller al borde de la cienaga con
// una mesa iluminada y tres contenedores al fondo. Llegan «grumos»: burbujas
// con una escena congelada donde una figura aparece envuelta por una
// sustancia oscura. La sustancia es la conducta; la figura es la persona.
//   1. Escuchar: la escena se lee en un panel
//   2. Separar: arrastrar repetidamente sobre el grumo para despegar la
//      sustancia de la figura. Se resiste: hay que insistir.
//   3. Clasificar: la conducta a «Esto rechazo» (y nombrarla), la figura a
//      «Esta persona»; los grumos trampa, enteros, a «Aqui no hay dano, hay
//      diferencia».
//   4. Elegir un paso real: una carta de accion que va al diario de limites.
// Los ultimos grumos son dilemas sin respuesta unica: ninguna clasificacion
// se marca como incorrecta; el feedback devuelve la tension y pregunta por
// el criterio usado. El medidor es «Nitidez»: no hay aciertos ni fallos.

import * as THREE from 'three';
import { MinigameBase } from '../../engine/MinigameBase.js';
import { makeAvatar } from '../../engine/worldkit.js';
import {
  gameState, addReward, completeActivity, recordReevaluation, setIslandLevel, getIslandData, setIslandData
} from '../../data/gameState.js';
import { SEPARADOR as T } from './SeparadorTextos.js';
import { CONDUCTAS, INTENSIDADES } from './IslaTextos.js';
import { construirCienaga, materialViscoso, crearGuia, crearPistas, ndcDe, escapar, barajar } from './cienaga.js';

const ISLAND = 'disgust';
const MESA_Y = 1.0;                 // altura de la superficie de la mesa
const PLANO_Y = MESA_Y + 0.5;       // plano por el que se arrastran las piezas
const CENTRO = new THREE.Vector3(0, MESA_Y + 1.0, 0.2);
const CONTENEDORES = [
  { id: 'rechazo', x: -3.3, z: -2.9, color: '#3a2a4a', luz: '#8a6ab0' },
  { id: 'persona', x: 0, z: -2.9, color: '#8a7a3e', luz: '#ffd166' },
  { id: 'diferencia', x: 3.3, z: -2.9, color: '#6e8a8a', luz: '#e8f1ee' }
];
const SEP_META = 1;                 // separacion completa
const STROKE_MIN_PX = 40;

const _v = new THREE.Vector3();
const _w = new THREE.Vector3();
const _ndc = new THREE.Vector2();
const _plano = new THREE.Plane(new THREE.Vector3(0, 1, 0), -PLANO_Y);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export class SeparadorGame extends MinigameBase {
  constructor(opts) {
    super({ ...opts, mode: 'third' });
    this.onMenu = opts.onMenu ?? null;
    this.nombre = opts.player?.name || 'tú';
    this.grumos = [];
    this.indice = 0;
    this.actual = null;              // grumo en la mesa
    this.fase = 'intro';             // intro | llega | escuchar | separar | clasificar | nombrar | accion | fin
    this.nitidez = 50;
    this.stroke = null;
    this.arrastre = null;            // { item, pid, x0, y0, movido }
    this.menu = null;                // botones al tocar una pieza
    this.stats = { separadas: 0, conDano: 0, etiquetas: 0, diferencias: 0, totalDiferencias: 0, diferenciasFallo: 0, personaRechazada: 0, dilemas: 0, pasos: 0 };
    this.diario = [];
    this.intensidadInicial = getIslandData(ISLAND).intensidad ?? gameState.initialIntensity ?? 'media';
    this.raycaster = new THREE.Raycaster();
    this.time = 0;
    this.pins = [];
  }

  /* ============================================================ escenario */

  build() {
    this.controller.enabled = false;
    this.el.touch.remove();
    this.cienaga = construirCienaga(this, { claridad: this.nitidez / 100, aguaY: -0.3 });
    this.camera.fov = 48;
    this.camera.updateProjectionMatrix();
    this.camera.position.set(0, 8.4, 7.4);
    this.camera.lookAt(0, MESA_Y + 0.4, -0.6);

    const scene = this.scene;
    // taller: tarima de madera, mesa y una lampara que la ilumina
    const madera = new THREE.MeshStandardMaterial({ color: '#5a4630', roughness: 0.95, flatShading: true });
    const tarima = new THREE.Mesh(new THREE.BoxGeometry(14, 0.4, 10), madera);
    tarima.position.set(0, -0.2, -0.5);
    tarima.receiveShadow = true;
    scene.add(tarima);
    const mesa = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.28, 3.4), new THREE.MeshStandardMaterial({ color: '#8a6d46', roughness: 0.85, flatShading: true }));
    mesa.position.set(0, MESA_Y - 0.14, 0.2);
    mesa.receiveShadow = true;
    mesa.castShadow = true;
    scene.add(mesa);
    const pataGeo = new THREE.BoxGeometry(0.25, MESA_Y, 0.25);
    [[-2.4, -1.3], [2.4, -1.3], [-2.4, 1.6], [2.4, 1.6]].forEach(([x, z]) => {
      const p = new THREE.Mesh(pataGeo, madera);
      p.position.set(x, MESA_Y / 2 - 0.2, z);
      scene.add(p);
    });
    this.lampara = new THREE.PointLight('#ffe9c4', 2.2, 12, 1.6);
    this.lampara.position.set(0, MESA_Y + 3.4, 0.4);
    this.lampara.castShadow = true;
    scene.add(this.lampara);
    const pantalla = new THREE.Mesh(new THREE.ConeGeometry(0.7, 0.5, 8, 1, true), new THREE.MeshStandardMaterial({ color: '#2a2a2a', roughness: 0.8, side: THREE.DoubleSide, flatShading: true }));
    pantalla.position.set(0, MESA_Y + 3.6, 0.4);
    scene.add(pantalla);
    const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 4, 4), new THREE.MeshBasicMaterial({ color: '#111' }));
    cable.position.set(0, MESA_Y + 5.6, 0.4);
    scene.add(cable);

    // contenedores: cajas abiertas al fondo, cada una con su luz
    this.contenedores = CONTENEDORES.map((c) => {
      const g = new THREE.Group();
      const mat = new THREE.MeshStandardMaterial({ color: c.color, roughness: 0.9, flatShading: true });
      const base = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.15, 1.8), mat);
      g.add(base);
      const lados = [[0, -0.85, 2.4, 0.15], [0, 0.85, 2.4, 0.15], [-1.15, 0, 0.15, 1.8], [1.15, 0, 0.15, 1.8]];
      lados.forEach(([x, z, w, d]) => {
        const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.9, d), mat);
        m.position.set(x, 0.45, z);
        m.castShadow = true;
        g.add(m);
      });
      const luz = new THREE.PointLight(c.luz, 0.9, 5, 2);
      luz.position.set(0, 1.2, 0);
      g.add(luz);
      const glow = new THREE.Mesh(new THREE.CircleGeometry(0.9, 20), new THREE.MeshBasicMaterial({ color: c.luz, transparent: true, opacity: 0.25, depthWrite: false }));
      glow.rotation.x = -Math.PI / 2;
      glow.position.y = 0.1;
      g.add(glow);
      g.position.set(c.x, 0, c.z);
      scene.add(g);
      return { ...c, group: g, luz, glow };
    });

    this.matSustancia = materialViscoso();
    this.matBurbuja = new THREE.MeshPhysicalMaterial({ color: '#cfe6df', transparent: true, opacity: 0.22, roughness: 0.15, metalness: 0, transmission: 0.2, side: THREE.DoubleSide, depthWrite: false });
    this.matHaz = new THREE.MeshBasicMaterial({ color: '#e8f1ee', transparent: true, opacity: 0.35, depthWrite: false });
    this.haz = new THREE.Mesh(new THREE.CircleGeometry(0.42, 24), this.matHaz);
    this.haz.rotation.x = -Math.PI / 2;
    this.haz.visible = false;
    scene.add(this.haz);

    this.buildHud();
    this.buildInput();
    this.guia = crearGuia(this);
    this.pistas = crearPistas(this, this.pinsEl);
    this.grumos = [...T.grumos];
    this.setObjective(this.grumos.length, '◦');
  }

  /* ================================================================ HUD */

  buildHud() {
    this.barNitidez = this.addBar('nitidez', { icon: '🔍', color: '#e8f1ee', value: this.nitidez / 100 });
    this.waveEl = document.createElement('div');
    this.waveEl.className = 'i3d-wave';
    this.el.hud.appendChild(this.waveEl);
    this.pasosEl = document.createElement('div');
    this.pasosEl.className = 'dg-pasos';
    this.el.hud.appendChild(this.pasosEl);
    this.pinsEl = document.createElement('div');
    this.pinsEl.className = 'dg-cards';
    this.el.hud.appendChild(this.pinsEl);
    this.pins = CONTENEDORES.map((c) => {
      const el = document.createElement('div');
      el.className = `dg-pin dg-pin--${c.id}`;
      el.innerHTML = `<strong>${T.contenedores[c.id].titulo}</strong><small>${T.contenedores[c.id].sub}</small>`;
      this.pinsEl.appendChild(el);
      return { id: c.id, el, pos: new THREE.Vector3(c.x, 1.9, c.z) };
    });
    this.renderLabel();
  }

  renderLabel() {
    const n = Math.min(this.grumos.length, this.indice + 1);
    this.waveEl.innerHTML = `${T.hud.grumo} <b>${n}</b> de ${this.grumos.length} <small>· ${T.hud.nitidez} ${Math.round(this.nitidez)}</small>`;
    const orden = ['escuchar', 'separar', 'clasificar', 'paso'];
    const actual = this.fase === 'nombrar' ? 'clasificar' : this.fase === 'accion' ? 'paso' : this.fase;
    const i = orden.indexOf(actual);
    this.pasosEl.innerHTML = orden.map((k, j) => `<span class="${j < i ? 'is-done' : j === i ? 'is-on' : ''}">${T.pasos[k]}</span>`).join('<i>→</i>');
  }

  /* ============================================================== input */

  buildInput() {
    const dom = this.renderer.domElement;
    const down = (e) => {
      if (this.paused || this.finished) return;
      if (e.button !== undefined && e.button > 0) return;
      e.preventDefault();
      try { dom.setPointerCapture(e.pointerId); } catch { /* opcional */ }
      if (this.menu) { this.cerrarMenu(); return; }
      if (this.fase === 'separar') {
        this.stroke = { pid: e.pointerId, px: e.clientX, py: e.clientY, largo: 0, dentro: this.sobreGrumo(e) };
        this.haz.visible = true;
        return;
      }
      if (this.fase === 'clasificar') {
        const item = this.piezaBajo(e);
        if (item) {
          this.arrastre = { item, pid: e.pointerId, x0: e.clientX, y0: e.clientY, movido: false };
          item.obj.userData.origen = item.obj.position.clone();
          this.audio.play('interact', { volume: 0.25 });
        }
      }
    };
    const move = (e) => {
      if (this.paused || this.finished) return;
      const p = this.puntoPlano(e);
      if (p) this.haz.position.set(p.x, MESA_Y + 0.02, p.z);
      if (this.stroke && e.pointerId === this.stroke.pid) {
        const d = Math.hypot(e.clientX - this.stroke.px, e.clientY - this.stroke.py);
        this.stroke.px = e.clientX; this.stroke.py = e.clientY;
        if (this.sobreGrumo(e)) { this.stroke.largo += d; this.stroke.dentro = true; this.tirarSustancia(d); }
        return;
      }
      if (this.arrastre && e.pointerId === this.arrastre.pid && p) {
        const a = this.arrastre;
        if (!a.movido && Math.hypot(e.clientX - a.x0, e.clientY - a.y0) > 10) a.movido = true;
        if (!a.movido) return;
        a.item.obj.position.set(clamp(p.x, -5.2, 5.2), PLANO_Y + 0.3, clamp(p.z, -4.2, 2.4));
        this.marcarContenedor(this.contenedorBajo(a.item.obj.position)?.id ?? null);
      }
    };
    const up = (e) => {
      if (this.stroke && (!e || e.pointerId === undefined || e.pointerId === this.stroke.pid)) this.terminarStroke();
      if (this.arrastre && (!e || e.pointerId === undefined || e.pointerId === this.arrastre.pid)) {
        if (this.arrastre.movido) this.soltarPieza();
        else { const { item } = this.arrastre; this.arrastre = null; this.abrirMenu(item); }
      }
    };
    const blur = () => up();
    dom.addEventListener('pointerdown', down);
    dom.addEventListener('pointermove', move);
    dom.addEventListener('pointerup', up);
    dom.addEventListener('pointercancel', up);
    window.addEventListener('pointerup', up);
    window.addEventListener('blur', blur);
    this.listeners.push(() => dom.removeEventListener('pointerdown', down));
    this.listeners.push(() => dom.removeEventListener('pointermove', move));
    this.listeners.push(() => dom.removeEventListener('pointerup', up));
    this.listeners.push(() => dom.removeEventListener('pointercancel', up));
    this.listeners.push(() => window.removeEventListener('pointerup', up));
    this.listeners.push(() => window.removeEventListener('blur', blur));
  }

  contenedorBajo(p) {
    return CONTENEDORES.find((k) => Math.abs(p.x - k.x) < 1.6 && p.z < -1.5) ?? null;
  }

  /** Resalta el contenedor sobre el que pasa la pieza arrastrada */
  marcarContenedor(id) {
    this.pins.forEach((pin) => pin.el.classList.toggle('is-over', pin.id === id));
  }

  /** Resalta el contenedor al que toca llevar la pieza (o ninguno) */
  destinoSugerido(id) {
    this.pins.forEach((pin) => pin.el.classList.toggle('is-target', pin.id === id));
  }

  /* =============================================================== menu */

  /** Tocar una pieza: los tres contenedores como botones */
  abrirMenu(item) {
    this.cerrarMenu();
    if (!item || item.hecha || this.fase !== 'clasificar') return;
    const el = document.createElement('div');
    el.className = 'dg-menu';
    el.setAttribute('role', 'dialog');
    el.innerHTML = `
      <p class="dg-menu__titulo">${T.guia.menu(T.guia.piezas[item.id])}</p>
      <div class="dg-menu__botones dg-menu__botones--col">
        ${CONTENEDORES.map((c) => `<button type="button" data-c="${c.id}" class="dg-menu__btn--${c.id}">${T.contenedores[c.id].titulo}<small>${T.contenedores[c.id].sub}</small></button>`).join('')}
      </div>`;
    this.el.hud.appendChild(el);
    this.menu = { item, el };
    this.guia.ocultar();
    el.querySelectorAll('[data-c]').forEach((b) => b.addEventListener('click', () => {
      const destino = b.dataset.c;
      this.cerrarMenu();
      if (!item.hecha && this.fase === 'clasificar') this.clasificar(item, destino);
    }));
    el.querySelector('[data-c]').focus({ preventScroll: true });
  }

  cerrarMenu() {
    if (!this.menu) return;
    this.menu.el.remove();
    this.menu = null;
    this.guia.mostrar();
  }

  puntoPlano(e) {
    ndcDe(e, this.renderer.domElement, _ndc);
    this.raycaster.setFromCamera(_ndc, this.camera);
    return this.raycaster.ray.intersectPlane(_plano, _w) ? _w : null;
  }

  /** ¿El puntero esta sobre el grumo? Se mide en pantalla, con margen generoso */
  sobreGrumo(e) {
    if (!this.actual) return false;
    const rect = this.renderer.domElement.getBoundingClientRect();
    _v.copy(this.actual.group.position).project(this.camera);
    const x = (_v.x * 0.5 + 0.5) * rect.width + rect.left;
    const y = (-_v.y * 0.5 + 0.5) * rect.height + rect.top;
    return Math.hypot(e.clientX - x, e.clientY - y) < Math.min(rect.width, rect.height) * 0.19;
  }

  piezaBajo(e) {
    if (!this.actual) return null;
    ndcDe(e, this.renderer.domElement, _ndc);
    this.raycaster.setFromCamera(_ndc, this.camera);
    const piezas = this.actual.piezas.filter((p) => p.obj.visible && !p.hecha);
    const hits = this.raycaster.intersectObjects(piezas.map((p) => p.obj), true);
    if (hits.length) {
      let o = hits[0].object;
      while (o && !piezas.find((p) => p.obj === o)) o = o.parent;
      const pieza = piezas.find((p) => p.obj === o);
      if (pieza) return pieza;
    }
    // sin acierto exacto: la pieza mas cercana en pantalla, si esta a mano
    const rect = this.renderer.domElement.getBoundingClientRect();
    let mejor = null; let dm = Math.min(rect.width, rect.height) * 0.12;
    for (const p of piezas) {
      _v.copy(p.obj.position).project(this.camera);
      const d = Math.hypot((_v.x * 0.5 + 0.5) * rect.width + rect.left - e.clientX, (-_v.y * 0.5 + 0.5) * rect.height + rect.top - e.clientY);
      if (d < dm) { dm = d; mejor = p; }
    }
    return mejor;
  }

  /* ============================================================= grumos */

  async onStart() {
    await this.showIntro({ ...T.intro, cta: 'Empezar' });
    this.ambient = this.audio.ambient('swamp', { volume: 0.18, rate: 0.85 });
    this.siguienteGrumo();
  }

  siguienteGrumo() {
    if (this.indice >= this.grumos.length) { this.cerrar(); return; }
    const datos = this.grumos[this.indice];
    this.fase = 'llega';
    this.renderLabel();
    this.guia.guiar(T.guia.llega, '🫧');
    this.destinoSugerido(null);
    this.actual = this.crearGrumo(datos);
    // llega flotando desde la cienaga hasta la mesa
    const desde = new THREE.Vector3(-9, MESA_Y + 2.2, -4);
    this.actual.group.position.copy(desde);
    this.audio.play('bubble', { volume: 0.35 });
    this.feedback.tween({
      from: 0, to: 1, duration: 2.2,
      onUpdate: (t) => { this.actual?.group.position.lerpVectors(desde, CENTRO, t); this.actual.group.position.y += Math.sin(t * Math.PI) * 1.2; },
      onDone: () => this.escuchar()
    });
  }

  crearGrumo(datos) {
    const group = new THREE.Group();
    this.scene.add(group);
    const esDiferencia = datos.tipo === 'diferencia';
    const burbuja = new THREE.Mesh(new THREE.SphereGeometry(1.25, 24, 16), this.matBurbuja);
    group.add(burbuja);
    // la figura: la persona. En el grumo propio, con el color del jugador.
    const figura = makeAvatar({ color: datos.propio ? (this.player?.favoriteColor ?? '#f5b942') : '#c9b8a2', accent: '#efe6d6', emoji: datos.propio ? (this.player?.avatar ?? null) : null });
    figura.scale.setScalar(0.72);
    figura.position.set(0, -0.95, 0);
    group.add(figura);
    // la sustancia: blobs oscuros pegados a la figura (ninguno en las trampas)
    const blobs = [];
    const n = esDiferencia ? 0 : 12;
    for (let i = 0; i < n; i += 1) {
      const a = (i / n) * Math.PI * 2 + (i % 2) * 0.3;
      const r = 0.42 + (i % 3) * 0.1;
      const y = -0.6 + (i % 4) * 0.28;
      const b = new THREE.Mesh(new THREE.IcosahedronGeometry(0.16 + (i % 3) * 0.06, 0), this.matSustancia);
      const home = new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r * 0.8);
      const fuera = new THREE.Vector3(1.9 + (i % 4) * 0.12, -0.55 + (i % 3) * 0.16, 0.2 + ((i * 7) % 5) * 0.1 - 0.2);
      b.position.copy(home);
      b.userData = { home, fuera, fase: i * 0.7 };
      group.add(b);
      blobs.push(b);
    }
    // en las trampas hay un velo palido que no se despega: no hay nada que separar
    let velo = null;
    if (esDiferencia) {
      velo = new THREE.Mesh(new THREE.SphereGeometry(0.95, 16, 12), new THREE.MeshStandardMaterial({ color: '#d9e6e2', transparent: true, opacity: 0.18, roughness: 0.5, depthWrite: false }));
      velo.position.y = -0.4;
      group.add(velo);
    }
    // grupo de la sustancia ya separada (se rellena al completar la separacion)
    const sustancia = new THREE.Group();
    sustancia.visible = false;
    group.add(sustancia);
    const grumo = {
      datos, group, burbuja, figura, blobs, velo, sustancia,
      sep: 0, strokes: 0, separado: false, avisoNada: false,
      piezas: [], rechazoHecho: false, personaHecha: false, criterio: null, etiqueta: null, clasificacion: null
    };
    return grumo;
  }

  /* ---- 1. escuchar ---- */
  escuchar() {
    const g = this.actual;
    this.fase = 'escuchar';
    this.renderLabel();
    this.panel({
      eyebrow: `${T.pasos.escuchar} · ${g.datos.titulo}`,
      html: `<p class="dg-escena">${escapar(g.datos.texto)}</p>${g.datos.tipo === 'dilema' ? `<p class="dg-sub">${T.avisos.dilema}</p>` : ''}`,
      botones: [{ texto: 'Continuar', primario: true, accion: () => this.separar() }]
    }).classList.add('dg-panel--abajo');         // abajo: el grumo se ve mientras se escucha
  }

  /* ---- 2. separar ---- */
  separar() {
    const g = this.actual;
    this.fase = 'separar';
    this.renderLabel();
    this.guia.guiar(T.guia.separar, '🖐️');
    this.guia.progreso('');
    this.pistas.poner('frotar', 'frotar', CENTRO);
  }

  /** Cada tramo de arrastre sobre el grumo tira de la sustancia */
  tirarSustancia(px) {
    const g = this.actual;
    if (!g || g.separado) return;
    if (!g.blobs.length) return;             // trampa: no hay nada que separar
    // resistencia: los primeros tirones rinden poco; insistir rinde mas
    const rendimiento = 0.0009 + Math.min(0.0022, g.strokes * 0.00035);
    g.sep = Math.min(SEP_META, g.sep + px * rendimiento);
    this.guia.progreso(`${T.guia.separando} ${Math.round(g.sep * 100)} %`);
    if (Math.random() < 0.06) this.audio.play('rub', { volume: 0.2, rate: 0.9 + Math.random() * 0.3 });
  }

  terminarStroke() {
    const s = this.stroke;
    this.stroke = null;
    this.haz.visible = false;
    const g = this.actual;
    if (!g || !s || s.largo < STROKE_MIN_PX) return;
    g.strokes += 1;
    this.pistas.quitar('frotar');
    if (!g.blobs.length) {
      // trampa: insistir no despega nada; a la segunda se dice y se deja decidir
      if (g.strokes === 2 && !g.avisoNada) {
        g.avisoNada = true;
        this.guia.avisar(T.avisos.nadaQueSeparar, 'grima', 2600);
        this.fase = 'clasificar';
        this.prepararPiezas();
      } else if (g.strokes > 2) {
        this.nitidez = clamp(this.nitidez - 1, 0, 100);
      }
      this.audio.play('bubble', { volume: 0.2 });
      return;
    }
    if (g.sep >= SEP_META) this.completarSeparacion();
    else if (g.strokes === 2) this.guia.avisar(T.avisos.separando, 'info', 1600);
  }

  completarSeparacion() {
    const g = this.actual;
    g.separado = true;
    this.stats.separadas += 1;
    this.audio.play('warm', { volume: 0.45 });
    this.feedback.burst(_v.copy(g.group.position), { count: 20, color: '#e8f1ee', speed: 2.2, life: 0.8 });
    // la burbuja se abre; los blobs se agrupan en una sola sustancia a un lado
    this.feedback.tween({ from: 1, to: 0.001, duration: 0.6, onUpdate: (s) => { g.burbuja.scale.setScalar(s); }, onDone: () => { g.burbuja.visible = false; } });
    g.blobs.forEach((b) => { g.group.remove(b); g.sustancia.add(b); b.position.copy(b.userData.fuera).sub(new THREE.Vector3(1.9, -0.55, 0.2)); });
    g.sustancia.position.set(1.9, -0.55, 0.2);
    g.sustancia.visible = true;
    this.guia.avisar(T.avisos.separado, 'ok', 2400);
    this.later(() => { this.fase = 'clasificar'; this.prepararPiezas(); }, 900);
  }

  /** Piezas que se pueden arrastrar: sustancia, figura o el grumo entero */
  prepararPiezas() {
    const g = this.actual;
    g.piezas = [];
    g.group.rotation.y = 0;
    if (g.separado) {
      // las dos partes pasan a coordenadas de mundo: se arrastran por el plano de la mesa
      this.scene.attach(g.sustancia);
      this.scene.attach(g.figura);
      g.piezas.push({ id: 'conducta', obj: g.sustancia, hecha: false });
      g.piezas.push({ id: 'persona', obj: g.figura, hecha: false });
    } else {
      g.piezas.push({ id: 'grumo', obj: g.group, hecha: false });
    }
    this.renderLabel();
    this.guiarClasificacion();
  }

  /** La guia dice que pieza toca y se ilumina el contenedor que le corresponde */
  guiarClasificacion() {
    const g = this.actual;
    if (!g || this.fase !== 'clasificar') return;
    if (g.datos.tipo === 'dilema') { this.guia.guiar(T.guia.dilema, '⚖️'); this.destinoSugerido(null); return; }
    if (!g.separado) { this.guia.guiar(T.guia.nadaQueSeparar, '👉'); this.destinoSugerido(null); return; }
    if (!g.rechazoHecho) { this.guia.guiar(T.guia.conducta, '👉'); this.destinoSugerido('rechazo'); return; }
    if (!g.personaHecha) { this.guia.guiar(T.guia.persona, '👉'); this.destinoSugerido('persona'); return; }
    this.destinoSugerido(null);
  }

  soltarPieza() {
    const { item } = this.arrastre;
    this.arrastre = null;
    this.marcarContenedor(null);
    const c = this.contenedorBajo(item.obj.position);
    if (!c) { this.devolver(item); return; }
    this.clasificar(item, c.id);
  }

  devolver(item) {
    const o = item.obj;
    const desde = o.position.clone();
    const hasta = o.userData.origen ?? desde;
    this.feedback.tween({ from: 0, to: 1, duration: 0.45, onUpdate: (t) => o.position.lerpVectors(desde, hasta, t) });
  }

  /* ---- 3. clasificar ---- */
  clasificar(item, destino) {
    const g = this.actual;
    const tipo = g.datos.tipo;
    const esDilema = tipo === 'dilema';
    const aviso = (texto, sonido = 'lowNote', delta = 0) => {
      this.guia.avisar(texto, delta < 0 ? 'mal' : 'ok', 3200);
      this.audio.play(sonido, { volume: 0.35 });
      this.nitidez = clamp(this.nitidez + delta, 0, 100);
      this.renderLabel();
    };

    if (item.id === 'conducta') {
      if (destino === 'rechazo') { item.hecha = true; this.meter(item, destino); this.nombrar(item); return; }
      if (destino === 'persona') { aviso(T.avisos.conductaEnPersona, 'lowNote', -3); this.devolver(item); return; }
      if (esDilema) { this.meter(item, destino); item.hecha = true; g.rechazoHecho = true; g.clasificacion = `conducta→${destino}`; this.comprobarGrumo(); return; }
      aviso(T.avisos.danoEnDiferencia, 'lowNote', -4); this.devolver(item); return;
    }
    if (item.id === 'persona') {
      if (destino === 'persona') { this.meter(item, destino); item.hecha = true; g.personaHecha = true; aviso(T.avisos.personaVuelve, 'warm', 4); this.guiarClasificacion(); this.comprobarGrumo(); return; }
      if (destino === 'rechazo') {
        this.stats.personaRechazada += 1;
        if (esDilema) { this.meter(item, destino); item.hecha = true; g.personaHecha = true; g.clasificacion = 'persona→rechazo'; this.comprobarGrumo(); return; }
        aviso(T.avisos.personaEnRechazo, 'lowNote', -5); this.devolver(item); return;
      }
      if (esDilema) { this.meter(item, destino); item.hecha = true; g.personaHecha = true; this.comprobarGrumo(); return; }
      aviso(T.avisos.danoEnDiferencia, 'lowNote', -4); this.devolver(item); return;
    }
    // grumo entero (sin separar)
    if (destino === 'diferencia') {
      if (tipo === 'diferencia') {
        this.meter(item, destino); item.hecha = true;
        this.stats.diferencias += 1;
        this.nitidez = clamp(this.nitidez + 10, 0, 100);
        this.cienaga.sumar(0.08);
        aviso(T.avisos.aguaAclara, 'chime', 0);
        this.later(() => this.terminarGrumo(), 1400);
        return;
      }
      if (esDilema) { this.meter(item, destino); item.hecha = true; g.clasificacion = 'entero→diferencia'; this.later(() => this.dilema(), 900); return; }
      aviso(T.avisos.danoEnDiferencia, 'lowNote', -4); this.devolver(item); return;
    }
    if (destino === 'rechazo') {
      this.stats.personaRechazada += 1;
      if (esDilema) { this.meter(item, destino); item.hecha = true; g.clasificacion = 'entero→rechazo'; this.later(() => this.dilema(), 900); return; }
      if (tipo === 'diferencia') this.stats.diferenciasFallo += 1;
      aviso(tipo === 'diferencia' ? T.avisos.diferenciaSeparada : T.avisos.personaEnRechazo, 'lowNote', -5); this.devolver(item); return;
    }
    // destino 'persona' con el grumo entero
    if (esDilema) { this.meter(item, destino); item.hecha = true; g.clasificacion = 'entero→persona'; this.later(() => this.dilema(), 900); return; }
    if (tipo === 'diferencia') { this.stats.diferenciasFallo += 1; aviso(T.avisos.diferenciaSeparada, 'lowNote', -3); this.devolver(item); return; }
    aviso(T.avisos.conductaEnPersona, 'lowNote', -3); this.devolver(item);
  }

  /** La pieza entra en el contenedor con un pequeño impulso */
  meter(item, destino) {
    const c = this.contenedores.find((k) => k.id === destino);
    const o = item.obj;
    const desde = o.position.clone();
    const hasta = new THREE.Vector3(c.x, 0.6, c.z);
    const escala0 = o.scale.x;
    this.audio.play(destino === 'rechazo' ? 'squelch' : 'soften', { volume: 0.35 });
    this.feedback.tween({
      from: 0, to: 1, duration: 0.5,
      onUpdate: (t) => { o.position.lerpVectors(desde, hasta, t); o.scale.setScalar(escala0 * (1 - t * 0.6)); },
      onDone: () => { o.visible = false; c.luz.intensity = 2.4; this.feedback.tweenValue(c.luz, 'intensity', 0.9, 1.2); }
    });
  }

  nombrar(item) {
    const g = this.actual;
    this.fase = 'nombrar';
    this.renderLabel();
    const opciones = barajar(CONDUCTAS);
    this.panel({
      eyebrow: T.contenedores.rechazo.titulo,
      html: `<h3>${T.avisos.nombra}</h3><div class="dg-etiquetas">${opciones.map((c) => `<button class="dg-etiqueta" type="button" data-c="${c.id}"><b>${c.icono}</b><span>${c.nombre}<small>${c.detalle}</small></span></button>`).join('')}</div>`,
      botones: [],
      onMount: (p) => p.querySelectorAll('[data-c]').forEach((b) => b.addEventListener('click', () => {
        const id = b.dataset.c;
        g.etiqueta = id;
        this.cerrarPanel();
        const bien = id === g.datos.conducta;
        if (bien) { this.stats.etiquetas += 1; this.nitidez = clamp(this.nitidez + 4, 0, 100); this.guia.avisar(T.avisos.etiquetaBien, 'ok'); this.audio.play('chime', { volume: 0.35 }); }
        else { this.nitidez = clamp(this.nitidez + 1, 0, 100); this.guia.avisar(T.avisos.etiquetaOtra, 'info'); this.audio.play('soften', { volume: 0.3 }); }
        item.hecha = true;
        g.rechazoHecho = true;
        this.fase = 'clasificar';
        this.renderLabel();
        this.guiarClasificacion();
        this.comprobarGrumo();
      }))
    });
  }

  comprobarGrumo() {
    const g = this.actual;
    if (!(g.rechazoHecho && g.personaHecha)) return;
    if (g.datos.tipo === 'dilema') { this.later(() => this.dilema(), 700); return; }
    this.stats.conDano += 1;
    this.nitidez = clamp(this.nitidez + 4, 0, 100);
    this.cienaga.sumar(0.05);
    this.renderLabel();
    this.later(() => this.accion(), 800);
  }

  /** Dilema: se devuelve la tension del caso y se pregunta por el criterio */
  dilema() {
    const g = this.actual;
    this.stats.dilemas += 1;
    this.cienaga.sumar(0.04);
    this.panel({
      eyebrow: `${g.datos.titulo} · ${T.avisos.dilema}`,
      html: `<p class="dg-escena">${escapar(g.datos.tension)}</p><h3>${T.criterios.pregunta}</h3>
             <div class="i3d-choice">${T.criterios.opciones.map((o, i) => `<button class="i3d-choice__btn" type="button" data-i="${i}"><strong>${escapar(o)}</strong></button>`).join('')}</div>`,
      botones: [],
      onMount: (p) => p.querySelectorAll('[data-i]').forEach((b) => b.addEventListener('click', () => {
        g.criterio = T.criterios.opciones[Number(b.dataset.i)];
        this.nitidez = clamp(this.nitidez + 5, 0, 100);
        this.cerrarPanel();
        this.accion();
      }))
    });
  }

  /* ---- 4. un paso real ---- */
  accion() {
    const g = this.actual;
    this.fase = 'accion';
    this.renderLabel();
    this.panel({
      eyebrow: T.acciones.titulo,
      html: `<p class="dg-sub">${T.acciones.sub}</p><div class="dg-acciones">${T.acciones.lista.map((a) => `<button class="dg-accion" type="button" data-a="${a.id}">${escapar(a.texto)}</button>`).join('')}</div>`,
      botones: [],
      onMount: (p) => p.querySelectorAll('[data-a]').forEach((b) => b.addEventListener('click', () => {
        const a = T.acciones.lista.find((x) => x.id === b.dataset.a);
        const entrada = { escena: g.datos.titulo, conducta: g.etiqueta ?? g.datos.conducta ?? null, accion: a.texto, criterio: g.criterio, at: Date.now() };
        this.diario.push(entrada);
        this.stats.pasos += 1;
        const datos = getIslandData(ISLAND);
        setIslandData(ISLAND, { diario: [...(datos.diario ?? []), entrada] });
        this.cerrarPanel();
        this.audio.play('paper', { volume: 0.35 });
        this.guia.avisar(T.avisos.guardado, 'ok', 2000);
        this.later(() => this.terminarGrumo(), 900);
      }))
    });
  }

  terminarGrumo() {
    const g = this.actual;
    this.cerrarMenu();
    this.pistas.limpiar();
    this.destinoSugerido(null);
    this.marcarContenedor(null);
    if (this.indice + 1 < this.grumos.length) this.guia.guiar(T.guia.siguiente, '🫧');
    if (g.datos.tipo === 'diferencia') this.stats.totalDiferencias += 1;
    this.advanceObjective(1);
    this.cienaga.setClaridad(clamp(this.nitidez / 100, 0.2, 0.95));
    // lo que quede en la mesa se va flotando
    const grupo = g.group;
    const sueltas = [g.sustancia, g.figura].filter((o) => o.parent === this.scene);
    this.feedback.tween({ from: 0, to: 1, duration: 0.8, onUpdate: (t) => { grupo.position.y = CENTRO.y + t * 2; grupo.scale.setScalar(1 - t * 0.9); }, onDone: () => { this.scene.remove(grupo); sueltas.forEach((o) => this.scene.remove(o)); this.liberarGrumo(g); } });
    this.actual = null;
    this.indice += 1;
    this.later(() => this.siguienteGrumo(), 900);
  }

  liberarGrumo(g) {
    [g.group, g.sustancia, g.figura].forEach((raiz) => raiz.traverse((o) => {
      if (o.isMesh && o.material !== this.matSustancia && o.material !== this.matBurbuja) { o.geometry?.dispose?.(); o.material?.dispose?.(); }
    }));
  }

  /* ============================================================== bucle */

  onUpdate(dt) {
    this.time += dt;
    this.cienaga.update(dt);
    this.barNitidez.set(this.nitidez / 100);
    this.lampara.intensity = 2.1 + Math.sin(this.time * 1.7) * 0.12;
    const g = this.actual;
    if (g) {
      if (!g.separado) {
        // resistencia: sin tirar, la sustancia vuelve a pegarse despacio
        if (!this.stroke && g.sep > 0) g.sep = Math.max(0, g.sep - dt * 0.05);
        const k = g.sep;
        g.blobs.forEach((b) => {
          const j = Math.sin(this.time * 6 + b.userData.fase) * 0.03 * (this.stroke ? 3 : 1);
          b.position.lerpVectors(b.userData.home, b.userData.fuera, k * k);
          b.position.y += j;
          const s = 1 + Math.sin(this.time * 3 + b.userData.fase) * 0.08;
          b.scale.set(s, 1 / s, s);
        });
        if (g.velo) g.velo.material.opacity = 0.14 + Math.sin(this.time * 2) * 0.04;
        if (g.burbuja.visible) g.burbuja.position.y = Math.sin(this.time * 1.2) * 0.05;
      }
      const pc = g.piezas.find((p) => p.id === 'conducta');
      if (pc && !pc.hecha && !this.arrastre) { const s = 1 + Math.sin(this.time * 4) * 0.05; g.sustancia.scale.set(s, 1 / s, s); }
      if (this.fase === 'llega' || this.fase === 'escuchar') g.group.rotation.y += dt * 0.15;
    }
    this.updatePins();
    this.pistas.update();
  }

  updatePins() {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pins.forEach((pin) => {
      _v.copy(pin.pos).project(this.camera);
      pin.el.style.transform = `translate(${(_v.x * 0.5 + 0.5) * rect.width}px, ${(-_v.y * 0.5 + 0.5) * rect.height}px) translate(-50%, -100%)`;
    });
  }

  /* ============================================================ paneles */

  /** Panel sobre la escena (sin pausar el agua). `botones` = [{texto, primario, accion}] */
  panel({ eyebrow = '', html = '', botones = [], onMount = null }) {
    this.cerrarMenu();
    this.guia.ocultar();
    this.el.overlay.innerHTML = `
      <div class="i3d-panel i3d-panel--card dg-panel" role="dialog" aria-modal="true" aria-label="${escapar(eyebrow)}">
        ${eyebrow ? `<p class="i3d-intro__eyebrow">${escapar(eyebrow)}</p>` : ''}
        ${html}
        ${botones.length ? `<div class="i3d-panel__actions">${botones.map((b, i) => `<button class="i3d-btn ${b.primario ? 'i3d-btn--primary' : ''}" type="button" data-b="${i}">${b.texto}</button>`).join('')}</div>` : ''}
      </div>`;
    const p = this.el.overlay.querySelector('.dg-panel');
    botones.forEach((b, i) => p.querySelector(`[data-b="${i}"]`).addEventListener('click', () => { this.cerrarPanel(); b.accion?.(); }));
    onMount?.(p);
    p.querySelector('button')?.focus({ preventScroll: true });
    return p;
  }

  cerrarPanel() { this.el.overlay.innerHTML = ''; this.guia.mostrar(); }

  /* ============================================================= cierre */

  async cerrar() {
    this.fase = 'fin';
    this.cerrarMenu();
    this.pistas.limpiar();
    this.destinoSugerido(null);
    this.guia.ocultar();
    this.renderLabel();
    const respuestas = [];
    for (const q of T.reevaluacion) {
      respuestas.push(await this.showChoice({ eyebrow: T.intro.eyebrow, title: q.pregunta, options: q.opciones.map((o) => ({ label: o, text: '', value: o })) }));
    }
    const ahora = await this.showChoice({
      eyebrow: T.intro.eyebrow, title: T.intensidadAhora,
      options: INTENSIDADES.map((i) => ({ label: i.label, text: i.text, value: i.id, color: i.color }))
    });
    recordReevaluation(ISLAND, this.intensidadInicial, 'El Separador: conducta, persona y diferencia', ahora);
    completeActivity('disgust-separador', 20);
    addReward(T.recompensa);
    setIslandLevel(ISLAND, 2, true);
    setIslandData(ISLAND, { separador: { nitidez: Math.round(this.nitidez), stats: this.stats, respuestas, intensidadFinal: ahora, at: Date.now() } });
    this.mostrarFeedback(respuestas);
  }

  mostrarFeedback(respuestas) {
    const s = this.stats;
    const L = T.feedback.lineas;
    const lineas = [
      L.separadas(s.separadas, this.grumos.filter((g) => g.tipo !== 'diferencia').length),
      s.etiquetas ? L.etiquetas(s.etiquetas) : '',
      L.diferencias(s.diferencias, this.grumos.filter((g) => g.tipo === 'diferencia').length),
      s.diferenciasFallo ? L.diferenciasFallo(s.diferenciasFallo) : '',
      s.personaRechazada ? L.personaRechazada(s.personaRechazada) : '',
      s.dilemas ? L.dilemas(s.dilemas) : '',
      L.diario(this.diario.length)
    ].filter(Boolean);
    this.el.overlay.innerHTML = `
      <div class="i3d-panel i3d-panel--card" role="dialog" aria-modal="true" aria-label="${T.feedback.titulo}">
        <h3>${T.feedback.titulo}</h3>
        <ul class="dg-lista">${lineas.map((l) => `<li>${l}</li>`).join('')}</ul>
        ${this.diario.length ? `<p class="dg-sub">Diario de límites</p><ul class="dg-lista dg-lista--fina">${this.diario.map((d) => `<li><em>${escapar(d.escena)}</em> · ${escapar(d.accion)}</li>`).join('')}</ul>` : ''}
        <p class="dg-sub">Tú dijiste: <em>${escapar(respuestas[0])}</em> · <em>${escapar(respuestas[1])}</em></p>
        <p>${T.feedback.cierre}</p>
        <div class="i3d-panel__actions"><button class="i3d-btn i3d-btn--primary" type="button" data-ok>Continuar</button></div>
      </div>`;
    this.el.overlay.querySelector('[data-ok]').focus({ preventScroll: true });
    this.el.overlay.querySelector('[data-ok]').addEventListener('click', () => { this.el.overlay.innerHTML = ''; this.finish(); });
  }

  get completionPayload() {
    return { islandId: ISLAND, success: true, emoAventura: true, badge: ISLAND, title: 'El Separador', message: T.feedback.cierre, juego: 'separador' };
  }

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
    this.destinoSugerido(null);
    this.marcarContenedor(null);
    if (this.actual) { [this.actual.group, this.actual.sustancia, this.actual.figura].forEach((o) => this.scene.remove(o)); this.liberarGrumo(this.actual); this.actual = null; }
    this.indice = 0;
    this.nitidez = 50;
    this.diario = [];
    this.stats = { separadas: 0, conDano: 0, etiquetas: 0, diferencias: 0, totalDiferencias: 0, diferenciasFallo: 0, personaRechazada: 0, dilemas: 0, pasos: 0 };
    this.cienaga.setClaridad(0.5);
    this.el.overlay.innerHTML = '';
    this.stroke = null; this.arrastre = null;
    this.contenedores.forEach((c) => { c.luz.intensity = 0.9; });
    this.setObjective(this.grumos.length, '◦');
    this.siguienteGrumo();
  }

  onDispose() {
    this.cerrarMenu();
    this.pistas?.dispose();
    this.guia?.dispose();
    this.pinsEl?.remove();
    this.pasosEl?.remove();
    this.waveEl?.remove();
  }
}
