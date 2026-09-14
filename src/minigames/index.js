import { VolcanoControlGame } from './VolcanoControlGame.js';
import { BreathingCalmGame } from './BreathingCalmGame.js';
import { ComingSoonGame } from './ComingSoonGame.js';
import { FearIslandGame } from './fear/FearIslandGame.js';
import { JoyValleyGame } from './joy/JoyValleyGame.js';
import { DisgustGuardiansGame } from './disgust/DisgustGuardiansGame.js';
import { AngerVolcanoGame } from './anger/AngerVolcanoGame.js';
import { AngerLavaGame } from './anger/AngerLavaGame.js';
import { FearNightGame } from './fear/FearNightGame.js';
import { SadnessRestoreGame } from './sadness/SadnessRestoreGame.js';
import { SadnessDaysGame } from './sadness/SadnessDaysGame.js';
import { JoyOrbsGame } from './joy/JoyOrbsGame.js';
import { DisgustSortGame } from './disgust/DisgustSortGame.js';
import { DisgustTerritoryGame } from './disgust/DisgustTerritoryGame.js';
import { SurpriseObserveGame } from './surprise/SurpriseObserveGame.js';

export const minigameRegistry = {
  // Islas 3D jugables
  'anger-lava': AngerLavaGame,
  'anger-volcano': AngerVolcanoGame,
  'fear-night': FearNightGame,
  'sadness-days': SadnessDaysGame,
  'sadness-restore': SadnessRestoreGame,
  'joy-orbs': JoyOrbsGame,
  'disgust-sort': DisgustSortGame,
  'disgust-territory': DisgustTerritoryGame,
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
