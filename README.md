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
| Al rojo vivo | Ira | cámara fija | **distinguir y contenerte** (go / no-go) | Las rocas caen al rojo: tocarlas quema y el volcán sube; hay que esperar a que se enfríen para atraparlas y hacer el puente. Las chispas nunca se enfrían. Al entrar dices cómo está tu enojo (bajo / medio / alto) y eso sube la dificultad. Después, sigues con el dedo las grietas de la cornisa hasta lo que las encendió; y de últimas, tres respiraciones 4-4-4-4 con unos pulmones que se mantienen pulsados y se sueltan |
| Bosque de la Noche | Miedo | 1ª persona | **explorar en la oscuridad** | Linterna con batería: correr la gasta, respirar la recarga; encender 5 faroles |
| El mundo que vuelve | Tristeza | 3ª persona | **encontrar y restaurar** | 6 fragmentos de recuerdo; cada uno hace brotar vegetación, reconstruye una estructura y añade una capa de audio |
| Valle de la Luz | Alegría | 3ª persona | **saltar y recoger** | 12 orbes entre plataformas flotantes, con combo si no tocas el suelo |
| Guardianes del Desagrado | Asco | 1ª persona | **reconocer, medir y responder** | Cuatro etapas en orden, cada una en su propio entorno: termómetro (se sube por terrazas y cambia el mundo), dos zonas donde los estímulos se responden con el cuerpo (alejarse = sí me genera desagrado), Espejo de las Reacciones (pisar baldosas) y La Reacción Impulsiva, que crece si corres, saltas o chocas y se encoge usando los altares: cada letrero dice qué hacer y cada altar enseña una técnica (respirar, sostener la sensación, la puerta del pensamiento equilibrado, pedir apoyo al Guardián) y da su recompensa; las Mariposas de color y el sendero 5-4-3-2-1 se juegan completos en su propio claro la primera vez y luego como repaso breve junto al altar |
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
│   ├── anger/AngerLavaGame.js (+ AngerCracksStage.js)   fear/FearNightGame.js
│   ├── sadness/SadnessHouseGame.js  joy/JoyOrbsGame.js
│   ├── disgust/DisgustSortGame.js     surprise/SurpriseObserveGame.js
│   └── index.js                        registro de minijuegos
├── data/       islands · gameState · tools · player
├── three/      mapa 3D principal (hub)
├── ui/         EmotionIslandApp · screens
└── styles/     island3d.css + estilos de las pantallas
```

`docs/PLAN-GAMEPLAY.md` documenta la auditoría, lo implementado en cada fase, el
checklist de verificación y las medidas de rendimiento por isla.

## Valle de la Luz · alegría de intensidad alta (juego aparte, un solo archivo)

`public/valle-luz/index.html` es un serious game autocontenido (HTML + CSS + JS,
canvas 2D y Web Audio, sin dependencias) con los dos mini-juegos de la etapa de
alegría intensa: **Disfruta sin perder el control** (DETENERSE → OBSERVAR →
APRECIAR → CONTINUAR) y **Utiliza tu energía** (ACTIVAR → DIRIGIR → ACTUAR →
COMPLETAR, con tres rutas), más la selección de estrategia, la caja de
herramientas, la reevaluación de intensidad y la retroalimentación. Se abre con
doble clic o, publicado, en `valle-luz/` junto al juego principal
(`?rapido=1` acorta los umbrales para probarlo). La cabecera del archivo trae
el mapa mecánica → fase → constructo y las instrucciones de prueba; la
telemetría queda en `sessionLog` / `sessionLogs` (consola).

## Valle de la Bruma · tristeza (juego aparte, un solo archivo)

`public/valle-bruma/index.html` es el serious game autocontenido de la Isla de
la Tristeza (HTML + CSS + JS, canvas 2D y Web Audio, sin dependencias), diseñado
como opuesto mecánico del Valle de la Luz: sin reloj, sin reflejos, sin
plataformas; el ritmo lo marca quien juega. Trae los dos mini-juegos:
**El río de las palabras** (SENTIR → NOMBRAR → NARRAR → SOLTAR: fichas de
matiz arrastrables, plantilla de frase con texto libre y un barco de papel
que se deja ir, se guarda o se relee; releerlo tres veces seguidas estanca el
río y abre la rama de rumia, siempre sin castigo) y **El sendero de los pasos
pequeños** (DETECTAR → ELEGIR → ACTUAR → REGISTRAR: cartas de acción por
turnos donde la energía se *recupera* al actuar, con racha de pasos pequeños,
carta grande "a medias" y DESCANSAR siempre disponible), más la selección de
estrategia, la caja de herramientas, la reevaluación y la retroalimentación.
Se abre con doble clic o, publicado, en `valle-bruma/` (`?intensidad=BAJA|MEDIA|ALTA`
fija la intensidad de llegada; `?rapido=1` acorta el sendero). La cabecera del
archivo trae el mapa mecánica → fase → constructo, la nota de diferencias con
Alegría y las instrucciones de prueba; la telemetría queda en `sessionLog` /
`sessionLogs` (consola).

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
