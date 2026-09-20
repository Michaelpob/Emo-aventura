// ISLA DE LA FRUSTRACION · La Cordillera de los Nudos · Flujo de los dos niveles
// Nivel 1: La Maquina Terca (taller, puzzle) -> Nivel 2: El Volcan de la
// Presion (accion en tiempo real). Se desbloquea con la Llave de Engranaje que
// entrega el taller.
//
// Mismo contrato que un minijuego (mount / dispose / onComplete / onExit), asi
// que EmotionIslandApp no distingue entre una isla de un nivel y esta. Nunca
// hay dos niveles vivos: el taller se libera (dispose) antes de construir el
// volcan; no se duplica el bucle de render.
//
// El taller termina con su tarjeta de cierre; al pulsar Continuar hay un
// fundido corto con el nombre del nivel y se entra al volcan. El volcan cierra
// la isla.

import { MaquinaTercaGame } from './MaquinaTercaGame.js';
import { VolcanPresionGame } from './VolcanPresionGame.js';
import { getIslandLevels, setIslandLevel } from '../../data/gameState.js';
import { ISLA } from './textos.js';

// clave propia del progreso por niveles (los guardados de la antigua torre no cuentan)
const LEVELS_KEY = 'nudos';

export class FrustrationIslandFlow {
  constructor({ host, island, player, onComplete, onExit, onOpenToolbox }) {
    this.host = host;
    this.island = island;
    this.player = player;
    this.onComplete = onComplete;
    this.onExit = onExit;
    this.onOpenToolbox = onOpenToolbox;
    this.current = null;
    this.timers = new Set();
    this.disposed = false;
  }

  /* ============================================================== montaje */

  mount() {
    if (getIslandLevels(LEVELS_KEY).level1) this.askWhereToStart();
    else this.startMaquina();
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
      onOpenToolbox: () => this.onOpenToolbox?.(),
      ...extra
    };
  }

  /** Con el molino ya reparado: ir al volcan o repetir el taller */
  askWhereToStart() {
    const panel = document.createElement('div');
    panel.className = 'i3d fh-choice';
    panel.innerHTML = `
      <div class="i3d__overlay">
        <div class="i3d-intro">
          <div class="i3d-intro__card" role="dialog" aria-modal="true" aria-label="${ISLA.eyebrow}">
            <p class="i3d-intro__eyebrow">${ISLA.eyebrow} · ${ISLA.nombre}</p>
            <h3>El molino ya está reparado</h3>
            <p class="fh-choice__hint">Tienes la Llave de Engranaje. Puedes subir al volcán o volver al taller y repararlo otra vez.</p>
            <div class="i3d-panel__actions">
              <button class="i3d-btn i3d-btn--primary" type="button" data-volcan>Subir al volcán</button>
              <button class="i3d-btn" type="button" data-taller>Empezar por el taller</button>
              <button class="i3d-btn" type="button" data-leave>Salir al mapa</button>
            </div>
          </div>
        </div>
      </div>`;
    this.host.appendChild(panel);
    this.panel = panel;
    const pick = (fn) => { panel.remove(); this.panel = null; fn(); };
    panel.querySelector('[data-volcan]').addEventListener('click', () => pick(() => this.startVolcan()));
    panel.querySelector('[data-taller]').addEventListener('click', () => pick(() => this.startMaquina()));
    panel.querySelector('[data-leave]').addEventListener('click', () => this.onExit?.());
    panel.querySelector('[data-volcan]').focus({ preventScroll: true });
  }

  /* =============================================================== niveles */

  startMaquina() {
    // el taller no cierra la isla: al terminar (tras su tarjeta) se sube al volcan
    this.current = new MaquinaTercaGame(this.gameOpts({ onComplete: () => this.enterVolcan() }));
    this.current.mount();
  }

  /** Tras la tarjeta del taller: fundido, se libera el taller y se construye el volcan */
  enterVolcan() {
    if (this.transitioning) return;
    this.transitioning = true;
    const taller = this.current;

    const fade = document.createElement('div');
    fade.className = 'fh-fade';
    fade.innerHTML = '<span>El Volcán de la Presión</span>';
    this.host.appendChild(fade);
    this.fade = fade;
    void fade.offsetHeight;   // fija el estado inicial: sin esto la transicion no arranca
    fade.classList.add('is-on');

    this.later(() => {
      taller.dispose();
      this.current = null;
      setIslandLevel(LEVELS_KEY, 1, true);

      fade.classList.add('is-titled');
      this.startVolcan();
      this.later(() => {
        fade.classList.remove('is-on');
        this.later(() => { fade.classList.remove('is-titled'); }, 600);
        this.later(() => { fade.remove(); if (this.fade === fade) this.fade = null; }, 1000);
        this.transitioning = false;
      }, 1500);
    }, 850);
  }

  startVolcan() {
    this.current = new VolcanPresionGame(this.gameOpts({
      onComplete: (result) => { setIslandLevel(LEVELS_KEY, 2, true); this.onComplete?.(result); }
    }));
    this.current.mount();
    // el fundido lo dibuja el flujo por encima del nuevo nivel
    if (this.fade) this.host.appendChild(this.fade);
  }

  /* ============================================================== limpieza */

  dispose() {
    this.disposed = true;
    this.timers.forEach((t) => clearTimeout(t));
    this.timers.clear();
    this.current?.dispose();
    this.current = null;
    this.panel?.remove();
    this.fade?.remove();
    this.panel = null;
    this.fade = null;
  }

  /** Diagnostico: memoria del nivel activo */
  memoryReport() {
    return this.current?.memoryReport?.() ?? null;
  }
}
