// ISLA DEL DESAGRADO · «La Cienaga Turbia» · textos del flujo de la isla
// (menu, bloque de identificacion, diario de limites y cierre). Los textos
// de cada minijuego estan en CadenaTextos.js y SeparadorTextos.js.

/** Conductas que se rechazan (nunca personas). Usadas por los dos minijuegos. */
export const CONDUCTAS = [
  { id: 'mentir', nombre: 'Mentir', icono: '🗣️', detalle: 'inventar o difundir algo falso sobre alguien' },
  { id: 'excluir', nombre: 'Excluir', icono: '🚪', detalle: 'dejar a alguien fuera a propósito o a escondidas' },
  { id: 'humillar', nombre: 'Humillar', icono: '🎯', detalle: 'ridiculizar a alguien delante de otros' },
  { id: 'romper-acuerdo', nombre: 'Romper un acuerdo', icono: '🤝', detalle: 'no cumplir lo que se prometió al grupo' },
  { id: 'aprovecharse', nombre: 'Aprovecharse', icono: '🎣', detalle: 'usar a alguien o lo suyo sin su permiso' },
  { id: 'callar', nombre: 'Callar ante un daño', icono: '🤐', detalle: 'ver que hieren a alguien y no hacer nada' }
];

export const INTENSIDADES = [
  { id: 'baja', label: 'Leve', text: 'Me incomoda, pero puedo seguir con lo mío.', color: '#9fd18a' },
  { id: 'media', label: 'Moderado', text: 'Me revuelve y me cuesta dejar de pensarlo.', color: '#f2c14e' },
  { id: 'alta', label: 'Intenso', text: 'Me revuelve tanto que necesito parar o irme.', color: '#e0453a' }
];

export const ISLA = {
  nombre: 'La Ciénaga Turbia',
  eyebrow: 'Isla del Desagrado',
  intro: 'Aquí el desagrado no es asco a una comida ni a un bicho. Es lo que sientes cuando algo cruza tus valores: una burla, un rumor, alguien que se aprovecha. Esa señal es útil. Lo que hagas con ella puede cuidar o puede dañar.',
  idea: 'Se rechaza la conducta, no a la persona. Y no todo lo que incomoda es un daño: a veces es solo una diferencia.',
  menu: {
    titulo: 'Elige por dónde entrar',
    sub: 'Dos minijuegos independientes. Puedes jugarlos en el orden que quieras y repetirlos.',
    cadena: { titulo: 'La Cadena', sub: 'Tiempo real · tenso', desc: 'Eres un nodo del grupo. Un rumor recorre la red y tú decides, paquete a paquete, qué dejas pasar, qué cortas y dónde pones un límite.' },
    separador: { titulo: 'El Separador', sub: 'Pausado · con las manos', desc: 'Llegan escenas envueltas en una sustancia oscura. Separa la conducta de la persona y detecta cuándo lo que sientes no es rechazo a un daño, sino a una diferencia.' },
    jugado: 'Completado',
    diario: 'Diario de límites',
    salir: 'Salir al mapa',
    identificar: 'Antes de entrar',
    repetirIdentificacion: 'Cambiar lo que valoro'
  },
  identificacion: {
    eyebrow: 'Antes de entrar · identificación',
    valores: {
      titulo: '¿Qué te revuelve?',
      sub: 'Elige al menos dos. Esto es lo que vas a defender en la red: después se compara con lo que hagas.',
      minimo: 'Elige al menos dos',
      continuar: 'Continuar'
    },
    senales: {
      titulo: '¿Cómo lo notas en ti?',
      sub: 'Marca las señales con las que tu cuerpo te avisa. No hay respuestas incorrectas.',
      lista: [
        { id: 'estomago', texto: 'Se me cierra el estómago', icono: '🌀' },
        { id: 'cara', texto: 'Arrugo la cara sin querer', icono: '😖' },
        { id: 'alejarme', texto: 'Quiero alejarme o salir del chat', icono: '🚶' },
        { id: 'tension', texto: 'Tensión en los hombros o la mandíbula', icono: '😬' },
        { id: 'decir', texto: 'Ganas de decir «esto no va conmigo»', icono: '🗯️' },
        { id: 'callar', texto: 'Me quedo callado y le doy vueltas', icono: '💭' }
      ],
      continuar: 'Continuar'
    },
    intensidad: {
      titulo: '¿Con qué intensidad llegas?',
      sub: 'Piensa en la última vez que algo así te pasó cerca.'
    },
    listo: 'Listo. Ya tienes con qué entrar a la ciénaga.'
  },
  diario: {
    titulo: 'Diario de límites',
    vacio: 'Todavía no hay pasos guardados. Se escriben al terminar cada escena de El Separador.',
    cierre: 'Estos son los pasos reales que elegiste. No son promesas: son opciones que ya sabes que existen.'
  },
  cierre: {
    titulo: 'La ciénaga se aclara',
    lineas: [
      'Recorriste la red en caliente y el taller en frío, y en los dos hiciste lo mismo: distinguir la conducta de la persona, y el daño de la diferencia.',
      'El desagrado social te va a seguir avisando; es su trabajo. Ahora sabes que la señal no decide por ti: decides tú, y hay más opciones que la burla, dejar a alguien fuera o hacer como si nada.'
    ],
    mensaje: 'Aprendiste a rechazar con criterio: la conducta, no la persona; el daño, no la diferencia.'
  }
};
