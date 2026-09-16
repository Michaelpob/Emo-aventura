// EMO-AVENTURA · Sistema central de estado
// Guarda y recupera todo el progreso en localStorage. Ninguna accion resta puntos.

import { TOOLS, BADGES } from './tools.js';

const STORAGE_KEY = 'emo-aventura-state';

// Orden de la aventura: Miedo -> Alegria -> Ira -> Desagrado. Solo ordena
// capitulos, progreso e insignias: NO es una cadena de desbloqueo. Todas las
// islas estan abiertas desde el principio; se puede entrar a cualquiera sin
// haber jugado otra antes.
export const ISLAND_CHAIN = ['fear', 'joy', 'anger', 'disgust'];

// Islas del mapa que no forman parte de la aventura
export const FREE_ISLANDS = ['sadness', 'surprise'];

export const ALL_ISLANDS = [...ISLAND_CHAIN, ...FREE_ISLANDS];

function baseState() {
  return {
    currentIsland: null,
    unlockedIslands: [...ALL_ISLANDS],
    completedIslands: [],
    emotionalPoints: 0,
    rewards: [],
    badges: [],
    tools: [],
    currentIntensity: null,
    initialIntensity: null,
    finalIntensity: null,
    selectedStrategy: null,
    completedActivities: [],
    progress: 0,
    reevaluations: [],
    plans: [],
    // Isla del Miedo en dos niveles: bosque (level1) y casa (level2). La isla
    // cuenta como completada solo cuando el flujo termina los dos.
    fear: { level1: false, level2: false },
    settings: { sound: true, reduceMotion: false }
  };
}

export const gameState = baseState();

const listeners = new Set();

export function onStateChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function emit() {
  listeners.forEach((fn) => {
    try {
      fn(gameState);
    } catch (err) {
      console.warn('[emo-aventura] listener error', err);
    }
  });
}

export function loadProgress() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      Object.assign(gameState, baseState(), saved);
      // Normaliza colecciones por si el guardado viene de una version previa
      ['unlockedIslands', 'completedIslands', 'rewards', 'badges', 'tools', 'completedActivities', 'reevaluations', 'plans']
        .forEach((key) => {
          if (!Array.isArray(gameState[key])) gameState[key] = [];
        });
      // guardados de cuando habia cadena de desbloqueo: se abren todas
      ALL_ISLANDS.forEach((id) => {
        if (!gameState.unlockedIslands.includes(id)) gameState.unlockedIslands.push(id);
      });
      if (!gameState.settings) gameState.settings = { sound: true, reduceMotion: false };
      // Guardados de cuando la Isla del Miedo era un solo nivel: el bosque ya
      // estaba superado, la casa no existia. La insignia se conserva.
      if (!saved.fear || typeof saved.fear !== 'object') {
        gameState.fear = {
          level1: gameState.completedIslands.includes('fear'),
          level2: false
        };
      } else {
        gameState.fear = { level1: !!saved.fear.level1, level2: !!saved.fear.level2 };
      }
      // El sonido venia apagado por defecto y los guardados antiguos lo
      // conservan: se enciende salvo que el jugador lo haya apagado a mano.
      if (!gameState.settings.soundChosen) gameState.settings.sound = true;
    }
  } catch (err) {
    console.warn('[emo-aventura] no se pudo leer el progreso, se inicia limpio', err);
    Object.assign(gameState, baseState());
  }
  recalcProgress();
  return gameState;
}

export function saveProgress() {
  recalcProgress();
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(gameState));
  } catch (err) {
    console.warn('[emo-aventura] no se pudo guardar el progreso', err);
  }
  emit();
  return gameState;
}

export function resetGame() {
  Object.assign(gameState, baseState());
  saveProgress();
}

function recalcProgress() {
  const total = ISLAND_CHAIN.length;
  const done = ISLAND_CHAIN.filter((id) => gameState.completedIslands.includes(id)).length;
  gameState.progress = Math.round((done / total) * 100);
}

/* ---------------------------------------------------------------- puntos */

export function addPoints(amount) {
  const value = Math.max(0, Number(amount) || 0); // nunca resta
  gameState.emotionalPoints += value;
  saveProgress();
  return gameState.emotionalPoints;
}

/* ------------------------------------------------------------ actividades */

export function completeActivity(activityId, points = 0) {
  if (!gameState.completedActivities.includes(activityId)) {
    gameState.completedActivities.push(activityId);
    if (points) {
      gameState.emotionalPoints += Math.max(0, points);
    }
  }
  saveProgress();
  return gameState.completedActivities;
}

export function isActivityCompleted(activityId) {
  return gameState.completedActivities.includes(activityId);
}

/* ------------------------------------------------------------ herramientas */

export function addReward(toolId) {
  const tool = TOOLS[toolId];
  if (!tool) {
    console.warn('[emo-aventura] herramienta desconocida:', toolId);
    return null;
  }
  if (!gameState.tools.includes(toolId)) {
    gameState.tools.push(toolId);
    gameState.rewards.push({ toolId, at: Date.now() });
  }
  saveProgress();
  return tool;
}

export function hasTool(toolId) {
  return gameState.tools.includes(toolId);
}

export function getTools() {
  return gameState.tools.map((id) => TOOLS[id]).filter(Boolean).sort((a, b) => a.order - b.order);
}

/* ---------------------------------------------------------------- insignias */

export function addBadge(badgeId) {
  if (!BADGES[badgeId]) return null;
  if (!gameState.badges.includes(badgeId)) gameState.badges.push(badgeId);
  saveProgress();
  return BADGES[badgeId];
}

export function getBadges() {
  return gameState.badges.map((id) => BADGES[id]).filter(Boolean);
}

/* ---------------------------------------------------------------- islas */

/** Todas las islas estan abiertas siempre */
export function isUnlocked() {
  return true;
}

export function isCompleted(islandId) {
  return gameState.completedIslands.includes(islandId);
}

export function unlockIsland(islandId) {
  if (!islandId) return false;
  if (gameState.unlockedIslands.includes(islandId)) return false;
  gameState.unlockedIslands.push(islandId);
  saveProgress();
  return true;
}

/** Marca una isla como completada y entrega su insignia */
export function completeIsland(islandId) {
  if (!gameState.completedIslands.includes(islandId)) {
    gameState.completedIslands.push(islandId);
  }
  addBadge(islandId);
  saveProgress();
}

/* ---------------------------------------------------- niveles del miedo */

export function getFearLevels() {
  if (!gameState.fear) gameState.fear = { level1: false, level2: false };
  return gameState.fear;
}

/** Marca superado un nivel de la Isla del Miedo (1 bosque, 2 casa) */
export function setFearLevel(level, done = true) {
  const fear = getFearLevels();
  fear[`level${level}`] = !!done;
  saveProgress();
  return fear;
}

export function allIslandsCompleted() {
  return ISLAND_CHAIN.every((id) => gameState.completedIslands.includes(id));
}

export function lockedIslands() {
  return ALL_ISLANDS.filter((id) => !isUnlocked(id));
}

/* -------------------------------------------------------------- intensidad */

export function changeIntensity(level) {
  gameState.currentIntensity = level;
  saveProgress();
  return level;
}

export function setInitialIntensity(level) {
  gameState.initialIntensity = level;
  gameState.currentIntensity = level;
  saveProgress();
}

export function setStrategy(strategyId) {
  gameState.selectedStrategy = strategyId;
  saveProgress();
}

/** Registra { initialIntensity, strategy, finalIntensity } de una reevaluacion. */
export function recordReevaluation(islandId, initialIntensity, strategy, finalIntensity) {
  gameState.finalIntensity = finalIntensity;
  gameState.currentIntensity = finalIntensity;
  gameState.reevaluations.push({
    island: islandId,
    initialIntensity,
    strategy,
    finalIntensity,
    at: Date.now()
  });
  saveProgress();
  return gameState.reevaluations[gameState.reevaluations.length - 1];
}

export function getReevaluations() {
  return [...gameState.reevaluations];
}

/**
 * Compromiso pequeno que el jugador se lleva de una isla a la vida real
 * ("manana: abrir la ventana cinco minutos"). Uno por isla: el ultimo manda.
 */
export function setPlan(islandId, { strategy, action }) {
  gameState.plans = gameState.plans.filter((p) => p.island !== islandId);
  gameState.plans.push({ island: islandId, strategy, action, at: Date.now() });
  saveProgress();
  return gameState.plans[gameState.plans.length - 1];
}

export function getPlans() {
  return [...gameState.plans];
}

/* --------------------------------------------------------------- ajustes */

export function setSetting(key, value) {
  gameState.settings[key] = value;
  if (key === 'sound') gameState.settings.soundChosen = true;
  saveProgress();
  return value;
}

export function prefersReducedMotion() {
  if (gameState.settings.reduceMotion) return true;
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/* ------------------------------------------------------- resumen progreso */

export function getProgressSummary() {
  return {
    completed: ISLAND_CHAIN.filter((id) => gameState.completedIslands.includes(id)),
    total: ISLAND_CHAIN.length,
    percent: gameState.progress,
    points: gameState.emotionalPoints,
    tools: getTools(),
    badges: getBadges(),
    strategies: [...new Set(getTools().map((t) => t.strategy))],
    reevaluations: getReevaluations(),
    plans: getPlans()
  };
}

loadProgress();
