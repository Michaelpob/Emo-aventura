// ISLA DEL DESAGRADO · contenido editable
// Todo lo que lee el jugador en los dos minijuegos vive aqui: cuevas y sus
// elementos (nivel 1), banco de senales y escenas (nivel 2), menu y cierres.
// Los `icono` son emojis usados como ASSET PLACEHOLDER: se pueden sustituir
// por sprites o modelos sin tocar la logica (ver desagradoAssets.js).

export const ISLA = {
  nombre: 'Las Cuevas del Desagrado',
  eyebrow: 'Isla del Desagrado',
  intro: 'El desagrado es la emoción que te hace poner distancia. Aquí vas a descubrir qué te lo genera a ti y cómo se nota en tu cuerpo. No hay respuestas buenas ni malas.',
  menu: {
    titulo: 'Dos minijuegos independientes',
    sub: 'Entra al que quieras, en el orden que quieras. Cada uno se termina por separado.',
    cuevas: { titulo: 'Las cuatro cuevas del desagrado', sub: 'Nivel 1 · sin respuestas correctas', desc: 'Cuatro cuevas, una por sentido. En cada una aparecen cosas de una en una: dinos si te dan desagrado, te dan igual o te agradan.' },
    espejo: { titulo: 'El espejo de las señales', sub: 'Nivel 2 · reconocer el cuerpo', desc: 'Un espejo agrietado y un personaje que vive tres escenas. Elige los fragmentos que muestran señales de desagrado y repara el espejo.' },
    jugado: 'completado',
    salir: 'Salir al mapa',
    resumen: 'Tus respuestas'
  },
  cierre: {
    titulo: 'Isla completada',
    lineas: [
      'Recorriste las cuatro cuevas y reparaste el espejo.',
      'Ya sabes dos cosas que nadie puede saber por ti: qué te genera desagrado y cómo lo nota tu cuerpo.'
    ],
    mensaje: 'El desagrado avisa; lo que hagas con ese aviso es tuyo.'
  }
};

/* ============================================================ NIVEL 1 */

export const RESPUESTAS = [
  { id: 'desagrado', etiqueta: 'Me da desagrado', cara: 'asco', color: '#8fd14f' },
  { id: 'indiferente', etiqueta: 'Me da igual', cara: 'neutra', color: '#f2c94c' },
  { id: 'agrado', etiqueta: 'Me agrada', cara: 'sonrisa', color: '#ff8fab' }
];

export const CUEVAS_TEXTOS = {
  intro: {
    eyebrow: 'Isla del Desagrado · Nivel 1',
    goal: 'Las cuatro cuevas del desagrado',
    hint: 'Una caverna con cuatro entradas, una por cada sentido. En cada cueva aparecen seis cosas, de una en una. Arrastra cada una hasta el tótem que diga lo que sientes tú, o toca el tótem. No hay respuestas correctas: el desagrado es personal.',
    keys: [['Arrastrar', 'llevar el elemento a un tótem'], ['Clic en un tótem', 'lo mismo, sin arrastrar'], ['Clic en una entrada', 'entrar a una cueva']],
    touch: [['Arrastrar', 'llevar el elemento a un tótem'], ['Tocar un tótem', 'lo mismo, sin arrastrar']]
  },
  pregunta: '¿Esto te genera desagrado?',
  guia: {
    hub: 'Elige una entrada: cada cueva es un sentido',
    elemento: 'Arrastra el elemento hasta un tótem, o toca el tótem que diga lo que sientes',
    sonido: 'Escucha el sonido (🔁 para repetirlo) y elige el tótem',
    cuevaHecha: (n) => `Cueva completada · ${n} de 4`,
    volver: 'Volver a la caverna'
  },
  hud: { progreso: 'Elemento', mapa: 'Cuevas' },
  repetir: 'Repetir sonido',
  resumen: {
    titulo: 'Lo que descubriste',
    linea: (t, d, i, a) => `De ${t} elementos, <b>${d}</b> te generaron desagrado, <b>${i}</b> te dieron igual y <b>${a}</b> te agradaron.`,
    porCueva: 'Por cueva'
  },
  cierre: 'No todas las personas sentimos desagrado ante las mismas situaciones.\nLo importante es reconocer qué ocurre contigo.',
  escuchar: 'Escuchar el mensaje',
  recompensa: 'semilla-aceptacion'
};

// Seis elementos por cueva; `icono` = placeholder (emoji) del sprite. En la
// caverna de los sonidos, `sonido` nombra el sonido sintetizado en
// desagradoSonidos.js (placeholder de un audio real de <= 3 s).
export const CUEVAS = [
  {
    id: 'olores', sentido: 'olfato', nombre: 'El pantano de los olores', corto: 'Olores', icono: '👃',
    ambiente: 'Cueva húmeda y verdosa: los elementos emergen de un charco de agua estancada.',
    color: '#5fbf6a', luz: '#8fe07a',
    elementos: [
      { id: 'basura', nombre: 'Basura acumulada al sol', icono: '🗑️' },
      { id: 'charco', nombre: 'Un charco de agua estancada', icono: '💧' },
      { id: 'leche', nombre: 'Leche dañada', icono: '🥛' },
      { id: 'zapato', nombre: 'Un zapato viejo y sudado', icono: '👟' },
      { id: 'pan', nombre: 'Pan recién horneado', icono: '🍞' },
      { id: 'gasolina', nombre: 'Gasolina', icono: '⛽' }
    ]
  },
  {
    id: 'sabores', sentido: 'gusto', nombre: 'La cueva de los sabores', corto: 'Sabores', icono: '👅',
    ambiente: 'Cueva cálida con una mesa de piedra donde aparecen alimentos y bebidas.',
    color: '#ff9a3c', luz: '#ffb86b',
    elementos: [
      { id: 'moho', nombre: 'Una fruta con moho', icono: '🍑' },
      { id: 'quemada', nombre: 'Comida quemada', icono: '🍳' },
      { id: 'medicina', nombre: 'Una medicina muy amarga', icono: '💊' },
      { id: 'picante', nombre: 'Algo demasiado picante', icono: '🌶️' },
      { id: 'brocoli', nombre: 'Brócoli', icono: '🥦' },
      { id: 'chocolate', nombre: 'Chocolate', icono: '🍫' }
    ]
  },
  {
    id: 'imagenes', sentido: 'vista', nombre: 'El bosque de las imágenes', corto: 'Imágenes', icono: '👁️',
    ambiente: 'Cueva abierta al bosque: luces flotantes proyectan escenas en el aire.',
    color: '#5aa9ff', luz: '#9fd0ff',
    elementos: [
      { id: 'cucaracha', nombre: 'Una cucaracha caminando', icono: '🐜' },
      { id: 'chicle', nombre: 'Un chicle pegado debajo de una mesa', icono: '🍬' },
      { id: 'escupir', nombre: 'Alguien escupiendo en la calle', icono: '😝' },
      { id: 'burla', nombre: 'Alguien burlándose de un compañero', icono: '😏' },
      { id: 'rio', nombre: 'Alguien botando basura a un río', icono: '🚯' },
      { id: 'cachorro', nombre: 'Un cachorro durmiendo', icono: '🐶' }
    ]
  },
  {
    id: 'sonidos', sentido: 'oído', nombre: 'La caverna de los sonidos', corto: 'Sonidos', icono: '👂',
    ambiente: 'Cueva oscura con cristales que vibran y se iluminan con cada sonido.',
    color: '#b58cff', luz: '#d2b8ff', sombra: 0.16,
    elementos: [
      { id: 'unas', nombre: 'Uñas rascando un tablero', icono: '🎧', sonido: 'unas-tablero' },
      { id: 'masticar', nombre: 'Alguien masticando con la boca abierta', icono: '🎧', sonido: 'masticar' },
      { id: 'sorbo', nombre: 'Un sorbo muy ruidoso', icono: '🎧', sonido: 'sorbo' },
      { id: 'moscas', nombre: 'Zumbido de moscas', icono: '🎧', sonido: 'moscas' },
      { id: 'gotera', nombre: 'Una gotera constante', icono: '🎧', sonido: 'gotera' },
      { id: 'lluvia', nombre: 'Lluvia suave', icono: '🎧', sonido: 'lluvia' }
    ]
  }
];

/* ============================================================ NIVEL 2 */

export const ESPEJO_TEXTOS = {
  intro: {
    eyebrow: 'Isla del Desagrado · Nivel 2',
    goal: 'El espejo de las señales',
    hint: 'En el espejo agrietado se refleja un personaje que vive tres escenas. A su alrededor flotan ocho fragmentos, cada uno con una señal del cuerpo. Toca solo los que sean señales de desagrado: cada acierto repara el espejo. Si te confundes, no pasa nada: el fragmento te dirá de qué emoción era.',
    keys: [['Clic en un fragmento', 'elegirlo'], ['Clic en la etiqueta', 'lo mismo']],
    touch: [['Tocar un fragmento', 'elegirlo']]
  },
  guia: {
    escena: 'Mira la escena y toca los fragmentos con señales de desagrado',
    faltan: (n) => `Faltan ${n} ${n === 1 ? 'señal' : 'señales'} de desagrado`,
    rondaHecha: (r) => `Ronda ${r} completa: el espejo se repara`,
    nota: (emocion, explicacion) => `Esa es una señal de ${emocion}: ${explicacion}`
  },
  hud: { ronda: 'Escena', espejo: 'Espejo' },
  acierto: 'Señal de desagrado: el fragmento encaja',
  final: {
    titulo: 'El espejo entero',
    sub: 'Así se nota el desagrado en tu cuerpo',
    aciertos: (a, t) => `Reconociste ${a} de ${t} señales de desagrado.`,
    confusiones: (lista) => `Las confundiste sobre todo con: ${lista}.`,
    sinConfusiones: 'No confundiste ninguna señal con otra emoción.'
  },
  cierre: 'El desagrado se nota en tu cuerpo antes de que lo pienses: es tu forma de poner distancia frente a algo que sientes que no te hace bien. Reconocer esas señales te ayuda a decidir qué hacer con ellas.',
  recompensa: 'estrella-presente'
};

// Escenas (una por ronda). `icono` y `props` describen la vineta placeholder.
export const ESCENAS = [
  { id: 'recipiente', titulo: 'Comida olvidada', texto: 'El personaje abre un recipiente de comida que llevaba días olvidado en el fondo de la nevera.', icono: '🥡', prop: 'recipiente' },
  { id: 'escupir', titulo: 'En la calle', texto: 'El personaje ve a alguien escupiendo en el suelo, justo a su lado.', icono: '💦', prop: 'escupitajo' },
  { id: 'chicle', titulo: 'La silla', texto: 'El personaje se sienta y descubre un chicle pegado en la silla.', icono: '🪑', prop: 'silla' }
];

// Banco de senales. `emocion: 'desagrado'` = correctas; el resto, distractores
// con la explicacion que aparece al fallar.
export const SENALES = [
  { id: 'nariz', texto: 'Arrugar la nariz', icono: '👃', emocion: 'desagrado' },
  { id: 'labio', texto: 'Fruncir el labio superior', icono: '👄', emocion: 'desagrado' },
  { id: 'mirada', texto: 'Apartar la mirada o girar la cara', icono: '🙈', emocion: 'desagrado' },
  { id: 'paso-atras', texto: 'Alejarse despacio, dar un paso atrás', icono: '🚶', emocion: 'desagrado' },
  { id: 'taparse', texto: 'Taparse la nariz o la boca', icono: '🤭', emocion: 'desagrado' },
  { id: 'apartar', texto: 'Apartar el objeto con la mano', icono: '✋', emocion: 'desagrado' },
  { id: 'nausea', texto: 'Náusea o nudo en el estómago', icono: '🌀', emocion: 'desagrado' },
  { id: 'no-tocar', texto: 'Evitar tocar algo', icono: '🚫', emocion: 'desagrado' },
  { id: 'temblar', texto: 'Temblar, corazón acelerado', icono: '💓', emocion: 'miedo', explicacion: 'el cuerpo se prepara para huir.' },
  { id: 'lagrimas', texto: 'Lágrimas, hombros caídos', icono: '😢', emocion: 'tristeza', explicacion: 'el cuerpo pide pausa y consuelo.' },
  { id: 'saltos', texto: 'Sonrisa amplia, dar saltos', icono: '😄', emocion: 'alegría', explicacion: 'el cuerpo quiere compartir y acercarse.' },
  { id: 'punos', texto: 'Puños apretados, mandíbula tensa', icono: '✊', emocion: 'rabia', explicacion: 'el cuerpo se prepara para defenderse.' },
  { id: 'sonrojo', texto: 'Sonrojarse', icono: '😳', emocion: 'vergüenza', explicacion: 'el cuerpo siente que lo están mirando.' }
];

// Composicion de cada ronda: ids de senales de desagrado + distractores (8 en total)
export const RONDAS_ESPEJO = [
  { escena: 'recipiente', desagrado: ['nariz', 'taparse', 'apartar', 'nausea', 'labio'], distractores: ['temblar', 'saltos', 'sonrojo'] },
  { escena: 'escupir', desagrado: ['mirada', 'paso-atras', 'labio', 'nariz'], distractores: ['punos', 'lagrimas', 'temblar', 'saltos'] },
  { escena: 'chicle', desagrado: ['no-tocar', 'apartar', 'nausea', 'taparse', 'paso-atras'], distractores: ['sonrojo', 'punos', 'lagrimas'] }
];
