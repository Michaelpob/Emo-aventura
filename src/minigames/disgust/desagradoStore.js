// ISLA DEL DESAGRADO · respuestas del jugador en localStorage
// Clave unica "emoaventura.desagrado". Se usan luego en el resumen de cada
// nivel y en el cierre de la isla. Nada de aqui resta puntos ni bloquea.

export const CLAVE = 'emoaventura.desagrado';

function base() {
  return {
    cuevas: { respuestas: [], completadas: [], resumen: null, terminado: false },
    espejo: { rondas: [], confusiones: {}, aciertos: 0, total: 0, terminado: false }
  };
}

export function leerDesagrado() {
  try {
    const raw = window.localStorage.getItem(CLAVE);
    if (!raw) return base();
    const datos = JSON.parse(raw);
    const b = base();
    return {
      cuevas: { ...b.cuevas, ...(datos.cuevas ?? {}) },
      espejo: { ...b.espejo, ...(datos.espejo ?? {}) }
    };
  } catch {
    return base();
  }
}

export function guardarDesagrado(datos) {
  try {
    window.localStorage.setItem(CLAVE, JSON.stringify(datos));
  } catch (err) {
    console.warn('[desagrado] no se pudo guardar', err);
  }
  return datos;
}

/* ------------------------------------------------------------- nivel 1 */

/** Registra la respuesta a un elemento: { cueva, elemento, sentido, respuesta } */
export function registrarRespuesta({ cueva, elemento, sentido, respuesta }) {
  const d = leerDesagrado();
  // si el jugador repite una cueva, la respuesta nueva sustituye a la vieja
  d.cuevas.respuestas = d.cuevas.respuestas.filter((r) => !(r.cueva === cueva && r.elemento === elemento));
  d.cuevas.respuestas.push({ cueva, elemento, sentido, respuesta, at: Date.now() });
  return guardarDesagrado(d);
}

export function marcarCuevaCompletada(cueva) {
  const d = leerDesagrado();
  if (!d.cuevas.completadas.includes(cueva)) d.cuevas.completadas.push(cueva);
  return guardarDesagrado(d);
}

/** Cuenta desagrado / indiferente / agrado (total y por cueva) */
export function resumenCuevas(datos = leerDesagrado()) {
  const r = { total: 0, desagrado: 0, indiferente: 0, agrado: 0, porCueva: {} };
  for (const x of datos.cuevas.respuestas) {
    r.total += 1;
    r[x.respuesta] = (r[x.respuesta] ?? 0) + 1;
    const c = r.porCueva[x.cueva] ?? (r.porCueva[x.cueva] = { total: 0, desagrado: 0, indiferente: 0, agrado: 0 });
    c.total += 1;
    c[x.respuesta] = (c[x.respuesta] ?? 0) + 1;
  }
  return r;
}

export function terminarCuevas() {
  const d = leerDesagrado();
  d.cuevas.resumen = resumenCuevas(d);
  d.cuevas.terminado = true;
  return guardarDesagrado(d);
}

/** Empezar el nivel 1 de cero (reiniciar desde la pausa) */
export function reiniciarCuevas() {
  const d = leerDesagrado();
  d.cuevas = base().cuevas;
  return guardarDesagrado(d);
}

/* ------------------------------------------------------------- nivel 2 */

/** Registra una ronda: { escena, seleccionadas, aciertos, fallos, confusiones } */
export function registrarRonda(ronda) {
  const d = leerDesagrado();
  d.espejo.rondas = d.espejo.rondas.filter((r) => r.escena !== ronda.escena);
  d.espejo.rondas.push({ ...ronda, at: Date.now() });
  d.espejo.confusiones = {};
  d.espejo.aciertos = 0;
  d.espejo.total = 0;
  for (const r of d.espejo.rondas) {
    d.espejo.aciertos += r.aciertos;
    d.espejo.total += r.total;
    for (const [emocion, n] of Object.entries(r.confusiones ?? {})) d.espejo.confusiones[emocion] = (d.espejo.confusiones[emocion] ?? 0) + n;
  }
  return guardarDesagrado(d);
}

export function terminarEspejo() {
  const d = leerDesagrado();
  d.espejo.terminado = true;
  return guardarDesagrado(d);
}

export function reiniciarEspejo() {
  const d = leerDesagrado();
  d.espejo = base().espejo;
  return guardarDesagrado(d);
}

/** Emociones con las que mas se confundio el desagrado, de mayor a menor */
export function confusionesOrdenadas(datos = leerDesagrado()) {
  return Object.entries(datos.espejo.confusiones ?? {}).sort((a, b) => b[1] - a[1]);
}
