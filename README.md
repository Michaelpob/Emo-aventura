# EMO-AVENTURA · Isla Emociones 3D

> "Vive la aventura de descubrir el poder de tus emociones"

Mundo 3D jugable sobre reconocimiento y regulación emocional. Desde un mapa
central se entra a seis islas y **cada una tiene una mecánica de juego distinta**,
derivada de la emoción que representa. Nada de "texto + botón + barra de
progreso": se juega moviéndose, mirando, empujando, saltando y sosteniendo.

**Principio pedagógico:** ninguna emoción es mala; regular no es dejar de sentir;
ninguna decisión del jugador resta puntos, vidas ni progreso. No hay *game over*,
solo reintento.

## Ejecutar

```bash
pnpm install
pnpm dev        # servidor de desarrollo con recarga en caliente (localhost:5173)
pnpm build      # build de produccion -> /docs (lo que publica GitHub Pages)
pnpm preview    # compila y sirve el build
```

Si en alguna maquina no hay Node, `python scripts/build-docs.py` genera un
`/docs` equivalente (importmap + three copiado de `node_modules`), sin minificar.

Controles: **WASD** moverse · **SHIFT** correr · **SPACE** saltar · **E**
interactuar (mantener pulsado donde toque) · **ESC** pausa · **F3** medidor de
rendimiento. En táctil: joystick izquierdo, arrastre derecho para la cámara y
botones de saltar/interactuar.

## Las seis islas

| Isla | Emoción | Vista | Verbo | Reto |
|---|---|---|---|---|
| Al rojo vivo | Ira | cámara fija | **distinguir y contenerte** (go / no-go) | Las rocas caen al rojo: tocarlas quema y el volcán sube; hay que esperar a que se enfríen para atraparlas y hacer el puente. Las chispas nunca se enfrían. Al entrar dices cómo está tu enojo (bajo / medio / alto) y eso sube la dificultad |
| Bosque de la Noche | Miedo | 1ª persona | **explorar en la oscuridad** | Linterna con batería: correr la gasta, respirar la recarga; encender 5 faroles |
| El mundo que vuelve | Tristeza | 3ª persona | **encontrar y restaurar** | 6 fragmentos de recuerdo; cada uno hace brotar vegetación, reconstruye una estructura y añade una capa de audio |
| Valle de la Luz | Alegría | 3ª persona | **saltar y recoger** | 12 orbes entre plataformas flotantes, con combo si no tocas el suelo |
| Guardianes del Desagrado | Asco | 1ª persona | **manipular y ordenar** | Empujar objetos con el cuerpo a su contenedor en 4 zonas y activar las válvulas |
| El jardín que cambia | Sorpresa | 1ª persona | **observar** | Algo cambia siempre fuera de tu campo de visión: date cuenta y acércate |

Al superar cada reto se abre un **portal físico** en la escena que el jugador
cruza por su propia voluntad: no hay pantalla de "minijuego completado".
La explicación psicoeducativa está en una **tarjeta final opcional**.

## Estructura

```
src/
├── engine/                núcleo 3D compartido
│   ├── PlayerController.js   WASD, pointer lock, 3ª persona, gravedad, colisiones
│   ├── Interactable.js       radio de activación, chip [E], realce
│   ├── MinigameBase.js       init/start/update/pause/reset/dispose + HUD + portal
│   ├── Feedback.js           partículas con pooling, flash, shake, tweens
│   ├── AudioBus.js           sonidos sintetizados, PositionalAudio, ducking
│   ├── worldkit.js           terreno, InstancedMesh, cielo, luces, avatar
│   ├── Stage.js              motor 2D (tarjetas psicoeducativas)
│   └── activities.js         actividades 2D reutilizables
├── minigames/
│   ├── anger/AngerLavaGame.js         fear/FearNightGame.js
│   ├── sadness/SadnessRestoreGame.js  joy/JoyOrbsGame.js
│   ├── disgust/DisgustSortGame.js     surprise/SurpriseObserveGame.js
│   └── index.js                        registro de minijuegos
├── data/       islands · gameState · tools · player
├── three/      mapa 3D principal (hub)
├── ui/         EmotionIslandApp · screens
└── styles/     island3d.css + estilos de las pantallas
```

`docs/PLAN-GAMEPLAY.md` documenta la auditoría, lo implementado en cada fase, el
checklist de verificación y las medidas de rendimiento por isla.

## Progreso y recompensas

`src/data/gameState.js` guarda en `localStorage` puntos, herramientas,
insignias, actividades, intensidades, reevaluaciones y desbloqueos. Cada isla 3D
entrega sus herramientas y su insignia al cruzar el portal. **Todas las islas
están abiertas desde el principio**: se puede entrar a cualquiera sin haber
jugado otra antes. El orden Miedo → Alegría → Ira → Desagrado solo numera los
capítulos de la aventura; Tristeza y Sorpresa van aparte.

## Añadir una isla

1. Crea la clase extendiendo `MinigameBase` e implementa `build()`, `onUpdate(dt)`
   y `onReset()`.
2. Llama `this.openPortal(pos)` al superar el reto y `this.finish()` al cruzarlo.
3. Regístrala en `src/minigames/index.js` y apunta la isla en `src/data/islands.js`.
