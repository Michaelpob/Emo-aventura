// EMO-AVENTURA · Catalogo de herramientas emocionales (Caja de Herramientas)
// Cada herramienta: icono, nombre, emocion, estrategia, descripcion y orden de obtencion.

export const TOOLS = {
  'lupa-realidad': {
    id: 'lupa-realidad',
    icon: '🔍',
    name: 'Lupa de la Realidad',
    emotion: 'Miedo',
    strategy: 'Reevaluacion cognitiva',
    description: 'Sirve para mirar de cerca un pensamiento y revisar si de verdad es asi. Cambia "algo malo va a pasar" por una idea mas equilibrada.',
    order: 1
  },
  'gota-aire': {
    id: 'gota-aire',
    icon: '💨',
    name: 'Aliento del Refugio',
    emotion: 'Miedo',
    strategy: 'Respiracion guiada',
    description: 'Recuerda el ritmo inhalar - mantener - exhalar. La usas cuando el cuerpo se acelera y necesitas estabilizarlo.',
    order: 2
  },
  'puente-pasos': {
    id: 'puente-pasos',
    icon: '🌉',
    name: 'Puente de los Pasos Pequenos',
    emotion: 'Miedo',
    strategy: 'Exposicion progresiva',
    description: 'Divide lo que da miedo en pasos pequenos y ordenados. Cada peldano que pisas hace mas firme el siguiente.',
    order: 3
  },
  'rayo-alegria': {
    id: 'rayo-alegria',
    icon: '⚡',
    name: 'Rayo de Alegria',
    emotion: 'Alegria',
    strategy: 'Identificacion emocional',
    description: 'Te ayuda a reconocer la alegria cuando aparece, incluso cuando es pequena o silenciosa.',
    order: 4
  },
  'estrella-disfrute': {
    id: 'estrella-disfrute',
    icon: '🌟',
    name: 'Estrella del Disfrute',
    emotion: 'Alegria',
    strategy: 'Reconocer lo positivo / disfrutar sin perder el control',
    description: 'Sirve para detenerse, observar y apreciar lo bueno que ya esta ocurriendo, sin apurarlo.',
    order: 5
  },
  'pieza-exploracion': {
    id: 'pieza-exploracion',
    icon: '🧭',
    name: 'Pieza de Exploracion',
    emotion: 'Alegria',
    strategy: 'Explorar la alegria',
    description: 'Empuja a moverse, buscar y descubrir. La alegria tambien crece cuando exploramos.',
    order: 6
  },
  'cristal-recuerdo': {
    id: 'cristal-recuerdo',
    icon: '💠',
    name: 'Cristal del Recuerdo Positivo',
    emotion: 'Alegria',
    strategy: 'Guardar el momento',
    description: 'Guarda un momento bueno con detalle para poder volver a el cuando lo necesites.',
    order: 7
  },
  'corazon-conexion': {
    id: 'corazon-conexion',
    icon: '💞',
    name: 'Corazon de Conexion',
    emotion: 'Alegria',
    strategy: 'Compartir la alegria',
    description: 'La alegria compartida se sostiene mejor. Sirve para acercarte y contarle a alguien lo que sientes.',
    order: 8
  },
  'rayo-energia': {
    id: 'rayo-energia',
    icon: '🔆',
    name: 'Rayo de Energia',
    emotion: 'Alegria',
    strategy: 'Canalizar la activacion',
    description: 'Toma la energia que sobra y la dirige hacia algo util en vez de dispersarla.',
    order: 9
  },
  'cristal-perspectiva': {
    id: 'cristal-perspectiva',
    icon: '🔮',
    name: 'Cristal de Perspectiva',
    emotion: 'Ira / Desagrado',
    strategy: 'Reevaluacion cognitiva',
    description: 'Transforma un pensamiento extremo en uno equilibrado, sin negar lo que sientes.',
    order: 10
  },
  'cristal-calma': {
    id: 'cristal-calma',
    icon: '💎',
    name: 'Cristal de Calma',
    emotion: 'Desagrado',
    strategy: 'Respiracion consciente',
    description: 'Recuerda que puedes sentir desagrado y mantener la calma al mismo tiempo.',
    order: 11
  },
  'estrella-atencion': {
    id: 'estrella-atencion',
    icon: '✨',
    name: 'Estrella de Atencion',
    emotion: 'Ira / Desagrado',
    strategy: 'Despliegue atencional',
    description: 'Mueve temporalmente el foco hacia otra cosa cuando la emocion ocupa demasiado espacio.',
    order: 12
  },
  'semilla-aceptacion': {
    id: 'semilla-aceptacion',
    icon: '🌱',
    name: 'Semilla de Aceptacion',
    emotion: 'Desagrado',
    strategy: 'Reconocer, comprender y aceptar',
    description: 'Aceptar no es que te guste lo que pasa: es reconocer lo que sientes antes de decidir como actuar.',
    order: 13
  },
  'estrella-presente': {
    id: 'estrella-presente',
    icon: '🪷',
    name: 'Estrella del Presente',
    emotion: 'Desagrado',
    strategy: 'Anclaje 5-4-3-2-1',
    description: 'Te trae de vuelta al aqui y ahora usando lo que ves, tocas, escuchas, hueles y saboreas.',
    order: 14
  },
  'corazon-apoyo': {
    id: 'corazon-apoyo',
    icon: '❤️‍🩹',
    name: 'Corazon de Apoyo',
    emotion: 'Desagrado',
    strategy: 'Busqueda de apoyo',
    description: 'Pedir ayuda tambien es cuidar tus emociones. No tienes que sostenerlo todo solo.',
    order: 15
  },
  'gota-calma': {
    id: 'gota-calma',
    icon: '💧',
    name: 'Gota de Calma',
    emotion: 'Ira',
    strategy: 'Bajar la temperatura',
    description: 'Pausa, respira, espera y decide. Primero baja la temperatura; despues eliges que hacer.',
    order: 16
  },
  'escudo-autocontrol': {
    id: 'escudo-autocontrol',
    icon: '🛡️',
    name: 'Escudo de Autocontrol',
    emotion: 'Ira',
    strategy: 'Pausa y distancia',
    description: 'Permite alejarte un momento de la situacion y volver cuando puedas decidir con calma.',
    order: 17
  },
  'chispa-comprension': {
    id: 'chispa-comprension',
    icon: '🔥',
    name: 'Chispa de Comprension',
    emotion: 'Ira',
    strategy: 'Identificacion emocional',
    description: 'Ayuda a reconocer la ira cuando aparece y a entender que la encendio.',
    order: 18
  }
};

export const TOOL_LIST = Object.values(TOOLS).sort((a, b) => a.order - b.order);

export const BADGES = {
  fear: { id: 'fear', icon: '🕯️', name: 'Guardian del Miedo', island: 'Isla del Miedo' },
  joy: { id: 'joy', icon: '🌻', name: 'Guardian de la Alegria', island: 'Valle de la Luz' },
  anger: { id: 'anger', icon: '🌋', name: 'Guardian de la Ira', island: 'Al rojo vivo' },
  disgust: { id: 'disgust', icon: '🍃', name: 'Guardian del Desagrado', island: 'Guardianes del Desagrado' },
  sadness: { id: 'sadness', icon: '💧', name: 'Guardian de la Tristeza', island: 'Un dia a la vez' },
  surprise: { id: 'surprise', icon: '✨', name: 'Guardian de la Sorpresa', island: 'Isla de la Sorpresa' }
};
