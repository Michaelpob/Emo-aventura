export const islands = [
  {
    id: 'sadness',
    name: 'Tristeza',
    displayName: 'La casa en marcha',
    emoji: '😢',
    subtitle: 'Empiezas sin fuerzas. Cada cosa pequena que haces te devuelve impulso.',
    badge: 'Guardian de la Tristeza',
    reward: 'Cristal del Recuerdo Positivo',
    palette: {
      land: '#7db8d6',
      accent: '#4f7ba8',
      foliage: '#8cc6d1',
      glow: '#b7e4f5',
      ui: '#3178a8'
    },
    position: [0, 0, -4.4],
    radius: 1.25,
    height: 0.34,
    minigame: 'sadness-house'
  },
  {
    id: 'anger',
    name: 'Enojo',
    displayName: 'Al rojo vivo',
    emoji: '😠',
    subtitle: 'Las rocas llegan ardiendo. Espera a que se enfrien antes de tocarlas.',
    chapter: 2,
    badge: 'Guardian de la Ira',
    reward: 'Gota de Calma',
    palette: {
      land: '#e76856',
      accent: '#b92d32',
      foliage: '#ffb15c',
      glow: '#ff765f',
      ui: '#c0392b'
    },
    position: [4.2, 0, -1.4],
    radius: 1.4,
    height: 0.48,
    minigame: 'anger-lava'
  },
  {
    id: 'fear',
    name: 'Miedo',
    displayName: 'Isla del Miedo',
    emoji: '😨',
    subtitle: 'Bosque a oscuras y una casa de noche: enciende los faroles y comprueba lo que da miedo.',
    chapter: 1,
    badge: 'Guardian del Miedo',
    reward: 'Lupa de la Realidad',
    palette: {
      land: '#6c5a94',
      accent: '#403a67',
      foliage: '#4fb0a1',
      glow: '#b6a7ff',
      ui: '#5947a5'
    },
    position: [-4.2, 0, -1.4],
    radius: 1.3,
    height: 0.38,
    minigame: 'fear-night-house'
  },
  {
    id: 'disgust',
    name: 'Desagrado',
    displayName: 'Guardianes del Desagrado',
    emoji: '🤢',
    subtitle: 'Reconoce el desagrado, mide su intensidad y elige como responder.',
    chapter: 3,
    badge: 'Guardian del Desagrado',
    reward: 'Semilla de Aceptacion',
    palette: {
      land: '#6ab86a',
      accent: '#3a8a3a',
      foliage: '#a8d86e',
      glow: '#8ce88c',
      ui: '#2e8b2e'
    },
    position: [-2.6, 0, 3.6],
    radius: 1.2,
    height: 0.36,
    minigame: 'disgust-territory'
  },
  {
    id: 'frustration',
    name: 'Frustración',
    displayName: 'La torre y el valle',
    emoji: '😤',
    subtitle: 'Algo se interpone entre tu y la cima. Sigue, para, cambia de paso o pide ayuda. Y después, el valle: salta y recoge los orbes.',
    badge: 'Guardian de la Frustración',
    reward: 'Llave de la Paciencia',
    // naranja-rojizo: el calor que sube cuando algo se interpone
    palette: {
      land: '#e2743c',
      accent: '#a83a1c',
      foliage: '#d9a24a',
      glow: '#ff8c4a',
      ui: '#c9471f'
    },
    position: [2.6, 0, 3.6],
    radius: 1.18,
    height: 0.4,
    minigame: 'frustration-tower-valley'
  }
];

export const minigameLabels = {
  'anger-lava': 'Al rojo vivo',
  'anger-volcano': 'Volcan de las Emociones',
  'fear-night': 'Bosque de la Noche',
  'fear-night-house': 'Bosque de la Noche · La Casa',
  'sadness-house': 'La casa en marcha',
  'sadness-days': 'Un dia a la vez',
  'sadness-restore': 'El mundo que vuelve',
  'joy-orbs': 'Valle de la Luz',
  'disgust-sort': 'Guardianes del Desagrado',
  'disgust-territory': 'Guardianes del Desagrado',
  'frustration-tower-valley': 'La torre · El valle',
  'frustration-tower': 'La torre',
  'surprise-observe': 'El jardin que cambia',
  'fear-island': 'Isla del Miedo',
  'joy-valley': 'Valle de la Luz',
  'disgust-guardians': 'Guardianes del Desagrado',
  'volcano-control': 'Control del Volcan',
  'guided-breathing': 'Respiracion Guiada',
  'coming-soon': 'Prototipo listo para ampliar'
};
