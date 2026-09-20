// ISLA DE LA FRUSTRACION · La Cordillera de los Nudos
// Todos los textos de los dos mini-juegos (dialogos de Tuerca, avisos,
// preguntas, feedback, reto final). Se editan aqui sin tocar la logica.
// Espanol neutro, tuteo, frases cortas. Tuerca nunca regana: describe.

export const ISLA = {
  nombre: 'La Cordillera de los Nudos',
  eyebrow: 'Isla de la Frustración'
};

/* ============================================================ nivel 1 */

export const MAQUINA = {
  intro: {
    eyebrow: 'La Cordillera de los Nudos · Nivel 1',
    goal: 'Repara la Máquina Terca del molino',
    hint: 'Arrastra cada pieza hasta su hueco y gírala con los botones si hace falta. Algunas piezas no van a entrar: eso es parte del taller. Fíjate en el manómetro de tensión y usa la caja de calma cuando lo necesites.',
    keys: [['Arrastrar', 'mover una pieza'], ['↺ ↻ · Q E', 'girar la pieza'], ['🧰', 'caja de calma'], ['🤝', 'pedir ayuda a Tuerca']],
    touch: [['Arrastra', 'mover una pieza'], ['↺ ↻', 'girar la pieza'], ['🧰', 'caja de calma'], ['🤝', 'pedir ayuda']]
  },
  tuerca: {
    nombre: 'Tuerca',
    bienvenida: 'Hola. Soy Tuerca. El molino se paró y sin él no hay agua ni luz. ¿Me ayudas con las piezas? Yo miro y te cuento lo que veo.',
    ronda1: 'Empecemos fácil: estas dos piezas entran de una. Arrastra y suelta en el hueco.',
    ronda1Ok: '¡Así! Dos piezas y la máquina ya respira.',
    ronda2: 'Ahora este hueco. Parece obvio cuál va… pero mira bien.',
    rebote1: 'Uy. Rebotó. Se te apretaron los hombros, ¿eh? A mí me pasa igual cuando una tuerca no entra.',
    rebote2: 'Otra vez no entra. Empujar más fuerte no la va a cambiar. ¿Probamos otra cosa?',
    forzar: 'Con fuerza tampoco. Esa pieza está doblada: nunca va a entrar, y no es culpa tuya.',
    opcionOtra: 'Mira la mesa: hay otra pieza más pequeña. ¿Y si la pruebas?',
    pistaRonda2: 'Mi idea: la pieza pequeña. Y gírala de lado, noventa grados.',
    ronda2Ok: 'Entró. Fíjate: no fuiste más fuerte, fuiste más flexible.',
    ronda3: 'Último: el engranaje grande. Solo gira si lo llevas despacio y sin soltar. Si lo fuerzas, se traba.',
    traba: 'Se trabó. Cuanto más rápido, más se atasca. Prueba más lento, como si lo acariciaras.',
    clicsRapidos: 'Muchos toques seguidos. La máquina no va más rápido por eso; solo tú te aceleras.',
    ronda3Ok: 'Gira. Despacio y seguido: así se destraba casi todo.',
    bloqueo: 'La máquina está igual de apretada que tú. Vamos a soltar el vapor los dos.',
    bloqueoFin: 'Ya. Sigues justo donde estabas. Nada se perdió.',
    ayudaSello: 'Pedir ayuda también es ser valiente.',
    idle: 'Sin prisa. Cuando quieras, seguimos.',
    final: '¡Gira! Luz, agua y molino. Lo arreglaste tú, con todo y lo que no entraba.'
  },
  pistas: [
    'Cada pieza tiene un hueco con su misma forma. Arrastra y suelta encima.',
    'La pieza grande está doblada. Prueba la pequeña y gírala de lado.',
    'Arrastra el engranaje despacio, en círculo, sin soltar. Si te aceleras, se traba.'
  ],
  planB: [
    'La mesa gira: otras piezas, mismo hueco.',
    'La mesa gira y aparece la pieza pequeña. Esa sí.',
    'La mesa gira y trae una manivela: el engranaje pide menos precisión.'
  ],
  hud: {
    ronda: ['Ronda 1 · La fácil', 'Ronda 2 · La que no entra', 'Ronda 3 · El engranaje'],
    tension: 'Tensión',
    girarIzq: 'Girar a la izquierda',
    girarDer: 'Girar a la derecha',
    calma: 'Caja de calma',
    ayuda: 'Pedir ayuda',
    otraPieza: 'Probar otra pieza',
    ideaTuerca: 'Pedirle una idea a Tuerca'
  },
  avisos: {
    encaja: '¡CLIC! ENCAJÓ',
    rebota: 'REBOTA · NO ENTRA',
    forzar: 'FORZADA · NO ENTRA',
    traba: 'SE TRABÓ · MÁS DESPACIO',
    clics: 'MUCHOS TOQUES',
    sube: 'LA TENSIÓN SUBE',
    bloqueo: 'BLOQUEO · SOLTAMOS VAPOR',
    calma: 'LA TENSIÓN BAJA',
    gira: 'DESPACIO · ASÍ',
    molino: 'EL MOLINO GIRA'
  },
  notas: {
    senales: { title: 'Las señales del cuerpo', text: 'Hombros apretados, mandíbula dura, ganas de golpear: el manómetro sube por dentro antes de que lo notes. Mirarlo a tiempo es la mitad del arreglo.' },
    planB: { title: 'Plan B', text: 'Insistir igual no cambia la pieza. Cambiar de estrategia sí. Flexible gana a fuerte.' },
    despacio: { title: 'Más rápido, peor', text: 'Cuando algo se traba, acelerar y forzar lo traban más. Bajar el ritmo es lo que lo suelta.' },
    ayuda: { title: 'Pedir ayuda', text: 'Pedir una idea no te quita mérito. Es una herramienta más, y de las mejores.' }
  },
  cierre: {
    reevalTitulo: 'Del 1 al 5, ¿cuánta frustración sentiste?',
    caras: [
      { n: 1, icon: '😌', label: 'Casi nada' },
      { n: 2, icon: '🙂', label: 'Un poco' },
      { n: 3, icon: '😐', label: 'Bastante' },
      { n: 4, icon: '😠', label: 'Mucha' },
      { n: 5, icon: '😤', label: 'Muchísima' }
    ],
    utilTitulo: '¿Qué te ayudó más?',
    utiles: {
      respiracion: { icon: '🌬️', label: 'Respirar 4-4-4' },
      contar: { icon: '🏮', label: 'Contar 5 a 1' },
      ayuda: { icon: '🤝', label: 'Pedir ayuda' },
      planB: { icon: '🔄', label: 'Cambiar de plan' },
      otraPieza: { icon: '🧩', label: 'Probar otra pieza' },
      despacio: { icon: '🐢', label: 'Ir más despacio' }
    },
    feedbackTitulo: 'Lo que vi en el taller',
    feedback: {
      reguloAlta: 'La tensión te subió mucho (llegó a {max}) y aun así usaste {herramientas}. Eso es regular: no evitar que suba, sino saber bajarla.',
      calmaBaja: 'La tensión casi no subió (máximo {max}). Fuiste con calma y probando: eso mismo sirve cuando las cosas se ponen difíciles.',
      pidioAyuda: 'Pediste ayuda {ayudas} {vez}. Es de las cosas más útiles que hiciste: pedir una idea no le quita nada a tu arreglo.',
      forzo: 'Forzaste las piezas {forzadas} veces. Lo vi muchas veces en el taller: cuando algo no entra, la mano empuja más. La próxima, prueba primero otra pieza o girarla.',
      clics: 'Hubo {clics} toques rápidos seguidos. Cuando te aceleras, la máquina no va más rápido; tú sí. Un respiro antes del siguiente intento ayuda.',
      bloqueo: 'La máquina se bloqueó {bloqueos} {vez} y {salidas} saliste. Eso es lo que se entrena aquí.',
      sinTension: 'Ninguna herramienta hizo falta: resolviste con calma. Guárdate la caja para un día más difícil.'
    },
    reto: 'Hoy, cuando algo no te salga a la primera, respira cuatro y prueba de otra forma. Mañana me cuentas.',
    recompensa: 'Llave de Engranaje'
  }
};

/* ============================================================ nivel 2 */

export const VOLCAN = {
  intro: {
    eyebrow: 'La Cordillera de los Nudos · Nivel 2',
    goal: 'Suelta la presión del volcán hasta que la lava se enfríe',
    hint: 'La presión sube sola. Tienes tres válvulas: respirar con el anillo, transformar los pensamientos trampa tocándolos y tirar de la cuerda de ayuda. Hay un botón rojo muy tentador. Tú decides.',
    keys: [['Mantener · Espacio', 'válvula de respiración'], ['Tocar', 'transformar pensamientos'], ['🙋', 'cuerda de ayuda'], ['🔴', '¡golpear!']],
    touch: [['Mantén', 'válvula de respiración'], ['Toca', 'transformar pensamientos'], ['🙋', 'cuerda de ayuda'], ['🔴', '¡golpear!']]
  },
  tuerca: {
    bienvenida: 'La Llave de Engranaje abrió la cima. Este volcán es la presión que se junta por dentro cuando algo no sale. No se apaga: se suelta.',
    oleada1: 'Primero, tranquilo: burbujas lentas. Tócalas y prueba el anillo de respirar.',
    oleada2: 'Se abrió una grieta. Sube presión sola. Solo se sella respirando dos veces seguidas bien.',
    grietaSellada: 'Sellada. Dos respiraciones seguidas: eso fue.',
    oleada3: 'Última. La lava ya casi está fría. Aguanta.',
    temblor: 'Esto es lo más difícil de todo: seguir cuando ya casi estaba.',
    golpe: 'Se siente bien un segundo, ¿verdad? Y luego hay que arreglar la tubería.',
    cuerda: 'Pedir ayuda es una válvula, no una rendición.',
    desborde: '¡Fuuu! Piedras de goma. Nada se rompió de verdad: seguimos desde aquí.',
    adaptativo: 'Voy a abrir un poco las válvulas de abajo. Tú sigue con lo tuyo.',
    victoria: 'Lava fría. Se abrió el puente. Mira la cordillera entera desde aquí arriba: todos esos nudos… ya los pasaste.'
  },
  pensamientos: [
    { trampa: 'no puedo', ayuda: 'puedo intentarlo de otra forma' },
    { trampa: 'siempre me sale mal', ayuda: 'esto es difícil, no imposible' },
    { trampa: 'es injusto', ayuda: 'me está costando y sigo aquí' },
    { trampa: 'soy malo en esto', ayuda: 'estoy aprendiendo, y eso cuesta' },
    { trampa: 'que lo haga otro', ayuda: 'puedo pedir ayuda' }
  ],
  hud: {
    presion: 'Presión',
    lava: 'Lava fría',
    respirar: 'Respirar',
    respirarSub: 'mantén con el anillo',
    cuerda: 'Cuerda',
    cuerdaSub: 'pedir ayuda',
    golpear: '¡GOLPEAR!',
    oleada: ['Oleada 1 · Burbujas', 'Oleada 2 · La grieta', 'Oleada 3 · La meta se mueve']
  },
  avisos: {
    respiroOk: 'VAPOR · PRESIÓN −18',
    respiroNo: 'FUERA DE RITMO · NADA PASA',
    transformado: 'PENSAMIENTO TRANSFORMADO',
    perdido: 'SE ESCAPÓ · PRESIÓN +8',
    cuerda: 'AYUDA · PRESIÓN −25',
    cuerdaEspera: 'LA CUERDA VUELVE EN {s} s',
    golpe: '¡PUM! · PRESIÓN −15',
    tuberia: 'TUBERÍA ROTA · PRESIÓN +30',
    grieta: 'GRIETA · RESPIRA DOS VECES SEGUIDAS',
    sellada: 'GRIETA SELLADA',
    temblor: 'TEMBLOR · LA LAVA SE DERRITE',
    desborde: 'DESBORDE · SEGUIMOS AL 50 %',
    herramienta: 'CALMA · PRESIÓN −20',
    victoria: 'LA LAVA SE ENFRIÓ'
  },
  cierre: {
    reevalTitulo: 'Del 1 al 5, ¿cuánta frustración sentiste?',
    valvulaTitulo: '¿Qué válvula te funcionó mejor?',
    valvulas: {
      respiracion: { icon: '🌬️', label: 'Respirar con el anillo' },
      pensamientos: { icon: '💭', label: 'Cambiar el pensamiento' },
      ayuda: { icon: '🙋', label: 'Pedir ayuda' }
    },
    feedbackTitulo: 'Lo que vi en el volcán',
    feedback: {
      resumen: 'Respiraste bien {resp}, transformaste {pens} y pediste ayuda {ayudas}.',
      golpes: 'Golpeaste {golpes} {vez}: cada golpe bajó un segundo y luego subió más. No es un fallo, es un dato: la descarga alivia rápido y cobra después.',
      sinGolpes: 'No golpeaste ni una vez, con el botón rojo ahí delante. Elegiste válvulas que bajan de verdad.',
      desbordes: 'Hubo {desbordes} {desborde}. Ninguno te sacó del juego: la presión volvió a la mitad y seguiste.',
      temblor: 'Cuando la lava se volvió a derretir, seguiste. Eso, seguir cuando ya casi estaba, es la tolerancia a la frustración entera.',
      comparaAyuda: 'En el taller pediste ayuda; aquí lo resolviste con tus válvulas: tienes las dos cosas.',
      comparaSolo: 'En el taller resolviste solo; aquí tiraste de la cuerda. Saber cuándo pedir es tan útil como saber seguir.',
      aprendizaje: 'Aprendizaje concreto: la presión no se apaga, se suelta de a poco. Tu mejor válvula hoy fue {valvula}.'
    },
    retoTitulo: 'Elige tu válvula para esta semana',
    retoTexto: 'Úsala una vez al día. Respirar cuatro, cambiar el pensamiento o pedir ayuda.',
    insignia: 'Guardián de la Presión'
  }
};

/* ============================================================ comunes */

export const CAJA = {
  titulo: 'Caja de herramientas de calma',
  sub: 'Elige una. Después sigues justo donde estabas.',
  cerrar: 'Seguir sin usar nada',
  herramientas: {
    respiracion: { icon: '🌬️', label: 'Respirar 4-4-4', sub: 'mantén al inflar, suelta al exhalar' },
    contar: { icon: '🏮', label: 'Contar 5 a 1', sub: 'apaga los faroles en orden' },
    ayuda: { icon: '🤝', label: 'Pedir ayuda', sub: 'una pista de Tuerca' },
    planB: { icon: '🔄', label: 'Cambiar de plan', sub: 'otras piezas, otra idea' }
  },
  respiracion: {
    in: 'INHALA', hold: 'MANTÉN', out: 'EXHALA',
    hintIn: 'mantén pulsado mientras el círculo crece',
    hintHold: 'sigue pulsando',
    hintOut: 'suelta y deja salir el aire',
    sincronia: ['Vas encontrando el ritmo', 'Buen ritmo', 'Ritmo perfecto'],
    listo: 'Tres respiraciones. El vapor salió.'
  },
  contar: {
    hint: 'Toca los faroles del 5 al 1',
    listo: 'Taller a oscuras y en silencio. Ya está.'
  },
  ayuda: {
    sello: 'Pedir ayuda también es ser valiente'
  },
  planB: {
    listo: 'Plan nuevo.'
  },
  usada: 'TENSIÓN −40 · SEGUIMOS DONDE ESTABAS'
};

/** «1 vez» / «3 veces» */
export const veces = (n) => (n === 1 ? 'vez' : 'veces');

/** Rellena {claves} de una plantilla */
export function rellenar(plantilla, datos) {
  return plantilla.replace(/\{(\w+)\}/g, (m, k) => (datos[k] !== undefined ? String(datos[k]) : m));
}
