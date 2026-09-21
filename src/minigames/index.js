import { VolcanoControlGame } from './VolcanoControlGame.js';
import { BreathingCalmGame } from './BreathingCalmGame.js';
import { ComingSoonGame } from './ComingSoonGame.js';
import { FearIslandGame } from './fear/FearIslandGame.js';
import { JoyValleyGame } from './joy/JoyValleyGame.js';
import { AngerVolcanoGame } from './anger/AngerVolcanoGame.js';
import { AngerLavaGame } from './anger/AngerLavaGame.js';
import { FearNightGame } from './fear/FearNightGame.js';
import { FearIslandFlow } from './fear/FearIslandFlow.js';
import { SadnessRestoreGame } from './sadness/SadnessRestoreGame.js';
import { SadnessDaysGame } from './sadness/SadnessDaysGame.js';
import { SadnessHouseGame } from './sadness/SadnessHouseGame.js';
import { JoyOrbsGame } from './joy/JoyOrbsGame.js';
import { SurpriseObserveGame } from './surprise/SurpriseObserveGame.js';
import { FrustrationTowerGame } from './frustration/FrustrationTowerGame.js';
import { CalmLakeGame } from './calm/CalmLakeGame.js';
import { FrustrationIslandFlow } from './frustration/FrustrationIslandFlow.js';
import { DisgustIslandFlow } from './disgust/DisgustIslandFlow.js';

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
  'frustration-tower-valley': FrustrationIslandFlow,   // torre (nivel 1) + valle de los orbes (nivel 2)
  'frustration-tower': FrustrationTowerGame,
  'calm-lake': CalmLakeGame,           // solo la torre
  'disgust-cienaga': DisgustIslandFlow, // La Cadena + El Separador (menu de la isla)
  'surprise-observe': SurpriseObserveGame,
  // EMO-AVENTURA (2D, en migracion a 3D)
  'fear-island': FearIslandGame,
  'joy-valley': JoyValleyGame,
  // Isla del Enojo (minijuego existente, sin cambios)
  'guided-breathing': BreathingCalmGame,
  'volcano-control': VolcanoControlGame,
  // Islas aun sin contenido
  'coming-soon': ComingSoonGame
};
