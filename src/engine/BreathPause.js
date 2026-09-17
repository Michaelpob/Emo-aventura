// Nucleo 3D · Espacio de respiracion guiada
// Pausa breve dentro de una isla: el juego se congela, aparece un circulo que
// se hincha al inhalar, se sostiene y se vacia al exhalar, con el sonido
// natural de cada fase. Se usa cuando la emocion sube (un susto, una
// erupcion) para volver al control antes de seguir. Se puede saltar tras el
// primer ciclo. run() devuelve una promesa que se resuelve al terminar.

const IN = 4;
const HOLD = 2;
const OUT = 5;

export class BreathPause {
  constructor(game) {
    this.game = game;
    this.active = false;
  }

  /**
   * @param {object} o
   * @param {number} [o.cycles=2]
   * @param {string} [o.title='Respira']
   * @param {string} [o.subtitle='Sigue el círculo']
   * @param {Function} [o.onProgress]   0..1 a lo largo de toda la pausa
   * @param {Function} [o.onPhase]      ('in'|'hold'|'out', ciclo) al cambiar de fase
   * @param {boolean} [o.skippable=true]
   */
  run({ cycles = 2, title = 'Respira', subtitle = 'Sigue el círculo', onProgress = null, onPhase = null, skippable = true } = {}) {
    const g = this.game;
    if (this.active) return Promise.resolve();
    this.active = true;
    return new Promise((resolve) => {
      g.controller.frozen = true;
      g.controller.exitPointerLock?.();
      g._resetStick?.();
      g.releaseButtons?.();
      g.audio?.duck(0.35);

      const layer = document.createElement('div');
      layer.className = 'bp-layer';
      layer.innerHTML = `
        <div class="bp-card" role="group" aria-label="${title}">
          <p class="bp-eyebrow">${title}</p>
          <div class="bp-circle" data-circle><span class="bp-phase" data-phase>…</span></div>
          <p class="bp-hint" data-hint>${subtitle}</p>
          <div class="bp-cycles" data-cycles>${'<i>●</i>'.repeat(cycles)}</div>
          ${skippable ? '<button class="i3d-btn bp-skip" type="button" data-skip hidden>Continuar</button>' : ''}
        </div>
      `;
      g.root.appendChild(layer);
      const circle = layer.querySelector('[data-circle]');
      const phaseEl = layer.querySelector('[data-phase]');
      const hintEl = layer.querySelector('[data-hint]');
      const dots = [...layer.querySelectorAll('[data-cycles] i')];
      const skip = layer.querySelector('[data-skip]');

      const total = cycles * (IN + HOLD + OUT);
      let t = 0;
      let last = performance.now();
      let phase = null;
      let done = false;

      const finish = () => {
        if (done) return;
        done = true;
        clearInterval(iv);
        layer.classList.add('is-out');
        setTimeout(() => layer.remove(), 420);
        g.controller.frozen = false;
        g.audio?.unduck();
        this.active = false;
        onProgress?.(1);
        resolve();
      };

      const setPhase = (p, label, hint, cycle = 0) => {
        if (p === phase) return;
        phase = p;
        onPhase?.(p, cycle);
        phaseEl.textContent = label;
        hintEl.textContent = hint;
        circle.dataset.phase = p;
        if (p === 'in') g.audio?.play('inhale', { volume: 0.5 });
        if (p === 'out') g.audio?.play('exhale', { volume: 0.5 });
      };

      const iv = setInterval(() => {
        const now = performance.now();
        const dt = Math.min(0.1, (now - last) / 1000);
        last = now;
        if (g.paused || g.finished) return;
        if (g.finished) { finish(); return; }
        t += dt;
        const cycleLen = IN + HOLD + OUT;
        const cycle = Math.min(cycles - 1, Math.floor(t / cycleLen));
        const u = t - cycle * cycleLen;
        let scale;
        if (u < IN) { setPhase('in', 'INHALA', 'toma aire por la nariz, despacio', cycle); scale = 0.55 + 0.45 * (u / IN); }
        else if (u < IN + HOLD) { setPhase('hold', 'MANTÉN', 'sostén el aire un momento', cycle); scale = 1; }
        else { setPhase('out', 'EXHALA', 'suelta el aire por la boca, largo', cycle); scale = 1 - 0.45 * ((u - IN - HOLD) / OUT); }
        circle.style.setProperty('--s', scale.toFixed(3));
        dots.forEach((d, i) => d.classList.toggle('is-on', i < cycle + (u >= cycleLen - 0.05 ? 1 : 0)));
        if (skip && cycle >= 1 && skip.hidden) skip.hidden = false;
        onProgress?.(Math.min(1, t / total));
        if (t >= total) { dots.forEach((d) => d.classList.add('is-on')); setTimeout(finish, 300); }
      }, 50);

      skip?.addEventListener('click', finish);
    });
  }
}
