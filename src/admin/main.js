// PANEL DE ADMINISTRACION · punto de entrada
//
// Pagina aparte del juego: no carga Three.js ni ningun minijuego.
// Flujo: sin configurar -> inicio de sesion -> tablero.

import './admin.css';
import { islands } from '../data/islands.js';
import { ADMIN_EMAIL, estaConfigurado } from '../services/supabaseClient.js';
import {
  crearCliente, getCliente, sesionActual, entrarConClave, pedirCodigo,
  verificarCodigo, guardarClave, cerrarSesion, claveValida, fuerzaDeClave,
  segundosDeBloqueo, INACTIVIDAD_MS
} from './auth.js';
import {
  PERIODOS, calcularPeriodo, cargarDatos, pintarTablero, pintarEsqueleto,
  pintarError, destruirGraficas
} from './dashboard.js';

const raiz = document.querySelector('#admin');
const EMOJIS = islands.map((i) => i.emoji ?? '').join(' ');

let periodoActual = '7d';
let rango = { desde: '', hasta: '' };
let ultimaCarga = 0;
let relojActualizado = null;
let temporizadorInactividad = null;

/* ------------------------------------------------------------ plantillas */

const nubes = '<div class="ad-nubes" aria-hidden="true"><i></i><i></i><i></i></div>';

function marco(contenido) {
  raiz.innerHTML = `${nubes}<div class="ad-app">${contenido}</div>`;
}

function tarjetaLogin(cuerpo) {
  marco(`
    <div class="ad-login">
      <section class="ad-login__card">
        <div class="ad-sello" aria-hidden="true">EA</div>
        <p class="eyebrow">EMO-AVENTURA</p>
        <h1>Panel de administración</h1>
        <div class="ad-login__islas" aria-hidden="true">${EMOJIS}</div>
        ${cuerpo}
        <div class="ad-enlaces">
          <a href="./index.html">← Volver al juego</a>
        </div>
      </section>
    </div>`);
}

function aviso(el, texto, tipo = 'error') {
  if (!el) return;
  el.className = `ad-aviso ad-aviso--${tipo}`;
  el.textContent = texto ?? '';
}

/* ------------------------------------------------------- sin configurar */

function pantallaSinConfigurar() {
  tarjetaLogin(`
    <div class="ad-sinconfig">
      <p class="ad-login__sub">El panel todavía no está conectado a su base de datos.
        Falta crear el archivo <code>.env</code> con los datos del proyecto de Supabase
        y volver a publicar.</p>
      <pre>VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_ADMIN_EMAIL=${ADMIN_EMAIL || 'correo@ejemplo.com'}</pre>
      <p class="ad-login__sub">Los pasos completos están en
        <strong>manuales/PANEL-ADMIN-CONFIGURACION.md</strong>. Mientras tanto, el juego
        funciona con total normalidad.</p>
    </div>`);
}

/* ------------------------------------------------------- iniciar sesion */

function pantallaLogin(mensaje = '', tipo = 'error') {
  tarjetaLogin(`
    <p class="ad-login__sub">Acceso restringido. Solo el administrador del proyecto puede ver las estadísticas.</p>
    <form novalidate>
      <div class="ad-campo">
        <label for="usuario">Usuario</label>
        <input id="usuario" name="usuario" type="text" autocomplete="username" value="${ADMIN_EMAIL}" />
        <p class="ad-campo__pista">También puedes escribir «admin».</p>
      </div>
      <div class="ad-campo ad-clave">
        <label for="clave">Contraseña</label>
        <input id="clave" name="clave" type="password" autocomplete="current-password" />
        <button type="button" data-ver aria-label="Mostrar u ocultar la contraseña">👁</button>
      </div>
      <label class="ad-check">
        <input type="checkbox" data-recordar checked />
        Mantener la sesión iniciada en este equipo
      </label>
      <div class="ad-acciones">
        <button class="btn" type="submit" data-entrar>Entrar</button>
      </div>
      <p class="ad-aviso" data-aviso role="status" aria-live="polite"></p>
    </form>
    <div class="ad-enlaces">
      <button class="ad-enlace" type="button" data-olvido>¿Olvidaste tu contraseña?</button>
    </div>`);

  const form = raiz.querySelector('form');
  const el = (s) => raiz.querySelector(s);
  if (mensaje) aviso(el('[data-aviso]'), mensaje, tipo);

  el('[data-ver]').addEventListener('click', () => {
    const i = el('#clave');
    i.type = i.type === 'password' ? 'text' : 'password';
    i.focus();
  });
  el('[data-olvido]').addEventListener('click', () => pantallaCodigo());

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = el('[data-entrar]');
    const bloqueo = segundosDeBloqueo();
    if (bloqueo > 0) { aviso(el('[data-aviso]'), `Demasiados intentos. Espera ${bloqueo} s.`); return; }
    btn.disabled = true;
    btn.textContent = 'Entrando…';
    const r = await entrarConClave(el('#usuario').value, el('#clave').value, el('[data-recordar]').checked);
    btn.disabled = false;
    btn.textContent = 'Entrar';
    if (!r.ok) { aviso(el('[data-aviso]'), r.mensaje); return; }
    await abrirPanel();
  });
}

/* ------------------------------------- crear o recuperar la contrasena */

function pantallaCodigo() {
  tarjetaLogin(`
    <p class="ad-login__sub">Te enviamos un código de 6 dígitos al correo del administrador.
      Con ese código podrás crear una contraseña nueva.</p>
    <div class="ad-campo">
      <label for="correo">Correo del administrador</label>
      <input id="correo" type="email" value="${ADMIN_EMAIL}" disabled />
    </div>
    <div class="ad-acciones">
      <button class="btn" type="button" data-enviar>Enviar código</button>
    </div>
    <p class="ad-aviso" data-aviso role="status" aria-live="polite"></p>
    <div class="ad-enlaces">
      <button class="ad-enlace" type="button" data-volver>← Volver a iniciar sesión</button>
    </div>`);

  const el = (s) => raiz.querySelector(s);
  el('[data-volver]').addEventListener('click', () => pantallaLogin());
  el('[data-enviar]').addEventListener('click', async () => {
    const btn = el('[data-enviar]');
    btn.disabled = true;
    btn.textContent = 'Enviando…';
    const r = await pedirCodigo();
    btn.disabled = false;
    btn.textContent = 'Enviar código';
    if (!r.ok) { aviso(el('[data-aviso]'), r.mensaje); return; }
    pantallaVerificar();
  });
}

function pantallaVerificar() {
  tarjetaLogin(`
    <p class="ad-login__sub">Escribe el código de 6 dígitos que llegó a
      <strong>${ADMIN_EMAIL}</strong>. Puedes pegarlo completo.</p>
    <div class="ad-codigo" data-codigo>
      ${Array.from({ length: 6 }, (_, i) => `
        <input type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="1"
               aria-label="Dígito ${i + 1} de 6" data-pos="${i}" />`).join('')}
    </div>
    <div class="ad-acciones">
      <button class="btn" type="button" data-verificar>Comprobar código</button>
      <button class="btn btn--sec" type="button" data-reenviar disabled>Reenviar código (60 s)</button>
    </div>
    <p class="ad-aviso" data-aviso role="status" aria-live="polite"></p>
    <div class="ad-enlaces">
      <button class="ad-enlace" type="button" data-volver>← Volver a iniciar sesión</button>
    </div>`);

  const el = (s) => raiz.querySelector(s);
  const casillas = [...raiz.querySelectorAll('[data-pos]')];
  const leerCodigo = () => casillas.map((c) => c.value).join('');

  casillas.forEach((c, i) => {
    c.addEventListener('input', () => {
      c.value = c.value.replace(/\D/g, '').slice(0, 1);
      if (c.value && i < 5) casillas[i + 1].focus();
    });
    c.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !c.value && i > 0) casillas[i - 1].focus();
      if (e.key === 'Enter') el('[data-verificar]').click();
    });
    c.addEventListener('paste', (e) => {
      const txt = (e.clipboardData?.getData('text') ?? '').replace(/\D/g, '').slice(0, 6);
      if (!txt) return;
      e.preventDefault();
      txt.split('').forEach((d, k) => { if (casillas[k]) casillas[k].value = d; });
      casillas[Math.min(txt.length, 5)].focus();
    });
  });
  casillas[0]?.focus();

  // cuenta atras para reenviar
  const btnReenviar = el('[data-reenviar]');
  let quedan = 60;
  const reloj = setInterval(() => {
    quedan -= 1;
    if (quedan <= 0) {
      clearInterval(reloj);
      btnReenviar.disabled = false;
      btnReenviar.textContent = 'Reenviar código';
    } else {
      btnReenviar.textContent = `Reenviar código (${quedan} s)`;
    }
  }, 1000);

  btnReenviar.addEventListener('click', async () => {
    btnReenviar.disabled = true;
    const r = await pedirCodigo();
    aviso(el('[data-aviso]'), r.ok ? 'Código reenviado. Revisa tu correo.' : r.mensaje, r.ok ? 'ok' : 'error');
    pantallaVerificar();
  });

  el('[data-volver]').addEventListener('click', () => { clearInterval(reloj); pantallaLogin(); });

  el('[data-verificar]').addEventListener('click', async () => {
    const btn = el('[data-verificar]');
    btn.disabled = true;
    btn.textContent = 'Comprobando…';
    const r = await verificarCodigo(leerCodigo());
    btn.disabled = false;
    btn.textContent = 'Comprobar código';
    if (!r.ok) { aviso(el('[data-aviso]'), r.mensaje); return; }
    clearInterval(reloj);
    pantallaNuevaClave();
  });
}

function pantallaNuevaClave() {
  tarjetaLogin(`
    <p class="ad-login__sub">Código correcto. Ahora crea tu contraseña: al menos
      10 caracteres, con una letra y un número.</p>
    <form novalidate>
      <div class="ad-campo ad-clave">
        <label for="c1">Contraseña</label>
        <input id="c1" type="password" autocomplete="new-password" />
        <button type="button" data-ver aria-label="Mostrar u ocultar la contraseña">👁</button>
        <div class="ad-fuerza" data-fuerza="0" aria-hidden="true"><i></i></div>
        <p class="ad-campo__pista" data-nivel>Seguridad: floja</p>
      </div>
      <div class="ad-campo ad-clave">
        <label for="c2">Repite la contraseña</label>
        <input id="c2" type="password" autocomplete="new-password" />
      </div>
      <div class="ad-acciones">
        <button class="btn" type="submit" data-guardar>Guardar contraseña</button>
      </div>
      <p class="ad-aviso" data-aviso role="status" aria-live="polite"></p>
    </form>`);

  const el = (s) => raiz.querySelector(s);
  const NIVELES = ['floja', 'justa', 'buena', 'fuerte'];

  el('[data-ver]').addEventListener('click', () => {
    ['#c1', '#c2'].forEach((s) => { const i = el(s); i.type = i.type === 'password' ? 'text' : 'password'; });
  });

  // Se guardan las referencias al dibujarlas: si la pantalla ya cambio,
  // el medidor escribe en nodos sueltos sin romper nada.
  const campoClave = el('#c1');
  const barra = el('[data-fuerza]');
  const relleno = barra?.querySelector('i');
  const pista = el('[data-nivel]');

  campoClave.addEventListener('input', () => {
    const n = fuerzaDeClave(campoClave.value);
    if (barra) barra.dataset.nivel = String(n);
    if (relleno) relleno.style.width = `${(n / 3) * 100}%`;
    if (pista) pista.textContent = `Seguridad: ${NIVELES[n]}`;
  });

  raiz.querySelector('form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const c1 = el('#c1').value;
    const c2 = el('#c2').value;
    if (!claveValida(c1)) { aviso(el('[data-aviso]'), 'La contraseña necesita 10 caracteres como mínimo, con al menos una letra y un número.'); return; }
    if (c1 !== c2) { aviso(el('[data-aviso]'), 'Las dos contraseñas no coinciden.'); return; }
    const btn = el('[data-guardar]');
    btn.disabled = true;
    btn.textContent = 'Guardando…';
    const r = await guardarClave(c1);
    btn.disabled = false;
    btn.textContent = 'Guardar contraseña';
    if (!r.ok) { aviso(el('[data-aviso]'), r.mensaje); return; }
    aviso(el('[data-aviso]'), 'Contraseña guardada ✔', 'ok');
    setTimeout(() => abrirPanel(), 700);
  });
}

/* ----------------------------------------------------------- el tablero */

function cabecera() {
  return `
    <header class="ad-cabecera">
      <div class="ad-cabecera__titulo">
        <p class="eyebrow">EMO-AVENTURA · Administración</p>
        <h1>Uso de las islas</h1>
      </div>
      <div class="ad-cabecera__acciones">
        <div class="ad-periodos" role="group" aria-label="Periodo">
          ${PERIODOS.map((p) => `
            <button class="ad-periodo" type="button" data-periodo="${p.id}" aria-pressed="${p.id === periodoActual}">${p.texto}</button>`).join('')}
        </div>
        <div class="ad-fechas ${periodoActual === 'rango' ? 'is-on' : ''}" data-fechas>
          <label class="solo-lectores" for="f-desde">Desde</label>
          <input id="f-desde" type="date" value="${rango.desde}" />
          <span>a</span>
          <label class="solo-lectores" for="f-hasta">Hasta</label>
          <input id="f-hasta" type="date" value="${rango.hasta}" />
        </div>
        <button class="btn btn--sec btn--chico" type="button" data-refrescar>↻ Actualizar</button>
        <span class="ad-actualizado" data-reloj>Actualizado ahora</span>
        <a class="btn btn--sec btn--chico" href="./index.html">← Volver al juego</a>
        <button class="btn btn--chico" type="button" data-salir>Cerrar sesión</button>
      </div>
    </header>
    <main class="ad-main" data-tablero></main>`;
}

async function abrirPanel() {
  marco(cabecera());
  const el = (s) => raiz.querySelector(s);

  raiz.querySelectorAll('[data-periodo]').forEach((b) => {
    b.addEventListener('click', () => {
      periodoActual = b.dataset.periodo;
      raiz.querySelectorAll('[data-periodo]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      el('[data-fechas]').classList.toggle('is-on', periodoActual === 'rango');
      if (periodoActual !== 'rango' || (rango.desde && rango.hasta)) refrescar();
    });
  });
  el('#f-desde')?.addEventListener('change', (e) => { rango.desde = e.target.value; if (rango.hasta) refrescar(); });
  el('#f-hasta')?.addEventListener('change', (e) => { rango.hasta = e.target.value; if (rango.desde) refrescar(); });
  el('[data-refrescar]').addEventListener('click', () => refrescar());
  el('[data-salir]').addEventListener('click', async () => { await salir(); });

  vigilarInactividad();
  refrescar();
}

function textoPeriodo() {
  const p = PERIODOS.find((x) => x.id === periodoActual);
  if (periodoActual === 'rango' && rango.desde && rango.hasta) return `Del ${rango.desde} al ${rango.hasta}`;
  if (periodoActual === 'hoy') return 'Hoy';
  if (periodoActual === '7d') return 'Los últimos 7 días';
  if (periodoActual === '30d') return 'Los últimos 30 días';
  return 'Todo el histórico';
}

async function refrescar() {
  const host = raiz.querySelector('[data-tablero]');
  if (!host) return;
  destruirGraficas();
  pintarEsqueleto(host);
  try {
    const datos = await cargarDatos(calcularPeriodo(periodoActual, rango));
    pintarTablero(host, datos, textoPeriodo());
    ultimaCarga = Date.now();
    marcarHora();
  } catch (err) {
    const msg = String(err?.message ?? '');
    if (msg.includes('Acceso no autorizado')) { await salir('Acceso no autorizado.'); return; }
    pintarError(host, 'Revisa tu conexión y vuelve a intentarlo.', () => refrescar());
  }
}

function marcarHora() {
  clearInterval(relojActualizado);
  const pinta = () => {
    const el = raiz.querySelector('[data-reloj]');
    if (!el) { clearInterval(relojActualizado); return; }
    const min = Math.round((Date.now() - ultimaCarga) / 60000);
    el.textContent = min < 1 ? 'Actualizado ahora' : `Actualizado hace ${min} min`;
  };
  pinta();
  relojActualizado = setInterval(pinta, 30000);
}

/* ------------------------------------------------------- sesion y salida */

function vigilarInactividad() {
  const reiniciar = () => {
    clearTimeout(temporizadorInactividad);
    temporizadorInactividad = setTimeout(() => salir('Se cerró la sesión por inactividad.'), INACTIVIDAD_MS);
  };
  ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach((ev) => window.addEventListener(ev, reiniciar, { passive: true }));
  reiniciar();
}

async function salir(mensaje = '') {
  clearTimeout(temporizadorInactividad);
  clearInterval(relojActualizado);
  destruirGraficas();
  await cerrarSesion();
  pantallaLogin(mensaje, mensaje ? 'info' : 'error');
}

/* ------------------------------------------------------------- arranque */

(async function iniciar() {
  if (!estaConfigurado) { pantallaSinConfigurar(); return; }
  crearCliente({ recordar: true });
  const sesion = await sesionActual();
  if (sesion) abrirPanel();
  else pantallaLogin();
})();
