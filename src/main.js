import './styles.css';
import './styles/emo.css';
import './styles/animations.css';
import './styles/fear.css';
import './styles/joy.css';
import './styles/disgust.css';
import './styles/island3d.css';
import './styles/fear-house.css';
import './styles/responsive.css';
import { EmotionIslandApp } from './ui/EmotionIslandApp.js';

const root = document.querySelector('#app');
const app = new EmotionIslandApp(root);

app.start();

// Punto de entrada para depuracion y pruebas automatizadas del recorrido.
window.emoAventura = app;

// Version nueva publicada y navegador con el index.html viejo en cache (pasa
// sobre todo en el movil): se comprueba version.json sin cache y, si no
// coincide con este build, se vuelve a cargar con una URL nueva para saltarse
// la copia guardada. Solo una vez por sesion, por si algo fallara.
const BUILD = typeof __BUILD__ === 'string' ? __BUILD__ : 'dev';
if (BUILD !== 'dev') {
  fetch(`version.json?t=${Date.now()}`, { cache: 'no-store' })
    .then((r) => (r.ok ? r.json() : null))
    .then((v) => {
      if (!v?.build || v.build === BUILD) return;
      const key = 'emo-aventura-recarga';
      if (sessionStorage.getItem(key) === v.build) return;
      sessionStorage.setItem(key, v.build);
      const url = new URL(location.href);
      url.searchParams.set('v', v.build);
      location.replace(url.toString());
    })
    .catch(() => {});
}

// Contador de visitas invisible: sigue contando cada carga del link sin mostrar
// texto. Va en modo no-cors porque no leemos la respuesta y asi no ensucia la
// consola con un error de CORS en cada carga.
fetch('https://abacus.jasoncameron.dev/hit/michaelpob-isla-emociones-3d', {
  mode: 'no-cors',
  cache: 'no-store'
}).catch(() => {});
