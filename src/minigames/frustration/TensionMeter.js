// ISLA DE LA FRUSTRACION · Medidor de tension / presion
// Un manometro de vapor (0..100) reutilizado por los dos mini-juegos: la
// Maquina Terca lo llama tension y el Volcan, presion. Lleva la cuenta de lo
// que sube y baja, el maximo y el promedio (para el feedback final) y avisa
// al juego cuando cambia de banda (0-30 · 31-60 · 61-90 · 91-100) o llega a
// 100. El feedback de cada banda (vibracion, vapor, latido, vineta) lo pone
// cada juego: aqui solo el dial.
//
// Intencion pedagogica: el medidor se ve siempre, se entiende sin leer y
// enseña a mirar las señales del cuerpo ANTES del bloqueo.

const BANDS = [
  { id: 'calma', max: 30 },
  { id: 'sube', max: 60 },
  { id: 'alta', max: 90 },
  { id: 'tope', max: 100 }
];

export const bandOf = (v) => BANDS.find((b) => v <= b.max)?.id ?? 'tope';

export class TensionMeter {
  /**
   * @param {object} o
   * @param {HTMLElement} o.host        donde se pinta (HUD del juego)
   * @param {string} [o.label]          'Tensión' | 'Presión'
   * @param {string} [o.icon]
   * @param {Function} [o.onBand]       (banda, valor) al cambiar de banda
   * @param {Function} [o.onMax]        al llegar a 100 (una vez por subida)
   * @param {Function} [o.onChange]     (valor, delta, motivo) en cada cambio
   */
  constructor({ host, label = 'Tensión', icon = '🔧', onBand = null, onMax = null, onChange = null }) {
    this.value = 0;
    this.shown = 0;
    this.max = 0;
    this.band = 'calma';
    this.onBand = onBand;
    this.onMax = onMax;
    this.onChange = onChange;
    this.armed = true;             // onMax se dispara una vez hasta bajar del 90
    this.samples = 0;
    this.sum = 0;
    this.log = [];                 // { at, delta, motivo }
    this.time = 0;

    this.el = document.createElement('div');
    this.el.className = 'tm';
    this.el.setAttribute('role', 'meter');
    this.el.setAttribute('aria-label', label);
    this.el.setAttribute('aria-valuemin', '0');
    this.el.setAttribute('aria-valuemax', '100');
    this.el.innerHTML = `
      <svg class="tm__dial" viewBox="0 0 120 80" aria-hidden="true">
        <path class="tm__arc tm__arc--bg" d="M14 66 A 46 46 0 0 1 106 66" />
        <path class="tm__arc tm__arc--calma" d="M14 66 A 46 46 0 0 1 29.8 33.7" />
        <path class="tm__arc tm__arc--sube" d="M29.8 33.7 A 46 46 0 0 1 60 20" />
        <path class="tm__arc tm__arc--alta" d="M60 20 A 46 46 0 0 1 96.5 40.6" />
        <path class="tm__arc tm__arc--tope" d="M96.5 40.6 A 46 46 0 0 1 106 66" />
        <g class="tm__needle" data-needle>
          <line x1="60" y1="66" x2="60" y2="26" />
          <circle cx="60" cy="66" r="5" />
        </g>
      </svg>
      <div class="tm__label"><span class="tm__icon" aria-hidden="true">${icon}</span><b data-value>0</b><small>${label}</small></div>
    `;
    host.appendChild(this.el);
    this.needle = this.el.querySelector('[data-needle]');
    this.valueEl = this.el.querySelector('[data-value]');
    this.render(true);
  }

  /** Sube o baja (con motivo, para la sesion). Devuelve el valor nuevo. */
  add(delta, motivo = '') {
    if (!delta) return this.value;
    return this.set(this.value + delta, motivo, delta);
  }

  set(v, motivo = '', delta = null) {
    const prev = this.value;
    this.value = Math.max(0, Math.min(100, v));
    const d = delta ?? this.value - prev;
    if (Math.abs(d) >= 1 && motivo) this.log.push({ at: +this.time.toFixed(1), delta: Math.round(d), motivo });
    this.max = Math.max(this.max, this.value);
    this.el.setAttribute('aria-valuenow', String(Math.round(this.value)));
    const band = bandOf(this.value);
    if (band !== this.band) {
      this.band = band;
      this.el.dataset.band = band;
      this.onBand?.(band, this.value);
    }
    if (this.value >= 100 && this.armed) {
      this.armed = false;
      this.onMax?.();
    } else if (this.value < 90) {
      this.armed = true;
    }
    this.onChange?.(this.value, d, motivo);
    return this.value;
  }

  /** Muestra de tiempo: promedio ponderado y aguja suave */
  update(dt) {
    this.time += dt;
    this.sum += this.value * dt;
    this.samples += dt;
    this.render();
  }

  render(force = false) {
    const target = this.value;
    if (!force && Math.abs(target - this.shown) < 0.2) return;
    this.shown = force ? target : this.shown + (target - this.shown) * 0.18;
    // 0 → -90° (izquierda) · 100 → +90° (derecha)
    const ang = -90 + (this.shown / 100) * 180;
    this.needle.style.transform = `rotate(${ang.toFixed(1)}deg)`;
    const n = Math.round(this.shown);
    if (this.valueEl.textContent !== String(n)) this.valueEl.textContent = String(n);
  }

  get average() { return this.samples > 0 ? Math.round(this.sum / this.samples) : 0; }

  /** Resumen para el JSON de sesion */
  stats() {
    return { maximo: Math.round(this.max), promedio: this.average, registro: this.log.slice(-60) };
  }

  reset() {
    this.value = 0;
    this.shown = 0;
    this.max = 0;
    this.sum = 0;
    this.samples = 0;
    this.log.length = 0;
    this.armed = true;
    this.band = 'calma';
    this.el.dataset.band = 'calma';
    this.render(true);
  }

  show(on) { this.el.hidden = !on; }

  dispose() { this.el.remove(); }
}
