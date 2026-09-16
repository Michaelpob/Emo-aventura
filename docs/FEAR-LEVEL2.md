# Isla del Miedo · Nivel 2 "La Casa" — hallazgos previos

Notas tomadas antes de escribir codigo, tal como pide la spec. Donde la spec
asumia una API que no coincide con el repo, manda el codigo.

## Que es realmente el Nivel 1

- La isla instancia el minijuego que dice `islands.js` → `minigame: 'fear-night'`,
  que en `src/minigames/index.js` apunta a **`FearNightGame`**
  (`src/minigames/fear/FearNightGame.js`, Bosque de la Noche, 3D en primera
  persona). Ese es el Nivel 1.
- `FearIslandGame.js` (el que nombra la spec) es el recorrido 2D antiguo de
  EMO-AVENTURA, registrado como `'fear-island'` pero **no** conectado a la isla.
  No se toca.

## Ciclo de vida de un minijuego 3D (`MinigameBase`)

- `EmotionIslandApp.launchMinigame(island)` hace
  `new Game({ host, island, player, onComplete, onExit, onOpenToolbox })` y
  luego `mount()`. `mount()` = `init()` (DOM, renderer, escena, audio,
  PlayerController, InteractableManager, `build()`) + `start()` (bucle rAF).
- Fin: el juego llama `finish()` → `onComplete(payload)`. La app hace
  `currentMinigame.dispose()`, `completeIsland(result.islandId)` y muestra la
  tarjeta de isla completada (`showIslandComplete`).
- Salir por pausa: `onExit()` → `exitMinigame()` → `dispose()`.
- `dispose()` cancela rAF y timers, quita listeners, llama `onDispose()`,
  libera geometrias/materiales/texturas, `renderer.dispose()` +
  `forceContextLoss()`, y quita el DOM. Cada minijuego crea su propio
  renderer: no se comparte nada entre niveles.

## Como termina hoy el Nivel 1

- Al encender el 5º farol → `dawn()`: amanece, baja la musica y a los 2 s abre
  un portal (`openPortal`) con un interactuable `[E] Salir del bosque` que
  llama `finish()`.
- `FearNightGame.finish()` entrega recompensas (`addReward('lupa-realidad')`,
  `addReward('gota-aire')`, `completeActivity('fear-bosque-3d', 20)`,
  `recordReevaluation(...)`), muestra la tarjeta "Atravesar, no huir" con las
  reflexiones vistas y al pulsar Continuar llama `super.finish()` →
  `onComplete`.

## Progreso en `gameState.js`

- Antes: `completedIslands: string[]`; `completeIsland(id)` añade la isla y su
  insignia. No habia fases por isla.
- Ahora: `gameState.fear = { level1, level2 }` con `setFearLevel(n, done)` y
  `getFearLevels()`. La isla solo se marca completada (via `onComplete`)
  cuando el flujo termina el Nivel 2.
- Migracion en `loadProgress()`: un guardado con `'fear'` en
  `completedIslands` y sin `fear` → `{ level1: true, level2: false }`. La
  insignia y la isla completada **no se quitan** (nadie pierde progreso); al
  volver a entrar se ofrece empezar en la casa.

## Decisiones de encadenado

- `FearIslandFlow.js` cumple el mismo contrato que un minijuego (`mount()`,
  `dispose()`, recibe `onComplete/onExit/onOpenToolbox`) y es lo que registra
  `'fear-night-house'`, el `minigame` de la isla ahora.
- El Nivel 1 no sabe del Nivel 2. El unico cambio en `FearNightGame.js` es
  extraer la apertura del portal de `dawn()` a un metodo `openExit()`. El flujo
  usa una subclase privada que sobreescribe `openExit()` (la casa aparece en
  vez del portal) y `dawn()` (baja la tension pero sigue siendo de noche: el
  amanecer real llega al salir de la casa). Jugado solo, `'fear-night'`
  sigue identico.
- Transicion sin pantalla: la casa aparece a lo lejos en la direccion del
  ultimo farol, un sendero de luces la marca, `[E] Entrar` en la puerta →
  fundido a negro 0,8 s → `dispose()` del Nivel 1 → `FearHouseGame.mount()`.
  Unico texto: "LA CASA".
- El cierre de isla existente (recompensas, tarjeta con las reflexiones del
  bosque, `onComplete`) se dispara al terminar la casa, desde el flujo.
