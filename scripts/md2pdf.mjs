// Markdown -> HTML -> PDF (Edge headless por Playwright).
// Sin dependencias nuevas: convertidor propio para el subconjunto de Markdown
// que usan los manuales (encabezados, listas, tablas, codigo, citas, enlaces).
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require('C:/Users/nazat/source/repos/isla-emociones-3d/node_modules/playwright');

const RAIZ = 'C:/Users/nazat/source/repos/isla-emociones-3d';
const MAN = join(RAIZ, 'manuales');
const SALIDA = join(MAN, 'pdf');
mkdirSync(SALIDA, { recursive: true });

/* ------------------------------------------------------- markdown -> html */

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Formato dentro de una linea: codigo, negrita, cursiva, enlaces */
function inline(t) {
  let s = esc(t);
  const codigos = [];
  s = s.replace(/`([^`]+)`/g, (_, c) => `\u0000${codigos.push(c) - 1}\u0000`);
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, txt, url) => `<a href="${url}">${txt}</a>`);
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
  s = s.replace(/\u0000(\d+)\u0000/g, (_, i) => `<code>${codigos[Number(i)]}</code>`);
  return s;
}

const slug = (t) => t.toLowerCase()
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-');

/** Devuelve { html, toc: [{nivel, texto, id}] } */
function markdown(src) {
  const lineas = src.split(/\r?\n/);
  const out = [];
  const toc = [];
  let i = 0;
  const parrafo = [];
  const cerrarParrafo = () => {
    if (!parrafo.length) return;
    out.push(`<p>${inline(parrafo.join(' '))}</p>`);
    parrafo.length = 0;
  };

  while (i < lineas.length) {
    const l = lineas[i];

    // bloque de codigo (puede ir indentado dentro de una lista)
    if (/^\s*```/.test(l)) {
      cerrarParrafo();
      const sangria = l.match(/^\s*/)[0].length;
      const lang = l.trim().slice(3).trim();
      const cuerpo = [];
      i += 1;
      while (i < lineas.length && !/^\s*```/.test(lineas[i])) { cuerpo.push(lineas[i].slice(sangria)); i += 1; }
      i += 1;
      out.push(`<pre class="codigo" data-lang="${esc(lang)}"><code>${esc(cuerpo.join('\n'))}</code></pre>`);
      continue;
    }

    // encabezado
    const h = l.match(/^(#{1,4})\s+(.*)$/);
    if (h) {
      cerrarParrafo();
      const nivel = h[1].length;
      const texto = h[2].replace(/\s*\{#.*\}$/, '');
      const id = slug(texto);
      if (nivel <= 3) toc.push({ nivel, texto: texto.replace(/[*`]/g, ''), id });
      out.push(`<h${nivel} id="${id}">${inline(texto)}</h${nivel}>`);
      i += 1;
      continue;
    }

    // separador
    if (/^---+$/.test(l.trim())) { cerrarParrafo(); out.push('<hr>'); i += 1; continue; }

    // tabla
    if (/^\|/.test(l) && /^\|[\s:|-]+\|$/.test(lineas[i + 1] ?? '')) {
      cerrarParrafo();
      const celdas = (fila) => fila.trim().replace(/^\||\|$/g, '').split('|').map((c) => inline(c.trim()));
      const cab = celdas(l);
      i += 2;
      const filas = [];
      while (i < lineas.length && /^\|/.test(lineas[i])) { filas.push(celdas(lineas[i])); i += 1; }
      out.push(`<table><thead><tr>${cab.map((c) => `<th>${c}</th>`).join('')}</tr></thead><tbody>${filas.map((f) => `<tr>${f.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`);
      continue;
    }

    // cita
    if (/^>\s?/.test(l)) {
      cerrarParrafo();
      const cuerpo = [];
      while (i < lineas.length && /^>\s?/.test(lineas[i])) { cuerpo.push(lineas[i].replace(/^>\s?/, '')); i += 1; }
      out.push(`<blockquote>${markdown(cuerpo.join('\n')).html}</blockquote>`);
      continue;
    }

    // listas (con anidacion de un nivel y casillas)
    if (/^(\s*)([-*]|\d+\.)\s+/.test(l)) {
      cerrarParrafo();
      const ordenada = /^\s*\d+\./.test(l);
      const items = [];
      while (i < lineas.length && !/^\s*```/.test(lineas[i]) && /^(\s*)([-*]|\d+\.)\s+\S/.test(lineas[i])) {
        const m = lineas[i].match(/^(\s*)([-*]|\d+\.)\s+(.*)$/);
        const sangria = m[1].length;
        let texto = m[3];
        const casilla = texto.match(/^\[( |x|X)\]\s+(.*)$/);
        if (casilla) texto = `<span class="casilla">${casilla[1] === ' ' ? '\u2610' : '\u2611'}</span> ${casilla[2]}`;
        i += 1;
        // continuacion del mismo item (lineas sin vinneta, mas indentadas)
        while (i < lineas.length && lineas[i].trim() && !/^\s*```/.test(lineas[i]) && !/^(\s*)([-*]|\d+\.)\s+/.test(lineas[i]) && /^\s{2,}/.test(lineas[i])) {
          texto += ` ${lineas[i].trim()}`;
          i += 1;
        }
        items.push({ sangria, html: casilla ? texto : inline(texto) });
      }
      // un nivel de anidacion
      let html = '';
      let anidando = false;
      const base = Math.min(...items.map((x) => x.sangria));
      for (const it of items) {
        const dentro = it.sangria > base;
        if (dentro && !anidando) { html += '<ul class="anidada">'; anidando = true; }
        if (!dentro && anidando) { html += '</ul>'; anidando = false; }
        html += `<li>${it.html}</li>`;
      }
      if (anidando) html += '</ul>';
      out.push(`<${ordenada ? 'ol' : 'ul'}>${html}</${ordenada ? 'ol' : 'ul'}>`);
      continue;
    }

    // linea en blanco o parrafo
    if (!l.trim()) { cerrarParrafo(); i += 1; continue; }
    parrafo.push(l.trim());
    i += 1;
  }
  cerrarParrafo();
  return { html: out.join('\n'), toc };
}

/* ------------------------------------------------------------------ estilos */

const CSS = `
  @page { size: A4; margin: 20mm 18mm 18mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: "Segoe UI", "Calibri", system-ui, sans-serif; font-size: 10.5pt; line-height: 1.55; color: #1c2230; }
  h1, h2, h3, h4 { color: #143a5e; line-height: 1.25; margin: 0 0 8px; break-after: avoid; }
  h1 { font-size: 20pt; margin-top: 0; padding-bottom: 6px; border-bottom: 3px solid #2f7fb8; }
  h2 { font-size: 14pt; margin-top: 22px; padding-bottom: 4px; border-bottom: 1px solid #cfdcea; }
  h3 { font-size: 11.5pt; margin-top: 16px; color: #1d5e8c; }
  h4 { font-size: 10.5pt; margin-top: 12px; color: #33506e; }
  p { margin: 0 0 8px; }
  a { color: #1d5e8c; text-decoration: none; }
  strong { color: #10263d; }
  ul, ol { margin: 0 0 10px; padding-left: 20px; }
  li { margin: 2px 0; break-inside: avoid; }
  ul.anidada { margin: 2px 0; }
  code { font-family: "Consolas", "Courier New", monospace; font-size: 9pt; background: #eef3f8; border: 1px solid #dbe5ef; border-radius: 3px; padding: 0 3px; }
  pre.codigo { background: #f5f8fb; border: 1px solid #dbe5ef; border-left: 3px solid #2f7fb8; border-radius: 4px; padding: 8px 10px; margin: 0 0 10px; overflow: hidden; break-inside: avoid; }
  pre.codigo code { background: none; border: 0; padding: 0; font-size: 8.6pt; line-height: 1.45; white-space: pre-wrap; word-break: break-word; }
  blockquote { margin: 0 0 10px; padding: 7px 12px; background: #fff8e6; border-left: 3px solid #e0a11a; border-radius: 0 4px 4px 0; }
  blockquote p:last-child { margin-bottom: 0; }
  table { width: 100%; border-collapse: collapse; margin: 0 0 12px; font-size: 9.2pt; break-inside: auto; }
  thead { display: table-header-group; }
  tr { break-inside: avoid; }
  th { background: #143a5e; color: #fff; text-align: left; font-weight: 600; padding: 5px 7px; border: 1px solid #143a5e; }
  td { padding: 5px 7px; border: 1px solid #cfdcea; vertical-align: top; }
  tbody tr:nth-child(even) td { background: #f5f8fb; }
  hr { border: 0; border-top: 1px solid #dbe5ef; margin: 16px 0; }
  .casilla { color: #2f7fb8; font-size: 11pt; }

  /* portada */
  .portada { height: 247mm; display: flex; flex-direction: column; justify-content: center; text-align: center; break-after: page; }
  .portada__sello { font-size: 42pt; letter-spacing: 6px; margin-bottom: 8mm; }
  .portada h1 { border: 0; font-size: 30pt; color: #143a5e; margin-bottom: 4mm; }
  .portada__sub { font-size: 14pt; color: #2f7fb8; margin-bottom: 2mm; }
  .portada__lema { font-size: 11pt; font-style: italic; color: #56657a; margin-bottom: 14mm; }
  .portada__datos { display: inline-block; text-align: left; font-size: 10pt; color: #33506e; border-top: 2px solid #2f7fb8; padding-top: 5mm; }
  .portada__datos b { color: #143a5e; }

  /* indice */
  .indice { break-after: page; }
  .indice h1 { margin-bottom: 10px; }
  .indice ol { list-style: none; padding: 0; margin: 0; counter-reset: n1; }
  .indice li { margin: 0; }
  .indice .n1 { font-weight: 600; color: #143a5e; padding: 5px 0 5px; border-bottom: 1px dotted #cfdcea; }
  .indice .n2 { padding: 2px 0 2px 14px; color: #33506e; font-size: 9.8pt; }
  .indice .n3 { padding: 1px 0 1px 30px; color: #56657a; font-size: 9.3pt; }
  .doc { break-before: page; }
  .doc:first-of-type { break-before: auto; }
`;

/** Plantilla de pie de pagina: numeracion */
const pie = (titulo) => `
  <div style="width:100%;font-size:8pt;color:#7b8798;font-family:'Segoe UI',sans-serif;padding:0 18mm;display:flex;justify-content:space-between;">
    <span>${titulo}</span><span>Página <span class="pageNumber"></span> de <span class="totalPages"></span></span>
  </div>`;
const cabecera = '<div></div>';

/** Quita el bloque de tabla de contenido escrito a mano en el .md (lo genera el PDF) */
function limpiar(md) {
  return md
    // todo lo anterior al primer apartado ya esta en la portada del PDF
    .replace(/^[\s\S]*?(?=\n## )/, '')
    .replace(/## Tabla de contenido[\s\S]*?(?=\n---\n)/, '')
    .replace(/\n---\n\s*\*Documento mantenido[\s\S]*$/, '\n')
    .replace(/\n\*\u00daltima actualizaci[\s\S]*$/, '\n')
    .replace(/^\s*---\s*\n/, '');
}

function paginaHtml({ titulo, subtitulo, meta, cuerpoHtml, toc, conPortada = true }) {
  const indice = toc.length ? `
    <section class="indice">
      <h1>Tabla de contenido</h1>
      <ol>${toc.map((t) => `<li class="n${t.nivel}"><a href="#${t.id}">${esc(t.texto)}</a></li>`).join('')}</ol>
    </section>` : '';
  const portada = conPortada ? `
    <section class="portada">
      <div class="portada__sello">🏝️</div>
      <h1>${esc(titulo)}</h1>
      <div class="portada__sub">${esc(subtitulo)}</div>
      <div class="portada__lema">«Vive la aventura de descubrir el poder de tus emociones»</div>
      <div class="portada__datos">${meta.map(([k, v]) => `<div><b>${esc(k)}:</b> ${esc(v)}</div>`).join('')}</div>
    </section>` : '';
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${esc(titulo)}</title><style>${CSS}</style></head><body>${portada}${indice}${cuerpoHtml}</body></html>`;
}

const META = [
  ['Proyecto', 'EMO-AVENTURA · Isla Emociones 3D'],
  ['Repositorio', 'github.com/Michaelpob/Emo-aventura'],
  ['Sitio', 'michaelpob.github.io/Emo-aventura/'],
  ['Versión del documento', '1.0'],
  ['Fecha', 'Septiembre de 2026']
];

const DOCS = [
  { archivo: 'MANUAL-DE-USUARIO.md', pdf: 'Manual-de-usuario.pdf', titulo: 'Manual de usuario', sub: 'Guía para jugar, para docentes y para familias' },
  { archivo: 'MANUAL-DE-ADMINISTRADOR.md', pdf: 'Manual-de-administrador.pdf', titulo: 'Manual de administrador', sub: 'Instalación, despliegue, arquitectura y mantenimiento' },
  { archivo: 'REFERENCIAS-Y-NORMAS.md', pdf: 'Referencias-y-normas.pdf', titulo: 'Referencias y normas', sub: 'Marco conceptual, bibliografía y normas del proyecto' }
];

const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' });
const page = await browser.newPage();

async function aPdf(html, destino, tituloPie) {
  await page.setContent(html, { waitUntil: 'networkidle' });
  await page.emulateMedia({ media: 'print' });
  await page.pdf({
    path: destino,
    format: 'A4',
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: cabecera,
    footerTemplate: pie(tituloPie),
    margin: { top: '18mm', bottom: '16mm', left: '18mm', right: '18mm' }
  });
  console.log('PDF:', destino);
}

// 1) un PDF por manual
const partes = [];
for (const d of DOCS) {
  const md = limpiar(readFileSync(join(MAN, d.archivo), 'utf8'));
  const { html, toc } = markdown(md);
  partes.push({ ...d, html, toc });
  await aPdf(paginaHtml({ titulo: d.titulo, subtitulo: d.sub, meta: META, cuerpoHtml: html, toc }), join(SALIDA, d.pdf), `EMO-AVENTURA · ${d.titulo}`);
}

// 2) documento completo: portada general, indice general y los tres manuales
const tocGeneral = [];
const cuerpo = partes.map((p) => {
  tocGeneral.push({ nivel: 1, texto: p.titulo, id: slug(p.titulo) });
  p.toc.filter((t) => t.nivel === 2).forEach((t) => tocGeneral.push({ nivel: 2, texto: t.texto, id: t.id }));
  return `<section class="doc"><h1 id="${slug(p.titulo)}">${esc(p.titulo)}</h1><p style="color:#56657a;margin-bottom:14px">${esc(p.sub)}</p>${p.html}</section>`;
}).join('\n');
await aPdf(
  paginaHtml({ titulo: 'Documentación del proyecto', subtitulo: 'Manual de usuario · Manual de administrador · Referencias y normas', meta: META, cuerpoHtml: cuerpo, toc: tocGeneral }),
  join(SALIDA, 'EMO-AVENTURA-documentacion-completa.pdf'),
  'EMO-AVENTURA · Documentación del proyecto'
);

await browser.close();
console.log('listo');
