// EMO-AVENTURA · cliente de Supabase (para el juego)
//
// La libreria se carga de forma DIFERIDA: el juego no paga ni un byte de
// Supabase hasta que hay un evento que enviar, y solo si esta configurado.
// Si faltan las variables, `getSupabaseAsync()` devuelve null y todo lo que
// dependa de el debe seguir funcionando igual.
//
// En el navegador solo vive la clave publica "anon", que por las reglas RLS
// unicamente puede INSERTAR eventos anonimos. La `service_role` jamas.

const URL = (import.meta.env.VITE_SUPABASE_URL ?? '').trim();
const ANON = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim();

/** Correo del unico administrador que puede entrar al panel */
/**
 * Correos que pueden entrar al panel. En VITE_ADMIN_EMAIL van uno o varios
 * separados por comas. Si se deja vacio, manda la tabla `admins` de Supabase.
 */
export const ADMIN_EMAILS = (import.meta.env.VITE_ADMIN_EMAIL ?? '')
  .split(',')
  .map((c) => c.trim().toLowerCase())
  .filter(Boolean);

/** El primero de la lista, solo para mensajes de ayuda */
export const ADMIN_EMAIL = ADMIN_EMAILS[0] ?? '';

/** ¿Estan puestas las variables? (lo usa el panel para avisar) */
export const estaConfigurado = Boolean(URL && ANON);

let promesa = null;
let cliente = null;

/**
 * Cliente compartido del juego (solo inserta eventos; nunca inicia sesion).
 * Devuelve null si no hay configuracion o si la carga falla.
 */
export async function getSupabaseAsync() {
  if (!estaConfigurado) return null;
  if (cliente) return cliente;
  if (!promesa) {
    promesa = import('@supabase/supabase-js')
      .then(({ createClient }) => {
        cliente = createClient(URL, ANON, {
          auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
        });
        return cliente;
      })
      .catch((err) => {
        if (import.meta.env.DEV) console.warn('[supabase] no se pudo cargar', err);
        return null;
      });
  }
  return promesa;
}

/** El cliente ya cargado, o null si todavia no lo esta (no dispara la carga) */
export function getSupabaseSiListo() {
  return cliente;
}

export default getSupabaseAsync;
