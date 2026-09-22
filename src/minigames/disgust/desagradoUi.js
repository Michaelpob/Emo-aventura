// ISLA DEL DESAGRADO · utilidades de interfaz compartidas por los dos niveles
// - guia: una sola linea abajo que dice que hacer y muestra el resultado
// - anclas: elementos DOM (etiquetas, botones) pegados a un punto de la escena
// - escapar / ndcDe: ayudantes pequenos

import * as THREE from 'three';

export function escapar(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/** Coordenadas NDC de un evento de puntero sobre un canvas */
export function ndcDe(e, canvas, out) {
  const r = canvas.getBoundingClientRect();
  out.x = ((e.clientX - r.left) / r.width) * 2 - 1;
  out.y = -((e.clientY - r.top) / r.height) * 2 + 1;
  return out;
}

/** Punto de pantalla (px, relativo al canvas) de una posicion del mundo */
export function aPantalla(game, pos, out = { x: 0, y: 0 }) {
  const v = _v.copy(pos).project(game.camera);
  const r = game.renderer.domElement.getBoundingClientRect();
  out.x = (v.x * 0.5 + 0.5) * r.width;
  out.y = (-v.y * 0.5 + 0.5) * r.height;
  out.detras = v.z > 1;
  return out;
}
const _v = new THREE.Vector3();

/**
 * Linea de guia: el UNICO texto fijo. `guiar` fija la instruccion; `avisar`
 * muestra un resultado breve y vuelve sola a la instruccion.
 */
export function crearGuia(game) {
  const el = document.createElement('div');
  el.className = 'dc-guia';
  el.hidden = true;
  el.setAttribute('aria-live', 'polite');
  el.innerHTML = '<span class="dc-guia__icono" aria-hidden="true"></span><span class="dc-guia__texto"></span>';
  game.el.hud.appendChild(el);
  const icono = el.querySelector('.dc-guia__icono');
  const texto = el.querySelector('.dc-guia__texto');
  const ICONOS = { ok: '✅', info: '💬', nota: '🪞' };
  let base = { texto: '', icono: '' };
  let timer = null;
  let boton = null;
  const pintar = (t, i, tipo) => {
    icono.textContent = i;
    texto.innerHTML = t;
    el.className = `dc-guia${tipo ? ` dc-guia--${tipo}` : ''}`;
    el.classList.remove('is-pop');
    void el.offsetWidth;
    el.classList.add('is-pop');
    el.hidden = !t;
    if (boton) el.appendChild(boton);
  };
  return {
    el,
    guiar(t, i = '👉') { base = { texto: t, icono: i }; if (!timer) pintar(t, i, ''); },
    avisar(t, tipo = 'ok', ms = 2600) {
      if (timer) clearTimeout(timer);
      pintar(t, ICONOS[tipo] ?? '💬', tipo);
      timer = setTimeout(() => { timer = null; pintar(base.texto, base.icono, ''); }, ms);
    },
    boton(t, fn, clase = '') {
      this.sinBoton();
      if (!t) return null;
      boton = document.createElement('button');
      boton.type = 'button';
      boton.className = `dc-guia__btn ${clase}`.trim();
      boton.textContent = t;
      boton.addEventListener('click', fn);
      el.appendChild(boton);
      return boton;
    },
    sinBoton() { boton?.remove(); boton = null; },
    ocultar() { el.hidden = true; },
    mostrar() { el.hidden = !(base.texto || timer); },
    dispose() { if (timer) clearTimeout(timer); el.remove(); }
  };
}

/**
 * Anclas: nodos DOM que siguen a un punto de la escena (etiquetas y botones
 * sobre totems, entradas, fragmentos). `poner(id, el, pos)`; `update()` cada frame.
 */
export function crearAnclas(game, contenedor) {
  const lista = new Map();
  const p = { x: 0, y: 0 };
  return {
    poner(id, el, pos, { desplazaY = 0 } = {}) {
      this.quitar(id);
      contenedor.appendChild(el);
      lista.set(id, { el, pos: pos.clone(), desplazaY });
      return el;
    },
    mover(id, pos) { const a = lista.get(id); if (a) a.pos.copy(pos); },
    get(id) { return lista.get(id)?.el ?? null; },
    quitar(id) { const a = lista.get(id); if (a) { a.el.remove(); lista.delete(id); } },
    limpiar() { for (const id of [...lista.keys()]) this.quitar(id); },
    update() {
      if (!game.renderer) return;
      for (const a of lista.values()) {
        aPantalla(game, a.pos, p);
        a.el.style.transform = `translate(${p.x}px, ${p.y + a.desplazaY}px) translate(-50%, -50%)`;
        a.el.style.visibility = p.detras ? 'hidden' : '';
      }
    },
    dispose() { this.limpiar(); }
  };
}

/** Lectura en voz alta opcional (solo cuando el jugador pulsa el boton) */
export function leerEnVozAlta(texto) {
  try {
    const synth = window.speechSynthesis;
    if (!synth) return false;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(String(texto).replace(/<[^>]+>/g, ' '));
    u.lang = 'es-ES';
    u.rate = 0.98;
    const voces = synth.getVoices();
    const es = voces.find((v) => /^es/i.test(v.lang));
    if (es) u.voice = es;
    synth.speak(u);
    return true;
  } catch { return false; }
}

export function callarVoz() {
  try { window.speechSynthesis?.cancel(); } catch { /* sin voz */ }
}
