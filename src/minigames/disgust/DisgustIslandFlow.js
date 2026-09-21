// ISLA DEL DESAGRADO · «La Cienaga Turbia» · flujo de la isla
// Secuencia de la isla: identificacion (que me revuelve, como lo noto, con que
// intensidad llego) → menu con DOS minijuegos independientes y sin orden
// (La Cadena / El Separador; cada uno cierra con su reevaluacion y feedback)
// → diario de limites → cierre de la isla cuando los dos estan completados.
//
// Mismo contrato que un minijuego (mount / dispose / onComplete / onExit), asi
// que EmotionIslandApp no distingue esta isla de las demas. Nunca hay dos
// minijuegos vivos a la vez.

import { CadenaGame } from './CadenaGame.js';
import { SeparadorGame } from './SeparadorGame.js';
import { ISLA, CONDUCTAS, INTENSIDADES } from './IslaTextos.js';
import {
  completeActivity, getIslandLevels, getIslandData, setIslandData, setInitialIntensity
} from '../../data/gameState.js';
import { escapar } from './cienaga.js';

const ISLAND = 'disgust';

export class DisgustIslandFlow {
  constructor({ host, island, player, onComplete, onExit }) {
    this.host = host;
    this.island = island;
    this.player = player;
    this.onComplete = onComplete;
    this.onExit = onExit;
    this.current = null;
    this.panel = null;
    this.timers = new Set();
    this.disposed = false;
  }

  /* ============================================================== montaje */

  mount() {
    const datos = getIslandData(ISLAND);
    if (!datos.valores?.length) this.identificar();
    else this.menu();
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
      ...extra
    };
  }

  /** Pantalla propia de la isla (menu, identificacion, diario, cierre) */
  pantalla(html, { clase = '' } = {}) {
    this.cerrarPantalla();
    const panel = document.createElement('div');
    panel.className = `i3d dg-flow ${clase}`.trim();
    panel.innerHTML = `<div class="i3d__overlay"><div class="i3d-intro dg-flow__intro"><div class="i3d-intro__card dg-flow__card" role="dialog" aria-modal="true" aria-label="${escapar(ISLA.nombre)}">${html}</div></div></div>`;
    this.host.appendChild(panel);
    this.panel = panel;
    return panel;
  }

  cerrarPantalla() {
    this.panel?.remove();
    this.panel = null;
  }

  /* ======================================================= identificacion */

  identificar() {
    const datos = getIslandData(ISLAND);
    const valores = new Set(datos.valores ?? []);
    const senales = new Set(datos.senales ?? []);
    const I = ISLA.identificacion;

    const paso1 = () => {
      const p = this.pantalla(`
        <p class="i3d-intro__eyebrow">${I.eyebrow}</p>
        <h3>${I.valores.titulo}</h3>
        <p class="dg-flow__hint">${I.valores.sub}</p>
        <div class="dg-grid">${CONDUCTAS.map((c) => `
          <button class="dg-pick ${valores.has(c.id) ? 'is-on' : ''}" type="button" data-v="${c.id}" aria-pressed="${valores.has(c.id)}"><b>${c.icono}</b><span>${c.nombre}<small>${c.detalle}</small></span></button>`).join('')}</div>
        <div class="i3d-panel__actions">
          <button class="i3d-btn i3d-btn--primary" type="button" data-next ${valores.size < 2 ? 'disabled' : ''}>${I.valores.continuar}</button>
          <button class="i3d-btn" type="button" data-leave>${ISLA.menu.salir}</button>
        </div>`);
      const next = p.querySelector('[data-next]');
      p.querySelectorAll('[data-v]').forEach((b) => b.addEventListener('click', () => {
        const id = b.dataset.v;
        if (valores.has(id)) valores.delete(id); else valores.add(id);
        b.classList.toggle('is-on', valores.has(id));
        b.setAttribute('aria-pressed', String(valores.has(id)));
        next.disabled = valores.size < 2;
        next.textContent = valores.size < 2 ? I.valores.minimo : I.valores.continuar;
      }));
      next.addEventListener('click', () => paso2());
      p.querySelector('[data-leave]').addEventListener('click', () => this.onExit?.());
    };

    const paso2 = () => {
      const p = this.pantalla(`
        <p class="i3d-intro__eyebrow">${I.eyebrow}</p>
        <h3>${I.senales.titulo}</h3>
        <p class="dg-flow__hint">${I.senales.sub}</p>
        <div class="dg-grid">${I.senales.lista.map((s) => `
          <button class="dg-pick ${senales.has(s.id) ? 'is-on' : ''}" type="button" data-s="${s.id}" aria-pressed="${senales.has(s.id)}"><b>${s.icono}</b><span>${s.texto}</span></button>`).join('')}</div>
        <div class="i3d-panel__actions">
          <button class="i3d-btn i3d-btn--primary" type="button" data-next>${I.senales.continuar}</button>
        </div>`);
      p.querySelectorAll('[data-s]').forEach((b) => b.addEventListener('click', () => {
        const id = b.dataset.s;
        if (senales.has(id)) senales.delete(id); else senales.add(id);
        b.classList.toggle('is-on', senales.has(id));
        b.setAttribute('aria-pressed', String(senales.has(id)));
      }));
      p.querySelector('[data-next]').addEventListener('click', () => paso3());
    };

    const paso3 = () => {
      const p = this.pantalla(`
        <p class="i3d-intro__eyebrow">${I.eyebrow}</p>
        <h3>${I.intensidad.titulo}</h3>
        <p class="dg-flow__hint">${I.intensidad.sub}</p>
        <div class="i3d-choice">${INTENSIDADES.map((i) => `
          <button class="i3d-choice__btn" type="button" data-i="${i.id}" style="--c:${i.color}"><strong>${i.label}</strong><span>${i.text}</span></button>`).join('')}</div>`);
      p.querySelectorAll('[data-i]').forEach((b) => b.addEventListener('click', () => {
        const intensidad = b.dataset.i;
        setIslandData(ISLAND, { valores: [...valores], senales: [...senales], intensidad });
        setInitialIntensity(intensidad);
        completeActivity('disgust-identificacion', 5);
        this.menu({ recienIdentificado: true });
      }));
    };

    paso1();
  }

  /* ================================================================ menu */

  menu({ recienIdentificado = false } = {}) {
    const niveles = getIslandLevels(ISLAND);
    const datos = getIslandData(ISLAND);
    const M = ISLA.menu;
    const tarjeta = (id, t, hecho) => `
      <button class="dg-juego ${hecho ? 'is-done' : ''}" type="button" data-juego="${id}">
        <span class="dg-juego__sub">${t.sub}${hecho ? ` · ✓ ${M.jugado}` : ''}</span>
        <strong>${t.titulo}</strong>
        <span class="dg-juego__desc">${t.desc}</span>
      </button>`;
    const valores = (datos.valores ?? []).map((id) => CONDUCTAS.find((c) => c.id === id)?.nombre.toLowerCase()).filter(Boolean);
    const p = this.pantalla(`
      <p class="i3d-intro__eyebrow">${ISLA.eyebrow}</p>
      <h3>${ISLA.nombre}</h3>
      <p class="dg-flow__hint">${recienIdentificado ? ISLA.identificacion.listo + ' ' : ''}${ISLA.intro}</p>
      <p class="dg-flow__idea">${ISLA.idea}</p>
      <p class="dg-flow__menu-titulo">${M.titulo}</p>
      <p class="dg-flow__hint">${M.sub}</p>
      <div class="dg-juegos">
        ${tarjeta('cadena', M.cadena, niveles.level1)}
        ${tarjeta('separador', M.separador, niveles.level2)}
      </div>
      ${valores.length ? `<p class="dg-flow__valores">Lo que te revuelve: <em>${escapar(valores.join(', '))}</em> · <button class="dg-link" type="button" data-cambiar>${M.repetirIdentificacion}</button></p>` : ''}
      <div class="i3d-panel__actions dg-flow__acciones">
        <button class="i3d-btn" type="button" data-diario>📔 ${M.diario}</button>
        <button class="i3d-btn" type="button" data-leave>${M.salir}</button>
      </div>`, { clase: 'dg-flow--menu' });
    p.querySelectorAll('[data-juego]').forEach((b) => b.addEventListener('click', () => this.startGame(b.dataset.juego)));
    p.querySelector('[data-diario]').addEventListener('click', () => this.diario());
    p.querySelector('[data-leave]').addEventListener('click', () => this.onExit?.());
    p.querySelector('[data-cambiar]')?.addEventListener('click', () => this.identificar());
    p.querySelector('[data-juego]').focus({ preventScroll: true });
  }

  diario() {
    const entradas = getIslandData(ISLAND).diario ?? [];
    const p = this.pantalla(`
      <p class="i3d-intro__eyebrow">${ISLA.eyebrow}</p>
      <h3>📔 ${ISLA.diario.titulo}</h3>
      ${entradas.length
        ? `<ul class="dg-lista dg-lista--fina dg-diario">${entradas.map((e) => `<li><em>${escapar(e.escena)}</em>${e.conducta ? ` · ${escapar(CONDUCTAS.find((c) => c.id === e.conducta)?.nombre ?? e.conducta)}` : ''}<br><b>${escapar(e.accion)}</b></li>`).join('')}</ul><p class="dg-flow__hint">${ISLA.diario.cierre}</p>`
        : `<p class="dg-flow__hint">${ISLA.diario.vacio}</p>`}
      <div class="i3d-panel__actions"><button class="i3d-btn i3d-btn--primary" type="button" data-back>Volver</button></div>`);
    p.querySelector('[data-back]').addEventListener('click', () => this.menu());
  }

  /* =========================================================== minijuegos */

  startGame(id) {
    this.cerrarPantalla();
    const Game = id === 'cadena' ? CadenaGame : SeparadorGame;
    this.current = new Game(this.gameOpts({
      onComplete: () => this.gameDone(),
      onMenu: () => this.backToMenu()
    }));
    this.current.mount();
  }

  backToMenu() {
    this.current?.dispose();
    this.current = null;
    this.menu();
  }

  gameDone() {
    this.current?.dispose();
    this.current = null;
    const niveles = getIslandLevels(ISLAND);
    if (niveles.level1 && niveles.level2 && !getIslandData(ISLAND).cerrada) this.cerrarIsla();
    else this.menu();
  }

  /* ============================================================== cierre */

  cerrarIsla() {
    const entradas = getIslandData(ISLAND).diario ?? [];
    const p = this.pantalla(`
      <p class="i3d-intro__eyebrow">${ISLA.eyebrow}</p>
      <h3>${ISLA.cierre.titulo}</h3>
      ${ISLA.cierre.lineas.map((l) => `<p class="dg-flow__hint dg-flow__hint--left">${l}</p>`).join('')}
      ${entradas.length ? `<p class="dg-flow__menu-titulo">📔 ${ISLA.diario.titulo}</p><ul class="dg-lista dg-lista--fina dg-diario">${entradas.map((e) => `<li><em>${escapar(e.escena)}</em><br><b>${escapar(e.accion)}</b></li>`).join('')}</ul>` : ''}
      <div class="i3d-panel__actions"><button class="i3d-btn i3d-btn--primary" type="button" data-ok>Continuar</button></div>`);
    p.querySelector('[data-ok]').addEventListener('click', () => {
      setIslandData(ISLAND, { cerrada: true });
      completeActivity('disgust-isla', 10);
      this.cerrarPantalla();
      this.onComplete?.({
        islandId: ISLAND,
        success: true,
        emoAventura: true,
        badge: ISLAND,
        title: ISLA.nombre,
        message: ISLA.cierre.mensaje
      });
    });
  }

  /* ============================================================ limpieza */

  dispose() {
    this.disposed = true;
    this.timers.forEach((t) => clearTimeout(t));
    this.timers.clear();
    this.current?.dispose();
    this.current = null;
    this.cerrarPantalla();
  }

  memoryReport() {
    return this.current?.memoryReport?.() ?? null;
  }
}
