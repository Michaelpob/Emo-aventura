// PANEL DE ADMINISTRACION · tablero de uso de las islas
//
// Lee los datos con las funciones RPC (que comprueban is_admin en el servidor)
// y los pinta. Nunca consulta la tabla directamente.

import { islands } from '../data/islands.js';
import { getCliente } from './auth.js';
import {
  graficaVisitasPorIsla, graficaPartidas, graficaPorDia, graficaPorHora,
  graficaDispositivos, graficaIsla, destruirGraficas, NOMBRE_DISPOSITIVO
} from './charts.js';

const ISLAS = islands.map((i) => ({
  id: i.id,
  nombre: i.displayName,
  emocion: i.name,
  emoji: i.emoji ?? '',
  color: i.palette.ui,
  glow: i.palette.glow
}));
const PorId = new Map(ISLAS.map((i) => [i.id, i]));

/* ------------------------------------------------------------ periodos */

export const PERIODOS = [
  { id: 'hoy', texto: 'Hoy', dias: 0 },
  { id: '7d', texto: '7 días', dias: 7 },
  { id: '30d', texto: '30 días', dias: 30 },
  { id: 'todo', texto: 'Todo', dias: null },
  { id: 'rango', texto: 'Personalizado', dias: undefined }
];

/** Devuelve { desde, hasta, desdeAntes, hastaAntes } en ISO */
export function calcularPeriodo(id, rango = {}) {
  const ahora = new Date();
  const hasta = new Date(ahora.getTime() + 60_000);       // un minuto de margen
  let desde;

  if (id === 'hoy') {
    desde = new Date(ahora); desde.setHours(0, 0, 0, 0);
  } else if (id === '7d' || id === '30d') {
    const d = id === '7d' ? 7 : 30;
    desde = new Date(ahora.getTime() - d * 24 * 3600 * 1000);
  } else if (id === 'rango' && rango.desde && rango.hasta) {
    desde = new Date(`${rango.desde}T00:00:00`);
    const h = new Date(`${rango.hasta}T00:00:00`);
    h.setDate(h.getDate() + 1);
    return periodoCon(desde, h);
  } else {
    desde = new Date('2020-01-01T00:00:00Z');             // "Todo"
  }
  return periodoCon(desde, hasta);
}

function periodoCon(desde, hasta) {
  const largo = hasta.getTime() - desde.getTime();
  return {
    desde: desde.toISOString(),
    hasta: hasta.toISOString(),
    desdeAntes: new Date(desde.getTime() - largo).toISOString(),
    hastaAntes: desde.toISOString()
  };
}

/* -------------------------------------------------------------- datos */

async function rpc(sb, nombre, desde, hasta) {
  const { data, error } = await sb.rpc(nombre, { p_from: desde, p_to: hasta });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function cargarDatos(periodo) {
  const sb = getCliente();
  if (!sb) throw new Error('sin-configurar');
  const { desde, hasta, desdeAntes, hastaAntes } = periodo;

  const [resumen, islas, dias, horas, dispositivos, resumenAntes] = await Promise.all([
    rpc(sb, 'admin_summary', desde, hasta),
    rpc(sb, 'admin_island_stats', desde, hasta),
    rpc(sb, 'admin_daily_visits', desde, hasta),
    rpc(sb, 'admin_hourly_visits', desde, hasta),
    rpc(sb, 'admin_devices', desde, hasta),
    rpc(sb, 'admin_summary', desdeAntes, hastaAntes)
  ]);

  return {
    resumen: resumen[0] ?? vacioResumen(),
    resumenAntes: resumenAntes[0] ?? vacioResumen(),
    islas: ISLAS.map((i) => {
      const f = islas.find((x) => x.island_id === i.id) ?? {};
      return {
        ...i,
        visitas: Number(f.visitas ?? 0),
        sesiones: Number(f.sesiones_unicas ?? 0),
        iniciadas: Number(f.partidas_iniciadas ?? 0),
        completadas: Number(f.partidas_completas ?? 0),
        tasa: Number(f.tasa_finalizacion ?? 0),
        duracion: Number(f.duracion_promedio ?? 0),
        ultima: f.ultima_visita ?? null
      };
    }),
    dias,
    horas,
    dispositivos
  };
}

function vacioResumen() {
  return { visitas: 0, sesiones_unicas: 0, partidas_iniciadas: 0, partidas_completas: 0, tasa_finalizacion: 0, duracion_promedio: 0 };
}

/* ------------------------------------------------------------ formatos */

export const num = (v) => Number(v ?? 0).toLocaleString('es-CO');

export function duracion(ms) {
  const s = Math.max(0, Math.round(Number(ms ?? 0) / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

export function hace(iso) {
  if (!iso) return 'sin visitas';
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return 'hace un momento';
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? 'ayer' : `hace ${d} días`;
}

function delta(actual, antes) {
  const a = Number(actual ?? 0);
  const b = Number(antes ?? 0);
  if (!b) return a ? { clase: 'sube', texto: 'nuevo' } : { clase: 'igual', texto: 'sin cambios' };
  const pct = Math.round(((a - b) / b) * 100);
  if (pct === 0) return { clase: 'igual', texto: 'igual que antes' };
  return { clase: pct > 0 ? 'sube' : 'baja', texto: `${pct > 0 ? '▲' : '▼'} ${Math.abs(pct)} % vs. periodo anterior` };
}

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ------------------------------------------------------------- pintado */

export function pintarEsqueleto(host) {
  host.innerHTML = `
    <section class="ad-seccion" aria-busy="true" aria-live="polite">
      <p class="solo-lectores">Cargando estadísticas…</p>
      <div class="ad-metricas">${'<div class="tarjeta ad-esqueleto"></div>'.repeat(4)}</div>
      <div class="tarjeta ad-esqueleto" style="min-height:120px"></div>
      <div class="ad-islas">${'<div class="tarjeta ad-esqueleto" style="min-height:190px"></div>'.repeat(6)}</div>
    </section>`;
}

export function pintarSinDatos(host) {
  host.innerHTML = `
    <section class="tarjeta ad-vacio">
      <h2>Aún no hay visitas en este periodo</h2>
      <p>Las estadísticas empiezan a contar desde que se publicó esta versión del juego.
         Prueba con un periodo más amplio, por ejemplo «Todo».</p>
    </section>`;
}

export function pintarError(host, mensaje, alReintentar) {
  host.innerHTML = `
    <section class="tarjeta ad-error" role="alert">
      <h2>No se pudieron cargar los datos</h2>
      <p>${esc(mensaje)}</p>
      <button class="btn" type="button" data-reintentar>Reintentar</button>
    </section>`;
  host.querySelector('[data-reintentar]')?.addEventListener('click', alReintentar);
}

/** Pinta el tablero entero con los datos ya cargados */
export function pintarTablero(host, datos, periodoTexto) {
  const { resumen, resumenAntes, islas, dias, horas, dispositivos } = datos;
  const totalVisitas = Number(resumen.visitas ?? 0);

  if (!totalVisitas && !Number(resumen.partidas_iniciadas ?? 0)) { pintarSinDatos(host); return; }

  const orden = [...islas].sort((a, b) => b.visitas - a.visitas);
  const top = orden[0];
  const maximo = Math.max(1, ...islas.map((i) => i.visitas));

  // puestos con empate compartido
  let puesto = 0;
  let previo = null;
  const conPuesto = orden.map((i, idx) => {
    if (i.visitas !== previo) { puesto = idx + 1; previo = i.visitas; }
    return { ...i, puesto };
  });
  const medalla = (p) => (p === 1 ? '🥇' : p === 2 ? '🥈' : p === 3 ? '🥉' : '');

  const m = [
    { nombre: 'Visitas totales', valor: num(resumen.visitas), d: delta(resumen.visitas, resumenAntes.visitas) },
    { nombre: 'Sesiones únicas', valor: num(resumen.sesiones_unicas), d: delta(resumen.sesiones_unicas, resumenAntes.sesiones_unicas) },
    { nombre: 'Partidas completadas', valor: num(resumen.partidas_completas), d: delta(resumen.partidas_completas, resumenAntes.partidas_completas) },
    { nombre: 'Tasa de finalización', valor: `${Number(resumen.tasa_finalizacion ?? 0)} %`, d: delta(resumen.tasa_finalizacion, resumenAntes.tasa_finalizacion) }
  ];

  host.innerHTML = `
    <section class="ad-seccion" aria-label="Resumen general">
      <div class="ad-metricas">
        ${m.map((x) => `
          <article class="tarjeta ad-metrica">
            <span class="ad-metrica__valor">${x.valor}</span>
            <span class="ad-metrica__nombre">${x.nombre}</span>
            <span class="ad-metrica__delta ad-metrica__delta--${x.d.clase}">${x.d.texto}</span>
          </article>`).join('')}
      </div>
    </section>

    <section class="ad-seccion" aria-label="Isla más visitada">
      <article class="tarjeta ad-top" style="--c:${top.color}">
        <span class="ad-top__emoji" aria-hidden="true">${top.emoji}</span>
        <div class="ad-top__datos">
          <span class="eyebrow">Isla más visitada</span>
          <span class="ad-top__nombre">${esc(top.nombre)}</span>
          <span class="ad-top__cifra">${num(top.visitas)} visitas · ${totalVisitas ? Math.round((top.visitas / totalVisitas) * 100) : 0} % del total · ${esc(top.emocion)}</span>
        </div>
        <span class="ad-top__trofeo" aria-hidden="true">🏆</span>
      </article>
    </section>

    <section class="ad-seccion" aria-label="Ranking de islas">
      <div class="ad-seccion__titulo"><h2>Ranking de islas</h2><span class="ad-actualizado">${esc(periodoTexto)}</span></div>
      <div class="tarjeta">
        <ol class="ad-rank">
          ${conPuesto.map((i) => `
            <li style="--c:${i.color}">
              <span class="ad-rank__pos">${medalla(i.puesto) || i.puesto}</span>
              <span class="ad-rank__emoji" aria-hidden="true">${i.emoji}</span>
              <span class="ad-rank__barra">
                <span class="ad-rank__relleno" style="width:${Math.round((i.visitas / maximo) * 100)}%" data-rayas="${i.id === 'frustration'}"></span>
                <span class="ad-rank__texto">${esc(i.nombre)} · ${esc(i.emocion)}</span>
              </span>
              <span class="ad-rank__cifra">${num(i.visitas)} · ${totalVisitas ? Math.round((i.visitas / totalVisitas) * 100) : 0} %</span>
            </li>`).join('')}
        </ol>
      </div>
    </section>

    <section class="ad-seccion" aria-label="Estadísticas por isla">
      <div class="ad-seccion__titulo"><h2>Estadísticas por isla</h2><span class="ad-actualizado">Toca una tarjeta para ver su gráfica por día</span></div>
      <div class="ad-islas">
        ${islas.map((i) => `
          <button class="ad-isla" type="button" data-isla="${i.id}" style="--c:${i.color};--glow:${i.glow}" aria-expanded="false">
            <span class="ad-isla__franja"></span>
            <span class="ad-isla__cuerpo">
              <span class="ad-isla__cabecera">
                <span class="ad-isla__emoji" aria-hidden="true">${i.emoji}</span>
                <span>
                  <span class="ad-isla__nombre">${esc(i.nombre)}</span>
                  <span class="ad-isla__emocion">${esc(i.emocion)}</span>
                </span>
              </span>
              <span class="ad-isla__datos">
                <span class="ad-isla__dato"><b>${num(i.visitas)}</b>visitas</span>
                <span class="ad-isla__dato"><b>${num(i.sesiones)}</b>sesiones únicas</span>
                <span class="ad-isla__dato"><b>${num(i.iniciadas)}</b>partidas iniciadas</span>
                <span class="ad-isla__dato"><b>${num(i.completadas)}</b>completadas</span>
              </span>
              <span class="ad-isla__barra"><i style="width:${Math.min(100, i.tasa)}%"></i></span>
              <span class="ad-isla__pie">
                <span>${i.tasa} % de finalización</span>
                <span>⏱ ${duracion(i.duracion)}</span>
              </span>
              <span class="ad-isla__pie"><span>Última visita: ${hace(i.ultima)}</span></span>
            </span>
            <span class="ad-isla__detalle oculto"><canvas id="g-isla-${i.id}" height="160"></canvas></span>
          </button>`).join('')}
      </div>
    </section>

    <section class="ad-seccion" aria-label="Gráficas comparativas">
      <div class="ad-seccion__titulo"><h2>Gráficas comparativas</h2></div>
      <div class="ad-graficas">
        ${grafica('g-visitas-isla', 'Visitas por isla', 'Cuántas veces se abrió cada isla en el periodo.')}
        ${grafica('g-partidas', 'Partidas iniciadas y completadas', 'Comparación por isla.')}
        ${grafica('g-dias', 'Visitas por día', 'Una línea por isla, más el total. Puedes ocultar islas en la leyenda.', true)}
        ${grafica('g-horas', 'Visitas por hora del día', 'A qué horas se juega más (hora de Bogotá).')}
        ${grafica('g-dispositivos', 'Tipo de dispositivo', 'Sesiones por tipo de pantalla.')}
      </div>
    </section>

    <section class="ad-seccion" aria-label="Resumen de actividad">
      <div class="tarjeta">
        <span class="eyebrow">Resumen de actividad</span>
        <p class="ad-texto">${textoResumen(datos, conPuesto, periodoTexto)}</p>
      </div>
    </section>

    <section class="ad-seccion">
      <div class="tarjeta" style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;justify-content:space-between">
        <span class="ad-texto">Descarga los datos agregados por día e isla del periodo elegido.</span>
        <button class="btn btn--sec" type="button" data-csv>⤓ Descargar CSV</button>
      </div>
    </section>`;

  // --- graficas
  const { etiquetas, series, porIsla } = serieDiaria(dias, islas);
  graficaVisitasPorIsla(islas);
  graficaPartidas(islas);
  graficaPorDia(etiquetas, series);
  graficaPorHora(horasCompletas(horas));
  graficaDispositivos(dispositivos.length ? dispositivos : [{ device: 'desktop', sesiones: 0 }]);

  // --- tablas alternativas
  host.querySelectorAll('[data-tabla]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const caja = btn.closest('.ad-grafica');
      const alt = caja.querySelector('.ad-tabla-alt');
      const lienzo = caja.querySelector('.ad-grafica__lienzo');
      const abierta = !alt.classList.contains('oculto');
      if (abierta) { alt.classList.add('oculto'); lienzo.classList.remove('oculto'); btn.textContent = 'Ver como tabla'; return; }
      alt.innerHTML = tablaDe(btn.dataset.tabla, { islas, etiquetas, series, horas: horasCompletas(horas), dispositivos });
      alt.classList.remove('oculto');
      lienzo.classList.add('oculto');
      btn.textContent = 'Ver como gráfica';
    });
  });

  // --- detalle por isla
  host.querySelectorAll('[data-isla]').forEach((tarjeta) => {
    tarjeta.addEventListener('click', () => {
      const id = tarjeta.dataset.isla;
      const caja = tarjeta.querySelector('.ad-isla__detalle');
      const abierto = !caja.classList.contains('oculto');
      caja.classList.toggle('oculto', abierto);
      tarjeta.setAttribute('aria-expanded', String(!abierto));
      if (!abierto) graficaIsla(`g-isla-${id}`, etiquetas, porIsla.get(id) ?? [], PorId.get(id).color);
    });
  });

  // --- CSV
  host.querySelector('[data-csv]')?.addEventListener('click', () => descargarCsv(dias, periodoTexto));
}

function grafica(id, titulo, pie, ancha = false) {
  return `
    <article class="tarjeta ad-grafica ${ancha ? 'ad-grafica--ancha' : ''}">
      <div class="ad-grafica__cabecera">
        <div><h3>${titulo}</h3><span class="ad-actualizado">${pie}</span></div>
        <button class="btn btn--sec btn--chico" type="button" data-tabla="${id}">Ver como tabla</button>
      </div>
      <div class="ad-grafica__lienzo"><canvas id="${id}"></canvas></div>
      <div class="ad-tabla-alt oculto"></div>
    </article>`;
}

/* --------------------------------------------------------- derivados */

function serieDiaria(dias, islas) {
  const etiquetas = [...new Set(dias.map((d) => d.dia))].sort();
  const porIsla = new Map(islas.map((i) => [i.id, etiquetas.map(() => 0)]));
  const total = etiquetas.map(() => 0);
  dias.forEach((d) => {
    const k = etiquetas.indexOf(d.dia);
    const serie = porIsla.get(d.island_id);
    if (k >= 0 && serie) { serie[k] += Number(d.visitas ?? 0); total[k] += Number(d.visitas ?? 0); }
  });
  const series = islas.map((i) => ({ ...i, datos: porIsla.get(i.id) }));
  series.push({ id: 'total', nombre: 'Total', emoji: '', color: '#102c36', datos: total, total: true });
  return { etiquetas: etiquetas.map(formatoDia), series, porIsla };
}

function formatoDia(iso) {
  try {
    const [a, m, d] = String(iso).split('-');
    return `${d}/${m}`;
  } catch { return iso; }
}

function horasCompletas(filas) {
  const v = Array.from({ length: 24 }, () => 0);
  filas.forEach((f) => { v[Number(f.hora)] = Number(f.visitas ?? 0); });
  return v;
}

function tablaDe(id, d) {
  const t = (cabeceras, filas) => `
    <table><caption class="solo-lectores">Datos de la gráfica</caption>
      <thead><tr>${cabeceras.map((c) => `<th scope="col">${c}</th>`).join('')}</tr></thead>
      <tbody>${filas.map((f) => `<tr>${f.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody>
    </table>`;
  if (id === 'g-visitas-isla') return t(['Isla', 'Visitas'], d.islas.map((i) => [`${i.emoji} ${esc(i.nombre)}`, num(i.visitas)]));
  if (id === 'g-partidas') return t(['Isla', 'Iniciadas', 'Completadas'], d.islas.map((i) => [`${i.emoji} ${esc(i.nombre)}`, num(i.iniciadas), num(i.completadas)]));
  if (id === 'g-horas') return t(['Hora', 'Visitas'], d.horas.map((v, h) => [`${String(h).padStart(2, '0')} h`, num(v)]));
  if (id === 'g-dispositivos') return t(['Dispositivo', 'Sesiones'], d.dispositivos.map((f) => [NOMBRE_DISPOSITIVO[f.device] ?? f.device, num(f.sesiones)]));
  // por dia
  const cabeceras = ['Día', ...d.series.map((s) => (s.total ? 'Total' : `${s.emoji} ${s.nombre}`))];
  const filas = d.etiquetas.map((dia, k) => [dia, ...d.series.map((s) => num(s.datos[k]))]);
  return t(cabeceras, filas);
}

function textoResumen(datos, orden, periodoTexto) {
  const { resumen } = datos;
  const visitas = Number(resumen.visitas ?? 0);
  const top = orden[0];
  const ultima = orden[orden.length - 1];
  const pct = visitas ? Math.round((top.visitas / visitas) * 100) : 0;
  const tasa = Number(resumen.tasa_finalizacion ?? 0);
  const sesiones = Number(resumen.sesiones_unicas ?? 0);
  return `En <b>${esc(periodoTexto.toLowerCase())}</b> hubo <b>${num(visitas)}</b> visitas de <b>${num(sesiones)}</b> sesiones distintas.
    La isla más visitada fue <b>${esc(top.nombre)}</b> (${esc(top.emocion)}) con ${num(top.visitas)} visitas (${pct} %);
    la menos visitada, <b>${esc(ultima.nombre)}</b> con ${num(ultima.visitas)}.
    Se completó el <b>${tasa} %</b> de las partidas iniciadas, con una duración media de <b>${duracion(resumen.duracion_promedio)}</b> por partida.`;
}

/* ----------------------------------------------------------------- CSV */

function descargarCsv(dias, periodoTexto) {
  const filas = [['dia', 'isla_id', 'isla', 'emocion', 'visitas']];
  dias.forEach((d) => {
    const i = PorId.get(d.island_id);
    filas.push([d.dia, d.island_id, i?.nombre ?? d.island_id, i?.emocion ?? '', d.visitas]);
  });
  const csv = '﻿' + filas.map((f) => f.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `emo-aventura-visitas-${periodoTexto.toLowerCase().replace(/\s+/g, '-')}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

export { destruirGraficas, ISLAS };
