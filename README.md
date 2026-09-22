# EMO-AVENTURA · Isla Emociones 3D

> "Vive la aventura de descubrir el poder de tus emociones"

Mundo 3D jugable sobre reconocimiento y regulación emocional. Desde un mapa
central se entra a cinco islas y **cada una tiene una mecánica de juego distinta**,
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

En el mapa se entra a cada isla **tocándola** (arrastra para girar la vista).
Dentro de las islas que se caminan: **WASD** moverse · **SHIFT** correr ·
**SPACE** saltar · **E** interactuar (mantener pulsado donde toque) · **ESC**
pausa · **F3** medidor de rendimiento. En táctil: joystick izquierdo, arrastre
derecho para la cámara y botones de saltar/interactuar.

## Las cinco islas

| Isla | Emoción | Vista | Verbo | Reto |
|---|---|---|---|---|
| Al rojo vivo | Ira | cámara fija | **distinguir y contenerte** (go / no-go) | Las rocas caen al rojo: tocarlas quema y el volcán sube; hay que esperar a que se enfríen para atraparlas y hacer el puente. Las chispas nunca se enfrían. Al entrar dices cómo está tu enojo (bajo / medio / alto) y eso sube la dificultad. Después, sigues con el dedo las grietas de la cornisa hasta lo que las encendió; y de últimas, tres respiraciones 4-4-4-4 con unos pulmones que se mantienen pulsados y se sueltan |
| Bosque de la Noche | Miedo | 1ª persona | **explorar en la oscuridad** | Linterna con batería: correr la gasta, respirar la recarga; encender 5 faroles |
| El mundo que vuelve | Tristeza | 3ª persona | **encontrar y restaurar** | 6 fragmentos de recuerdo; cada uno hace brotar vegetación, reconstruye una estructura y añade una capa de audio |
| Las Cuevas del Desagrado | Desagrado | cámara fija | **reconocer qué te da desagrado y cómo lo nota tu cuerpo** | Menú de la isla con dos minijuegos independientes, en cualquier orden. **Nivel 1 · Las cuatro cuevas del desagrado**: una caverna con cuatro entradas (olores, sabores, imágenes, sonidos); en cada cueva aparecen seis elementos de uno en uno y se arrastran (o se toca el tótem) hacia «Me da desagrado», «Me da igual» o «Me agrada». Sin respuestas correctas; barra de progreso por cueva y mapa de cuevas completadas; la caverna de los sonidos reproduce cada sonido (≤ 3 s, botón de repetir y nombre escrito). Cierra con el resumen «De 24 elementos, X te generaron desagrado…» y el mensaje a pantalla completa con voz opcional. **Nivel 2 · El espejo de las señales**: un espejo agrietado refleja a un personaje en tres escenas; alrededor flotan ocho fragmentos con señales del cuerpo y hay que tocar solo las de desagrado (los aciertos encajan y reparan el espejo; los fallos se atenúan y explican de qué emoción era la señal). Las respuestas se guardan en localStorage bajo `emoaventura.desagrado` y se ven desde el menú («Tus respuestas») |
| La torre y el valle | Frustración | cámara fija → 3ª persona | **seguir bajo reveses** | Nivel 1, la torre: levanta una torre de 12 bloques soltándolos a tiempo mientras ráfagas de viento (que no dependen de ti) la tumban. La frustración sube con cada revés y hace temblar la mano; se regula parando, con pasos cortos o pidiendo ayuda. Nivel 2, el valle: lo que hay detrás de haber seguido; 12 orbes entre plataformas flotantes, con combo si no tocas el suelo (los orbes del antiguo Valle de la Luz) |
| El lago sereno | Calma | 1ª persona | **escuchar y bajar el ritmo** | Tres actividades en orden, cada una en su rincón: el lago espejo (sentado en el muelle, el agua revuelta se aquieta con cada exhalación hasta reflejar el cielo), ¿quién canta? (siete voces escondidas en el bosque —cinco pájaros, un sapo y un grillo— que solo cantan si te quedas quieto; se localizan escuchando y mirando hacia la voz, hay que adivinar de quién es entre opciones que describen cómo suena, sin castigo por fallar, y al acertar el animal aparece y viene a posarse cerca) y el estanque musical (nenúfares que son notas de kalimba en pentatónica: pisándolos se compone una melodía propia que la piedra del eco devuelve). Música generativa que gana capas y sonidos de agua, arroyo, hojas, campanas y siete voces distintas (el colibrí no canta: zumban sus alas) |

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
│   ├── sadness/SadnessHouseGame.js  joy/JoyOrbsGame.js (nivel 2 de la frustracion)
│   ├── frustration/FrustrationTowerGame.js (+ FrustrationIslandFlow.js)   calm/CalmLakeGame.js
│   ├── disgust/DisgustIslandFlow.js (menú) · DisgustCavesGame.js (nivel 1) · DisgustMirrorGame.js (nivel 2)
│   │   ├── DesagradoTextos.js   cuevas, elementos, señales, escenas y textos (editable)
│   │   ├── desagradoAssets.js   assets generados por código (PLACEHOLDER_*), desagradoSonidos.js (audio sintetizado)
│   │   └── desagradoStore.js (localStorage «emoaventura.desagrado») · desagradoUi.js (guía, anclas)
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
actividades, intensidades, reevaluaciones e islas completadas. Cada isla 3D
entrega sus herramientas al cruzar el portal; el progreso que ve el jugador son
las islas completadas y los puntos (no hay insignias). **Todas las islas
están abiertas desde el principio**: se puede entrar a cualquiera sin haber
jugado otra antes. El orden Miedo → Ira → Desagrado solo numera los capítulos
de la aventura; las cinco islas cuentan en el contador del mapa y en Mi progreso.
Al terminar una isla se puede **volver a jugar** desde la pantalla de cierre, sin
pasar por el mapa.

## Añadir una isla

1. Crea la clase extendiendo `MinigameBase` e implementa `build()`, `onUpdate(dt)`
   y `onReset()`.
2. Llama `this.openPortal(pos)` al superar el reto y `this.finish()` al cruzarlo.
3. Regístrala en `src/minigames/index.js` y apunta la isla en `src/data/islands.js`.
