// LA CADENA · textos editables (Isla del Desagrado · La Cienaga Turbia)
// Todo lo que lee el jugador en este minijuego vive aqui. Editar sin tocar la
// logica: los ids de conducta deben coincidir con CONDUCTAS de IslaTextos.js.

export const CADENA = {
  intro: {
    eyebrow: 'La Ciénaga Turbia · La Cadena',
    goal: 'Decide qué dejas pasar y dónde pones un límite',
    hint: 'Estás en el centro de una red. Por los hilos llegan mensajes hacia ti. Los dañinos son oscuros y viscosos; otros solo son distintos. Cortar lo que no hace daño también ensucia el agua.',
    keys: [['Arrastrar', 'cortar un hilo'], ['Mantener sobre tu nodo', 'poner un límite'], ['Arrastrar un paquete a la baliza', 'pedir ayuda (2 por ronda)'], ['Nada', 'dejar pasar']],
    touch: [['Deslizar', 'cortar un hilo'], ['Mantener el dedo en tu nodo', 'poner un límite'], ['Arrastrar el paquete a la baliza', 'pedir ayuda']]
  },
  hud: {
    claridad: 'Claridad del agua',
    coherencia: 'Coherencia',
    termometro: 'Desagrado',
    alcanzados: 'personas alcanzadas',
    ayuda: 'Pedir ayuda',
    ronda: 'Ronda'
  },
  rondas: [
    { titulo: 'Ronda 1 · Llega el primer mensaje', nota: 'Fíjate en la textura: lo dañino es oscuro y pegajoso. Lo raro es solo translúcido.' },
    { titulo: 'Ronda 2 · Más hilos', nota: 'Hay más gente en la red. Lo que dejas pasar se replica.' },
    { titulo: 'Ronda 3 · Se acelera', nota: 'Mantén el dedo sobre tu nodo para responder con un límite en vez de solo cortar.' },
    { titulo: 'Ronda 4 · Segunda fila', nota: 'La red se abre a otra fila de nodos. Reserva la ayuda para lo grave.' },
    { titulo: 'Ronda 5 · Habla de ti', nota: 'El último paquete habla de ti. Tienes las mismas opciones de siempre.' }
  ],
  avisos: {
    cortado: 'Cortado: el paquete se disuelve',
    dejoPasar: (n) => `Pasó y se replicó: ${n} personas más`,
    grima: 'Te dio grima, pero nadie está haciendo daño',
    grimaLargo: 'Eso no era un daño: era una diferencia. La señal de desagrado no siempre señala algo que hay que cortar.',
    diferenciaPaso: 'Dejaste pasar algo que solo era distinto. Bien visto.',
    asertivo: 'Límite claro: los hilos vecinos se aclaran',
    agresivo: 'Cortaste, pero la burla ensució otro hilo',
    agresivoLargo: 'Responder con burla también ensucia: el paquete se fue, pero el agua se enturbió en otro hilo.',
    evasivo: 'No cambió nada: el paquete sigue',
    ayuda: 'Pediste ayuda: el paquete queda en buenas manos',
    sinAyuda: 'Ya usaste las 2 ayudas de esta ronda',
    termometro: 'Tu cuerpo ya te avisó: eso cruza algo que valoras.',
    sobreTi: 'Este habla de ti. Tienes las mismas opciones.',
    finRonda: (r) => `Fin de la ronda ${r}`
  },
  eco: {
    titulo: 'Poner un límite',
    subtitulo: 'Elige cómo respondes a este mensaje'
  },
  // Paquetes dañinos. `conducta` enlaza con los valores que el jugador declaró.
  // `eco` trae las tres respuestas posibles: asertiva, agresiva y evasiva.
  daninos: [
    {
      id: 'foto', conducta: 'aprovecharse', severidad: 3,
      texto: 'Reenvío la foto privada de Sara «solo al grupo pequeño». No la subas a ningún lado, ¿ok?',
      eco: {
        asertiva: 'Esa foto es de Sara y no la pasó ella. Aquí no la reenviamos.',
        agresiva: 'Qué asco de gente, lo que sois. Cortadlo ya.',
        evasiva: 'Bueno… yo no la abro, haced lo que queráis.'
      }
    },
    {
      id: 'rumor', conducta: 'mentir', severidad: 2,
      texto: 'Dicen que Iván faltó porque lo pillaron robando en el súper. Lo sé de buena fuente.',
      eco: {
        asertiva: 'Eso es un rumor y le puede hacer daño. Si no lo sabemos seguro, no lo pasamos.',
        agresiva: 'Y tú faltas por vago, no te vengas a inventar cosas.',
        evasiva: 'Ni idea, a mí no me metáis.'
      }
    },
    {
      id: 'captura', conducta: 'humillar', severidad: 2,
      texto: 'Mirad la captura de lo que escribió Noa. Sin contexto queda todavía peor 😂',
      eco: {
        asertiva: 'Sacada de contexto es una trampa. Si queréis saber qué dijo, preguntadle.',
        agresiva: 'La única que da vergüenza aquí eres tú por reenviarla.',
        evasiva: 'Jaja, bueno, cada uno con lo suyo.'
      }
    },
    {
      id: 'apodo', conducta: 'humillar', severidad: 2,
      texto: 'Venga, que «Bola» ya se lo dice media clase, es solo una broma. Pásalo.',
      eco: {
        asertiva: 'Es una broma para quien no la recibe. A él no le hace gracia, y a mí tampoco.',
        agresiva: 'El único que da risa eres tú. Cállate ya.',
        evasiva: 'Yo paso, pero no me metas en esto.'
      }
    },
    {
      id: 'excluir', conducta: 'excluir', severidad: 2,
      texto: 'Para el trabajo dejamos fuera a Mateo y no le decimos nada. Total, ni se va a enterar.',
      eco: {
        asertiva: 'Si no queremos trabajar con Mateo, se lo decimos a la cara. Dejarlo fuera a escondidas no.',
        agresiva: 'Los que sobráis sois vosotros, no Mateo.',
        evasiva: 'Uf, como queráis, yo me apunto a lo que salga.'
      }
    },
    {
      id: 'acuerdo', conducta: 'romper-acuerdo', severidad: 1,
      texto: 'Habíamos quedado en no contar lo del sábado, pero es demasiado bueno. Lo cuento y ya.',
      eco: {
        asertiva: 'Quedamos en no contarlo. Si lo cuentas, rompes lo que acordamos con todos.',
        agresiva: 'Eres un bocazas, siempre igual.',
        evasiva: 'Bah, seguro que no pasa nada.'
      }
    },
    {
      id: 'callar', conducta: 'callar', severidad: 2,
      texto: 'Vi cómo se metían con Lucía en el vestuario. Mejor no decir nada, no es cosa nuestra.',
      eco: {
        asertiva: 'Sí es cosa nuestra. No hace falta enfrentarse: se lo contamos a alguien que pueda parar eso.',
        agresiva: 'Cobardes todos. Vaya panda.',
        evasiva: 'Ya, es que uno nunca sabe…'
      }
    }
  ],
  // Paquetes «trampa»: raros o distintos, pero sin daño. Cortarlos penaliza.
  trampas: [
    { id: 'comida', texto: 'Han traído de casa una comida que huele fortísimo. Todo el pasillo huele.', diferencia: 'una comida distinta' },
    { id: 'acento', texto: 'El nuevo habla con un acento rarísimo, casi no se le entiende.', diferencia: 'una forma de hablar' },
    { id: 'ropa', texto: 'Lleva la misma sudadera desde el lunes. Otra vez.', diferencia: 'la ropa de alguien' },
    { id: 'musica', texto: 'Escucha una música que a todos nos parece ridícula, con los cascos a tope.', diferencia: 'un gusto musical' },
    { id: 'risa', texto: 'Se ríe raro, como a carcajadas, y come con la boca medio abierta.', diferencia: 'una manera de reír o comer' }
  ],
  // El paquete final habla del propio jugador.
  sobreTi: {
    id: 'sobre-ti', conducta: 'humillar', severidad: 3,
    texto: (nombre) => `Mirad el vídeo de ${nombre} en educación física, me muero 😂. Lo paso al otro grupo también.`,
    eco: {
      asertiva: 'Ese vídeo es mío y no quiero que circule. Bórralo, por favor.',
      agresiva: 'Y tú eres patético, a ver si te grabo yo a ti.',
      evasiva: 'Jaja, bueno, da igual…'
    }
  },
  reevaluacion: [
    {
      pregunta: '¿Qué sentiste cuando el paquete iba hacia ti?',
      opciones: ['Rabia', 'Vergüenza', 'Miedo a que llegara a todos', 'Nada, y eso me sorprendió']
    },
    {
      pregunta: '¿Qué harías distinto la próxima vez?',
      opciones: ['Cortar antes', 'Poner un límite en vez de solo cortar', 'Pedir ayuda antes', 'Dejar pasar lo que no hacía daño']
    }
  ],
  intensidadAhora: '¿Cómo está ahora tu desagrado?',
  feedback: {
    titulo: 'Lo que decidiste',
    sinDecisiones: 'No tomaste ninguna decisión: todos los paquetes pasaron.',
    lineas: {
      cortes: (n) => `Cortaste ${n} ${n === 1 ? 'mensaje dañino' : 'mensajes dañinos'} antes de que llegaran.`,
      limites: (n) => `Pusiste ${n} ${n === 1 ? 'límite claro' : 'límites claros'} sin atacar a nadie.`,
      burlas: (n) => `${n} ${n === 1 ? 'vez respondiste' : 'veces respondiste'} con burla: cortó el mensaje, pero ensució otro hilo.`,
      evasivas: (n) => `${n} ${n === 1 ? 'respuesta evasiva' : 'respuestas evasivas'}: el mensaje siguió su camino.`,
      ayudas: (n) => `Pediste ayuda ${n} ${n === 1 ? 'vez' : 'veces'}.`,
      pasaron: (n, p) => `Dejaste pasar ${n} ${n === 1 ? 'mensaje dañino' : 'mensajes dañinos'}: alcanzaron a ${p} personas.`,
      grima: (n) => `${n} ${n === 1 ? 'vez cortaste' : 'veces cortaste'} algo que solo era distinto (comida, acento, ropa, música…). No había daño.`,
      diferenciaBien: (n) => `Dejaste pasar ${n} ${n === 1 ? 'cosa' : 'cosas'} que solo ${n === 1 ? 'era distinta' : 'eran distintas'}. Ahí no había nada que cortar.`,
      sobreTi: (accion) => `Cuando el paquete hablaba de ti: ${accion}.`
    },
    acciones: { cortar: 'lo cortaste', asertiva: 'pusiste un límite claro', agresiva: 'respondiste con burla', evasiva: 'te fuiste por la tangente', ayuda: 'pediste ayuda', pasar: 'lo dejaste pasar' },
    cierre: 'El desagrado avisó cada vez que llegó algo que cruzaba tus valores. Lo que hiciste con esa señal fue lo que aclaró o enturbió el agua: se rechaza la conducta, no a la persona; y no todo lo que da grima es un daño.'
  },
  recompensa: 'tijera-limites'
};
