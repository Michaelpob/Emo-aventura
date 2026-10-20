// EMO-AVENTURA · estadisticas anonimas de uso
//
// Que se envia: isla, tipo de evento, minijuego, duracion, tipo de dispositivo
// y un identificador de sesion aleatorio que se genera en cada pestana.
// Que NO se envia: nombre, avatar, color favorito, respuestas de la Isla del
// Desagrado ni ningun otro dato del jugador. Nada identifica a una persona.
//
// Reglas de oro:
//   1. El juego NUNCA espera a la red: todo va sin `await` y dentro de try/catch.
//   2. Si Supabase no esta configurado o falla, el jugador no se entera.
//   3. Sin internet, los eventos esperan en localStorage y se reenvian luego.

import { islands } from '../data/islands.js';
import { getSupabaseAsync, estaConfigurado } from './supabaseClient.js';

const TABLA = 'island_events';
const CLAVE_SESION = 'emoaventura.sessionId';
const CLAVE_PENDIENTES = 'emoaventura.pendingEvents';
const MAX_PENDIENTES = 50;
const ANTIRREBOTE_MS = 30_000;        // misma isla, misma sesion: una visita cada 30 s
const MAX_DURACION_MS = 4 * 60 * 60 * 1000;

const ISLAS = new Set(islands.map((i) => i.id));
const TIPOS = new Set(['island_view', 'game_start', 'game_complete', 'game_exit']);

/* ------------------------------------------------------------- apagado */

function pidePararPorUrl() {
  try {
    return new URLSearchParams(window.location.search).get('notrack') === '1';
  } catch {
    return false;
  }
}

/** En desarrollo no se registra nada salvo que se pida con VITE_TRACK_DEV=true */
const PERMITIDO_EN_DEV = String(import.meta.env.VITE_TRACK_DEV ?? '').toLowerCase() === 'true';

let apagado = null;
function estaApagado() {
  if (apagado === null) apagado = pidePararPorUrl() || (import.meta.env.DEV && !PERMITIDO_EN_DEV);
  return apagado || !estaConfigurado;
}

/* ------------------------------------------------------------- sesion */

/** Una sesion = una pestana abierta. Sin cookies, sin seguimiento entre visitas. */
function getSessionId() {
  try {
    let id = window.sessionStorage.getItem(CLAVE_SESION);
    if (!id) {
      id = crypto.randomUUID();
      window.sessionStorage.setItem(CLAVE_SESION, id);
    }
    return id;
  } catch {
    // sin sessionStorage (modo privado antiguo): uno en memoria
    if (!getSessionId._memoria) getSessionId._memoria = crypto.randomUUID();
    return getSessionId._memoria;
  }
}

/* ---------------------------------------------------------- dispositivo */

function getDevice() {
  try {
    const ancho = window.innerWidth || screen.width || 1024;
    const grueso = window.matchMedia?.('(pointer: coarse)').matches ?? false;
    if (ancho < 768) return 'mobile';
    if (ancho < 1200 && grueso) return 'tablet';
    return 'desktop';
  } catch {
    return 'desktop';
  }
}

/* ------------------------------------------------------------ pendientes */

function leerPendientes() {
  try {
    const raw = window.localStorage.getItem(CLAVE_PENDIENTES);
    const lista = raw ? JSON.parse(raw) : [];
    return Array.isArray(lista) ? lista : [];
  } catch {
    return [];
  }
}

function guardarPendientes(lista) {
  try {
    window.localStorage.setItem(CLAVE_PENDIENTES, JSON.stringify(lista.slice(-MAX_PENDIENTES)));
  } catch { /* almacenamiento lleno o bloqueado: se descartan */ }
}

function encolar(fila) {
  const lista = leerPendientes();
  lista.push(fila);
  guardarPendientes(lista);
}

/** Reenvia lo que quedo pendiente. Silencioso: si falla, se queda para la proxima. */
export async function enviarPendientes() {
  if (estaApagado()) return;
  const lista = leerPendientes();
  if (!lista.length) return;
  const sb = await getSupabaseAsync();
  if (!sb) return;
  try {
    const { error } = await sb.from(TABLA).insert(lista);
    if (!error) guardarPendientes([]);
  } catch { /* sigue sin conexion: se reintenta mas tarde */ }
}

/* -------------------------------------------------------------- registro */

const ultimaVista = new Map();        // islandId -> marca de tiempo

/**
 * Registra un evento anonimo. No devuelve promesa que el juego deba esperar.
 *
 * @param {string} islandId  uno de los seis ids de islands.js
 * @param {string} eventType island_view | game_start | game_complete | game_exit
 * @param {{minigame?: string, durationMs?: number}} extra
 */
export function trackEvent(islandId, eventType, extra = {}) {
  try {
    if (estaApagado()) return;
    if (!ISLAS.has(islandId) || !TIPOS.has(eventType)) return;

    // misma isla dos veces seguidas en menos de 30 s: una sola visita
    if (eventType === 'island_view') {
      const ahora = Date.now();
      const previa = ultimaVista.get(islandId) ?? 0;
      if (ahora - previa < ANTIRREBOTE_MS) return;
      ultimaVista.set(islandId, ahora);
    }

    const duracion = Number(extra.durationMs);
    const fila = {
      island_id: islandId,
      event_type: eventType,
      minigame: extra.minigame ? String(extra.minigame).slice(0, 60) : null,
      session_id: getSessionId(),
      duration_ms: Number.isFinite(duracion) && duracion >= 0
        ? Math.min(Math.round(duracion), MAX_DURACION_MS)
        : null,
      device: getDevice()
    };

    // sin await en el flujo del juego: la carga de la libreria y el envio
    // ocurren en segundo plano, y cualquier fallo deja el evento en la cola
    enviar(fila);
  } catch { /* nunca se le muestra un error al jugador */ }
}

/** Envia una fila en segundo plano; si algo falla, queda pendiente */
async function enviar(fila) {
  try {
    const sb = await getSupabaseAsync();
    if (!sb) { encolar(fila); return; }
    const { error } = await sb.from(TABLA).insert(fila);
    if (error) encolar(fila);
  } catch {
    encolar(fila);
  }
}

/* ------------------------------------------------------- arranque */

let iniciado = false;

/** Lo llama main.js al cargar: reenvia lo pendiente y escucha la reconexion. */
export function iniciarTracking() {
  if (iniciado || estaApagado()) return;
  iniciado = true;
  try {
    window.addEventListener('online', () => { enviarPendientes(); });
    // al cargar la pagina, lo que quedo de una visita anterior
    if (navigator.onLine !== false) enviarPendientes();
  } catch { /* entorno sin window: nada que hacer */ }
}

export default trackEvent;
