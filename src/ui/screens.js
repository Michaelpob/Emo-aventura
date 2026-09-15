// EMO-AVENTURA · Pantallas globales
// Caja de Herramientas · Mi Progreso · Final de la aventura

import { TOOL_LIST, TOOLS, BADGES } from '../data/tools.js';
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

/* ==================================================== CAJA DE HERRAMIENTAS */

export function openToolbox(host) {
  const owned = new Set(gameState.tools);
  const html = `
    <header class="emo-screen__head">
      <p class="emo-screen__eyebrow">Mi caja</p>
      <h2>MI CAJA DE HERRAMIENTAS EMOCIONALES</h2>
      <p class="emo-screen__sub">${owned.size} de ${TOOL_LIST.length} herramientas obtenidas. Toca una para ver como se usa.</p>
    </header>
    <div class="toolbox">
      <div class="toolbox__grid" data-grid>
        ${TOOL_LIST.map((t, i) => `
          <button class="tool ${owned.has(t.id) ? '' : 'is-locked'}" type="button" data-tool="${t.id}"
                  style="--i:${i}" ${owned.has(t.id) ? '' : 'aria-label="Herramienta aun no obtenida"'}>
            <span class="tool__icon" aria-hidden="true">${owned.has(t.id) ? t.icon : '❔'}</span>
            <span class="tool__name">${owned.has(t.id) ? t.name : 'Por descubrir'}</span>
            <span class="tool__emotion">${owned.has(t.id) ? t.emotion : ''}</span>
            ${owned.has(t.id) ? `<span class="tool__order">#${[...owned].indexOf(t.id) + 1}</span>` : ''}
          </button>
        `).join('')}
      </div>
      <aside class="toolbox__detail" data-detail aria-live="polite">
        <p class="toolbox__empty">Selecciona una herramienta para leer su descripcion.</p>
      </aside>
    </div>
  `;
  const { layer } = mountOverlay(host, html, { label: 'Mi caja de herramientas emocionales' });
  const detail = layer.querySelector('[data-detail]');

  layer.querySelectorAll('[data-tool]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const tool = TOOLS[btn.dataset.tool];
      layer.querySelectorAll('[data-tool]').forEach((b) => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      if (!owned.has(tool.id)) {
        detail.innerHTML = `
          <div class="toolbox__card">
            <div class="toolbox__icon" aria-hidden="true">❔</div>
            <h3>Herramienta por descubrir</h3>
            <p>La obtendras practicando en la isla correspondiente (${tool.emotion}).</p>
          </div>
        `;
        return;
      }
      detail.innerHTML = `
        <div class="toolbox__card">
          <div class="toolbox__icon" aria-hidden="true">${tool.icon}</div>
          <h3>${tool.name}</h3>
          <p class="toolbox__meta">${tool.emotion} · ${tool.strategy}</p>
          <p>${tool.description}</p>
          <p class="toolbox__order">Obtenida en el lugar ${[...gameState.tools].indexOf(tool.id) + 1} de tu recorrido.</p>
        </div>
      `;
    });
  });

  return layer;
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
        <div class="progress__stat"><strong>${p.tools.length}</strong><span>herramientas</span></div>
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
      <p class="final__lead">Recorriste las cuatro islas y aprendiste que ninguna emocion es mala: todas informan y todas se pueden regular.</p>

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
        <div><strong>${p.tools.length}</strong><span>herramientas</span></div>
        <div><strong>${p.percent}%</strong><span>progreso</span></div>
      </div>

      <div class="final__tools">
        ${p.tools.map((t, i) => `<span class="final__tool" style="--i:${i}" title="${t.name}">${t.icon}</span>`).join('')}
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
