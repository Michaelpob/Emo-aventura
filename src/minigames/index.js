import { VolcanoControlGame } from './VolcanoControlGame.js';
import { BreathingCalmGame } from './BreathingCalmGame.js';
import { ComingSoonGame } from './ComingSoonGame.js';
import { FearIslandGame } from './fear/FearIslandGame.js';
import { JoyValleyGame } from './joy/JoyValleyGame.js';
import { DisgustGuardiansGame } from './disgust/DisgustGuardiansGame.js';
import { AngerVolcanoGame } from './anger/AngerVolcanoGame.js';
import { AngerLavaGame } from './anger/AngerLavaGame.js';
import { FearNightGame } from './fear/FearNightGame.js';
import { FearIslandFlow } from './fear/FearIslandFlow.js';
import { SadnessRestoreGame } from './sadness/SadnessRestoreGame.js';
import { SadnessDaysGame } from './sadness/SadnessDaysGame.js';
import { SadnessHouseGame } from './sadness/SadnessHouseGame.js';
import { JoyOrbsGame } from './joy/JoyOrbsGame.js';
import { DisgustSortGame } from './disgust/DisgustSortGame.js';
import { DisgustTerritoryGame } from './disgust/DisgustTerritoryGame.js';
import { SurpriseObserveGame } from './surprise/SurpriseObserveGame.js';
import { MaquinaTercaGame } from './frustration/MaquinaTercaGame.js';
import { VolcanPresionGame } from './frustration/VolcanPresionGame.js';
import { CalmLakeGame } from './calm/CalmLakeGame.js';
import { FrustrationIslandFlow } from './frustration/FrustrationIslandFlow.js';

export const minigameRegistry = {
  // Islas 3D jugables
  'anger-lava': AngerLavaGame,
  'anger-volcano': AngerVolcanoGame,
  'fear-night-house': FearIslandFlow,   // bosque (nivel 1) + casa (nivel 2)
  'fear-night': FearNightGame,          // solo el bosque
  'sadness-house': SadnessHouseGame,
  'sadness-days': SadnessDaysGame,
  'sadness-restore': SadnessRestoreGame,
  'joy-orbs': JoyOrbsGame,
  'disgust-sort': DisgustSortGame,
  'disgust-territory': DisgustTerritoryGame,
  'frustration-nudos': FrustrationIslandFlow,          // La Maquina Terca (nivel 1) + El Volcan de la Presion (nivel 2)
  'frustration-maquina': MaquinaTercaGame,             // solo el taller
  'frustration-volcan': VolcanPresionGame,             // solo el volcan
  'calm-lake': CalmLakeGame,
  'surprise-observe': SurpriseObserveGame,
  // EMO-AVENTURA (2D, en migracion a 3D)
  'fear-island': FearIslandGame,
  'joy-valley': JoyValleyGame,
  'disgust-guardians': DisgustGuardiansGame,
  // Isla del Enojo (minijuego existente, sin cambios)
  'guided-breathing': BreathingCalmGame,
  'volcano-control': VolcanoControlGame,
  // Islas aun sin contenido
  'coming-soon': ComingSoonGame
};
