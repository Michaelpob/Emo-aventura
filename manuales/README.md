# Documentación de EMO-AVENTURA

**Isla Emociones 3D — «Vive la aventura de descubrir el poder de tus emociones»**

Juego serio en 3D sobre reconocimiento y regulación emocional, para 13 años en
adelante. Seis islas, una por emoción, cada una con su propia mecánica.
Sitio publicado: **https://michaelpob.github.io/Emo-aventura/**

---

## En PDF (para imprimir o entregar)

Los mismos documentos, maquetados con portada, tabla de contenido y numeracion
de paginas, estan en [`manuales/pdf/`](pdf/):

| Archivo | Contenido |
|---|---|
| [EMO-AVENTURA-documentacion-completa.pdf](pdf/EMO-AVENTURA-documentacion-completa.pdf) | Los tres manuales en un solo documento, con indice general |
| [Manual-de-usuario.pdf](pdf/Manual-de-usuario.pdf) | Solo el manual de usuario |
| [Manual-de-administrador.pdf](pdf/Manual-de-administrador.pdf) | Solo el manual de administrador |
| [Referencias-y-normas.pdf](pdf/Referencias-y-normas.pdf) | Solo referencias y normas |

Se regeneran a partir de los `.md` con el guion de conversion (Markdown -> HTML
-> PDF con Edge sin cabeza); si cambias un manual, vuelve a generarlos.

## Los tres documentos

| Documento | Para quién | Qué contiene |
|---|---|---|
| **[Manual de usuario](MANUAL-DE-USUARIO.md)** | Jugadores, docentes, familias | Cómo empezar, controles, **qué hace cada juego y cómo se juega**, progreso, accesibilidad, preguntas frecuentes y guía rápida para docentes |
| **[Manual de administrador](MANUAL-DE-ADMINISTRADOR.md)** | Responsable técnico | Requisitos, instalación, compilación y despliegue, estructura, arquitectura, datos guardados, cómo editar contenido, cómo añadir islas, pruebas y resolución de problemas |
| **[Referencias y normas](REFERENCIAS-Y-NORMAS.md)** | Evaluadores y equipo | Marco conceptual, trazabilidad teoría → mecánica, bibliografía en APA, normas técnicas, de accesibilidad, de contenido, de uso y de datos |

---

## Índice del juego de un vistazo

### Las seis islas y todos sus juegos

| # | Isla | Nombre | Juegos que contiene |
|---|---|---|---|
| 1 | Miedo | Isla del Miedo | **Bosque de la Noche** (encender 5 faroles con la linterna que la respiración recarga) · **La Casa** (comprobar 5 lugares sosteniendo la mirada) |
| 2 | Enojo | Al rojo vivo | **Las rocas al rojo** (esperar a que se enfríen; dejar pasar las chispas) · **Las grietas** (seguir cada grieta hasta lo que la encendió) · **La respiración 4-4-4-4** |
| 3 | Desagrado | Las Cuevas del Desagrado | **Las cuatro cuevas** (olores, sabores, imágenes y sonidos: 24 elementos a tres tótems, sin respuestas correctas) · **El espejo de las señales** (elegir las señales de desagrado en 3 escenas y reparar el espejo) |
| 4 | Tristeza | La casa en marcha | **Seis tareas** (ventanas, cartas, leña, regar, radio y mensaje) con impulso que crece y música que se abre |
| 5 | Frustración | La torre y el valle | **La torre** (12 bloques, ráfagas de viento y estrategias: parar, paso corto, pedir ayuda) · **El valle de los orbes** (12 orbes saltando entre plataformas) |
| 6 | Calma | El lago sereno | **El lago espejo** (exhalar hasta que el agua refleje el cielo) · **¿Quién canta?** (7 voces que cantan al quedarte quieto) · **El estanque musical** (nenúfares que son notas) |

### Juegos complementarios (autocontenidos)

| Juego | Emoción | Mini-juegos |
|---|---|---|
| **Valle de la Luz** (`valle-luz/`) | Alegría intensa | Disfruta sin perder el control · Utiliza tu energía |
| **Valle de la Bruma** (`valle-bruma/`) | Tristeza | El río de las palabras · El sendero de los pasos pequeños |

---

## Principios que gobiernan todo el proyecto

1. **Ninguna emoción es mala:** cada isla enseña para qué sirve la suya.
2. **Regular no es dejar de sentir:** se practican estrategias reales.
3. **Nada resta:** sin *game over*, sin vidas, sin puntos negativos.
4. **Sin respuestas correctas** donde se pregunta qué siente el jugador.
5. **Accesible:** silencio, texto para todo sonido, alternativa al arrastre,
   reducción de movimiento y buen contraste.
6. **Privado:** todo se guarda en el dispositivo; no hay cuentas ni servidores.

---

## Ficha técnica rápida

| Concepto | Valor |
|---|---|
| Tecnología | JavaScript ES2022 · three.js · Vite · Web Audio API |
| Instalación | Ninguna: se abre en el navegador |
| Publicación | GitHub Pages desde `/docs` en `main` |
| Datos | `localStorage` del navegador, sin backend |
| Público | 13 años en adelante |
| Duración | 10–20 min por isla · 90–120 min la aventura completa |

---

*Última actualización de la documentación: septiembre de 2026.*
