// PANEL DE ADMINISTRACION · acceso del administrador
//
// Un unico administrador (VITE_ADMIN_EMAIL). Dos caminos:
//   A. Primera vez / olvido: codigo de 6 digitos al correo -> crear contrasena.
//   B. Entradas siguientes: usuario y contrasena.
//
// Nada sensible se guarda aqui: las contrasenas las cifra Supabase. En el
// navegador solo queda la sesion que crea el propio cliente de Supabase.

import { createClient } from '@supabase/supabase-js';
import { ADMIN_EMAIL, estaConfigurado } from '../services/supabaseClient.js';  // solo constantes

const URL = (import.meta.env.VITE_SUPABASE_URL ?? '').trim();
const ANON = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim();

const MAX_INTENTOS = 5;
const BLOQUEO_MS = 2 * 60 * 1000;          // 2 minutos tras 5 fallos
export const INACTIVIDAD_MS = 30 * 60 * 1000;  // cierre automatico

let cliente = null;
let intentos = 0;
let bloqueadoHasta = 0;

/** Cliente con la persistencia que pida la casilla «mantener sesion» */
export function crearCliente({ recordar = true } = {}) {
  if (!estaConfigurado) return null;
  cliente = createClient(URL, ANON, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      storage: recordar ? window.localStorage : window.sessionStorage,
      storageKey: 'emoaventura.admin.auth'
    }
  });
  return cliente;
}

export function getCliente() {
  return cliente ?? crearCliente({ recordar: true });
}

/* --------------------------------------------------------- utilidades */

export function normalizarUsuario(valor) {
  const v = String(valor ?? '').trim().toLowerCase();
  if (!v) return '';
  if (v === 'admin' || v === 'administrador') return ADMIN_EMAIL;
  return v;
}

export function esElAdministrador(correo) {
  return Boolean(correo) && String(correo).trim().toLowerCase() === ADMIN_EMAIL;
}

export function segundosDeBloqueo() {
  const restan = bloqueadoHasta - Date.now();
  return restan > 0 ? Math.ceil(restan / 1000) : 0;
}

function sumarFallo() {
  intentos += 1;
  if (intentos >= MAX_INTENTOS) {
    bloqueadoHasta = Date.now() + BLOQUEO_MS;
    intentos = 0;
  }
}

/** Fuerza de la contrasena: 0 floja · 1 justa · 2 buena · 3 fuerte */
export function fuerzaDeClave(clave) {
  const c = String(clave ?? '');
  if (c.length < 10) return 0;
  let puntos = 1;
  if (/[a-zA-Z]/.test(c) && /\d/.test(c)) puntos += 1;
  if (c.length >= 14 && /[^a-zA-Z0-9]/.test(c)) puntos += 1;
  return Math.min(3, puntos);
}

export function claveValida(clave) {
  const c = String(clave ?? '');
  return c.length >= 10 && /[a-zA-Z]/.test(c) && /\d/.test(c);
}

/* ------------------------------------------------------------- sesion */

export async function sesionActual() {
  const sb = getCliente();
  if (!sb) return null;
  try {
    const { data } = await sb.auth.getSession();
    const correo = data?.session?.user?.email ?? null;
    if (!correo) return null;
    if (!esElAdministrador(correo)) {        // otra cuenta: fuera
      await sb.auth.signOut();
      return null;
    }
    return data.session;
  } catch {
    return null;
  }
}

/** B. Entrar con usuario y contrasena */
export async function entrarConClave(usuario, clave, recordar) {
  if (segundosDeBloqueo() > 0) {
    return { ok: false, mensaje: `Demasiados intentos. Vuelve a probar en ${segundosDeBloqueo()} s.` };
  }
  const correo = normalizarUsuario(usuario);
  if (!esElAdministrador(correo)) {
    sumarFallo();
    return { ok: false, mensaje: 'Usuario o contraseña incorrectos.' };
  }
  const sb = crearCliente({ recordar });
  if (!sb) return { ok: false, mensaje: 'El panel no está configurado todavía.' };
  try {
    const { data, error } = await sb.auth.signInWithPassword({ email: correo, password: clave });
    if (error || !data?.session) {
      sumarFallo();
      return { ok: false, mensaje: 'Usuario o contraseña incorrectos.' };
    }
    if (!esElAdministrador(data.session.user?.email)) {
      await sb.auth.signOut();
      return { ok: false, mensaje: 'Acceso no autorizado.' };
    }
    intentos = 0;
    return { ok: true };
  } catch {
    return { ok: false, mensaje: 'No se pudo conectar. Revisa tu conexión e inténtalo otra vez.' };
  }
}

/** A1. Pedir el codigo de 6 digitos al correo del administrador */
export async function pedirCodigo() {
  const sb = getCliente();
  if (!sb) return { ok: false, mensaje: 'El panel no está configurado todavía.' };
  try {
    const { error } = await sb.auth.signInWithOtp({
      email: ADMIN_EMAIL,
      options: { shouldCreateUser: false }
    });
    if (error) {
      const txt = String(error.message ?? '').toLowerCase();
      if (txt.includes('rate') || txt.includes('seconds')) {
        return { ok: false, mensaje: 'Se han pedido muchos códigos seguidos. Espera un minuto y vuelve a intentarlo.' };
      }
      return { ok: false, mensaje: 'No se pudo enviar el código. Revisa la configuración de correo en Supabase.' };
    }
    return { ok: true };
  } catch {
    return { ok: false, mensaje: 'No se pudo conectar. Revisa tu conexión e inténtalo otra vez.' };
  }
}

/** A2. Comprobar el codigo recibido */
export async function verificarCodigo(codigo) {
  const sb = getCliente();
  if (!sb) return { ok: false, mensaje: 'El panel no está configurado todavía.' };
  const token = String(codigo ?? '').replace(/\D/g, '');
  if (token.length !== 6) return { ok: false, mensaje: 'El código tiene 6 dígitos.' };
  try {
    const { data, error } = await sb.auth.verifyOtp({ email: ADMIN_EMAIL, token, type: 'email' });
    if (error || !data?.session) {
      const txt = String(error?.message ?? '').toLowerCase();
      if (txt.includes('expired')) return { ok: false, mensaje: 'El código ya venció. Pide uno nuevo.' };
      return { ok: false, mensaje: 'El código no es correcto. Revísalo o pide uno nuevo.' };
    }
    return { ok: true };
  } catch {
    return { ok: false, mensaje: 'No se pudo comprobar el código. Inténtalo otra vez.' };
  }
}

/** A3. Guardar la contrasena nueva (ya con sesion abierta por el codigo) */
export async function guardarClave(clave) {
  const sb = getCliente();
  if (!sb) return { ok: false, mensaje: 'El panel no está configurado todavía.' };
  if (!claveValida(clave)) {
    return { ok: false, mensaje: 'La contraseña necesita 10 caracteres como mínimo, con al menos una letra y un número.' };
  }
  try {
    const { error } = await sb.auth.updateUser({ password: clave });
    if (error) return { ok: false, mensaje: 'No se pudo guardar la contraseña. Inténtalo otra vez.' };
    return { ok: true };
  } catch {
    return { ok: false, mensaje: 'No se pudo conectar. Inténtalo otra vez.' };
  }
}

export async function cerrarSesion() {
  try { await getCliente()?.auth.signOut(); } catch { /* ya estaba cerrada */ }
}
