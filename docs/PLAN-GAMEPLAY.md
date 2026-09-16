# PLAN-GAMEPLAY · Isla Emociones 3D → mundo 3D jugable

**Fase 0 · Auditoría del proyecto existente** (actualizado en cada fase con lo realmente implementado)

---

## 0.1 Verificación de arranque

| Comprobación | Resultado |
|---|---|
| `pnpm install` / `pnpm dev` | ✅ **Node 24.19.0 instalado durante el trabajo.** `pnpm dev` levanta el servidor de vite con recarga en caliente; `pnpm build` genera el `/docs` de produccion. Antes de instalarlo se usó `scripts/build-docs.py` (sigue disponible como alternativa sin Node). |
| Arranque sin errores | **Sí.** Consola limpia salvo el contador de visitas externo (`abacus.jasoncameron.dev`), que da CORS al servir desde `127.0.0.1` y funciona en el dominio real. |
| Flujo completo recorrido | menú → perfil → mapa 3D → isla (bloqueada / disponible) → minijuego → salida → desbloqueo → caja de herramientas / progreso / final. Todo funciona. |

> Cuando haya Node, `pnpm build` (vite) sustituye a `scripts/build-docs.py` sin cambios en el código.

---

## 0.2 Estado actual por isla

Las emociones son exactamente las de `src/data/islands.js`: **joy, sadness, anger, fear, disgust, surprise**.

| Isla | Emoción | Mecánica actual | Problema | Nueva mecánica | Objetivo | Recompensa |
|---|---|---|---|---|---|---|
| **Isla del Miedo** (`fear`) | Miedo | `FearIslandGame` (overlay DOM): diálogos + panel de respiración (mantener pulsado) + espejo de pensamientos (elegir opción) + puente (ordenar 5 botones) | Todo ocurre en paneles HTML sobre un mapa 3D estático. El verbo real es *leer y pulsar*. La oscuridad es una capa CSS, no un espacio que se recorra | **Primera persona.** Linterna con batería: correr la agota, detenerse y respirar la recarga. Encender 5 faroles repartidos en un bosque oscuro con sustos suaves (sombra que cruza, sonido) | Encender los 5 faroles antes de quedarse sin luz — se puede reintentar siempre | Lupa de la Realidad + Aliento del Refugio + Puente de los Pasos Pequeños (se conservan) · insignia Guardián del Miedo |
| **Valle de la Luz** (`joy`) | Alegría | `JoyValleyGame` (overlay DOM): 7 estrategias, cada una es un panel de botones/secuencias | Mismo patrón que Miedo con otro color. Cero movimiento del jugador | **Tercera persona.** Plataformas flotantes y orbes de luz que se recogen saltando y corriendo; cada orbe añade color, partículas, capas de música y vegetación al valle. Combo si encadenas recogidas sin tocar el suelo | Recoger los orbes y elevar el valle a su versión luminosa | Rayo de Alegría, Estrella del Disfrute, Rayo de Energía… (se conservan) · insignia Guardián de la Alegría |
| **Volcán de las Emociones** (`anger`) | Enojo | `BreathingCalmGame` (overlay DOM, 2D). `volcano-control` quedó registrado pero sin isla asignada | **Isla incompleta** según el documento: se trata como trabajo nuevo, no como refactor | **Primera persona.** El entorno se agita (objetos que levitan, niebla roja, temblor de cámara, música en ascenso). 4 focos de tensión; en cada uno respiración sostenida 4-4-4-4 manteniendo pulsado. Soltar antes de tiempo rompe la esfera y se reintenta al instante, sin castigo | Apagar los 4 focos y devolver el volcán a la calma | Gota de Calma · insignia Guardián de la Ira |
| **Guardianes del Desagrado** (`disgust`) | Asco | `DisgustGuardiansGame` (overlay DOM): 4 zonas, espejo, termómetro, 6 estrategias en paneles | Igual que las anteriores: elegir opciones en tarjetas | **Manipular y ordenar.** Cuatro zonas contaminadas: empujar objetos físicamente a su contenedor, activar mecanismos, decidir qué se conserva y qué se descarta | Limpiar las 4 zonas | Cristal de Calma, Semilla de Aceptación, Estrella del Presente… (se conservan) · insignia Guardián del Desagrado |
| **Isla de la Tristeza** (`sadness`) | Tristeza | `ComingSoonGame` (panel vacío) | **En desarrollo**: trabajo nuevo | Mundo gris, con niebla densa y sin ambiente sonoro. Fragmentos de recuerdo esparcidos; cada uno recogido transforma el escenario (brota vegetación, cambia el cielo, entra una capa de audio). El progreso se ve en el paisaje, no en una barra | Recoger los fragmentos y restaurar la isla | Cristal del Recuerdo Positivo · (isla fuera de la cadena de desbloqueo actual) |
| **Isla de la Sorpresa** (`surprise`) | Sorpresa | `ComingSoonGame` (panel vacío) | **En desarrollo**: trabajo nuevo | El escenario cambia cuando el jugador no mira; hay que detectar qué cambió y acercarse a ello | Detectar los cambios | Por definir |

**Verbos resultantes (uno por isla, sin repetir):** explorar en la oscuridad · saltar y recoger · mantener bajo presión · manipular y ordenar · encontrar y restaurar · observar.

---

## 0.3 Cómo funciona hoy el proyecto

### `src/data/gameState.js` — guardado de progreso
Objeto único `gameState` persistido en `localStorage` bajo `emo-aventura-state`:
`currentIsland, unlockedIslands, completedIslands, emotionalPoints, rewards, badges, tools, currentIntensity, initialIntensity, finalIntensity, selectedStrategy, completedActivities, progress, reevaluations, settings{sound, reduceMotion}`.
API: `loadProgress/saveProgress/resetGame`, `addPoints`, `completeActivity`, `addReward`, `addBadge`, `unlockIsland`, `completeIsland` (marca, da insignia y desbloquea la siguiente), `isUnlocked`, `allIslandsCompleted`, `changeIntensity/setInitialIntensity/setStrategy/recordReevaluation`, `getProgressSummary`, `setSetting`, `prefersReducedMotion`.
Cadena de desbloqueo: `ISLAND_CHAIN = ['fear','joy','anger','disgust']`; `FREE_ISLANDS = ['sadness','surprise']` (visibles, sin candado).
**Se conserva tal cual.** El 3D no cambia el guardado: cada isla sigue llamando a las mismas funciones.

### `src/data/islands.js` — registro de islas
Array con `id, name, displayName, emoji, subtitle, chapter, badge, reward, palette{land,accent,foliage,glow,ui}, position[x,y,z], radius, height, minigame`. `minigameLabels` mapea la clave del minijuego a su nombre visible.
El campo `minigame` es la clave que busca `src/minigames/index.js`. **Añadir una isla 3D = cambiar esa clave**, nada más.

### `src/ui/EmotionIslandApp.js` — navegación
Estados: `start → profile → map → island → game → result`. Monta `WorldScene` (mapa 3D con las 6 islas, WASD + E) en `.scene-host` y todas las pantallas HTML en `.overlay-root`.
`launchMinigame(island)` instancia `new Game({ host, island, player, onComplete, onExit, onOpenToolbox })` y llama `mount()`. `exitMinigame()` llama `dispose()`.
`showResult(result)` es el punto donde se cierra el ciclo: con `success:true` marca la isla, entrega insignia, desbloquea la siguiente y muestra la pantalla de isla completada (o la final si están las 4).
**Contrato que debe respetar todo minijuego nuevo:** `mount()`, `dispose()`, y llamar `onComplete({ islandId, success:true, emoAventura:true, badge, title, message })`.

### `src/engine/Stage.js` — entrada/salida de escena (2D)
Motor de las islas actuales: crea el DOM del juego (capas de escenario, personaje, HUD, capas de diálogo/panel/overlay/toast), primitivas `say/choices/panel/reward/toast/showFeedback`, `walkTo/setCharacterState`, `setScene/setIntensity/setAmbient`, partículas, transiciones y `playTone` (WebAudio).
Gestiona el aborto: `dispose()` rechaza todas las promesas pendientes con `ABORTED` y limpia timers, para que salir a mitad de partida no deje residuo.
**No desaparece**: sigue sirviendo para las tarjetas psicoeducativas opcionales del cierre. Deja de ser el lugar donde se juega.

### `src/engine/activities.js` — minijuegos 2D reutilizables
10 actividades (`startBreathingExercise`, `startReevaluationGame`, `signalMirror`, `sequenceActivity`, `startExposureGame`, `startAttentionGame`, `startGroundingGame`, `intensityThermometer`, `alternativeStrategyNotice`, `reevaluationScreen`). Todas devuelven promesa y ninguna penaliza.
**Destino:** el contenido psicoeducativo (intensidad, reevaluación, estrategias) se conserva, pero pasa a la tarjeta final opcional; el reto en sí se juega en 3D.

### `src/three/WorldScene.js` — mapa principal
Escena Three.js del archipiélago: renderer con ACES + sombras PCF, cielo con gradiente, océano con shader de olas, islas low-poly (`createIslandMesh.js`), jugador con movimiento WASD, cámara orbital con drag, `EffectComposer` + `UnrealBloomPass` + viñeta, `setCompleted()` (insignia flotante) y `setLocked()` (desaturado + candado 🔒).
**Se conserva como hub.** Las islas 3D se montan como escenas propias sobre el mismo host.

---

## 0.4 Riesgos y decisiones declaradas

1. **Sin Node en la máquina.** El build de producción se genera con `scripts/build-docs.py` (equivalente al de vite: mismo `docs/`, importmap + three de `node_modules`). `pnpm build` seguirá funcionando donde haya Node.
2. **Sin assets externos.** No hay imágenes, modelos ni audio en el repo. El audio se sintetiza con WebAudio (osciladores + ruido filtrado) y la geometría es low-poly procedural, como el resto del proyecto.
3. **El contenido psicoeducativo no se borra.** Herramientas, insignias, puntos, intensidad y reevaluación siguen existiendo; cambia dónde ocurren: fuera del camino crítico del juego, en tarjetas opcionales al final de cada isla.
4. **Tristeza y Sorpresa** no están en `ISLAND_CHAIN`. Se implementan como islas jugables y se decide su lugar en la cadena al integrarlas.

---

## Estado de implementación

| Fase | Estado |
|---|---|
| 0 · Auditoría | ✅ este documento |
| 1 · Núcleo 3D compartido | ✅ `PlayerController` · `Interactable` · `MinigameBase` · `Feedback` · `AudioBus` · `worldkit` |
| 2 · Una mecánica por isla | ✅ las 6 islas, con un verbo distinto cada una |
| 3 · UI, feedback y progreso | ✅ para las islas 3D ya migradas |
| 4 · Transiciones y cierre | ✅ portal físico + tarjeta final opcional |
| 5 · Audio | ✅ capas sintetizadas + PositionalAudio + ducking |

---

## Fase 1 · Núcleo 3D implementado

| Archivo | Qué aporta |
|---|---|
| `src/engine/PlayerController.js` | WASD relativo a cámara, mouse look con Pointer Lock (1ª persona) y órbita de seguimiento (3ª persona), SPACE saltar, SHIFT correr, E interactuar, gravedad + groundCheck, colisiones cilindro↔AABB/esfera con deslizamiento, límites invisibles, aceleración/frenado suavizados, head-bob e inercia. Eventos `jump/step/land/interact`. |
| `src/engine/Interactable.js` | `Interactable` (radio, icono, callbacks `onEnter/onExit/onInteract`, realce por escala + emisivo) y `InteractableManager` (proximidad + orientación de cámara, chip `[E]` sin párrafos). |
| `src/engine/MinigameBase.js` | Ciclo `init/start/update/pause/reset/dispose`. Renderer (ACES, sombras PCF 1024, `shadowMap.autoUpdate=false`), escena, cámara, bucle, HUD mínima, controles táctiles, menú de pausa (ESC), portal de salida, tarjeta final opcional, medidor de FPS (F3) y `dispose()` que libera geometrías, materiales, texturas, listeners, rAF, timers y contexto WebGL. |
| `src/engine/Feedback.js` | Partículas con pooling en un único `InstancedMesh`, flash de luz, shake de cámara, tweens de color (niebla/cielo/luz) y de valor. Cero `new` por frame. |
| `src/engine/AudioBus.js` | Sonidos generados por código (osciladores + ruido filtrado) cacheados como `AudioBuffer`; eventos, capas ambientales en bucle, `THREE.PositionalAudio` en el mundo y ducking al concentrarse. |
| `src/engine/worldkit.js` | Terreno con relieve determinista (la misma función alimenta la malla y el groundCheck), `InstancedMesh` para vegetación/rocas, cielo con gradiente por shader, luces con una sola sombra por escena y avatar low-poly para 3ª persona. |

`MinigameBase.step(dt)` acepta un delta explícito: permite avanzar el juego de forma determinista en pruebas automatizadas, sin depender de `requestAnimationFrame`.

## Fase 2 · Isla del Enojo (implementada)

`src/minigames/anger/AngerVolcanoGame.js` · primera persona · verbo **mantener bajo presión**.

- El mundo es la barra de progreso: `tension` (1 → 0) controla niebla, color del cielo, brillo del cráter y de las grietas, opacidad de la lava, amplitud de las rocas que levitan, temblor de cámara, volumen del retumbo y **la velocidad del jugador** (con ira alta camina más lento).
- 4 focos de tensión repartidos por el terreno; cada uno se activa con `[E]` y pide una respiración **4-4-4-4** manteniendo pulsado (clic, E o botón táctil). La esfera crece al inhalar, se sostiene y baja al exhalar.
- Soltar durante *inhala* o *sostén* rompe la esfera: partículas, temblor, sonido suave y reintento inmediato. **Sin texto de fallo y sin castigo.** Si el jugador sigue pulsando durante *exhala*, la fase espera y aparece `SUELTA` (tampoco penaliza).
- Al apagar un foco su cristal pasa de rojo a azul, baja el temblor y la niebla vira. Con los 4 apagados el volcán se calma y **se abre un portal físico**: el jugador camina hasta él y lo cruza por su propia voluntad.
- Recompensa: Gota de Calma + insignia Guardián de la Ira. La explicación psicoeducativa está en la tarjeta final, que se puede leer o saltar.

**Verificado:** gravedad y aterrizaje, movimiento, colisión contra el cono del volcán, límites del mapa, chip `[E]`, rotura y reintento de la respiración, los 4 focos, apertura del portal, cierre completo con insignia y desbloqueo, y `dispose()` sin fugas (3 ciclos montar/liberar: 30 geometrías, 1 textura, 7 programas y 29 draw calls idénticos, 0 canvas huérfanos).


## Fase 2 · Isla del Miedo (implementada)

`src/minigames/fear/FearNightGame.js` · primera persona · verbo **explorar en la oscuridad**.

- **Linterna con batería** montada en la cámara. Correr la gasta ~3,4× más rápido que caminar (medido: 0,186 vs 0,054 en 3 s); detenerse y mantener pulsado activa la respiración y la recarga. Con poca batería la luz parpadea.
- **Quedarse a oscuras no es perder**: el bosque se apaga, aparece `PÁRATE Y RESPIRA`, el jugador va más lento y basta respirar para recuperar la luz. Sin pantalla de fallo.
- **5 faroles** repartidos por el bosque; cada uno encendido aclara la niebla, sube la luz ambiental y devuelve algo de batería.
- **Sustos suaves**: cada 16-30 s una silueta cruza a media distancia, con un sonido grave y un temblor mínimo; aparece y se desvanece sola. Nunca salta encima ni bloquea.
- Con los 5 faroles **amanece**: la niebla se abre, el cielo vira a naranja y se abre el portal.
- 150 árboles en dos `InstancedMesh` (tronco y copa) + 260 matas: 12 draw calls, ~14.800 triángulos.

**Verificado:** aterrizaje, gasto y recarga de batería, estado de oscuridad y recuperación, colisión contra troncos (el jugador se detiene a 0,8 m), los 5 faroles, amanecer, portal, tarjeta final e insignia.

## Fase 2 · Isla de la Tristeza (implementada)

`src/minigames/sadness/SadnessRestoreGame.js` · **tercera persona** · verbo **encontrar y restaurar**.

- El mundo arranca gris, con niebla densa y **sin capas de audio**: solo el viento del propio jugador.
- **6 fragmentos de recuerdo** flotando. Cada uno recogido dispara cuatro cosas a la vez:
  1. una **onda de vegetación** que brota desde el fragmento (hierba, flores y árboles que ya existían con escala 0 y crecen con retardo según la distancia);
  2. una **estructura caída que se reconstruye** pieza a pieza;
  3. una **capa de audio** nueva (pad, agua, viento, campanas);
  4. cielo, niebla, luz, color del suelo y color del propio avatar un paso más cálidos.
- **No hay barra de progreso**: el paisaje es el progreso. Los puntos del HUD solo cuentan fragmentos.
- Cada recuerdo se nombra en 3-4 palabras (`UNA TARDE DE LLUVIA`), nunca en párrafos.
- Con los 6 recogidos el mundo florece y se abre el portal.

Tristeza y Sorpresa tienen ahora insignia propia (Guardián de la Tristeza 💧, Guardián de la Sorpresa ✨) y la pantalla de isla completada funciona también para las islas fuera de la cadena de desbloqueo.

**Verificado:** tercera persona con avatar animado, recogida de los 6 fragmentos, brote de vegetación, reconstrucción de las 6 estructuras, 4 capas de audio, transición completa del color, portal, tarjeta final e insignia. 15 draw calls, ~12.700 triángulos.

### Mejora de build
`scripts/build-docs.py` añade un sello de versión (`?v=AAAAMMDDhhmmss`) a los imports de nuestros módulos y a las hojas de estilo. Sin él, el navegador servía módulos cacheados tras una actualización (lo detectamos al no aparecer una insignia recién añadida). `docs/*.md` se conserva entre reconstrucciones.

## Fase 2 · Valle de la Luz / Alegría (implementada)

`src/minigames/joy/JoyOrbsGame.js` · **tercera persona** · verbo **saltar y recoger**.

- 10 **plataformas flotantes** (de un solo sentido: sostienen solo si caes desde arriba) con un balanceo mínimo, y 12 **orbes de luz** sobre ellas y en el aire.
- Los orbes **no se pulsan**: se recogen por contacto corriendo y saltando. El tono del sonido sube con el combo.
- **Combo**: cada orbe recogido en el aire suma; tocar el suelo lo reinicia. Romperlo no penaliza, solo deja de sumar. El mejor combo de la partida se muestra al final.
- Cada orbe **hace crecer el valle** (flores y árboles brotando desde la posición del jugador), sube la luz del sol, aclara la niebla, calienta el cielo y, cada tres orbes, entra una capa de música.
- Con los 12 recogidos el valle brilla y se abre el portal.
- La lectura psicoeducativa es la contraria a "bajar" la emoción: aquí la alegría se usa como impulso y llega más lejos.

**Verificado:** salto y aterrizaje sobre plataforma (y = 1,80 exacto), recogida por contacto, combo en el aire (11 encadenados en la prueba), crecimiento de vegetación, 4 capas de audio, portal, tarjeta final e insignia.

## Fase 2 · Guardianes del Desagrado / Asco (implementada)

`src/minigames/disgust/DisgustSortGame.js` · primera persona · verbo **manipular y ordenar**.

- Cuatro zonas del pantano (Olores, Sabores, Imágenes, Rechazo), cada una con **dos contenedores** (🚫 descartar / 💚 conservar) y **tres objetos**.
- Los objetos **se empujan con el cuerpo**: no hay botón de recoger. La fuerza del empuje depende de la velocidad del jugador, hay rozamiento y los objetos ruedan. En la prueba, caminar contra un objeto lo desplazó 8,2 m hasta el contenedor.
- **Contenedor equivocado = sin castigo**: el objeto sale rebotado con un sonido suave y unas partículas, y se puede volver a intentar. Nunca aparece un texto de error.
- Con los tres objetos ordenados se enciende la **válvula** de la zona; activarla con `[E]` aclara el agua estancada, sube la luz y abre la niebla un paso.
- Las cuatro zonas limpias abren el portal.
- Cada zona incluye a propósito **algo que merece conservarse**: cuando el rechazo lo ocupa todo, también se tira lo bueno.

**Verificado:** empuje físico, colocación correcta, rebote en el contenedor equivocado, activación de las 4 válvulas, aclarado progresivo del pantano, portal, tarjeta final e insignia. 12 draw calls, ~10.300 triángulos.

## Fase 2 · Isla de la Sorpresa (implementada)

`src/minigames/surprise/SurpriseObserveGame.js` · primera persona · verbo **observar**.

- Un jardín circular con 12 figuras sobre pedestales y una fuente central como referencia.
- Cada pocos segundos **algo cambia a tu espalda**: la comprobación usa el frustum real de la cámara, así que **nunca cambia nada que estés mirando**. Los cambios son color, tamaño, altura, giro o un elemento nuevo.
- Hay que darse cuenta y **acercarse a la figura** para señalarla con `[E]`. Señalar la equivocada solo devuelve un sonido suave: sin cronómetro y sin castigo.
- Detectar los 5 cambios despierta el jardín y abre el portal.

**Verificado:** los cambios solo ocurren fuera de vista, detección correcta, señalar mal no penaliza, portal, tarjeta final e insignia. 12 draw calls, ~8.100 triángulos.

---

# Checklist de verificación (Fase 12-13)

## Por isla

| Comprobación | Enojo | Miedo | Tristeza | Alegría | Asco | Sorpresa |
|---|:--:|:--:|:--:|:--:|:--:|:--:|
| Carga sin errores de consola | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| El personaje se mueve, salta y corre | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Cámara + Pointer Lock liberado con ESC | ✅ | ✅ | ✅ (3ª p.) | ✅ (3ª p.) | ✅ | ✅ |
| Colisiones y límites del mapa | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Interacciones con prompt `[E]` | ✅ | ✅ | ✅ | contacto | ✅ | ✅ |
| Se puede completar | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Fallar es recuperable y no castiga | ✅ | ✅ | — | ✅ | ✅ | ✅ |
| Reiniciar sin recargar la página | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Salir desbloquea lo que corresponde | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Sin arrastre de estado entre islas | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `dispose()` sin crecimiento de memoria | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

Medidas por isla (tras 40 frames, escritorio):

| Isla | draw calls | triángulos | geometrías | texturas |
|---|--:|--:|--:|--:|
| Enojo | 31 | 12.391 | 32 | 1 |
| Miedo | 14 | 14.840 | 14 | 0 |
| Tristeza | 29 | 12.886 | 38 | 2 |
| Alegría | 42 | 11.426 | 30 | 2 |
| Asco | 29 | 11.124 | 33 | 5 |
| Sorpresa | 12 | 8.136 | 30 | 1 |

Montar y liberar cada isla dos o tres veces seguidas no aumenta geometrías ni texturas, y no deja canvas ni nodos huérfanos.

## Global

- Navegación, menús, caja de herramientas, progreso, insignias y guardado en `localStorage`: funcionan igual que antes.
- **Táctil**: joystick virtual izquierdo, arrastre derecho para la cámara y botones flotantes de saltar/interactuar. Probado a 375×812: el joystick movió al jugador 5,3 m y la HUD no tapa el escenario.
- **Build**: `python scripts/build-docs.py` genera `/docs` (equivalente a `pnpm build` de vite, que sigue funcionando donde haya Node).

## Adaptaciones declaradas

1. **Sin Node en la máquina**: el build de producción se hace con `scripts/build-docs.py`. `pnpm install/dev/build` no se pudo ejecutar aquí.
2. **stats.js** no está disponible sin instalar dependencias: hay un medidor propio equivalente (FPS, draw calls, triángulos, geometrías y texturas) que se activa con **F3**.
3. **Audio sin archivos**: todos los sonidos se generan por código y se cachean como `AudioBuffer`; los del mundo usan `THREE.PositionalAudio`.
4. **Los minijuegos 2D anteriores no se han borrado**: siguen registrados en `src/minigames/index.js` (`fear-island`, `joy-valley`, `disgust-guardians`, `guided-breathing`) por si quieres volver a ellos, pero ninguna isla los usa.
5. El contenido psicoeducativo (herramientas, insignias, intensidad, reevaluación) se conserva y se entrega en la **tarjeta final opcional** de cada isla, fuera del camino crítico del juego.

---

# Fase 14 · Build de produccion con Node

Node 24.19.0 + pnpm 12.3.4 (via corepack) quedaron operativos a mitad del trabajo:

| | Antes (build sin Node) | Ahora (`pnpm build`) |
|---|---|---|
| JS | ~968 kB sin minificar, en 30+ ficheros | **296 kB** (app) + **509 kB** (three), minificados |
| Gzip | — | **83 kB** + **128 kB** |
| CSS | 8 hojas sin minificar | **84 kB** minificado (17 kB gzip) |
| Cache | sello `?v=` a mano | hash en el nombre del fichero |

- `three` va en su propio chunk (`manualChunks`): cambia rara vez, así que al
  actualizar el juego el navegador solo se vuelve a bajar los 83 kB de la app.
- `pnpm dev` da recarga en caliente: editar y ver el cambio sin reconstruir.
- `.claude/launch.json` apunta al vite local, así que el servidor de desarrollo
  se levanta directamente desde el editor.
- Verificado sobre el bundle **minificado**: la Isla de la Alegría carga, recoge
  orbes y suma objetivo (37 draw calls, ~11.100 triángulos), sin errores de
  consola más allá del contador de visitas externo.

**Sigue pendiente de medir:** FPS sostenidos en gama media. El navegador de
pruebas de este entorno no ejecuta `requestAnimationFrame`, así que las medidas
son de draw calls, triángulos y memoria. Con el juego abierto en un navegador
normal, **F3** muestra los FPS reales.

---

# Fase 15 · Rediseño: un género por isla

**Crítica que lo motiva:** las seis islas compartían el mismo bucle —ir a N
puntos marcados, pulsar `E`, llenar un contador, abrir el portal—. Cambiaba la
ambientación, el recurso y la cámara, pero no el juego. Los "verbos distintos"
eran variaciones de *caminar hasta lo señalado e interactuar*.

**Criterio nuevo:** cada isla es de un **género** distinto, con input, ritmo y
forma de fallar propios. Tres de las seis dejan de ser juegos de caminar.

| Isla | Género | Lo que se te exige | Cómo se "falla" | Estado |
|---|---|---|---|---|
| Miedo | Tensión continua | Administrar tu ritmo al acercarte | Retrocedes unos metros | ⏳ |
| **Ira** | **Reflejos + inhibición** | **Distinguir y contenerte** | **El volcán sube** | **✅** |
| **Tristeza** | **Tareas con impulso** | **Hacer cosas pequeñas con tus manos** | **El impulso baja al suelo ganado** | **✅** |
| Alegría | Ritmo | Precisión temporal | Esa capa no entra | ⏳ |
| Asco | Deducción | Buscar información antes de decidir | Descartas algo bueno | ⏳ |
| Sorpresa | Memoria | Retener y comparar | Otra ronda | ⏳ |

## Tristeza · «La casa en marcha» (implementada)

`src/minigames/sadness/SadnessHouseGame.js` · **tercera persona, control directo**.

Sustituye a «Un día a la vez» (cámara fija, clic y el personaje iba solo), que
el jugador sentía como *mirar sin hacer nada*. Ahora todo se hace con las
manos.

- **El peso**: empiezas con `speedScale = 0.5`, el mundo gris y con niebla.
  Hay una barra de **impulso** (♥) con dos partes: un **suelo** que sube con
  cada cosa hecha y no baja nunca, y un **empujón** reciente que se apaga si te
  quedas parado más de 1,2 s. `velocidad = 0.5 + 0.7·impulso` (× 0,85 si llevas
  leña). Esa es la activación conductual hecha cuerpo: moverse cuesta menos
  cuanto más haces, y pararte te devuelve al suelo ganado, nunca por debajo.
- **Seis tareas, seis mecánicas distintas**, sin orden:
  - *Abrir las ventanas* (×3) — pulsar E: la más pequeña posible, entra luz.
  - *Recoger las cartas* (×6) — repartidas por el jardín; se cogen al pasar
    por encima.
  - *Leña para la chimenea* (×4) — coger un tronco con E, **llevarlo a
    cuestas** (se ve sobre la cabeza y frena un poco) y dejarlo en la pila. Con
    los cuatro, la chimenea humea y la casa se calienta por dentro.
  - *Regar la planta* (×3) — **mantener E**: la barra de agua sube 0,42/s; al
    llenarse la planta crece una etapa. Soltar antes **no pierde el progreso**.
  - *Sintonizar la radio* — **mantener y soltar a tiempo**: una aguja barre un
    dial y hay que soltar dentro de la señal (17 % del ancho). Fallar mueve la
    señal y suena estática; acertar mete la capa musical.
  - *Escribir a alguien* — en el buzón se **elige** qué decir entre tres
    mensajes (todos válidos). La respuesta llega al terminar la siguiente
    tarea (o sola a los 3 s si ya no queda ninguna): bandera en el buzón, y
    hay que volver a leerla.
- Cada tarea completada deja una **reflexión** de 8 s (no interrumpe: se sigue
  jugando mientras se lee). El escenario entero se templa con el suelo del
  impulso (cielo, niebla, sol, hierba, árboles, camino y el color del
  personaje).
- Final físico: con las seis tareas y la respuesta leída, la **puerta se abre**
  y se sale por ella. Cierre con insignia y herramienta.
- Lista de tareas en el HUD (`.i3d-tasks`), compacta en móvil; dial de la
  radio (`.i3d-dial`) con banda y aguja.

**Lo que enseña, dicho en voz alta** (no solo con la mecánica):

1. **Reconocer y nombrar.** Al entrar: «¿Cuánto pesa hoy tu tristeza?» (poco /
   bastante / mucho). La respuesta fija el arranque del personaje (0,62 /
   0,5 / 0,4 de velocidad) y queda registrada como intensidad inicial.
2. **Para qué sirve.** La intro explica que la tristeza no es un fallo: frena
   para asimilar una pérdida y pedir compañía; el problema es pararse del
   todo. «No se trata de dejar de estar triste, sino de moverte un poco
   *aunque* lo estés.»
3. **Pensamientos de la tristeza** (distancia de los pensamientos). Si el
   jugador se queda quieto 5 s aparece una frase gris sobre la escena («¿Para
   qué?», «Mañana», «No va a servir de nada»…). No castiga: se va sola al
   moverse 1,6 m o al hacer cualquier cosa. La primera vez una nota lo
   explica; se cuentan los pensamientos atravesados para el cierre.
4. **Cada tarea es una estrategia real** con su versión de un minuto: al
   completarla aparece la tarjeta «🪟 Cambiar el entorno … **Hoy:** abre la
   ventana de tu cuarto cinco minutos». Las seis: cambiar el entorno, lo
   pendiente en trozos, mover el cuerpo, cuidar algo, volver a lo que te
   gustaba, decírselo a alguien; y una séptima al leer la respuesta: dejarte
   ayudar.
5. **Reevaluar y comprometerse.** Al salir por la puerta: «¿Y ahora, cuánto
   pesa?» → `recordReevaluation('sadness', antes, 'Activacion conductual',
   después)`. Luego «Elige UNA cosa pequeña para mañana» entre las seis
   estrategias → `setPlan('sadness', …)`, visible en **Mi progreso → Mi plan
   para mañana**. La tarjeta de cierre se adapta a si bajó, sigue igual o
   subió (subir no es fracaso: «a veces hacer cosas remueve»), resume las
   estrategias y los pensamientos atravesados, repite el plan y cierra con
   la señal de alarma: si dura más de dos semanas o afecta a dormir, comer o
   ir a clase, decírselo a un adulto, orientación o un médico.
6. **Herramientas propias de la tristeza**: 🧭 *Brújula de los Pasos
   Pequeños* (activación conductual) y 🌫️ *Nube de los Pensamientos*
   (distancia de los pensamientos). Antes la isla regalaba un cristal de
   Alegría.

**Sonido.** El ajuste `sound` venía apagado por defecto y las islas 3D no
tenían botón para encenderlo (solo el HUD 2D antiguo). Ahora viene encendido,
los guardados antiguos se migran salvo que el jugador lo apagara a mano
(`settings.soundChosen`), y hay un 🔊 junto a la pausa en todas las islas.
Sonidos propios de la casa (procedurales, en `AudioBus`): `creak` (ventana y
puerta), `paper` (carta), `crackle` (fuego en bucle), `bird` (pájaros sueltos
cuando el impulso ganado pasa de 0,45), chorro de agua en bucle mientras se
riega, estática y *tick* en la radio, capa musical al sintonizar.

**Rendimiento en móvil** (cosas que daban tirones o «saltos»):
- La luz del destello de `Feedback` entraba y salía de la escena: cambiar el
  número de luces obliga a three a recompilar los shaders de todos los
  materiales. Ahora está siempre con intensidad 0.
- Tres luces puntuales de ventana → una sola de resplandor de la casa
  (cada luz puntual se paga en todos los píxeles). 5 → 3 puntuales.
- Las barras del HUD escribían `style.width` cada frame (layout sobre el
  canvas); ahora solo cuando el valor cambia.
- `backdrop-filter` desactivado en punteros táctiles: difuminar el canvas 3D
  detrás de cada panel se recalcula cada frame.
- La resolución adaptativa recupera solo con 3 ventanas seguidas de margen,
  para no oscilar (cada cambio reasigna el canvas).
- **Esquinas de la casa**: el collider de caja empujaba al jugador hasta la
  cara lateral entera al rozar una esquina (un salto de medio metro). Ahora
  las esquinas se rodean como si fueran redondas. Verificado: desplazamiento
  máximo por frame 0,045 contra la esquina, sin saltos.

**Verificado** en el motor real, paso a paso: las tres ventanas, las seis
cartas, los cuatro viajes con la leña (el chip cambia a «Dejar la leña» solo
cuando cargas), el riego conservando el agua al soltar, la radio fallando y
acertando, la elección del mensaje, la respuesta llegando y leyéndose, la
puerta abriéndose y la tarjeta de cierre. `reset()` deja 12 interactuables y
las mismas geometrías; dos montajes seguidos sin crecimiento. 15 draw calls,
~9.700 triángulos, consola limpia.

`sadness-days` («Un día a la vez») y `sadness-restore` («El mundo que vuelve»)
quedan registrados pero fuera de la isla.

## Ira · «Al rojo vivo» (implementada)

`src/minigames/anger/AngerLavaGame.js` · **cámara fija, se juega tocando**.
Es una tarea *go / no-go*: la habilidad que se entrena es la pausa entre el
impulso y la acción.

- El volcán escupe **rocas** que caen en la cornisa delante del jugador, **al
  rojo vivo**. Tocarlas así quema: destello, temblor y **el volcán sube** (la
  lava se acerca a la cornisa). Al enfriarse pasan a gris y aparece un anillo
  azul bajo la roca; entonces se atrapan y vuelan a formar el **puente** de
  salida. Si no se atrapan a tiempo, ruedan al borde y caen a la lava.
- **Chispas**: salen del cráter, zumban delante y, en las oleadas altas,
  orbitan encima de una roca para que un toque descuidado las alcance primero.
  Nunca se enfrían: tocarlas también sube el volcán. Se apagan solas.
- **Una sola regla**: solo se toca lo que ya no está al rojo. Todo lo demás
  (esperar, dejar pasar) es inhibición.
- **Al entrar, el jugador dice cómo está su enojo** (nivel 1 bajo · 2 medio ·
  3 alto, con la frase de cada nivel) y eso fija la dificultad: a más nivel,
  más tarda la roca en enfriarse (la pausa que hace falta es más larga), menos
  margen una vez fría, más chispas y más veces encima de las rocas, y el
  volcán sube más rápido con cada error (×1 / ×1,15 / ×1,3). La respuesta
  queda guardada como intensidad inicial y la tarjeta final la retoma.
  `MinigameBase.showChoice()` queda disponible para preguntar con opciones en
  cualquier isla.
- **La lava es la barra de fallo**: sube con cada quemadura (+0,22), chispa
  (+0,18) y roca perdida (+0,07); baja un poco con cada acierto y sola con el
  tiempo. Cuando llega a la cornisa hay **erupción**: la cornisa se vacía, el
  juego se para tres segundos con «QUIETO · RESPIRA» y **tocar cualquier cosa
  reinicia la cuenta**. Nada de lo construido se pierde; después sigue la misma
  oleada.
- **Tres oleadas** de 4 rocas, cada una más rápida, con rocas que tardan más en
  enfriarse, menos margen una vez frías y más chispas. Con 12 bloques el volcán
  se apaga.
- **Segundo mini-juego: las grietas** (`AngerCracksStage.js`). Con el volcán
  apagado, la cornisa se agrieta: cuatro grietas al rojo, cada una nacida de
  algo concreto que encendió el enojo (una burla, no ser escuchado, algo que te
  quitaron, un no). Hay que **seguir cada grieta con el dedo** desde su anillo
  de arranque hasta el origen: los tramos recorridos se sellan en azul; al
  llegar, la roca salta, aparece un cristal y una nota dice qué la encendió.
  Soltar no pierde nada (se retoma donde ibas); salirse del trazo solo avisa
  («SIGUE LA GRIETA»). En los niveles medio y alto, algunas grietas tienen
  ramas falsas que no llevan a ningún sitio. Con las cuatro selladas, una
  pregunta sin respuesta correcta —«¿qué es lo que más te enciende a ti?»— que
  queda registrada. Herramienta: Chispa de Comprensión. Los 44 tramos van en
  tres `InstancedMesh` (al rojo, sellados, ramas): la fase cuesta 13 draw calls.
- **Respiración 4-4-4-4 para enfriarlo del todo, de últimas.** Aparecen unos pulmones que
  son el botón: *mantener pulsado* para inhalar (4 s) y sostener (4 s), *soltar*
  para exhalar (4 s) y esperar (4 s). Los pulmones se llenan y vacían, un anillo
  marca el tiempo y hay cuenta atrás por fase. Soltar antes de tiempo solo
  reinicia la respiración («sin prisa»); pulsar cuando toca soltar hace que la
  fase espere. Cada respiración completa vira el cielo, la lava y los propios
  pulmones un paso del rojo al azul; con tres, el volcán está frío y aparece el
  portal, que se toca para salir. Teclado: barra espaciadora o E.
- Una **reflexión al cerrar cada oleada**, sin cortar la partida: *Al rojo
  vivo* (lo primero que sale, sale al rojo), *Las chispas no se enfrían* (no
  hace falta responder a lo que solo busca reacción) y *Fría, la misma roca
  sirve* (el enojo no desaparece: se usa cuando baja la temperatura). La
  primera erupción trae una cuarta: parar también es una decisión. Y al acabar
  de respirar, *Respirar 4-4-4-4*: no apaga el enojo, le baja la temperatura lo
  justo para elegir. La tarjeta final las recoge.
- Todo se reutiliza: 4 rocas, 4 chispas y 12 bloques creados una vez; el toque
  se resuelve con un test rayo-esfera (sin raycast contra mallas), y las rocas
  vuelan con una parábola calculada para caer exactamente en su sitio.

Orden final de la isla: pregunta de nivel → «Al rojo vivo» (3 oleadas) →
las grietas → pregunta de lo que más te enciende → respiración 4-4-4-4 →
portal.

**Verificado (avanzando el juego con `step(dt)`):** vuelo y aterrizaje de la
roca en su objetivo, enfriado y anillo, atrapar (bloque colocado), quemadura
(+0,22 y aviso), chispa (+0,18), erupción con la cornisa vacía y los bloques
intactos, reinicio de la cuenta al tocar durante la erupción y reanudación con
lava a cero, las 3 oleadas completas con un bot que solo toca rocas frías (la
chispa encima de la roca le cazó 2 veces), las 4 reflexiones, portal con
tooltip y cursor, tarjeta final, insignia y 2 herramientas (Gota de Calma y
Escudo de Autocontrol), y `dispose()` sin nodos huérfanos. 19-25 draw calls,
~3.500-4.400 triángulos.

El minijuego anterior de Ira (`anger-volcano`, «Volcán de las Emociones», los
4 focos de respiración) queda registrado pero fuera de la isla.

## Ajuste · Iluminación de la Isla del Miedo

El bosque estaba demasiado oscuro para orientarse. Ahora hay una **luna visible**
que justifica la luz de la noche:

- Esfera con halo aditivo y `fog:false` (a esa distancia la niebla se la habría
  comido), y la luz direccional colocada en la posición de la luna, de modo que
  las sombras y el tono azul vienen de donde se ve la fuente.
- Un punto de luz suave bajo la luna y un halo alrededor del jugador algo mayor,
  para que el suelo cercano se lea sin depender solo de la linterna.
- Niebla más fina y clara (0,052 → 0,033), cielo y suelo un punto arriba,
  troncos y copas menos apagados, y exposición de tono 1,32 solo en esta isla.
- Al amanecer la luna se desvanece junto con su halo.

Sigue siendo de noche y la linterna sigue siendo necesaria: lo que cambia es que
ya se puede caminar sin ir a ciegas.


## Ajuste · Instrucciones y aviso de girar el teléfono

**Al entrar a cada isla** aparece una tarjeta con: el nombre de la isla, el
objetivo en una línea, la clave del juego (qué gasta la linterna, qué pasa si
sueltas antes de tiempo, que equivocarse no cuesta nada) y **los controles**.
El juego queda en pausa hasta pulsar *Empezar*, y ese clic sirve además para
desbloquear el audio del navegador.

Los controles se muestran según el dispositivo: teclado en escritorio
(`W A S D`, `Ratón`, `Shift`, `E`) y gestos en táctil (`Joystick`, `Arrastra`,
`E`), con una media query de `pointer: coarse`. Las islas que no se caminan
—Tristeza— muestran los suyos (`Toca`, `Arrastra`, `Dormir`).

La tarjeta se puede volver a abrir desde el menú de pausa con **Cómo se juega**.

**En móvil**, mientras el teléfono esté en vertical se muestra un aviso a
pantalla completa —"Gira el teléfono"— con un icono que rota. Solo aparece en
dispositivos táctiles, se puede descartar con *Seguir así* y desaparece solo al
girar (escuchando el media query, `resize` y `orientationchange`).


## Ajuste · Reflexiones al encender cada farol (Miedo)

Cada farol encendido trae una reflexión sobre el miedo, apoyada en lo que el
jugador acaba de hacer:

1. **La alarma se dispara antes** — el cuerpo se acelera antes de comprobar si hay peligro.
2. **Huir alivia rápido** — correr gasta la linterna; escapar calma al momento y agranda el miedo la próxima vez.
3. **Respirar no lo apaga** — le baja el volumen lo justo para poder decidir y seguir.
4. **No hace falta verlo todo** — basta con ver el siguiente paso.
5. **Con miedo, no sin miedo** — valiente es el que avanza llevándolo encima.

La nota aparece arriba **sin pausar la partida**: el jugador sigue caminando
mientras la lee, se va sola a los 9 segundos (con una barra que lo indica) y se
puede cerrar tocándola. Al terminar la isla, la tarjeta final recoge las cinco
en el orden en que aparecieron.

`MinigameBase.showNote()` queda disponible para cualquier isla que quiera decir
algo sin interrumpir.


## Ajuste · Todas las islas abiertas

Se elimina la cadena de desbloqueo (Miedo → Alegría → Ira → Desagrado). Quien
quiera entrar a cualquier isla puede hacerlo directamente, sin haber jugado
otra antes:

- `isUnlocked()` devuelve siempre `true`; el estado inicial trae las seis islas
  en `unlockedIslands`, y los guardados antiguos se migran al cargar (se añaden
  las que faltaban).
- `completeIsland()` ya no desbloquea nada: solo marca la isla y entrega la
  insignia. Desaparecen el panel «Isla bloqueada», el candado del mapa y el
  aviso «Se desbloqueó…» de la pantalla de isla completada.
- `ISLAND_CHAIN` se conserva únicamente para numerar capítulos, contar el
  progreso de la aventura (4 islas) y ordenar las insignias.
- La pantalla de progreso toma los nombres de las islas de `islands.js`, así
  siempre muestra el nombre actual de cada minijuego.


## Ajuste · Sin caja de herramientas

Se retira la caja de herramientas de toda la app: el enlace de la pantalla de
inicio, el botón 🧰 del mapa, «Mi caja» en el menú de pausa de las islas 3D y
en la pantalla de isla completada, la pantalla en sí (`openToolbox`), el botón
de la HUD del motor 2D y los contadores de herramientas en progreso y final.
Las recompensas siguen guardándose en `gameState.tools` (las islas las siguen
entregando), pero ya no hay pantalla que las liste. El Valle de la Luz
(`public/valle-luz/`) conserva su propia caja porque forma parte de su
especificación.

