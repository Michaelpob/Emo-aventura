// EL SEPARADOR · textos editables (Isla del Desagrado · La Cienaga Turbia)
// Cada «grumo» es una escena. `tipo`: 'dano' (hay una conducta que separar),
// 'diferencia' (trampa: no hay nada que separar) o 'dilema' (sin respuesta
// unica: cualquier clasificacion vale y el feedback devuelve la tension).
// Los ids de `conducta` deben coincidir con CONDUCTAS de IslaTextos.js.

export const SEPARADOR = {
  intro: {
    eyebrow: 'La Ciénaga Turbia · El Separador',
    goal: 'Separa la conducta de la persona',
    hint: 'Llegan escenas envueltas en una sustancia oscura. La sustancia es lo que hizo; la figura es quien lo hizo. Despega una de la otra (cuesta: insiste) y clasifica cada parte. Algunas escenas no traen daño, solo diferencia: esas van enteras a su contenedor.',
    keys: [['Arrastrar sobre la escena', 'despegar la sustancia'], ['Arrastrar una parte a un contenedor', 'clasificar'], ['Sin reloj', 'tómate el tiempo que necesites']],
    touch: [['Deslizar sobre la escena', 'despegar la sustancia'], ['Arrastrar a un contenedor', 'clasificar']]
  },
  hud: { nitidez: 'Nitidez', grumo: 'Escena' },
  pasos: { escuchar: 'Escuchar', separar: 'Separar', clasificar: 'Clasificar', paso: 'Un paso real' },
  contenedores: {
    rechazo: { titulo: 'Esto rechazo', sub: 'la conducta' },
    persona: { titulo: 'Esta persona', sub: 'vuelve al grupo' },
    diferencia: { titulo: 'Aquí no hay daño, hay diferencia', sub: 'la escena entera' }
  },
  avisos: {
    separando: 'Insiste: la sustancia se resiste',
    separado: 'Separado: la conducta a un lado, la persona a otro',
    nadaQueSeparar: 'No se despega nada. Quizá no hay nada que separar.',
    nombra: '¿Cómo se llama lo que hizo?',
    personaVuelve: 'La persona vuelve limpia al grupo',
    aguaAclara: 'El agua se aclara',
    personaEnRechazo: 'Ahí va lo que hizo, no quien lo hizo. Rechazaste a la persona entera.',
    conductaEnPersona: 'La sustancia no es alguien: es una conducta.',
    danoEnDiferencia: 'Aquí sí había un daño. Alguien salió lastimado.',
    diferenciaSeparada: 'Intentaste despegar algo que no era daño: era una diferencia.',
    etiquetaBien: 'Nombrarlo le quita niebla',
    etiquetaOtra: 'Se parece, pero lo que hizo se llama de otra forma',
    dilema: 'Aquí no hay una respuesta única. Lo importante es tu criterio.'
  },
  criterios: {
    pregunta: '¿Con qué criterio lo clasificaste?',
    opciones: [
      'Miré si alguien salió dañado, más allá de la intención.',
      'Miré la intención: si quería hacer daño o no.',
      'Miré si yo habría hecho lo mismo en su lugar.'
    ]
  },
  acciones: {
    titulo: 'Elige un paso real',
    sub: 'Lo que harías tú si esto pasara cerca. Se guarda en tu diario de límites.',
    lista: [
      { id: 'privado', texto: 'Decírselo en privado' },
      { id: 'no-reirme', texto: 'No reírme' },
      { id: 'acompanar', texto: 'Acompañar a quien lo recibió' },
      { id: 'limite', texto: 'Poner un límite' },
      { id: 'adulto', texto: 'Pedir ayuda a un adulto' }
    ]
  },
  grumos: [
    {
      id: 'g1', tipo: 'dano', conducta: 'humillar',
      titulo: 'El vídeo del comedor',
      texto: 'Alguien graba a un compañero cuando se le cae la bandeja en el comedor y lo sube al grupo con música de circo. Media clase lo comparte.'
    },
    {
      id: 'g2', tipo: 'dano', conducta: 'excluir',
      titulo: 'El cumpleaños',
      texto: 'Una chica invita a toda la fila menos a una compañera, y lo dice en voz alta para que la otra lo oiga.'
    },
    {
      id: 'g3', tipo: 'diferencia',
      titulo: 'El bocadillo',
      texto: 'Un compañero nuevo abre en el recreo una comida de su casa que huele muy fuerte. Come tranquilo, sin molestar a nadie.',
      diferencia: 'una comida distinta'
    },
    {
      id: 'g4', tipo: 'dano', conducta: 'mentir',
      titulo: 'La nota',
      texto: 'Alguien inventa que una compañera copió en el examen y se lo cuenta al grupo como si lo hubiera visto. No lo vio.'
    },
    {
      id: 'g5', tipo: 'dano', conducta: 'aprovecharse',
      titulo: 'El trabajo en grupo',
      texto: 'Uno del grupo no hace nada en todo el proyecto y el día de la entrega pone su nombre el primero.'
    },
    {
      id: 'g6', tipo: 'diferencia',
      titulo: 'La sudadera',
      texto: 'Un chico lleva la misma sudadera toda la semana y habla con un acento que a algunos les hace gracia. No se ha metido con nadie.',
      diferencia: 'la ropa y la forma de hablar de alguien'
    },
    {
      id: 'g7', tipo: 'dano', conducta: 'callar',
      titulo: 'El vestuario',
      texto: 'Tres se meten con uno en el vestuario todos los días. Otros cuatro lo ven y no dicen nada, ni a él ni a nadie.'
    },
    {
      id: 'g8', tipo: 'dilema', conducta: 'humillar',
      titulo: 'Defender a golpes',
      texto: 'Una chica ve cómo humillan a su amiga y responde llamando «gordo» al que lo hacía, delante de todos. La humillación paró. Él se fue llorando.',
      tension: 'Paró un daño y causó otro. Defender a alguien no borra lo que se le hizo al otro; y el otro también había hecho daño. Las dos cosas son verdad a la vez.'
    },
    {
      id: 'g9', tipo: 'dilema', conducta: 'excluir',
      titulo: 'Sin darse cuenta',
      texto: 'Un grupo organiza el plan del viernes por un chat en el que falta una persona. Nadie la excluyó a propósito: simplemente no estaba. Ella se enteró el lunes.',
      tension: 'No hubo intención, y aun así alguien se quedó fuera y le dolió. ¿Cuenta como daño lo que nadie quiso hacer? Tu criterio decide qué pesa más: la intención o el efecto.'
    },
    {
      id: 'g10', tipo: 'dilema', conducta: 'humillar', propio: true,
      titulo: 'Tú, hace tiempo',
      texto: 'Hace un tiempo te reíste de alguien delante de otros. No fue lo peor del mundo, pero la persona se quedó callada el resto del día y tú lo notaste.',
      tension: 'Aquí la figura eres tú. Separar la conducta de la persona también funciona hacia dentro: puedes rechazar lo que hiciste sin convertirte en «alguien que da asco». Eso es lo que permite repararlo.'
    }
  ],
  reevaluacion: [
    {
      pregunta: '¿Qué fue lo que más te costó?',
      opciones: ['Despegar la conducta de la persona', 'Nombrar lo que había hecho', 'Aceptar que en algunas no había daño', 'Elegir un paso real']
    },
    {
      pregunta: '¿Y con la escena en la que la figura eras tú?',
      opciones: ['Me costó separarla', 'La separé sin problema', 'Me dio vergüenza', 'Me sirvió para verlo distinto']
    }
  ],
  intensidadAhora: '¿Cómo está ahora tu desagrado?',
  feedback: {
    titulo: 'Lo que separaste',
    lineas: {
      separadas: (n, t) => `Separaste la conducta de la persona en ${n} de ${t} escenas con daño.`,
      etiquetas: (n) => `Nombraste la conducta ${n} ${n === 1 ? 'vez' : 'veces'} con precisión.`,
      diferencias: (n, t) => `Reconociste ${n} de ${t} escenas donde no había daño sino diferencia.`,
      diferenciasFallo: (n) => `${n} ${n === 1 ? 'vez trataste' : 'veces trataste'} una diferencia como si fuera un daño.`,
      personaRechazada: (n) => `${n} ${n === 1 ? 'vez mandaste' : 'veces mandaste'} a la persona entera al rechazo.`,
      dilemas: (n) => `Resolviste ${n} ${n === 1 ? 'dilema' : 'dilemas'} con tu propio criterio.`,
      diario: (n) => `Tu diario de límites tiene ${n} ${n === 1 ? 'paso real' : 'pasos reales'}.`
    },
    cierre: 'Rechazar una conducta con nitidez es lo que permite hacer algo con ella: decirlo, no reírse, acompañar, poner un límite. Rechazar a la persona entera solo la deja fuera, y no cambia nada.'
  },
  recompensa: 'balanza-criterio'
};
