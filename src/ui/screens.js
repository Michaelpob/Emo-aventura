// EMO-AVENTURA · Pantallas globales
// Mi Progreso · Final de la aventura

import { BADGES } from '../data/tools.js';
import { gameState, getProgressSummary, ISLAND_CHAIN } from '../data/gameState.js';
import { islands } from '../data/islands.js';

// nombres actuales de las islas, los mismos que ve el jugador en el mapa
const ISLAND_NAMES = Object.fromEntries(islands.map((i) => [i.id, i.displayName]));

function mountOverlay(host, html, { label = 'Pantalla' } = {}) {
  const layer = document.createElement('div');
  layer.className = 'emo-screen';
  layer.innerHTML = `
    <div class="emo-screen__card" role="dialog" aria-modal="true" aria-label="${label}">
      <button class="emo-screen__close" type="button" data-close aria-label="Cerrar">✕</button>
      ${html}
    </div>
  `;
  host.appendChild(layer);
  const close = () => {
    layer.classList.add('is-out');
    setTimeout(() => layer.remove(), 240);
    document.removeEventListener('keydown', onKey);
  };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);
  layer.querySelector('[data-close]').addEventListener('click', close);
  layer.addEventListener('click', (e) => { if (e.target === layer) close(); });
  layer.querySelector('[data-close]').focus({ preventScroll: true });
  return { layer, close };
}

/* ================================================================ PROGRESO */

export function openProgress(host) {
  const p = getProgressSummary();
  const html = `
    <header class="emo-screen__head">
      <p class="emo-screen__eyebrow">Aventura</p>
      <h2>MI PROGRESO</h2>
    </header>
    <div class="progress">
      <div class="progress__ring" style="--p:${p.percent}">
        <span>${p.percent}%</span>
      </div>
      <div class="progress__stats">
        <div class="progress__stat"><strong>${p.completed.length}/${p.total}</strong><span>islas completadas</span></div>
        <div class="progress__stat"><strong>${p.points}</strong><span>puntos emocionales</span></div>
        <div class="progress__stat"><strong>${p.badges.length}</strong><span>insignias</span></div>
      </div>

      <section class="progress__section">
        <h3>Islas</h3>
        <ul class="progress__islands">
          ${ISLAND_CHAIN.map((id) => {
            const done = gameState.completedIslands.includes(id);
            return `
              <li class="${done ? 'is-done' : 'is-open'}">
                <span aria-hidden="true">${done ? BADGES[id].icon : '🔓'}</span>
                <strong>${ISLAND_NAMES[id]}</strong>
                <em>${done ? 'Completada' : 'Disponible'}</em>
              </li>
            `;
          }).join('')}
        </ul>
      </section>

      <section class="progress__section">
        <h3>Insignias</h3>
        <div class="progress__badges">
          ${Object.values(BADGES).map((b) => `
            <div class="badge ${gameState.badges.includes(b.id) ? 'is-earned' : ''}">
              <span aria-hidden="true">${gameState.badges.includes(b.id) ? b.icon : '🔒'}</span>
              <p>${b.name}</p>
            </div>
          `).join('')}
        </div>
      </section>

      <section class="progress__section">
        <h3>Estrategias aprendidas</h3>
        ${p.strategies.length
          ? `<ul class="progress__strategies">${p.strategies.map((st) => `<li>${st}</li>`).join('')}</ul>`
          : '<p class="progress__empty">Aun no has aprendido estrategias. Empieza por la Isla del Miedo.</p>'}
      </section>

      ${p.plans.length ? `
        <section class="progress__section">
          <h3>Mi plan para manana</h3>
          <ul class="progress__strategies">
            ${p.plans.map((pl) => `<li><strong>${pl.strategy}</strong> · ${pl.action}</li>`).join('')}
          </ul>
        </section>
      ` : ''}

      ${p.reevaluations.length ? `
        <section class="progress__section">
          <h3>Tus reevaluaciones</h3>
          <ul class="progress__reevals">
            ${p.reevaluations.map((r) => `
              <li>
                <strong>${ISLAND_NAMES[r.island] ?? r.island}</strong>
                <span>${(r.initialIntensity ?? '—').toUpperCase()} → ${r.strategy || 'estrategia'} → ${(r.finalIntensity ?? '—').toUpperCase()}</span>
              </li>
            `).join('')}
          </ul>
          <p class="progress__hint">Que una intensidad baje no siempre significa ganar: a veces la emocion sigue presente y eso tambien es informacion util.</p>
        </section>
      ` : ''}
    </div>
  `;
  return mountOverlay(host, html, { label: 'Mi progreso' }).layer;
}

/* ============================================================ FINAL GENERAL */

export function openFinal(host, onClose) {
  const p = getProgressSummary();
  const html = `
    <div class="final">
      <div class="final__fireworks" aria-hidden="true">
        ${Array.from({ length: 18 }, (_, i) => `<i style="--i:${i}"></i>`).join('')}
      </div>
      <h2 class="final__title">¡HAS COMPLETADO EMO-AVENTURA!</h2>
      <p class="final__lead">Recorriste las cinco islas y aprendiste que ninguna emocion es mala: todas informan y todas se pueden regular.</p>

      <div class="final__badges">
        ${Object.values(BADGES).map((b, i) => `
          <div class="final__badge ${gameState.badges.includes(b.id) ? 'is-earned' : ''}" style="--i:${i}">
            <span aria-hidden="true">${b.icon}</span>
            <p>${b.name}</p>
          </div>
        `).join('')}
      </div>

      <div class="final__stats">
        <div><strong>${p.points}</strong><span>puntos emocionales</span></div>
        <div><strong>${p.percent}%</strong><span>progreso</span></div>
      </div>

      <p class="final__note">Regular una emocion no significa dejar de sentirla. Significa reconocerla y elegir que hacer con ella.</p>
      <button class="emo-btn emo-btn--primary" type="button" data-final-close>Volver al mapa</button>
    </div>
  `;
  const { layer, close } = mountOverlay(host, html, { label: 'Has completado Emo-Aventura' });
  layer.classList.add('emo-screen--final');
  layer.querySelector('[data-final-close]').addEventListener('click', () => {
    close();
    onClose?.();
  });
  return layer;
}
