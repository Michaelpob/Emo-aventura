// ISLA DEL DESAGRADO · NIVEL 1 · «Las cuatro cuevas del desagrado»
// Una caverna central con cuatro entradas (olores, sabores, imagenes,
// sonidos). En cada cueva aparecen seis elementos, de uno en uno, y el
// jugador los arrastra (o toca un totem) hacia «Me da desagrado», «Me da
// igual» o «Me agrada». No hay respuestas correctas: el desagrado es personal.
//
// Camara fija; todo va con puntero (raton o dedo). Las respuestas se guardan
// en localStorage bajo "emoaventura.desagrado" (desagradoStore.js).

import * as THREE from 'three';
import { MinigameBase } from '../../engine/MinigameBase.js';
import { addReward, completeActivity, setIslandLevel } from '../../data/gameState.js';
import { CUEVAS, CUEVAS_TEXTOS as T, RESPUESTAS } from './DesagradoTextos.js';
import { crearCaverna, crearEntrada, crearTotem, spriteElemento, crearPantano, crearMesaPiedra, crearBosque, crearCristales } from './desagradoAssets.js';
import { crearSonidosDesagrado } from './desagradoSonidos.js';
import { leerDesagrado, registrarRespuesta, marcarCuevaCompletada, terminarCuevas, reiniciarCuevas, resumenCuevas } from './desagradoStore.js';
import { escapar, ndcDe, aPantalla, crearGuia, crearAnclas, encuadrar, altoDe, leerEnVozAlta, callarVoz } from './desagradoUi.js';

const ISLAND = 'disgust';
const POS_ELEMENTO = new THREE.Vector3(0, 3.3, 0.4);      // donde aparece cada elemento (arriba, en el centro)
const TOTEM_Z = 4.2;                                       // los totems, delante y abajo
const TOTEM_X = [-3.8, 0, 3.8];
const TOTEM_ESCALA = 0.68;                                 // pequenos: no tapan la cueva
const TOTEM_CABEZA_Y = 3.05 * TOTEM_ESCALA;                // altura de la carita en el mundo
const ENTRADAS = [[-8.6, -5.0], [-3.8, -9.2], [3.8, -9.2], [8.6, -5.0]];   // [x, z] de cada arco
const ETIQUETA_Y = [4.0, 5.2, 5.2, 4.0];                                    // altura del rotulo (los del fondo, mas arriba: no se pisan)
const RADIO_SUELTA = 0.13;                                  // fraccion de pantalla para soltar en un totem
const HUB = { paredes: '#3b3550', suelo: '#4a4360', niebla: '#2a2438' };

const _ndc = new THREE.Vector2();
const _w = new THREE.Vector3();
const _p = { x: 0, y: 0 };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export class DisgustCavesGame extends MinigameBase {
  constructor(opts) {
    super({ ...opts, mode: 'third' });
    this.onMenu = opts.onMenu ?? null;
    this.fase = 'intro';            // intro | hub | cueva | transicion | fin
    this.cueva = null;              // datos de la cueva actual
    this.indice = 0;
    this.elemento = null;           // { datos, sprite, anclaId }
    this.arrastre = null;           // { pid, x0, y0, movido }
    this.sobreTotem = null;
    this.completadas = new Set(leerDesagrado().cuevas.completadas);
    this.respondidas = 0;
    this.raycaster = new THREE.Raycaster();
    this.time = 0;
    this.sonando = 0;
  }

  /* ============================================================ escenario */

  build() {
    this.controller.enabled = false;
    this.el.touch.remove();
    const scene = this.scene;
    scene.background = new THREE.Color(HUB.niebla);
    scene.fog = new THREE.FogExp2(HUB.niebla, 0.028);
    this.camera.fov = 50;
    this.camera.updateProjectionMatrix();
    this.camera.position.set(0, 5.4, 11);
    this.camera.lookAt(0, 2.4, 0);

    this.ambiente = new THREE.HemisphereLight('#b9b0d8', '#2a2438', 0.9);
    scene.add(this.ambiente);
    this.luzClave = new THREE.DirectionalLight('#ffffff', 0.9);
    this.luzClave.position.set(4, 9, 6);
    scene.add(this.luzClave);

    // PLACEHOLDER_CAVERNA: paredes y suelo comunes; cambian de color por cueva
    this.caverna = crearCaverna({ radio: 26, color: HUB.paredes, suelo: HUB.suelo });
    scene.add(this.caverna);
    this.matParedes = this.caverna.children[0].material;
    this.matSuelo = this.caverna.children[1].material;

    // Entradas del hub (una por cueva)
    this.entradas = CUEVAS.map((c, i) => {
      const e = crearEntrada(c);
      const [x, z] = ENTRADAS[i];
      e.position.set(x, 0, z);
      e.rotation.y = Math.atan2(0 - x, 11 - z);
      scene.add(e);
      return e;
    });

    // Decorados propios de cada cueva (ocultos hasta entrar)
    this.decorados = {
      olores: crearPantano(),
      sabores: crearMesaPiedra(),
      imagenes: crearBosque(),
      sonidos: crearCristales(CUEVAS[3].color)
    };
    Object.values(this.decorados).forEach((d) => { d.visible = false; scene.add(d); });

    // Totems (visibles solo dentro de una cueva)
    this.totems = RESPUESTAS.map((r, i) => {
      const t = crearTotem(r);
      t.position.set(TOTEM_X[i], 0, TOTEM_Z);
      t.scale.setScalar(TOTEM_ESCALA);
      t.rotation.y = Math.atan2(0 - TOTEM_X[i], 11 - TOTEM_Z) * 0.35;
      t.visible = false;
      scene.add(t);
      return t;
    });

    this.sonidos = crearSonidosDesagrado(this.audio);
    this.buildHud();
    this.buildInput();
    this.ajustarEncuadre();
  }

  /**
   * La escena se dibuja solo en el hueco libre entre el mapa de cuevas
   * (arriba) y la guia (abajo): en un movil tumbado los totems ya no quedan
   * tapados por los carteles.
   */
  ajustarEncuadre() {
    if (!this.renderer) return;
    const z = this.zonaSegura();
    encuadrar(this, z.arriba, z.abajo);
  }

  zonaSegura() {
    return { arriba: altoDe(this.mapaEl, 14), abajo: altoDe(this.guia?.el, 18) };
  }

  /** Alto en pixeles del hueco libre entre los carteles */
  altoLibre() {
    const r = this.renderer?.domElement.getBoundingClientRect();
    if (!r) return 600;
    const z = this.zonaSegura();
    return r.height - z.arriba - z.abajo;
  }

  _resize() {
    super._resize();
    this.ajustarEncuadre();
  }

  buildHud() {
    this.anclasEl = document.createElement('div');
    this.anclasEl.className = 'dc-anclas';
    this.el.hud.appendChild(this.anclasEl);
    this.anclas = crearAnclas(this, this.anclasEl, () => this.zonaSegura());
    this.guia = crearGuia(this, () => this.ajustarEncuadre());

    // mapa de cuevas (arriba, centro): marca las completadas
    this.mapaEl = document.createElement('div');
    this.mapaEl.className = 'dc-mapa';
    this.el.hud.appendChild(this.mapaEl);

    this.waveEl = document.createElement('div');
    this.waveEl.className = 'i3d-wave';
    this.el.hud.appendChild(this.waveEl);

    // pregunta guia grande (aparece antes del primer elemento de cada cueva)
    this.preguntaEl = document.createElement('div');
    this.preguntaEl.className = 'dc-pregunta';
    this.preguntaEl.hidden = true;
    this.preguntaEl.textContent = T.pregunta;
    this.el.hud.appendChild(this.preguntaEl);

    this.renderMapa();
    this.renderLabel();
  }

  renderMapa() {
    this.mapaEl.innerHTML = `<span class="dc-mapa__titulo">${T.hud.mapa}</span>${CUEVAS.map((c) => `
      <span class="dc-mapa__cueva ${this.completadas.has(c.id) ? 'is-done' : ''} ${this.cueva?.id === c.id ? 'is-on' : ''}" style="--c:${c.color}"><b>${c.icono}</b><i class="dc-mapa__nombre">${c.corto}</i>${this.completadas.has(c.id) ? ' ✓' : ''}</span>`).join('')}`;
  }

  renderLabel() {
    if (this.cueva) {
      this.waveEl.innerHTML = `${escapar(this.cueva.nombre)} · ${T.hud.progreso} <b>${Math.min(this.cueva.elementos.length, this.indice + 1)}</b> de ${this.cueva.elementos.length}`;
    } else {
      this.waveEl.innerHTML = `${T.hud.mapa} <b>${this.completadas.size}</b> de ${CUEVAS.length}`;
    }
  }

  /** Etiquetas (botones) de las entradas del hub */
  mostrarEntradas(on) {
    this.entradas.forEach((e, i) => {
      e.visible = on;
      const c = CUEVAS[i];
      if (!on) { this.anclas.quitar(`entrada-${c.id}`); return; }
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `dc-entrada ${this.completadas.has(c.id) ? 'is-done' : ''}`;
      b.style.setProperty('--c', c.color);
      b.innerHTML = `<b>${c.icono}</b><span>${escapar(c.nombre)}<small>${this.completadas.has(c.id) ? 'completada · volver a jugar' : escapar(c.sentido)}</small></span>`;
      b.addEventListener('click', () => this.entrar(c));
      this.anclas.poner(`entrada-${c.id}`, b, new THREE.Vector3(e.position.x, ETIQUETA_Y[i], e.position.z));
    });
  }

  /** Botones de los totems (clic simple = misma accion que arrastrar) */
  mostrarTotems(on) {
    this.totems.forEach((t, i) => {
      t.visible = on;
      const r = RESPUESTAS[i];
      if (!on) { this.anclas.quitar(`totem-${r.id}`); return; }
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'dc-totem';
      b.style.setProperty('--c', r.color);
      b.textContent = r.etiqueta;
      b.addEventListener('click', () => this.elegir(r.id));
      this.anclas.poner(`totem-${r.id}`, b, new THREE.Vector3(t.position.x, TOTEM_CABEZA_Y + 1.1, t.position.z));
    });
  }

  /* ============================================================== input */

  buildInput() {
    const dom = this.renderer.domElement;
    const down = (e) => {
      if (this.paused || this.finished) return;
      if (e.button !== undefined && e.button > 0) return;
      e.preventDefault();
      try { dom.setPointerCapture(e.pointerId); } catch { /* opcional */ }
      if (this.fase === 'hub') {
        const c = this.entradaBajo(e);
        if (c) this.entrar(c);
        return;
      }
      if (this.fase === 'cueva' && this.elemento && this.elemento.libre && this.sobreElemento(e)) {
        this.arrastre = { pid: e.pointerId, x0: e.clientX, y0: e.clientY, movido: false };
        this.audio.play('interact', { volume: 0.2 });
      }
    };
    const move = (e) => {
      if (!this.arrastre || e.pointerId !== this.arrastre.pid || this.paused) return;
      const a = this.arrastre;
      if (!a.movido && Math.hypot(e.clientX - a.x0, e.clientY - a.y0) > 6) a.movido = true;
      if (!a.movido) return;
      const p = this.puntoArrastre(e);
      if (p) this.elemento.sprite.position.set(clamp(p.x, -6.5, 6.5), clamp(p.y, 0.4, 6.5), POS_ELEMENTO.z);
      this.marcarTotemCercano();
    };
    const up = (e) => {
      if (!this.arrastre || (e && e.pointerId !== undefined && e.pointerId !== this.arrastre.pid)) return;
      const a = this.arrastre;
      this.arrastre = null;
      if (!a.movido) return;                       // un toque no hace nada (los totems son botones)
      const t = this.totemCercano();
      this.marcarTotem(null);
      if (t) this.elegir(t);
      else this.devolverElemento();
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

  entradaBajo(e) {
    ndcDe(e, this.renderer.domElement, _ndc);
    this.raycaster.setFromCamera(_ndc, this.camera);
    const hits = this.raycaster.intersectObjects(this.entradas, true);
    if (!hits.length) return null;
    let o = hits[0].object;
    while (o && !this.entradas.includes(o)) o = o.parent;
    return o ? CUEVAS.find((c) => c.id === o.userData.id) : null;
  }

  sobreElemento(e) {
    const r = this.renderer.domElement.getBoundingClientRect();
    aPantalla(this, this.elemento.sprite.position, _p);
    return Math.hypot(e.clientX - r.left - _p.x, e.clientY - r.top - _p.y) < Math.min(r.width, r.height) * 0.14;
  }

  /** El elemento se arrastra por un plano vertical a su altura (siempre visible) */
  puntoArrastre(e) {
    ndcDe(e, this.renderer.domElement, _ndc);
    this.raycaster.setFromCamera(_ndc, this.camera);
    const plano = new THREE.Plane(new THREE.Vector3(0, 0, 1), -POS_ELEMENTO.z);
    return this.raycaster.ray.intersectPlane(plano, _w) ? _w : null;
  }

  /** Totem mas cercano al elemento, en pantalla */
  totemCercano() {
    if (!this.elemento) return null;
    const r = this.renderer.domElement.getBoundingClientRect();
    const lim = Math.min(r.width, r.height) * RADIO_SUELTA * 1.6;
    aPantalla(this, this.elemento.sprite.position, _p);
    const ex = _p.x; const ey = _p.y;
    let mejor = null; let dm = lim;
    this.totems.forEach((t, i) => {
      aPantalla(this, _w.set(t.position.x, TOTEM_CABEZA_Y, t.position.z), _p);
      const d = Math.hypot(_p.x - ex, _p.y - ey);
      if (d < dm) { dm = d; mejor = RESPUESTAS[i].id; }
    });
    return mejor;
  }

  marcarTotemCercano() { this.marcarTotem(this.totemCercano()); }

  marcarTotem(id) {
    if (this.sobreTotem === id) return;
    this.sobreTotem = id;
    this.totems.forEach((t, i) => {
      const on = RESPUESTAS[i].id === id;
      t.userData.aro.material.opacity = on ? 1 : 0.55;
      t.userData.luz.intensity = on ? 1.8 : 0.6;
      this.anclas.get(`totem-${RESPUESTAS[i].id}`)?.classList.toggle('is-over', on);
    });
  }

  /* ================================================================ flujo */

  async onStart() {
    await this.showIntro({ ...T.intro, cta: 'Entrar' });
    this.ambient = this.audio.ambient('wind', { volume: 0.12, rate: 0.7 });
    this.irAlHub();
  }

  irAlHub() {
    this.fase = 'hub';
    this.cueva = null;
    this.mostrarTotems(false);
    Object.values(this.decorados).forEach((d) => { d.visible = false; });
    this.pintarCueva(null);
    this.mostrarEntradas(true);
    this.renderMapa();
    this.renderLabel();
    this.setObjective(CUEVAS.length, '◆');
    this.objective.done = this.completadas.size;
    this.renderObjective();
    this.guia.sinBoton();
    if (this.completadas.size >= CUEVAS.length) {
      this.guia.guiar(T.guia.hub, '🗺️');
      this.guia.boton(T.resumen.titulo, () => this.terminar());
    } else {
      this.guia.guiar(T.guia.hub, '🗺️');
    }
  }

  /** Entra en una cueva: decorado propio, totems y pregunta guia */
  entrar(cueva) {
    if (this.fase !== 'hub') return;
    this.fase = 'transicion';
    this.cueva = cueva;
    this.indice = 0;
    this.mostrarEntradas(false);
    this.pintarCueva(cueva);
    this.decorados[cueva.id].visible = true;
    this.mostrarTotems(true);
    this.renderMapa();
    this.renderLabel();
    this.setObjective(cueva.elementos.length, '●');
    this.audio.play('interact', { volume: 0.3 });
    this.guia.guiar(cueva.id === 'sonidos' ? T.guia.sonido : T.guia.elemento, cueva.icono);
    // pregunta guia grande antes del primer elemento
    this.preguntaEl.hidden = false;
    this.preguntaEl.classList.remove('is-pop'); void this.preguntaEl.offsetWidth; this.preguntaEl.classList.add('is-pop');
    this.later(() => { this.preguntaEl.hidden = true; this.fase = 'cueva'; this.siguienteElemento(); }, 2200);
  }

  /** Colores de paredes, suelo y niebla segun la cueva (null = hub) */
  pintarCueva(cueva) {
    const k = cueva?.sombra ?? 0.35;                 // cuevas oscuras: `sombra` mas baja en los textos
    const paredes = cueva ? new THREE.Color(cueva.color).multiplyScalar(k) : new THREE.Color(HUB.paredes);
    const suelo = cueva ? new THREE.Color(cueva.color).multiplyScalar(k * 1.3) : new THREE.Color(HUB.suelo);
    const niebla = cueva ? new THREE.Color(cueva.color).multiplyScalar(k * 0.65) : new THREE.Color(HUB.niebla);
    this.feedback.tweenColor(this.matParedes.color, paredes, 0.8);
    this.feedback.tweenColor(this.matSuelo.color, suelo, 0.8);
    this.feedback.tweenColor(this.scene.fog.color, niebla, 0.8);
    this.feedback.tweenColor(this.scene.background, niebla, 0.8);
    this.ambiente.color.set(cueva ? cueva.luz : '#b9b0d8');
  }

  siguienteElemento() {
    if (this.fase !== 'cueva') return;
    if (this.indice >= this.cueva.elementos.length) { this.cuevaCompletada(); return; }
    const datos = this.cueva.elementos[this.indice];
    // PLACEHOLDER_SPRITE_ELEMENTO: tarjeta con emoji; sustituir por sprite/modelo
    const sprite = spriteElemento(datos.icono, { fondo: '#fffdf5', borde: this.cueva.color });
    sprite.position.copy(POS_ELEMENTO).add(new THREE.Vector3(0, -1.2, 0));
    sprite.scale.setScalar(0.01);
    this.scene.add(sprite);
    const etiqueta = document.createElement('div');
    etiqueta.className = 'dc-elemento';
    etiqueta.innerHTML = `<small>${T.pregunta}</small><strong>${escapar(datos.nombre)}</strong>`;
    this.anclas.poner('elemento', etiqueta, POS_ELEMENTO, { desplazaY: this.altoLibre() < 320 ? -58 : -92 });
    this.elemento = { datos, sprite, libre: false };
    this.renderLabel();
    this.feedback.tween({
      from: 0, to: 1, duration: 0.55,
      onUpdate: (t) => { sprite.scale.setScalar(0.01 + 1.6 * t); sprite.position.y = POS_ELEMENTO.y - 1.2 * (1 - t); },
      onDone: () => { if (this.elemento?.sprite === sprite) this.elemento.libre = true; }
    });
    this.audio.play('bubble', { volume: 0.25 });
    if (datos.sonido) this.reproducirSonido(datos);
  }

  /** Caverna de los sonidos: suena al aparecer y con el boton de repetir */
  reproducirSonido(datos) {
    const ok = this.sonidos.tocar(datos.sonido, { volume: 0.55 });
    this.sonando = ok ? this.sonidos.duracion : 0;
    this.guia.boton(`🔁 ${T.repetir}`, () => { if (this.elemento?.datos === datos) this.reproducirSonido(datos); }, 'dc-guia__btn--repetir');
  }

  /** El jugador decide: el elemento entra en el totem y llega el siguiente */
  elegir(respuestaId) {
    if (this.fase !== 'cueva' || !this.elemento || !this.elemento.libre) return;
    const { datos, sprite } = this.elemento;
    this.elemento.libre = false;
    this.arrastre = null;
    this.marcarTotem(null);
    this.sonidos.parar();
    this.guia.sinBoton();
    registrarRespuesta({ cueva: this.cueva.id, elemento: datos.id, sentido: this.cueva.sentido, respuesta: respuestaId });
    this.respondidas += 1;
    const i = RESPUESTAS.findIndex((r) => r.id === respuestaId);
    const totem = this.totems[i];
    const destino = new THREE.Vector3(totem.position.x, TOTEM_CABEZA_Y, totem.position.z + 0.6);
    const desde = sprite.position.clone();
    const escala = sprite.scale.x;
    // el elemento se absorbe; el totem da un brinco y su aro destella
    this.feedback.tween({
      from: 0, to: 1, duration: 0.45,
      onUpdate: (t) => { sprite.position.lerpVectors(desde, destino, t); sprite.scale.setScalar(escala * (1 - t * 0.92)); },
      onDone: () => { this.scene.remove(sprite); sprite.material.map?.dispose(); sprite.material.dispose(); }
    });
    this.feedback.tween({
      from: 0, to: 1, duration: 0.5,
      onUpdate: (t) => { totem.scale.setScalar(TOTEM_ESCALA * (1 + Math.sin(t * Math.PI) * 0.16)); }
    });
    totem.userData.luz.intensity = 2.4;
    this.feedback.tweenValue(totem.userData.luz, 'intensity', 0.6, 0.9);
    this.feedback.burst(destino, { count: 12, color: RESPUESTAS[i].color, speed: 1.8, life: 0.6 });
    this.audio.play('soften', { volume: 0.35 });
    this.anclas.quitar('elemento');
    this.elemento = null;
    this.advanceObjective(1);
    this.indice += 1;
    this.later(() => this.siguienteElemento(), 650);
  }

  devolverElemento() {
    const s = this.elemento?.sprite;
    if (!s) return;
    const desde = s.position.clone();
    this.feedback.tween({ from: 0, to: 1, duration: 0.35, onUpdate: (t) => s.position.lerpVectors(desde, POS_ELEMENTO, t) });
  }

  cuevaCompletada() {
    this.fase = 'transicion';
    this.completadas.add(this.cueva.id);
    marcarCuevaCompletada(this.cueva.id);
    this.renderMapa();
    this.guia.avisar(T.guia.cuevaHecha(this.completadas.size), 'ok', 2200);
    this.audio.play('chime', { volume: 0.3 });
    this.later(() => {
      if (this.completadas.size >= CUEVAS.length) this.terminar();
      else this.irAlHub();
    }, 2400);
  }

  /* ============================================================== bucle */

  onUpdate(dt) {
    this.time += dt;
    const t = this.time;
    if (this.elemento?.sprite && !this.arrastre && this.elemento.libre) {
      this.elemento.sprite.position.y = POS_ELEMENTO.y + Math.sin(t * 2.2) * 0.12;
    }
    // hub: los huecos de las entradas respiran
    if (this.fase === 'hub') this.entradas.forEach((e, i) => { e.userData.hueco.material.opacity = 0.45 + Math.sin(t * 1.6 + i) * 0.15; });
    // decorados vivos
    const d = this.cueva ? this.decorados[this.cueva.id] : null;
    if (d?.userData.burbujas) {
      d.userData.burbujas.forEach((b) => {
        const u = ((t * b.userData.vel + b.userData.fase) % 2.2) / 2.2;
        b.position.y = 0.05 + u * 1.8;
        b.material.opacity = 0.6 * (1 - u);
      });
    }
    if (d?.userData.llamas) d.userData.llamas.forEach(({ llama, luz }, i) => { llama.scale.y = 1 + Math.sin(t * 9 + i) * 0.18; luz.intensity = 1.3 + Math.sin(t * 7 + i * 2) * 0.25; });
    if (d?.userData.luces) d.userData.luces.forEach((l) => { const u = l.userData; l.position.set(Math.cos(t * 0.4 + u.fase) * u.r, u.y + Math.sin(t * 1.3 + u.fase) * 0.3, Math.sin(t * 0.4 + u.fase) * u.r * 0.6 - 1); });
    if (d?.userData.cristales) {
      this.sonando = Math.max(0, this.sonando - dt);
      const vib = this.sonando > 0 ? 1 : 0;
      d.userData.cristales.forEach((c, i) => {
        c.position.x = c.userData.base.x + Math.sin(t * 28 + i) * 0.04 * vib;
        c.material.emissiveIntensity = 0.25 + vib * (0.5 + Math.sin(t * 12 + c.userData.fase) * 0.3);
      });
      d.userData.luz.intensity = 0.8 + vib * 1.2;
    }
    this.anclas.update();
  }

  /* ============================================================= cierre */

  async terminar() {
    if (this.fase === 'fin') return;
    this.fase = 'fin';
    this.mostrarEntradas(false);
    this.mostrarTotems(false);
    this.guia.ocultar();
    this.anclas.limpiar();
    const datos = terminarCuevas();
    const r = resumenCuevas(datos);
    completeActivity('disgust-cuevas', 20);
    addReward(T.recompensa);
    setIslandLevel(ISLAND, 1, true);
    // 1) resumen sencillo
    await new Promise((resolve) => {
      this.el.overlay.innerHTML = `
        <div class="i3d-panel i3d-panel--card dc-panel" role="dialog" aria-modal="true" aria-label="${T.resumen.titulo}">
          <p class="i3d-intro__eyebrow">${T.intro.eyebrow}</p>
          <h3>${T.resumen.titulo}</h3>
          <p class="dc-resumen">${T.resumen.linea(r.total, r.desagrado ?? 0, r.indiferente ?? 0, r.agrado ?? 0)}</p>
          <p class="dc-sub">${T.resumen.porCueva}</p>
          <ul class="dc-cuevas-resumen">${CUEVAS.map((c) => { const x = r.porCueva[c.id] ?? { desagrado: 0, indiferente: 0, agrado: 0 }; return `<li style="--c:${c.color}"><b>${c.icono}</b><span>${escapar(c.corto)}</span><em>🤢 ${x.desagrado ?? 0} · 😐 ${x.indiferente ?? 0} · 😊 ${x.agrado ?? 0}</em></li>`; }).join('')}</ul>
          <div class="i3d-panel__actions"><button class="i3d-btn i3d-btn--primary" type="button" data-ok>Continuar</button></div>
        </div>`;
      const ok = this.el.overlay.querySelector('[data-ok]');
      ok.focus({ preventScroll: true });
      ok.addEventListener('click', resolve, { once: true });
    });
    // 2) mensaje de cierre a pantalla completa, con voz opcional
    this.el.overlay.innerHTML = `
      <div class="dc-cierre" role="dialog" aria-modal="true" aria-label="Cierre del nivel">
        <p class="i3d-intro__eyebrow">${T.intro.eyebrow}</p>
        <p class="dc-cierre__texto">${escapar(T.cierre).replace(/\n/g, '<br>')}</p>
        <div class="i3d-panel__actions">
          <button class="i3d-btn" type="button" data-voz>🔊 ${T.escuchar}</button>
          <button class="i3d-btn i3d-btn--primary" type="button" data-ok>Terminar</button>
        </div>
      </div>`;
    this.el.overlay.querySelector('[data-voz]').addEventListener('click', () => leerEnVozAlta(T.cierre));
    this.el.overlay.querySelector('[data-ok]').addEventListener('click', () => { callarVoz(); this.el.overlay.innerHTML = ''; this.finish(); });
    this.el.overlay.querySelector('[data-ok]').focus({ preventScroll: true });
  }

  get completionPayload() {
    return { islandId: ISLAND, success: true, emoAventura: true, badge: ISLAND, title: 'Las cuatro cuevas del desagrado', message: T.cierre, juego: 'cuevas' };
  }

  /** Menu de pausa con salida al menu de la isla */
  _showPauseMenu() {
    super._showPauseMenu();
    if (!this.onMenu) return;
    const acciones = this.el.overlay.querySelector('.i3d-panel__actions');
    const b = document.createElement('button');
    b.className = 'i3d-btn'; b.type = 'button'; b.textContent = 'Menú de la isla';
    b.addEventListener('click', () => this.onMenu());
    acciones.insertBefore(b, acciones.querySelector('[data-leave]'));
  }

  onReset() {
    reiniciarCuevas();
    this.completadas = new Set();
    this.respondidas = 0;
    if (this.elemento) { this.scene.remove(this.elemento.sprite); this.elemento = null; }
    this.anclas.limpiar();
    this.sonidos.parar();
    this.el.overlay.innerHTML = '';
    this.preguntaEl.hidden = true;
    this.irAlHub();
  }

  onDispose() {
    callarVoz();
    this.sonidos?.dispose();
    this.anclas?.dispose();
    this.guia?.dispose();
    this.anclasEl?.remove();
    this.mapaEl?.remove();
    this.waveEl?.remove();
    this.preguntaEl?.remove();
  }
}
