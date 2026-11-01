// PANEL DE ADMINISTRACION · descarga en Excel
//
// Un libro con seis hojas: resumen con el ranking, una fila por isla, visitas
// por dia, por hora, por dispositivo y las cinco graficas como imagen.
//
// ExcelJS pesa, asi que este modulo se carga solo cuando se pulsa el boton
// (import() dinamico desde dashboard.js). El panel no lo descarga al entrar.

import { imagenesDeGraficas, NOMBRE_DISPOSITIVO } from './charts.js';

/* ------------------------------------------------------------- estilo */

const TINTA = 'FF102C36';
const AGUA = 'FFE8F4F8';
const BORDE = 'FFD7E3E8';
const CEBRA = 'FFF6FAFC';

const borde = {
  top: { style: 'thin', color: { argb: BORDE } },
  left: { style: 'thin', color: { argb: BORDE } },
  bottom: { style: 'thin', color: { argb: BORDE } },
  right: { style: 'thin', color: { argb: BORDE } }
};

/** Titulo grande de la hoja; devuelve la fila siguiente libre */
function titulo(hoja, texto, subtitulo, columnas) {
  const f1 = hoja.addRow([texto]);
  f1.font = { name: 'Calibri', size: 16, bold: true, color: { argb: TINTA } };
  f1.height = 24;
  hoja.mergeCells(f1.number, 1, f1.number, Math.max(2, columnas));

  const f2 = hoja.addRow([subtitulo]);
  f2.font = { name: 'Calibri', size: 10, color: { argb: 'FF5A6B72' } };
  hoja.mergeCells(f2.number, 1, f2.number, Math.max(2, columnas));

  hoja.addRow([]);
  return hoja.lastRow.number + 1;
}

/** Tabla con cabecera de color, cebra, bordes y filtro */
function tabla(hoja, cabeceras, filas, { anchos = [], formatos = {}, filtro = true } = {}) {
  const cab = hoja.addRow(cabeceras);
  cab.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
  cab.alignment = { vertical: 'middle' };
  cab.height = 22;
  cab.eachCell((celda, i) => {
    if (i > cabeceras.length) return;
    celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TINTA } };
    celda.border = borde;
  });

  filas.forEach((datos, k) => {
    const fila = hoja.addRow(datos);
    fila.eachCell((celda, i) => {
      if (i > cabeceras.length) return;
      celda.border = borde;
      if (k % 2) celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CEBRA } };
      if (formatos[i]) celda.numFmt = formatos[i];
      if (typeof celda.value === 'number') celda.alignment = { horizontal: 'right' };
    });
  });

  anchos.forEach((a, i) => { hoja.getColumn(i + 1).width = a; });
  if (filtro && filas.length) {
    hoja.autoFilter = { from: { row: cab.number, column: 1 }, to: { row: cab.number + filas.length, column: cabeceras.length } };
  }
  hoja.views = [{ state: 'frozen', ySplit: cab.number }];
  return cab.number;
}

/* ----------------------------------------------------------- utilidades */

const mmss = (ms) => {
  const s = Math.max(0, Math.round(Number(ms ?? 0) / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

const fechaHora = (iso) => {
  if (!iso) return 'sin visitas';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? 'sin visitas' : d.toLocaleString('es-CO');
};

const pct = (parte, total) => (total ? Math.round((parte / total) * 1000) / 10 : 0);

/* -------------------------------------------------------------- hojas */

function hojaResumen(libro, datos, orden, periodoTexto) {
  const { resumen } = datos;
  const total = Number(resumen.visitas ?? 0);
  const hoja = libro.addWorksheet('Resumen', { properties: { tabColor: { argb: TINTA } } });

  titulo(hoja, 'EMO-AVENTURA · Uso de las islas',
    `Periodo: ${periodoTexto} · Generado el ${new Date().toLocaleString('es-CO')}`, 5);

  tabla(hoja,
    ['Dato', 'Valor'],
    [
      ['Visitas totales', Number(resumen.visitas ?? 0)],
      ['Sesiones únicas', Number(resumen.sesiones_unicas ?? 0)],
      ['Partidas iniciadas', Number(resumen.partidas_iniciadas ?? 0)],
      ['Partidas completadas', Number(resumen.partidas_completas ?? 0)],
      ['Tasa de finalización', Number(resumen.tasa_finalizacion ?? 0)],
      ['Duración media', mmss(resumen.duracion_promedio)]
    ],
    { anchos: [16, 26, 14, 10, 12], formatos: { 2: '#,##0' }, filtro: false });
  hoja.getCell(`B${hoja.lastRow.number - 1}`).numFmt = '0.0" %"';

  hoja.addRow([]);
  const t = hoja.addRow(['Ranking de islas']);
  t.font = { bold: true, size: 13, color: { argb: TINTA } };
  hoja.addRow([]);

  const cab = tabla(hoja,
    ['Puesto', 'Isla', 'Emoción', 'Visitas', '% del total'],
    orden.map((i) => [i.puesto, i.nombre, i.emocion, Number(i.visitas), pct(i.visitas, total)]),
    { anchos: [16, 26, 14, 10, 12], formatos: { 4: '#,##0', 5: '0.0" %"' } });

  // barras de color dentro de la columna de visitas
  hoja.addConditionalFormatting({
    ref: `D${cab + 1}:D${cab + orden.length}`,
    rules: [{ type: 'dataBar', cfvo: [{ type: 'min' }, { type: 'max' }], color: { argb: 'FF2E86AB' } }]
  });

  hoja.addRow([]);
  const texto = hoja.addRow([resumenEnTexto(datos, orden, periodoTexto)]);
  texto.font = { italic: true, color: { argb: 'FF37474F' } };
  texto.alignment = { wrapText: true, vertical: 'top' };
  texto.height = 48;
  hoja.mergeCells(texto.number, 1, texto.number, 5);
  return hoja;
}

function resumenEnTexto(datos, orden, periodoTexto) {
  const { resumen } = datos;
  const visitas = Number(resumen.visitas ?? 0);
  const top = orden[0];
  const ultima = orden[orden.length - 1];
  return `En ${periodoTexto.toLowerCase()} hubo ${visitas} visitas de ${Number(resumen.sesiones_unicas ?? 0)} sesiones distintas. `
    + `La isla más visitada fue ${top.nombre} (${top.emocion}) con ${top.visitas} visitas, el ${pct(top.visitas, visitas)} % del total; `
    + `la menos visitada, ${ultima.nombre} con ${ultima.visitas}. `
    + `Se completó el ${Number(resumen.tasa_finalizacion ?? 0)} % de las partidas iniciadas, `
    + `con una duración media de ${mmss(resumen.duracion_promedio)} por partida.`;
}

function hojaPorIsla(libro, islas, periodoTexto) {
  const hoja = libro.addWorksheet('Por isla');
  titulo(hoja, 'Estadísticas por isla', `Periodo: ${periodoTexto}`, 9);
  tabla(hoja,
    ['Isla', 'Emoción', 'Visitas', 'Sesiones únicas', 'Partidas iniciadas', 'Completadas', '% finalización', 'Tiempo medio', 'Última visita'],
    islas.map((i) => [
      i.nombre, i.emocion, Number(i.visitas), Number(i.sesiones), Number(i.iniciadas),
      Number(i.completadas), Number(i.tasa), mmss(i.duracion), fechaHora(i.ultima)
    ]),
    {
      anchos: [26, 14, 10, 16, 18, 14, 15, 14, 20],
      formatos: { 3: '#,##0', 4: '#,##0', 5: '#,##0', 6: '#,##0', 7: '0.0" %"' }
    });
  return hoja;
}

function hojaPorDia(libro, etiquetas, series, periodoTexto) {
  const hoja = libro.addWorksheet('Por día');
  titulo(hoja, 'Visitas por día', `Periodo: ${periodoTexto}`, series.length + 1);
  tabla(hoja,
    ['Día', ...series.map((s) => (s.total ? 'Total' : s.nombre))],
    etiquetas.map((dia, k) => [dia, ...series.map((s) => Number(s.datos[k] ?? 0))]),
    { anchos: [14, ...series.map(() => 16)], formatos: Object.fromEntries(series.map((_, i) => [i + 2, '#,##0'])) });
  return hoja;
}

function hojaPorHora(libro, horas, periodoTexto) {
  const hoja = libro.addWorksheet('Por hora');
  titulo(hoja, 'Visitas por hora del día', `Periodo: ${periodoTexto} · hora de Bogotá`, 2);
  const cab = tabla(hoja,
    ['Hora', 'Visitas'],
    horas.map((v, h) => [`${String(h).padStart(2, '0')}:00`, Number(v ?? 0)]),
    { anchos: [12, 14], formatos: { 2: '#,##0' } });
  hoja.addConditionalFormatting({
    ref: `B${cab + 1}:B${cab + horas.length}`,
    rules: [{ type: 'dataBar', cfvo: [{ type: 'min' }, { type: 'max' }], color: { argb: 'FF7B61FF' } }]
  });
  return hoja;
}

function hojaDispositivos(libro, dispositivos, periodoTexto) {
  const hoja = libro.addWorksheet('Dispositivos');
  titulo(hoja, 'Tipo de dispositivo', `Periodo: ${periodoTexto}`, 4);
  const total = dispositivos.reduce((s, f) => s + Number(f.sesiones ?? 0), 0);
  tabla(hoja,
    ['Dispositivo', 'Sesiones', 'Eventos', '% de sesiones'],
    dispositivos.map((f) => [
      NOMBRE_DISPOSITIVO[f.device] ?? f.device,
      Number(f.sesiones ?? 0),
      Number(f.eventos ?? 0),
      pct(Number(f.sesiones ?? 0), total)
    ]),
    { anchos: [18, 12, 12, 16], formatos: { 2: '#,##0', 3: '#,##0', 4: '0.0" %"' } });
  return hoja;
}

function hojaGraficas(libro, imagenes, periodoTexto) {
  const hoja = libro.addWorksheet('Gráficas');
  hoja.getColumn(1).width = 4;
  titulo(hoja, 'Gráficas', `Las mismas que se ven en el panel · Periodo: ${periodoTexto}`, 8);

  let fila = 4;
  imagenes.forEach((img) => {
    const t = hoja.getCell(`B${fila}`);
    t.value = img.titulo;
    t.font = { bold: true, size: 12, color: { argb: TINTA } };
    const id = libro.addImage({ base64: img.base64, extension: 'png' });
    hoja.addImage(id, {
      tl: { col: 1, row: fila },                 // justo debajo del titulo
      ext: { width: Math.min(img.ancho, 720), height: Math.min(img.alto, 300) }
    });
    fila += Math.ceil(Math.min(img.alto, 300) / 20) + 3;
  });
  if (!imagenes.length) hoja.getCell('B4').value = 'No había gráficas dibujadas al descargar.';
  return hoja;
}

/* ------------------------------------------------------------ descarga */

/**
 * Crea y descarga el libro de Excel del periodo.
 * @param {object} opciones datos del tablero ya calculados
 */
export async function descargarExcel({ datos, orden, etiquetas, series, horas, periodoTexto }) {
  const { default: ExcelJS } = await import('exceljs');
  const libro = new ExcelJS.Workbook();
  libro.creator = 'EMO-AVENTURA';
  libro.created = new Date();

  hojaResumen(libro, datos, orden, periodoTexto);
  hojaPorIsla(libro, datos.islas, periodoTexto);
  hojaPorDia(libro, etiquetas, series, periodoTexto);
  hojaPorHora(libro, horas, periodoTexto);
  hojaDispositivos(libro, datos.dispositivos, periodoTexto);
  hojaGraficas(libro, imagenesDeGraficas(), periodoTexto);

  const buffer = await libro.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `emo-aventura-estadisticas-${periodoTexto.toLowerCase().replace(/\s+/g, '-')}.xlsx`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
