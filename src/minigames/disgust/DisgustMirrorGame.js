// ISLA DEL DESAGRADO · NIVEL 2 · «El espejo de las señales»
// Una camara con un espejo antiguo y agrietado. En el espejo, un personaje
// vive tres escenas; alrededor flotan ocho fragmentos con senales del cuerpo.
// El jugador toca solo los que son senales de desagrado: cada acierto encaja
// en el espejo y lo repara; un fallo se atenua sin castigo y explica de que
// emocion era esa senal. Tres rondas: al final el espejo queda entero.
//
// Camara fija; todo va con clic o toque (fragmento 3D o su etiqueta).

import * as THREE from 'three';
import { MinigameBase } from '../../engine/MinigameBase.js';
import { makeAvatar } from '../../engine/worldkit.js';
import { addReward, completeActivity, setIslandLevel } from '../../data/gameState.js';
import { ESPEJO_TEXTOS as T, ESCENAS, SENALES, RONDAS_ESPEJO } from './DesagradoTextos.js';
import { crearCaverna, crearEspejo, crearFragmento, crearPropEscena } from './desagradoAssets.js';
import { registrarRonda, terminarEspejo, reiniciarEspejo, leerDesagrado, confusionesOrdenadas } from './desagradoStore.js';
import { escapar, ndcDe, crearGuia, crearAnclas, encuadrar, altoDe, leerEnVozAlta, callarVoz } from './desagradoUi.js';

const ISLAND = 'disgust';
const ESPEJO_POS = new THREE.Vector3(0, 3.7, -2.2);
// posiciones (x, y) de los ocho fragmentos alrededor del espejo
const ORBITA = [[-5.0, 6.2], [5.0, 6.2], [-5.3, 4.6], [5.3, 4.6], [-5.1, 3.0], [5.1, 3.0], [-4.6, 1.6], [4.6, 1.6]];
const TOTAL_ACIERTOS = RONDAS_ESPEJO.reduce((n, r) => n + r.desagrado.length, 0);

const _ndc = new THREE.Vector2();

function barajar(lista) {
  const a = [...lista];
  for (let i = a.length - 1; i > 0; i -= 1) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

export class DisgustMirrorGame extends MinigameBase {
  constructor(opts) {
    super({ ...opts, mode: 'third' });
    this.onMenu = opts.onMenu ?? null;
    this.fase = 'intro';            // intro | ronda | pausaRonda | fin
    this.ronda = -1;
    this.fragmentos = [];           // { senal, mesh, estado: 'libre' | 'encajado' | 'atenuado', base }
    this.encajados = 0;             // aciertos acumulados (reparan el espejo)
    this.registro = null;           // datos de la ronda en curso
    this.prop = null;
    this.raycaster = new THREE.Raycaster();
    this.time = 0;
  }

  /* ============================================================ escenario */

  build() {
    this.controller.enabled = false;
    this.el.touch.remove();
    const scene = this.scene;
    scene.background = new THREE.Color('#151226');
    scene.fog = new THREE.FogExp2('#151226', 0.03);
    this.camera.fov = 48;
    this.camera.updateProjectionMatrix();
    this.camera.position.set(0, 3.6, 10);
    this.camera.lookAt(0, 3.4, -1);

    scene.add(new THREE.HemisphereLight('#b9b0d8', '#1a1628', 0.8));
    const clave = new THREE.DirectionalLight('#fff1dc', 0.9);
    clave.position.set(3, 8, 7);
    scene.add(clave);
    this.luzEspejo = new THREE.PointLight('#9fd0ff', 1.2, 16, 2);
    this.luzEspejo.position.set(0, 5, 1.5);
    scene.add(this.luzEspejo);

    // PLACEHOLDER_CAVERNA (camara oscura) y PLACEHOLDER_ESPEJO
    scene.add(crearCaverna({ radio: 22, color: '#2a2440', suelo: '#33304a', estalactitas: 16 }));
    this.espejo = crearEspejo();
    this.espejo.position.copy(ESPEJO_POS);
    scene.add(this.espejo);

    // el personaje reflejado y su sitio para el objeto de cada escena
    this.personaje = makeAvatar({ color: this.player?.favoriteColor ?? '#f5b942', accent: '#ffffff', emoji: this.player?.avatar ?? null });
    this.personaje.position.set(-0.7, 1.35, -0.6);
    scene.add(this.personaje);
    // suelo del reflejo: un disco oscuro dentro del espejo
    const sueloReflejo = new THREE.Mesh(new THREE.CircleGeometry(1.9, 24), new THREE.MeshStandardMaterial({ color: '#4a5a70', roughness: 0.6, metalness: 0.2 }));
    sueloReflejo.rotation.x = -Math.PI / 2;
    sueloReflejo.position.set(0, 1.34, -0.6);
    sueloReflejo.scale.z = 0.55;
    scene.add(sueloReflejo);

    this.buildHud();
    this.buildInput();
    this.setObjective(RONDAS_ESPEJO.length, '🪞');
    this.ajustarEncuadre();
  }

  /** El espejo y los fragmentos caben entre la tarjeta de la escena y la guia */
  ajustarEncuadre() {
    if (!this.renderer) return;
    const z = this.zonaSegura();
    encuadrar(this, z.arriba, z.abajo);
  }

  zonaSegura() {
    return { arriba: altoDe(this.escenaEl, 14), abajo: altoDe(this.guia?.el, 18) };
  }

  /** Pantalla demasiado baja para colgar las etiquetas de cada fragmento */
  compacto() {
    const r = this.renderer?.domElement.getBoundingClientRect();
    if (!r) return false;
    const z = this.zonaSegura();
    return r.height - z.arriba - z.abajo < 360;
  }

  /** Cuanto se acercan los fragmentos al espejo segun el hueco libre */
  compresion() {
    const r = this.renderer?.domElement.getBoundingClientRect();
    if (!r) return { x: 1, y: 1 };
    const z = this.zonaSegura();
    const libre = r.height - z.arriba - z.abajo;
    const y = libre < 260 ? 0.52 : libre < 340 ? 0.68 : libre < 440 ? 0.84 : 1;
    const x = r.width < 520 ? 0.82 : 1;
    return { x, y };
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
    this.escenaEl = document.createElement('div');
    this.escenaEl.className = 'dm-escena';
    this.escenaEl.hidden = true;
    this.el.hud.appendChild(this.escenaEl);
    this.waveEl = document.createElement('div');
    this.waveEl.className = 'i3d-wave';
    this.el.hud.appendChild(this.waveEl);
    this.renderLabel();
  }

  renderLabel() {
    const r = Math.max(1, Math.min(RONDAS_ESPEJO.length, this.ronda + 1));
    this.waveEl.innerHTML = `${T.hud.ronda} <b>${r}</b> de ${RONDAS_ESPEJO.length} <small>· ${T.hud.espejo} ${Math.round((this.encajados / TOTAL_ACIERTOS) * 100)} %</small>`;
  }

  buildInput() {
    const dom = this.renderer.domElement;
    const down = (e) => {
      if (this.paused || this.finished || this.fase !== 'ronda') return;
      if (e.button !== undefined && e.button > 0) return;
      e.preventDefault();
      const f = this.fragmentoBajo(e);
      if (f) this.elegir(f);
    };
    dom.addEventListener('pointerdown', down);
    this.listeners.push(() => dom.removeEventListener('pointerdown', down));
  }

  fragmentoBajo(e) {
    ndcDe(e, this.renderer.domElement, _ndc);
    this.raycaster.setFromCamera(_ndc, this.camera);
    const libres = this.fragmentos.filter((f) => f.estado === 'libre');
    const hits = this.raycaster.intersectObjects(libres.map((f) => f.mesh), false);
    return hits.length ? libres.find((f) => f.mesh === hits[0].object) : null;
  }

  /* ================================================================ flujo */

  async onStart() {
    await this.showIntro({ ...T.intro, cta: 'Mirar' });
    this.ambient = this.audio.ambient('wind', { volume: 0.1, rate: 0.6 });
    this.empezarRonda(0);
  }

  empezarRonda(i) {
    this.ronda = i;
    this.fase = 'ronda';
    const cfg = RONDAS_ESPEJO[i];
    const escena = ESCENAS.find((e) => e.id === cfg.escena);
    this.registro = { escena: escena.id, seleccionadas: [], aciertos: 0, fallos: 0, total: cfg.desagrado.length, confusiones: {} };
    this.limpiarFragmentos();
    this.ponerEscena(escena);
    // ocho fragmentos barajados alrededor del espejo
    const senales = barajar([...cfg.desagrado, ...cfg.distractores]).map((id) => SENALES.find((s) => s.id === id));
    senales.forEach((senal, k) => {
      const mesh = crearFragmento(k);
      const [x, y] = ORBITA[k];
      // en pantallas bajas los fragmentos se acercan al espejo para que las
      // ocho etiquetas quepan en el hueco libre
      const c = this.compresion();
      const base = new THREE.Vector3(x * c.x, ESPEJO_POS.y + (y - ESPEJO_POS.y) * c.y, 0.6);
      mesh.position.copy(base).add(new THREE.Vector3(0, -2, 0));
      mesh.material.opacity = 0;
      mesh.userData.fase = k * 0.8;
      this.scene.add(mesh);
      const etiqueta = document.createElement('button');
      etiqueta.type = 'button';
      etiqueta.className = 'dm-fragmento';
      etiqueta.innerHTML = `<b>${senal.icono}</b><span>${escapar(senal.texto)}</span>`;
      const f = { senal, mesh, estado: 'libre', base };
      etiqueta.addEventListener('click', () => this.elegir(f));
      // en pantallas bajas las ocho etiquetas se reparten en dos columnas
      const fijo = this.compacto() ? { fx: k % 2 ? 0.845 : 0.155, fy: 0.13 + Math.floor(k / 2) * 0.25 } : null;
      this.anclas.poner(`frag-${senal.id}`, etiqueta, base, { desplazaY: 54, fijo });
      this.fragmentos.push(f);
      this.feedback.tween({ from: 0, to: 1, duration: 0.6 + k * 0.08, onUpdate: (t) => { mesh.position.y = base.y - 2 * (1 - t); mesh.material.opacity = t; } });
    });
    this.renderLabel();
    this.guia.guiar(T.guia.escena, escena.icono);
    this.audio.play('glass', { volume: 0.25 });
  }

  /** Vineta de la escena (tarjeta arriba) y objeto junto al personaje */
  ponerEscena(escena) {
    this.escenaEl.hidden = false;
    this.escenaEl.innerHTML = `<b>${escena.icono}</b><span><strong>${escapar(escena.titulo)}</strong>${escapar(escena.texto)}</span>`;
    this.ajustarEncuadre();
    if (this.prop) { this.scene.remove(this.prop); this.prop = null; }
    // PLACEHOLDER_PROP_ESCENA
    this.prop = crearPropEscena(escena.prop);
    this.prop.position.set(0.9, 1.35, -0.4);
    this.scene.add(this.prop);
    // reaccion breve del personaje: se echa un poco atras
    const p = this.personaje;
    p.rotation.y = 0.35;
    this.feedback.tween({ from: 0, to: 1, duration: 0.9, onUpdate: (t) => { p.rotation.x = -Math.sin(t * Math.PI) * 0.18; p.position.x = -0.7 - Math.sin(t * Math.PI * 0.5) * 0.35; } });
  }

  /** El jugador toca un fragmento */
  elegir(f) {
    if (this.fase !== 'ronda' || f.estado !== 'libre') return;
    this.registro.seleccionadas.push(f.senal.id);
    const etiqueta = this.anclas.get(`frag-${f.senal.id}`);
    if (f.senal.emocion === 'desagrado') {
      f.estado = 'encajado';
      this.registro.aciertos += 1;
      this.encajados += 1;
      this.encajar(f);
      etiqueta?.classList.add('is-ok');
      this.later(() => this.anclas.quitar(`frag-${f.senal.id}`), 700);
      this.guia.avisar(T.acierto, 'ok', 1800);
      this.audio.play('glassTap', { volume: 0.4 });
      const faltan = this.registro.total - this.registro.aciertos;
      if (faltan <= 0) this.later(() => this.terminarRonda(), 900);
      else this.later(() => { if (this.fase === 'ronda') this.guia.guiar(T.guia.faltan(faltan), '🪞'); }, 1800);
    } else {
      f.estado = 'atenuado';
      this.registro.fallos += 1;
      this.registro.confusiones[f.senal.emocion] = (this.registro.confusiones[f.senal.emocion] ?? 0) + 1;
      this.feedback.tween({ from: 1, to: 0.25, duration: 0.5, onUpdate: (t) => { f.mesh.material.opacity = t; } });
      f.mesh.material.emissiveIntensity = 0;
      etiqueta?.classList.add('is-off');
      this.guia.avisar(T.guia.nota(f.senal.emocion, f.senal.explicacion), 'nota', 4200);
      this.audio.play('soften', { volume: 0.3 });
    }
    this.renderLabel();
  }

  /** El fragmento brilla y vuela a un hueco del espejo, que se va reparando */
  encajar(f) {
    const hueco = this.espejo.userData.huecos.find((h) => h.visible);
    const destino = hueco ? this.espejo.localToWorld(hueco.position.clone()) : ESPEJO_POS.clone();
    destino.z += 0.12;
    const desde = f.mesh.position.clone();
    f.mesh.material.emissiveIntensity = 1.4;
    this.feedback.tween({
      from: 0, to: 1, duration: 0.7,
      onUpdate: (t) => { f.mesh.position.lerpVectors(desde, destino, t); f.mesh.rotation.z = t * 2; f.mesh.scale.setScalar(1 - t * 0.45); },
      onDone: () => {
        if (hueco) hueco.visible = false;
        f.mesh.material.emissiveIntensity = 0.3;
        this.espejo.userData.grietas.material.opacity = Math.max(0, 1 - this.encajados / TOTAL_ACIERTOS);
        this.feedback.burst(destino, { count: 10, color: '#dff3ff', speed: 1.6, life: 0.5 });
      }
    });
    this.luzEspejo.intensity = 3;
    this.feedback.tweenValue(this.luzEspejo, 'intensity', 1.2, 1.0);
  }

  terminarRonda() {
    if (this.fase !== 'ronda') return;
    this.fase = 'pausaRonda';
    registrarRonda(this.registro);
    this.advanceObjective(1);
    this.guia.avisar(T.guia.rondaHecha(this.ronda + 1), 'ok', 2200);
    this.audio.play('chime', { volume: 0.3 });
    // los distractores que quedan se desvanecen
    this.fragmentos.filter((f) => f.estado !== 'encajado').forEach((f) => {
      this.feedback.tween({ from: f.mesh.material.opacity, to: 0, duration: 0.6, onUpdate: (t) => { f.mesh.material.opacity = t; } });
      this.anclas.quitar(`frag-${f.senal.id}`);
    });
    const siguiente = this.ronda + 1;
    this.later(() => {
      if (siguiente >= RONDAS_ESPEJO.length) this.terminar();
      else this.empezarRonda(siguiente);
    }, 2400);
  }

  limpiarFragmentos() {
    this.fragmentos.forEach((f) => { this.scene.remove(f.mesh); f.mesh.geometry.dispose(); f.mesh.material.dispose(); this.anclas.quitar(`frag-${f.senal.id}`); });
    this.fragmentos = [];
  }

  /* ============================================================== bucle */

  onUpdate(dt) {
    this.time += dt;
    const t = this.time;
    for (const f of this.fragmentos) {
      this.anclas.mover(`frag-${f.senal.id}`, f.mesh.position);
      if (f.estado !== 'libre') continue;
      f.mesh.position.y = f.base.y + Math.sin(t * 1.4 + f.mesh.userData.fase) * 0.16;
      f.mesh.rotation.z = Math.sin(t * 0.9 + f.mesh.userData.fase) * 0.25;
      f.mesh.rotation.y = Math.sin(t * 0.7 + f.mesh.userData.fase) * 0.3;
    }
    if (this.prop?.userData.nube) this.prop.userData.nube.position.y = 0.9 + Math.sin(t * 2) * 0.12;
    this.personaje.userData.head.rotation.y = Math.sin(t * 0.8) * 0.2;
    this.anclas.update();
  }

  /* ============================================================= cierre */

  async terminar() {
    this.fase = 'fin';
    this.guia.ocultar();
    this.escenaEl.hidden = true;
    this.ajustarEncuadre();
    this.anclas.limpiar();
    this.espejo.userData.grietas.material.opacity = 0;
    this.espejo.userData.huecos.forEach((h) => { h.visible = false; });
    terminarEspejo();
    completeActivity('disgust-espejo', 20);
    addReward(T.recompensa);
    setIslandLevel(ISLAND, 2, true);
    const datos = leerDesagrado();
    const conf = confusionesOrdenadas(datos).map(([e, n]) => `${e} (${n})`);
    const senales = SENALES.filter((s) => s.emocion === 'desagrado');
    // 1) el espejo entero: el personaje con sus senales marcadas
    await new Promise((resolve) => {
      this.el.overlay.innerHTML = `
        <div class="i3d-panel i3d-panel--card dc-panel" role="dialog" aria-modal="true" aria-label="${T.final.titulo}">
          <p class="i3d-intro__eyebrow">${T.intro.eyebrow}</p>
          <h3>${T.final.titulo}</h3>
          <p class="dc-sub">${T.final.sub}</p>
          <div class="dm-cuerpo"><b class="dm-cuerpo__figura" aria-hidden="true">${this.player?.avatar ?? '🧍'}</b><ul class="dm-senales">${senales.map((s) => `<li><b>${s.icono}</b>${escapar(s.texto)}</li>`).join('')}</ul></div>
          <p class="dc-resumen">${T.final.aciertos(datos.espejo.aciertos, datos.espejo.total)} ${conf.length ? T.final.confusiones(conf.join(', ')) : T.final.sinConfusiones}</p>
          <div class="i3d-panel__actions"><button class="i3d-btn i3d-btn--primary" type="button" data-ok>Continuar</button></div>
        </div>`;
      const ok = this.el.overlay.querySelector('[data-ok]');
      ok.focus({ preventScroll: true });
      ok.addEventListener('click', resolve, { once: true });
    });
    // 2) cierre a pantalla completa con voz opcional
    this.el.overlay.innerHTML = `
      <div class="dc-cierre" role="dialog" aria-modal="true" aria-label="Cierre del nivel">
        <p class="i3d-intro__eyebrow">${T.intro.eyebrow}</p>
        <p class="dc-cierre__texto">${escapar(T.cierre)}</p>
        <div class="i3d-panel__actions">
          <button class="i3d-btn" type="button" data-voz>🔊 Escuchar el mensaje</button>
          <button class="i3d-btn i3d-btn--primary" type="button" data-ok>Terminar</button>
        </div>
      </div>`;
    this.el.overlay.querySelector('[data-voz]').addEventListener('click', () => leerEnVozAlta(T.cierre));
    this.el.overlay.querySelector('[data-ok]').addEventListener('click', () => { callarVoz(); this.el.overlay.innerHTML = ''; this.finish(); });
    this.el.overlay.querySelector('[data-ok]').focus({ preventScroll: true });
  }

  get completionPayload() {
    return { islandId: ISLAND, success: true, emoAventura: true, badge: ISLAND, title: 'El espejo de las señales', message: T.cierre, juego: 'espejo' };
  }

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
    reiniciarEspejo();
    this.encajados = 0;
    this.limpiarFragmentos();
    this.espejo.userData.grietas.material.opacity = 1;
    this.espejo.userData.huecos.forEach((h) => { h.visible = true; });
    this.el.overlay.innerHTML = '';
    this.setObjective(RONDAS_ESPEJO.length, '🪞');
    this.empezarRonda(0);
  }

  onDispose() {
    callarVoz();
    this.anclas?.dispose();
    this.guia?.dispose();
    this.anclasEl?.remove();
    this.escenaEl?.remove();
    this.waveEl?.remove();
  }
}
