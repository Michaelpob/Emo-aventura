// PANEL DE ADMINISTRACION · graficas (Chart.js)
//
// Chart.js solo se carga en esta pagina, nunca en el juego.
// Regla de accesibilidad del proyecto: el color NUNCA es la unica senal.
// Enojo (#c0392b) y Frustracion (#c9471f) se parecen, asi que las etiquetas
// llevan siempre emoji y nombre, y la Frustracion ademas va con rayas.

import {
  Chart,
  BarController, BarElement,
  LineController, LineElement, PointElement,
  DoughnutController, ArcElement,
  CategoryScale, LinearScale, TimeSeriesScale,
  Tooltip, Legend, Filler
} from 'chart.js';

Chart.register(
  BarController, BarElement,
  LineController, LineElement, PointElement,
  DoughnutController, ArcElement,
  CategoryScale, LinearScale, TimeSeriesScale,
  Tooltip, Legend, Filler
);

Chart.defaults.font.family = 'Inter, ui-sans-serif, system-ui, "Segoe UI", sans-serif';
Chart.defaults.color = '#43606f';
Chart.defaults.plugins.legend.labels.usePointStyle = true;
Chart.defaults.plugins.legend.labels.boxWidth = 10;

/** Trama de rayas para la Frustracion (se distingue sin depender del color) */
function tramaRayas(color) {
  const c = document.createElement('canvas');
  c.width = 8; c.height = 8;
  const ctx = c.getContext('2d');
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 8, 8);
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(-2, 8); ctx.lineTo(8, -2);
  ctx.moveTo(2, 10); ctx.lineTo(10, 2);
  ctx.stroke();
  return ctx.createPattern(c, 'repeat');
}

const vivos = new Map();

function pintar(id, config) {
  const lienzo = document.getElementById(id);
  if (!lienzo) return null;
  vivos.get(id)?.destroy();
  const g = new Chart(lienzo, config);
  vivos.set(id, g);
  return g;
}

export function destruirGraficas() {
  vivos.forEach((g) => g.destroy());
  vivos.clear();
}

const ejeY = (titulo) => ({
  beginAtZero: true,
  ticks: { precision: 0 },
  title: { display: true, text: titulo, font: { weight: '700' } },
  grid: { color: 'rgba(16,44,54,0.08)' }
});

/* 5a · visitas por isla ---------------------------------------------------- */
export function graficaVisitasPorIsla(filas) {
  return pintar('g-visitas-isla', {
    type: 'bar',
    data: {
      labels: filas.map((f) => `${f.emoji} ${f.nombre}`),
      datasets: [{
        label: 'Visitas',
        data: filas.map((f) => f.visitas),
        backgroundColor: filas.map((f) => (f.id === 'frustration' ? tramaRayas(f.color) : f.color)),
        borderColor: filas.map((f) => f.color),
        borderWidth: 1,
        borderRadius: 6
      }]
    },
    options: {
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: (c) => `${c.parsed.y} visitas` } }
      },
      scales: { y: ejeY('Visitas'), x: { grid: { display: false } } }
    }
  });
}

/* 5b · iniciadas vs completadas ------------------------------------------- */
export function graficaPartidas(filas) {
  return pintar('g-partidas', {
    type: 'bar',
    data: {
      labels: filas.map((f) => `${f.emoji} ${f.nombre}`),
      datasets: [
        {
          label: 'Partidas iniciadas',
          data: filas.map((f) => f.iniciadas),
          backgroundColor: 'rgba(16,44,54,0.22)',
          borderColor: '#102c36',
          borderWidth: 1,
          borderRadius: 6
        },
        {
          label: 'Partidas completadas',
          data: filas.map((f) => f.completadas),
          backgroundColor: filas.map((f) => (f.id === 'frustration' ? tramaRayas(f.color) : f.color)),
          borderColor: filas.map((f) => f.color),
          borderWidth: 1,
          borderRadius: 6
        }
      ]
    },
    options: {
      maintainAspectRatio: false,
      plugins: {
        tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${c.parsed.y}` } }
      },
      scales: { y: ejeY('Partidas'), x: { grid: { display: false } } }
    }
  });
}

/* 5c · visitas por dia ----------------------------------------------------- */
export function graficaPorDia(dias, series) {
  return pintar('g-dias', {
    type: 'line',
    data: {
      labels: dias,
      datasets: series.map((s) => ({
        label: s.total ? 'Total' : `${s.emoji} ${s.nombre}`,
        data: s.datos,
        borderColor: s.total ? '#102c36' : s.color,
        backgroundColor: s.total ? 'rgba(16,44,54,0.08)' : s.color,
        borderWidth: s.total ? 3 : 2,
        borderDash: s.id === 'frustration' ? [6, 4] : [],
        pointRadius: 2.5,
        pointHoverRadius: 5,
        tension: 0.3,
        fill: Boolean(s.total)
      }))
    },
    options: {
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { position: 'bottom' },
        tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${c.parsed.y} visitas` } }
      },
      scales: {
        y: ejeY('Visitas'),
        x: { title: { display: true, text: 'Día', font: { weight: '700' } }, grid: { display: false } }
      }
    }
  });
}

/* 5d · por hora del dia ---------------------------------------------------- */
export function graficaPorHora(valores) {
  return pintar('g-horas', {
    type: 'bar',
    data: {
      labels: valores.map((_, h) => `${String(h).padStart(2, '0')} h`),
      datasets: [{
        label: 'Visitas',
        data: valores,
        backgroundColor: '#2f7fb5',
        borderRadius: 6
      }]
    },
    options: {
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { title: (c) => `A las ${c[0].label}`, label: (c) => `${c.parsed.y} visitas` } }
      },
      scales: {
        y: ejeY('Visitas'),
        x: { title: { display: true, text: 'Hora del día (America/Bogotá)', font: { weight: '700' } }, grid: { display: false } }
      }
    }
  });
}

/* 5e · dispositivos -------------------------------------------------------- */
const NOMBRE_DISPOSITIVO = { mobile: '📱 Móvil', tablet: '🖥️ Tableta', desktop: '💻 Escritorio' };

export function graficaDispositivos(filas) {
  return pintar('g-dispositivos', {
    type: 'doughnut',
    data: {
      labels: filas.map((f) => NOMBRE_DISPOSITIVO[f.device] ?? f.device),
      datasets: [{
        data: filas.map((f) => f.sesiones),
        backgroundColor: ['#2f7fb5', '#f5a524', '#2e9e6b', '#5947a5'],
        borderColor: '#fff',
        borderWidth: 2
      }]
    },
    options: {
      maintainAspectRatio: false,
      cutout: '58%',
      plugins: {
        legend: { position: 'bottom' },
        tooltip: {
          callbacks: {
            label: (c) => {
              const total = c.dataset.data.reduce((a, b) => a + b, 0) || 1;
              return `${c.label}: ${c.parsed} sesiones (${Math.round((c.parsed / total) * 100)} %)`;
            }
          }
        }
      }
    }
  });
}

/* detalle por isla (dentro de su tarjeta) --------------------------------- */
export function graficaIsla(idLienzo, dias, datos, color) {
  return pintar(idLienzo, {
    type: 'line',
    data: {
      labels: dias,
      datasets: [{
        label: 'Visitas',
        data: datos,
        borderColor: color,
        backgroundColor: `${color}22`,
        borderWidth: 2,
        pointRadius: 2,
        tension: 0.3,
        fill: true
      }]
    },
    options: {
      maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => `${c.parsed.y} visitas` } } },
      scales: { y: { beginAtZero: true, ticks: { precision: 0 } }, x: { grid: { display: false } } }
    }
  });
}

export { NOMBRE_DISPOSITIVO };
