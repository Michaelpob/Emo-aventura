// EMO-AVENTURA · Motor de escena
// Da a cada isla un escenario por capas, un personaje animado, dialogos,
// elecciones, paneles de actividad, particulas, recompensas y HUD.
// Los flujos de cada isla se escriben como funciones async que usan estas primitivas.

import { TOOLS } from '../data/tools.js';
import { addPoints, addReward, prefersReducedMotion, gameState, setSetting } from '../data/gameState.js';

export const ABORTED = Symbol('stage-aborted');

const CHARACTER_STATES = [
  'idle', 'walk', 'interact', 'celebrate', 'think',
  'breathe', 'surprise', 'fear', 'joy', 'anger', 'disgust', 'pause'
];

export class Stage {
  /**
   * @param {object} opts
   * @param {HTMLElement} opts.host  contenedor donde se monta el juego
   * @param {object} opts.island     isla de islands.js
   * @param {string} opts.theme      'fear' | 'joy' | 'disgust'
   * @param {object} opts.player     perfil del jugador
   * @param {Function} opts.onExit   volver al mapa
   * @param {Function} opts.onOpenToolbox
   */
  constructor({ host, island, theme, player, onExit, onOpenToolbox }) {
    this.host = host;
    this.island = island;
    this.theme = theme;
    this.player = player;
    this.onExit = onExit;
    this.onOpenToolbox = onOpenToolbox;
    this.disposed = false;
    this.pending = new Set(); // resolvers activos, para abortar limpio
    this.timers = new Set();
    this.characterX = 50;
    this.audio = null;
  }

  /* =============================================================== montaje */

  mount() {
    this.root = document.createElement('div');
    this.root.className = `emo-game emo-theme-${this.theme}`;
    this.root.dataset.intensity = 'media';
    if (prefersReducedMotion()) this.root.dataset.reduceMotion = 'true';

    this.root.innerHTML = `
      <div class="emo-world" data-world>
        <div class="emo-sky"></div>
        <div class="emo-layer emo-layer--far" data-layer="far"></div>
        <div class="emo-layer emo-layer--mid" data-layer="mid"></div>
        <div class="emo-layer emo-layer--near" data-layer="near"></div>
        <div class="emo-ground"></div>
        <div class="emo-props" data-props></div>
        <div class="emo-character" data-character data-state="idle">
          <div class="emo-character__glow"></div>
          <div class="emo-character__body">
            <span class="emo-character__face">${this.player?.avatar ?? '🧒'}</span>
          </div>
          <div class="emo-character__shadow"></div>
        </div>
        <div class="emo-fx" data-fx aria-hidden="true"></div>
      </div>

      <header class="emo-hud">
        <button class="emo-hud__btn emo-hud__btn--back" type="button" data-exit aria-label="Volver al mapa">
          <span aria-hidden="true">←</span><span class="emo-hud__label">Mapa</span>
        </button>
        <div class="emo-hud__title">
          <p class="emo-hud__eyebrow" data-hud-eyebrow>${this.island?.name ?? ''}</p>
          <h2 data-hud-title>${this.island?.displayName ?? ''}</h2>
        </div>
        <div class="emo-hud__right">
          <div class="emo-points" data-points-box aria-live="polite">
            <span class="emo-points__icon" aria-hidden="true">✦</span>
            <span class="emo-points__value" data-points>${gameState.emotionalPoints}</span>
            <span class="emo-sr">puntos emocionales</span>
          </div>
          <button class="emo-hud__btn" type="button" data-sound aria-label="Activar o desactivar sonido">${gameState.settings.sound ? '🔊' : '🔇'}</button>
          <button class="emo-hud__btn" type="button" data-motion aria-label="Reducir o activar animaciones">${prefersReducedMotion() ? '🐢' : '🎞️'}</button>
        </div>
      </header>

      <div class="emo-intensity" data-intensity-box hidden>
        <span class="emo-intensity__label">Intensidad</span>
        <div class="emo-intensity__bar"><i data-intensity-fill></i></div>
        <span class="emo-intensity__value" data-intensity-value>-</span>
      </div>

      <div class="emo-dialog-layer" data-dialog aria-live="polite"></div>
      <div class="emo-panel-layer" data-panel></div>
      <div class="emo-overlay-layer" data-overlay></div>
      <div class="emo-toast-layer" data-toast aria-live="polite"></div>
    `;

    this.host.appendChild(this.root);

    this.el = {
      world: this.root.querySelector('[data-world]'),
      props: this.root.querySelector('[data-props]'),
      fx: this.root.querySelector('[data-fx]'),
      character: this.root.querySelector('[data-character]'),
      dialog: this.root.querySelector('[data-dialog]'),
      panel: this.root.querySelector('[data-panel]'),
      overlay: this.root.querySelector('[data-overlay]'),
      toast: this.root.querySelector('[data-toast]'),
      points: this.root.querySelector('[data-points]'),
      pointsBox: this.root.querySelector('[data-points-box]'),
      hudTitle: this.root.querySelector('[data-hud-title]'),
      hudEyebrow: this.root.querySelector('[data-hud-eyebrow]'),
      intensityBox: this.root.querySelector('[data-intensity-box]'),
      intensityFill: this.root.querySelector('[data-intensity-fill]'),
      intensityValue: this.root.querySelector('[data-intensity-value]')
    };

    this.root.querySelector('[data-exit]').addEventListener('click', () => this.confirmExit());
    const soundBtn = this.root.querySelector('[data-sound]');
    soundBtn.addEventListener('click', () => {
      const on = !gameState.settings.sound;
      setSetting('sound', on);
      soundBtn.textContent = on ? '🔊' : '🔇';
      if (on) this.playTone(660, 0.08);
    });
    const motionBtn = this.root.querySelector('[data-motion]');
    motionBtn.addEventListener('click', () => {
      const reduce = !gameState.settings.reduceMotion;
      setSetting('reduceMotion', reduce);
      motionBtn.textContent = reduce ? '🐢' : '🎞️';
      if (reduce) this.root.dataset.reduceMotion = 'true';
      else delete this.root.dataset.reduceMotion;
      this.toast(reduce ? 'Animaciones reducidas' : 'Animaciones completas');
    });

    this.onKey = (e) => {
      if (e.key === 'Escape') this.confirmExit();
    };
    window.addEventListener('keydown', this.onKey);

    this.setCharacterPosition(50);
    return this;
  }

  dispose() {
    this.disposed = true;
    window.removeEventListener('keydown', this.onKey);
    this.timers.forEach((t) => { clearTimeout(t); clearInterval(t); });
    this.timers.clear();
    this.pending.forEach((reject) => reject(ABORTED));
    this.pending.clear();
    this.root?.remove();
  }

  /* ============================================================ utilidades */

  /**
   * Marca la promesa como "manejada" para que abortar la partida no genere
   * unhandled rejections: el flujo que la espera igual recibe el rechazo.
   */
  guard(promise) {
    promise.catch(() => {});
    return promise;
  }

  /** setTimeout que se cancela al salir del juego */
  delay(ms) {
    if (this.disposed) return this.guard(Promise.reject(ABORTED));
    if (prefersReducedMotion()) ms = Math.min(ms, 220);
    return this.guard(new Promise((resolve, reject) => {
      this.pending.add(reject);
      const t = setTimeout(() => {
        this.timers.delete(t);
        this.pending.delete(reject);
        resolve();
      }, ms);
      this.timers.add(t);
    }));
  }

  /** Promesa que espera una interaccion; se aborta al salir */
  interaction(setup) {
    if (this.disposed) return this.guard(Promise.reject(ABORTED));
    return this.guard(new Promise((resolve, reject) => {
      this.pending.add(reject);
      const done = (value) => {
        this.pending.delete(reject);
        resolve(value);
      };
      setup(done);
    }));
  }

  confirmExit() {
    if (this.exiting) return;
    this.exiting = true;
    const box = document.createElement('div');
    box.className = 'emo-confirm';
    box.innerHTML = `
      <div class="emo-confirm__card" role="dialog" aria-modal="true" aria-label="Salir de la isla">
        <h3>¿Volver al mapa?</h3>
        <p>Tu progreso y tus herramientas quedan guardados. Puedes retomar la isla cuando quieras.</p>
        <div class="emo-confirm__actions">
          <button class="emo-btn emo-btn--primary" type="button" data-yes>Volver al mapa</button>
          <button class="emo-btn" type="button" data-no>Seguir aqui</button>
        </div>
      </div>
    `;
    this.el.overlay.appendChild(box);
    box.querySelector('[data-yes]').focus();
    box.querySelector('[data-yes]').addEventListener('click', () => {
      this.exiting = false;
      this.onExit?.();
    });
    box.querySelector('[data-no]').addEventListener('click', () => {
      this.exiting = false;
      box.remove();
    });
  }

  /* ============================================================== escenario */

  setTitle(title, eyebrow) {
    if (title) this.el.hudTitle.textContent = title;
    if (eyebrow) this.el.hudEyebrow.textContent = eyebrow;
  }

  /** Cambia el "capitulo" visual del escenario (clase en el mundo) */
  setScene(name) {
    this.el.world.dataset.scene = name;
  }

  /** Intensidad emocional: cambia el ambiente completo */
  setIntensity(level, { label } = {}) {
    const map = { baja: 1, media: 2, alta: 3 };
    this.root.dataset.intensity = level;
    this.el.intensityBox.hidden = false;
    this.el.intensityFill.style.setProperty('--fill', `${(map[level] ?? 2) * 33.3}%`);
    this.el.intensityValue.textContent = label ?? level.toUpperCase();
    this.el.intensityBox.classList.remove('is-pulse');
    void this.el.intensityBox.offsetWidth;
    this.el.intensityBox.classList.add('is-pulse');
  }

  hideIntensity() {
    this.el.intensityBox.hidden = true;
  }

  /** Nivel ambiental 0..1 para niebla / lava / luz segun la isla */
  setAmbient(value) {
    this.el.world.style.setProperty('--ambient', String(Math.max(0, Math.min(1, value))));
  }

  /** Inserta props interactivos en el escenario */
  setProps(html) {
    this.el.props.innerHTML = html;
    return this.el.props;
  }

  clearProps() {
    this.el.props.innerHTML = '';
  }

  /* ============================================================= personaje */

  setCharacterState(state) {
    if (!CHARACTER_STATES.includes(state)) state = 'idle';
    this.el.character.dataset.state = state;
  }

  setCharacterPosition(percent) {
    this.characterX = percent;
    this.el.character.style.setProperty('--x', `${percent}%`);
    // el mundo tambien lo usa (linterna del miedo, focos de luz)
    this.el.world.style.setProperty('--x', `${percent}%`);
  }

  /**
   * Camina hasta una posicion (0-100% del ancho).
   * speed: 'lenta' (ira alta / desagrado intenso), 'normal', 'rapida' (alegria)
   */
  async walkTo(percent, { speed = 'normal', state = 'walk' } = {}) {
    const durations = { lenta: 2200, normal: 1300, rapida: 850 };
    const distance = Math.abs(percent - this.characterX) / 100;
    const duration = Math.max(320, (durations[speed] ?? 1300) * Math.max(0.35, distance));
    this.el.character.dataset.facing = percent < this.characterX ? 'left' : 'right';
    this.el.character.style.setProperty('--walk-duration', `${duration}ms`);
    this.setCharacterState(state);
    this.setCharacterPosition(percent);
    await this.delay(duration);
    if (this.disposed) return;
    this.setCharacterState('idle');
  }

  async react(state, ms = 900) {
    this.setCharacterState(state);
    await this.delay(ms);
    if (!this.disposed) this.setCharacterState('idle');
  }

  /* =============================================================== dialogos */

  /** Burbuja/panel de dialogo con boton continuar. Devuelve promesa. */
  say(text, { who = null, avatar = null, cta = 'Continuar', type = 'panel' } = {}) {
    return this.interaction((done) => {
      const box = document.createElement('div');
      box.className = `emo-dialog emo-dialog--${type}`;
      box.innerHTML = `
        ${avatar ? `<div class="emo-dialog__avatar" aria-hidden="true">${avatar}</div>` : ''}
        <div class="emo-dialog__body">
          ${who ? `<p class="emo-dialog__who">${who}</p>` : ''}
          <p class="emo-dialog__text">${text}</p>
          <button class="emo-btn emo-btn--primary emo-dialog__cta" type="button">${cta}</button>
        </div>
      `;
      this.el.dialog.innerHTML = '';
      this.el.dialog.appendChild(box);
      const btn = box.querySelector('button');
      btn.focus({ preventScroll: true });
      btn.addEventListener('click', () => {
        box.classList.add('is-out');
        setTimeout(() => box.remove(), 220);
        done(true);
      });
    });
  }

  /** Varios textos seguidos */
  async script(lines, opts = {}) {
    for (const line of lines) {
      if (this.disposed) return;
      if (typeof line === 'string') await this.say(line, opts);
      else await this.say(line.text, { ...opts, ...line });
    }
  }

  clearDialog() {
    this.el.dialog.innerHTML = '';
  }

  /**
   * Elecciones. options: [{ id, label, detail, icon, correct?, feedback? }]
   * Devuelve la opcion elegida. Nunca penaliza.
   */
  choices(options, { title = '', prompt = '', columns = 1, keepOpen = false } = {}) {
    return this.interaction((done) => {
      const box = document.createElement('div');
      box.className = 'emo-choices';
      box.innerHTML = `
        <div class="emo-choices__card" role="group" aria-label="${title || 'Opciones'}">
          ${title ? `<h3 class="emo-choices__title">${title}</h3>` : ''}
          ${prompt ? `<p class="emo-choices__prompt">${prompt}</p>` : ''}
          <div class="emo-choices__list" data-cols="${columns}">
            ${options.map((o, i) => `
              <button class="emo-choice" type="button" data-idx="${i}">
                ${o.icon ? `<span class="emo-choice__icon" aria-hidden="true">${o.icon}</span>` : ''}
                <span class="emo-choice__text">
                  <strong>${o.label}</strong>
                  ${o.detail ? `<small>${o.detail}</small>` : ''}
                </span>
              </button>
            `).join('')}
          </div>
        </div>
      `;
      this.el.dialog.innerHTML = '';
      this.el.dialog.appendChild(box);
      box.querySelector('.emo-choice')?.focus({ preventScroll: true });
      box.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-idx]');
        if (!btn) return;
        const opt = options[Number(btn.dataset.idx)];
        box.querySelectorAll('.emo-choice').forEach((b) => { b.disabled = true; });
        btn.classList.add('is-picked');
        this.playTone(opt.correct === false ? 420 : 720, 0.09);
        if (!keepOpen) {
          setTimeout(() => box.remove(), 340);
        }
        done(opt);
      });
    });
  }

  /* ================================================================ paneles */

  /**
   * Abre un panel de actividad. render(panel, done) construye el contenido y
   * llama done(valor) cuando la actividad termina.
   */
  panel(render, { title = '', subtitle = '', className = '' } = {}) {
    return this.interaction((done) => {
      const wrap = document.createElement('div');
      wrap.className = `emo-panel ${className}`;
      wrap.innerHTML = `
        <div class="emo-panel__card" role="dialog" aria-modal="true" aria-label="${title || 'Actividad'}">
          ${title ? `<header class="emo-panel__head">
            <h3>${title}</h3>
            ${subtitle ? `<p>${subtitle}</p>` : ''}
          </header>` : ''}
          <div class="emo-panel__body" data-body></div>
        </div>
      `;
      this.el.panel.innerHTML = '';
      this.el.panel.appendChild(wrap);
      const body = wrap.querySelector('[data-body]');
      const finish = (value) => {
        wrap.classList.add('is-out');
        setTimeout(() => wrap.remove(), 260);
        done(value);
      };
      render(body, finish, wrap);
    });
  }

  closePanel() {
    this.el.panel.innerHTML = '';
  }

  /* =============================================================== feedback */

  toast(text, { icon = '✓', tone = 'ok' } = {}) {
    const t = document.createElement('div');
    t.className = `emo-toast emo-toast--${tone}`;
    t.innerHTML = `<span aria-hidden="true">${icon}</span><p>${text}</p>`;
    this.el.toast.appendChild(t);
    setTimeout(() => t.classList.add('is-out'), 2400);
    setTimeout(() => t.remove(), 2900);
  }

  /** Feedback educativo: nunca dice "incorrecto" */
  async showFeedback(text, { tone = 'ok', title = null, cta = 'Continuar' } = {}) {
    const icons = { ok: '✨', info: '💡', soft: '🌿' };
    return this.say(
      `${title ? `<strong class="emo-feedback__title">${title}</strong>` : ''}${text}`,
      { avatar: icons[tone] ?? '💡', cta }
    );
  }

  /* =============================================================== puntos */

  /** Suma puntos con animacion del contador */
  addPoints(amount, { silent = false } = {}) {
    const from = gameState.emotionalPoints;
    const to = addPoints(amount);
    const box = this.el.pointsBox;
    box.classList.remove('is-bump');
    void box.offsetWidth;
    box.classList.add('is-bump');
    if (!silent) {
      const float = document.createElement('span');
      float.className = 'emo-points__float';
      float.textContent = `+${amount}`;
      box.appendChild(float);
      setTimeout(() => float.remove(), 1200);
    }
    // Contador animado con setInterval (no depende de requestAnimationFrame,
    // que el navegador puede congelar en pestanas en segundo plano).
    const start = performance.now();
    const dur = prefersReducedMotion() ? 1 : 620;
    const timer = setInterval(() => {
      if (this.disposed) { clearInterval(timer); return; }
      const p = Math.min(1, (performance.now() - start) / dur);
      this.el.points.textContent = Math.round(from + (to - from) * p);
      if (p >= 1) clearInterval(timer);
    }, 40);
    this.timers.add(timer);
    this.playTone(880, 0.06);
    return to;
  }

  /* ============================================================ recompensa */

  /**
   * Entrega de herramienta: pausa, animacion, particulas, mensaje y guardado.
   * @param {string} toolId  id en tools.js
   * @param {string} message mensaje psicoeducativo
   * @param {number} points  puntos que acompanan la recompensa
   */
  async reward(toolId, message = '', points = 0) {
    const tool = TOOLS[toolId];
    if (!tool) return;
    addReward(toolId);
    if (points) this.addPoints(points, { silent: true });

    this.burstParticles(18, tool.icon);
    this.playTone(523, 0.1);
    this.playTone(784, 0.12, 0.12);
    this.setCharacterState('celebrate');

    await this.interaction((done) => {
      const box = document.createElement('div');
      box.className = 'emo-reward';
      box.innerHTML = `
        <div class="emo-reward__card" role="dialog" aria-modal="true" aria-label="Nueva herramienta">
          <p class="emo-reward__eyebrow">Nueva herramienta</p>
          <div class="emo-reward__icon" aria-hidden="true">
            <span class="emo-reward__glow"></span>
            <span class="emo-reward__emoji">${tool.icon}</span>
          </div>
          <h3 class="emo-reward__name">${tool.name}</h3>
          <p class="emo-reward__strategy">${tool.emotion} · ${tool.strategy}</p>
          <p class="emo-reward__desc">${tool.description}</p>
          ${message ? `<p class="emo-reward__message">${message}</p>` : ''}
          ${points ? `<p class="emo-reward__points">+${points} puntos emocionales</p>` : ''}
          <button class="emo-btn emo-btn--primary" type="button">Guardar en mi caja</button>
        </div>
        <div class="emo-reward__sparks" aria-hidden="true">
          ${Array.from({ length: 14 }, (_, i) => `<i style="--i:${i}"></i>`).join('')}
        </div>
      `;
      this.el.overlay.appendChild(box);
      const btn = box.querySelector('button');
      btn.focus({ preventScroll: true });
      btn.addEventListener('click', () => {
        box.classList.add('is-out');
        setTimeout(() => box.remove(), 300);
        done(true);
      });
    });

    if (!this.disposed) {
      this.setCharacterState('idle');
      this.toast(`${tool.icon} ${tool.name} guardada en tu caja`, { icon: '🧰' });
    }
  }

  /* =============================================================== efectos */

  burstParticles(count = 14, glyph = '✨') {
    if (prefersReducedMotion()) return;
    for (let i = 0; i < count; i += 1) {
      const p = document.createElement('i');
      p.className = 'emo-spark';
      p.textContent = glyph;
      p.style.setProperty('--tx', `${(Math.random() * 2 - 1) * 220}px`);
      p.style.setProperty('--ty', `${(Math.random() * -1 - 0.2) * 200}px`);
      p.style.setProperty('--d', `${600 + Math.random() * 700}ms`);
      p.style.setProperty('--s', String(0.6 + Math.random() * 0.9));
      this.el.fx.appendChild(p);
      setTimeout(() => p.remove(), 1500);
    }
  }

  /** Transicion suave entre secciones */
  async transition(label = '') {
    const veil = document.createElement('div');
    veil.className = 'emo-transition';
    if (label) veil.innerHTML = `<p>${label}</p>`;
    this.el.overlay.appendChild(veil);
    await this.delay(520);
    veil.classList.add('is-out');
    setTimeout(() => veil.remove(), 500);
    await this.delay(160);
  }

  /* ================================================================ sonido */

  playTone(freq = 440, gain = 0.08, delaySec = 0) {
    if (!gameState.settings.sound) return;
    try {
      if (!this.audio) {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return;
        this.audio = new Ctx();
      }
      const ctx = this.audio;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      g.gain.value = 0;
      osc.connect(g).connect(ctx.destination);
      const t0 = ctx.currentTime + delaySec;
      g.gain.linearRampToValueAtTime(gain, t0 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.35);
      osc.start(t0);
      osc.stop(t0 + 0.4);
    } catch {
      /* el sonido es opcional: si falla, el juego sigue */
    }
  }

  /** Ruido ambiental suave por isla (viento, lava, pantano) */
  ambientSound(kind) {
    if (!gameState.settings.sound) return;
    const tones = { fear: 180, joy: 620, anger: 90, disgust: 240 };
    this.playTone(tones[kind] ?? 300, 0.03);
  }
}
