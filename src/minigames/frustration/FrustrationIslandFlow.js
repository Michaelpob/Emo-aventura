// ISLA DE LA FRUSTRACION · Flujo de los dos niveles
// Nivel 1: La torre (FrustrationTowerGame) -> Nivel 2: El valle (los orbes
// del antiguo Valle de la Luz, aqui como lo que viene despues del esfuerzo).
//
// Mismo contrato que un minijuego (mount / dispose / onComplete / onExit), asi
// que EmotionIslandApp no distingue entre una isla de un nivel y esta. Nunca
// hay dos niveles vivos: la torre se libera antes de construir el valle.
//
// La torre termina con su tarjeta de cierre; al pulsar Continuar hay un
// fundido corto con el nombre del nivel y se entra al valle. El valle cierra
// la isla.

import { MinigameBase } from '../../engine/MinigameBase.js';
import { FrustrationTowerGame } from './FrustrationTowerGame.js';
import { JoyOrbsGame } from '../joy/JoyOrbsGame.js';
import {
  addReward, completeActivity, recordReevaluation, getIslandLevels, setIslandLevel
} from '../../data/gameState.js';

const ISLAND = 'frustration';

/** La torre cuya salida lleva al valle: solo cambia lo que dice el portal */
class FrustrationTowerToValley extends FrustrationTowerGame {
  openExit() {
    super.openExit();
    this.say('TOCA EL PORTAL · SIGUE AL VALLE', 2400);
  }
}

/** Los orbes, jugados despues de la torre: la parte buena de haber seguido */
class FrustrationValleyGame extends JoyOrbsGame {
  async onStart() {
    await this.showIntro({
      eyebrow: 'La torre · El valle',
      goal: 'Recoge los 12 orbes de luz',
      hint: 'Ya pasaste lo difícil. Esto es lo que hay detrás de la torre: un valle abierto donde no hay ráfagas ni bloques que se caen. No hay que pulsar nada: los orbes se recogen al tocarlos. Si encadenas varios sin tocar el suelo, suman combo.',
      keys: [['W A S D', 'moverte'], ['Espacio', 'saltar'], ['Shift', 'correr'], ['Ratón', 'girar la cámara']],
      touch: [['Joystick', 'moverte'], ['⤒', 'saltar'], ['Arrastra', 'girar la cámara']]
    });
    this.ambient = this.audio.ambient('wind', { volume: 0.18, rate: 1.2 });
    this.say('RECOGE LOS ORBES', 2400);
  }

  get completionPayload() {
    return {
      islandId: ISLAND,
      success: true,
      emoAventura: true,
      badge: ISLAND,
      title: 'La torre y el valle',
      message: `Levantaste la torre aunque se cayera, y después recogiste los 12 orbes del valle. Lo que hay detrás de seguir: esto.`
    };
  }

  finish() {
    if (this.finished || this.closing) return;
    this.closing = true;
    this.controller.frozen = true;
    addReward('rayo-energia');
    completeActivity('frustration-valle-3d', 20);
    setIslandLevel(ISLAND, 2, true);
    recordReevaluation(ISLAND, 'media', 'Seguir tras el reves y disfrutar lo conseguido', 'baja');
    this.showClosingCard({
      title: `Combo máximo: ${this.bestCombo}`,
      lines: [
        'En la torre algo se interponía todo el rato: el viento, los bloques que se caían, la mano que temblaba. Aquí no se interponía nada, y la energía que antes era frustración se convirtió en impulso para saltar más lejos.',
        'Eso es lo que la frustración no te deja ver mientras la sientes: que detrás de seguir, parar un momento o pedir ayuda, suele haber un valle así.',
        'Regular no siempre es reducir. A veces es aguantar el revés y dejar que después la emoción te empuje hacia lo que quieres.'
      ],
      // el cierre de la base, sin pasar por el finish() de JoyOrbsGame (que
      // daria las recompensas de la Alegria)
      onDone: () => MinigameBase.prototype.finish.call(this)
    });
  }
}

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
    if (getIslandLevels(ISLAND).level1) this.askWhereToStart();
    else this.startTower();
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

  /** Con la torre ya levantada: ir al valle o repetirlo todo */
  askWhereToStart() {
    const panel = document.createElement('div');
    panel.className = 'i3d fh-choice';
    panel.innerHTML = `
      <div class="i3d__overlay">
        <div class="i3d-intro">
          <div class="i3d-intro__card" role="dialog" aria-modal="true" aria-label="Isla de la Frustración">
            <p class="i3d-intro__eyebrow">Isla de la Frustración</p>
            <h3>La torre ya está levantada</h3>
            <p class="fh-choice__hint">Puedes seguir por el valle o volver a empezar desde el primer bloque.</p>
            <div class="i3d-panel__actions">
              <button class="i3d-btn i3d-btn--primary" type="button" data-valley>Ir al valle</button>
              <button class="i3d-btn" type="button" data-tower>Empezar por la torre</button>
              <button class="i3d-btn" type="button" data-leave>Salir al mapa</button>
            </div>
          </div>
        </div>
      </div>`;
    this.host.appendChild(panel);
    this.panel = panel;
    const pick = (fn) => { panel.remove(); this.panel = null; fn(); };
    panel.querySelector('[data-valley]').addEventListener('click', () => pick(() => this.startValley()));
    panel.querySelector('[data-tower]').addEventListener('click', () => pick(() => this.startTower()));
    panel.querySelector('[data-leave]').addEventListener('click', () => this.onExit?.());
    panel.querySelector('[data-valley]').focus({ preventScroll: true });
  }

  /* =============================================================== niveles */

  startTower() {
    // la torre no cierra la isla: al terminar (tras su tarjeta) se pasa al valle
    this.current = new FrustrationTowerToValley(this.gameOpts({ onComplete: () => this.enterValley() }));
    this.current.mount();
  }

  /** Tras la tarjeta de la torre: fundido, se libera la torre y se construye el valle */
  enterValley() {
    if (this.transitioning) return;
    this.transitioning = true;
    const tower = this.current;

    const fade = document.createElement('div');
    fade.className = 'fh-fade';
    fade.innerHTML = '<span>El valle</span>';
    this.host.appendChild(fade);
    this.fade = fade;
    void fade.offsetHeight;   // fija el estado inicial: sin esto la transicion no arranca
    fade.classList.add('is-on');

    this.later(() => {
      tower.dispose();
      this.current = null;
      setIslandLevel(ISLAND, 1, true);

      fade.classList.add('is-titled');
      this.startValley();
      this.later(() => {
        fade.classList.remove('is-on');
        this.later(() => { fade.classList.remove('is-titled'); }, 600);
        this.later(() => { fade.remove(); if (this.fade === fade) this.fade = null; }, 1000);
        this.transitioning = false;
      }, 1500);
    }, 850);
  }

  startValley() {
    this.current = new FrustrationValleyGame(this.gameOpts());
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
