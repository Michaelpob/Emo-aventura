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

// Contador de visitas invisible: sigue contando cada carga del link sin mostrar
// texto. Va en modo no-cors porque no leemos la respuesta y asi no ensucia la
// consola con un error de CORS en cada carga.
fetch('https://abacus.jasoncameron.dev/hit/michaelpob-isla-emociones-3d', {
  mode: 'no-cors',
  cache: 'no-store'
}).catch(() => {});
