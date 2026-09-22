// ISLA DEL DESAGRADO · menu de la isla
// Dos minijuegos independientes, cada uno con su propia entrada y su propio
// final: «Las cuatro cuevas del desagrado» (nivel 1) y «El espejo de las
// señales» (nivel 2). Se juegan en cualquier orden; al terminar cada uno se
// vuelve aqui. Cuando los dos estan completados se cierra la isla.
//
// Mismo contrato que un minijuego (mount / dispose / onComplete / onExit),
// asi que EmotionIslandApp no distingue esta isla de las demas.

import { DisgustCavesGame } from './DisgustCavesGame.js';
import { DisgustMirrorGame } from './DisgustMirrorGame.js';
import { ISLA, CUEVAS, RESPUESTAS } from './DesagradoTextos.js';
import { completeActivity, getIslandLevels, setIslandLevel } from '../../data/gameState.js';
import { leerDesagrado, resumenCuevas, confusionesOrdenadas } from './desagradoStore.js';
import { escapar } from './desagradoUi.js';

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
    this.disposed = false;
  }

  mount() { this.menu(); }

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

  /** Pantalla propia de la isla (menu, resumen, cierre) */
  pantalla(html, { clase = '' } = {}) {
    this.cerrarPantalla();
    const panel = document.createElement('div');
    panel.className = `i3d dc-flow ${clase}`.trim();
    panel.innerHTML = `<div class="i3d__overlay"><div class="i3d-intro dc-flow__intro"><div class="i3d-intro__card dc-flow__card" role="dialog" aria-modal="true" aria-label="${escapar(ISLA.nombre)}">${html}</div></div></div>`;
    this.host.appendChild(panel);
    this.panel = panel;
    return panel;
  }

  cerrarPantalla() {
    this.panel?.remove();
    this.panel = null;
  }

  /* ================================================================ menu */

  menu() {
    const niveles = getIslandLevels(ISLAND);
    const M = ISLA.menu;
    const tarjeta = (id, t, hecho) => `
      <button class="dc-juego ${hecho ? 'is-done' : ''}" type="button" data-juego="${id}">
        <span class="dc-juego__sub">${t.sub}${hecho ? ` · ✓ ${M.jugado}` : ''}</span>
        <strong>${t.titulo}</strong>
        <span class="dc-juego__desc">${t.desc}</span>
      </button>`;
    const p = this.pantalla(`
      <p class="i3d-intro__eyebrow">${ISLA.eyebrow}</p>
      <h3>${ISLA.nombre}</h3>
      <p class="dc-flow__hint">${ISLA.intro}</p>
      <p class="dc-flow__menu-titulo">${M.titulo}</p>
      <p class="dc-flow__hint">${M.sub}</p>
      <div class="dc-juegos">
        ${tarjeta('cuevas', M.cuevas, niveles.level1)}
        ${tarjeta('espejo', M.espejo, niveles.level2)}
      </div>
      <div class="i3d-panel__actions dc-flow__acciones">
        <button class="i3d-btn" type="button" data-resumen>📋 ${M.resumen}</button>
        <button class="i3d-btn" type="button" data-leave>${M.salir}</button>
      </div>`, { clase: 'dc-flow--menu' });
    p.querySelectorAll('[data-juego]').forEach((b) => b.addEventListener('click', () => this.startGame(b.dataset.juego)));
    p.querySelector('[data-resumen]').addEventListener('click', () => this.resumen());
    p.querySelector('[data-leave]').addEventListener('click', () => this.onExit?.());
    p.querySelector('[data-juego]').focus({ preventScroll: true });
  }

  /** Lo que el jugador ha respondido hasta ahora (localStorage) */
  resumen() {
    const datos = leerDesagrado();
    const r = resumenCuevas(datos);
    const conf = confusionesOrdenadas(datos);
    const etiqueta = (id) => RESPUESTAS.find((x) => x.id === id)?.etiqueta ?? id;
    const cuevas = r.total
      ? `<p class="dc-resumen">De ${r.total} elementos, <b>${r.desagrado ?? 0}</b> te generaron desagrado, <b>${r.indiferente ?? 0}</b> te dieron igual y <b>${r.agrado ?? 0}</b> te agradaron.</p>
         <ul class="dc-lista">${CUEVAS.map((c) => { const lista = datos.cuevas.respuestas.filter((x) => x.cueva === c.id); return lista.length ? `<li><b>${c.icono} ${escapar(c.corto)}</b>: ${lista.map((x) => `${escapar(c.elementos.find((e) => e.id === x.elemento)?.nombre ?? x.elemento)} → <em>${escapar(etiqueta(x.respuesta))}</em>`).join(' · ')}</li>` : ''; }).join('')}</ul>`
      : '<p class="dc-flow__hint">Todavía no has entrado en las cuevas.</p>';
    const espejo = datos.espejo.rondas.length
      ? `<p class="dc-resumen">Reconociste <b>${datos.espejo.aciertos}</b> de ${datos.espejo.total} señales de desagrado. ${conf.length ? `Confusiones: ${conf.map(([e, n]) => `${e} (${n})`).join(', ')}.` : 'Sin confusiones con otras emociones.'}</p>`
      : '<p class="dc-flow__hint">Todavía no has mirado el espejo.</p>';
    const p = this.pantalla(`
      <p class="i3d-intro__eyebrow">${ISLA.eyebrow}</p>
      <h3>📋 ${ISLA.menu.resumen}</h3>
      <p class="dc-flow__menu-titulo">${ISLA.menu.cuevas.titulo}</p>${cuevas}
      <p class="dc-flow__menu-titulo">${ISLA.menu.espejo.titulo}</p>${espejo}
      <div class="i3d-panel__actions"><button class="i3d-btn i3d-btn--primary" type="button" data-back>Volver</button></div>`);
    p.querySelector('[data-back]').addEventListener('click', () => this.menu());
  }

  /* =========================================================== minijuegos */

  startGame(id) {
    this.cerrarPantalla();
    const Game = id === 'cuevas' ? DisgustCavesGame : DisgustMirrorGame;
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
    if (niveles.level1 && niveles.level2 && !niveles.cerrada) this.cerrarIsla();
    else this.menu();
  }

  /* ============================================================== cierre */

  cerrarIsla() {
    const p = this.pantalla(`
      <p class="i3d-intro__eyebrow">${ISLA.eyebrow}</p>
      <h3>${ISLA.cierre.titulo}</h3>
      ${ISLA.cierre.lineas.map((l) => `<p class="dc-flow__hint">${l}</p>`).join('')}
      <p class="dc-resumen">${ISLA.cierre.mensaje}</p>
      <div class="i3d-panel__actions"><button class="i3d-btn i3d-btn--primary" type="button" data-ok>Continuar</button></div>`);
    p.querySelector('[data-ok]').addEventListener('click', () => {
      const niveles = getIslandLevels(ISLAND);
      niveles.cerrada = true;
      setIslandLevel(ISLAND, 2, true);           // guarda (setIslandLevel persiste el objeto)
      completeActivity('disgust-isla', 10);
      this.cerrarPantalla();
      this.onComplete?.({ islandId: ISLAND, success: true, emoAventura: true, badge: ISLAND, title: ISLA.nombre, message: ISLA.cierre.mensaje });
    });
  }

  dispose() {
    this.disposed = true;
    this.current?.dispose();
    this.current = null;
    this.cerrarPantalla();
  }

  memoryReport() {
    return this.current?.memoryReport?.() ?? null;
  }
}
