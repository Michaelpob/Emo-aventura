// ISLA DE LA FRUSTRACION · Caja de herramientas de calma
// Cuatro herramientas jugables, reutilizadas por los dos mini-juegos:
//   1. RESPIRAR 4-4-4  un circulo que se hincha y se vacia; se mantiene
//                      pulsado al inflar y se suelta al exhalar, 3 ciclos.
//                      La sincronia se puntua con estrellas, nunca se falla.
//   2. CONTAR 5 A 1    cinco faroles que se apagan en orden descendente,
//                      cada uno con un tono grave. Equivocarse no cuesta.
//   3. PEDIR AYUDA     una pista concreta de Tuerca para lo que toca ahora.
//                      Siempre disponible y siempre con su sello.
//   4. CAMBIAR DE PLAN el juego cambia las piezas / la idea.
// El jugador elige (no se le impone ninguna); al terminar, el juego baja la
// tension y sigue EXACTAMENTE donde estaba. Nada se pierde nunca.
//
// Intencion pedagogica: la regulacion no es dejar de sentir la tension, es
// tener varias formas de bajarla y escoger una a tiempo.

import { CAJA } from './textos.js';

const BREATH = [
  { id: 'in', seconds: 4, hold: true },
  { id: 'hold', seconds: 4, hold: true },
  { id: 'out', seconds: 4, hold: false }
];
const BREATH_CYCLES = 3;
const LANTERNS = 5;

export class CalmToolbox {
  /**
   * @param {import('../../engine/MinigameBase.js').MinigameBase} game
   * @param {object} o
   * @param {Function} o.hint       () => string   pista concreta del momento (pedir ayuda)
   * @param {Function} o.onPlanB    () => string   el juego cambia de plan y dice que cambio
   * @param {Function} [o.onLantern] (n) => void    farol n apagado (para el 3D)
   * @param {Function} o.onUsed     (id, extra) => void
   * @param {Function} [o.onClose]  cerrada sin usar nada
   * @param {boolean}  [o.reduceMotion]
   */
  constructor(game, { hint, onPlanB, onLantern = null, onUsed, onClose = null, reduceMotion = false }) {
    this.game = game;
    this.hint = hint;
    this.onPlanB = onPlanB;
    this.onLantern = onLantern;
    this.onUsed = onUsed;
    this.onClose = onClose;
    this.reduceMotion = reduceMotion;
    this.layer = null;
    this.timer = null;
    this.holding = false;
    this.used = [];            // ids usados en la partida, en orden
    this.open_ = false;
  }

  get isOpen() { return this.open_; }

  /**
   * @param {object} [o]
   * @param {boolean} [o.forced]  bloqueo: hay que usar una para seguir
   * @param {string[]} [o.tools]  cuales se ofrecen
   * @param {string} [o.title]
   */
  open({ forced = false, tools = ['respiracion', 'contar', 'ayuda', 'planB'], title = CAJA.titulo, sub = CAJA.sub } = {}) {
    if (this.open_) return;
    this.open_ = true;
    this.forced = forced;
    const g = this.game;
    g.controller.frozen = true;
    g.controller.exitPointerLock?.();
    g._resetStick?.();
    g.releaseButtons?.();
    g.audio?.duck(0.35);

    const layer = document.createElement('div');
    layer.className = `ct-layer${this.reduceMotion ? ' is-reduced' : ''}`;
    layer.innerHTML = `
      <div class="ct-card" role="dialog" aria-modal="true" aria-label="${title}">
        <p class="ct-eyebrow">🧰 ${title}</p>
        <p class="ct-sub" data-sub>${sub}</p>
        <div class="ct-body" data-body></div>
      </div>`;
    g.root.appendChild(layer);
    this.layer = layer;
    this.body = layer.querySelector('[data-body]');
    this.sub = layer.querySelector('[data-sub]');
    this.renderMenu(tools);
  }

  renderMenu(tools) {
    const h = CAJA.herramientas;
    this.body.innerHTML = `
      <div class="ct-options">
        ${tools.map((id) => `
          <button class="ct-opt" type="button" data-tool="${id}">
            <span class="ct-opt__ico" aria-hidden="true">${h[id].icon}</span>
            <strong>${h[id].label}</strong>
            <small>${h[id].sub}</small>
          </button>`).join('')}
      </div>
      ${this.forced ? '' : `<button class="i3d-btn ct-skip" type="button" data-skip>${CAJA.cerrar}</button>`}`;
    this.body.querySelectorAll('[data-tool]').forEach((btn) => {
      btn.addEventListener('click', () => this.pick(btn.dataset.tool));
    });
    this.body.querySelector('[data-skip]')?.addEventListener('click', () => this.close(false));
    this.body.querySelector('[data-tool]')?.focus({ preventScroll: true });
  }

  pick(id) {
    this.game.audio?.play('interact', { volume: 0.3 });
    if (id === 'respiracion') this.startBreathing();
    else if (id === 'contar') this.startCounting();
    else if (id === 'ayuda') this.showHelp();
    else if (id === 'planB') this.planB();
  }

  /* ------------------------------------------------------- 1 · respirar */

  startBreathing() {
    const t = CAJA.respiracion;
    this.sub.textContent = t.hintIn;
    this.body.innerHTML = `
      <div class="ct-breath">
        <button class="ct-circle" type="button" data-pad aria-label="Mantén pulsado para inhalar"><span data-phase>${t.in}</span></button>
        <p class="ct-breath__stars" data-stars aria-live="polite"></p>
        <div class="ct-cycles" data-cycles>${'<i>●</i>'.repeat(BREATH_CYCLES)}</div>
      </div>`;
    const pad = this.body.querySelector('[data-pad]');
    const phaseEl = this.body.querySelector('[data-phase]');
    const starsEl = this.body.querySelector('[data-stars]');
    const dots = [...this.body.querySelectorAll('[data-cycles] i')];

    // mantener: dedo o raton sobre el circulo, o espacio / E en teclado
    let pid = null;
    const down = (e) => { if (pid !== null) return; e.preventDefault(); pid = e.pointerId; try { pad.setPointerCapture(e.pointerId); } catch { /* opcional */ } this.holding = true; pad.classList.add('is-held'); };
    const up = (e) => { if (pid === null) return; if (e && e.pointerId !== undefined && e.pointerId !== pid) return; pid = null; this.holding = false; pad.classList.remove('is-held'); };
    pad.addEventListener('pointerdown', down);
    pad.addEventListener('pointerup', up);
    pad.addEventListener('pointercancel', up);
    pad.addEventListener('lostpointercapture', up);
    window.addEventListener('pointerup', up);
    const isKey = (e) => e.key === ' ' || e.key === 'e' || e.key === 'E';
    const kd = (e) => { if (isKey(e)) { e.preventDefault(); this.holding = true; pad.classList.add('is-held'); } };
    const ku = (e) => { if (isKey(e)) { this.holding = false; pad.classList.remove('is-held'); } };
    window.addEventListener('keydown', kd);
    window.addEventListener('keyup', ku);
    this.cleanup = () => {
      window.removeEventListener('pointerup', up);
      window.removeEventListener('keydown', kd);
      window.removeEventListener('keyup', ku);
    };

    // el circulo respira solo; se mide cuanto tiempo la mano acompaño
    let cycle = 0;
    let phase = 0;
    let elapsed = 0;
    let matched = 0;
    let total = 0;
    const scores = [];
    let last = performance.now();
    const setPhase = (i) => {
      phase = i;
      elapsed = 0;
      const p = BREATH[i];
      phaseEl.textContent = t[p.id];
      this.sub.textContent = p.id === 'in' ? t.hintIn : p.id === 'hold' ? t.hintHold : t.hintOut;
      pad.dataset.phase = p.id;
      if (p.id === 'in') this.game.audio?.play('inhale', { volume: 0.45 });
      if (p.id === 'out') this.game.audio?.play('exhale', { volume: 0.45 });
    };
    setPhase(0);
    this.timer = setInterval(() => {
      const now = performance.now();
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (this.game.paused || this.game.finished) return;
      const p = BREATH[phase];
      elapsed += dt;
      total += dt;
      if (this.holding === p.hold) matched += dt;
      const u = Math.min(1, elapsed / p.seconds);
      const scale = p.id === 'in' ? 0.55 + 0.45 * u : p.id === 'hold' ? 1 : 1 - 0.45 * u;
      pad.style.setProperty('--s', scale.toFixed(3));
      if (u >= 1) {
        if (phase < BREATH.length - 1) { setPhase(phase + 1); return; }
        // ciclo completo: estrellas amables (nunca cero)
        const sync = total > 0 ? matched / total : 1;
        const stars = sync > 0.8 ? 3 : sync > 0.5 ? 2 : 1;
        scores.push(sync);
        starsEl.textContent = `${'★'.repeat(stars)}${'☆'.repeat(3 - stars)} ${t.sincronia[stars - 1]}`;
        matched = 0;
        total = 0;
        cycle += 1;
        dots.forEach((d, i) => d.classList.toggle('is-on', i < cycle));
        this.game.audio?.play('chime', { volume: 0.35, rate: 0.9 + cycle * 0.1 });
        if (cycle >= BREATH_CYCLES) {
          clearInterval(this.timer);
          this.timer = null;
          this.sub.textContent = t.listo;
          pad.disabled = true;
          const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
          setTimeout(() => this.finish('respiracion', { sincronia: +avg.toFixed(2) }), 1200);
          return;
        }
        setPhase(0);
      }
    }, 50);
  }

  /* -------------------------------------------------------- 2 · contar */

  startCounting() {
    const t = CAJA.contar;
    this.sub.textContent = t.hint;
    const order = Array.from({ length: LANTERNS }, (_, i) => LANTERNS - i).sort(() => Math.random() - 0.5);
    this.body.innerHTML = `
      <div class="ct-lanterns">
        ${order.map((n) => `<button class="ct-lantern" type="button" data-n="${n}" aria-label="Farol ${n}"><span aria-hidden="true">🏮</span><b>${n}</b></button>`).join('')}
      </div>`;
    let next = LANTERNS;
    this.body.querySelectorAll('[data-n]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const n = Number(btn.dataset.n);
        if (btn.classList.contains('is-off')) return;
        if (n !== next) {
          // no pasa nada: se mece y se sigue
          btn.classList.remove('is-wrong');
          void btn.offsetWidth;
          btn.classList.add('is-wrong');
          this.game.audio?.play('soften', { volume: 0.25 });
          return;
        }
        btn.classList.add('is-off');
        // cada farol, mas grave que el anterior
        this.game.audio?.play('lowNote', { volume: 0.5, rate: 1.15 - (LANTERNS - n) * 0.12 });
        this.onLantern?.(n);
        next -= 1;
        if (next < 1) {
          this.sub.textContent = t.listo;
          setTimeout(() => this.finish('contar', {}), 1100);
        }
      });
    });
  }

  /* --------------------------------------------------- 3 · pedir ayuda */

  showHelp() {
    const text = this.hint?.() ?? '';
    this.sub.textContent = '';
    this.body.innerHTML = `
      <div class="ct-help">
        <p class="ct-help__tuerca"><span aria-hidden="true">🔩</span> <b>Tuerca:</b> ${text}</p>
        <p class="ct-stamp" role="status">${CAJA.ayuda.sello}</p>
        <button class="i3d-btn i3d-btn--primary" type="button" data-ok>Entendido</button>
      </div>`;
    this.game.audio?.play('chime', { volume: 0.4, rate: 1.1 });
    this.body.querySelector('[data-ok]').addEventListener('click', () => this.finish('ayuda', { pista: text }));
    this.body.querySelector('[data-ok]').focus({ preventScroll: true });
  }

  /* ------------------------------------------------- 4 · cambiar de plan */

  planB() {
    const text = this.onPlanB?.() ?? CAJA.planB.listo;
    this.sub.textContent = '';
    this.body.innerHTML = `
      <div class="ct-help">
        <p class="ct-help__tuerca"><span aria-hidden="true">🔄</span> ${text}</p>
        <button class="i3d-btn i3d-btn--primary" type="button" data-ok>Listo</button>
      </div>`;
    this.game.audio?.play('interact', { volume: 0.35, rate: 0.9 });
    this.body.querySelector('[data-ok]').addEventListener('click', () => this.finish('planB', {}));
    this.body.querySelector('[data-ok]').focus({ preventScroll: true });
  }

  /* ---------------------------------------------------------- cierre */

  finish(id, extra) {
    this.used.push(id);
    this.close(true);
    this.onUsed?.(id, extra);
  }

  close(used) {
    if (!this.open_) return;
    this.open_ = false;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.cleanup?.();
    this.cleanup = null;
    this.holding = false;
    const layer = this.layer;
    this.layer = null;
    layer.classList.add('is-out');
    setTimeout(() => layer.remove(), 360);
    const g = this.game;
    g.audio?.unduck();
    g.controller.frozen = false;
    if (!used) this.onClose?.();
  }

  dispose() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.cleanup?.();
    this.layer?.remove();
    this.layer = null;
    this.open_ = false;
  }
}
