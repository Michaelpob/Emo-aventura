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
export function crearGuia(game, onCambio = null) {
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
    onCambio?.();                       // el juego reencuadra: la guia nunca tapa
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
    ocultar() { el.hidden = true; onCambio?.(); },
    mostrar() { el.hidden = !(base.texto || timer); onCambio?.(); },
    dispose() { if (timer) clearTimeout(timer); el.remove(); }
  };
}

/**
 * Anclas: nodos DOM que siguen a un punto de la escena (etiquetas y botones
 * sobre totems, entradas, fragmentos). `poner(id, el, pos)`; `update()` cada frame.
 */
export function crearAnclas(game, contenedor, zonaSegura = null) {
  const lista = new Map();
  const p = { x: 0, y: 0 };
  return {
    poner(id, el, pos, { desplazaY = 0, fijo = null } = {}) {
      this.quitar(id);
      contenedor.appendChild(el);
      // `fijo` = { fx, fy } en fracciones de la zona libre: la etiqueta se
      // coloca en rejilla en vez de seguir al objeto (pantallas muy bajas)
      lista.set(id, { el, pos: pos.clone(), desplazaY, fijo });
      return el;
    },
    mover(id, pos) { const a = lista.get(id); if (a) a.pos.copy(pos); },
    get(id) { return lista.get(id)?.el ?? null; },
    quitar(id) { const a = lista.get(id); if (a) { a.el.remove(); lista.delete(id); } },
    limpiar() { for (const id of [...lista.keys()]) this.quitar(id); },
    update() {
      if (!game.renderer) return;
      const r = game.renderer.domElement.getBoundingClientRect();
      // franjas ocupadas por los carteles: ninguna etiqueta entra ahi ni se
      // sale de la pantalla (clave en un movil tumbado)
      const z = zonaSegura?.() ?? { arriba: 0, abajo: 0 };
      for (const a of lista.values()) {
        aPantalla(game, a.pos, p);
        const arriba = z.arriba ?? 0;
        const abajo = z.abajo ?? 0;
        let x = a.fijo ? a.fijo.fx * r.width : p.x;
        let y = a.fijo ? arriba + a.fijo.fy * Math.max(0, r.height - arriba - abajo) : p.y + a.desplazaY;
        const w2 = a.el.offsetWidth / 2;
        const h2 = a.el.offsetHeight / 2;
        x = Math.max(w2 + 4, Math.min(r.width - w2 - 4, x));
        const minY = (z.arriba ?? 0) + h2 + 4;
        const maxY = r.height - (z.abajo ?? 0) - h2 - 4;
        y = maxY > minY ? Math.max(minY, Math.min(maxY, y)) : (minY + maxY) / 2;
        a.el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
        a.el.style.visibility = p.detras ? 'hidden' : '';
      }
    },
    dispose() { this.limpiar(); }
  };
}

/**
 * Encuadre con franjas reservadas arriba y abajo: la escena 3D se dibuja solo
 * en el hueco libre entre los carteles del HUD, asi que en un movil tumbado
 * (poca altura) los totems y los fragmentos no quedan nunca debajo de la guia.
 * `arriba` y `abajo` son alturas en pixeles de pantalla.
 */
export function encuadrar(game, arriba = 0, abajo = 0) {
  if (!game.renderer || !game.camera) return;
  const r = game.renderer.domElement.getBoundingClientRect();
  const w = Math.max(1, Math.round(r.width));
  const h = Math.max(1, Math.round(r.height));
  const a = Math.max(0, Math.min(Math.round(arriba), Math.round(h * 0.35)));
  const b = Math.max(0, Math.min(Math.round(abajo), Math.round(h * 0.35)));
  const alto = h + a + b;
  game.camera.aspect = w / alto;
  if (a || b) game.camera.setViewOffset(w, alto, 0, b, w, h);
  else game.camera.clearViewOffset();
  game.camera.updateProjectionMatrix();
}

/** Alto en pixeles de un elemento del HUD visible (0 si esta oculto) */
export function altoDe(el, extra = 10) {
  if (!el || el.hidden || !el.isConnected) return 0;
  const r = el.getBoundingClientRect();
  return r.height ? r.height + extra : 0;
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
